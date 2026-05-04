// Endpoint POST : envoi des rappels aux inactifs
// Peut etre appele :
//  - manuellement depuis la console (bouton)
//  - automatiquement par un cron externe (header X-Cron-Secret)
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { auth } from "@/lib/auth";
import { sendReminders, findInactiveUsers } from "@/lib/notifications";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Constant-time compare pour éviter les attaques par timing.
// Refuse aussi les comparaisons à secret vide (CRON_SECRET non configuré).
function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  // Auth admin OU cron
  const session = await auth();
  const cronSecret = req.headers.get("x-cron-secret");

  let tenantId: string | null = null;
  if (cronSecret && safeEqual(cronSecret, process.env.CRON_SECRET ?? "")) {
    // Cron externe : preview pour TOUS les tenants
    const tenants = await db.tenant.findMany({ select: { id: true } });
    let totalCandidates = 0;
    for (const t of tenants) {
      const c = await findInactiveUsers(t.id);
      totalCandidates += c.length;
    }
    return NextResponse.json({ totalCandidates, tenants: tenants.length });
  }

  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  tenantId = session.user!.tenantId;
  if (!tenantId) return NextResponse.json({ error: "no_tenant" }, { status: 400 });

  const candidates = await findInactiveUsers(tenantId);
  return NextResponse.json({
    candidates: candidates.length,
    preview: candidates.slice(0, 10).map((c) => ({
      name: c.user.name ?? c.user.email,
      daysSince: c.daysSince,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  const cronSecret = req.headers.get("x-cron-secret");

  let tenantId: string | null = null;

  if (cronSecret && safeEqual(cronSecret, process.env.CRON_SECRET ?? "")) {
    // Cron : envoi pour tous les tenants
    const tenants = await db.tenant.findMany({ select: { id: true } });
    const results = [];
    for (const t of tenants) {
      const r = await sendReminders(t.id);
      results.push({ tenantId: t.id, ...r });
    }
    return NextResponse.json({ ok: true, results });
  }

  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  tenantId = session.user!.tenantId;
  if (!tenantId) return NextResponse.json({ error: "no_tenant" }, { status: 400 });

  const result = await sendReminders(tenantId);
  return NextResponse.json({ ok: true, ...result });
}
