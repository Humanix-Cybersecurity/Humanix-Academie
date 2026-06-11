// SPDX-License-Identifier: AGPL-3.0-or-later
// Server Actions pour les operations admin
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";
import { auditLog, AuditActions } from "@/lib/audit";
import { fireAndForgetAutoAssign } from "@/lib/onboarding/auto-assign";
import {
  assertCanActOn,
  assertCanChangeRole,
  canAssignRole,
} from "@/lib/role-hierarchy";
import { getCurrentTenantId } from "@/lib/current-tenant";
import { canActAsAdminInTenant } from "@/lib/tenant-membership";

/**
 * Garde commun a toutes les server actions admin. Resout le tenant ACTIF
 * via getCurrentTenantId (sous-domaine + membership) plutot que de se
 * contenter de session.user.tenantId — ce qui permet a un SUPERADMIN
 * avec membership d'agir comme admin sur un autre tenant via son
 * sous-domaine.
 *
 * Securite : on revalide cote server que l'user a effectivement un acces
 * admin au tenant ACTIF (defense en profondeur, le layout fait deja le
 * check mais on s'assure que personne ne contourne via API directe).
 */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("unauthorized");
  const role = session.user!.role as string;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    throw new Error("forbidden");
  }
  const userId = session.user!.id as string;

  // Resout le tenant actif via le sous-domaine + membership (Sprint 2
  // multi-tenant : un SUPERADMIN sur acme.humanix-academie.fr agit dans
  // tenant Acme, pas dans son tenant home Humanix).
  const tenantId = await getCurrentTenantId();

  // Defense en profondeur : revalide l'acces admin au tenant actif.
  // SUPERADMIN bypass automatiquement (cf. canActAsAdminInTenant).
  const allowed = await canActAsAdminInTenant(userId, tenantId);
  if (!allowed) throw new Error("forbidden");

  return {
    tenantId,
    userId,
    role,
    email: session.user!.email as string | undefined,
  };
}

// =====================================================
// MODULES (saisons)
// =====================================================
export async function toggleSaisonActive(saisonId: string, isActive: boolean) {
  const { tenantId } = await requireAdmin();
  await db.tenantSaisonConfig.upsert({
    where: { tenantId_saisonId: { tenantId, saisonId } },
    create: { tenantId, saisonId, isActive },
    update: { isActive },
  });
  revalidatePath("/admin/modules");
  revalidatePath("/apprendre");
  return { ok: true };
}

export async function toggleSaisonMandatory(
  saisonId: string,
  isMandatory: boolean,
) {
  const { tenantId } = await requireAdmin();
  await db.tenantSaisonConfig.upsert({
    where: { tenantId_saisonId: { tenantId, saisonId } },
    create: { tenantId, saisonId, isMandatory },
    update: { isMandatory },
  });
  revalidatePath("/admin/modules");
  return { ok: true };
}

export async function moveSaison(saisonId: string, direction: "up" | "down") {
  const { tenantId } = await requireAdmin();
  // Recupere toutes les saisons accessibles au tenant + leurs configs custom
  const saisons = await db.saison.findMany({
    where: { OR: [{ tenantId: null }, { tenantId }] },
    orderBy: { order: "asc" },
  });
  const configs = await db.tenantSaisonConfig.findMany({ where: { tenantId } });
  const orderMap = new Map(configs.map((c) => [c.saisonId, c.customOrder]));

  // Tri effectif (custom order si défini, sinon order par défaut)
  const sorted = [...saisons].sort((a, b) => {
    const oa = orderMap.get(a.id) ?? a.order;
    const ob = orderMap.get(b.id) ?? b.order;
    return oa - ob;
  });

  const idx = sorted.findIndex((s) => s.id === saisonId);
  if (idx === -1) return { ok: false };
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= sorted.length) return { ok: false };

  // Swap des positions
  const a = sorted[idx];
  const b = sorted[swapWith];
  sorted[idx] = b;
  sorted[swapWith] = a;

  // On reattribue customOrder de 0 a N-1 a tous
  for (let i = 0; i < sorted.length; i++) {
    await db.tenantSaisonConfig.upsert({
      where: { tenantId_saisonId: { tenantId, saisonId: sorted[i].id } },
      create: { tenantId, saisonId: sorted[i].id, customOrder: i },
      update: { customOrder: i },
    });
  }
  revalidatePath("/admin/modules");
  revalidatePath("/apprendre");
  return { ok: true };
}

