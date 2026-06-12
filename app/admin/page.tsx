// SPDX-License-Identifier: AGPL-3.0-or-later
// Console dirigeant - vue agrégée, KPIs, graphiques, suivi équipe.
//
// REFONTE MAI 2026 (cosy / charmant / impactant) : la page wrap le dashboard
// avec une intro chaleureuse facon "rituel matinal" :
//   - Hero card HexBackdrop avec salutation contextuelle (Bonjour Florian)
//   - Phrase d'accueil cosy "voici le rituel - ce qui demande l'attention,
//     ce qui va bien" (vs "etat de maturite" un peu froid)
//   - Citation finale "Hex veille" pour signer la page
//   - Animations slide-up cascadees (idx * 80ms)
//
// Le dashboard métier (AdminDashboard) reste inchangé - c'est l'outil de
// pilotage avec recharts, KPIs, viz complexes. La cosy-fication s'opere
// autour de lui, pas au sein.
//
// Plus de wrapper max-w-7xl, plus de sidebar importée localement :
// layout natif Next.js dans app/admin/layout.tsx.
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentTenantId } from "@/lib/current-tenant";
import AdminDashboard from "@/components/AdminDashboard";
import HexBackdrop from "@/components/HexBackdrop";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Auth garantie par app/admin/layout.tsx (défense en profondeur déjà appliquée).
  // On récupère juste session pour le tenantId et la salutation.
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized: no session");
  }
  // Resout le tenant ACTIF (sous-domaine + membership) plutot que d'utiliser
  // toujours session.user.tenantId. Permet a un SUPERADMIN avec membership
  // de voir le dashboard du tenant cible plutot que celui de son home.
  const tenantId = await getCurrentTenantId();

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
  // -> On affiche donc "XP moyens / episode" et NON "Score /100" pour éviter
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

  // Score "maitrise" agrege au niveau tenant : moyenne des riskScore déjà borne
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
      service: u.service ?? "-",
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
  const firstName = (session!.user?.name ?? "").split(" ")[0];

  // Phrase d'accueil contextualisee selon les stats - touche cosy
  // (vs "voici l'etat de maturite" generique). On adapte au contexte reel.
  const hint =
    totalSeats === 0
      ? "L'équipe n'est pas encore activee. Premiere etape sereine : inviter les premiers explorateurs."
      : seenAtLeastOne === 0
        ? "Personne n'a encore franchi la porte d'apprendre. Un petit message d'invitation peut declencher la dynamique."
        : activationRate >= 80
          ? "L'équipe est bien lancee. Aujourd'hui, c'est plus de polissage que d'urgence."
          : activationRate >= 40
            ? "La dynamique est lancee. Quelques personnes meritent un coup de main pour rejoindre le groupe."
            : "Le decollage est encore timide. Une relance bienveillante peut reveiller les premiers reflexes.";

  return (
    <div className="animate-fadeIn space-y-8">
      {/* ============================================================
          1. HERO COSY - salutation + rituel matinal + date
          ============================================================ */}
      <HexBackdrop intensity="soft" className="rounded-3xl overflow-hidden">
        <header className="relative px-6 sm:px-10 py-8 sm:py-10 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 border-2 border-primary-200 dark:border-primary-900/40 rounded-3xl shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p
                className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2 animate-slide-up"
                style={{ animationDelay: "60ms" }}
              >
                Console dirigeant · rituel du jour
              </p>
              <h1
                className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight animate-slide-up"
                style={{ animationDelay: "140ms" }}
              >
                {greeting}
                {firstName ? `, ${firstName}` : ""}{" "}
                <span aria-hidden="true">👋</span>
              </h1>
              <p
                className="text-base sm:text-lg text-gray-700 dark:text-gray-200 mt-3 max-w-2xl leading-relaxed animate-slide-up"
                style={{ animationDelay: "240ms" }}
              >
                {hint}
              </p>
            </div>
            <time
              className="text-xs text-gray-500 dark:text-gray-400 shrink-0 capitalize tabular-nums animate-fadeIn rounded-full bg-white/80 dark:bg-slate-800/60 px-3 py-1.5 border border-gray-200 dark:border-slate-700"
              style={{ animationDelay: "320ms" }}
            >
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </time>
          </div>
        </header>
      </HexBackdrop>

      {/* ============================================================
          2. DASHBOARD METIER - recharts + KPI + suivi équipe
          ============================================================ */}
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

      {/* ============================================================
          3. CITATION FINALE - signature cosy "Hex veille"
          ============================================================ */}
      <section
        aria-label="Mot du fondateur"
        className="text-center pt-4 pb-2 animate-fadeIn"
        style={{ animationDelay: "200ms" }}
      >
        <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
          « Piloter une culture cyber, c'est moins une chasse aux failles
          qu'une attention reguliere - comme entretenir un jardin. Aujourd'hui,
          observe. Demain, arrose. »
        </blockquote>
        <p
          aria-hidden="true"
          className="mt-3 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
        >
          - Hex veille ·{" "}
          <Link
            href="/admin/business"
            className="underline hover:text-accent-500"
          >
            voir l'impact business
          </Link>
        </p>
      </section>
    </div>
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
