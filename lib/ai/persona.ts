// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Persona pedagogique : adapte le ton et le niveau de detail des
// explications IA selon le profil de l'utilisateur.
//
// 7 personas supportes, choisis pour couvrir les metiers types d'une PME :
//
//   - beginner  : vocabulaire simple, analogies du quotidien (la cle de
//     maison = le mot de passe, etc.). Pour les nouveaux employes ou les
//     utilisateurs non-tech.
//   - technical : vocabulaire technique, IOCs, references CVE/MITRE,
//     mention de protocoles. Pour les IT non-DSI.
//   - manager   : vue strategique, ROI, conformite, vocabulaire COMEX.
//   - developer : exemples code, OWASP, CI/CD, supply chain.
//   - finance   : fraude au president, virement, KYC, FATF, blanchiment.
//   - hr        : ingenierie sociale, donnees personnelles, RGPD employes.
//   - ops       : continuite, sauvegarde, ransomware impact metier.
//
// Le persona est :
//   1. Saisi explicitement par l'user dans /profil/infos (a venir, V2)
//   2. Sinon infere automatiquement depuis User.role + User.service +
//      historique de scores (heuristique simple)

import { db } from "@/lib/db";

export type Persona =
  | "beginner"
  | "technical"
  | "manager"
  | "developer"
  | "finance"
  | "hr"
  | "ops";

const VALID_PERSONAS = new Set<Persona>([
  "beginner",
  "technical",
  "manager",
  "developer",
  "finance",
  "hr",
  "ops",
]);

export function isPersona(v: unknown): v is Persona {
  return typeof v === "string" && VALID_PERSONAS.has(v as Persona);
}

/**
 * Infere un persona depuis le role + service + maturite. Heuristique
 * simple : on prefere underestimer (mettre beginner) plutot que de
 * jargonner avec quelqu'un qui ne connait pas.
 *
 * Override automatique si User.persona est defini (la BDD prime).
 */
export async function getUserPersona(userId: string): Promise<Persona> {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: {
      persona: true,
      role: true,
      service: true,
      progress: {
        select: { bestQuizScorePct: true, status: true },
      },
    },
  });
  if (!u) return "beginner";

  // 1. Persona explicite -> on respecte le choix de l'user
  if (u.persona && isPersona(u.persona)) return u.persona;

  // 2. Inference depuis role
  if (u.role === "ADMIN" || u.role === "RSSI" || u.role === "SUPERADMIN") {
    return "manager";
  }

  // 3. Inference depuis service (libre, donc on matche par mots-cles)
  const svc = (u.service ?? "").toLowerCase();
  if (
    svc.includes("dev") ||
    svc.includes("ingenieur") ||
    svc.includes("engineer") ||
    svc.includes("ops") ||
    svc.includes("devops") ||
    svc.includes("sre")
  ) {
    return svc.includes("ops") || svc.includes("sre")
      ? "ops"
      : "developer";
  }
  if (
    svc.includes("compta") ||
    svc.includes("finance") ||
    svc.includes("daf") ||
    svc.includes("treso") ||
    svc.includes("paie")
  ) {
    return "finance";
  }
  if (svc.includes("rh") || svc.includes("human") || svc.includes("recrut")) {
    return "hr";
  }
  if (
    svc.includes("it ") ||
    svc.startsWith("it") ||
    svc.includes("info") ||
    svc.includes("syst") ||
    svc.includes("tech")
  ) {
    return "technical";
  }
  if (
    svc.includes("direct") ||
    svc.includes("ceo") ||
    svc.includes("comex") ||
    svc.includes("president")
  ) {
    return "manager";
  }

  // 4. Heuristique maturite : si l'user a complete >=10 episodes avec
  // un score moyen >= 70, on peut monter en complexite (technical par
  // defaut s'il n'y a aucun signal de specialisation).
  const completed = u.progress.filter((p) => p.status === "COMPLETED");
  if (completed.length >= 10) {
    const avg =
      completed.reduce((s, p) => s + (p.bestQuizScorePct ?? 0), 0) /
      completed.length;
    if (avg >= 70) return "technical";
  }

  // 5. Fallback : beginner (jargonner avec un nouveau = on le perd).
  return "beginner";
}

/**
 * Brief court pour le LLM : decrit le persona en 1-2 phrases pour que
 * Mistral adapte son ton et son vocabulaire. Utilise dans le prompt
 * system des appels d'explication.
 */
export const PERSONA_BRIEFS: Record<Persona, string> = {
  beginner:
    "L'utilisateur est un debutant en cybersecurite. Utilise un vocabulaire SIMPLE, des analogies du quotidien (cle de maison = mot de passe, lettre = email...). Evite tout jargon technique. Phrases courtes.",
  technical:
    "L'utilisateur a une connaissance technique de base (IT, support, helpdesk). Tu peux mentionner des concepts comme TLS, DNS, IOC, mais reste accessible. Pas de CVE numerique sans contexte.",
  manager:
    "L'utilisateur est dirigeant ou manager. Adopte une vue strategique : impact metier, ROI, conformite, image de l'entreprise. Pas de detail technique inutile, mais des references aux normes (NIS2, RGPD, ISO 27001).",
  developer:
    "L'utilisateur est developpeur. Tu peux utiliser du jargon technique (OWASP, supply chain, SAST, CVE), donner des exemples code, parler de CI/CD, dependances NPM.",
  finance:
    "L'utilisateur travaille en finance/comptabilite. Concentre-toi sur les fraudes financieres : fraude au president, faux RIB, manipulation factures, KYC, blanchiment, FATF. Vocabulaire metier finance.",
  hr: "L'utilisateur travaille en RH. Concentre-toi sur l'ingenierie sociale, les donnees personnelles employes (RGPD), les arnaques au CV, les fuites internes. Vocabulaire metier RH.",
  ops: "L'utilisateur est ops/production. Concentre-toi sur la continuite, les sauvegardes, l'impact ransomware metier, le SI industriel. Vocabulaire metier ops/SI.",
};
