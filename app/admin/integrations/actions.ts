"use server";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Server actions admin pour la page /admin/integrations.
// Validation Zod stricte. Authz : ADMIN/MANAGER/SUPERADMIN obligatoire,
// scoping tenant systematique (impossible de toucher au webhook d'un autre).

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ALL_WEBHOOK_EVENTS, isWebhookEventKey } from "@/lib/webhooks/events";
import { testWebhook } from "@/lib/webhooks/dispatcher";
import type { WebhookType } from "@prisma/client";

async function requireAdminTenant(): Promise<{ tenantId: string }> {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "SUPERADMIN") {
    throw new Error("forbidden");
  }
  const tenantId = (session?.user as any)?.tenantId as string;
  if (!tenantId) throw new Error("forbidden");
  return { tenantId };
}

const TYPES: WebhookType[] = ["SLACK", "TEAMS", "GENERIC"];

const CreateSchema = z.object({
  label: z.string().min(2).max(120),
  type: z.enum(TYPES as [WebhookType, ...WebhookType[]]),
  url: z
    .string()
    .url()
    .max(1000)
    .refine((u) => u.startsWith("https://"), "URL HTTPS obligatoire"),
  events: z.array(z.string()).min(1, "Au moins un évènement requis"),
});

export async function createWebhook(formData: FormData) {
  const { tenantId } = await requireAdminTenant();

  const events = formData
    .getAll("events")
    .map(String)
    .filter(isWebhookEventKey);

  const parsed = CreateSchema.safeParse({
    label: formData.get("label"),
    type: formData.get("type"),
    url: formData.get("url"),
    events,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Données invalides");
  }
  const data = parsed.data;

  // Validation supplementaire : pas plus de 10 webhooks par tenant
  const count = await db.tenantWebhook.count({ where: { tenantId } });
  if (count >= 10) throw new Error("Limite de 10 webhooks par tenant atteinte");

  // Genere un secret aleatoire pour les GENERIC
  const secret =
    data.type === "GENERIC" ? crypto.randomBytes(32).toString("hex") : null;

  await db.tenantWebhook.create({
    data: {
      tenantId,
      label: data.label,
      type: data.type,
      url: data.url,
      events: data.events.filter(isWebhookEventKey).join(","),
      secret,
      isActive: true,
    },
  });

  revalidatePath("/admin/integrations");
}

export async function deleteWebhook(formData: FormData) {
  const { tenantId } = await requireAdminTenant();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("missing id");

  // Scoping tenant : impossible de supprimer un webhook d'un autre tenant
  await db.tenantWebhook.deleteMany({ where: { id, tenantId } });
  revalidatePath("/admin/integrations");
}

export async function toggleWebhook(formData: FormData) {
  const { tenantId } = await requireAdminTenant();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("missing id");

  const w = await db.tenantWebhook.findFirst({ where: { id, tenantId } });
  if (!w) throw new Error("not found");

  await db.tenantWebhook.update({
    where: { id },
    data: { isActive: !w.isActive },
  });
  revalidatePath("/admin/integrations");
}

export async function fireTestWebhook(formData: FormData): Promise<void> {
  const { tenantId } = await requireAdminTenant();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("missing id");

  // Verifie le scoping
  const w = await db.tenantWebhook.findFirst({ where: { id, tenantId } });
  if (!w) throw new Error("not found");

  await testWebhook(id);
  revalidatePath("/admin/integrations");
}

// Toutes les valeurs publiques d'evenements (pour validation cote client si besoin)
export async function getAllWebhookEvents(): Promise<readonly string[]> {
  return ALL_WEBHOOK_EVENTS;
}
