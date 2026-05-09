// SPDX-License-Identifier: AGPL-3.0-or-later
// SCIM v2 - /Users (GET list+filter, POST create)
// RFC 7644 §3.4.1 (list/query) et §3.3 (create)

import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { SCIM_SCHEMAS, scimError } from "@/lib/scim/types";
import { prismaToScim, scimToPrismaCreate } from "@/lib/scim/mapper";
import { parseScimFilter, filterToPrismaWhere } from "@/lib/scim/filter";

export const dynamic = "force-dynamic";

const SCIM_HEADERS = { "Content-Type": "application/scim+json" };

// SCIM rate limit : 200 req/min/tenant (largement suffisant pour un sync IdP
// normal qui fait du batch, mais prevent les boucles malicieuses).
const SCIM_RATE_LIMIT = 200;
const SCIM_RATE_WINDOW_MS = 60 * 1000;

function rateLimitGuard(tenantId: string, op: string) {
  return checkRateLimit(
    `scim:${op}:${tenantId}`,
    SCIM_RATE_LIMIT,
    SCIM_RATE_WINDOW_MS,
  );
}

function baseUrlOf(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ??
    `https://${req.headers.get("host") ?? "humanix-academie.fr"}`
  );
}

// ----- GET /Users : liste paginee + filtre -----
export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) {
    return NextResponse.json(scimError(401, auth.error ?? "unauthorized"), {
      status: auth.status ?? 401,
      headers: SCIM_HEADERS,
    });
  }
  const tenantId = auth.tenantId!;

  const rl = rateLimitGuard(tenantId, "users-get");
  if (!rl.ok) {
    return NextResponse.json(
      scimError(429, `Rate limit ${SCIM_RATE_LIMIT}/min atteint.`, "tooMany"),
      {
        status: 429,
        headers: { ...SCIM_HEADERS, "Retry-After": String(rl.retryAfter) },
      },
    );
  }

  const url = new URL(req.url);
  const filterRaw = url.searchParams.get("filter");
  const startIndex = Math.max(
    1,
    parseInt(url.searchParams.get("startIndex") ?? "1", 10),
  );
  const count = Math.min(
    200,
    Math.max(0, parseInt(url.searchParams.get("count") ?? "100", 10)),
  );

  let filterWhere: Record<string, unknown> = {};
  if (filterRaw) {
    const parsed = parseScimFilter(filterRaw);
    if (!parsed) {
      return NextResponse.json(
        scimError(400, `Filter not supported: ${filterRaw}`, "invalidFilter"),
        { status: 400, headers: SCIM_HEADERS },
      );
    }
    const where = filterToPrismaWhere(parsed);
    if (!where) {
      return NextResponse.json(
        scimError(
          400,
          `Filter attribute or operator not supported: ${filterRaw}`,
          "invalidFilter",
        ),
        { status: 400, headers: SCIM_HEADERS },
      );
    }
    filterWhere = where;
  }

  const where = { tenantId, ...filterWhere };
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: startIndex - 1,
      take: count,
    }),
  ]);

  type PrismaUserShape = {
    id: string;
    email: string;
    name: string | null;
    role: string;
    service: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };

  const baseUrl = baseUrlOf(req);
  return NextResponse.json(
    {
      schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
      totalResults: total,
      startIndex,
      itemsPerPage: users.length,
      Resources: (users as PrismaUserShape[]).map((u) =>
        prismaToScim(u, baseUrl),
      ),
    },
    { headers: SCIM_HEADERS },
  );
}

// ----- POST /Users : creation -----
export async function POST(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) {
    return NextResponse.json(scimError(401, auth.error ?? "unauthorized"), {
      status: auth.status ?? 401,
      headers: SCIM_HEADERS,
    });
  }
  const tenantId = auth.tenantId!;

  // Rate limit specifique POST (creation : on est plus strict, 50/min)
  const rl = checkRateLimit(
    `scim:users-post:${tenantId}`,
    50,
    SCIM_RATE_WINDOW_MS,
  );
  if (!rl.ok) {
    return NextResponse.json(
      scimError(
        429,
        "Rate limit 50/min atteint pour les creations.",
        "tooMany",
      ),
      {
        status: 429,
        headers: { ...SCIM_HEADERS, "Retry-After": String(rl.retryAfter) },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      scimError(400, "Invalid JSON body", "invalidSyntax"),
      { status: 400, headers: SCIM_HEADERS },
    );
  }

  const data = scimToPrismaCreate(body);
  if (!data) {
    return NextResponse.json(
      scimError(400, "Missing or invalid userName/email", "invalidValue"),
      { status: 400, headers: SCIM_HEADERS },
    );
  }

  // Unicite email globale (le schema Prisma a un @unique sur email)
  const existing = await db.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    return NextResponse.json(
      scimError(
        409,
        `User with userName ${data.email} already exists`,
        "uniqueness",
      ),
      { status: 409, headers: SCIM_HEADERS },
    );
  }

  const created = await db.user.create({
    data: {
      tenantId,
      email: data.email,
      name: data.name,
      role: data.role as "LEARNER" | "MANAGER" | "ADMIN" | "SUPERADMIN",
      service: data.service,
      isActive: data.isActive,
    },
  });

  // Audit trail (fire-and-forget)
  db.event
    .create({
      data: {
        tenantId,
        userId: created.id,
        type: "user.scim_provisioned",
        payload: { source: "scim", apiKeyId: auth.apiKeyId },
      },
    })
    .catch(() => {});

  return NextResponse.json(prismaToScim(created, baseUrlOf(req)), {
    status: 201,
    headers: {
      ...SCIM_HEADERS,
      Location: `${baseUrlOf(req)}/scim/v2/Users/${created.id}`,
    },
  });
}
