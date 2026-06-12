// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique "Cyber Famille" - refonte cosy mai 2026.
//
// Brief : "experience, terrain, sensibilisation reelle, pas celle generee
// par la peur - celle qui sent bon la maitrise et la confiance".
//
// Cyber Famille est notre **differenciant unique mondial** (aucun
// concurrent SAT/HRM ne le fait). Sujet par excellence emotionnel :
// protéger ses proches sans leur faire peur. La page existante etait
// fonctionnelle mais ratait l'opportunite de créer un moment d'emotion.
//
// Cette refonte rend la page :
// - plus humaine (silhouettes des proches qu'on protege)
// - plus chaleureuse (palette rose/amber/peach, hex pattern subtil)
// - plus narrative (manifeste enrichi, scene concrete)
// - plus engageante (3 etapes claires "Comment offrir ce cyber refuge")
//
// Logique metier conservee : queries Prisma articles, eligibilite
// invitations, gating user connecte. Pas de regression fonctionnelle.

import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import HexBackdrop from "@/components/HexBackdrop";
import AudioPreviewButton from "@/components/AudioPreviewButton";
import { isEligibleToInvite, remainingInvitesFor } from "@/lib/family-invites";

export const dynamic = "force-dynamic";

const FAM_TITLE = "Cyber Famille - Articles cyber gratuits sans inscription | Humanix Académie";
const FAM_DESC =
  "La cyber-protection de tes proches en cadeau. Articles courts (5-10 min), sans jargon, sans pub, sans inscription. Pour ta grand-mère, ton ado, tes parents, tes amis. Made in France.";