export async function resetSaisonsOrder() {
  const { tenantId } = await requireAdmin();
  await db.tenantSaisonConfig.updateMany({
    where: { tenantId },
    data: { customOrder: null },
  });
  revalidatePath("/admin/modules");
  revalidatePath("/apprendre");
  return { ok: true };
}

/**
 * Bulk action sur plusieurs saisons en une fois (selection multiple cote UI).
 *
 * Permet a l'admin de cliquer "Activer toute la categorie RH" sans avoir a
 * faire un toggle par saison. Une seule transaction logique cote BDD.
 *
 * Action :
 *   - "activate"        : isActive = true
 *   - "deactivate"      : isActive = false
 *   - "make-mandatory"  : isMandatory = true (n'altere pas isActive)
 *   - "drop-mandatory"  : isMandatory = false
 */
export async function bulkSaisonAction(
  saisonIds: string[],
  action:
    | "activate"
    | "deactivate"
    | "make-mandatory"
    | "drop-mandatory",
) {
  const { tenantId } = await requireAdmin();
  if (!Array.isArray(saisonIds) || saisonIds.length === 0) {
    return { ok: false, count: 0 };
  }

  // Map de l'action vers les patches BDD
  const patch =
    action === "activate"
      ? { isActive: true }
      : action === "deactivate"
        ? { isActive: false }
        : action === "make-mandatory"
          ? { isMandatory: true }
          : { isMandatory: false };

  // On upsert chaque ligne pour garantir la creation si la config n'existait
  // pas encore (saison globale jamais touchee = pas de TenantSaisonConfig).
  await Promise.all(
    saisonIds.map((saisonId) =>
      db.tenantSaisonConfig.upsert({
        where: { tenantId_saisonId: { tenantId, saisonId } },
        create: { tenantId, saisonId, ...patch },
        update: patch,
      }),
    ),
  );

  revalidatePath("/admin/modules");
  revalidatePath("/apprendre");
  return { ok: true, count: saisonIds.length };
}

/**
 * Modifie les tags d'une saison. Reservee aux SUPERADMIN (les tags sont
 * partages entre tous les tenants car ils servent au filtrage du catalogue
 * global). Pour personnaliser cote tenant, utiliser bulkSaisonAction.
 *
 * Note : pour les saisons custom du tenant (tenantId match), un ADMIN du
 * tenant peut modifier ses propres tags.
 */
export async function setSaisonTags(saisonId: string, tags: string[]) {
  const ctx = await requireAdmin();
  // Lookup pour decider du droit d'edition
  const saison = await db.saison.findUnique({ where: { id: saisonId } });
  if (!saison) throw new Error("saison_not_found");
  const isCustomOwn = saison.tenantId === ctx.tenantId;
  const isGlobal = saison.tenantId === null;
  if (!isCustomOwn && !(isGlobal && ctx.role === "SUPERADMIN")) {
    throw new Error("forbidden");
  }
  const cleaned = Array.from(
    new Set(
      (tags ?? [])
        .map((t) => String(t).trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 60),
    ),
  ).slice(0, 20); // garde-fous : max 20 tags, longueur max 60
  await db.saison.update({
    where: { id: saisonId },
    data: { tags: cleaned },
  });
  revalidatePath("/admin/modules");
  return { ok: true, tags: cleaned };
}

