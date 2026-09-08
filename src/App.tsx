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
      <div className="min-h-screen w-full bg-[#040704] text-slate-100 flex flex-col justify-between p-4 sm:p-8 lg:p-12 relative selection:bg-lime-500 selection:text-black font-sans overflow-x-hidden">
        {/* Subtle Geometric Cartographic Grid Pattern */}
        <div className="fixed inset-0 opacity-[0.035] pointer-events-none bg-[radial-gradient(#a3e635_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Luminous Organic Green Ambient Glows */}
        <div className="fixed w-[650px] h-[650px] rounded-full bg-lime-500/12 blur-[150px] pointer-events-none -top-24 -left-20 animate-eco-glow" />
        <div className="fixed w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[150px] pointer-events-none top-1/3 right-0 animate-eco-glow" style={{ animationDelay: '2s' }} />
        <div className="fixed w-[500px] h-[500px] rounded-full bg-lime-400/8 blur-[130px] pointer-events-none -bottom-20 left-1/4" />

        {/* Content Container (Full Width, Spacious, Beautifully Balanced) */}
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-center my-auto py-6">

          {/* 1. OPEN, UNBOXED HERO SECTION (Spacious, bold, human-crafted typography) */}
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-10 sm:mb-12">
            {/* Ambient Logo Emblem */}
            <div className="relative mb-5 group">
              <div className="absolute -inset-3 rounded-3xl bg-lime-400/25 blur-xl group-hover:bg-lime-400/40 transition duration-700 animate-pulse" />
              <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-[#2a3828] to-[#0c120b] border border-lime-500/50 flex items-center justify-center shadow-[0_0_35px_rgba(132,204,22,0.4)] transition-transform duration-300 group-hover:scale-105">
                <MapPin className="w-9 h-9 sm:w-10 sm:h-10 text-[#a3e635] fill-[#a3e635]/20" />
              </div>
            </div>

            {/* Studio Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-lime-950/70 border border-lime-500/35 text-[#a3e635] text-xs font-extrabold uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(132,204,22,0.15)] backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-[#bef264]" />
              <span>Personal Timeline & Route Studio</span>
            </div>

            {/* Impactful Open Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-4 font-heading uppercase leading-[1.08]">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a3e635] via-[#bef264] to-[#34d399] drop-shadow-[0_0_25px_rgba(163,230,53,0.35)]">Timeline</span>
            </h1>

            {/* Narrative Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-sans max-w-2xl">
              Visualize your visited paths, replay journeys with directional vectors, and explore rich travel analytics — running 100% locally in your browser.
            </p>

            {/* Interactive Capability Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-lime-500/40 text-slate-300 hover:text-white text-xs font-semibold transition-all shadow-sm">
                <span className="w-2 h-2 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.8)]" />
                <span>Directional Vector Corridors</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-500/40 text-slate-300 hover:text-white text-xs font-semibold transition-all shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span>Multi-Day Travel Metrics</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-amber-500/40 text-slate-300 hover:text-white text-xs font-semibold transition-all shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                <span>Free Keyless Vector Basemaps</span>
              </div>
            </div>
          </div>

          {/* 2. THE MAIN INTERACTIVE STAGE: Generous 2-Column Wide Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch w-full">

            {/* Left Column (7 cols): File Uploading Hub & Client-Side Privacy */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-4">
              <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-lime-500/25 flex flex-col justify-between relative overflow-hidden group flex-1">
                {/* Top specular highlight & subtle ambient orb */}
                <div className="absolute top-0 left-1/4 w-72 h-32 rounded-full bg-lime-500/10 blur-3xl pointer-events-none" />

                {/* Tactile Large Interactive Dropzone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative group/drop flex-1 ${
                    isDragging
                      ? 'border-[#a3e635] bg-lime-500/15 scale-[1.01] shadow-[0_0_40px_rgba(132,204,22,0.3)]'
                      : 'border-white/15 bg-black/40 hover:border-lime-500/60 hover:bg-black/60 hover:shadow-[0_0_35px_rgba(132,204,22,0.2)]'
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
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-b from-[#2b3929] to-[#0c120b] text-[#a3e635] border border-lime-500/40 flex items-center justify-center mb-5 shadow-[0_0_25px_rgba(132,204,22,0.3)] group-hover/drop:scale-110 group-hover/drop:border-lime-400 transition-all duration-300">
                    <FileCode className="w-10 h-10 text-[#bef264]" />
                  </div>

                  <p className="text-lg sm:text-xl font-black text-white mb-2 font-heading uppercase tracking-wide">
                    Drop your <span className="text-[#a3e635] drop-shadow-[0_0_10px_rgba(163,230,53,0.4)]">Timeline.json</span> file here
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-sm">
                    Drag and drop your file, or click anywhere inside to browse your computer
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    <span className="text-xs px-3.5 py-1.5 rounded-full bg-black/70 text-slate-300 font-mono border border-white/15 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                      Google Maps Export (.json)
                    </span>
                    <span className="text-xs px-3.5 py-1.5 rounded-full bg-black/70 text-slate-300 font-mono border border-white/15">
                      Location History Records
                    </span>
                  </div>
                </div>

                {uploadError && (
                  <div className="mt-4 flex items-start gap-3 p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs animate-fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {/* Bottom Bar: Demo Quick-Start */}
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-white/10">
                  <div className="flex flex-col text-center sm:text-left">
                    <span className="text-xs font-semibold text-white font-heading">Don't have your file ready?</span>
                    <span className="text-[11px] text-slate-400">Explore instantly with our curated sample trip dataset</span>
                  </div>

                  <button
                    onClick={handleLoadDemo}
                    disabled={loading}
                    className="w-full sm:w-auto py-2.5 px-5 rounded-2xl bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-400 hover:to-emerald-400 text-black font-black text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(132,204,22,0.35)] cursor-pointer active:scale-95 uppercase tracking-wider font-heading hover:shadow-lime-500/40"
                  >
                    <Sparkles className="w-4 h-4 text-black" />
                    <span>Try Demo Timeline</span>
                  </button>
                </div>
              </div>

              {/* 100% Client-Side Privacy Guarantee (Directly docked near upload) */}
              <div className="w-full flex items-start gap-3.5 p-4 rounded-3xl glass-panel border border-lime-500/30 text-slate-300 text-xs shadow-xl backdrop-blur-2xl">
                <div className="p-2 rounded-2xl bg-lime-500/20 text-[#a3e635] shrink-0 mt-0.5 border border-lime-500/40 shadow-[0_0_10px_rgba(132,204,22,0.2)]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-[#a3e635] block mb-1 font-extrabold uppercase tracking-wide font-heading text-sm">
                    100% Client-Side Privacy Guarantee
                  </strong>
                  Your location history never leaves your device. All GPS calculations, direction vectors, route maps, and analytics run entirely in your local browser with zero cloud storage.
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): How To Export Timeline.json Guide */}
            <div className="lg:col-span-5 glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-lime-500/20 flex flex-col justify-between relative overflow-hidden">
              <div>
                {/* Guide Header & Platform Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 mb-6 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#a3e635]" />
                    <h2 className="text-sm font-extrabold text-white font-heading uppercase tracking-wide">
                      How to Export Timeline.json
                    </h2>
                  </div>

                  {/* Platform Switcher Tabs */}
                  <div className="flex gap-1 bg-black/60 p-1 rounded-xl border border-white/10 text-xs font-bold font-heading">
                    <button
                      onClick={() => setGuideTab('android')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
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
                  <div className="space-y-3 animate-fade-in text-xs text-slate-300">
                    <div className="font-bold text-[#a3e635] text-xs uppercase tracking-wider flex items-center gap-1.5 font-heading mb-1">
                      <span className="w-2 h-2 rounded-full bg-[#a3e635] shadow-[0_0_8px_rgba(163,230,53,0.8)]" />
                      <span>Android Settings Export</span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-500/25 transition-all">
                        <span className="w-6 h-6 rounded-xl bg-lime-500/20 text-[#bef264] border border-lime-500/40 flex items-center justify-center font-mono font-bold text-[11px] shrink-0">01</span>
                        <p className="leading-snug pt-0.5">Open your phone's <strong>Settings</strong> (gear icon).</p>
                      </div>

                      <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-500/25 transition-all">
                        <span className="w-6 h-6 rounded-xl bg-lime-500/20 text-[#bef264] border border-lime-500/40 flex items-center justify-center font-mono font-bold text-[11px] shrink-0">02</span>
                        <p className="leading-snug pt-0.5">Go to <strong>Location</strong>, then tap <strong>Location Services</strong>.</p>
                      </div>

                      <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-500/25 transition-all">
                        <span className="w-6 h-6 rounded-xl bg-lime-500/20 text-[#bef264] border border-lime-500/40 flex items-center justify-center font-mono font-bold text-[11px] shrink-0">03</span>
                        <p className="leading-snug pt-0.5">Select <strong>Timeline</strong> (choose your Google account if prompted).</p>
                      </div>

                      <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-500/25 transition-all">
                        <span className="w-6 h-6 rounded-xl bg-lime-500/20 text-[#bef264] border border-lime-500/40 flex items-center justify-center font-mono font-bold text-[11px] shrink-0">04</span>
                        <p className="leading-snug pt-0.5">Scroll down and tap <strong>Export Timeline data</strong>.</p>
                      </div>

                      <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-500/25 transition-all">
                        <span className="w-6 h-6 rounded-xl bg-lime-500/20 text-[#bef264] border border-lime-500/40 flex items-center justify-center font-mono font-bold text-[11px] shrink-0">05</span>
                        <p className="leading-snug pt-0.5">Tap <strong>Continue</strong> to download <code className="text-[#bef264] bg-black px-1.5 py-0.5 rounded border border-lime-900/50">Timeline.json</code>.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* iOS Steps */}
                {guideTab === 'ios' && (
                  <div className="space-y-3 animate-fade-in text-xs text-slate-300">
                    <div className="font-bold text-[#a3e635] text-xs uppercase tracking-wider flex items-center gap-1.5 font-heading mb-1">
                      <span className="w-2 h-2 rounded-full bg-[#a3e635] shadow-[0_0_8px_rgba(163,230,53,0.8)]" />
                      <span>Google Maps iOS App Export</span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-500/25 transition-all">
                        <span className="w-6 h-6 rounded-xl bg-lime-500/20 text-[#bef264] border border-lime-500/40 flex items-center justify-center font-mono font-bold text-[11px] shrink-0">01</span>
                        <p className="leading-snug pt-0.5">Open the <strong>Google Maps</strong> app on your iPhone.</p>
                      </div>

                      <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-500/25 transition-all">
                        <span className="w-6 h-6 rounded-xl bg-lime-500/20 text-[#bef264] border border-lime-500/40 flex items-center justify-center font-mono font-bold text-[11px] shrink-0">02</span>
                        <p className="leading-snug pt-0.5">Tap your <strong>Profile avatar</strong> in the top right &gt; <strong>Settings</strong>.</p>
                      </div>

                      <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-500/25 transition-all">
                        <span className="w-6 h-6 rounded-xl bg-lime-500/20 text-[#bef264] border border-lime-500/40 flex items-center justify-center font-mono font-bold text-[11px] shrink-0">03</span>
                        <p className="leading-snug pt-0.5">Scroll down and tap <strong>Personal content</strong>.</p>
                      </div>

                      <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-lime-500/25 transition-all">
                        <span className="w-6 h-6 rounded-xl bg-lime-500/20 text-[#bef264] border border-lime-500/40 flex items-center justify-center font-mono font-bold text-[11px] shrink-0">04</span>
                        <p className="leading-snug pt-0.5">Look for <strong>Export Timeline data</strong> and download your local <code className="text-[#bef264] bg-black px-1.5 py-0.5 rounded border border-lime-900/50">Timeline.json</code>.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Helpful footer hint */}
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-[11px] text-slate-400">
                <span className="text-[#a3e635]">💡</span>
                <span>Google Maps now saves your timeline on your device. This export gives you raw JSON data.</span>
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
