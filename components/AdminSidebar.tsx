"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// AdminSidebar - Navigation console dirigeant (refonte juin 2026).
//
// Pattern : sidebar fixe 240px avec sections accordéon.
//   - Chaque section est un bouton (icône + titre + chevron) cliquable.
//   - Open / close fluide via grid-template-rows transition (pas de
//     max-height fragile).
//   - Multi-open : on peut garder plusieurs sections ouvertes.
//   - Auto-open : la section qui contient la page courante est ouverte
//     par défaut (à chaque changement de route).
//   - Plus de slim icons-only / hover-expand (la barre de scroll qui
//     décalait les icônes était une régression).
// =============================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import clsx from "clsx";

type NavItem = {
  href: string;
  label: string;
  icon: string; // emoji simple (compat tous navigateurs, pas de lib)
  gate?: "Pro+";
};

type Section = {
  id: string; // slug stable (pour la persistance des etats open/close)
  title: string;
  icon: string;
  items: NavItem[];
};

// =============================================================================
// SECTIONS DE NAVIGATION
//
// Refonte mai 2026 (Sprint 1 simplicite) :
// On passe de 28 liens visibles a 12 (4 sections × 3 essentiels) + une
// section "Avance" repliee par defaut qui contient le reste.
//
// Principe : un DG/RSSI non-tech a besoin d'une douzaine de liens evidents,
// pas de 28. Les fonctions avancees (heatmap, forecast, licences Ed25519,
// etablissements...) restent accessibles via la section Avance, mais ne
// pesent pas sur la charge cognitive du quotidien.
// =============================================================================

const SECTIONS: Section[] = [
  {
    id: "pilotage",
    title: "Pilotage",
    icon: "📊",
    items: [
      { href: "/admin", label: "Tableau de bord", icon: "📊" },
      { href: "/admin/utilisateurs", label: "Utilisateurs", icon: "👥" },
      { href: "/admin/automations", label: "Automations", icon: "⚙️" },
    ],
  },
  {
    id: "sensibilisation",
    title: "Apprendre",
    icon: "🎓",
    items: [
      { href: "/admin/modules", label: "Modules", icon: "📚" },
      { href: "/admin/phishing", label: "Phishing", icon: "🎣", gate: "Pro+" },
      {
        href: "/admin/challenge",
        label: "Challenges",
        icon: "🏆",
        gate: "Pro+",
      },
    ],
  },
  {
    id: "conformité",
    title: "Conformité",
    icon: "🛡",
    items: [
      {
        href: "/admin/conformite-nis2",
        label: "NIS2",
        icon: "📋",
        gate: "Pro+",
      },
      { href: "/admin/dpo", label: "Espace DPO", icon: "🛡" },
      { href: "/admin/audit", label: "Journal d'audit", icon: "📜" },
    ],
  },
  {
    id: "integrations",
    title: "Intégrations",
    icon: "🔗",
    items: [
      { href: "/admin/integrations", label: "Webhooks", icon: "🔗" },
      {
        href: "/admin/sso-saml",
        label: "SSO SAML",
        icon: "🔐",
        gate: "Pro+",
      },
      {
        href: "/admin/api-keys",
        label: "API Keys",
        icon: "🔑",
        gate: "Pro+",
      },
    ],
  },
  {
    // Section "Avance" : tous les items secondaires regroupes ici. Repliee
    // par defaut dans l'UI (l'accordion ne s'ouvre que sur clic explicite).
    // Contient les fonctionnalites pointues (analytics avancees, simulations
    // multi-canaux, licences cryptographiques, multi-etablissements).
    id: "avance",
    title: "Avancé",
    icon: "🧰",
    items: [
      { href: "/admin/onboarding", label: "Premiers pas", icon: "🚀" },
      { href: "/admin/impact", label: "Impact mesuré", icon: "📈" },
      { href: "/admin/business", label: "Impact business", icon: "💼" },
      {
        href: "/admin/analytics/heatmap",
        label: "Heatmap métier",
        icon: "🔥",
      },
      {
        href: "/admin/analytics/forecast",
        label: "Forecast & trajectoires",
        icon: "🔮",
      },
      {
        href: "/admin/users/at-risk",
        label: "Utilisateurs vulnérables",
        icon: "⚠️",
      },
      { href: "/admin/groupes", label: "Groupes", icon: "🏷️" },
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
      {
        href: "/admin/quishing",
        label: "Quishing 🇫🇷",
        icon: "🔳",
        gate: "Pro+",
      },
      { href: "/admin/contributions", label: "Contributions", icon: "✍️" },
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
      { href: "/admin/license", label: "Licence Ed25519", icon: "🔐" },
    ],
  },
];

