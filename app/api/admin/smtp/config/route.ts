// SPDX-License-Identifier: AGPL-3.0-or-later
//
// API config SMTP par tenant.
//
//   GET    /api/admin/smtp/config  -> renvoie la config sans le password
//   PUT    /api/admin/smtp/config  -> sauve une nouvelle config (password chiffre)
//   DELETE /api/admin/smtp/config  -> supprime la config
//
// SECURITE :
//   - ADMIN/RSSI/SUPERADMIN du tenant uniquement
//   - Le password n'est JAMAIS retourne en GET (meme chiffre). Le UI
//     affiche un placeholder "•••••••••" et l'admin doit re-saisir
//     pour modifier.
//   - Audit log a chaque create/update/delete

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";
import { encryptSmtpPassword } from "@/lib/smtp/encryption";

export const dynamic = "force-dynamic";

const PutSchema = z.object({
  host: z.string().min(2).max(255),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().min(1).max(255),
  // Le password est optionnel en update : si absent ou vide, on conserve
  // l'ancien (l'admin met juste a jour le host par exemple).
  password: z.string().max(500).optional(),
  fromEmail: z.string().email(),
  fromName: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

async function checkAdmin(): Promise<
  | { ok: true; tenantId: string; userId: string; email: string; role: string }
  | { ok: false; status: number; error: string }
> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  const role = session.user.role as string;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    return { ok: false, status: 403, error: "forbidden" };
  }
  const tenantId = session.user!.tenantId as string;
  if (!tenantId) {
    return { ok: false, status: 400, error: "no_tenant" };
  }
  return {
    ok: true,
    tenantId,
    userId: session.user!.id as string,
    email: (session.user!.email as string) ?? "",
    role,
  };
}

export async function GET() {
  const ctx = await checkAdmin();
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const cfg = await db.tenantSmtpConfig.findUnique({
    where: { tenantId: ctx.tenantId },
    select: {
      host: true,
      port: true,
      secure: true,
      username: true,
      // SURTOUT PAS passwordEnc : on n'expose rien meme chiffre
      fromEmail: true,
      fromName: true,
      isVerified: true,
      lastVerifiedAt: true,
      lastError: true,
      notes: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    configured: !!cfg,
    config: cfg,
  });
}

export async function PUT(req: Request) {
  const ctx = await checkAdmin();
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = PutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Si password absent en update, on conserve l'ancien. Si create, password
  // est obligatoire.
  const existing = await db.tenantSmtpConfig.findUnique({
    where: { tenantId: ctx.tenantId },
    select: { passwordEnc: true },
  });

  if (!existing && (!data.password || data.password.trim().length === 0)) {
    return NextResponse.json(
      { error: "password_required_on_create" },
      { status: 400 },
    );
  }

  const passwordEnc =
    data.password && data.password.trim().length > 0
      ? encryptSmtpPassword(data.password)
      : existing!.passwordEnc;

  await db.tenantSmtpConfig.upsert({
    where: { tenantId: ctx.tenantId },
    create: {
      tenantId: ctx.tenantId,
      host: data.host,
      port: data.port,
      secure: data.secure,
      username: data.username,
      passwordEnc,
      fromEmail: data.fromEmail,
      fromName: data.fromName ?? null,
      notes: data.notes ?? null,
      // Reset isVerified : la nouvelle config doit etre re-testee
      isVerified: null,
      lastVerifiedAt: null,
      lastError: null,
    },
    update: {
      host: data.host,
      port: data.port,
      secure: data.secure,
      username: data.username,
      passwordEnc,
      fromEmail: data.fromEmail,
      fromName: data.fromName ?? null,
      notes: data.notes ?? null,
      // Reset isVerified : changer un parametre invalide la verif precedente
      isVerified: null,
      lastVerifiedAt: null,
      lastError: null,
    },
  });

  await auditLog({
    action: AuditActions.TENANT_SMTP_CONFIGURED,
    actor: { userId: ctx.userId, email: ctx.email, role: ctx.role },
    tenantId: ctx.tenantId,
    metadata: {
      host: data.host,
      port: data.port,
      secure: data.secure,
      fromEmail: data.fromEmail,
      passwordChanged: !!data.password,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const ctx = await checkAdmin();
  if (!ctx.ok) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const deleted = await db.tenantSmtpConfig.deleteMany({
    where: { tenantId: ctx.tenantId },
  });

  if (deleted.count > 0) {
    await auditLog({
      action: AuditActions.TENANT_SMTP_DELETED,
      actor: { userId: ctx.userId, email: ctx.email, role: ctx.role },
      tenantId: ctx.tenantId,
    });
  }

  return NextResponse.json({ ok: true, deleted: deleted.count > 0 });
}
