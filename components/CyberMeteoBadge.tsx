// Composant Cyber-météo : 2 variantes
//   - "compact" : badge inline pour le bandeau home / header
//   - "card" : carte détaillée pour le dashboard /admin/business
//
// Server Component pur (pas de "use client") — données pré-calculées par
// la route appelante, on rend juste statiquement.

import Link from "next/link";
import type { CyberMeteo } from "@/lib/cyber-meteo";

const LEVEL_BG: Record<string, string> = {
  vert: "bg-green-50 dark:bg-green-900/20 border-green-300 text-green-800 dark:text-green-200",
  jaune: "bg-amber-50 dark:bg-amber-900/20 border-amber-300 text-amber-800 dark:text-amber-200",
  orange: "bg-orange-50 dark:bg-orange-900/20 border-orange-300 text-orange-800 dark:text-orange-200",
  rouge: "bg-red-50 dark:bg-red-900/20 border-red-400 text-red-900 dark:text-red-200",
};

const LEVEL_PULSE: Record<string, string> = {
  vert: "",
  jaune: "",
  orange: "animate-pulse",
  rouge: "animate-pulse",
};

export function CyberMeteoCompact({ meteo }: { meteo: CyberMeteo }) {
  const cls = LEVEL_BG[meteo.level] ?? LEVEL_BG.vert;
  const pulse = LEVEL_PULSE[meteo.level] ?? "";
  return (
    <Link
      href="/cyber-meteo"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${cls} hover:opacity-90 transition`}
      title={meteo.summary}
      aria-label={`Cyber-météo France : ${meteo.label}. ${meteo.summary}`}
    >
      <span aria-hidden="true" className={pulse}>{meteo.emoji}</span>
      <span>
        Cyber-météo France : <strong>{meteo.label}</strong>
      </span>
    </Link>
  );
}

export function CyberMeteoCard({ meteo }: { meteo: CyberMeteo }) {
  const cls = LEVEL_BG[meteo.level] ?? LEVEL_BG.vert;
  const pulse = LEVEL_PULSE[meteo.level] ?? "";
  return (
    <div className={`rounded-2xl border-2 p-5 ${cls}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-xs uppercase tracking-widest font-bold opacity-80">
            🇫🇷 Cyber-météo France · CERT-FR
          </p>
          <h3 className="text-2xl font-extrabold mt-1 flex items-center gap-2">
            <span aria-hidden="true" className={pulse}>{meteo.emoji}</span>
            {meteo.label}
          </h3>
        </div>
        <div className="text-right text-[10px] opacity-70">
          <p>Mise à jour</p>
          <p className="font-mono">
            {new Date(meteo.computedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
          </p>
        </div>
      </div>

      <p className="text-sm leading-relaxed mb-4">{meteo.summary}</p>

      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        <div className="bg-white/60 dark:bg-slate-900/40 rounded-lg p-2">
          <p className="opacity-70 uppercase tracking-wide">Alertes 24h</p>
          <p className="text-xl font-extrabold tabular-nums">{meteo.alertsLast24h}</p>
        </div>
        <div className="bg-white/60 dark:bg-slate-900/40 rounded-lg p-2">
          <p className="opacity-70 uppercase tracking-wide">Alertes 7 j</p>
          <p className="text-xl font-extrabold tabular-nums">{meteo.alertsLast7d}</p>
        </div>
      </div>

      {meteo.topAlerts.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-bold opacity-90 hover:opacity-100">
            Voir les {meteo.topAlerts.length} dernières alertes CERT-FR
          </summary>
          <ul className="mt-2 space-y-1">
            {meteo.topAlerts.map((a, i) => (
              <li key={i} className="text-xs">
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  <strong>
                    {new Date(a.date).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </strong>{" "}
                  — {a.title}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-[10px] opacity-60 mt-3 italic">
        Source : flux officiel CERT-FR · cert.ssi.gouv.fr · données mises en cache 1 h
      </p>
    </div>
  );
}
