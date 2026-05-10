"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// /admin/modules - tableau interactif des saisons.
//
// Refonte mai 2026 : ajout recherche + filtres + bulk actions + groupement
// par famille (cf. prisma/catalog-tags.ts). L'objectif est de remplacer
// l'ancienne liste de 27 saisons "tout d'un coup" par une experience
// filtrable, simple, qui permet d'agir sur plusieurs modules a la fois
// (ex. "j'active toute la categorie RH d'un clic").
//
// Toolbar :
//   - Recherche plein texte sur titre + slug + description + tags
//   - Filtres rapides : Tous / Actifs / Inactifs / Obligatoires
//   - Pills tags cliquables (multi-select, OR)
//   - Compteur "X / Y modules"
//
// Bulk actions :
//   - Selection multiple (checkbox)
//   - Boutons "Activer / Desactiver / Rendre obligatoire / Retirer
//     obligatoire" appliques a la selection
//
// Groupement :
//   - Public · Metiers · Conformite · Avance (extrait de family:X tags)
//   - Sections pliables avec compteur active/total par famille
//
// L'etat des filtres est persiste dans l'URL (search params) pour permettre
// de partager une vue ("envoie-moi le filtre RGPD active").
// =============================================================================

import { useTransition, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  toggleSaisonActive,
  toggleSaisonMandatory,
  moveSaison,
  resetSaisonsOrder,
  bulkSaisonAction,
} from "@/app/admin/actions";

type Episode = {
  slug: string;
  title: string;
  order: number;
  durationMinutes: number;
  xpReward: number;
};

type Saison = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverEmoji: string;
  baseOrder: number;
  episodesCount: number;
  totalMinutes: number;
  totalXp: number;
  isActive: boolean;
  isMandatory: boolean;
  customOrder: number | null;
  episodes: Episode[];
  completionsCount: number;
  avgScore: number | null;
  /** Tags issus de prisma/catalog-tags.ts (et editables par admin). */
  tags: string[];
  /** Audience cible (tous / managers / rh / compta / dev / etc.). */
  audience: string;
};

// --- familles (doit rester aligne avec prisma/catalog-tags.ts) -------------
const FAMILY_LABELS: Record<
  string,
  { label: string; emoji: string; description: string }
> = {
  public: {
    label: "Tout public",
    emoji: "👥",
    description: "Modules accessibles a tous, sans prerequis IT.",
  },
  metier: {
    label: "Metiers",
    emoji: "🎯",
    description: "Specialises par fonction : RH, compta, dev, dirigeants.",
  },
  conformite: {
    label: "Conformite",
    emoji: "📋",
    description: "NIS2, RGPD, regulations sectorielles.",
  },
  avance: {
    label: "Avance",
    emoji: "🚀",
    description: "Sujets pointus : crise cyber, supply chain, remediation.",
  },
};
const FAMILY_ORDER = ["public", "metier", "conformite", "avance"] as const;
type Family = (typeof FAMILY_ORDER)[number];

function familyOf(s: Saison): Family {
  const ft = s.tags.find((t) => t.startsWith("famille:"));
  if (!ft) return "public";
  const f = ft.slice("famille:".length);
  return (FAMILY_ORDER as readonly string[]).includes(f)
    ? (f as Family)
    : "public";
}

// --- normalisation pour recherche -----------------------------------------
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

type StatusFilter = "all" | "active" | "inactive" | "mandatory";

