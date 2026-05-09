// SPDX-License-Identifier: AGPL-3.0-or-later
//
// POST /api/admin/users/at-risk/remind
//
// Envoie un email de rappel a une liste d'userIds donnee (selection de
// la table /admin/users/at-risk). Bypass volontairement le filtre des 7j
// du cron (ici l'admin sait ce qu'il fait, il selectionne explicitement).
//
// Body :
//   { userIds: ["...", "..."] }
//
// Reponse :
//   { ok: true, sent, simulated, errors, total }
//
// Auth : ADMIN, RSSI, SUPERADMIN (MANAGER lit en read-only mais ne peut
// pas declencher d'envoi - le formulaire UI le sait deja, defense en
// profondeur ici)
//
// Securite : tenant scope sur les userIds (un admin de tenant A ne peut
// PAS envoyer de rappel a des users du tenant B en bricolant l'array).

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";

const Schema = z.object({
  userIds: z.array(z.string().min(1).max(100)).min(1).max(200),
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
  const tenantId = session.user.tenantId as string;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_payload" },
      { status: 400 },
    );
  }

  // Tenant scope : on ne charge que les users du tenant courant.
  // Si l'admin a envoye des userIds d'un autre tenant, ils sont
  // silencieusement filtres ici.
  const users = await db.user.findMany({
    where: {
      tenantId,
      id: { in: parsed.data.userIds },
      isActive: true,
    },
    include: {
      progress: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 1,
        select: { completedAt: true },
      },
    },
  });

  if (users.length === 0) {
    return NextResponse.json(
      { ok: false, error: "no_valid_users" },
      { status: 404 },
    );
  }

  const isDemo = process.env.DEMO_MODE === "true";
  const fromEmail = process.env.EMAIL_FROM || "hex@humanixacademy.fr";

  let sent = 0;
  let simulated = 0;
  let errors = 0;

  for (const u of users) {
    const lastActivity = u.progress[0]?.completedAt ?? u.createdAt;
    const daysSince = Math.floor(
      (Date.now() - lastActivity.getTime()) / (24 * 3600 * 1000),
    );
    const status = isDemo ? "simulated" : "sent";

    try {
      if (!isDemo && isEmailConfigured()) {
        const sendRes = await sendEmail({
          to: u.email,
          from: fromEmail,
          subject: "🦊 Hex t'attend pour ta dose cyber",
          html: reminderHtml(u.name ?? "", daysSince),
        });
        if (sendRes.ok) sent++;
        else errors++;
      } else {
        simulated++;
      }
      await db.notificationLog.create({
        data: {
          tenantId,
          userId: u.id,
          type: "REMINDER_INACTIVE",
          channel: "email",
          status,
          payload: {
            daysSince,
            triggeredBy: "at-risk-page",
            adminUserId: session.user.id ?? null,
          },
        },
      });
    } catch {
      errors++;
    }
  }

  return NextResponse.json({
    ok: true,
    total: users.length,
    sent,
    simulated,
    errors,
  });
}

function reminderHtml(name: string, days: number): string {
  // Volontairement different du template "auto-cron" pour rendre le
  // mail plus personnel : c'est un envoi MANUEL declenche par le RSSI
  // (effet "ils savent que je n'avance pas, ils prennent soin de moi").
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#EAF3F8;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;padding:40px;text-align:center;">
    <div style="font-size:56px;">🦊</div>
    <h1 style="color:#0B3D91;margin:16px 0 8px;">${name ? `${name}, on pense à toi !` : "On pense à toi !"}</h1>
    <p style="color:#555;line-height:1.6;">
      Ça fait ${days} jours que tu n'as pas avancé sur ton parcours cyber.
      C'est pas grave - on en profite pour te proposer une session courte
      (5 minutes) pour rester sur ta lancée.
    </p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/apprendre"
       style="display:inline-block;margin:24px 0;background:#00A3A1;color:white;text-decoration:none;padding:16px 32px;border-radius:12px;font-weight:bold;">
      Reprendre maintenant →
    </a>
    <p style="color:#999;font-size:13px;">À très vite, Hex.</p>
  </div>
  <p style="text-align:center;color:#999;font-size:12px;margin-top:24px;">
    Humanix Académie · Tu peux te désinscrire des rappels dans ton profil.
  </p>
</body></html>`;
}
