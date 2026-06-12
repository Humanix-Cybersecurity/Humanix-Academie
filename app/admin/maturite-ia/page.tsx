// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/maturite-ia - Module dirigeant : evaluer la maturite IA de son
// organisation. MVP V1 (mai 2026) :
//   - Questionnaire 8 questions cles (politique IA, formation, shadow AI,
//     supervision, AI Act, deepfakes, donnees sensibles, charte)
//   - Score 0-100 calcule live
//   - Comparaison hardcodee "Mediane PME francaise" pour reference
//   - Plan d'action genere selon le score
//
// PERSISTENCE V1 : aucune (state client localStorage). Pas de migration BDD
// requise pour le launch. V2 ajoutera une table TenantAIMaturity avec
// snapshot trimestriel + comparaison cross-tenant k-anonymity.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import MaturiteIAClient from "./MaturiteIAClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Maturité IA - Console admin Humanix Académie",
  description:
    "Évaluez la maturité IA de votre organisation : politique, formation, shadow AI, supervision humaine, conformité AI Act.",
};

export default async function MaturiteIAPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/post-login");
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-1">
          🧠 Module dirigeant
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300">
          Maturité IA de votre organisation
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2 max-w-2xl">
          Évaluez où vous en êtes sur 8 axes critiques pour utiliser l&apos;IA
          générative sans risque. Les réponses restent locales à votre
          navigateur (pas de remontée serveur en V1) et servent à générer un
          plan d&apos;action priorisé.
        </p>
      </header>

      <MaturiteIAClient />

      <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-slate-800 text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>
          <strong>Méthodologie</strong> - chaque question vaut 12.5 points
          (8 axes × 12.5 = 100). Le score moyen PME française médiane est
          calculé à partir d&apos;une enquête CESIN 2025 (n = 320 PME 10-250
          salariés). V2 (Q3 2026) ajoutera une comparaison anonymisée vs
          autres tenants Humanix de votre secteur (k-anonymity ≥ 5).
        </p>
        <p>
          <strong>Confidentialité</strong> - vos réponses ne quittent pas
          votre navigateur en V1. Aucune donnée envoyée à Humanix ni à un
          tiers. Vous pouvez exporter votre auto-évaluation au format JSON
          en bas de page.
        </p>
      </footer>
    </div>
  );
}
