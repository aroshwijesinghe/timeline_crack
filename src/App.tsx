import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ParsedTimeline,
  LatLng,
  TimelineDay
} from './types/timeline';
import { parseTimelineJSON } from './utils/timelineParser';
import { interpolatePosition } from './utils/geoUtils';
import { Header } from './components/Header/Header';
import { TimelineMap } from './components/Map/TimelineMap';
import { TimelineFeed } from './components/Sidebar/TimelineFeed';
import { PlaybackControls } from './components/Playback/PlaybackControls';
import { StatsModal } from './components/Stats/StatsModal';
import { UploadModal } from './components/Upload/UploadModal';
import { sampleTimelineJSON } from './demo/sampleTimeline';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export const App: React.FC = () => {
  const [timelineData, setTimelineData] = useState<ParsedTimeline | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(30); // 30x real-time by default
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
  const [playbackPosition, setPlaybackPosition] = useState<LatLng | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<string>('Ready');
  const [playbackActivityType, setPlaybackActivityType] = useState<string | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(0);

  // Handle Loading Data
  const handleDataLoaded = useCallback((jsonData: any) => {
    try {
      const parsed = parseTimelineJSON(jsonData);
      setTimelineData(parsed);

      if (parsed.sortedDates.length > 0) {
        // Default to the first day or most active day
        const initialDate = parsed.sortedDates[0];
        setSelectedDate(initialDate);
        setupDayPlayback(parsed.days[initialDate]);
      }
    } catch (err) {
      console.error('Error parsing timeline JSON:', err);
    }
  }, []);

  // Try auto-loading Timeline.json from workspace on initial render
  useEffect(() => {
    fetch('./Timeline.json')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not found');
      })
      .then((data) => {
        handleDataLoaded(data);
      })
      .catch(() => {
        // If not in root or failed, fallback to sample demo data
        handleDataLoaded(sampleTimelineJSON);
      });
  }, [handleDataLoaded]);

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

  // Setup playback when day changes
  const setupDayPlayback = (day: TimelineDay | null) => {
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
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setFocusedItemId(null);
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

      // Speed multipliers (playbackSpeed * 60 seconds per second of real time)
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

  // Handle Seek from Slider
  const handleSeek = (newTs: number) => {
    setCurrentTimestamp(newTs);
    evaluatePlaybackAt(newTs);
  };

  // Handle Keyboard Shortcuts
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

  // Export GeoJSON
  const handleExportGeoJSON = () => {
    if (!selectedDay) return;

    const features: any[] = [];

    // Visits as Points
    selectedDay.visits.forEach((v, idx) => {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [v.location[1], v.location[0]]
        },
        properties: {
          type: 'visit',
          stopIndex: idx + 1,
          name: v.name || v.semanticType || 'Stop',
          startTime: v.startTime,
          endTime: v.endTime,
          duration: v.durationFormatted
        }
      });
    });

    // Activities as LineStrings
    selectedDay.activities.forEach((a) => {
      if (a.path.length > 0) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: a.path.map((p) => [p[1], p[0]])
          },
          properties: {
            type: 'activity',
            activityType: a.type,
            distanceMeters: a.distanceMeters,
            distanceKm: a.distanceKm,
            duration: a.durationFormatted,
            startTime: a.startTime,
            endTime: a.endTime
          }
        });
      }
    });

    const geoJson = {
      type: 'FeatureCollection',
      name: `Timeline_${selectedDay.dateStr}`,
      features
    };

    const blob = new Blob([JSON.stringify(geoJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timeline-${selectedDay.dateStr}.geojson`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Header */}
      <Header
        timelineData={timelineData}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onExportGeoJSON={handleExportGeoJSON}
      />

      {/* Main Workspace: Left Sidebar + Map View */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Collapsible Left Sidebar: Chronological Feed */}
        <div
          className={`relative z-20 flex flex-col transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'w-80 sm:w-96' : 'w-0'
          }`}
        >
          {sidebarOpen && (
            <TimelineFeed
              selectedDay={selectedDay}
              focusedItemId={focusedItemId}
              onFocusItem={(id) => setFocusedItemId(id)}
            />
          )}

          {/* Toggle Sidebar Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute -right-9 top-4 z-30 p-2 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white rounded-r-xl border-y border-r border-slate-700/60 shadow-lg backdrop-blur"
            title={sidebarOpen ? 'Hide feed panel' : 'Show feed panel'}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Center: Leaflet Interactive Map */}
        <div className="flex-1 h-full relative">
          <TimelineMap
            selectedDay={selectedDay}
            focusedItemId={focusedItemId}
            playbackPosition={playbackPosition}
            playbackStatus={playbackStatus}
            playbackActivityType={playbackActivityType}
            rawSignals={timelineData?.rawSignals || []}
            onSelectVisit={(v) => setFocusedItemId(v.id)}
            onSelectActivity={(a) => setFocusedItemId(a.id)}
          />

          {/* Floating Bottom Playback Controls */}
          {selectedDay && selectedDay.segments.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-[650px] z-[450] animate-slide-up">
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
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDataLoaded={handleDataLoaded}
        hasExistingData={!!timelineData}
      />

      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        timelineData={timelineData}
      />
    </div>
  );
};
