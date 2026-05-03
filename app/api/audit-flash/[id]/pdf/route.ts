// Telechargement du rapport PDF d'audit flash.
// Public : l'URL contient l'id de soumission (cuid). Pas de session requise.

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/lib/db";
import { AuditFlashReport } from "@/lib/pdf-audit-flash";
import {
  buildAuditResult,
  AuditAnswers,
  CompanySize,
  Sector,
} from "@/lib/audit-flash/scoring";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const submission = await db.auditFlashSubmission.findUnique({
    where: { id },
  });
  if (!submission) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const result = buildAuditResult(
    submission.answers as AuditAnswers,
    submission.size as CompanySize,
    submission.sector as Sector,
  );

  const buffer = await renderToBuffer(
    AuditFlashReport({
      companyName: submission.companyName,
      contactName: submission.contactName,
      email: submission.email,
      size: submission.size as CompanySize,
      sector: submission.sector as Sector,
      generatedAt: submission.createdAt,
      result,
    }),
  );

  const safeCompany = submission.companyName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const filename = `audit-cyber-humanix-${safeCompany}-${submission.createdAt.toISOString().split("T")[0]}.pdf`;

  return new NextResponse(buffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
