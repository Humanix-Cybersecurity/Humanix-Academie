// Client HTTP minimal pour l'API REST Humanix Academie.
//
// Cible : un RSSI qui interroge ses donnees Humanix en langage naturel
// via un agent IA conforme MCP -- Mistral en first (souverain FR), puis
// LM Studio / Anything LLM / Ollama en local, et ChatGPT/Claude/Gemini
// en option. On reste read-only par design : le MCP server n'a pas
// vocation a modifier l'etat (les agents IA n'ont pas l'autorite humaine
// pour cela). Les ecritures restent dans /admin.

import { request } from "node:https";
import { request as httpRequest } from "node:http";
import { URL } from "node:url";

export type HumanixConfig = {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
};

export class HumanixApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = "HumanixApiError";
  }
}

// Endpoints exposes par le MCP server. Tous read-only.
export type EvidenceFramework =
  | "ISO27001:2022"
  | "NIS2"
  | "RGPD"
  | "ANSSI-HG"
  | "NIST-CSF";

export type EvidenceFormat = "humanix-v1" | "oscal-v1" | "splunk-cim-v1" | "sentinel-cef-v1";

export async function fetchEvidenceExport(
  cfg: HumanixConfig,
  framework: EvidenceFramework,
  format: EvidenceFormat = "humanix-v1",
): Promise<unknown> {
  return getJson(cfg, `/api/v1/evidence-export?framework=${encodeURIComponent(framework)}&format=${encodeURIComponent(format)}`);
}

export async function fetchUsersAtRisk(
  cfg: HumanixConfig,
  limit = 10,
): Promise<unknown> {
  // L'API publique ne sert pas encore d'endpoint dedie usersAtRisk : on
  // recupere via le summary qui inclut les top risk dans la version >= 1.2.
  return getJson(cfg, `/api/v1/summary?topRisk=${limit}`);
}

export async function fetchComplianceScore(
  cfg: HumanixConfig,
  framework: EvidenceFramework,
): Promise<unknown> {
  return getJson(cfg, `/api/v1/compliance-score?framework=${encodeURIComponent(framework)}`);
}

export async function fetchRecentCampaigns(
  cfg: HumanixConfig,
  days = 30,
): Promise<unknown> {
  return getJson(cfg, `/api/v1/campaigns/recent?days=${days}`);
}

// v0.2 - Drill-down par equipe / module pour les agents IA
export async function fetchTeamModulePerformance(
  cfg: HumanixConfig,
  moduleSlug: string,
  teamSlug?: string,
): Promise<unknown> {
  const params = new URLSearchParams({ module: moduleSlug });
  if (teamSlug) params.set("team", teamSlug);
  return getJson(cfg, `/api/v1/team-module-performance?${params.toString()}`);
}

// v0.2 - Recommandation de modules pour traiter une menace
export async function fetchModuleRecommendations(
  cfg: HumanixConfig,
  threatQuery: string,
  limit = 5,
): Promise<unknown> {
  const params = new URLSearchParams({
    threat: threatQuery,
    limit: String(limit),
  });
  return getJson(cfg, `/api/v1/recommend-modules?${params.toString()}`);
}

// Implementation HTTP commune. On evite fetch() pour rester compatible Node 20
// sans flags experimentaux et pour avoir un controle fin sur le timeout.
async function getJson(cfg: HumanixConfig, path: string): Promise<unknown> {
  const url = new URL(path, cfg.baseUrl);
  const isHttps = url.protocol === "https:";
  const requestFn = isHttps ? request : httpRequest;
  const timeoutMs = cfg.timeoutMs ?? 10_000;

  return new Promise((resolve, reject) => {
    const req = requestFn(
      {
        method: "GET",
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          "User-Agent": "humanix-mcp-server/0.1.0",
          Accept: "application/json",
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf-8");
          if (!res.statusCode || res.statusCode >= 400) {
            reject(
              new HumanixApiError(
                `Humanix API ${res.statusCode}`,
                res.statusCode,
                body,
              ),
            );
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(
              new HumanixApiError(
                "Reponse non-JSON",
                res.statusCode,
                body.slice(0, 500),
              ),
            );
          }
        });
      },
    );
    req.on("error", (err) => reject(new HumanixApiError(err.message)));
    req.on("timeout", () => {
      req.destroy();
      reject(new HumanixApiError(`Timeout apres ${timeoutMs}ms`));
    });
    req.end();
  });
}

export function loadConfigFromEnv(): HumanixConfig {
  const apiKey = process.env.HUMANIX_API_KEY;
  const baseUrl = process.env.HUMANIX_BASE_URL || "https://app.humanix-cybersecurity.fr";

  if (!apiKey) {
    throw new Error(
      "HUMANIX_API_KEY non defini. Cf. README et /admin/api-keys pour generer une cle.",
    );
  }
  if (!/^https?:\/\//.test(baseUrl)) {
    throw new Error(
      `HUMANIX_BASE_URL doit commencer par http(s):// (recu: ${baseUrl})`,
    );
  }
  return { apiKey, baseUrl };
}
