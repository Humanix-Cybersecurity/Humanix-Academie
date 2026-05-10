"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// AdminSearchBox - palette de commandes globale de la console (ctrl/cmd+K).
//
// Pattern Linear / Vercel / Notion : un raccourci clavier ouvre une modal
// de recherche qui permet de naviguer vers n'importe quelle page admin
// en quelques caracteres.
//
// Avantages vs sidebar seule :
//   - Acces aux pages avancees sans ouvrir la section "Avance"
//   - Sans connaitre l'URL exacte ("phish" trouve /admin/phishing,
//     /admin/vishing, /admin/smishing, /admin/quishing)
//   - Compatible aussi en mobile (bouton dans la TopBar) — la palette
//     prend tout l'ecran en mobile
//
// L'index des cibles vit dans ce fichier (statique). C'est volontairement
// duplique avec AdminSidebar pour pouvoir y ajouter des cibles "non-nav"
// (raccourcis vers des actions, vers des pages de profil, etc.) sans
// polluer la sidebar.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Target = {
  href: string;
  label: string;
  hint?: string; // chemin / contexte affiche en gris a droite
  keywords: string[]; // alias pour la recherche
  icon: string;
  group: "Navigation" | "Equipe" | "Conformite" | "Avance" | "Profil";
};

const TARGETS: Target[] = [
  // === Navigation principale ===
  {
    href: "/admin",
    label: "Tableau de bord",
    hint: "/admin",
    keywords: ["dashboard", "home", "accueil", "kpi", "score"],
    icon: "📊",
    group: "Navigation",
  },
  {
    href: "/admin/onboarding",
    label: "Premiers pas (Quick Setup)",
    hint: "/admin/onboarding",
    keywords: ["wizard", "setup", "demarrage", "onboarding", "checklist"],
    icon: "🚀",
    group: "Navigation",
  },
  {
    href: "/admin/modules",
    label: "Modules pédagogiques",
    hint: "/admin/modules",
    keywords: ["catalogue", "saisons", "episodes", "obligatoires"],
    icon: "📚",
    group: "Navigation",
  },
  {
    href: "/admin/automations",
    label: "Automations",
    hint: "/admin/automations",
    keywords: ["regles", "remediation", "auto"],
    icon: "⚙️",
    group: "Navigation",
  },

  // === Equipe ===
  {
    href: "/admin/utilisateurs",
    label: "Utilisateurs",
    hint: "/admin/utilisateurs",
    keywords: ["users", "collaborateurs", "comptes", "invitations"],
    icon: "👥",
    group: "Equipe",
  },
  {
    href: "/admin/groupes",
    label: "Groupes",
    hint: "/admin/groupes",
    keywords: ["teams", "departements", "services"],
    icon: "🏷️",
    group: "Equipe",
  },
  {
    href: "/admin/users/at-risk",
    label: "Utilisateurs vulnérables",
    hint: "/admin/users/at-risk",
    keywords: ["risk", "risque", "alertes", "rouge"],
    icon: "⚠️",
    group: "Equipe",
  },

  // === Conformite ===
  {
    href: "/admin/conformite-nis2",
    label: "Pack NIS2",
    hint: "/admin/conformite-nis2",
    keywords: ["nis2", "conformite", "regulation", "pack"],
    icon: "📋",
    group: "Conformite",
  },
  {
    href: "/admin/dpo",
    label: "Espace DPO",
    hint: "/admin/dpo",
    keywords: ["rgpd", "dpo", "donnees", "privacy"],
    icon: "🛡",
    group: "Conformite",
  },
  {
    href: "/admin/audit",
    label: "Journal d'audit",
    hint: "/admin/audit",
    keywords: ["logs", "audit", "trace", "historique"],
    icon: "📜",
    group: "Conformite",
  },
  {
    href: "/admin/incidents",
    label: "Cyber-Réflexe (incidents)",
    hint: "/admin/incidents",
    keywords: ["incident", "crise", "ir", "reponse"],
    icon: "🚨",
    group: "Conformite",
  },

  // === Sensibilisation simulations ===
  {
    href: "/admin/phishing",
    label: "Simulations phishing",
    hint: "/admin/phishing",
    keywords: ["phishing", "phish", "email", "simulation"],
    icon: "🎣",
    group: "Avance",
  },
  {
    href: "/admin/vishing",
    label: "Simulations vishing",
    hint: "/admin/vishing",
    keywords: ["vishing", "voice", "appel", "telephone"],
    icon: "📞",
    group: "Avance",
  },
  {
    href: "/admin/smishing",
    label: "Simulations smishing",
    hint: "/admin/smishing",
    keywords: ["smishing", "sms", "telephone"],
    icon: "📱",
    group: "Avance",
  },
  {
    href: "/admin/quishing",
    label: "Simulations quishing",
    hint: "/admin/quishing",
    keywords: ["quishing", "qr", "code", "qrcode"],
    icon: "🔳",
    group: "Avance",
  },
  {
    href: "/admin/challenge",
    label: "Challenges d'équipe",
    hint: "/admin/challenge",
    keywords: ["challenge", "concours", "gamification"],
    icon: "🏆",
    group: "Avance",
  },

  // === Avance / analytics ===
  {
    href: "/admin/impact",
    label: "Impact mesuré",
    hint: "/admin/impact",
    keywords: ["impact", "kpi", "mesure"],
    icon: "📈",
    group: "Avance",
  },
  {
    href: "/admin/business",
    label: "Impact business",
    hint: "/admin/business",
    keywords: ["business", "roi", "argent"],
    icon: "💼",
    group: "Avance",
  },
  {
    href: "/admin/analytics/heatmap",
    label: "Heatmap métier",
    hint: "/admin/analytics/heatmap",
    keywords: ["heatmap", "carte", "service"],
    icon: "🔥",
    group: "Avance",
  },
  {
    href: "/admin/analytics/forecast",
    label: "Forecast & trajectoires",
    hint: "/admin/analytics/forecast",
    keywords: ["forecast", "previsions", "trajectoire"],
    icon: "🔮",
    group: "Avance",
  },
  {
    href: "/admin/etablissements",
    label: "Établissements",
    hint: "/admin/etablissements",
    keywords: ["multi-site", "agences", "filiales"],
    icon: "🏢",
    group: "Avance",
  },
  {
    href: "/admin/contributions",
    label: "Contributions",
    hint: "/admin/contributions",
    keywords: ["contrib", "experts"],
    icon: "✍️",
    group: "Avance",
  },
  {
    href: "/admin/license",
    label: "Licence Ed25519",
    hint: "/admin/license",
    keywords: ["license", "key", "crypto", "edsa", "ed25519"],
    icon: "🔐",
    group: "Avance",
  },

  // === Integrations ===
  {
    href: "/admin/integrations",
    label: "Webhooks",
    hint: "/admin/integrations",
    keywords: ["webhook", "events", "notif"],
    icon: "🔗",
    group: "Avance",
  },
  {
    href: "/admin/sso-saml",
    label: "SSO SAML",
    hint: "/admin/sso-saml",
    keywords: ["sso", "saml", "auth"],
    icon: "🔐",
    group: "Avance",
  },
  {
    href: "/admin/api-keys",
    label: "API Keys",
    hint: "/admin/api-keys",
    keywords: ["api", "key", "token"],
    icon: "🔑",
    group: "Avance",
  },

  // === Profil ===
  {
    href: "/profil",
    label: "Mon profil",
    hint: "/profil",
    keywords: ["profil", "compte", "moi"],
    icon: "👤",
    group: "Profil",
  },
  {
    href: "/profil/securite",
    label: "Securite (2FA, mots de passe)",
    hint: "/profil/securite",
    keywords: ["2fa", "mfa", "passkey", "securite", "totp"],
    icon: "🔒",
    group: "Profil",
  },
];

