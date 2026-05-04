// Carte affichant le score de risque humain detaille
import type { RiskFactors } from "@/lib/risk-score";
import { RISK_VERDICT_LABEL } from "@/lib/risk-score";

const VERDICT_BG: Record<string, string> = {
  excellent: "from-emerald-50 to-green-50 border-emerald-300",
  bon: "from-cyan-50 to-blue-50 border-cyan-300",
  a_surveiller: "from-amber-50 to-orange-50 border-amber-300",
  a_risque: "from-red-50 to-rose-50 border-red-300",
};

export default function RiskScoreCard({ risk }: { risk: RiskFactors }) {
  const v = RISK_VERDICT_LABEL[risk.verdict];
  return (
    <div
      className={`card bg-gradient-to-br ${VERDICT_BG[risk.verdict]} border-2`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-600 font-bold">
            Score de risque cyber
          </p>
          <p className="text-4xl sm:text-5xl font-extrabold text-primary-500 mt-1">
            {risk.finalScore}
            <span className="text-xl text-gray-400">/100</span>
          </p>
          <p className={`text-sm font-bold ${v.color} mt-1`}>{v.label}</p>
        </div>
        <div className="text-right">
          <ScoreGauge value={risk.finalScore} />
        </div>
      </div>

      {risk.components.length > 0 && (
        <div className="border-t border-white/50 pt-3 mt-3">
          <p className="text-xs font-bold text-gray-700 mb-2">
            Composantes du score
          </p>
          <ul className="space-y-1.5 text-xs">
            {risk.components.map((c, i) => (
              <li key={i} className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded min-w-[40px] text-center ${
                    c.delta > 0
                      ? "bg-success/20 text-success"
                      : c.delta < 0
                        ? "bg-red-100 text-warn"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {c.delta > 0 ? "+" : ""}
                  {c.delta}
                </span>
                <span className="text-gray-700">{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ScoreGauge({ value }: { value: number }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const color =
    value >= 80
      ? "#2E8B57"
      : value >= 60
        ? "#00A3A1"
        : value >= 40
          ? "#F59E0B"
          : "#C0392B";
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="rotate-[-90deg]">
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke="rgba(0,0,0,0.06)"
        strokeWidth="8"
      />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 700ms ease" }}
      />
    </svg>
  );
}
