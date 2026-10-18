import React from 'react';
import { ClockState } from '../store/useGameStore';

interface ClockDisplayProps {
  clock: ClockState;
  turn: 'w' | 'b';
  orientation?: 'white' | 'black';
}

function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);

  if (totalSeconds < 10) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export const ClockDisplay: React.FC<ClockDisplayProps> = ({
  clock,
  turn,
  orientation = 'white'
}) => {
  const isWhiteActive = clock.isRunning && turn === 'w';
  const isBlackActive = clock.isRunning && turn === 'b';

  const isWhiteLow = clock.whiteMs < 30000;
  const isBlackLow = clock.blackMs < 30000;

  const topColor = orientation === 'white' ? 'black' : 'white';
  const topMs = orientation === 'white' ? clock.blackMs : clock.whiteMs;
  const topActive = orientation === 'white' ? isBlackActive : isWhiteActive;
  const topLow = orientation === 'white' ? isBlackLow : isWhiteLow;

  const bottomColor = orientation === 'white' ? 'white' : 'black';
  const bottomMs = orientation === 'white' ? clock.whiteMs : clock.blackMs;
  const bottomActive = orientation === 'white' ? isWhiteActive : isBlackActive;
  const bottomLow = orientation === 'white' ? isWhiteLow : isBlackLow;

  return (
    <div className="flex items-center justify-between gap-3 w-full my-2">
      {/* Top Player Clock */}
      <div
        className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg font-mono transition-all duration-200 border ${
          topActive
            ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
        } ${topLow && topActive ? 'animate-pulse border-red-500 text-red-400' : ''}`}
      >
        <span className="text-xs uppercase tracking-wider font-semibold opacity-75">
          {topColor}
        </span>
        <span className="text-lg font-bold tracking-tight">
          {formatClock(topMs)}
        </span>
      </div>

      {/* Bottom Player Clock */}
      <div
        className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg font-mono transition-all duration-200 border ${
          bottomActive
            ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
        } ${bottomLow && bottomActive ? 'animate-pulse border-red-500 text-red-400' : ''}`}
      >
        <span className="text-xs uppercase tracking-wider font-semibold opacity-75">
          {bottomColor}
        </span>
        <span className="text-lg font-bold tracking-tight">
          {formatClock(bottomMs)}
        </span>
      </div>
    </div>
  );
};
