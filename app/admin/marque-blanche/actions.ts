// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Server action de sauvegarde du branding marque blanche (Enterprise).
// Gate : ADMIN/RSSI/SUPERADMIN + plan white_label. Valide couleurs (hex),
// fichiers (mime + taille), sous-domaine (format + unicité). Audit log.

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditOutcomes } from "@/lib/audit";
import { AuditAction } from "@prisma/client";
import { planHasFeature } from "@/lib/plans";
import { isValidHexColor } from "@/lib/branding/tenant-branding";

const MAX_BYTES = 256 * 1024; // 256 Ko : un logo doit être léger.
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
]);

export type SaveBrandingResult = { ok: true } | { ok: false; error: string };

export async function saveBranding(
  formData: FormData,
): Promise<SaveBrandingResult> {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    return { ok: false, error: "Accès réservé aux administrateurs." };
  }
  const tenantId = session.user.tenantId as string;

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  if (!tenant) return { ok: false, error: "Organisation introuvable." };
  // Défense en profondeur : le gate plan est aussi vérifié côté page.
  if (!planHasFeature(tenant.plan, "white_label", role)) {
    return {
      ok: false,
      error: "La marque blanche nécessite le plan Enterprise.",
    };
  }

  const brandingEnabled = formData.get("brandingEnabled") === "on";
  const hidePoweredBy = formData.get("hidePoweredBy") === "on";
  const brandName =
    String(formData.get("brandName") ?? "")
      .trim()
      .slice(0, 80) || null;
  const emailFromName =
    String(formData.get("emailFromName") ?? "")
      .trim()
      .slice(0, 80) || null;
  const primaryColor = String(formData.get("primaryColor") ?? "").trim() || null;
  const accentColor = String(formData.get("accentColor") ?? "").trim() || null;

  if (primaryColor && !isValidHexColor(primaryColor)) {
    return { ok: false, error: "Couleur primaire invalide (format #RRGGBB)." };
  }
  if (accentColor && !isValidHexColor(accentColor)) {
    return { ok: false, error: "Couleur d'accent invalide (format #RRGGBB)." };
  }

  // Sous-domaine public (WL7) : lettres/chiffres/tirets, 2-40, unique.
  const subRaw = String(formData.get("brandSubdomain") ?? "")
    .trim()
    .toLowerCase();
  let brandSubdomain: string | null = null;
  if (subRaw) {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(subRaw)) {
      return {
        ok: false,
        error:
          "Sous-domaine invalide (lettres, chiffres, tirets ; 2 à 40 caractères).",
      };
    }
    const clash = await db.tenant.findFirst({
      where: { brandSubdomain: subRaw, NOT: { id: tenantId } },
      select: { id: true },
    });
    if (clash) return { ok: false, error: "Ce sous-domaine est déjà pris." };
    brandSubdomain = subRaw;
  }

  const data: Record<string, unknown> = {
    brandingEnabled,
    hidePoweredBy,
    brandName,
    emailFromName,
    brandPrimaryColor: primaryColor,
    brandAccentColor: accentColor,
    brandSubdomain,
  };

  // Upload logo / favicon (ou suppression explicite via la case <field>_remove).
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
      if (file.size > MAX_BYTES) {
        return { ok: false, error: `Fichier ${field} trop lourd (max 256 Ko).` };
      }
      if (!ALLOWED_MIME.has(file.type)) {
        return {
          ok: false,
          error: `Format ${field} non supporté (PNG, JPG, WEBP, SVG, GIF).`,
        };
      }
      data[byteCol] = Buffer.from(await file.arrayBuffer());
      data[mimeCol] = file.type;
    }
  }

  await db.tenant.update({ where: { id: tenantId }, data });

  await auditLog({
    action: AuditAction.TENANT_UPDATED,
    outcome: AuditOutcomes.SUCCESS,
    actor: {
      userId: session.user.id as string,
      email: session.user.email ?? "",
      role,
    },
    target: { type: "tenant", id: tenantId },
    tenantId,
    metadata: {
      source: "branding",
      brandingEnabled,
      hidePoweredBy,
      hasSubdomain: Boolean(brandSubdomain),
    },
  });

  // Le branding est résolu dans le layout racine -> on revalide tout.
  revalidatePath("/", "layout");
  revalidatePath("/admin/marque-blanche");
  return { ok: true };
}