// =====================================================
// USERS
// =====================================================
export async function toggleUserActive(userId: string, isActive: boolean) {
  const ctx = await requireAdmin();
  if (userId === ctx.userId) throw new Error("cannot_disable_self");
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== ctx.tenantId) throw new Error("not_found");
  // Hierarchie RBAC : on ne peut suspendre/reactiver qu'un user de rang
  // strictement inferieur. Empeche deux ADMIN de se suspendre mutuellement
  // (lockout tenant) ou un RSSI de suspendre un ADMIN/SUPERADMIN.
  assertCanActOn(ctx.role as Role, target.role);
  await db.user.update({ where: { id: userId }, data: { isActive } });
  await auditLog({
    action: isActive ? AuditActions.USER_ACTIVATED : AuditActions.USER_SUSPENDED,
    actor: { userId: ctx.userId, email: ctx.email, role: ctx.role },
    tenantId: ctx.tenantId,
    target: { type: "user", id: userId, label: target.email },
  });
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

export async function changeUserRole(userId: string, role: Role) {
  const ctx = await requireAdmin();
  if (userId === ctx.userId) throw new Error("cannot_change_own_role");
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== ctx.tenantId) throw new Error("not_found");
  const previousRole = target.role;
  // Hierarchie RBAC : (1) on ne peut modifier qu'un user de rang STRICTEMENT
  // inferieur, (2) on ne peut promouvoir QUE vers un role <= le sien.
  // Empeche un ADMIN de creer un SUPERADMIN (privilege escalation), ou un
  // MANAGER de toucher au role d'un ADMIN. Signale par Florian 2026-05-22.
  assertCanChangeRole(ctx.role as Role, previousRole, role);
  await db.user.update({ where: { id: userId }, data: { role } });
  await auditLog({
    action: AuditActions.USER_ROLE_CHANGED,
    actor: { userId: ctx.userId, email: ctx.email, role: ctx.role },
    tenantId: ctx.tenantId,
    target: { type: "user", id: userId, label: target.email },
    message: `Role: ${previousRole} -> ${role}`,
    metadata: { from: previousRole, to: role },
  });
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

export async function deleteUser(userId: string) {
  const ctx = await requireAdmin();
  if (userId === ctx.userId) throw new Error("cannot_delete_self");
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== ctx.tenantId) throw new Error("not_found");
  // Hierarchie RBAC : impossible de supprimer un user de rang >= soi.
  // Empeche un ADMIN de supprimer un autre ADMIN ou un SUPERADMIN.
  assertCanActOn(ctx.role as Role, target.role);
  await db.user.delete({ where: { id: userId } });
  await auditLog({
    action: AuditActions.USER_DELETED,
    actor: { userId: ctx.userId, email: ctx.email, role: ctx.role },
    tenantId: ctx.tenantId,
    target: { type: "user", id: userId, label: target.email },
    message: "Suppression admin (RGPD : cascade progress/events/sessions)",
  });
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

/**
 * Invite ou rattache un utilisateur — RGPD-safe.
 *
 * 3 chemins selon l'etat de la cible :
 *  1. L'email n'existe nulle part dans la BDD
 *     -> on cree un User dans le tenant courant (flux invitation classique)
 *  2. L'email existe DEJA dans le tenant courant
 *     -> erreur claire "already_member"
 *  3. L'email existe DANS UN AUTRE TENANT
 *     -> on cree un TenantTransferRequest et on envoie un mail de
 *        demande de rattachement a l'adresse. Cote admin, on retourne
 *        un message NEUTRE pour ne pas reveler l'existence d'un compte
 *        ailleurs (RGPD : pas de fuite d'existence par enumeration).
 *
 * Le retour distingue les 3 cas pour que l'UI puisse afficher le bon
 * message :
 *  - { ok: true, mode: "invited" } : User cree dans le tenant
 *  - { ok: false, reason: "already_member" } : email present dans
 *    le tenant courant -> rien a faire
 *  - { ok: true, mode: "transfer_requested" } : message neutre, on a
 *    ENVOYE un mail SI le compte existe ailleurs (l'admin ne sait pas
 *    si l'email existe vraiment)
 */
