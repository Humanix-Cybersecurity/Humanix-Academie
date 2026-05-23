// SPDX-License-Identifier: AGPL-3.0-or-later
"use server";
//
// Actions SUPERADMIN sur un tenant : desactiver, reactiver, supprimer.
//
// SECURITE : toutes les actions exigent role SUPERADMIN (via auth() server-side).
// Une UI cote client peut etre bypassee — la verif sert ici, pas dans le form.
//
// AUDIT : chaque action ecrit une entree dans AuditLog avec le contexte
// (actor, tenantId cible, raison libre). Conserve indefiniment (RGPD :
// raison legitime de poursuite d'interet legitime + obligation comptable).
//
// DESACTIVATION = REVERSIBLE : flip isActive, met les meta (disabledAt,
// disabledBy, disabledReason). Le tenant et ses donnees restent en BDD,
// les utilisateurs ne peuvent juste plus se connecter (cf. lib/auth.ts).
//
// SUPPRESSION = DESTRUCTIVE : cascade delete sur User, Progress, Event,
// Group, etc. Conforme RGPD art. 17 (droit a l'effacement). Audit log
// CONSERVE (action TENANT_DELETED reste pour 5 ans : obligation comptable
// + securite). Une string de confirmation typee est requise (le nom exact
// du tenant) pour eviter les erreurs de manipulation.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";

async function requireSuperadminSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPERADMIN") {
    throw new Error("UNAUTHORIZED: SUPERADMIN required");
  }
  return session;
}

/**
 * Desactive un tenant : flip isActive=false + meta de tracabilite.
 *
 * Effet : les utilisateurs du tenant ne peuvent plus se connecter
 * (la callback signIn de NextAuth refuse). Les donnees restent en BDD,
 * reversible via reactivateTenant().
 */
export async function deactivateTenant(formData: FormData): Promise<void> {
  const session = await requireSuperadminSession();
  const actorEmail = session.user.email ?? "unknown";

  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);

  if (!tenantId) throw new Error("tenantId requis");
  if (!reason) throw new Error("raison requise");

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true, isActive: true },
  });
  if (!tenant) throw new Error("Tenant introuvable");
  if (!tenant.isActive) {
    // Idempotence : deja desactive, on log mais on ne rejette pas
    redirect(`/superadmin/tenants/${tenantId}?msg=already-disabled`);
  }

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      isActive: false,
      disabledAt: new Date(),
      disabledBy: actorEmail,
      disabledReason: reason,
    },
  });

  await auditLog({
    action: AuditActions.TENANT_DEACTIVATED,
    actor: { userId: session.user.id, email: actorEmail, role: "SUPERADMIN" },
    tenantId,
    target: { type: "tenant", id: tenantId, label: tenant.name },
    message: `Tenant desactive : ${reason}`,
    metadata: { slug: tenant.slug, reason },
  });

  redirect(`/superadmin/tenants/${tenantId}?msg=deactivated`);
}

/**
 * Reactive un tenant precedemment desactive. Les utilisateurs peuvent a
 * nouveau se connecter. Conserve l'historique disabledReason pour audit.
 */
export async function reactivateTenant(formData: FormData): Promise<void> {
  const session = await requireSuperadminSession();
  const actorEmail = session.user.email ?? "unknown";

  const tenantId = String(formData.get("tenantId") ?? "").trim();
  if (!tenantId) throw new Error("tenantId requis");

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, slug: true, isActive: true, disabledReason: true },
  });
  if (!tenant) throw new Error("Tenant introuvable");
  if (tenant.isActive) {
    redirect(`/superadmin/tenants/${tenantId}?msg=already-active`);
  }

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      isActive: true,
      // On conserve disabledAt / disabledBy / disabledReason pour la trace.
      // Si tu prefere les wiper a la reactivation, decommenter :
      // disabledAt: null, disabledBy: null, disabledReason: null,
    },
  });

  await auditLog({
    action: AuditActions.TENANT_REACTIVATED,
    actor: { userId: session.user.id, email: actorEmail, role: "SUPERADMIN" },
    tenantId,
    target: { type: "tenant", id: tenantId, label: tenant.name },
    message: `Tenant reactive (ancienne raison desact : ${tenant.disabledReason ?? "n/a"})`,
    metadata: { slug: tenant.slug },
  });

  redirect(`/superadmin/tenants/${tenantId}?msg=reactivated`);
}

