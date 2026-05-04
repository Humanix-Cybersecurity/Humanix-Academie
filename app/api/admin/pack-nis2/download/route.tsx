// SPDX-License-Identifier: AGPL-3.0-or-later
// Genere et streame le Pack NIS2 PDF.
// Authz : ADMIN/MANAGER/SUPERADMIN + plan Pro+.
//
// Methode GET (parametres URL) plutot que POST : ca permet d'utiliser le
// natif <form action="/api/..." method="GET"> sans Client Component
// supplementaire, et le download direct dans le navigateur.

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTenantPlan } from "@/lib/plans";
import { PackNis2Pdf, type PackNis2Variables } from "@/lib/pack-nis2/pdf";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tenantId = session.user!.tenantId as string;

  const plan = await getTenantPlan(tenantId);
  if (!["pro", "premium"].includes(plan)) {
    return NextResponse.json(
      { error: "plan_too_low", message: "Le pack NIS2 nécessite l'offre Pro." },
      { status: 402 },
    );
  }

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

  // Stats consolidees pour le registre
  const [tenant, totalLearners, totalCompletedModules, agg, phishingCampaigns] =
    await Promise.all([
      db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      db.user.count({ where: { tenantId, isActive: true, role: "LEARNER" } }),
      db.progress.count({ where: { tenantId, status: "COMPLETED" } }),
      db.progress.aggregate({
        where: { tenantId, status: "COMPLETED" },
        _avg: { bestScore: true },
      }),
      db.phishingCampaign.count({ where: { tenantId } }),
    ]);

  const avgScore = Math.round(agg._avg.bestScore ?? 0);

  // Score de risque collectif (best-effort sans dependre de la lib qui peut
  // etre lente). On prend la moyenne du riskScore user.
  const usersAvg = await db.user.aggregate({
    where: { tenantId, isActive: true },
    _avg: { riskScore: true },
  });

  const variables: PackNis2Variables = {
    tenantName: params.get("tenantName") ?? tenant?.name ?? "Votre entreprise",
    tenantSiren: cleanSiren(params.get("tenantSiren")),
    headquarterCity: params.get("headquarterCity") ?? "France",
    directeurName: params.get("directeurName") ?? "—",
    directeurTitle: params.get("directeurTitle") ?? "Président",
    directeurEmail: params.get("directeurEmail") ?? "contact@entreprise.fr",
    dpoOrReferent: params.get("dpoOrReferent") || null,
    contactCriseName: params.get("contactCriseName") || null,
    contactCriseEmail: params.get("contactCriseEmail") || null,
    contactCriseTel: params.get("contactCriseTel") || null,
    generatedAt: new Date(),
    totalLearners,
    totalCompletedModules,
    averageScore: avgScore,
    riskScore: Math.round(usersAvg._avg.riskScore ?? 50),
    phishingCampaigns,
  };

  // Audit log
  await db.event.create({
    data: {
      tenantId,
      userId: session.user!.id ?? null,
      type: "pack_nis2_generated",
      payload: {
        directeurName: variables.directeurName,
        headquarterCity: variables.headquarterCity,
      },
    },
  });

  const buffer = await renderToBuffer(<PackNis2Pdf variables={variables} />);

  const safeName = variables.tenantName
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .slice(0, 40);
  const filename = `pack-nis2-${safeName}-${variables.generatedAt.toISOString().slice(0, 10)}.pdf`;

  // Cast `as any` aligne sur le pattern de app/api/admin/conformity-report :
  // Node 22 type Buffer<ArrayBufferLike>, BodyInit attend un sous-ensemble plus
  // restreint. La donnee est correcte au runtime, c'est juste un narrowing TS.
  return new NextResponse(buffer as any, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}

function cleanSiren(s: string | null): string | null {
  if (!s) return null;
  const digits = s.replace(/\D/g, "");
  if (digits.length !== 9) return null;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
}
