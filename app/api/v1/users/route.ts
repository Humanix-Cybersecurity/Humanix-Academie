// SPDX-License-Identifier: AGPL-3.0-or-later
// GET /api/v1/users - liste des utilisateurs du tenant
import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await authenticateApiKey(req);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });

  const url = new URL(req.url);
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") ?? "100", 10),
    500,
  );

  const users = await db.user.findMany({
    where: { tenantId: a.tenantId! },
    take: limit,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      service: true,
      isActive: true,
      level: true,
      coins: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    data: users,
    meta: { count: users.length, tenantId: a.tenantId },
  });
}
