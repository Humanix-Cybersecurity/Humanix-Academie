// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Quishing - lancement d'une campagne (mai 2026).
//
// Difference avec l'email/SMS phishing : ZERO envoi technique cote
// Humanix. L'admin :
//   1. Cree la campagne avec un template QR_FAKE_*
//   2. Selectionne les destinataires (par groupe ou tous)
//   3. Le systeme cree N PhishingResult avec un trackToken unique
//      par destinataire
//   4. L'admin telecharge un PDF imprimable contenant N affiches
//      (1 par destinataire) avec QR code + texte d'accroche
//   5. L'admin imprime + colle physiquement (parking, cafeteria,
//      panneau RH...) selon le template choisi
//   6. Quand un employe scanne, il atterrit sur /phishing/[token]
//      avec le bandeau pedagogique adapte au QR
//
// Pas de SMTP, pas de provider SMS : c'est un test PHYSIQUE.

import { db } from "@/lib/db";
import { generateTrackingToken } from "@/lib/crypto";
import type {
  PhishingTemplate,
  PhishingCampaign,
  PhishingResult,
} from "@prisma/client";
import {
  QUISHING_TEMPLATES,
  type QuishingTemplate,
  buildQuishingLandingUrl,
} from "@/lib/phishing/qr-code";

export type QuishingLaunchTarget = {
  id: string;
  email: string;
  name: string | null;
};

export type QuishingLaunchOptions = {
  tenantId: string;
  templateId: QuishingTemplate;
  targets: QuishingLaunchTarget[];
  /** Pour traçabilite (audit) - decrit comment les targets ont ete choisis */
  targetingMode?: "all" | "groups" | "users";
  targetingDetail?: string;
  /**
   * SSID Wi-Fi custom pour le template QR_FAKE_WIFI. Doit avoir ete VALIDE
   * en amont par validateWifiSsid() (whitelist stricte, max 32 chars).
   * Si null/undefined : le poster utilise "Humanix-Guest" par defaut.
   * Ignore silencieusement si templateId !== "QR_FAKE_WIFI".
   */
  wifiSsid?: string | null;
};

export type QuishingLaunchResult =
  | {
      ok: true;
      campaignId: string;
      targets: number;
      /** PDF poster URL (relative). Le caller redirige vers /api/admin/quishing/poster/{id} */
      posterUrl: string;
      /** Pour debug : preview du QR du premier destinataire */
      previewLandingUrl: string;
    }
  | {
      ok: false;
      error: "invalid_template" | "no_targets" | "unknown";
      message?: string;
    };

/**
 * Lance une campagne quishing. Cree la PhishingCampaign avec
 * channel=QUISHING + N PhishingResult. Pas d'envoi : retourne l'URL
 * du PDF a telecharger pour impression.
 */
export async function launchQuishingCampaign(
  opts: QuishingLaunchOptions,
): Promise<QuishingLaunchResult> {
  const { tenantId, templateId, targets } = opts;

  const tpl = QUISHING_TEMPLATES[templateId];
  if (!tpl) {
    return { ok: false, error: "invalid_template" };
  }
  if (targets.length === 0) {
    return { ok: false, error: "no_targets" };
  }

  let campaign: PhishingCampaign;
  let results: PhishingResult[];
  try {
    campaign = await db.phishingCampaign.create({
      data: {
        tenantId,
        title: `${tpl.emoji} ${tpl.name}`,
        template: templateId as PhishingTemplate,
        channel: "QUISHING",
        scheduledAt: new Date(),
        sentAt: new Date(), // pas d'envoi reel mais on marque "en cours"
        isActive: true,
        // Stocke le SSID custom UNIQUEMENT pour le template WIFI (les autres
        // templates n'ont pas de champ SSID, mettre une valeur serait
        // semantiquement faux et apparaitrait dans les audits).
        wifiSsid:
          templateId === "QR_FAKE_WIFI" ? (opts.wifiSsid ?? null) : null,
      },
    });

    // Cree un PhishingResult par cible avec un trackToken unique
    results = await db.$transaction(
      targets.map((t) =>
        db.phishingResult.create({
          data: {
            campaignId: campaign.id,
            userId: t.id,
            trackToken: generateTrackingToken(),
            status: "SENT",
          },
        }),
      ),
    );

    await db.event.create({
      data: {
        tenantId,
        type: "quishing_campaign_launched",
        payload: {
          campaignId: campaign.id,
          template: templateId,
          targets: targets.length,
          targetingMode: opts.targetingMode ?? "all",
          targetingDetail: opts.targetingDetail ?? null,
          // Trace le SSID custom utilise pour audit (si template WIFI).
          // Null = SSID par defaut "Humanix-Guest".
          wifiSsid:
            templateId === "QR_FAKE_WIFI" ? (opts.wifiSsid ?? null) : null,
        },
      },
    });
  } catch (e) {
    return {
      ok: false,
      error: "unknown",
      message: e instanceof Error ? e.message : String(e),
    };
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-cybersecurity.fr";
  const previewLanding =
    results.length > 0
      ? buildQuishingLandingUrl(baseUrl, results[0].trackToken)
      : "";

  return {
    ok: true,
    campaignId: campaign.id,
    targets: targets.length,
    posterUrl: `/api/admin/quishing/poster/${campaign.id}`,
    previewLandingUrl: previewLanding,
  };
}
