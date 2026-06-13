// SPDX-License-Identifier: AGPL-3.0-or-later
//
// PORTAIL REVENDEUR (white-label multi-clients) — WL8.
//
// Un tenant « revendeur » (Tenant.isReseller=true, accordé par le SUPERADMIN,
// cf. /superadmin/tenants/[id]) avec un plan white_label (enterprise) peut
// créer et gérer des tenants CLIENTS enfants (parentTenantId = revendeur),
// chacun en marque blanche.
//
// CASCADE : le branding du revendeur descend automatiquement à ses clients
// (cf. lib/branding/tenant-branding.ts). Un client peut aussi avoir SA propre
// marque (l'entitlement white_label du revendeur couvre ses clients : un
// client sur un plan pro peut donc être brandé — cf. isEligible).
//
// ISOLATION : ce module ne donne au revendeur que la GESTION (créer, lister,
// brander) de ses clients. Les données des clients (apprenants, scores) ne
// sont PAS agrégées chez le revendeur ici — chaque client reste un tenant
// isolé avec ses propres admins.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { planHasFeature } from "@/lib/plans";
import { buildUniqueSlug } from "@/lib/tenant-provisioning";
import { isCommunityTenant } from "@/lib/tenant-community";
import { isValidHexColor } from "@/lib/branding/tenant-branding";
import { isReservedSubdomain } from "@/lib/subdomain-tenant";
import { auditLog, AuditActions } from "@/lib/audit";

const ADMIN_ROLES = new Set(["ADMIN", "RSSI", "SUPERADMIN"]);

export type ResellerTenant = {
  id: string;
  name: string;
  plan: string;
  slug: string;
};

export type ResellerGate =
  | { ok: true; tenantId: string; tenant: ResellerTenant; userId: string; role: string }
  | {
      ok: false;
      reason: "unauthenticated" | "forbidden_role" | "not_reseller" | "plan_required";
    };

/**
 * Porte d'entrée d'autorisation du portail revendeur. À appeler au début de
 * chaque page/action revendeur. Vérifie : session + rôle admin + tenant
 * courant revendeur + plan white_label.
 */
export async function getResellerGate(): Promise<ResellerGate> {
  const session = await auth();
  if (!session?.user) return { ok: false, reason: "unauthenticated" };
  const role = session.user.role as string;
  if (!ADMIN_ROLES.has(role)) return { ok: false, reason: "forbidden_role" };

  const tenantId = session.user.tenantId as string | undefined;
  if (!tenantId) return { ok: false, reason: "forbidden_role" };

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, plan: true, slug: true, isReseller: true },
  });
  if (!tenant) return { ok: false, reason: "forbidden_role" };
  if (!tenant.isReseller) return { ok: false, reason: "not_reseller" };
  if (!planHasFeature(tenant.plan, "white_label", role)) {
    return { ok: false, reason: "plan_required" };
  }

  return {
    ok: true,
    tenantId,
    tenant: { id: tenant.id, name: tenant.name, plan: tenant.plan, slug: tenant.slug },
    userId: session.user.id as string,
    role,
  };
}

export type ClientSummary = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  brandSubdomain: string | null;
  brandingEnabled: boolean;
  isActive: boolean;
  createdAt: Date;
  userCount: number;
};

