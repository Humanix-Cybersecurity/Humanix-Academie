// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Emetteurs des notifications REMINDER_MANDATORY et CERTIFICATE_READY (#751).
//
// Ces deux valeurs d'enum existaient dans le schema sans aucun emetteur : un
// apprenant pouvait laisser une saison OBLIGATOIRE en plan sans jamais etre
// relance, et terminer une saison obligatoire sans jamais apprendre que son
// certificat etait disponible (le lien n'existait que derriere un bouton
// discret de /profil).
//
// Rattachement : le cron achievements-reevaluate, qui parcourt deja tous les
// users actifs quotidiennement. On greffe ici plutot que de creer un cron de
// plus a planifier cote infra.
//
// La detection du "obligatoire non termine" reprend la logique ecrite mais
// jamais appelee de l'ancien lib/coach.ts (supprime avec le code mort, #747).
//
// DEMO_MODE / email non configure : on journalise avec status "simulated"
// sans envoyer, comme lib/notifications.ts.

import { db } from "@/lib/db";
import { sendEmail, isEmailConfigured } from "@/lib/email";

/** Ne pas relancer un meme user sur la meme saison avant ce delai. */
const MANDATORY_REMINDER_COOLDOWN_DAYS = 7;

export type MandatoryNotifyResult = {
  usersScanned: number;
  remindersSent: number;
  remindersSimulated: number;
  certificatesSent: number;
  certificatesSimulated: number;
  errors: number;
};

type SaisonProgress = {
  saisonId: string;
  title: string;
  slug: string;
  totalEpisodes: number;
  doneEpisodes: number;
};

/**
 * Etat des saisons OBLIGATOIRES d'un tenant pour un user donne.
 * Une saison sans episode publie est ignoree (denominateur nul : ni
 * "en retard" ni "terminee").
 */
export async function computeMandatoryProgress(
  userId: string,
  tenantId: string,
): Promise<SaisonProgress[]> {
  const configs = await db.tenantSaisonConfig.findMany({
    where: { tenantId, isMandatory: true, isActive: true },
    select: {
      saisonId: true,
      saison: {
        select: {
          title: true,
          slug: true,
          episodes: { where: { isPublished: true }, select: { id: true } },
        },
      },
    },
  });
  if (configs.length === 0) return [];

  const done = await db.progress.findMany({
    where: {
      userId,
      status: "COMPLETED",
      saisonId: { in: configs.map((c) => c.saisonId) },
    },
    select: { saisonId: true, episodeId: true },
  });
  // Set par saison : un episode rejoue ne doit pas compter deux fois.
  const doneBySaison = new Map<string, Set<string>>();
  for (const p of done) {
    const set = doneBySaison.get(p.saisonId) ?? new Set<string>();
    set.add(p.episodeId);
    doneBySaison.set(p.saisonId, set);
  }

  return configs
    .map((c) => ({
      saisonId: c.saisonId,
      title: c.saison.title,
      slug: c.saison.slug,
      totalEpisodes: c.saison.episodes.length,
      doneEpisodes: doneBySaison.get(c.saisonId)?.size ?? 0,
    }))
    .filter((s) => s.totalEpisodes > 0);
}

/** A-t-on deja notifie ce user pour CETTE saison, et depuis combien de jours ? */
async function lastNotifiedDaysAgo(
  userId: string,
  type: "REMINDER_MANDATORY" | "CERTIFICATE_READY",
  saisonId: string,
): Promise<number> {
  const rows = await db.notificationLog.findMany({
    where: { userId, type },
    orderBy: { sentAt: "desc" },
    take: 20,
    select: { sentAt: true, payload: true },
  });
  const match = rows.find(
    (r) =>
      r.payload !== null &&
      typeof r.payload === "object" &&
      (r.payload as { saisonId?: string }).saisonId === saisonId,
  );
  if (!match) return Infinity;
  return Math.floor((Date.now() - match.sentAt.getTime()) / (24 * 3600 * 1000));
}

/**
 * Traite UN user : relance sur la saison obligatoire la plus en retard, et
 * annonce du certificat pour chaque saison obligatoire fraichement terminee.
 *
 * Idempotence : NotificationLog fait foi. CERTIFICATE_READY est envoye une
 * seule fois par saison (cooldown infini), REMINDER_MANDATORY est repete au
 * plus une fois par semaine et par saison.
 */
