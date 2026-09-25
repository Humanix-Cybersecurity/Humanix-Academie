// SPDX-License-Identifier: AGPL-3.0-or-later
"use server";

// Creation manuelle d'un tenant par le SUPERADMIN (espace d'evaluation,
// client signe hors Mollie, revendeur). Une seule porte d'entree, la meme
// que le webhook Mollie : provisionTenantWithAdmin. Cf. lib/superadmin/
// creation-tenant.ts pour la lecture du formulaire et les messages.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";
import { provisionTenantWithAdmin } from "@/lib/tenant-provisioning";
import { sendInviteMagicLink } from "@/lib/invite-email";
import {
  lireFormulaireCreationTenant,
  urlFormulaireCreationTenant,
} from "@/lib/superadmin/creation-tenant";

export async function creerTenant(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPERADMIN") {
    throw new Error("UNAUTHORIZED: SUPERADMIN required");
  }
  const actorEmail = session.user.email ?? "unknown";

  // Valeurs brutes, renvoyees au formulaire en cas d'erreur pour ne pas
  // perdre la saisie.
  const brut = {
    org: String(formData.get("org") ?? ""),
    email: String(formData.get("email") ?? ""),
    adminName: String(formData.get("adminName") ?? ""),
    plan: String(formData.get("plan") ?? ""),
    revendeur: formData.get("revendeur") === "on",
  };

  const lu = lireFormulaireCreationTenant(formData);
  if (!lu.ok) {
    redirect(urlFormulaireCreationTenant({ ...brut, erreur: lu.erreur }));
  }
  const { input } = lu;

  const result = await provisionTenantWithAdmin({
    email: input.email,
    organizationName: input.organizationName,
    plan: input.plan,
    adminName: input.adminName ?? undefined,
    source: "superadmin-manual",
  });
  if (!result.ok) {
    redirect(urlFormulaireCreationTenant({ ...brut, erreur: result.reason }));
  }
  if (!result.created) {
    // Idempotence du provisioning : ne peut arriver qu'avec un identifiant
    // de paiement, qu'on ne fournit pas ici. On le signale quand meme.
    redirect(`/superadmin/tenants/${result.tenantId}?msg=existant`);
  }

  if (input.revendeur) {
    await db.tenant.update({
      where: { id: result.tenantId },
      data: { isReseller: true },
    });
  }

  // Le provisioning trace deja TENANT_CREATED avec la source. Ici : QUI a
  // cree, avec quels choix.
  await auditLog({
    action: AuditActions.TENANT_UPDATED,
    actor: { userId: session.user.id, email: actorEmail, role: "SUPERADMIN" },
    tenantId: result.tenantId,
    target: {
      type: "tenant",
      id: result.tenantId,
      label: input.organizationName,
    },
    message: `Tenant cree manuellement par ${actorEmail} (plan=${input.plan}${input.revendeur ? ", revendeur" : ""})`,
    metadata: {
      via: "superadmin_creation_tenant",
      plan: input.plan,
      isReseller: input.revendeur,
      adminUserId: result.userId,
    },
  });

  let invitation: "envoyee" | "echec" | "aucune" = "aucune";
  if (input.envoyerInvitation) {
    const res = await sendInviteMagicLink({
      email: input.email,
      recipientName: input.adminName,
      inviterName: actorEmail,
      tenantName: input.organizationName,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
      tenantId: result.tenantId,
    });
    invitation = res.ok ? "envoyee" : "echec";
    if (!res.ok) {
      console.error(
        "[superadmin-tenants] invitation echouee (tenant cree)",
        res.reason ?? "unknown",
      );
    }
  }

  redirect(
    `/superadmin/tenants/${result.tenantId}?msg=cree&invitation=${invitation}${result.communityAccountAttached ? "&rattache=1" : ""}`,
  );
}
