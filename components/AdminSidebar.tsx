"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// AdminSidebar - Navigation console dirigeant (refonte mai 2026).
//
// Design Linear/Vercel-like :
//   - Desktop (lg+) : sidebar fixed slim 56px, icons-only, tooltip au hover
//   - Mobile (< lg) : drawer plein écran déclenché par le burger de la TopBar
//
// Choix d'architecture (vs versions antérieures) :
//   - Plus de float-left ni de hack scroll listener pour le footer
//   - Plus de useEffect qui pose une classe sur <main>
//   - Tooltips natifs au hover (pas de menu wide qui prend la moitié de l'écran)
//   - Sections séparées par des dividers visuels discrets
// =============================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import clsx from "clsx";

type NavItem = {
  href: string;
  label: string;
  icon: string; // emoji simple (compat tous navigateurs, pas de lib)
  gate?: "Essentielle+" | "Pro+";
};

type Section = { title: string; items: NavItem[] };

const SECTIONS: Section[] = [
  {
    title: "Pilotage",
    items: [
      { href: "/admin", label: "Tableau de bord", icon: "📊" },
      { href: "/admin/onboarding", label: "Premiers pas", icon: "🚀" },
      { href: "/admin/impact", label: "Impact mesuré", icon: "📈" },
      { href: "/admin/business", label: "Impact business", icon: "💼" },
      { href: "/admin/utilisateurs", label: "Utilisateurs", icon: "👥" },
      { href: "/admin/groupes", label: "Groupes", icon: "🏷️" },
    ],
  },
  {
    title: "Sensibilisation",
    items: [
      { href: "/admin/modules", label: "Modules", icon: "📚" },
      {
        href: "/admin/challenge",
        label: "Challenges",
        icon: "🏆",
        gate: "Pro+",
      },
      { href: "/admin/phishing", label: "Phishing", icon: "🎣", gate: "Pro+" },
      {
        href: "/admin/vishing",
        label: "Vishing 🇫🇷",
        icon: "📞",
        gate: "Pro+",
      },
      {
        href: "/admin/smishing",
        label: "Smishing 🇫🇷",
        icon: "📱",
        gate: "Pro+",
      },
      { href: "/admin/contributions", label: "Contributions", icon: "✍️" },
    ],
  },
  {
    title: "Conformité",
    items: [
      { href: "/admin/audit", label: "Journal d'audit", icon: "📜" },
      { href: "/admin/dpo", label: "Espace DPO", icon: "🛡" },
      {
        href: "/admin/conformite-nis2",
        label: "Pack NIS2",
        icon: "📋",
        gate: "Pro+",
      },
      {
        href: "/admin/incidents",
        label: "Cyber-Réflexe",
        icon: "🚨",
        gate: "Pro+",
      },
      {
        href: "/admin/etablissements",
        label: "Établissements",
        icon: "🏢",
        gate: "Pro+",
      },
    ],
  },
  {
    title: "Intégrations",
    items: [
      {
        href: "/admin/api-keys",
        label: "API Keys",
        icon: "🔑",
        gate: "Essentielle+",
      },
      { href: "/admin/integrations", label: "Webhooks", icon: "🔗" },
      { href: "/admin/license", label: "Licence Ed25519", icon: "🔐" },
    ],
  },
];

const SUPERADMIN_SECTIONS: Section[] = [
  {
    title: "Modération",
    items: [
      { href: "/admin/moderation", label: "Marketplace", icon: "⚖️" },
      { href: "/admin/anecdotes", label: "Anecdotes", icon: "📅" },
    ],
  },
];

function isActive(path: string | null, href: string): boolean {
  if (!path) return false;
  return path === href || (href !== "/admin" && path.startsWith(href + "/"));
}

// =============================================================================
// Composant principal
// =============================================================================

