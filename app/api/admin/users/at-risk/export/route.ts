// SPDX-License-Identifier: AGPL-3.0-or-later
//
// GET /api/admin/users/at-risk/export
//
// Export CSV de la liste des utilisateurs vulnerables. RFC 4180,
// BOM UTF-8 pour ouverture directe dans Excel sans corruption accents.
//
// Query :
//   ?threshold=40&days=60
//
// Auth : ADMIN, RSSI, MANAGER (read-only OK pour export), SUPERADMIN

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listAtRiskUsers } from "@/lib/admin/at-risk-users";
import { recordExportAccess } from "@/lib/security/exfiltration-detection";

export const dynamic = "force-dynamic";

/**
 * Echappe une cellule CSV selon RFC 4180 :
 * - si elle contient une virgule, des guillemets ou un saut de ligne,
 *   on l'entoure de guillemets et on double les guillemets internes
 */
function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  // Anti CSV-injection : prefixe les cellules debutant par = + - @ (ou tab/CR)
  // pour qu'Excel/Sheets ne les interprete pas comme des formules.
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

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
  const threshold = parseInt(url.searchParams.get("threshold") ?? "40", 10);
  const days = parseInt(url.searchParams.get("days") ?? "60", 10);

  const { users, filters } = await listAtRiskUsers(tenantId, {
    threshold,
    daysInactive: days,
  });

  const reasonLabel = {
    both: "Score bas + inactif",
    low_score: "Score bas",
    inactive: "Inactif",
  } as const;

  const trendLabel = {
    improving: "Amélioration",
    stable: "Stable",
    degrading: "Dégradation",
    insufficient_data: "Données insuffisantes",
  } as const;

  const header = [
    "Nom",
    "Email",
    "Role",
    "Service",
    "Groupes",
    "RiskScore",
    "Tendance",
    "TendanceIndicateur",
    "TendanceMotifs",
    "JoursSansActivite",
    "ModulesCompletes",
    "Motif",
  ];

  const rows = users.map((u) =>
    [
      csvEscape(u.name),
      csvEscape(u.email),
      csvEscape(u.role),
      csvEscape(u.service),
      csvEscape(u.groupBadges.map((g) => g.name).join("; ")),
      csvEscape(u.riskScore),
      csvEscape(trendLabel[u.trend]),
      csvEscape(u.trendIndicator.toFixed(2)),
      csvEscape(u.trendReasons.join(" · ")),
      csvEscape(u.daysSinceActivity),
      csvEscape(u.completedEpisodes),
      csvEscape(reasonLabel[u.reason]),
    ].join(","),
  );

  // BOM UTF-8 pour Excel
  const csv = "﻿" + [header.join(","), ...rows].join("\r\n") + "\r\n";

  const today = new Date().toISOString().slice(0, 10);
  const filename = `humanix-utilisateurs-vulnerables-${today}-score${filters.threshold}-inactif${filters.daysInactive}j.csv`;

  // Pentest fix #8 sprint 3 : detection exfiltration en masse.
  // Compte les rows exportees sur fenetre rolling 5 min ; au-dela du
  // seuil (5000 rows ou 20 exports), audit log EXFILTRATION_SUSPECTED.
  await recordExportAccess({
    tenantId,
    userId: session.user.id as string,
    userEmail: session.user.email as string,
    userRole: role,
    rowCount: users.length,
    endpoint: "/api/admin/users/at-risk/export",
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
