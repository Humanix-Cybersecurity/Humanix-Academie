// SPDX-License-Identifier: AGPL-3.0-or-later
// POST /api/webauthn/login/options
// Genere un challenge pour authentifier un user via FIDO2.
// Pas d'auth requise (c'est l'auth qu'on fait). On accepte un email
// dans le body pour cibler les credentials du bon user.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildLoginOptions, WEBAUTHN_LOGIN_COOKIE } from "@/lib/webauthn";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email requis." }, { status: 400 });
  }
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, isActive: true },
  });
  if (!user || !user.isActive) {
    // Anti-enumeration : on retourne un challenge valide mais aucun
    // credential allowed -> le navigateur affichera "no key" sans reveler
    // que l'email n'existe pas.
    const dummyOptions = await buildLoginOptions("0").catch(() => null);
    if (dummyOptions) {
      const res = NextResponse.json(dummyOptions.options);
      return res;
    }
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }
  const credCount = await db.webAuthnCredential.count({
    where: { userId: user.id },
  });
  if (credCount === 0) {
    return NextResponse.json(
      { error: "Aucune cle de sécurité enregistree pour ce compte." },
      { status: 404 },
    );
  }
  const { options, cookieValue } = await buildLoginOptions(user.id);
  const res = NextResponse.json(options);
  res.cookies.set(WEBAUTHN_LOGIN_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 5 * 60,
  });
  return res;
}
