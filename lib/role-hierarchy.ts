// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Hierarchie des roles + helpers d'autorisation.
//
// Regle centrale : "on ne peut modifier qu'une personne au role STRICTEMENT
// inferieur au sien, et on ne peut promouvoir QUE vers un role <= le sien".
//
// Exemples :
//   - Un SUPERADMIN peut tout faire (sauf se modifier lui-meme, regle
//     orthogonale gere par isCurrent)
//   - Un ADMIN peut modifier MANAGER/RSSI/LEARNER, mais PAS un autre ADMIN
//     ni un SUPERADMIN. Il peut promouvoir vers LEARNER/MANAGER/RSSI/ADMIN
//     (pas SUPERADMIN).
//   - Un RSSI peut modifier MANAGER/LEARNER, et promouvoir vers
//     LEARNER/MANAGER/RSSI.
//   - Un MANAGER peut modifier LEARNER, et promouvoir vers LEARNER/MANAGER.
//   - Un LEARNER ne peut rien modifier (et n'a pas acces a /admin de toute
//     facon).
//
// BUG CORRIGE 2026-05-22 : avant ce module, `changeUserRole()` ne verifiait
// QUE que l'appelant soit ADMIN/RSSI/SUPERADMIN (via requireAdmin). Un ADMIN
// pouvait donc promouvoir un autre user en SUPERADMIN (privilege escalation)
// ou modifier le role d'un SUPERADMIN existant. Signale par Florian :
// "un manager ne doit pas pouvoir changer le role d'un superadmin ou d'un
// admin. par defaut on ne peu changer les roles que des personnes qui ont
// le role inferieur."

import type { Role } from "@prisma/client";

/**
 * Rang numerique des roles. Plus c'est haut, plus c'est puissant.
 * Centralise ici pour ne pas dupliquer les comparaisons dans tout le code.
 */
export const ROLE_RANK: Record<Role, number> = {
  LEARNER: 0,
  MANAGER: 1,
  RSSI: 2,
  ADMIN: 3,
  SUPERADMIN: 4,
};

/**
 * Tous les roles dans l'ordre croissant de pouvoir.
 */
export const ALL_ROLES: Role[] = [
  "LEARNER",
  "MANAGER",
  "RSSI",
  "ADMIN",
  "SUPERADMIN",
];

/**
 * `actor` peut-il modifier (changer role / suspendre / supprimer / forcer MFA /
 * deverrouiller / reset MFA) un user dont le role est `target` ?
 *
 * Regle : oui SSI rank(actor) > rank(target).
 * Egalite NON autorisee : un ADMIN ne peut pas toucher un autre ADMIN. Sinon
 * deux admins pourraient se desactiver mutuellement (lockout du tenant) ou
 * se demettre.
 *
 * NB : la regle `isCurrent` (impossible de modifier son propre compte) est
 * orthogonale et doit etre verifiee separement.
 */
export function canModifyRoleOf(actor: Role, target: Role): boolean {
  return ROLE_RANK[actor] > ROLE_RANK[target];
}

/**
 * `actor` peut-il promouvoir (ou retrograder) quelqu'un VERS le role
 * `newRole` ?
 *
 * Regle : oui SSI rank(actor) >= rank(newRole). Egalite autorisee car
 * un ADMIN peut promouvoir un MANAGER en ADMIN (recrutement d'un pair).
 *
 * NB : a combiner avec `canModifyRoleOf(actor, target.currentRole)` :
 * promouvoir suppose deja le droit de modifier la cible.
 */
export function canAssignRole(actor: Role, newRole: Role): boolean {
  return ROLE_RANK[actor] >= ROLE_RANK[newRole];
}

/**
 * Liste des roles que `actor` peut assigner. Utilise par l'UI pour
 * construire la dropdown : un ADMIN voit LEARNER/MANAGER/RSSI/ADMIN mais
 * PAS SUPERADMIN.
 */
export function getAssignableRoles(actor: Role): Role[] {
  return ALL_ROLES.filter((r) => canAssignRole(actor, r));
}

/**
 * Helper pour les server actions : verifie la double regle "peut modifier
 * la cible ET peut assigner le nouveau role". Throw une erreur typee si
 * l'une des deux conditions echoue, pour une integration uniforme.
 *
 * @throws Error("forbidden_role_hierarchy") si la regle est violee
 */
export function assertCanChangeRole(
  actorRole: Role,
  targetCurrentRole: Role,
  newRole: Role,
): void {
  if (!canModifyRoleOf(actorRole, targetCurrentRole)) {
    throw new Error("forbidden_role_hierarchy");
  }
  if (!canAssignRole(actorRole, newRole)) {
    throw new Error("forbidden_role_hierarchy");
  }
}

/**
 * Helper pour les actions destructives non-role (suspendre / supprimer /
 * reset MFA / etc.) : verifie uniquement que l'acteur a un rang strictement
 * superieur a la cible.
 *
 * @throws Error("forbidden_role_hierarchy")
 */
export function assertCanActOn(actorRole: Role, targetRole: Role): void {
  if (!canModifyRoleOf(actorRole, targetRole)) {
    throw new Error("forbidden_role_hierarchy");
  }
}
