// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Lancement des campagnes a diffusion MANUELLE : smishing (SMS) et
// vishing (appel telephonique). Cf. #744.
//
// LE PROBLEME QU'ON RESOUT
//
// /admin/smishing et /admin/vishing generaient du contenu via Mistral et
// s'arretaient la : aucune campagne, aucun resultat, aucune trace en base.
// Les deux canaux figuraient pourtant au meme rang que Phishing et
// Quishing dans la sidebar. Consequence : un exercice smishing ou vishing
// ne comptait dans AUCUN indicateur - ni riskScore, ni forecast, ni
// heatmap, ni export de conformite.
//
// POURQUOI REUTILISER PhishingCampaign PLUTOT QUE DE NOUVEAUX MODELES
//
// Le modele porte deja un `channel` (EMAIL | SMS | QUISHING) et un
// `smsBody`. Surtout, tous les indicateurs consomment PhishingResult SANS
// filtrer sur le canal : creer des resultats sur ce modele suffit a
// alimenter riskScore, forecast, heatmap et exports, sans toucher a une
// seule ligne de leur code. L'issue suggerait « idealement un modele
// commun aux 4 canaux » : il existait deja, il n'etait pas utilise.
//
// DEUX MODES DE SUIVI
//
//   SMS   : un lien tracke par cible. L'admin envoie les SMS depuis son
//           propre outil (pas de passerelle SMS dans le produit), et le
//           clic est trace par la landing /phishing/[token], qui gere
//           deja le canal SMS.
//   VOICE : aucun lien a cliquer. L'appelant saisit lui-meme l'issue de
//           chaque appel (cf. recordManualOutcome).

import { db } from "@/lib/db";
import { generateTrackingToken } from "@/lib/crypto";
import type { PhishingTemplate, PhishingStatus } from "@prisma/client";

export type ManualChannel = "SMS" | "VOICE";

export type ManualLaunchOptions = {
  tenantId: string;
  channel: ManualChannel;
  /** Titre lisible affiche dans /admin/phishing et les exports. */
  title: string;
  /** Slug de scenario (fake-livreur, faux-support...). */
  templateId: string;
  /** Corps du SMS (canal SMS) ou script d'appel (canal VOICE). */
  body: string;
  targets: { id: string }[];
  /** Tracabilite du ciblage, comme les autres canaux. */
  targetingMode?: string;
  targetingDetail?: string | null;
};

export type ManualLaunchResult =
  | {
      ok: true;
      campaignId: string;
      targets: number;
      /** Un lien tracke par cible (canal SMS uniquement, [] en VOICE). */
      trackedLinks: { userId: string; token: string }[];
    }
  | {
      ok: false;
      error: "no_targets" | "invalid_body" | "unknown";
      message?: string;
    };

/** Limite de securite : evite qu'un ciblage errone cree 10 000 lignes. */
const MAX_TARGETS = 500;

/**
 * Cree la campagne + un PhishingResult par cible, sans rien envoyer.
 *
 * Le statut initial est SENT comme pour le quishing : du point de vue de
 * l'exercice, la cible a bien ete sollicitee. C'est ce qui rend le
 * resultat comparable entre canaux dans les indicateurs.
 */
export async function launchManualCampaign(
  opts: ManualLaunchOptions,
): Promise<ManualLaunchResult> {
  const { tenantId, channel, title, templateId, body, targets } = opts;

  if (targets.length === 0) return { ok: false, error: "no_targets" };
  if (targets.length > MAX_TARGETS) {
    return {
      ok: false,
      error: "no_targets",
      message: `Trop de cibles (${targets.length} > ${MAX_TARGETS}).`,
    };
  }
  if (!body.trim()) return { ok: false, error: "invalid_body" };

  try {
    const campaign = await db.phishingCampaign.create({
      data: {
        tenantId,
        title,
        // `template` est un enum historique cote email. Les canaux
        // manuels n'ont pas de template email : on retombe sur la valeur
        // par defaut, le scenario reel etant porte par `title` et `body`.
        template: "FAKE_MICROSOFT" as PhishingTemplate,
        channel,
        // smsBody porte le corps quel que soit le canal manuel : pour
        // VOICE c'est le script d'appel. Reutiliser le champ evite une
        // colonne de plus pour la meme semantique (« ce qu'a recu la
        // cible »).
        smsBody: body,
        scheduledAt: new Date(),
        sentAt: new Date(), // pas d'envoi technique, mais l'exercice court
        isActive: true,
      },
    });

    const rows = targets.map((t) => ({
      campaignId: campaign.id,
      userId: t.id,
      trackToken: generateTrackingToken(),
      status: "SENT" as PhishingStatus,
    }));
    await db.phishingResult.createMany({ data: rows });

    await db.event.create({
      data: {
        tenantId,
        type:
          channel === "SMS"
            ? "smishing_campaign_launched"
            : "vishing_campaign_launched",
        payload: {
          campaignId: campaign.id,
          template: templateId,
          targets: targets.length,
          targetingMode: opts.targetingMode ?? "all",
          targetingDetail: opts.targetingDetail ?? null,
        },
      },
    });

    return {
      ok: true,
      campaignId: campaign.id,
      targets: targets.length,
      // Aucun lien en VOICE : il n'y a rien a cliquer dans un appel.
      trackedLinks:
        channel === "SMS"
          ? rows.map((r) => ({ userId: r.userId, token: r.trackToken }))
          : [],
    };
  } catch (e) {
    return {
      ok: false,
      error: "unknown",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Issues qu'un appelant peut consigner apres un appel vishing. */
export const MANUAL_OUTCOMES = ["SUBMITTED", "CLICKED", "REPORTED"] as const;
export type ManualOutcome = (typeof MANUAL_OUTCOMES)[number];

export const MANUAL_OUTCOME_LABELS: Record<ManualOutcome, string> = {
  SUBMITTED: "A donné l'information demandée",
  CLICKED: "A engagé la conversation sans tout donner",
  REPORTED: "A raccroché et signalé",
};

/**
 * Consigne l'issue d'un appel vishing. Pas de tracking possible sur un
 * appel telephonique : c'est l'appelant qui saisit ce qui s'est passe.
 *
 * Le tenantId est verifie ICI plutot que par le seul appelant : sans ca,
 * un admin pourrait modifier le resultat d'une campagne d'un autre tenant
 * en devinant un id.
 */
export async function recordManualOutcome(params: {
  tenantId: string;
  resultId: string;
  outcome: ManualOutcome;
}): Promise<{ ok: boolean; error?: string }> {
  const { tenantId, resultId, outcome } = params;

  const result = await db.phishingResult.findFirst({
    where: { id: resultId, campaign: { tenantId } },
    select: { id: true, campaign: { select: { channel: true } } },
  });
  if (!result) return { ok: false, error: "not_found" };
  if (result.campaign.channel !== "VOICE") {
    // Les autres canaux ont un suivi automatique : accepter une saisie
    // manuelle permettrait de maquiller un resultat mesure.
    return { ok: false, error: "not_manual_channel" };
  }

  await db.phishingResult.update({
    where: { id: resultId },
    data: {
      status: outcome as PhishingStatus,
      ...(outcome === "CLICKED" || outcome === "SUBMITTED"
        ? { clickedAt: new Date() }
        : {}),
      ...(outcome === "REPORTED" ? { reportedAt: new Date() } : {}),
    },
  });
  return { ok: true };
}
