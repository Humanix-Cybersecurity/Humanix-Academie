// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Endpoint cron : le passage horaire sur les campagnes phishing actives
// dont l'échéance est passée et qui n'ont pas de date d'envoi (sentAt
// null). Deux situations s'y présentent, à ne pas confondre.
//
//   1. La campagne n'a AUCUN destinataire : c'est une campagne programmée
//      qui n'a jamais démarré. On lui crée un résultat par apprenant et
//      manager actif du tenant, puis on envoie.
//
//   2. La campagne a DÉJÀ ses destinataires : son lancement a commencé
//      ailleurs (lib/phishing/launch.ts, ou un passage précédent de ce
//      cron) et n'est pas allé au bout, coupé par une livraison, un
//      redémarrage, un plantage. On le termine : on écrit aux personnes de
//      SA cohorte qui n'ont pas encore reçu le message, et à elles seules.
//
// Jusqu'en novembre 2026 la route ne faisait pas cette distinction : tout
// lancement resté sans date d'envoi était élargi à l'ensemble du tenant,
// et le message réécrit à tout le monde, personnes déjà servies comprises.
//
// Un lancement encore en cours ressemble à un lancement coupé. On les
// distingue par les réservations (lib/phishing/dispatch.ts) : une tentative
// d'envoi de moins de dix minutes dit qu'un traitement travaille sur la
// campagne, et on la laisse au passage suivant. Cela couvre aussi le rappel
// de cette route par son propre lanceur (scripts/cron-runner.sh, curl
// --retry) pendant que le premier appel tourne encore.
//
// Les envois étalés (dripScheduledAt non nul) ne sont pas repris ici : ils
// appartiennent au cron phishing-drip, qui les traite un par un.
//
// Seul le canal EMAIL donne lieu à un envoi. Pour SMS, QUISHING et VOICE,
// la route crée les résultats et clôt la campagne : l'envoi technique se
// fait ailleurs (prestataire SMS du client, affiche imprimée).
//
// Fréquence : toutes les heures (infra/cron/crontab.prod). Un admin peut
// aussi la déclencher à la main.
//
// Protection : header X-Cron-Secret + comparaison à temps constant, OU
// admin/RSSI/superadmin authentifié, limité à son tenant.

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";
import { generateTrackingToken } from "@/lib/crypto";
import { attemptLeaseCutoff, dispatchLure } from "@/lib/phishing/dispatch";
import { getEmailTemplateBySlug } from "@/lib/phishing/email-template";
import { recordCronRun } from "@/lib/cron/record";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

async function checkAuth(req: Request): Promise<{
  authorized: boolean;
  /** null = run GLOBAL (CRON_SECRET machine) ; sinon = scope a CE tenant. */
  scopeTenantId?: string | null;
  reason?: string;
}> {
  // 1. Cron header (machine) -> run global sur tous les tenants.
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret && safeEqual(cronSecret, process.env.CRON_SECRET ?? "")) {
    return { authorized: true, scopeTenantId: null };
  }
  // 2. Admin authentifie (declenchement manuel) -> SCOPE a SON tenant.
  // Anti cross-tenant : un admin ne declenche/ne voit JAMAIS les campagnes
  // d'autres tenants. Pour un run global, passer par CRON_SECRET.
  const session = await auth();
  if (!session?.user) return { authorized: false, reason: "unauthorized" };
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    return { authorized: false, reason: "forbidden" };
  }
  return { authorized: true, scopeTenantId: session.user!.tenantId as string };
}

type ProcessResult = {
  /** Campagnes programmées démarrées par ce passage. */
  campaignsLaunched: number;
  /** Lancements commencés ailleurs ou à un passage précédent, terminés ici. */
  campaignsResumed: number;
  /** Campagnes laissées au passage suivant : un traitement y envoie encore. */
  campaignsInProgress: number;
  campaignsSkippedNoSmtp: number;
  resultsCreated: number;
  emailsSent: number;
  emailsFailed: number;
  errors: string[];
};

