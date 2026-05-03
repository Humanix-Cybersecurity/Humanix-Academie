"use client";

// =============================================================================
// AdminTopBar — Barre supérieure de la console dirigeant.
//
// Style Linear/Vercel : sticky top, hauteur compacte, breadcrumb dynamique,
// actions globales à droite (search palette stub, notifications, user menu).
//
// Composant client : besoin de usePathname pour le breadcrumb réactif et
// de useState pour l'état des popovers.
// =============================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  user: { name?: string; email?: string };
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
    const label = SEGMENT_LABELS[seg]
      ?? (seg.length > 20 ? seg.slice(0, 8) + "…" : seg.charAt(0).toUpperCase() + seg.slice(1));
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

export default function AdminTopBar({ user }: Props) {
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
        <span aria-hidden="true" className="text-lg">☰</span>
      </button>

      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumb} />

      {/* Actions globales à droite */}
      <div className="ml-auto flex items-center gap-1">
        <SearchButton />
        <NotificationButton />
        <UserMenu user={user} />
      </div>
    </header>
  );
}

// =============================================================================
// Sous-composants
// =============================================================================

function Breadcrumb({ items }: { items: { label: string; href: string }[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-sm min-w-0 overflow-hidden">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item.href} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && (
              <span aria-hidden="true" className="text-gray-300 dark:text-slate-600 shrink-0">
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

function SearchButton() {
  return (
    <button
      type="button"
      title="Recherche globale (à venir)"
      className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700"
      onClick={() => alert("Recherche globale — à venir Sprint 5")}
    >
      <span aria-hidden="true">🔎</span>
      <span className="hidden md:inline">Rechercher</span>
      <kbd className="hidden md:inline px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-[10px] font-mono">
        ⌘K
      </kbd>
    </button>
  );
}

function NotificationButton() {
  // Stub — sera connecté à un endpoint de notifications Sprint 5
  const [count] = useState<number>(0);
  return (
    <button
      type="button"
      title="Notifications"
      className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300"
      aria-label={`Notifications (${count})`}
    >
      <span aria-hidden="true" className="text-base">🔔</span>
      {count > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}

function UserMenu({ user }: { user: { name?: string; email?: string } }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Click outside pour fermer
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const initials = (user.name ?? user.email ?? "?")
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
      >
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
          {initials || "?"}
        </span>
        <span aria-hidden="true" className="hidden sm:inline text-xs text-gray-500">▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden"
        >
          <div className="px-3 py-2.5 border-b border-gray-100 dark:border-slate-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {user.name ?? "Utilisateur"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
          </div>
          <ul className="py-1.5 text-sm">
            <MenuItem href="/profil" icon="👤" label="Mon profil" />
            <MenuItem href="/admin/api-keys" icon="🔑" label="Clés API" />
            <MenuItem href="/admin/integrations" icon="🔗" label="Intégrations" />
            <li role="separator" className="my-1 border-t border-gray-100 dark:border-slate-800" />
            <MenuItem href="/api/auth/signout" icon="🚪" label="Se déconnecter" danger />
          </ul>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  href, icon, label, danger,
}: {
  href: string; icon: string; label: string; danger?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        role="menuitem"
        className={`flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${
          danger ? "text-rose-600 dark:text-rose-400" : "text-gray-700 dark:text-gray-200"
        }`}
      >
        <span aria-hidden="true" className="text-sm">{icon}</span>
        <span>{label}</span>
      </Link>
    </li>
  );
}
