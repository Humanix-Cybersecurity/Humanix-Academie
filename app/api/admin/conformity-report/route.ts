// SPDX-License-Identifier: AGPL-3.0-or-later
// Generation et telechargement du rapport de conformite PDF
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ConformityReport } from "@/lib/pdf-report";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "MANAGER" && role !== "SUPERADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const tenantId = session.user!.tenantId as string;

  const [tenant, users, saisons, allProgress] = await Promise.all([
    db.tenant.findUnique({ where: { id: tenantId } }),
    db.user.findMany({ where: { tenantId, role: "LEARNER", isActive: true } }),
    // Multi-tenant : saisons globales + custom du tenant uniquement
    db.saison.findMany({
      where: {
        isPublished: true,
        OR: [{ tenantId: null }, { tenantId }],
      },
      include: { episodes: true },
    }),
    db.progress.findMany({
      where: { tenantId, status: "COMPLETED" },
      include: {
        user: { select: { id: true, name: true, email: true, service: true } },
      },
    }),
  ]);

  if (!tenant)
    return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  const totalSeats = users.length;
  const seenAtLeastOne = new Set(allProgress.map((p) => p.user.id)).size;
  const activationRate =
    totalSeats === 0 ? 0 : Math.round((seenAtLeastOne / totalSeats) * 100);
  const completedEpisodes = allProgress.length;
  const totalEpisodes = saisons.reduce((s, sa) => s + sa.episodes.length, 0);
  // Sur le rapport NIS2/conformite : on utilise le score de MAITRISE (riskScore
  // moyen, borne 0..100) plutot que la moyenne des Progress.score qui est de
  // l'XP brute (peut depasser 100, faux ami sur un PDF de conformite). L'XP
  // brute reste expose en "totalXP" pour la gamification.
  const averageScore =
    totalSeats === 0
      ? 0
      : Math.round(
          users.reduce((s, u) => s + (u.riskScore ?? 50), 0) / totalSeats,
        );
  const conformityScore = Math.round(
    activationRate * 0.4 +
      (completedEpisodes / Math.max(totalEpisodes * totalSeats, 1)) * 100 * 0.6,
  );

  const saisonsBreakdown = saisons.map((s) => {
    const completedBy = new Set<string>();
    for (const u of users) {
      const userEps = allProgress.filter(
        (p) => p.user.id === u.id && p.saisonId === s.id,
      );
      if (s.episodes.length > 0 && userEps.length === s.episodes.length) {
        completedBy.add(u.id);
      }
    }
    return {
      name: s.title,
      completed: completedBy.size,
      total: totalSeats,
      pct:
        totalSeats === 0
          ? 0
          : Math.round((completedBy.size / totalSeats) * 100),
    };
  });

  const team = users.map((u) => {
    const ups = allProgress.filter((p) => p.user.id === u.id);
    const last = ups.sort(
      (a, b) =>
        (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0),
    )[0];
    return {
      name: u.name || u.email.split("@")[0],
      service: u.service ?? "—",
      episodesDone: ups.length,
      totalEpisodes,
      xp: ups.reduce((s, p) => s + (p.score || 0), 0),
      lastActivity: last?.completedAt
        ? new Date(last.completedAt).toLocaleDateString("fr-FR")
        : null,
    };
  });
  team.sort((a, b) => b.xp - a.xp);

  const generatedBy = session.user.name ?? session.user!.email ?? "Admin";

  const buffer = await renderToBuffer(
    ConformityReport({
      tenantName: tenant.name,
      generatedAt: new Date(),
      generatedBy,
      stats: {
        totalSeats,
        activatedSeats: seenAtLeastOne,
        activationRate,
        completedEpisodes,
        totalEpisodes,
        averageScore,
        conformityScore,
      },
      saisonsBreakdown,
      team,
    }),
  );

  const filename = `humanix-conformite-${tenant.slug}-${new Date().toISOString().split("T")[0]}.pdf`;

  return new NextResponse(buffer as any, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