async function processDueCampaigns(
  scopeTenantId: string | null,
): Promise<ProcessResult> {
  const due = await db.phishingCampaign.findMany({
    where: {
      isActive: true,
      sentAt: null,
      scheduledAt: { lte: new Date() },
      ...(scopeTenantId ? { tenantId: scopeTenantId } : {}),
    },
    include: {
      tenant: {
        select: { id: true, slug: true, name: true },
      },
    },
    take: 50, // limite par tour de cron pour éviter de surcharger
  });

  const result: ProcessResult = {
    campaignsLaunched: 0,
    campaignsResumed: 0,
    campaignsInProgress: 0,
    campaignsSkippedNoSmtp: 0,
    resultsCreated: 0,
    emailsSent: 0,
    emailsFailed: 0,
    errors: [],
  };

  // Un même modèle sert à toute une cohorte : on ne le résout qu'une fois.
  const templates = new Map<
    string,
    Awaited<ReturnType<typeof getEmailTemplateBySlug>>
  >();
  async function templateFor(tenantId: string, slug: string) {
    const key = `${tenantId}:${slug}`;
    if (!templates.has(key)) {
      templates.set(key, await getEmailTemplateBySlug(tenantId, slug));
    }
    return templates.get(key) ?? null;
  }

  for (const campaign of due) {
    try {
      // La campagne a-t-elle déjà ses destinataires ? C'est ce qui sépare
      // une campagne programmée jamais démarrée d'un lancement à terminer.
      const cohortSize = await db.phishingResult.count({
        where: { campaignId: campaign.id },
      });
      const resumed = cohortSize > 0;

      let targets: { id: string }[] = [];
      if (!resumed) {
        // Cible : tous les LEARNER + MANAGER actifs du tenant. Les ADMIN
        // sont exclus pour ne pas tester ceux qui ont conçu la campagne
        // (l'admin peut créer une campagne séparée pour s'auto-tester).
        targets = await db.user.findMany({
          where: {
            tenantId: campaign.tenantId,
            isActive: true,
            role: { in: ["LEARNER", "MANAGER"] },
          },
          select: { id: true },
        });

        if (targets.length === 0) {
          // Personne à qui écrire : on clôt pour ne pas la retraiter.
          await db.phishingCampaign.update({
            where: { id: campaign.id },
            data: { sentAt: new Date() },
          });
          continue;
        }
      }

      // Vérifier que le SMTP du tenant est configuré AVANT de créer les
      // résultats ou d'envoyer. Sinon on saute la campagne (l'admin doit
      // aller sur /admin/smtp) sans la clore : elle sera retentée au
      // prochain passage, au cas où le SMTP serait configuré entre-temps.
      if (campaign.channel === "EMAIL") {
        const smtpCfg = await db.tenantSmtpConfig.findUnique({
          where: { tenantId: campaign.tenantId },
          select: { id: true },
        });
        if (!smtpCfg) {
          result.campaignsSkippedNoSmtp++;
          result.errors.push(
            `${campaign.id}: SMTP non configure pour tenant ${campaign.tenant.slug}`,
          );
          continue;
        }
      }

      if (resumed) {
        // Une tentative d'envoi récente : le lancement tourne encore (ou
        // vient de s'arrêter). On n'y touche pas, le passage suivant
        // tranchera.
        const recentAttempts = await db.phishingResult.count({
          where: {
            campaignId: campaign.id,
            mailAttemptedAt: { gte: attemptLeaseCutoff() },
          },
        });
        if (recentAttempts > 0) {
          result.campaignsInProgress++;
          continue;
        }
        result.campaignsResumed++;
      } else {
        // skipDuplicates : si deux passages créent la cohorte en même
        // temps, la contrainte unique (campagne, destinataire) n'en garde
        // qu'un résultat par personne.
        const created = await db.phishingResult.createMany({
          data: targets.map((t) => ({
            campaignId: campaign.id,
            userId: t.id,
            trackToken: generateTrackingToken(),
            status: "SENT" as const,
          })),
          skipDuplicates: true,
        });
        result.campaignsLaunched++;
        result.resultsCreated += created.count;
      }

      // Envoi via le SMTP du tenant, canal EMAIL seulement, aux personnes
      // de la cohorte qui n'ont pas encore reçu le message. Même rendu que
      // le lancement depuis l'interface : modèle du tenant s'il en a un,
      // variante B, pixel de suivi.
      let heldElsewhere = false;
      if (campaign.channel === "EMAIL") {
        const pending = await db.phishingResult.findMany({
          where: {
            campaignId: campaign.id,
            mailDispatchedAt: null,
            dripScheduledAt: null,
          },
          include: { user: { select: { email: true, name: true } } },
        });
        const missingTemplates = new Set<string>();
        for (const r of pending) {
          const slug =
            r.variant === "B" && campaign.variantBSlug
              ? campaign.variantBSlug
              : campaign.template;
          const tpl = await templateFor(campaign.tenantId, slug);
          if (!tpl) {
            result.emailsFailed++;
            missingTemplates.add(slug);
            continue;
          }
          const outcome = await dispatchLure({
            resultId: r.id,
            trackToken: r.trackToken,
            tenantId: campaign.tenantId,
            template: tpl,
            recipient: r.user,
          });
          if (outcome.status === "sent") {
            result.emailsSent++;
          } else if (outcome.status === "failed") {
            result.emailsFailed++;
          } else {
            heldElsewhere = true;
          }
        }
        for (const slug of missingTemplates) {
          result.errors.push(`${campaign.id}: template ${slug} introuvable`);
        }
      }

      if (heldElsewhere) {
        // Un autre traitement tenait un envoi de cette campagne. S'il
        // meurt avant de l'avoir terminé, ce mail ne doit pas rester sur
        // une campagne close : on la laisse ouverte, le passage suivant
        // vérifiera qu'il ne reste rien.
        continue;
      }

      // Clôture. Un envoi refusé par le serveur SMTP est compté dans
      // emailsFailed et n'est pas rejoué d'heure en heure.
      await db.phishingCampaign.update({
        where: { id: campaign.id },
        data: { sentAt: new Date() },
      });

      // Audit log : trace que la campagne a été déclenchée, ou terminée
      await auditLog({
        action: AuditActions.PHISHING_CAMPAIGN_SENT,
        outcome: "SUCCESS",
        tenantId: campaign.tenantId,
        target: {
          type: "phishing_campaign",
          id: campaign.id,
          label: campaign.title,
        },
        metadata: {
          channel: campaign.channel,
          template: campaign.template,
          recipientCount: resumed ? cohortSize : targets.length,
          scheduledAt: campaign.scheduledAt.toISOString(),
          resumed,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        `[cron/phishing-launch] campaign ${campaign.id} failed:`,
        msg,
      );
      result.errors.push(`${campaign.id}: ${msg}`);
    }
  }

  return result;
}

export async function POST(req: Request) {
  const a = await checkAuth(req);
  if (!a.authorized) {
    return NextResponse.json(
      { error: a.reason ?? "unauthorized" },
      { status: 401 },
    );
  }

  const result = await recordCronRun("phishing-launch", () =>
    processDueCampaigns(a.scopeTenantId ?? null),
  );
  return NextResponse.json({ ok: true, ...result });
}

/** GET = preview : combien de campagnes seraient declenchees maintenant */
export async function GET(req: Request) {
  const a = await checkAuth(req);
  if (!a.authorized) {
    return NextResponse.json(
      { error: a.reason ?? "unauthorized" },
      { status: 401 },
    );
  }

  const scope = a.scopeTenantId ?? null;
  const now = new Date();
  const dueCount = await db.phishingCampaign.count({
    where: {
      isActive: true,
      sentAt: null,
      scheduledAt: { lte: now },
      ...(scope ? { tenantId: scope } : {}),
    },
  });
  const upcoming = await db.phishingCampaign.findMany({
    where: {
      isActive: true,
      sentAt: null,
      scheduledAt: { gt: now },
      ...(scope ? { tenantId: scope } : {}),
    },
    orderBy: { scheduledAt: "asc" },
    take: 5,
    select: {
      id: true,
      title: true,
      channel: true,
      scheduledAt: true,
      tenant: { select: { slug: true } },
    },
  });
  return NextResponse.json({
    dueNow: dueCount,
    nextScheduled: upcoming,
  });
}
