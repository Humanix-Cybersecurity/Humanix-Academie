// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Migration de données one-shot (idempotente) : retire l'ancien plan "trial"
// du système après le pivot vente directe (mai 2026).
//
// Faisait quoi avant :
//   - Le plan "trial" donnait 30 jours d'essai gratuit avec accès complet.
//   - Tenant.subscriptionStatus pouvait être "trialing".
//   - Tenant.trialEndsAt portait la date de fin d'essai.
//
// Fait quoi maintenant :
//   - Plan "trial" retiré du PlanId enum (cf. lib/plans.ts).
//   - L'essai gratuit n'existe plus. Les tenants choisissent direct un cycle
//     mensuel (sans engagement) ou annuel (-17 à -21 %), ou restent sur
//     Découverte (forever-free 5 sièges).
//
// Ce script :
//   1. UPDATE Tenant SET plan='decouverte' WHERE plan='trial'
//   2. UPDATE Tenant SET subscriptionStatus='active' WHERE subscriptionStatus='trialing'
//   3. UPDATE Tenant SET trialEndsAt=NULL WHERE trialEndsAt IS NOT NULL
//
// Idempotent : tourner plusieurs fois ne change rien après le 1er passage.
// Lance via le docker-entrypoint a chaque boot (cout = 3 UPDATE no-op).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const planChange = await prisma.tenant.updateMany({
    where: { plan: "trial" },
    data: { plan: "starter" },
  });
  if (planChange.count > 0) {
    console.log(
      `[migrate-legacy-trial] ${planChange.count} tenant(s) rebasculé(s) plan=trial -> decouverte`,
    );
  }

  const statusChange = await prisma.tenant.updateMany({
    where: { subscriptionStatus: "trialing" },
    data: { subscriptionStatus: "active" },
  });
  if (statusChange.count > 0) {
    console.log(
      `[migrate-legacy-trial] ${statusChange.count} tenant(s) rebasculé(s) status=trialing -> active`,
    );
  }

  const trialEndsCleared = await prisma.tenant.updateMany({
    where: { trialEndsAt: { not: null } },
    data: { trialEndsAt: null },
  });
  if (trialEndsCleared.count > 0) {
    console.log(
      `[migrate-legacy-trial] ${trialEndsCleared.count} tenant(s) trialEndsAt purgé`,
    );
  }
}

main()
  .catch((e) => {
    console.error("[migrate-legacy-trial] FAILED", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
