// SPDX-License-Identifier: AGPL-3.0-or-later
// Page admin Smishing (SMS phishing) - generation de SMS pedagogiques
// via Mistral souverain. L'envoi reel est a la charge du client (provider
// SMS de son choix : OVH, Octopush, Brevo, etc.) ou en forfait sur mesure.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  FEATURE_MIN_PLAN,
  getTenantPlan,
  planHasFeature,
} from "@/lib/plans";
import PlanGate from "@/components/PlanGate";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import SmishingGeneratorClient from "./SmishingGeneratorClient";

export const dynamic = "force-dynamic";

export default async function AdminSmishingPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/admin");
  }
  const tenantId = session.user!.tenantId as string;
  const plan = await getTenantPlan(tenantId);

  if (!planHasFeature(plan, "smishing", session?.user?.role)) {
    return (
      <>
        <AdminPageHeader
          title="Smishing (SMS piégé) 🇫🇷"
          description="Génération de SMS de smishing pédagogiques via IA souveraine Mistral."
          icon="📱"
        />
        <PlanGate
          feature="smishing"
          currentPlan={plan}
          requiredPlan={FEATURE_MIN_PLAN.smishing}
        />
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Smishing (SMS piégé) 🇫🇷"
        description="Génération de SMS de smishing pédagogiques via IA souveraine Mistral. Stack 100 % FR/UE - pas de Cloud Act sur vos exercices de simulation."
        icon="📱"
      />

      <div className="space-y-6 min-w-0">
        {/* Bandeau pédagogique */}
        <div className="card bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700">
          <h2 className="font-bold text-amber-800 dark:text-amber-200 mb-2">
            ℹ️ Pourquoi former au smishing en 2026
          </h2>
          <ul className="text-sm text-amber-900 dark:text-amber-100 space-y-1 list-disc list-inside">
            <li>
              Les SMS frauduleux ont triplé en 3 ans (sources Signal Spam,
              33700) : faux livreurs, faux impôts, faux 2FA.
            </li>
            <li>
              Le SMS contourne les filtres anti-phishing email et bénéficie
              d'une <strong>confiance instinctive</strong> du destinataire.
            </li>
            <li>
              Aucune plateforme de sensibilisation française ne couvre encore
              ce vecteur de manière dédiée. Cette feature comble le manque.
            </li>
            <li>
              <strong>Souveraineté</strong> : SMS généré par Mistral (Paris).
              Aucune donnée envoyée à OpenAI / Cloud Act US.
            </li>
          </ul>
        </div>

        {/* Bandeau pricing - clair sur ce qui est inclus / pas inclus */}
        <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700">
          <h2 className="font-bold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
            💶 Génération gratuite, envoi à la charge du client
          </h2>
          <p className="text-sm text-blue-900 dark:text-blue-100 mb-2">
            Humanix Académie génère gratuitement les <strong>templates</strong>{" "}
            de smishing simulés (idem pour le phishing email et le vishing).
            L'<strong>envoi réel des SMS aux collaborateurs</strong> n'est{" "}
            <strong>pas inclus</strong> dans nos plans : chaque SMS a un coût
            opérateur réel (~0,05 €/SMS en France).
          </p>
          <p className="text-sm text-blue-900 dark:text-blue-100 mb-2">
            Deux options :
          </p>
          <ul className="text-sm text-blue-900 dark:text-blue-100 space-y-1 list-disc list-inside">
            <li>
              <strong>Vous gérez l'envoi</strong> via votre propre fournisseur
              SMS (OVHcloud SMS, Octopush, Brevo SMS, SMSFactor - préférer FR).
              Copiez le SMS + lien tracké généré, puis envoyez depuis votre
              outil habituel.
            </li>
            <li>
              <strong>Forfait sur mesure</strong> : nous prenons en charge
              l'envoi pour vous (provider FR négocié) avec une facturation
              dédiée.{" "}
              <a
                href="mailto:contact@humanix-cybersecurity.fr?subject=Forfait+smishing+sur+mesure"
                className="underline font-medium"
              >
                Contactez-nous
              </a>{" "}
              pour un devis selon votre volume.
            </li>
          </ul>
        </div>

        {/* Générateur */}
        <SmishingGeneratorClient />

        {/* Roadmap */}
        <div className="card text-sm text-gray-600 dark:text-gray-400">
          <strong className="text-primary-500">Roadmap smishing</strong> :
          tracking sent / clicked / reported par campagne (lien tracké inclus
          dans le SMS), score de risque smishing par utilisateur, intégration
          SMS provider FR au choix (forfait sur mesure).
        </div>
      </div>
    </>
  );
}
