// SPDX-License-Identifier: AGPL-3.0-or-later
// GET /api/tts/[hash]
//
// Sert un MP3 pre-genere depuis le cache disque (data/tts-cache/<2>/<hash>.mp3).
//
// SECURITE :
//   - Le hash est valide en hex strict (64 chars sha256) : aucun risque de
//     path-traversal car on reconstruit le chemin depuis le hash (pas
//     d'input user qui descend dans le FS).
//   - Pas d'auth : les MP3 sont du contenu pedagogique public, identiques
//     pour tous les apprenants. Le hash etant base sur le contenu, ils ne
//     fuitent rien que le frontend ne puisse deja deduire du manifest.
//
// PERFORMANCE :
//   - Le fichier est immuable (hash content-addressed) : Cache-Control 1 an
//     immutable. Le navigateur le mettra en cache dur, le CDN ou HAProxy
//     pourra cacher aussi.
//   - On stream le fichier via createReadStream pour pas charger en RAM.

import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { defaultCacheRoot, pathForHash } from "@/lib/tts/cache";

// On ne veut PAS de pre-rendu : ces fichiers sont servis en runtime depuis le FS.
export const dynamic = "force-dynamic";

const HASH_RE = /^[a-f0-9]{64}$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ hash: string }> },
) {
  const { hash } = await params;

  if (!HASH_RE.test(hash)) {
    return NextResponse.json({ error: "invalid_hash" }, { status: 400 });
  }

  const cacheRoot = defaultCacheRoot();
  const filePath = pathForHash(cacheRoot, hash);

  if (!existsSync(filePath)) {
    return NextResponse.json(
      {
        error: "not_cached",
        hint: "Lance `npm run tts:build` pour pre-generer le cache.",
      },
      { status: 404 },
    );
  }

  const stat = statSync(filePath);
  const stream = createReadStream(filePath);
  const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(stat.size),
      // Hash content-addressed -> immuable -> cache long
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
      "X-TTS-Source": "humanix-cache",
    },
  });
}
