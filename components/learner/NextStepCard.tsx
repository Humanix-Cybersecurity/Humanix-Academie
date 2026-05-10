// SPDX-License-Identifier: AGPL-3.0-or-later
// "Ton prochain pas" - l'action recommandee mise en valeur (card-hero gradient).

import Link from "next/link";

type Props = {
  saisonSlug: string;
  saisonTitle: string;
  saisonEmoji: string;
  episodeSlug: string;
  episodeTitle: string;
  episodeMinutes: number;
  isResume: boolean;
};

export default function NextStepCard({
  saisonSlug,
  saisonTitle,
  saisonEmoji,
  episodeSlug,
  episodeTitle,
  episodeMinutes,
  isResume,
}: Props) {
  return (
    <section aria-labelledby="next-step-title">
      <div className="card-hero animate-glow relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-12 -right-12 text-9xl opacity-15"
        >
          {saisonEmoji}
        </div>
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.25em] font-bold opacity-90 mb-2">
            Ton prochain pas
          </p>
          <h2
            id="next-step-title"
            className="font-display text-2xl sm:text-3xl font-extrabold mb-2"
          >
            {isResume ? "Reprends" : "Demarre"} « {episodeTitle} »
          </h2>
          <p className="opacity-90 mb-5">
            Saison · {saisonTitle} · environ {episodeMinutes} minutes. Aucune
            pression - c'est juste un moment pour toi.
          </p>
          <Link
            href={`/apprendre/${saisonSlug}/${episodeSlug}`}
            className="inline-flex items-center gap-2 bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl shadow-md hover:scale-105 transition-transform"
          >
            {isResume ? "Continuer" : "Y aller"}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
