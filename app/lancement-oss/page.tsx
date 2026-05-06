// SPDX-License-Identifier: AGPL-3.0-or-later
// Page Lancement OSS — annonce publique du passage en open source AGPLv3.
//
// Date launch : mardi 26 mai 2026. Cette page est l'asset de comm web
// principal pour Sprint 3 OSS — un recit fondateur cosy, accessible,
// avec compte a rebours bienveillant.
//
// Objectifs :
// - Inviter sans hyperboler ("on lance" pas "on revolutionne")
// - Raconter le pourquoi (10 ans de pentest, mur de Knowbe4, ecosysteme FR)
// - Donner les CTAs principaux (GitHub, manifeste, presse, demo)
// - Servir d'archive narrative apres le 26 mai (la page reste utile post-J)
//
// Le compte a rebours est calcule cote serveur a chaque rendu (force-dynamic),
// pas de drift client. Apres le 26 mai, le hero passe automatiquement en
// mode "C'est lance — bienvenue".

import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";

export const metadata = {
  title: "Lancement OSS — Humanix Academie passe en AGPLv3 le 26 mai 2026",
  description:
    "Recit du passage en open source de la plateforme Humanix Academie. AGPLv3, repo public, brique humaine de l'ecosysteme cyber souverain francais. Lancement mardi 26 mai 2026.",
};

// La page est dynamique pour recalculer le compte a rebours a chaque hit
// (sinon le rendu serait fige au build et afficherait "22 jours" eternellement).
export const dynamic = "force-dynamic";

const LAUNCH_DATE = new Date("2026-05-26T09:00:00+02:00");

