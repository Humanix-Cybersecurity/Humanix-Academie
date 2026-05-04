// Pied de page HumaniX - refonte UX.2.
// Hierarchie visuelle nette : 4 colonnes + bandeau identite + stamp Made in France.
// Distinction claire entre "Outils gratuits" (lead-gen, mis en avant accent),
// "Pages produit" (descriptif), "Confiance" (preuves), "Légal" (obligations).

import Image from "next/image";
import MadeInFranceStamp from "@/components/MadeInFranceStamp";

type FooterLink = { href: string; label: string; emoji?: string; external?: boolean };

const OUTILS_GRATUITS: FooterLink[] = [
  { href: "/audit-flash", label: "Audit Cyber gratuit (5 min)", emoji: "🎯" },
  { href: "/anecdotes", label: "Cyber-Anecdote du Lundi", emoji: "📅" },
  { href: "/cyber-meteo", label: "Cyber-météo France", emoji: "🇫🇷" },
  { href: "/observatoire-fuites", label: "Observatoire des fuites FR", emoji: "📊" },
  { href: "/comparatif", label: "Comparatif honnête", emoji: "⚖️" },
];

const PRODUIT: FooterLink[] = [
  { href: "/tarifs", label: "Tarifs" },
  { href: "/demo", label: "Démo en ligne" },
  { href: "/famille", label: "Cyber Famille", emoji: "❤️" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/experts", label: "Bibliothèque d'experts" },
  { href: "/integrations", label: "Connecteurs & intégrations", emoji: "🔌" },
  { href: "/integrations/outlook", label: "Plugin Outlook" },
];

const CONFIANCE: FooterLink[] = [
  { href: "/securite", label: "Sécurité & Conformité" },
  { href: "/securite/rapport-audit", label: "Rapport d'audit public", emoji: "📄" },
  { href: "/accessibilite", label: "Accessibilité (RGAA)" },
  { href: "/marketplace/security", label: "Charte Marketplace" },
  { href: "/presse", label: "Espace presse", emoji: "📰" },
];

const LEGAL: FooterLink[] = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité (RGPD)" },
  { href: "/cookies", label: "Cookies" },
  { href: "/cgv", label: "CGV" },
  { href: "/cgu", label: "CGU" },
];

const CONTACT: FooterLink[] = [
  { href: "mailto:contact@humanix-cybersecurity.fr", label: "contact@humanix-cybersecurity.fr" },
  { href: "mailto:rgpd@humanix-cybersecurity.fr", label: "rgpd@humanix-cybersecurity.fr" },
  { href: "mailto:support@humanix-cybersecurity.fr", label: "support@humanix-cybersecurity.fr" },
];

function FooterColumn({
  title,
  accent,
  links,
}: {
  title: string;
  accent?: boolean;
  links: FooterLink[];
}) {
  return (
    <nav aria-label={title}>
      <h3
        className={`text-xs uppercase tracking-widest font-bold mb-4 ${
          accent ? "text-accent-500" : "text-primary-500 dark:text-accent-300"
        }`}
      >
        {title}
      </h3>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              className={`text-sm transition-colors inline-flex items-start gap-1.5 ${
                accent
                  ? "text-gray-700 dark:text-gray-200 hover:text-accent-500 dark:hover:text-accent-300 font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-accent-300"
              }`}
            >
              {l.emoji && <span aria-hidden="true">{l.emoji}</span>}
              <span>{l.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function SiteFooter() {
  return (
    <footer
      aria-label="Pied de page"
      className="relative mt-20 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
    >
      {/* Motif Hex subtil derriere */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-hex-pattern opacity-50 pointer-events-none"
      />

      <div className="relative max-w-6xl mx-auto px-4 py-12">
        {/* Bloc identite + tagline en pleine largeur */}
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between mb-10 pb-8 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <Image
              src="/logo-humanix-academie-192.png"
              alt=""
              width={56}
              height={56}
              className="h-14 w-auto"
            />
            <div>
              <p className="text-lg font-extrabold text-primary-500 dark:text-accent-300">
                HumaniX Académie
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                La cybersécurité, simple et ludique. Pour les PME françaises.
              </p>
            </div>
          </div>
          <MadeInFranceStamp size="md" className="hidden sm:block" />
        </div>

        {/* Grille de colonnes - hierarchie : Outils gratuits (accent), puis le reste */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-10">
          {/* Colonne 1 : Outils gratuits (mis en avant en accent) */}
          <div className="lg:col-span-1">
            <FooterColumn title="Outils gratuits" accent links={OUTILS_GRATUITS} />
          </div>
          <FooterColumn title="Produit" links={PRODUIT} />
          <FooterColumn title="Confiance" links={CONFIANCE} />
          <FooterColumn title="Légal" links={LEGAL} />
          <FooterColumn title="Contact" links={CONTACT} />
        </div>

        {/* Bandeau bas - identite legale + trust badges */}
        <div className="pt-6 border-t border-gray-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 md:items-center md:justify-between text-xs text-gray-500 dark:text-gray-400">
          <p className="flex items-center gap-2">
            <span aria-hidden="true">©</span>
            <span>
              {new Date().getFullYear()} <strong className="text-primary-500 dark:text-accent-300">Humanix-Cybersecurity</strong> SASU
            </span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">SIREN 103 901 799</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">TVA FR 80 103 901 799</span>
          </p>
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5" aria-label="Garanties">
            <li className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 dark:bg-slate-800 border border-primary-100 dark:border-slate-700">
              <span aria-hidden="true">🇫🇷</span>
              <span className="font-medium">Hébergé en France</span>
            </li>
            <li className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 dark:bg-slate-800 border border-primary-100 dark:border-slate-700">
              <span aria-hidden="true">🛡</span>
              <span className="font-medium">RGPD-compliant</span>
            </li>
            <li className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 dark:bg-slate-800 border border-primary-100 dark:border-slate-700">
              <span aria-hidden="true">♿</span>
              <span className="font-medium">RGAA AA</span>
            </li>
          </ul>
        </div>

        {/* Stamp mobile (sm:hidden, montre en bas pour conserver impact) */}
        <div className="sm:hidden mt-8 flex justify-center">
          <MadeInFranceStamp size="sm" />
        </div>
      </div>
    </footer>
  );
}
