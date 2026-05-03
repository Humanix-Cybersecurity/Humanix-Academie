// SCIM v2 - ResourceTypes (RFC 7643 §6)
// Decrit les types de ressources exposes : User et Group.

import { NextResponse } from "next/server";
import { SCIM_SCHEMAS } from "@/lib/scim/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
      totalResults: 2,
      Resources: [
        {
          schemas: [SCIM_SCHEMAS.RESOURCE_TYPE],
          id: "User",
          name: "User",
          endpoint: "/Users",
          description: "User Account",
          schema: SCIM_SCHEMAS.USER,
          schemaExtensions: [
            {
              schema: SCIM_SCHEMAS.HUMANIX_USER,
              required: false,
            },
          ],
          meta: { resourceType: "ResourceType", location: "/scim/v2/ResourceTypes/User" },
        },
        {
          schemas: [SCIM_SCHEMAS.RESOURCE_TYPE],
          id: "Group",
          name: "Group",
          endpoint: "/Groups",
          description: "Group (mappe sur le service utilisateur)",
          schema: SCIM_SCHEMAS.GROUP,
          meta: { resourceType: "ResourceType", location: "/scim/v2/ResourceTypes/Group" },
        },
      ],
    },
    { headers: { "Content-Type": "application/scim+json" } },
  );
}
