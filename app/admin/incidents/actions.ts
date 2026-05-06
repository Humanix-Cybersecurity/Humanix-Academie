"use server";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Server actions du module Cyber-Reflexe (reponse a incident).
// Toutes les actions sont gated Pro+ et tenant-scoped.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantPlan, planHasFeature } from "@/lib/plans";
import {
  createIncident,
  toggleAction as svcToggleAction,
  addTimelineEvent as svcAddTimelineEvent,
  updateIncidentStatus as svcUpdateStatus,
} from "@/lib/incident-response/service";
import type {
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
} from "@prisma/client";

const VALID_TYPES: IncidentType[] = [
  "RANSOMWARE",
  "DATA_LEAK",
  "PHISHING_VICTIM",
  "FRAUDE_FINANCIERE",
  "COMPTE_COMPROMIS",
  "INTRUSION",
  "DDOS",
  "AUTRE",
];

const VALID_SEVERITIES: IncidentSeverity[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
];

const VALID_STATUSES: IncidentStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "CONTAINED",
  "RESOLVED",
  "CLOSED",
];

async function requireAdminWithPlan() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") throw new Error("forbidden");
  const tenantId = session.user!.tenantId as string;
  const userId = session.user!.id as string;
  const plan = await getTenantPlan(tenantId);
  if (!planHasFeature(plan, "incidents")) {
    throw new Error("plan_required");
  }
  return { tenantId, userId, userName: session.user.name ?? "Anonyme" };
}

// ===========================================================================
// CREATION D'INCIDENT
// ===========================================================================
const CreateSchema = z.object({
  title: z.string().min(5).max(200),
  type: z.enum(VALID_TYPES as [IncidentType, ...IncidentType[]]),
  severity: z.enum(
    VALID_SEVERITIES as [IncidentSeverity, ...IncidentSeverity[]],
  ),
  detectedAt: z.string().min(8),
  description: z.string().min(20).max(5000),
  affectedSystems: z.string().max(1000).optional().nullable(),
  affectedUsers: z.coerce.number().int().min(0).optional().nullable(),
  dataConcerned: z.string().max(1000).optional().nullable(),
});

export async function createIncidentAction(formData: FormData) {
  const ctx = await requireAdminWithPlan();

  const parsed = CreateSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    severity: formData.get("severity"),
    detectedAt: formData.get("detectedAt"),
    description: formData.get("description"),
    affectedSystems: formData.get("affectedSystems") || null,
    affectedUsers: formData.get("affectedUsers") || null,
    dataConcerned: formData.get("dataConcerned") || null,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Données invalides.");
  }

  const incident = await createIncident({
    tenantId: ctx.tenantId,
    reportedById: ctx.userId,
    title: parsed.data.title,
    type: parsed.data.type,
    severity: parsed.data.severity,
    detectedAt: new Date(parsed.data.detectedAt),
    description: parsed.data.description,
    affectedSystems: parsed.data.affectedSystems,
    affectedUsers: parsed.data.affectedUsers ?? null,
    dataConcerned: parsed.data.dataConcerned,
  });

  revalidatePath("/admin/incidents");
  redirect(`/admin/incidents/${incident.id}`);
}

// ===========================================================================
// TOGGLE ACTION (case a cocher dans la checklist)
// ===========================================================================
export async function toggleIncidentAction(actionId: string, done: boolean) {
  const ctx = await requireAdminWithPlan();
  // Verifier que l'action appartient bien au tenant
  const action = await db.incidentAction.findUnique({
    where: { id: actionId },
    include: { incident: { select: { tenantId: true, id: true } } },
  });
  if (!action || action.incident.tenantId !== ctx.tenantId) {
    throw new Error("forbidden");
  }
  await svcToggleAction(actionId, done, ctx.userId);
  revalidatePath(`/admin/incidents/${action.incident.id}`);
}

// ===========================================================================
// AJOUT EVENEMENT TIMELINE
// ===========================================================================
export async function addTimelineNote(formData: FormData) {
  const ctx = await requireAdminWithPlan();
  const incidentId = String(formData.get("incidentId") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  const kind = String(formData.get("kind") ?? "note");

  if (content.length < 3 || content.length > 4000) {
    throw new Error("Contenu invalide (3-4000 caracteres).");
  }
  // Tenant check
  const incident = await db.incidentResponse.findFirst({
    where: { id: incidentId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!incident) throw new Error("not_found");

  await svcAddTimelineEvent({
    incidentId,
    authorId: ctx.userId,
    authorName: ctx.userName,
    kind,
    content,
  });
  revalidatePath(`/admin/incidents/${incidentId}`);
}

// ===========================================================================
// CHANGEMENT DE STATUT
// ===========================================================================
export async function changeIncidentStatus(incidentId: string, status: string) {
  const ctx = await requireAdminWithPlan();
  if (!VALID_STATUSES.includes(status as IncidentStatus)) {
    throw new Error("invalid_status");
  }
  const incident = await db.incidentResponse.findFirst({
    where: { id: incidentId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!incident) throw new Error("not_found");

  await svcUpdateStatus(incidentId, status as IncidentStatus);
  await svcAddTimelineEvent({
    incidentId,
    authorId: ctx.userId,
    authorName: ctx.userName,
    kind: "decision",
    content: `Statut changé en : ${status}`,
  });
  revalidatePath(`/admin/incidents/${incidentId}`);
}

// ===========================================================================
// RETEX (notes de retour d'experience)
// ===========================================================================
export async function saveRetex(formData: FormData) {
  const ctx = await requireAdminWithPlan();
  const incidentId = String(formData.get("incidentId") ?? "");
  const rootCause = String(formData.get("rootCause") ?? "").slice(0, 5000);
  const retexNotes = String(formData.get("retexNotes") ?? "").slice(0, 5000);
  const estimatedCostRaw = String(formData.get("estimatedCost") ?? "").trim();
  const estimatedCost = estimatedCostRaw ? Number(estimatedCostRaw) : null;

  const incident = await db.incidentResponse.findFirst({
    where: { id: incidentId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!incident) throw new Error("not_found");

  await db.incidentResponse.update({
    where: { id: incidentId },
    data: {
      rootCause: rootCause || null,
      retexNotes: retexNotes || null,
      estimatedCost: Number.isFinite(estimatedCost) ? estimatedCost : null,
    },
  });
  revalidatePath(`/admin/incidents/${incidentId}`);
}
