"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from "recharts";
import type { BusinessImpact } from "@/lib/business-impact";

export default function BusinessImpactView({
  impact,
}: {
  impact: BusinessImpact;
}) {
  return (
    <div className="grid lg:grid-cols-3 gap-5 mb-6">
      {/* Tendance */}
      <div className="card lg:col-span-2">
        <h3 className="font-bold text-primary-500 mb-3">
          📈 Évolution du score collectif (7 jours)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={impact.trend}>
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              fontSize={11}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              fontSize={11}
            />
            <Tooltip
              cursor={{ stroke: "#00A3A1", strokeDasharray: "3 3" }}
              contentStyle={{
                borderRadius: 12,
                border: "none",
                boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
              }}
            />
            <ReferenceLine
              y={70}
              stroke="#2E8B57"
              strokeDasharray="3 3"
              label={{ value: "Cible 70", fontSize: 10, fill: "#2E8B57" }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#0B3D91"
              strokeWidth={3}
              dot={{ r: 5, fill: "#00A3A1", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 text-center mt-2">
          La cible recommandée pour bénéficier des baisses de prime cyber est ≥
          70.
        </p>
      </div>

      {/* Decomposition financiere */}
      <div className="card bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <h3 className="font-bold text-primary-500 mb-3">
          💰 Calcul d'exposition
        </h3>
        <div className="space-y-3 text-sm">
          <Row
            label="Coût moyen d'un incident"
            value={`${impact.estimatedIncidentCost.toLocaleString("fr-FR")} €`}
          />
          <Row
            label="Probabilité 12 mois"
            value={`${Math.round(impact.incidentProbability12m * 100)}%`}
          />
          <div className="border-t pt-2 mt-2">
            <Row
              label="Espérance de perte (×)"
              value={`${impact.expectedAnnualLoss.toLocaleString("fr-FR")} €`}
              bold
              color="text-warn"
            />
          </div>
          <div className="bg-white rounded-xl p-3 mt-3">
            <p className="text-xs text-gray-500 mb-1">Avec Humanix</p>
            <p className="text-2xl font-extrabold text-success">
              {impact.estimatedAnnualSaving.toLocaleString("fr-FR")} €
            </p>
            <p className="text-xs text-gray-500">économie attendue / an</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600">{label}</span>
      <span
        className={`${bold ? "text-lg" : ""} font-bold ${color ?? "text-primary-500"}`}
      >
        {value}
      </span>
    </div>
  );
}

export function ServiceBreakdown({ impact }: { impact: BusinessImpact }) {
  return (
    <div className="card">
      <h3 className="font-bold text-primary-500 mb-3">
        🏛️ Score moyen par service
      </h3>
      <ResponsiveContainer
        width="100%"
        height={Math.max(180, impact.byService.length * 32)}
      >
        <BarChart data={impact.byService} layout="vertical">
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="service"
            width={100}
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,163,161,0.05)" }}
            contentStyle={{ borderRadius: 12, border: "none" }}
          />
          <Bar dataKey="avgScore" radius={[0, 8, 8, 0]}>
            {impact.byService.map((s, i) => (
              <Cell
                key={i}
                fill={
                  s.avgScore >= 70
                    ? "#2E8B57"
                    : s.avgScore >= 50
                      ? "#F59E0B"
                      : "#C0392B"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
