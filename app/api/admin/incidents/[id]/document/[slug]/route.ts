// SPDX-License-Identifier: AGPL-3.0-or-later
// Telechargement d'un document de reponse a incident.
// Authn : ADMIN/SUPERADMIN du tenant proprietaire.

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DOCUMENT_REGISTRY } from "@/lib/incident-response/pdf-templates";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; slug: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tenantId = session.user!.tenantId as string;

  const { id, slug } = await params;
  const doc = DOCUMENT_REGISTRY[slug];
  if (!doc) {
    return NextResponse.json({ error: "unknown_document" }, { status: 404 });
  }

  const incident = await db.incidentResponse.findFirst({
    where: { id, tenantId },
    include: { tenant: true },
  });
  if (!incident) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    doc.component({
      incident,
      tenant: incident.tenant,
      generatedAt: new Date(),
    }),
  );

  const safeRef = incident.reference.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const filename = `humanix-${slug}-${safeRef}.pdf`;

  return new NextResponse(buffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
