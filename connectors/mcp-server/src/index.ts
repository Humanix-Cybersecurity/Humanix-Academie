#!/usr/bin/env node
// Serveur MCP (Model Context Protocol) Humanix Academie.
//
// Premier MCP server du marche SAT/HRM. Expose les donnees Humanix en
// read-only aux agents IA, dans l'ordre de preference suivant :
//
//   1. Mistral (souverain FR) via passerelle ou client MCP-aware
//   2. Local : LM Studio, Anything LLM (clients MCP natifs depuis fin
//      2024). Ollama via passerelle MCP (ex: mcp-server-ollama) car
//      Ollama n'a pas de support MCP natif a ce jour.
//   3. Optionnel/sur demande : ChatGPT, Claude Desktop, Gemini.
//
// Transport : stdio JSON-RPC 2.0 (standard MCP).
//
// Exemple de configuration pour un client MCP (format generique compatible
// LM Studio, Anything LLM, Claude Desktop) :
//   {
//     "mcpServers": {
//       "humanix": {
//         "command": "npx",
//         "args": ["humanix-mcp-server"],
//         "env": {
//           "HUMANIX_API_KEY": "hxa_xxxxxxxxxxxx",
//           "HUMANIX_BASE_URL": "https://votre-tenant.humanix.fr"
//         }
//       }
//     }
//   }
//
// MCP est un protocole ouvert (specification publiee par Anthropic en
// novembre 2024, adopte depuis par OpenAI, plusieurs LLM open source et
// la majorite des clients IA desktop). Notre serveur respecte la spec
// sans dependance proprietaire : il fonctionne avec n'importe quel
// client conforme.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { loadConfigFromEnv } from "./api.js";
import { callTool, TOOLS } from "./tools.js";

async function main() {
  // Chargement config - on echoue tot si la cle API manque, plutot que
  // de laisser le LLM se prendre des 401 a chaque appel.
  const cfg = loadConfigFromEnv();

  const server = new Server(
    {
      name: "humanix-mcp-server",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    const result = await callTool(name, args ?? {}, cfg);
    if (result.ok) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    }
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: result.code
            ? `[Humanix API ${result.code}] ${result.error}`
            : result.error,
        },
      ],
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // stderr est libre (stdout est reserve au protocole MCP).
  process.stderr.write(
    `[humanix-mcp] Server connected. ${TOOLS.length} outils exposes. Tenant: ${cfg.baseUrl}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`[humanix-mcp] Fatal: ${err.message ?? err}\n`);
  process.exit(1);
});
