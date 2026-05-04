// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique "Coffre-fort cyber pour ta famille"
// Accessible SANS LOGIN — partage hors-pro pour transformer
// les apprenants en ambassadeurs auprès de leurs proches.
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isEligibleToInvite, remainingInvitesFor } from "@/lib/family-invites";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cyber Famille — Articles cyber gratuits, sans connexion",
  description:
    "Partage les bons réflexes cyber avec tes proches. Articles courts (5-10 min), sans jargon, gratuits.",
};

export default async function FamillePage() {
  // Articles publics (toujours)
  const articles = await db.libraryArticle.findMany({
    where: {
      isPublished: true,
      audience: { in: ["famille", "tous"] },
    },
    orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
  });

  // Si l'user est connecte : on calcule son eligibilite a inviter
  const session = await auth();
  let inviteCta: { remaining: number; eligible: boolean } | null = null;
  if (session?.user) {
    const userId = session.user!.id as string;
    const tenantId = session.user!.tenantId as string;
    if (userId && tenantId) {
      const [eligible, remaining] = await Promise.all([
        isEligibleToInvite(userId, tenantId),
        remainingInvitesFor(userId),
      ]);
      inviteCta = { eligible, remaining };
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-14 animate-fadeIn">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="text-7xl mb-4">👨‍👩‍👧‍👦</div>
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-2">
          Cyber Famille — Le partage gratuit
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          Protège tes proches.
          <br />
          <span className="text-accent-500">
            Sans jargon, sans inscription.
          </span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
          Tu as appris des choses utiles avec Humanix au boulot ? Partage-les
          avec ta grand-mère, ton ado, tes parents. Pas besoin de compte, pas de
          pub, pas de pièges.
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          <span className="bg-white border border-gray-200 rounded-full px-3 py-1">
            100 % gratuit
          </span>
          <span className="bg-white border border-gray-200 rounded-full px-3 py-1">
            Sans inscription
          </span>
          <span className="bg-white border border-gray-200 rounded-full px-3 py-1">
            Sans publicité
          </span>
          <span className="bg-white border border-gray-200 rounded-full px-3 py-1">
            🦊 Made in France
          </span>
        </div>
      </div>

      {/* CTA invitation pour les apprenants connectes eligibles */}
      {inviteCta?.eligible && inviteCta.remaining > 0 && (
        <div className="card mb-6 bg-gradient-to-br from-pink-50 to-rose-100 border-2 border-pink-300 dark:from-pink-900/30 dark:to-rose-900/30">
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-5xl" aria-hidden="true">
              🎁
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-pink-700 dark:text-pink-300 text-lg">
                Vous avez débloqué {inviteCta.remaining} invitation
                {inviteCta.remaining > 1 ? "s" : ""}
              </h2>
              <p className="text-sm text-pink-800 dark:text-pink-200">
                Offrez-les à vos proches : c'est gratuit, et il n'y a aucune
                donnée collectée chez eux.
              </p>
            </div>
            <Link href="/famille/inviter" className="btn-primary">
              Offrir maintenant
            </Link>
          </div>
        </div>
      )}

      {/* Manifeste */}
      <div className="card mb-10 bg-gradient-to-br from-primary-50 to-cyan-50 border-2 border-accent-500/30">
        <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-start">
          <div className="text-5xl">💌</div>
          <div>
            <h2 className="text-xl font-bold text-primary-500 mb-2">
              Pourquoi cette page existe
            </h2>
            <p className="text-gray-700 leading-relaxed text-sm">
              90 % des arnaques en ligne touchent des gens qui ne sont{" "}
              <strong>pas formés au boulot</strong> : retraités, enfants,
              étudiants, indépendants. La cyber ne devrait pas être un privilège
              de salarié de grande entreprise. Donc on rend ces articles
              publics. Si Humanix te plaît, parle-en. Si tu connais quelqu'un
              qui s'est fait avoir récemment, envoie-lui le lien. C'est gratuit,
              c'est utile, c'est notre engagement.
            </p>
          </div>
        </div>
      </div>

      {/* Articles */}
      <h2 className="text-2xl font-bold text-primary-500 mb-4">
        Articles à transmettre
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
        {articles.map((a) => (
          <Link
            key={a.id}
            href={`/librairie/${a.slug}`}
            className="card hover:scale-[1.02] hover:shadow-lg transition-all flex flex-col"
          >
            <div className="text-5xl mb-3">{a.emoji}</div>
            <div className="flex items-center gap-2 mb-2">
              {a.audience === "famille" && (
                <span className="text-[10px] font-bold bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
                  ❤️ FAMILLE
                </span>
              )}
              {a.audience === "tous" && (
                <span className="text-[10px] font-bold bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">
                  🌍 TOUT PUBLIC
                </span>
              )}
            </div>
            <h3 className="font-bold text-primary-500 text-lg mb-1">
              {a.title}
            </h3>
            <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-1">
              {a.description}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
              <span>⏱ {a.readTimeMinutes} min</span>
              <span className="text-accent-500 font-bold">Lire →</span>
            </div>
          </Link>
        ))}
      </div>

      {/* CTA pour le pro */}
      <div className="card bg-gradient-to-br from-primary-500 to-accent-500 text-white text-center">
        <h2 className="text-2xl font-extrabold mb-2">Tu diriges une PME ?</h2>
        <p className="opacity-90 mb-5">
          Forme toute ton équipe avec une plateforme open source — self-host
          gratuit ou cloud à partir de 0 €.
        </p>
        <Link
          href="/tarifs"
          className="inline-block bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl hover:scale-105 transition shadow-lg"
        >
          Découvrir Humanix Académie →
        </Link>
      </div>

      <p className="text-center text-xs text-gray-500 mt-10">
        Cette page est volontairement gratuite et publique.
        <br />
        Aucun cookie de tracking, aucune donnée collectée. C'est notre
        engagement.
      </p>
    </div>
  );
}
