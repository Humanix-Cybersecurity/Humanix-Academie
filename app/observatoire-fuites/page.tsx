// SPDX-License-Identifier: AGPL-3.0-or-later
// Observatoire des fuites de données - refonte cosy mai 2026.
//
// Brief : "experience, terrain, sensibilisation reelle, pas celle generee
// par la peur - celle qui sent bon la maitrise et la confiance".
//
// Sujet sensible : les fuites de donnees peuvent generer de la peur.
// Avant, le bandeau "⚠️ Personne n'est a l'abri" + gradient primary/accent
// jouait sur ce registre. On refond pour transformer la peur en pedagogie :
// "Ce qu'on apprend des fuites - sans dramatiser".
//
// Logique metier preservee : queries Prisma, lazy refresh, pagination,
// filtres source/query.

import Link from "next/link";
import { Suspense } from "react";
import {
  listRecentBreaches,
  getBreachStats,
  maybeTriggerLazyRefresh,
} from "@/lib/breaches/repository";
import { SOURCE_META } from "@/lib/breaches/types";
import type { BreachSource } from "@prisma/client";
import HexBackdrop from "@/components/HexBackdrop";
import BreachesFilters from "@/components/BreachesFilters";

export const dynamic = "force-dynamic";
export const revalidate = 1800; // 30 min cote Next

export const metadata = {
  title: "Observatoire des fuites de données françaises | Humanix Académie",
  description:
    "Recensement des fuites de données récentes en France, agrégé depuis FrenchBreaches, Bonjour la Fuite et Fuites Infos. Mise à jour quotidienne. Sans dramatiser.",
  alternates: { canonical: "/observatoire-fuites" },
  openGraph: {
    title: "Les fuites de données françaises, en un seul endroit",
    description:
      "Sources francophones de référence. Sans dramatiser, sans publicité, sans tracker. Mis à jour chaque matin.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Observatoire des fuites de données FR",
    description:
      "🔍 3 sources francophones · 🚫 Zéro tracker · 🔓 Open data. Mis à jour chaque matin.",
  },
};

// Severite adoucie : pas de rouge alarmiste pour "critique" - amber chaud
// + emoji explicite. La gravite est exprimee par les chiffres (records),
// pas par une couleur qui fait peur.
const SEVERITY_BADGE: Record<
  string,
  { label: string; bg: string; text: string; emoji: string }
> = {
  critical: {
    label: "Critique",
    bg: "bg-rose-100 dark:bg-rose-900/40",
    text: "text-rose-800 dark:text-rose-200",
    emoji: "🔴",
  },
  high: {
    label: "Élevée",
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-800 dark:text-amber-200",
    emoji: "🟠",
  },
  medium: {
    label: "Modérée",
    bg: "bg-yellow-100 dark:bg-yellow-900/40",
    text: "text-yellow-800 dark:text-yellow-200",
    emoji: "🟡",
  },
  low: {
    label: "Faible",
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    text: "text-emerald-800 dark:text-emerald-200",
    emoji: "🟢",
  },
};

