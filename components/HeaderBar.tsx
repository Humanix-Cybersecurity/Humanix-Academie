"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// HeaderBar - refonte pro mai 2026 (cible : credibilite "French Tech")
//
// Probleme avant : 8 liens inline pour le visiteur (Urgence, Famille, Manifeste,
// Open source, DPO, Communaute, Tarifs, Connexion) + emojis melanges + CTA
// dupliques (Connexion + Créer un compte). Donnait l'impression d'usine a
// gaz, pas d'un editeur SaaS scalable.
//
// Refonte :
//
// VISITEUR :
//   - Logo + brand (gauche)
//   - 3 entrees nav : Produit ▾ · Solutions ▾ · Communaute (droite)
//   - 1 CTA primaire : Demo (la conversion qui compte)
//   - Connexion en lien discret + ThemeToggle
//   - Mobile : burger → drawer plein-ecran avec sections groupees
//
// APPRENANT (logue) :
//   - Logo + brand
//   - Nav primaire : Apprendre · Librairie · (Admin Console si admin)
//   - Stats compactes (level + coins) + ThemeToggle
//   - Avatar dropdown : profil, sécurité, RGPD, boutique, famille, marketplace,
//     quitter
//
// Inspiration design : Vercel, Linear, Stripe, Posthog. Pas d'emojis dans
// la nav primaire (creent du bruit visuel pro). Emojis OK dans les dropdowns
// pour aider l'identification rapide des items.

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession, signOut } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle";
import { getMascotById } from "@/lib/mascots";

// =============================================================================
// Definitions des dropdowns visiteur (Produit, Solutions)
// =============================================================================

type DropdownItem = {
  href: string;
  label: string;
  description: string;
  emoji: string;
  /**
   * Si true : ouvre le lien dans un nouvel onglet (target=_blank +
   * rel=noopener noreferrer + icone ↗). Sert pour pointer vers le
   * sous-domaine demo.humanix-cybersecurity.fr depuis la prod
   * commerciale, sans confondre le visiteur avec le vrai SaaS.
   */
  external?: boolean;
};

// URL publique du sous-domaine demo, deploye sur une instance separee
// avec DEMO_MODE=true. Override possible via NEXT_PUBLIC_DEMO_URL (utile
// pour les self-hosteurs qui veulent leur propre URL demo, ou pour
// debrancher la demo en mettant une chaine vide).
const DEMO_PUBLIC_URL =
  process.env.NEXT_PUBLIC_DEMO_URL ?? "https://demo.humanix-cybersecurity.fr";

// Construit l'entree "Demo" du dropdown selon le contexte :
//   - En DEMO_MODE (instance demo elle-meme)  : href local /demo
//   - En prod commerciale                     : href externe vers le
//     sous-domaine demo. target=_blank pour bien signaler que c'est
//     une autre instance, pas le SaaS principal.
// Si DEMO_PUBLIC_URL est vide ET pas en DEMO_MODE -> retourne null
// (le self-hosteur peut completement masquer la mention demo).
function buildDemoDropdownItem(demoMode: boolean): DropdownItem | null {
  if (demoMode) {
    return {
      href: "/demo",
      label: "Démo",
      description: "Tester en 2 minutes, sans inscription",
      emoji: "🎮",
    };
  }
  if (!DEMO_PUBLIC_URL) return null;
  return {
    href: DEMO_PUBLIC_URL,
    label: "Démo",
    description: "Tester sans inscription (instance dédiée)",
    emoji: "🎮",
    external: true,
  };
}
const PRODUIT_ITEMS_BASE: DropdownItem[] = [
  {
    href: "/rejoindre",
    label: "Comment commencer",
    description: "6 profils, 6 chemins. Trouvez le vôtre en 30 secondes.",
    emoji: "🧭",
  },
  {
    href: "/tarifs",
    label: "Tarifs",
    description: "Self-host gratuit ou cloud à partir de 0 €/mois",
    emoji: "💶",
  },
  {
    href: "/certificat",
    label: "Certificat",
    description:
      "Bouclier assurance cyber + preuve conformité NIS2. Démarche ANSSI.",
    emoji: "🛡️",
  },
  {
    href: "/comparatif",
    label: "Comparatif",
    description: "Notre lecture honnête face à 5 concurrents",
    emoji: "⚖️",
  },
  {
    href: "/integrations",
    label: "Intégrations",
    description: "Connecteurs CISO Assistant, SIEM, IAM, RH",
    emoji: "🔌",
  },
  {
    href: "/marketplace",
    label: "Marketplace",
    description: "Modules signés par des experts français",
    emoji: "🏛",
  },
  {
    href: "/famille",
    label: "Cyber Famille",
    description: "Sphère personnelle gratuite, invitations proches",
    emoji: "❤️",
  },
];
function buildProduitItems(demoMode: boolean): DropdownItem[] {
  // L'entree "Demo" est inseree en 2e position (apres "Comment commencer"),
  // ordre historique. En DEMO_MODE elle pointe sur /demo local, en prod
  // sur le sous-domaine demo externe (target=_blank). Cf.
  // buildDemoDropdownItem. Retourne null si DEMO_PUBLIC_URL est vide et
  // pas en demoMode -> l'entree est alors omise.
  const demoItem = buildDemoDropdownItem(demoMode);
  if (!demoItem) return PRODUIT_ITEMS_BASE;
  return [PRODUIT_ITEMS_BASE[0], demoItem, ...PRODUIT_ITEMS_BASE.slice(1)];
}

