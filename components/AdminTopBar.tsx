"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// AdminTopBar — Barre supérieure de la console dirigeant.
//
// Style Linear/Vercel : sticky top, hauteur compacte, breadcrumb dynamique.
//
// Ce qu'on n'a PAS ici (intentionnellement) :
//   - Pas de menu utilisateur (déjà dans HeaderBar global du site)
//   - Pas de notifications (placeholder inutile, à voir Sprint 5 si pertinent)
//   - Pas de barre de recherche globale (pareil, à voir Sprint 5)
//   - Pas de theme toggle (déjà dans HeaderBar)
//
// Le rôle unique de cette barre : burger mobile (ouvre la sidebar) +
// breadcrumb contextuel pour situer l'utilisateur dans la console.
// =============================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  // Conservé dans la signature pour rétro-compat layout.tsx, mais non utilisé.
  user?: { name?: string; email?: string };
};

// Mapping segment URL -> libellé humain pour le breadcrumb.
// Si non trouvé, on capitalize le segment brut.
const SEGMENT_LABELS: Record<string, string> = {
  admin: "Console",
  business: "Impact business",
  utilisateurs: "Utilisateurs",
  modules: "Modules",
  challenge: "Challenges",
  phishing: "Phishing",
  contributions: "Contributions",
  "conformite-nis2": "Pack NIS2",
  incidents: "Cyber-Réflexe",
  etablissements: "Établissements",
  "api-keys": "API Keys",
  integrations: "Webhooks",
  moderation: "Modération",
  anecdotes: "Anecdotes",
  generer: "Générer",
  personalize: "Personnaliser",
  new: "Nouveau",
};

function buildBreadcrumb(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const items: { label: string; href: string }[] = [];
  let currentHref = "";
  for (const seg of segments) {
    currentHref += `/${seg}`;
    // Skip les segments dynamiques [id] qui sont en réalité des UUIDs/slugs
    const label =
      SEGMENT_LABELS[seg] ??
      (seg.length > 20
        ? seg.slice(0, 8) + "…"
        : seg.charAt(0).toUpperCase() + seg.slice(1));
    items.push({ label, href: currentHref });
  }
  // Sur /admin pur, on ajoute "Tableau de bord" implicite
  if (pathname === "/admin") {
    items.push({ label: "Tableau de bord", href: "/admin" });
  }
  return items;
}

// =============================================================================
// Composant principal
// =============================================================================

export default function AdminTopBar(_props: Props) {
  const pathname = usePathname() ?? "/admin";
  const breadcrumb = buildBreadcrumb(pathname);

  // Burger mobile : déclenche un event qui ouvre le drawer de la sidebar
  const toggleSidebar = () => {
    window.dispatchEvent(new Event("admin-toggle-sidebar"));
  };

  return (
    <header
      className="sticky top-0 z-20 h-12 lg:h-14 flex items-center gap-3 px-3 lg:px-6 border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md"
      aria-label="Barre supérieure console"
    >
      {/* Mobile burger (déclenche drawer sidebar) */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300"
        aria-label="Ouvrir le menu"
      >
        <span aria-hidden="true" className="text-lg">
          ☰
        </span>
      </button>

      {/* Breadcrumb — seul élément utile de cette barre */}
      <Breadcrumb items={breadcrumb} />
    </header>
  );
}

// =============================================================================
// Sous-composants
// =============================================================================

function Breadcrumb({ items }: { items: { label: string; href: string }[] }) {
  return (
    <nav
      aria-label="Fil d'Ariane"
      className="flex items-center gap-1.5 text-sm min-w-0 overflow-hidden"
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item.href} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && (
              <span
                aria-hidden="true"
                className="text-gray-300 dark:text-slate-600 shrink-0"
              >
                /
              </span>
            )}
            {isLast ? (
              <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-gray-500 hover:text-primary-500 dark:text-gray-400 dark:hover:text-accent-300 transition-colors truncate"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
