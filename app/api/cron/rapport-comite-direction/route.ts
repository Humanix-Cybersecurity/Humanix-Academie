// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Endpoint cron : rapport mensuel de conformite au comite de direction.
//
// Ferme #750. Frequence : une fois par mois, le 1er. La logique et les
// choix de conception sont dans lib/rapports/comite-direction.ts --
// notamment pourquoi on envoie un LIEN et non une piece jointe.
//
// Configuration cron :
//   0 7 1 * *   (le 1er du mois a 07h00, heure de la machine)
//
// SECURITE : pas de session NextAuth (cron sans user). Auth via secret
// partage CRON_SECRET, comparaison constante (timing-safe). Meme mecanique
// que les autres crons du projet.

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { envoyerRapportsMensuels } from "@/lib/rapports/comite-direction";
import { recordCronRun } from "@/lib/cron/record";

export const dynamic = "force-dynamic";

// Un envoi par tenant, sequentiel. 100 tenants a ~300 ms laissent de la
// marge sous cette limite.
export const maxDuration = 60;

function verifySecret(provided: string | null): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected || expected.length < 16) return false;
  if (!provided || provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const provided =
    req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (!verifySecret(provided)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const result = await recordCronRun("rapport-comite-direction", () =>
    envoyerRapportsMensuels(),
  );
  return NextResponse.json({ ok: true, ...result });
}
