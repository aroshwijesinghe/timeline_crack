import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Navigation,
  Check
} from 'lucide-react';
import { ParsedTimeline } from '../../types/timeline';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  timelineData: ParsedTimeline | null;
  selectedDate: string; // 'all', 'YYYY-MM-DD', or 'YYYY-MM-DD..YYYY-MM-DD'
  onSelectPeriod: (periodKey: string) => void;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  timelineData,
  selectedDate,
  onSelectPeriod
}) => {
  // Parse initial selection
  const isInitialRange = selectedDate.includes('..');
  const [selectionMode, setSelectionMode] = useState<'single' | 'range'>(
    isInitialRange ? 'range' : 'single'
  );

  const initialRangeParts = isInitialRange ? selectedDate.split('..') : [selectedDate, selectedDate];
  const [rangeStart, setRangeStart] = useState<string | null>(
    selectedDate !== 'all' ? initialRangeParts[0] : null
  );
  const [rangeEnd, setRangeEnd] = useState<string | null>(
    selectedDate !== 'all' && isInitialRange ? initialRangeParts[1] : null
  );
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Month & Year state
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());

  // Available recorded months from sortedDates
  const recordedMonths = useMemo(() => {
    if (!timelineData) return [];
    const monthMap = new Map<string, { count: number; distanceKm: number }>();

    timelineData.sortedDates.forEach((d) => {
      const ym = d.substring(0, 7); // 'YYYY-MM'
      const prev = monthMap.get(ym) || { count: 0, distanceKm: 0 };
      const day = timelineData.days[d];
      monthMap.set(ym, {
        count: prev.count + 1,
        distanceKm: prev.distanceKm + (day?.totalDistanceKm || 0)
      });
    });

    return Array.from(monthMap.entries()).map(([ym, data]) => {
      const [y, m] = ym.split('-').map(Number);
      const dateObj = new Date(y, m - 1, 1);
      const label = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return { ym, year: y, month: m - 1, label, count: data.count, distanceKm: Number(data.distanceKm.toFixed(1)) };
    });
  }, [timelineData]);

  // Sync view to selected date or latest recorded month when opened
  useEffect(() => {
    if (!isOpen || !timelineData) return;

    if (selectedDate && selectedDate !== 'all') {
      const dateTarget = selectedDate.includes('..') ? selectedDate.split('..')[0] : selectedDate;
      const [y, m] = dateTarget.split('-').map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setCurrentYear(y);
        setCurrentMonth(m - 1);
        setRangeStart(dateTarget);
        setRangeEnd(selectedDate.includes('..') ? selectedDate.split('..')[1] : null);
        setSelectionMode(selectedDate.includes('..') ? 'range' : 'single');
        return;
      }
    }

    // Default to most active or latest recorded month
    if (recordedMonths.length > 0) {
      const latest = recordedMonths[recordedMonths.length - 1];
      setCurrentYear(latest.year);
      setCurrentMonth(latest.month);
    }
  }, [isOpen, selectedDate, timelineData, recordedMonths]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !timelineData) return null;

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleMonthJump = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    setCurrentYear(y);
    setCurrentMonth(m - 1);
  };

  // Calendar days calculation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const handleDayClick = (dateStr: string) => {
    if (selectionMode === 'single') {
      setRangeStart(dateStr);
      setRangeEnd(null);
      onSelectPeriod(dateStr);
      onClose();
    } else {
      // Range mode
      if (!rangeStart || (rangeStart && rangeEnd)) {
        // Start new range
        setRangeStart(dateStr);
        setRangeEnd(null);
      } else {
        // Select end of range
        if (dateStr < rangeStart) {
          setRangeEnd(rangeStart);
          setRangeStart(dateStr);
        } else {
          setRangeEnd(dateStr);
        }
      }
    }
  };

  const handleApplyRange = () => {
    if (selectionMode === 'single') {
      if (rangeStart) {
        onSelectPeriod(rangeStart);
        onClose();
      }
    } else {
      if (rangeStart && rangeEnd) {
        onSelectPeriod(`${rangeStart}..${rangeEnd}`);
        onClose();
      } else if (rangeStart) {
        onSelectPeriod(rangeStart);
        onClose();
      }
    }
  };

  const handleSelectAll = () => {
    onSelectPeriod('all');
    onClose();
  };

  const handleSelectCurrentMonth = () => {
    const startStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const endStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    onSelectPeriod(`${startStr}..${endStr}`);
    onClose();
  };

  // Computed summary of the currently highlighted range/selection
  const previewSummary = useMemo(() => {
    if (selectionMode === 'single') {
      if (!rangeStart) return null;
      const day = timelineData.days[rangeStart];
      return {
        label: rangeStart,
        daysCount: 1,
        activeDays: day ? 1 : 0,
        distanceKm: day?.totalDistanceKm || 0,
        visitsCount: day?.visits.length || 0,
        activitiesCount: day?.activities.length || 0
      };
    } else {
      if (!rangeStart) return null;
      const start = rangeStart;
      const end = rangeEnd || (hoverDate && hoverDate >= rangeStart ? hoverDate : rangeStart);
      const effectiveStart = start <= end ? start : end;
      const effectiveEnd = start <= end ? end : start;

      const matchingDays = Object.keys(timelineData.days)
        .filter((d) => d >= effectiveStart && d <= effectiveEnd)
        .map((d) => timelineData.days[d]);

      const dist = matchingDays.reduce((acc, d) => acc + d.totalDistanceKm, 0);
      const visits = matchingDays.reduce((acc, d) => acc + d.visits.length, 0);
      const acts = matchingDays.reduce((acc, d) => acc + d.activities.length, 0);

      const d1 = new Date(effectiveStart + 'T00:00:00');
      const d2 = new Date(effectiveEnd + 'T00:00:00');
      const spanDays = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) + 1);

      return {
        label: `${effectiveStart} to ${effectiveEnd}`,
        daysCount: spanDays,
        activeDays: matchingDays.length,
        distanceKm: Number(dist.toFixed(1)),
        visitsCount: visits,
        activitiesCount: acts
      };
    }
  }, [selectionMode, rangeStart, rangeEnd, hoverDate, timelineData]);

  const currentMonthName = new Date(currentYear, currentMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in cursor-default"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Select Time Period</h2>
              <p className="text-xs text-slate-400">Choose a single day or a date range with recorded trips</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs & Quick Presets */}
        <div className="py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setSelectionMode('single');
                setRangeEnd(null);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectionMode === 'single'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Single Day
            </button>
            <button
              onClick={() => setSelectionMode('range')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectionMode === 'range'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Time Period (Range)
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSelectCurrentMonth}
              title="Select all days in this displayed month"
              className="px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
            >
              This Month
            </button>

            <button
              onClick={handleSelectAll}
              title="Select all recorded dates combined"
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 transition cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>All Dates</span>
            </button>
          </div>
        </div>

        {/* Month Navigation & Fast Jump Dropdown */}
        <div className="flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded-2xl border border-slate-800/80 mb-3">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">{currentMonthName}</span>

            {/* Jump to month with data */}
            {recordedMonths.length > 0 && (
              <select
                value={`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`}
                onChange={(e) => handleMonthJump(e.target.value)}
                className="bg-slate-800 text-indigo-300 text-xs font-semibold rounded-lg px-2 py-1 border border-slate-700 focus:outline-none cursor-pointer"
                title="Jump directly to recorded months"
              >
                {recordedMonths.map((rm) => (
                  <option key={rm.ym} value={rm.ym}>
                    {rm.label} ({rm.count} days, {rm.distanceKm} km)
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 select-none">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="text-[11px] font-bold text-slate-500 py-1">
                {wd}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-10 sm:h-12" />
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayData = timelineData.days[dateStr];
              const hasData = !!dayData;

              // Selection logic
              const isStart = rangeStart === dateStr;
              const isEnd = rangeEnd === dateStr;
              const isSingleSelected = selectionMode === 'single' && (selectedDate === dateStr || rangeStart === dateStr);

              // In-range calculation
              let isInRange = false;
              if (selectionMode === 'range') {
                if (rangeStart && rangeEnd) {
                  const s = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
                  const e = rangeStart <= rangeEnd ? rangeEnd : rangeStart;
                  isInRange = dateStr >= s && dateStr <= e;
                } else if (rangeStart && hoverDate) {
                  const s = rangeStart <= hoverDate ? rangeStart : hoverDate;
                  const e = rangeStart <= hoverDate ? hoverDate : rangeStart;
                  isInRange = dateStr >= s && dateStr <= e;
                }
              }

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDayClick(dateStr)}
                  onMouseEnter={() => setHoverDate(dateStr)}
                  onMouseLeave={() => setHoverDate(null)}
                  className={`relative h-10 sm:h-12 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer group ${
                    isStart || isEnd || isSingleSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/40 z-10 scale-105'
                      : isInRange
                      ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30'
                      : hasData
                      ? 'bg-slate-800/80 hover:bg-slate-700/80 text-white border border-slate-700/70 hover:border-indigo-400/50'
                      : 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'
                  }`}
                  title={
                    hasData
                      ? `${dateStr}: ${dayData.totalDistanceKm} km, ${dayData.visits.length} stops, ${dayData.activities.length} trips`
                      : dateStr
                  }
                >
                  <span className="text-xs sm:text-sm font-semibold">{dayNum}</span>

                  {/* Activity Indicator: dot & distance */}
                  {hasData && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isStart || isEnd || isSingleSelected ? 'bg-white' : 'bg-emerald-400'
                        }`}
                      />
                      <span
                        className={`text-[9px] font-mono leading-none ${
                          isStart || isEnd || isSingleSelected
                            ? 'text-indigo-100 font-bold'
                            : 'text-slate-400'
                        }`}
                      >
                        {dayData.totalDistanceKm > 0 ? `${Math.round(dayData.totalDistanceKm)}k` : `${dayData.visits.length}p`}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer & Period Summary */}
        <div className="pt-3.5 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-3">
          <div className="text-xs text-slate-300">
            {previewSummary ? (
              <div className="flex flex-col">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{previewSummary.label}</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {previewSummary.daysCount} {previewSummary.daysCount === 1 ? 'day' : 'days'} ({previewSummary.activeDays} with trips) •{' '}
                  <strong className="text-emerald-400">{previewSummary.distanceKm} km</strong> •{' '}
                  <strong className="text-indigo-300">{previewSummary.visitsCount} stops</strong>
                </span>
              </div>
            ) : (
              <span className="text-slate-500">
                {selectionMode === 'range' ? 'Click a start date, then an end date' : 'Click a date to select'}
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleApplyRange}
              disabled={selectionMode === 'range' && !rangeStart}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{selectionMode === 'range' ? 'Apply Time Period' : 'Apply Date'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
