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

const LEGACY_PLAN_ID = "trial";
const TARGET_PLAN_ID = "decouverte";
const LEGACY_SUBSCRIPTION_STATUS = "trialing";
const TARGET_SUBSCRIPTION_STATUS = "active";

async function main() {
  const [planChange, statusChange, trialEndsCleared] = await prisma.$transaction(
    async (tx) => {
      const planChange = await tx.tenant.updateMany({
        where: { plan: LEGACY_PLAN_ID },
        data: { plan: TARGET_PLAN_ID },
      });

      const statusChange = await tx.tenant.updateMany({
        where: { subscriptionStatus: LEGACY_SUBSCRIPTION_STATUS },
        data: { subscriptionStatus: TARGET_SUBSCRIPTION_STATUS },
      });

      const trialEndsCleared = await tx.tenant.updateMany({
        where: { trialEndsAt: { not: null } },
        data: { trialEndsAt: null },
      });

      return [planChange, statusChange, trialEndsCleared] as const;
    },
  );

  if (planChange.count > 0) {
    console.log(
      `[migrate-legacy-trial] ${planChange.count} tenant(s) rebasculé(s) plan=trial -> decouverte`,
    );
  }

  if (statusChange.count > 0) {
    console.log(
      `[migrate-legacy-trial] ${statusChange.count} tenant(s) rebasculés status=trialing -> active`,
    );
  }

  if (trialEndsCleared.count > 0) {
    console.log(
      `[migrate-legacy-trial] ${trialEndsCleared.count} tenant(s) trialEndsAt purgé`,
    );
  }
}

(async () => {
  try {
    await main();
  } catch (e) {
    console.error("[migrate-legacy-trial] FAILED", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
