// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Coeur du lancement de campagne phishing : isole de toute couche
// transport (server action / API route JSON / cron) pour pouvoir etre
// reutilise depuis plusieurs entry points sans duplication.
//
// Responsabilites :
//   1. Creer la PhishingCampaign + les PhishingResult avec tokens uniques
//   2. Pre-check SMTP du tenant (en mode prod)
//   3. Envoyer les mails un par un via le SMTP du tenant
//   4. Logger un Event "phishing_campaign_launched"
//
// Ce qui est HORS scope ici :
//   - Auth / RBAC : a faire au niveau caller
//   - Resolution des cibles (services, groupes, userIds) : le caller passe
//     deja un targets[] resolu
//
// Cette extraction date de la PR "phishing par groupe" (mai 2026) qui
// ajoutait un nouveau mode de ciblage. Plutot que de faire un 2e
// launchCampaign(), on factorise pour eviter le drift.

import { db } from "@/lib/db";
import { injectTrackingPixel } from "@/lib/phishing";
import {
  getEmailTemplateBySlug,
  renderEmailHtml,
} from "@/lib/phishing/email-template";
import { generateTrackingToken } from "@/lib/crypto";
import { sendMailViaTenantSmtp } from "@/lib/smtp/sender";
import type { PhishingTemplate } from "@prisma/client";

export type LaunchTarget = {
  /**
   * Identifiant interne. Pour les User normaux : User.id. Pour les
   * recipients d'une PhishingRecipientList externe (sans User correspondant),
   * on utilise un userId synthetique "ext_<entryId>" qui sera detecte cote
   * launchPhishingCampaign pour skip la creation de PhishingResult lie a User.
   *
   * Phase 3 mai 2026 (recipient lists) : si l'entry CSV match un User en BDD,
   * le caller passe le vrai userId. Sinon il faudrait skipper / creer un
   * mecanisme separe. Pour la v1 : on ne supporte que les entries matches
   * (entries externes ignorees au lancement, signalees a l'admin).
   */
  id: string;
  email: string;
  name: string | null;
};

export type LaunchOptions = {
  tenantId: string;
  templateId: string;
  /**
   * Phase 7a (juin 2026) -- A/B variants.
   * Si fourni : slug d'un 2eme template. Les targets sont splitees
   * deterministement (hash(userId) % 2) entre variant A (templateId) et
   * variant B (templateBId). Chaque target recoit UN SEUL mail mais le
   * dashboard peut comparer les 2 variants apres coup.
   */
  templateBId?: string;
  targets: LaunchTarget[];
  /**
   * Phase 7b (juin 2026) -- Drip campaigns.
   * Si fourni : etale les envois sur N jours au lieu de tout d'un coup.
   * Repartition round-robin deterministe par index target -- ordre stable
   * et reproductible.
   *   - dripDays : nombre de jours d'etalement (ex: 7 = J0 a J+6)
   *   - dripBatchesPerDay : nombre de batches par jour (defaut: 1)
   * Exemple : 200 targets sur 7 jours @ 1 batch/jour = ~28 mails par jour.
   * Si non fourni : envoi immediat de tous les mails (comportement legacy).
   */
  dripStrategy?: {
    dripDays: number;
    dripBatchesPerDay?: number;
  };
  /** Description de la cohorte ciblee, pour traçabilité dans Event.payload */
  targetingMode?: "all" | "service" | "groups" | "users" | "list";
  targetingDetail?: string; // ex: "groups:rh,compta" ou "service:Finance" ou "list:<name>"
};

export type LaunchResult =
  | {
      ok: true;
      campaignId: string;
      targets: number;
      sent: number;
      failed: number;
      simulated: boolean;
      /** Phase 7a : split A/B si templateBId fourni */
      variantSplit?: { a: number; b: number };
      /**
       * Phase 7b : nb de targets en attente d'envoi differe (dripScheduledAt
       * dans le futur). Ces mails seront envoyes par le cron
       * /api/cron/phishing-drip. sent + dripPending = targets.
       */
      dripPending?: number;
    }
  | {
      ok: false;
      error:
        | "invalid_template"
        | "invalid_template_b"
        | "no_targets"
        | "smtp_not_configured"
        | "smtp_decrypt_failed";
      message?: string;
    };

/**
 * Split deterministe d'un userId entre variant A et B.
 * Utilise un hash simple (sum char codes) % 2 -- pas crypto, mais suffisant
 * pour avoir une distribution ~50/50 stable. Stable = le meme userId tombera
 * toujours dans le meme variant pour cette campagne, ce qui permet de
 * reanalysier sans surprise.
 */
