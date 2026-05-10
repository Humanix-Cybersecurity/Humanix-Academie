// SPDX-License-Identifier: AGPL-3.0-or-later
// Helpers de parsing / hierarchie pour les roles bootstrap admin.
//
// Extrait de scripts/bootstrap-admin.ts pour testabilite. Pure logic,
// pas d'I/O. Cf. lib/admin/bootstrap-role.test.ts pour les cas couverts.

import { Role } from "@prisma/client";

/**
 * Hierarchie des roles : un rang plus eleve a tous les droits des rangs
 * inferieurs. Aligne sur prisma/schema.prisma enum Role.
 */
export const ROLE_RANK: Record<Role, number> = {
  LEARNER: 0,
  MANAGER: 1,
  RSSI: 2,
  ADMIN: 3,
  SUPERADMIN: 4,
};

/**
 * Roles autorises pour le bootstrap. On ne cree jamais un LEARNER en
 * bootstrap : ce serait inutile, le premier user doit pouvoir administrer.
 */
export const BOOTSTRAP_ROLES: ReadonlySet<Role> = new Set<Role>([
  "MANAGER",
  "RSSI",
  "ADMIN",
  "SUPERADMIN",
]);

/**
 * Parse la valeur de BOOTSTRAP_ADMIN_ROLE env. Defaut = SUPERADMIN.
 *
 * Pourquoi SUPERADMIN par defaut : sur une instance fraiche, le tout-
 * premier compte est l'exploitant. Il doit pouvoir tout faire (creer
 * d'autres tenants, moderer, etc.). Si l'instance est mono-tenant
 * interne sans dimension SaaS, l'operateur peut surcharger via env
 * pour limiter a ADMIN.
 *
 * @param raw valeur brute de l'env var (peut etre undefined/vide/casse mixte)
 * @returns Role valide pour le bootstrap (jamais LEARNER)
 */
export function parseBootstrapRole(raw: string | undefined): Role {
  const upper = (raw ?? "").trim().toUpperCase();
  if (BOOTSTRAP_ROLES.has(upper as Role)) {
    return upper as Role;
  }
  return "SUPERADMIN";
}

/**
 * Indique s'il faut promouvoir un user existant. True si son role courant
 * est strictement inferieur au role cible.
 *
 * @param currentRole role actuel en BDD
 * @param targetRole role demande par le bootstrap
 */
export function shouldPromote(currentRole: Role, targetRole: Role): boolean {
  return ROLE_RANK[currentRole] < ROLE_RANK[targetRole];
}
