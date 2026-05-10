// SPDX-License-Identifier: AGPL-3.0-or-later
// Abstraction du provider IA pour Hex Chat.
//
// Pourquoi cette couche :
// Le wrapper existant (lib/ai/mistral.ts) est specialise pour la generation
// de phishing pedagogique (JSON output, pas de streaming). Hex Chat a besoin :
//   - de streaming SSE (token par token) pour une UX fluide
//   - d'un historique de messages multi-tour
//   - de plusieurs providers possibles (Mistral API cloud, Ollama self-host,
//     fallback gracieux si rien configure)
//
// Stratégie open core :
//   - Self-host AGPLv3 : Ollama avec un modele open weights (Mistral 7B
//     Instruct) → gratuit infini
//   - Cloud Starter (free) : Mistral API "Experiment" tier → gratuit jusqu'a
//     ~1 B tokens/mois
//   - Cloud Pro+ : Mistral API paid → mistral-small-latest ou large
//
// Le choix se fait au runtime via la variable HEX_AI_PROVIDER :
//   - "mistral" (defaut) : appelle api.mistral.ai
//   - "ollama" : appelle OLLAMA_BASE_URL/api/chat (self-host)
//   - "disabled" : retourne une reponse fixture "Hex est en pause"
//
// Le provider est plein-streaming : on retourne un ReadableStream<string>
// qui emet chaque chunk de texte au fur et a mesure. L'appelant (la
// route /api/ai/chat) le pipe dans un Response SSE.

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatStreamOptions = {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

export type ProviderKind = "mistral" | "ollama" | "disabled";

export function getProviderKind(): ProviderKind {
  const raw = (process.env.HEX_AI_PROVIDER ?? "").toLowerCase();
  if (raw === "ollama") return "ollama";
  if (raw === "disabled") return "disabled";
  // Defaut : Mistral si la cle est presente, sinon disabled
  if (process.env.MISTRAL_API_KEY) return "mistral";
  return "disabled";
}

/**
 * Indique si Hex Chat est utilisable sur cette instance. Permet a la UI
 * de cacher l'icone de chat si rien n'est configure (degradation gracieuse).
 */
export function isHexChatAvailable(): boolean {
  return getProviderKind() !== "disabled";
}

const MISTRAL_API = "https://api.mistral.ai/v1/chat/completions";

/**
 * Streaming chat. Retourne un ReadableStream<string> emettant chaque chunk
 * de texte. L'appelant doit consumer le stream et formatter en SSE.
 *
 * Le ReadableStream emet des CHUNKS DE TEXTE BRUT (delta du dernier token).
 * Le formattage SSE (event: data:\n\n) est de la responsabilite de
 * l'appelant.
 */
export async function streamChat(
  opts: ChatStreamOptions,
): Promise<ReadableStream<string>> {
  const kind = getProviderKind();
  switch (kind) {
    case "mistral":
      return streamMistral(opts);
    case "ollama":
      return streamOllama(opts);
    case "disabled":
      return streamDisabled();
  }
}

// ============================================================================
// Provider : Mistral (cloud, api.mistral.ai)
// ============================================================================

async function streamMistral(
  opts: ChatStreamOptions,
): Promise<ReadableStream<string>> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error("HEX_AI_PROVIDER=mistral but MISTRAL_API_KEY is not set");
  }

  const model =
    process.env.HEX_AI_MODEL ??
    process.env.MISTRAL_MODEL ??
    "mistral-small-latest";

  const res = await fetch(MISTRAL_API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.5,
      max_tokens: opts.maxTokens ?? 800,
      stream: true,
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Mistral API ${res.status}: ${body.slice(0, 300)}`,
    );
  }
  if (!res.body) {
    throw new Error("Mistral API returned no body");
  }

  return decodeSSE(res.body, "mistral");
}

// ============================================================================
// Provider : Ollama (self-host, Mistral 7B ou autre modele local)
// ============================================================================

async function streamOllama(
  opts: ChatStreamOptions,
): Promise<ReadableStream<string>> {
  const base = (
    process.env.OLLAMA_BASE_URL ?? "http://localhost:11434"
  ).replace(/\/$/, "");
  const model = process.env.HEX_AI_MODEL ?? "mistral:7b-instruct";

  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      stream: true,
      options: {
        temperature: opts.temperature ?? 0.5,
        num_predict: opts.maxTokens ?? 800,
      },
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Ollama ${res.status}: ${body.slice(0, 300)}`,
    );
  }
  if (!res.body) {
    throw new Error("Ollama returned no body");
  }

  return decodeSSE(res.body, "ollama");
}

// ============================================================================
// Provider : Disabled (fixture quand rien configure)
// ============================================================================

function streamDisabled(): ReadableStream<string> {
  const message =
    "Hex est en pause sur cette instance — aucune cle d'IA n'est configuree. " +
    "Pour activer la conversation, l'administrateur doit definir MISTRAL_API_KEY " +
    "(cloud) ou OLLAMA_BASE_URL (self-host). Cf. docs/HEX_AI.md";
  return new ReadableStream<string>({
    start(controller) {
      // Emet le message en plusieurs chunks pour simuler le streaming
      const tokens = message.split(/(\s+)/);
      let i = 0;
      const interval = setInterval(() => {
        if (i >= tokens.length) {
          clearInterval(interval);
          controller.close();
          return;
        }
        controller.enqueue(tokens[i]);
        i += 1;
      }, 20);
    },
  });
}

// ============================================================================
// Decoder SSE / NDJSON commun
// ============================================================================

/**
 * Decode le stream raw (Uint8Array) en un stream de strings (le delta texte
 * de chaque message). Supporte les deux formats :
 *   - Mistral : SSE format "data: {...}\n\n" avec event "[DONE]" final
 *   - Ollama : NDJSON {"message":{"content":"..."}} \n {"done":true}
 */
function decodeSSE(
  body: ReadableStream<Uint8Array>,
  provider: "mistral" | "ollama",
): ReadableStream<string> {
  const decoder = new TextDecoder("utf-8");

  return new ReadableStream<string>({
    async start(controller) {
      const reader = body.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Mistral : SSE "data: {...}\n\n"
          if (provider === "mistral") {
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? ""; // garder la derniere ligne (incomplete)
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              if (!trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (payload === "[DONE]") {
                controller.close();
                return;
              }
              try {
                const parsed = JSON.parse(payload) as {
                  choices?: { delta?: { content?: string } }[];
                };
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) controller.enqueue(delta);
              } catch {
                // Ligne malformee — on ignore, le stream continue
              }
            }
            continue;
          }

          // Ollama : NDJSON, un objet par ligne
          if (provider === "ollama") {
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              try {
                const parsed = JSON.parse(trimmed) as {
                  message?: { content?: string };
                  done?: boolean;
                };
                const delta = parsed.message?.content;
                if (delta) controller.enqueue(delta);
                if (parsed.done) {
                  controller.close();
                  return;
                }
              } catch {
                // Ignore lignes malformees
              }
            }
          }
        }
        // Stream termine sans event final explicite
        controller.close();
      } catch (e) {
        controller.error(e);
      } finally {
        try {
          reader.releaseLock();
        } catch {
          /* noop */
        }
      }
    },
  });
}
