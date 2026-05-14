// SPDX-License-Identifier: AGPL-3.0-or-later
//
// GET /api/admin/ciso-sync/[runId]/stream
//
// Server-Sent Events : streame les logs d'un CisoAssistantSyncRun pendant
// son execution. L'UI s'abonne via EventSource(), affiche dans le terminal,
// et reçoit un evenement final "done" avec le status et les counts.
//
// Auth : meme regle que les server actions -> ADMIN / RSSI / SUPERADMIN
// du tenant qui possede le run. Pas de cross-tenant.
//
// Strategie : poll DB chaque 400ms, push delta des logs au client. Quand
// le run.status passe de "running" a final, on envoie l'event "done" et
// on ferme le stream.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 400;
const MAX_DURATION_MS = 5 * 60 * 1000; // 5 min hard cap

export async function GET(
  _req: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    return new NextResponse("forbidden", { status: 403 });
  }
  const tenantId = session.user.tenantId as string;

  const run = await db.cisoAssistantSyncRun.findUnique({
    where: { id: runId },
    select: { id: true, tenantId: true, status: true },
  });
  if (!run || run.tenantId !== tenantId) {
    return new NextResponse("not_found", { status: 404 });
  }

  // Bytes envoyes au client. SSE format : "data: <json>\n\n" par evenement.
  // On envoie 2 types d'event : "log" (delta texte) + "done" (final summary).
  const encoder = new TextEncoder();
  let cursor = 0; // index du dernier byte envoye dans run.logs

  const stream = new ReadableStream({
    async start(controller) {
      const startedAt = Date.now();
      const send = (event: string, data: object) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };
      // Heartbeat initial pour fermer le buffer de proxy intermediaire.
      controller.enqueue(encoder.encode(": ok\n\n"));

      while (true) {
        if (Date.now() - startedAt > MAX_DURATION_MS) {
          send("done", { status: "timeout", message: "Stream timeout 5min" });
          break;
        }
        const fresh = await db.cisoAssistantSyncRun.findUnique({
          where: { id: runId },
          select: {
            status: true,
            logs: true,
            evidencesTotal: true,
            evidencesOk: true,
            evidencesFail: true,
            finishedAt: true,
          },
        });
        if (!fresh) {
          send("done", { status: "deleted", message: "Run disparu" });
          break;
        }
        if (fresh.logs.length > cursor) {
          const delta = fresh.logs.slice(cursor);
          cursor = fresh.logs.length;
          send("log", { text: delta });
        }
        if (fresh.status !== "running") {
          send("done", {
            status: fresh.status,
            total: fresh.evidencesTotal,
            ok: fresh.evidencesOk,
            fail: fresh.evidencesFail,
            finishedAt: fresh.finishedAt?.toISOString() ?? null,
          });
          break;
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // desactive buffering chez nginx/caddy
    },
  });
}
