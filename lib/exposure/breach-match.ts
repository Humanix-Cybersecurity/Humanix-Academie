// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Matching d'exposition SOUVERAIN contre l'observatoire des fuites (DataBreach).
//
// PÉRIMÈTRE HONNÊTE : l'observatoire est un CATALOGUE D'ÉVÉNEMENTS de fuites
// (organisation, titre, types de données), PAS un index d'emails fuités. On
// ne peut donc PAS dire "ton adresse exacte a fuité". On répond à la question
// réaliste : "l'organisation derrière ton domaine email apparaît-elle dans des
// fuites publiques connues ?" + on classe les emails personnels (gmail, etc.).
//
// PRIVACY : lecture seule, ÉPHÉMÈRE. Aucun write, aucun log de la cible.
// Utilise dbReadOnly (least privilege) quand dispo.

import { dbReadOnly } from "@/lib/db-readonly";

// Domaines de messagerie grand public : un email perso ne matchera jamais une
// fuite d'organisation FR. On les reconnaît pour adapter le message.
const PERSONAL_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "outlook.fr",
  "hotmail.com",
  "hotmail.fr",
  "live.fr",
  "live.com",
  "yahoo.com",
  "yahoo.fr",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "orange.fr",
  "wanadoo.fr",
  "free.fr",
  "sfr.fr",
  "laposte.net",
]);

// Types de données considérés "sensibles" (présence => gravité accrue).
const SENSITIVE_DATA_KEYWORDS = [
  "mdp",
  "mot de passe",
  "password",
  "cb",
  "carte",
  "bancaire",
  "iban",
  "identité",
  "identite",
  "passeport",
  "ssn",
  "nir",
  "sante",
  "santé",
];

export type DomainMatchResult = {
  domain: string;
  isPersonalDomain: boolean;
  breaches: {
    title: string;
    organization: string | null;
    incidentDate: Date;
    dataTypes: string | null;
    severity: string;
    sourceUrl: string;
  }[];
  sensitiveDataPresent: boolean;
};

/** Extrait le domaine (lowercase) d'une adresse email. null si invalide. */
export function extractDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1 || at === email.length - 1) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain.includes(".")) return null;
  return domain;
}

function hasSensitiveData(dataTypes: string | null): boolean {
  if (!dataTypes) return false;
  const lower = dataTypes.toLowerCase();
  return SENSITIVE_DATA_KEYWORDS.some((k) => lower.includes(k));
}

/**
 * Cherche les fuites publiques liées au domaine/organisation d'un email.
 * ÉPHÉMÈRE : ne persiste rien, ne logue pas l'email.
 *
 * Pour un domaine perso (gmail...) : renvoie isPersonalDomain=true sans
 * matching org (ce serait du bruit), et l'UI orientera vers le check password
 * qui est le vrai signal pour un particulier.
 */
export async function matchEmailDomain(
  email: string,
): Promise<DomainMatchResult | null> {
  const domain = extractDomain(email);
  if (!domain) return null;

  const isPersonal = PERSONAL_MAIL_DOMAINS.has(domain);
  if (isPersonal) {
    return {
      domain,
      isPersonalDomain: true,
      breaches: [],
      sensitiveDataPresent: false,
    };
  }

  // Le "label organisation" probable = la partie avant le 1er point du domaine
  // (ex: "acme" pour acme.fr). On matche large sur title + organization.
  const orgGuess = domain.split(".")[0];

  const rows = await dbReadOnly.dataBreach.findMany({
    where: {
      isPublished: true,
      OR: [
        { organization: { contains: orgGuess, mode: "insensitive" } },
        { title: { contains: orgGuess, mode: "insensitive" } },
        { organization: { contains: domain, mode: "insensitive" } },
        { title: { contains: domain, mode: "insensitive" } },
      ],
    },
    orderBy: { incidentDate: "desc" },
    take: 20,
    select: {
      title: true,
      organization: true,
      incidentDate: true,
      dataTypes: true,
      severity: true,
      sourceUrl: true,
    },
  });

  const sensitiveDataPresent = rows.some((r) => hasSensitiveData(r.dataTypes));

  return {
    domain,
    isPersonalDomain: false,
    breaches: rows,
    sensitiveDataPresent,
  };
}
