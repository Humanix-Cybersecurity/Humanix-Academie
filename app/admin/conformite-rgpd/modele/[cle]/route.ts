// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Telechargement d'un modele du parcours de conformite.
//
// Le fichier est genere a la volee : rien n'est stocke, et le nom de
// l'entreprise vient de la session, jamais de l'URL. Un identifiant de tenant
// passe en parametre aurait permis de fabriquer un document au nom de
// n'importe qui.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { MODELES_PAR_ETAPE } from "@/lib/conformite-rgpd/modeles";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ cle: string }> },
) {
  const { cle } = await params;

  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  }
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "acces_refuse" }, { status: 403 });
  }

  const entree = MODELES_PAR_ETAPE[cle];
  if (!entree) {
    return NextResponse.json({ error: "modele_inconnu" }, { status: 404 });
  }

  const tenant = await db.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { name: true },
  });

  const modele = entree.fabrique(tenant?.name ?? "entreprise");

  return new NextResponse(modele.contenu, {
    headers: {
      "Content-Type": modele.typeMime,
      "Content-Disposition": `attachment; filename="${modele.nomFichier}"`,
      // Un modele est fabrique pour UNE entreprise : il ne doit jamais etre
      // servi depuis un cache partage.
      "Cache-Control": "private, no-store",
    },
  });
}
