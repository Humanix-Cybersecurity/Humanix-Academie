// SPDX-License-Identifier: AGPL-3.0-or-later
//
// TRIPLE GARDE de la veille d'exposition B2B (Phase 2). OFF par défaut.
//
// La veille des comptes salariés touche des données personnelles : elle ne
// doit JAMAIS s'activer sans les trois conditions réunies (défense en
// profondeur, cf. docs/exposition-numerique/roadmap.md § Go/No-Go) :
//
//   1. Flag GLOBAL env EXPOSURE_B2B_ENABLED=true  -> kill switch plateforme.
//      Absent/≠ "true" => toute la Phase 2 est inerte, quel que soit l'état
//      des tenants. C'est le garde-fou ultime côté exploitant.
//   2. Tenant.exposureMonitoringEnabled = true     -> opt-in explicite du tenant.
//   3. Tenant.exposureMonitoringDpaSignedAt non null -> DPA art.28 enregistrée
//      (gate LÉGAL : pas de veille sans contrat de sous-traitance signé).
//
// Même avec ces trois feux verts, le cron ne fait que DÉTECTER. Aucune
// notification ni assignation de formation sans validation RSSI humaine
// (cf. b2b-assign.ts).

export type TenantMonitoringFlags = {
  exposureMonitoringEnabled: boolean;
  exposureMonitoringDpaSignedAt: Date | null;
  exposureDomains: string[];
};

/** Garde GLOBALE : la Phase 2 est-elle autorisée sur la plateforme ? */
export function isB2bGloballyEnabled(): boolean {
  return process.env.EXPOSURE_B2B_ENABLED === "true";
}

/**
 * La veille est-elle réellement active pour CE tenant ?
 * Exige les 3 conditions. Renvoie false au moindre doute.
 */
export function isB2bMonitoringActive(tenant: TenantMonitoringFlags): boolean {
  if (!isB2bGloballyEnabled()) return false;
  if (!tenant.exposureMonitoringEnabled) return false;
  if (!tenant.exposureMonitoringDpaSignedAt) return false;
  // Sans domaine déclaré, il n'y a rien à surveiller (et surtout aucun risque
  // de matcher des données de tiers).
  if (!tenant.exposureDomains || tenant.exposureDomains.length === 0) return false;
  return true;
}

/** Raison lisible (pour l'UI admin) si la veille n'est pas active. */
export function monitoringBlockedReason(
  tenant: TenantMonitoringFlags,
): string | null {
  if (!isB2bGloballyEnabled()) return "Désactivée au niveau plateforme (EXPOSURE_B2B_ENABLED).";
  if (!tenant.exposureMonitoringEnabled) return "Non activée pour ce tenant.";
  if (!tenant.exposureMonitoringDpaSignedAt) return "DPA art.28 non enregistrée (gate légal).";
  if (!tenant.exposureDomains || tenant.exposureDomains.length === 0)
    return "Aucun domaine déclaré à surveiller.";
  return null;
}
