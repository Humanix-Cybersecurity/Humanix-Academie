// Page admin : generation phishing personnalisee par employe via IA Mistral.
// Reserve aux admins, gated Pro+.

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { listEmployeeTargets } from "./actions";
import PersonalizeWizard from "./PersonalizeWizard";
import PlanGate from "@/components/PlanGate";
import { getTenantPlan, planHasFeature, FEATURE_MIN_PLAN } from "@/lib/plans";
import { isUsingMistralLive } from "@/lib/phishing/personalized";

export const dynamic = "force-dynamic";

export default async function PersonalizePhishingPage() {
  const session = await auth();
  if (!session?.user) redirect("/demo");
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") redirect("/apprendre");
  const tenantId = (session.user as any).tenantId as string;
  const plan = await getTenantPlan(tenantId);

  if (!planHasFeature(plan, "phishing_ia")) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold text-primary-500 dark:text-accent-300">
          🤖 Phishing personnalisé IA
        </h1>
        <div className="mt-8">
          <PlanGate
            feature="phishing_ia"
            currentPlan={plan}
            requiredPlan={FEATURE_MIN_PLAN.phishing_ia}
          />
        </div>
      </div>
    );
  }

  const employees = await listEmployeeTargets();
  const liveMistral = isUsingMistralLive();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        <Link href="/admin/phishing" className="hover:underline">
          ← Retour aux campagnes phishing
        </Link>
      </div>
      <h1 className="text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-1">
        🤖 Phishing personnalisé par IA
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-3xl">
        Au lieu d'envoyer le même mail à toute l'équipe, générez{" "}
        <strong>1 mail unique par employé</strong> via l'IA souveraine{" "}
        <strong>Mistral</strong> (France). Chaque message est adapté au service
        de la personne et au contexte que vous fournissez.
      </p>


      <div className="card mt-8 mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200">
        <h2 className="font-bold text-primary-500 dark:text-accent-300 mb-1">
          🛡 Cadre éthique
        </h2>
        <ul className="text-sm text-gray-700 dark:text-gray-200 space-y-1 list-disc list-inside">
          <li>Aucun mail réel n'est envoyé ici. Cette page <strong>génère le contenu uniquement</strong>.</li>
          <li>Pour lancer une vraie campagne phishing simulée, allez ensuite dans <Link href="/admin/phishing" className="underline">Phishing classique</Link> et créez une campagne avec ces contenus.</li>
          <li>L'usage doit respecter votre politique RH (information préalable, débriefing systématique, pas de sanction).</li>
        </ul>
      </div>

      <PersonalizeWizard
        employees={employees.map((e) => ({
          id: e.id,
          name: e.name,
          email: e.email,
          service: e.service,
        }))}
        isUsingMistralLive={liveMistral}
      />
    </div>
  );
}
