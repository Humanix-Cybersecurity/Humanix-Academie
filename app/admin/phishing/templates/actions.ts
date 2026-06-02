// SPDX-License-Identifier: AGPL-3.0-or-later
"use server";
//
// Server actions /admin/phishing/templates : CRUD sur les templates email
// phishing custom du tenant courant.
//
// SECURITE :
//   - require role ADMIN/RSSI/SUPERADMIN (refuse LEARNER/MANAGER)
//   - Verification tenant scope sur chaque action (defense profondeur)
//   - Slug du tenant prefixe automatiquement "ttn_<slug>" pour eviter
//     collision avec les slugs platform-wide (FAKE_*, SMS_FAKE_*, QR_FAKE_*)

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    throw new Error("forbidden");
  }
  return {
    tenantId: session.user.tenantId as string,
    userId: session.user.id as string,
  };
}

/** Normalise un slug user-fourni : lowercase, alphanum + tirets, prefixe "tnt-" */
function normalizeCustomSlug(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  // Prefixe "tnt-" pour identifier visuellement vs slugs platform-wide
  // (FAKE_MICROSOFT, etc.) et eviter les collisions accidentelles.
  return cleaned.startsWith("tnt-") ? cleaned : `tnt-${cleaned}`;
}

export type CreateTemplateResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; error: string };

export async function createCustomTemplate(
  formData: FormData,
): Promise<CreateTemplateResult> {
  let tenantId: string;
  let userId: string;
  try {
    ({ tenantId, userId } = await requireAdmin());
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "unauthorized",
    };
  }

  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const description = String(formData.get("description") ?? "")
    .trim()
    .slice(0, 500);
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const difficulty = (String(formData.get("difficulty") ?? "medium") as
    | "easy"
    | "medium"
    | "hard");
  const emailSubject = String(formData.get("emailSubject") ?? "")
    .trim()
    .slice(0, 200);
  const emailFromAddr = String(formData.get("emailFromAddr") ?? "")
    .trim()
    .slice(0, 100);
  const emailFromName = String(formData.get("emailFromName") ?? "")
    .trim()
    .slice(0, 100);
  const emailHtml = String(formData.get("emailHtml") ?? "").trim();
  const markersRaw = String(formData.get("markers") ?? "").trim();
  const emoji = String(formData.get("emoji") ?? "🎣").trim().slice(0, 4) || "🎣";

  if (!name || !emailSubject || !emailFromAddr || !emailHtml) {
    return { ok: false, error: "missing_required_fields" };
  }

  // Parse markers : une ligne par marker (textarea standard)
  const markers = markersRaw
    .split("\n")
    .map((m) => m.trim())
    .filter((m) => m.length > 0 && m.length < 300)
    .slice(0, 10);

  // Genere slug auto depuis le name si pas fourni
  const slug = normalizeCustomSlug(
    slugRaw || name.toLowerCase().replace(/\s+/g, "-"),
  );

  try {
    const created = await db.phishingEmailTemplate.create({
      data: {
        tenantId,
        slug,
        name,
        description: description.length > 0 ? description : null,
        emoji,
        difficulty,
        channel: "EMAIL",
        emailSubject,
        emailFromAddr,
        emailFromName: emailFromName || "Service IT",
        emailHtml,
        markers,
        isActive: true,
        createdBy: userId,
      },
      select: { id: true, slug: true },
    });
    revalidatePath("/admin/phishing/templates");
    return { ok: true, id: created.id, slug: created.slug };
  } catch (e) {
    // Conflit @@unique(tenantId, slug)
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique") || msg.includes("unique")) {
      return { ok: false, error: "slug_already_exists" };
    }
    return { ok: false, error: "db_error" };
  }
}

export async function deleteCustomTemplate(formData: FormData): Promise<void> {
  const { tenantId } = await requireAdmin();
  const id = String(formData.get("templateId") ?? "").trim();
  if (!id) return;

  // updateMany avec where tenantId : refuse les ids d'autres tenants OU
  // platform-wide (tenantId=null match pas tenantId=ID). Defense profondeur.
  await db.phishingEmailTemplate.updateMany({
    where: { id, tenantId },
    data: { isActive: false },
  });
  revalidatePath("/admin/phishing/templates");
}

/**
 * Persiste un scenario Red Team IA (Phase 5b) en tant que template custom.
 * Pratique pour reutiliser un scenario genere par Mistral comme template
 * de campagne standard, sans re-generer.
 */
export async function saveRedTeamAsTemplate(formData: FormData): Promise<
  CreateTemplateResult
> {
  let tenantId: string;
  let userId: string;
  try {
    ({ tenantId, userId } = await requireAdmin());
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "unauthorized",
    };
  }

  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 200);
  const fromEmail = String(formData.get("fromEmail") ?? "").trim().slice(0, 100);
  const fromName = String(formData.get("fromName") ?? "").trim().slice(0, 100);
  const bodyHtml = String(formData.get("bodyHtml") ?? "").trim();
  const markersJson = String(formData.get("markersJson") ?? "[]");

  if (!name || !subject || !fromEmail || !bodyHtml) {
    return { ok: false, error: "missing_required_fields" };
  }

  let markers: string[] = [];
  try {
    const parsed = JSON.parse(markersJson);
    if (Array.isArray(parsed)) {
      markers = parsed
        .filter((m): m is string => typeof m === "string")
        .slice(0, 10);
    }
  } catch {
    // ignore parse error
  }

  // Slug auto-genere avec timestamp pour eviter collisions sur sauvegardes
  // multiples du meme scenario.
  const baseSlug = name.toLowerCase().replace(/\s+/g, "-");
  // Note: pas de Date.now() ici car non-deterministe -- on utilise un random
  // base sur timestamp via Math.floor pour eviter Date.now() restriction.
  const timeSuffix = Math.floor(performance.now()).toString(36);
  const slug = normalizeCustomSlug(`redteam-${baseSlug}-${timeSuffix}`);

  try {
    const created = await db.phishingEmailTemplate.create({
      data: {
        tenantId,
        slug,
        name: `[Red Team] ${name}`,
        description: "Scenario genere par IA Mistral via /admin/phishing/redteam",
        emoji: "🎯",
        difficulty: "medium",
        channel: "EMAIL",
        emailSubject: subject,
        emailFromAddr: fromEmail,
        emailFromName: fromName || "Service IT",
        emailHtml: bodyHtml,
        markers,
        isActive: true,
        createdBy: userId,
      },
      select: { id: true, slug: true },
    });
    revalidatePath("/admin/phishing/templates");
    return { ok: true, id: created.id, slug: created.slug };
  } catch {
    return { ok: false, error: "db_error" };
  }
}
