// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique /dpo — landing dediee aux Delegues a la Protection des
// Donnees (DPO).
//
// POURQUOI cette page existe :
//   - Le DPO est un persona cible specifique : il combine cyber + juridique +
//     organisationnel. Aucune plateforme SAT/HRM en France ne lui parle
//     directement.
//   - La promesse Humanix pour le DPO : la plateforme elle-meme est
//     RGPD-by-design (registre fourni, DPA modele, 72h pre-rempli, hosting
//     Scaleway Paris, audit log RGPD complet). Le DPO peut auditer et
//     deleguer la sensibilisation cyber sans craindre que l'outil lui-meme
//     soit un trou.
//   - Position commerciale : le DPO est souvent le declencheur d'achat dans
//     les PME post-NIS2. Il faut lui donner un point d'entree qui parle son
//     langage.
//
// CONTENU :
//   - Hero cosy avec invitation a la lecture DPO
//   - 5 promesses tracables (registre, DPA, 72h, droits, audit log)
//   - Cas d'usage concret "DPO de PME 80 personnes"
//   - Liens vers /confidentialite, /securite, modules pedagogiques DPO
//   - Citation finale "Hex veille"
//
// ROADMAP suite :
//   - /admin/dpo : dashboard prive avec preuves RGPD exportables, queue de
//     demandes (article 15-22), AIPD generator (PR a venir)
//   - Modules MDX dedies DPO : AIPD, controle CNIL, transferts hors UE
//     (PR a venir)
//   - Reference dans HeaderBar + footer (deja fait)

import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";

export const metadata = {
  title: "Espace DPO — Humanix Académie",
  description:
    "Pour les Délégués à la Protection des Données : Humanix Académie est RGPD-by-design. Registre, DPA modèle, 72h pré-rempli, hébergement Scaleway Paris, audit log complet. Plateforme de sensibilisation cyber qu'un DPO peut auditer et déléguer.",
};

const PROMESSES = [
  {
    emoji: "📋",
    title: "Registre des traitements fourni",
    palette: {
      bg: "from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/40",
      ring: "border-cyan-200 dark:border-cyan-900/40",
      accent: "text-cyan-700 dark:text-cyan-300",
    },
    body: "Humanix Academie est un sous-traitant au sens RGPD. Tu recois des le trial : le registre des traitements de la plateforme (article 30), avec finalites, donnees, durees, garanties — pre-rempli, signe, exportable. Plus besoin de le faire toi-meme.",
  },
  {
    emoji: "📜",
    title: "DPA modele en piece jointe",
    palette: {
      bg: "from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/40",
      ring: "border-emerald-200 dark:border-emerald-900/40",
      accent: "text-emerald-700 dark:text-emerald-300",
    },
    body: "Data Processing Agreement (article 28 RGPD) deja redige selon les exigences CNIL et signables en 1 minute. Liste exhaustive des sous-traitants ulterieurs (Scaleway Paris pour l'hosting, Mistral Paris pour l'IA, Payplug pour le paiement). Aucune dependance Cloud Act par defaut.",
  },
  {
    emoji: "⏰",
    title: "Procedure 72h pre-remplie",
    palette: {
      bg: "from-amber-50 via-white to-yellow-50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40",
      ring: "border-amber-200 dark:border-amber-900/40",
      accent: "text-amber-700 dark:text-amber-300",
    },
    body: "En cas de fuite cote Humanix : runbook 72h documente, contact CNIL sur la liaison directe, formulaire pre-rempli. Cote tenant : module pedagogique 03-fuite-72h disponible pour former tes equipes a leur propre procedure.",
  },
  {
    emoji: "🔓",
    title: "Droits RGPD complets, traces",
    palette: {
      bg: "from-purple-50 via-white to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/40",
      ring: "border-purple-200 dark:border-purple-900/40",
      accent: "text-purple-700 dark:text-purple-300",
    },
    body: "Acces, rectification, effacement, portabilite (art. 15-22) implementes nativement dans /profil pour chaque apprenant. Audit log RGPD centralise (PR #88) trace toute action sur les donnees personnelles. Tu peux repondre a une demande de droit en 4 clics, avec preuve d'execution.",
  },
  {
    emoji: "🇫🇷",
    title: "Hebergement souverain Scaleway Paris",
    palette: {
      bg: "from-rose-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/40",
      ring: "border-rose-200 dark:border-rose-900/40",
      accent: "text-rose-700 dark:text-rose-300",
    },
    body: "Donnees personnelles 100 % France. Email transactionnel via Scaleway TEM (PR #106), paiement via Payplug (PR #97), IA generative via Mistral Paris. Aucune donnee personnelle ne traverse le Cloud Act. Option SecNumCloud disponible en Enterprise.",
  },
  {
    emoji: "🛡",
    title: "Audit complet, code lisible",
    palette: {
      bg: "from-indigo-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40",
      ring: "border-indigo-200 dark:border-indigo-900/40",
      accent: "text-indigo-700 dark:text-indigo-300",
    },
    body: "Plateforme open source AGPLv3. Tu peux auditer le code ligne par ligne, le forker, l'auto-heberger. Plus de boite noire a justifier au COMEX. Le rapport d'audit de securite est public (Markdown versionne Git, PDF a la demande).",
  },
];

