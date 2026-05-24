// SPDX-License-Identifier: AGPL-3.0-or-later
//
// POST /api/ai/chat
//
// Endpoint de chat conversationnel pour Hex (Phase 1 du roadmap IA).
// Streaming SSE multi-tour. Auth requise. Rate-limit par user + par plan.
//
// FORMAT :
//   Request body : { messages: [{role, content}, ...], context?: {...} }
//   Response     : text/event-stream avec events "data: {token}\n\n"
//                  Event final "data: [DONE]\n\n"
//
// SECURITE :
//   - Auth obligatoire (pas d'usage anonyme : coût API + traçage)
//   - Rate limit : 12 msg/h sur plan starter, 60 msg/h sur Pro+
//     (couvre le free tier Mistral "Experiment" sans le brûler)
//   - Validation Zod du body
//   - Le system prompt est INJECTE SERVEUR-SIDE — le client ne peut pas
//     l'overrider (sinon trivial jailbreak)
//   - Historique limite a 20 messages user/assistant (cap pour éviter
//     l'inflation tokens)

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/api/require-role";
import { checkRateLimit } from "@/lib/rate-limit";
import { streamChat, getProviderKind } from "@/lib/ai/provider";
import { buildSystemPrompt } from "@/lib/ai/hex/system-prompt";
import {
  buildEnrichedContext,
  buildToneAddendum,
} from "@/lib/ai/hex/context";
import { retrieveRagContext, formatRagContext } from "@/lib/ai/hex/rag";
import { wrapWithLeakFilter } from "@/lib/ai/hex/output-filter";
import { scanPii, describePiiHits } from "@/lib/security/pii-filter";
import { normalizePlan, type PlanId } from "@/lib/plans";
import { auditLog, AuditActions } from "@/lib/audit";

export const dynamic = "force-dynamic";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const Schema = z.object({
  messages: z.array(MessageSchema).min(1).max(20),
  context: z
    .object({
      currentRoute: z.string().max(200).optional(),
      currentModule: z.string().max(100).optional(),
    })
    .optional(),
});

// Rate-limit par plan : on protege le free tier Mistral (~1 req/s) sans
// frustrer les users Pro qui ont paye pour un usage soutenu.
const RATE_LIMIT_PER_HOUR: Record<PlanId, number> = {
  starter: 12,
  pro: 60,
  enterprise: 200,
};

