// SPDX-License-Identifier: AGPL-3.0-or-later
// POST /api/webauthn/register/options
// Genere les options FIDO2 pour enroller une nouvelle cle de sécurité.
// Auth requise. Le challenge est passe en cookie HMAC-signe pour le verify.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  buildRegisterOptions,
  WEBAUTHN_REGISTER_COOKIE,
} from "@/lib/webauthn";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }
  const userId = session.user.id;
  const email = session.user.email;
  if (!userId || !email) {
    return NextResponse.json({ error: "Session invalide." }, { status: 400 });
  }
  const { options, cookieValue } = await buildRegisterOptions(userId, email);

  const res = NextResponse.json(options);
  res.cookies.set(WEBAUTHN_REGISTER_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 5 * 60,
  });
  return res;
}