const SUPERADMIN_SECTIONS: Section[] = [
  {
    id: "moderation",
    title: "Modération",
    icon: "⚖️",
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

/**
 * Trouve la section qui contient la page courante. Renvoie son id (ou null
 * si aucun match -- cas /admin racine, qui matche le 1er item de Pilotage).
 */
function findActiveSectionId(
  path: string | null,
  sections: Section[],
): string | null {
  if (!path) return null;
  for (const s of sections) {
    if (s.items.some((i) => isActive(path, i.href))) return s.id;
  }
  return null;
}

// =============================================================================
// Composant principal
// =============================================================================

export default function AdminSidebar() {
  const path = usePathname();
  const { data: session } = useSession();
  const isSuperAdmin = (session?.user as any)?.role === "SUPERADMIN";
  const sections = useMemo(
    () => (isSuperAdmin ? [...SECTIONS, ...SUPERADMIN_SECTIONS] : SECTIONS),
    [isSuperAdmin],
  );

  const [drawerOpen, setDrawerOpen] = useState(false);

  // Set des sections ouvertes. Par defaut on ouvre uniquement la section
  // qui contient la page courante (les autres restent repliees, l'user
  // les ouvre au besoin). Etat non persiste entre sessions.
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const active = findActiveSectionId(path, sections);
    return active ? new Set([active]) : new Set();
  });

  // A chaque changement de route, on s'assure que la section active est
  // ouverte (cas ou l'user l'avait fermee manuellement et clique un lien
  // vers une page de cette section).
  useEffect(() => {
    const active = findActiveSectionId(path, sections);
    if (!active) return;
    setOpenSections((prev) => {
      if (prev.has(active)) return prev;
      const next = new Set(prev);
      next.add(active);
      return next;
    });
  }, [path, sections]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // === Sync de l'etat openSections avec le hover de la sidebar (desktop) ===
  // Comportement souhaite :
  //   - Souris quitte la sidebar (slim 56px) -> on referme TOUTES les
  //     sections en state (les chevrons / items reapparaitront repliees
  //     a la prochaine ouverture).
  //   - Souris entre sur la sidebar (expand 240px) -> on auto-ouvre
  //     UNIQUEMENT la section qui contient la page courante.
  //
  // Permet a l'utilisateur d'avoir un menu "frais" a chaque visite,
  // sans perdre les togglages manuels qu'il fait pendant qu'il survole
  // (l'etat est conserve tant qu'il reste dans la sidebar).
  const handleSidebarEnter = () => {
    const active = findActiveSectionId(path, sections);
    setOpenSections(active ? new Set([active]) : new Set());
  };
  const handleSidebarLeave = () => {
    setOpenSections(new Set());
  };

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
          DESKTOP - sidebar slim 56px qui s'agrandit a 240px au hover.
          Pattern Linear / Notion : icones-only par defaut, labels +
          chevrons + items reveles a l'hover (transition opacity 200ms).
          La sidebar etant fixed, le contenu principal est offset de 56px
          (lg:pl-14 du layout) et la version expanded passe par-dessus en
          overlay -- pas besoin de pousser le contenu.
          ===================================================================== */}
      <aside
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
        className="group hidden lg:flex fixed top-20 left-0 bottom-0 z-30 w-14 hover:w-60 flex-col bg-white dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 transition-[width] duration-200 ease-out shadow-[2px_0_0_0_transparent] hover:shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)]"
        aria-label="Navigation console"
      >
        <div className="px-4 pt-4 pb-2 whitespace-nowrap overflow-hidden">
          <p className="text-[10px] uppercase tracking-widest font-bold text-accent-500 flex items-center gap-2">
            <span aria-hidden="true">🎛</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              Console
            </span>
          </p>
        </div>

        {/* La nav peut scroller si l'ensemble des sections ouvertes excede
            la hauteur. scrollbar-gutter: stable evite le decalage des items
            quand la scrollbar apparait/disparait. */}
        <nav
          aria-label="Sections console admin"
          className="flex-1 overflow-y-auto overflow-x-hidden admin-nav-scroll px-2 py-2 space-y-1"
          style={{ scrollbarGutter: "stable" }}
        >
          {sections.map((section) => (
            <Accordion
              key={section.id}
              section={section}
              path={path}
              isOpen={openSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </nav>
      </aside>

      {/* =====================================================================
          MOBILE - drawer plein écran avec accordeon
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
            <header className="sticky top-0 bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 p-4 flex items-center justify-between z-10">
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
                <span aria-hidden="true">✕</span>
              </button>
            </header>

            <nav className="p-2 space-y-1">
              {sections.map((section) => (
                <Accordion
                  key={section.id}
                  section={section}
                  path={path}
                  isOpen={openSections.has(section.id)}
                  onToggle={() => toggleSection(section.id)}
                  variant="mobile"
                />
              ))}
            </nav>
          </aside>
        </>
      )}
    </>
  );
}

// =============================================================================
// Accordion section : header cliquable + liste d'items revelee a l'ouverture
// =============================================================================

function Accordion({
  section,
  path,
  isOpen,
  onToggle,
  variant = "desktop",
}: {
  section: Section;
  path: string | null;
  isOpen: boolean;
  onToggle: () => void;
  variant?: "desktop" | "mobile";
}) {
  // Section "active" si l'un de ses items matche le path courant (highlight).
  const sectionActive = section.items.some((i) => isActive(path, i.href));

  // En mode desktop slim (parent .group non hover), title et chevron sont
  // mis en `hidden` (vraiment out-of-flow, pas juste opacity:0) pour que
  // l'icone se centre proprement dans la sidebar 56px. Avec
  // `justify-center` au repos et `justify-start` au hover, l'icone est
  // pile au milieu en slim et alignee a gauche en mode large.
  const isDesktop = variant === "desktop";

  return (
    <div className="rounded-xl">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`section-${section.id}`}
        title={isDesktop ? section.title : undefined}
        className={clsx(
          "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors",
          sectionActive
            ? "text-primary-500 dark:text-accent-300"
            : "text-gray-700 dark:text-gray-300",
          "hover:bg-gray-100 dark:hover:bg-slate-800/60",
          isDesktop && "justify-center group-hover:justify-start",
        )}
      >
        <span aria-hidden="true" className="text-base shrink-0 w-5 text-center">
          {section.icon}
        </span>
        <span
          className={clsx(
            "text-left text-sm font-bold truncate whitespace-nowrap",
            isDesktop ? "hidden group-hover:block flex-1" : "flex-1",
          )}
        >
          {section.title}
        </span>
        <span
          aria-hidden="true"
          className={clsx(
            "shrink-0 text-xs text-gray-500 dark:text-gray-500 transition-transform duration-200",
            isOpen ? "rotate-90" : "rotate-0",
            isDesktop && "hidden group-hover:inline-block",
          )}
        >
          ▶
        </span>
      </button>

      {/* Animation grid-template-rows : passe de 0fr a 1fr pour deplier
          sans avoir besoin de connaitre la hauteur en pixels.
          En mode desktop slim (sans hover) on force grid-rows-[0fr] pour
          que les items des sections ouvertes ne debordent pas en hauteur
          tant que l'user n'expand pas la sidebar. */}
      <div
        id={`section-${section.id}`}
        className={clsx(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          isDesktop && isOpen && "grid-rows-[0fr] group-hover:grid-rows-[1fr]",
        )}
      >
        <div className="overflow-hidden">
          <ul className="pl-3 pr-1 pt-1 pb-2 space-y-0.5">
            {section.items.map((item) => (
              <li key={item.href}>
                <NavLink
                  item={item}
                  active={isActive(path, item.href)}
                  variant={variant}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// NavLink : item ordinaire dans une section
// =============================================================================

function NavLink({
  item,
  active,
  variant,
}: {
  item: NavItem;
  active: boolean;
  variant: "desktop" | "mobile";
}) {
  const isDesktop = variant === "desktop";
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={isDesktop ? item.label : undefined}
      className={clsx(
        "relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
        active
          ? variant === "mobile"
            ? "bg-accent-500 text-white font-bold shadow-sm"
            : "bg-accent-500/10 text-accent-500 dark:bg-accent-500/15 dark:text-accent-300 font-semibold"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800/60 hover:text-primary-500 dark:hover:text-accent-300",
      )}
    >
      {active && variant === "desktop" && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-accent-500"
        />
      )}
      <span aria-hidden="true" className="text-base shrink-0 w-4 text-center">
        {item.icon}
      </span>
      <span
        className={clsx(
          "flex-1 truncate whitespace-nowrap",
          isDesktop &&
            "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
        )}
      >
        {item.label}
      </span>
      {item.gate && (
        <span
          className={clsx(
            "shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full",
            active && variant === "mobile"
              ? "bg-white/20 text-white"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
            isDesktop &&
              "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
          )}
          title={`Inclus à partir de l'offre ${item.gate}`}
        >
          {item.gate}
        </span>
      )}
    </Link>
  );
}
