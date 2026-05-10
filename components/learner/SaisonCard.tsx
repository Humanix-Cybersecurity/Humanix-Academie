// SPDX-License-Identifier: AGPL-3.0-or-later
// Card d'une saison : cover emoji + badges contextuels (mandatory / persona /
// metier) + barre de progression + CTA "Commencer / Continuer / Saison
// terminee" + meta info (~X min par episode, expert vs fallback).

import Link from "next/link";
import type { SaisonClassification } from "@/lib/personalize/learn-path";
import type { SaisonPalette } from "./palettes";

type Saison = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverEmoji: string;
  isMandatory: boolean;
};

export default function SaisonCard({
  idx,
  saison,
  palette,
  pct,
  done,
  total,
  isLocked,
  firstUndoneSlug,
  expertCount,
  avgMinutes,
  targetedCount,
  classification,
}: {
  idx: number;
  saison: Saison;
  palette: SaisonPalette;
  pct: number;
  done: number;
  total: number;
  isLocked: boolean;
  firstUndoneSlug: string | null;
  expertCount: number;
  /** Duree moyenne reelle par episode, calculee depuis episodes.durationMinutes */
  avgMinutes: number;
  /** Nombre d'episodes targetes pour le metier de l'user (intersection
   *  Episode.targetGroups + UserGroup). 0 = saison generique pour cet user. */
  targetedCount: number;
  /** Classification persona/maturite : bucket + reason humaine pour le badge. */
  classification: SaisonClassification;
}) {
  return (
    <article
      className={`relative overflow-hidden rounded-3xl border-2 ${palette.ring} bg-gradient-to-br ${palette.bg} p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-slide-up ${
        isLocked ? "opacity-60" : ""
      }`}
      style={{ animationDelay: `${idx * 60}ms` }}
    >
      {/* Emoji de cover en filigrane decoratif */}
      <span
        aria-hidden="true"
        className="absolute -top-2 -right-4 text-8xl opacity-10 select-none"
      >
        {saison.coverEmoji}
      </span>

      {/* Badge progression % en haut a droite */}
      {!isLocked && pct > 0 && pct < 100 && (
        <span
          className={`absolute top-4 right-4 ${palette.badge} text-xs font-bold px-3 py-1 rounded-full tabular-nums`}
        >
          {pct} %
        </span>
      )}
      {!isLocked && pct === 100 && (
        <span
          aria-label="Saison terminee"
          className="absolute top-4 right-4 text-3xl"
        >
          🏆
        </span>
      )}

      <div className="relative">
        {/* Cover emoji principal */}
        <div className="text-5xl mb-4" aria-hidden="true">
          {isLocked ? "🌒" : saison.coverEmoji}
        </div>

        {/* Badges contextuels : recommande RH (mandatory) + persona-match
            ("pour toi") + targetedGroups ("pour ton metier"). On les
            affiche seulement si pertinents (pct < 100) pour eviter le
            bruit visuel sur les saisons deja terminees. */}
        <div className="flex flex-wrap gap-2 mb-3">
          {saison.isMandatory && pct < 100 && (
            <span className="text-[10px] uppercase tracking-widest font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-full">
              Recommande par ton équipe
            </span>
          )}
          {classification.bucket === "recommended" &&
            pct < 100 &&
            !saison.isMandatory && (
              <span
                className="text-[10px] uppercase tracking-widest font-bold bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200 px-2 py-1 rounded-full"
                title={classification.reason ?? undefined}
              >
                🎯 Pour toi
              </span>
            )}
          {targetedCount > 0 && (
            <span
              className="text-[10px] uppercase tracking-widest font-bold bg-accent-100 dark:bg-accent-900/40 text-accent-800 dark:text-accent-200 px-2 py-1 rounded-full"
              title={`${targetedCount} épisode${targetedCount > 1 ? "s" : ""} adapté${targetedCount > 1 ? "s" : ""} à ton métier`}
            >
              👤 {targetedCount} pour ton métier
            </span>
          )}
        </div>

        <h3 className="font-display text-xl sm:text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-2 leading-tight">
          {saison.title}
        </h3>
        {saison.description && (
          <p className="text-sm text-gray-700 dark:text-gray-200 mb-5 leading-relaxed">
            {saison.description}
          </p>
        )}

        {/* Barre de progression */}
        {!isLocked && (
          <div className="w-full h-2 bg-white/60 dark:bg-slate-800/60 rounded-full overflow-hidden mb-5">
            <div
              className="h-full bg-gradient-to-r from-accent-500 to-primary-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {/* CTA */}
        {isLocked ? (
          <p className="text-sm italic text-gray-500 dark:text-gray-400">
            Bientot disponible
          </p>
        ) : firstUndoneSlug ? (
          <Link
            href={`/apprendre/${saison.slug}/${firstUndoneSlug}`}
            className="btn-primary w-full"
          >
            {done === 0 ? "Commencer" : "Continuer"}
          </Link>
        ) : (
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-2">
            <span className="text-xl" aria-hidden="true">
              ✓
            </span>{" "}
            Saison terminee - bravo
          </p>
        )}

        {/* Meta info - naturelle, pas survendue.
            On affiche "~X min par episode" plutot que le total (qui ferait
            36 min et casserait la promesse "5 minutes par jour"). */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center tabular-nums">
          {total} episode{total > 1 ? "s" : ""} · ~{avgMinutes} min par
          episode
          {expertCount > 0 ? (
            <>
              {" "}
              ·{" "}
              <span
                className="text-accent-500 font-semibold"
                title="Episodes avec scenario detaille redige par un expert humain"
              >
                📝 {expertCount === total
                  ? "tous experts"
                  : `${expertCount} expert${expertCount > 1 ? "s" : ""}`}
              </span>
            </>
          ) : !isLocked ? (
            <>
              {" "}
              ·{" "}
              <span
                className="text-amber-600 dark:text-amber-400 font-semibold"
                title="Episodes en fallback structure (questions + quiz generiques). Enrichissement par expert prevu."
              >
                🔜 bientot enrichi
              </span>
            </>
          ) : null}
        </p>
      </div>
    </article>
  );
}
