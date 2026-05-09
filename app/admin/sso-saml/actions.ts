"use server";

// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Server actions de /admin/sso-saml
//
// Save / activate la config SAML par tenant. La validation X509 du
// certificat IdP est rudimentaire (header BEGIN CERTIFICATE / END
// CERTIFICATE, length raisonnable). La vérification cryptographique
// de la signature SAML est faite au runtime SAML (cf. /integrations/sso-saml
// pour les voies d'implementation supportees).

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    throw new Error("forbidden");
  }
  return {
    tenantId: session.user.tenantId as string,
    userId: session.user.id ?? null,
    email: session.user.email ?? null,
    role,
  };
}

export type UpsertSamlConfigResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "unauthorized"
        | "forbidden"
        | "missing_field"
        | "invalid_certificate"
        | "invalid_url"
        | "unknown";
      message?: string;
    };

function validatePem(cert: string): boolean {
  // Validation basique : on accepte un PEM bien forme (BEGIN/END
  // CERTIFICATE) avec un body base64 raisonnable. La verif crypto
  // sera faite par la lib SAML au runtime.
  const trimmed = cert.trim();
  if (!trimmed.includes("-----BEGIN CERTIFICATE-----")) return false;
  if (!trimmed.includes("-----END CERTIFICATE-----")) return false;
  if (trimmed.length < 200 || trimmed.length > 16_000) return false;
  return true;
}

function validateUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function upsertSamlConfig(
  formData: FormData,
): Promise<UpsertSamlConfigResult> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: msg === "forbidden" ? "forbidden" : "unauthorized",
    };
  }

  const label = String(formData.get("label") ?? "").trim();
  const spEntityId = String(formData.get("spEntityId") ?? "").trim();
  const idpEntityId = String(formData.get("idpEntityId") ?? "").trim();
  const idpSsoUrl = String(formData.get("idpSsoUrl") ?? "").trim();
  const idpCertificate = String(formData.get("idpCertificate") ?? "").trim();
  const isActive = formData.has("isActive");

  if (
    !label ||
    !spEntityId ||
    !idpEntityId ||
    !idpSsoUrl ||
    !idpCertificate
  ) {
    return { ok: false, error: "missing_field" };
  }
  if (!validateUrl(idpSsoUrl)) {
    return {
      ok: false,
      error: "invalid_url",
      message: "L'URL SSO de l'IdP doit être en HTTPS.",
    };
  }
  if (!validatePem(idpCertificate)) {
    return {
      ok: false,
      error: "invalid_certificate",
      message:
        "Le certificat doit être au format PEM (BEGIN CERTIFICATE / END CERTIFICATE).",
    };
  }

  try {
    await db.tenantSamlConfig.upsert({
      where: { tenantId: ctx.tenantId },
      update: {
        label,
        spEntityId,
        idpEntityId,
        idpSsoUrl,
        idpCertificate,
        isActive,
      },
      create: {
        tenantId: ctx.tenantId,
        label,
        spEntityId,
        idpEntityId,
        idpSsoUrl,
        idpCertificate,
        isActive,
        attributeMapping: {},
      },
    });

    await auditLog({
      action: AuditActions.TENANT_UPDATED,
      actor: { userId: ctx.userId, email: ctx.email, role: ctx.role },
      tenantId: ctx.tenantId,
      metadata: {
        scope: "saml",
        label,
        idpEntityId,
        isActive,
      },
    });
  } catch (e) {
    return {
      ok: false,
      error: "unknown",
      message: e instanceof Error ? e.message : "Erreur BDD",
    };
  }

  revalidatePath("/admin/sso-saml");
  return { ok: true };
}

export async function deleteSamlConfig(): Promise<UpsertSamlConfigResult> {
  let ctx;
  try {
    ctx = await requireAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: msg === "forbidden" ? "forbidden" : "unauthorized",
    };
  }
  await db.tenantSamlConfig
    .delete({ where: { tenantId: ctx.tenantId } })
    .catch(() => {});
  await auditLog({
    action: AuditActions.TENANT_UPDATED,
    actor: { userId: ctx.userId, email: ctx.email, role: ctx.role },
    tenantId: ctx.tenantId,
    metadata: { scope: "saml", action: "deleted" },
  });
  revalidatePath("/admin/sso-saml");
  return { ok: true };
}
