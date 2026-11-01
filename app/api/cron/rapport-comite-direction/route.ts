// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Endpoint cron : rapport mensuel de conformite au comite de direction.
//
// Ferme #750. Frequence : une fois par mois, le 1er. La logique et les
// choix de conception sont dans lib/rapports/comite-direction.ts --
// notamment pourquoi on envoie un LIEN et non une piece jointe.
//
// Configuration cron (infra/cron/crontab.prod) :
//   0 7 1 * *   (le 1er du mois a 07h00, heure de la machine)
//
// SECURITE : pas de session NextAuth (cron sans user). Auth via secret
// partage CRON_SECRET, comparaison constante (timing-safe). Meme mecanique
// que les autres crons du projet.
//
// POST ET GET, COMME LES AUTRES ROUTES CRON
//
// L'ordonnanceur du projet (scripts/cron-runner.sh, appele par la crontab
// de l'hote) frappe chaque job en POST. Cette route n'exposait que GET :
// Next.js repondait 405 avant meme de lire le secret, et le rapport n'est
// jamais parti, ni le 1er septembre, ni le 1er octobre, ni le 1er novembre
// 2026 (« ECHEC 405 apres 0s job=rapport-comite-direction » dans
// /var/log/humanix/cron.log). Le GET reste pour les ordonnanceurs qui ne
// savent faire que des GET, secret en query. Le test voisin verifie que
// chaque route de app/api/cron expose bien POST.

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

async function lancer(provided: string | null) {
  if (!verifySecret(provided)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const result = await recordCronRun("rapport-comite-direction", () =>
    envoyerRapportsMensuels(),
  );
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: NextRequest) {
  return lancer(req.headers.get("x-cron-secret"));
}

// Support GET pour les services qui ne savent faire que des GET
// (cron-job.org gratuit). Securite identique : secret en en-tete ou en query.
export async function GET(req: NextRequest) {
  return lancer(
    req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret"),
  );
}
