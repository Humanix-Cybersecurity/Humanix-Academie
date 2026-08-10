// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Endpoint cron : reevaluation quotidienne des achievements (badges)
// pour TOUS les users actifs, + notifications liees aux saisons
// OBLIGATOIRES (relance et certificat pret, cf. #751).
//
// Cas d'usage : on a ajoute de nouveaux badges au catalogue, ou un
// badge depend de la date courante (ex. "cybermois_participant" qui
// ne se debloque qu'en octobre). Le cron rattrape les badges qui
// auraient pu etre rates a la volee.
//
// Pourquoi greffer les notifications ici : ce cron parcourt deja tous
// les users actifs quotidiennement. Un cron de plus = une entree de
// plus a planifier cote infra, pour la meme population.
//
// Frequence recommandee : 1x/jour (idealement la nuit, ex 03:30 UTC,
// apres le snapshot de risque).
//
// SECURITE : pas de session NextAuth. Auth via secret partage
// CRON_SECRET, comparaison constante (timing-safe).

import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { reEvaluateAllUsers } from "@/lib/achievements/evaluate";
import { notifyMandatoryAllUsers } from "@/lib/notifications-mandatory";
import { recordCronRun } from "@/lib/cron/record";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // badges + notifications, users sequentiels

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

/**
 * Badges puis notifications. Les notifications ne doivent JAMAIS faire
 * echouer la reevaluation des badges (deja effectuee a ce stade) : on
 * isole leur erreur dans la reponse plutot que de propager un 500.
 */
async function runCron() {
  const badges = await recordCronRun("achievements-reevaluate", () =>
    reEvaluateAllUsers(),
  );
  try {
    const notifications = await notifyMandatoryAllUsers();
    return { ok: true, ...badges, notifications };
  } catch (e) {
    console.error("[cron:achievements-reevaluate] notifications failed", e);
    return {
      ok: true,
      ...badges,
      notifications: null,
      notificationsError: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function POST(req: NextRequest) {
  const provided = req.headers.get("x-cron-secret");
  if (!verifySecret(provided)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(await runCron());
}

export async function GET(req: NextRequest) {
  const provided =
    req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (!verifySecret(provided)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(await runCron());
}
