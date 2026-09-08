import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ParsedTimeline,
  LatLng,
  TimelineDay
} from './types/timeline';
import { parseTimelineJSON } from './utils/timelineParser';
import { interpolatePosition } from './utils/geoUtils';
import { TimelineMap } from './components/Map/TimelineMap';
import { PlaybackControls } from './components/Playback/PlaybackControls';
import { StatsModal } from './components/Stats/StatsModal';
import { sampleTimelineJSON } from './demo/sampleTimeline';
import {
  UploadCloud,
  FileCode,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Calendar,
  BarChart3
} from 'lucide-react';

export const App: React.FC = () => {
  const [timelineData, setTimelineData] = useState<ParsedTimeline | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // Initial upload screen state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(30); // 30x real-time by default
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
  const [playbackPosition, setPlaybackPosition] = useState<LatLng | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<string>('Ready');
  const [playbackActivityType, setPlaybackActivityType] = useState<string | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(0);

  // Setup playback for a day
  const setupDayPlayback = useCallback((day: TimelineDay | null) => {
    setIsPlaying(false);
    if (!day || day.segments.length === 0) {
      setCurrentTimestamp(0);
      setPlaybackPosition(null);
      setPlaybackStatus('No activity');
      setPlaybackActivityType(null);
      return;
    }

    const firstSeg = day.segments[0];
    const initialTs = firstSeg.timestamp;
    setCurrentTimestamp(initialTs);

    if (firstSeg.type === 'visit') {
      setPlaybackPosition(firstSeg.data.location);
      setPlaybackStatus(`At ${firstSeg.data.name || firstSeg.data.semanticType || 'Location'}`);
      setPlaybackActivityType('STILL');
    } else {
      const p = firstSeg.data.path[0] || null;
      setPlaybackPosition(p);
      setPlaybackStatus(`Traveling via ${firstSeg.data.type}`);
      setPlaybackActivityType(firstSeg.data.type);
    }
  }, []);

  // Handle Loading Data
  const handleDataLoaded = useCallback((jsonData: any) => {
    try {
      const parsed = parseTimelineJSON(jsonData);
      setTimelineData(parsed);

      if (parsed.sortedDates.length > 0) {
        const initialDate = parsed.sortedDates[0];
        setSelectedDate(initialDate);
        setupDayPlayback(parsed.days[initialDate]);
      }
    } catch (err: any) {
      setUploadError(`Failed to parse timeline JSON: ${err.message}`);
    }
  }, [setupDayPlayback]);

  // Process selected file
  const processFile = (file: File) => {
    setUploadError(null);
    if (!file.name.endsWith('.json')) {
      setUploadError('Please upload a valid .json file (e.g. Timeline.json).');
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        handleDataLoaded(parsed);
        setLoading(false);
      } catch (err: any) {
        setUploadError(`Failed to parse JSON: ${err.message}`);
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setUploadError('Error reading file from disk.');
      setLoading(false);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleLoadDemo = () => {
    handleDataLoaded(sampleTimelineJSON);
  };

  const handleLoadLocalWorkspaceFile = async () => {
    setLoading(true);
    setUploadError(null);
    try {
      const resp = await fetch('./Timeline.json');
      if (!resp.ok) {
        throw new Error('Local Timeline.json not found in root.');
      }
      const data = await resp.json();
      handleDataLoaded(data);
      setLoading(false);
    } catch (err: any) {
      setUploadError(`Could not load local Timeline.json: ${err.message}. Please select your file using the upload box.`);
      setLoading(false);
    }
  };

  // Selected Day object
  const selectedDay: TimelineDay | null =
    timelineData && selectedDate ? timelineData.days[selectedDate] || null : null;

  // Day Min and Max timestamps
  const { minTimestamp, maxTimestamp } = React.useMemo(() => {
    if (!selectedDay || selectedDay.segments.length === 0) {
      return { minTimestamp: 0, maxTimestamp: 0 };
    }
    const first = selectedDay.segments[0];
    const last = selectedDay.segments[selectedDay.segments.length - 1];
    const minTs = first.timestamp;
    const maxTs =
      last.type === 'visit'
        ? last.data.endTimestamp
        : last.data.endTimestamp;
    return { minTimestamp: minTs, maxTimestamp: Math.max(minTs + 1000, maxTs) };
  }, [selectedDay]);

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    if (timelineData?.days[date]) {
      setupDayPlayback(timelineData.days[date]);
    }
  };

  // Interpolate / locate position for a specific timestamp
  const evaluatePlaybackAt = useCallback(
    (ts: number) => {
      if (!selectedDay || selectedDay.segments.length === 0) return;

      // 1. Check if timestamp falls inside any segment
      for (let i = 0; i < selectedDay.segments.length; i++) {
        const seg = selectedDay.segments[i];

        if (seg.type === 'visit') {
          const v = seg.data;
          if (ts >= v.startTimestamp && ts <= v.endTimestamp) {
            setPlaybackPosition(v.location);
            setPlaybackStatus(`At ${v.name || v.semanticType || 'Visited Location'}`);
            setPlaybackActivityType('STILL');
            return;
          }
        } else {
          const a = seg.data;
          if (ts >= a.startTimestamp && ts <= a.endTimestamp) {
            const interpolated = interpolatePosition(a.waypoints, ts);
            if (interpolated) {
              setPlaybackPosition(interpolated);
            }
            setPlaybackStatus(`Traveling via ${a.type}`);
            setPlaybackActivityType(a.type);
            return;
          }
        }
      }

      // 2. If between segments or outside bounds, find closest
      if (ts < minTimestamp) {
        const first = selectedDay.segments[0];
        const pos = first.type === 'visit' ? first.data.location : first.data.path[0];
        setPlaybackPosition(pos || null);
        setPlaybackStatus('Before start of recorded activity');
        setPlaybackActivityType(null);
        return;
      }

      if (ts >= maxTimestamp) {
        const last = selectedDay.segments[selectedDay.segments.length - 1];
        const pos =
          last.type === 'visit'
            ? last.data.location
            : last.data.path[last.data.path.length - 1];
        setPlaybackPosition(pos || null);
        setPlaybackStatus('Day complete');
        setPlaybackActivityType(null);
        return;
      }

      // In between segments (idle)
      for (let i = 0; i < selectedDay.segments.length - 1; i++) {
        const current = selectedDay.segments[i];
        const next = selectedDay.segments[i + 1];
        const currentEnd = current.type === 'visit' ? current.data.endTimestamp : current.data.endTimestamp;
        const nextStart = next.timestamp;

        if (ts > currentEnd && ts < nextStart) {
          const pos = current.type === 'visit' ? current.data.location : current.data.path[current.data.path.length - 1];
          setPlaybackPosition(pos || null);
          setPlaybackStatus('Stationary between trips');
          setPlaybackActivityType('STILL');
          return;
        }
      }
    },
    [selectedDay, minTimestamp, maxTimestamp]
  );

  // Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    lastTickTimeRef.current = performance.now();

    const loop = (time: number) => {
      const dtMs = time - lastTickTimeRef.current;
      lastTickTimeRef.current = time;

      const timeAdvanceMs = dtMs * playbackSpeed * 60;

      setCurrentTimestamp((prev) => {
        const nextTs = prev + timeAdvanceMs;
        if (nextTs >= maxTimestamp) {
          setIsPlaying(false);
          evaluatePlaybackAt(maxTimestamp);
          return maxTimestamp;
        }
        evaluatePlaybackAt(nextTs);
        return nextTs;
      });

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, maxTimestamp, evaluatePlaybackAt]);

  const handleSeek = (newTs: number) => {
    setCurrentTimestamp(newTs);
    evaluatePlaybackAt(newTs);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- 1. INITIAL STATE: User must upload file first ---
  if (!timelineData) {
    return (
      <div className="flex flex-col w-screen h-screen bg-slate-950 text-slate-100 items-center justify-center p-6 relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none -top-32 -left-32"></div>
        <div className="absolute w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none -bottom-32 -right-32"></div>

        <div className="relative z-10 w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">Timeline Crack</h1>
              <p className="text-xs text-slate-400">Watch & Replay Your Visited Timeline</p>
            </div>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-500 bg-indigo-500/15 scale-[1.01]'
                : 'border-slate-700 bg-slate-950/50 hover:border-indigo-500/60 hover:bg-slate-950/80'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".json"
              className="hidden"
            />

            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-3.5 shadow-inner">
              <FileCode className="w-8 h-8" />
            </div>

            <p className="text-sm font-bold text-white mb-1">
              Upload your <span className="text-indigo-400">Timeline.json</span> file
            </p>
            <p className="text-xs text-slate-400">
              Drag and drop here, or click to browse from your device
            </p>
            <span className="mt-3 text-[11px] px-3 py-1 rounded-full bg-slate-800/80 text-slate-300 font-mono">
              Google Maps Timeline Export (.json)
            </span>
          </div>

          {uploadError && (
            <div className="mt-4 flex items-start gap-2.5 p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={handleLoadLocalWorkspaceFile}
              disabled={loading}
              className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-950 hover:bg-indigo-950/50 border border-slate-800 hover:border-indigo-500/40 text-xs font-semibold text-slate-200 transition"
            >
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>Load Workspace File</span>
            </button>

            <button
              onClick={handleLoadDemo}
              disabled={loading}
              className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-950 hover:bg-indigo-950/50 border border-slate-800 hover:border-indigo-500/40 text-xs font-semibold text-indigo-300 transition"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Try Demo Timeline</span>
            </button>
          </div>

          <div className="mt-5 flex items-start gap-2.5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-slate-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-300 block mb-0.5">100% Client-Side Privacy</strong>
              Your location data never leaves your device. All parsing and map playback happens completely in your browser.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. AFTER UPLOAD: Clean full-screen map with playback bar and analytics button ---
  const dates = timelineData.sortedDates;
  const currentIndex = dates.indexOf(selectedDate);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < dates.length - 1;

  return (
    <div className="flex flex-col w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans relative">
      {/* Floating Minimal Top Bar: Date navigation & Upload new file */}
      <div className="absolute top-4 left-4 z-[450] flex items-center gap-2">
        <div className="glass-panel px-3 py-1.5 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-800">
          <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-white hidden sm:inline">Timeline Crack</span>

          {dates.length > 0 && (
            <div className="flex items-center gap-1 border-l border-slate-700/60 pl-2 ml-1">
              <button
                onClick={() => hasPrev && handleSelectDate(dates[currentIndex - 1])}
                disabled={!hasPrev}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 transition"
                title="Previous day"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1.5 px-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <select
                  value={selectedDate}
                  onChange={(e) => handleSelectDate(e.target.value)}
                  className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
                >
                  {dates.map((d) => (
                    <option key={d} value={d} className="bg-slate-900 text-white">
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => hasNext && handleSelectDate(dates[currentIndex + 1])}
                disabled={!hasNext}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 transition"
                title="Next day"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={() => setIsStatsOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 transition ml-1"
            title="View Travel Analytics"
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => setTimelineData(null)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Upload different file"
          >
            <UploadCloud className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Full-Screen Map */}
      <div className="w-full h-full relative">
        <TimelineMap
          selectedDay={selectedDay}
          focusedItemId={null}
          playbackPosition={playbackPosition}
          playbackStatus={playbackStatus}
          playbackActivityType={playbackActivityType}
          rawSignals={timelineData.rawSignals}
        />

        {/* Floating Bottom: Playback Controls Bar with Analytics */}
        {selectedDay && selectedDay.segments.length > 0 && (
          <div className="absolute bottom-5 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[720px] z-[450] animate-slide-up">
            <PlaybackControls
              isPlaying={isPlaying}
              speed={playbackSpeed}
              currentTimestamp={currentTimestamp}
              minTimestamp={minTimestamp}
              maxTimestamp={maxTimestamp}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onSeek={handleSeek}
              onChangeSpeed={(s) => setPlaybackSpeed(s)}
              onReset={() => {
                setIsPlaying(false);
                handleSeek(minTimestamp);
              }}
              onOpenStats={() => setIsStatsOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Analytics Modal */}
      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        timelineData={timelineData}
      />
    </div>
  );
};
