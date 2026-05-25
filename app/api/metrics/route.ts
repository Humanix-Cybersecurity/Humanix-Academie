// SPDX-License-Identifier: AGPL-3.0-or-later
//
// GET /api/metrics — endpoint Prometheus pour scraping
//
// Expose les metriques applicatives au format `text/plain; version=0.0.4`
// (standard Prometheus). Consomme par Scaleway Cockpit (Loki + Mimir),
// Grafana Agent, Datadog Agent, ou tout autre collecteur compatible.
//
// === Securite ===
//
// En prod (NODE_ENV=production), l'endpoint EXIGE un token Bearer dans
// l'env var METRICS_SCRAPE_TOKEN. Sans token configure, on retourne 503
// (service indisponible) plutot que d'exposer ouvertement.
//
// En dev, ouvert sans auth pour faciliter l'exploration locale via
// `curl http://localhost:3000/api/metrics`.
//
// === Pourquoi pas dans un middleware ===
//
// On ne veut PAS instrumenter via middleware Edge global (chaque request
// du site paierait la latence prom-client). On instrumente uniquement
// les endpoints critiques (audit log + bientot /api/v1/dpo-export,
// /api/v1/evidence-export, /api/admin/*/export). Cf. lib/metrics/registry.ts.

import { NextResponse } from "next/server";
import { getMetrics } from "@/lib/metrics/registry";

export const dynamic = "force-dynamic";

const METRICS_TOKEN_ENV = "METRICS_SCRAPE_TOKEN";

export async function GET(req: Request) {
  // === Auth en prod ===
  if (process.env.NODE_ENV === "production") {
    const expected = process.env[METRICS_TOKEN_ENV]?.trim();
    if (!expected || expected.length < 16) {
      // Pas de token configure : on refuse plutot que d'exposer.
      // Le SRE devra definir METRICS_SCRAPE_TOKEN >= 16 char dans .env.
      return NextResponse.json(
        {
          error: "metrics_endpoint_not_configured",
          message: `Definir l'env var ${METRICS_TOKEN_ENV} (>= 16 chars) pour activer le scraping.`,
        },
        { status: 503 },
      );
    }
    const auth = req.headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return new NextResponse("missing_token", {
        status: 401,
        headers: { "WWW-Authenticate": "Bearer realm=\"metrics\"" },
      });
    }
    const provided = auth.slice(7).trim();
    // Comparison constant-time pour eviter le timing attack sur le token.
    // Note : pour un token court (<= 64 chars) avec Bearer, l'attaque
    // timing est marginale, mais on reste consistent avec lib/audit-flash/signed-urls.ts.
    if (
      provided.length !== expected.length ||
      !timingSafeEqualStr(provided, expected)
    ) {
      return new NextResponse("forbidden", { status: 403 });
    }
  }

  // === Rendu Prometheus ===
  const { registry } = getMetrics();
  const body = await registry.metrics();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": registry.contentType,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Comparaison string en temps constant. Implementation simple pour des
 * tokens de longueur fixe (cf. comparaison stricte de longueur avant).
 * Pour des inputs plus complexes, utiliser crypto.timingSafeEqual avec
 * Buffer.from().
 */
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
