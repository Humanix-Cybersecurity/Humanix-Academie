// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Export CSV de l'inventaire des comptes a privileges.
// Reserve SUPERADMIN authentifie + step-up WebAuthn (heritage du layout
// /superadmin). L'auth est verifiee independamment ici car les Route Handlers
// ne passent PAS par le layout React.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { verifyFreshAuth, WEBAUTHN_FRESH_COOKIE } from "@/lib/webauthn";
import { listPrivilegedAccounts, toCsv } from "@/lib/anssi/admins-inventory";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPERADMIN") {
    return new NextResponse("forbidden", { status: 403 });
  }
  const cookieStore = await cookies();
  const fresh = cookieStore.get(WEBAUTHN_FRESH_COOKIE)?.value;
  const isFresh = fresh
    ? verifyFreshAuth(fresh, session.user.id as string)
    : false;
  if (!isFresh) {
    return new NextResponse("step-up required", { status: 401 });
  }

  const accounts = await listPrivilegedAccounts();
  const csv = toCsv(accounts);

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `humanix-comptes-privilegies-${dateStr}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
