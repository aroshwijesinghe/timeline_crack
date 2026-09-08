import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Calendar,
  Compass,
  Car,
  Footprints,
  Bike,
  Zap,
  Bus,
  Train,
  Navigation,
  Clock,
  MapPin
} from 'lucide-react';
import { ParsedTimeline, TimelineDay } from '../../types/timeline';
import { getActivityStyle, formatDuration, computePeriodStats } from '../../utils/geoUtils';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  timelineData: ParsedTimeline | null;
  selectedDay: TimelineDay | null;
  selectedDate: string;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  timelineData,
  selectedDay,
  selectedDate
}) => {
  // 'period' = analytics strictly for the selected time period (default)
  // 'all' = analytics for the entire dataset
  const [viewScope, setViewScope] = useState<'period' | 'all'>('period');

  // When modal opens or date changes, always ensure it opens to 'period'
  useEffect(() => {
    if (isOpen) {
      setViewScope('period');
    }
  }, [isOpen, selectedDate]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Period stats (relevant strictly to selected day / range)
  const periodStats = useMemo(() => {
    return computePeriodStats(selectedDay, timelineData, selectedDate);
  }, [selectedDay, timelineData, selectedDate]);

  // All-time stats across all days
  const allTimeStats = useMemo(() => {
    return computePeriodStats(null, timelineData, 'all');
  }, [timelineData]);

  // Active stats depending on viewScope
  const activeStats = (viewScope === 'period' && selectedDate !== 'all') ? periodStats : allTimeStats;

  const modes = useMemo(() => {
    if (!activeStats) return [];
    return Object.keys(activeStats.activityDistanceByType).sort(
      (a, b) => (activeStats.activityDistanceByType[b] || 0) - (activeStats.activityDistanceByType[a] || 0)
    );
  }, [activeStats]);

  if (!isOpen || !timelineData) return null;

  const renderIcon = (iconName: string) => {
    const props = { className: 'w-4 h-4' };
    switch (iconName) {
      case 'Car': return <Car {...props} />;
      case 'Footprints': return <Footprints {...props} />;
      case 'Bike': return <Bike {...props} />;
      case 'Zap': return <Zap {...props} />;
      case 'Bus': return <Bus {...props} />;
      case 'Train': return <Train {...props} />;
      default: return <Navigation {...props} />;
    }
  };

  const isSingleDay = !selectedDate.includes('..') && selectedDate !== 'all';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-fade-in cursor-default"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[#0d1322]/95 border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col backdrop-blur-2xl"
      >
        {/* Ambient Glows */}
        <div className="absolute w-72 h-72 rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none -top-20 -left-20" />
        <div className="absolute w-72 h-72 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none -bottom-20 -right-20" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Compass className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {viewScope === 'period' ? 'Journey Analytics' : 'Lifetime Explorer Analytics'}
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-1.5 ml-10">
              <span className="text-[11px] text-slate-400">Timeframe:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 text-cyan-300 font-bold text-[11px] shadow-sm font-mono">
                <Calendar className="w-3 h-3 text-cyan-400" />
                <span>{activeStats.periodLabel}</span>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scope Selector Tabs (Only show if a specific period/day is selected) */}
        {selectedDate !== 'all' && (
          <div className="pt-4 relative z-10">
            <div className="flex items-center p-1 bg-slate-950/80 rounded-2xl border border-white/10 shadow-inner">
              <button
                onClick={() => setViewScope('period')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  viewScope === 'period'
                    ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="truncate">Selected Window ({selectedDay?.displayDate || selectedDate})</span>
              </button>
              <button
                onClick={() => setViewScope('all')}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  viewScope === 'all'
                    ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Full History ({timelineData.stats.totalDays} days)</span>
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 relative z-10 pr-1">
          {/* Top 4 Hero Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Distance */}
            <div className="glass-card-interactive p-4 rounded-2xl border border-white/10 relative overflow-hidden group">
              <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Distance</span>
                <Navigation className="w-3.5 h-3.5 text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-black bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent font-mono tracking-tight">
                {activeStats.totalDistanceKm} <span className="text-xs font-semibold text-emerald-300">km</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                {(activeStats.totalDistanceKm * 0.621371).toFixed(1)} miles
              </div>
            </div>

            {/* Places Visited */}
            <div className="glass-card-interactive p-4 rounded-2xl border border-white/10 relative overflow-hidden group">
              <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Visited Stops</span>
                <MapPin className="w-3.5 h-3.5 text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-violet-300 bg-clip-text text-transparent font-mono tracking-tight">
                {activeStats.totalVisits} <span className="text-xs font-semibold text-indigo-300">stops</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Unique destinations
              </div>
            </div>

            {/* Active Days */}
            <div className="glass-card-interactive p-4 rounded-2xl border border-white/10 relative overflow-hidden group">
              <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>{isSingleDay && viewScope === 'period' ? 'Day' : 'Active Days'}</span>
                <Calendar className="w-3.5 h-3.5 text-amber-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-black bg-gradient-to-r from-amber-400 to-rose-300 bg-clip-text text-transparent font-mono tracking-tight">
                {activeStats.totalDays} <span className="text-xs font-semibold text-amber-300">{activeStats.totalDays === 1 ? 'day' : 'days'}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Recorded timeline
              </div>
            </div>

            {/* GPS Signal Count */}
            <div className="glass-card-interactive p-4 rounded-2xl border border-white/10 relative overflow-hidden group">
              <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>GPS Signals</span>
                <Clock className="w-3.5 h-3.5 text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-black bg-gradient-to-r from-rose-400 to-pink-300 bg-clip-text text-transparent font-mono tracking-tight">
                {activeStats.rawSignalCount}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Position fixes
              </div>
            </div>
          </div>

          {/* Narrative Summary Insight Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-cyan-950/30 border border-indigo-500/30 flex items-start gap-3 shadow-lg">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-cyan-300 shrink-0 mt-0.5 border border-indigo-500/30">
              <Compass className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-white font-bold block mb-0.5">Journey Summary</strong>
              During <span className="text-cyan-300 font-semibold">{activeStats.periodLabel}</span>, your timeline captured{' '}
              <strong className="text-emerald-400 font-semibold">{activeStats.totalDistanceKm} km</strong> of movement across{' '}
              <strong className="text-indigo-300 font-semibold">{activeStats.totalVisits} destinations</strong> and{' '}
              <strong className="text-amber-300 font-semibold">{activeStats.totalActivities} travel legs</strong>.
            </div>
          </div>

          {/* Mode Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-cyan-400" />
                <span>Transport & Mobility Modes</span>
              </h3>
              <span className="text-xs text-slate-400 font-semibold font-mono">
                {activeStats.totalActivities} total {activeStats.totalActivities === 1 ? 'trip' : 'trips'}
              </span>
            </div>

            <div className="space-y-2.5">
              {modes.length === 0 ? (
                <div className="glass-panel p-6 rounded-2xl border border-white/10 text-center">
                  <MapPin className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-semibold">No travel legs recorded for this time period.</p>
                  <p className="text-[11px] text-slate-400 mt-1">This period consists solely of stationary place visits or still locations.</p>
                </div>
              ) : (
                modes.map((mode) => {
                  const dist = activeStats.activityDistanceByType[mode] || 0;
                  const durationMs = activeStats.activityDurationByType[mode] || 0;
                  const count = activeStats.activityCountByType[mode] || 0;
                  const percent = activeStats.totalDistanceKm > 0
                    ? Math.min(100, Math.round((dist / activeStats.totalDistanceKm) * 100))
                    : 0;
                  const style = getActivityStyle(mode);

                  return (
                    <div key={mode} className="glass-card-interactive p-3.5 rounded-2xl border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-xl flex items-center justify-center shadow-md"
                            style={{ backgroundColor: style.bgColor, color: style.color }}
                          >
                            {renderIcon(style.iconName)}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-white block leading-tight">
                              {style.label}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {count} {count === 1 ? 'trip' : 'trips'} ({percent}% of path)
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-black text-xs text-white font-mono block leading-tight">
                            {dist.toFixed(1)} km
                          </span>
                          <span className="text-[10px] text-emerald-400 font-mono">
                            {formatDuration(durationMs)}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
                          style={{
                            width: `${Math.max(percent, 2)}%`,
                            backgroundColor: style.color
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
          <div className="text-[11px] text-slate-400 font-medium">
            {viewScope === 'period' ? 'Metrics reflect selected period only' : 'Metrics reflect full history'}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 border border-white/15"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
