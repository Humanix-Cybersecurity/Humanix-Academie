// Definitions des outils MCP exposes par humanix-mcp-server.
//
// Schema JSON-RPC compatible MCP : chaque tool a un nom canonique,
// une description riche pour le LLM, et un schema JSON Schema strict
// pour valider les arguments. La structure est volontairement decouplee
// de l'API REST Humanix pour pouvoir ajouter des transformations,
// du filtrage et de l'audit avant de retourner les donnees a l'agent.

import {
  fetchComplianceScore,
  fetchEvidenceExport,
  fetchRecentCampaigns,
  fetchUsersAtRisk,
  HumanixApiError,
  type EvidenceFormat,
  type EvidenceFramework,
  type HumanixConfig,
} from "./api.js";

const FRAMEWORK_VALUES = [
  "ISO27001:2022",
  "NIS2",
  "RGPD",
  "ANSSI-HG",
  "NIST-CSF",
] as const satisfies ReadonlyArray<EvidenceFramework>;

const FORMAT_VALUES = [
  "humanix-v1",
  "oscal-v1",
  "splunk-cim-v1",
  "sentinel-cef-v1",
] as const satisfies ReadonlyArray<EvidenceFormat>;

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
};

export const TOOLS: readonly ToolDefinition[] = [
  {
    name: "humanix_evidence_export",
    description:
      "Exporte les preuves vivantes (formations completees, certificats, campagnes phishing) au format demande par framework de conformite. Idéal pour audit RSSI ou injection dans CISO Assistant. Read-only.",
    inputSchema: {
      type: "object",
      properties: {
        framework: {
          type: "string",
          enum: FRAMEWORK_VALUES as unknown as string[],
          description: "Framework de conformite cible.",
        },
        format: {
          type: "string",
          enum: FORMAT_VALUES as unknown as string[],
          description:
            "Format de sortie. humanix-v1 = JSON natif lisible. oscal-v1 = NIST OSCAL Assessment Results. splunk-cim-v1 = Splunk Common Information Model. sentinel-cef-v1 = ArcSight CEF (Sentinel/QRadar/Sekoia).",
          default: "humanix-v1",
        },
      },
      required: ["framework"],
      additionalProperties: false,
    },
  },
  {
    name: "humanix_users_at_risk",
    description:
      "Retourne le top N des utilisateurs avec le score de risque humain le plus eleve (basé sur reponses phishing simules, taux completion modules, fraicheur formations). Read-only — utile pour cibler les remediations.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          default: 10,
          description: "Nombre d'utilisateurs a retourner (1-100).",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "humanix_compliance_score",
    description:
      "Score global de conformite humaine pour le framework demande (0-100), avec breakdown par controle. Read-only. Utile pour reporting COMEX et tableau de bord RSSI.",
    inputSchema: {
      type: "object",
      properties: {
        framework: {
          type: "string",
          enum: FRAMEWORK_VALUES as unknown as string[],
          description: "Framework de conformite cible.",
        },
      },
      required: ["framework"],
      additionalProperties: false,
    },
  },
  {
    name: "humanix_recent_campaigns",
    description:
      "Liste les campagnes phishing/sensibilisation lancees sur les N derniers jours, avec stats (taux de signalement, taux de clic, top users a risque). Read-only.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "integer",
          minimum: 1,
          maximum: 365,
          default: 30,
          description: "Fenetre de jours en arriere (1-365).",
        },
      },
      additionalProperties: false,
    },
  },
] as const;

export type ToolCallResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string; code?: number };

// Validateurs runtime — on ne fait pas confiance au LLM pour respecter le
// JSON Schema. On rejette toute valeur hors enum / hors range avec un
// message clair que l'agent IA peut interpreter et corriger.
export async function callTool(
  name: string,
  args: Record<string, unknown>,
  cfg: HumanixConfig,
): Promise<ToolCallResult> {
  try {
    switch (name) {
      case "humanix_evidence_export": {
        const framework = parseFramework(args.framework);
        const format = parseFormat(args.format ?? "humanix-v1");
        const data = await fetchEvidenceExport(cfg, framework, format);
        return { ok: true, data };
      }
      case "humanix_users_at_risk": {
        const limit = parseLimit(args.limit ?? 10, 1, 100);
        const data = await fetchUsersAtRisk(cfg, limit);
        return { ok: true, data };
      }
      case "humanix_compliance_score": {
        const framework = parseFramework(args.framework);
        const data = await fetchComplianceScore(cfg, framework);
        return { ok: true, data };
      }
      case "humanix_recent_campaigns": {
        const days = parseLimit(args.days ?? 30, 1, 365);
        const data = await fetchRecentCampaigns(cfg, days);
        return { ok: true, data };
      }
      default:
        return { ok: false, error: `Outil inconnu: ${name}` };
    }
  } catch (err) {
    if (err instanceof HumanixApiError) {
      return {
        ok: false,
        error: err.message,
        code: err.status,
      };
    }
    if (err instanceof Error) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Erreur inconnue" };
  }
}

function parseFramework(v: unknown): EvidenceFramework {
  if (typeof v !== "string" || !FRAMEWORK_VALUES.includes(v as EvidenceFramework)) {
    throw new Error(
      `framework invalide. Attendu: ${FRAMEWORK_VALUES.join(", ")}. Recu: ${String(v)}`,
    );
  }
  return v as EvidenceFramework;
}

function parseFormat(v: unknown): EvidenceFormat {
  if (typeof v !== "string" || !FORMAT_VALUES.includes(v as EvidenceFormat)) {
    throw new Error(
      `format invalide. Attendu: ${FORMAT_VALUES.join(", ")}. Recu: ${String(v)}`,
    );
  }
  return v as EvidenceFormat;
}

function parseLimit(v: unknown, min: number, max: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(`Valeur invalide. Attendu entier entre ${min} et ${max}. Recu: ${String(v)}`);
  }
  return n;
}
