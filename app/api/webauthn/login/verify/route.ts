// SPDX-License-Identifier: AGPL-3.0-or-later
// POST /api/webauthn/login/verify
// Verifie la signature de la cle. Si OK, signe un cookie "fresh-auth"
// que le layout super-admin lira pour autoriser le step-up.
//
// Note : ce endpoint ne fait PAS le sign-in NextAuth ; il valide seulement
// la cle. Le client utilise ensuite signIn("webauthn", { ... }) avec le
// cookie pour finaliser la session NextAuth (cf. provider Credentials
// "webauthn" dans lib/auth.ts).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  verifyChallenge,
  verifyLogin,
  signFreshAuth,
  buildRequestOrigin,
  WEBAUTHN_LOGIN_COOKIE,
  WEBAUTHN_FRESH_COOKIE,
} from "@/lib/webauthn";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const response = body?.response;
  if (!email || !response) {
    return NextResponse.json(
      { error: "Email et reponse requis." },
      { status: 400 },
    );
  }
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, isActive: true },
  });
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Authentification echouee." }, { status: 401 });
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(WEBAUTHN_LOGIN_COOKIE)?.value;
  if (!cookieValue) {
    return NextResponse.json({ error: "Challenge expire." }, { status: 400 });
  }
  const env = verifyChallenge(cookieValue);
  if (!env || env.userId !== user.id) {
    return NextResponse.json({ error: "Challenge invalide." }, { status: 400 });
  }

  // Origin attendu de la signature browser : on lit l'host de la requete
  // courante (pour supporter le login depuis un sous-domaine de tenant)
  // et on valide qu'il est bien sous le rpID. Cf. fix bug Florian
  // 2026-05-23 : verify retournait 401 quand origin browser etait un
  // sub-domain de humanix-academie.fr alors que getOrigin() = root.
  const h = await headers();
  const originCheck = buildRequestOrigin(h);
  if (!originCheck.ok) {
    return NextResponse.json(
      { error: "Origin invalide." },
      { status: 400 },
    );
  }

  const result = await verifyLogin({
    userId: user.id,
    expectedChallenge: env.challenge,
    response,
    expectedOrigin: originCheck.origin,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Vérification echouee." },
      { status: 401 },
    );
  }

  // Pose le cookie fresh-auth pour autoriser le step-up super-admin
  const fresh = signFreshAuth(user.id);
  const res = NextResponse.json({ ok: true, credentialId: result.credentialId });
  res.cookies.set(WEBAUTHN_LOGIN_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(WEBAUTHN_FRESH_COOKIE, fresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 30 * 60, // 30 min
  });
  return res;
}
