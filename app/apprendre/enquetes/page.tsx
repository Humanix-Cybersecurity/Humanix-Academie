// SPDX-License-Identifier: AGPL-3.0-or-later
// Page liste du Mode Enqueteur - `/apprendre/enquetes`.
//
// Affiche les enquetes disponibles (free OSS + payantes content-pro)
// avec leur difficulte, duree, type, et l'etat de completion par
// l'utilisateur courant.
//
// Auth optionnelle : un visiteur non connecte peut voir les enquetes
// gratuites (marketing) mais doit se connecter pour les jouer.

import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listInvestigations } from "@/lib/investigations/loader";
import {
  computeDetectiveRank,
  DETECTIVE_RANK_LABELS,
  type Investigation,
} from "@/lib/investigations/types";
import {
  PREMIUM_INVESTIGATIONS_PREVIEW,
  isDemoMode,
} from "@/lib/demo-mode/premium-previews";
import LockedPremiumCard, {
  PremiumPreviewIntro,
} from "@/components/demo/LockedPremiumCard";
import ShareDetectiveBadgeButton from "@/components/investigations/ShareDetectiveBadgeButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mode Enquêteur - Cherche les signaux suspects | Humanix Académie",
  description:
    "Analyse des emails de phishing, des posts LinkedIn d'oversharing et des scènes de bureau. Coche les signaux suspects, gagne des points, deviens Cyber Sherlock. Sensibilisation cyber par découverte guidée.",
  alternates: { canonical: "/apprendre/enquetes" },
};

const TYPE_LABEL: Record<string, { emoji: string; label: string }> = {
  EMAIL: { emoji: "📧", label: "Email phishing" },
  SMS: { emoji: "📱", label: "SMS / Smishing" },
  LINKEDIN: { emoji: "💼", label: "Post LinkedIn" },
  FACEBOOK: { emoji: "👥", label: "Post Facebook" },
  PROFILE_PUBLIC: { emoji: "🔓", label: "Profil public" },
  PHOTO_OFFICE: { emoji: "🏢", label: "Scène bureau" },
  PHOTO_PIGGYBACK: { emoji: "🚪", label: "Piggybacking" },
  TRASH_BIN: { emoji: "🗑️", label: "Documents sensibles" },
  PUBLIC_WIFI: { emoji: "📶", label: "WiFi public" },
};

