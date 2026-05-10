"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Widget Team Table - table filtrable + triable des collaborateurs.
//
// Le widget le plus dense du dashboard : recherche + filtre service +
// tri colonnes. Resp. responsive : sur mobile on masque service +
// derniere activite, on les replie sous le nom.

import { useState, useMemo } from "react";
import type { TeamRow } from "./types";
import { LEVEL_META, levelFromScore } from "./levels";

type SortKey = "name" | "service" | "progress" | "xp" | "lastActivity";

export default function TeamTable({ rows }: { rows: TeamRow[] }) {
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("xp");
  const [sortAsc, setSortAsc] = useState(false);

  const services = useMemo(() => {
    const set = new Set(rows.map((r) => r.service));
    return ["all", ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let res = rows.filter((r) => {
      if (serviceFilter !== "all" && r.service !== serviceFilter) return false;
      if (
        q &&
        !r.name.toLowerCase().includes(q) &&
        !r.service.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
    res = [...res].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name, "fr");
      else if (sortKey === "service")
        cmp = a.service.localeCompare(b.service, "fr");
      else if (sortKey === "xp") cmp = a.xp - b.xp;
      else if (sortKey === "progress") {
        const pa = a.totalEpisodes ? a.episodesDone / a.totalEpisodes : 0;
        const pb = b.totalEpisodes ? b.episodesDone / b.totalEpisodes : 0;
        cmp = pa - pb;
      } else if (sortKey === "lastActivity") {
        cmp = (a.lastActivity ? 1 : 0) - (b.lastActivity ? 1 : 0);
      }
      return sortAsc ? cmp : -cmp;
    });
    return res;
  }, [rows, search, serviceFilter, sortKey, sortAsc]);

  function toggleSort(k: SortKey) {
    if (k === sortKey) setSortAsc((v) => !v);
    else {
      setSortKey(k);
      setSortAsc(false);
    }
  }

  return (
    <section
      aria-label="Suivi équipe complet"
      className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 min-w-0"
    >
      <header className="mb-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">
            Suivi équipe
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            <span className="tabular-nums">{filtered.length}</span> /{" "}
            <span className="tabular-nums">{rows.length}</span> collaborateur
            {rows.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:shrink-0">
          <label className="relative flex-1 sm:flex-none">
            <span className="sr-only">Rechercher</span>
            <span
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"
            >
              🔎
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full sm:w-44 lg:w-52 pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:border-accent-500 focus:outline-none"
            />
          </label>
          {services.length > 2 && (
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              aria-label="Filtrer par service"
              className="py-1.5 px-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:border-accent-500 focus:outline-none max-w-[140px] truncate"
            >
              {services.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "Tous" : s}
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      <table className="w-full text-sm table-auto">
        <thead className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800">
          <tr>
            <Th
              label="Collaborateur"
              k="name"
              sortKey={sortKey}
              sortAsc={sortAsc}
              onSort={toggleSort}
            />
            <Th
              label="Service"
              k="service"
              sortKey={sortKey}
              sortAsc={sortAsc}
              onSort={toggleSort}
              hideUnder="md"
            />
            <Th
              label="Progression"
              k="progress"
              sortKey={sortKey}
              sortAsc={sortAsc}
              onSort={toggleSort}
            />
            <Th
              label="XP"
              k="xp"
              sortKey={sortKey}
              sortAsc={sortAsc}
              onSort={toggleSort}
              numeric
            />
            <Th
              label="Dernière activité"
              k="lastActivity"
              sortKey={sortKey}
              sortAsc={sortAsc}
              onSort={toggleSort}
              hideUnder="xl"
            />
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="py-10 text-center text-gray-400 italic"
              >
                Aucun résultat.
              </td>
            </tr>
          )}
          {filtered.map((u, i) => {
            const pct =
              u.totalEpisodes === 0
                ? 0
                : Math.round((u.episodesDone / u.totalEpisodes) * 100);
            const lvl = levelFromScore(pct);
            return (
              <tr
                key={u.name + i}
                className="border-b border-gray-100 dark:border-slate-800/60 last:border-0 hover:bg-gray-50/60 dark:hover:bg-slate-800/30 transition align-middle"
              >
                <td className="py-3 pr-3 min-w-0">
                  <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {u.name}
                  </div>
                  <div className="md:hidden mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                    {u.service}
                    <span
                      className="mx-1.5 text-gray-300 dark:text-slate-600"
                      aria-hidden="true"
                    >
                      ·
                    </span>
                    <span className="xl:hidden">
                      {u.lastActivity ?? (
                        <span className="italic">Pas connecté</span>
                      )}
                    </span>
                  </div>
                  <div className="hidden md:block xl:hidden mt-0.5 text-[11px] text-gray-400 truncate">
                    {u.lastActivity ?? (
                      <span className="italic">Pas connecté</span>
                    )}
                  </div>
                </td>
                <td className="hidden md:table-cell py-3 pr-3 text-gray-600 dark:text-gray-400 truncate max-w-[160px]">
                  {u.service}
                </td>
                <td className="py-3 pr-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-16 sm:w-20 lg:w-28 h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
                      <div
                        className={`h-full ${LEVEL_META[lvl].bar} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 tabular-nums shrink-0">
                      {u.episodesDone}/{u.totalEpisodes}
                    </span>
                  </div>
                </td>
                <td className="py-3 pl-2 font-extrabold text-accent-500 tabular-nums text-right whitespace-nowrap">
                  {u.xp}
                </td>
                <td className="hidden xl:table-cell py-3 pl-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                  {u.lastActivity ?? (
                    <span className="italic text-gray-400">Pas encore</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function Th({
  label,
  k,
  sortKey,
  sortAsc,
  onSort,
  numeric,
  hideUnder,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey) => void;
  numeric?: boolean;
  hideUnder?: "sm" | "md" | "lg" | "xl";
}) {
  const active = sortKey === k;
  const hideClass =
    hideUnder === "md"
      ? "hidden md:table-cell"
      : hideUnder === "lg"
        ? "hidden lg:table-cell"
        : hideUnder === "xl"
          ? "hidden xl:table-cell"
          : "";
  return (
    <th
      scope="col"
      className={`pb-2.5 font-medium text-xs ${numeric ? "text-right pl-2" : "pr-3"} ${hideClass}`}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 hover:text-primary-500 dark:hover:text-accent-300 transition ${active ? "text-primary-500 dark:text-accent-300 font-bold" : ""}`}
      >
        {label}
        <span aria-hidden="true" className="text-[10px] opacity-70">
          {active ? (sortAsc ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}
