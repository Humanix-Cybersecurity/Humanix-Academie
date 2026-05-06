#!/usr/bin/env tsx
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Inspecte les 3 sources et logge un échantillon du HTML/JSON récupéré.
 * Usage : docker compose exec app npm run breaches:debug
 *
 * Le but : identifier la structure réelle des sources pour adapter les
 * parsers regex. Pour chaque URL candidate, on affiche :
 *  - status HTTP
 *  - bytes reçus
 *  - signaux : présence de <item>, <entry>, <article>, <tr>, <li>, JSON
 *  - extrait des 2000 premiers caractères
 *
 * Utile uniquement quand un parser remonte 0 ou 1 item et qu'on veut
 * comprendre pourquoi.
 */

import { debugFetchAll } from "../lib/breaches/parsers";

const SIGNALS = [
  { label: "<item>", re: /<item[\s>]/i },
  { label: "<entry>", re: /<entry[\s>]/i },
  { label: "<article>", re: /<article[\s>]/i },
  { label: "<tr>", re: /<tr[\s>]/i },
  { label: "<li>", re: /<li[\s>]/i },
  { label: "JSON [", re: /^\s*\[/ },
  { label: "JSON {", re: /^\s*\{/ },
  { label: 'class="card"', re: /class="[^"]*card/i },
  { label: 'class="breach"', re: /class="[^"]*breach/i },
  { label: 'class="fuite"', re: /class="[^"]*fuite/i },
  { label: "<rss>", re: /<rss[\s>]/i },
  { label: "<feed>", re: /<feed[\s>]/i },
];

async function main() {
  console.log("🔍 Diagnostic des 3 sources de fuites…\n");

  const results = await debugFetchAll();
  for (const r of results) {
    console.log(`${"=".repeat(72)}`);
    console.log(`SOURCE   : ${r.source}`);
    console.log(`URL      : ${r.url}`);
    console.log(`Status   : ${r.status ?? "—"}${r.ok ? " ✓" : " ✗"}`);
    console.log(`Bytes    : ${r.bytes}`);
    if (r.error) console.log(`Erreur   : ${r.error}`);

    if (r.ok && r.bodyExcerpt) {
      // Détecte les patterns connus
      const found = SIGNALS.filter((s) => s.re.test(r.bodyExcerpt)).map(
        (s) => s.label,
      );
      console.log(
        `Signaux  : ${found.length > 0 ? found.join(", ") : "AUCUN PATTERN CONNU"}`,
      );

      // Headers HTML utiles : <title>, premier <h1>
      const title = /<title[^>]*>([\s\S]{1,200}?)<\/title>/i
        .exec(r.bodyExcerpt)?.[1]
        ?.trim();
      if (title)
        console.log(`<title>  : ${title.replace(/\s+/g, " ").slice(0, 80)}`);

      const h1 = /<h1[^>]*>([\s\S]{1,200}?)<\/h1>/i
        .exec(r.bodyExcerpt)?.[1]
        ?.replace(/<[^>]+>/g, "")
        .trim();
      if (h1) console.log(`<h1>     : ${h1.replace(/\s+/g, " ").slice(0, 80)}`);

      // Premiers liens (utile pour repérer la structure de listing)
      const linksRe = /<a[^>]+href="([^"]{1,200})"[^>]*>([^<]{1,100})<\/a>/gi;
      const links: { href: string; text: string }[] = [];
      let m: RegExpExecArray | null;
      while ((m = linksRe.exec(r.bodyExcerpt)) !== null && links.length < 5) {
        const text = m[2].trim();
        if (text.length >= 5)
          links.push({ href: m[1].slice(0, 80), text: text.slice(0, 60) });
      }
      if (links.length > 0) {
        console.log(`Liens    :`);
        for (const l of links) console.log(`           ${l.text} → ${l.href}`);
      }
    }

    console.log("");
    console.log("--- 2000 premiers chars du body ---");
    console.log(r.bodyExcerpt || "(vide)");
    console.log("");
  }

  console.log(`${"=".repeat(72)}`);
  console.log(
    "\n💡 Colle ce log dans une issue ou un message support - j'adapterai",
  );
  console.log(
    "   les regex parsers en fonction des structures réelles observées.",
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("Erreur :", e);
  process.exit(1);
});
