// SPDX-License-Identifier: AGPL-3.0-or-later
//
// POST /api/exposition/metric — beacon agrégé NON-IDENTIFIANT.
// Le check password tourne 100% côté client (le mdp ne touche jamais le
// serveur) ; ce beacon permet juste d'incrémenter un compteur anonyme
// "exposed/clean" pour les stats communautaires. AUCUNE donnée de cible.

import { NextResponse } from "next/server";
import { z } from "zod";
import { recordExposureMetric } from "@/lib/exposure/metrics";

export const dynamic = "force-dynamic";

const Schema = z.object({
  checkType: z.enum(["password", "phone"]),
  bucket: z.enum(["exposed", "clean"]),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await recordExposureMetric(parsed.data.checkType, parsed.data.bucket);
  return NextResponse.json({ ok: true });
}
