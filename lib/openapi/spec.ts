// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Specification OpenAPI 3.0 publique de l'API Humanix Academie.
//
// Source de verite : ce fichier (typage TS strict via "as const"). Sert
// a generer /api/v1/openapi.json (consomme par Swagger UI a /integrations/api)
// et la doc commerciale.
//
// REGLES :
//   - Toute route /api/v1/* documentee ici DOIT exister en runtime, et
//     vice-versa. Le test scripts/lint-routes.ts surveille cette
//     coherence (pas de drift entre code et doc).
//   - On documente les schemas avec components.schemas pour permettre
//     a Swagger UI d'afficher les "Try it out" avec des exemples.
//   - Auth : Bearer hxa_* (cf. lib/api-auth.ts).

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-cybersecurity.fr";

export const OPENAPI_SPEC = {
  openapi: "3.0.3",
  info: {
    title: "Humanix Académie — API publique",
    description: `API REST publique pour intégrer Humanix Académie à votre SI.

Authentification : header \`Authorization: Bearer hxa_xxx\` (créer une clé dans \`/admin/api-keys\`).

Plan : Pro+ minimum.

Pour le **provisioning utilisateurs**, utilisez plutôt l'endpoint **SCIM 2.0** (\`/scim/v2/Users\`) qui est compatible avec Microsoft Entra ID, Okta, Keycloak.

Pour les **alertes temps réel**, utilisez les **webhooks** (\`/admin/integrations\`) qui supportent Slack, Microsoft Teams, Jira, ServiceNow, PagerDuty et generic JSON.`,
    version: "1.0.0",
    contact: {
      name: "Humanix Cybersecurity",
      url: APP_URL,
      email: "support@humanix-cybersecurity.fr",
    },
    license: {
      name: "AGPL-3.0-or-later",
      url: "https://www.gnu.org/licenses/agpl-3.0.html",
    },
  },
  servers: [
    {
      url: `${APP_URL}/api/v1`,
      description: "Production",
    },
  ],
  components: {
    securitySchemes: {
      ApiKey: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "hxa_*",
        description:
          "Clé API au format `hxa_*`. Crée-la dans `/admin/api-keys`. Le hash est stocké en BDD (scrypt), la clé en clair n'est affichée qu'à la création.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string", example: "unauthorized" },
          message: { type: "string", example: "Clé API invalide ou révoquée" },
        },
      },
      ProgressItem: {
        type: "object",
        properties: {
          userId: { type: "string", format: "cuid" },
          userEmail: { type: "string", format: "email" },
          userName: { type: "string", nullable: true },
          episodeSlug: { type: "string", example: "01-mail-du-pdg" },
          saisonSlug: { type: "string", example: "phishing" },
          status: {
            type: "string",
            enum: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
          },
          score: { type: "integer", example: 85 },
          bestQuizScorePct: {
            type: "integer",
            minimum: 0,
            maximum: 100,
            nullable: true,
          },
          completedAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
        },
      },
      UserSummary: {
        type: "object",
        properties: {
          id: { type: "string", format: "cuid" },
          email: { type: "string", format: "email" },
          name: { type: "string", nullable: true },
          role: {
            type: "string",
            enum: ["LEARNER", "MANAGER", "RSSI", "ADMIN", "SUPERADMIN"],
          },
          service: { type: "string", nullable: true },
          isActive: { type: "boolean" },
          riskScore: { type: "integer", minimum: 0, maximum: 100 },
          coins: { type: "integer" },
          level: { type: "integer", minimum: 1, maximum: 5 },
          lastSeenAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
        },
      },
      Saison: {
        type: "object",
        properties: {
          id: { type: "string", format: "cuid" },
          slug: { type: "string", example: "phishing" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          coverEmoji: { type: "string" },
          order: { type: "integer" },
          isPublished: { type: "boolean" },
          episodeCount: { type: "integer" },
        },
      },
      ConformityScore: {
        type: "object",
        properties: {
          tenantName: { type: "string" },
          framework: {
            type: "string",
            example: "ISO27001:2022",
            description: "Framework de conformité évalué",
          },
          masteryAverage: {
            type: "number",
            description: "Score humain moyen (0-100)",
          },
          activationRate: {
            type: "number",
            description: "% utilisateurs actifs",
          },
          mandatoryCompletionRate: {
            type: "number",
            description: "% modules obligatoires complétés",
          },
          generatedAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  security: [{ ApiKey: [] }],
  paths: {
    "/users": {
      get: {
        summary: "Liste des utilisateurs du tenant",
        description:
          "Retourne les utilisateurs actifs avec leur risk score, niveau, dernière connexion. Pour le provisioning, préférer SCIM /scim/v2/Users.",
        tags: ["Users"],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 100, minimum: 1, maximum: 500 },
          },
          {
            name: "service",
            in: "query",
            schema: { type: "string" },
            description: "Filtre par service (legacy). Préférer les groupes.",
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    users: {
                      type: "array",
                      items: { $ref: "#/components/schemas/UserSummary" },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { description: "Clé API invalide" },
          "429": { description: "Rate limit dépassé" },
        },
      },
    },
    "/progress": {
      get: {
        summary: "Avancement des utilisateurs",
        description:
          "Retourne les rows Progress (un par paire user/episode). Utilisé pour les exports vers HRIS, SIEM, BI.",
        tags: ["Progress"],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 100, minimum: 1, maximum: 1000 },
          },
          {
            name: "since",
            in: "query",
            description: "Filtre completedAt >= since (ISO 8601)",
            schema: { type: "string", format: "date-time" },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    progress: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ProgressItem" },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
          "401": { description: "Clé API invalide" },
        },
      },
    },
    "/saisons": {
      get: {
        summary: "Catalogue des saisons / parcours",
        description:
          "Saisons publiées (globales + customs du tenant) avec compteur d'épisodes.",
        tags: ["Content"],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    saisons: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Saison" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/conformity-score": {
      get: {
        summary: "Score de conformité agrégé",
        description:
          "KPIs agrégés du tenant pour reporting GRC (NIS2, RGPD, ISO 27001).",
        tags: ["Compliance"],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ConformityScore" },
              },
            },
          },
        },
      },
    },
    "/evidence-export": {
      get: {
        summary: "Export de preuves de conformité (SIEM-ready)",
        description: `Export des preuves au format compatible SIEM ou GRC :
- \`oscal-v1\` : OSCAL component v1 (CISO Assistant, Eramba)
- \`splunk-cim-v1\` : NDJSON Splunk CIM, ingestion HEC directe
- \`sentinel-cef-v1\` : CEF ArcSight-compatible (Microsoft Sentinel, QRadar)

Idéal pour automatiser la collecte de preuves dans votre GRC ou SIEM.`,
        tags: ["Compliance", "SIEM"],
        parameters: [
          {
            name: "framework",
            in: "query",
            required: true,
            schema: {
              type: "string",
              enum: ["ISO27001:2022", "NIS2", "GDPR"],
            },
          },
          {
            name: "format",
            in: "query",
            required: true,
            schema: {
              type: "string",
              enum: ["oscal-v1", "splunk-cim-v1", "sentinel-cef-v1"],
            },
          },
        ],
        responses: {
          "200": {
            description: "OK — format dépend du paramètre",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  description: "OSCAL ou ConformityScore selon format",
                },
              },
              "application/x-ndjson": {
                schema: {
                  type: "string",
                  description: "Splunk CIM (NDJSON, 1 event par ligne)",
                },
              },
              "text/plain": {
                schema: {
                  type: "string",
                  description: "Sentinel CEF (1 ligne par event)",
                },
              },
            },
          },
          "429": { description: "Rate limit (10 req/h pour evidence)" },
        },
      },
    },
  },
  tags: [
    {
      name: "Users",
      description: "Gestion des utilisateurs du tenant.",
    },
    {
      name: "Progress",
      description: "Avancement pédagogique des utilisateurs.",
    },
    {
      name: "Content",
      description: "Catalogue des saisons et épisodes.",
    },
    {
      name: "Compliance",
      description: "Conformité réglementaire (NIS2, RGPD, ISO 27001).",
    },
    {
      name: "SIEM",
      description: "Intégration SIEM (Splunk, Sentinel, QRadar, Elastic).",
    },
  ],
} as const;

export type OpenApiSpec = typeof OPENAPI_SPEC;
