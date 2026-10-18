import React from 'react';
import { MultiPvInfo } from '../store/useEngineStore';

interface EngineStatsProps {
  isThinking: boolean;
  depth: number;
  nodes: number;
  nps: number;
  currentPv: string[];
  multiPvLines: MultiPvInfo[];
  levelName: string;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

export const EngineStats: React.FC<EngineStatsProps> = ({
  isThinking,
  depth,
  nodes,
  nps,
  currentPv,
  multiPvLines,
  levelName
}) => {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 shadow-sm transition-colors text-sm">
      <div className="flex items-center justify-between mb-3 border-b border-neutral-100 dark:border-neutral-700 pb-2">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">{levelName}</span>
          {isThinking && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 animate-pulse">
              <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500 animate-ping" />
              Thinking...
            </span>
          )}
        </div>
        <span className="text-xs text-neutral-500 font-mono">D: {depth}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div className="bg-neutral-50 dark:bg-neutral-900/50 p-2 rounded-lg">
          <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Depth</div>
          <div className="font-mono font-semibold text-neutral-700 dark:text-neutral-200">{depth || '-'}</div>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-900/50 p-2 rounded-lg">
          <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Nodes</div>
          <div className="font-mono font-semibold text-neutral-700 dark:text-neutral-200">{nodes ? formatNumber(nodes) : '-'}</div>
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-900/50 p-2 rounded-lg">
          <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Speed</div>
          <div className="font-mono font-semibold text-neutral-700 dark:text-neutral-200">{nps ? `${formatNumber(nps)}/s` : '-'}</div>
        </div>
      </div>

      {/* PV line display */}
      {currentPv && currentPv.length > 0 && (
        <div className="mt-2">
          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1">
            Principal Variation
          </div>
          <div className="font-mono text-xs bg-neutral-50 dark:bg-neutral-900 p-2 rounded-md overflow-x-auto whitespace-nowrap text-neutral-600 dark:text-neutral-300 border border-neutral-100 dark:border-neutral-800">
            {currentPv.slice(0, 6).join(' ')}
          </div>
        </div>
      )}

      {/* MultiPV candidate lines when available */}
      {multiPvLines && multiPvLines.length > 1 && (
        <div className="mt-3 border-t border-neutral-100 dark:border-neutral-700/60 pt-2">
          <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1">
            Top Lines (MultiPV)
          </div>
          <div className="space-y-1">
            {multiPvLines.map((line) => (
              <div
                key={line.multipv}
                className="flex items-center justify-between text-xs py-0.5 px-1.5 rounded hover:bg-neutral-50 dark:hover:bg-neutral-700/40 font-mono"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-neutral-400 font-bold">#{line.multipv}</span>
                  <span className="text-neutral-800 dark:text-neutral-200 font-medium">
                    {line.pv[0] || '-'}
                  </span>
                </div>
                <span className={`text-[11px] ${line.scoreCp >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {line.scoreCp >= 0 ? `+${(line.scoreCp / 100).toFixed(2)}` : (line.scoreCp / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
