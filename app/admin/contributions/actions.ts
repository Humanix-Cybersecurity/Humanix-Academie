"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ModuleSubmissionSchema } from "@/lib/marketplace/schema";
import { computeContentHash } from "@/lib/marketplace/integrity";

/**
 * Incrémente le patch d'une version SemVer 1.2.3 → 1.2.4.
 * Si le format n'est pas reconnu, on revient à "1.0.1" par sécurité.
 */
function bumpPatch(version: string): string {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!m) return "1.0.1";
  const major = parseInt(m[1], 10);
  const minor = parseInt(m[2], 10);
  const patch = parseInt(m[3], 10) + 1;
  return `${major}.${minor}.${patch}`;
}

async function requireContributor() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") throw new Error("forbidden");
  return {
    userId: session.user!.id as string,
    tenantId: session.user!.tenantId as string,
    role,
  };
}

/**
 * Sauvegarde un brouillon (cree ou met a jour).
 * Le payload est valide cote serveur AVEC le schema Zod stricte.
 */
export async function saveDraft(input: {
  moduleId?: string;
  data: unknown;
}) {
  const { userId } = await requireContributor();

  const parsed = ModuleSubmissionSchema.safeParse(input.data);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: "validation_failed",
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    };
  }
  const data = parsed.data;
  const contentHash = computeContentHash(data.payload);

  // Verifier unicite du slug (sauf si c'est l'edition d'un brouillon existant)
  const existingBySlug = await db.marketplaceModule.findUnique({ where: { slug: data.slug } });
  if (existingBySlug && existingBySlug.id !== input.moduleId) {
    return { ok: false as const, error: "slug_taken" };
  }

  let module_;
  if (input.moduleId) {
    // Edition autorisée pour : DRAFT, REJECTED, APPROVED.
    //   - DRAFT / REJECTED : on écrase le brouillon directement.
    //   - APPROVED : on incrémente le patch (1.0.0 → 1.0.1) et on retombe
    //     en DRAFT pour signaler qu'une nouvelle version est en préparation.
    //     L'auteur devra explicitement re-soumettre via submitForReview().
    // PENDING_REVIEW reste verrouillé pour éviter conflit avec modérateur.
    const existing = await db.marketplaceModule.findUnique({ where: { id: input.moduleId } });
    if (!existing || existing.authorId !== userId) {
      return { ok: false as const, error: "not_found_or_forbidden" };
    }
    if (existing.status === "PENDING_REVIEW") {
      return { ok: false as const, error: "in_moderation" };
    }
    if (existing.status === "DEPRECATED") {
      return { ok: false as const, error: "deprecated" };
    }

    // Bump version si on quitte un état APPROVED (= nouvelle version pour
    // re-validation). Sur DRAFT/REJECTED on garde la version courante puisqu'il
    // n'y a pas eu de publication entre temps.
    let nextVersion = existing.version;
    if (existing.status === "APPROVED") {
      nextVersion = bumpPatch(existing.version);
    }

    module_ = await db.marketplaceModule.update({
      where: { id: input.moduleId },
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description,
        emoji: data.emoji,
        category: data.category,
        difficulty: data.difficulty,
        language: data.language,
        authorOrgName: data.authorOrgName || null,
        license: data.license,
        payload: data.payload,
        contentHash,
        version: nextVersion,
        status: "DRAFT",
        rejectionReason: null,
      },
    });
  } else {
    module_ = await db.marketplaceModule.create({
      data: {
        slug: data.slug,
        title: data.title,
        description: data.description,
        emoji: data.emoji,
        category: data.category,
        difficulty: data.difficulty,
        language: data.language,
        authorId: userId,
        authorOrgName: data.authorOrgName || null,
        isOfficial: false,
        license: data.license,
        payload: data.payload,
        contentHash,
        status: "DRAFT",
      },
    });
  }

  revalidatePath("/admin/contributions");
  return { ok: true as const, moduleId: module_.id };
}

