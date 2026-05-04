// SPDX-License-Identifier: AGPL-3.0-or-later
// Couche service du module Post-Incident.
// Encapsule : creation d'incident (avec generation auto checklist), update,
// transitions de statut, ajout d'evenements timeline.

import { db } from "@/lib/db";
import { getPlaybook } from "./playbooks";
import type {
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
} from "@prisma/client";

export type CreateIncidentInput = {
  tenantId: string;
  reportedById?: string | null;
  title: string;
  type: IncidentType;
  severity?: IncidentSeverity;
  detectedAt: Date;
  description: string;
  affectedSystems?: string | null;
  affectedUsers?: number | null;
  dataConcerned?: string | null;
};

// Genere la prochaine reference INC-YYYY-NNN pour le tenant
async function nextReference(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.incidentResponse.count({
    where: { tenantId, reference: { startsWith: `INC-${year}-` } },
  });
  const num = String(count + 1).padStart(3, "0");
  return `INC-${year}-${num}`;
}

export async function createIncident(input: CreateIncidentInput) {
  const reference = await nextReference(input.tenantId);
  const playbook = getPlaybook(input.type);

  const incident = await db.incidentResponse.create({
    data: {
      tenantId: input.tenantId,
      reference,
      title: input.title,
      type: input.type,
      severity: input.severity ?? "MEDIUM",
      detectedAt: input.detectedAt,
      reportedById: input.reportedById ?? null,
      description: input.description,
      affectedSystems: input.affectedSystems ?? null,
      affectedUsers: input.affectedUsers ?? null,
      dataConcerned: input.dataConcerned ?? null,
      actions: {
        create: playbook.map((a, idx) => ({
          phase: a.phase,
          category: a.category,
          title: a.title,
          description: a.description ?? null,
          documentSlug: a.documentSlug ?? null,
          position: idx,
        })),
      },
      timeline: {
        create: {
          authorId: input.reportedById ?? null,
          authorName: "Système",
          kind: "discovery",
          content: `Incident créé : ${input.title}`,
        },
      },
    },
    include: { actions: true, timeline: true },
  });

  return incident;
}

export async function toggleAction(
  actionId: string,
  done: boolean,
  userId: string,
) {
  return db.incidentAction.update({
    where: { id: actionId },
    data: {
      isDone: done,
      doneAt: done ? new Date() : null,
      doneById: done ? userId : null,
    },
  });
}

export async function addTimelineEvent(input: {
  incidentId: string;
  authorId: string;
  authorName: string;
  kind?: string;
  content: string;
}) {
  return db.incidentTimeline.create({
    data: {
      incidentId: input.incidentId,
      authorId: input.authorId,
      authorName: input.authorName,
      kind: input.kind ?? "note",
      content: input.content,
    },
  });
}

export async function updateIncidentStatus(
  incidentId: string,
  status: IncidentStatus,
) {
  const updates: Record<string, any> = { status };
  if (status === "CONTAINED") updates.containedAt = new Date();
  if (status === "RESOLVED") updates.resolvedAt = new Date();
  if (status === "CLOSED") updates.closedAt = new Date();
  return db.incidentResponse.update({
    where: { id: incidentId },
    data: updates,
  });
}

export async function listIncidents(tenantId: string) {
  return db.incidentResponse.findMany({
    where: { tenantId },
    orderBy: [{ status: "asc" }, { detectedAt: "desc" }],
    include: {
      _count: { select: { actions: true } },
    },
  });
}

export async function getIncident(tenantId: string, id: string) {
  return db.incidentResponse.findFirst({
    where: { id, tenantId },
    include: {
      actions: { orderBy: [{ phase: "asc" }, { position: "asc" }] },
      timeline: { orderBy: { occurredAt: "desc" } },
    },
  });
}
