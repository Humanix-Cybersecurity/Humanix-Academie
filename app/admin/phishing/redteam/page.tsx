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
import { getTenantPlan, planHasFeature, FEATURE_MIN_PLAN } from "@/lib/plans";
import PlanGate from "@/components/PlanGate";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import Link from "next/link";
import RedTeamForm from "./RedTeamForm";

export const dynamic = "force-dynamic";

export default async function RedTeamPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId as string;
  const plan = await getTenantPlan(tenantId);

  if (!planHasFeature(plan, "phishing", session?.user?.role)) {
    return (
      <>
        <AdminPageHeader
          title="Generateur red team IA"
          icon="🎯"
          description="Genere des scenarios de phishing custom avec Mistral, adaptes a ton secteur."
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
        title="Generateur red team IA"
        icon="🎯"
        description="Decris ton contexte. Mistral genere un brouillon complet (sujet + sender + corps + signaux pedagogiques). Tu valides et tu lances."
      />

      <AdminSection title="Parametres du scenario">
        <RedTeamForm />
      </AdminSection>

      <AdminSection
        title="Bonnes pratiques"
        variant="muted"
      >
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
          <li>
            <strong>Difficulte progressive :</strong> commence par "brutal"
            (signaux evidents) pour acclimater l'equipe, puis monte en
            "subtle" pour vraiment tester la vigilance.
          </li>
          <li>
            <strong>Contexte specifique :</strong> mentionne une vraie attaque
            que tu as vu passer dans ton secteur (CNIL, ANSSI, RSSI peer
            group) -- les scenarios "vecu" sont plus pedagogiques.
          </li>
          <li>
            <strong>Cibles ciblees :</strong> teste les services les plus
            exposes (compta = fraude president, RH = faux CV avec malware,
            IT = faux ticket support).
          </li>
          <li>
            <strong>Revue humaine :</strong> Mistral propose, tu disposes.
            Re-lis le scenario, retire toute reference qui pourrait blesser
            quelqu'un (humour deplace, parodie injuste...).
          </li>
        </ul>
      </AdminSection>
    </>
  );
}