export default async function EnquetesPage() {
  const investigations = listInvestigations();
  const session = await auth();
  const userId = session?.user?.id;

  // Charge les resultats du user pour afficher l'etat de completion +
  // calculer son rank Detective.
  let userResults: {
    scenarioSlug: string;
    score: number;
    maxScore: number;
    passed: boolean;
  }[] = [];
  let rank: ReturnType<typeof computeDetectiveRank> = "aspirant";
  if (userId) {
    try {
      userResults = await db.investigationResult.findMany({
        where: { userId },
        select: {
          scenarioSlug: true,
          score: true,
          maxScore: true,
          passed: true,
        },
        orderBy: { createdAt: "desc" },
      });
      // Pour le rank, on prend le meilleur score par scenario (pas la
      // moyenne, sinon les retries pénalisent).
      const bestByScenario = new Map<
        string,
        { score: number; maxScore: number; passed: boolean }
      >();
      for (const r of userResults) {
        const prev = bestByScenario.get(r.scenarioSlug);
        if (!prev || r.score > prev.score) {
          bestByScenario.set(r.scenarioSlug, {
            score: r.score,
            maxScore: r.maxScore,
            passed: r.passed,
          });
        }
      }
      rank = computeDetectiveRank([...bestByScenario.values()]);
    } catch (err) {
      console.warn("[enquetes/page] failed to load user results", err);
    }
  }

  // Map slug -> best result for badge rendering
  const bestBySlug = new Map<
    string,
    { score: number; maxScore: number; passed: boolean }
  >();
  for (const r of userResults) {
    const prev = bestBySlug.get(r.scenarioSlug);
    if (!prev || r.score > prev.score) bestBySlug.set(r.scenarioSlug, r);
  }

  const free = investigations.filter((i) => i.isFree);
  const paid = investigations.filter((i) => !i.isFree);

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <section className="max-w-5xl mx-auto px-4 pt-10 pb-6 sm:pt-14 text-center">
        <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
          🔍 Mode Enquêteur · découverte guidée
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-3">
          Cherche les signaux suspects.
        </h1>
        <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed">
          Au lieu de te dire ce qu'est un phishing, on t'en montre un.
          Tu analyses, tu coches, tu gagnes des points. Le piège qu'on
          repère soi-même, on ne le retient pas - on le voit venir.
        </p>
        {userId && (
          <div className="mt-5 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-100 dark:bg-accent-950/30 border-2 border-accent-300 dark:border-accent-900 text-accent-800 dark:text-accent-200 font-bold text-sm">
                <span>🕵️</span>
                <span>Ton rang : {DETECTIVE_RANK_LABELS[rank]}</span>
              </div>
              <Link
                href="/apprendre/enquetes/leaderboard"
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-900 text-amber-800 dark:text-amber-200 font-bold text-sm hover:bg-amber-200 dark:hover:bg-amber-950/50 transition-colors"
              >
                <span>🏆</span>
                <span>Leaderboard 30j</span>
              </Link>
            </div>
            {/* Partage social : visible des qu'on debloque au moins le rang
                Detective Junior (composant null-render pour aspirant). */}
            <ShareDetectiveBadgeButton rank={rank} />
          </div>
        )}
      </section>

      {/* Free enquetes */}
      <section className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-4">
          Enquêtes gratuites <span className="text-sm font-normal text-gray-500">({free.length})</span>
        </h2>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {free.map((inv) => (
            <InvestigationCard
              key={inv.slug}
              investigation={inv}
              best={bestBySlug.get(inv.slug)}
            />
          ))}
        </ul>
      </section>

      {/* Paid enquetes */}
      {paid.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-6">
          <h2 className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-4">
            Enquêtes premium <span className="text-sm font-normal text-gray-500">({paid.length})</span>
          </h2>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paid.map((inv) => (
              <InvestigationCard
                key={inv.slug}
                investigation={inv}
                best={bestBySlug.get(inv.slug)}
                premium
              />
            ))}
          </ul>
        </section>
      )}

      {/* En DEMO_MODE : on grise les enquetes premium pour "appater". */}
      {isDemoMode() && paid.length === 0 && (
        <section
          aria-label="Enquêtes disponibles en formule Standard"
          className="max-w-5xl mx-auto px-4 py-6"
        >
          <PremiumPreviewIntro
            totalCount={PREMIUM_INVESTIGATIONS_PREVIEW.length}
            label="enquêtes premium à débloquer"
          />
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PREMIUM_INVESTIGATIONS_PREVIEW.map((p) => (
              <li key={p.slug}>
                <LockedPremiumCard
                  emoji="🔍"
                  title={p.title}
                  subtitle={`Difficulté ${"★".repeat(p.difficulty)}${"☆".repeat(5 - p.difficulty)}`}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {free.length === 0 && paid.length === 0 && !isDemoMode() && (
        <section className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-500 dark:text-gray-400">
          <p>Aucune enquête disponible pour le moment.</p>
        </section>
      )}
    </main>
  );
}

function InvestigationCard({
  investigation,
  best,
  premium,
}: {
  investigation: Investigation;
  best?: { score: number; maxScore: number; passed: boolean };
  premium?: boolean;
}) {
  const meta = TYPE_LABEL[investigation.investigationType] ?? {
    emoji: "🔍",
    label: investigation.investigationType,
  };
  const ratio = best && best.maxScore > 0 ? Math.round((best.score / best.maxScore) * 100) : null;
  return (
    <li>
      <Link
        href={`/apprendre/enquetes/${investigation.slug}`}
        className={`block rounded-2xl border-2 p-5 hover:shadow-lg transition-shadow ${
          premium
            ? "border-amber-300 dark:border-amber-900/40 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900"
            : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-accent-300 dark:hover:border-accent-700"
        }`}
      >
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="text-base" aria-hidden="true">
            {meta.emoji}
          </span>
          <span className="font-bold uppercase tracking-wider">{meta.label}</span>
          {premium && (
            <span className="ml-auto bg-amber-500 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
              PREMIUM
            </span>
          )}
        </div>
        <h3 className="font-display text-base font-bold text-primary-500 dark:text-accent-300 mb-2 leading-tight">
          {investigation.title}
        </h3>
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>{"⭐".repeat(investigation.difficulty)}</span>
          <span>~{investigation.durationSeconds}s</span>
          <span>+{investigation.xpReward} XP</span>
        </div>
        {ratio !== null && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Meilleur score</span>
              <span
                className={`font-bold ${
                  ratio >= 75
                    ? "text-emerald-600 dark:text-emerald-400"
                    : ratio >= 60
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {ratio}%
              </span>
            </div>
          </div>
        )}
      </Link>
    </li>
  );
}
