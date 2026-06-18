// SPDX-License-Identifier: AGPL-3.0-or-later
//
// SiteFooter - refonte pro mai 2026 (cible : credibilite "French Tech")
//
// Refonte :
//   - 4 colonnes equilibrees (Notre offre / Outils / Confiance / Legal)
//   - Les 2 premieres colonnes refletent strictement la nav header
//     (HeaderBar.tsx -> PRODUIT_ITEMS et SOLUTIONS_ITEMS). Memes labels,
//     memes regroupements -- pas de "Cyber-meteo / Observatoire fuites /
//     Anecdotes" en footer puisqu'au header ils sont regroupes sous
//     "Ressources" (page /ressources). Footer = sitemap aligne au header.
//   - Bandeau identite haut : logo + tagline + Made in France
//   - Bandeau bas : copyright + identite legale + 3 trust badges
//     (FR / RGPD / RGAA) en pills coherentes
//   - Email contact en lien, pas en colonne entiere (gain d'espace)
//
// Inspiration : Vercel, Linear, Stripe, Posthog footers.

import Link from "next/link";
import MadeInFranceStamp from "@/components/MadeInFranceStamp";

type FooterLink = {
  href: string;
  label: string;
  emoji: string;
  external?: boolean;
};

// Le lien "Démo" du footer suit la même règle que le header :
//   - En DEMO_MODE (instance demo elle-meme)  : /demo local
//   - En prod commerciale                     : sous-domaine externe
//     demo.humanix-academie.fr (target=_blank). Le sous-domaine est
//     une instance separee deployee en DEMO_MODE=true, donc safe a
//     proposer publiquement -- les donnees sont fictives par construction.
// La page /demo locale retourne 404 server-side en prod (cf.
// app/demo/layout.tsx) : un visiteur qui tape /demo a la main sur le SaaS
// principal tombe quand meme sur 404 pour ne pas creer de confusion.
//
// Override via NEXT_PUBLIC_DEMO_URL. Si vide ET pas en DEMO_MODE,
// l'entree Demo est masquee (utile pour self-hosteur sans demo publique).
const IS_DEMO_MODE = process.env.DEMO_MODE === "true";
const DEMO_PUBLIC_URL =
  process.env.NEXT_PUBLIC_DEMO_URL ?? "https://demo.humanix-academie.fr";
const DEMO_LINK: FooterLink | null = IS_DEMO_MODE
  ? { href: "/demo", label: "Démo", emoji: "🎮" }
  : DEMO_PUBLIC_URL
    ? {
        href: DEMO_PUBLIC_URL,
        label: "Démo",
        emoji: "🎮",
        external: true,
      }
    : null;

// Colonne "Notre offre" -- miroir strict de PRODUIT_ITEMS dans HeaderBar.tsx
const NOTRE_OFFRE: FooterLink[] = [
  { href: "/rejoindre", label: "Comment commencer", emoji: "🧭" },
  { href: "/tarifs", label: "Tarifs", emoji: "💶" },
  ...(DEMO_LINK ? [DEMO_LINK] : []),
  { href: "/comparatif", label: "Comparatif", emoji: "⚖️" },
  { href: "/integrations", label: "Intégrations", emoji: "🔌" },
  { href: "/marketplace", label: "Marketplace", emoji: "🏛" },
  { href: "/famille", label: "Cyber Famille", emoji: "❤️" },
];

// Colonne "Outils" -- miroir strict de SOLUTIONS_ITEMS dans HeaderBar.tsx,
// + "Communauté" (entree de nav header de meme niveau).
// /ressources regroupe cyber-meteo, observatoire-fuites, audit-flash, anecdotes.
const OUTILS: FooterLink[] = [
  { href: "/nis2", label: "Espace NIS2", emoji: "📋" },
  { href: "/exposition", label: "Suis-je exposé ?", emoji: "🛡" },
  { href: "/librairie", label: "Librairie", emoji: "📚" },
  { href: "/dpo", label: "Espace DPO", emoji: "🛡" },
  { href: "/pour-les-daf", label: "Pour les DAF", emoji: "💼" },
  { href: "/ressources", label: "Ressources", emoji: "📂" },
  { href: "/securite", label: "Trust Center", emoji: "🔐" },
  { href: "/manifeste", label: "Manifeste", emoji: "📜" },
  { href: "/urgence-cyber", label: "Urgence cyber", emoji: "🚨" },
  { href: "/communaute", label: "Communauté", emoji: "🤝" },
];

const CONFIANCE: FooterLink[] = [
  { href: "/securite", label: "Trust Center", emoji: "🔐" },
  { href: "/securite/rapport-audit", label: "Rapport d'audit public", emoji: "📄" },
  { href: "/securite/audits-externes", label: "Audits sécurité externes", emoji: "🛡️" },
  { href: "/accessibilite", label: "Accessibilité (RGAA)", emoji: "♿" },
  { href: "/marketplace/security", label: "Charte Marketplace", emoji: "📋" },
  { href: "/presse", label: "Espace presse", emoji: "📰" },
  {
    href: "https://github.com/Humanix-Cybersecurity/Humanix-Academie",
    label: "Code source (GitHub)",
    emoji: "🐙",
    external: true,
  },
];