/**
 * Suppression DESTRUCTIVE d'un tenant et de toutes ses donnees liees
 * (cascade DELETE Prisma sur User, Progress, Event, Group, etc.).
 *
 * Garde-fous :
 *   - Requiere de retaper exactement le NOM du tenant (slug si pas de nom)
 *   - Refuse si tenant = Communaute (cf. tenant-community.ts)
 *   - Refuse si tenant a une subscription active (au moins resilier d'abord)
 *
 * Apres suppression : redirect vers /superadmin/tenants (le tenant n'existe
 * plus, la page detail renverrait 404).
 */
export async function deleteTenant(formData: FormData): Promise<void> {
  const session = await requireSuperadminSession();
  const actorEmail = session.user.email ?? "unknown";

  const tenantId = String(formData.get("tenantId") ?? "").trim();
  const confirmName = String(formData.get("confirmName") ?? "").trim();

  // Helper : redirect avec message d'erreur en query param, plus robuste
  // que `throw` (les throws dans Server Actions peuvent afficher un 404
  // cryptique au lieu du message — bug signale par Florian 2026-05-23).
  // La page detail lit `?error=...` et affiche un banner rose.
  const errorRedirect = (msg: string): never => {
    const target = tenantId
      ? `/superadmin/tenants/${tenantId}?error=${encodeURIComponent(msg)}`
      : `/superadmin/tenants?error=${encodeURIComponent(msg)}`;
    redirect(target);
  };

  if (!tenantId) errorRedirect("tenantId requis");
  if (!confirmName) errorRedirect("Tape le nom du tenant pour confirmer");

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      paymentSubscriptionId: true,
      subscriptionStatus: true,
    },
  });
  if (!tenant) errorRedirect("Tenant introuvable");

  // Garde-fou 1 : protection du tenant Communaute (jamais supprimable)
  if (tenant!.slug === "humanix-community" || tenant!.slug === "community") {
    errorRedirect(
      "Le tenant Communauté ne peut pas être supprimé (il accueille les apprenants gratuits)",
    );
  }

  // Garde-fou 2 : confirmation exacte du nom
  if (confirmName !== tenant!.name) {
    errorRedirect(
      `Confirmation incorrecte : tape exactement "${tenant!.name}" (attention aux espaces et accents)`,
    );
  }

  // Garde-fou 3 : subscription active = il faut resilier Mollie d'abord
  if (
    tenant!.paymentSubscriptionId &&
    tenant!.subscriptionStatus === "active"
  ) {
    errorRedirect(
      "Tenant avec abonnement Mollie actif. Résilie d'abord la subscription via /admin/billing.",
    );
  }
  // À partir d'ici on a un tenant non-null garanti.

  // Audit log AVANT suppression : si le delete echoue on a quand meme la
  // trace de la tentative. Et apres : on ne peut plus referencer tenantId
  // pour un FK valide.
  await auditLog({
    action: AuditActions.TENANT_DELETED,
    actor: { userId: session.user.id, email: actorEmail, role: "SUPERADMIN" },
    // tenantId null APRES delete -> on le set quand meme ici pour l'historique,
    // mais sans contrainte FK (la table AuditLog n'a pas de FK strict).
    target: { type: "tenant", id: tenantId, label: tenant.name },
    message: `Tenant SUPPRIME definitivement (${tenant.name})`,
    metadata: { slug: tenant.slug, deletedTenantId: tenantId },
  });

  // Cascade DELETE : Prisma supprime automatiquement User, Progress,
  // Event, Group, etc. selon les onDelete: Cascade definis dans le schema.
  await db.tenant.delete({ where: { id: tenantId } });

  redirect("/superadmin/tenants?msg=deleted");
}
