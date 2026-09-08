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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in cursor-default"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-400" />
              <span>{viewScope === 'period' ? 'Time Period Analytics' : 'Overall Dataset Analytics'}</span>
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-400">Showing metrics for:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold text-xs">
                <Calendar className="w-3 h-3 text-indigo-400" />
                <span>{activeStats.periodLabel}</span>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scope Selector Tabs (Only show if a specific period/day is selected) */}
        {selectedDate !== 'all' && (
          <div className="pt-4">
            <div className="flex items-center p-1 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                onClick={() => setViewScope('period')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  viewScope === 'period'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Selected Period ({selectedDay?.displayDate || selectedDate})</span>
              </button>
              <button
                onClick={() => setViewScope('all')}
                className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  viewScope === 'all'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>All Time ({timelineData.stats.totalDays} days)</span>
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* Top Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-slate-400 text-xs block mb-1">Total Distance</span>
              <span className="text-xl font-extrabold text-emerald-400 font-mono">
                {activeStats.totalDistanceKm} <span className="text-xs font-normal">km</span>
              </span>
            </div>

            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-slate-400 text-xs block mb-1">Places Visited</span>
              <span className="text-xl font-extrabold text-indigo-400 font-mono">
                {activeStats.totalVisits} <span className="text-xs font-normal">stops</span>
              </span>
            </div>

            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-slate-400 text-xs block mb-1">
                {isSingleDay && viewScope === 'period' ? 'Day' : 'Active Days'}
              </span>
              <span className="text-xl font-extrabold text-white font-mono">
                {activeStats.totalDays} <span className="text-xs font-normal">{activeStats.totalDays === 1 ? 'day' : 'days'}</span>
              </span>
            </div>

            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-slate-400 text-xs block mb-1">GPS Points</span>
              <span className="text-xl font-extrabold text-rose-400 font-mono">
                {activeStats.rawSignalCount}
              </span>
            </div>
          </div>

          {/* Date Span Banner */}
          <div className="flex items-center justify-between p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl text-xs text-indigo-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                Period: <strong className="text-white">{activeStats.periodLabel}</strong>
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold uppercase">
              {viewScope === 'period' ? 'Selected Scope' : 'Full Dataset'}
            </span>
          </div>

          {/* Mode Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Car className="w-4 h-4 text-indigo-400" />
                <span>Transport Modes Breakdown</span>
              </h3>
              <span className="text-xs text-slate-400">
                {activeStats.totalActivities} total {activeStats.totalActivities === 1 ? 'trip' : 'trips'}
              </span>
            </div>

            <div className="space-y-3">
              {modes.length === 0 ? (
                <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 text-center">
                  <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">No travel activities recorded for this time period.</p>
                  <p className="text-[11px] text-slate-500 mt-1">This period may consist exclusively of stationary place visits or still locations.</p>
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
                    <div key={mode} className="bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: style.bgColor, color: style.color }}
                          >
                            {renderIcon(style.iconName)}
                          </div>
                          <span className="font-semibold text-xs text-white">
                            {style.label}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ({count} {count === 1 ? 'trip' : 'trips'})
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-xs text-white mr-2">
                            {dist.toFixed(1)} km
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDuration(durationMs)}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percent}%`,
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
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {viewScope === 'period' ? 'Metrics reflect selected period only' : 'Metrics reflect full history'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
