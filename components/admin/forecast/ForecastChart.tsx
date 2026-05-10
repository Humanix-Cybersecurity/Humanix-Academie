// SPDX-License-Identifier: AGPL-3.0-or-later
// Graph SVG inline simple : x = jour, y = score (0-100).
// Trace l'historique en bleu plein, la projection en pointille teal.
// Pas de lib chart - inline SVG manipulable, accessible (role="img").

import type { ForecastPoint } from "@/lib/analytics/risk-forecast";

export default function ForecastChart({
  series,
  forecastY,
}: {
  series: ForecastPoint[];
  forecastY: number | null;
}) {
  if (series.length < 2) return null;
  const W = 600;
  const H = 180;
  const PAD = { top: 10, right: 12, bottom: 28, left: 32 };

  const baseTime = series[0].day.getTime();
  const lastTime = series[series.length - 1].day.getTime();
  const timeSpan = Math.max(1, lastTime - baseTime);

  const sx = (t: number) =>
    PAD.left + ((t - baseTime) / timeSpan) * (W - PAD.left - PAD.right);
  const sy = (score: number) =>
    PAD.top + ((100 - score) / 100) * (H - PAD.top - PAD.bottom);

  const history = series.filter((p) => p.type === "history");
  const forecastPoint = series.find((p) => p.type === "forecast");

  const historyPath = history
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${sx(p.day.getTime()).toFixed(1)} ${sy(p.score).toFixed(1)}`,
    )
    .join(" ");

  const forecastPath =
    forecastPoint && history.length > 0
      ? `M${sx(history[history.length - 1].day.getTime()).toFixed(1)} ${sy(history[history.length - 1].score).toFixed(1)} L${sx(forecastPoint.day.getTime()).toFixed(1)} ${sy(forecastPoint.score).toFixed(1)}`
      : "";

  // Reperes Y : 0, 25, 50, 75, 100
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[800px] text-gray-400 dark:text-gray-500"
        role="img"
        aria-label="Graphique de projection du score de risque tenant"
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={sy(t)}
              y2={sy(t)}
              stroke="currentColor"
              strokeOpacity="0.15"
              strokeDasharray="2 3"
            />
            <text
              x={PAD.left - 6}
              y={sy(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="10"
              fill="currentColor"
            >
              {t}
            </text>
          </g>
        ))}
        {historyPath && (
          <path
            d={historyPath}
            fill="none"
            stroke="#0B3D91"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}
        {forecastPath && (
          <path
            d={forecastPath}
            fill="none"
            stroke="#00A3A1"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinejoin="round"
          />
        )}
        {forecastPoint && forecastY !== null && (
          <g>
            <circle
              cx={sx(forecastPoint.day.getTime())}
              cy={sy(forecastY)}
              r="4"
              fill="#00A3A1"
            />
            <text
              x={sx(forecastPoint.day.getTime()) - 6}
              y={sy(forecastY) - 8}
              textAnchor="end"
              fontSize="10"
              fontWeight="700"
              fill="#00A3A1"
            >
              J+30
            </text>
          </g>
        )}
        {/* Legende */}
        <g transform={`translate(${PAD.left}, ${H - 4})`}>
          <line x1="0" x2="14" y1="0" y2="0" stroke="#0B3D91" strokeWidth="2" />
          <text x="18" y="0" fontSize="10" fill="currentColor" dominantBaseline="middle">
            Historique
          </text>
          <line
            x1="80"
            x2="94"
            y1="0"
            y2="0"
            stroke="#00A3A1"
            strokeWidth="2"
            strokeDasharray="5 4"
          />
          <text x="98" y="0" fontSize="10" fill="currentColor" dominantBaseline="middle">
            Projection
          </text>
        </g>
      </svg>
    </div>
  );
}
