// SPDX-License-Identifier: AGPL-3.0-or-later
"use server";
//
// Actions du portail revendeur : créer un tenant client (marque blanche).
// Toutes passent par getResellerGate (session + rôle admin + tenant revendeur
// + plan white_label). La validation métier est dans lib/reseller.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  getResellerGate,
  getClientForReseller,
  provisionClientTenant,
} from "@/lib/reseller";
import { getRootDomain, isReservedSubdomain } from "@/lib/subdomain-tenant";
import { isValidHexColor } from "@/lib/branding/tenant-branding";
import { auditLog, AuditActions } from "@/lib/audit";

const PLANS = new Set(["starter", "pro", "enterprise"]);
const MAX_BYTES = 256 * 1024; // 256 Ko : un logo doit être léger.
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
]);
const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export async function createClient(formData: FormData) {
  const gate = await getResellerGate();
  if (!gate.ok) {
    redirect("/admin/revendeur?error=forbidden");
  }

  const name = String(formData.get("name") ?? "").trim();
  const planRaw = String(formData.get("plan") ?? "pro").trim();
  const plan = (PLANS.has(planRaw) ? planRaw : "pro") as
    | "starter"
    | "pro"
    | "enterprise";
  const subdomain = String(formData.get("subdomain") ?? "").trim() || null;
  const brandName = String(formData.get("brandName") ?? "").trim() || null;
  const primaryColor = String(formData.get("primaryColor") ?? "").trim() || null;
  const accentColor = String(formData.get("accentColor") ?? "").trim() || null;
  const adminEmail = String(formData.get("adminEmail") ?? "").trim() || null;
  const adminName = String(formData.get("adminName") ?? "").trim() || null;

  const res = await provisionClientTenant({
    parentTenantId: gate.tenantId,
    name,
    plan,
    subdomain,
    brandName,
    primaryColor,
    accentColor,
    adminEmail,
    adminName,
    actor: {
      userId: gate.userId,
      email: (await safeActorEmail()) ?? "reseller",
      role: gate.role,
    },
  });

  if (!res.ok) {
    redirect(`/admin/revendeur?error=${res.reason}`);
  }

  // Invitation magic link de l'admin client (best-effort, non bloquant).
  // baseUrl = sous-domaine du client si défini, sinon racine -> l'email
  // atterrit sur l'espace brandé du client.
  if (res.invited && adminEmail) {
    void (async () => {
      try {
        const root = getRootDomain();
        const baseUrl = res.subdomain
          ? `https://${res.subdomain}.${root}`
          : process.env.NEXT_PUBLIC_BASE_URL ||
            process.env.AUTH_URL ||
            process.env.NEXT_PUBLIC_APP_URL ||
            "http://localhost:3000";
        const { sendInviteMagicLink } = await import("@/lib/invite-email");
        await sendInviteMagicLink({
          email: adminEmail,
          recipientName: adminName,
          inviterName: gate.tenant.name,
          tenantName: name,
          baseUrl,
          tenantId: res.tenantId,
        });
      } catch (err) {
        console.error("[reseller] invite admin failed", err);
      }
    })();
  }

  revalidatePath("/admin/revendeur");
  redirect(
    `/admin/revendeur?msg=created${res.invited ? "-invited" : ""}&slug=${res.slug}`,
  );
}

/**
 * Édite le branding d'un client (vérifie l'appartenance au revendeur).
 * Le revendeur configure la marque DE son client (modèle agence). L'entitlement
 * white_label du revendeur couvre le client (cf. lib/branding isEligible).
 */
