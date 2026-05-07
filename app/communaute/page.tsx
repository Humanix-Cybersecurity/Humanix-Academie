// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique /communaute - point d'entree des contributeurs et curieux
// post-launch OSS.
//
// Cible : developpeurs, RSSI, DPO, formateurs cyber qui ont vu Humanix
// sur GitHub ou via un partage social et veulent comprendre comment
// rejoindre / contribuer / suivre l'actualite.
//
// 5 sections :
//   1. Hero invitation chaleureuse
//   2. 4 portes d'entree (utilisateur curieux, contributeur code,
//      contributeur contenu, partenaire ecosysteme)
//   3. Discord + GitHub Discussions
//   4. Engagements communautaires (DCO, code of conduct, transparence)
//   5. Citation Hex veille

import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";

export const metadata = {
  title: "Communaute - Humanix Academie",
  description:
    "Rejoindre la communaute Humanix Academie : Discord, GitHub Discussions, contribuer un module MDX, un connecteur, ou simplement utiliser. Open source AGPLv3, ecosysteme cyber souverain francais.",
};

const PORTES = [
  {
    emoji: "🌱",
    title: "Tu utilises Humanix",
    palette: {
      bg: "from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/40",
      ring: "border-cyan-200 dark:border-cyan-900/40",
      accent: "text-cyan-700 dark:text-cyan-300",
    },
    body: "Tu deploies Humanix dans ta PME, en self-host ou en cloud. Tu as des questions, des retours, des bugs a signaler. Bienvenue - c'est ton experience qui ameliore le produit.",
    actions: [
      {
        label: "GitHub Discussions",
        href: "https://github.com/Humanix-Cybersecurity/Humanix-Academie/discussions",
        external: true,
      },
      {
        label: "Signaler un bug",
        href: "https://github.com/Humanix-Cybersecurity/Humanix-Academie/issues/new/choose",
        external: true,
      },
    ],
  },
  {
    emoji: "💻",
    title: "Tu souhaites contribuer au code ?",
    palette: {
      bg: "from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/40",
      ring: "border-emerald-200 dark:border-emerald-900/40",
      accent: "text-emerald-700 dark:text-emerald-300",
    },
    body: "Bug fix, nouvelle feature, connecteur additionnel (Drata, Vanta, ServiceNow), traduction. Stack : Next.js 14, TypeScript strict, Prisma, PostgreSQL, Tailwind. CONTRIBUTING.md detaille tout.",
    actions: [
      {
        label: "Lire CONTRIBUTING.md",
        href: "https://github.com/Humanix-Cybersecurity/Humanix-Academie/blob/main/CONTRIBUTING.md",
        external: true,
      },
      {
        label: "Issues good first issue",
        href: "https://github.com/Humanix-Cybersecurity/Humanix-Academie/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22",
        external: true,
      },
    ],
  },
  {
    emoji: "✍️",
    title: "Tu souhaites contribuer au contenu ?",
    palette: {
      bg: "from-amber-50 via-white to-yellow-50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40",
      ring: "border-amber-200 dark:border-amber-900/40",
      accent: "text-amber-700 dark:text-amber-300",
    },
    body: "Tu es RSSI, gendarme cyber, formateur, DPO, consultant. Tu as une experience terrain unique. 18 saisons sur 26 attendent encore leurs modules MDX. Voir CONTRIBUTING.md section 'Contribuer un module MDX'.",
    actions: [
      {
        label: "Guide module MDX",
        href: "https://github.com/Humanix-Cybersecurity/Humanix-Academie/blob/main/CONTRIBUTING.md#contribuer-un-module-mdx",
        external: true,
      },
      {
        label: "Bibliotheque des experts",
        href: "/experts",
        external: false,
      },
    ],
  },
  {
    emoji: "🤝",
    title: "Tu es editeur d'outil cyber",
    palette: {
      bg: "from-purple-50 via-white to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/40",
      ring: "border-purple-200 dark:border-purple-900/40",
      accent: "text-purple-700 dark:text-purple-300",
    },
    body: "Tu edites un outil cyber souverain (GRC, SIEM, EDR, IAM, ITSM). On a deja construit des connecteurs techniques vers CISO Assistant, Sekoia.io, HarfangLab, Lucca et GLPI. Echangeons sur l'integration et l'interoperabilite.",
    actions: [
      {
        label: "Voir les integrations",
        href: "/integrations",
        external: false,
      },
      {
        label: "Echanger sur l'ecosysteme",
        href: "mailto:contact@humanix-cybersecurity.fr?subject=Integration+ecosysteme+cyber",
        external: true,
      },
    ],
  },
];