export default function ModulesTable({ saisons }: { saisons: Saison[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // --- etat filtres synchronise avec l'URL ---------------------------------
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState<StatusFilter>(
    (searchParams.get("status") as StatusFilter) || "all",
  );
  const [activeTags, setActiveTags] = useState<Set<string>>(
    new Set(
      (searchParams.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );

  // Pousser l'etat dans l'URL (debounce naturel via React batching)
  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (status !== "all") params.set("status", status);
    if (activeTags.size > 0)
      params.set("tags", Array.from(activeTags).join(","));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [search, status, activeTags, pathname, router]);

  // --- liste des tags disponibles (deduit du catalogue) -------------------
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const s of saisons) for (const t of s.tags) set.add(t);
    // On retire les tags famille:X qui ont leur propre UI dedie (groupes)
    return Array.from(set)
      .filter((t) => !t.startsWith("famille:"))
      .sort();
  }, [saisons]);

  // --- filtrage --------------------------------------------------------------
  const filtered = useMemo(() => {
    const q = norm(search.trim());
    return saisons.filter((s) => {
      // Statut
      if (status === "active" && !s.isActive) return false;
      if (status === "inactive" && s.isActive) return false;
      if (status === "mandatory" && !s.isMandatory) return false;
      // Tags (OR : au moins un tag actif doit matcher)
      if (activeTags.size > 0) {
        const hasMatch = s.tags.some((t) => activeTags.has(t));
        if (!hasMatch) return false;
      }
      // Recherche plein texte
      if (q) {
        const haystack = norm(
          [s.title, s.slug, s.description, ...s.tags, s.audience].join(" "),
        );
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [saisons, status, activeTags, search]);

  // Groupes (familles) sur le set filtre
  const grouped = useMemo(() => {
    const map = new Map<Family, Saison[]>();
    for (const f of FAMILY_ORDER) map.set(f, []);
    for (const s of filtered) map.get(familyOf(s))!.push(s);
    return map;
  }, [filtered]);

  // --- helpers actions -----------------------------------------------------
  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAllVisible = () => {
    setSelected(new Set(filtered.map((s) => s.id)));
  };
  const clearSelection = () => setSelected(new Set());

  const onToggleActive = (id: string, isActive: boolean) => {
    setBusy(id);
    startTransition(async () => {
      await toggleSaisonActive(id, isActive);
      setBusy(null);
    });
  };
  const onToggleMandatory = (id: string, isMandatory: boolean) => {
    setBusy(id);
    startTransition(async () => {
      await toggleSaisonMandatory(id, isMandatory);
      setBusy(null);
    });
  };
  const onMove = (id: string, dir: "up" | "down") => {
    setBusy(id);
    startTransition(async () => {
      await moveSaison(id, dir);
      setBusy(null);
    });
  };
  const onReset = () => {
    if (!confirm("Reinitialiser l'ordre par defaut ?")) return;
    startTransition(async () => {
      await resetSaisonsOrder();
    });
  };
  const onBulk = (
    action:
      | "activate"
      | "deactivate"
      | "make-mandatory"
      | "drop-mandatory",
  ) => {
    if (selected.size === 0) return;
    startTransition(async () => {
      await bulkSaisonAction(Array.from(selected), action);
      // Conserve la selection apres action — l'admin peut enchainer.
    });
  };

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setActiveTags(new Set());
  };

  const hasFilters =
    search.trim().length > 0 || status !== "all" || activeTags.size > 0;

  return (
    <>
      {/* ============================================================ */}
      {/* TOOLBAR : recherche + filtres rapides + tags                 */}
      {/* ============================================================ */}
      <div className="mb-4 space-y-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 min-w-0">
            <input
              type="search"
              placeholder="Rechercher (titre, slug, description, tag...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 pl-9 text-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
              aria-label="Rechercher un module"
            />
            <span
              className="absolute left-3 top-2.5 text-gray-400 text-sm"
              aria-hidden="true"
            >
              🔍
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterButton
              active={status === "all"}
              onClick={() => setStatus("all")}
            >
              Tous
            </FilterButton>
            <FilterButton
              active={status === "active"}
              onClick={() => setStatus("active")}
            >
              Actifs
            </FilterButton>
            <FilterButton
              active={status === "inactive"}
              onClick={() => setStatus("inactive")}
            >
              Inactifs
            </FilterButton>
            <FilterButton
              active={status === "mandatory"}
              onClick={() => setStatus("mandatory")}
            >
              Obligatoires
            </FilterButton>
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mr-1">
              Tags
            </span>
            {allTags.map((tag) => {
              const isOn = activeTags.has(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition ${
                    isOn
                      ? "bg-accent-500 text-white"
                      : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
            {activeTags.size > 0 && (
              <button
                type="button"
                onClick={() => setActiveTags(new Set())}
                className="text-xs text-gray-500 hover:text-primary-500 ml-1 underline"
              >
                Effacer les tags
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 text-xs text-gray-600 dark:text-gray-400">
          <span>
            <strong className="text-primary-500 tabular-nums">
              {filtered.length}
            </strong>
            {" / "}
            <span className="tabular-nums">{saisons.length}</span> module
            {saisons.length > 1 ? "s" : ""}
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-3 underline hover:text-primary-500"
              >
                Effacer les filtres
              </button>
            )}
          </span>
          {filtered.length > 0 && (
            <button
              type="button"
              onClick={
                selected.size === filtered.length
                  ? clearSelection
                  : selectAllVisible
              }
              className="underline hover:text-primary-500"
            >
              {selected.size === filtered.length
                ? "Tout deselectionner"
                : "Selectionner les " + filtered.length + " visibles"}
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* BARRE BULK ACTIONS (apparait quand selection > 0)            */}
      {/* ============================================================ */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-accent-500 bg-accent-50 dark:bg-accent-900/20 p-3">
          <span className="text-sm font-bold text-primary-500 tabular-nums">
            {selected.size} module{selected.size > 1 ? "s" : ""} selectionne
            {selected.size > 1 ? "s" : ""}
          </span>
          <div className="flex flex-wrap gap-2 ml-auto">
            <BulkButton onClick={() => onBulk("activate")} disabled={pending}>
              ✓ Activer
            </BulkButton>
            <BulkButton onClick={() => onBulk("deactivate")} disabled={pending}>
              ✕ Desactiver
            </BulkButton>
            <BulkButton
              onClick={() => onBulk("make-mandatory")}
              disabled={pending}
              variant="danger"
            >
              ⚠ Rendre obligatoire
            </BulkButton>
            <BulkButton
              onClick={() => onBulk("drop-mandatory")}
              disabled={pending}
            >
              Retirer obligatoire
            </BulkButton>
            <BulkButton onClick={clearSelection} variant="ghost">
              Annuler
            </BulkButton>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* LISTE DES MODULES — groupes par famille                      */}
      {/* ============================================================ */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-700 p-8 text-center">
          <p className="text-gray-500 mb-2">Aucun module ne correspond.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-accent-500 hover:underline font-medium"
          >
            Reinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {FAMILY_ORDER.map((family) => {
            const items = grouped.get(family) ?? [];
            if (items.length === 0) return null;
            const meta = FAMILY_LABELS[family];
            const activeCount = items.filter((s) => s.isActive).length;
            return (
              <FamilySection
                key={family}
                meta={meta}
                activeCount={activeCount}
                totalCount={items.length}
                onSelectAll={() =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    for (const s of items) next.add(s.id);
                    return next;
                  })
                }
              >
                {items.map((s) => {
                  const isExpanded = expanded.has(s.id);
                  const isSelected = selected.has(s.id);
                  // L'index "monter/descendre" doit etre celui dans la liste
                  // ABSOLUE (pas filtree) pour rester coherent avec l'order
                  // global. On le retrouve via le slug.
                  const absIdx = saisons.findIndex((x) => x.id === s.id);
                  return (
                    <div
                      key={s.id}
                      className={`rounded-2xl border-2 transition-all ${
                        isSelected
                          ? "border-accent-500 bg-accent-50/40 dark:bg-accent-900/10"
                          : s.isActive
                            ? "border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                            : "border-gray-200 bg-gray-50 opacity-70 dark:border-slate-800 dark:bg-slate-800/40"
                      } ${busy === s.id ? "animate-pulse" : ""}`}
                    >
                      <div className="flex items-start gap-3 p-4">
                        {/* Checkbox bulk */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(s.id)}
                          aria-label={`Selectionner ${s.title}`}
                          className="mt-1.5 h-4 w-4 rounded border-gray-300 text-accent-500 focus:ring-accent-500"
                        />

                        {/* Ordre + fleches */}
                        <div className="flex flex-col items-center gap-0.5 pt-1">
                          <button
                            onClick={() => onMove(s.id, "up")}
                            disabled={absIdx === 0 || pending}
                            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-primary-500 disabled:opacity-20 disabled:cursor-not-allowed text-xs"
                            aria-label="Monter"
                          >
                            ▲
                          </button>
                          <span className="font-bold text-primary-500 text-sm tabular-nums">
                            {absIdx + 1}
                          </span>
                          <button
                            onClick={() => onMove(s.id, "down")}
                            disabled={absIdx === saisons.length - 1 || pending}
                            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-primary-500 disabled:opacity-20 disabled:cursor-not-allowed text-xs"
                            aria-label="Descendre"
                          >
                            ▼
                          </button>
                        </div>

                        {/* Contenu module : titre cliquable pour expand */}
                        <button
                          type="button"
                          onClick={() => toggleExpanded(s.id)}
                          className="flex-1 min-w-0 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-lg"
                          aria-expanded={isExpanded}
                          aria-controls={`module-details-${s.id}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl" aria-hidden="true">
                              {s.coverEmoji}
                            </span>
                            <h3 className="font-bold text-primary-500 group-hover:text-accent-500 transition truncate">
                              {s.title}
                            </h3>
                            {s.isMandatory && (
                              <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded-full font-bold">
                                OBLIGATOIRE
                              </span>
                            )}
                            {!s.isActive && (
                              <span className="text-xs bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                INACTIF
                              </span>
                            )}
                            <span
                              className={`ml-auto text-xs text-gray-400 transition-transform shrink-0 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                              aria-hidden="true"
                            >
                              ▼
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                            {s.description}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {s.episodesCount} episode
                            {s.episodesCount > 1 ? "s" : ""}
                            {s.episodesCount > 0 && (
                              <>
                                {" "}
                                · ~{Math.round(
                                  s.totalMinutes / s.episodesCount,
                                )}{" "}
                                min / episode · {s.totalMinutes} min total ·{" "}
                                {s.totalXp} XP
                              </>
                            )}
                          </p>
                          {s.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {s.tags
                                .filter((t) => !t.startsWith("famille:"))
                                .slice(0, 6)
                                .map((tag) => (
                                  <span
                                    key={tag}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleTag(tag);
                                    }}
                                    className={`text-[10px] px-1.5 py-0.5 rounded-full cursor-pointer ${
                                      activeTags.has(tag)
                                        ? "bg-accent-500 text-white"
                                        : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200"
                                    }`}
                                  >
                                    #{tag}
                                  </span>
                                ))}
                            </div>
                          )}
                        </button>

                        {/* Toggles */}
                        <div className="flex flex-col gap-2 items-end pt-1">
                          <Toggle
                            checked={s.isActive}
                            onChange={(v) => onToggleActive(s.id, v)}
                            label="Actif"
                            disabled={pending}
                          />
                          <Toggle
                            checked={s.isMandatory}
                            onChange={(v) => onToggleMandatory(s.id, v)}
                            label="Obligatoire"
                            disabled={pending || !s.isActive}
                            color="red"
                          />
                        </div>
                      </div>

                      {/* Zone expand-able : details du module */}
                      {isExpanded && (
                        <div
                          id={`module-details-${s.id}`}
                          className="border-t border-gray-200 dark:border-slate-700 p-4 bg-gray-50/60 dark:bg-slate-800/40 rounded-b-2xl space-y-4 animate-fadeIn"
                        >
                          <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-accent-500 mb-1">
                              Description
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                              {s.description}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-accent-500 mb-2">
                              Episodes ({s.episodes.length})
                            </p>
                            {s.episodes.length === 0 ? (
                              <p className="text-xs text-gray-500 italic">
                                Aucun episode publie pour le moment.
                              </p>
                            ) : (
                              <ol className="space-y-1.5">
                                {s.episodes.map((ep, epIdx) => (
                                  <li
                                    key={ep.slug}
                                    className="flex items-center gap-3 text-sm py-1"
                                  >
                                    <span className="font-mono text-xs text-gray-400 tabular-nums shrink-0 w-6">
                                      {String(epIdx + 1).padStart(2, "0")}
                                    </span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100 flex-1 min-w-0 truncate">
                                      {ep.title}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
                                      {ep.durationMinutes} min · {ep.xpReward}{" "}
                                      XP
                                    </span>
                                    <Link
                                      href={`/apprendre/${s.slug}/${ep.slug}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-accent-500 hover:underline font-medium shrink-0"
                                    >
                                      Apercu ↗
                                    </Link>
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>

                          {(s.completionsCount > 0 ||
                            s.avgScore !== null) && (
                            <div>
                              <p className="text-[10px] uppercase tracking-widest font-bold text-accent-500 mb-2">
                                Engagement de tes equipes
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                                <div className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2.5">
                                  <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Completions
                                  </p>
                                  <p className="font-bold text-primary-500 dark:text-accent-300 tabular-nums">
                                    {s.completionsCount}
                                  </p>
                                </div>
                                {s.avgScore !== null && (
                                  <div className="rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-2.5">
                                    <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                      Score moyen
                                    </p>
                                    <p className="font-bold text-emerald-600 dark:text-emerald-300 tabular-nums">
                                      {s.avgScore} XP
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </FamilySection>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between text-sm">
        <p className="text-gray-500">
          {pending
            ? "Sauvegarde en cours..."
            : "✓ Toutes les modifications sont sauvegardees automatiquement"}
        </p>
        <button
          onClick={onReset}
          disabled={pending}
          className="text-gray-500 hover:text-primary-500 disabled:opacity-50"
        >
          Reinitialiser l'ordre par defaut
        </button>
      </div>
    </>
  );
}

// =============================================================================
// SOUS-COMPOSANTS
// =============================================================================

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
        active
          ? "bg-primary-500 text-white"
          : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function BulkButton({
  onClick,
  disabled,
  children,
  variant = "primary",
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "danger" | "ghost";
}) {
  const cls =
    variant === "danger"
      ? "bg-red-500 text-white hover:bg-red-600"
      : variant === "ghost"
        ? "bg-transparent text-gray-600 hover:text-primary-500"
        : "bg-primary-500 text-white hover:bg-primary-600";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${cls}`}
    >
      {children}
    </button>
  );
}

function FamilySection({
  meta,
  activeCount,
  totalCount,
  onSelectAll,
  children,
}: {
  meta: { label: string; emoji: string; description: string };
  activeCount: number;
  totalCount: number;
  onSelectAll: () => void;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <section>
      <header className="mb-2 flex items-center gap-3 px-1">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 group"
          aria-expanded={!collapsed}
        >
          <span
            className={`text-gray-400 group-hover:text-primary-500 transition-transform text-xs ${
              collapsed ? "" : "rotate-90"
            }`}
            aria-hidden="true"
          >
            ▶
          </span>
          <span className="text-2xl" aria-hidden="true">
            {meta.emoji}
          </span>
          <span className="font-bold text-primary-500 group-hover:text-accent-500 transition">
            {meta.label}
          </span>
          <span className="text-xs text-gray-500 tabular-nums">
            {activeCount} actif{activeCount > 1 ? "s" : ""} / {totalCount} total
          </span>
        </button>
        <button
          type="button"
          onClick={onSelectAll}
          className="ml-auto text-xs text-gray-500 hover:text-accent-500 underline"
        >
          Selectionner cette famille
        </button>
      </header>
      {!collapsed && (
        <>
          <p className="text-xs text-gray-500 mb-3 px-1">{meta.description}</p>
          <div className="space-y-3">{children}</div>
        </>
      )}
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  disabled,
  color = "accent",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  color?: "accent" | "red";
}) {
  const onColor = color === "red" ? "bg-red-500" : "bg-accent-500";
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="text-xs text-gray-600 font-medium">{label}</span>
      <span
        className={`w-10 h-6 rounded-full transition-all relative ${
          checked ? onColor : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </span>
    </button>
  );
}