export const metadata = {
  title: FAM_TITLE,
  description: FAM_DESC,
  alternates: { canonical: "/famille" },
  openGraph: {
    title: FAM_TITLE,
    description: FAM_DESC,
    type: "website",
    url: "/famille",
    images: [{ url: "/logo-humanix-academie-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cyber Famille - Articles cyber gratuits",
    description: FAM_DESC,
    images: ["/logo-humanix-academie-512.png"],
  },
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
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* ============================================================
          1. HERO - émotionnel, constellation des proches
          ============================================================ */}
      <HexBackdrop
        intensity="soft"
        className="bg-gradient-to-b from-rose-50 via-pink-50/30 to-white dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900"
      >
        <section
          className="max-w-5xl mx-auto px-4 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center"
          aria-labelledby="hero-title"
        >
          <p className="inline-flex items-center gap-2 text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-rose-600 dark:text-rose-300 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-rose-200 dark:border-rose-900/40 px-4 py-2 rounded-full mb-8 shadow-sm">
            <span aria-hidden="true">🌷</span> Le cadeau qu'on n'attend
            pas · Sans inscription
          </p>

          {/* Constellation des proches qu'on protège */}
          <div
            aria-hidden="true"
            className="flex justify-center gap-2 sm:gap-4 mb-6 text-4xl sm:text-5xl"
          >
            <span className="animate-float" style={{ animationDelay: "0s" }}>
              👵
            </span>
            <span
              className="animate-float"
              style={{ animationDelay: "0.8s" }}
            >
              👨
            </span>
            <span
              className="animate-float text-6xl sm:text-7xl"
              style={{ animationDelay: "0.4s" }}
            >
              ❤️
            </span>
            <span
              className="animate-float"
              style={{ animationDelay: "1.2s" }}
            >
              🧒
            </span>
            <span
              className="animate-float"
              style={{ animationDelay: "1.6s" }}
            >
              👩
            </span>
          </div>

          <h1
            id="hero-title"
            className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold text-primary-500 dark:text-rose-200 leading-[1.05] mb-6 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            Protège ceux que tu aimes.
            <br />
            <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 bg-clip-text text-transparent animate-gradient">
              Sans leur faire peur.
            </span>
          </h1>

          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto mb-8 leading-relaxed animate-slide-up"
            style={{ animationDelay: "220ms" }}
          >
            Tu apprends la cyber au boulot. Tes proches, eux, n'ont pas cette
            chance. Cette page leur est{" "}
            <strong>offerte</strong> - articles courts, pas de jargon, pas
            d'inscription. Comme une lampe qu'on laisse allumée, pour qu'ils
            sachent où aller s'ils ont un doute.
          </p>

          <div
            className="flex flex-wrap justify-center gap-3 text-sm animate-slide-up"
            style={{ animationDelay: "340ms" }}
          >
            <ConfidenceBadge tone="rose">
              <span aria-hidden="true">💌</span> 100 % gratuit
            </ConfidenceBadge>
            <ConfidenceBadge tone="rose">Sans inscription</ConfidenceBadge>
            <ConfidenceBadge tone="rose">Sans publicité</ConfidenceBadge>
            <ConfidenceBadge tone="rose">Aucun tracker</ConfidenceBadge>
            <ConfidenceBadge tone="rose">
              <span aria-hidden="true">🇫🇷</span> Made in France
            </ConfidenceBadge>
          </div>
        </section>
      </HexBackdrop>

      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16 space-y-16">
        {/* ============================================================
            2. CTA INVITATION - pour les apprenants connectés éligibles
            ============================================================ */}
        {inviteCta?.eligible && inviteCta.remaining > 0 && (
          <section aria-labelledby="invite-cta-title">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-100 via-pink-50 to-amber-50 dark:from-rose-950/40 dark:via-pink-950/30 dark:to-amber-950/30 border-2 border-rose-300 dark:border-rose-800/50 p-8 sm:p-10 shadow-md animate-glow">
              <div
                aria-hidden="true"
                className="absolute -top-12 -right-12 text-9xl opacity-20"
              >
                🎁
              </div>
              <div className="relative grid sm:grid-cols-[1fr_auto] items-center gap-6">
                <div>
                  <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-rose-600 dark:text-rose-300 mb-2">
                    Tu as débloqué un cadeau
                  </p>
                  <h2
                    id="invite-cta-title"
                    className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-rose-200 mb-2"
                  >
                    {inviteCta.remaining} invitation
                    {inviteCta.remaining > 1 ? "s" : ""} à offrir
                  </h2>
                  <p className="text-sm sm:text-base text-rose-900 dark:text-rose-100/90">
                    Tes proches accèdent à un parcours cyber simplifié, sans
                    pub ni traçage. Aucune donnée collectée chez eux. C'est ton
                    cadeau, on s'efface.
                  </p>
                </div>
                <Link
                  href="/famille/inviter"
                  className="inline-flex items-center gap-2 bg-white text-rose-700 font-bold px-6 py-4 rounded-2xl shadow-md hover:scale-105 transition-transform"
                >
                  Offrir maintenant <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ============================================================
            3. MANIFESTE - pourquoi cette page existe
            ============================================================ */}
        <section aria-labelledby="why-title">
          <div className="card bg-gradient-to-br from-amber-50 via-white to-rose-50/50 dark:from-amber-950/20 dark:via-slate-900 dark:to-rose-950/20 border-amber-200 dark:border-amber-900/40 p-8 sm:p-10">
            <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-start">
              <div className="text-6xl animate-float" aria-hidden="true">
                💌
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] font-bold text-amber-700 dark:text-amber-300 mb-2">
                  Notre conviction
                </p>
                <h2
                  id="why-title"
                  className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-amber-200 mb-4"
                >
                  Pourquoi cette page est gratuite, et le restera
                </h2>
                <div className="space-y-4 text-gray-700 dark:text-gray-200 leading-relaxed">
                  <p>
                    <strong>90 % des arnaques en ligne</strong> touchent des
                    gens qui ne sont <strong>pas formés au boulot</strong> :
                    retraités, ados, étudiants, freelances. La cyber ne devrait
                    pas être un privilège de salarié de grande entreprise.
                  </p>
                  <p>
                    Si quelqu'un autour de toi s'est fait avoir récemment - un
                    faux SMS de livraison, un appel de "Microsoft", un mail
                    bizarre du "fisc" - envoie-lui simplement le lien de cette
                    page. Pas de leçon, pas de sermon. Juste une lampe.
                  </p>
                  <p className="italic text-sm text-amber-700 dark:text-amber-200/80">
                    « C'est gratuit. C'est utile. C'est notre engagement. »
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            4. POUR QUI - humanisation, 4 portraits
            ============================================================ */}
        <section aria-labelledby="who-title">
          <div className="text-center mb-10">
            <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-rose-600 dark:text-rose-300 mb-2">
              Pour eux
            </p>
            <h2
              id="who-title"
              className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-rose-200"
            >
              Quatre vies à protéger sans drame
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <PersonaCard
              emoji="👵"
              who="Ta grand-mère"
              what="Quand un faux pompier l'appelle pour un « contrôle de routine », elle saura raccrocher tranquille."
              delay={0}
            />
            <PersonaCard
              emoji="🧒"
              who="Ton ado"
              what="Avant de cliquer sur le « concours iPhone » de TikTok, il aura le réflexe de douter."
              delay={120}
            />
            <PersonaCard
              emoji="👨"
              who="Ton père"
              what="Quand son auto-entreprise reçoit un faux RIB de fournisseur, il vérifiera par téléphone."
              delay={240}
            />
            <PersonaCard
              emoji="👩"
              who="Ta meilleure amie"
              what="Si un ex-conjoint suit ses pas via le Bluetooth, elle saura comment se libérer."
              delay={360}
            />
          </div>
        </section>

        {/* ============================================================
            5. ARTICLES - gradient soft par audience
            ============================================================ */}
        <section aria-labelledby="articles-title">
          <div className="flex items-end justify-between gap-3 flex-wrap mb-8">
            <div>
              <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-rose-600 dark:text-rose-300 mb-2">
                Le coffre-fort
              </p>
              <h2
                id="articles-title"
                className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-rose-200"
              >
                Articles à transmettre
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 italic mt-2">
                {articles.length} {articles.length > 1 ? "articles" : "article"}{" "}
                · 5 à 10 minutes chacun · zéro jargon
              </p>
            </div>
          </div>

          {articles.length === 0 ? (
            <div className="card text-center py-16 bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40">
              <p className="text-6xl mb-4 animate-float" aria-hidden="true">
                🌱
              </p>
              <p className="text-rose-700 dark:text-rose-200 italic">
                Les premiers articles arrivent bientôt. On prend le temps
                d'écrire bien plutôt que beaucoup.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {articles.map((a, idx) => (
                <ArticleCard key={a.id} article={a} idx={idx} />
              ))}
            </div>
          )}
        </section>

        {/* ============================================================
            6. COMMENT PARTAGER - 3 étapes simples
            ============================================================ */}
        <section aria-labelledby="how-share-title">
          <div className="text-center mb-10">
            <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-rose-600 dark:text-rose-300 mb-2">
              Le geste qui veut tout dire
            </p>
            <h2
              id="how-share-title"
              className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-rose-200"
            >
              Comment offrir ce cyber-refuge
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-5">
            <ShareStep
              n="1"
              emoji="🔗"
              title="Copie le lien"
              text="Le simple « humanix-cybersecurity.fr/famille » suffit. Pas besoin de présentation longue."
              delay={0}
            />
            <ShareStep
              n="2"
              emoji="💬"
              title="Envoie sans expliquer"
              text="Un message court : « j'ai trouvé ça pour toi, c'est rapide à lire ». Personne n'a envie d'un cours."
              delay={120}
            />
            <ShareStep
              n="3"
              emoji="🌷"
              title="Reste disponible"
              text="S'ils ont une question, ils savent qu'ils peuvent t'appeler. C'est tout. La maîtrise se transmet par l'exemple, pas par le sermon."
              delay={240}
            />
          </div>
        </section>

        {/* ============================================================
            7. CE QUE CE N'EST PAS - transparence radicale
            ============================================================ */}
        <section aria-labelledby="not-title">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-900/40 p-8 sm:p-10">
            <div className="text-center mb-6">
              <h2
                id="not-title"
                className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-emerald-200"
              >
                Ce que cette page n'est pas
              </h2>
              <p className="text-sm text-emerald-800 dark:text-emerald-200/80 italic mt-2">
                Transparence : on assume autant nos non-actions que nos
                actions.
              </p>
            </div>

            <ul className="space-y-3 max-w-3xl mx-auto">
              <NotItem>
                <strong>Pas un freemium.</strong> Pas de version « premium »
                pour la famille. Tout est public, pour toujours.
              </NotItem>
              <NotItem>
                <strong>Pas un piège email.</strong> Aucune newsletter, aucune
                pub, aucun email collecté à ton insu. Tu lis, tu repars.
              </NotItem>
              <NotItem>
                <strong>Pas un cours d'expert.</strong> Si on t'explique le
                phishing en 5 paragraphes, c'est qu'on a mal fait notre boulot.
                On vise 5 à 10 minutes par article, lisible dans le métro.
              </NotItem>
              <NotItem>
                <strong>Pas un produit dérivé du SaaS.</strong> Cette page
                existait avant qu'on ait des clients, et elle existera quand on
                en aura mille. Indépendante du business.
              </NotItem>
            </ul>
          </div>
        </section>

        {/* ============================================================
            8. CTA décideurs / leaders d'équipe - pour la personne qui
            découvre la page et a une responsabilité sur d'autres
            (dirigeant, manager, responsable d'association, élu local).
            ============================================================ */}
        <section aria-labelledby="cta-pme-title">
          <div className="card-hero text-center relative overflow-hidden animate-glow">
            <div
              aria-hidden="true"
              className="absolute -bottom-10 -right-10 text-9xl opacity-15"
            >
              🌅
            </div>
            <div className="relative max-w-2xl mx-auto">
              <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold opacity-90 mb-3">
                Tu as la charge d&apos;une équipe ?
              </p>
              <h2
                id="cta-pme-title"
                className="font-display text-2xl sm:text-3xl font-extrabold mb-4"
              >
                Forme ton équipe - et offre-leur ce cadeau pour leurs proches.
              </h2>
              <p className="text-sm sm:text-base opacity-90 mb-6 leading-relaxed">
                Plateforme open source AGPLv3, self-host gratuit ou cloud à
                partir de 0 €. Et pour chaque collaborateur formé, 3 invitations
                à offrir à ses proches. Personne ne fait ça. C'est notre
                signature.
              </p>
              <Link
                href="/tarifs"
                className="inline-flex items-center gap-2 bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl shadow-md hover:scale-105 transition-transform"
              >
                Découvrir Humanix Académie <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ============================================================
            9. RESPIRATION - citation finale chaleureuse
            ============================================================ */}
        <section className="text-center pt-6 pb-2">
          <blockquote className="font-display italic text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            « La cybersécurité, c'est pas un mur. C'est une lampe qu'on laisse
            allumée pour ceux qu'on aime. »
          </blockquote>
          <p
            aria-hidden="true"
            className="mt-4 text-xs uppercase tracking-[0.25em] text-rose-600/70 dark:text-rose-300/70 font-bold"
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

