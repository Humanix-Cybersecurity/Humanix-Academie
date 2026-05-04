// Player d'episode : scenario + choix + debrief + quiz
//
// STRATEGIE FALLBACK :
//  - Si l'episode existe en BDD ET un MDX correspondant existe : on charge le MDX
//  - Si l'episode existe en BDD mais PAS de MDX : on genere un contenu generique
//    structure (cf. lib/episodes-fallback.ts). C'est le cas pour les ~150
//    nouveaux episodes du catalogue (cf. prisma/catalog-saisons.ts).
//  - Si l'episode n'existe meme pas en BDD : 404 (vraie erreur).
//
// Pourquoi ce fallback : on a un catalogue de 180 modules pour le commerce, mais
// le contenu MDX detaille (scenario, debrief, quiz custom par episode) est ecrit
// progressivement par l'equipe / les experts contributeurs. Sans fallback,
// 90% du catalogue retournerait 404 — inacceptable cote demo et UX.

import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadEpisode } from "@/lib/episodes";
import { buildFallbackContent } from "@/lib/episodes-fallback";
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

  // Mascotte choisie par l'user — propagée au player pour que les
  // animations affichent SA mascotte (pas le 🦊 par défaut)
  const userId = session.user!.id as string;
  const dbUser = await db.user.findUnique({
    where: { id: userId },
    select: { mascotSpecies: true, mascotEmojiCustom: true, mood: true },
  });
  const species = dbUser?.mascotSpecies ?? "fox";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {isFallback && (
        <div
          role="note"
          className="mb-4 p-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2"
        >
          <span aria-hidden="true">📝</span>
          <span>
            <strong>Module en cours d'enrichissement.</strong> Une version
            détaillée par nos experts contributeurs sera bientôt disponible. En
            attendant, voici la version pédagogique de base — vos points de
            progression sont attribués normalement.
          </span>
        </div>
      )}

      <EpisodePlayer
        saisonSlug={saison}
        episodeId={dbEpisode.id}
        episodeSlug={episode}
        title={content.meta.title}
        scenario={content.meta.scenario}
        choices={content.meta.choices}
        debrief={content.meta.debrief}
        quiz={content.meta.quiz}
        xpReward={content.meta.xpReward}
        species={species}
      />
    </div>
  );
}
