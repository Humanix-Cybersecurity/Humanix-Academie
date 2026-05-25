// SPDX-License-Identifier: AGPL-3.0-or-later
//
// GET /api/admin/phishing/export?campaignId=xxx -> CSV des resultats
//
// Permet a un ADMIN/RSSI de telecharger les resultats detailles d'une
// campagne phishing pour reporting interne (export Excel, partage RSSI).
//
// Si campaignId est omis, on exporte les 500 derniers resultats du tenant
// (toutes campagnes confondues).
//
// SECURITE :
//   - ADMIN/RSSI/SUPERADMIN du tenant uniquement
//   - Pas de cross-tenant : on filtre strictement par tenantId du caller
//   - Audit log PHISHING_REPORT_EXPORTED

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";
import { recordExportAccess } from "@/lib/security/exfiltration-detection";

export const dynamic = "force-dynamic";

/** Echappe une cellule CSV (RFC 4180) : guillemets doubles + entoure si besoin */
function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  // Si la cellule contient virgule, retour ligne ou guillemet -> entourer
  if (/[",\n\r;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(",");
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tenantId = session.user!.tenantId as string;
  if (!tenantId) {
    return NextResponse.json({ error: "no_tenant" }, { status: 400 });
  }

  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaignId");

  // Filtre : campagnes du tenant uniquement (anti-cross-tenant)
  const campaignWhere = campaignId
    ? { id: campaignId, tenantId }
    : { tenantId };

  const campaigns = await db.phishingCampaign.findMany({
    where: campaignWhere,
    orderBy: { scheduledAt: "desc" },
    select: { id: true, title: true, channel: true, template: true, scheduledAt: true, sentAt: true },
  });

  if (campaigns.length === 0) {
    return NextResponse.json(
      { error: "campaign_not_found" },
      { status: 404 },
    );
  }

  const campaignIds = campaigns.map((c) => c.id);
  const results = await db.phishingResult.findMany({
    where: { campaignId: { in: campaignIds } },
    orderBy: { sentAt: "desc" },
    take: campaignId ? 5000 : 500, // si campagne unique, plus de details
    include: {
      user: {
        select: {
          email: true,
          name: true,
          service: true,
          role: true,
        },
      },
      campaign: {
        select: {
          title: true,
          channel: true,
          template: true,
          scheduledAt: true,
        },
      },
    },
  });

  // En-tete CSV (UTF-8 BOM pour Excel FR)
  const BOM = "﻿";
  const header = csvRow([
    "campagne",
    "channel",
    "template",
    "schedulee_le",
    "destinataire_email",
    "destinataire_nom",
    "service",
    "role",
    "statut",
    "envoye_le",
    "clique_le",
    "signale_le",
    "reaction_secondes", // delai entre envoi et clic ou signalement
  ]);

  const rows = results.map((r) => {
    const reactionAt = r.clickedAt ?? r.reportedAt;
    const reactionSec = reactionAt
      ? Math.round(
          (new Date(reactionAt).getTime() - new Date(r.sentAt).getTime()) /
            1000,
        )
      : null;
    return csvRow([
      r.campaign.title,
      r.campaign.channel,
      r.campaign.template,
      r.campaign.scheduledAt.toISOString(),
      r.user.email,
      r.user.name ?? "",
      r.user.service ?? "",
      r.user.role,
      r.status,
      r.sentAt.toISOString(),
      r.clickedAt ? r.clickedAt.toISOString() : "",
      r.reportedAt ? r.reportedAt.toISOString() : "",
      reactionSec ?? "",
    ]);
  });

  const csv = BOM + header + "\n" + rows.join("\n") + "\n";

  // Audit log
  await auditLog({
    action: AuditActions.PHISHING_REPORT_EXPORTED,
    outcome: "SUCCESS",
    actor: {
      userId: session.user!.id as string,
      email: session.user!.email as string,
      role,
    },
    tenantId,
    metadata: {
      campaignId: campaignId ?? null,
      rowCount: results.length,
    },
  });

  // Pentest fix #8 sprint 3 : detection exfiltration en masse.
  // Compte les rows exportees sur fenetre rolling 5 min ; au-dela du
  // seuil (5000 rows ou 20 exports), audit log EXFILTRATION_SUSPECTED.
  // Ne bloque PAS l'export (defense en profondeur, pas en barriere)
  // pour ne pas dropper un export legitime.
  await recordExportAccess({
    tenantId,
    userId: session.user!.id as string,
    userEmail: session.user!.email as string,
    userRole: role,
    rowCount: results.length,
    endpoint: "/api/admin/phishing/export",
  });

  const filename = campaignId
    ? `phishing-${campaignId}-${new Date().toISOString().slice(0, 10)}.csv`
    : `phishing-tenant-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
