// SPDX-License-Identifier: AGPL-3.0-or-later
// Stats utilisateur : XP / coins / level — utilisees dans le HeaderBar
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLevel } from "@/lib/levels";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = session.user!.id as string;
  const tenantId = session.user!.tenantId as string | undefined;
  if (!tenantId)
    return NextResponse.json({ error: "no_tenant" }, { status: 400 });

  // Filtrage tenantId explicite : si un user est migré entre tenants,
  // on ne renvoie QUE les stats du tenant actif (pas un cumul historique).
  const [user, progress] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { coins: true, mascotSpecies: true },
    }),
    db.progress.findMany({
      where: { userId, tenantId },
      select: { score: true },
    }),
  ]);
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const xp = progress.reduce((s, p) => s + (p.score || 0), 0);
  const level = getLevel(xp);

  return NextResponse.json({
    xp,
    coins: user.coins,
    level: level.id,
    levelName: level.name,
    mascotSpecies: user.mascotSpecies,
  });
}
