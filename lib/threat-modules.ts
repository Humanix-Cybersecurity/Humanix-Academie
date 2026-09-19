// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Cartographie menace -> saisons Humanix. Source unique, partagee par :
//   - GET /api/v1/recommend-modules  (un RSSI ou un agent MCP pose une question)
//   - POST /api/integrations/edr-trigger  (un outil de detection signale une
//     menace REELLE et on doit choisir la formation a pousser dans l'heure)
//
// Le mapping est heuristique et open source : la table peut etre auditee et
// etendue. Chaque cle est un mot-cle en minuscules ; la liste est rangee par
// pertinence decroissante, ce que le scoring exploite (10 - index).
//
// POURQUOI `remediation-flash` EST DANS LA LISTE `phishing`
//
//   Cette saison (trois episodes courts) a ete ecrite precisement pour le
//   « juste apres » : quelqu'un vient de recevoir un vrai mail piege, il faut
//   une lecon de six minutes, pas une saison de six episodes. Elle est en fin
//   de liste pour ne pas bousculer les recommandations de l'API v1, et la
//   boucle fermee la PROMEUT en tete via LIVE_THREAT_PREFERRED_SLUGS.

export const THREAT_TO_MODULES: Record<string, string[]> = {
  phishing: [
    "phishing",
    "email-pro",
    "fraude-president",
    "deepfakes",
    "remediation-flash",
  ],
  spear_phishing: ["fraude-president", "phishing", "deepfakes"],
  whaling: ["fraude-president", "cyber-dirigeants"],
  vishing: ["fraude-president", "phishing"],
  smishing: ["mobile-smartphone", "phishing"],
  quishing: ["quishing", "phishing"],
  ransomware: ["ransomware", "sauvegardes", "remediation-flash"],
  malware: ["ransomware", "stockage-cloud"],
  data_breach: ["donnees-sensibles", "vie-privee-bureau", "stockage-cloud"],
  password: ["mots-de-passe"],
  credential_stuffing: ["mots-de-passe"],
  social_engineering: ["fraude-president", "phishing", "deepfakes"],
  insider_threat: ["depart-collaborateur", "donnees-sensibles"],
  cloud: ["stockage-cloud", "wifi-reseaux"],
  remote_work: ["teletravail", "wifi-reseaux", "mobile-smartphone"],
  byod: ["mobile-smartphone", "teletravail"],
  shadow_it: ["stockage-cloud", "ia-generative"],
  rgpd: ["donnees-sensibles", "dpo-quotidien", "vie-privee-bureau"],
  nis2: ["nis2-pme", "crise-cyber", "supply-chain"],
  supply_chain: ["supply-chain"],
  ai_misuse: ["ia-generative"],
  visio: ["visios-meetings"],
  meeting: ["visios-meetings"],
  social_media: ["reseaux-sociaux-pro"],
  physical_access: ["acces-physiques"],
  incident_response: ["crise-cyber", "remediation-flash"],
  hr: ["cyber-rh"],
  accounting: ["cyber-compta", "fraude-president"],
  dev: ["cyber-dev"],
  crypto: ["crypto-actifs"],
  sextortion: ["crypto-actifs"],
};

// Saisons a promouvoir en tete quand la menace est REELLE et vient d'arriver.
// La boucle fermee veut la lecon la plus courte et la plus directement liee
// a ce qui vient de se passer, pas la plus complete.
export const LIVE_THREAT_PREFERRED_SLUGS = ["remediation-flash"] as const;

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9_ -]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

export function scoreSlugForThreat(query: string): Map<string, number> {
  const tokens = tokenize(query);
  const scores = new Map<string, number>();
  for (const token of tokens) {
    // Match exact sur la cle du mapping
    const directKey = token.replace(/-/g, "_");
    const fromDirect = THREAT_TO_MODULES[directKey];
    if (fromDirect) {
      fromDirect.forEach((slug, i) => {
        scores.set(slug, (scores.get(slug) ?? 0) + (10 - i));
      });
      continue;
    }
    // Match partiel sur les cles (substring)
    for (const [key, slugs] of Object.entries(THREAT_TO_MODULES)) {
      if (key.includes(token) || token.includes(key)) {
        slugs.forEach((slug, i) => {
          scores.set(slug, (scores.get(slug) ?? 0) + (5 - i));
        });
      }
    }
  }
  return scores;
}

/** Slugs de saisons classes par pertinence decroissante. Vide si rien ne matche. */
export function rankSaisonSlugsForThreat(query: string): string[] {
  return Array.from(scoreSlugForThreat(query).entries())
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => slug);
}

/**
 * Variante pour une menace REELLE qui vient d'arriver : meme classement,
 * mais les saisons « juste apres » remontent en tete SI elles ont matche.
 * On ne les impose pas : une menace « byod » ne doit pas recevoir
 * remediation-flash juste parce qu'elle est preferee.
 */
export function rankSaisonSlugsForLiveThreat(query: string): string[] {
  const ranked = rankSaisonSlugsForThreat(query);
  const preferred = ranked.filter((s) =>
    (LIVE_THREAT_PREFERRED_SLUGS as readonly string[]).includes(s),
  );
  const rest = ranked.filter((s) => !preferred.includes(s));
  return [...preferred, ...rest];
}
