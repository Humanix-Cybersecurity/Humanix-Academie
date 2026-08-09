// SPDX-License-Identifier: AGPL-3.0-or-later
//
// GET /api/admin/heatmap/export
//
// Export CSV d'une cellule de la heatmap : les membres d'un groupe metier
// avec leur completion individuelle sur une saison. RFC 4180, BOM UTF-8
// (cf. lib/csv.ts). Trie du moins avance au plus avance pour etre
// directement actionnable (qui relancer en premier).
//
// Query :
//   ?group=compta&saison=<saisonId>
//
// Auth : ADMIN, RSSI, MANAGER (read-only OK pour export, comme at-risk),
// SUPERADMIN. Tenant scoping via listGroupSaisonMembers.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listGroupSaisonMembers } from "@/lib/admin/heatmap";
import { recordExportAccess } from "@/lib/security/exfiltration-detection";
import { buildCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (
    role !== "ADMIN" &&
    role !== "RSSI" &&
    role !== "MANAGER" &&
    role !== "SUPERADMIN"
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tenantId = session.user.tenantId as string;

  const url = new URL(req.url);
  const group = url.searchParams.get("group") ?? "";
  const saison = url.searchParams.get("saison") ?? "";
  // Formats attendus : slug kebab-case (cf. schema launch-by-group) et id
  // opaque court. Tout le reste -> 400 sans toucher la BDD.
  if (
    !/^[a-z0-9-]{1,50}$/.test(group) ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(saison)
  ) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }

  const data = await listGroupSaisonMembers(tenantId, group, saison);
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const header = [
    "Nom",
    "Email",
    "Role",
    "EpisodesCompletes",
    "EpisodesPublies",
    "CompletionPct",
  ];
  const rows = data.members.map((m) => [
    m.name,
    m.email,
    m.role,
    m.completedCount,
    data.episodeCount,
    m.completionPct,
  ]);
  const csv = buildCsv(header, rows);

  // Detection exfiltration en masse (meme garde que l'export at-risk).
  await recordExportAccess({
    tenantId,
    userId: session.user.id as string,
    userEmail: session.user.email as string,
    userRole: role,
    rowCount: data.members.length,
    endpoint: "/api/admin/heatmap/export",
  });

  const today = new Date().toISOString().slice(0, 10);
  const filename = `humanix-heatmap-${data.group.slug}-${data.saison.slug}-${today}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
