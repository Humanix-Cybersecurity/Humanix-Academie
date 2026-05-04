// Endpoint debug : retourne le HTML brut récupéré pour chaque source
// (premier extrait de 2000 caractères). Permet de calibrer précisément
// les parsers en cas de structure inattendue.
//
// Usage : connecté en SUPERADMIN, GET /api/admin/breaches/debug
// Le résultat JSON peut être collé dans une issue / message support pour
// calibrer les regex parsers.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { debugFetchAll } from "@/lib/breaches/parsers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const role = session.user!.role;
  if (role !== "SUPERADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const results = await debugFetchAll();
  return NextResponse.json({
    note: "Inspection HTML brute des 3 sources. Premier extrait 2000 chars.",
    timestamp: new Date().toISOString(),
    results,
  });
}
