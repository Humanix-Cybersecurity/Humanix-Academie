#!/usr/bin/env tsx
/**
 * Script standalone : scrape les 3 sources et upsert en BDD.
 *
 * Usage :
 *   npx tsx scripts/scrape-breaches.ts
 *
 * Cas d'usage :
 *   - Au démarrage du conteneur (entrypoint Docker)
 *   - Cron host (crontab : "0 6,18 * * * cd /app && npx tsx scripts/scrape-breaches.ts")
 *   - One-shot manuel pour tester ou recharger
 *
 * Codes retour :
 *   - 0 : OK (au moins une source a remonté des items)
 *   - 1 : aucune source n'a réussi (réseau down, sites indisponibles)
 */

import { refreshBreaches } from "../lib/breaches/repository";
import { db } from "../lib/db";

async function main() {
  // Flag CLI : --deep parcourt les archives par année (utile pour la 1ère init)
  const deep = process.argv.includes("--deep");
  console.log(
    `🔍 Scrape observatoire des fuites — démarrage…${deep ? " (mode DEEP : archives par année)" : ""}`,
  );

  try {
    const result = await refreshBreaches({ deep });
    console.log(
      `${result.totalInserted > 0 ? "✅" : "⚠️"} Terminé en ${result.durationMs} ms${result.deep ? " (deep)" : ""} : ${result.totalInserted} nouvelles fuites, ${result.totalSkipped} déjà connues`,
    );
    for (const s of result.perSource) {
      const tag = s.ok ? "✓" : "✗";
      console.log(
        `  ${tag} ${s.source} : +${s.inserted} / =${s.skipped}${s.errors.length ? "\n      erreurs : " + s.errors.join("\n      ") : ""}`,
      );
    }

    if (result.totalInserted === 0 && !result.perSource.some((s) => s.ok)) {
      console.log("");
      console.log("💡 Aucune source n'a remonté de fuite. Pour calibrer les parsers :");
      console.log("   - Connecte-toi en SUPERADMIN puis :");
      console.log("     curl http://localhost/api/admin/breaches/debug -b 'authjs.session-token=...'");
      console.log("   - Le retour JSON contient les 2000 premiers chars de chaque page récupérée");
      console.log("   - Colle-le dans une issue, on adapte les parsers selon la structure réelle");
    }

    const anyOk = result.perSource.some((s) => s.ok);
    process.exit(anyOk ? 0 : 1);
  } catch (e: any) {
    console.error("❌ Erreur fatale :", e?.message ?? e);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
