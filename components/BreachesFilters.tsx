"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import type { BreachSource } from "@prisma/client";
import { SOURCE_META } from "@/lib/breaches/types";

type Props = {
  currentSource: string;
  currentQuery: string;
  statsBySource: { source: BreachSource; count: number }[];
};

export default function BreachesFilters(props: Props) {
  return (
    <Suspense fallback={null}>
      <BreachesFiltersInner {...props} />
    </Suspense>
  );
}

function BreachesFiltersInner({
  currentSource,
  currentQuery,
  statsBySource,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [query, setQuery] = useState(currentQuery);

  // Sync local state with URL changes (back button, etc.)
  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  function pushParams(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("page"); // reset pagination
    router.push(`/observatoire-fuites?${sp.toString()}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    pushParams({ q: query.trim() || undefined });
  }

  const SOURCES: { key: BreachSource | "ALL"; label: string }[] = [
    { key: "ALL", label: "Toutes les sources" },
    { key: "FRENCHBREACHES", label: SOURCE_META.FRENCHBREACHES.name },
    { key: "BONJOURLAFUITE", label: SOURCE_META.BONJOURLAFUITE.name },
    // FUITESINFOS retiré (source désactivée — items historiques conservés en BDD)
  ];

  const totalAll = statsBySource.reduce((s, x) => s + x.count, 0);
  const countOf = (k: BreachSource | "ALL") =>
    k === "ALL"
      ? totalAll
      : (statsBySource.find((s) => s.source === k)?.count ?? 0);

  const selected = currentSource.toUpperCase() || "ALL";

  return (
    <div className="card mb-6 space-y-3">
      {/* Filtres source : pills horizontales */}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filtre par source"
      >
        {SOURCES.map((s) => {
          const active = selected === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() =>
                pushParams({ source: s.key === "ALL" ? undefined : s.key })
              }
              aria-pressed={active}
              className={`text-sm px-3 py-1.5 rounded-full border-2 transition ${
                active
                  ? "border-accent-500 bg-accent-50 dark:bg-accent-900/30 text-primary-500 font-bold"
                  : "border-gray-200 dark:border-slate-700 hover:border-accent-300"
              }`}
            >
              {s.label}{" "}
              <span className="text-xs opacity-70 ml-1 tabular-nums">
                ({countOf(s.key)})
              </span>
            </button>
          );
        })}
      </div>

      {/* Recherche libre */}
      <form onSubmit={onSubmit} className="flex gap-2">
        <label htmlFor="breaches-search" className="sr-only">
          Rechercher dans les fuites
        </label>
        <input
          id="breaches-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une organisation, un secteur…"
          className="input flex-1"
          maxLength={120}
        />
        <button type="submit" className="btn-primary text-sm whitespace-nowrap">
          🔍 Rechercher
        </button>
        {currentQuery && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              pushParams({ q: undefined });
            }}
            className="btn-secondary text-sm"
            aria-label="Effacer la recherche"
          >
            ✕
          </button>
        )}
      </form>
    </div>
  );
}