function assignVariant(userId: string): "A" | "B" {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash + userId.charCodeAt(i)) | 0;
  }
  return hash % 2 === 0 ? "A" : "B";
}

/**
 * Phase 7b -- calcule le dripScheduledAt pour chaque target en
 * distribution round-robin sur N jours et M batches/jour.
 *
 * Round-robin deterministe : on assigne targets[0]=batch0, targets[1]=batch1,
 * ..., targets[batches]=batch0+1day, etc. Permet une distribution uniforme
 * meme si la liste est triee (par service, alphabetique, etc.) -- evite
 * que tous les "Compta" soient le meme jour.
 *
 * Le batch 0 = MAINTENANT (envoi immediat). Les batches suivants sont
 * planifies pour le cron.
 */
function computeDripSchedule(
  targetCount: number,
  dripDays: number,
  batchesPerDay: number,
): Date[] {
  const slots: Date[] = [];
  const totalBatches = Math.max(1, dripDays * batchesPerDay);
  // Repartition de targetCount items sur totalBatches batches en round-robin.
  // Le 1er batch (index 0) reste a "maintenant" pour preserve l'experience
  // "ya un mail piege qui circule" cote admin (sinon l'admin ne voit rien
  // avant J+1 et doute du fonctionnement).
  const baseTime = Date.now();
  const slotDurationMs = (dripDays * 24 * 3600 * 1000) / totalBatches;

  for (let i = 0; i < targetCount; i++) {
    const batchIdx = i % totalBatches;
    // batch 0 = maintenant, batch N = baseTime + N * slotDuration
    const ts = baseTime + batchIdx * slotDurationMs;
    slots.push(new Date(ts));
  }
  return slots;
}