const SOURCE_BADGE: Record<BreachSource, string> = {
  FRENCHBREACHES:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  BONJOURLAFUITE:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  FUITESINFOS:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
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
  const allowedSources: BreachSource[] = [
    "FRENCHBREACHES",
    "BONJOURLAFUITE",
    "FUITESINFOS",
  ];
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
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* ============================================================
          1. HERO - sobre, sans dramatiser
          ============================================================ */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section
          aria-labelledby="hero-title"
          className="max-w-5xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12 text-center"
        >
          <p className="inline-flex items-center gap-2 text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-accent-500/30 px-4 py-2 rounded-full mb-8 shadow-sm">
            <span aria-hidden="true">🔍</span> Observatoire indépendant ·
            Mise à jour quotidienne
          </p>

          <h1
            id="hero-title"
            className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-6 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            Les fuites de données françaises,
            <br />
            <span className="bg-gradient-to-r from-accent-500 via-primary-500 to-accent-500 bg-clip-text text-transparent animate-gradient">
              en un seul endroit.
            </span>
          </h1>

          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "220ms" }}
          >
            Recensement des incidents publiés par les 3 sources francophones de
            référence. Pour rester informé·e - <strong>sans dramatiser</strong>,
            sans publicité, sans tracker.
          </p>
        </section>
      </HexBackdrop>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        {/* ============================================================
            2. STATS - coup d'oeil rapide
            ============================================================ */}
        <section aria-labelledby="stats-title">
          <h2 id="stats-title" className="sr-only">
            Statistiques de l'observatoire
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ObsStat
              label="Fuites recensées"
              value={stats.total.toString()}
              delay={0}
            />
            <ObsStat
              label="Sur 30 jours"
              value={stats.last30d.toString()}
              accent
              delay={80}
            />
            <ObsStat
              label="Sur 7 jours"
              value={stats.last7d.toString()}
              accent
              delay={160}
            />
            <ObsStat
              label="Dernière synchro"
              value={stats.lastSync ? formatRelative(stats.lastSync) : "—"}
              delay={240}
            />
          </div>
        </section>

        {/* ============================================================
            3. CE QU'ON APPREND - pedagogie au lieu de peur
            ============================================================ */}
        <section aria-labelledby="lesson-title">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-900/40 p-8 shadow-sm">
            <div className="grid sm:grid-cols-[auto_1fr_auto] items-center gap-6">
              <div
                className="text-5xl shrink-0 animate-float"
                aria-hidden="true"
              >
                💡
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] font-bold text-emerald-700 dark:text-emerald-300 mb-2">
                  Ce qu'on apprend des fuites
                </p>
                <h2
                  id="lesson-title"
                  className="font-display text-xl sm:text-2xl font-extrabold text-primary-500 dark:text-emerald-200 mb-2"
                >
                  Toutes les organisations sont concernées - c'est une donnée,
                  pas une malédiction.
                </h2>
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                  CHU, mairies, retailers, e-commerces, écoles, indépendants :
                  les fuites touchent toutes les tailles d'organisation. Lire
                  cet observatoire, c'est apprendre des erreurs des autres pour
                  ne pas les répéter. La maîtrise, pas la panique.
                </p>
              </div>
              <Link
                href="/audit-flash"
                className="btn-primary text-sm whitespace-nowrap shrink-0"
              >
                <span aria-hidden="true">🌿</span> Auditer ma PME
              </Link>
            </div>
          </div>
        </section>

        {/* ============================================================
            4. FILTRES
            ============================================================ */}
        <BreachesFilters
          currentSource={sp.source ?? ""}
          currentQuery={sp.q ?? ""}
          statsBySource={stats.bySource}
        />

        {/* ============================================================
            5. LISTE DES FUITES
            ============================================================ */}
        <Suspense
          fallback={
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8 italic">
              Chargement…
            </p>
          }
        >
          {items.length === 0 ? (
            <div className="card text-center py-16 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 border-emerald-200 dark:border-emerald-900/40">
              <p
                className="text-6xl mb-4 inline-block animate-float opacity-60"
                aria-hidden="true"
              >
                🌫️
              </p>
              <h3 className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-2">
                Aucune fuite trouvée pour ces filtres
              </h3>
              {stats.total === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-300 italic max-w-md mx-auto">
                  La synchronisation initiale est en cours. Reviens nous voir
                  dans quelques minutes.
                </p>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300 italic max-w-md mx-auto">
                  Essaie d'élargir tes filtres ou de rechercher un autre terme.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((b, idx) => {
                const sev = SEVERITY_BADGE[b.severity] ?? SEVERITY_BADGE.medium;
                return (
                  <article
                    key={b.id}
                    className="card hover:shadow-md hover:-translate-y-0.5 transition-all animate-slide-up"
                    style={{ animationDelay: `${Math.min(idx, 10) * 30}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${SOURCE_BADGE[b.source]}`}
                        >
                          {SOURCE_META[b.source as keyof typeof SOURCE_META]
                            ?.name ?? b.source}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${sev.bg} ${sev.text} inline-flex items-center gap-1`}
                        >
                          <span aria-hidden="true">{sev.emoji}</span>{" "}
                          {sev.label}
                        </span>
                        {b.organization && (
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            <span aria-hidden="true">🏢</span> {b.organization}
                          </span>
                        )}
                      </div>
                      <time
                        className="text-xs text-gray-500 dark:text-gray-400 tabular-nums italic"
                        dateTime={b.incidentDate.toISOString()}
                      >
                        {b.incidentDate.toLocaleDateString("fr-FR", {
                          dateStyle: "medium",
                        })}
                      </time>
                    </div>

                    <h3 className="font-display text-base sm:text-lg font-extrabold text-primary-500 dark:text-accent-300 mb-2 leading-tight">
                      <a
                        href={b.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-4 hover:underline"
                      >
                        {b.title}
                        <span aria-hidden="true" className="text-xs ml-1">
                          ↗
                        </span>
                        <span className="sr-only"> (nouvel onglet)</span>
                      </a>
                    </h3>

                    {b.summary && (
                      <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-3 leading-relaxed">
                        {b.summary}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                      {b.recordsExposed != null && (
                        <span>
                          <span aria-hidden="true">🗂️</span>{" "}
                          <strong className="text-primary-500 dark:text-accent-300 tabular-nums">
                            {formatRecords(b.recordsExposed)}
                          </strong>{" "}
                          exposés
                        </span>
                      )}
                      {b.dataTypes && (
                        <span>
                          <span aria-hidden="true">📋</span>{" "}
                          {b.dataTypes.split(",").slice(0, 3).join(", ")}
                        </span>
                      )}
                      <a
                        href={b.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-accent-700 dark:text-accent-300 underline-offset-4 hover:underline font-bold"
                      >
                        Source officielle{" "}
                        <span aria-hidden="true">↗</span>
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Suspense>

        {/* ============================================================
            6. PAGINATION
            ============================================================ */}
        {totalPages > 1 && (
          <nav
            className="flex justify-center gap-2"
            aria-label="Pagination des fuites"
          >
            {Array.from(
              { length: Math.min(totalPages, 10) },
              (_, i) => i + 1,
            ).map((p) => (
              <Link
                key={p}
                href={`/observatoire-fuites?${new URLSearchParams({
                  ...(filterSource ? { source: filterSource } : {}),
                  ...(sp.q ? { q: sp.q } : {}),
                  page: String(p),
                }).toString()}`}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold tabular-nums transition-all ${
                  p === page
                    ? "bg-primary-500 text-white shadow-sm"
                    : "bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-accent-500 hover:-translate-y-0.5"
                }`}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </Link>
            ))}
            {totalPages > 10 && (
              <span className="text-sm text-gray-500 dark:text-gray-400 self-center">
                …
              </span>
            )}
          </nav>
        )}

        {/* ============================================================
            7. SOURCES & METHODOLOGIE
            ============================================================ */}
        <section
          aria-labelledby="sources-title"
          className="rounded-3xl bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/30 border-2 border-cyan-200 dark:border-cyan-900/40 p-8"
        >
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-cyan-700 dark:text-cyan-300 mb-2">
            Transparence radicale
          </p>
          <h2
            id="sources-title"
            className="font-display text-xl sm:text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-3"
          >
            Sources & méthodologie
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-200 mb-6 leading-relaxed">
            Cet observatoire ne produit aucune information : il agrège et cite
            les 3 sources francophones de référence. Tous les contenus restent
            la propriété de leurs auteurs. Cliquez sur le titre d'une fuite
            pour consulter l'article original.
          </p>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            {(
              Object.entries(SOURCE_META) as [
                keyof typeof SOURCE_META,
                (typeof SOURCE_META)[keyof typeof SOURCE_META],
              ][]
            )
              .filter(([, meta]) => meta.active)
              .map(([key, meta]) => (
                <a
                  key={key}
                  href={meta.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-accent-500 hover:-translate-y-0.5 hover:shadow-md transition-all group"
                >
                  <p className="font-display font-extrabold text-primary-500 dark:text-accent-300 mb-1 group-hover:underline underline-offset-4">
                    {meta.name}
                    <span aria-hidden="true" className="text-xs ml-1">
                      ↗
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 break-all">
                    {meta.url}
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed">
                    {meta.description}
                  </p>
                </a>
              ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-6 italic leading-relaxed">
            Mise à jour automatique toutes les 6 heures. Pour signaler une
            erreur ou demander le retrait d'une entrée :{" "}
            <a
              href="mailto:contact@humanix-cybersecurity.fr"
              className="text-accent-700 dark:text-accent-300 underline-offset-4 hover:underline font-bold"
            >
              contact@humanix-cybersecurity.fr
            </a>
            .
          </p>
        </section>

        {/* ============================================================
            8. RESPIRATION - citation finale
            ============================================================ */}
        <section className="text-center pt-4">
          <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            « Connaître les fuites des autres, ce n'est pas céder à la peur -
            c'est apprendre par procuration. »
          </blockquote>
          <p
            aria-hidden="true"
            className="mt-4 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
          >
            - Hex veille
          </p>
        </section>
      </div>
    </main>
  );
}

// ===========================================================================
// SOUS-COMPOSANTS LOCAUX
// ===========================================================================

function ObsStat({
  label,
  value,
  accent,
  delay,
}: {
  label: string;
  value: string;
  accent?: boolean;
  delay: number;
}) {
  return (
    <div
      className={`rounded-2xl border-2 p-4 text-center animate-slide-up ${
        accent
          ? "border-accent-500 bg-gradient-to-br from-accent-50 to-cyan-50 dark:from-accent-900/20 dark:to-cyan-950/30"
          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 tabular-nums leading-none">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 mt-2 font-medium">
        {label}
      </p>
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
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}
