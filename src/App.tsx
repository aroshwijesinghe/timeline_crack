import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  ParsedTimeline,
  TimelineDay
} from './types/timeline';
import { parseTimelineJSON } from './utils/timelineParser';
import { TimelineMap } from './components/Map/TimelineMap';
import { StatsModal } from './components/Stats/StatsModal';
import { CalendarModal } from './components/Calendar/CalendarModal';
import { sampleTimelineJSON } from './demo/sampleTimeline';
import {
  UploadCloud,
  FileCode,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  BarChart3,
  Smartphone,
  Apple,
  HelpCircle
} from 'lucide-react';

export const App: React.FC = () => {
  const [timelineData, setTimelineData] = useState<ParsedTimeline | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Initial upload screen state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [guideTab, setGuideTab] = useState<'android' | 'ios'>('android');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Loading Data
  const handleDataLoaded = useCallback((jsonData: any) => {
    try {
      const parsed = parseTimelineJSON(jsonData);
      setTimelineData(parsed);

      if (parsed.sortedDates.length > 0) {
        // Automatically select the most active day (highest distance & activities)
        let bestDate = parsed.sortedDates[0];
        let maxScore = -1;
        for (const d of parsed.sortedDates) {
          const day = parsed.days[d];
          const score = day.totalDistanceKm * 10 + day.activities.length * 5 + day.visits.length;
          if (score > maxScore) {
            maxScore = score;
            bestDate = d;
          }
        }
        setSelectedDate(bestDate);
      }
    } catch (err: any) {
      setUploadError(`Failed to parse timeline JSON: ${err.message}`);
    }
  }, []);

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

  // Selected Day object (supports individual dates, range period 'YYYY-MM-DD..YYYY-MM-DD', or 'all')
  const selectedDay: TimelineDay | null = React.useMemo(() => {
    if (!timelineData) return null;
    if (selectedDate === 'all') {
      const allSegments = Object.values(timelineData.days).flatMap((d) => d.segments);
      const allVisits = Object.values(timelineData.days).flatMap((d) => d.visits);
      const allActivities = Object.values(timelineData.days).flatMap((d) => d.activities);
      return {
        dateStr: 'all',
        displayDate: 'All Recorded Dates Combined',
        segments: allSegments,
        visits: allVisits,
        activities: allActivities,
        totalDistanceMeters: Math.round(timelineData.stats.totalDistanceKm * 1000),
        totalDistanceKm: timelineData.stats.totalDistanceKm,
        totalActiveDurationMs: 0,
        bounds: timelineData.overallBounds
      };
    }

    if (selectedDate.includes('..')) {
      const [start, end] = selectedDate.split('..');
      const matchingDates = Object.keys(timelineData.days)
        .filter((d) => d >= start && d <= end)
        .sort();

      const matchingDays = matchingDates.map((d) => timelineData.days[d]);
      const segments = matchingDays
        .flatMap((d) => d.segments)
        .sort((a, b) => a.timestamp - b.timestamp);
      const visits = matchingDays.flatMap((d) => d.visits);
      const activities = matchingDays.flatMap((d) => d.activities);
      const totalDist = matchingDays.reduce((acc, d) => acc + d.totalDistanceKm, 0);

      let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
      let hasCoords = false;
      matchingDays.forEach((d) => {
        if (d.bounds) {
          minLat = Math.min(minLat, d.bounds[0][0], d.bounds[1][0]);
          maxLat = Math.max(maxLat, d.bounds[0][0], d.bounds[1][0]);
          minLng = Math.min(minLng, d.bounds[0][1], d.bounds[1][1]);
          maxLng = Math.max(maxLng, d.bounds[0][1], d.bounds[1][1]);
          hasCoords = true;
        }
      });

      return {
        dateStr: selectedDate,
        displayDate: `${start} to ${end} (${matchingDays.length} active days)`,
        segments,
        visits,
        activities,
        totalDistanceMeters: Math.round(totalDist * 1000),
        totalDistanceKm: Number(totalDist.toFixed(1)),
        totalActiveDurationMs: 0,
        bounds: hasCoords ? [[minLat, minLng], [maxLat, maxLng]] : timelineData.overallBounds
      };
    }

    return selectedDate ? timelineData.days[selectedDate] || null : null;
  }, [timelineData, selectedDate]);

  const handleSelectDate = (dateOrPeriod: string) => {
    setSelectedDate(dateOrPeriod);
  };

  // User-friendly label for current time period
  const periodLabel = useMemo(() => {
    if (!timelineData) return '';
    if (selectedDate === 'all') {
      return `All Dates (${timelineData.sortedDates.length} days)`;
    }
    if (selectedDate.includes('..')) {
      const [start, end] = selectedDate.split('..');
      return `${start} → ${end}`;
    }
    return selectedDate;
  }, [selectedDate, timelineData]);

  const handleOpenAnalytics = () => {
    setIsStatsOpen(true);
  };

  // --- 1. INITIAL LOADING STATE: Atmospheric, Human-Crafted Hero Screen ---
  if (!timelineData) {
    return (
      <div className="min-h-screen w-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-start p-4 sm:p-8 relative overflow-y-auto selection:bg-indigo-500 selection:text-white">
        {/* Luminous Ambient Glowing Orbs */}
        <div className="fixed w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-indigo-600/15 via-violet-600/10 to-transparent blur-[140px] pointer-events-none -top-40 -left-40 animate-pulse-glow" />
        <div className="fixed w-[600px] h-[600px] rounded-full bg-gradient-to-br from-rose-500/10 via-amber-500/10 to-transparent blur-[140px] pointer-events-none -bottom-40 -right-40 animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
        <div className="fixed w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none top-1/3 left-1/2 -translate-x-1/2" />

        <div className="relative z-10 w-full max-w-2xl flex flex-col items-center my-auto py-8">
          {/* Main Title & Purpose */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-4 group">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-400 opacity-75 blur-md group-hover:opacity-100 transition duration-500" />
              <div className="relative w-16 h-16 rounded-3xl bg-slate-900 border border-white/20 flex items-center justify-center shadow-2xl">
                <MapPin className="w-8 h-8 text-cyan-400" />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-cyan-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3 shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Personal Timeline & Route Visualizer</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
              Relive Your <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-rose-400 bg-clip-text text-transparent">Journeys</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-lg leading-relaxed">
              Explore visited places, replay paths with directional vectors, and unlock beautiful insights across any selected time period.
            </p>
          </div>

          {/* Upload Drop Zone Card */}
          <div className="w-full glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col mb-6 border border-white/10 relative overflow-hidden group">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
                  : 'border-slate-700/80 bg-slate-950/40 hover:border-indigo-400/60 hover:bg-slate-900/60 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".json"
                className="hidden"
              />

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600/30 to-violet-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-4 shadow-inner group-hover:scale-105 transition duration-300">
                <FileCode className="w-8 h-8 text-cyan-300" />
              </div>

              <p className="text-base font-bold text-white mb-1">
                Drop your <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-300 font-extrabold">Timeline.json</span> here
              </p>
              <p className="text-xs text-slate-400">
                Drag and drop your file, or click anywhere to browse
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[11px] px-3 py-1 rounded-full bg-slate-800/80 text-slate-300 font-mono border border-slate-700/60">
                  Google Maps Export (.json)
                </span>
              </div>
            </div>

            {uploadError && (
              <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
              <span className="text-xs text-slate-400">Don't have your file yet?</span>
              <button
                onClick={handleLoadDemo}
                disabled={loading}
                className="py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-600/30 via-violet-600/30 to-pink-600/20 hover:from-indigo-600/50 hover:to-pink-600/40 border border-indigo-500/30 text-xs font-bold text-indigo-200 hover:text-white transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>Explore Interactive Demo</span>
              </button>
            </div>
          </div>

          {/* Guide: How to Get Timeline.json File */}
          <div className="w-full glass-panel rounded-3xl p-6 shadow-xl border border-white/10">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">How to Get Your Timeline.json</h2>
              </div>

              {/* Platform Tabs */}
              <div className="flex gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setGuideTab('android')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                    guideTab === 'android'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android</span>
                </button>
                <button
                  onClick={() => setGuideTab('ios')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                    guideTab === 'ios'
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Apple className="w-3.5 h-3.5" />
                  <span>iPhone (iOS)</span>
                </button>
              </div>
            </div>

            {/* Option 1: Android Phone Instructions */}
            {guideTab === 'android' && (
              <div className="text-xs text-slate-300 space-y-2.5 animate-fade-in">
                <div className="font-semibold text-cyan-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Android Settings Export</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 leading-relaxed text-slate-300">
                  <li>Open your phone's <strong>Settings</strong> (gear icon).</li>
                  <li>Go to <strong>Location</strong>, then tap <strong>Location Services</strong>.</li>
                  <li>Select <strong>Timeline</strong> (choose your Google account if prompted).</li>
                  <li>Scroll down and tap <strong>Export Timeline data</strong>.</li>
                  <li>Tap <strong>Continue</strong> to download <code className="text-indigo-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">Timeline.json</code>.</li>
                </ol>
              </div>
            )}

            {/* Option 2: iPhone (iOS) Instructions */}
            {guideTab === 'ios' && (
              <div className="text-xs text-slate-300 space-y-2.5 animate-fade-in">
                <div className="font-semibold text-cyan-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Google Maps iOS App Export</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 leading-relaxed text-slate-300">
                  <li>Open the <strong>Google Maps</strong> app on your iPhone.</li>
                  <li>Tap your <strong>Profile avatar</strong> in the top right &gt; <strong>Settings</strong>.</li>
                  <li>Scroll down and tap <strong>Personal content</strong>.</li>
                  <li>Look for <strong>Export Timeline data</strong> and download your local <code className="text-indigo-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">Timeline.json</code>.</li>
                </ol>
              </div>
            )}
          </div>

          {/* Privacy Guarantee */}
          <div className="w-full mt-4 flex items-start gap-3 p-3.5 rounded-2xl glass-panel border border-emerald-500/20 text-slate-300 text-xs">
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <strong className="text-emerald-400 block mb-0.5 font-bold">100% Private & Client-Side</strong>
              Your location history never leaves your device. All calculations, route visualizations, and analytics run locally in your browser.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. AFTER FILE UPLOADING: Modern Floating Island Header & Full-Screen Canvas ---
  const dates = timelineData.sortedDates;
  const currentIndex = dates.indexOf(selectedDate);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < dates.length - 1;

  return (
    <div className="flex flex-col w-screen h-screen bg-[#070b14] text-slate-100 overflow-hidden font-sans relative select-none">
      {/* Top Floating Control Capsule */}
      <div className="absolute top-4 left-4 right-4 sm:right-auto sm:left-6 z-[450] flex items-center justify-between sm:justify-start gap-2.5 pointer-events-none">
        <div className="glass-panel p-1.5 sm:p-2 rounded-2xl shadow-2xl flex items-center gap-2 border border-white/10 pointer-events-auto backdrop-blur-2xl">
          {/* Brand Emblem */}
          <div className="flex items-center gap-2 pr-1 sm:pr-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 border border-white/20">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="font-extrabold text-xs tracking-tight text-white leading-none">Timeline Crack</span>
              <span className="text-[9px] text-slate-400 leading-none mt-0.5">Journey Studio</span>
            </div>
          </div>

          {/* Selected Time Period: Interactive Calendar Pill & Steppers */}
          {dates.length > 0 && (
            <div className="flex items-center gap-1 border-l border-white/10 pl-1.5 sm:pl-2">
              <button
                onClick={() => hasPrev && handleSelectDate(dates[currentIndex - 1])}
                disabled={!hasPrev}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all cursor-pointer active:scale-90"
                title="Previous recorded date"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Interactive Calendar Trigger Button */}
              <button
                onClick={() => setIsCalendarOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 text-white border border-white/10 hover:border-indigo-400/50 transition-all shadow-inner cursor-pointer group active:scale-98"
                title="Open calendar to choose date or time period"
              >
                <div className="w-5 h-5 rounded-lg bg-indigo-500/20 text-cyan-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-xs text-white max-w-[150px] sm:max-w-[240px] truncate leading-tight">
                    {periodLabel}
                  </span>
                  {selectedDay && (
                    <span className="text-[10px] text-slate-400 leading-none font-mono">
                      <span className="text-emerald-400 font-semibold">{selectedDay.totalDistanceKm} km</span> • {selectedDay.visits.length} stops
                    </span>
                  )}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors ml-0.5" />
              </button>

              <button
                onClick={() => hasNext && handleSelectDate(dates[currentIndex + 1])}
                disabled={!hasNext}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-all cursor-pointer active:scale-90"
                title="Next recorded date"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Trip Analytics Button */}
          <button
            onClick={handleOpenAnalytics}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 border border-white/15"
            title="Open Trip & Route Analytics Dashboard"
          >
            <BarChart3 className="w-3.5 h-3.5 text-cyan-200" />
            <span className="hidden sm:inline">Analytics</span>
          </button>

          {/* Upload Different File Button */}
          <button
            onClick={() => setTimelineData(null)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Upload a different Timeline.json file"
          >
            <UploadCloud className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Full-Screen Map with Hardware-Accelerated Rendering */}
      <div className="w-full h-full relative">
        <TimelineMap
          selectedDay={selectedDay}
          focusedItemId={null}
          rawSignals={timelineData.rawSignals}
        />
      </div>

      {/* Interactive Calendar Time Period Selector Modal */}
      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        timelineData={timelineData}
        selectedDate={selectedDate}
        onSelectPeriod={handleSelectDate}
      />

      {/* Analytics Modal */}
      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        timelineData={timelineData}
        selectedDay={selectedDay}
        selectedDate={selectedDate}
      />
    </div>
  );
};
