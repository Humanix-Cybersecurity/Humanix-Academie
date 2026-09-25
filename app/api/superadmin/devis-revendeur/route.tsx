// SPDX-License-Identifier: AGPL-3.0-or-later
// GET /api/superadmin/devis-revendeur?prospect=&espaces=&utilisateurs=
// Devis revendeur en PDF. SUPERADMIN uniquement. Rien n'est stocke : le devis
// est recalculable a l'identique tant que la grille ne change pas.
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { DevisRevendeurPdf } from "@/lib/reseller/devis-pdf";
import {
  calculerDevis,
  dateValidite,
  lireParametresDevis,
  referenceDevis,
} from "@/lib/reseller/devis";
import { TVA_FR_STANDARD_BP } from "@/lib/facturation/montants";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const frDate = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);

export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const sp = new URL(req.url).searchParams;
  const p = lireParametresDevis({
    prospect: sp.get("prospect") ?? undefined,
    espaces: sp.get("espaces") ?? undefined,
    utilisateurs: sp.get("utilisateurs") ?? undefined,
  });
  if (!p) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }
  const maintenant = new Date();
  const reference = referenceDevis(p.prospect, maintenant);
  const buffer = await renderToBuffer(
    <DevisRevendeurPdf
      data={{
        reference,
        prospect: p.prospect,
        dateStr: frDate(maintenant),
        validiteStr: frDate(dateValidite(maintenant)),
        hypothese: {
          nbEspaces: p.nbEspaces,
          utilisateursParEspace: p.utilisateursParEspace,
        },
        calcul: calculerDevis(p),
        tauxTvaBp: TVA_FR_STANDARD_BP,
      }}
    />,
  );
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="humanix-devis-${reference}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
