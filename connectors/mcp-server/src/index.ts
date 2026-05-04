#!/usr/bin/env node
// Serveur MCP (Model Context Protocol) Humanix Academie.
//
// Premier MCP server du marche SAT/HRM, expose les donnees Humanix en
// read-only aux agents IA (Claude Desktop, Mistral via passerelle, GPT
// via passerelle). Transport stdio standard MCP.
//
// Usage Claude Desktop (~/.claude_desktop_config.json) :
//   {
//     "mcpServers": {
//       "humanix": {
//         "command": "npx",
//         "args": ["humanix-mcp-server"],
//         "env": {
//           "HUMANIX_API_KEY": "hk_xxxxxxxxxxxx",
//           "HUMANIX_BASE_URL": "https://votre-tenant.humanix.fr"
//         }
//       }
//     }
//   }
//
// Le serveur utilise le SDK officiel @modelcontextprotocol/sdk (Anthropic)
// pour parler le protocole stdio JSON-RPC 2.0.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { loadConfigFromEnv } from "./api.js";
import { callTool, TOOLS } from "./tools.js";

async function main() {
  // Chargement config — on echoue tot si la cle API manque, plutot que
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
