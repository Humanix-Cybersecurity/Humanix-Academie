// Lib bibliotheque experts.
// Helpers pour requeter, denormaliser les stats, generer les slugs.

import { db } from "@/lib/db";

export type ExpertCard = {
  id: string;
  userId: string;
  slug: string;
  name: string;
  headline: string;
  organization: string | null;
  avatarUrl: string | null;
  expertiseTags: string[];
  modulesCount: number;
  totalInstalls: number;
  credentials: string[];
};

/**
 * Liste des experts publies, triee par activite (modules + installs).
 */
export async function listPublicExperts(limit = 50): Promise<ExpertCard[]> {
  const profiles = await db.expertProfile.findMany({
    where: { isPublished: true },
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ totalInstalls: "desc" }, { modulesCount: "desc" }],
    take: limit,
  });

  return profiles.map(toCard);
}

export async function getExpertBySlug(slug: string) {
  const profile = await db.expertProfile.findUnique({
    where: { slug },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          authoredModules: {
            where: { status: "APPROVED" },
            select: {
              id: true,
              slug: true,
              title: true,
              description: true,
              emoji: true,
              category: true,
              difficulty: true,
              installCount: true,
              isOfficial: true,
              version: true,
              createdAt: true,
            },
            orderBy: { installCount: "desc" },
          },
        },
      },
    },
  });
  if (!profile || !profile.isPublished) return null;
  return profile;
}

function toCard(p: any): ExpertCard {
  return {
    id: p.id,
    userId: p.userId,
    slug: p.slug,
    name: p.user.name ?? p.user.email.split("@")[0],
    headline: p.headline,
    organization: p.organization ?? null,
    avatarUrl: p.avatarUrl ?? null,
    expertiseTags: p.expertiseTags
      ? p.expertiseTags.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [],
    modulesCount: p.modulesCount,
    totalInstalls: p.totalInstalls,
    credentials: p.credentials
      ? p.credentials.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [],
  };
}

/**
 * Recalcule les stats denormalisees (modulesCount, totalInstalls) pour un
 * expert donne. A appeler apres validation/rejet d'un module ou apres
 * installation. Idempotent.
 */
export async function refreshExpertStats(userId: string): Promise<void> {
  const modules = await db.marketplaceModule.findMany({
    where: { authorId: userId, status: "APPROVED" },
    select: { installCount: true },
  });
  const profile = await db.expertProfile.findUnique({ where: { userId } });
  if (!profile) return;
  const totalInstalls = modules.reduce((s, m) => s + (m.installCount ?? 0), 0);
  await db.expertProfile.update({
    where: { userId },
    data: {
      modulesCount: modules.length,
      totalInstalls,
    },
  });
}

export function generateExpertSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}