function daysUntilLaunch(now: Date = new Date()): number {
  const diffMs = LAUNCH_DATE.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

const CHAPTERS = [
  {
    emoji: "🔍",
    title: "Le constat qui a fait basculer",
    palette: {
      bg: "from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/40",
      ring: "border-cyan-200 dark:border-cyan-900/40",
      accent: "text-cyan-700 dark:text-cyan-300",
    },
    body: [
      "Pendant dix ans, j'ai fait du pentest dans des PME francaises. A chaque mission, c'etait la meme histoire. Marie de la compta clique sur un faux RIB. Stephane du commercial recycle son mot de passe Netflix sur son compte pro. Le dirigeant ouvre une piece jointe d'un fournisseur inconnu a 23h, fatigue.",
      "90 % des cyberattaques contre une PME francaise passent par un humain. Pas un firewall mal configure, pas une faille zero-day. Un humain pas forme.",
      "Et le marche de la sensibilisation cyber, en 2026, ressemble a ca : Knowbe4 a 8 000 €/an minimum, Hoxhunt sur devis, Phished et Cyber Guru entre 2 000 et 3 000 €/an. Tous fermes. Trois quarts viennent des Etats-Unis.",
    ],
  },
  {
    emoji: "🌱",
    title: "Le declic — ces gens qui font ce que je voudrais faire",
    palette: {
      bg: "from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/40",
      ring: "border-emerald-200 dark:border-emerald-900/40",
      accent: "text-emerald-700 dark:text-emerald-300",
    },
    body: [
      "L'ecosysteme open source cyber francais s'est structure pendant que j'etais tete dans le guidon. CISO Assistant (intuitem) couvre la gouvernance et la conformite. OpenCTI (Filigran) couvre la threat intelligence. Wazuh couvre la detection. Mais la couche humaine — la sensibilisation des collaborateurs — restait un trou beant.",
      "C'est exactement la que les attaques passent. Et personne ne fait du libre dessus.",
      "En etudiant comment intuitem, Filigran et Centreon font leur metier, j'ai vu le pattern : tu ne vends pas le code. Tu vends ton expertise. Tu publies en AGPLv3 un produit serieux. La communaute l'audite, l'adopte, le contribue. Tu deviens, par construction, l'expert mondial du produit que tu as ecrit. Et tu factures du conseil, de l'audit, de la formation.",
    ],
  },
  {
    emoji: "🎁",
    title: "Ce qui devient libre — concretement",
    palette: {
      bg: "from-amber-50 via-white to-yellow-50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40",
      ring: "border-amber-200 dark:border-amber-900/40",
      accent: "text-amber-700 dark:text-amber-300",
    },
    body: [
      "Le 26 mai 2026, la plateforme Humanix Academie est publiee sur GitHub sous licence GNU AGPLv3. Le code complet, multi-tenant, audite. Tu peux l'installer chez toi en 10 minutes via Docker Compose. Tu peux l'auditer, le forker, le modifier, le deployer pour ta PME sans m'en demander la permission ni me payer un centime.",
      "Inclus : moteur de gamification, mascotte evolutive, dashboard dirigeant, connecteur natif CISO Assistant, API REST, webhooks signes HMAC, exports OSCAL pour ton GRC, MCP server pour agents IA. Cinq saisons pedagogiques completes (phishing, mots de passe, donnees sensibles, teletravail, RGPD).",
      "Ce qui reste payé : le cloud managé hébergé en France, le catalogue avancé de modules, la simulation de phishing avec IA Mistral souveraine, le Pack NIS2 turnkey, le SSO entreprise, et — surtout — l'expertise humaine qui paie mes factures (audit, gap analysis NIS2, formation Qualiopi, RSSI externalisé).",
    ],
  },
  {
    emoji: "🤝",
    title: "L'ecosysteme dans lequel je m'inscris",
    palette: {
      bg: "from-purple-50 via-white to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/40",
      ring: "border-purple-200 dark:border-purple-900/40",
      accent: "text-purple-700 dark:text-purple-300",
    },
    body: [
      "Je ne lance pas Humanix dans le vide. Je le branche dans une chaine existante.",
      "CISO Assistant fait la conformite. Humanix lui pousse les preuves de sensibilisation par collaborateur via un connecteur natif (connectors/ciso-assistant/). OpenCTI fait la threat intel — connecteur prevu Q3 2026. Wazuh, Splunk, Sentinel, Sekoia recoivent les evenements Humanix au format CEF ou OSCAL.",
      "Cette logique d'ecosysteme est le vrai positionnement strategique. Je ne vends pas contre Knowbe4. Je vends avec l'ecosysteme open source cyber francais. Aux RSSI de PME, ce recit fait sens immediatement : 'on a un outil libre par couche, on peut tout auditer, on depend de zero editeur US'.",
    ],
  },
  {
    emoji: "🔭",
    title: "Et apres le 26 mai ?",
    palette: {
      bg: "from-rose-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/40",
      ring: "border-rose-200 dark:border-rose-900/40",
      accent: "text-rose-700 dark:text-rose-300",
    },
    body: [
      "Apres le 26 mai, on est a J0 d'un voyage long. Les premiers contributeurs, les premieres issues GitHub, les premiers self-hosters qui poussent une saison maison. Un Discord public ouvert, un canal #aide-self-host, un changelog public.",
      "Sur 6 mois, je vise 200 etoiles GitHub, 5 contributions externes, 3 PMEs en self-host avec retour public. Sur 24 mois, 180 a 250 k€ de chiffre d'affaires en solo, 350 a 500 k€ avec un premier collaborateur — modele calque sur ce que font deja intuitem, Filigran, Centreon.",
      "Et chaque saison a venir, chaque module, chaque fonctionnalite : visible en clair sur GitHub, discutable dans les issues, accessible a tous. C'est le contrat.",
    ],
  },
];

export default function LancementOssPage() {
  const days = daysUntilLaunch();
  const isLaunched = days <= 0;

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* ============================================================
          1. HERO — compte a rebours bienveillant
          ============================================================ */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section
          aria-labelledby="hero-title"
          className="max-w-5xl mx-auto px-4 pt-12 pb-12 sm:pt-20 sm:pb-16 text-center"
        >
          <p className="text-xs sm:text-sm uppercase tracking-[0.3em] font-bold text-accent-500 mb-3">
            {isLaunched
              ? "C'est lance · AGPLv3 · code public"
              : "Mardi 26 mai 2026 · AGPLv3 · code public"}
          </p>

          <h1
            id="hero-title"
            className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-6 animate-slide-up"
            style={{ animationDelay: "120ms" }}
          >
            {isLaunched ? "Le code est libre." : "Bientot libre, ensemble."}
          </h1>

          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "240ms" }}
          >
            {isLaunched
              ? "Humanix Academie est desormais publie sous licence GNU AGPLv3. Audit complet, fork autorise, deploiement en 10 minutes — la brique humaine de l'ecosysteme cyber souverain francais est entre tes mains."
              : "Humanix Academie passe en open source AGPLv3 mardi 26 mai 2026. Code complet, repo public, deploiement en 10 minutes — la brique humaine de l'ecosysteme cyber souverain francais devient libre."}
          </p>

          {/* Compteur jours — visible avant launch, badge "lance" apres */}
          {isLaunched ? (
            <div
              className="inline-flex items-center gap-3 mt-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border-2 border-emerald-300 dark:border-emerald-700 px-5 py-3 text-emerald-800 dark:text-emerald-200 font-bold animate-slide-up"
              style={{ animationDelay: "360ms" }}
            >
              <span aria-hidden="true" className="text-2xl">
                🎉
              </span>
              <span>Code source ouvert depuis le 26 mai 2026</span>
            </div>
          ) : (
            <div
              className="inline-flex items-baseline gap-3 mt-8 rounded-3xl bg-white/80 dark:bg-slate-800/60 border-2 border-primary-200 dark:border-primary-900/40 px-6 py-4 shadow-sm animate-slide-up"
              style={{ animationDelay: "360ms" }}
            >
              <span
                className="font-display text-5xl sm:text-6xl font-extrabold text-primary-500 dark:text-accent-300 tabular-nums"
                aria-label={`${days} jours avant le lancement`}
              >
                {days}
              </span>
              <span className="text-base sm:text-lg uppercase tracking-widest font-bold text-gray-600 dark:text-gray-300">
                {days > 1 ? "jours" : "jour"}
                <br className="hidden sm:inline" />
                <span className="text-xs sm:text-sm normal-case tracking-normal text-gray-500 dark:text-gray-400 font-normal">
                  avant l'ouverture
                </span>
              </span>
            </div>
          )}

          {/* CTAs principaux */}
          <div
            className="flex flex-wrap items-center justify-center gap-3 mt-10 animate-slide-up"
            style={{ animationDelay: "480ms" }}
          >
            <a
              href="https://github.com/Humanix-Cybersecurity/Humanix-Academie"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary-500 hover:bg-primary-600 text-white font-bold px-6 py-3 rounded-2xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <span aria-hidden="true">⭐</span> Voir le repo GitHub
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
            <Link
              href="/manifeste"
              className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-primary-500 dark:text-accent-300 border-2 border-primary-200 dark:border-primary-900/40 font-bold px-6 py-3 rounded-2xl shadow-sm hover:-translate-y-0.5 transition-all"
            >
              Lire le manifeste
            </Link>
            <Link
              href="/presse"
              className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-primary-500 dark:text-accent-300 border-2 border-primary-200 dark:border-primary-900/40 font-bold px-6 py-3 rounded-2xl shadow-sm hover:-translate-y-0.5 transition-all"
            >
              Kit presse
            </Link>
          </div>
        </section>
      </HexBackdrop>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
        {/* ============================================================
            2. CHAPITRES NARRATIFS — recit fondateur en 5 etapes
            ============================================================ */}
        <section
          aria-label="Recit fondateur — pourquoi ce passage en open source"
          className="space-y-6"
        >
          {CHAPTERS.map((chapter, idx) => (
            <article
              key={chapter.title}
              className={`rounded-3xl border-2 ${chapter.palette.ring} bg-gradient-to-br ${chapter.palette.bg} p-6 sm:p-8 shadow-sm animate-slide-up`}
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="text-5xl sm:text-6xl shrink-0 select-none"
                >
                  {chapter.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-[10px] uppercase tracking-[0.25em] font-bold ${chapter.palette.accent} mb-1`}
                  >
                    Chapitre {idx + 1}
                  </p>
                  <h2
                    className={`font-display text-2xl sm:text-3xl font-extrabold ${chapter.palette.accent} leading-tight mb-4`}
                  >
                    {chapter.title}
                  </h2>
                  <div className="space-y-3 text-base text-gray-700 dark:text-gray-200 leading-relaxed">
                    {chapter.body.map((paragraph, pIdx) => (
                      <p key={pIdx}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* ============================================================
            3. ENGAGEMENTS PUBLICS — 4 promesses tracables
            ============================================================ */}
        <section
          aria-labelledby="engagements-title"
          className="rounded-3xl border-2 border-primary-200 dark:border-primary-900/40 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 p-6 sm:p-10 shadow-sm animate-slide-up"
          style={{ animationDelay: "120ms" }}
        >
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Le contrat
          </p>
          <h2
            id="engagements-title"
            className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-5 leading-tight"
          >
            Quatre engagements publics, tracables.
          </h2>
          <ul className="space-y-3 text-base text-gray-700 dark:text-gray-200 leading-relaxed">
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="shrink-0 text-xl">
                📂
              </span>
              <span>
                <strong className="text-primary-500 dark:text-accent-300">
                  Code complet ouvert :
                </strong>{" "}
                aucun module cache, aucune brique fermee importante. Si une
                fonctionnalite est dans le SaaS, elle est lisible dans le
                repo.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="shrink-0 text-xl">
                💬
              </span>
              <span>
                <strong className="text-primary-500 dark:text-accent-300">
                  Decisions discutees en clair :
                </strong>{" "}
                roadmap, choix techniques majeurs, abandons : tout passe par
                des issues publiques. Pas de roadmap secrete.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="shrink-0 text-xl">
                🔧
              </span>
              <span>
                <strong className="text-primary-500 dark:text-accent-300">
                  Self-host pris au serieux :
                </strong>{" "}
                docker-compose teste, doc d'install verifiee, support communaute
                via GitHub Discussions et Discord — sans condescendance.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="shrink-0 text-xl">
                🤲
              </span>
              <span>
                <strong className="text-primary-500 dark:text-accent-300">
                  Contributions accueillies :
                </strong>{" "}
                CONTRIBUTING.md a jour, DCO simple (pas de CLA pesant), reponse
                aux PRs sous 7 jours. Ton expertise est bienvenue.
              </span>
            </li>
          </ul>
        </section>

        {/* ============================================================
            4. CTA FINAL — invitation cosy
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
            🌱
          </div>
          <p className="text-xs uppercase tracking-[0.3em] font-bold opacity-80 mb-2 relative">
            A toi de jouer
          </p>
          <h2
            id="cta-title"
            className="font-display text-3xl sm:text-4xl font-extrabold mb-3 leading-tight relative"
          >
            Prends une etoile, prends un fork, ou juste un cafe.
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
            <Link
              href="/demo"
              className="bg-white/10 backdrop-blur border border-white/40 text-white font-bold px-6 py-3 rounded-2xl hover:bg-white/20 transition"
            >
              Ouvrir une demo (sans carte)
            </Link>
            <Link
              href="/manifeste"
              className="bg-white/10 backdrop-blur border border-white/40 text-white font-bold px-6 py-3 rounded-2xl hover:bg-white/20 transition"
            >
              Lire le manifeste
            </Link>
          </div>
        </section>

        {/* ============================================================
            5. CITATION FINALE — signature cosy "Hex veille"
            ============================================================ */}
        <section className="text-center pt-8 pb-4">
          <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            « Liberer le code, ce n'est pas un sacrifice. C'est l'inverse —
            transformer deux ans de travail en un canal d'acquisition gratuit,
            qualifie, et impossible a copier par les acteurs US qui ne joueront
            jamais ce jeu. »
          </blockquote>
          <p
            aria-hidden="true"
            className="mt-4 text-xs uppercase tracking-[0.3em] text-accent-500/70 font-bold"
          >
            — Florian, fondateur · Hex veille
          </p>
        </section>
      </div>
    </main>
  );
}
