// Stream Server-Sent Events temps reel pour la Live Attack Map.
//
// Approche : long-polling des Event Prisma toutes les N secondes, push
// SSE vers le client. Pas besoin de WebSocket / Redis pour le volume
// PME (max ~100 events/heure).
//
// Securite :
//  - Auth ADMIN/MANAGER/SUPERADMIN uniquement
//  - Scoping tenant strict
//  - Heartbeat toutes les 25s pour eviter la fermeture proxy

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Edge ne supporte pas Prisma directement

const POLL_INTERVAL_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 25000;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("unauthorized", { status: 401 });
  }
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "SUPERADMIN") {
    return new Response("forbidden", { status: 403 });
  }
  const tenantId = session.user!.tenantId as string;

  const encoder = new TextEncoder();

  // Curseur : on pousse uniquement les events plus recents que ce timestamp
  let lastSeenAt = new Date(Date.now() - 60_000); // depart : 1 min en arriere

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        } catch {
          closed = true;
        }
      };

      // Initial : on annonce que le stream est ouvert
      send("ready", { startedAt: new Date().toISOString() });

      // Boucle de polling
      const poll = async () => {
        if (closed) return;
        try {
          const events = await db.event.findMany({
            where: {
              tenantId,
              createdAt: { gt: lastSeenAt },
              type: {
                in: [
                  "episode_completed",
                  "phishing_clicked",
                  "phishing_reported",
                  "shop_purchase",
                  "level_up",
                  "user_invited",
                  "saison_completed",
                ],
              },
            },
            orderBy: { createdAt: "asc" },
            include: {
              user: {
                select: { id: true, name: true, email: true, service: true },
              },
            },
            take: 50,
          });

          for (const e of events) {
            send("event", {
              id: e.id,
              type: e.type,
              createdAt: e.createdAt.toISOString(),
              user: e.user
                ? {
                    name: e.user.name ?? e.user.email.split("@")[0],
                    service: e.user.service,
                  }
                : null,
              payload: e.payload,
            });
            lastSeenAt = e.createdAt;
          }
        } catch (err) {
          // On log mais on ne casse pas le stream pour autant
          console.warn("[live-events] poll error:", err);
        }
      };

      const pollTimer = setInterval(poll, POLL_INTERVAL_MS);
      // Premier poll immediat
      poll();

      // Heartbeat pour que les proxys ne ferment pas la connexion
      const heartbeatTimer = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          closed = true;
        }
      }, HEARTBEAT_INTERVAL_MS);

      // Cleanup quand le client coupe la connexion
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no", // disable buffering pour Nginx/HAProxy si proxy
    },
  });
}