export default function CommunautePage() {
  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* ================================================================
          1. HERO - invitation chaleureuse
          ================================================================ */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section
          aria-labelledby="hero-title"
          className="max-w-5xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12 text-center"
        >
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Communaute · open source AGPLv3 · ouverte a tous
          </p>
          <h1
            id="hero-title"
            className="font-display text-4xl sm:text-6xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-4 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            La cyber{" "}
            <span className="text-accent-500">se construit a plusieurs.</span>
          </h1>
          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "220ms" }}
          >
            Humanix Academie est un projet ouvert. Code AGPLv3, decisions en
            clair sur GitHub, modules signes par leurs auteurs. Que tu sois
            utilisatrice de PME, developpeur curieux, RSSI sur le terrain ou
            partenaire editeur - il y a une porte d'entree pour toi.
          </p>
        </section>
      </HexBackdrop>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        {/* ============================================================
            2. 4 PORTES D'ENTREE
            ============================================================ */}
        <section aria-labelledby="portes-title" className="space-y-6">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
              4 portes d'entree
            </p>
            <h2
              id="portes-title"
              className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight"
            >
              Choisis la tienne.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {PORTES.map((p, idx) => (
              <article
                key={p.title}
                className={`rounded-3xl border-2 ${p.palette.ring} bg-gradient-to-br ${p.palette.bg} p-6 sm:p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all animate-slide-up`}
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="text-5xl mb-4" aria-hidden="true">
                  {p.emoji}
                </div>
                <h3
                  className={`font-display text-xl sm:text-2xl font-extrabold ${p.palette.accent} mb-3 leading-tight`}
                >
                  {p.title}
                </h3>
                <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed mb-5">
                  {p.body}
                </p>
                <div className="flex flex-wrap gap-2">
                  {p.actions.map((a) =>
                    a.external ? (
                      <a
                        key={a.label}
                        href={a.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 ${p.palette.ring} bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 text-sm font-bold ${p.palette.accent} transition`}
                      >
                        {a.label}
                        <span aria-hidden="true" className="text-xs">
                          ↗
                        </span>
                        <span className="sr-only">
                          {" "}
                          (s'ouvre dans un nouvel onglet)
                        </span>
                      </a>
                    ) : (
                      <Link
                        key={a.label}
                        href={a.href}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 ${p.palette.ring} bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 text-sm font-bold ${p.palette.accent} transition`}
                      >
                        {a.label}
                      </Link>
                    ),
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ============================================================
            3. CANAUX DE DISCUSSION
            ============================================================ */}
        <section
          aria-labelledby="canaux-title"
          className="rounded-3xl border-2 border-primary-200 dark:border-primary-900/40 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 p-6 sm:p-10 shadow-sm animate-slide-up"
          style={{ animationDelay: "100ms" }}
        >
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Comment on echange
          </p>
          <h2
            id="canaux-title"
            className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-5 leading-tight"
          >
            Trois canaux, trois usages.
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <ChannelCard
              emoji="🐙"
              title="GitHub Discussions"
              desc="Q&A, idees, RFC features. Tout reste public, archive permanente, indexable."
              cta="discussions/categories/q-a"
              href="https://github.com/Humanix-Cybersecurity/Humanix-Academie/discussions"
            />
            <ChannelCard
              emoji="🐛"
              title="GitHub Issues"
              desc="Bugs confirmes uniquement. Template oblige. Reponse sous 3 jours ouvres."
              cta="issues"
              href="https://github.com/Humanix-Cybersecurity/Humanix-Academie/issues"
            />
            <ChannelCard
              emoji="💬"
              title="Discord (post-launch)"
              desc="Discussion synchrone, salons par theme. Ouvre apres le launch OSS du 26 mai 2026."
              cta="ouverture mai 2026"
              disabled
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 italic mt-5 leading-relaxed">
            Pour les <strong>vulnerabilites de securite</strong>, ne pas
            utiliser ces canaux publics - voir{" "}
            <a
              href="https://github.com/Humanix-Cybersecurity/Humanix-Academie/blob/main/SECURITY.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-500 underline font-medium"
            >
              SECURITY.md
            </a>{" "}
            pour la procedure de divulgation responsable.
          </p>
        </section>

        {/* ============================================================
            4. NOS ENGAGEMENTS COMMUNAUTAIRES
            ============================================================ */}
        <section
          aria-labelledby="engagements-title"
          className="rounded-3xl border-2 border-emerald-200 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/40 p-6 sm:p-10 shadow-sm animate-slide-up"
          style={{ animationDelay: "200ms" }}
        >
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-emerald-700 dark:text-emerald-300 mb-2">
            Nos engagements
          </p>
          <h2
            id="engagements-title"
            className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-4 leading-tight"
          >
            Cinq promesses tenues, traçables, vérifiables.
          </h2>
          <ul className="space-y-3 text-base text-gray-700 dark:text-gray-200 leading-relaxed">
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="shrink-0 text-xl">
                📂
              </span>
              <span>
                <strong className="text-primary-500 dark:text-accent-300">
                  Code complet ouvert
                </strong>{" "}
                - aucun module cache, aucune brique fermee importante. AGPLv3
                strict, audit ligne par ligne possible.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="shrink-0 text-xl">
                💬
              </span>
              <span>
                <strong className="text-primary-500 dark:text-accent-300">
                  Decisions en clair
                </strong>{" "}
                - roadmap, choix techniques majeurs, abandons : tout passe par
                des issues publiques. Pas de roadmap secrete, pas de meeting
                gouvernemental cache.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="shrink-0 text-xl">
                ⏱
              </span>
              <span>
                <strong className="text-primary-500 dark:text-accent-300">
                  Reponse sous 7 jours
                </strong>{" "}
                - tout PR ou issue recoit un retour sous 7 jours ouvres.
                Premiere review sous 3 jours pour les contributeurs reguliers.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="shrink-0 text-xl">
                ✍️
              </span>
              <span>
                <strong className="text-primary-500 dark:text-accent-300">
                  DCO simple, pas de CLA pesant
                </strong>{" "}
                - Developer Certificate of Origin = `git commit -s` suffit.
                Pas de paperasse a signer, pas de cession de droits abusive.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="shrink-0 text-xl">
                🛡
              </span>
              <span>
                <strong className="text-primary-500 dark:text-accent-300">
                  Code of Conduct applique
                </strong>{" "}
                -{" "}
                <a
                  href="https://github.com/Humanix-Cybersecurity/Humanix-Academie/blob/main/CODE_OF_CONDUCT.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-500 underline font-medium"
                >
                  Contributor Covenant 2.1
                </a>
                . Tout comportement abusif est traite serieusement (security@,
                72h).
              </span>
            </li>
          </ul>
        </section>

        {/* ============================================================
            5. CTA FINAL
            ============================================================ */}
        <section
          aria-labelledby="cta-title"
          className="relative rounded-3xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 text-white text-center p-8 sm:p-12 shadow-xl overflow-hidden animate-slide-up"
          style={{ animationDelay: "100ms" }}
        >
          <div
            aria-hidden="true"
            className="absolute -top-12 -right-8 text-[180px] opacity-10 select-none pointer-events-none rotate-12"
          >
            🤝
          </div>
          <p className="text-xs uppercase tracking-[0.3em] font-bold opacity-80 mb-2 relative">
            Premier pas
          </p>
          <h2
            id="cta-title"
            className="font-display text-3xl sm:text-4xl font-extrabold mb-3 relative leading-tight"
          >
            Donne-nous une étoile, ou viens dire bonjour.
          </h2>
          <p className="opacity-90 mb-6 max-w-xl mx-auto text-base sm:text-lg leading-relaxed relative">
            La meilleure facon de soutenir un editeur OSS solo, c'est d'utiliser
            le produit, signaler un bug, contribuer un module, ou simplement en
            parler a un confrere RSSI. Aucune obligation, juste une invitation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center relative">
            <a
              href="https://github.com/Humanix-Cybersecurity/Humanix-Academie"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl hover:scale-105 transition shadow-lg"
            >
              ⭐ Etoiler le repo
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
            <a
              href="https://github.com/Humanix-Cybersecurity/Humanix-Academie/discussions/new"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 backdrop-blur border border-white/40 text-white font-bold px-6 py-3 rounded-2xl hover:bg-white/20 transition"
            >
              👋 Dire bonjour dans Discussions
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
            <Link
              href="/lancement-oss"
              className="bg-white/10 backdrop-blur border border-white/40 text-white font-bold px-6 py-3 rounded-2xl hover:bg-white/20 transition"
            >
              Voir le lancement OSS
            </Link>
          </div>
        </section>

        {/* ============================================================
            6. CITATION FINALE - signature cosy "Hex veille"
            ============================================================ */}
        <section className="text-center pt-8 pb-4">
          <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            « Une plateforme cyber qui vit seule meurt seule. La nouveaute de
            chaque saison, la qualite de chaque module, la stabilite de chaque
            connecteur - tout cela vient de la communaute, ou ne vient pas. »
          </blockquote>
          <p
            aria-hidden="true"
            className="mt-4 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
          >
            - Hex veille
          </p>
        </section>
      </div>
    </main>
  );
}

function ChannelCard({
  emoji,
  title,
  desc,
  cta,
  href,
  disabled,
}: {
  emoji: string;
  title: string;
  desc: string;
  cta: string;
  href?: string;
  disabled?: boolean;
}) {
  const content = (
    <div
      className={`rounded-2xl border-2 ${disabled ? "border-gray-200 dark:border-slate-800 opacity-60" : "border-primary-200 dark:border-primary-900/40 hover:shadow-md hover:-translate-y-0.5"} bg-white dark:bg-slate-900 p-5 transition-all h-full`}
    >
      <div className="text-3xl mb-2" aria-hidden="true">
        {emoji}
      </div>
      <h3 className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
        {desc}
      </p>
      <p className="text-xs text-accent-500 font-bold uppercase tracking-widest">
        {cta} {!disabled && href && <span aria-hidden="true">↗</span>}
      </p>
    </div>
  );

  if (disabled || !href) return content;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      {content}
      <span className="sr-only"> (s'ouvre dans un nouvel onglet)</span>
    </a>
  );
}
