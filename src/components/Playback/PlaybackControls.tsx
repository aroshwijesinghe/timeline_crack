import React, { useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Clock,
  Gauge
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
  onReset
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

        <div className="relative flex-1 group flex items-center">
          <input
            type="range"
            min="0"
            max="100"
            step="0.05"
            value={currentProgress}
            onChange={handleSliderChange}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
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

        {/* Speed Selector */}
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
      </div>
    </div>
  );
};
