// SPDX-License-Identifier: AGPL-3.0-or-later
//
// GET  /api/drill/[id]   - etat courant (endpoint de POLLING, ~2s cote client)
// POST /api/drill/[id]   - actions : { action: "join" | "answer" | "advance" }
//
// Tout est scope au tenant de l'utilisateur connecte. Pendant le vote, on ne
// renvoie JAMAIS quel choix est le bon (points/isBest caches) : la revelation
// n'arrive qu'en phase REVEAL, pilotee par l'hote.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getScenario, maxScore } from "@/lib/drill/scenarios";
import { advanceDrill, hostActionLabel, tallyVotes } from "@/lib/drill/engine";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const HOST_ROLES = ["ADMIN", "RSSI", "SUPERADMIN"];

export async function GET(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;
  const { id } = await ctx.params;

  const ex = await db.crisisExercise.findFirst({ where: { id, tenantId } });
  if (!ex) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const scenario = getScenario(ex.scenarioId);
  if (!scenario)
    return NextResponse.json({ error: "no_scenario" }, { status: 500 });

  const isHost =
    ex.hostUserId === session.user.id || HOST_ROLES.includes(session.user.role);

  const participantCount = await db.crisisParticipant.count({
    where: { exerciseId: ex.id },
  });
  const me = await db.crisisParticipant.findUnique({
    where: {
      exerciseId_userId: { exerciseId: ex.id, userId: session.user.id },
    },
    select: { id: true, score: true },
  });

  // Contenu de la manche courante (sans divulguer le bon choix en phase VOTING)
  let round: null | {
    num: number;
    time: string;
    narrative: string;
    prompt: string;
    respondedCount: number;
    choices: Array<{ id: string; label: string; emoji: string }>;
  } = null;
  let myAnswer: string | null = null;
  let reveal: null | {
    hexVerdict: string;
    bestChoiceId: string | null;
    tally: ReturnType<typeof tallyVotes>;
  } = null;

  if (ex.status === "RUNNING") {
    const r = scenario.rounds.find((x) => x.num === ex.currentRound) ?? null;
    if (r) {
      const respondedCount = await db.crisisResponse.count({
        where: { exerciseId: ex.id, round: r.num },
      });
      round = {
        num: r.num,
        time: r.time,
        narrative: r.narrative,
        prompt: r.prompt,
        respondedCount,
        choices: r.choices.map((c) => ({
          id: c.id,
          label: c.label,
          emoji: c.emoji,
        })),
      };
      if (me) {
        const resp = await db.crisisResponse.findUnique({
          where: {
            participantId_round: { participantId: me.id, round: r.num },
          },
          select: { choiceId: true },
        });
        myAnswer = resp?.choiceId ?? null;
      }
      if (ex.phase === "REVEAL") {
        const responses = await db.crisisResponse.findMany({
          where: { exerciseId: ex.id, round: r.num },
          select: { choiceId: true },
        });
        reveal = {
          hexVerdict: r.hexVerdict,
          bestChoiceId: r.choices.find((c) => c.isBest)?.id ?? null,
          tally: tallyVotes(
            r,
            responses.map((x) => x.choiceId),
          ),
        };
      }
    }
  }

  // Classement en fin d'exercice
  let leaderboard: null | {
    rows: Array<{ rank: number; name: string; score: number }>;
    max: number;
  } = null;
  if (ex.status === "ENDED") {
    const parts = await db.crisisParticipant.findMany({
      where: { exerciseId: ex.id },
      select: { name: true, score: true },
      orderBy: [{ score: "desc" }, { name: "asc" }],
      take: 20,
    });
    leaderboard = {
      rows: parts.map((p, i) => ({
        rank: i + 1,
        name: p.name,
        score: p.score,
      })),
      max: maxScore(scenario),
    };
  }

  return NextResponse.json({
    session: {
      id: ex.id,
      code: ex.code,
      scenarioTitle: scenario.title,
      status: ex.status,
      currentRound: ex.currentRound,
      phase: ex.phase,
      totalRounds: scenario.rounds.length,
    },
    isHost,
    hostAction: hostActionLabel(
      { status: ex.status, currentRound: ex.currentRound, phase: ex.phase },
      scenario.rounds.length,
    ),
    participantCount,
    me,
    myAnswer,
    round,
    reveal,
    leaderboard,
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const tenantId = session.user.tenantId;
  const { id } = await ctx.params;

  const ex = await db.crisisExercise.findFirst({ where: { id, tenantId } });
  if (!ex) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const scenario = getScenario(ex.scenarioId);
  if (!scenario)
    return NextResponse.json({ error: "no_scenario" }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    choiceId?: string;
  };

  // ---- Rejoindre la salle -------------------------------------------------
  if (body.action === "join") {
    if (ex.status === "ENDED") {
      return NextResponse.json({ error: "ended" }, { status: 409 });
    }
    const name = (
      session.user.name?.trim() ||
      session.user.email?.split("@")[0] ||
      "Participant"
    ).slice(0, 60);
    const p = await db.crisisParticipant.upsert({
      where: {
        exerciseId_userId: { exerciseId: ex.id, userId: session.user.id },
      },
      create: { exerciseId: ex.id, userId: session.user.id, name },
      update: {},
      select: { id: true },
    });
    return NextResponse.json({ participantId: p.id });
  }

  // ---- Voter --------------------------------------------------------------
  if (body.action === "answer") {
    if (ex.status !== "RUNNING" || ex.phase !== "VOTING") {
      return NextResponse.json({ error: "not_voting" }, { status: 409 });
    }
    const round = scenario.rounds.find((r) => r.num === ex.currentRound);
    if (!round) {
      return NextResponse.json({ error: "no_round" }, { status: 409 });
    }
    const choice = round.choices.find((c) => c.id === body.choiceId);
    if (!choice) {
      return NextResponse.json({ error: "bad_choice" }, { status: 400 });
    }
    const p = await db.crisisParticipant.findUnique({
      where: {
        exerciseId_userId: { exerciseId: ex.id, userId: session.user.id },
      },
      select: { id: true },
    });
    if (!p) return NextResponse.json({ error: "not_joined" }, { status: 409 });

    await db.$transaction(async (tx) => {
      await tx.crisisResponse.upsert({
        where: {
          participantId_round: { participantId: p.id, round: round.num },
        },
        create: {
          exerciseId: ex.id,
          participantId: p.id,
          round: round.num,
          choiceId: choice.id,
          points: choice.points,
        },
        update: { choiceId: choice.id, points: choice.points },
      });
      const agg = await tx.crisisResponse.aggregate({
        where: { participantId: p.id },
        _sum: { points: true },
      });
      await tx.crisisParticipant.update({
        where: { id: p.id },
        data: { score: agg._sum.points ?? 0 },
      });
    });
    return NextResponse.json({ ok: true });
  }

  // ---- Avancer (hote only) ------------------------------------------------
  if (body.action === "advance") {
    const isHost =
      ex.hostUserId === session.user.id ||
      HOST_ROLES.includes(session.user.role);
    if (!isHost) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const next = advanceDrill(
      { status: ex.status, currentRound: ex.currentRound, phase: ex.phase },
      scenario.rounds.length,
    );
    await db.crisisExercise.update({
      where: { id: ex.id },
      data: {
        status: next.status,
        currentRound: next.currentRound,
        phase: next.phase,
        ...(ex.status === "LOBBY" && next.status === "RUNNING"
          ? { startedAt: new Date() }
          : {}),
        ...(next.status === "ENDED" ? { endedAt: new Date() } : {}),
      },
    });
    return NextResponse.json({ ok: true, status: next.status });
  }

  return NextResponse.json({ error: "bad_action" }, { status: 400 });
}