export async function saveClientBranding(formData: FormData) {
  const gate = await getResellerGate();
  if (!gate.ok) redirect("/admin/revendeur?error=forbidden");

  const clientId = String(formData.get("clientId") ?? "").trim();
  const client = await getClientForReseller(gate.tenantId, clientId);
  if (!client) redirect("/admin/revendeur?error=forbidden");

  const back = `/admin/revendeur/${clientId}`;

  const brandingEnabled = formData.get("brandingEnabled") === "on";
  const hidePoweredBy = formData.get("hidePoweredBy") === "on";
  const brandName =
    String(formData.get("brandName") ?? "").trim().slice(0, 80) || null;
  const emailFromName =
    String(formData.get("emailFromName") ?? "").trim().slice(0, 80) || null;
  const primaryColor = String(formData.get("primaryColor") ?? "").trim() || null;
  const accentColor = String(formData.get("accentColor") ?? "").trim() || null;

  if (primaryColor && !isValidHexColor(primaryColor)) {
    redirect(`${back}?error=invalid_color`);
  }
  if (accentColor && !isValidHexColor(accentColor)) {
    redirect(`${back}?error=invalid_color`);
  }

  // Sous-domaine
  const subRaw = String(formData.get("subdomain") ?? "").trim().toLowerCase();
  let brandSubdomain: string | null = null;
  if (subRaw) {
    if (!SUBDOMAIN_RE.test(subRaw)) redirect(`${back}?error=invalid_subdomain`);
    if (isReservedSubdomain(subRaw)) redirect(`${back}?error=subdomain_reserved`);
    const clash = await db.tenant.findFirst({
      where: { brandSubdomain: subRaw, NOT: { id: clientId } },
      select: { id: true },
    });
    if (clash) redirect(`${back}?error=subdomain_taken`);
    brandSubdomain = subRaw;
  }

  const data: Record<string, unknown> = {
    brandingEnabled,
    hidePoweredBy,
    brandName,
    brandEmailFromName: emailFromName,
    brandPrimaryColor: primaryColor,
    brandAccentColor: accentColor,
    brandSubdomain,
  };

  // Logo / favicon (upload ou suppression via <field>_remove).
  const assets: ReadonlyArray<readonly [string, string, string]> = [
    ["logo", "brandLogo", "brandLogoMime"],
    ["favicon", "brandFavicon", "brandFaviconMime"],
  ];
  for (const [field, byteCol, mimeCol] of assets) {
    if (formData.get(`${field}_remove`) === "on") {
      data[byteCol] = null;
      data[mimeCol] = null;
      continue;
    }
    const file = formData.get(field);
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_BYTES) redirect(`${back}?error=file_too_large`);
      if (!ALLOWED_MIME.has(file.type)) redirect(`${back}?error=file_type`);
      data[byteCol] = Buffer.from(await file.arrayBuffer());
      data[mimeCol] = file.type;
    }
  }

  await db.tenant.update({ where: { id: clientId }, data });

  await auditLog({
    action: AuditActions.TENANT_UPDATED,
    actor: {
      userId: gate.userId,
      email: (await safeActorEmail()) ?? "reseller",
      role: gate.role,
    },
    tenantId: clientId,
    target: { type: "tenant", id: clientId, label: client.name },
    message: "Branding client édité par le revendeur",
    metadata: {
      source: "reseller-portal",
      parentTenantId: gate.tenantId,
      brandingEnabled,
      hasSubdomain: Boolean(brandSubdomain),
    },
  }).catch((e) => console.error("[reseller] audit log failed", e));

  // Le branding du client est résolu côté layout -> revalide tout.
  revalidatePath("/", "layout");
  revalidatePath(back);
  redirect(`${back}?msg=saved`);
}

/** Active / suspend un client (vérifie l'appartenance au revendeur). */
export async function setClientActive(formData: FormData) {
  const gate = await getResellerGate();
  if (!gate.ok) redirect("/admin/revendeur?error=forbidden");

  const clientId = String(formData.get("clientId") ?? "").trim();
  const enable = String(formData.get("enable") ?? "") === "true";
  const client = await getClientForReseller(gate.tenantId, clientId);
  if (!client) redirect("/admin/revendeur?error=forbidden");

  await db.tenant.update({
    where: { id: clientId },
    data: { isActive: enable },
  });

  await auditLog({
    action: enable
      ? AuditActions.TENANT_REACTIVATED
      : AuditActions.TENANT_DEACTIVATED,
    actor: {
      userId: gate.userId,
      email: (await safeActorEmail()) ?? "reseller",
      role: gate.role,
    },
    tenantId: clientId,
    target: { type: "tenant", id: clientId, label: client.name },
    message: enable
      ? "Client réactivé par le revendeur"
      : "Client suspendu par le revendeur",
    metadata: { source: "reseller-portal", parentTenantId: gate.tenantId },
  }).catch((e) => console.error("[reseller] audit log failed", e));

  revalidatePath(`/admin/revendeur/${clientId}`);
  redirect(
    `/admin/revendeur/${clientId}?msg=${enable ? "activated" : "suspended"}`,
  );
}

/** Email de l'acteur courant pour l'audit (best-effort). */
async function safeActorEmail(): Promise<string | null> {
  try {
    const { auth } = await import("@/lib/auth");
    const s = await auth();
    return (s?.user?.email as string) ?? null;
  } catch {
    return null;
  }
}
