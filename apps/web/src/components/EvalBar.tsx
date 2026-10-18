import React from 'react';

interface EvalBarProps {
  evalCp: number;
  isMate: boolean;
  mateIn: number | null;
  orientation?: 'white' | 'black';
}

export const EvalBar: React.FC<EvalBarProps> = ({
  evalCp,
  isMate,
  mateIn,
  orientation = 'white'
}) => {
  // Convert centipawns to percentage: 0 cp -> 50%, +500 cp -> ~90%, -500 cp -> ~10%
  // Using standard sigmoid / logistic scaling
  let whiteWinningPct = 50;
  let displayLabel = '0.0';

  if (isMate && mateIn !== null) {
    if (mateIn > 0) {
      whiteWinningPct = 100;
      displayLabel = `M${mateIn}`;
    } else {
      whiteWinningPct = 0;
      displayLabel = `-M${Math.abs(mateIn)}`;
    }
  } else {
    // Sigmoid curve: 2 / (1 + exp(-0.004 * cp)) - 1
    const clampedCp = Math.max(-1500, Math.min(1500, evalCp));
    const winProb = 1 / (1 + Math.pow(10, -clampedCp / 400));
    whiteWinningPct = Math.max(5, Math.min(95, winProb * 100));

    const pawns = (evalCp / 100).toFixed(1);
    displayLabel = evalCp > 0 ? `+${pawns}` : `${pawns}`;
  }

  // Adjust for orientation
  const topPercentage = orientation === 'white' ? (100 - whiteWinningPct) : whiteWinningPct;

  return (
    <div
      className="relative flex flex-col items-center justify-between w-6 h-full min-h-[380px] bg-neutral-900 rounded-lg overflow-hidden border border-neutral-700 shadow-inner select-none transition-all duration-300"
      aria-label={`Evaluation: ${displayLabel}`}
      role="progressbar"
      aria-valuenow={whiteWinningPct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Black's share (top) */}
      <div
        className="w-full bg-neutral-800 transition-all duration-500 ease-out flex items-start justify-center pt-1"
        style={{ height: `${topPercentage}%` }}
      >
        {topPercentage >= 15 && orientation === 'black' && (
          <span className="text-[10px] font-mono font-bold text-neutral-300">
            {displayLabel}
          </span>
        )}
      </div>

      {/* White's share (bottom) */}
      <div
        className="w-full bg-neutral-100 transition-all duration-500 ease-out flex items-end justify-center pb-1"
        style={{ height: `${100 - topPercentage}%` }}
      >
        {(100 - topPercentage) >= 15 && orientation === 'white' && (
          <span className="text-[10px] font-mono font-bold text-neutral-900">
            {displayLabel}
          </span>
        )}
      </div>
    </div>
  );
};
