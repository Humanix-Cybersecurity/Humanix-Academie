// SCIM v2 - ServiceProviderConfig (RFC 7643 §5)
// Decrit les capacites de notre serveur SCIM. Lecture publique (pas d'auth).

import { NextResponse } from "next/server";
import { SCIM_SCHEMAS } from "@/lib/scim/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      schemas: [SCIM_SCHEMAS.SERVICE_PROVIDER_CONFIG],
      documentationUri: "https://academie.humanix-cybersecurity.fr/integrations/scim",
      patch: { supported: true },
      bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
      filter: { supported: true, maxResults: 200 },
      changePassword: { supported: false },
      sort: { supported: false },
      etag: { supported: true },
      authenticationSchemes: [
        {
          type: "oauthbearertoken",
          name: "OAuth Bearer Token",
          description:
            "Authentification via cle API Humanix (header Authorization: Bearer hxa_...).",
          specUri: "https://datatracker.ietf.org/doc/html/rfc6750",
          documentationUri:
            "https://academie.humanix-cybersecurity.fr/integrations/scim",
          primary: true,
        },
      ],
      meta: {
        resourceType: "ServiceProviderConfig",
        location: "/scim/v2/ServiceProviderConfig",
      },
    },
    { headers: { "Content-Type": "application/scim+json" } },
  );
}
