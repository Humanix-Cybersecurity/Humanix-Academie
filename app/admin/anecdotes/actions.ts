"use server";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Server actions admin (SUPERADMIN) pour gerer les anecdotes hebdo.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dispatchWeeklyAnecdote } from "@/lib/anecdotes/dispatcher";
import type { AnecdoteCategory } from "@prisma/client";

async function requireSuperAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "SUPERADMIN") throw new Error("forbidden");
}

const CATEGORIES: AnecdoteCategory[] = [
  "RANSOMWARE",
  "PHISHING",
  "FRAUDE",
  "DATA_LEAK",
  "SUPPLY_CHAIN",
  "HACKTIVISME",
  "IA_ABUS",
  "AUTRE",
];

const AnecdoteSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Slug : minuscules, chiffres, tirets uniquement."),
  title: z.string().min(5).max(200),
  summary: z.string().min(20).max(2000),
  lesson: z.string().min(20).max(2000),
  miniAction: z.string().min(20).max(2000),
  sourceUrl: z.string().url().max(500),
  sourceLabel: z.string().min(2).max(120),
  category: z.enum(CATEGORIES as [AnecdoteCategory, ...AnecdoteCategory[]]),
  incidentDate: z.string().min(8),
  scheduledFor: z.string().optional().nullable(),
  isActive: z.coerce.boolean().optional().default(true),
});

export async function upsertAnecdote(formData: FormData) {
  await requireSuperAdmin();

  const parsed = AnecdoteSchema.safeParse({
    id: formData.get("id") || undefined,
    slug: formData.get("slug"),
    title: formData.get("title"),
    summary: formData.get("summary"),
    lesson: formData.get("lesson"),
    miniAction: formData.get("miniAction"),
    sourceUrl: formData.get("sourceUrl"),
    sourceLabel: formData.get("sourceLabel"),
    category: formData.get("category"),
    incidentDate: formData.get("incidentDate"),
    scheduledFor: formData.get("scheduledFor") || null,
    isActive:
      formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Données invalides.");
  }
  const data = parsed.data;

  const payload = {
    slug: data.slug,
    title: data.title,
    summary: data.summary,
    lesson: data.lesson,
    miniAction: data.miniAction,
    sourceUrl: data.sourceUrl,
    sourceLabel: data.sourceLabel,
    category: data.category,
    incidentDate: new Date(data.incidentDate),
    scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
    isActive: data.isActive,
  };

  if (data.id) {
    await db.weeklyAnecdote.update({
      where: { id: data.id },
      data: payload,
    });
  } else {
    await db.weeklyAnecdote.create({ data: payload });
  }
  revalidatePath("/admin/anecdotes");
  redirect("/admin/anecdotes");
}

export async function deleteAnecdote(id: string) {
  await requireSuperAdmin();
  await db.weeklyAnecdote.delete({ where: { id } });
  revalidatePath("/admin/anecdotes");
}

export async function dispatchNow(anecdoteId?: string) {
  await requireSuperAdmin();
  const result = await dispatchWeeklyAnecdote({
    anecdoteId,
    force: false,
  });
  revalidatePath("/admin/anecdotes");
  return result;
}

export async function seedAnecdotesIfEmpty() {
  await requireSuperAdmin();
  // En mode DEMO, on refuse de seed du contenu premium : l'instance
  // doit refleter l'experience OSS pure.
  if (process.env.DEMO_MODE === "true") {
    return {
      ok: false,
      reason: "Indisponible en mode démo (contenu premium désactivé).",
    };
  }
  const count = await db.weeklyAnecdote.count();
  if (count > 0) return { ok: false, reason: "Des anecdotes existent déjà." };
  const { ANECDOTES_SEED } = await import("@/lib/anecdotes/seed-data");
  for (const a of ANECDOTES_SEED) {
    await db.weeklyAnecdote.create({
      data: {
        slug: a.slug,
        title: a.title,
        summary: a.summary,
        lesson: a.lesson,
        miniAction: a.miniAction,
        sourceUrl: a.sourceUrl,
        sourceLabel: a.sourceLabel,
        category: a.category,
        incidentDate: new Date(a.incidentDate),
      },
    });
  }
  revalidatePath("/admin/anecdotes");
  return { ok: true, count: ANECDOTES_SEED.length };
}

/**
 * Form-action compatible : Next 15 attend (formData) => void | Promise<void>
 * Ce wrapper appelle seedAnecdotesIfEmpty et ignore le retour.
 */
export async function seedAnecdotesFormAction(
  _formData: FormData,
): Promise<void> {
  await seedAnecdotesIfEmpty();
}
