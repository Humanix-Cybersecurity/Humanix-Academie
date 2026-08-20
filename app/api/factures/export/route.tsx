// SPDX-License-Identifier: AGPL-3.0-or-later
// GET /api/factures/export - archive des factures d'une periode.
//
// A QUOI CA SERT, CONCRETEMENT
//
//   Dougs, notre plateforme agreee, n'expose NI API ouverte, NI adresse de
//   collecte, NI import en lot -- reponse ecrite de leur support le
//   2026-08-20. Leur procedure est : exporter le PDF, puis l'attacher a
//   l'operation bancaire correspondante dans le module Comptabilite.
//
//   D'ou cet export : les PDF a attacher, les XML Factur-X pour la suite, et
//   surtout un recapitulatif qui porte la REFERENCE DE PAIEMENT MOLLIE.
//
// LE PIEGE DU RAPPROCHEMENT, ET IL ARRIVE VITE
//
//   « Une operation bancaire = une facture » ne tient que tant qu'il y a un
//   seul client. Mollie regroupe plusieurs paiements dans un SEUL virement,
//   net de commissions : deux ventes a 48,00 EUR arrivent en une ligne a
//   ~91,80 EUR. La reference de paiement du recapitulatif est ce qui permet
//   de recroiser avec le rapport de versement Mollie.
//
// L'archive sert aussi la conservation : dix ans (article L123-22 du code de
// commerce), et il ne faut pas que ca depende de la survie de la plateforme.

import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildCsv } from "@/lib/csv";
import { construireZip, nomSur, type FichierZip } from "@/lib/zip";
import { DocumentFacture, type FacturePdf } from "@/lib/facturation/pdf";
import {
  genererFacturX,
  type FactureAExporter,
} from "@/lib/facturation/factur-x";
import { auditLog, AuditActions } from "@/lib/audit";
import { instantParis } from "@/lib/periode";

export const dynamic = "force-dynamic";

/** Garde-fou : au-dela, l'export prendrait trop de temps a rendre. */
const MAX_FACTURES = 500;

