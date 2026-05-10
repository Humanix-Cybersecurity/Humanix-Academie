// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique /contact - point d'entree unique pour toute demande externe.
//
// On ne fait pas de form web (qui demanderait stockage + anti-spam + RGPD).
// On oriente par sujet vers la bonne adresse mailto:, avec sujet pre-rempli.
// Coherent avec l'esprit "transparence et simplicite" : pas de friction.
//
// Lecture du parametre ?sujet=expert (utilise par /experts) pour mettre en
// avant la bonne carte au chargement.

import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";

const CONTACT_TITLE = "Contact — Cinq adresses dédiées | Humanix Académie";
const CONTACT_DESC =
  "Cinq adresses email selon ton sujet : commercial, sécurité, RGPD, support, contributeur expert. Réponse sous 4 h ouvrées en moyenne. Pas de formulaire, pas de tracker.";

export const metadata = {
  title: CONTACT_TITLE,
  description: CONTACT_DESC,
  alternates: { canonical: "/contact" },
  openGraph: {
    title: CONTACT_TITLE,
    description: CONTACT_DESC,
    type: "website",
    url: "/contact",
    images: [{ url: "/logo-humanix-academie-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Humanix — Réponse sous 4 h ouvrées",
    description: CONTACT_DESC,
    images: ["/logo-humanix-academie-512.png"],
  },
};

const SUJETS = [
  {
    emoji: "💬",
    title: "Question générale",
    description:
      "Une question sur le produit, une démo dédiée, un retour utilisateur, une idée de partenariat (en discussion, rien d'officiel).",
    email: "contact@humanix-cybersecurity.fr",
    sujet: "Question générale",
    palette: {
      bg: "from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/40",
      ring: "border-cyan-200 dark:border-cyan-900/40",
      accent: "text-cyan-700 dark:text-cyan-300",
    },
  },
  {
    emoji: "✍️",
    title: "Devenir contributeur expert",
    description:
      "Tu es RSSI, gendarme cyber, formateur, DPO, consultant. Tu veux signer un module pédagogique dans la marketplace. On te répond sous 7 jours.",
    email: "contact@humanix-cybersecurity.fr",
    sujet: "Candidature contributeur expert",
    sujetParam: "expert",
    palette: {
      bg: "from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/40",
      ring: "border-emerald-200 dark:border-emerald-900/40",
      accent: "text-emerald-700 dark:text-emerald-300",
    },
  },
  {
    emoji: "🛡",
    title: "Vulnérabilité de sécurité",
    description:
      "Tu as découvert une faille. Merci. Procédure de divulgation responsable détaillée dans SECURITY.md. Réponse sous 48h.",
    email: "security@humanix-cybersecurity.fr",
    sujet: "Vulnérabilité - divulgation responsable",
    palette: {
      bg: "from-rose-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/40",
      ring: "border-rose-200 dark:border-rose-900/40",
      accent: "text-rose-700 dark:text-rose-300",
    },
  },
  {
    emoji: "⚖️",
    title: "Demande RGPD",
    description:
      "Exercer un droit RGPD (accès, rectification, effacement, portabilité, opposition). Réponse sous 1 mois maximum, généralement sous 72h.",
    email: "rgpd@humanix-cybersecurity.fr",
    sujet: "Exercice de droit RGPD",
    palette: {
      bg: "from-purple-50 via-white to-pink-50 dark:from-slate-900 dark:via-slate-900 dark:to-purple-950/40",
      ring: "border-purple-200 dark:border-purple-900/40",
      accent: "text-purple-700 dark:text-purple-300",
    },
  },
  {
    emoji: "🛠",
    title: "Support technique",
    description:
      "Bug, comportement inattendu, problème d'accès. Pour un signalement de bug GitHub, préférer l'issue tracker du repo (CONTRIBUTING.md).",
    email: "support@humanix-cybersecurity.fr",
    sujet: "Support technique",
    palette: {
      bg: "from-amber-50 via-white to-yellow-50 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40",
      ring: "border-amber-200 dark:border-amber-900/40",
      accent: "text-amber-700 dark:text-amber-300",
    },
  },
  {
    emoji: "📰",
    title: "Presse / journaliste",
    description:
      "Kit presse complet sur /presse (pitchs 30s/2min, faits clés, citations, logos). Demandes spécifiques : on répond sous 24h ouvrées.",
    email: "contact@humanix-cybersecurity.fr",
    sujet: "Demande presse",
    sujetParam: "presse",
    palette: {
      bg: "from-indigo-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40",
      ring: "border-indigo-200 dark:border-indigo-900/40",
      accent: "text-indigo-700 dark:text-indigo-300",
    },
  },
];

function buildMailto(email: string, subject: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sujet?: string }>;
}) {
  const { sujet } = await searchParams;
  const highlightedKey = sujet ?? null;

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* ================================================================
          1. HERO
          ================================================================ */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section
          aria-labelledby="hero-title"
          className="max-w-5xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12 text-center"
        >
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Contact · réponse rapide, vraie personne
          </p>
          <h1
            id="hero-title"
            className="font-display text-4xl sm:text-6xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-4 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            On t'écoute,{" "}
            <span className="text-accent-500">choisis ton sujet.</span>
          </h1>
          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "220ms" }}
          >
            Pas de formulaire labyrinthe. Une adresse email par sujet, un sujet
            pré-rempli, et une vraie personne qui répond - sous 4 heures
            ouvrées en moyenne. Florian ou son équipe (l'équipe = Florian).
          </p>
        </section>
      </HexBackdrop>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* ============================================================
            2. 6 CARTES SUJET
            ============================================================ */}
        <section
          aria-labelledby="sujets-title"
          className="grid sm:grid-cols-2 gap-5"
        >
          <h2 id="sujets-title" className="sr-only">
            Choisir un sujet
          </h2>
          {SUJETS.map((s, idx) => {
            const isHighlighted =
              highlightedKey && s.sujetParam === highlightedKey;
            return (
              <article
                key={s.title}
                className={`rounded-3xl border-2 ${s.palette.ring} bg-gradient-to-br ${s.palette.bg} p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all animate-slide-up ${
                  isHighlighted
                    ? "ring-4 ring-accent-500/30 dark:ring-accent-300/30"
                    : ""
                }`}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="text-4xl mb-3" aria-hidden="true">
                  {s.emoji}
                </div>
                <h3
                  className={`font-display text-xl font-extrabold ${s.palette.accent} mb-2 leading-tight`}
                >
                  {s.title}
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-4">
                  {s.description}
                </p>
                <a
                  href={buildMailto(s.email, s.sujet)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-current font-bold text-sm hover:scale-[1.02] transition shadow-sm"
                >
                  <span aria-hidden="true">✉️</span>
                  <span className="font-mono text-xs">{s.email}</span>
                </a>
              </article>
            );
          })}
        </section>

        {/* ============================================================
            3. CONTACT POSTAL + INFO LEGALE
            ============================================================ */}
        <section
          aria-labelledby="legal-title"
          className="rounded-3xl border-2 border-primary-200 dark:border-primary-900/40 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 p-6 sm:p-8 shadow-sm"
        >
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Adresse postale & identité légale
          </p>
          <h2
            id="legal-title"
            className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-3 leading-tight"
          >
            Humanix-Cybersecurity SASU
          </h2>
          <div className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed space-y-1">
            <p>Alès, Gard, France</p>
            <p className="tabular-nums">
              SIREN 103 901 799 · TVA FR 80 103 901 799
            </p>
            <p>
              Pour l'adresse postale exacte (RGPD : non publiée sur le web),
              écrire à{" "}
              <a
                href={buildMailto(
                  "contact@humanix-cybersecurity.fr",
                  "Demande adresse postale",
                )}
                className="text-accent-500 underline font-medium"
              >
                contact@humanix-cybersecurity.fr
              </a>
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/mentions-legales"
              className="text-sm text-accent-500 hover:underline font-medium"
            >
              Mentions légales →
            </Link>
            <Link
              href="/confidentialite"
              className="text-sm text-accent-500 hover:underline font-medium"
            >
              Politique de confidentialité →
            </Link>
            <Link
              href="/securite"
              className="text-sm text-accent-500 hover:underline font-medium"
            >
              Trust Center →
            </Link>
          </div>
        </section>

        {/* ============================================================
            4. CITATION FINALE
            ============================================================ */}
        <section className="text-center pt-4 pb-2">
          <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            « Les meilleurs supports clients sont ceux où on parle à un humain.
            On garde ce principe - même quand on sera 5 ou 50. »
          </blockquote>
          <p
            aria-hidden="true"
            className="mt-3 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
          >
            - Hex veille
          </p>
        </section>
      </div>
    </main>
  );
}
