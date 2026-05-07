// SPDX-License-Identifier: AGPL-3.0-or-later
// Liste des incidents en cours et historiques pour le tenant.
// Module Cyber-Reflexe - gated Pro+.

import Link from "next/link";
import { auth } from "@/lib/auth";
import { listIncidents } from "@/lib/incident-response/service";
import {
  INCIDENT_TYPE_LABELS,
  INCIDENT_SEVERITY_LABELS,
  INCIDENT_STATUS_LABELS,
} from "@/lib/incident-response/playbooks";
import PlanGate from "@/components/PlanGate";
import { getTenantPlan, planHasFeature, FEATURE_MIN_PLAN } from "@/lib/plans";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export const dynamic = "force-dynamic";

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  MEDIUM:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  HIGH: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  CRITICAL: "bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-200",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  IN_PROGRESS:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  CONTAINED: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  RESOLVED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  CLOSED: "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300",
};

export default async function AdminIncidentsPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId as string;

  const plan = await getTenantPlan(tenantId);
  if (!planHasFeature(plan, "incidents")) {
    return (
      <>
        <AdminPageHeader
          title="Cyber-Réflexe"
          description="Module de réponse à incident guidé."
          icon="🚨"
        />
        <PlanGate
          feature="incidents"
          currentPlan={plan}
          requiredPlan={FEATURE_MIN_PLAN.incidents}
        />
      </>
    );
  }

  const incidents = await listIncidents(tenantId);
  const openCount = incidents.filter(
    (i) => !["RESOLVED", "CLOSED"].includes(i.status),
  ).length;

  return (
    <>
      <AdminPageHeader
        title="Cyber-Réflexe"
        description="Module de réponse à incident guidé. Workflow ANSSI + RGPD + NIS2, documents pré-remplis prêts à être déposés."
        icon="🚨"
      />

      <div className="space-y-6 min-w-0">
        {/* Hero CTA / KPI */}
        <div className="grid sm:grid-cols-3 gap-4 my-6">
          <Kpi label="Incidents en cours" value={openCount} emoji="🔴" />
          <Kpi label="Incidents totaux" value={incidents.length} emoji="📊" />
          <Kpi
            label="Incidents clôturés"
            value={incidents.filter((i) => i.status === "CLOSED").length}
            emoji="✅"
          />
        </div>

        {/* Bandeau urgence */}
        <div className="card mb-6 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h2 className="font-bold text-red-800 dark:text-red-200 mb-1">
                ⚠ Incident en cours ?
              </h2>
              <p className="text-sm text-red-700 dark:text-red-300">
                Démarrez le workflow guidé maintenant. Il vous accompagne sur
                les actions des 72 prochaines heures (confinement, notification
                CNIL/ANSSI, communication).
              </p>
            </div>
            <Link
              href="/admin/incidents/new"
              className="btn-primary text-sm whitespace-nowrap"
            >
              🚨 Déclarer un incident
            </Link>
          </div>
        </div>

        {/* Tableau */}
        {incidents.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-5xl mb-3" aria-hidden="true">
              🛡
            </p>
            <h2 className="text-xl font-bold text-primary-500 dark:text-accent-300 mb-2">
              Aucun incident enregistré
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              C'est une bonne nouvelle. Mais préparez-vous : 60 % des PME
              subiront un incident dans les 12 prochains mois.
            </p>
            <Link href="/admin/incidents/new" className="btn-secondary text-sm">
              Tester le workflow avec un incident fictif
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Liste des incidents Cyber-Reflexe declenches : reference,
                titre, severite, statut (ouvert/en cours/clos), date de
                detection, deadline notification CNIL/ANSSI
              </caption>
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400">
                  <th scope="col" className="px-4 py-3">
                    Référence
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Titre
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Sévérité
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Statut
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Détecté le
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Progression
                  </th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((i) => {
                  const typeMeta = INCIDENT_TYPE_LABELS[i.type];
                  return (
                    <tr
                      key={i.id}
                      className="border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/incidents/${i.id}`}
                          className="font-mono text-xs font-bold text-primary-500 hover:underline"
                        >
                          {i.reference}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/incidents/${i.id}`}
                          className="font-medium hover:text-primary-500 dark:hover:text-accent-300"
                        >
                          {i.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span aria-hidden="true">{typeMeta.emoji}</span>{" "}
                        {typeMeta.label}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span
                          className={`inline-block px-2 py-1 rounded font-bold ${SEVERITY_COLORS[i.severity]}`}
                        >
                          {INCIDENT_SEVERITY_LABELS[i.severity].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span
                          className={`inline-block px-2 py-1 rounded font-bold ${STATUS_COLORS[i.status]}`}
                        >
                          {INCIDENT_STATUS_LABELS[i.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {i.detectedAt.toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400">
                        {i._count.actions} actions
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Kpi({
  label,
  value,
  emoji,
}: {
  label: string;
  value: number;
  emoji: string;
}) {
  return (
    <div className="card text-center">
      <div className="text-3xl mb-1" aria-hidden="true">
        {emoji}
      </div>
      <div className="text-3xl font-extrabold text-primary-500 dark:text-accent-300">
        {value}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}
