// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Helper atomique de provisionnement d'un tenant payant + son ADMIN.
// Une seule porte d'entrée pour TOUS les flows qui créent un tenant
// payant (futur Mollie webhook auto, /superadmin manuel, scripts CI).
//
// MODÈLE D'ACCÈS 3-LAYER (cf. plan launch OSS mai 2026) :
//   - Tenant Communauté : créé par seed, accueille les LEARNERs gratuits.
//     Cf. lib/tenant-community.ts.
//   - Tenants payants : créés UNIQUEMENT par cette fonction, qui implique
//     un acte de souscription validé (paiement Mollie ou décision admin).
//     Le premier user est ADMIN, peut ensuite inviter ses collègues.
//
// IDEMPOTENT :
//   Si un tenant avec ce paymentCustomerId existe déjà, on retourne ce
//   tenant existant. Pas de double création (anti-doublon webhook qui
//   pourrait re-fire le même event).
//
// SÉCURITÉ :
//   - Ne crée JAMAIS un user avec rôle ADMIN sur le tenant Communauté.
//   - Refuse si l'email cible existe déjà sur un autre tenant (anti-
//     piratage de session : un attaquant qui pré-paie avec l'email d'une
//     cible ne crée pas un nouveau compte ADMIN sur la cible).

import { db } from "@/lib/db";
import {
  COMMUNITY_TENANT_SLUG,
  isCommunityTenant,
} from "@/lib/tenant-community";
import { auditLog, AuditActions } from "@/lib/audit";
import type { PlanId } from "@/lib/plans";

export type ProvisionSource =
  | "mollie-webhook"
  | "superadmin-manual"
  | "demande-abonnement"
  | "dev-mode";

export type ProvisionResult =
  | { ok: true; tenantId: string; userId: string; created: boolean }
  | { ok: false; reason: ProvisionError };

export type ProvisionError =
  | "email_already_on_other_tenant"
  | "community_slug_collision"
  | "invalid_email"
  | "invalid_plan"
  | "invalid_state"
  | "db_error";

export type ProvisionInput = {
  /** Email de l'admin du nouveau tenant (sera l'unique user à la création). */
  email: string;
  /** Nom de l'organisation (sert de Tenant.name + base du slug). */
  organizationName: string;
  /** Plan initial (cf. lib/plans.ts). Doit être un plan payant - pas
   * "starter" qui est reserve aux LEARNERs sur le tenant Communaute
   * et n'aboutit PAS sur un tenant payant (sub-tier free <=5 sieges). */
  plan: PlanId;
  /** Nom de l'admin (optionnel). */
  adminName?: string;
  /** Identifiants Mollie si l'origine est un webhook ou un checkout. */
  paymentCustomerId?: string;
  paymentSubscriptionId?: string;
  /** État initial de la souscription. Utilisé par le webhook Mollie pour
   * passer "active" sur subscription.created (le checkout a réussi).
   * Défaut "active" - il n'y a plus de phase trial depuis mai 2026. */
  subscriptionStatus?: string;
  /** Provenance pour tracing/audit. */
  source: ProvisionSource;
};

/**
 * Génère un slug DB à partir du nom d'organisation. Conformément à
 * subdomain-tenant.ts (a-z, 0-9, tiret, 3-30 chars). En cas de collision
 * on suffixe avec un compteur (-2, -3, …) jusqu'à 50 essais avant abandon.
 */
async function buildUniqueSlug(name: string): Promise<string | null> {
  const base = name
    .normalize("NFD")
    // Remove Unicode combining diacritical marks (U+0300 to U+036F)
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28); // marge pour suffix -NN

  if (!base) return null;
  if (base === COMMUNITY_TENANT_SLUG) return null; // anti-collision community

  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? base : `${base}-${i}`;
    const exists = await db.tenant.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  return null;
}

/**
 * Provisionne un tenant payant + son ADMIN initial. Idempotent par
 * paymentCustomerId si fourni.
 *
 * NE PAS appeler ça pour créer un compte LEARNER - ça crée TOUJOURS un
 * ADMIN sur un nouveau tenant payant. Pour les LEARNERs gratuits, voir
 * lib/auth.ts (PrismaAdapter override) qui les attache au tenant Communauté.
 */
