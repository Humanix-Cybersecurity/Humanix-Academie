// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/analytics/heatmap
//
// Heatmap RSSI : groupe metier x saison, couleur = completion %.
//
// Lecture en un coup d'oeil :
//   - Vert fonce  : groupe a fini la saison (>= 80%)
//   - Vert clair  : en cours (50-80%)
//   - Jaune       : a peine entame (20-50%)
//   - Rouge       : pas du tout investi (< 20%)
//
// Drill-down par cellule : bouton "Lancer une campagne phishing sur ce
// groupe" + "Exporter CSV des users de ce groupe". Pour passer du
// constat a l'action en 2 clics.
//
// Auth : ADMIN, RSSI, MANAGER, SUPERADMIN

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { computeHeatmap } from "@/lib/admin/heatmap";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import EmptyState from "@/components/admin/EmptyState";

export const dynamic = "force-dynamic";

export default async function AdminHeatmapPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (
    role !== "ADMIN" &&
    role !== "RSSI" &&
    role !== "MANAGER" &&
    role !== "SUPERADMIN"
  ) {
    redirect("/admin");
  }
  const tenantId = session.user.tenantId as string;

  const data = await computeHeatmap(tenantId);

  if (data.groups.length === 0 || data.saisons.length === 0) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Heatmap métier"
          description="Qui couvre quoi : croisement groupes métier × saisons cyber."
          icon="🔥"
        />
        <EmptyState
          icon="🗺️"
          title="Pas encore de matrice"
          description="Pour afficher la heatmap, il faut au moins 1 groupe métier avec des membres et 1 saison publiée. Va dans /admin/groupes pour créer/peupler les groupes."
        />
      </div>
    );
  }

  // Index global completion par saison pour la ligne "Tous"
  const globalBySaison = new Map(
    data.globalSaisonCompletion.map((g) => [g.saisonId, g.completionPct]),
  );
  // Index cells par (groupSlug, saisonId)
  const cellByKey = new Map(
    data.cells.map((c) => [`${c.groupSlug}|${c.saisonId}`, c]),
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Heatmap métier"
        description="Qui couvre quoi : croisement groupes métier × saisons cyber. Plus c'est rouge, plus il faut agir."
        icon="🔥"
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs items-center">
        <span className="text-gray-500">Légende :</span>
        <LegendChip label="< 20%" bg="bg-rose-200 dark:bg-rose-900/50" />
        <LegendChip label="20-50%" bg="bg-amber-200 dark:bg-amber-900/50" />
        <LegendChip label="50-80%" bg="bg-emerald-200 dark:bg-emerald-900/50" />
        <LegendChip
          label="≥ 80%"
          bg="bg-emerald-400 dark:bg-emerald-700/70"
          textWhite
        />
      </div>

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
            {/* Ligne "Tous" : moyenne tenant entier */}
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
                      <Cell
                        pct={cell.completionPct}
                        subtitle={`${cell.completedCount}/${cell.userCount * cell.episodeCount}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions ciblées : on transforme un constat en action en 2 clics */}
      <section className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <h3 className="font-display font-extrabold text-gray-900 dark:text-gray-100 mb-3">
          Actions rapides depuis la heatmap
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <Link
            href="/admin/phishing"
            className="rounded-lg border-2 border-gray-200 dark:border-slate-700 hover:border-accent-500 transition p-4 group"
          >
            <p className="font-bold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-accent-600">
              🎣 Lancer une campagne phishing ciblée
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Si un groupe a une couverture &lt; 30% sur la saison Phishing
              → tester sa vigilance maintenant.
            </p>
          </Link>
          <Link
            href="/admin/users/at-risk"
            className="rounded-lg border-2 border-gray-200 dark:border-slate-700 hover:border-accent-500 transition p-4 group"
          >
            <p className="font-bold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-accent-600">
              ⚠️ Voir les utilisateurs vulnérables
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Drill-down sur les collaborateurs à score bas ou inactifs,
              avec export CSV et envoi rappel.
            </p>
          </Link>
        </div>
      </section>

      <p className="text-[11px] text-gray-500 italic text-center">
        Lecture : chaque cellule = % de Progress COMPLETED par les membres
        actifs (LEARNER + MANAGER) du groupe sur tous les épisodes publiés
        de la saison. Une cellule sur 100% = chaque membre a fini chaque
        épisode publié de la saison.
      </p>
    </div>
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
      title={subtitle ? `${pct}% — ${subtitle}` : `${pct}%`}
    >
      <p className="font-extrabold tabular-nums text-sm sm:text-base">
        {pct}%
      </p>
      {subtitle && (
        <p className="text-[9px] tabular-nums opacity-80">{subtitle}</p>
      )}
    </div>
  );
}

function LegendChip({
  label,
  bg,
  textWhite,
}: {
  label: string;
  bg: string;
  textWhite?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded font-bold ${bg} ${textWhite ? "text-white" : "text-gray-800 dark:text-gray-100"}`}
    >
      {label}
    </span>
  );
}
