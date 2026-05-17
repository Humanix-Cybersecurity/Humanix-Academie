// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /badges/detective/[rank] — page publique partageable sur LinkedIn,
// Twitter / X, etc. quand un utilisateur debloque un rang Detective.
//
// Le partage social devient un vecteur viral : chaque badge debloque
// devient une publicite pour Humanix Academie. L'URL est generique
// (pas de nom personnel), donc tout le monde peut partager le meme
// lien sans exposer d'identite.
//
// L'image OG dynamique (opengraph-image.tsx) rend la carte qui
// s'affiche dans le post LinkedIn / Twitter / Slack / etc.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DETECTIVE_RANK_LABELS,
  DETECTIVE_RANK_THRESHOLDS,
  type DetectiveRank,
} from "@/lib/investigations/types";

export const dynamic = "force-dynamic";

const PROD_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-cybersecurity.fr";

type RankMeta = {
  emoji: string;
  tagline: string;
  description: string;
  /** Couleur d'accent pour le badge */
  color: string;
};

const RANK_META: Record<DetectiveRank, RankMeta> = {
  aspirant: {
    emoji: "🧭",
    tagline: "Premier pas dans l'enquête",
    description:
      "Tu viens de découvrir le Mode Enquêteur. À toi de débusquer les pièges dans les emails, posts LinkedIn et scènes de bureau.",
    color: "#94A3B8",
  },
  "detective-junior": {
    emoji: "🔍",
    tagline: "Œil affûté — 3 enquêtes maîtrisées",
    description:
      "Tu détectes les signaux suspects que la plupart laissent passer. 3 enquêtes résolues à plus de 60 % de réussite — c'est déjà au-dessus de la moyenne.",
    color: "#0EA5E9",
  },
  "detective-confirme": {
    emoji: "🕵️",
    tagline: "Méthode + rigueur — 10 enquêtes brillantes",
    description:
      "Tu as l'œil du métier. 10 enquêtes résolues à 75 %+ : tu lis entre les lignes, tu repères les manipulations, tu protèges ton équipe.",
    color: "#8B5CF6",
  },
  "cyber-sherlock": {
    emoji: "🎩",
    tagline: "Référence — 25 enquêtes à 90 %+",
    description:
      "Tu es la personne qu'on appelle quand un mail suspect arrive. 25 enquêtes résolues à 90 % de réussite : niveau « consultant sécurité » sans avoir signé pour le job.",
    color: "#F59E0B",
  },
  "maitre-detective": {
    emoji: "👑",
    tagline: "Sans-faute — 50 enquêtes parfaites",
    description:
      "Le top 1 %. 50 enquêtes, score parfait sur chacune. Tu as transformé la vigilance cyber en réflexe naturel. Bravo.",
    color: "#DC2626",
  },
};

function isValidRank(rank: string): rank is DetectiveRank {
  return rank in DETECTIVE_RANK_LABELS;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ rank: string }>;
}): Promise<Metadata> {
  const { rank } = await params;
  if (!isValidRank(rank)) {
    return { title: "Badge Détective — Humanix Académie" };
  }
  const label = DETECTIVE_RANK_LABELS[rank];
  const meta = RANK_META[rank];
  const url = `${PROD_URL}/badges/detective/${rank}`;
  return {
    title: `${label} · Mode Enquêteur — Humanix Académie`,
    description: meta.description,
    alternates: { canonical: `/badges/detective/${rank}` },
    openGraph: {
      title: `${meta.emoji} ${label} — Mode Enquêteur Humanix`,
      description: meta.tagline,
      url,
      type: "website",
      locale: "fr_FR",
      siteName: "Humanix Académie",
    },
    twitter: {
      card: "summary_large_image",
      title: `${meta.emoji} ${label} — Mode Enquêteur`,
      description: meta.tagline,
    },
  };
}

export default async function DetectiveBadgePage({
  params,
}: {
  params: Promise<{ rank: string }>;
}) {
  const { rank } = await params;
  if (!isValidRank(rank)) notFound();
  const label = DETECTIVE_RANK_LABELS[rank];
  const meta = RANK_META[rank];

  // Trouver les criteres associes pour les afficher
  const threshold = DETECTIVE_RANK_THRESHOLDS.find((t) => t.rank === rank);

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16 animate-fadeIn">
      <div
        className="rounded-3xl border-2 p-8 sm:p-12 text-center shadow-xl"
        style={{
          borderColor: meta.color,
          background: `linear-gradient(135deg, ${meta.color}15 0%, transparent 100%)`,
        }}
      >
        <p className="text-xs uppercase tracking-[0.3em] font-bold mb-3 opacity-70">
          Mode Enquêteur · Humanix Académie
        </p>
        <div className="text-7xl sm:text-8xl mb-4" aria-hidden="true">
          {meta.emoji}
        </div>
        <h1
          className="font-display text-4xl sm:text-6xl font-extrabold mb-3 leading-tight"
          style={{ color: meta.color }}
        >
          {label}
        </h1>
        <p className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-200 mb-6">
          {meta.tagline}
        </p>
        <p className="text-base text-gray-600 dark:text-gray-300 max-w-xl mx-auto leading-relaxed mb-8">
          {meta.description}
        </p>

        {threshold && (
          <div className="inline-block px-5 py-2 rounded-full bg-white/80 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-sm text-gray-600 dark:text-gray-300 mb-8">
            <strong>Critères :</strong> {threshold.minPassed} enquête
            {threshold.minPassed > 1 ? "s" : ""} résolue
            {threshold.minPassed > 1 ? "s" : ""} à{" "}
            {Math.round(threshold.minRatio * 100)} % de réussite minimum
          </div>
        )}

        <div className="flex flex-wrap gap-3 justify-center mt-6">
          <Link
            href="/apprendre/enquetes"
            className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold px-6 py-3 rounded-xl shadow transition-colors"
          >
            🔍 Découvrir le Mode Enquêteur →
          </Link>
          <Link
            href="/comparatif"
            className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-accent-400 px-6 py-3 rounded-xl font-bold transition-colors"
          >
            Voir le comparatif honnête
          </Link>
        </div>
      </div>

      <div className="mt-10 text-center text-sm text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
        <p className="italic mb-3">
          Le Mode Enquêteur est une approche de sensibilisation cyber par
          découverte guidée : on te montre un mail, un post, une scène ; tu
          coches ce qui te paraît louche.{" "}
          <strong>Le piège qu'on repère soi-même, on le voit venir</strong> —
          contrairement à celui qu'on apprend par cœur.
        </p>
        <p>
          🇫🇷 Made in France · Open source AGPLv3 ·{" "}
          <Link href="/" className="text-accent-500 hover:underline">
            humanix-cybersecurity.fr
          </Link>
        </p>
      </div>
    </main>
  );
}
