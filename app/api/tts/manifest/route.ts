// SPDX-License-Identifier: AGPL-3.0-or-later
// GET /api/tts/manifest
//
// Retourne le manifest TTS complet : mapping
//   `${saisonSlug}/${episodeSlug}/${segmentId}` -> { hash, voice, bytes, duration }
//
// Le client utilise ce manifest pour resoudre les URLs MP3 a charger
// (`/api/tts/<hash>`).
//
// Pour éviter les requetes inutiles cote client, ce endpoint est mis en cache
// par le navigateur. Le manifest etant petit (~30 Ko) et change rarement
// (après chaque `npm run tts:build`), un max-age=300 + s-maxage=3600 est OK.

import { NextResponse } from "next/server";
import { defaultCacheRoot, loadManifest } from "@/lib/tts/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const manifest = loadManifest(defaultCacheRoot());
  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
