// SPDX-License-Identifier: AGPL-3.0-or-later
//
// SiteFooter — refonte pro mai 2026 (cible : credibilite "French Tech")
//
// Probleme avant : 5 colonnes, melange aleatoire d'emojis (certains liens en
// avaient, d'autres non), categorie "Outils gratuits" en accent qui rivalisait
// avec le reste, hierarchie visuelle confuse.
//
// Refonte :
//   - 4 colonnes equilibrees (Produit / Solutions / Confiance / Legal)
//   - Aucun emoji dans les listes de liens (cree du bruit visuel)
//   - Bandeau identite haut : logo + tagline + Made in France
//   - Bandeau bas : copyright + identite legale + 3 trust badges
//     (FR / RGPD / RGAA) en pills coherentes
//   - Email contact en lien, pas en colonne entiere (gain d'espace)
//
// Inspiration : Vercel, Linear, Stripe, Posthog footers.

import Image from "next/image";
import Link from "next/link";
import MadeInFranceStamp from "@/components/MadeInFranceStamp";

type FooterLink = {
  href: string;
  label: string;
  emoji: string;
  external?: boolean;
};

const PRODUIT: FooterLink[] = [
  { href: "/tarifs", label: "Tarifs", emoji: "💶" },
  { href: "/demo", label: "Démo en ligne", emoji: "🎮" },
  { href: "/comparatif", label: "Comparatif honnête", emoji: "⚖️" },
  { href: "/integrations", label: "Connecteurs", emoji: "🔌" },
  { href: "/marketplace", label: "Marketplace", emoji: "🏛" },
  { href: "/famille", label: "Cyber Famille", emoji: "❤️" },
  { href: "/experts", label: "Bibliothèque d'experts", emoji: "✍️" },
];

const SOLUTIONS: FooterLink[] = [
  { href: "/dpo", label: "Espace DPO", emoji: "🛡" },
  { href: "/pour-les-daf", label: "Pour les DAF", emoji: "💼" },
  { href: "/lancement-oss", label: "Lancement open source", emoji: "🌱" },
  { href: "/communaute", label: "Communauté", emoji: "🤝" },
  { href: "/manifeste", label: "Manifeste", emoji: "📜" },
  { href: "/urgence-cyber", label: "Urgence cyber", emoji: "🚨" },
  { href: "/audit-flash", label: "Audit cyber gratuit", emoji: "🎯" },
  { href: "/cyber-meteo", label: "Cyber-météo France", emoji: "🇫🇷" },
  { href: "/observatoire-fuites", label: "Observatoire fuites FR", emoji: "📊" },
  { href: "/anecdotes", label: "Cyber-Anecdote du Lundi", emoji: "📅" },
];

const CONFIANCE: FooterLink[] = [
  { href: "/securite", label: "Trust Center", emoji: "🔐" },
  { href: "/securite/rapport-audit", label: "Rapport d'audit public", emoji: "📄" },
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

export default function SiteFooter() {
  return (
    <footer
      aria-label="Pied de page"
      className="relative mt-20 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900"
    >
      {/* Motif Hex tres subtil */}
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
            aria-label="Accueil Humanix Académie"
          >
            <Image
              src="/logo-humanix-academie-192.png"
              alt=""
              width={56}
              height={56}
              className="h-12 w-auto group-hover:scale-105 transition-transform"
            />
            <div>
              <p className="text-lg font-extrabold text-primary-500 dark:text-accent-300 tracking-tight">
                Humanix Académie
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md">
                La brique humaine de l'écosystème cyber souverain français.
                Open source AGPLv3, hébergement Paris, accessible à toutes
                les PME.
              </p>
            </div>
          </Link>
          <MadeInFranceStamp size="md" className="hidden sm:block shrink-0" />
        </div>

        {/* ============ Grille 4 colonnes ============ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 mb-10">
          <FooterColumn title="Produit" links={PRODUIT} />
          <FooterColumn title="Solutions" links={SOLUTIONS} />
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
                <span className="text-gray-400 dark:text-gray-500 mr-1.5">
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
                <span className="text-gray-400 dark:text-gray-500 mr-1.5">
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
                <span className="text-gray-400 dark:text-gray-500 mr-1.5">
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
                <span className="text-gray-400 dark:text-gray-500 mr-1.5">
                  Sécurité
                </span>
                security@humanix-cybersecurity.fr
              </a>
            </li>
          </ul>
        </div>

        {/* ============ Bandeau bas legal + trust badges ============ */}
        <div className="pt-8 border-t border-gray-200 dark:border-slate-800 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
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
