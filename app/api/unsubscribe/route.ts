// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Endpoint universel d'unsubscribe pour TOUS les mails opt-in (sauf
// Cyber-Anecdote qui a son endpoint dedie /api/anecdotes/unsubscribe/[token]).
//
// SUPPORTE :
//   - GET ?token=xxx  : redirect vers /desinscription (page de confirmation)
//   - POST ?token=xxx : RFC 8058 one-click. Repond 200 sans body si OK.
//
// SECURITE :
//   - Token HMAC verifie par lib/email/unsubscribe::verifyUnsubscribeToken.
//   - Aucune authentification : c'est volontaire (RFC 8058 exige que
//     Gmail/Outlook puissent appeler en POST sans cookie de session).
//   - IP hashee (sha256+pepper) stockee dans EmailOptOut.ipHash a titre de
//     preuve RGPD (qui a fait la demande, sans logger l'IP en clair).

import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";
import { markEmailOptedOut } from "@/lib/email/opt-out-check";

export const dynamic = "force-dynamic";

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const pepper = process.env.AUTH_SECRET ?? "";
  return createHash("sha256")
    .update(`${pepper}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

function getClientIp(req: NextRequest): string | null {
  // Derriere HAProxy : X-Forwarded-For peut contenir une chaine "ip1, ip2".
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? null;
}

async function handleUnsubscribe(
  req: NextRequest,
  token: string | null,
): Promise<{ ok: true; email: string; list: string } | { ok: false; reason: string }> {
  if (!token) return { ok: false, reason: "missing_token" };

  const verify = verifyUnsubscribeToken(token);
  if (!verify.ok) return { ok: false, reason: verify.reason };

  // Cas special : token de type "transactional". On accepte la demande
  // (l'user signale qu'il ne veut plus de magic link), mais comme c'est un
  // mail necessaire au login, on enregistre dans EmailOptOut puis on le
  // documente — un humain peut traiter au cas par cas si necessaire.
  // On NE bloque PAS les magic link futurs (sinon l'user ne peut plus
  // se connecter du tout).
  await markEmailOptedOut(verify.email, verify.list, {
    source: "one-click",
    ipHash: hashIp(getClientIp(req)) ?? undefined,
  });

  return { ok: true, email: verify.email, list: verify.list };
}

/**
 * GET /api/unsubscribe?token=xxx
 *
 * Cas du clic sur un lien classique dans le mail (pas one-click bouton Gmail).
 * Redirect vers /desinscription pour afficher une confirmation visuelle.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const result = await handleUnsubscribe(req, token);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (result.ok) {
    const url = new URL(
      `/desinscription?email=${encodeURIComponent(result.email)}&list=${encodeURIComponent(result.list)}`,
      base || "http://localhost:3000",
    );
    redirect(url.pathname + url.search);
  } else {
    const url = new URL(
      `/desinscription?error=${encodeURIComponent(result.reason)}`,
      base || "http://localhost:3000",
    );
    redirect(url.pathname + url.search);
  }
}

/**
 * POST /api/unsubscribe?token=xxx
 *
 * RFC 8058 : Gmail/Outlook envoient un POST quand l'utilisateur clique sur
 * le bouton natif "Se desinscrire" affiche dans l'interface du client mail.
 * Le body peut etre `List-Unsubscribe=One-Click` (form-encoded) ou vide.
 * On accepte les deux. Repondre 200 OK suffit (pas besoin de body).
 */
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const result = await handleUnsubscribe(req, token);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason },
      { status: result.reason === "missing_token" ? 400 : 410 },
    );
  }
  return NextResponse.json({ ok: true });
}