export async function notifyMandatoryForUser(
  user: { id: string; tenantId: string; email: string; name: string | null },
  result: MandatoryNotifyResult,
): Promise<void> {
  const saisons = await computeMandatoryProgress(user.id, user.tenantId);
  if (saisons.length === 0) return;

  const isDemo = process.env.DEMO_MODE === "true";
  const canSend = !isDemo && isEmailConfigured();
  const status = canSend ? "sent" : "simulated";
  const fromEmail = process.env.EMAIL_FROM || "hex@humanixacademy.fr";

  const completed = saisons.filter((s) => s.doneEpisodes >= s.totalEpisodes);
  const pending = saisons.filter((s) => s.doneEpisodes < s.totalEpisodes);

  // 1) Certificat pret : une annonce par saison obligatoire terminee.
  for (const s of completed) {
    const already = await lastNotifiedDaysAgo(
      user.id,
      "CERTIFICATE_READY",
      s.saisonId,
    );
    if (already !== Infinity) continue; // deja annonce : jamais deux fois
    try {
      if (canSend) {
        const res = await sendEmail({
          to: user.email,
          from: fromEmail,
          subject: "🎓 Ton certificat Humanix est prêt",
          html: certificateReadyEmailHTML(user.name ?? "", s.title),
        });
        if (!res.ok) {
          result.errors++;
          continue;
        }
        result.certificatesSent++;
      } else {
        result.certificatesSimulated++;
      }
      await db.notificationLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          type: "CERTIFICATE_READY",
          channel: "email",
          status,
          payload: { saisonId: s.saisonId, saisonSlug: s.slug },
        },
      });
    } catch {
      result.errors++;
    }
  }

  // 2) Relance : UNE seule par passage, sur la saison la plus avancee parmi
  //    celles en retard (celle qu'il est le plus facile de finir). On evite
  //    de noyer l'apprenant sous une relance par saison obligatoire.
  const target = pending.sort(
    (a, b) =>
      b.doneEpisodes / b.totalEpisodes - a.doneEpisodes / a.totalEpisodes,
  )[0];
  if (!target) return;

  const daysAgo = await lastNotifiedDaysAgo(
    user.id,
    "REMINDER_MANDATORY",
    target.saisonId,
  );
  if (daysAgo < MANDATORY_REMINDER_COOLDOWN_DAYS) return;

  try {
    if (canSend) {
      const res = await sendEmail({
        to: user.email,
        from: fromEmail,
        subject: `🦊 Il te reste ${target.totalEpisodes - target.doneEpisodes} module${target.totalEpisodes - target.doneEpisodes > 1 ? "s" : ""} sur « ${target.title} »`,
        html: mandatoryReminderEmailHTML(user.name ?? "", target),
      });
      if (!res.ok) {
        result.errors++;
        return;
      }
      result.remindersSent++;
    } else {
      result.remindersSimulated++;
    }
    await db.notificationLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        type: "REMINDER_MANDATORY",
        channel: "email",
        status,
        payload: {
          saisonId: target.saisonId,
          saisonSlug: target.slug,
          remaining: target.totalEpisodes - target.doneEpisodes,
        },
      },
    });
  } catch {
    result.errors++;
  }
}

/**
 * Balaye tous les users actifs (LEARNER/MANAGER) et emet les notifications
 * liees aux saisons obligatoires. Appele par le cron achievements-reevaluate.
 */
export async function notifyMandatoryAllUsers(): Promise<MandatoryNotifyResult> {
  const result: MandatoryNotifyResult = {
    usersScanned: 0,
    remindersSent: 0,
    remindersSimulated: 0,
    certificatesSent: 0,
    certificatesSimulated: 0,
    errors: 0,
  };
  const users = await db.user.findMany({
    where: { isActive: true, role: { in: ["LEARNER", "MANAGER"] } },
    select: { id: true, tenantId: true, email: true, name: true },
  });
  result.usersScanned = users.length;
  for (const u of users) {
    try {
      await notifyMandatoryForUser(u, result);
    } catch {
      result.errors++;
    }
  }
  return result;
}

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mandatoryReminderEmailHTML(
  name: string,
  saison: SaisonProgress,
): string {
  const remaining = saison.totalEpisodes - saison.doneEpisodes;
  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(saison.title);
  return `
<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #EAF3F8; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; text-align: center;">
    <div style="font-size: 56px;">🦊</div>
    <h1 style="color: #0B3D91; margin: 16px 0 8px;">${safeName ? `${safeName}, on y est presque !` : "On y est presque !"}</h1>
    <p style="color: #555; line-height: 1.6;">
      Il te reste <strong>${remaining} module${remaining > 1 ? "s" : ""}</strong>
      sur « ${safeTitle} », un parcours demandé par ton organisation.
      Compte 5 minutes par module, à ton rythme.
    </p>
    <a href="${appUrl()}/apprendre/${encodeURIComponent(saison.slug)}"
       style="display: inline-block; margin: 24px 0; background: #00A3A1; color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: bold;">
      Terminer le parcours →
    </a>
    <p style="color: #999; font-size: 13px;">À très vite, Hex.</p>
  </div>
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 24px;">
    Humanix Académie by Humanix Cybersecurity
  </p>
</body></html>`;
}

function certificateReadyEmailHTML(name: string, saisonTitle: string): string {
  const safeName = escapeHtml(name);
  const safeTitle = escapeHtml(saisonTitle);
  return `
<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #EAF3F8; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; text-align: center;">
    <div style="font-size: 56px;">🎓</div>
    <h1 style="color: #0B3D91; margin: 16px 0 8px;">${safeName ? `Bravo ${safeName} !` : "Bravo !"}</h1>
    <p style="color: #555; line-height: 1.6;">
      Tu viens de boucler « ${safeTitle} » en entier.
      Ton certificat de suivi est disponible dès maintenant.
    </p>
    <a href="${appUrl()}/api/me/certificate"
       style="display: inline-block; margin: 24px 0; background: #00A3A1; color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: bold;">
      Télécharger mon certificat →
    </a>
    <p style="color: #999; font-size: 13px;">
      Tu le retrouveras aussi à tout moment depuis ton profil.
    </p>
  </div>
  <p style="text-align: center; color: #999; font-size: 12px; margin-top: 24px;">
    Humanix Académie by Humanix Cybersecurity
  </p>
</body></html>`;
}
