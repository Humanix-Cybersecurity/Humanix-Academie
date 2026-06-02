// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Verification DNS des protocoles d'authentification email :
//   - SPF (Sender Policy Framework) : autorise les serveurs SMTP a envoyer
//     pour ce domaine. Sans SPF, les destinataires considerent le mail
//     suspect / spam.
//   - DKIM (DomainKeys Identified Mail) : signature cryptographique des
//     headers + body. Permet au destinataire de verifier qu'aucune
//     modification n'a eu lieu en transit.
//   - DMARC (Domain-based Message Authentication, Reporting, Conformance) :
//     politique declaree par le domaine pour les destinataires : "que
//     faire si SPF OU DKIM echoue ?". p=reject est le plus strict.
//
// CAS D'USAGE (Phase 6 Phishing Engine v2, juin 2026) :
//   Sur /admin/smtp, apres que l'admin a configure ses credentials SMTP,
//   on verifie en arriere-plan que son domaine d'envoi (parse fromEmail)
//   a bien les 3 records DNS configures. Si non, on affiche un explainer
//   pedagogique avec les enregistrements DNS a copier-coller chez son
//   registrar.
//
// LIMITES :
//   - SPF : on lit le record TXT @ mais on ne VERIFIE PAS la coherence avec
//     l'IP du SMTP utilise (ca demanderait une vraie reception/parsing).
//   - DKIM : on essaie 3 selecteurs courants (default, google, scaleway).
//     Si l'admin utilise un selecteur custom, on retourne "not_found" et
//     on l'invite a verifier manuellement. Pas de probe exhaustif.
//   - DMARC : on lit _dmarc.<domain> TXT.
//   - Pas de cache cross-request : implementation simple via fetch DNS.
//     L'UI cote /admin/smtp peut implementer son cache via React cache().

import dns from "node:dns/promises";

export type AuthRecord = {
  protocol: "SPF" | "DKIM" | "DMARC";
  /** True si un record valide a ete trouve */
  found: boolean;
  /** Valeur brute du record (si trouve) -- pour debug et copy-paste */
  value: string | null;
  /** Severite si non-trouve : ERROR (mail rejete potentiel), WARN (mail
   * arrive mais flag spam), INFO (recommande mais pas critique) */
  severity: "ERROR" | "WARN" | "INFO";
  /** Conseil actionnable pour l'admin */
  advice: string;
};

export type DnsAuthCheckResult = {
  domain: string;
  records: AuthRecord[];
  /** Score 0-100 : 100 = tous les records OK avec politique stricte.
   * Heuristique simple pour donner un feedback rapide. */
  overallScore: number;
  checkedAt: string;
};

const DEFAULT_DKIM_SELECTORS = ["default", "google", "scaleway", "mxvault", "dkim"];

/**
 * Probe SPF, DKIM, DMARC pour un domaine donne. Best-effort, ne throw jamais.
 */
export async function checkDomainAuth(
  domain: string,
): Promise<DnsAuthCheckResult> {
  // Normalisation : trim, lowercase, supprime trailing dot
  const cleanDomain = domain
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");

  const records: AuthRecord[] = await Promise.all([
    checkSpf(cleanDomain),
    checkDkim(cleanDomain),
    checkDmarc(cleanDomain),
  ]);

  // Score : SPF + DKIM = 35 chacun, DMARC = 30
  // Bonus si DMARC p=reject (le plus strict)
  let score = 0;
  if (records[0].found) score += 35;
  if (records[1].found) score += 35;
  if (records[2].found) {
    score += 20;
    if (records[2].value?.includes("p=reject")) score += 10;
    else if (records[2].value?.includes("p=quarantine")) score += 5;
  }

  return {
    domain: cleanDomain,
    records,
    overallScore: Math.min(100, score),
    checkedAt: new Date().toISOString(),
  };
}

