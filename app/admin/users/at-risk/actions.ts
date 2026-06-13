// SPDX-License-Identifier: AGPL-3.0-or-later
"use server";
//
// Actions de la page « Utilisateurs vulnérables » : assignation du module
// anti-phishing à un récidiviste. Décision humaine RSSI/admin, audit-loggée.

import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assignPhishingRemediation } from "@/lib/phishing/repeat-offenders";

export async function assignPhishingRemediationAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  // MANAGER est lecture seule : seuls ADMIN/RSSI/SUPERADMIN peuvent assigner.
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/admin/users/at-risk?error=forbidden");
  }
  const tenantId = session.user.tenantId as string;
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) redirect("/admin/users/at-risk?error=missing_user");

  const res = await assignPhishingRemediation(userId, tenantId, {
    userId: session.user.id as string,
    email: session.user.email ?? undefined,
    role,
  });

  revalidatePath("/admin/users/at-risk");
  redirect(
    `/admin/users/at-risk?msg=${res.ok ? "remediation-assigned" : "remediation-failed"}`,
  );
}
