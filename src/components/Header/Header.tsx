import React from 'react';
import {
  UploadCloud,
  BarChart3,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin
} from 'lucide-react';
import { ParsedTimeline } from '../../types/timeline';

interface HeaderProps {
  timelineData: ParsedTimeline | null;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onOpenUpload: () => void;
  onOpenStats: () => void;
  onExportGeoJSON: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  timelineData,
  selectedDate,
  onSelectDate,
  onOpenUpload,
  onOpenStats,
  onExportGeoJSON
}) => {
  const dates = timelineData ? timelineData.sortedDates : [];
  const currentIndex = dates.indexOf(selectedDate);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < dates.length - 1;

  const handlePrevDay = () => {
    if (hasPrev) onSelectDate(dates[currentIndex - 1]);
  };

  const handleNextDay = () => {
    if (hasNext) onSelectDate(dates[currentIndex + 1]);
  };

  return (
    <header className="h-16 px-5 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between z-30 shrink-0 select-none">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
          <MapPin className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-white text-base tracking-tight">Timeline Crack</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              v1.0
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">Watch & Replay Visited Timeline History</p>
        </div>
      </div>

      {/* Center: Date Navigation */}
      {dates.length > 0 && (
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
          <button
            onClick={handlePrevDay}
            disabled={!hasPrev}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
            title="Previous recorded day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <select
              value={selectedDate}
              onChange={(e) => onSelectDate(e.target.value)}
              className="bg-transparent text-white font-bold text-sm focus:outline-none cursor-pointer pr-2"
            >
              {dates.map((d) => {
                const dayObj = timelineData?.days[d];
                return (
                  <option key={d} value={d} className="bg-slate-900 text-white">
                    {d} ({dayObj?.visits.length || 0} stops, {dayObj?.totalDistanceKm || 0} km)
                  </option>
                );
              })}
            </select>
          </div>

          <button
            onClick={handleNextDay}
            disabled={!hasNext}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
            title="Next recorded day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {timelineData && (
          <>
            <button
              onClick={onOpenStats}
              title="View Trip & Travel Analytics"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
            >
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span className="hidden md:inline">Analytics</span>
            </button>

            <button
              onClick={onExportGeoJSON}
              title="Export Current Day as GeoJSON"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Export</span>
            </button>
          </>
        )}

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition active:scale-95"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload JSON</span>
        </button>

        <a
          href="https://github.com/aroshwijesinghe/timeline_crack"
          target="_blank"
          rel="noopener noreferrer"
          title="View on GitHub"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition hidden sm:flex"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </a>
      </div>
    </header>
  );
};