async function checkSpf(domain: string): Promise<AuthRecord> {
  try {
    const txtRecords = await dns.resolveTxt(domain);
    // Un record TXT est un array de strings (joined). On cherche ceux qui
    // commencent par "v=spf1".
    for (const record of txtRecords) {
      const joined = record.join("");
      if (joined.toLowerCase().startsWith("v=spf1")) {
        return {
          protocol: "SPF",
          found: true,
          value: joined,
          severity: "INFO",
          advice:
            "SPF configuré. Vérifie que tous tes serveurs d'envoi (Scaleway TEM, SMTP custom...) sont bien dans le record.",
        };
      }
    }
    return {
      protocol: "SPF",
      found: false,
      value: null,
      severity: "ERROR",
      advice:
        "Aucun record SPF trouvé. Ajoute un TXT @ avec une valeur comme " +
        "\"v=spf1 include:smtp.tem.scaleway.com -all\" (adapte selon ton fournisseur). " +
        "Sans SPF, tes mails phishing simulés risquent d'être bloqués ou marqués spam.",
    };
  } catch {
    return {
      protocol: "SPF",
      found: false,
      value: null,
      severity: "WARN",
      advice: `Impossible de résoudre les records TXT de ${domain}. Vérifie que le domaine existe et que les DNS sont propagés.`,
    };
  }
}

async function checkDkim(domain: string): Promise<AuthRecord> {
  // On essaie chaque selecteur courant. Le 1er qui repond gagne.
  for (const selector of DEFAULT_DKIM_SELECTORS) {
    try {
      const records = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
      for (const record of records) {
        const joined = record.join("");
        // Un record DKIM contient "v=DKIM1" ou "k=" ou "p="
        if (
          joined.toLowerCase().includes("v=dkim1") ||
          joined.toLowerCase().includes("k=rsa") ||
          joined.toLowerCase().includes("p=")
        ) {
          return {
            protocol: "DKIM",
            found: true,
            value: `${selector}: ${joined.slice(0, 100)}${joined.length > 100 ? "..." : ""}`,
            severity: "INFO",
            advice: `DKIM trouvé via selecteur "${selector}". Verifie que la cle publique correspond a celle de ton fournisseur SMTP.`,
          };
        }
      }
    } catch {
      // selector non trouve, on continue
    }
  }
  return {
    protocol: "DKIM",
    found: false,
    value: null,
    severity: "ERROR",
    advice:
      `Aucun record DKIM trouvé sur les selecteurs courants (${DEFAULT_DKIM_SELECTORS.join(", ")}). ` +
      "Configure DKIM chez ton fournisseur (Scaleway TEM le fait automatiquement) et publie le record TXT. " +
      "Sans DKIM, ton mail ne peut pas etre verifie comme integre, donc score spam eleve.",
  };
}

async function checkDmarc(domain: string): Promise<AuthRecord> {
  try {
    const records = await dns.resolveTxt(`_dmarc.${domain}`);
    for (const record of records) {
      const joined = record.join("");
      if (joined.toLowerCase().startsWith("v=dmarc1")) {
        const policy = extractDmarcPolicy(joined);
        const severity: AuthRecord["severity"] =
          policy === "reject" ? "INFO" : policy === "quarantine" ? "INFO" : "WARN";
        return {
          protocol: "DMARC",
          found: true,
          value: joined,
          severity,
          advice:
            policy === "reject"
              ? "DMARC configuré avec politique stricte (p=reject). Excellent."
              : policy === "quarantine"
                ? "DMARC configuré avec p=quarantine. Recommande de passer a p=reject une fois les rapports analyses."
                : "DMARC configuré avec p=none (mode monitoring). Recommande de durcir progressivement vers p=quarantine puis p=reject.",
        };
      }
    }
    return {
      protocol: "DMARC",
      found: false,
      value: null,
      severity: "WARN",
      advice:
        "Aucun record DMARC trouvé. Ajoute un TXT _dmarc.<domain> avec " +
        "\"v=DMARC1; p=none; rua=mailto:dmarc-reports@ton-domaine.fr\" " +
        "pour commencer en mode monitoring (sans impact). Tu pourras durcir ensuite vers p=quarantine puis p=reject.",
    };
  } catch {
    return {
      protocol: "DMARC",
      found: false,
      value: null,
      severity: "WARN",
      advice: `Impossible de résoudre _dmarc.${domain}. Vérifie le sous-domaine et la propagation DNS.`,
    };
  }
}

function extractDmarcPolicy(record: string): string | null {
  const match = record.match(/p=([a-z]+)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

/**
 * Extrait le domaine d'un email. "noreply@example.com" -> "example.com".
 * Retourne null si email mal forme.
 */
export function extractDomainFromEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1 || at === email.length - 1) return null;
  return email.slice(at + 1).trim().toLowerCase();
}
