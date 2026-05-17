// SPDX-License-Identifier: AGPL-3.0-or-later
//
// GET /api/admin/pack-nis2/annual-report
//
// Genere et streame le RAPPORT ANNUEL NIS2 PDF d'un tenant.
// Pack NIS2 v2 — sortie autorite competente (CSIRT national / ANSSI).
//
// Authz : ADMIN/MANAGER/SUPERADMIN + plan Pro+.
// Tenant scope : strict (un admin ne peut telecharger que SON rapport).
//
// La periode couverte = 12 derniers mois par defaut, ou specifiee via
// ?periodStart=YYYY-MM-DD&periodEnd=YYYY-MM-DD.
//
// Les variables identite (tenantName, dirigeant, etc.) viennent du
// query param (UI rappelle le formulaire du Pack NIS2 standard).

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantPlan } from "@/lib/plans";
import { AnnualReportPdf, type AnnualReportData } from "@/lib/pack-nis2/annual-report";
import { computeTenantNis2Score } from "@/lib/nis2/score-tenant";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = session.user!.role;
  if (
    role !== "ADMIN" &&
    role !== "MANAGER" &&
    role !== "RSSI" &&
    role !== "SUPERADMIN"
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tenantId = session.user!.tenantId as string;

  const plan = await getTenantPlan(tenantId);
  if (!["pro", "enterprise"].includes(plan)) {
    return NextResponse.json(
      {
        error: "plan_too_low",
        message: "Le rapport annuel NIS2 nécessite l'offre Pro.",
      },
      { status: 402 },
    );
  }

  // Identite (depuis query params, comme le Pack NIS2 classique)
  const params = req.nextUrl.searchParams;
  const required = [
    "tenantName",
    "headquarterCity",
    "directeurName",
    "directeurTitle",
    "directeurEmail",
  ];
  for (const k of required) {
    if (!params.get(k)) {
      return NextResponse.json(
        { error: "missing_field", field: k },
        { status: 400 },
      );
    }
  }

  // Periode : 12 derniers mois par defaut
  const periodEnd = params.get("periodEnd")
    ? new Date(params.get("periodEnd")!)
    : new Date();
  const periodStart = params.get("periodStart")
    ? new Date(params.get("periodStart")!)
    : new Date(periodEnd.getTime() - 365 * 24 * 3600 * 1000);

  // Score NIS2 temps reel (reutilise le module commit B)
  const nis2Score = await computeTenantNis2Score(tenantId);

  // Incidents declares dans la periode (depuis IncidentResponse)
  const incidentsRaw = await db.incidentResponse.findMany({
    where: {
      tenantId,
      detectedAt: { gte: periodStart, lte: periodEnd },
    },
    select: {
      reference: true,
      type: true,
      severity: true,
      detectedAt: true,
      status: true,
      affectedUsers: true,
      cnilNotifiedAt: true,
      anssiNotifiedAt: true,
    },
    orderBy: { detectedAt: "desc" },
  });

  // Pour NIS2 : "autorite competente" = ANSSI en France. CNIL = RGPD.
  // On considere l'incident comme "notifie a l'autorite" si AU MOINS
  // une des deux notifications a eu lieu (couvre les incidents mixtes
  // donnees personnelles + reseaux).
  const incidents = incidentsRaw.map((i) => ({
    reference: i.reference,
    type: i.type,
    severity: i.severity,
    detectedAt: i.detectedAt,
    status: i.status,
    affectedUsers: i.affectedUsers,
    notifiedToAuthority:
      i.anssiNotifiedAt !== null || i.cnilNotifiedAt !== null,
  }));

  // Sensibilisation : agregats sur la periode
  const activeUsers = await db.user.count({
    where: {
      tenantId,
      isActive: true,
      role: { in: ["LEARNER", "MANAGER", "ADMIN", "RSSI"] },
    },
  });

  const progressInPeriod = await db.progress.findMany({
    where: {
      tenantId,
      status: "COMPLETED",
      completedAt: { gte: periodStart, lte: periodEnd },
    },
    select: { score: true, maxScore: true },
  });

  const totalCompletedModules = progressInPeriod.length;
  const avgScoreFraction = progressInPeriod.length
    ? progressInPeriod.reduce(
        (sum, p) =>
          sum + (p.maxScore > 0 ? (p.score ?? 0) / p.maxScore : 0),
        0,
      ) / progressInPeriod.length
    : 0;
  const averageScore = Math.round(avgScoreFraction * 100);

  // Phishing campaigns dans la periode
  const phishingCampaigns = await db.phishingCampaign.findMany({
    where: {
      tenantId,
      sentAt: { gte: periodStart, lte: periodEnd, not: null },
    },
    include: { results: true },
  });
  const phishingCampaignsRun = phishingCampaigns.length;
  const totalSent = phishingCampaigns.reduce(
    (s, c) => s + c.results.length,
    0,
  );
  const totalClicked = phishingCampaigns.reduce(
    (s, c) =>
      s +
      c.results.filter(
        (r) => r.status === "CLICKED" || r.clickedAt !== null,
      ).length,
    0,
  );
  const phishingClickRate =
    totalSent === 0 ? 0 : Math.round((totalClicked / totalSent) * 100);

  const data: AnnualReportData = {
    tenantName: params.get("tenantName")!,
    tenantSiren: params.get("tenantSiren"),
    headquarterCity: params.get("headquarterCity")!,
    directeurName: params.get("directeurName")!,
    directeurTitle: params.get("directeurTitle")!,
    directeurEmail: params.get("directeurEmail")!,
    dpoOrReferent: params.get("dpoOrReferent"),
    periodStart,
    periodEnd,
    generatedAt: new Date(),
    nis2Score,
    incidents,
    totalLearners: activeUsers,
    totalCompletedModules,
    averageScore,
    phishingCampaignsRun,
    phishingClickRate,
  };

  // Render le PDF
  const buffer = await renderToBuffer(<AnnualReportPdf data={data} />);

  // Audit log
  await db.event
    .create({
      data: {
        tenantId,
        userId: session.user.id ?? null,
        type: "nis2_annual_report_generated",
        payload: {
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          globalScore: nis2Score.globalScore,
          incidentsCount: incidents.length,
        },
      },
    })
    .catch(() => {
      /* best-effort */
    });

  const yyyy = periodEnd.getFullYear();
  const filename = `humanix-rapport-annuel-nis2-${yyyy}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
