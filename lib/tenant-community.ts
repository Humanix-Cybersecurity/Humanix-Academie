// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tenant Communauté — l'unique tenant non-payant de la plateforme cloud
// Humanix. Tous les apprenants gratuits y sont rattachés en role LEARNER.
//
// MODÈLE D'ACCÈS 3-LAYER (cf. plan launch OSS mai 2026) :
//   Niveau 1 — Plateforme owner (SUPERADMIN, founder Humanix)
//     Accès cross-tenant via /superadmin. Pas concerné par ce module.
//   Niveau 2 — Tenant admins payants (RSSI/DAF/DSI/DPO/MANAGER/ADMIN)
//     Une organisation = un tenant payant = leur propre /admin.
//   Niveau 3 — Apprenants gratuits (LEARNER) — CE MODULE
//     Inscription publique, attachés au tenant Communauté, accès
//     uniquement à /apprendre + contenus publics. Pas d'/admin.
//
// IMPORTANT — pourquoi un slug constant et pas un flag schema isDefault :
//   - Plus simple : pas de migration ni de partial unique index PostgreSQL
//     (Prisma ne les supporte pas nativement).
//   - Plus robuste : le slug est déjà @unique au niveau DB, garanti par
//     l'index existant. Une seule façon de référencer le tenant Communauté.
//   - Plus testable : code paths clairement nommés, pas de scan booléen.
//   - Si on veut ajouter d'autres tenants "système" plus tard (ex : tenant
//     interne Humanix-Cybersecurity pour la dogfooding), on suit la même
//     convention via d'autres slugs réservés.
//
// CONVENTION — ne PAS confondre avec le palier "Community Edition" de
// /tarifs (self-host AGPL). Ici on parle du tenant CLOUD humanix-cybersecurity.fr
// auquel les apprenants gratuits sont rattachés. Voir lib/plans.ts pour le
// commentaire d'origine sur ce point.

import { db } from "@/lib/db";

/** Slug DB réservé (immutable) du tenant Communauté hébergé. */
export const COMMUNITY_TENANT_SLUG = "humanix-community";

/** Nom d'affichage du tenant Communauté. */
export const COMMUNITY_TENANT_NAME = "Humanix Communauté";

/**
 * Plan attaché au tenant Communauté. Mappé sur `decouverte` (forever-free)
 * pour rester compatible avec l'enum PlanId existant (lib/plans.ts), mais
 * la limite de sièges de `decouverte` (5) NE S'APPLIQUE PAS au tenant
 * Communauté — il accueille tous les apprenants gratuits sans plafond.
 * L'exception est portée par la logique seat-check (cf. lib/plans.ts
 * helper `seatCountFor()` lors d'une refonte ultérieure).
 */
export const COMMUNITY_TENANT_PLAN = "decouverte";

/** Type minimal pour les checks `isCommunityTenant`. */
type WithSlug = { slug: string };

/**
 * Récupère le tenant Communauté en BDD. `null` si absent (= seed pas
 * encore exécuté en prod) — laisser à l'appelant le soin de gérer.
 */
export async function getCommunityTenant() {
  return db.tenant.findUnique({
    where: { slug: COMMUNITY_TENANT_SLUG },
  });
}

/**
 * Variante stricte : throw si le tenant est absent. À utiliser dans les
 * flows où l'absence est anormale (signup learner gratuit, redirect
 * post-login...).
 */
export async function getCommunityTenantOrThrow() {
  const tenant = await getCommunityTenant();
  if (!tenant) {
    throw new Error(
      `[tenant-community] Tenant '${COMMUNITY_TENANT_SLUG}' absent en BDD. ` +
        "Exécute `npm run db:seed` (le seed gère ce tenant en mode prod ET demo).",
    );
  }
  return tenant;
}

/** True si le tenant fourni est le tenant Communauté. */
export function isCommunityTenant(tenant: WithSlug | null | undefined): boolean {
  return tenant?.slug === COMMUNITY_TENANT_SLUG;
}
