// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Image OG dynamique pour `/badges/detective/[rank]`.
//
// Quand un utilisateur partage l'URL sur LinkedIn, Twitter, Slack, etc.,
// c'est cette carte 1200x630 qui s'affiche. Optimisee pour lisibilite
// jusqu'au preview mobile (200x100).
//
// Generee a chaque request via Satori (next/og). Pas de cache car le
// rang est dans l'URL, donc l'image est specifique a chaque rang.

import { notFound } from "next/navigation";
import {
  OG_SIZE,
  OG_CONTENT_TYPE,
  renderOgCard,
} from "@/lib/og-card";
import {
  DETECTIVE_RANK_LABELS,
  type DetectiveRank,
} from "@/lib/investigations/types";

export const dynamic = "force-dynamic";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const RANK_VISUAL: Record<
  DetectiveRank,
  { glyph: string; tagline: string; accent: string }
> = {
  aspirant: {
    glyph: "🧭",
    tagline: "Premier pas dans l'enquête cyber",
    accent: "#94A3B8",
  },
  "detective-junior": {
    glyph: "🔍",
    tagline: "3 enquêtes maîtrisées · œil affûté",
    accent: "#0EA5E9",
  },
  "detective-confirme": {
    glyph: "🕵️",
    tagline: "10 enquêtes brillantes · méthode + rigueur",
    accent: "#8B5CF6",
  },
  "cyber-sherlock": {
    glyph: "🎩",
    tagline: "25 enquêtes à 90 % · niveau référence",
    accent: "#F59E0B",
  },
  "maitre-detective": {
    glyph: "👑",
    tagline: "50 enquêtes parfaites · top 1 %",
    accent: "#DC2626",
  },
};

function isValidRank(r: string): r is DetectiveRank {
  return r in DETECTIVE_RANK_LABELS;
}

export default async function Image({
  params,
}: {
  params: Promise<{ rank: string }>;
}) {
  const { rank } = await params;
  if (!isValidRank(rank)) notFound();

  const visual = RANK_VISUAL[rank];
  const label = DETECTIVE_RANK_LABELS[rank];

  return renderOgCard({
    kicker: "Mode Enquêteur · Humanix Académie",
    title: label,
    subtitle: visual.tagline,
    bullets: [
      "🇫🇷 Cyber souverain",
      "🔓 Open source AGPL",
      "🧩 Apprentissage par découverte",
    ],
    glyph: visual.glyph,
    accentColor: visual.accent,
    glyphColor: visual.accent,
  });
}

export const alt = "Badge Détective Mode Enquêteur — Humanix Académie";
