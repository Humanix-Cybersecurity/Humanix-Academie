// SPDX-License-Identifier: AGPL-3.0-or-later
// Lib utilitaire pour la hierarchie multi-etablissements.
// Regle metier : un user est attache a UN tenant precis (sa fiche RH /
// son etablissement). Quand un dirigeant a plusieurs tenants enfants, il
// peut consolider les vues en utilisant getDescendantTenantIds().
//
// Limite produit volontaire : pas plus de 2 niveaux pour cette V1
// (siege + sites). Architecture extensible si besoin (recursivite cote
// requete).
//
// Securite : on ne JAMAIS faire confiance a un tenantId fourni cote client -
// il faut TOUJOURS verifier que l'utilisateur courant a bien le droit de
// voir ce tenant via canAccessTenant().

import { db } from "@/lib/db";

export type TenantNode = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  establishmentType: string | null;
  parentTenantId: string | null;
  childrenCount: number;
  userCount: number;
};

/**
 * Retourne tous les tenantIds dans l'arbre descendant (inclus le tenant lui-meme).
 * Utilise pour les requetes consolidees au niveau parent.
 */
export async function getDescendantTenantIds(
  tenantId: string,
): Promise<string[]> {
  // V1 : 2 niveaux max. On charge l'enfant direct.
  const children = await db.tenant.findMany({
    where: { parentTenantId: tenantId },
    select: { id: true },
  });
  return [tenantId, ...children.map((c) => c.id)];
}

/**
 * Verifie qu'un utilisateur peut acceder a un tenant cible.
 * Regle : l'utilisateur peut acceder a son propre tenant + a tous ses
 * descendants si son role est ADMIN ou SUPERADMIN. Un MANAGER reste
 * cantonne a son tenant.
 */
export async function canAccessTenant(args: {
  userTenantId: string;
  userRole: string;
  targetTenantId: string;
}): Promise<boolean> {
  if (args.userTenantId === args.targetTenantId) return true;
  if (args.userRole !== "ADMIN" && args.userRole !== "SUPERADMIN") return false;

  // Le user ADMIN du tenant racine peut acceder aux enfants directs.
  const target = await db.tenant.findUnique({
    where: { id: args.targetTenantId },
    select: { parentTenantId: true },
  });
  if (!target) return false;
  return target.parentTenantId === args.userTenantId;
}

/**
 * Charge l'arborescence d'un tenant : lui + ses enfants (1 niveau).
 * Inclut compteur d'utilisateurs par tenant.
 */
export async function loadTenantTree(rootTenantId: string): Promise<{
  root: TenantNode;
  children: TenantNode[];
}> {
  const [root, children] = await Promise.all([
    db.tenant.findUnique({
      where: { id: rootTenantId },
      include: {
        _count: { select: { users: true, children: true } },
      },
    }),
    db.tenant.findMany({
      where: { parentTenantId: rootTenantId },
      include: {
        _count: { select: { users: true, children: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!root) throw new Error("tenant_not_found");

  return {
    root: tenantToNode(root),
    children: children.map(tenantToNode),
  };
}

function tenantToNode(t: any): TenantNode {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    plan: t.plan,
    establishmentType: t.establishmentType ?? null,
    parentTenantId: t.parentTenantId ?? null,
    childrenCount: t._count?.children ?? 0,
    userCount: t._count?.users ?? 0,
  };
}

/**
 * Cree un nouveau tenant enfant. Le slug est genere a partir du nom + cuid
 * pour eviter les conflits de slug global.
 */
export async function createChildTenant(args: {
  parentTenantId: string;
  name: string;
  establishmentType: string | null;
}): Promise<{ id: string; slug: string }> {
  const parent = await db.tenant.findUnique({
    where: { id: args.parentTenantId },
    select: { plan: true, parentTenantId: true },
  });
  if (!parent) throw new Error("parent_not_found");
  // Pas de niveau 3 : on refuse de creer un enfant si le parent est deja un enfant
  if (parent.parentTenantId) {
    throw new Error("max_depth_reached");
  }

  // Slug : kebab + suffixe court anti-collision
  const baseSlug = args.name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 6);
  const slug = `${baseSlug}-${suffix}`;

  const child = await db.tenant.create({
    data: {
      name: args.name,
      slug,
      plan: parent.plan, // herite du plan parent
      establishmentType: args.establishmentType,
      parentTenantId: args.parentTenantId,
    },
    select: { id: true, slug: true },
  });
  return child;
}

/**
 * Resume consolide pour le parent : agrege les KPI de tous les enfants.
 */
export async function buildConsolidatedStats(rootTenantId: string): Promise<{
  totalSeats: number;
  activatedSeats: number;
  completedEpisodes: number;
  averageMastery: number;
  byEstablishment: {
    tenantId: string;
    name: string;
    establishmentType: string | null;
    seats: number;
    mastery: number;
    completedEpisodes: number;
  }[];
}> {
  const tenantIds = await getDescendantTenantIds(rootTenantId);

  const [users, progress, allTenants] = await Promise.all([
    db.user.findMany({
      where: { tenantId: { in: tenantIds }, isActive: true, role: "LEARNER" },
      select: { id: true, tenantId: true, riskScore: true },
    }),
    db.progress.findMany({
      where: { tenantId: { in: tenantIds }, status: "COMPLETED" },
      select: { tenantId: true, userId: true },
    }),
    db.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true, establishmentType: true },
    }),
  ]);

  const totalSeats = users.length;
  const activatedSeats = new Set(progress.map((p) => p.userId)).size;
  const completedEpisodes = progress.length;
  const averageMastery =
    totalSeats === 0
      ? 0
      : Math.round(
          users.reduce((s, u) => s + (u.riskScore ?? 50), 0) / totalSeats,
        );

  const byEstablishment = allTenants.map((t) => {
    const tenantUsers = users.filter((u) => u.tenantId === t.id);
    const tenantProgress = progress.filter((p) => p.tenantId === t.id);
    const tenantSeats = tenantUsers.length;
    const tenantMastery =
      tenantSeats === 0
        ? 0
        : Math.round(
            tenantUsers.reduce((s, u) => s + (u.riskScore ?? 50), 0) /
              tenantSeats,
          );
    return {
      tenantId: t.id,
      name: t.name,
      establishmentType: t.establishmentType ?? null,
      seats: tenantSeats,
      mastery: tenantMastery,
      completedEpisodes: tenantProgress.length,
    };
  });

  return {
    totalSeats,
    activatedSeats,
    completedEpisodes,
    averageMastery,
    byEstablishment: byEstablishment.sort((a, b) => b.seats - a.seats),
  };
}
