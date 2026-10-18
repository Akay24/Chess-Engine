import React from 'react';
import { OpponentRadarChart } from './OpponentRadarChart';
import { useAdaptationStore } from '../store/useAdaptationStore';
import { Shield, Zap, Sparkles } from 'lucide-react';

export const AdaptationPanel: React.FC = () => {
  const {
    adaptationEnabled,
    toggleAdaptation,
    styleVector,
    plan,
    statusText
  } = useAdaptationStore();

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 shadow-sm transition-colors flex flex-col space-y-4">
      {/* Header and Toggle */}
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-700 pb-3">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
            Opponent Profile & Adaptation
          </h3>
        </div>

        <button
          onClick={toggleAdaptation}
          type="button"
          role="switch"
          aria-checked={adaptationEnabled}
          className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
            adaptationEnabled ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-neutral-600'
          }`}
        >
          <span className="sr-only">Toggle Opponent Adaptation</span>
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              adaptationEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Radar Chart */}
      <div className="flex justify-center py-1">
        <OpponentRadarChart vector={styleVector} />
      </div>

      {/* Live Status Description */}
      <div className="bg-neutral-50 dark:bg-neutral-900/60 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800 text-xs">
        <div className="flex items-center space-x-1.5 mb-1 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span>Active Strategy</span>
        </div>
        <p className="text-neutral-700 dark:text-neutral-200 leading-relaxed font-sans">
          {statusText}
        </p>
      </div>

      {/* Adaptation Plan Weights if active */}
      {plan && adaptationEnabled && (
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="p-2 rounded bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800/80">
            <span className="text-neutral-400 block">Structure</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200 capitalize">
              {plan.preferredStructure}
            </span>
          </div>

          <div className="p-2 rounded bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800/80">
            <span className="text-neutral-400 block">Piece Trades</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200">
              {plan.weights.pieceTrades > 0 ? '+Trades' : plan.weights.pieceTrades < 0 ? 'Keep Tension' : 'Neutral'}
            </span>
          </div>

          <div className="p-2 rounded bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800/80">
            <span className="text-neutral-400 block">Sharpness</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200">
              {plan.weights.tacticalSharpness > 0 ? 'Tactical' : plan.weights.tacticalSharpness < 0 ? 'Solid / Quiet' : 'Normal'}
            </span>
          </div>

          <div className="p-2 rounded bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-100 dark:border-neutral-800/80">
            <span className="text-neutral-400 block">King Defense</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200">
              {(plan.weights.kingDefense * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
