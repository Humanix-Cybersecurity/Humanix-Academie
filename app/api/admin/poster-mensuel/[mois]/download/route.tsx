// SPDX-License-Identifier: AGPL-3.0-or-later
// Génère et streame un poster mensuel personnalisé en PDF A3.
// Authz : ADMIN/MANAGER/SUPERADMIN.
// Pas de plan-gate : c'est un cadeau différenciant offert à tous les paliers.

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeBusinessImpact } from "@/lib/business-impact";
import { MonthlyPoster, type PosterVariables } from "@/lib/posters/pdf";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mois: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tenantId = session.user!.tenantId as string;

  const { mois } = await params;
  const month = parseInt(mois, 10);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "invalid_month" }, { status: 400 });
  }

  // On charge tenant + business-impact pour personnaliser
  const [tenant, impact] = await Promise.all([
    db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    computeBusinessImpact(tenantId).catch(() => null),
  ]);
  if (!tenant) {
    return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });
  }

  // Service le plus faible (si dispo + score < 70)
  const weakest = impact?.byService?.[0];

  const variables: PosterVariables = {
    month,
    tenantName: tenant.name,
    weakestService: weakest?.service ?? null,
    weakestScore: weakest?.avgScore ?? null,
    generatedAt: new Date(),
  };

  // Audit log
  await db.event
    .create({
      data: {
        tenantId,
        userId: session.user!.id ?? null,
        type: "poster_generated",
        payload: { month },
      },
    })
    .catch(() => {});

  const buffer = await renderToBuffer(<MonthlyPoster variables={variables} />);

  const safeName = tenant.name.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 40);
  const filename = `poster-cyber-${safeName}-${String(month).padStart(2, "0")}.pdf`;

  return new NextResponse(buffer as any, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}
