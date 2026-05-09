// SPDX-License-Identifier: AGPL-3.0-or-later
//
// POST /api/admin/phishing/launch-by-group
//
// Endpoint JSON pour lancer une campagne phishing ciblee sur un ou
// plusieurs groupes metier (compta, rh, comex, ...). Equivalent du form
// /admin/phishing mais accessible programmaticalement (CRON, scripts,
// integrations partenaires).
//
// Body :
//   {
//     "templateId": "FAKE_MICROSOFT" | "FAKE_DRIVE" | ...,
//     "groupSlugs": ["compta", "direction"]
//   }
//
// Reponse OK : { ok: true, campaignId, targets, sent, failed, simulated }
// Reponse erreur : { ok: false, error: "...", message?: string }
//
// Auth : NextAuth, role ∈ {ADMIN, RSSI, SUPERADMIN}
// Tenant scoping : groupSlugs filtres par tenantId pour éviter cross-tenant

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { launchPhishingCampaign } from "@/lib/phishing/launch";

export const dynamic = "force-dynamic";

const Schema = z.object({
  templateId: z.string().min(1).max(64),
  groupSlugs: z
    .array(
      z
        .string()
        .min(1)
        .max(50)
        .regex(/^[a-z0-9-]+$/, "slug invalide"),
    )
    .min(1)
    .max(20),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tenantId = session.user.tenantId as string;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_payload" },
      { status: 400 },
    );
  }

  const { templateId, groupSlugs } = parsed.data;

  // Sanity-check : on verifie que les groupes existent dans CE tenant
  // (sinon le query suivante ne renverra simplement rien, ce qui est
  // ambigu cote API consumer).
  const existingGroups = await db.group.findMany({
    where: {
      tenantId,
      slug: { in: groupSlugs },
      isActive: true,
    },
    select: { slug: true },
  });
  const foundSlugs = new Set(existingGroups.map((g) => g.slug));
  const unknownSlugs = groupSlugs.filter((s) => !foundSlugs.has(s));
  if (unknownSlugs.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "unknown_groups",
        message: `Groupes inconnus pour ce tenant : ${unknownSlugs.join(", ")}`,
        unknownSlugs,
      },
      { status: 400 },
    );
  }

  // Resolution des cibles : tous les LEARNER/MANAGER actifs membres
  // d'au moins un des groupes
  const targets = await db.user.findMany({
    where: {
      tenantId,
      isActive: true,
      role: { in: ["LEARNER", "MANAGER"] },
      groups: {
        some: {
          group: {
            slug: { in: groupSlugs },
            isActive: true,
            tenantId,
          },
        },
      },
    },
    select: { id: true, email: true, name: true },
  });

  const result = await launchPhishingCampaign({
    tenantId,
    templateId,
    targets,
    targetingMode: "groups",
    targetingDetail: `groups:${groupSlugs.join(",")}`,
  });

  if (!result.ok) {
    const status =
      result.error === "smtp_not_configured" ||
      result.error === "smtp_decrypt_failed"
        ? 503
        : result.error === "no_targets"
          ? 404
          : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 200 });
}