const SOLUTIONS_ITEMS: DropdownItem[] = [
  {
    href: "/librairie",
    label: "Librairie",
    description:
      "30+ articles courts sur le phishing, le RGPD, l'IA, les mots de passe — sans inscription",
    emoji: "📚",
  },
  {
    href: "/dpo",
    label: "Espace DPO",
    description: "RGPD-by-design, AIPD, registre fourni",
    emoji: "🛡",
  },
  {
    href: "/pour-les-daf",
    label: "Pour les DAF",
    description: "ROI €, Pack NIS2, fraude évitée - pas de jargon cyber",
    emoji: "💼",
  },
  {
    href: "/ressources",
    label: "Ressources",
    description: "Cyber-météo, observatoire fuites, audit flash, anecdotes",
    emoji: "📂",
  },
  {
    href: "/securite",
    label: "Trust Center",
    description: "Audit public, conformité, transparence",
    emoji: "🔐",
  },
  {
    href: "/manifeste",
    label: "Manifeste",
    description: "Pourquoi Humanix existe",
    emoji: "📜",
  },
  {
    href: "/urgence-cyber",
    label: "Urgence cyber",
    description: "Hub d'incident - que faire en 60 minutes",
    emoji: "🚨",
  },
];

// =============================================================================
// Composant principal
// =============================================================================

/**
 * Props :
 *   demoMode : passe `true` quand DEMO_MODE=true cote serveur. Quand `false`,
 *              le CTA "Démo" et la section démo du drawer mobile sont caches
 *              -- la prod commerciale ne doit pas exposer la page /demo aux
 *              visiteurs. Defense en profondeur : la page /demo elle-même
 *              retourne 404 via app/demo/layout.tsx server side.
 */
