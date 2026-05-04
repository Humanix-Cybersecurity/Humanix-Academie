// Page publique "Observatoire des fuites de données".
//
// Agrege 3 sources francaises (frenchbreaches, bonjourlafuite, fuitesinfos).
// Donnees lues depuis la BDD locale (rapide, pas de scrape au chargement).
// Lazy refresh fire-and-forget si BDD perimee (>24h).

import Link from "next/link";
import { Suspense } from "react";
import {
  listRecentBreaches,
  getBreachStats,
  maybeTriggerLazyRefresh,
} from "@/lib/breaches/repository";
import { SOURCE_META } from "@/lib/breaches/types";
import type { BreachSource } from "@prisma/client";
import BreachesFilters from "@/components/BreachesFilters";

export const dynamic = "force-dynamic";
export const revalidate = 1800; // 30 min cote Next

export const metadata = {
  title: "Observatoire des fuites de données | Humanix Académie",
  description:
    "Recensement des fuites de données récentes en France, agrégé depuis FrenchBreaches, Bonjour la Fuite et Fuites Infos. Mise à jour quotidienne.",
};

const SEVERITY_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  critical: { label: "Critique", bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-800 dark:text-red-200" },
  high: { label: "Élevée", bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-800 dark:text-orange-200" },
  medium: { label: "Modérée", bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-800 dark:text-amber-200" },
  low: { label: "Faible", bg: "bg-gray-100 dark:bg-slate-700", text: "text-gray-700 dark:text-gray-300" },
};

const SOURCE_BADGE: Record<BreachSource, string> = {
  FRENCHBREACHES: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  BONJOURLAFUITE: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  FUITESINFOS: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  MANUAL: "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-200",
};

type SearchParamsP = Promise<{ source?: string; q?: string; page?: string }>;

export default async function ObservatoireFuitesPage({
  searchParams,
}: {
  searchParams: SearchParamsP;
}) {
  // Lazy refresh non-bloquant : si la BDD est perimee, on lance le scrape
  // en arriere-plan. La page se charge instantanement sur les donnees actuelles.
  maybeTriggerLazyRefresh();

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const PER_PAGE = 20;
  const offset = (page - 1) * PER_PAGE;

  const sourceFilter = (sp.source ?? "").toUpperCase();
  const allowedSources: BreachSource[] = ["FRENCHBREACHES", "BONJOURLAFUITE", "FUITESINFOS"];
  const filterSource = allowedSources.includes(sourceFilter as BreachSource)
    ? (sourceFilter as BreachSource)
    : undefined;

  const [{ items, total }, stats] = await Promise.all([
    listRecentBreaches({
      limit: PER_PAGE,
      offset,
      filter: {
        source: filterSource,
        query: sp.q?.trim() || undefined,
      },
    }),
    getBreachStats(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-10 max-w-3xl mx-auto">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-2">
          Observatoire indépendant
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          Les fuites de données françaises,<br />
          <span className="text-accent-500">agrégées en un seul endroit</span>.
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Recensement temps réel des fuites publiées par les 3 sources
          francophones de référence. Mise à jour quotidienne, sources citées,
          aucune publicité.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Fuites recensées" value={stats.total.toString()} />
        <StatCard label="Sur 30 jours" value={stats.last30d.toString()} accent />
        <StatCard label="Sur 7 jours" value={stats.last7d.toString()} accent />
        <StatCard
          label="Dernière synchro"
          value={stats.lastSync ? formatRelative(stats.lastSync) : "—"}
        />
      </div>

      {/* Bandeau anti-déni : "personne n'est à l'abri" */}
      <div className="card mb-8 bg-gradient-to-br from-primary-500 to-accent-500 text-white">
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-4xl" aria-hidden="true">⚠️</div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg mb-1">Personne n'est à l'abri</h2>
            <p className="text-sm opacity-90">
              CHU, mairies, retailers, e-commerces, écoles, indépendants : les
              fuites touchent toutes les tailles d'organisation. La sensibilisation
              et la préparation sont la seule défense efficace.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Link href="/audit-flash" className="bg-white text-primary-500 font-bold px-4 py-2 rounded-xl text-sm hover:scale-105 transition">
              🎯 Auditer ma PME
            </Link>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <BreachesFilters
        currentSource={sp.source ?? ""}
        currentQuery={sp.q ?? ""}
        statsBySource={stats.bySource}
      />

      {/* Liste */}
      <Suspense fallback={<p className="text-center text-sm text-gray-500 py-8">Chargement…</p>}>
        {items.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-5xl mb-3 opacity-40" aria-hidden="true">🌫️</p>
            <p className="text-gray-500 mb-2">Aucune fuite trouvée pour ces filtres.</p>
            {(stats.total === 0) && (
              <p className="text-xs text-gray-400">
                La synchronisation initiale est en cours. Revenez dans quelques minutes.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((b) => {
              const sev = SEVERITY_BADGE[b.severity] ?? SEVERITY_BADGE.medium;
              return (
                <article
                  key={b.id}
                  className="card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${SOURCE_BADGE[b.source]}`}>
                        {SOURCE_META[b.source as keyof typeof SOURCE_META]?.name ?? b.source}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${sev.bg} ${sev.text}`}>
                        {sev.label}
                      </span>
                      {b.organization && (
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          🏢 {b.organization}
                        </span>
                      )}
                    </div>
                    <time
                      className="text-xs text-gray-500 tabular-nums"
                      dateTime={b.incidentDate.toISOString()}
                    >
                      {b.incidentDate.toLocaleDateString("fr-FR", { dateStyle: "medium" })}
                    </time>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-primary-500 mb-1">
                    <a
                      href={b.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {b.title}
                    </a>
                  </h3>

                  {b.summary && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                      {b.summary}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-500">
                    {b.recordsExposed != null && (
                      <span>
                        🗂️ <strong className="text-primary-500">{formatRecords(b.recordsExposed)}</strong> exposés
                      </span>
                    )}
                    {b.dataTypes && (
                      <span>📋 {b.dataTypes.split(",").slice(0, 3).join(", ")}</span>
                    )}
                    <a
                      href={b.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-accent-500 hover:underline font-medium"
                    >
                      Source officielle ↗
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Suspense>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex justify-center gap-2 mt-8" aria-label="Pagination des fuites">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/observatoire-fuites?${new URLSearchParams({
                ...(filterSource ? { source: filterSource } : {}),
                ...(sp.q ? { q: sp.q } : {}),
                page: String(p),
              }).toString()}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                p === page
                  ? "bg-accent-500 text-white"
                  : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-accent-50"
              }`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Link>
          ))}
          {totalPages > 10 && <span className="text-sm text-gray-500 self-center">…</span>}
        </nav>
      )}

      {/* Sources et methodologie */}
      <section className="card mt-12 bg-gray-50 dark:bg-slate-800">
        <h2 className="font-bold text-primary-500 mb-3">Sources & méthodologie</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          Cet observatoire ne produit aucune information : il agrège et cite les
          3 sources francophones de référence. Tous les contenus restent la
          propriété de leurs auteurs. Cliquez sur le titre d'une fuite pour
          consulter l'article original.
        </p>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          {(Object.entries(SOURCE_META) as [keyof typeof SOURCE_META, typeof SOURCE_META[keyof typeof SOURCE_META]][])
            .filter(([, meta]) => meta.active)
            .map(
            ([key, meta]) => (
              <a
                key={key}
                href={meta.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-accent-500"
              >
                <p className="font-bold text-primary-500 mb-1">{meta.name} ↗</p>
                <p className="text-xs text-gray-500 mb-2">{meta.url}</p>
                <p className="text-xs text-gray-700 dark:text-gray-300">{meta.description}</p>
              </a>
            ),
          )}
        </div>
        <p className="text-xs text-gray-500 mt-4 italic">
          Mise à jour automatique toutes les 6 heures. Pour signaler une erreur
          ou demander le retrait d'une entrée :{" "}
          <a href="mailto:contact@humanix-cybersecurity.fr" className="text-accent-500 underline">
            contact@humanix-cybersecurity.fr
          </a>
          .
        </p>
      </section>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-xl border-2 p-3 text-center ${
        accent
          ? "border-accent-500 bg-accent-50 dark:bg-accent-900/20"
          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
      }`}
    >
      <p className="text-2xl sm:text-3xl font-extrabold text-primary-500 tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function formatRecords(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Md`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} K`;
  return n.toString();
}

function formatRelative(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600_000);
  if (h < 1) return "à l'instant";
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}