/** Montant en euros pour tableur : « 40,00 ». Virgule decimale, rien d'autre. */
function euros(centimes: number): string {
  const signe = centimes < 0 ? "-" : "";
  const abs = Math.abs(centimes);
  return `${signe}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}

function jour(d: Date): string {
  return new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Paris",
  }).format(d);
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Non authentifié", { status: 401 });
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return new Response("Accès refusé", { status: 403 });
  }
  const tenantId = session.user.tenantId as string;

  const url = new URL(req.url);
  const debutBrut = url.searchParams.get("debut");
  const finBrut = url.searchParams.get("fin");

  // Bornes en HEURE DE PARIS, pas en UTC : « du 1er au 31 aout » en UTC
  // avalerait deux heures de septembre et amputerait les deux premieres
  // heures du 1er aout. Sur un export de TVA, ca deplace des factures d'une
  // periode a l'autre.
  const debut = debutBrut ? instantParis(debutBrut) : null;
  const fin = finBrut ? instantParis(finBrut, true) : null;

  // Une date illisible est REFUSEE, pas ignoree : sans ca, une saisie au
  // format « 01/08/2026 » renverrait tout l'historique en laissant croire
  // qu'on a filtre.
  if ((debutBrut && !debut) || (finBrut && !fin)) {
    return new Response(
      "Dates attendues au format AAAA-MM-JJ (ex. ?debut=2026-08-01&fin=2026-08-31).",
      { status: 400 },
    );
  }
  if (debut && fin && debut > fin) {
    return new Response("La date de début est postérieure à la date de fin.", {
      status: 400,
    });
  }

  const factures = await db.facture.findMany({
    where: {
      tenantId,
      ...(debut || fin
        ? {
            emiseLe: {
              ...(debut ? { gte: debut } : {}),
              ...(fin ? { lte: fin } : {}),
            },
          }
        : {}),
    },
    orderBy: { numero: "asc" },
    take: MAX_FACTURES + 1,
  });

  if (factures.length === 0) {
    return new Response("Aucune facture sur cette période.", { status: 404 });
  }
  // On refuse plutot que de tronquer : une archive comptable silencieusement
  // incomplete est pire qu'une erreur.
  if (factures.length > MAX_FACTURES) {
    return new Response(
      `Plus de ${MAX_FACTURES} factures sur cette période. Réduisez l'intervalle avec ?debut=AAAA-MM-JJ&fin=AAAA-MM-JJ.`,
      { status: 413 },
    );
  }

  const fichiers: FichierZip[] = [];
  const lignes: (string | number)[][] = [];

  for (const f of factures) {
    const acheteur = f.acheteur as unknown as FacturePdf["acheteur"];
    const commun = {
      numero: f.numero,
      emiseLe: f.emiseLe,
      presteeLe: f.presteeLe,
      vendeur: f.vendeur as unknown as FacturePdf["vendeur"],
      acheteur,
      lignes: f.lignes as unknown as FacturePdf["lignes"],
      totalHtCentimes: f.totalHtCentimes,
      tvaCentimes: f.tvaCentimes,
      totalTtcCentimes: f.totalTtcCentimes,
      tauxTvaBp: f.tauxTvaBp,
      mentionTva: f.mentionTva,
    };

    const pdf = await renderToBuffer(<DocumentFacture f={commun} />);
    fichiers.push({
      nom: nomSur(`factures/${f.numero}.pdf`),
      contenu: new Uint8Array(pdf),
    });
    fichiers.push({
      nom: nomSur(`facturx/${f.numero}.xml`),
      contenu: new TextEncoder().encode(
        genererFacturX({
          ...commun,
          estAvoir: f.avoirDeId !== null,
        } as FactureAExporter),
      ),
    });

    lignes.push([
      f.numero,
      jour(f.emiseLe),
      jour(f.presteeLe),
      acheteur.raisonSociale,
      acheteur.siren ?? "",
      acheteur.tvaIntra ?? "",
      // Montants SANS symbole ni espace insecable : le « € » et le U+00A0
      // de formaterEuros sont faits pour l'affichage, pas pour un tableur.
      // La devise est dans l'en-tete.
      euros(f.totalHtCentimes),
      euros(f.tvaCentimes),
      euros(f.totalTtcCentimes),
      (f.tauxTvaBp / 100).toFixed(2).replace(".", ","),
      f.mentionTva,
      // La cle du rapprochement bancaire : c'est elle qu'on retrouve dans le
      // rapport de versement Mollie.
      f.paiementRef ?? "",
    ]);
  }

  fichiers.push({
    nom: "recapitulatif.csv",
    contenu: new TextEncoder().encode(
      buildCsv(
        [
          "Numero",
          "Date d'emission",
          "Date de prestation",
          "Client",
          "SIREN",
          "TVA intracom",
          "Total HT (EUR)",
          "TVA (EUR)",
          "Total TTC (EUR)",
          "Taux TVA (%)",
          "Mention TVA",
          "Reference de paiement",
        ],
        lignes,
        // Point-virgule : cet export s'ouvre dans Excel en francais, et les
        // montants portent une virgule decimale.
        ";",
      ),
    ),
  });

  const zip = construireZip(fichiers);
  // On reprend les valeurs SAISIES : afficher la borne convertie donnait
  // « 2026-09-01 » pour une demande au 31 aout, ce qui laissait croire a une
  // erreur de perimetre.
  const suffixe =
    debutBrut || finBrut ? `_${debutBrut ?? "debut"}_${finBrut ?? "fin"}` : "";

  await auditLog({
    action: AuditActions.DATA_EXPORTED,
    outcome: "SUCCESS",
    severity: "INFO",
    tenantId,
    actor: { userId: session.user.id, email: session.user.email ?? null, role },
    target: { type: "factures_export", label: `${factures.length} facture(s)` },
    message: `Export de ${factures.length} facture(s)`,
  });

  return new Response(new Uint8Array(zip), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="factures-humanix${suffixe}.zip"`,
      "cache-control": "private, no-store",
    },
  });
}
