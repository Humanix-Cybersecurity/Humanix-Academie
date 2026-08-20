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
import { formeTvaIntraPlausible } from "@/lib/facturation/regime-tva";

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

  const raisonSociale = propre(donnees.get("raisonSociale"));
  const adresse = propre(donnees.get("adresse"));
  const codePostal = propre(donnees.get("codePostal"), 20);
  const ville = propre(donnees.get("ville"), 100);
  const pays = propre(donnees.get("pays"), 2).toUpperCase() || "FR";
  const siren = propre(donnees.get("siren"), 20) || null;
  const tvaIntra = propre(donnees.get("tvaIntra"), 20) || null;

  const manquants: string[] = [];
  if (!raisonSociale) manquants.push("la dénomination sociale");
  if (!adresse) manquants.push("l'adresse");
  if (!codePostal) manquants.push("le code postal");
  if (!ville) manquants.push("la ville");
  if (manquants.length > 0) {
    redirect(
      `${CHEMIN}?error=${encodeURIComponent(`Il manque ${manquants.join(", ")}.`)}`,
    );
  }
  if (!/^[A-Z]{2}$/.test(pays)) {
    redirect(
      `${CHEMIN}?error=${encodeURIComponent("Le pays doit être un code à deux lettres (FR, BE, DE...).")}`,
    );
  }
  // On refuse un numero de TVA mal forme PLUTOT que de l'ignorer : ignore, il
  // ferait croire a une autoliquidation qui ne s'appliquerait pas.
  if (tvaIntra && !formeTvaIntraPlausible(tvaIntra)) {
    redirect(
      `${CHEMIN}?error=${encodeURIComponent("Le numéro de TVA intracommunautaire est mal formé (ex. FR80103901799).")}`,
    );
  }

  const donneesIdentite = {
    raisonSociale,
    adresse,
    codePostal,
    ville,
    pays,
    siren,
    tvaIntra,
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
  redirect(
    `${CHEMIN}?ok=1&msg=${encodeURIComponent("Coordonnées de facturation enregistrées.")}`,
  );
}
