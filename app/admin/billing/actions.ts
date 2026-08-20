"use server";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Server actions de la facturation cote tenant.
//
// Une seule action : enregistrer l'identite de facturation. Elle conditionne
// TOUTE emission -- sans denomination ni adresse de l'acheteur, une facture
// n'est pas conforme (article 242 nonies A de l'annexe II au CGI), et
// emettreFacture refuse.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";
import { validerCoordonnees } from "@/lib/facturation/coordonnees";
import { verifierTvaIntra } from "@/lib/facturation/vies";
import { facturerPaiement } from "@/lib/facturation/au-paiement";
import { paiementsAFacturer } from "@/lib/facturation/rattrapage";

const CHEMIN = "/admin/billing";

function propre(v: FormDataEntryValue | null, max = 200): string {
  return String(v ?? "")
    .trim()
    .slice(0, max);
}

export async function enregistrerIdentiteFacturation(donnees: FormData) {
  const session = await auth();
  const role = session?.user?.role;
  // La facturation est reservee a ADMIN : RSSI en est explicitement exclu
  // (cf. la description des roles dans prisma/schema.prisma).
  if (!session?.user || (role !== "ADMIN" && role !== "SUPERADMIN")) {
    redirect("/admin");
  }
  const tenantId = session.user.tenantId as string;

  // Validation partagee avec le checkout public : les deux chemins doivent
  // appliquer EXACTEMENT les memes regles, sinon une adresse acceptee d'un
  // cote serait refusee de l'autre.
  const v = validerCoordonnees({
    raisonSociale: donnees.get("raisonSociale"),
    adresse: donnees.get("adresse"),
    codePostal: donnees.get("codePostal"),
    ville: donnees.get("ville"),
    pays: donnees.get("pays"),
    siren: donnees.get("siren"),
    tvaIntra: donnees.get("tvaIntra"),
  });
  if (!v.ok) {
    redirect(`${CHEMIN}?error=${encodeURIComponent(v.erreur)}`);
  }
  const { raisonSociale, adresse, codePostal, ville, pays, siren, tvaIntra } =
    v.valeur;

  // Verification VIES a l'ENREGISTREMENT, pas a l'emission : une facture ne
  // doit pas dependre de la disponibilite d'un service tiers. Le resultat est
  // fige ici, et relu au moment de facturer.
  //
  // Trois etats, jamais deux : VIES repond `isValid: false` aussi bien pour un
  // numero inexistant que pour un service occupe (cf. lib/facturation/vies.ts).
  let tvaIntraStatut: string | null = null;
  let tvaIntraNom: string | null = null;
  let tvaIntraVerifieLe: Date | null = null;
  if (tvaIntra) {
    const r = await verifierTvaIntra(tvaIntra);
    tvaIntraStatut = r.statut;
    tvaIntraVerifieLe = new Date();
    if (r.statut === "valide") tvaIntraNom = r.nom;
  }

  const donneesIdentite = {
    raisonSociale,
    adresse,
    codePostal,
    ville,
    pays,
    siren,
    tvaIntra,
    tvaIntraStatut,
    tvaIntraNom,
    tvaIntraVerifieLe,
  };
  await db.identiteFacturation.upsert({
    where: { tenantId },
    create: { tenantId, ...donneesIdentite },
    update: donneesIdentite,
  });

  await auditLog({
    // TENANT_UPDATED plutot qu'une valeur d'enum dediee : ajouter une
    // valeur a AuditAction imposerait une migration d'enum, et la
    // preparation du bleu/vert applique le schema sur l'ANCIENNE version
    // encore en ligne. On evite ce risque pour une trace d'audit.
    action: AuditActions.TENANT_UPDATED,
    outcome: "SUCCESS",
    severity: "INFO",
    tenantId,
    actor: {
      userId: session.user.id,
      email: session.user.email ?? null,
      role,
    },
    target: { type: "identite_facturation", id: tenantId },
    message: "Identite de facturation enregistree",
  });

  revalidatePath(CHEMIN);

  // Le message dit ce que VIES a repondu. « Non verifie » n'est pas
  // « invalide », et l'admin doit pouvoir faire la difference : dans un cas il
  // a saisi un mauvais numero, dans l'autre il n'a qu'a reessayer.
  let message = "Coordonnées de facturation enregistrées.";
  if (tvaIntraStatut === "valide") {
    message += tvaIntraNom
      ? ` Numéro de TVA vérifié : ${tvaIntraNom}.`
      : " Numéro de TVA vérifié.";
  } else if (tvaIntraStatut === "invalide") {
    message +=
      " Attention : ce numéro de TVA est inconnu de VIES. La TVA française sera appliquée.";
  } else if (tvaIntraStatut === "inconnu") {
    message +=
      " Le service VIES n'a pas pu répondre : la TVA française s'applique en attendant. Réenregistrez plus tard.";
  }
  redirect(`${CHEMIN}?ok=1&msg=${encodeURIComponent(message)}`);
}

/**
 * Emet la facture d'un paiement deja encaisse.
 *
 * Volontairement UNITAIRE et declenchee a la main : un paiement peut avoir ete
 * rembourse depuis (cf. le double prelevement du 2026-08-17). Une emission en
 * masse produirait des factures pour de l'argent rendu, qu'il faudrait ensuite
 * annuler par des avoirs.
 */
export async function emettreFactureManquante(donnees: FormData) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "SUPERADMIN")) {
    redirect("/admin");
  }
  const tenantId = session.user.tenantId as string;
  const ref = propre(donnees.get("paiementRef"), 100);
  if (!ref)
    redirect(
      `${CHEMIN}?error=${encodeURIComponent("Référence de paiement manquante.")}`,
    );

  // On repart de la LISTE plutot que de la reference recue : un formulaire
  // trafique ne peut donc pas faire facturer le paiement d'un autre tenant,
  // ni un paiement deja facture.
  const candidats = await paiementsAFacturer(tenantId);
  const cible = candidats.find((p) => p.ref === ref);
  if (!cible) {
    redirect(
      `${CHEMIN}?error=${encodeURIComponent("Ce paiement est introuvable ou déjà facturé.")}`,
    );
  }

  const r = await facturerPaiement({
    tenantId,
    paiementRef: cible.ref,
    montantValeur: (cible.montantTtcCentimes / 100).toFixed(2),
    presteeLe: cible.encaisseLe,
  });

  if (r.etat === "emise") {
    await auditLog({
      action: AuditActions.TENANT_UPDATED,
      outcome: "SUCCESS",
      severity: "INFO",
      tenantId,
      actor: {
        userId: session.user.id,
        email: session.user.email ?? null,
        role,
      },
      target: { type: "facture", label: r.numero },
      message: `Facture ${r.numero} emise pour le paiement ${cible.ref}`,
    });
    revalidatePath(CHEMIN);
    redirect(
      `${CHEMIN}?ok=1&msg=${encodeURIComponent(`Facture ${r.numero} émise.`)}`,
    );
  }

  const explication =
    r.motif === "identite_facturation_absente"
      ? "Renseignez d'abord vos coordonnées de facturation."
      : r.motif;
  redirect(
    `${CHEMIN}?error=${encodeURIComponent(`Émission impossible : ${explication}`)}`,
  );
}