export async function provisionTenantWithAdmin(
  input: ProvisionInput,
): Promise<ProvisionResult> {
  const email = input.email.trim().toLowerCase();
  // Validation pragmatique: exactement un '@', pas d'espaces,
  // partie locale + domaine non vides, domaine avec TLD (x.y).
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!email || email.length > 254 || !emailPattern.test(email)) {
    return { ok: false, reason: "invalid_email" };
  }
  if (input.plan === "starter") {
    // Sécurité : on refuse de créer un tenant payant avec le plan gratuit.
    // L'erreur surface dans les logs pour qu'on s'en aperçoive vite.
    console.error(
      `[provisioning] refus: plan=${input.plan} ne crée PAS de tenant payant.`,
    );
    return { ok: false, reason: "invalid_plan" };
  }

  // Idempotence : si paymentCustomerId déjà attaché à un tenant, on
  // retourne ce tenant (cas du webhook re-fire).
  if (input.paymentCustomerId) {
    const existing = await db.tenant.findFirst({
      where: { paymentCustomerId: input.paymentCustomerId },
      include: {
        users: {
          where: { role: "ADMIN" },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (existing) {
      const existingAdminId = existing.users[0]?.id;
      if (!existingAdminId) {
        console.error(
          `[provisioning] incohérence: tenant ${existing.id} trouvé pour paymentCustomerId=${input.paymentCustomerId} sans ADMIN.`,
        );
        return { ok: false, reason: "invalid_state" };
      }
      return {
        ok: true,
        tenantId: existing.id,
        userId: existingAdminId,
        created: false,
      };
    }
  }

  // Anti-piratage : si l'email existe déjà sur un autre tenant (PAS le
  // tenant Communauté), on refuse. Cas typique : un attaquant qui paie
  // un abonnement avec l'email du DSI d'une PME existante. Dans ce cas
  // il faut faire passer la demande par le founder.
  const existingUser = await db.user.findUnique({
    where: { email },
    include: { tenant: { select: { slug: true } } },
  });
  if (existingUser && !isCommunityTenant(existingUser.tenant)) {
    return { ok: false, reason: "email_already_on_other_tenant" };
  }

  const slug = await buildUniqueSlug(input.organizationName);
  if (!slug) return { ok: false, reason: "community_slug_collision" };

  try {
    const result = await db.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug,
          name: input.organizationName,
          plan: input.plan,
          paymentProvider: input.paymentCustomerId ? "mollie" : null,
          paymentCustomerId: input.paymentCustomerId ?? null,
          paymentSubscriptionId: input.paymentSubscriptionId ?? null,
          subscriptionStatus: input.subscriptionStatus ?? "active",
        },
      });
      const user = await tx.user.create({
        data: {
          email,
          name: input.adminName ?? null,
          tenantId: tenant.id,
          role: "ADMIN",
          isActive: true,
          // emailVerified null à dessein : magic link de bienvenue le
          // marquera vérifié lors du premier sign-in.
        },
      });
      return { tenantId: tenant.id, userId: user.id };
    });

    try {
      await auditLog({
        action: AuditActions.TENANT_CREATED,
        actor: { email: `provisioning:${input.source}` },
        tenantId: result.tenantId,
        target: { type: "tenant", id: result.tenantId, label: slug },
        message: `Tenant payant provisionné (${input.source}, plan=${input.plan})`,
        metadata: {
          source: input.source,
          plan: input.plan,
          adminEmail: email,
          paymentCustomerId: input.paymentCustomerId ?? "",
        },
      });
    } catch (e) {
      console.error("[provisioning] audit log failed (non-blocking)", e);
    }

    return { ok: true, ...result, created: true };
  } catch (e) {
    console.error("[provisioning] db transaction failed", e);
    return { ok: false, reason: "db_error" };
  }
}

// Export interne pour les tests
export const __test__ = { buildUniqueSlug };
