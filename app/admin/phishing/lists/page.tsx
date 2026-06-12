// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/phishing/lists - Gestion des recipient lists pour campagnes phishing.
//
// CONTEXT (Phase 3 Phishing Engine v2, mai 2026) :
//   Avant : ciblage uniquement par Group ou service via formulaire de campagne.
//   Maintenant : import CSV libre + listes ad-hoc reutilisables.
//
// Use cases :
//   - Panel pilote cyber-aware (5-10 personnes)
//   - Test sur un sous-ensemble de prestataires externes
//   - Cohorte "nouveaux arrivants" du dernier mois
//   - Cohorte "anciens arrivants n'ayant pas eu de formation depuis 12 mois"
//
// SECURITE :
//   - Plan-gate phishing (Pro+)
//   - Tenant scope strict cote actions
//   - Soft-delete : on garde l'historique pour audit

import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantPlan, planHasFeature, FEATURE_MIN_PLAN } from "@/lib/plans";
import PlanGate from "@/components/PlanGate";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import CreateListForm from "./CreateListForm";
import { deleteList } from "./actions";

export const dynamic = "force-dynamic";

export default async function PhishingListsPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId as string;
  const plan = await getTenantPlan(tenantId);

  if (!planHasFeature(plan, "phishing", session?.user?.role)) {
    return (
      <>
        <AdminPageHeader
          title="Listes de destinataires phishing"
          icon="📋"
          description="Importe une liste CSV de destinataires pour cibler tes campagnes."
        />
        <PlanGate
          feature="phishing"
          currentPlan={plan}
          requiredPlan={FEATURE_MIN_PLAN.phishing}
        />
      </>
    );
  }

  const lists = await db.phishingRecipientList.findMany({
    where: { tenantId, isActive: true },
    include: {
      _count: { select: { recipients: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Link
          href="/admin/phishing"
          className="text-sm text-gray-500 hover:text-accent-500"
        >
          ← Toutes les campagnes
        </Link>
      </div>
      <AdminPageHeader
        title="Listes de destinataires"
        icon="📋"
        description="Importe des CSV de destinataires pour cibler tes campagnes phishing. Alternative ou complement aux Groupes / services existants."
      />

      <AdminSection title="Importer une nouvelle liste">
        <CreateListForm />
      </AdminSection>

      <AdminSection
        title={`${lists.length} liste${lists.length > 1 ? "s" : ""} actives`}
      >
        {lists.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucune liste active. Importe ton premier CSV ci-dessus pour
            commencer.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-semibold">Nom</th>
                  <th className="px-3 py-2 font-semibold">Description</th>
                  <th className="px-3 py-2 font-semibold text-right">
                    Destinataires
                  </th>
                  <th className="px-3 py-2 font-semibold">Créé le</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lists.map((l) => (
                  <tr
                    key={l.id}
                    className="border-t border-gray-100 dark:border-slate-800"
                  >
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                      {l.name}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                      {l.description ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {l._count.recipients}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {l.createdAt.toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-3 py-2">
                      <form action={deleteList}>
                        <input type="hidden" name="listId" value={l.id} />
                        <button
                          type="submit"
                          className="text-xs text-red-600 hover:underline"
                          // eslint-disable-next-line react/no-unknown-property
                          formNoValidate
                        >
                          Supprimer
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      <AdminSection title="Format CSV attendu" variant="muted">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
          Le CSV doit contenir une colonne email obligatoire, puis 2 colonnes
          optionnelles (nom, service). Séparateur : <code>;</code> ou
          <code>,</code> (auto-détecté). Header en première ligne autorisé.
        </p>
        <pre className="bg-gray-100 dark:bg-slate-800 rounded p-3 text-xs overflow-x-auto">
{`email;name;service
alice@exemple.fr;Alice Dupont;Compta
bob@exemple.fr;Bob Martin;RH
contact@prestataire.com;;Externe`}
        </pre>
        <ul className="text-xs text-gray-500 dark:text-gray-400 mt-3 list-disc pl-5 space-y-1">
          <li>Max 10 000 lignes par CSV (1 Mo)</li>
          <li>Emails validés par regex simple, lignes invalides ignorées</li>
          <li>Dédupe automatique au sein du CSV</li>
          <li>Match auto avec les utilisateurs existants du tenant (Userld lié)</li>
        </ul>
      </AdminSection>
    </>
  );
}
