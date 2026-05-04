// SCIM v2 - /Groups
// Implementation pragmatique : un Group SCIM = un "service" Humanix (ex:
// "Direction", "Compta", "IT"). Lecture seulement en v1 — la creation/mise
// a jour de Groups via SCIM modifierait `User.service`, ce qu'on prefere
// faire passer par la console admin Humanix pour eviter les incoherences.

import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { SCIM_SCHEMAS, scimError, type ScimGroup } from "@/lib/scim/types";

export const dynamic = "force-dynamic";
const SCIM_HEADERS = { "Content-Type": "application/scim+json" };

function baseUrlOf(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ??
    `https://${req.headers.get("host") ?? "academie.humanix-cybersecurity.fr"}`
  );
}

function serviceToGroupId(service: string): string {
  // ID stable a partir du nom du service (slugifie)
  return `svc-${service
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) {
    return NextResponse.json(scimError(401, auth.error ?? "unauthorized"), {
      status: auth.status ?? 401,
      headers: SCIM_HEADERS,
    });
  }

  const rl = checkRateLimit(`scim:groups-get:${auth.tenantId}`, 200, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      scimError(429, "Rate limit 200/min atteint.", "tooMany"),
      {
        status: 429,
        headers: { ...SCIM_HEADERS, "Retry-After": String(rl.retryAfter) },
      },
    );
  }

  // Aggregation : services distincts du tenant + leurs membres
  const users = await db.user.findMany({
    where: { tenantId: auth.tenantId!, service: { not: null } },
    select: {
      id: true,
      name: true,
      service: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  type Member = {
    id: string;
    name: string | null;
    service: string | null;
    updatedAt: Date;
    createdAt: Date;
  };
  const byService: Record<string, Member[]> = {};
  for (const u of users as Member[]) {
    if (!u.service) continue;
    byService[u.service] ??= [];
    byService[u.service].push(u);
  }

  const baseUrl = baseUrlOf(req);
  const groups: ScimGroup[] = Object.entries(byService).map(
    ([service, members]) => {
      const lastModified = members.reduce(
        (max: Date, m: Member) => (m.updatedAt > max ? m.updatedAt : max),
        members[0].updatedAt,
      );
      const created = members.reduce(
        (min: Date, m: Member) => (m.createdAt < min ? m.createdAt : min),
        members[0].createdAt,
      );
      return {
        schemas: [SCIM_SCHEMAS.GROUP],
        id: serviceToGroupId(service),
        displayName: service,
        members: members.map((m: Member) => ({
          value: m.id,
          display: m.name ?? undefined,
          type: "User",
        })),
        meta: {
          resourceType: "Group",
          created: created.toISOString(),
          lastModified: lastModified.toISOString(),
          location: `${baseUrl}/scim/v2/Groups/${serviceToGroupId(service)}`,
        },
      };
    },
  );

  return NextResponse.json(
    {
      schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
      totalResults: groups.length,
      startIndex: 1,
      itemsPerPage: groups.length,
      Resources: groups,
    },
    { headers: SCIM_HEADERS },
  );
}
