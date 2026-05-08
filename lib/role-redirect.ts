// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Helper canonique : "où atterrit un user fraîchement loggué selon son rôle ?"
//
// MODÈLE 3-LAYER :
//   - LEARNER (Communauté ou tenant payant) → /apprendre (hub modules)
//   - MANAGER / RSSI / ADMIN / SUPERADMIN → /admin (console)
//
// Utilisé par :
//   - app/post-login/page.tsx (redirect post-auth canonique)
//   - composants client qui veulent renvoyer l'user "chez lui"
//   - magic links de bienvenue (Phase 2 + Phase 3b webhook)

export type UserRoleString =
  | "LEARNER"
  | "MANAGER"
  | "RSSI"
  | "ADMIN"
  | "SUPERADMIN";

const ADMIN_ROLES: ReadonlySet<string> = new Set<UserRoleString>([
  "MANAGER",
  "RSSI",
  "ADMIN",
  "SUPERADMIN",
]);

/**
 * Renvoie le chemin canonique d'atterrissage selon le rôle.
 * - role admin (Manager+) → "/admin"
 * - tout le reste (LEARNER ou rôle inconnu) → "/apprendre"
 */
export function pathForRole(role: string | undefined | null): string {
  if (role && ADMIN_ROLES.has(role)) return "/admin";
  return "/apprendre";
}

/** True si le rôle a accès à `/admin/*`. */
export function isAdminRole(role: string | undefined | null): boolean {
  return !!role && ADMIN_ROLES.has(role);
}
