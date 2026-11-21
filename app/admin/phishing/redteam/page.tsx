// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/phishing/redteam - Generateur IA de scenarios phishing complets.
//
// CONTEXT (Phase 5b Phishing Engine v2, mai 2026) :
//   L'admin (RSSI / DPO / direction) decrit son contexte (secteur, attaque
//   vue recemment, audience, difficulte). Mistral genere un brouillon
//   complet : subject + sender + body HTML + markers + cibles.
//
//   Le scenario n'est PAS automatiquement envoye. L'admin previsualise,
//   peut copier-coller des elements, puis decide de lancer une campagne
//   manuelle s'il valide.
//
// SECURITE :
//   - Layout /admin verifie deja role >= ADMIN
//   - Pas de persistence cote serveur : zero risque d'attaquant qui crawle
//     d'anciens scenarios
//   - Plan-gate : Pro+ uniquement (cf. /admin/phishing/page.tsx)

import { auth } from "@/lib/auth";
import { getCurrentTenantId } from "@/lib/current-tenant";
import { getTenantPlan, planHasFeature, FEATURE_MIN_PLAN } from "@/lib/plans";
import PlanGate from "@/components/PlanGate";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import Link from "next/link";
import RedTeamForm from "./RedTeamForm";

export const dynamic = "force-dynamic";

export default async function RedTeamPage() {
  const session = await auth();
  const tenantId = await getCurrentTenantId();
  const plan = await getTenantPlan(tenantId);

  if (!planHasFeature(plan, "phishing", session?.user?.role)) {
    return (
      <>
        <AdminPageHeader
          title="Générateur red team IA"
          icon="🎯"
          description="Génère des scénarios de phishing custom avec Mistral, adaptés à ton secteur."
        />
        <PlanGate
          feature="phishing"
          currentPlan={plan}
          requiredPlan={FEATURE_MIN_PLAN.phishing}
        />
      </>
    );
  }

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
        title="Générateur red team IA"
        icon="🎯"
        description="Décris ton contexte. Mistral génère un brouillon complet (sujet + sender + corps + signaux pédagogiques). Tu valides et tu lances."
      />

      <AdminSection title="Paramètres du scénario">
        <RedTeamForm />
      </AdminSection>

      <AdminSection title="Bonnes pratiques" variant="muted">
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
          <li>
            <strong>Difficulté progressive :</strong> commence par "brutal"
            (signaux évidents) pour acclimater l'équipe, puis monte en "subtle"
            pour vraiment tester la vigilance.
          </li>
          <li>
            <strong>Contexte spécifique :</strong> mentionne une vraie attaque
            que tu as vu passer dans ton secteur (CNIL, ANSSI, RSSI peer group)
            -- les scénarios "vécu" sont plus pédagogiques.
          </li>
          <li>
            <strong>Cibles ciblées :</strong> teste les services les plus
            exposés (compta = fraude président, RH = faux CV avec malware, IT =
            faux ticket support).
          </li>
          <li>
            <strong>Revue humaine :</strong> Mistral propose, tu disposes.
            Re-lis le scénario, retire toute référence qui pourrait blesser
            quelqu'un (humour déplacé, parodie injuste...).
          </li>
        </ul>
      </AdminSection>
    </>
  );
}