function ConfidenceBadge({
  children,
  tone = "rose",
}: {
  children: React.ReactNode;
  tone?: "rose" | "neutral";
}) {
  const cls =
    tone === "rose"
      ? "bg-white/80 dark:bg-slate-800/80 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-200"
      : "bg-white/80 dark:bg-slate-800/80 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200";
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${cls} backdrop-blur-sm border px-4 py-2 rounded-full font-medium shadow-sm`}
    >
      {children}
    </span>
  );
}

function PersonaCard({
  emoji,
  who,
  what,
  delay,
}: {
  emoji: string;
  who: string;
  what: string;
  delay: number;
}) {
  return (
    <article
      className="card bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-900/40 hover:shadow-md transition-all hover:-translate-y-1 animate-slide-up h-full text-center"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="text-5xl mb-3 inline-block animate-float"
        aria-hidden="true"
        style={{ animationDelay: `${delay}ms` }}
      >
        {emoji}
      </div>
      <h3 className="font-display text-lg font-extrabold text-rose-700 dark:text-rose-200 mb-2">
        {who}
      </h3>
      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
        {what}
      </p>
    </article>
  );
}

function ArticleCard({
  article,
  idx,
}: {
  article: {
    id: string;
    slug: string;
    title: string;
    description: string;
    emoji: string;
    audience: string;
    readTimeMinutes: number;
  };
  idx: number;
}) {
  const isFamille = article.audience === "famille";
  const palette = isFamille
    ? {
        bg: "from-rose-50 via-white to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/40",
        ring: "border-rose-200 dark:border-rose-900/40",
        badge:
          "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
        badgeLabel: "❤️ FAMILLE",
      }
    : {
        bg: "from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/40",
        ring: "border-cyan-200 dark:border-cyan-900/40",
        badge:
          "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200",
        badgeLabel: "🌍 TOUT PUBLIC",
      };

  return (
    <Link
      href={`/librairie/${article.slug}`}
      className={`block rounded-3xl border-2 ${palette.ring} bg-gradient-to-br ${palette.bg} p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all animate-slide-up h-full`}
      style={{ animationDelay: `${idx * 60}ms` }}
    >
      <article className="flex flex-col h-full">
        <div className="text-5xl mb-3" aria-hidden="true">
          {article.emoji}
        </div>
        <span
          className={`self-start text-[10px] font-bold uppercase tracking-widest ${palette.badge} px-2 py-0.5 rounded-full mb-3`}
        >
          {palette.badgeLabel}
        </span>
        <h3 className="font-display text-lg font-extrabold text-primary-500 dark:text-rose-200 mb-2 leading-tight">
          {article.title}
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-4 flex-1 line-clamp-3">
          {article.description}
        </p>
        <div className="flex items-center justify-between text-xs pt-3 border-t border-rose-200/50 dark:border-rose-900/40 tabular-nums gap-2">
          <span className="text-gray-500 dark:text-gray-400">
            ⏱ {article.readTimeMinutes} min
          </span>
          {/* Mini-bouton apercu audio : lit titre + description (~10-30 mots).
              Le `stopPropagation` empeche le click de remonter au <Link> parent
              et d'ouvrir l'article. Voix Marie Neutral pour un ton chaleureux
              adapte au contenu famille. */}
          <AudioPreviewButton
            text={`${article.title}. ${article.description}`}
            voice="fr_marie_neutral"
            ariaLabel={`Apercu audio : ${article.title}`}
            hoverLabel="Apercu"
          />
          <span
            className={`${isFamille ? "text-rose-700 dark:text-rose-300" : "text-cyan-700 dark:text-cyan-300"} font-bold`}
          >
            Lire <span aria-hidden="true">→</span>
          </span>
        </div>
      </article>
    </Link>
  );
}

function ShareStep({
  n,
  emoji,
  title,
  text,
  delay,
}: {
  n: string;
  emoji: string;
  title: string;
  text: string;
  delay: number;
}) {
  return (
    <article
      className="relative bg-white dark:bg-slate-900 rounded-3xl border-2 border-rose-200 dark:border-rose-900/40 p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 animate-slide-up h-full"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        aria-hidden="true"
        className="absolute -top-3 -left-3 bg-gradient-to-br from-rose-500 to-pink-500 text-white font-display font-extrabold text-xl w-10 h-10 rounded-full flex items-center justify-center shadow-md"
      >
        {n}
      </span>
      <div className="text-4xl mb-3 mt-2" aria-hidden="true">
        {emoji}
      </div>
      <h3 className="font-display text-lg font-extrabold text-rose-700 dark:text-rose-200 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
        {text}
      </p>
    </article>
  );
}

function NotItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="shrink-0 w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-200 font-bold text-sm mt-0.5"
      >
        ✗
      </span>
      <span className="text-gray-700 dark:text-gray-200 leading-relaxed">
        {children}
      </span>
    </li>
  );
}
