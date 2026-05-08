// SPDX-License-Identifier: AGPL-3.0-or-later
// Page admin "Générateur de phishing IA Mistral".
// Plan-gate Pro+. Outil clé pour les démos commerciales : un prospect voit
// l'admin taper "phishing fake-fournisseur pour service compta", et 5
// secondes plus tard il a un mail prêt à envoyer.

import { redirect } from "next/navigation";
import { auth, getSignInPath } from "@/lib/auth";
import { getTenantPlan } from "@/lib/plans";
import PlanGateGeneric from "@/components/PlanGateGeneric";
import PhishingGenerator from "@/components/PhishingGenerator";

export const dynamic = "force-dynamic";

export default async function PhishingGenererPage() {
  const session = await auth();
  if (!session?.user) redirect(getSignInPath());
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "SUPERADMIN") {
    redirect("/apprendre");
  }
  const tenantId = session.user!.tenantId as string;
  const plan = await getTenantPlan(tenantId);
  const isAllowed = ["pro", "premium"].includes(plan);

  if (!isAllowed) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold text-primary-500 mb-2">
          🤖 Générateur phishing IA
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Créez un faux mail de phishing crédible en français, en 5 secondes,
          via Mistral (IA souveraine française).
        </p>
        <PlanGateGeneric
          plan={plan}
          featureLabel="Générateur de phishing IA"
          featureExplain="Boostez vos campagnes de phishing simulé : décrivez votre cible (service, contexte) et l'IA Mistral (souveraine française) génère un mail réaliste avec ses signaux faibles à débriefer. Aucune donnée envoyée hors UE."
          minPlan="pro"
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold text-primary-500 mb-2">
        🤖 Générateur phishing IA
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Mistral (IA française souveraine) crée un faux mail de phishing crédible
        en 5 secondes. Modifiez si besoin, puis lancez votre campagne.
      </p>

      <div className="card mb-6 bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-primary-900/30 dark:to-cyan-900/30 border-l-4 border-accent-500">
        <h2 className="font-bold text-primary-500 mb-2 flex items-center gap-2">
          <span aria-hidden="true">🇫🇷</span> Pourquoi Mistral et pas ChatGPT ?
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Mistral AI est une entreprise française basée à Paris. Vos prompts ne
          quittent pas l'Union européenne. Compatibilité RGPD native, pas de
          Cloud Act US, et c'est tout aussi performant pour ce besoin. C'est
          notre choix de souveraineté.
        </p>
      </div>

      <PhishingGenerator />

      <div className="card mt-8 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800">
        <p className="font-bold text-primary-500 mb-2">⚖️ Cadre légal</p>
        <p className="mb-2">
          La simulation de phishing en interne est{" "}
          <strong>légale et recommandée par l'ANSSI</strong> dans le cadre d'une
          démarche de sensibilisation cyber documentée. Pour rester dans les
          clous :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Information préalable des collaborateurs (charte cyber, voir Pack
            NIS2)
          </li>
          <li>
            Pas de sanction individuelle suite à un clic - uniquement formation
          </li>
          <li>Données de résultat anonymisables sur demande (cf. CSE)</li>
          <li>
            Le mail généré est SIMULÉ : pas de vrai payload, pas de domaine
            actif (extensions .example/.test)
          </li>
        </ul>
      </div>
    </div>
  );
}
