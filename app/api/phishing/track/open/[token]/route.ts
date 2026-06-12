// SPDX-License-Identifier: AGPL-3.0-or-later
//
// GET /api/phishing/track/open/[token] - Pixel tracking 1x1 transparent.
//
// CONTEXT (Phishing Engine v2, mai 2026) :
//   Le HTML des emails de phishing inclut un <img src="${AUTH_URL}/api/phishing/
//   track/open/${trackToken}" width="1" height="1" /> en fin de body. Quand le
//   client mail charge les images, ce GET est declenche -> on marque le
//   PhishingResult comme OPENED.
//
// IDEMPOTENCE :
//   On n'ecrit `openedAt` QUE si null (premier event gagne). Les retries
//   navigateur, les proxies de prefetch, les bots anti-phishing qui scannent
//   les liens en arriere-plan ne pollueront pas les stats apres le 1er hit.
//
// CONFIDENTIALITE :
//   - Aucune donnee personnelle capturee (juste l'event "ce trackToken a ete
//     resolu une fois"). Le User-Agent et l'IP sont volontairement IGNORES
//     ici (pas stockes) -- la finalite est pedagogique, pas surveillance.
//   - Token cuid opaque, pas de PII dans l'URL.
//
// PIEGES CONNUS :
//   - Les clients mail modernes (Gmail, Outlook 365) pre-fetchent les images
//     via un proxy serveur (Google Image Proxy, Microsoft Safe Links). Cela
//     declenche le pixel sans ouverture humaine -> faux positifs OPENED.
//   - Mitigation cote stats : on est explicite dans l'UI "OPENED inclut les
//     pre-fetch automatiques des clients mail". Pour distinguer reellement,
//     il faudrait un challenge JS dans la landing -- pas adapte au pixel.
//
// CACHE :
//   Cache-Control: no-store -- empeche les CDN/proxies de mettre en cache la
//   reponse (sinon les hits suivants ne reviendraient pas au serveur).

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PhishingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// PNG 1x1 transparent (base64). 67 octets, plus petit qu'un GIF transparent
// classique et meilleur support dans tous les clients mail.
const TRANSPARENT_PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;

  // Best-effort : si la DB est down ou si le token est invalide, on renvoie
  // quand meme le pixel (la finalite premiere est d'eviter de casser l'affichage
  // du mail cote client mail). On log silencieusement.
  try {
    if (token && typeof token === "string" && token.length > 0) {
      // Trouve le PhishingResult par trackToken et marque openedAt + status
      // OPENED si etait SENT. Idempotent.
      const result = await db.phishingResult.findUnique({
        where: { trackToken: token },
        select: { id: true, status: true, openedAt: true },
      });

      if (result && result.openedAt === null) {
        // Premier open : on marque. Si le status etait SENT, on le passe a OPENED.
        // Si le status etait deja CLICKED/SUBMITTED/REPORTED (cas rare ou le user
        // a clique avant qu'on ait recu le pixel -- e.g. il avait deja le mail
        // ouvert), on n'ecrase pas (CLICKED > OPENED dans le funnel).
        const shouldUpgradeStatus = result.status === PhishingStatus.SENT;
        await db.phishingResult.update({
          where: { id: result.id },
          data: {
            openedAt: new Date(),
            ...(shouldUpgradeStatus ? { status: PhishingStatus.OPENED } : {}),
          },
        });
      }
    }
  } catch {
    // Silent failure : on ne casse pas le rendu du mail si tracking down.
  }

  return new NextResponse(TRANSPARENT_PNG_1X1, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(TRANSPARENT_PNG_1X1.length),
      // No-store : empeche les CDN/proxies/navigateurs de cacher.
      // Sans ca, un client mail qui ouvre 2x le mail ne re-fetchera pas le pixel.
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      // Pas de cookie set, pas de tracking croise.
    },
  });
}
