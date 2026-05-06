// SPDX-License-Identifier: AGPL-3.0-or-later
// GET /profil/donnees/export — RGPD article 20 : portabilite des donnees.
// Renvoie un JSON downloadable avec toutes les donnees personnelles de l'user.
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions, readIpFromHeaders } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
  }
  const userId = session.user.id as string;

  const [user, progress, events, notifications, webauthn] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        service: true,
        role: true,
        coins: true,
        level: true,
        riskScore: true,
        mascotSpecies: true,
        mascotEmojiCustom: true,
        mood: true,
        shareCount: true,
        emailVerified: true,
        mfaEnabled: true,
        mfaEnabledAt: true,
        passwordUpdatedAt: true,
        lastLoginAt: true,
        lastSeenAt: true,
        createdAt: true,
        tenant: { select: { name: true, slug: true, plan: true } },
        groups: {
          select: {
            joinedAt: true,
            isLead: true,
            group: { select: { name: true, slug: true } },
          },
        },
      },
    }),
    db.progress.findMany({
      where: { userId },
      select: {
        score: true,
        bestScore: true,
        quizScorePct: true,
        bestQuizScorePct: true,
        attempts: true,
        status: true,
        startedAt: true,
        completedAt: true,
        saison: { select: { slug: true, title: true } },
        episode: { select: { slug: true, title: true } },
      },
    }),
    db.event.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: { type: true, payload: true, createdAt: true },
    }),
    db.notificationLog.findMany({
      where: { userId },
      orderBy: { sentAt: "desc" },
      take: 1000,
      select: { type: true, channel: true, status: true, sentAt: true },
    }),
    db.webAuthnCredential.findMany({
      where: { userId },
      select: {
        deviceName: true,
        transports: true,
        backedUp: true,
        userVerified: true,
        createdAt: true,
        lastUsedAt: true,
      },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  }

  const exported = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    notice:
      "Export RGPD article 20 (portabilite). Donnees personnelles stockees par Humanix Academie a propos de vous.",
    profile: {
      id: user.id,
      email: user.email,
      name: user.name,
      service: user.service,
      role: user.role,
      organization: user.tenant,
      groups: user.groups.map((ug) => ({
        name: ug.group.name,
        slug: ug.group.slug,
        joinedAt: ug.joinedAt,
        isLead: ug.isLead,
      })),
      gamification: {
        coins: user.coins,
        level: user.level,
        riskScore: user.riskScore,
        mascotSpecies: user.mascotSpecies,
        mascotEmojiCustom: user.mascotEmojiCustom,
        mood: user.mood,
        shareCount: user.shareCount,
      },
      security: {
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
        mfaEnabledAt: user.mfaEnabledAt,
        passwordUpdatedAt: user.passwordUpdatedAt,
        webauthnCredentials: webauthn,
      },
      activity: {
        lastLoginAt: user.lastLoginAt,
        lastSeenAt: user.lastSeenAt,
        accountCreatedAt: user.createdAt,
      },
    },
    progress,
    events,
    notifications,
  };

  // Audit
  const h = await headers();
  await auditLog({
    action: AuditActions.DATA_EXPORTED,
    actor: { userId, email: user.email, role: user.role },
    tenantId: (session.user.tenantId as string) ?? null,
    target: { type: "user", id: userId, label: user.email },
    message: "Export RGPD art. 20 (portabilite)",
    ip: readIpFromHeaders(h),
  });

  return new NextResponse(JSON.stringify(exported, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="humanix-export-${user.email.replace(/[^a-z0-9]/gi, "_")}-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