/** Liste les tenants clients (enfants directs) d'un revendeur. */
export async function listClients(
  parentTenantId: string,
): Promise<ClientSummary[]> {
  const rows = await db.tenant.findMany({
    where: { parentTenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      brandSubdomain: true,
      brandingEnabled: true,
      isActive: true,
      createdAt: true,
      _count: { select: { users: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    plan: r.plan,
    brandSubdomain: r.brandSubdomain,
    brandingEnabled: r.brandingEnabled,
    isActive: r.isActive,
    createdAt: r.createdAt,
    userCount: r._count.users,
  }));
}

/** Charge un client en VÉRIFIANT qu'il appartient bien au revendeur. */
export async function getClientForReseller(
  parentTenantId: string,
  clientId: string,
) {
  return db.tenant.findFirst({
    where: { id: clientId, parentTenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      isActive: true,
      brandingEnabled: true,
      brandName: true,
      brandPrimaryColor: true,
      brandAccentColor: true,
      brandEmailFromName: true,
      brandHidePoweredBy: true,
      brandSubdomain: true,
      brandLogoMime: true,
      brandFaviconMime: true,
      createdAt: true,
    },
  });
}

export type ProvisionClientInput = {
  parentTenantId: string;
  name: string;
  plan: "starter" | "pro" | "enterprise";
  subdomain?: string | null;
  brandName?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  adminEmail?: string | null;
  adminName?: string | null;
  actor: { userId: string; email: string; role: string };
};

export type ProvisionClientResult =
  | { ok: true; tenantId: string; slug: string; subdomain: string | null; invited: boolean }
  | {
      ok: false;
      reason:
        | "invalid_name"
        | "invalid_subdomain"
        | "subdomain_reserved"
        | "subdomain_taken"
        | "invalid_color"
        | "invalid_admin_email"
        | "admin_email_taken"
        | "slug_collision"
        | "db_error";
    };

const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Crée un tenant client enfant d'un revendeur (+ son ADMIN initial optionnel,
 * invité par magic link). Le branding fourni est posé directement sur le
 * client ; sinon il hérite du revendeur (cascade).
 *
 * Validation AVANT toute écriture : si l'email admin ou le sous-domaine est
 * invalide/pris, on ne crée RIEN (pas de tenant orphelin sans admin).
 */
export async function provisionClientTenant(
  input: ProvisionClientInput,
): Promise<ProvisionClientResult> {
  const name = input.name.trim();
  if (!name || name.length > 120) return { ok: false, reason: "invalid_name" };

  // Sous-domaine (optionnel)
  let subdomain: string | null = null;
  if (input.subdomain && input.subdomain.trim()) {
    const sub = input.subdomain.trim().toLowerCase();
    if (!SUBDOMAIN_RE.test(sub)) return { ok: false, reason: "invalid_subdomain" };
    if (isReservedSubdomain(sub)) return { ok: false, reason: "subdomain_reserved" };
    const clash = await db.tenant.findFirst({
      where: { brandSubdomain: sub },
      select: { id: true },
    });
    if (clash) return { ok: false, reason: "subdomain_taken" };
    subdomain = sub;
  }

  // Couleurs (optionnelles)
  const primaryColor = input.primaryColor?.trim() || null;
  const accentColor = input.accentColor?.trim() || null;
  if (primaryColor && !isValidHexColor(primaryColor)) {
    return { ok: false, reason: "invalid_color" };
  }
  if (accentColor && !isValidHexColor(accentColor)) {
    return { ok: false, reason: "invalid_color" };
  }
  const brandName = input.brandName?.trim() || null;

  // Email admin (optionnel) : validé + libre AVANT création.
  let adminEmail: string | null = null;
  if (input.adminEmail && input.adminEmail.trim()) {
    const email = input.adminEmail.trim().toLowerCase();
    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return { ok: false, reason: "invalid_admin_email" };
    }
    const existing = await db.user.findUnique({
      where: { email },
      include: { tenant: { select: { slug: true } } },
    });
    // Anti-hijack : refuse un email déjà rattaché à un autre tenant payant.
    if (existing && !isCommunityTenant(existing.tenant)) {
      return { ok: false, reason: "admin_email_taken" };
    }
    adminEmail = email;
  }

  const slug = await buildUniqueSlug(name);
  if (!slug) return { ok: false, reason: "slug_collision" };

  const hasBrand = Boolean(brandName || primaryColor || accentColor || subdomain);

  try {
    const result = await db.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug,
          name,
          plan: input.plan,
          parentTenantId: input.parentTenantId,
          subscriptionStatus: "active",
          brandingEnabled: hasBrand,
          brandName,
          brandPrimaryColor: primaryColor,
          brandAccentColor: accentColor,
          brandSubdomain: subdomain,
        },
        select: { id: true, slug: true },
      });
      if (adminEmail) {
        await tx.user.create({
          data: {
            email: adminEmail,
            name: input.adminName?.trim() || null,
            tenantId: tenant.id,
            role: "ADMIN",
            isActive: true,
          },
        });
      }
      return tenant;
    });

    await auditLog({
      action: AuditActions.TENANT_CREATED,
      actor: {
        userId: input.actor.userId,
        email: input.actor.email,
        role: input.actor.role,
      },
      tenantId: result.id,
      target: { type: "tenant", id: result.id, label: name },
      message: `Client revendeur créé (parent=${input.parentTenantId}, plan=${input.plan})`,
      metadata: {
        source: "reseller-portal",
        parentTenantId: input.parentTenantId,
        plan: input.plan,
        brandSubdomain: subdomain ?? "",
        adminEmail: adminEmail ?? "",
      },
    }).catch((e) => console.error("[reseller] audit log failed", e));

    return {
      ok: true,
      tenantId: result.id,
      slug: result.slug,
      subdomain,
      invited: Boolean(adminEmail),
    };
  } catch (e) {
    console.error("[reseller] provision client failed", e);
    return { ok: false, reason: "db_error" };
  }
}