export default function DpoLandingPage() {
  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* ================================================================
          1. HERO — invitation au DPO
          ================================================================ */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section
          aria-labelledby="hero-title"
          className="max-w-5xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12 text-center"
        >
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Espace DPO · RGPD-by-design
          </p>
          <h1
            id="hero-title"
            className="font-display text-4xl sm:text-6xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-4 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            Une plateforme qu'un{" "}
            <span className="text-accent-500">DPO peut auditer.</span>
          </h1>
          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "220ms" }}
          >
            Humanix Academie est un outil de sensibilisation cyber. Mais c'est
            aussi un sous-traitant RGPD. On a fait le choix d'etre auditable
            par construction : registre fourni, DPA modele, 72h pre-rempli,
            hosting Scaleway Paris, audit log complet, code AGPLv3 public.
          </p>
        </section>
      </HexBackdrop>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* ============================================================
            2. PROMESSES — 6 cards palette saisons
            ============================================================ */}
        <section
          aria-labelledby="promesses-title"
          className="space-y-1"
        >
          <div className="text-center mb-6">
            <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
              6 promesses tracables
            </p>
            <h2
              id="promesses-title"
              className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight"
            >
              Ce qu'un DPO trouve dans Humanix.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
            {PROMESSES.map((p, idx) => (
              <article
                key={p.title}
                className={`rounded-3xl border-2 ${p.palette.ring} bg-gradient-to-br ${p.palette.bg} p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all animate-slide-up h-full`}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="text-4xl mb-3" aria-hidden="true">
                  {p.emoji}
                </div>
                <h3
                  className={`font-display text-lg font-extrabold ${p.palette.accent} mb-2 leading-tight`}
                >
                  {p.title}
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                  {p.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ============================================================
            3. CAS D'USAGE — DPO de PME 80 personnes
            ============================================================ */}
        <section
          aria-labelledby="usecase-title"
          className="rounded-3xl border-2 border-primary-200 dark:border-primary-900/40 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 p-6 sm:p-10 shadow-sm animate-slide-up"
          style={{ animationDelay: "120ms" }}
        >
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Cas d'usage typique
          </p>
          <h2
            id="usecase-title"
            className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-4 leading-tight"
          >
            DPO de PME, 80 personnes, post-NIS2.
          </h2>
          <div className="space-y-4 text-base text-gray-700 dark:text-gray-200 leading-relaxed">
            <p>
              <strong className="text-primary-500 dark:text-accent-300">
                La situation :
              </strong>{" "}
              tu es DPO mutualise (3 jours/semaine), tu pilotes la conformite
              de plusieurs PME francaises. NIS2 est arrivee, tes dirigeants te
              demandent de prouver que les collaborateurs sont sensibilises a
              la cyber. Tu cherches une plateforme qui ne te rajoute pas
              elle-meme une dette RGPD.
            </p>
            <p>
              <strong className="text-primary-500 dark:text-accent-300">
                Ce qu'apporte Humanix :
              </strong>{" "}
              tu deploies le tenant en 30 minutes. Le registre, le DPA, la
              procedure 72h sont fournis dans /admin. Tu n'as plus qu'a les
              annexer a ton dossier de sous-traitants. La plateforme propose
              elle-meme les modules pedagogiques pour former tes
              collaborateurs sur les sujets RGPD operationnels (regle des 3
              questions, droit d'acces, registre, sous-traitants — saison{" "}
              <Link
                href="/apprendre"
                className="text-accent-500 underline font-medium"
              >
                donnees-sensibles
              </Link>{" "}
              complete 6/6).
            </p>
            <p>
              <strong className="text-primary-500 dark:text-accent-300">
                Le bonus :
              </strong>{" "}
              tu peux donner acces a la console{" "}
              <Link
                href="/admin"
                className="text-accent-500 underline font-medium"
              >
                /admin
              </Link>{" "}
              au dirigeant, qui voit en temps reel le taux de completion. Plus
              besoin d'envoyer un PDF mensuel — la preuve est consultable et
              exportable. La meteo cyber{" "}
              <Link
                href="/cyber-meteo"
                className="text-accent-500 underline font-medium"
              >
                /cyber-meteo
              </Link>{" "}
              donne le contexte national CERT-FR. Tu economises 4 a 6 heures
              par mois.
            </p>
          </div>
        </section>

        {/* ============================================================
            4. ROADMAP DPO — ce qui arrive
            ============================================================ */}
        <section
          aria-labelledby="roadmap-title"
          className="rounded-3xl border-2 border-amber-200 dark:border-amber-900/40 bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40 p-6 sm:p-10 shadow-sm animate-slide-up"
          style={{ animationDelay: "200ms" }}
        >
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-amber-700 dark:text-amber-300 mb-2">
            Roadmap espace DPO · Q3-Q4 2026
          </p>
          <h2
            id="roadmap-title"
            className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-4 leading-tight"
          >
            Ce qu'on construit pour toi cette annee.
          </h2>
          <ul className="space-y-3 text-base text-gray-700 dark:text-gray-200 leading-relaxed">
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="shrink-0 text-xl">
                🗂
              </span>
              <span>
                <strong className="text-primary-500 dark:text-accent-300">
                  Dashboard /admin/dpo :
                </strong>{" "}
                vue dediee DPO avec queue de demandes RGPD recues,
                statuts, delais legaux, exports en 1 clic.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="shrink-0 text-xl">
                📝
              </span>
              <span>
                <strong className="text-primary-500 dark:text-accent-300">
                  AIPD generator :
                </strong>{" "}
                template d'analyse d'impact a la protection des donnees
                pre-rempli pour les nouveaux traitements de la PME.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="shrink-0 text-xl">
                📚
              </span>
              <span>
                <strong className="text-primary-500 dark:text-accent-300">
                  Modules MDX dedies DPO :
                </strong>{" "}
                AIPD, controle CNIL, transferts hors UE, profilage,
                base juridique — pour former le DPO lui-meme et son entourage.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span aria-hidden="true" className="shrink-0 text-xl">
                🤝
              </span>
              <span>
                <strong className="text-primary-500 dark:text-accent-300">
                  Connecteur GRC dedie DPO :
                </strong>{" "}
                push direct vers le module DPO de CISO Assistant ou Privacy
                Tools — preuves de sensibilisation transferees automatiquement.
              </span>
            </li>
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-4 italic">
            Ces fonctionnalites sont co-construites avec les premiers DPO
            partenaires. Si tu veux participer au pilote, ecris-nous a
            l'adresse ci-dessous.
          </p>
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
            🛡
          </div>
          <p className="text-xs uppercase tracking-[0.3em] font-bold opacity-80 mb-2 relative">
            Echangeons
          </p>
          <h2
            id="cta-title"
            className="font-display text-3xl sm:text-4xl font-extrabold mb-3 relative leading-tight"
          >
            Tu es DPO ? On t'ecoute.
          </h2>
          <p className="opacity-90 mb-6 max-w-xl mx-auto text-base sm:text-lg leading-relaxed relative">
            Que tu sois interne dans une PME, mutualise sur plusieurs
            structures, ou consultant independant — ta voix oriente la roadmap
            espace DPO. Demo dediee 30 min, sans pression commerciale.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center relative">
            <a
              href="mailto:contact@humanix-cybersecurity.fr?subject=Espace+DPO+%E2%80%94+pilote+Humanix"
              className="bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl hover:scale-105 transition shadow-lg"
            >
              📧 Demander une demo DPO
            </a>
            <Link
              href="/confidentialite"
              className="bg-white/10 backdrop-blur border border-white/40 text-white font-bold px-6 py-3 rounded-2xl hover:bg-white/20 transition"
            >
              Lire la politique de confidentialite
            </Link>
            <Link
              href="/securite"
              className="bg-white/10 backdrop-blur border border-white/40 text-white font-bold px-6 py-3 rounded-2xl hover:bg-white/20 transition"
            >
              Voir le Trust Center
            </Link>
          </div>
        </section>

        {/* ============================================================
            6. CITATION FINALE — signature cosy "Hex veille"
            ============================================================ */}
        <section className="text-center pt-8 pb-4">
          <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            « Un DPO ne devrait pas avoir a choisir entre un outil cyber utile
            et un outil cyber conforme. On a passe deux ans a construire
            l'option qui est les deux a la fois — et qu'on peut auditer. »
          </blockquote>
          <p
            aria-hidden="true"
            className="mt-4 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
          >
            — Hex veille
          </p>
        </section>
      </div>
    </main>
  );
}
