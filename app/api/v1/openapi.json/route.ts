// SPDX-License-Identifier: AGPL-3.0-or-later
//
// GET /api/v1/openapi.json
//
// Specification OpenAPI 3.0 publique de l'API Humanix Academie.
// Consommee par Swagger UI a /integrations/api et par les clients
// auto-generes (openapi-generator, openapi-typescript).
//
// PUBLIC : pas d'auth, pas de rate-limit. C'est une doc publique
// sur la surface de l'API. Le contenu ne fuite aucune donnee tenant.

import { NextResponse } from "next/server";
import { OPENAPI_SPEC } from "@/lib/openapi/spec";

export const dynamic = "force-static";
export const revalidate = 3600; // 1h cache CDN

export async function GET() {
  return NextResponse.json(OPENAPI_SPEC, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*", // doc publique, pas de CORS strict
    },
  });
}