export async function inviteUser(formData: FormData) {
  const ctx = await requireAdmin();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const name = (formData.get("name") as string) || null;
  const service = (formData.get("service") as string) || null;
  const role = (formData.get("role") as Role) || "LEARNER";
  const personalMessage =
    ((formData.get("personalMessage") as string) || "").trim() || null;
  if (!email || !email.includes("@")) throw new Error("invalid_email");

  // SECURITE (anti-escalade de privilege) : ne jamais accepter un role
  // superieur a celui de l'acteur. Le role vient du formulaire ; le <select>
  // de l'UI ne protege pas un POST direct sur cette server action. Sans ce
  // garde, un ADMIN/RSSI pourrait se fabriquer un compte SUPERADMIN.
  if (!canAssignRole(ctx.role as Role, role)) {
    throw new Error("forbidden_role_hierarchy");
  }

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true, tenantId: true },
  });

  // Cas 2 : deja dans le meme tenant -> erreur claire
  if (existing && existing.tenantId === ctx.tenantId) {
    return { ok: false as const, reason: "already_member" as const };
  }

  // Cas 1 : email libre -> creation User classique
  if (!existing) {
    const created = await db.user.create({
      data: {
        tenantId: ctx.tenantId,
        email,
        name,
        service,
        role,
      },
    });
    await auditLog({
      action: AuditActions.USER_INVITED,
      actor: { userId: ctx.userId, email: ctx.email, role: ctx.role },
      tenantId: ctx.tenantId,
      target: { type: "user", id: created.id, label: created.email },
      metadata: { role, service },
    });
    // Auto-assignation parcours obligatoire (fire-and-forget)
    void fireAndForgetAutoAssign(created.id, ctx.tenantId);

    // Envoyer le magic link d'invitation (fire-and-forget pour ne pas
    // bloquer l'admin si Scaleway TEM est lent / down). Recupere le
    // tenant + inviteur pour personnaliser l'email.
    void (async () => {
      try {
        const [tenant, inviter] = await Promise.all([
          db.tenant.findUnique({
            where: { id: ctx.tenantId },
            select: { name: true },
          }),
          db.user.findUnique({
            where: { id: ctx.userId },
            select: { name: true, email: true },
          }),
        ]);
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL ||
          process.env.AUTH_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          "http://localhost:3000";
        const { sendInviteMagicLink } = await import("@/lib/invite-email");
        await sendInviteMagicLink({
          email,
          recipientName: name,
          inviterName: inviter?.name || inviter?.email || "un administrateur",
          tenantName: tenant?.name || "votre espace Humanix",
          baseUrl,
        });
      } catch (err) {
        console.error("[invite] magic link email failed", err);
      }
    })();

    revalidatePath("/admin/utilisateurs");
    return { ok: true as const, mode: "invited" as const };
  }

  // Cas 3 : email existe dans un autre tenant
  // -> demande de rattachement RGPD-safe avec consentement explicite
  const { randomBytes } = await import("crypto");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 86400 * 1000); // 7 jours

  // On marque les anciennes demandes en attente pour ce meme email
  // depuis ce meme admin comme REVOKED (eviter les doublons en file).
  await db.tenantTransferRequest.updateMany({
    where: {
      requestedByTenantId: ctx.tenantId,
      targetEmail: email,
      status: "PENDING",
    },
    data: { status: "REVOKED" },
  });

  const transferRequest = await db.tenantTransferRequest.create({
    data: {
      requestedByUserId: ctx.userId,
      requestedByTenantId: ctx.tenantId,
      targetEmail: email,
      token,
      expiresAt,
      personalMessage,
    },
  });

  // Recupere le tenant + sponsor pour le mail
  const [tenant, requester] = await Promise.all([
    db.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { name: true },
    }),
    db.user.findUnique({
      where: { id: ctx.userId },
      select: { name: true, email: true },
    }),
  ]);

  // Envoi du mail (fire-and-forget : on ne revele pas a l'admin si
  // l'envoi a echoue, pour conserver la non-divulgation d'existence).
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.AUTH_URL ||
    "http://localhost";
  const acceptUrl = `${baseUrl}/transferer/${token}?action=accept`;
  const rejectUrl = `${baseUrl}/transferer/${token}?action=reject`;

  void (async () => {
    try {
      const { sendTransferRequestEmail } = await import(
        "@/lib/transfer-requests/email"
      );
      await sendTransferRequestEmail({
        to: email,
        ctx: {
          requestedByUserName:
            requester?.name || requester?.email || "un administrateur",
          requestedByTenantName: tenant?.name || "Humanix Académie",
          personalMessage,
          acceptUrl,
          rejectUrl,
          expiresAt,
        },
      });
    } catch (err) {
      console.error("[transfer-request] email failed", err);
    }
  })();

  await auditLog({
    action: AuditActions.TRANSFER_REQUEST_CREATED,
    actor: { userId: ctx.userId, email: ctx.email, role: ctx.role },
    tenantId: ctx.tenantId,
    target: { type: "transfer_request", id: transferRequest.id, label: email },
    metadata: { expiresAt: expiresAt.toISOString() },
  });

  revalidatePath("/admin/utilisateurs");
  return { ok: true as const, mode: "transfer_requested" as const };
}

