// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Sert le logo ou le favicon d'un tenant (marque blanche) depuis la BDD.
//   GET /api/branding/<tenantId>/logo
//   GET /api/branding/<tenantId>/favicon
//
// Public par nature (le logo s'affiche sur les pages de login publiques). On ne
// renvoie que des bytes d'image + le bon Content-Type. URL stable, utilisable
// en web, dans les emails et sur le certificat PDF.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tenantId: string; asset: string }> },
) {
  const { tenantId, asset } = await params;
  if (asset !== "logo" && asset !== "favicon") {
    return new NextResponse(null, { status: 404 });
  }

  const t = await db.tenant.findUnique({
    where: { id: tenantId },
    select:
      asset === "logo"
        ? { brandLogo: true, brandLogoMime: true }
        : { brandFavicon: true, brandFaviconMime: true },
  });

  const bytes = asset === "logo" ? t?.brandLogo : t?.brandFavicon;
  const mime = asset === "logo" ? t?.brandLogoMime : t?.brandFaviconMime;
  if (!bytes || !mime) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(Buffer.from(bytes) as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": mime,
      // Branding stable : cache raisonnable, revalidé au changement (l'URL ne
      // change pas, donc on garde un TTL court pour refléter une mise à jour).
      "Cache-Control": "public, max-age=3600, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
