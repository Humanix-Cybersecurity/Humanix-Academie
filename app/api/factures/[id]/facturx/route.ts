// SPDX-License-Identifier: AGPL-3.0-or-later
// GET /api/factures/[id]/facturx - XML Factur-X (profil EN 16931).
//
// Format structure exigible par une plateforme agreee. Le PDF reste le
// document lisible ; celui-ci est celui que les machines traitent.
//
// Meme cloisonnement que le PDF : `tenantId` est DANS le WHERE, pas verifie
// apres coup, et la facturation est reservee a ADMIN (RSSI en est exclu).

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  genererFacturX,
  type FactureAExporter,
} from "@/lib/facturation/factur-x";
import { auditLog, AuditActions } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Non authentifié", { status: 401 });
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return new Response("Accès refusé", { status: 403 });
  }

  const { id } = await ctx.params;
  const tenantId = session.user.tenantId as string;
  const f = await db.facture.findFirst({ where: { id, tenantId } });
  if (!f) return new Response("Facture introuvable", { status: 404 });

  // Tout vient du snapshot fige : le XML et le PDF decrivent forcement la
  // meme facture, y compris dans dix ans.
  const donnees: FactureAExporter = {
    numero: f.numero,
    emiseLe: f.emiseLe,
    presteeLe: f.presteeLe,
    vendeur: f.vendeur as unknown as FactureAExporter["vendeur"],
    acheteur: f.acheteur as unknown as FactureAExporter["acheteur"],
    lignes: f.lignes as unknown as FactureAExporter["lignes"],
    totalHtCentimes: f.totalHtCentimes,
    tvaCentimes: f.tvaCentimes,
    totalTtcCentimes: f.totalTtcCentimes,
    tauxTvaBp: f.tauxTvaBp,
    mentionTva: f.mentionTva,
    estAvoir: f.avoirDeId !== null,
  };

  await auditLog({
    action: AuditActions.DATA_EXPORTED,
    outcome: "SUCCESS",
    severity: "INFO",
    tenantId,
    actor: { userId: session.user.id, email: session.user.email ?? null, role },
    target: { type: "facture_facturx", id: f.id, label: f.numero },
    message: `Telechargement Factur-X de ${f.numero}`,
  });

  return new Response(genererFacturX(donnees), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "content-disposition": `attachment; filename="${f.numero}-facturx.xml"`,
      "cache-control": "private, no-store",
    },
  });
}
