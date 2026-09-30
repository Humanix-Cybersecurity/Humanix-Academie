// SPDX-License-Identifier: AGPL-3.0-or-later
// Etat des regles d'un tenant : lecture, enregistrement, attestations.
// Tout ce qui touche la base pour cette fonctionnalite passe ici.
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";
import type { ReglesInput } from "./formulaire";
import {
  estTypeOrganisation,
  VERSION_REGLES,
  type TypeOrganisation,
} from "./regles";

export type EtatRegles = {
  id: string | null;
  typeOrganisation: TypeOrganisation;
  nomOrganisation: string;
  nomSignataire: string | null;
  fonctionSignataire: string | null;
  referenceActe: string | null;
  dateSeance: Date | null;
  adopteeLe: Date | null;
  versionRegles: number;
  /** Les regles adoptees sont-elles celles du code ? Faux apres un changement de version. */
  aJour: boolean;
};

type Acteur = { userId: string; email?: string | null; role: string };

function typeSur(v: string): TypeOrganisation {
  return estTypeOrganisation(v) ? v : "commune";
}

/** L'etat du tenant, avec des valeurs par defaut tant que rien n'est enregistre. */
export async function lireEtatRegles(tenantId: string): Promise<EtatRegles> {
  const [regles, tenant] = await Promise.all([
    db.reglesOrganisation.findUnique({ where: { tenantId } }),
    db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
  ]);
  if (!regles) {
    return {
      id: null,
      typeOrganisation: "commune",
      nomOrganisation: tenant?.name ?? "",
      nomSignataire: null,
      fonctionSignataire: null,
      referenceActe: null,
      dateSeance: null,
      adopteeLe: null,
      versionRegles: VERSION_REGLES,
      aJour: true,
    };
  }
  return {
    id: regles.id,
    typeOrganisation: typeSur(regles.typeOrganisation),
    nomOrganisation: regles.nomOrganisation,
    nomSignataire: regles.nomSignataire,
    fonctionSignataire: regles.fonctionSignataire,
    referenceActe: regles.referenceActe,
    dateSeance: regles.dateSeance,
    adopteeLe: regles.adopteeLe,
    versionRegles: regles.versionRegles,
    aJour: regles.versionRegles === VERSION_REGLES,
  };
}

/**
 * Enregistre le formulaire. L'adoption est une date : posee la premiere fois
 * que la case est cochee, effacee si elle est decochee, conservee sinon.
 * Une adoption porte toujours la version courante des regles.
 */
export async function enregistrerRegles(
  tenantId: string,
  input: ReglesInput,
  acteur: Acteur,
): Promise<EtatRegles> {
  const existant = await db.reglesOrganisation.findUnique({
    where: { tenantId },
  });
  const adopteeLe = input.adoptee ? (existant?.adopteeLe ?? new Date()) : null;
  const donnees = {
    typeOrganisation: input.typeOrganisation,
    nomOrganisation: input.nomOrganisation,
    nomSignataire: input.nomSignataire,
    fonctionSignataire: input.fonctionSignataire,
    referenceActe: input.referenceActe,
    dateSeance: input.dateSeance,
    adopteeLe,
    versionRegles: VERSION_REGLES,
  };
  await db.reglesOrganisation.upsert({
    where: { tenantId },
    create: { tenantId, ...donnees },
    update: donnees,
  });
  const nouvelleAdoption = input.adoptee && !existant?.adopteeLe;
  await auditLog({
    action: AuditActions.TENANT_UPDATED,
    actor: {
      userId: acteur.userId,
      email: acteur.email ?? undefined,
      role: acteur.role,
    },
    tenantId,
    target: { type: "tenant", id: tenantId, label: input.nomOrganisation },
    message: nouvelleAdoption
      ? `Règles de sécurité numérique adoptées (version ${VERSION_REGLES})`
      : input.adoptee
        ? `Règles de sécurité numérique mises à jour (adoptées, version ${VERSION_REGLES})`
        : `Règles de sécurité numérique enregistrées, non adoptées (version ${VERSION_REGLES})`,
  });
  return lireEtatRegles(tenantId);
}

export type LigneLecture = {
  userId: string;
  nom: string;
  email: string;
  service: string | null;
  lueLe: Date | null;
};

/** Qui a atteste la version courante, parmi les comptes actifs du tenant. */
export async function tableauLectures(
  tenantId: string,
): Promise<LigneLecture[]> {
  const [users, lectures] = await Promise.all([
    db.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, email: true, service: true },
      orderBy: [{ service: "asc" }, { name: "asc" }],
    }),
    db.lectureRegles.findMany({
      where: { tenantId, versionRegles: VERSION_REGLES },
      select: { userId: true, lueLe: true },
    }),
  ]);
  const parUser = new Map(lectures.map((l) => [l.userId, l.lueLe]));
  return users.map((u) => ({
    userId: u.id,
    nom: u.name ?? u.email,
    email: u.email,
    service: u.service,
    lueLe: parUser.get(u.id) ?? null,
  }));
}

export type EtatApprenant = {
  adoptee: boolean;
  adopteeLe: Date | null;
  typeOrganisation: TypeOrganisation;
  nomOrganisation: string;
  lueLe: Date | null;
};

/** Ce que voit une personne : regles adoptees ou non, et sa propre attestation. */
export async function etatPourApprenant(
  tenantId: string,
  userId: string,
): Promise<EtatApprenant> {
  const regles = await db.reglesOrganisation.findUnique({
    where: { tenantId },
  });
  if (!regles) {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    return {
      adoptee: false,
      adopteeLe: null,
      typeOrganisation: "commune",
      nomOrganisation: tenant?.name ?? "",
      lueLe: null,
    };
  }
  const lecture = await db.lectureRegles.findUnique({
    where: { userId_versionRegles: { userId, versionRegles: VERSION_REGLES } },
    select: { lueLe: true },
  });
  return {
    adoptee:
      regles.adopteeLe != null && regles.versionRegles === VERSION_REGLES,
    adopteeLe: regles.adopteeLe,
    typeOrganisation: typeSur(regles.typeOrganisation),
    nomOrganisation: regles.nomOrganisation,
    lueLe: lecture?.lueLe ?? null,
  };
}

export type ResultatAttestation = "attestee" | "deja_attestee" | "non_adoptees";

/** Attestation de lecture : une par personne et par version, idempotente. */
export async function attesterLecture(
  tenantId: string,
  acteur: Acteur,
): Promise<ResultatAttestation> {
  const regles = await db.reglesOrganisation.findUnique({
    where: { tenantId },
  });
  if (
    !regles ||
    regles.adopteeLe == null ||
    regles.versionRegles !== VERSION_REGLES
  ) {
    return "non_adoptees";
  }
  const existante = await db.lectureRegles.findUnique({
    where: {
      userId_versionRegles: {
        userId: acteur.userId,
        versionRegles: VERSION_REGLES,
      },
    },
  });
  if (existante) return "deja_attestee";
  await db.lectureRegles.create({
    data: {
      tenantId,
      userId: acteur.userId,
      reglesId: regles.id,
      versionRegles: VERSION_REGLES,
    },
  });
  await auditLog({
    action: AuditActions.CONSENT_GIVEN,
    actor: {
      userId: acteur.userId,
      email: acteur.email ?? undefined,
      role: acteur.role,
    },
    tenantId,
    message: `Attestation de lecture des règles de sécurité numérique (version ${VERSION_REGLES})`,
  });
  return "attestee";
}
