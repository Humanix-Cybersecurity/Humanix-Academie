// SPDX-License-Identifier: AGPL-3.0-or-later
// Notifications email - rappels aux utilisateurs inactifs
// En DEMO_MODE : log dans NotificationLog seulement (pas d'envoi reel)
// En prod : envoi via la facade lib/email (Scaleway TEM par defaut, FR)
import { db } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/lib/email";

const INACTIVE_THRESHOLD_DAYS = 7;

export type ReminderResult = {
  totalCandidates: number;
  sent: number;
  simulated: number;
  errors: number;
  details: {
    name: string;
    email: string;
    daysSinceLastActivity: number;
    status: string;
  }[];
};

export async function findInactiveUsers(tenantId: string) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - INACTIVE_THRESHOLD_DAYS);

  const users = await db.user.findMany({
    where: {
      tenantId,
      isActive: true,
      role: { in: ["LEARNER", "MANAGER"] },
    },
    include: {
      progress: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
      notificationLogs: {
        where: { type: "REMINDER_INACTIVE" },
        orderBy: { sentAt: "desc" },
        take: 1,
      },
    },
  });

  const inactiveCandidates = users
    .map((u) => {
      const lastActivity = u.progress[0]?.completedAt ?? u.createdAt;
      const lastReminder = u.notificationLogs[0]?.sentAt;
      const daysSince = Math.floor(
        (Date.now() - lastActivity.getTime()) / (24 * 3600 * 1000),
      );
      const daysSinceLastReminder = lastReminder
        ? Math.floor((Date.now() - lastReminder.getTime()) / (24 * 3600 * 1000))
        : Infinity;
      return {
        user: u,
        lastActivity,
        daysSince,
        daysSinceLastReminder,
      };
    })
    .filter(
      (c) =>
        c.daysSince >= INACTIVE_THRESHOLD_DAYS && c.daysSinceLastReminder >= 7,
    );

  return inactiveCandidates;
}

export async function sendReminders(tenantId: string): Promise<ReminderResult> {
  const candidates = await findInactiveUsers(tenantId);
  const result: ReminderResult = {
    totalCandidates: candidates.length,
    sent: 0,
    simulated: 0,
    errors: 0,
    details: [],
  };

  const isDemo = process.env.DEMO_MODE === "true";
  const fromEmail = process.env.EMAIL_FROM || "hex@humanixacademy.fr";

  for (const c of candidates) {
    const status = isDemo ? "simulated" : "sent";
    try {
      if (!isDemo && isEmailConfigured()) {
        const sendRes = await sendEmail({
          to: c.user.email,
          from: fromEmail,
          subject: "🦊 Hex t'attend pour ta dose cyber hebdomadaire",
          html: reminderEmailHTML(c.user.name ?? "", c.daysSince),
        });
        if (sendRes.ok) {
          result.sent++;
        } else {
          result.errors++;
        }
      } else {
        result.simulated++;
      }
      await db.notificationLog.create({
        data: {
          tenantId,
          userId: c.user.id,
          type: "REMINDER_INACTIVE",
          channel: "email",
          status,
          payload: { daysSince: c.daysSince },
        },
      });
      result.details.push({
        name: c.user.name ?? c.user.email,
        email: c.user.email,
        daysSinceLastActivity: c.daysSince,
        status,
      });
    } catch (e) {
      result.errors++;
    }
  }

  return result;
}

function reminderEmailHTML(name: string, days: number): string {
  return `
<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #EAF3F8; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; text-align: center;">
    <div style="font-size: 56px;">🦊</div>
    <h1 style="color: #0B3D91; margin: 16px 0 8px;">${name ? `${name}, tu me manques !` : "Tu me manques !"}</h1>
    <p style="color: #555; line-height: 1.6;">
      Ça fait ${days} jours que je ne t'ai pas vu sur Humanix Académie.
      Une session de 5 minutes te suffit pour rester sur ta lancée.
    </p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/apprendre"
       style="display: inline-block; margin: 24px 0; background: #00A3A1; color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: bold;">
      Reprendre mon parcours →
    </a>
    <p style="color: #999; font-size: 13px;">À très vite, Hex.</p>
  </div>
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 24px;">
    Humanix Académie by Humanix Cybersecurity · Tu peux te désinscrire des rappels dans ton profil.
  </p>
</body></html>`;
}
