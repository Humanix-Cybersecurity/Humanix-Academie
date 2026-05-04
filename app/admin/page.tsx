// Console dirigeant — vue agregee, KPIs, graphiques, suivi equipe.
//
// REFONTE MAI 2026 : ce composant ne gère PLUS le layout (sidebar, header,
// breadcrumb, wrapper centré). Tout cela est désormais dans
// `app/admin/layout.tsx` qui wrap automatiquement toutes les pages /admin/*.
//
// Cette page se concentre uniquement sur :
//   - le data fetching côté serveur (Prisma)
//   - le rendu du dashboard métier (AdminDashboard)
//
// Plus de wrapper max-w-7xl, plus de sidebar importée localement :
// layout natif Next.js dans app/admin/layout.tsx.
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Auth garantie par app/admin/layout.tsx (defense-in-depth déjà appliquée).
  // On récupère juste session pour le tenantId et la salutation.
  const session = await auth();
  const tenantId = session!.user.tenantId as string;

  const [users, saisons, allProgress] = await Promise.all([
    db.user.findMany({ where: { tenantId, role: "LEARNER" } }),
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            service: true,
            isActive: true,
          },
        },
        episode: true,
        saison: true,
      },
    }),
  ]);

  const activeUsers = users.filter((u) => u.isActive);
  const totalSeats = activeUsers.length;
  const seenAtLeastOne = new Set(allProgress.map((p) => p.user.id)).size;
  const activationRate =
    totalSeats === 0 ? 0 : Math.round((seenAtLeastOne / totalSeats) * 100);
  const completedEpisodes = allProgress.length;
  const totalEpisodes = saisons.reduce((s, sa) => s + sa.episodes.length, 0);

  // SEMANTIQUE IMPORTANTE : Progress.score stocke l'XP gagnee par episode (pas un %).
  // Un episode peut rapporter ~50 (xpReward) + jusqu'a 50 (quiz parfait : 5 questions x 10pts)
  // + ~50 (choix optimal scenario), soit ~150 XP au total. C'est volontaire :
  // le champ est utilise pour la gamification (level up, classement).
  // -> On affiche donc "XP moyens / episode" et NON "Score /100" pour eviter
  //    l'incoherence visuelle (ex: 132/100). La maitrise reelle du sujet est
  //    visible sur /admin/business via le User.riskScore (borne 0-100).
  const averageXpPerEpisode =
    allProgress.length === 0
      ? 0
      : Math.round(
          allProgress.reduce((s, p) => s + (p.score || 0), 0) /
            allProgress.length,
        );
  const totalXP = allProgress.reduce((s, p) => s + (p.score || 0), 0);

  // Score "maitrise" agrege au niveau tenant : moyenne des riskScore deja borne
  // dans lib/risk-score.ts (Math.max(0, Math.min(100, score))). C'est lui que
  // le dirigeant doit regarder en priorite, pas l'XP.
  const masteryAverage =
    activeUsers.length === 0
      ? 0
      : Math.round(
          activeUsers.reduce((s, u) => s + (u.riskScore ?? 50), 0) /
            activeUsers.length,
        );

  const saisonsBreakdown = saisons.map((s) => {
    const completedBy = new Set<string>();
    for (const u of activeUsers) {
      const userEps = allProgress.filter(
        (p) => p.user.id === u.id && p.saisonId === s.id,
      );
      if (s.episodes.length > 0 && userEps.length === s.episodes.length) {
        completedBy.add(u.id);
      }
    }
    return {
      name: s.title,
      emoji: s.coverEmoji,
      completed: completedBy.size,
      total: totalSeats,
      pct:
        totalSeats === 0
          ? 0
          : Math.round((completedBy.size / totalSeats) * 100),
    };
  });

  const teamProgress = activeUsers.map((u) => {
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
        ? formatRelativeDate(last.completedAt)
        : null,
    };
  });
  teamProgress.sort((a, b) => b.xp - a.xp);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const weeklyActivity = days.map((d) => {
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const count = allProgress.filter(
      (p) => p.completedAt && p.completedAt >= d && p.completedAt < next,
    ).length;
    return {
      day: d.toLocaleDateString("fr-FR", { weekday: "short" }),
      completions: count,
    };
  });

  // Salutation contextuelle selon l'heure (touche humaine, sympa pour le dirigeant).
  const hour = new Date().getHours();
  const greeting =
    hour < 6
      ? "Bonne nuit"
      : hour < 12
        ? "Bonjour"
        : hour < 18
          ? "Bon après-midi"
          : "Bonsoir";
  const firstName = (session!.user?.name ?? "").split(" ")[0] ?? "";

  return (
    <>
      {/* Header de page (le breadcrumb et l'avatar sont gérés par AdminTopBar
          du layout). On garde juste la salutation chaleureuse + la date. */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight">
            {greeting}
            {firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
            Voici l'état de la maturité cyber de ton équipe aujourd'hui.
          </p>
        </div>
        <time className="text-xs text-gray-500 dark:text-gray-400 shrink-0 capitalize">
          {new Date().toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </time>
      </header>

      <AdminDashboard
        stats={{
          totalSeats,
          activatedSeats: seenAtLeastOne,
          activationRate,
          completedEpisodes,
          totalEpisodes,
          averageXpPerEpisode,
          masteryAverage,
          totalXP,
        }}
        saisonsBreakdown={saisonsBreakdown}
        teamProgress={teamProgress}
        weeklyActivity={weeklyActivity}
      />
    </>
  );
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffH = (now.getTime() - date.getTime()) / 3600_000;
  if (diffH < 1) return "il y a < 1h";
  if (diffH < 24) return `il y a ${Math.round(diffH)}h`;
  const diffD = diffH / 24;
  if (diffD < 7) return `il y a ${Math.round(diffD)}j`;
  return date.toLocaleDateString("fr-FR");
}
