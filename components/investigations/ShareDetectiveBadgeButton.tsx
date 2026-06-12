"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Bouton de partage d'un rang Detective sur les reseaux sociaux.
// Genere l'URL canonique vers /badges/detective/[rank] qui rendra
// l'image OG dynamique (cf. opengraph-image.tsx).
//
// Le bouton supporte LinkedIn (canal principal - pro / cyber), Twitter,
// et le clipboard pour partage manuel. Pas de tracking analytics ni de
// pixel social : le partage est purement de l'echange p2p.

import { useState } from "react";
import type { DetectiveRank } from "@/lib/investigations/types";
import { DETECTIVE_RANK_LABELS } from "@/lib/investigations/types";

const RANK_HASHTAGS: Record<DetectiveRank, string> = {
  aspirant: "#cybersecurite #humanix",
  "detective-junior": "#cybersecurite #humanix #ModeEnqueteur",
  "detective-confirme": "#cybersecurite #humanix #ModeEnqueteur",
  "cyber-sherlock": "#cybersecurite #humanix #ModeEnqueteur #CyberSherlock",
  "maitre-detective": "#cybersecurite #humanix #ModeEnqueteur #MaitreDetective",
};

export default function ShareDetectiveBadgeButton({
  rank,
}: {
  rank: DetectiveRank;
}) {
  const [copied, setCopied] = useState(false);

  // L'URL canonique est calculee cote client a partir de window.location.origin
  // pour fonctionner sur toutes les instances (prod, demo, self-host).
  const buildUrl = () => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/badges/detective/${rank}`;
  };

  const label = DETECTIVE_RANK_LABELS[rank];
  const tagline = `Je viens de débloquer le rang « ${label} » dans le Mode Enquêteur Humanix Académie.`;
  const hashtags = RANK_HASHTAGS[rank];

  const linkedinUrl = () => {
    const url = buildUrl();
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  };

  const twitterUrl = () => {
    const url = buildUrl();
    const text = `${tagline}\n\n${hashtags}`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(buildUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard refusee : on n'agit pas, l'user peut cliquer LinkedIn ou X */
    }
  };

  // Pas d'affichage pour le rang "aspirant" : pas grand-chose a partager
  // tant qu'on n'a pas resolu d'enquete reussie.
  if (rank === "aspirant") return null;

  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      <span
        className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400"
        aria-hidden="true"
      >
        Partager mon badge :
      </span>
      <a
        href={linkedinUrl()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Partager le rang ${label} sur LinkedIn`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0A66C2] hover:bg-[#084d92] text-white text-xs font-bold transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
        LinkedIn
      </a>
      <a
        href={twitterUrl()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Partager le rang ${label} sur X / Twitter`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 hover:bg-gray-700 text-white text-xs font-bold transition-colors"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        X
      </a>
      <button
        type="button"
        onClick={copyToClipboard}
        aria-label="Copier le lien dans le presse-papier"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-accent-400 text-xs font-bold text-gray-700 dark:text-gray-200 transition-colors"
      >
        {copied ? "✓ Lien copié" : "🔗 Copier"}
      </button>
    </div>
  );
}
