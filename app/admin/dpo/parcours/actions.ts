"use server";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Actions du parcours de mise en conformite RGPD.
//
// DEUX PORTEES, DEUX TABLES. Voir docs/PARCOURS-DPO.md :
//
//   personne   -> EtapeApprentissageDpo, liee a userId. Part avec elle.
//   entreprise -> EtapeConformiteTenant, liee a tenantId. Reste pour son
//                 successeur.
//
// La portee n'est PAS choisie par l'appelant : elle est lue dans le catalogue.
// Sinon une requete forgee pourrait ecrire une etape personnelle au niveau du
// tenant, ou l'inverse -- et donc faire fuiter la progression d'une personne
// vers toute l'organisation.
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";
import { etapeParCle, STATUTS, type StatutEtape } from "@/lib/dpo/catalogue";

export type ResultatAction = { ok: true } | { ok: false; erreur: string };

export async function definirStatutEtape(
  cle: string,
  statut: string,
  note?: string,
): Promise<ResultatAction> {
  const session = await auth();
  if (!session?.user?.id || !session.user.tenantId) {
    return { ok: false, erreur: "non_authentifie" };
  }

  const etape = etapeParCle(cle);
  if (!etape) return { ok: false, erreur: "etape_inconnue" };

  if (!STATUTS.includes(statut as StatutEtape)) {
    return { ok: false, erreur: "statut_invalide" };
  }
  // Une entreprise sans videosurveillance doit pouvoir ecarter la question.
  // Mais on ne declare pas « sans objet » le fait de comprendre le RGPD.
  if (statut === "sans_objet" && !etape.peutEtreSansObjet) {
    return { ok: false, erreur: "sans_objet_non_autorise" };
  }

  if (etape.portee === "personne") {
    await db.etapeApprentissageDpo.upsert({
      where: { userId_cle: { userId: session.user.id, cle } },
      create: { userId: session.user.id, cle, statut },
      update: { statut },
    });
  } else {
    const tenantId = session.user.tenantId;
    await db.etapeConformiteTenant.upsert({
      where: { tenantId_cle: { tenantId, cle } },
      create: {
        tenantId,
        cle,
        statut,
        note: note?.slice(0, 2000) ?? null,
        majPar: session.user.email ?? null,
      },
      update: {
        statut,
        // `undefined` laisse la note en place : changer un statut ne doit pas
        // effacer ce que la personne precedente avait ecrit.
        note: note === undefined ? undefined : note.slice(0, 2000) || null,
        majPar: session.user.email ?? null,
      },
    });

    // Seules les etapes d'entreprise sont tracees : elles engagent
    // l'organisation. L'apprentissage de quelqu'un ne regarde que lui.
    await auditLog({
      action: AuditActions.COMPLIANCE_STEP_UPDATED,
      tenantId,
      actor: {
        userId: session.user.id,
        email: session.user.email ?? undefined,
        role: session.user.role,
      },
      target: { type: "etape_conformite", id: cle, label: etape.question },
      message: `Parcours conformite : ${cle} -> ${statut}`,
    });
  }

  revalidatePath("/admin/dpo/parcours");
  return { ok: true };
}
