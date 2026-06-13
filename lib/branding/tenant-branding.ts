// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Résolution du branding effectif d'un tenant (marque blanche / white-label).
//
// CASCADE : tenant enfant -> tenant parent (revendeur) -> défaut Humanix.
// Un tenant fournit son branding UNIQUEMENT si :
//   1. brandingEnabled = true, ET
//   2. son plan a la feature `white_label` (cf. lib/plans.ts -> enterprise).
// Sinon on remonte au parent (modèle revendeur : c'est le revendeur Enterprise
// qui "paie" le white-label et le diffuse à ses clients enfants). Si aucun
// ancêtre n'est éligible -> branding Humanix par défaut.
//
// Les bytes du logo/favicon ne sont JAMAIS chargés ici (lourds) : on sélectionne
// les colonnes `*Mime` comme indicateur de présence et on construit une URL vers
// la route de service /api/branding/[tenantId]/logo (cf. WL3).

import { db } from "@/lib/db";
import { planHasFeature } from "@/lib/plans";

export type EffectiveBranding = {
  /** Nom de marque affiché (header, titres, emails). */
  brandName: string;
  /** Couleur primaire #RRGGBB (variable CSS --primary / --primary-500). */
  primaryColor: string;
  /** Couleur d'accent #RRGGBB (variable CSS --accent / --accent-500). */
  accentColor: string;
  /** Nom d'expéditeur des emails. */
  emailFromName: string;
  /** Masquer les mentions "Humanix" (footer "powered by"…). */
  hidePoweredBy: boolean;
  /** URL du logo (route de service tenant ou asset statique Humanix). */
  logoUrl: string;
  /** URL du favicon, ou null (= favicon Humanix par défaut). */
  faviconUrl: string | null;
  /** true si un branding custom est appliqué (vs défaut Humanix). */
  isCustom: boolean;
  /** Id du tenant dont provient le branding (self ou ancêtre revendeur). */
  sourceTenantId: string | null;
};

/** Branding Humanix par défaut (aucun white-label actif). */
export const DEFAULT_BRANDING: EffectiveBranding = {
  brandName: "Humanix Académie",
  primaryColor: "#0B3D91",
  accentColor: "#00A3A1",
  emailFromName: "Humanix Académie",
  hidePoweredBy: false,
  logoUrl: "/logo-humanix-academie-512.png",
  faviconUrl: null,
  isCustom: false,
  sourceTenantId: null,
};

/** Valide une couleur hex #RGB ou #RRGGBB. */
export function isValidHexColor(c: string | null | undefined): c is string {
  return typeof c === "string" && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c);
}

const MAX_DEPTH = 5; // garde-fou anti-chaîne infinie (revendeur de revendeur…)

type BrandingRow = {
  id: string;
  plan: string;
  parentTenantId: string | null;
  brandingEnabled: boolean;
  brandName: string | null;
  brandLogoMime: string | null;
  brandFaviconMime: string | null;
  brandPrimaryColor: string | null;
  brandAccentColor: string | null;
  brandEmailFromName: string | null;
  brandHidePoweredBy: boolean;
  // Entitlement du parent : un client d'un revendeur white_label est éligible
  // même si son propre plan ne contient pas white_label (cf. isEligible).
  parent: { isReseller: boolean; plan: string } | null;
};

const SELECT = {
  id: true,
  plan: true,
  parentTenantId: true,
  brandingEnabled: true,
  brandName: true,
  brandLogoMime: true,
  brandFaviconMime: true,
  brandPrimaryColor: true,
  brandAccentColor: true,
  brandEmailFromName: true,
  brandHidePoweredBy: true,
  parent: { select: { isReseller: true, plan: true } },
} as const;

/**
 * Un tenant est-il éligible à FOURNIR un branding ?
 *   - brandingEnabled = true, ET
 *   - son plan a white_label, OU son parent est un REVENDEUR white_label
 *     (l'entitlement du revendeur couvre ses clients : un client sur un plan
 *     pro peut donc avoir sa propre marque, posée par le revendeur — WL8).
 */
function isEligible(row: BrandingRow): boolean {
  if (!row.brandingEnabled) return false;
  if (planHasFeature(row.plan, "white_label")) return true;
  return Boolean(
    row.parent?.isReseller && planHasFeature(row.parent.plan, "white_label"),
  );
}

/** Construit le branding effectif à partir d'une row éligible. */
function brandingFromRow(row: BrandingRow): EffectiveBranding {
  return {
    brandName: row.brandName?.trim() || DEFAULT_BRANDING.brandName,
    primaryColor: isValidHexColor(row.brandPrimaryColor)
      ? row.brandPrimaryColor
      : DEFAULT_BRANDING.primaryColor,
    accentColor: isValidHexColor(row.brandAccentColor)
      ? row.brandAccentColor
      : DEFAULT_BRANDING.accentColor,
    emailFromName:
      row.brandEmailFromName?.trim() ||
      row.brandName?.trim() ||
      DEFAULT_BRANDING.emailFromName,
    hidePoweredBy: row.brandHidePoweredBy,
    logoUrl: row.brandLogoMime
      ? `/api/branding/${row.id}/logo`
      : DEFAULT_BRANDING.logoUrl,
    faviconUrl: row.brandFaviconMime ? `/api/branding/${row.id}/favicon` : null,
    isCustom: true,
    sourceTenantId: row.id,
  };
}

/**
 * Résout le branding effectif d'un tenant (avec cascade revendeur).
 * Retourne toujours un branding complet (jamais null) : défaut Humanix au pire.
 */
export async function getTenantBranding(
  tenantId: string | null | undefined,
): Promise<EffectiveBranding> {
  if (!tenantId) return DEFAULT_BRANDING;

  let currentId: string | null = tenantId;
  const seen = new Set<string>();

  for (let depth = 0; currentId && depth < MAX_DEPTH; depth++) {
    if (seen.has(currentId)) break; // anti-cycle
    seen.add(currentId);

    const row = (await db.tenant.findUnique({
      where: { id: currentId },
      select: SELECT,
    })) as BrandingRow | null;
    if (!row) break;

    if (isEligible(row)) return brandingFromRow(row);
    currentId = row.parentTenantId; // sinon on tente le revendeur parent
  }

  return DEFAULT_BRANDING;
}

/**
 * Résout le branding pour un sous-domaine public (WL7) : utilisé sur les pages
 * SANS session (login, /exposition…) pour qu'elles soient déjà brandées.
 * Le middleware (proxy.ts) extrait le sous-domaine du host dans `x-tenant-slug`.
 * On cherche le tenant par `brandSubdomain` puis on applique la cascade.
 */
export async function getBrandingForSubdomain(
  subdomain: string | null | undefined,
): Promise<EffectiveBranding> {
  if (!subdomain) return DEFAULT_BRANDING;
  const t = await db.tenant.findFirst({
    where: { brandSubdomain: subdomain.toLowerCase() },
    select: { id: true },
  });
  if (!t) return DEFAULT_BRANDING;
  return getTenantBranding(t.id);
}
