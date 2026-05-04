// Endpoint cron : envoie l'anecdote du lundi a tous les abonnes.
// Protection : header X-Cron-Secret + timing-safe compare.
// Frequence cible : tous les lundis a 8h00 (a planifier dans le cron OS / Vercel cron).
//
// Auth alternative : un admin/superadmin authentifie peut aussi declencher (POST manuel).

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { auth } from "@/lib/auth";
import { dispatchWeeklyAnecdote } from "@/lib/anecdotes/dispatcher";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min : laisse le temps d'envoyer a beaucoup d'abonnes

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

async function checkAuth(
  req: Request,
): Promise<{ authorized: boolean; reason?: string }> {
  // 1. Cron header
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret && safeEqual(cronSecret, process.env.CRON_SECRET ?? "")) {
    return { authorized: true };
  }
  // 2. Admin authentifie
  const session = await auth();
  if (!session?.user) return { authorized: false, reason: "unauthorized" };
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return { authorized: false, reason: "forbidden" };
  }
  return { authorized: true };
}

export async function POST(req: Request) {
  const auth = await checkAuth(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.reason ?? "unauthorized" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const force = body?.force === true;
  const anecdoteId =
    typeof body?.anecdoteId === "string" ? body.anecdoteId : undefined;

  const result = await dispatchWeeklyAnecdote({ force, anecdoteId });
  return NextResponse.json(result);
}

// GET = preview (qui sera envoye, a combien d'abonnes) sans rien envoyer
export async function GET(req: Request) {
  const auth = await checkAuth(req);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.reason ?? "unauthorized" },
      { status: 401 },
    );
  }

  const { db } = await import("@/lib/db");
  const subsCount = await db.anecdoteSubscription.count({
    where: { isActive: true },
  });
  const next = await db.weeklyAnecdote.findFirst({
    where: { isActive: true, publishedAt: null },
    orderBy: [{ scheduledFor: "asc" }, { incidentDate: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      category: true,
      scheduledFor: true,
      incidentDate: true,
    },
  });
  return NextResponse.json({
    activeSubscribers: subsCount,
    nextAnecdote: next,
  });
}