const LEGAL: FooterLink[] = [
  { href: "/mentions-legales", label: "Mentions légales", emoji: "📃" },
  { href: "/confidentialite", label: "Confidentialité (RGPD)", emoji: "🔒" },
  { href: "/cookies", label: "Cookies", emoji: "🍪" },
  { href: "/cgv", label: "CGV", emoji: "📋" },
  { href: "/cgu", label: "CGU", emoji: "📋" },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  return (
    <nav aria-label={title}>
      <h3 className="text-[11px] uppercase tracking-[0.18em] font-bold text-primary-500 dark:text-accent-300 mb-4">
        {title}
      </h3>
      <ul className="space-y-2.5">
        {links.map((l) => {
          const className =
            "text-sm text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-accent-300 transition-colors inline-flex items-baseline gap-2";
          const inner = (
            <>
              <span
                aria-hidden="true"
                className="text-base shrink-0 w-5 text-center"
              >
                {l.emoji}
              </span>
              <span>{l.label}</span>
            </>
          );
          return (
            <li key={l.href}>
              {l.external ? (
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {inner}
                  <span className="sr-only">
                    {" "}
                    (s'ouvre dans un nouvel onglet)
                  </span>
                </a>
              ) : (
                <Link href={l.href} className={className}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default function SiteFooter({
  brandName = "Humanix Académie",
  brandLogoUrl = "/logo-humanix-academie-192.png",
  hidePoweredBy = false,
}: {
  brandName?: string;
  brandLogoUrl?: string;
  hidePoweredBy?: boolean;
} = {}) {
  return (
    <footer
      aria-label="Pied de page"
      className="relative mt-20 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900"
    >
      {/* Motif Hex très subtil */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-hex-pattern opacity-[0.4] pointer-events-none"
      />

      <div className="relative max-w-6xl mx-auto px-4 py-14">
        {/* ============ Bandeau identite haut ============ */}
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between mb-10 pb-10 border-b border-gray-200 dark:border-slate-800">
          <Link
            href="/"
            className="flex items-center gap-3 group"
            aria-label={`Accueil ${brandName}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brandLogoUrl}
              alt=""
              width={56}
              height={56}
              className="h-12 w-auto group-hover:scale-105 transition-transform"
            />
            <div>
              <p className="text-lg font-extrabold text-primary-500 dark:text-accent-300 tracking-tight">
                {brandName}
              </p>
              {!hidePoweredBy ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
                  La brique humaine de l'écosystème cyber souverain français.
                  Open source AGPLv3, hébergement Paris, accessible à tous -
                  particuliers, équipes et organisations de toute taille.
                </p>
              ) : null}
            </div>
          </Link>
          <MadeInFranceStamp size="md" className="hidden sm:block shrink-0" />
        </div>

        {/* ============ Grille 4 colonnes ============ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 mb-10">
          <FooterColumn title="Notre offre" links={NOTRE_OFFRE} />
          <FooterColumn title="Outils" links={OUTILS} />
          <FooterColumn title="Confiance" links={CONFIANCE} />
          <FooterColumn title="Légal" links={LEGAL} />
        </div>

        {/* ============ Contact compact ============ */}
        <div className="pt-8 border-t border-gray-200 dark:border-slate-800 mb-8">
          <h3 className="text-[11px] uppercase tracking-[0.18em] font-bold text-primary-500 dark:text-accent-300 mb-3">
            Contact
          </h3>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li>
              <a
                href="mailto:contact@humanix-cybersecurity.fr"
                className="text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-accent-300 transition-colors"
              >
                <span className="text-gray-500 dark:text-gray-500 mr-1.5">
                  Général
                </span>
                contact@humanix-cybersecurity.fr
              </a>
            </li>
            <li>
              <a
                href="mailto:rgpd@humanix-cybersecurity.fr"
                className="text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-accent-300 transition-colors"
              >
                <span className="text-gray-500 dark:text-gray-500 mr-1.5">
                  RGPD
                </span>
                rgpd@humanix-cybersecurity.fr
              </a>
            </li>
            <li>
              <a
                href="mailto:support@humanix-cybersecurity.fr"
                className="text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-accent-300 transition-colors"
              >
                <span className="text-gray-500 dark:text-gray-500 mr-1.5">
                  Support
                </span>
                support@humanix-cybersecurity.fr
              </a>
            </li>
            <li>
              <a
                href="mailto:security@humanix-cybersecurity.fr"
                className="text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-accent-300 transition-colors"
              >
                <span className="text-gray-500 dark:text-gray-500 mr-1.5">
                  Sécurité
                </span>
                security@humanix-cybersecurity.fr
              </a>
            </li>
          </ul>
        </div>

        {/* ============ Bandeau bas legal + trust badges ============ */}
        <div className="pt-8 border-t border-gray-200 dark:border-slate-800 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
          {hidePoweredBy ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              <span aria-hidden="true">©</span> {new Date().getFullYear()}{" "}
              <strong className="text-primary-500 dark:text-accent-300 font-semibold">
                {brandName}
              </strong>
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              <span aria-hidden="true">©</span> {new Date().getFullYear()}{" "}
              <strong className="text-primary-500 dark:text-accent-300 font-semibold">
                Humanix-Cybersecurity
              </strong>{" "}
              SASU
              <span className="mx-2 text-gray-300 dark:text-slate-700">·</span>
              <span className="tabular-nums">SIREN 103 901 799</span>
              <span className="mx-2 text-gray-300 dark:text-slate-700">·</span>
              <span className="tabular-nums">TVA FR 80 103 901 799</span>
            </p>
          )}

          <ul
            className="flex flex-wrap items-center gap-2"
            aria-label="Garanties"
          >
            <TrustPill label="Hébergé en France" />
            <TrustPill label="RGPD-compliant" />
            <TrustPill label="RGAA AA" />
            <TrustPill label="AGPLv3" />
          </ul>
        </div>

        {/* Stamp mobile (sm:hidden) */}
        <div className="sm:hidden mt-8 flex justify-center">
          <MadeInFranceStamp size="sm" />
        </div>
      </div>
    </footer>
  );
}

function TrustPill({ label }: { label: string }) {
  return (
    <li className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 text-[11px] font-medium text-gray-700 dark:text-gray-300">
      {label}
    </li>
  );
}
