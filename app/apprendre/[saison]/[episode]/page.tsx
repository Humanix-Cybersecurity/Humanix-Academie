// SPDX-License-Identifier: AGPL-3.0-or-later
// Player d'episode : scenario + choix + debrief + quiz
//
// STRATEGIE FALLBACK :
//  - Si l'episode existe en BDD ET un MDX correspondant existe : on charge le MDX
//  - Si l'episode existe en BDD mais PAS de MDX : on genere un contenu generique
//    structure (cf. lib/episodes-fallback.ts). C'est le cas pour les ~150
//    nouveaux episodes du catalogue (cf. prisma/catalog-saisons.ts).
//  - Si l'episode n'existe même pas en BDD : 404 (vraie erreur).
//
// Pourquoi ce fallback : on a un catalogue de 344 modules pour le commerce, mais
// le contenu MDX detaille (scenario, debrief, quiz custom par episode) est ecrit
// progressivement par l'équipe / les experts contributeurs. Sans fallback,
// 90% du catalogue retournerait 404 - inacceptable cote demo et UX.

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadEpisode } from "@/lib/episodes";
import { buildFallbackContent } from "@/lib/episodes-fallback";
import { seededShuffle } from "@/lib/shuffle";
import EpisodePlayer from "@/components/EpisodePlayer";

type Params = { saison: string; episode: string };

export const dynamic = "force-dynamic";

export default async function EpisodePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { saison, episode } = await params;
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const dbSaison = await db.saison.findUnique({ where: { slug: saison } });
  if (!dbSaison) notFound();
  const dbEpisode = await db.episode.findUnique({
    where: { saisonId_slug: { saisonId: dbSaison.id, slug: episode } },
  });
  if (!dbEpisode) notFound();

  // 1) tentative MDX, 2) fallback structure si absent
  const mdx = loadEpisode(saison, episode);
  const isFallback = !mdx;
  const content =
    mdx ??
    buildFallbackContent({
      saisonSlug: saison,
      episodeSlug: episode,
      episodeTitle: dbEpisode.title,
      xpReward: dbEpisode.xpReward,
    });

  // Mascotte choisie par l'user - propagée au player pour que les
  // animations affichent SA mascotte (pas le 🦊 par défaut)
  const userId = session.user!.id as string;
  const dbUser = await db.user.findUnique({
    where: { id: userId },
    select: { mascotSpecies: true, mascotEmojiCustom: true, mood: true },
  });
  const species = dbUser?.mascotSpecies ?? "fox";

  // Etat de reprise mid-episode : si l'user a quitte l'episode au
  // milieu (telephone, urgence, fatigue), on lui propose de reprendre
  // exactement la ou il etait. resumeStep null = nouvelle session.
  const dbProgress = await db.progress.findUnique({
    where: { userId_episodeId: { userId, episodeId: dbEpisode.id } },
    select: {
      status: true,
      resumeStep: true,
      resumeQuizIndex: true,
      resumeChoiceId: true,
    },
  });
  const resume =
    dbProgress &&
    dbProgress.status !== "COMPLETED" &&
    dbProgress.resumeStep &&
    (dbProgress.resumeStep === "scenario" ||
      dbProgress.resumeStep === "debrief" ||
      dbProgress.resumeStep === "quiz")
      ? {
          step: dbProgress.resumeStep as "scenario" | "debrief" | "quiz",
          quizIndex: dbProgress.resumeQuizIndex,
          choiceId: dbProgress.resumeChoiceId,
        }
      : null;

  // Mélange déterministe de l'ordre des réponses, seedé par (user + épisode).
  // Évite que la bonne réponse soit toujours à la même position (ex. position
  // 2 dans tout le catalogue) -> on ne peut plus répondre sans lire. Stable
  // par user (reprise cohérente) et différent d'un user à l'autre (pas de
  // corrigé partageable). Le scoring est fait par id/outcome/correct, jamais
  // par position : mélanger l'affichage est donc sûr.
  const shuffleSeed = `${userId}:${dbEpisode.id}`;
  const shuffledChoices = seededShuffle(
    content.meta.choices,
    `${shuffleSeed}:scenario`,
  );
  const shuffledQuiz = content.meta.quiz.map((q, i) => ({
    ...q,
    choices: seededShuffle(q.choices, `${shuffleSeed}:quiz${i}`),
  }));

  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
      {isFallback && (
        <div
          role="note"
          className="mb-5 p-4 rounded-2xl border-2 border-amber-200 dark:border-amber-900/40 bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-amber-950/30 dark:via-slate-900 dark:to-yellow-950/20 text-sm text-amber-900 dark:text-amber-100 flex items-start gap-3 shadow-sm"
        >
          <span className="text-xl shrink-0" aria-hidden="true">
            🌱
          </span>
          <div>
            <p className="font-display font-extrabold mb-1">
              Une version pédagogique de base
            </p>
            <p className="leading-relaxed">
              Cet épisode reçoit bientôt un scénario détaillé rédigé par un
              expert humain. En attendant, voici la version de base - tes
              points de progression sont attribués normalement, et tu peux y
              revenir plus tard pour la version enrichie.
            </p>
          </div>
        </div>
      )}

      <EpisodePlayer
        saisonSlug={saison}
        episodeId={dbEpisode.id}
        episodeSlug={episode}
        title={content.meta.title}
        scenario={content.meta.scenario}
        choices={shuffledChoices}
        debrief={content.meta.debrief}
        quiz={shuffledQuiz}
        xpReward={content.meta.xpReward}
        species={species}
        resume={resume}
      />
    </main>
  );
}
