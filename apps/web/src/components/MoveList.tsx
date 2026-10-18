import React, { useEffect, useRef } from 'react';

interface MoveListProps {
  sanMoves: string[];
  selectedPly: number | null;
  onSelectPly: (ply: number | null) => void;
}

export const MoveList: React.FC<MoveListProps> = ({
  sanMoves,
  selectedPly,
  onSelectPly
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Group into turns: [ { number: 1, white: 'e4', black: 'e5' }, ... ]
  const turns: { number: number; white?: string; black?: string; whitePly: number; blackPly: number }[] = [];
  for (let i = 0; i < sanMoves.length; i += 2) {
    turns.push({
      number: Math.floor(i / 2) + 1,
      white: sanMoves[i],
      black: sanMoves[i + 1],
      whitePly: i,
      blackPly: i + 1
    });
  }

  // Auto-scroll on new moves
  useEffect(() => {
    if (scrollRef.current && selectedPly === null) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sanMoves.length, selectedPly]);

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700 shadow-sm flex flex-col h-48 sm:h-64">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100 dark:border-neutral-700 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
        <span>Moves ({sanMoves.length})</span>
        {selectedPly !== null && (
          <button
            onClick={() => onSelectPly(null)}
            className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Go to Live
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1 font-mono text-xs pr-1 scrollbar-thin"
      >
        {turns.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-400 text-xs italic">
            No moves played yet
          </div>
        ) : (
          turns.map((turn) => {
            const isWhiteSelected = selectedPly === turn.whitePly;
            const isBlackSelected = selectedPly === turn.blackPly;

            return (
              <div
                key={turn.number}
                className="grid grid-cols-12 items-center py-1 px-2 rounded hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors"
              >
                <span className="col-span-2 text-neutral-400 text-[11px]">
                  {turn.number}.
                </span>

                <button
                  onClick={() => onSelectPly(turn.whitePly)}
                  className={`col-span-5 text-left px-1.5 py-0.5 rounded transition-colors ${
                    isWhiteSelected
                      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 font-bold'
                      : 'text-neutral-800 dark:text-neutral-200 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                >
                  {turn.white}
                </button>

                {turn.black ? (
                  <button
                    onClick={() => onSelectPly(turn.blackPly)}
                    className={`col-span-5 text-left px-1.5 py-0.5 rounded transition-colors ${
                      isBlackSelected
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 font-bold'
                        : 'text-neutral-800 dark:text-neutral-200 hover:text-emerald-600 dark:hover:text-emerald-400'
                    }`}
                  >
                    {turn.black}
                  </button>
                ) : (
                  <span className="col-span-5" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