export async function launchPhishingCampaign(
  opts: LaunchOptions,
): Promise<LaunchResult> {
  const { tenantId, templateId, templateBId, targets, dripStrategy } = opts;

  // Phase 0 (juin 2026) : resolution unifiee via lib/phishing/email-template.ts
  // qui regarde BDD tenant-custom > BDD platform-wide > hardcoded fallback.
  // Async desormais (avant : sync via getTemplate hardcoded).
  // Phase 7a (juin 2026) : on resout les 2 templates en parallel si A/B test.
  const [tpl, tplB] = await Promise.all([
    getEmailTemplateBySlug(tenantId, templateId),
    templateBId ? getEmailTemplateBySlug(tenantId, templateBId) : Promise.resolve(null),
  ]);
  if (!tpl) {
    return { ok: false, error: "invalid_template" };
  }
  if (templateBId && !tplB) {
    return { ok: false, error: "invalid_template_b" };
  }
  if (targets.length === 0) {
    return { ok: false, error: "no_targets" };
  }

  // PRECHECK SMTP (sauf en demo)
  const isDemoMode = process.env.DEMO_MODE === "true";
  if (!isDemoMode) {
    const smtpCfg = await db.tenantSmtpConfig.findUnique({
      where: { tenantId },
      select: { id: true, isVerified: true },
    });
    if (!smtpCfg) {
      return {
        ok: false,
        error: "smtp_not_configured",
        message:
          "Aucun serveur SMTP configuré pour ton tenant. Va sur /admin/smtp pour le paramétrer.",
      };
    }
  }

  const campaign = await db.phishingCampaign.create({
    data: {
      tenantId,
      title: tplB ? `${tpl.name} vs ${tplB.name} (A/B)` : tpl.name,
      template: templateId as PhishingTemplate,
      // Phase 7a : persiste le slug du variant B pour audit/reporting
      variantBSlug: templateBId ?? null,
      scheduledAt: new Date(),
      sentAt: null,
      isActive: true,
    },
  });

  // Phase 7a : assigne deterministe chaque target A ou B avant create.
  // Si pas de templateBId, tous en variant "A" (defaut historique).
  // Phase 7b : si dripStrategy fourni, calcule dripScheduledAt par target
  // en round-robin sur N jours.
  const dripSchedule = dripStrategy
    ? computeDripSchedule(
        targets.length,
        Math.max(1, Math.min(30, dripStrategy.dripDays)),
        Math.max(1, Math.min(24, dripStrategy.dripBatchesPerDay ?? 1)),
      )
    : null;

  const results = await db.$transaction(
    targets.map((u, idx) => {
      const variant = templateBId ? assignVariant(u.id) : "A";
      const dripScheduledAt = dripSchedule?.[idx] ?? null;
      return db.phishingResult.create({
        data: {
          campaignId: campaign.id,
          userId: u.id,
          trackToken: generateTrackingToken(),
          status: "SENT",
          variant,
          dripScheduledAt,
        },
        select: {
          id: true,
          userId: true,
          trackToken: true,
          variant: true,
          dripScheduledAt: true,
        },
      });
    }),
  );

  let sent = 0;
  let failed = 0;
  // Phase 7b : results en attente d'envoi differe (dripScheduledAt > now).
  // Le cron /api/cron/phishing-drip les ramassera plus tard.
  let dripPending = 0;
  const nowTs = Date.now();
  if (isDemoMode) {
    sent = results.length;
  } else {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-academie.fr";
    for (const r of results) {
      // Skip les results planifies dans le futur -- on les laisse au cron.
      if (r.dripScheduledAt && r.dripScheduledAt.getTime() > nowTs) {
        dripPending++;
        continue;
      }
      const target = targets.find((t) => t.id === r.userId);
      if (!target) {
        failed++;
        continue;
      }
      const firstName = (target.name?.split(" ")[0] ?? "").trim();
      const cleanBaseUrl = baseUrl.replace(/\/$/, "");
      const trackingUrl = `${cleanBaseUrl}/phishing/${r.trackToken}`;
      // Pixel d'open tracking : injecte en fin de HTML. Voir lib/phishing.ts
      // injectTrackingPixel() pour le rationale (faux positifs proxies, etc).
      const pixelUrl = `${cleanBaseUrl}/api/phishing/track/open/${r.trackToken}`;
      // Phase 7a : selectionne le bon template selon le variant du target.
      // r.variant a ete assigne lors de la creation ci-dessus (A ou B).
      const activeTpl = r.variant === "B" && tplB ? tplB : tpl;
      // Phase 0 : renderEmailHtml remplace les placeholders {firstName} et
      // {trackingUrl} du template string charge depuis la BDD.
      const lureHtml = renderEmailHtml(activeTpl, firstName, trackingUrl);
      const html = injectTrackingPixel(lureHtml, pixelUrl);
      const sendResult = await sendMailViaTenantSmtp(tenantId, {
        to: target.email,
        subject: activeTpl.emailSubject,
        html,
      });
      if (sendResult.ok) {
        sent++;
        // Phase 7b : trace l'envoi reel (vs sentAt qui est la creation du
        // row). Permet au cron drip de savoir quels results sont encore
        // en attente.
        await db.phishingResult.update({
          where: { id: r.id },
          data: { mailDispatchedAt: new Date() },
        });
      } else {
        failed++;
        // SMTP HS : on stoppe la boucle (pas la peine de tenter les 99
        // autres mails) et on marque la campagne inactive.
        if (
          sendResult.reason === "smtp_not_configured" ||
          sendResult.reason === "smtp_decrypt_failed"
        ) {
          await db.phishingCampaign.update({
            where: { id: campaign.id },
            data: { isActive: false },
          });
          return {
            ok: false,
            error: sendResult.reason,
            message: sendResult.details ?? "SMTP indisponible.",
          };
        }
      }
    }
    if (sent > 0) {
      await db.phishingCampaign.update({
        where: { id: campaign.id },
        data: { sentAt: new Date() },
      });
    }
  }

  // Phase 7a : compte le split A/B dans les results crees pour le retour
  // et l'event audit. Si pas de templateBId, B=0 (toutes en A).
  const variantA = results.filter((r) => r.variant === "A").length;
  const variantB = results.filter((r) => r.variant === "B").length;

  await db.event.create({
    data: {
      tenantId,
      type: "phishing_campaign_launched",
      payload: {
        campaignId: campaign.id,
        template: templateId,
        templateB: templateBId ?? null,
        targets: targets.length,
        sent,
        failed,
        demo: isDemoMode,
        targetingMode: opts.targetingMode ?? "all",
        targetingDetail: opts.targetingDetail ?? null,
        variantSplit: templateBId ? { a: variantA, b: variantB } : null,
      },
    },
  });

  return {
    ok: true,
    campaignId: campaign.id,
    targets: targets.length,
    sent,
    failed,
    simulated: isDemoMode,
    variantSplit: templateBId ? { a: variantA, b: variantB } : undefined,
    dripPending: dripStrategy ? dripPending : undefined,
  };
}
