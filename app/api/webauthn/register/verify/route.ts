// SPDX-License-Identifier: AGPL-3.0-or-later
// POST /api/webauthn/register/verify
// Recoit la reponse du navigateur après interaction avec la cle FIDO2,
// verifie + persiste le credential.
import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  verifyChallenge,
  verifyAndSaveRegistration,
  buildRequestOrigin,
  WEBAUTHN_REGISTER_COOKIE,
} from "@/lib/webauthn";
import { auditLog, AuditActions, AuditOutcomes } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }
  const userId = session.user.id;
  if (!userId) {
    return NextResponse.json({ error: "Session invalide." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const response = body?.response;
  const deviceName = String(body?.deviceName ?? "Cle de sécurité").slice(0, 100);
  if (!response) {
    return NextResponse.json({ error: "Reponse manquante." }, { status: 400 });
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(WEBAUTHN_REGISTER_COOKIE)?.value;
  if (!cookieValue) {
    return NextResponse.json(
      { error: "Challenge expire ou absent. Recommencez." },
      { status: 400 },
    );
  }
  const env = verifyChallenge(cookieValue);
  if (!env || env.userId !== userId) {
    return NextResponse.json({ error: "Challenge invalide." }, { status: 400 });
  }

  // Origin attendu de l'enregistrement : on lit l'host courant et on valide
  // qu'il est sous le rpID (support enrollment depuis un sous-domaine).
  const h = await headers();
  const originCheck = buildRequestOrigin(h);
  if (!originCheck.ok) {
    return NextResponse.json(
      { error: "Origin invalide." },
      { status: 400 },
    );
  }

  const result = await verifyAndSaveRegistration({
    userId,
    expectedChallenge: env.challenge,
    response,
    deviceName,
    expectedOrigin: originCheck.origin,
  });

  if (result.ok) {
    await auditLog({
      action: AuditActions.USER_WEBAUTHN_REGISTERED,
      actor: {
        userId,
        email: session.user.email as string | undefined,
        role: session.user.role,
      },
      tenantId: (session.user.tenantId as string) ?? null,
      target: { type: "webauthn_credential", id: result.credentialId, label: deviceName },
    });
  } else {
    await auditLog({
      action: AuditActions.USER_WEBAUTHN_REGISTERED,
      outcome: AuditOutcomes.FAILURE,
      actor: {
        userId,
        email: session.user.email as string | undefined,
        role: session.user.role,
      },
      tenantId: (session.user.tenantId as string) ?? null,
      message: result.error ?? "verify_failed",
    });
  }

  const res = NextResponse.json(result);
  // On efface le cookie une fois consomme
  res.cookies.set(WEBAUTHN_REGISTER_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