export async function POST(req: Request) {
  // 1) Auth — RBAC central (cf. lib/api/require-role.ts)
  const guard = await requireSession();
  if ("response" in guard) return guard.response;
  const { session } = guard;
  const userId = session.user.id;
  const tenantId = session.user.tenantId;

  // 2) Provider disponible ?
  const provider = getProviderKind();
  if (provider === "disabled") {
    return NextResponse.json(
      {
        error:
          "Hex est en pause sur cette instance. L'administrateur doit configurer MISTRAL_API_KEY ou OLLAMA_BASE_URL.",
      },
      { status: 503 },
    );
  }

  // 3) Body validation
  let body: z.infer<typeof Schema>;
  try {
    const raw = await req.json();
    body = Schema.parse(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "invalid";
    return NextResponse.json(
      { error: `Requête invalide: ${msg.slice(0, 200)}` },
      { status: 400 },
    );
  }

  // Dernier message doit etre user (sinon on n'a rien a repondre)
  const last = body.messages[body.messages.length - 1];
  if (last.role !== "user") {
    return NextResponse.json(
      { error: "Le dernier message doit etre de role 'user'." },
      { status: 400 },
    );
  }

  // === PII filter (defense en profondeur Zero-Trust) ===
  // L'humain peut copier-coller son IBAN / email perso / numero de
  // tel par reflexe. On ne veut PAS envoyer ces donnees a l'API
  // Mistral (mineur fournisseur tiers, RGPD oui mais minimisation
  // = principe). On scan le dernier message + on substitue les PII
  // par des placeholders AVANT d'envoyer au LLM. Le client recoit
  // une notice en metadata pour afficher un warning UX.
  const piiScan = scanPii(last.content);
  let piiNotice: { detected: boolean; summary: string } | null = null;
  if (piiScan.hasPii) {
    last.content = piiScan.redacted;
    piiNotice = {
      detected: true,
      summary: describePiiHits(piiScan.hits),
    };
  }

  // 4) Rate limit par plan
  let plan: PlanId = "starter";
  if (tenantId) {
    try {
      const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true },
      });
      plan = normalizePlan(tenant?.plan);
    } catch {
      // DB down ? on degrade en plan le plus restrictif
      plan = "starter";
    }
  }
  const limit = RATE_LIMIT_PER_HOUR[plan];
  const rl = checkRateLimit(`hex-chat:${userId}`, limit, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error:
          `Tu as atteint la limite de ${limit} messages par heure sur ton plan. ` +
          "Reessaye dans un moment, ou passe sur un plan superieur pour augmenter la cadence.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfter / 1000)) },
      },
    );
  }

  // 5) Construction du contexte enrichi (Phase 2)
  //    - lit Progress recents pour pointer "tu viens de finir X"
  //    - calcule score moyen 30j pour adapter le ton (encouragement vs challenge)
  const enrichedCtx = await buildEnrichedContext({
    userId,
    tenantId,
    userName: session.user.name,
    userRole: session.user.role,
    userPlan: plan,
    currentRoute: body.context?.currentRoute,
    currentModule: body.context?.currentModule,
  });

  // 6) RAG sur les modules MDX (Phase 3)
  //    - embedding du dernier message user
  //    - retrieve top-K chunks depuis pgvector
  //    - injection en system addendum + retour des citations au client
  const ragResult = await retrieveRagContext({
    query: last.content,
    topK: 4,
  });

  // 7) Construction du system prompt final
  const basePrompt = buildSystemPrompt(enrichedCtx);
  const toneAddendum = buildToneAddendum(enrichedCtx);
  const ragAddendum = formatRagContext(ragResult.chunks);
  const systemPrompt = [basePrompt, toneAddendum, ragAddendum]
    .filter(Boolean)
    .join("");

  // 8) Streaming Mistral / Ollama
  let upstream: ReadableStream<string>;
  try {
    upstream = await streamChat({
      messages: [
        { role: "system", content: systemPrompt },
        ...body.messages,
      ],
      temperature: 0.5,
      maxTokens: 800,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ai_error";
    console.error("hex-chat: provider error", msg);
    return NextResponse.json(
      { error: "Hex a rencontre un probleme technique. Reessaye dans un instant." },
      { status: 502 },
    );
  }

  // 8 bis) Pentest fix #2 (2026-05-24) — defense en profondeur prompt
  // injection : on wrappe le stream avec un filtre qui detecte les fuites
  // de signatures du system prompt (cf. lib/ai/hex/output-filter.ts).
  // En cas de detection : remplace par un refus standard + audit log
  // AI_PROMPT_INJECTION_ATTEMPT pour traçabilite.
  upstream = wrapWithLeakFilter(upstream, async (match) => {
    try {
      await auditLog({
        action: AuditActions.AI_PROMPT_INJECTION_ATTEMPT,
        actor: { id: userId, email: session.user.email ?? "unknown" },
        tenantId,
        target: { type: "ai_chat", id: userId, label: "hex" },
        message: "Tentative de fuite du system prompt Hex detectee (signature match)",
        // On NE logue PAS le match exact pour eviter de re-stocker un fragment
        // du prompt dans l'audit log. On logue uniquement les meta utiles
        // pour l'investigation.
        metadata: {
          signature_length: match.length,
          last_user_message_preview: last.content.slice(0, 200),
        },
      });
    } catch (err) {
      console.error("hex-chat: audit log AI_PROMPT_INJECTION_ATTEMPT failed", err);
    }
  });

  // 9) Encoder le stream texte en SSE pour le client
  //    - 1er event : pii notice (si on a masque des donnees)
  //    - 2e event : citations (si RAG a retrouve des chunks)
  //    - puis : delta par delta jusqu'au [DONE]
  const encoder = new TextEncoder();
  const sseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // PII notice : on previent l'user qu'on a masque des PII avant
      // d'envoyer son message a Mistral. UX rassurante + transparence.
      if (piiNotice) {
        const piiEvent = `data: ${JSON.stringify({ pii: piiNotice })}\n\n`;
        controller.enqueue(encoder.encode(piiEvent));
      }

      // Citations metadata (consommees par HexChat.tsx pour afficher
      // les badges "📚 Source : <module>")
      if (ragResult.chunks.length > 0) {
        const citations = ragResult.chunks.map((c) => ({
          title: c.title,
          sourcePath: c.sourcePath,
          url: c.url,
          score: Math.round(c.score * 100) / 100,
        }));
        const citationsEvent = `data: ${JSON.stringify({ citations })}\n\n`;
        controller.enqueue(encoder.encode(citationsEvent));
      }

      const reader = upstream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // Format SSE : "data: {json}\n\n". On encode en JSON pour preserver
          // les sauts de ligne et caracteres speciaux dans le delta.
          const event = `data: ${JSON.stringify({ delta: value })}\n\n`;
          controller.enqueue(encoder.encode(event));
        }
        // Event final
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "stream_error";
        console.error("hex-chat: stream error", msg);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "stream interrompu" })}\n\n`,
          ),
        );
      } finally {
        controller.close();
        try {
          reader.releaseLock();
        } catch {
          /* noop */
        }
      }
    },
  });

  return new Response(sseStream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Permet au client de detecter le provider (mistral / ollama) si
      // besoin (UX : afficher "Self-host" badge en mode Ollama)
      "X-Hex-Provider": provider,
    },
  });
}
