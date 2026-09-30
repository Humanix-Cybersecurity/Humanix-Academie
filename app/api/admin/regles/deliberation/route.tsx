// SPDX-License-Identifier: AGPL-3.0-or-later
// GET /api/admin/regles/deliberation : l'acte d'adoption des regles, en PDF,
// au nom de l'organisation du tenant. Rien n'est stocke.
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { lireEtatRegles } from "@/lib/regles-organisation/etat";
import { texteActe } from "@/lib/regles-organisation/deliberation";
import { DeliberationPdf } from "@/lib/regles-organisation/pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const session = await auth();
  const role = session?.user?.role;
  if (
    !session?.user ||
    (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN")
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const etat = await lireEtatRegles(session.user.tenantId as string);
  const texte = texteActe({ ...etat, genereLe: new Date() });
  const buffer = await renderToBuffer(<DeliberationPdf texte={texte} />);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${texte.nomFichier}"`,
      "Cache-Control": "no-store",
    },
  });
}