export default function HeaderBar({ demoMode = false }: { demoMode?: boolean }) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [stats, setStats] = useState<{
    xp: number;
    coins: number;
    level: number;
    levelName: string;
  } | null>(null);
  const [mascotSpecies, setMascotSpecies] = useState<string>("fox");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // mounted : evite hydration mismatch lors du portal vers document.body.
  // Sans cela, React rend le portal cote SSR (innaccessible au document) et
  // affiche un mismatch warning au mount + flash sur des navigateurs lents.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href + "/"));

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

  // Click outside pour refermer le menu user
  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      )
        setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [userMenuOpen]);

  // ESC pour refermer les menus + drawer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setUserMenuOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Ferme le drawer mobile au changement de route
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll quand le drawer mobile est ouvert
  // (sinon le contenu de la page scroll derriere -- comportement inattendu)
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  const isAdmin =
    user?.role === "ADMIN" ||
    user?.role === "MANAGER" ||
    user?.role === "RSSI" ||
    user?.role === "SUPERADMIN";
  const isSuperadmin = user?.role === "SUPERADMIN";
  const canMarketplace =
    user?.role === "ADMIN" ||
    user?.role === "RSSI" ||
    user?.role === "SUPERADMIN";
  const mascot = getMascotById(mascotSpecies);

  return (
    <>
    <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-800/80">
      <nav
        aria-label="Navigation principale"
        className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4"
      >
        {/* ============ Brand ============ */}
        <Link
          href="/"
          className="flex items-center gap-2.5 shrink-0 group"
          aria-label="Humanix Académie - accueil"
        >
          <Image
            src="/logo-humanix-academie-192.png"
            alt=""
            width={40}
            height={60}
            priority
            className="shrink-0 h-9 w-auto group-hover:scale-105 transition-transform"
          />
          <span className="hidden sm:flex flex-col leading-tight">
            <span className="text-base font-extrabold text-primary-500 dark:text-accent-300 tracking-tight">
              Humanix Académie
            </span>
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 -mt-0.5">
              par Humanix-Cybersecurity
            </span>
          </span>
        </Link>

        {/* ============ Nav apprenant logue ============ */}
        {user ? (
          <div className="flex items-center gap-1 sm:gap-2">
            <NavLink
              href="/apprendre"
              isActive={isActive("/apprendre")}
              className="hidden md:inline-flex"
            >
              Apprendre
            </NavLink>
            <NavLink
              href="/librairie"
              isActive={isActive("/librairie")}
              className="hidden md:inline-flex"
            >
              Librairie
            </NavLink>
            {isAdmin && (
              <NavLink
                href="/admin"
                isActive={isActive("/admin")}
                className="hidden md:inline-flex"
              >
                Console
              </NavLink>
            )}
            {isSuperadmin && (
              <NavLink
                href="/superadmin"
                isActive={isActive("/superadmin")}
                className="hidden md:inline-flex"
              >
                <span className="inline-flex items-center gap-1">
                  Super-admin
                  <span
                    aria-hidden="true"
                    className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500"
                  />
                </span>
              </NavLink>
            )}

            {/* Stats compactes (niveau + coins) */}
            {stats && (
              <Link
                href="/profil"
                className="hidden sm:inline-flex items-center gap-1.5 bg-gradient-to-r from-primary-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 rounded-full pl-3 pr-3 py-1 hover:scale-[1.03] transition-transform border border-primary-100/80 dark:border-slate-600/80 ml-1"
                title={`Niveau ${stats.level} - ${stats.levelName} · ${stats.xp} XP`}
              >
                <span className="text-[11px] font-bold text-primary-500 dark:text-accent-300 tabular-nums">
                  N{stats.level}
                </span>
                <span className="w-px h-3 bg-primary-200 dark:bg-slate-600" />
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  🪙 {stats.coins}
                </span>
              </Link>
            )}

            <ThemeToggle compact />

            {/* Avatar dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                aria-label={`Menu utilisateur de ${user.name ?? user.email}${userMenuOpen ? ", ouvert" : ", fermé"}`}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              >
                <span className="text-2xl" aria-hidden="true">
                  {mascot.emoji}
                </span>
                <span className="hidden lg:inline text-sm text-gray-700 dark:text-gray-200 max-w-[120px] truncate">
                  {user.name?.split(" ")[0] ?? "Moi"}
                </span>
                <span className="text-xs text-gray-500" aria-hidden="true">
                  ▾
                </span>
              </button>

              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 py-2 animate-fadeIn"
                >
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                    <p className="text-sm font-bold text-primary-500 dark:text-accent-300 truncate">
                      {user.name ?? user.email}
                    </p>
                    {stats && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Niveau {stats.level} · {stats.levelName}
                      </p>
                    )}
                  </div>

                  <UserMenuItem
                    href="/profil"
                    icon="👤"
                    label="Mon profil"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <UserMenuItem
                    href="/profil/securite"
                    icon="🔐"
                    label="Sécurité (2FA, sessions)"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  {isAdmin && (
                    <UserMenuItem
                      href="/profil/facturation"
                      icon="💳"
                      label="Facturation"
                      onClick={() => setUserMenuOpen(false)}
                    />
                  )}
                  <UserMenuItem
                    href="/profil/donnees"
                    icon="⚖️"
                    label="Mes données (RGPD)"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <UserMenuItem
                    href="/boutique"
                    icon="🛒"
                    label="Boutique"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <UserMenuItem
                    href="/famille"
                    icon="❤️"
                    label="Cyber Famille"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  {canMarketplace && (
                    <UserMenuItem
                      href="/marketplace"
                      icon="🏛"
                      label="Marketplace"
                      onClick={() => setUserMenuOpen(false)}
                    />
                  )}

                  {/* Liens secondaires sur mobile (en double avec la nav md:) */}
                  <div className="md:hidden border-t border-gray-100 dark:border-slate-700 mt-1 pt-1">
                    <UserMenuItem
                      href="/apprendre"
                      icon="🎯"
                      label="Apprendre"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <UserMenuItem
                      href="/librairie"
                      icon="📚"
                      label="Librairie"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    {isAdmin && (
                      <UserMenuItem
                        href="/admin"
                        icon="⚙️"
                        label="Console admin"
                        onClick={() => setUserMenuOpen(false)}
                      />
                    )}
                    {isSuperadmin && (
                      <UserMenuItem
                        href="/superadmin"
                        icon="⭐"
                        label="Super-admin (cross-tenant)"
                        onClick={() => setUserMenuOpen(false)}
                      />
                    )}
                  </div>

                  <div className="border-t border-gray-100 dark:border-slate-700 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        // Demo : retour au selecteur de comptes /demo.
                        // Prod : retour a la home (le selecteur n'existe pas).
                        signOut({ callbackUrl: demoMode ? "/demo" : "/" });
                      }}
                      role="menuitem"
                      className="w-full text-left px-4 py-2 text-sm text-warn hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg mx-1"
                    >
                      🚪 Se déconnecter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ============ Nav visiteur ============ */
          <>
            {/* Desktop nav (md+) */}
            <div className="hidden md:flex items-center gap-1">
              <NavDropdown
                label="Notre offre"
                items={buildProduitItems(demoMode)}
              />
              <NavDropdown label="Outils" items={SOLUTIONS_ITEMS} />
              <NavLink href="/communaute" isActive={isActive("/communaute")}>
                Communauté
              </NavLink>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/connexion"
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-accent-300 font-medium px-3 py-2"
              >
                Connexion
              </Link>
              <ThemeToggle compact />
              {demoMode ? (
                <Link
                  href="/demo"
                  className="bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition shadow-sm hover:shadow-md"
                >
                  Démo
                </Link>
              ) : (
                <Link
                  href="/inscription"
                  className="bg-accent-500 hover:bg-accent-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition shadow-sm hover:shadow-md"
                >
                  Inscription gratuite
                </Link>
              )}
            </div>

            {/* Mobile burger */}
            <div className="flex md:hidden items-center gap-2">
              <ThemeToggle compact />
              <button
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={
                  mobileOpen ? "Fermer le menu" : "Ouvrir le menu"
                }
                aria-expanded={mobileOpen}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              >
                <BurgerIcon open={mobileOpen} />
              </button>
            </div>
          </>
        )}
      </nav>

      {/* Le drawer mobile est rendu via un PORTAL hors du <header> --
          voir le bloc createPortal plus bas. Sans ca, le `backdrop-blur-md`
          du header crée un stacking context isole qui enferme le drawer
          z-50 et le rend invisible au-dessus du contenu de la page. */}
    </header>
    {/* ============ Drawer mobile visiteur (portal) ============ */}
    {mounted &&
      !user &&
      mobileOpen &&
      createPortal(
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm animate-fadeIn"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
            className="fixed top-16 inset-x-0 bottom-0 z-[70] bg-white dark:bg-slate-900 overflow-y-auto animate-slide-up shadow-2xl"
          >
            <div className="px-4 py-6 space-y-6">
              <MobileSection
                title="Notre offre"
                items={buildProduitItems(demoMode)}
              />
              <MobileSection title="Outils" items={SOLUTIONS_ITEMS} />
              <MobileSection
                title="Communauté"
                items={[
                  {
                    href: "/communaute",
                    label: "Rejoindre",
                    description:
                      "4 portes d'entrée - utilisateur, dev, contenu, écosystème",
                    emoji: "🤝",
                  },
                ]}
              />

              <div className="pt-4 border-t border-gray-200 dark:border-slate-700 flex flex-col gap-3">
                <Link
                  href="/connexion"
                  className="text-center px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 font-medium hover:border-primary-300"
                >
                  Connexion
                </Link>
                {demoMode ? (
                  <Link
                    href="/demo"
                    className="text-center bg-primary-500 hover:bg-primary-600 text-white font-bold px-4 py-3 rounded-xl shadow-sm"
                  >
                    Démarrer la démo
                  </Link>
                ) : (
                  <Link
                    href="/inscription"
                    className="text-center bg-accent-500 hover:bg-accent-600 text-white font-bold px-4 py-3 rounded-xl shadow-sm"
                  >
                    Inscription gratuite
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
  </>
  );
}

// =============================================================================
// Sous-composants
// =============================================================================

function NavLink({
  href,
  isActive,
  className = "",
  children,
}: {
  href: string;
  isActive: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`${className} text-sm text-gray-700 dark:text-gray-300 hover:text-primary-500 dark:hover:text-accent-300 font-medium px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition aria-[current=page]:text-primary-500 dark:aria-[current=page]:text-accent-300 aria-[current=page]:font-bold`}
    >
      {children}
    </Link>
  );
}

function NavDropdown({
  label,
  items,
}: {
  label: string;
  items: DropdownItem[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div
      className="relative"
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="text-sm text-gray-700 dark:text-gray-300 hover:text-primary-500 dark:hover:text-accent-300 font-medium px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition inline-flex items-center gap-1"
      >
        {label}
        <span
          aria-hidden="true"
          className={`text-[10px] transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full pt-1.5 w-80 z-50"
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-2 animate-fadeIn">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition group"
              >
                <span
                  aria-hidden="true"
                  className="text-2xl shrink-0 leading-none mt-0.5 w-7 text-center"
                >
                  {item.emoji}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-primary-500 dark:text-accent-300 group-hover:underline-offset-4">
                    {item.label}
                    {item.external && (
                      <span
                        aria-label="(ouvre dans un nouvel onglet)"
                        className="ml-1 text-[10px] text-gray-400 dark:text-gray-500"
                      >
                        ↗
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileSection({
  title,
  items,
}: {
  title: string;
  items: DropdownItem[];
}) {
  return (
    <section>
      <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-accent-500 mb-2 px-2">
        {title}
      </h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition"
            >
              <span
                aria-hidden="true"
                className="text-2xl shrink-0 leading-none mt-0.5 w-7 text-center"
              >
                {item.emoji}
              </span>
              <div className="min-w-0">
                <p className="text-base font-bold text-primary-500 dark:text-accent-300">
                  {item.label}
                  {item.external && (
                    <span
                      aria-label="(ouvre dans un nouvel onglet)"
                      className="ml-1 text-xs text-gray-400 dark:text-gray-500"
                    >
                      ↗
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function UserMenuItem({
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
      className="flex items-center gap-3 px-4 py-2 mx-1 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700"
    >
      <span className="text-base w-5 text-center" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}

function BurgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden="true"
      className="text-gray-700 dark:text-gray-200"
    >
      <line
        x1="3"
        y1={open ? "11" : "6"}
        x2="19"
        y2={open ? "11" : "6"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className={`transition-all ${open ? "rotate-45 origin-center" : ""}`}
      />
      <line
        x1="3"
        y1="11"
        x2="19"
        y2="11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className={`transition-opacity ${open ? "opacity-0" : ""}`}
      />
      <line
        x1="3"
        y1={open ? "11" : "16"}
        x2="19"
        y2={open ? "11" : "16"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className={`transition-all ${open ? "-rotate-45 origin-center" : ""}`}
      />
    </svg>
  );
}
