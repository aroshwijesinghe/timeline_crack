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

  // --- 1. INITIAL LOADING STATE: Eco-Dark Studio Screen ---
  if (!timelineData) {
    return (
      <div className="min-h-screen w-full bg-[#040704] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative selection:bg-lime-500 selection:text-black font-sans overflow-x-hidden">
        {/* Subtle Geometric Cartographic Grid Pattern */}
        <div className="fixed inset-0 opacity-[0.035] pointer-events-none bg-[radial-gradient(#a3e635_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Luminous Organic Green Ambient Glows */}
        <div className="fixed w-[650px] h-[650px] rounded-full bg-lime-500/10 blur-[160px] pointer-events-none -top-24 -left-20 animate-eco-glow" />
        <div className="fixed w-[600px] h-[600px] rounded-full bg-emerald-500/8 blur-[160px] pointer-events-none top-1/3 right-0 animate-eco-glow" style={{ animationDelay: '2s' }} />
        <div className="fixed w-[500px] h-[500px] rounded-full bg-lime-400/6 blur-[140px] pointer-events-none -bottom-20 left-1/4" />

        {/* Sleek Top Navigation Bar */}
        <header className="relative z-10 w-full max-w-[1540px] mx-auto flex items-center justify-between py-3.5 sm:py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#a3e635] shadow-[0_0_10px_#a3e635] animate-pulse" />
            <span className="font-heading font-black tracking-wider uppercase text-sm sm:text-base text-white">
              Timeline Studio
            </span>
            <span className="hidden sm:inline-flex text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-lime-500/15 border border-lime-500/30 text-[#bef264]">
              v2.4 Live
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-xs">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-lime-400" />
              <span className="hidden sm:inline font-medium">100% In-Browser Privacy</span>
              <span className="sm:hidden font-medium">Private</span>
            </div>
            <button
              onClick={handleLoadDemo}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-lime-500/20 to-emerald-500/20 hover:from-lime-500/30 hover:to-emerald-500/30 border border-lime-500/40 text-xs font-bold text-[#bef264] hover:text-white transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <span>Quick Demo</span>
            </button>
          </div>
        </header>

        {/* Main Content Area (Full Width, Balanced, 3-Column Left-to-Right Panoramic Grid) */}
        <main className="relative z-10 w-full max-w-[1540px] mx-auto my-auto py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8 items-stretch w-full">

            {/* Part 1 (Left): Welcome Hero & Interactive Feature Highlights */}
            <div className="flex flex-col justify-between py-1 lg:pr-2 h-full">
              <div>
                {/* Animated Logo Beacon & Studio Badge */}
                <div className="flex items-center gap-3.5 mb-5">
                  <div className="relative group cursor-pointer select-none">
                    <div className="absolute -inset-2.5 rounded-2xl bg-lime-400/25 blur-xl group-hover:bg-lime-400/45 transition duration-500 animate-pulse" />
                    <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-b from-[#243623] via-[#142012] to-[#070c06] border border-lime-500/50 flex items-center justify-center overflow-hidden shadow-[0_0_25px_rgba(132,204,22,0.4)] transition-transform duration-300 group-hover:scale-105">
                      {/* Rotating Radar Sweep Beam */}
                      <div
                        className="absolute -inset-3 rounded-full animate-radar-sweep pointer-events-none opacity-40"
                        style={{
                          background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(163, 230, 53, 0.5) 360deg)',
                        }}
                      />

                      {/* Concentric GPS Radar Ping Waves */}
                      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 pointer-events-none flex items-center justify-center">
                        <span className="absolute w-7 h-7 rounded-full border border-lime-400/70 animate-ripple-1 pointer-events-none" />
                        <span className="absolute w-7 h-7 rounded-full border border-emerald-400/50 animate-ripple-2 pointer-events-none" />
                        <span className="w-1.5 h-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_#bef264]" />
                      </div>

                      {/* Orbiting Satellite Dot */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="animate-orbit-satellite">
                          <span className="block w-1.5 h-1.5 rounded-full bg-[#bef264] shadow-[0_0_6px_#bef264]" />
                        </div>
                      </div>

                      {/* Floating Location Pin */}
                      <div className="relative z-10 animate-beacon-float mb-1 flex items-center justify-center">
                        <MapPin className="w-7 h-7 text-[#bef264] fill-[#bef264]/25 drop-shadow-[0_0_8px_rgba(190,242,100,0.7)]" />
                      </div>

                      {/* Breathing ground shadow */}
                      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full bg-black/80 blur-[1px] animate-beacon-shadow" />
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-lime-950/70 border border-lime-500/35 text-[#a3e635] text-xs font-extrabold uppercase tracking-widest shadow-[0_0_15px_rgba(132,204,22,0.15)] backdrop-blur-md">
                    <span>Personal Timeline Studio</span>
                  </div>
                </div>

                {/* Impactful Headline */}
                <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight text-white mb-6 font-heading uppercase leading-[1.05]">
                  Welcome to <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a3e635] via-[#bef264] to-[#34d399] drop-shadow-[0_0_25px_rgba(163,230,53,0.35)]">
                    Timeline
                  </span>
                </h1>

                {/* Narrative Subtitle */}
                <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-sans max-w-md mt-2">
                  Visualize your visited paths, replay journeys with directional vectors, and explore rich travel analytics — running 100% locally in your browser.
                </p>
              </div>
            </div>

            {/* Part 2 (Center): File Drop Part & Privacy Guarantee */}
            <div className="glass-panel rounded-3xl p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group h-full">
              <div className="absolute top-0 left-1/4 w-56 h-28 rounded-full bg-lime-500/10 blur-3xl pointer-events-none" />

              <div>
                {/* Tactile Large Interactive Dropzone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-7 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative group/drop ${
                    isDragging
                      ? 'border-[#a3e635] bg-lime-500/15 scale-[1.01] shadow-[0_0_40px_rgba(132,204,22,0.3)]'
                      : 'border-lime-500/30 bg-black/40 hover:border-lime-400/80 hover:bg-black/60 hover:shadow-[0_0_35px_rgba(132,204,22,0.2)]'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".json"
                    className="hidden"
                  />

                  {/* Icon with glowing halo */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-[#2b3929] to-[#0c120b] text-[#a3e635] border border-lime-500/40 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(132,204,22,0.3)] group-hover/drop:scale-110 group-hover/drop:border-lime-400 transition-all duration-300">
                    <UploadCloud className="w-8 h-8 text-[#bef264]" />
                  </div>

                  <p className="text-base sm:text-lg font-black text-white mb-1.5 font-heading uppercase tracking-wide">
                    Drop your <span className="text-[#a3e635] drop-shadow-[0_0_10px_rgba(163,230,53,0.4)]">Timeline.json</span> here
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs">
                    Drag & drop your file, or click anywhere inside to browse
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                    <span className="text-[11px] px-3.5 py-1 rounded-full bg-black/70 text-slate-300 font-mono border border-white/15 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                      Google Maps Export (.json)
                    </span>
                  </div>
                </div>

                {uploadError && (
                  <div className="mt-4 flex items-start gap-3 p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              {/* Bottom Section inside the Box */}
              <div className="mt-5 space-y-3 pt-4 border-t border-white/10">
                {/* Demo Quick-Start */}
                <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white font-heading">Don't have your file?</span>
                    <span className="text-[10px] text-slate-400">Explore with sample trip data</span>
                  </div>

                  <button
                    onClick={handleLoadDemo}
                    disabled={loading}
                    className="py-2 px-4 rounded-xl bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-400 hover:to-emerald-400 text-black font-black text-xs transition-all flex items-center gap-2 shadow-[0_0_18px_rgba(132,204,22,0.35)] cursor-pointer active:scale-95 uppercase tracking-wider font-heading hover:shadow-lime-500/40 shrink-0"
                  >
                    <span>Try Demo Timeline</span>
                  </button>
                </div>

                {/* 100% Client-Side Privacy Guarantee */}
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-black/50 border border-lime-500/20 text-slate-300 text-xs">
                  <div className="p-1.5 rounded-xl bg-lime-500/20 text-[#a3e635] shrink-0 mt-0.5 border border-lime-500/30">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-[#a3e635] block mb-0.5 font-extrabold uppercase tracking-wide font-heading text-xs">
                      100% Client-Side Privacy Guarantee
                    </strong>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Your location history never leaves your device. All calculations, route visualizations, and analytics run entirely in your local browser with zero cloud storage.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Part 3 (Right): How to Export Guide */}
            <div className="glass-panel rounded-3xl p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden h-full">
              <div>
                {/* Guide Header & Platform Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 mb-5 border-b border-white/10 pb-3.5">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#a3e635]" />
                    <h2 className="text-sm font-extrabold text-white font-heading uppercase tracking-wide">
                      How to Export Timeline
                    </h2>
                  </div>

                  {/* Platform Switcher Tabs */}
                  <div className="flex gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-xs font-bold font-heading">
                    <button
                      onClick={() => setGuideTab('android')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        guideTab === 'android'
                          ? 'bg-gradient-to-b from-[#2f3b2d] to-[#121911] text-[#a3e635] border border-lime-500/40 shadow-sm font-extrabold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Android</span>
                    </button>
                    <button
                      onClick={() => setGuideTab('ios')}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        guideTab === 'ios'
                          ? 'bg-gradient-to-b from-[#2f3b2d] to-[#121911] text-[#a3e635] border border-lime-500/40 shadow-sm font-extrabold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Apple className="w-3.5 h-3.5" />
                      <span>iPhone (iOS)</span>
                    </button>
                  </div>
                </div>

                {/* Android Steps with visual step numbers */}
                {guideTab === 'android' && (
                  <div className="space-y-2.5 animate-fade-in text-xs text-slate-300">
                    <div className="font-bold text-[#a3e635] text-xs uppercase tracking-wider flex items-center gap-1.5 font-heading mb-1">
                      <span className="w-2 h-2 rounded-full bg-[#a3e635] shadow-[0_0_8px_rgba(163,230,53,0.8)]" />
                      <span>Android Settings Export</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-500/25 transition-all">
                        <span className="w-5 h-5 rounded-lg bg-lime-500/20 text-[#bef264] border border-lime-500/40 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">01</span>
                        <p className="leading-snug pt-0.5 text-xs">Open your phone's <strong className="text-white">Settings</strong> (gear icon).</p>
                      </div>

                      <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-500/25 transition-all">
                        <span className="w-5 h-5 rounded-lg bg-lime-500/20 text-[#bef264] border border-lime-500/40 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">02</span>
                        <p className="leading-snug pt-0.5 text-xs">Go to <strong className="text-white">Location</strong> &gt; <strong className="text-white">Location Services</strong>.</p>
                      </div>

                      <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-500/25 transition-all">
                        <span className="w-5 h-5 rounded-lg bg-lime-500/20 text-[#bef264] border border-lime-500/40 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">03</span>
                        <p className="leading-snug pt-0.5 text-xs">Select <strong className="text-white">Timeline</strong> (choose Google account).</p>
                      </div>

                      <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-500/25 transition-all">
                        <span className="w-5 h-5 rounded-lg bg-lime-500/20 text-[#bef264] border border-lime-500/40 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">04</span>
                        <p className="leading-snug pt-0.5 text-xs">Scroll down and tap <strong className="text-white">Export Timeline data</strong>.</p>
                      </div>

                      <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-500/25 transition-all">
                        <span className="w-5 h-5 rounded-lg bg-lime-500/20 text-[#bef264] border border-lime-500/40 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">05</span>
                        <p className="leading-snug pt-0.5 text-xs">Tap <strong className="text-white">Continue</strong> to download <code className="text-[#bef264] bg-black px-1.5 py-0.5 rounded border border-lime-900/50">Timeline.json</code>.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* iOS Steps */}
                {guideTab === 'ios' && (
                  <div className="space-y-2.5 animate-fade-in text-xs text-slate-300">
                    <div className="font-bold text-[#a3e635] text-xs uppercase tracking-wider flex items-center gap-1.5 font-heading mb-1">
                      <span className="w-2 h-2 rounded-full bg-[#a3e635] shadow-[0_0_8px_rgba(163,230,53,0.8)]" />
                      <span>Google Maps iOS App Export</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-500/25 transition-all">
                        <span className="w-5 h-5 rounded-lg bg-lime-500/20 text-[#bef264] border border-lime-500/40 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">01</span>
                        <p className="leading-snug pt-0.5 text-xs">Open <strong className="text-white">Google Maps</strong> app on your iPhone.</p>
                      </div>

                      <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-500/25 transition-all">
                        <span className="w-5 h-5 rounded-lg bg-lime-500/20 text-[#bef264] border border-lime-500/40 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">02</span>
                        <p className="leading-snug pt-0.5 text-xs">Tap your <strong className="text-white">Profile avatar</strong> &gt; <strong className="text-white">Settings</strong>.</p>
                      </div>

                      <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-500/25 transition-all">
                        <span className="w-5 h-5 rounded-lg bg-lime-500/20 text-[#bef264] border border-lime-500/40 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">03</span>
                        <p className="leading-snug pt-0.5 text-xs">Scroll down and tap <strong className="text-white">Personal content</strong>.</p>
                      </div>

                      <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-500/25 transition-all">
                        <span className="w-5 h-5 rounded-lg bg-lime-500/20 text-[#bef264] border border-lime-500/40 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">04</span>
                        <p className="leading-snug pt-0.5 text-xs">Tap <strong className="text-white">Export Timeline data</strong> to download <code className="text-[#bef264] bg-black px-1.5 py-0.5 rounded border border-lime-900/50">Timeline.json</code>.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Helpful footer hint */}
              <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center gap-2 text-[11px] text-slate-400">
                <span className="text-[#a3e635]">💡</span>
                <span>Google Maps stores timeline on-device. This export gives you your personal raw JSON.</span>
              </div>
            </div>

          </div>
        </main>

        {/* Minimalist Professional Footer */}
        <footer className="relative z-10 w-full max-w-[1540px] mx-auto pt-4 pb-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-lime-400/80" />
            <p>© 2026 Timeline Studio — Private, in-browser location history visualizer.</p>
          </div>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />
              Local Browser Processing
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Zero Cloud Uploads</span>
          </div>
        </footer>
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
