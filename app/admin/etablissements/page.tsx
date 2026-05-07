// SPDX-License-Identifier: AGPL-3.0-or-later
// Page admin "Multi-etablissements" - feature plan Pro+.
// Gestion des sites/agences/BU rattachees au tenant racine.
// Vue consolidee + liste des etablissements + creation d'un nouveau site.

import Link from "next/link";
import { auth } from "@/lib/auth";
import { getTenantPlan } from "@/lib/plans";
import { loadTenantTree, buildConsolidatedStats } from "@/lib/multi-tenant";
import {
  createEstablishmentAction,
  deleteEstablishmentAction,
} from "./actions";
import PlanGateGeneric from "@/components/PlanGateGeneric";
import DeleteWithConfirmButton from "@/components/DeleteWithConfirmButton";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export const dynamic = "force-dynamic";

export default async function EtablissementsPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId as string;

  const plan = await getTenantPlan(tenantId);
  if (!["pro", "premium"].includes(plan)) {
    return (
      <>
        <AdminPageHeader
          title="Multi-établissements"
          description="Gérez plusieurs sites, agences ou BU avec consolidation au niveau direction."
        />
        <PlanGateGeneric
          plan={plan}
          featureLabel="Multi-établissements"
          featureExplain="Idéal pour les cabinets multi-sites (dentaires, comptables, avocats), les franchises et les groupes avec plusieurs filiales. Une seule licence Pro pour piloter l'ensemble."
          minPlan="pro"
        />
      </>
    );
  }

  const tree = await loadTenantTree(tenantId);
  const canAddChildren = !tree.root.parentTenantId;
  const stats = await buildConsolidatedStats(tenantId);

  return (
    <>
      <AdminPageHeader
        title="Multi-établissements"
        description={`Pilotez vos ${tree.children.length + 1} établissements depuis une vue unique, avec consolidation des indicateurs.`}
      />

      <div className="space-y-6 min-w-0">
        {/* Vue consolidee */}
        <section className="card mb-8">
          <h2 className="text-xl font-bold text-primary-500 mb-1">
            📊 Vue consolidée - tous établissements
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Indicateurs agrégés sur {stats.byEstablishment.length}{" "}
            établissements.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiSmall
              label="Sièges actifs"
              value={stats.totalSeats.toString()}
            />
            <KpiSmall
              label="Activation"
              value={
                stats.totalSeats === 0
                  ? "0%"
                  : `${Math.round((stats.activatedSeats / stats.totalSeats) * 100)}%`
              }
            />
            <KpiSmall
              label="Modules complétés"
              value={stats.completedEpisodes.toString()}
            />
            <KpiSmall
              label="Maîtrise moyenne"
              value={`${stats.averageMastery}/100`}
            />
          </div>
        </section>

        {/* Tableau par etablissement */}
        <section className="card mb-8">
          <h2 className="text-xl font-bold text-primary-500 mb-4">
            Détail par établissement
          </h2>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full border-collapse min-w-[700px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-slate-700">
                  <th scope="col" className="p-3">
                    Établissement
                  </th>
                  <th scope="col" className="p-3">
                    Type
                  </th>
                  <th scope="col" className="p-3 text-right">
                    Sièges
                  </th>
                  <th scope="col" className="p-3 text-right">
                    Maîtrise
                  </th>
                  <th scope="col" className="p-3 text-right">
                    Modules
                  </th>
                  <th scope="col" className="p-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.byEstablishment.map((e) => {
                  const isRoot = e.tenantId === tenantId;
                  return (
                    <tr
                      key={e.tenantId}
                      className="border-b border-gray-100 dark:border-slate-800"
                    >
                      <td className="p-3">
                        <p className="font-bold text-primary-500">
                          {e.name}
                          {isRoot && (
                            <span className="ml-2 text-[10px] font-bold uppercase bg-accent-100 text-accent-700 px-1.5 py-0.5 rounded">
                              Siège
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="p-3 text-sm text-gray-600 dark:text-gray-300">
                        {e.establishmentType ?? "—"}
                      </td>
                      <td className="p-3 text-right tabular-nums">{e.seats}</td>
                      <td className="p-3 text-right tabular-nums">
                        <span
                          className={
                            e.mastery >= 70
                              ? "text-green-600 font-bold"
                              : e.mastery >= 50
                                ? "text-amber-600"
                                : "text-red-600"
                          }
                        >
                          {e.mastery}/100
                        </span>
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {e.completedEpisodes}
                      </td>
                      <td className="p-3">
                        {!isRoot && (
                          <form
                            action={deleteEstablishmentAction}
                            className="inline"
                          >
                            <input type="hidden" name="id" value={e.tenantId} />
                            <DeleteWithConfirmButton
                              ariaLabel={`Supprimer l'établissement ${e.name}`}
                              confirmMessage={`Supprimer l'établissement "${e.name}" ? Les utilisateurs seront supprimés. Action irréversible.`}
                            >
                              Supprimer
                            </DeleteWithConfirmButton>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Creation d'un nouvel etablissement */}
        {canAddChildren ? (
          <section className="card">
            <h2 className="text-xl font-bold text-primary-500 mb-1">
              ➕ Créer un nouvel établissement
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Le nouvel établissement hérite de votre offre actuelle. Vous
              pourrez ensuite y inviter ses collaborateurs.
            </p>
            <form
              action={createEstablishmentAction}
              className="grid sm:grid-cols-2 gap-4"
            >
              <div>
                <label
                  htmlFor="etab-name"
                  className="block text-xs font-bold uppercase text-gray-500 mb-1"
                >
                  Nom de l'établissement{" "}
                  <span className="text-red-500" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  id="etab-name"
                  name="name"
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Ex : Cabinet de Lyon, Site de Nantes"
                  className="input w-full"
                  aria-required="true"
                />
              </div>
              <div>
                <label
                  htmlFor="etab-type"
                  className="block text-xs font-bold uppercase text-gray-500 mb-1"
                >
                  Type
                </label>
                <select
                  id="etab-type"
                  name="establishmentType"
                  className="input w-full"
                >
                  <option value="">- Aucun -</option>
                  <option value="agence">Agence</option>
                  <option value="cabinet">Cabinet</option>
                  <option value="site">Site / Usine</option>
                  <option value="boutique">Boutique</option>
                  <option value="filiale">Filiale</option>
                  <option value="bu">BU / Direction</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <button type="submit" className="btn-primary">
                  Créer l'établissement
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="card bg-gray-50 dark:bg-slate-800">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>
                Cette vue est rattachée à un établissement enfant.
              </strong>{" "}
              Pour créer un nouvel établissement, connectez-vous avec un compte
              ADMIN du siège.
            </p>
          </section>
        )}

        {/* Info plan / quotas */}
        <section className="card mt-8 bg-accent-50 dark:bg-accent-900/20 border-l-4 border-accent-500">
          <h3 className="font-bold text-accent-700 dark:text-accent-300 mb-1">
            ℹ️ Bon à savoir
          </h3>
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc pl-5">
            <li>
              Chaque établissement a son propre tableau de bord et ses propres
              invitations utilisateurs.
            </li>
            <li>
              La consolidation des indicateurs (cette page) est exclusivement
              visible par le siège.
            </li>
            <li>
              La facturation reste portée par le tenant siège. Pas de double
              facturation.
            </li>
            <li>
              Limite V1 : 2 niveaux de hiérarchie. Pour des structures plus
              complexes, contactez-nous -{" "}
              <Link href="/contact" className="text-accent-500 underline">
                demande sur mesure
              </Link>
              .
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}

function KpiSmall({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-700 p-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-extrabold text-primary-500 mt-1">{value}</p>
    </div>
  );
}