/**
 * Soumet un brouillon pour modération.
 */
export async function submitForReview(moduleId: string) {
  const { userId, tenantId } = await requireContributor();
  const m = await db.marketplaceModule.findUnique({ where: { id: moduleId } });
  if (!m || m.authorId !== userId) throw new Error("not_found_or_forbidden");
  if (m.status !== "DRAFT" && m.status !== "REJECTED") throw new Error("not_submittable");

  // Rate limiting : max 5 soumissions par auteur par 24h
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
  const recentSubmissions = await db.marketplaceModule.count({
    where: { authorId: userId, submittedAt: { gte: cutoff } },
  });
  if (recentSubmissions >= 5) throw new Error("rate_limited");

  await db.$transaction([
    db.marketplaceModule.update({
      where: { id: moduleId },
      data: { status: "PENDING_REVIEW", submittedAt: new Date(), rejectionReason: null },
    }),
    db.event.create({
      data: {
        tenantId,
        userId,
        type: "marketplace_submit",
        payload: { moduleId, contentHash: m.contentHash },
      },
    }),
  ]);

  revalidatePath("/admin/contributions");
  revalidatePath("/admin/moderation");
  return { ok: true };
}

export async function deleteDraft(moduleId: string) {
  const { userId } = await requireContributor();
  const m = await db.marketplaceModule.findUnique({ where: { id: moduleId } });
  if (!m || m.authorId !== userId) throw new Error("not_found_or_forbidden");
  if (m.status === "APPROVED") throw new Error("cannot_delete_published");
  await db.marketplaceModule.delete({ where: { id: moduleId } });
  revalidatePath("/admin/contributions");
  return { ok: true };
}

// =====================================================
// MODERATION (SUPERADMIN uniquement)
// =====================================================
async function requireModerator() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = session.user!.role;
  if (role !== "SUPERADMIN") throw new Error("forbidden_moderator_only");
  return {
    userId: session.user!.id as string,
    tenantId: session.user!.tenantId as string,
  };
}

export async function approveModule(moduleId: string) {
  const { userId, tenantId } = await requireModerator();
  const m = await db.marketplaceModule.findUnique({ where: { id: moduleId } });
  if (!m) throw new Error("not_found");
  if (m.status !== "PENDING_REVIEW") throw new Error("not_pending");

  // Recompute hash to verify integrity at moderation time
  const recomputedHash = computeContentHash(m.payload);
  if (recomputedHash !== m.contentHash) {
    // Quelque chose a manipulé le payload entre la soumission et maintenant
    throw new Error("integrity_violation");
  }

  await db.$transaction([
    db.marketplaceModule.update({
      where: { id: moduleId },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: userId,
        rejectionReason: null,
      },
    }),
    db.event.create({
      data: {
        tenantId,
        userId,
        type: "marketplace_approve",
        payload: { moduleId, contentHash: m.contentHash },
      },
    }),
  ]);
  revalidatePath("/admin/moderation");
  revalidatePath("/marketplace");
  return { ok: true };
}

export async function rejectModule(moduleId: string, reason: string) {
  const { userId, tenantId } = await requireModerator();
  const m = await db.marketplaceModule.findUnique({ where: { id: moduleId } });
  if (!m) throw new Error("not_found");
  if (m.status !== "PENDING_REVIEW") throw new Error("not_pending");
  if (!reason || reason.length < 10) throw new Error("reason_required");

  await db.$transaction([
    db.marketplaceModule.update({
      where: { id: moduleId },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedById: userId,
        rejectionReason: reason.slice(0, 500),
      },
    }),
    db.event.create({
      data: {
        tenantId,
        userId,
        type: "marketplace_reject",
        payload: { moduleId, reason: reason.slice(0, 500) },
      },
    }),
  ]);
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/contributions");
  return { ok: true };
}
