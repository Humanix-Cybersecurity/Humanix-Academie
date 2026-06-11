// SPDX-License-Identifier: AGPL-3.0-or-later
// Page admin Vishing (voice phishing) - generation de scripts pedagogiques
// via Mistral souverain + lecture Piper TTS local. Combler le gap face a
// Adaptive Security et Hoxhunt avec une stack 100 % FR/UE.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  FEATURE_MIN_PLAN,
  getTenantPlan,
  planHasFeature,
} from "@/lib/plans";
import PlanGate from "@/components/PlanGate";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import VishingGeneratorClient from "./VishingGeneratorClient";

export const dynamic = "force-dynamic";

export default async function AdminVishingPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "SUPERADMIN") {
    redirect("/admin");
  }
  const tenantId = session.user!.tenantId as string;
  const plan = await getTenantPlan(tenantId);

  if (!planHasFeature(plan, "vishing", session?.user?.role)) {
    return (
      <>
        <AdminPageHeader
          title="Vishing (voix piégée) 🇫🇷"
          description="Génération de scripts de vishing pédagogiques via IA souveraine Mistral."
          icon="📞"
        />
        <PlanGate
          feature="vishing"
          currentPlan={plan}
          requiredPlan={FEATURE_MIN_PLAN.vishing}
        />
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Vishing (voix piégée) 🇫🇷"
        description="Génération de scripts de vishing pédagogiques via IA souveraine Mistral. Stack 100 % FR/UE - pas de Cloud Act sur vos exercices de simulation."
        icon="📞"
      />

      <div className="space-y-6 min-w-0">
        {/* Bandeau pédagogique */}
        <div className="card bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700">
          <h2 className="font-bold text-amber-800 dark:text-amber-200 mb-2">
            ℹ️ Pourquoi former au vishing en 2026
          </h2>
          <ul className="text-sm text-amber-900 dark:text-amber-100 space-y-1 list-disc list-inside">
            <li>
              <strong>+442 %</strong> d'augmentation des attaques vishing au H2
              2024 (source : Hoxhunt threat report).
            </li>
            <li>
              Le vishing représente <strong>plus de 60 %</strong> des incidents
              en réponse à incident côté entreprise.
            </li>
            <li>
              La plupart des plateformes de sensibilisation forment encore au
              phishing email uniquement. Cette feature comble le manque.
            </li>
            <li>
              <strong>Souveraineté</strong> : script généré par Mistral (Paris),
              lecture par Piper TTS local. Aucune donnée envoyée à OpenAI / Cloud
              Act US.
            </li>
          </ul>
        </div>

        {/* Bandeau pricing - clair sur ce qui est inclus / pas inclus */}
        <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700">
          <h2 className="font-bold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
            💶 Génération gratuite, exécution à la charge du client
          </h2>
          <p className="text-sm text-blue-900 dark:text-blue-100 mb-2">
            Humanix Académie génère gratuitement les <strong>scripts</strong>{" "}
            de vishing pédagogiques. L&apos;<strong>exécution réelle</strong>{" "}
            (appel téléphonique sortant avec lecture TTS, traçabilité de la
            cible) n&apos;est <strong>pas incluse</strong> : un appel a un
            coût opérateur réel et nécessite une infra SIP dédiée.
          </p>
          <p className="text-sm text-blue-900 dark:text-blue-100 mb-2">
            Deux options :
          </p>
          <ul className="text-sm text-blue-900 dark:text-blue-100 space-y-1 list-disc list-inside">
            <li>
              <strong>Vous gérez l&apos;exécution</strong> : copiez le script
              + écoutez la lecture Piper TTS, puis utilisez votre solution
              téléphonique habituelle.
            </li>
            <li>
              <strong>Forfait sur mesure</strong> : nous prenons en charge
              l&apos;exécution complète (provider FR négocié, traçabilité,
              débrief).{" "}
              <a
                href="mailto:contact@humanix-cybersecurity.fr?subject=Forfait+vishing+sur+mesure"
                className="underline font-medium"
              >
                Contactez-nous
              </a>{" "}
              pour un devis selon votre volume.
            </li>
          </ul>
        </div>

        {/* Générateur */}
        <VishingGeneratorClient />

        {/* Roadmap */}
        <div className="card text-sm text-gray-600 dark:text-gray-400">
          <strong className="text-primary-500">Roadmap vishing (Q3 2026)</strong>{" "}
          : campagnes programmées, score de risque vishing par utilisateur,
          appel sortant simulé via SIP test (sandboxed), import de scénarios
          contributeurs depuis la marketplace.
        </div>
      </div>
    </>
  );
}
