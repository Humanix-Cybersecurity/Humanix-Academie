// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Matrice heatmap interactive (groupe metier x saison).
//
// Chaque cellule groupe x saison est cliquable et ouvre une sheet laterale
// (idiome UsersTable) avec les actions de drill-down promises par la page :
//   - lancer une campagne phishing sur ce groupe (POST launch-by-group)
//   - exporter le CSV des membres du groupe avec leur completion saison
// Le lancement phishing est reserve ADMIN/RSSI/SUPERADMIN (l'API le
// refuse aux MANAGER) : on ne montre pas l'action a un role qui se
// prendrait un 403.
"use client";

import { useEffect, useMemo, useState } from "react";
import type { HeatmapCell, HeatmapData } from "@/lib/admin/heatmap";

type TemplateOption = { id: string; name: string };

type SelectedCell = {
  group: HeatmapData["groups"][number];
  saison: HeatmapData["saisons"][number];
  cell: HeatmapCell;
};

export default function HeatmapMatrix({
  data,
  templates,
  canLaunchPhishing,
}: {
  data: HeatmapData;
  templates: TemplateOption[];
  canLaunchPhishing: boolean;
}) {
  const [selected, setSelected] = useState<SelectedCell | null>(null);

  // Index global completion par saison pour la ligne "Tous"
  const globalBySaison = useMemo(
    () =>
      new Map(
        data.globalSaisonCompletion.map((g) => [g.saisonId, g.completionPct]),
      ),
    [data],
  );
  // Index cells par (groupSlug, saisonId)
  const cellByKey = useMemo(
    () => new Map(data.cells.map((c) => [`${c.groupSlug}|${c.saisonId}`, c])),
    [data],
  );

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-800/40">
              <th className="p-3 text-left font-bold text-gray-700 dark:text-gray-300 sticky left-0 bg-gray-50 dark:bg-slate-800/40 z-10">
                Groupe
              </th>
              {data.saisons.map((s) => (
                <th
                  key={s.id}
                  className="p-3 text-center font-bold text-gray-700 dark:text-gray-300 min-w-[120px]"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="line-clamp-2">{s.title}</span>
                    <span className="text-[10px] font-normal text-gray-500">
                      {s.episodeCount} ép.
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Ligne "Tous" : moyenne tenant entier (non cliquable : les
                actions de drill-down ciblent UN groupe) */}
            <tr className="border-t border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20">
              <td className="p-3 font-bold text-gray-800 dark:text-gray-200 sticky left-0 bg-gray-50/95 dark:bg-slate-900/90 z-10">
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true">👥</span>
                  <span>Tous</span>
                </span>
              </td>
              {data.saisons.map((s) => {
                const pct = globalBySaison.get(s.id) ?? 0;
                return (
                  <td key={s.id} className="p-1">
                    <Cell pct={pct} subtitle="moyenne" />
                  </td>
                );
              })}
            </tr>

            {/* Une ligne par groupe metier */}
            {data.groups.map((g) => (
              <tr
                key={g.slug}
                className="border-t border-gray-100 dark:border-slate-800"
              >
                <td className="p-3 font-medium text-gray-800 dark:text-gray-200 sticky left-0 bg-white dark:bg-slate-900 z-10">
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden="true">{g.emoji}</span>
                    <span>{g.name}</span>
                    <span className="text-[10px] text-gray-500 tabular-nums">
                      ({g.userCount})
                    </span>
                  </span>
                </td>
                {data.saisons.map((s) => {
                  const cell = cellByKey.get(`${g.slug}|${s.id}`);
                  if (!cell) return <td key={s.id} className="p-1" />;
                  return (
                    <td key={s.id} className="p-1">
                      <button
                        type="button"
                        onClick={() =>
                          setSelected({ group: g, saison: s, cell })
                        }
                        aria-label={`${g.name} × ${s.title} : ${cell.completionPct}% — ouvrir les actions`}
                        className="w-full rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 hover:opacity-80 hover:scale-[1.03] transition cursor-pointer"
                      >
                        <Cell
                          pct={cell.completionPct}
                          subtitle={`${cell.completedCount}/${cell.userCount * cell.episodeCount}`}
                        />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <CellSheet
          key={`${selected.group.slug}|${selected.saison.id}`}
          sel={selected}
          templates={templates}
          canLaunchPhishing={canLaunchPhishing}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

type LaunchState =
  | { kind: "idle" }
  | { kind: "confirm" }
  | { kind: "loading" }
  | { kind: "ok"; sent: number; simulated: number; targets: number }
  | { kind: "err"; message: string };

function CellSheet({
  sel,
  templates,
  canLaunchPhishing,
  onClose,
}: {
  sel: SelectedCell;
  templates: TemplateOption[];
  canLaunchPhishing: boolean;
  onClose: () => void;
}) {
  const { group, saison, cell } = sel;
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [launch, setLaunch] = useState<LaunchState>({ kind: "idle" });

  // Fermeture clavier (meme confort que les sheets UsersTable)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const doLaunch = async () => {
    setLaunch({ kind: "loading" });
    try {
      const res = await fetch("/api/admin/phishing/launch-by-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, groupSlugs: [group.slug] }),
      });
      const data = await res.json();
      if (!data.ok) {
        const message =
          data.error === "smtp_not_configured" ||
          data.error === "smtp_decrypt_failed"
            ? "SMTP non configuré : configurez l'envoi d'emails du tenant avant de lancer une campagne."
            : data.error === "no_targets"
              ? "Aucun membre ciblable dans ce groupe."
              : (data.message ?? data.error ?? "Erreur lors du lancement");
        setLaunch({ kind: "err", message });
        return;
      }
      setLaunch({
        kind: "ok",
        sent: data.sent ?? 0,
        simulated: data.simulated ?? 0,
        targets: data.targets ?? 0,
      });
    } catch (e) {
      setLaunch({
        kind: "err",
        message: e instanceof Error ? e.message : "Erreur réseau",
      });
    }
  };

  const exportUrl = `/api/admin/heatmap/export?group=${encodeURIComponent(group.slug)}&saison=${encodeURIComponent(saison.id)}`;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Actions pour ${group.name} × ${saison.title}`}
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white dark:bg-slate-950 shadow-2xl overflow-y-auto"
      >
        <header className="sticky top-0 bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-primary-500 dark:text-accent-300">
              <span aria-hidden="true">{group.emoji}</span> {group.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {saison.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </header>

        <div className="p-4 space-y-5">
          {/* Constat de la cellule */}
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-4 text-center">
            <p className="text-3xl font-extrabold tabular-nums text-gray-900 dark:text-gray-100">
              {cell.completionPct}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {cell.completedCount} épisodes complétés sur{" "}
              {cell.userCount * cell.episodeCount} possibles ({cell.userCount}{" "}
              membres × {cell.episodeCount} épisodes)
            </p>
          </div>

          {/* Action 1 : campagne phishing ciblee */}
          {canLaunchPhishing ? (
            <section className="rounded-xl border-2 border-gray-200 dark:border-slate-700 p-4 space-y-3">
              <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                🎣 Tester la vigilance de ce groupe
              </p>
              {launch.kind === "ok" ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Campagne lancée : {launch.sent} envoyé
                  {launch.sent > 1 ? "s" : ""}
                  {launch.simulated > 0
                    ? ` (${launch.simulated} simulé${launch.simulated > 1 ? "s" : ""} — SMTP en mode démo)`
                    : ""}{" "}
                  sur {launch.targets} cible{launch.targets > 1 ? "s" : ""}.
                  Suivi dans /admin/phishing.
                </p>
              ) : (
                <>
                  <label className="block text-xs text-gray-500 dark:text-gray-400">
                    Template
                    <select
                      value={templateId}
                      onChange={(e) => {
                        setTemplateId(e.target.value);
                        setLaunch({ kind: "idle" });
                      }}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-sm text-gray-900 dark:text-gray-100"
                    >
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {launch.kind === "err" && (
                    <p className="text-xs text-rose-600 dark:text-rose-400">
                      {launch.message}
                    </p>
                  )}

                  {launch.kind === "confirm" ? (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        Envoyer un email de phishing <strong>simulé</strong> aux{" "}
                        {cell.userCount} membre{cell.userCount > 1 ? "s" : ""}{" "}
                        actif{cell.userCount > 1 ? "s" : ""} du groupe (exercice
                        de sensibilisation interne) ?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={doLaunch}
                          className="flex-1 rounded-lg bg-accent-600 hover:bg-accent-500 text-white font-bold text-sm py-2 transition"
                        >
                          Confirmer l'envoi
                        </button>
                        <button
                          type="button"
                          onClick={() => setLaunch({ kind: "idle" })}
                          className="rounded-lg border border-gray-300 dark:border-slate-700 px-3 text-sm text-gray-700 dark:text-gray-300"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={launch.kind === "loading" || !templateId}
                      onClick={() => setLaunch({ kind: "confirm" })}
                      className="w-full rounded-lg bg-accent-600 hover:bg-accent-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm py-2 transition"
                    >
                      {launch.kind === "loading"
                        ? "Lancement…"
                        : "Lancer une campagne phishing"}
                    </button>
                  )}
                </>
              )}
            </section>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
              Le lancement de campagnes phishing est réservé aux rôles ADMIN et
              RSSI.
            </p>
          )}

          {/* Action 2 : export CSV du groupe sur cette saison */}
          <section className="rounded-xl border-2 border-gray-200 dark:border-slate-700 p-4 space-y-2">
            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">
              📄 Exporter le détail du groupe
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              CSV des {cell.userCount} membre{cell.userCount > 1 ? "s" : ""}{" "}
              avec leur complétion sur « {saison.title} », du moins avancé au
              plus avancé.
            </p>
            <a
              href={exportUrl}
              className="block w-full text-center rounded-lg border-2 border-gray-300 dark:border-slate-700 hover:border-accent-500 font-bold text-sm py-2 text-gray-800 dark:text-gray-200 transition"
            >
              Télécharger le CSV
            </a>
          </section>
        </div>
      </div>
    </>
  );
}

function Cell({ pct, subtitle }: { pct: number; subtitle?: string }) {
  // Choix de couleurs base sur la completion % (4 paliers visuels)
  const tone =
    pct >= 80
      ? "bg-emerald-400 dark:bg-emerald-700/70 text-white"
      : pct >= 50
        ? "bg-emerald-200 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-100"
        : pct >= 20
          ? "bg-amber-200 dark:bg-amber-900/50 text-amber-900 dark:text-amber-100"
          : "bg-rose-200 dark:bg-rose-900/50 text-rose-900 dark:text-rose-100";
  return (
    <div
      className={`rounded-md text-center py-2 px-1 ${tone}`}
      title={subtitle ? `${pct}% - ${subtitle}` : `${pct}%`}
    >
      <p className="font-extrabold tabular-nums text-sm sm:text-base">{pct}%</p>
      {subtitle && (
        <p className="text-[9px] tabular-nums opacity-80">{subtitle}</p>
      )}
    </div>
  );
}
