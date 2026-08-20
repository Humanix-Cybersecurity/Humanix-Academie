// SPDX-License-Identifier: AGPL-3.0-or-later
// GET /api/factures/[id] - telechargement du PDF d'une facture.
//
// CLOISONNEMENT : la facture est cherchee avec `tenantId` dans le WHERE, pas
// verifiee apres coup. Une facture d'un autre tenant est donc introuvable, et
// non « trouvee puis refusee » -- meme resultat pour l'attaquant, mais aucune
// fenetre entre la lecture et le controle.
//
// Le PDF est REGENERE a chaque appel depuis le snapshot fige en base. Rien
// n'est recalcule : deux telechargements a deux ans d'ecart donnent le meme
// document.

import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DocumentFacture, type FacturePdf } from "@/lib/facturation/pdf";
import { auditLog, AuditActions } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Non authentifié", { status: 401 });
  }
  const role = session.user.role;
  // Les factures sont des donnees financieres du tenant : ADMIN uniquement
  // (RSSI est explicitement exclu de la facturation, cf. schema.prisma).
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return new Response("Accès refusé", { status: 403 });
  }

  const { id } = await ctx.params;
  const tenantId = session.user.tenantId as string;

  const f = await db.facture.findFirst({
    where: { id, tenantId },
  });
  if (!f) {
    return new Response("Facture introuvable", { status: 404 });
  }

  const donnees: FacturePdf = {
    numero: f.numero,
    emiseLe: f.emiseLe,
    presteeLe: f.presteeLe,
    // Le snapshot est du Json cote Prisma : on le rend a sa forme d'origine.
    vendeur: f.vendeur as unknown as FacturePdf["vendeur"],
    acheteur: f.acheteur as unknown as FacturePdf["acheteur"],
    lignes: f.lignes as unknown as FacturePdf["lignes"],
    totalHtCentimes: f.totalHtCentimes,
    tvaCentimes: f.tvaCentimes,
    totalTtcCentimes: f.totalTtcCentimes,
    tauxTvaBp: f.tauxTvaBp,
    mentionTva: f.mentionTva,
  };

  const pdf = await renderToBuffer(<DocumentFacture f={donnees} />);

  await auditLog({
    action: AuditActions.DATA_EXPORTED,
    outcome: "SUCCESS",
    severity: "INFO",
    tenantId,
    actor: {
      userId: session.user.id,
      email: session.user.email ?? null,
      role,
    },
    target: { type: "facture", id: f.id, label: f.numero },
    message: `Telechargement de la facture ${f.numero}`,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${f.numero}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