// =====================================================
// CHALLENGE EQUIPE
// =====================================================
export async function startChallenge(formData: FormData) {
  const { tenantId } = await requireAdmin();
  const title =
    (formData.get("title") as string) || "Cyber-Challenge des équipes";
  const description = formData.get("description") as string;
  const durationDays = parseInt(
    (formData.get("durationDays") as string) || "7",
    10,
  );

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + durationDays);

  // Desactive tout autre challenge en cours
  await db.teamChallenge.updateMany({
    where: { tenantId, isActive: true },
    data: { isActive: false },
  });

  await db.teamChallenge.create({
    data: { tenantId, title, description, startDate, endDate, isActive: true },
  });
  revalidatePath("/admin/challenge");
  revalidatePath("/apprendre");
  revalidatePath("/classement");
  return { ok: true };
}

export async function stopChallenge(challengeId: string) {
  const { tenantId } = await requireAdmin();
  const c = await db.teamChallenge.findUnique({ where: { id: challengeId } });
  if (!c || c.tenantId !== tenantId) throw new Error("not_found");
  await db.teamChallenge.update({
    where: { id: challengeId },
    data: { isActive: false, endDate: new Date() },
  });
  revalidatePath("/admin/challenge");
  revalidatePath("/apprendre");
  revalidatePath("/classement");
  return { ok: true };
}

// =====================================================
// GROUPES METIER (Compta, RH, Dev, Commercial...)
// =====================================================
function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function createGroup(formData: FormData) {
  const ctx = await requireAdmin();
  const tenantId = ctx.tenantId;
  const name = ((formData.get("name") as string) ?? "").trim();
  const description = ((formData.get("description") as string) ?? "").trim();
  const emoji = ((formData.get("emoji") as string) ?? "🏷️").slice(0, 4);
  const color = ((formData.get("color") as string) ?? "").trim() || null;
  if (!name) throw new Error("name_required");
  let slug = slugify(name);
  if (!slug) slug = "groupe-" + Math.random().toString(36).slice(2, 6);
  // Eviter collision
  const existing = await db.group.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
  });
  if (existing) {
    slug = slug + "-" + Math.random().toString(36).slice(2, 5);
  }
  const created = await db.group.create({
    data: {
      tenantId,
      name,
      slug,
      emoji,
      color,
      description: description || null,
    },
  });
  await auditLog({
    action: AuditActions.GROUP_CREATED,
    actor: { userId: ctx.userId, email: ctx.email, role: ctx.role },
    tenantId,
    target: { type: "group", id: created.id, label: created.name },
  });
  revalidatePath("/admin/groupes");
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

