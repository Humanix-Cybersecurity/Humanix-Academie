// SPDX-License-Identifier: AGPL-3.0-or-later
//
// POST /api/drill  -  cree une session d'exercice de crise (hote only).
// L'hote recupere un `code` de salle a partager ; les participants
// rejoignent via /exercice/[code].

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getScenario } from "@/lib/drill/scenarios";

export const dynamic = "force-dynamic";

// Alphabet sans caracteres ambigus (pas de I, O, 0, 1).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function genCode(len = 6): string {
  let s = "";
  for (let i = 0; i < len; i += 1) {
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return s;
}

const CreateSchema = z.object({
  scenarioId: z.string().min(1).max(60),
  mode: z.enum(["ECLAIR", "TABLETOP"]).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tenantId = session.user.tenantId;

  const body = await req.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success || !getScenario(parsed.data.scenarioId)) {
    return NextResponse.json({ error: "invalid_scenario" }, { status: 400 });
  }

  // Code unique (quelques tentatives suffisent vu la taille de l'espace).
  let code = genCode();
  for (let i = 0; i < 6; i += 1) {
    const exists = await db.crisisExercise.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!exists) break;
    code = genCode();
  }

  const exercise = await db.crisisExercise.create({
    data: {
      tenantId,
      scenarioId: parsed.data.scenarioId,
      code,
      hostUserId: session.user.id,
      mode: parsed.data.mode ?? "ECLAIR",
    },
    select: { id: true, code: true },
  });

  return NextResponse.json(exercise);
}
