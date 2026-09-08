import React, { useState } from 'react';
import {
  TimelineDay,
  TimelinePlaceVisit,
  TimelineActivity
} from '../../types/timeline';
import {
  getActivityStyle,
  formatTime
} from '../../utils/geoUtils';
import {
  Car,
  Footprints,
  Bike,
  Zap,
  Bus,
  Train,
  Plane,
  Activity as ActivityIcon,
  Navigation,
  ExternalLink,
  Clock,
  Compass
} from 'lucide-react';

interface TimelineFeedProps {
  selectedDay: TimelineDay | null;
  focusedItemId: string | null;
  onFocusItem: (id: string) => void;
}

export const TimelineFeed: React.FC<TimelineFeedProps> = ({
  selectedDay,
  focusedItemId,
  onFocusItem
}) => {
  const [filterType, setFilterType] = useState<'all' | 'visits' | 'activities'>('all');

  if (!selectedDay) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
        <Compass className="w-12 h-12 mb-3 text-slate-600 animate-spin-slow" />
        <p className="font-semibold text-slate-300">No day selected</p>
        <p className="text-xs text-slate-500 mt-1">Choose a date from the header to view visited places and routes</p>
      </div>
    );
  }

  const filteredSegments = selectedDay.segments.filter(seg => {
    if (filterType === 'visits') return seg.type === 'visit';
    if (filterType === 'activities') return seg.type === 'activity';
    return true;
  });

  const renderIcon = (iconName: string) => {
    const props = { className: 'w-4 h-4' };
    switch (iconName) {
      case 'Car': return <Car {...props} />;
      case 'Footprints': return <Footprints {...props} />;
      case 'Bike': return <Bike {...props} />;
      case 'Zap': return <Zap {...props} />;
      case 'Bus': return <Bus {...props} />;
      case 'Train': return <Train {...props} />;
      case 'Plane': return <Plane {...props} />;
      case 'Activity': return <ActivityIcon {...props} />;
      default: return <Navigation {...props} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/60 border-r border-slate-800/80">
      {/* Sidebar Header & Summary */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-white text-base truncate">{selectedDay.displayDate}</h2>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {selectedDay.segments.length} events
          </span>
        </div>

        {/* Day Stats Pills */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
          <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Stops / Visits</span>
            <span className="font-bold text-white text-sm">{selectedDay.visits.length}</span>
          </div>
          <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[10px]">Distance Covered</span>
            <span className="font-bold text-emerald-400 text-sm">{selectedDay.totalDistanceKm} km</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mt-3 p-0.5 bg-slate-900 rounded-lg border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 py-1 rounded-md transition-all ${
              filterType === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({selectedDay.segments.length})
          </button>
          <button
            onClick={() => setFilterType('visits')}
            className={`flex-1 py-1 rounded-md transition-all ${
              filterType === 'visits'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Stops ({selectedDay.visits.length})
          </button>
          <button
            onClick={() => setFilterType('activities')}
            className={`flex-1 py-1 rounded-md transition-all ${
              filterType === 'activities'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Travel ({selectedDay.activities.length})
          </button>
        </div>
      </div>

      {/* Chronological List of Events */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredSegments.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No events match the selected filter.
          </div>
        ) : (
          filteredSegments.map((seg) => {
            const isFocused = focusedItemId === seg.id;

            if (seg.type === 'visit') {
              const visit = seg.data as TimelinePlaceVisit;
              const visitIndex = selectedDay.visits.findIndex(v => v.id === visit.id);
              const gmapsUrl = `https://www.google.com/maps?q=${visit.location[0]},${visit.location[1]}`;

              return (
                <div
                  key={seg.id}
                  onClick={() => onFocusItem(seg.id)}
                  className={`group relative p-3 rounded-2xl border transition-all cursor-pointer ${
                    isFocused
                      ? 'bg-indigo-950/40 border-indigo-500/80 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500'
                      : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900/90 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow">
                        {visitIndex >= 0 ? visitIndex + 1 : '•'}
                      </span>
                      <span className="font-semibold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {visit.name || `Visit Place (${visit.semanticType || 'Unknown'})`}
                      </span>
                    </div>

                    <a
                      href={gmapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title="Open in Google Maps"
                      className="text-slate-500 hover:text-indigo-400 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="mt-2 text-xs flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formatTime(visit.startTime)} - {formatTime(visit.endTime)}</span>
                    </div>
                    <span className="font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/40">
                      {visit.durationFormatted}
                    </span>
                  </div>

                  <div className="mt-1.5 text-[11px] font-mono text-slate-500">
                    {visit.location[0].toFixed(5)}, {visit.location[1].toFixed(5)}
                  </div>
                </div>
              );
            }

            // Activity segment
            const act = seg.data as TimelineActivity;
            const actStyle = getActivityStyle(act.type);

            return (
              <div
                key={seg.id}
                onClick={() => onFocusItem(seg.id)}
                className={`group relative p-3 rounded-2xl border transition-all cursor-pointer ${
                  isFocused
                    ? 'bg-slate-900 border-indigo-500/80 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500'
                    : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: actStyle.bgColor, color: actStyle.color }}
                    >
                      {renderIcon(actStyle.iconName)}
                    </div>
                    <span className="font-semibold text-sm text-slate-200 group-hover:text-white transition-colors">
                      {actStyle.label}
                    </span>
                  </div>

                  <span className="font-bold text-xs text-indigo-300">
                    {act.distanceKm} km
                  </span>
                </div>

                <div className="mt-2 text-xs flex items-center justify-between text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{formatTime(act.startTime)} - {formatTime(act.endTime)}</span>
                  </div>
                  <span className="text-slate-400">
                    {act.durationFormatted}
                  </span>
                </div>

                {act.path.length > 0 && (
                  <div className="mt-1.5 text-[10px] text-slate-500">
                    {act.path.length} waypoints recorded
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
