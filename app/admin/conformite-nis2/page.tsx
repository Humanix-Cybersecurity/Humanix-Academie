// Page admin "Pack Conformite NIS2" — feature plan Pro+.
// Le dirigeant remplit un formulaire (nom dirigeant, ville siege, contact crise...)
// et telecharge un PDF de 4 documents pre-remplis.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminNav from "@/components/AdminNav";
import { getTenantPlan } from "@/lib/plans";
import PackNis2Form from "@/components/PackNis2Form";
import PlanGateNis2 from "@/components/PlanGateNis2";

export const dynamic = "force-dynamic";

export default async function AdminConformiteNis2Page() {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "SUPERADMIN") redirect("/apprendre");
  const tenantId = (session.user as any).tenantId as string;

  const plan = await getTenantPlan(tenantId);
  // Le pack NIS2 est disponible en Pro+. On ajoute l'entree dans FEATURE_MIN_PLAN
  // si vous voulez le formaliser (cf. lib/plans.ts).
  const isAllowed = ["pro", "premium"].includes(plan);

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, slug: true },
  });

  if (!isAllowed) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold text-primary-500">
          Pack Conformité NIS2
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          4 documents prêts à signer pour répondre aux exigences NIS2.
        </p>
        <AdminNav />
        <PlanGateNis2 plan={plan} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold text-primary-500">
        Pack Conformité NIS2
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        4 documents prêts à signer, pré-remplis avec vos informations,
        couvrant les exigences NIS2 article 21 (mesures techniques et
        organisationnelles) et article 23 (notification d'incident).
      </p>

      <AdminNav />

      <div className="card mb-6 bg-accent-50 dark:bg-accent-900/20 border-l-4 border-accent-500">
        <h2 className="font-bold text-accent-700 dark:text-accent-300 mb-2">
          Ce que contient ce pack
        </h2>
        <ol className="list-decimal pl-5 text-sm space-y-1 text-gray-800 dark:text-gray-200">
          <li>
            <strong>Politique de sensibilisation à la cybersécurité</strong> —
            engagement direction signable
          </li>
          <li>
            <strong>Procédure de déclaration d'incident</strong> — checklist
            opérationnelle (24h / 72h / 1 mois)
          </li>
          <li>
            <strong>Registre des actions de sensibilisation</strong> — extrait
            consolidé des stats Humanix
          </li>
          <li>
            <strong>Engagement cyber du collaborateur</strong> — charte courte à
            joindre au contrat de travail
          </li>
        </ol>
      </div>

      <PackNis2Form tenantName={tenant?.name ?? "Votre entreprise"} />

      <div className="card mt-8 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800">
        <p className="font-bold text-primary-500 mb-1">À savoir</p>
        <p className="mb-2">
          Ces documents sont rédigés pour couvrir les exigences usuelles d'une
          PME française concernée par NIS2. Ils ne se substituent pas à un
          audit réglementaire formel par un cabinet certifié, mais constituent
          un socle organisationnel solide accepté par la majorité des
          assureurs cyber et auditeurs clients.
        </p>
        <p>
          Conservez le PDF émis (horodaté) : il fait office de <em>preuve de
          démarche cyber</em> en cas d'audit ou d'incident.
        </p>
      </div>
    </div>
  );
}
