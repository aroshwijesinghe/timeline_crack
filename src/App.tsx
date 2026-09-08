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

  // --- 1. INITIAL LOADING STATE: Eco-Dark Hero Screen (Matching Reference Image) ---
  if (!timelineData) {
    return (
      <div className="min-h-screen w-full bg-[#040704] text-slate-100 flex flex-col items-center justify-start p-4 sm:p-8 relative selection:bg-lime-500 selection:text-black font-sans">
        {/* Luminous Organic Green Ambient Glows */}
        <div className="fixed w-[600px] h-[600px] rounded-full bg-lime-500/12 blur-[140px] pointer-events-none -top-20 -left-20 animate-eco-glow" />
        <div className="fixed w-[550px] h-[550px] rounded-full bg-emerald-500/10 blur-[140px] pointer-events-none top-1/4 right-0 animate-eco-glow" style={{ animationDelay: '1.8s' }} />
        <div className="fixed w-[450px] h-[450px] rounded-full bg-lime-400/8 blur-[120px] pointer-events-none -bottom-20 left-1/3" />

        <div className="relative z-10 w-full max-w-7xl mx-auto my-auto py-6 sm:py-10">
          {/* 3-Column Left to Right Arrangement of Hero, Dropzone, and Guide */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch w-full">
            {/* Part 1 (Left): Logo, Branding & Welcome */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-lime-500/20 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-lime-500/15 blur-2xl pointer-events-none" />

              <div>
                {/* Logo & Brand Icon */}
                <div className="relative mb-6 group inline-block">
                  <div className="absolute -inset-2 rounded-3xl bg-lime-400/25 blur-lg group-hover:bg-lime-400/40 transition duration-500" />
                  <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-b from-[#263124] to-[#0c120b] border border-lime-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(132,204,22,0.4)]">
                    <MapPin className="w-8 h-8 text-[#a3e635] fill-[#a3e635]/20" />
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-lime-950/60 border border-lime-500/30 text-[#a3e635] text-[11px] font-bold uppercase tracking-widest mb-3 shadow-inner">
                  <Sparkles className="w-3.5 h-3.5 text-[#bef264]" />
                  <span>Personal Timeline & Route Studio</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-3xl xl:text-4xl font-extrabold tracking-tight text-white mb-3 font-heading uppercase leading-tight">
                  Welcome to <span className="text-[#a3e635] drop-shadow-[0_0_15px_rgba(163,230,53,0.4)]">Timeline</span>
                </h1>

                <p className="text-sm text-slate-300 leading-relaxed font-sans mb-6">
                  Visualize your visited paths, replay journeys with directional vectors, and explore travel analytics with crisp precision.
                </p>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-2.5 pt-6 border-t border-white/10">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <div className="w-2 h-2 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.8)] shrink-0" />
                  <span>Interactive Directional Vector Paths</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] shrink-0" />
                  <span>Comprehensive Daily & Periodic Travel Stats</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] shrink-0" />
                  <span>High-Resolution Satellite, Streets & Dark Maps</span>
                </div>
              </div>
            </div>

            {/* Part 2 (Center): Upload Drop Zone Card & Privacy Guarantee */}
            <div className="flex flex-col justify-between gap-4">
              <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between border border-lime-500/20 relative overflow-hidden group flex-1">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 flex-1 ${
                    isDragging
                      ? 'border-[#a3e635] bg-lime-500/15 scale-[1.01]'
                      : 'border-white/10 bg-black/40 hover:border-lime-500/50 hover:bg-black/60 hover:shadow-[0_0_30px_rgba(132,204,22,0.2)]'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".json"
                    className="hidden"
                  />

                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#253023] to-[#0c120b] text-[#a3e635] border border-lime-500/30 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(132,204,22,0.25)] group-hover:scale-105 transition duration-300">
                    <FileCode className="w-8 h-8 text-[#bef264]" />
                  </div>

                  <p className="text-base font-extrabold text-white mb-1 font-heading uppercase tracking-wide">
                    Drop your <span className="text-[#a3e635]">Timeline.json</span> file here
                  </p>
                  <p className="text-xs text-slate-400">
                    Drag and drop your file, or click anywhere to browse
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[11px] px-3 py-1 rounded-full bg-black/60 text-slate-300 font-mono border border-white/10">
                      Google Maps Export (.json)
                    </span>
                  </div>
                </div>

                {uploadError && (
                  <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t border-white/10">
                  <span className="text-xs text-slate-400">Don't have your file ready?</span>
                  <button
                    onClick={handleLoadDemo}
                    disabled={loading}
                    className="py-2 px-4 rounded-xl bg-gradient-to-r from-lime-600 to-emerald-600 hover:from-lime-500 hover:to-emerald-500 text-black font-extrabold text-xs transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(132,204,22,0.3)] cursor-pointer active:scale-95 uppercase tracking-wide font-heading"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-black" />
                    <span>Try Demo Timeline</span>
                  </button>
                </div>
              </div>

              {/* Privacy Guarantee Segment (Directly near file uploading) */}
              <div className="w-full flex items-start gap-3 p-3.5 rounded-2xl glass-panel border border-lime-500/25 text-slate-300 text-xs shadow-lg">
                <div className="p-1.5 rounded-xl bg-lime-500/15 text-[#a3e635] shrink-0 mt-0.5 border border-lime-500/30">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-[#a3e635] block mb-0.5 font-bold uppercase tracking-wide font-heading">100% Client-Side Privacy</strong>
                  Your location history never leaves your device. All calculations, route visualizations, and analytics run entirely in your local browser.
                </div>
              </div>
            </div>

            {/* Part 3 (Right): How to Export Guide */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-xl border border-lime-500/20 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#a3e635]" />
                    <h2 className="text-xs sm:text-sm font-extrabold text-white font-heading uppercase tracking-wide">
                      How to Export Timeline.json
                    </h2>
                  </div>

                  {/* Platform Tabs */}
                  <div className="flex gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-xs font-bold font-heading">
                    <button
                      onClick={() => setGuideTab('android')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                        guideTab === 'android'
                          ? 'bg-gradient-to-b from-[#2b3629] to-[#121911] text-[#a3e635] border border-lime-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Android</span>
                    </button>
                    <button
                      onClick={() => setGuideTab('ios')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                        guideTab === 'ios'
                          ? 'bg-gradient-to-b from-[#2b3629] to-[#121911] text-[#a3e635] border border-lime-500/40 shadow-sm'
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
                    <div className="font-bold text-[#a3e635] text-xs uppercase tracking-wider flex items-center gap-1.5 font-heading">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a3e635]" />
                      <span>Android Settings Export</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-2 leading-relaxed text-slate-300 text-xs">
                      <li>Open your phone's <strong>Settings</strong> (gear icon).</li>
                      <li>Go to <strong>Location</strong>, then tap <strong>Location Services</strong>.</li>
                      <li>Select <strong>Timeline</strong> (choose your Google account if prompted).</li>
                      <li>Scroll down and tap <strong>Export Timeline data</strong>.</li>
                      <li>Tap <strong>Continue</strong> to download <code className="text-[#bef264] bg-black px-1.5 py-0.5 rounded border border-lime-900/50">Timeline.json</code>.</li>
                    </ol>
                  </div>
                )}

                {/* Option 2: iPhone (iOS) Instructions */}
                {guideTab === 'ios' && (
                  <div className="text-xs text-slate-300 space-y-2.5 animate-fade-in">
                    <div className="font-bold text-[#a3e635] text-xs uppercase tracking-wider flex items-center gap-1.5 font-heading">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a3e635]" />
                      <span>Google Maps iOS App Export</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-2 leading-relaxed text-slate-300 text-xs">
                      <li>Open the <strong>Google Maps</strong> app on your iPhone.</li>
                      <li>Tap your <strong>Profile avatar</strong> in the top right &gt; <strong>Settings</strong>.</li>
                      <li>Scroll down and tap <strong>Personal content</strong>.</li>
                      <li>Look for <strong>Export Timeline data</strong> and download your local <code className="text-[#bef264] bg-black px-1.5 py-0.5 rounded border border-lime-900/50">Timeline.json</code>.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. AFTER FILE UPLOADING: Glossy Dark Smoked Floating Navigation Bar ---
  const dates = timelineData.sortedDates;
  const currentIndex = dates.indexOf(selectedDate);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < dates.length - 1;

  return (
    <div className="flex flex-col w-full h-screen bg-[#040704] text-slate-100 overflow-hidden font-sans relative select-none">
      {/* Top Floating Control Dock (Smoked Glass Bar with Lime Accents) */}
      <div className="absolute top-4 left-4 right-4 sm:right-auto sm:left-6 z-[450] flex items-center justify-between sm:justify-start gap-2.5 pointer-events-none">
        <div className="glass-panel p-1.5 sm:p-2 rounded-2xl shadow-2xl flex items-center gap-2 border border-lime-500/20 pointer-events-auto backdrop-blur-2xl">
          {/* Brand Emblem (Location Pin Icon with Radiant Glow) */}
          <div className="flex items-center gap-2 pr-1 sm:pr-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#2d382b] to-[#0d130c] text-[#a3e635] flex items-center justify-center shadow-[0_0_15px_rgba(132,204,22,0.4)] border border-lime-500/40">
              <MapPin className="w-4 h-4 text-[#a3e635] fill-[#a3e635]/20" />
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="font-extrabold text-xs tracking-wider text-white uppercase font-heading leading-none">Timeline</span>
              <span className="text-[9px] text-[#a3e635] font-semibold leading-none mt-0.5">Journey Studio</span>
            </div>
          </div>

          {/* Selected Time Period: Interactive Calendar Pill & Steppers */}
          {dates.length > 0 && (
            <div className="flex items-center gap-1 border-l border-white/10 pl-1.5 sm:pl-2">
              <button
                onClick={() => hasPrev && handleSelectDate(dates[currentIndex - 1])}
                disabled={!hasPrev}
                className="p-1.5 rounded-xl text-slate-400 hover:text-[#a3e635] hover:bg-white/5 disabled:opacity-20 transition-all cursor-pointer active:scale-90"
                title="Previous recorded date"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Interactive Calendar Trigger Button (Highlighted like active 'Partners' tab) */}
              <button
                onClick={() => setIsCalendarOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-b from-[#20291e] to-[#0c120b] text-[#a3e635] border border-lime-500/40 hover:border-lime-400/80 transition-all shadow-[0_0_15px_rgba(132,204,22,0.2)] cursor-pointer group active:scale-98"
                title="Open calendar to choose date or time period"
              >
                <div className="w-5 h-5 rounded-lg bg-lime-500/20 text-[#bef264] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-xs text-white max-w-[150px] sm:max-w-[240px] truncate leading-tight font-heading">
                    {periodLabel}
                  </span>
                  {selectedDay && (
                    <span className="text-[10px] text-slate-300 leading-none font-mono">
                      <span className="text-[#a3e635] font-bold">{selectedDay.totalDistanceKm} km</span> • {selectedDay.visits.length} stops
                    </span>
                  )}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#a3e635] group-hover:text-white transition-colors ml-0.5" />
              </button>

              <button
                onClick={() => hasNext && handleSelectDate(dates[currentIndex + 1])}
                disabled={!hasNext}
                className="p-1.5 rounded-xl text-slate-400 hover:text-[#a3e635] hover:bg-white/5 disabled:opacity-20 transition-all cursor-pointer active:scale-90"
                title="Next recorded date"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Trip Analytics Button (Glossy Lime Pill) */}
          <button
            onClick={handleOpenAnalytics}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold text-black bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-400 hover:to-emerald-400 shadow-[0_0_15px_rgba(132,204,22,0.35)] transition-all cursor-pointer active:scale-95 border border-lime-300/30 uppercase tracking-wide font-heading"
            title="Open Trip & Route Analytics Dashboard"
          >
            <BarChart3 className="w-3.5 h-3.5 text-black" />
            <span className="hidden sm:inline">Analytics</span>
          </button>

          {/* Upload Different File Button */}
          <button
            onClick={() => setTimelineData(null)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-[#a3e635] hover:bg-white/5 transition-all cursor-pointer"
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