export async function updateGroup(groupId: string, formData: FormData) {
  const ctx = await requireAdmin();
  const tenantId = ctx.tenantId;
  const target = await db.group.findUnique({ where: { id: groupId } });
  if (!target || target.tenantId !== tenantId) throw new Error("not_found");
  const name = ((formData.get("name") as string) ?? target.name).trim();
  const description = ((formData.get("description") as string) ?? "").trim();
  const emoji = ((formData.get("emoji") as string) ?? target.emoji).slice(0, 4);
  const color = ((formData.get("color") as string) ?? "").trim() || null;
  const isActive = formData.get("isActive") !== null;
  await db.group.update({
    where: { id: groupId },
    data: {
      name,
      description: description || null,
      emoji,
      color,
      isActive,
    },
  });
  await auditLog({
    action: AuditActions.GROUP_UPDATED,
    actor: { userId: ctx.userId, email: ctx.email, role: ctx.role },
    tenantId,
    target: { type: "group", id: groupId, label: name },
    metadata: { isActive },
  });
  revalidatePath("/admin/groupes");
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

export async function deleteGroup(groupId: string) {
  const ctx = await requireAdmin();
  const tenantId = ctx.tenantId;
  const target = await db.group.findUnique({ where: { id: groupId } });
  if (!target || target.tenantId !== tenantId) throw new Error("not_found");
  if (target.isSystem) throw new Error("system_group_protected");
  await db.group.delete({ where: { id: groupId } });
  await auditLog({
    action: AuditActions.GROUP_DELETED,
    actor: { userId: ctx.userId, email: ctx.email, role: ctx.role },
    tenantId,
    target: { type: "group", id: groupId, label: target.name },
  });
  revalidatePath("/admin/groupes");
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

export async function setUserGroups(userId: string, groupIds: string[]) {
  const ctx = await requireAdmin();
  const tenantId = ctx.tenantId;
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== tenantId) throw new Error("not_found");
  // Filtre les groupes qui appartiennent bien au tenant
  const validGroups = await db.group.findMany({
    where: { id: { in: groupIds }, tenantId },
    select: { id: true },
  });
  const validIds = new Set(validGroups.map((g) => g.id));
  await db.$transaction([
    db.userGroup.deleteMany({ where: { userId } }),
    db.userGroup.createMany({
      data: Array.from(validIds).map((groupId) => ({ userId, groupId })),
      skipDuplicates: true,
    }),
  ]);
  await auditLog({
    action: AuditActions.USER_GROUPS_CHANGED,
    actor: { userId: ctx.userId, email: ctx.email, role: ctx.role },
    tenantId,
    target: { type: "user", id: userId, label: target.email },
    metadata: { groupIds: Array.from(validIds) },
  });
  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin/groupes");
  return { ok: true };
}

export async function toggleGroupLead(
  userId: string,
  groupId: string,
  isLead: boolean,
) {
  const { tenantId } = await requireAdmin();
  const group = await db.group.findUnique({ where: { id: groupId } });
  if (!group || group.tenantId !== tenantId) throw new Error("not_found");
  await db.userGroup.update({
    where: { userId_groupId: { userId, groupId } },
    data: { isLead },
  });
  revalidatePath("/admin/groupes");
  return { ok: true };
}

// =====================================================
// SECURITE : forcer 2FA, deverrouiller, declencher reset mdp
// =====================================================
export async function forceUserMfa(userId: string, force: boolean) {
  const ctx = await requireAdmin();
  if (userId === ctx.userId && !force) {
    throw new Error("cannot_unforce_self");
  }
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== ctx.tenantId) throw new Error("not_found");
  // Hierarchie RBAC : on ne peut forcer/lever la 2FA que sur un user de
  // rang strictement inferieur. Sauf cas isCurrent ou on auto-force sa 2FA.
  if (userId !== ctx.userId) {
    assertCanActOn(ctx.role as Role, target.role);
  }
  await db.user.update({
    where: { id: userId },
    data: { mfaForced: force },
  });
  await auditLog({
    action: AuditActions.USER_MFA_FORCED,
    actor: { userId: ctx.userId, email: ctx.email, role: ctx.role },
    tenantId: ctx.tenantId,
    target: { type: "user", id: userId, label: target.email },
    message: force ? "2FA forcee par admin" : "Levee de l'obligation 2FA",
    metadata: { forced: force },
  });
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

export async function unlockUser(userId: string) {
  const ctx = await requireAdmin();
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== ctx.tenantId) throw new Error("not_found");
  // Hierarchie RBAC : on ne peut deverrouiller qu'un user de rang
  // strictement inferieur. Empeche un ADMIN de deverrouiller un
  // SUPERADMIN compromis (qui doit passer par le SUPERADMIN lui-meme
  // pour signaler la prise en charge).
  assertCanActOn(ctx.role as Role, target.role);
  await db.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
  await auditLog({
    action: AuditActions.USER_UNLOCKED,
    actor: { userId: ctx.userId, email: ctx.email, role: ctx.role },
    tenantId: ctx.tenantId,
    target: { type: "user", id: userId, label: target.email },
    message: "Deverrouillage manuel par admin",
  });
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

export async function adminResetUserMfa(userId: string) {
  const ctx = await requireAdmin();
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.tenantId !== ctx.tenantId) throw new Error("not_found");
  // Hierarchie RBAC : reset 2FA = action destructive sur la securite du
  // compte cible, on l'autorise SEULEMENT sur un user de rang inferieur.
  // Sinon un ADMIN pourrait reset la 2FA d'un SUPERADMIN et hijacker son
  // compte (suppression du seul facteur restant).
  assertCanActOn(ctx.role as Role, target.role);
  await db.user.update({
    where: { id: userId },
    data: {
      mfaSecret: null,
      mfaEnabled: false,
      mfaEnabledAt: null,
      mfaBackupCodesHash: null,
    },
  });
  await auditLog({
    action: AuditActions.USER_MFA_RESET_BY_ADMIN,
    actor: { userId: ctx.userId, email: ctx.email, role: ctx.role },
    tenantId: ctx.tenantId,
    target: { type: "user", id: userId, label: target.email },
    message: "Reset 2FA TOTP : secret + codes de secours effaces",
  });
  revalidatePath("/admin/utilisateurs");
  return { ok: true };
}

