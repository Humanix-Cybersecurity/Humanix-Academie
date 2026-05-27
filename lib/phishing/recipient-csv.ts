// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Parser CSV pour l'import de recipient lists phishing.
//
// FORMAT ATTENDU (RFC 4180 simplifie, separateur ; OR ,) :
//   email;name;service
//   alice@example.com;Alice Dupont;Compta
//   bob@example.com;Bob Martin;RH
//
// Headers : la 1ere ligne est OPTIONNELLE. Si elle contient "email", on
// l'ignore. Sinon, on assume que c'est deja de la data.
//
// RGPD-SAFE :
//   - Email parse + lowercase
//   - Email validation regex simple (pas RFC complete mais sufficant)
//   - Skip silencieux des lignes invalides (logs cote caller pour
//     reporting a l'utilisateur)
//   - Dedupe par email au sein du meme CSV
//
// LIMITES :
//   - Pas de support multi-byte BOM (UTF-8 BOM strip cote import file API)
//   - Pas de support quoted fields "..,," -- on assume CSV "propre"
//   - Max 10 000 lignes par CSV (cap dur cote caller)

export type CsvParseResult = {
  /** Lignes parsees valides */
  rows: Array<{
    email: string;
    name: string | null;
    service: string | null;
  }>;
  /** Lignes ignorees pour rapport a l'utilisateur */
  skipped: Array<{
    lineNumber: number;
    raw: string;
    reason: "invalid_email" | "duplicate" | "empty" | "header";
  }>;
  /** Nb total de lignes lues (excluant ligne vide finale) */
  totalLines: number;
};

// Regex email simple. Pas RFC 5321 complete mais elimine 99% des erreurs
// de copie/paste utilisateur (espaces, virgule oublie, etc.).
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function parseRecipientCsv(input: string): CsvParseResult {
  // Strip UTF-8 BOM si present (Excel a parfois l'idee fixe)
  const cleaned = input.replace(/^﻿/, "");
  const lines = cleaned.split(/\r?\n/).filter((l) => l.length > 0);

  const rows: CsvParseResult["rows"] = [];
  const skipped: CsvParseResult["skipped"] = [];
  const seenEmails = new Set<string>();
  // Detection auto du separateur sur la 1ere ligne (; majoritaire en France
  // dans les exports Excel FR, , pour les exports US/intl)
  const sep = lines.length > 0 && lines[0].includes(";") ? ";" : ",";

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const raw = lines[i].trim();
    if (raw.length === 0) {
      skipped.push({ lineNumber, raw, reason: "empty" });
      continue;
    }

    const parts = raw.split(sep).map((p) => p.trim());
    const emailRaw = (parts[0] ?? "").toLowerCase();

    // Skip header line si la 1ere "valeur" est le label "email"
    if (i === 0 && emailRaw === "email") {
      skipped.push({ lineNumber, raw, reason: "header" });
      continue;
    }

    if (!EMAIL_RE.test(emailRaw)) {
      skipped.push({ lineNumber, raw, reason: "invalid_email" });
      continue;
    }

    if (seenEmails.has(emailRaw)) {
      skipped.push({ lineNumber, raw, reason: "duplicate" });
      continue;
    }
    seenEmails.add(emailRaw);

    rows.push({
      email: emailRaw,
      name: (parts[1] ?? "").length > 0 ? parts[1].slice(0, 200) : null,
      service: (parts[2] ?? "").length > 0 ? parts[2].slice(0, 100) : null,
    });
  }

  return { rows, skipped, totalLines: lines.length };
}
