// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Lecture de l'etat du parcours de conformite.
//
// Les deux portees vivent dans deux tables (cf. docs/PARCOURS-DPO.md) mais la
// personne ne voit QU'UN parcours : on les fusionne ici, une bonne fois, plutot
// que dans chaque composant d'affichage.
import { db } from "@/lib/db";
import { CATALOGUE, type StatutEtape } from "@/lib/dpo/catalogue";

export type EtatEtape = {
  statut: StatutEtape;
  note?: string | null;
  majPar?: string | null;
  majLe?: Date | null;
};

/**
 * Etat de chaque etape, fusionne, pour une personne dans son organisation.
 *
 * Les cles inconnues du catalogue sont IGNOREES : le catalogue evolue avec la
 * loi, les lignes persistees survivent. Une etape retiree ne doit pas faire
 * planter l'affichage de celles qui restent.
 */
export async function chargerEtatParcours(
  userId: string,
  tenantId: string,
): Promise<Record<string, EtatEtape>> {
  const [apprentissage, entreprise] = await Promise.all([
    db.etapeApprentissageDpo.findMany({ where: { userId } }),
    db.etapeConformiteTenant.findMany({ where: { tenantId } }),
  ]);

  const clesConnues = new Set(CATALOGUE.map((e) => e.cle));
  const etat: Record<string, EtatEtape> = {};

  for (const l of apprentissage) {
    if (!clesConnues.has(l.cle)) continue;
    etat[l.cle] = { statut: l.statut as StatutEtape, majLe: l.majLe };
  }
  for (const l of entreprise) {
    if (!clesConnues.has(l.cle)) continue;
    etat[l.cle] = {
      statut: l.statut as StatutEtape,
      note: l.note,
      majPar: l.majPar,
      majLe: l.majLe,
    };
  }
  return etat;
}

/** Les statuts seuls, pour `avancement()` et `prochaineEtape()`. */
export function statutsSeuls(
  etat: Record<string, EtatEtape>,
): Record<string, StatutEtape> {
  return Object.fromEntries(
    Object.entries(etat).map(([cle, e]) => [cle, e.statut]),
  );
}
