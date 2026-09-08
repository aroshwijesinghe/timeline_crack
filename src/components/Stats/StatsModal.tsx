import React, { useEffect, useMemo } from 'react';
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
  Navigation
} from 'lucide-react';
import { ParsedTimeline } from '../../types/timeline';
import { getActivityStyle, formatDuration } from '../../utils/geoUtils';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  timelineData: ParsedTimeline | null;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  timelineData
}) => {
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

  const stats = timelineData?.stats;
  const modes = useMemo(() => {
    if (!stats) return [];
    return Object.keys(stats.activityDistanceByType).sort(
      (a, b) => stats.activityDistanceByType[b] - stats.activityDistanceByType[a]
    );
  }, [stats]);

  if (!isOpen || !timelineData || !stats) return null;

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
              Timeline Travel Analytics
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive overview of your recorded journeys and stops
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* Top Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-slate-400 text-xs block mb-1">Total Distance</span>
              <span className="text-xl font-extrabold text-emerald-400 font-mono">
                {stats.totalDistanceKm} <span className="text-xs font-normal">km</span>
              </span>
            </div>

            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-slate-400 text-xs block mb-1">Places Visited</span>
              <span className="text-xl font-extrabold text-indigo-400 font-mono">
                {stats.totalVisits} <span className="text-xs font-normal">stops</span>
              </span>
            </div>

            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-slate-400 text-xs block mb-1">Total Days</span>
              <span className="text-xl font-extrabold text-white font-mono">
                {stats.totalDays} <span className="text-xs font-normal">days</span>
              </span>
            </div>

            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-slate-400 text-xs block mb-1">GPS Points</span>
              <span className="text-xl font-extrabold text-rose-400 font-mono">
                {timelineData.rawSignals.length}
              </span>
            </div>
          </div>

          {/* Date Span */}
          {stats.dateRange && (
            <div className="flex items-center gap-2 p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl text-xs text-indigo-200">
              <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                Timeline recorded from <strong className="text-white">{stats.dateRange.start}</strong> to <strong className="text-white">{stats.dateRange.end}</strong>
              </span>
            </div>
          )}

          {/* Mode Breakdown */}
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Car className="w-4 h-4 text-indigo-400" />
              Transport Modes Breakdown
            </h3>

            <div className="space-y-3">
              {modes.length === 0 ? (
                <p className="text-xs text-slate-500">No travel activities found in dataset.</p>
              ) : (
                modes.map((mode) => {
                  const dist = stats.activityDistanceByType[mode] || 0;
                  const durationMs = stats.activityDurationByType[mode] || 0;
                  const count = stats.activityCountByType[mode] || 0;
                  const percent = stats.totalDistanceKm > 0
                    ? Math.round((dist / stats.totalDistanceKm) * 100)
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
                          <span className="text-[10px] text-slate-500">({count} trips)</span>
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
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