// =====================================================
// IMPORT CSV
// =====================================================
type CsvRow = { email: string; name?: string; service?: string; role?: string };

export async function bulkImportUsers(rows: CsvRow[]) {
  const ctx = await requireAdmin();
  const tenantId = ctx.tenantId;
  const validRoles = ["LEARNER", "MANAGER", "RSSI", "ADMIN"];

  const result = { created: 0, skipped: 0, errors: [] as string[] };

  for (const row of rows) {
    const email = (row.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      result.errors.push(`Email invalide : "${row.email}"`);
      continue;
    }
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      result.skipped++;
      continue;
    }
    let role: Role = "LEARNER";
    if (row.role && validRoles.includes(row.role.toUpperCase())) {
      role = row.role.toUpperCase() as Role;
    }
    // Anti-escalade : un acteur ne peut pas creer un compte d'un rang
    // superieur au sien (ex. un RSSI ne cree pas d'ADMIN) via le CSV.
    if (!canAssignRole(ctx.role as Role, role)) {
      result.errors.push(
        `Role "${role}" non autorise pour "${email}" (hierarchie).`,
      );
      continue;
    }
    try {
      const newUser = await db.user.create({
        data: {
          tenantId,
          email,
          name: row.name?.trim() || null,
          service: row.service?.trim() || null,
          role,
        },
      });
      result.created++;
      // Auto-assignation parcours obligatoire (fire-and-forget pour ne
      // pas bloquer l'import de 200 lignes si une assign rate)
      void fireAndForgetAutoAssign(newUser.id, tenantId);
    } catch (e: any) {
      result.errors.push(`Erreur pour ${email} : ${e?.message ?? "inconnue"}`);
    }
  }
  revalidatePath("/admin/utilisateurs");
  return result;
}
