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
// Drill-down par cellule (#745) : chaque cellule ouvre une sheet laterale
// avec "lancer une campagne phishing sur ce groupe" (launch-by-group) et
// "exporter le CSV des membres avec leur completion". Du constat a
// l'action en 2 clics. Interactivite dans components/admin/HeatmapMatrix.
//
// Auth : ADMIN, RSSI, MANAGER, SUPERADMIN (le lancement phishing dans la
// sheet reste reserve ADMIN/RSSI/SUPERADMIN, comme l'API).

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { computeHeatmap } from "@/lib/admin/heatmap";
import { PHISHING_TEMPLATES } from "@/lib/phishing";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import EmptyState from "@/components/admin/EmptyState";
import HeatmapMatrix from "@/components/admin/HeatmapMatrix";

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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Heatmap métier"
        description="Qui couvre quoi : croisement groupes métier × saisons cyber. Plus c'est rouge, plus il faut agir — cliquez une cellule pour agir sur le groupe."
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

      <HeatmapMatrix
        data={data}
        templates={PHISHING_TEMPLATES.map((t) => ({ id: t.id, name: t.name }))}
        canLaunchPhishing={role !== "MANAGER"}
      />

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
              Si un groupe a une couverture &lt; 30% sur la saison Phishing →
              tester sa vigilance maintenant.
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
              Drill-down sur les collaborateurs à score bas ou inactifs, avec
              export CSV et envoi rappel.
            </p>
          </Link>
        </div>
      </section>

      <p className="text-[11px] text-gray-500 italic text-center">
        Lecture : chaque cellule = % de Progress COMPLETED par les membres
        actifs (LEARNER + MANAGER) du groupe sur tous les épisodes publiés de la
        saison. Une cellule sur 100% = chaque membre a fini chaque épisode
        publié de la saison.
      </p>
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
