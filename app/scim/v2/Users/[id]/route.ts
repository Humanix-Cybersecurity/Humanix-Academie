// SCIM v2 - /Users/{id} : GET / PUT / PATCH / DELETE
// RFC 7644 §3.4.1 (retrieve), §3.5.1 (replace), §3.5.2 (modify), §3.6 (delete)

import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { SCIM_SCHEMAS, scimError } from "@/lib/scim/types";
import {
  prismaToScim,
  scimToPrismaCreate,
  applyScimPatch,
} from "@/lib/scim/mapper";

export const dynamic = "force-dynamic";

const SCIM_HEADERS = { "Content-Type": "application/scim+json" };
const SCIM_WRITE_LIMIT = 100; // PUT/PATCH/DELETE : 100/min/tenant
const SCIM_RATE_WINDOW_MS = 60 * 1000;

function baseUrlOf(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ??
    `https://${req.headers.get("host") ?? "academie.humanix-cybersecurity.fr"}`
  );
}

async function loadScopedUser(req: Request, id: string, op: string) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) {
    return {
      response: NextResponse.json(
        scimError(401, auth.error ?? "unauthorized"),
        { status: auth.status ?? 401, headers: SCIM_HEADERS },
      ),
    };
  }

  // Rate limit operation-specifique (read : 200/min, write : 100/min)
  const limit = op === "get" ? 200 : SCIM_WRITE_LIMIT;
  const rl = checkRateLimit(`scim:users-${op}:${auth.tenantId}`, limit, SCIM_RATE_WINDOW_MS);
  if (!rl.ok) {
    return {
      response: NextResponse.json(
        scimError(429, `Rate limit ${limit}/min atteint.`, "tooMany"),
        {
          status: 429,
          headers: { ...SCIM_HEADERS, "Retry-After": String(rl.retryAfter) },
        },
      ),
    };
  }

  const user = await db.user.findFirst({
    where: { id, tenantId: auth.tenantId! },
  });
  if (!user) {
    return {
      response: NextResponse.json(
        scimError(404, `User ${id} not found`),
        { status: 404, headers: SCIM_HEADERS },
      ),
    };
  }
  return { auth, user };
}

// ----- GET -----
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const r = await loadScopedUser(req, id, "get");
  if ("response" in r && !r.user) return r.response;

  return NextResponse.json(prismaToScim(r.user!, baseUrlOf(req)), {
    headers: SCIM_HEADERS,
  });
}

// ----- PUT (replace) -----
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const r = await loadScopedUser(req, id, "put");
  if ("response" in r && !r.user) return r.response;

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

  const updated = await db.user.update({
    where: { id },
    data: {
      email: data.email,
      name: data.name,
      role: data.role as "LEARNER" | "MANAGER" | "ADMIN" | "SUPERADMIN",
      service: data.service,
      isActive: data.isActive,
    },
  });

  return NextResponse.json(prismaToScim(updated, baseUrlOf(req)), {
    headers: SCIM_HEADERS,
  });
}

// ----- PATCH -----
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const r = await loadScopedUser(req, id, "patch");
  if ("response" in r && !r.user) return r.response;

  let body: { schemas?: string[]; Operations?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      scimError(400, "Invalid JSON body", "invalidSyntax"),
      { status: 400, headers: SCIM_HEADERS },
    );
  }

  if (!Array.isArray(body.Operations) || body.Operations.length === 0) {
    return NextResponse.json(
      scimError(400, "Missing Operations array", "invalidSyntax"),
      { status: 400, headers: SCIM_HEADERS },
    );
  }

  const ops = body.Operations as { op: string; path?: string; value?: unknown }[];
  const update = applyScimPatch(r.user!, ops);

  if (Object.keys(update).length === 0) {
    // Aucun changement : on renvoie tel quel
    return NextResponse.json(prismaToScim(r.user!, baseUrlOf(req)), {
      headers: SCIM_HEADERS,
    });
  }

  const updated = await db.user.update({
    where: { id },
    data: update as Record<string, unknown>,
  });

  return NextResponse.json(prismaToScim(updated, baseUrlOf(req)), {
    headers: SCIM_HEADERS,
  });
}

// ----- DELETE -----
// SCIM DELETE = soft delete par defaut chez nous (active=false), pour ne pas
// perdre l'historique de progression. Un vrai delete reste possible en
// mettant ?hard=true (necessaire pour le RGPD droit a l'effacement).
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const r = await loadScopedUser(req, id, "delete");
  if ("response" in r && !r.user) return r.response;

  const url = new URL(req.url);
  const hard = url.searchParams.get("hard") === "true";

  if (hard) {
    await db.user.delete({ where: { id } });
  } else {
    await db.user.update({ where: { id }, data: { isActive: false } });
  }

  // Audit trail
  db.event
    .create({
      data: {
        tenantId: r.user!.tenantId,
        type: hard ? "user.scim_deleted" : "user.scim_deactivated",
        payload: { userId: id, source: "scim" },
      },
    })
    .catch(() => {});

  return new NextResponse(null, { status: 204, headers: SCIM_HEADERS });
}
