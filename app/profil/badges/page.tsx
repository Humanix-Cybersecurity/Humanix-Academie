// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /profil/badges
//
// Collection complete des badges du user : debloques (avec date) +
// non debloques (description visible, sauf isSecret qui sont masques).
//
// Layout par catégorie : progression / consistency / mastery / social
// / special. Chaque badge a une carte avec couleur de rarete + state
// debloque/non.
//
// Auth requise. La page sert aussi de preview du parcours (un user
// voit ce qui l'attend, ca le pousse a continuer).

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ACHIEVEMENTS_CATALOG,
  type AchievementCategory,
  type AchievementRarity,
  type AchievementDef,
} from "@/lib/achievements/catalog";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  progression: "Progression",
  consistency: "Régularité",
  mastery: "Maîtrise",
  social: "Communauté",
  special: "Spécial",
};

const CATEGORY_EMOJI: Record<AchievementCategory, string> = {
  progression: "🚀",
  consistency: "🔥",
  mastery: "🎓",
  social: "🤝",
  special: "✨",
};

const RARITY_STYLES: Record<
  AchievementRarity,
  { ring: string; text: string; bg: string; label: string }
> = {
  common: {
    ring: "ring-1 ring-gray-200 dark:ring-slate-700",
    text: "text-gray-600 dark:text-gray-400",
    bg: "bg-white dark:bg-slate-900",
    label: "Commun",
  },
  rare: {
    ring: "ring-2 ring-cyan-300 dark:ring-cyan-700",
    text: "text-cyan-700 dark:text-cyan-300",
    bg: "bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/30 dark:to-slate-900",
    label: "Rare",
  },
  epic: {
    ring: "ring-2 ring-purple-300 dark:ring-purple-700",
    text: "text-purple-700 dark:text-purple-300",
    bg: "bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-slate-900",
    label: "Épique",
  },
  legendary: {
    ring: "ring-2 ring-amber-300 dark:ring-amber-600",
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-gradient-to-br from-amber-50 via-yellow-50 to-white dark:from-amber-950/30 dark:to-slate-900",
    label: "Légendaire",
  },
};

export default async function ProfilBadgesPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const userId = session.user.id as string;

  const unlocked = await db.userAchievement.findMany({
    where: { userId },
    select: {
      unlockedAt: true,
      achievement: { select: { slug: true } },
    },
  });
  const unlockedMap = new Map(
    unlocked.map((u) => [u.achievement.slug, u.unlockedAt]),
  );

  const totalCatalog = ACHIEVEMENTS_CATALOG.length;
  const unlockedCount = unlocked.length;
  const totalPoints = ACHIEVEMENTS_CATALOG.filter((a) =>
    unlockedMap.has(a.slug),
  ).reduce((s, a) => s + a.points, 0);

  // Group par category dans l'ordre canonique
  const catégories: AchievementCategory[] = [
    "progression",
    "consistency",
    "mastery",
    "social",
    "special",
  ];

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12 animate-fadeIn">
      <header className="mb-8">
        <Link
          href="/profil"
          className="text-sm text-accent-500 hover:text-accent-600 underline-offset-4 hover:underline mb-3 inline-block"
        >
          ← Retour au profil
        </Link>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 mb-2">
          🏆 Mes badges
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Ta collection grandit avec toi. Chaque badge marque un cap concret de
          ta pratique cyber.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3 max-w-md">
          <Stat label="Débloqués" value={`${unlockedCount} / ${totalCatalog}`} />
          <Stat
            label="Progression"
            value={`${Math.round((unlockedCount / Math.max(totalCatalog, 1)) * 100)} %`}
          />
          <Stat label="Points de gloire" value={totalPoints.toString()} />
        </div>
      </header>

      <div className="space-y-10">
        {catégories.map((cat) => {
          const items = ACHIEVEMENTS_CATALOG.filter((a) => a.category === cat);
          if (items.length === 0) return null;
          return (
            <section key={cat}>
              <header className="flex items-center gap-2 mb-4">
                <span className="text-2xl" aria-hidden="true">
                  {CATEGORY_EMOJI[cat]}
                </span>
                <h2 className="font-display text-xl font-extrabold text-gray-900 dark:text-gray-100">
                  {CATEGORY_LABELS[cat]}
                </h2>
                <span className="text-xs text-gray-500 ml-auto tabular-nums">
                  {items.filter((a) => unlockedMap.has(a.slug)).length} /{" "}
                  {items.length}
                </span>
              </header>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {items.map((a) => (
                  <BadgeCard
                    key={a.slug}
                    achievement={a}
                    unlockedAt={unlockedMap.get(a.slug) ?? null}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-3 text-center">
      <p className="font-display text-xl sm:text-2xl font-extrabold text-primary-500 dark:text-accent-300 tabular-nums">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 mt-0.5">
        {label}
      </p>
    </div>
  );
}

function BadgeCard({
  achievement: a,
  unlockedAt,
}: {
  achievement: AchievementDef;
  unlockedAt: Date | null;
}) {
  const isUnlocked = unlockedAt !== null;
  const isHiddenSecret = a.isSecret && !isUnlocked;
  const r = RARITY_STYLES[a.rarity];

  if (isHiddenSecret) {
    return (
      <article className="rounded-2xl border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 p-4 text-center opacity-70">
        <p className="text-3xl mb-2 grayscale" aria-hidden="true">
          ❓
        </p>
        <p className="font-bold text-sm text-gray-500 dark:text-gray-400">
          Badge secret
        </p>
        <p className="text-[11px] text-gray-400 italic mt-1">
          Continue ton parcours pour le découvrir.
        </p>
      </article>
    );
  }

  return (
    <article
      className={`rounded-2xl ${r.ring} ${r.bg} p-4 text-center transition-all hover:-translate-y-0.5 ${
        isUnlocked ? "" : "opacity-50 grayscale"
      }`}
      title={a.description}
    >
      <p className="text-4xl mb-2" aria-hidden="true">
        {a.emoji}
      </p>
      <p className="font-bold text-sm text-gray-900 dark:text-gray-100 leading-tight">
        {a.title}
      </p>
      <p className={`text-[10px] uppercase tracking-widest font-bold ${r.text} mt-1`}>
        {r.label} · {a.points} pts
      </p>
      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-2 leading-snug min-h-[2.5em]">
        {a.description}
      </p>
      {isUnlocked && unlockedAt && (
        <p className="text-[10px] text-emerald-700 dark:text-emerald-300 italic mt-2 font-medium">
          ✓ Débloqué le {unlockedAt.toLocaleDateString("fr-FR")}
        </p>
      )}
    </article>
  );
}
