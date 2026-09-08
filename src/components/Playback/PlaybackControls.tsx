import React, { useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Clock,
  Gauge,
  BarChart3,
  Car
} from 'lucide-react';
import { formatTime } from '../../utils/geoUtils';

interface PlaybackControlsProps {
  isPlaying: boolean;
  speed: number;
  currentTimestamp: number;
  minTimestamp: number;
  maxTimestamp: number;
  onTogglePlay: () => void;
  onSeek: (timestamp: number) => void;
  onChangeSpeed: (speed: number) => void;
  onReset: () => void;
  onOpenStats?: () => void;
}

const SPEED_OPTIONS = [1, 5, 15, 30, 60, 120];

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  speed,
  currentTimestamp,
  minTimestamp,
  maxTimestamp,
  onTogglePlay,
  onSeek,
  onChangeSpeed,
  onReset,
  onOpenStats
}) => {
  const totalDuration = Math.max(1, maxTimestamp - minTimestamp);
  const currentProgress = Math.max(0, Math.min(100, ((currentTimestamp - minTimestamp) / totalDuration) * 100));

  const currentTimeFormatted = useMemo(() => {
    if (!currentTimestamp) return '--:--';
    const d = new Date(currentTimestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, [currentTimestamp]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const newTs = minTimestamp + (val / 100) * totalDuration;
    onSeek(Math.round(newTs));
  };

  return (
    <div className="glass-panel border-t border-slate-700/50 px-4 py-3 flex flex-col gap-2.5 shadow-2xl backdrop-blur-xl">
      {/* Slider & Time Indicator */}
      <div className="flex items-center gap-3 w-full">
        <span className="text-xs font-mono text-slate-400 min-w-[65px]">
          {formatTime(minTimestamp) || 'Start'}
        </span>

        {/* Interactive Custom Scrubber Track & Moving Car Symbol */}
        <div className="relative flex-1 group flex items-center h-8">
          {/* Background Track */}
          <div className="absolute inset-x-0 h-2 bg-slate-800/90 rounded-full overflow-hidden border border-slate-700/50">
            {/* Filled Progress Gradient Bar */}
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-75"
              style={{ width: `${currentProgress}%` }}
            />
          </div>

          {/* Invisible Native Range Input for seamless drag & scrub */}
          <input
            type="range"
            min="0"
            max="100"
            step="0.05"
            value={currentProgress}
            onChange={handleSliderChange}
            className="absolute inset-x-0 w-full h-8 opacity-0 cursor-pointer z-20"
          />

          {/* Animated Custom Moving Car Symbol */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none z-10"
            style={{ left: `${currentProgress}%` }}
          >
            <div className={`relative flex items-center justify-center transition-transform duration-150 ${isPlaying ? 'scale-110' : 'scale-100'}`}>
              {/* Outer pulsing ring when playing */}
              {isPlaying && (
                <div className="absolute -inset-1.5 rounded-xl bg-indigo-500/50 animate-ping pointer-events-none" />
              )}
              {/* Small Car Badge */}
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 border-2 border-white shadow-xl shadow-indigo-500/60 flex items-center justify-center text-white">
                <Car className="w-4 h-4 text-white fill-white/20" />
              </div>
              {/* Downward pointer notch */}
              <div className="absolute -bottom-1 w-1.5 h-1.5 bg-indigo-600 rotate-45 border-r border-b border-white shadow-sm" />
            </div>
          </div>
        </div>

        <span className="text-xs font-mono text-slate-400 min-w-[65px] text-right">
          {formatTime(maxTimestamp) || 'End'}
        </span>
      </div>

      {/* Control Buttons Bar */}
      <div className="flex items-center justify-between">
        {/* Current Time Display */}
        <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
          <Clock className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span className="text-sm font-bold font-mono text-white tracking-wide">
            {currentTimeFormatted}
          </span>
        </div>

        {/* Playback action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            title="Reset to start of day"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause timeline (Space)' : 'Watch visited timeline (Space)'}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/40 active:scale-95 transition-all flex items-center justify-center font-semibold"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => onSeek(maxTimestamp)}
            title="Jump to end of day"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
          >
            <FastForward className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector & Analytics Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-xl border border-slate-800">
            <Gauge className="w-3.5 h-3.5 text-slate-400 mr-1" />
            {SPEED_OPTIONS.map((spd) => (
              <button
                key={spd}
                onClick={() => onChangeSpeed(spd)}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${
                  speed === spd
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {onOpenStats && (
            <button
              onClick={onOpenStats}
              title="View Travel Analytics"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-xs font-bold text-indigo-300 hover:text-white border border-indigo-500/40 transition active:scale-95 shadow-md cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Analytics</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
