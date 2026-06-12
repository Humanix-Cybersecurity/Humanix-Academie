// SPDX-License-Identifier: AGPL-3.0-or-later
// GET /api/v1/team-module-performance
//
// Agrege les performances d'une equipe (Group) sur un module (Saison ou
// MarketplaceModule) Humanix. Concu pour repondre a une question RSSI
// type :
//   "Qui dans mon equipe Marketing n'a pas compris la politique de
//    mots de passe ?"
//
// Utilise principalement par le MCP server pour les agents IA (Claude
// Desktop, Mistral, Ollama via CISO Assistant), mais consommable
// directement comme tout endpoint REST.
//
// Auth : API key tenant (modele ApiKey).
// Rate limit : 30 req/h par tenant.
//
// Reponse :
//   - module : { slug, title, totalEpisodes }
//   - group : { slug, name, memberCount } | null si pas filtre
//   - completion : { rate (0-1), completedUsers, totalUsers }
//   - quizScore : { average (0-100), median, failingUsers (count) }
//   - top_failing : top 5 utilisateurs avec le score le plus bas
//     (pseudonymises : hash + service)

import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { createHash } from "node:crypto";

export const dynamic = "force-dynamic";

const RATE_LIMIT_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1h
const FAILING_QUIZ_THRESHOLD = 60; // < 60% = echec

function pseudonymize(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 12);
}

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status ?? 401 },
    );
  }
  const tenantId = auth.tenantId!;

  const rl = checkRateLimit(
    `team-module-perf:${tenantId}`,
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "rate_limited",
        retryAfter: rl.retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const url = new URL(req.url);
  const moduleParam = url.searchParams.get("module");
  const teamParam = url.searchParams.get("team");

  if (!moduleParam) {
    return NextResponse.json(
      {
        error: "missing_parameter",
        message:
          "Le paramètre `module` est obligatoire (slug saison Humanix, ex: mots-de-passe).",
      },
      { status: 400 },
    );
  }

  // Résoudre la saison cible (par slug)
  const saison = await db.saison.findFirst({
    where: {
      slug: moduleParam,
      OR: [{ tenantId: null }, { tenantId }],
    },
    include: { episodes: { select: { id: true } } },
  });
  if (!saison) {
    return NextResponse.json(
      {
        error: "module_not_found",
        message: `Aucune saison Humanix avec slug "${moduleParam}".`,
      },
      { status: 404 },
    );
  }

  // Résoudre le groupe (optionnel)
  let group: { id: string; slug: string; name: string } | null = null;
  let memberIds: string[] | null = null;
  let memberCount: number | null = null;
  if (teamParam) {
    const g = await db.group.findFirst({
      where: { tenantId, slug: teamParam, isActive: true },
      include: { members: { select: { userId: true } } },
    });
    if (!g) {
      return NextResponse.json(
        {
          error: "team_not_found",
          message: `Aucun groupe avec slug "${teamParam}" sur ce tenant.`,
        },
        { status: 404 },
      );
    }
    group = { id: g.id, slug: g.slug, name: g.name };
    memberIds = g.members.map((m) => m.userId);
    memberCount = memberIds.length;
  }

  // Population de référence : users LEARNER actifs du tenant (filtrés par
  // group si fourni). Pour répondre à "qui dans Marketing...".
  const users = await db.user.findMany({
    where: {
      tenantId,
      isActive: true,
      role: "LEARNER",
      ...(memberIds ? { id: { in: memberIds } } : {}),
    },
    select: { id: true, name: true, service: true, email: true },
  });
  const totalUsers = users.length;
  const userIds = users.map((u) => u.id);

  // Progress de la population sur les episodes de la saison cible
  const episodeIds = saison.episodes.map((e) => e.id);
  const progress = await db.progress.findMany({
    where: {
      tenantId,
      userId: { in: userIds.length > 0 ? userIds : ["__none__"] },
      episodeId: { in: episodeIds.length > 0 ? episodeIds : ["__none__"] },
    },
    select: {
      userId: true,
      status: true,
      quizScorePct: true,
      bestQuizScorePct: true,
    },
  });

  // Aggregation : par utilisateur, quel % d'episodes complete et quel
  // meilleur score quiz moyen
  const perUser: Record<
    string,
    { completed: number; quizScores: number[] }
  > = {};
  for (const p of progress) {
    if (!perUser[p.userId]) perUser[p.userId] = { completed: 0, quizScores: [] };
    if (p.status === "COMPLETED") perUser[p.userId].completed += 1;
    const score = p.bestQuizScorePct ?? p.quizScorePct;
    if (score != null) perUser[p.userId].quizScores.push(score);
  }
  const completedUsers = Object.values(perUser).filter(
    (u) => u.completed >= episodeIds.length && episodeIds.length > 0,
  ).length;
  const completionRate = totalUsers > 0 ? completedUsers / totalUsers : 0;

  // Quiz : moyenne et médiane des best scores de chaque user (pour les
  // users qui ont au moins 1 tentative)
  const userAvgScores: { userId: string; avg: number }[] = [];
  for (const [userId, u] of Object.entries(perUser)) {
    if (u.quizScores.length === 0) continue;
    const avg =
      u.quizScores.reduce((s, v) => s + v, 0) / u.quizScores.length;
    userAvgScores.push({ userId, avg });
  }
  userAvgScores.sort((a, b) => a.avg - b.avg);
  const quizAvg =
    userAvgScores.length === 0
      ? null
      : Math.round(
          (userAvgScores.reduce((s, u) => s + u.avg, 0) / userAvgScores.length) *
            10,
        ) / 10;
  const quizMedian =
    userAvgScores.length === 0
      ? null
      : Math.round(userAvgScores[Math.floor(userAvgScores.length / 2)].avg * 10) /
        10;
  const failingUsers = userAvgScores.filter(
    (u) => u.avg < FAILING_QUIZ_THRESHOLD,
  );

  // Top 5 failing users - pseudonymisés (hash + service uniquement)
  const usersById = Object.fromEntries(users.map((u) => [u.id, u]));
  const topFailing = failingUsers.slice(0, 5).map((u) => ({
    pseudo: pseudonymize(u.userId),
    service: usersById[u.userId]?.service ?? null,
    quizAvgPct: Math.round(u.avg * 10) / 10,
  }));

  // Suggestion ressource Humanix : URL absolue vers le module dans la
  // console pour que le RSSI puisse drill-down.
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    `https://${req.headers.get("host") ?? "humanix-academie.fr"}`;

  return NextResponse.json({
    module: {
      slug: saison.slug,
      title: saison.title,
      totalEpisodes: episodeIds.length,
      url: `${baseUrl}/admin/modules/${saison.id}`,
    },
    group: group
      ? { slug: group.slug, name: group.name, memberCount: memberCount ?? 0 }
      : null,
    completion: {
      rate: Math.round(completionRate * 1000) / 1000,
      completedUsers,
      totalUsers,
    },
    quiz: {
      averagePct: quizAvg,
      medianPct: quizMedian,
      failingUsersCount: failingUsers.length,
      failingThresholdPct: FAILING_QUIZ_THRESHOLD,
    },
    top_failing: topFailing,
    meta: {
      tenant_id: tenantId,
      generated_at: new Date().toISOString(),
      privacy_note:
        "Utilisateurs pseudonymisés (SHA-256). Pas de PII brute exposée.",
    },
  });
}
