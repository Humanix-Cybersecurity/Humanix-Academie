// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Helper unifie pour resoudre un template email phishing par slug.
//
// CONTEXT (Phase 0 Phishing Engine v2, juin 2026) :
//   Avant : les templates etaient hardcoded dans lib/phishing.ts comme un
//   tableau const PHISHING_TEMPLATES, accessible via getTemplate(id).
//   Maintenant : ils sont stockes en BDD (PhishingEmailTemplate), avec
//   support tenant-custom (tenantId nullable). On garde lib/phishing.ts
//   en fallback pour les forks OSS qui n'ont pas execute le seed.
//
// ORDRE DE RESOLUTION :
//   1. PhishingEmailTemplate avec tenantId = tenantId courant + slug match
//      (override custom du tenant -- exemple : tenant a personnalise FAKE_MICROSOFT)
//   2. PhishingEmailTemplate avec tenantId = null + slug match
//      (platform-wide, seeded depuis lib/phishing.ts au boot)
//   3. Fallback hardcoded depuis PHISHING_TEMPLATES (si BDD pas seedee)
//
// REMPLACEMENT DES PLACEHOLDERS :
//   Le emailHtml stocke en BDD contient {firstName} et {trackingUrl} comme
//   placeholders. La fonction renderEmailHtml(tpl, firstName, trackingUrl)
//   fait le replacement string. Pas de eval, pas de template engine -- juste
//   replaceAll.

import { db } from "@/lib/db";
import { PHISHING_TEMPLATES, type PhishingTemplateDef } from "@/lib/phishing";

export type ResolvedEmailTemplate = {
  /** Source du template pour traçabilite */
  source: "tenant-custom" | "platform-db" | "hardcoded-fallback";
  /** Slug stable utilise par PhishingCampaign.template */
  slug: string;
  name: string;
  emoji: string;
  difficulty: string;
  emailSubject: string;
  emailFromAddr: string;
  emailFromName: string;
  /** Template string avec placeholders {firstName} et {trackingUrl} */
  emailHtmlTemplate: string;
  /** Signaux pedagogiques pour la landing post-clic */
  markers: string[];
  /** Mini-module de remediation flash (optionnel) */
  remediation: {
    saisonSlug: string;
    episodeSlug: string;
    label: string;
    durationMinutes: number;
  } | null;
};

/**
 * Resout un template par slug : BDD tenant-custom > BDD platform-wide >
 * fallback hardcoded. Retourne null si aucun match (slug invalide).
 */
export async function getEmailTemplateBySlug(
  tenantId: string,
  slug: string,
): Promise<ResolvedEmailTemplate | null> {
  if (!slug) return null;

  // 1. Tenant-custom (override par admin du tenant)
  const tenantCustom = await db.phishingEmailTemplate.findFirst({
    where: { tenantId, slug, isActive: true },
  });
  if (tenantCustom) {
    return mapDbToResolved(tenantCustom, "tenant-custom");
  }

  // 2. Platform-wide (seeded depuis hardcoded)
  const platform = await db.phishingEmailTemplate.findFirst({
    where: { tenantId: null, slug, isActive: true },
  });
  if (platform) {
    return mapDbToResolved(platform, "platform-db");
  }

  // 3. Fallback hardcoded (cas du fork OSS qui n'a pas seede)
  const hardcoded = PHISHING_TEMPLATES.find((t) => t.id === slug);
  if (hardcoded) {
    return mapHardcodedToResolved(hardcoded);
  }

  return null;
}

/** Rend le HTML final en remplacant les placeholders. Pure string replace. */
export function renderEmailHtml(
  tpl: Pick<ResolvedEmailTemplate, "emailHtmlTemplate">,
  firstName: string,
  trackingUrl: string,
): string {
  return tpl.emailHtmlTemplate
    .replaceAll("{firstName}", firstName || "Utilisateur")
    .replaceAll("{trackingUrl}", trackingUrl);
}

// ---------------- mappers prives ----------------

type PrismaTemplate = {
  slug: string;
  name: string;
  emoji: string;
  difficulty: string;
  emailSubject: string;
  emailFromAddr: string;
  emailFromName: string;
  emailHtml: string;
  markers: unknown; // Json
  remediationSaisonSlug: string | null;
  remediationEpisodeSlug: string | null;
  remediationLabel: string | null;
  remediationDurationMinutes: number | null;
};

function mapDbToResolved(
  t: PrismaTemplate,
  source: "tenant-custom" | "platform-db",
): ResolvedEmailTemplate {
  return {
    source,
    slug: t.slug,
    name: t.name,
    emoji: t.emoji,
    difficulty: t.difficulty,
    emailSubject: t.emailSubject,
    emailFromAddr: t.emailFromAddr,
    emailFromName: t.emailFromName,
    emailHtmlTemplate: t.emailHtml,
    markers: Array.isArray(t.markers)
      ? t.markers.filter((m): m is string => typeof m === "string")
      : [],
    remediation:
      t.remediationSaisonSlug && t.remediationEpisodeSlug
        ? {
            saisonSlug: t.remediationSaisonSlug,
            episodeSlug: t.remediationEpisodeSlug,
            label: t.remediationLabel ?? "Module flash",
            durationMinutes: t.remediationDurationMinutes ?? 2,
          }
        : null,
  };
}

function mapHardcodedToResolved(
  t: PhishingTemplateDef,
): ResolvedEmailTemplate {
  return {
    source: "hardcoded-fallback",
    slug: t.id,
    name: t.name,
    emoji: t.emoji,
    difficulty: t.difficulty,
    emailSubject: t.emailSubject,
    emailFromAddr: t.emailFrom,
    emailFromName: t.emailFrom.split("@")[0] ?? "Service IT",
    // En fallback hardcoded, on appelle emailHtml() avec les placeholders
    // string pour generer un template string equivalent au format BDD.
    // Cela permet a renderEmailHtml() de fonctionner uniformement.
    emailHtmlTemplate: t.emailHtml("{firstName}", "{trackingUrl}"),
    markers: t.markers,
    remediation: t.remediationEpisode
      ? {
          saisonSlug: t.remediationEpisode.saisonSlug,
          episodeSlug: t.remediationEpisode.episodeSlug,
          label: t.remediationEpisode.label,
          durationMinutes: t.remediationEpisode.durationMinutes,
        }
      : null,
  };
}

/**
 * Liste tous les templates disponibles pour un tenant (custom + platform-wide).
 * Utilise dans le selecteur de campagne et la page de gestion templates.
 */
export async function listAvailableTemplates(
  tenantId: string,
): Promise<ResolvedEmailTemplate[]> {
  // On charge custom + platform en parallel
  const [custom, platform] = await Promise.all([
    db.phishingEmailTemplate.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    db.phishingEmailTemplate.findMany({
      where: { tenantId: null, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Custom override platform pour les slugs identiques
  const customSlugs = new Set(custom.map((c) => c.slug));
  const merged = [
    ...custom.map((c) => mapDbToResolved(c, "tenant-custom")),
    ...platform
      .filter((p) => !customSlugs.has(p.slug))
      .map((p) => mapDbToResolved(p, "platform-db")),
  ];

  // Fallback : si la BDD est vide (cas fork OSS pas seede), on bascule sur
  // hardcoded pour ne pas casser l'UI.
  if (merged.length === 0) {
    return PHISHING_TEMPLATES.map(mapHardcodedToResolved);
  }

  return merged;
}
