"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle";
import { getMascotById } from "@/lib/mascots";

// HeaderBar simplifié :
//  - Liens primaires visibles (md:) : Apprendre · Librairie · Console (si admin)
//  - Menu utilisateur déroulant : Profil · Famille · Boutique · Marketplace · Quitter
//  - Stats compactes (niveau + coins) cliquables → /profil
//  - Sur mobile (sm:) : seul le menu utilisateur (avatar) reste visible
export default function HeaderBar() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [stats, setStats] = useState<{
    xp: number;
    coins: number;
    level: number;
    levelName: string;
  } | null>(null);
  const [mascotSpecies, setMascotSpecies] = useState<string>("fox");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Charge stats + mascotte de l'user (1 seul fetch)
  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/me/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setStats({
          xp: data.xp,
          coins: data.coins,
          level: data.level,
          levelName: data.levelName,
        });
        if (data.mascotSpecies) setMascotSpecies(data.mascotSpecies);
      })
      .catch(() => {});
  }, [user?.id]);

  // Click outside pour refermer le menu
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const isAdmin =
    user?.role === "ADMIN" ||
    user?.role === "MANAGER" ||
    user?.role === "RSSI" ||
    user?.role === "SUPERADMIN";
  const canMarketplace =
    user?.role === "ADMIN" ||
    user?.role === "RSSI" ||
    user?.role === "SUPERADMIN";
  const mascot = getMascotById(mascotSpecies);
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href + "/"));

  // ESC pour refermer le menu utilisateur
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-gray-200 dark:border-slate-700">
      <nav
        aria-label="Navigation principale"
        className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3"
      >
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-primary-500 text-lg shrink-0"
        >
          <Image
            src="/logo-humanix-academie-192.png"
            alt="Humanix Académie"
            width={48}
            height={72}
            priority
            className="shrink-0 h-12 w-auto"
          />
          <span className="hidden sm:flex flex-col leading-tight">
            <span className="text-base font-extrabold">Humanix Académie</span>
            <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300 -mt-0.5">
              par Humanix-Cybersecurity
            </span>
          </span>
        </Link>

        {user ? (
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Liens primaires (desktop) */}
            <Link
              href="/apprendre"
              aria-current={isActive("/apprendre") ? "page" : undefined}
              className="hidden md:inline-block text-sm text-gray-600 dark:text-gray-300 hover:text-primary-500 font-medium px-2 py-1 aria-[current=page]:text-primary-500 aria-[current=page]:font-bold"
            >
              Apprendre
            </Link>
            <Link
              href="/librairie"
              aria-current={isActive("/librairie") ? "page" : undefined}
              className="hidden md:inline-block text-sm text-gray-600 dark:text-gray-300 hover:text-primary-500 font-medium px-2 py-1 aria-[current=page]:text-primary-500 aria-[current=page]:font-bold"
            >
              📚 Librairie
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                aria-current={isActive("/admin") ? "page" : undefined}
                className="hidden md:inline-block text-sm text-gray-600 dark:text-gray-300 hover:text-primary-500 font-medium px-2 py-1 aria-[current=page]:text-primary-500 aria-[current=page]:font-bold"
              >
                Console
              </Link>
            )}

            {/* Stats compactes (niveau + coins) — XP retiré (redondant) */}
            {stats && (
              <Link
                href="/profil"
                className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-primary-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl px-3 py-1.5 hover:scale-105 transition-transform border border-primary-100 dark:border-slate-600"
                title={`Niveau ${stats.level} — ${stats.levelName} · ${stats.xp} XP`}
              >
                <span className="text-xs font-bold text-primary-500">
                  N{stats.level}
                </span>
                <span className="text-xs font-bold text-amber-600">
                  🪙{stats.coins}
                </span>
              </Link>
            )}

            <ThemeToggle compact />

            {/* Menu utilisateur déroulant */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`Menu utilisateur de ${user.name ?? user.email}${menuOpen ? ", ouvert" : ", fermé"}`}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              >
                <span className="text-2xl" aria-hidden="true">
                  {mascot.emoji}
                </span>
                <span className="hidden lg:inline text-sm text-gray-700 dark:text-gray-200 max-w-[120px] truncate">
                  {user.name?.split(" ")[0] ?? "Moi"}
                </span>
                <span className="text-xs text-gray-400" aria-hidden="true">
                  ▾
                </span>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 py-2 animate-fadeIn"
                >
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                    <p className="text-sm font-bold text-primary-500">
                      {user.name ?? user.email}
                    </p>
                    {stats && (
                      <p className="text-xs text-gray-500">
                        Niveau {stats.level} · {stats.levelName}
                      </p>
                    )}
                  </div>

                  <MenuLink
                    href="/profil"
                    icon="👤"
                    label="Mon profil"
                    onClick={() => setMenuOpen(false)}
                  />
                  <MenuLink
                    href="/profil/securite"
                    icon="🔐"
                    label="Sécurité (mot de passe, 2FA)"
                    onClick={() => setMenuOpen(false)}
                  />
                  {isAdmin && (
                    <MenuLink
                      href="/profil/facturation"
                      icon="💳"
                      label="Facturation"
                      onClick={() => setMenuOpen(false)}
                    />
                  )}
                  <MenuLink
                    href="/profil/donnees"
                    icon="⚖️"
                    label="Mes données (RGPD)"
                    onClick={() => setMenuOpen(false)}
                  />
                  <MenuLink
                    href="/boutique"
                    icon="🛒"
                    label="Boutique"
                    onClick={() => setMenuOpen(false)}
                  />
                  <MenuLink
                    href="/famille"
                    icon="❤️"
                    label="Cyber Famille"
                    onClick={() => setMenuOpen(false)}
                  />
                  {canMarketplace && (
                    <MenuLink
                      href="/marketplace"
                      icon="🏛️"
                      label="Marketplace"
                      onClick={() => setMenuOpen(false)}
                    />
                  )}

                  {/* Liens secondaires sur mobile (en double avec la nav md:) */}
                  <div className="md:hidden border-t border-gray-100 dark:border-slate-700 mt-1 pt-1">
                    <MenuLink
                      href="/apprendre"
                      icon="🎯"
                      label="Apprendre"
                      onClick={() => setMenuOpen(false)}
                    />
                    <MenuLink
                      href="/librairie"
                      icon="📚"
                      label="Librairie"
                      onClick={() => setMenuOpen(false)}
                    />
                    <MenuLink
                      href="/lancement-oss"
                      icon="🌱"
                      label="Lancement OSS"
                      onClick={() => setMenuOpen(false)}
                    />
                    <MenuLink
                      href="/dpo"
                      icon="🛡"
                      label="Espace DPO"
                      onClick={() => setMenuOpen(false)}
                    />
                    <MenuLink
                      href="/communaute"
                      icon="🤝"
                      label="Communaute"
                      onClick={() => setMenuOpen(false)}
                    />
                    {isAdmin && (
                      <MenuLink
                        href="/admin"
                        icon="⚙️"
                        label="Console admin"
                        onClick={() => setMenuOpen(false)}
                      />
                    )}
                  </div>

                  <div className="border-t border-gray-100 dark:border-slate-700 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        signOut({ callbackUrl: "/demo" });
                      }}
                      role="menuitem"
                      className="w-full text-left px-4 py-2 text-sm text-warn hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      🚪 Quitter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/urgence-cyber"
              className="hidden md:inline text-sm text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 font-medium"
              title="Hub d'urgence cyber : que faire en cas d'incident"
            >
              🚨 Urgence
            </Link>
            <Link
              href="/famille"
              className="hidden sm:inline text-sm text-pink-600 hover:text-pink-700 font-medium"
            >
              ❤️ Famille
            </Link>
            <Link
              href="/manifeste"
              className="hidden md:inline text-sm text-gray-600 dark:text-gray-300 hover:text-primary-500 font-medium"
            >
              Manifeste
            </Link>
            <Link
              href="/lancement-oss"
              className="hidden md:inline text-sm text-emerald-600 dark:text-emerald-300 hover:text-emerald-700 dark:hover:text-emerald-200 font-medium"
              title="Lancement open source — mardi 26 mai 2026"
            >
              🌱 Open source
            </Link>
            <Link
              href="/dpo"
              className="hidden md:inline text-sm text-purple-600 dark:text-purple-300 hover:text-purple-700 dark:hover:text-purple-200 font-medium"
              title="Espace DPO — Humanix RGPD-by-design"
            >
              🛡 DPO
            </Link>
            <Link
              href="/communaute"
              className="hidden lg:inline text-sm text-gray-600 dark:text-gray-300 hover:text-primary-500 font-medium"
              title="Communaute — contribuer, suivre, echanger"
            >
              🤝 Communaute
            </Link>
            <Link
              href="/tarifs"
              className="hidden sm:inline text-sm text-gray-600 dark:text-gray-300 hover:text-primary-500 font-medium"
            >
              Tarifs
            </Link>
            <Link
              href="/connexion"
              className="hidden sm:inline text-sm text-gray-600 dark:text-gray-300 hover:text-primary-500 font-medium"
            >
              Connexion
            </Link>
            <ThemeToggle compact />
            <Link
              href="/signup?plan=decouverte"
              className="btn-primary text-sm py-2 px-4"
            >
              Créer un compte
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}

function MenuLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700"
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
