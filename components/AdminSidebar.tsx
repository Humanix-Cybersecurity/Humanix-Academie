"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// AdminSidebar - Navigation console dirigeant (refonte juin 2026).
//
// Pattern : barre slim 56px (icônes) qui s'étend à 240px au survol, avec
// sections accordéon ; tiroir plein écran sous lg.
//   - Chaque section est un bouton (icône + titre + chevron) cliquable.
//   - Open / close fluide via grid-template-rows transition (pas de
//     max-height fragile).
//   - Multi-open : on peut garder plusieurs sections ouvertes.
//   - Auto-open : au survol, la section qui contient la page courante
//     s'ouvre ; tout se replie quand le pointeur sort.
//   - Tactile sans survol (iPad) : la barre s'épingle au toucher
//     (`pinned` / `data-expanded`), cf. plus bas.
// =============================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { Role } from "@prisma/client";
import clsx from "clsx";
import { ROLE_RANK } from "@/lib/role-hierarchy";

type NavItem = {
  href: string;
  label: string;
  icon: string; // emoji simple (compat tous navigateurs, pas de lib)
  gate?: "Pro+" | "Enterprise";
  /**
   * Role minimum requis pour voir cet item. Defaut = MANAGER (premier
   * niveau d'admin). Pour les operations qui modifient la configuration
   * du tenant (campagnes phishing, automations, modules), passer a ADMIN.
   * Pour les vues conformite/securite/RH, passer a RSSI.
   *
   * Si l'utilisateur connecte a un rang < minRole, l'item est masque.
   * Si la section devient vide apres filtrage, elle n'est pas rendue.
   *
   * Ajoute le 22/05/2026 apres signalement Florian : un MANAGER voyait
   * "Automations" dans la sidebar alors que la page n'est pas accessible
   * pour lui (bug visuel + redirect/error a l'arrivee).
   */
  minRole?: Role;
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

// Convention pour les minRole :
// - MANAGER : lecture/vue, pilotage d'equipe (default si non specifie)
// - RSSI : conformite, securite, analytics sensibles, DPO
// - ADMIN : configuration du tenant (campagnes, automations, modules, SSO)
//
// Cf. lib/role-hierarchy.ts pour la justification. Les pages elles-memes
// font deja leurs propres checks server-side (defense en profondeur), la
// sidebar est juste cosmetique pour ne pas afficher de liens morts ou
// pages buggees pour le role courant.
const SECTIONS: Section[] = [
  {
    id: "pilotage",
    title: "Pilotage",
    icon: "📊",
    items: [
      { href: "/admin", label: "Tableau de bord", icon: "📊" },
      { href: "/admin/utilisateurs", label: "Utilisateurs", icon: "👥" },
      // Automations = workflows tenant (envois auto, regles de scoring,
      // triggers). Page ADMIN-only, bug en MANAGER (signale Florian
      // 2026-05-22).
      {
        href: "/admin/automations",
        label: "Automations",
        icon: "⚙️",
        minRole: "ADMIN",
      },
    ],
  },
  {
    id: "sensibilisation",
    title: "Apprendre",
    icon: "🎓",
    items: [
      // Modules = configuration des saisons/episodes du tenant.
      {
        href: "/admin/modules",
        label: "Modules",
        icon: "📚",
        minRole: "ADMIN",
      },
      // Maturite IA = dashboard KPIs IA (lecture etendue).
      {
        href: "/admin/maturite-ia",
        label: "Maturité IA",
        icon: "🧠",
        minRole: "RSSI",
      },
      // Phishing/Vishing/Smishing/Quishing = declenchement de campagnes.
      {
        href: "/admin/phishing",
        label: "Phishing",
        icon: "🎣",
        gate: "Pro+",
        minRole: "ADMIN",
      },
      {
        href: "/admin/challenge",
        label: "Challenges",
        icon: "🏆",
        gate: "Pro+",
        minRole: "ADMIN",
      },
      // Exercice de crise en direct = drill cyber collectif (polling live).
      {
        href: "/admin/exercice-crise",
        label: "Exercice de crise",
        icon: "🚨",
        gate: "Pro+",
        minRole: "ADMIN",
      },
    ],
  },
  {
    id: "conformité",
    title: "Conformité",
    icon: "🛡",
    items: [
      // Posture NIS2/ReCyF vivante (score qui evolue avec la formation + les exercices).
      {
        href: "/admin/nis2",
        label: "Ma posture NIS2",
        icon: "🎯",
        gate: "Pro+",
        minRole: "RSSI",
      },
      {
        href: "/admin/conformite",
        label: "Référentiels",
        icon: "🛡",
        gate: "Pro+",
        minRole: "RSSI",
      },
      {
        href: "/admin/conformite-nis2",
        label: "NIS2",
        icon: "📋",
        gate: "Pro+",
        minRole: "RSSI",
      },
      // Deux entrees, deux sujets. Elles ont ete une seule ligne « Espace DPO »
      // jusqu'au 2026-08-19 : un nom de ROLE, sous lequel se sont agreges deux
      // sujets sans rapport. On nomme desormais par sujet, ce qui rend le
      // melange impossible a refaire.
      {
        // La conformite de SON entreprise. A sa place au milieu des autres
        // referentiels, pas sous ce que Humanix fait de ses donnees.
        href: "/admin/conformite-rgpd",
        label: "Conformité RGPD",
        icon: "🧭",
        minRole: "RSSI",
      },
      {
        // Les cinq regles adoptees par l'organe qui decide : l'acte, l'affiche,
        // les attestations de lecture. Pivot du parcours Mairies.
        href: "/admin/regles",
        label: "Règles de l'organisation",
        icon: "📜",
        minRole: "RSSI",
      },
      {
        // Ce que HUMANIX detient. URL conservee : champ d'API publique.
        href: "/admin/dpo",
        label: "Vos données chez Humanix",
        icon: "🛡",
        minRole: "RSSI",
      },
      {
        href: "/admin/exposition",
        label: "Veille exposition",
        icon: "🛡️",
        gate: "Enterprise",
        minRole: "RSSI",
      },
      {
        href: "/admin/audit",
        label: "Journal d'audit",
        icon: "📜",
        minRole: "RSSI",
      },
    ],
  },
  {
    id: "integrations",
    title: "Intégrations",
    icon: "🔗",
    items: [
      {
        href: "/admin/integrations",
        label: "Webhooks",
        icon: "🔗",
        minRole: "ADMIN",
      },
      {
        href: "/admin/integrations/ciso-assistant",
        label: "CISO Assistant",
        icon: "🛡",
        minRole: "ADMIN",
      },
      {
        href: "/admin/sso-saml",
        label: "SSO SAML",
        icon: "🔐",
        gate: "Pro+",
        minRole: "ADMIN",
      },
      {
        href: "/admin/api-keys",
        label: "API Keys",
        icon: "🔑",
        gate: "Pro+",
        minRole: "ADMIN",
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
      // Premiers pas = wizard onboarding pour ADMIN qui configure le tenant.
      {
        href: "/admin/onboarding",
        label: "Premiers pas",
        icon: "🚀",
        minRole: "ADMIN",
      },
      // Impact = analytics business etendus, plutot pour RSSI/dirigeant.
      {
        href: "/admin/impact",
        label: "Impact mesuré",
        icon: "📈",
        minRole: "RSSI",
      },
      {
        href: "/admin/business",
        label: "Impact business",
        icon: "💼",
        minRole: "RSSI",
      },
      {
        href: "/admin/analytics/heatmap",
        label: "Heatmap métier",
        icon: "🔥",
        minRole: "RSSI",
      },
      {
        href: "/admin/analytics/forecast",
        label: "Forecast & trajectoires",
        icon: "🔮",
        minRole: "RSSI",
      },
      // Liste sensible (users a risque). RSSI minimum (donnees nominatives
      // de fragilite cyber).
      {
        href: "/admin/users/at-risk",
        label: "Collaborateurs à accompagner",
        icon: "⚠️",
        minRole: "RSSI",
      },
      // Groupes = organisation d'equipe, accessible MANAGER.
      { href: "/admin/groupes", label: "Groupes", icon: "🏷️" },
      {
        href: "/admin/vishing",
        label: "Vishing 🇫🇷",
        icon: "📞",
        gate: "Pro+",
        minRole: "ADMIN",
      },
      {
        href: "/admin/smishing",
        label: "Smishing 🇫🇷",
        icon: "📱",
        gate: "Pro+",
        minRole: "ADMIN",
      },
      {
        href: "/admin/quishing",
        label: "Quishing 🇫🇷",
        icon: "🔳",
        gate: "Pro+",
        minRole: "ADMIN",
      },
      {
        href: "/admin/contributions",
        label: "Contributions",
        icon: "✍️",
        minRole: "ADMIN",
      },
      {
        href: "/admin/incidents",
        label: "Cyber-Réflexe",
        icon: "🚨",
        gate: "Pro+",
        minRole: "ADMIN",
      },
      {
        href: "/admin/etablissements",
        label: "Établissements",
        icon: "🏢",
        gate: "Pro+",
        minRole: "ADMIN",
      },
      {
        href: "/admin/marque-blanche",
        label: "Marque blanche",
        icon: "🎨",
        gate: "Enterprise",
        minRole: "ADMIN",
      },
      {
        href: "/admin/revendeur",
        label: "Revendeur",
        icon: "🏷️",
        gate: "Enterprise",
        minRole: "ADMIN",
      },
      // Licence Ed25519 = config crypto sensible.
      {
        href: "/admin/license",
        label: "Licence Ed25519",
        icon: "🔐",
        minRole: "ADMIN",
      },
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
  // Rang numerique du role courant (defaut : MANAGER = 1 si pas de session
  // ou role inconnu, ce qui est conservateur - pendant le tres bref temps
  // de chargement de useSession on n'affiche que les items MANAGER+).
  const currentRole = (session?.user?.role as Role) ?? "MANAGER";
  const currentRank = ROLE_RANK[currentRole] ?? ROLE_RANK.MANAGER;
  const isSuperAdmin = currentRole === "SUPERADMIN";

  // Filtre les sections : on garde un item si son minRole (default MANAGER)
  // est <= au rang courant. Si une section finit vide apres filtrage, on
  // ne la rend pas du tout (evite les accordeons fantomes).
  const sections = useMemo(() => {
    const all = isSuperAdmin ? [...SECTIONS, ...SUPERADMIN_SECTIONS] : SECTIONS;
    return all
      .map((section) => ({
        ...section,
        items: section.items.filter((it) => {
          const minRank = ROLE_RANK[it.minRole ?? "MANAGER"];
          return currentRank >= minRank;
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [currentRank, isSuperAdmin]);

  const [drawerOpen, setDrawerOpen] = useState(false);

  // Set des sections ouvertes. Comportement : a l'arrivee sur la console
  // (et a chaque changement de route), TOUTES les sections sont repliees.
  // L'auto-ouverture se fait uniquement au hover desktop (cf.
  // handleSidebarEnter) ou par clic explicite de l'utilisateur. Cela donne
  // une console visuellement calme au premier coup d'oeil.
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // === Epinglage de la barre (ecrans tactiles) ===
  // Tailwind v4 n'applique `hover:` que sous `@media (hover: hover)` : sur
  // un iPad sans trackpad, la barre slim ne s'etendait jamais et ses items
  // (hidden / grid-rows-[0fr] hors survol) restaient inaccessibles. `pinned`
  // pose `data-expanded` sur l'aside, et chaque classe `group-hover:` a son
  // jumeau `group-data-expanded:`. Toucher le titre ou une section de la
  // barre repliee l'epingle ; toucher hors de la barre, Echap ou un
  // changement de route la replie. A la souris rien ne change : le survol
  // suffit, et le clic sur le titre maintient la barre ouverte.
  const [pinned, setPinned] = useState(false);
  const pin = (sectionId?: string) => {
    setPinned(true);
    const target = sectionId ?? findActiveSectionId(path, sections);
    setOpenSections(target ? new Set([target]) : new Set());
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
    if (pinned || !canHover()) return;
    const active = findActiveSectionId(path, sections);
    setOpenSections(active ? new Set([active]) : new Set());
  };
  const handleSidebarLeave = () => {
    if (pinned || !canHover()) return;
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

  // Barre epinglee : Echap la replie.
  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pinned]);

  // Changement de route : le tiroir mobile se ferme, la barre epinglee se
  // replie (la section a rouvrir sera recalculee au prochain epinglage).
  useEffect(() => {
    setDrawerOpen(false);
    setPinned(false);
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

          `top` vient de --app-chrome-h (cf. app/globals.css) et NON d'un
          top-20 en dur : en mode demo le DemoBanner s'insere au-dessus du
          header, et la sidebar se retrouvait masquee derriere lui.
          ===================================================================== */}
      <aside
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
        data-expanded={pinned || undefined}
        className="group hidden lg:flex fixed top-[var(--app-chrome-h)] left-0 bottom-0 z-30 w-14 hover:w-60 data-expanded:w-60 flex-col bg-white dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 transition-[width] duration-200 ease-out shadow-[2px_0_0_0_transparent] hover:shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)] data-expanded:shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)]"
        aria-label="Navigation console"
      >
        {/* Le titre est un bouton : il epingle / replie la barre (seul moyen
            de l'ouvrir sans survol, cf. `pinned`). */}
        <button
          type="button"
          onClick={() => (pinned ? setPinned(false) : pin())}
          aria-expanded={pinned}
          aria-controls="admin-nav-desktop"
          aria-label={pinned ? "Replier le menu" : "Déplier le menu"}
          title={pinned ? "Replier le menu" : "Déplier le menu"}
          className="w-full text-left px-4 pt-4 pb-2 whitespace-nowrap overflow-hidden"
        >
          <span className="text-[10px] uppercase tracking-widest font-bold text-accent-500 flex items-center gap-2">
            <span aria-hidden="true">🎛</span>
            <span className="opacity-0 group-hover:opacity-100 group-data-expanded:opacity-100 transition-opacity duration-150">
              Console
            </span>
          </span>
        </button>

        {/* La nav peut scroller si l'ensemble des sections ouvertes excede
            la hauteur. scrollbar-gutter: stable evite le decalage des items
            quand la scrollbar apparait/disparait. */}
        <nav
          id="admin-nav-desktop"
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
              onToggle={() => {
                // Barre repliee sur un ecran sans survol : toucher une
                // section epingle la barre et ouvre cette section.
                if (!pinned && !canHover()) pin(section.id);
                else toggleSection(section.id);
              }}
            />
          ))}
        </nav>
      </aside>

      {/* Barre epinglee : un voile referme au toucher hors de la barre,
          comme le tiroir mobile. Sous l'aside (z-30), au-dessus du contenu. */}
      {pinned && (
        <div
          className="hidden lg:block fixed top-[var(--app-chrome-h)] left-0 right-0 bottom-0 z-20 bg-black/20"
          onClick={() => setPinned(false)}
          aria-hidden="true"
        />
      )}

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

// Tailwind v4 n'applique `hover:` que sous `@media (hover: hover)` : sur un
// ecran tactile sans pointeur fin (iPad sans trackpad), rien ne survole et la
// barre doit s'epingler au toucher. Evalue a l'evenement, jamais au rendu
// (pas de window cote serveur, pas de desaccord d'hydratation).
function canHover(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches
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
          isDesktop &&
            "justify-center group-hover:justify-start group-data-expanded:justify-start",
        )}
      >
        <span aria-hidden="true" className="text-base shrink-0 w-5 text-center">
          {section.icon}
        </span>
        <span
          className={clsx(
            "text-left text-sm font-bold truncate whitespace-nowrap",
            isDesktop
              ? "hidden group-hover:block group-data-expanded:block flex-1"
              : "flex-1",
          )}
        >
          {section.title}
        </span>
        <span
          aria-hidden="true"
          className={clsx(
            "shrink-0 text-xs text-gray-500 dark:text-gray-500 transition-transform duration-200",
            isOpen ? "rotate-90" : "rotate-0",
            isDesktop &&
              "hidden group-hover:inline-block group-data-expanded:inline-block",
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
          isDesktop &&
            isOpen &&
            "grid-rows-[0fr] group-hover:grid-rows-[1fr] group-data-expanded:grid-rows-[1fr]",
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
            "opacity-0 group-hover:opacity-100 group-data-expanded:opacity-100 transition-opacity duration-150",
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
              "opacity-0 group-hover:opacity-100 group-data-expanded:opacity-100 transition-opacity duration-150",
          )}
          title={`Inclus à partir de l'offre ${item.gate}`}
        >
          {item.gate}
        </span>
      )}
    </Link>
  );
}