export default function AdminSidebar() {
  const path = usePathname();
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as any)?.role === "SUPERADMIN";
  const sections = isSuperAdmin
    ? [...SECTIONS, ...SUPERADMIN_SECTIONS]
    : SECTIONS;

  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fermeture drawer mobile : ESC + changement de route
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [path]);

  // Expose le toggle drawer mobile à la TopBar via window event
  useEffect(() => {
    const handler = () => setDrawerOpen((v) => !v);
    window.addEventListener("admin-toggle-sidebar", handler);
    return () => window.removeEventListener("admin-toggle-sidebar", handler);
  }, []);

  return (
    <>
      {/* =====================================================================
          DESKTOP - sidebar slim 56px qui s'agrandit à 224px au hover.
          Pattern Notion / Mattermost / Linear : icons-only par défaut, labels
          révélés au hover avec animation CSS fluide (200ms).
          Le content principal reste offset de 56px (lg:pl-14 du layout) - la
          sidebar s'élargit en overlay par-dessus, pas besoin de pousser le
          contenu (pattern moins disruptif).
          ===================================================================== */}
      <aside
        className="group hidden lg:flex fixed top-20 left-0 bottom-0 z-30 w-14 hover:w-56 flex-col bg-white dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 transition-[width] duration-200 ease-out shadow-[2px_0_0_0_transparent] hover:shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)]"
        aria-label="Navigation console"
      >
        {/* Header (visible uniquement quand expanded) */}
        <div className="px-4 pt-4 pb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap overflow-hidden">
          <p className="text-[10px] uppercase tracking-widest font-bold text-accent-500 flex items-center gap-2">
            <span aria-hidden="true">🎛</span>
            <span>Console</span>
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden admin-nav-scroll py-2">
          {sections.map((section, idx) => (
            <div key={section.title}>
              {idx > 0 && (
                <div
                  className="my-3 mx-3 border-t border-gray-100 dark:border-slate-800"
                  aria-hidden="true"
                />
              )}
              {/* Titre de section : visible seulement au hover */}
              <p className="px-4 pt-1 pb-1 text-[9px] uppercase tracking-widest font-bold text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap overflow-hidden">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <ExpandableNavLink
                      item={item}
                      active={isActive(path, item.href)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* =====================================================================
          MOBILE - drawer plein écran
          ===================================================================== */}
      {drawerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fadeIn"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu console dirigeant"
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-950 shadow-2xl overflow-y-auto animate-slide-up"
          >
            <header className="sticky top-0 bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 p-4 flex items-center justify-between">
              <p className="font-bold text-primary-500 dark:text-accent-300 flex items-center gap-2">
                <span aria-hidden="true">🎛</span>
                <span>Console dirigeant</span>
              </p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fermer le menu"
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </header>

            <nav className="p-4 space-y-5">
              {sections.map((section) => (
                <div key={section.title}>
                  <h3 className="text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400 mb-2 px-3">
                    {section.title}
                  </h3>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <WideNavLink
                          item={item}
                          active={isActive(path, item.href)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>
        </>
      )}
    </>
  );
}

// =============================================================================
// Sous-composants : icône slim (desktop) + lien wide (drawer mobile)
// =============================================================================

/**
 * ExpandableNavLink - icône toujours visible, label révélé quand le parent
 * .group (l'aside) est hover. L'item actif a une barre verticale à gauche.
 */
function ExpandableNavLink({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={item.label}
      className={clsx(
        "relative mx-2 flex items-center gap-3 h-10 px-2.5 rounded-lg transition-colors overflow-hidden",
        active
          ? "bg-accent-500/10 text-accent-500 dark:bg-accent-500/15 dark:text-accent-300"
          : "text-gray-600 hover:bg-gray-100 hover:text-primary-500 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-accent-300",
      )}
    >
      {/* Indicateur barre verticale gauche pour l'item actif */}
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-[-8px] top-2 bottom-2 w-1 rounded-r-full bg-accent-500"
        />
      )}

      {/* Icône (toujours visible) */}
      <span aria-hidden="true" className="text-lg shrink-0 w-5 text-center">
        {item.icon}
      </span>

      {/* Label (révélé au hover du parent .group sur l'aside) */}
      <span className="flex-1 min-w-0 text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 truncate">
        {item.label}
      </span>

      {/* Badge gate (révélé au hover) */}
      {item.gate && (
        <span
          className={clsx(
            "shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150",
            active
              ? "bg-accent-500/20 text-accent-600 dark:text-accent-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
          )}
        >
          {item.gate}
        </span>
      )}
    </Link>
  );
}

function WideNavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all",
        active
          ? "bg-accent-500 text-white font-bold shadow-sm"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-primary-500 dark:hover:text-accent-300",
      )}
    >
      <span aria-hidden="true" className="text-base shrink-0">
        {item.icon}
      </span>
      <span className="truncate flex-1">{item.label}</span>
      {item.gate && (
        <span
          className={clsx(
            "text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0",
            active
              ? "bg-white/20 text-white"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
          )}
          title={`Inclus à partir de l'offre ${item.gate}`}
        >
          {item.gate}
        </span>
      )}
    </Link>
  );
}