// --- normalisation (sans accents) pour la recherche ---
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function matchScore(q: string, t: Target): number {
  if (!q) return 1; // tout matche, ordre original
  const nq = norm(q);
  const fields = [t.label, t.hint ?? "", ...t.keywords].map(norm);
  let bestScore = 0;
  for (const f of fields) {
    if (!f.includes(nq)) continue;
    // Bonus si match au debut, plus le terme matche court mieux
    const idx = f.indexOf(nq);
    const score = (nq.length / f.length) * (idx === 0 ? 2 : 1);
    if (score > bestScore) bestScore = score;
  }
  return bestScore;
}

// =============================================================================
// Composant
// =============================================================================

export default function AdminSearchBox() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ouvre/ferme avec ctrl+K / cmd+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isModK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
      if (isModK) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Auto-focus de l'input a l'ouverture
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Reset query quand on ferme
  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlight(0);
    }
  }, [open]);

  // Listen for global open event (bouton dans TopBar)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("admin-open-searchbox", handler);
    return () =>
      window.removeEventListener("admin-open-searchbox", handler);
  }, []);

  const results = useMemo(() => {
    const scored = TARGETS.map((t) => ({ t, score: matchScore(query, t) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
    return scored.map((r) => r.t);
  }, [query]);

  // Reset highlight quand la query change
  useEffect(() => {
    setHighlight(0);
  }, [query]);

  // Naviguer vers la cible selectionnee
  const navigate = (target: Target) => {
    setOpen(false);
    router.push(target.href);
  };

  // Handler keyboard sur l'input (fleches + enter)
  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(results.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const t = results[highlight];
      if (t) navigate(t);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[8vh] px-4 bg-black/40 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(e) => {
        // Click sur le backdrop = fermeture (pas si on clique dans la box)
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recherche console"
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-slate-800">
          <span aria-hidden="true" className="text-gray-400">
            🔍
          </span>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Aller à... (page, fonction, raccourci)"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400"
          />
          <kbd className="hidden sm:inline-block text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-500 px-1.5 py-0.5 rounded font-mono">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-sm text-gray-500 px-4 py-8 text-center">
              Aucun resultat pour <strong>{query}</strong>
            </p>
          ) : (
            // Group by target.group, dans l'ordre d'apparition
            (() => {
              const order: Target["group"][] = [];
              const grouped = new Map<Target["group"], Target[]>();
              for (const t of results) {
                if (!grouped.has(t.group)) {
                  order.push(t.group);
                  grouped.set(t.group, []);
                }
                grouped.get(t.group)!.push(t);
              }
              let runningIdx = 0;
              return order.map((g) => {
                const items = grouped.get(g)!;
                return (
                  <div key={g}>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 px-4 pt-3 pb-1">
                      {g}
                    </p>
                    <ul>
                      {items.map((t) => {
                        const idx = runningIdx++;
                        const isHi = idx === highlight;
                        return (
                          <li key={t.href}>
                            <button
                              type="button"
                              onMouseEnter={() => setHighlight(idx)}
                              onClick={() => navigate(t)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                                isHi
                                  ? "bg-accent-50 dark:bg-accent-900/20"
                                  : "hover:bg-gray-50 dark:hover:bg-slate-800/60"
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className="text-base shrink-0 w-5 text-center"
                              >
                                {t.icon}
                              </span>
                              <span className="flex-1 min-w-0 truncate font-medium">
                                {t.label}
                              </span>
                              {t.hint && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 font-mono">
                                  {t.hint}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              });
            })()
          )}
        </div>

        <footer className="px-4 py-2 border-t border-gray-100 dark:border-slate-800 flex items-center gap-3 text-[11px] text-gray-400 bg-gray-50 dark:bg-slate-800/40">
          <span>
            <kbd className="font-mono px-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded">
              ↑
            </kbd>
            <kbd className="font-mono px-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded ml-0.5">
              ↓
            </kbd>{" "}
            naviguer
          </span>
          <span>
            <kbd className="font-mono px-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded">
              ⏎
            </kbd>{" "}
            ouvrir
          </span>
          <span className="ml-auto">
            <kbd className="font-mono px-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded">
              ⌘
            </kbd>
            <kbd className="font-mono px-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded ml-0.5">
              K
            </kbd>{" "}
            ouvrir / fermer
          </span>
        </footer>
      </div>
    </div>
  );
}

/**
 * Bouton (utilisable dans la TopBar) qui ouvre la palette de commandes.
 * Affiche le raccourci ⌘K pour rappeler aux power-users qu'il existe.
 */
export function AdminSearchTrigger() {
  const open = () => window.dispatchEvent(new Event("admin-open-searchbox"));
  return (
    <button
      type="button"
      onClick={open}
      className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition text-xs text-gray-500"
      aria-label="Ouvrir la palette de commandes (ctrl+K)"
    >
      <span aria-hidden="true">🔍</span>
      <span>Aller à...</span>
      <kbd className="font-mono text-[10px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded px-1 ml-2">
        ⌘K
      </kbd>
    </button>
  );
}
