"use server";

// Actions cote serveur reservees au mode demo.
// Toute action ici DOIT verifier DEMO_MODE et refuser en prod.

import { db } from "@/lib/db";
import { isPlanId, type PlanId } from "@/lib/plans";

const DEMO_TENANT_SLUG = "demo-pme";

function assertDemoMode(): void {
  if (process.env.DEMO_MODE !== "true") {
    throw new Error("demo_disabled");
  }
}

/**
 * Met a jour le plan du tenant demo en live.
 * Appele depuis /demo avant la connexion d'un role, pour que la session
 * voit le bon plan (gates par feature, bandeau plan, etc.)
 */
export async function switchDemoPlan(plan: PlanId): Promise<{ ok: true; plan: PlanId }> {
  assertDemoMode();
  if (!isPlanId(plan)) throw new Error("invalid_plan");

  const tenant = await db.tenant.findUnique({ where: { slug: DEMO_TENANT_SLUG } });
  if (!tenant) throw new Error("demo_tenant_not_found");

  await db.tenant.update({
    where: { id: tenant.id },
    data: { plan },
  });

  return { ok: true, plan };
}

/**
 * Recupere le plan actuel du tenant demo (utilise pour pre-cocher le selecteur)
 */
export async function getDemoCurrentPlan(): Promise<PlanId> {
  assertDemoMode();
  const tenant = await db.tenant.findUnique({
    where: { slug: DEMO_TENANT_SLUG },
    select: { plan: true },
  });
  return isPlanId(tenant?.plan) ? (tenant!.plan as PlanId) : "essentielle";
}
