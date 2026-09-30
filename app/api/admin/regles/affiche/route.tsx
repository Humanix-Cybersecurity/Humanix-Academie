// SPDX-License-Identifier: AGPL-3.0-or-later
// GET /api/admin/regles/affiche : l'affiche des regles (A4) au nom de
// l'organisation, a imprimer pour le secretariat et l'accueil.
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { lireEtatRegles } from "@/lib/regles-organisation/etat";
import { dateLongue } from "@/lib/regles-organisation/deliberation";
import { AffichePdf } from "@/lib/regles-organisation/pdf";
import { reglesPour, VOCABULAIRE } from "@/lib/regles-organisation/regles";

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
  const v = VOCABULAIRE[etat.typeOrganisation];
  const buffer = await renderToBuffer(
    <AffichePdf
      nomOrganisation={etat.nomOrganisation}
      typeOrganisation={etat.typeOrganisation}
      regles={reglesPour(etat.typeOrganisation)}
      adopteeStr={
        etat.adopteeLe
          ? `Adoptées par ${v.organe} le ${dateLongue(etat.adopteeLe)}.`
          : null
      }
    />,
  );
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="affiche-regles-securite-numerique.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
