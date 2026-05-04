// SPDX-License-Identifier: AGPL-3.0-or-later
// Téléchargement public du rapport d'audit de sécurité.
// Pas d'auth requise — l'audit est intégralement public dans une logique
// de transparence radicale.
//
// On audit-log la consultation pour avoir une idée du volume de demandes,
// sans tracking ni cookie supplémentaire.

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { SecurityAuditReport } from "@/lib/pdf-security-audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const buffer = await renderToBuffer(<SecurityAuditReport />);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `humanix-rapport-audit-securite-v1.0-${date}.pdf`;

  return new NextResponse(buffer as any, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "public, max-age=86400", // 24h cache CDN/proxy
    },
  });
}
