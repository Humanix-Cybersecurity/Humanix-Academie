// SPDX-License-Identifier: AGPL-3.0-or-later
//
// GET /api/drill/[id]/attestation - PDF d'attestation d'exercice de crise.
// Reserve a l'hote (ou un admin du tenant), exercice TERMINE uniquement.

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getScenario, maxScore } from "@/lib/drill/scenarios";
import {
  AttestationPdf,
  ParticipantAttestationPdf,
} from "@/lib/drill/attestation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

const HOST_ROLES = ["ADMIN", "RSSI", "SUPERADMIN"];

const frDate = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);

const modeLabelOf = (mode: string) =>
  mode === "TABLETOP" ? "Table-top (roles assignes)" : "Eclair (collectif)";

export async function GET(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;
  const { id } = await ctx.params;
  // scope=self : attestation NOMINATIVE de participation (accessible a tout
  // participant). Par defaut : attestation COLLECTIVE, reservee a l'hote.
  const scope = new URL(req.url).searchParams.get("scope");

  const ex = await db.crisisExercise.findFirst({ where: { id, tenantId } });
  if (!ex) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (ex.status !== "ENDED") {
    return NextResponse.json({ error: "not_ended" }, { status: 409 });
  }

  const scenario = getScenario(ex.scenarioId);
  if (!scenario) {
    return NextResponse.json({ error: "no_scenario" }, { status: 500 });
  }

  if (scope === "self") {
    return participantAttestation(
      { id: session.user.id as string, name: session.user.name },
      tenantId,
      ex,
      scenario,
    );
  }

  const isHost =
    ex.hostUserId === session.user.id || HOST_ROLES.includes(session.user.role);
  if (!isHost) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const [tenant, host, agg] = await Promise.all([
    db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    db.user.findUnique({
      where: { id: ex.hostUserId },
      select: { name: true, email: true },
    }),
    db.crisisParticipant.aggregate({
      where: { exerciseId: ex.id },
      _count: true,
      _avg: { score: true },
    }),
  ]);

  const data = {
    orgName: tenant?.name ?? "Votre organisation",
    hostName: host?.name ?? host?.email ?? "Organisateur",
    scenarioTitle: scenario.title,
    participantCount: agg._count,
    avgScore: Math.round(agg._avg.score ?? 0),
    maxScore: maxScore(scenario),
    modeLabel: modeLabelOf(ex.mode),
    dateStr: frDate(ex.endedAt ?? ex.createdAt),
    generatedStr: frDate(new Date()),
  };

  const buffer = await renderToBuffer(<AttestationPdf data={data} />);

  // Trace best-effort
  await db.event
    .create({
      data: {
        tenantId,
        userId: session.user.id ?? null,
        type: "drill_attestation_generated",
        payload: { exerciseId: ex.id, scenarioId: ex.scenarioId },
      },
    })
    .catch(() => {
      /* best-effort */
    });

  const filename = `humanix-attestation-exercice-crise.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Attestation nominative : le participant telecharge SA preuve de
 * participation avec son score individuel. Aucune contrainte de role, mais
 * il doit avoir reellement rejoint l'exercice (ligne CrisisParticipant).
 */
async function participantAttestation(
  actor: { id: string; name: string | null | undefined },
  tenantId: string,
  ex: {
    id: string;
    scenarioId: string;
    mode: string;
    endedAt: Date | null;
    createdAt: Date;
  },
  scenario: NonNullable<ReturnType<typeof getScenario>>,
) {
  const userId = actor.id;
  const me = await db.crisisParticipant.findUnique({
    where: { exerciseId_userId: { exerciseId: ex.id, userId } },
    select: { name: true, role: true, score: true },
  });
  if (!me) {
    // L'utilisateur n'a pas participe : rien a attester (et on ne divulgue
    // pas l'existence de l'exercice au-dela du tenant deja verifie).
    return NextResponse.json({ error: "not_participant" }, { status: 403 });
  }

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  const data = {
    orgName: tenant?.name ?? "Votre organisation",
    participantName: me.name || (actor.name ?? "Participant"),
    role: me.role,
    scenarioTitle: scenario.title,
    score: me.score,
    maxScore: maxScore(scenario),
    modeLabel: modeLabelOf(ex.mode),
    dateStr: frDate(ex.endedAt ?? ex.createdAt),
    generatedStr: frDate(new Date()),
  };

  const buffer = await renderToBuffer(
    <ParticipantAttestationPdf data={data} />,
  );

  await db.event
    .create({
      data: {
        tenantId,
        userId,
        type: "drill_attestation_self_generated",
        payload: { exerciseId: ex.id, scenarioId: ex.scenarioId },
      },
    })
    .catch(() => {
      /* best-effort */
    });

  const filename = `humanix-attestation-participation.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
