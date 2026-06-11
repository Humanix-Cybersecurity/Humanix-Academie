// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Calcul du SCORE D'EXPOSITION personnel (0-100, 100 = très exposé).
//
// Fonction PURE : aucune I/O, déterministe, testable sans réseau ni BDD.
// Distinct du `riskScore` interne (lib/risk-score.ts) qui mesure la maturité
// FORMATION d'un apprenant. Ici on mesure l'EXPOSITION externe constatée.
//
// Barème versionné (v1). Toute évolution => bump SCORE_VERSION + test.

export const SCORE_VERSION = "v1";

export type ExposureInput = {
  /** Mot de passe trouvé compromis (HIBP Pwned Passwords) */
  passwordPwned: boolean;
  /** Nb d'occurrences du mdp dans les fuites (amplifie le poids) */
  passwordCount: number;
  /** Nb de fuites publiques touchant l'organisation du domaine email */
  domainBreaches: number;
  /** True si des données sensibles (mdp, CB, pièce d'identité) figurent
   *  dans les types de données des fuites domaine */
  sensitiveDataInBreaches: boolean;
  /** Téléphone potentiellement concerné (best-effort) */
  phoneFlagged: boolean;
};

export type ExposureVerdict = "faible" | "modere" | "eleve" | "critique";

export type ExposureScore = {
  score: number; // 0-100
  verdict: ExposureVerdict;
  version: string;
  /** Décomposition lisible pour l'UI pédagogique */
  factors: { label: string; points: number }[];
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function computeExposureScore(input: ExposureInput): ExposureScore {
  const factors: { label: string; points: number }[] = [];
  let score = 0;

  // Mot de passe compromis = facteur le PLUS grave (réutilisation =
  // credential stuffing). Pondéré par l'ampleur de la fuite.
  if (input.passwordPwned) {
    const base = 45;
    const amplifier =
      input.passwordCount > 100000
        ? 15
        : input.passwordCount > 1000
          ? 8
          : 0;
    const pts = base + amplifier;
    score += pts;
    factors.push({ label: "Mot de passe trouvé dans une fuite", points: pts });
  }

  // Organisation du domaine email présente dans des fuites publiques.
  if (input.domainBreaches > 0) {
    const pts = clamp(input.domainBreaches * 8, 0, 30);
    score += pts;
    factors.push({
      label: `Organisation concernée par ${input.domainBreaches} fuite(s) publique(s)`,
      points: pts,
    });
  }

  // Présence de données sensibles dans les fuites domaine.
  if (input.sensitiveDataInBreaches) {
    score += 15;
    factors.push({
      label: "Données sensibles (mdp/CB/identité) dans ces fuites",
      points: 15,
    });
  }

  // Téléphone signalé.
  if (input.phoneFlagged) {
    score += 10;
    factors.push({ label: "Numéro de téléphone potentiellement exposé", points: 10 });
  }

  score = clamp(Math.round(score), 0, 100);

  const verdict: ExposureVerdict =
    score >= 75 ? "critique" : score >= 50 ? "eleve" : score >= 25 ? "modere" : "faible";

  return { score, verdict, version: SCORE_VERSION, factors };
}

/** Libellé + couleur pour l'UI (RGAA : la couleur ne porte jamais seule l'info,
 * toujours accompagnée du libellé textuel). */
export function verdictLabel(v: ExposureVerdict): { label: string; tone: string } {
  switch (v) {
    case "faible":
      return { label: "Exposition faible", tone: "emerald" };
    case "modere":
      return { label: "Exposition modérée", tone: "amber" };
    case "eleve":
      return { label: "Exposition élevée", tone: "orange" };
    case "critique":
      return { label: "Exposition critique", tone: "rose" };
  }
}
