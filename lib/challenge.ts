// Helpers pour le mode challenge equipe
import { db } from "@/lib/db";

export async function getActiveChallenge(tenantId: string) {
  const challenge = await db.teamChallenge.findFirst({
    where: { tenantId, isActive: true, endDate: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  return challenge;
}

// Calcule le classement par service durant la periode du challenge
export async function getChallengeRanking(
  tenantId: string,
  startDate: Date,
  endDate: Date,
) {
  const progress = await db.progress.findMany({
    where: {
      tenantId,
      status: "COMPLETED",
      completedAt: { gte: startDate, lte: endDate },
    },
    include: {
      user: { select: { id: true, service: true, name: true, isActive: true } },
    },
  });

  // Agregation par service
  const services = new Map<
    string,
    { service: string; xp: number; episodes: number; users: Set<string> }
  >();
  for (const p of progress) {
    if (!p.user.isActive) continue;
    const svc = p.user.service ?? "Sans service";
    if (!services.has(svc)) {
      services.set(svc, { service: svc, xp: 0, episodes: 0, users: new Set() });
    }
    const s = services.get(svc)!;
    s.xp += p.score ?? 0;
    s.episodes += 1;
    s.users.add(p.user.id);
  }

  const ranking = [...services.values()]
    .map((s) => ({
      service: s.service,
      xp: s.xp,
      episodes: s.episodes,
      participants: s.users.size,
      avgPerParticipant: s.users.size > 0 ? Math.round(s.xp / s.users.size) : 0,
    }))
    .sort((a, b) => b.xp - a.xp);

  return ranking;
}

// Top 10 individuel pendant la periode du challenge
export async function getChallengeIndividualRanking(
  tenantId: string,
  startDate: Date,
  endDate: Date,
) {
  const progress = await db.progress.findMany({
    where: {
      tenantId,
      status: "COMPLETED",
      completedAt: { gte: startDate, lte: endDate },
    },
    include: {
      user: { select: { id: true, name: true, service: true, isActive: true } },
    },
  });

  const users = new Map<
    string,
    {
      userId: string;
      name: string;
      service: string | null;
      xp: number;
      episodes: number;
    }
  >();
  for (const p of progress) {
    if (!p.user.isActive) continue;
    if (!users.has(p.user.id)) {
      users.set(p.user.id, {
        userId: p.user.id,
        name: p.user.name ?? "—",
        service: p.user.service,
        xp: 0,
        episodes: 0,
      });
    }
    const u = users.get(p.user.id)!;
    u.xp += p.score ?? 0;
    u.episodes += 1;
  }
  return [...users.values()].sort((a, b) => b.xp - a.xp).slice(0, 10);
}
