// SPDX-License-Identifier: AGPL-3.0-or-later
// Types du systeme de licence signee Humanix.
//
// Structure :
//   - LicensePayload : les donnees signees (plan, seats, features, dates)
//   - License : payload + signature Ed25519
//   - LicenseString : format texte transportable "HUMANIX-LICENSE-v1.<b64>.<sig>"
//
// La signature Ed25519 garantit que la licence n'a pas ete modifiee. La
// cle publique est embarquee dans le code (lib/license/public-key.ts), la
// cle privee reste chez Humanix Cybersecurity (jamais distribuee).
//
// IMPORTANT : ce systeme protege contre la falsification mais PAS contre
// le bypass code-level (le client peut patcher verifyLicense() en self-host).
// C'est conforme a l'esprit AGPLv3 - cf. docs/OPEN_CORE.md.

import type { PlanId } from "@/lib/plans";

export type LicensePayload = {
  /** Version du format de licence. */
  v: 1;
  /** Identifiant unique de la licence (lic_xxxxxxxx). */
  licenseId: string;
  /** Nom de l'organisation a laquelle la licence est emise (texte libre). */
  issuedTo: string;
  /**
   * Domaine cluster-locked optionnel. Si defini, la licence n'est valide
   * que pour ce domaine (NEXT_PUBLIC_APP_URL doit le contenir). Empeche
   * le partage trivial entre tenants. Mettre null pour licence globale.
   */
  domain: string | null;
  /** Plan octroye par la licence. */
  plan: PlanId;
  /**
   * Nombre maximum de sieges autorises. null = illimite (Enterprise).
   * Le runtime peut comparer avec User.count pour soft-warn.
   */
  maxSeats: number | null;
  /**
   * Override de features specifiques. Vide = utilise le plan par defaut
   * (cf. FEATURE_MIN_PLAN). Sert pour des licences custom Enterprise
   * ("Pro + multi-site" sans aller jusqu'a Premium par exemple).
   */
  featuresOverride: string[];
  /** Date d'emission ISO 8601 UTC. */
  issuedAt: string;
  /** Date d'expiration ISO 8601 UTC. */
  expiresAt: string;
};

export type License = LicensePayload & {
  /** Signature Ed25519 base64url du JSON canonical du payload. */
  signature: string;
};

/** Resultat d'une verification de licence. */
export type LicenseCheckResult =
  | { valid: true; license: License; warning?: string }
  | { valid: false; error: LicenseError };

export type LicenseError =
  | "missing"
  | "malformed"
  | "bad_signature"
  | "expired"
  | "not_yet_valid"
  | "domain_mismatch"
  | "unsupported_version";

/** Description humaine d'une erreur, en francais, pour l'UI. */
export const LICENSE_ERROR_LABEL: Record<LicenseError, string> = {
  missing: "Aucune licence configuree.",
  malformed: "Format de licence invalide.",
  bad_signature: "Signature invalide. La licence a ete modifiee ou ne provient pas de Humanix.",
  expired: "Licence expiree. Renouvellement requis.",
  not_yet_valid: "Licence pas encore valide (date d'emission dans le futur).",
  domain_mismatch: "Licence emise pour un autre domaine.",
  unsupported_version: "Version de licence non supportee par cette installation.",
};
