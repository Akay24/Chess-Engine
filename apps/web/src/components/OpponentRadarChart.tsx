import React from 'react';
import { StyleVector, StyleDimension } from '@twentyfish/engine';

interface OpponentRadarChartProps {
  vector: StyleVector | null;
}

interface DimensionItem {
  key: string;
  label: string;
  dim: StyleDimension;
}

export const OpponentRadarChart: React.FC<OpponentRadarChartProps> = ({ vector }) => {
  const size = 240;
  const center = size / 2;
  const radius = 80;

  // Extract dimensions
  const items: DimensionItem[] = [
    { key: 'aggression', label: 'Aggression', dim: vector?.aggression ?? { value: 0.5, confidence: 0 } },
    { key: 'tactical', label: 'Tactical', dim: vector?.tactical ?? { value: 0.5, confidence: 0 } },
    { key: 'openness', label: 'Openness', dim: vector?.openness ?? { value: 0.5, confidence: 0 } },
    { key: 'kingSafety', label: 'King Safety', dim: vector?.kingSafety ?? { value: 0.5, confidence: 0 } },
    { key: 'blunderRate', label: 'Risk/Blunder', dim: vector?.blunderRate ?? { value: 0.5, confidence: 0 } }
  ];

  if (vector?.timePressure) {
    items.push({ key: 'timePressure', label: 'Time Pressure', dim: vector.timePressure });
  }

  const numAxes = items.length;
  const angleStep = (2 * Math.PI) / numAxes;

  // Compute polygon rings (25%, 50%, 75%, 100%)
  const rings = [0.25, 0.5, 0.75, 1.0].map((level) => {
    return items
      .map((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const x = center + radius * level * Math.cos(angle);
        const y = center + radius * level * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  });

  // Compute data polygon points
  const dataPoints = items.map((item, i) => {
    const angle = i * angleStep - Math.PI / 2;
    // Normalized value in [0, 1]
    const val = Math.max(0.05, Math.min(1.0, item.dim.value));
    const x = center + radius * val * Math.cos(angle);
    const y = center + radius * val * Math.sin(angle);
    return { x, y, item, angle };
  });

  const polygonPointsStr = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Average confidence for fill styling
  const avgConfidence = items.reduce((acc, curr) => acc + curr.dim.confidence, 0) / items.length;

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        aria-label="Opponent style radar chart"
      >
        {/* Background web rings */}
        {rings.map((points, idx) => (
          <polygon
            key={idx}
            points={points}
            fill={idx === rings.length - 1 ? 'currentColor' : 'none'}
            className="text-neutral-50 dark:text-neutral-900/40 stroke-neutral-200 dark:stroke-neutral-700/60"
            strokeWidth={idx === 1 ? '1.5' : '1'}
            strokeDasharray={idx === 1 ? '3 3' : undefined}
          />
        ))}

        {/* Axis lines */}
        {items.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x2 = center + radius * Math.cos(angle);
          const y2 = center + radius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              className="stroke-neutral-200 dark:stroke-neutral-700"
              strokeWidth="1"
            />
          );
        })}

        {/* Data polygon */}
        <polygon
          points={polygonPointsStr}
          fill="rgba(16, 185, 129, 0.25)"
          className="stroke-emerald-500 transition-all duration-500 ease-out"
          strokeWidth="2.5"
          style={{
            opacity: Math.max(0.35, avgConfidence)
          }}
        />

        {/* Data points & low-confidence visual muting */}
        {dataPoints.map((pt, i) => {
          const isLowConf = pt.item.dim.confidence < 0.3;
          return (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isLowConf ? 3.5 : 5}
                className={`transition-all duration-300 ${
                  isLowConf
                    ? 'fill-neutral-400 stroke-neutral-300 dark:stroke-neutral-600 opacity-40'
                    : 'fill-emerald-500 stroke-white dark:stroke-neutral-900'
                }`}
                strokeWidth="2"
              />
            </g>
          );
        })}

        {/* Axis Labels */}
        {items.map((item, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const labelDist = radius + 22;
          const lx = center + labelDist * Math.cos(angle);
          const ly = center + labelDist * Math.sin(angle);
          const isLowConf = item.dim.confidence < 0.3;

          return (
            <text
              key={item.key}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              className={`text-[10px] font-medium transition-colors ${
                isLowConf
                  ? 'fill-neutral-400 dark:fill-neutral-500 italic opacity-60'
                  : 'fill-neutral-700 dark:fill-neutral-300 font-semibold'
              }`}
            >
              {item.label}
              {isLowConf ? ' *' : ''}
            </text>
          );
        })}
      </svg>

      <div className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-2 text-center">
        * Visually muted dimensions indicate low sample size / early game
      </div>
    </div>
  );
};
