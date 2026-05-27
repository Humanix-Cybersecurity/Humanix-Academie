// SPDX-License-Identifier: AGPL-3.0-or-later
"use server";
//
// Server action : analyse IA d'un user pour generer son profil de vulnerabilite.
// Appel a la demande (clic admin), pas en batch automatique.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  generateVulnerabilityProfile,
  type VulnerabilityResult,
} from "@/lib/ai/phishing-vulnerability";

export async function analyzeUserVulnerability(
  userId: string,
): Promise<VulnerabilityResult> {
  const session = await auth();
  if (!session?.user || session.user.role === "LEARNER") {
    return { ok: false, error: "unauthorized" };
  }

  const tenantId = session.user.tenantId as string;

  // Verifie que le userId appartient bien au meme tenant (defense en
  // profondeur contre URL guess cross-tenant).
  const user = await db.user.findFirst({
    where: { id: userId, tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      service: true,
      role: true,
    },
  });
  if (!user) {
    return { ok: false, error: "not_found" };
  }

  // 180 jours d'historique
  const since = new Date(Date.now() - 180 * 24 * 3600 * 1000);
  const results = await db.phishingResult.findMany({
    where: {
      userId,
      sentAt: { gte: since },
    },
    select: {
      sentAt: true,
      openedAt: true,
      clickedAt: true,
      submittedAt: true,
      reportedAt: true,
      campaign: { select: { template: true } },
    },
  });

  // Determine le statut final atteint par event (le plus avance gagne).
  const resultsForAI = results.map((r) => {
    let finalStatus: "SENT" | "OPENED" | "CLICKED" | "SUBMITTED" | "REPORTED" =
      "SENT";
    if (r.reportedAt) finalStatus = "REPORTED";
    else if (r.submittedAt) finalStatus = "SUBMITTED";
    else if (r.clickedAt) finalStatus = "CLICKED";
    else if (r.openedAt) finalStatus = "OPENED";
    return {
      template: r.campaign.template,
      theme: r.campaign.template
        .replace(/^FAKE_/, "")
        .replace(/^SMS_FAKE_/, "")
        .replace(/^QR_FAKE_/, "")
        .toLowerCase(),
      finalStatus,
      sentAt: r.sentAt,
    };
  });

  return await generateVulnerabilityProfile({
    firstName: (user.name?.split(" ")[0] ?? "Apprenant").trim(),
    serviceOrRole: user.service ?? user.role ?? "Employe",
    results: resultsForAI,
  });
}
