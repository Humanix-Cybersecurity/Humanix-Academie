// SPDX-License-Identifier: AGPL-3.0-or-later
// Page profil utilisateur - refonte simplifiee mai 2026 (suite refonte
// cosy de mai 2026).
//
// Brief : "le plus fluide, le plus simple pour les utilisateurs. On
// privilegie la simplicite plutot qu'un cockpit d'avion ou il faut un
// doctorat pour piloter."
//
// Refonte mai 2026 : suppression de la duplication des modules. Avant,
// les episodes apparaissaient 3 fois :
//   - Section "À polir" en cards (score < 70 %)
//   - Section "Tes pépites" en cards (top 3 scores)
//   - Section "Tous tes épisodes" en liste/table (TOUS, avec actions)
// La liste 6 contenait deja tout le necessaire : nom, saison, score,
// date, action "Refaire" ou "Ameliorer". Les 2 sections en cards
// dupliquaient juste l'information.
//
// Maintenant : UNE seule vue, la liste. Avec actions "Refaire" /
// "Ameliorer" conservees (l'apprenant garde l'option de rejouer un
// episode pour monter en maitrise).
//
// Logique metier preservee : queries Prisma, computeRiskScore, streak,
// abonnement Cyber-Anecdote.
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, getSignInPath } from "@/lib/auth";
import { db } from "@/lib/db";
import HexBackdrop from "@/components/HexBackdrop";
import HexMascotEvolved, {
  LevelProgressBar,
} from "@/components/HexMascotEvolved";
import RiskScoreCard from "@/components/RiskScoreCard";
import AnecdoteSubscribeForm from "@/components/AnecdoteSubscribeForm";
import { getLevel } from "@/lib/levels";
import { buildEquippedFromInventory } from "@/lib/shop";
import { computeRiskScore } from "@/lib/risk-score";

export const dynamic = "force-dynamic";

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ saison?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect(getSignInPath());
  const userId = session.user!.id as string;

  // Filtre saison optionnel (?saison=<slug>) : permet a l'apprenant de
  // ne voir que les episodes d'une saison precise dans son journal de
  // bord. Pas de filtre = on montre tout. Pattern identique a /librairie.
  const { saison: saisonFilter } = await searchParams;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      progress: {
        include: { episode: true, saison: true },
        orderBy: { completedAt: "desc" },
      },
      inventory: {
        where: { isEquipped: true },
        include: { item: true },
      },
    },
  });
  if (!user) redirect(getSignInPath());

  const equipped = buildEquippedFromInventory(
    user.inventory.map((i) => ({ item: i.item, isEquipped: i.isEquipped })),
  );
  const risk = await computeRiskScore(userId);

  const totalXP = user.progress.reduce((s, p) => s + (p.score || 0), 0);
  const completedCount = user.progress.filter(
    (p) => p.status === "COMPLETED",
  ).length;
  const totalEpisodes = await db.episode.count({
    where: { isPublished: true },
  });
  const level = getLevel(totalXP);

  // Streak
  const completedDates = user.progress
    .filter((p) => p.completedAt)
    .map((p) => p.completedAt!);
  const streak = computeStreak(completedDates);

  // Etat d'abonnement a la newsletter Cyber-Anecdote du Lundi
  const anecdoteSub = await db.anecdoteSubscription.findUnique({
    where: { email: user.email.toLowerCase() },
    select: { isActive: true },
  });
  const isSubscribed = !!anecdoteSub?.isActive;

  // Seuil "score parfait" : sert uniquement au styling de la couleur
  // (vert >=70 %, ambre sinon) et au choix du label CTA ("Refaire" pour
  // un episode reussi, "Ameliorer" sinon). Pas de filtrage : on affiche
  // tous les episodes dans une seule liste.
  const PERFECT_THRESHOLD = 70;

  // Liste des saisons sur lesquelles l'apprenant a un progres, deduplee
  // et ordonnee par premiere apparition (= ordre chronologique inverse,
  // saison la plus recemment travaillee en premier). Sert a generer les
  // pills de filtre au-dessus du journal de bord.
  const saisonsBySlug = new Map<
    string,
    { slug: string; title: string; emoji: string; count: number }
  >();
  for (const p of user.progress) {
    const existing = saisonsBySlug.get(p.saison.slug);
    if (existing) {
      existing.count += 1;
    } else {
      saisonsBySlug.set(p.saison.slug, {
        slug: p.saison.slug,
        title: p.saison.title,
        emoji: p.saison.coverEmoji,
        count: 1,
      });
    }
  }
  const availableSaisons = [...saisonsBySlug.values()];

  // Filtre actif : on ne garde que les progres de la saison choisie.
  // Si la saison demandee n'existe pas dans le progres de l'user, on
  // tombe en silence sur "tous" (pas d'erreur, on log juste).
  const filteredProgress = saisonFilter
    ? user.progress.filter((p) => p.saison.slug === saisonFilter)
    : user.progress;

  const firstName = user.name?.split(" ")[0] ?? user.email.split("@")[0];

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* ============================================================
          1. HERO - espace personnel cosy
          ============================================================ */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section
          aria-labelledby="hero-title"
          className="max-w-5xl mx-auto px-4 pt-12 pb-10 sm:pt-16 sm:pb-12"
        >
          <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
            <div>
              <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
                Mon espace
              </p>
              <h1
                id="hero-title"
                className="font-display text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight"
              >
                Bonjour, {firstName}.
              </h1>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 italic mt-2">
                Le bilan tranquille de ton voyage cyber.
              </p>
            </div>
            {user.progress.length > 0 && (
              <a
                href="/api/me/certificate"
                download
                className="btn-secondary text-sm py-3 px-5 whitespace-nowrap"
              >
                <span aria-hidden="true">🎓</span> Télécharger mon certificat
              </a>
            )}
          </div>

          {/* Hero card : Mascot + Niveau + XP, palette niveau adaptive */}
          <div
            className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${level.bgGradient} border-2 ${level.ringColor.replace("ring-", "border-")} p-6 sm:p-8 shadow-sm`}
          >
            <div className="grid sm:grid-cols-[auto_1fr] gap-8 items-center">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-float">
                  <HexMascotEvolved
                    xp={totalXP}
                    size="hero"
                    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                    mood={(user.mood ?? "happy") as any}
                    showLevel
                    animated
                    equipped={equipped}
                    species={user.mascotSpecies}
                    customEmoji={user.mascotEmojiCustom}
                  />
                </div>
                <Link
                  href="/profil/mascotte"
                  className="text-xs text-accent-700 dark:text-accent-300 hover:text-accent-600 font-medium underline-offset-4 hover:underline"
                >
                  🎭 Changer de mascotte
                </Link>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-xs uppercase tracking-widest text-gray-600 dark:text-gray-400 font-bold">
                    {user.name ?? user.email.split("@")[0]}
                  </span>
                  {user.service && (
                    <span className="text-xs bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-full px-2.5 py-0.5 text-gray-700 dark:text-gray-200">
                      {user.service}
                    </span>
                  )}
                  <Link
                    href="/profil/infos"
                    className="text-xs text-accent-700 dark:text-accent-300 hover:text-accent-600 font-medium underline-offset-4 hover:underline"
                    title="Modifier mon nom et mon service"
                  >
                    ✎ Modifier
                  </Link>
                </div>
                <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-1">
                  Niveau {level.id}
                </p>
                <h2 className="font-display text-2xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 mb-2 leading-tight">
                  {level.name}
                </h2>
                <p className="text-gray-700 dark:text-gray-200 mb-4 italic">
                  « {level.description} »
                </p>
                <LevelProgressBar xp={totalXP} />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                  <SoftStat
                    emoji="⚡"
                    value={totalXP.toString()}
                    label="XP gagnés"
                  />
                  <SoftStat
                    emoji="🪙"
                    value={user.coins.toString()}
                    label="Coins"
                  />
                  <SoftStat
                    emoji="🔥"
                    value={streak.toString()}
                    label={streak <= 1 ? "jour" : "jours"}
                  />
                  <SoftStat
                    emoji="✓"
                    value={`${completedCount}`}
                    label={`/ ${totalEpisodes}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </HexBackdrop>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
        {/* ============================================================
            2. SCORE DE RISQUE CYBER
            ============================================================ */}
        <RiskScoreCard risk={risk} />

        {/* ============================================================
            3. NEWSLETTER OPT-IN - chaleureux, pas insistant
            ============================================================ */}
        {!isSubscribed && (
          <section
            aria-labelledby="profile-anecdote-title"
            className="rounded-3xl bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-amber-950/30 dark:via-slate-900 dark:to-yellow-950/20 border-2 border-amber-200 dark:border-amber-900/40 p-6 sm:p-8"
          >
            <div className="grid sm:grid-cols-[auto_1fr] gap-5 items-center">
              <div className="text-5xl animate-float" aria-hidden="true">
                ☕
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] font-bold text-amber-700 dark:text-amber-300 mb-2">
                  Newsletter facultative
                </p>
                <h2
                  id="profile-anecdote-title"
                  className="font-display text-xl sm:text-2xl font-extrabold text-primary-500 dark:text-amber-200 mb-2"
                >
                  La Cyber-Anecdote du Lundi
                </h2>
                <p className="text-sm text-gray-700 dark:text-gray-200 mb-4 leading-relaxed">
                  Chaque lundi avec ton café : 1 vraie histoire cyber + 1 leçon
                  + 1 mini-action. 5 minutes pour rester en alerte tranquille
                  toute la semaine.
                </p>
                <AnecdoteSubscribeForm
                  source="profile"
                  variant="inline"
                  defaultEmail={user.email}
                />
              </div>
            </div>
          </section>
        )}
        {isSubscribed && (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic px-2 text-center">
            <span aria-hidden="true">☕</span> Tu reçois la Cyber-Anecdote du
            Lundi. Le lien de désinscription est dans chaque email.
          </p>
        )}

        {/* ============================================================
            4. JOURNAL DE BORD - liste unique de tous les episodes
            (anciennement section 6, simplifie : on a retire les
            doublons "À polir" en cards et "Tes pépites" en cards qui
            recopiaient l'information deja dans cette liste).
            ============================================================ */}
        <section aria-labelledby="all-title">
          <div className="text-center mb-6 sm:text-left">
            <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-1">
              Ton journal de bord
            </p>
            <h2
              id="all-title"
              className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300"
            >
              {saisonFilter
                ? `${filteredProgress.length} épisode${filteredProgress.length > 1 ? "s" : ""} sur cette saison`
                : `Tous tes épisodes (${filteredProgress.length})`}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 italic mt-1">
              Le score en vert : c'est solide. En ambre : tu peux encore
              gagner du terrain — clique sur « Améliorer » pour rejouer.
            </p>
          </div>

          {/* Filtres par saison — pills cliquables au-dessus de la
              liste. Affichees seulement si l'apprenant a un progres sur
              au moins 2 saisons (sinon le filtre n'a pas de sens). */}
          {availableSaisons.length >= 2 && (
            <nav
              aria-label="Filtrer par saison"
              className="flex flex-wrap gap-2 mb-5"
            >
              <Link
                href="/profil"
                aria-current={!saisonFilter ? "page" : undefined}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border-2 ${
                  !saisonFilter
                    ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                    : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:border-accent-500 hover:-translate-y-0.5"
                }`}
              >
                Tous{" "}
                <span className="opacity-70 tabular-nums">
                  ({user.progress.length})
                </span>
              </Link>
              {availableSaisons.map((s) => (
                <Link
                  key={s.slug}
                  href={`/profil?saison=${s.slug}`}
                  aria-current={saisonFilter === s.slug ? "page" : undefined}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border-2 inline-flex items-center gap-1.5 ${
                    saisonFilter === s.slug
                      ? "bg-primary-500 text-white border-primary-500 shadow-sm"
                      : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:border-accent-500 hover:-translate-y-0.5"
                  }`}
                >
                  <span aria-hidden="true">{s.emoji}</span>
                  <span>{s.title}</span>
                  <span className="opacity-70 tabular-nums">
                    ({s.count})
                  </span>
                </Link>
              ))}
            </nav>
          )}

          {user.progress.length === 0 ? (
            <div className="card text-center py-16 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 border-emerald-200 dark:border-emerald-900/40">
              <p
                className="text-6xl mb-4 inline-block animate-float"
                aria-hidden="true"
              >
                🌱
              </p>
              <h3 className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-2">
                Ton voyage commence quand tu veux
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                Aucun épisode terminé pour le moment. Pas de pression - quand
                tu te sens prêt·e, c'est par ici.
              </p>
              <Link href="/apprendre" className="btn-primary">
                Commencer ma première saison <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Historique de votre progression pedagogique : episodes
                  completes, saison d'origine, score quiz, date d'achèvement
                </caption>
                <thead className="text-left text-gray-500 dark:text-gray-400 border-b-2 border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="pb-3 font-bold text-xs uppercase tracking-wider">
                      Épisode
                    </th>
                    <th className="pb-3 font-bold text-xs uppercase tracking-wider">
                      Saison
                    </th>
                    <th className="pb-3 font-bold text-xs uppercase tracking-wider">
                      Score
                    </th>
                    <th className="pb-3 font-bold text-xs uppercase tracking-wider">
                      Quand
                    </th>
                    <th className="pb-3 font-bold text-xs uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProgress.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-gray-500 dark:text-gray-400 italic"
                      >
                        Aucun épisode pour cette saison —{" "}
                        <Link
                          href="/profil"
                          className="text-accent-500 hover:underline"
                        >
                          voir tous les épisodes
                        </Link>
                      </td>
                    </tr>
                  )}
                  {filteredProgress.map((p) => {
                    const score = p.score ?? 0;
                    const perfect = score >= PERFECT_THRESHOLD;
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-gray-200 dark:border-slate-700 last:border-0 hover:bg-accent-50/30 dark:hover:bg-slate-800/50 transition"
                      >
                        <td className="py-3 font-medium text-gray-900 dark:text-gray-100">
                          {p.episode.title}
                        </td>
                        <td className="py-3 text-gray-600 dark:text-gray-300">
                          <span aria-hidden="true">{p.saison.coverEmoji}</span>{" "}
                          {p.saison.title}
                        </td>
                        <td className="py-3 tabular-nums">
                          <span
                            className={`font-bold ${perfect ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}
                          >
                            {score} XP
                          </span>
                          {perfect && (
                            <span
                              className="ml-1 text-xs text-emerald-600 dark:text-emerald-400"
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-gray-500 dark:text-gray-400 text-xs italic">
                          {p.completedAt ? formatDate(p.completedAt) : "—"}
                        </td>
                        <td className="py-3">
                          <Link
                            href={`/apprendre/${p.saison.slug}/${p.episode.slug}`}
                            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full transition ${
                              perfect
                                ? "text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700"
                                : "text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60"
                            }`}
                            title={
                              perfect
                                ? "Refaire l'episode (par exemple pour le montrer a un collegue)"
                                : `Ameliorer ton score actuel (${score} XP)`
                            }
                          >
                            {perfect ? (
                              <>
                                <span aria-hidden="true">↻</span> Refaire
                              </>
                            ) : (
                              <>
                                <span aria-hidden="true">↑</span> Améliorer
                              </>
                            )}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ============================================================
            5. RESPIRATION - citation finale signature
            ============================================================ */}
        <section className="text-center pt-4">
          <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            «{" "}
            {streak >= 7
              ? "Une semaine de régularité, c'est plus précieux qu'un mois de sprint. Tu construis du réflexe."
              : completedCount >= 5
                ? "Tu as déjà un bagage solide. Continue d'aiguiser tes réflexes, sans pression."
                : "Chaque épisode ajoute une corde à ton arc. La maîtrise se construit doucement."}{" "}
            »
          </blockquote>
          <p
            aria-hidden="true"
            className="mt-4 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
          >
            - Hex veille
          </p>
        </section>
      </div>
    </main>
  );
}

// ===========================================================================
// SOUS-COMPOSANTS LOCAUX
// ===========================================================================

function SoftStat({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-white/50 dark:border-slate-700/50 p-3 text-center shadow-sm">
      <p className="text-base" aria-hidden="true">
        {emoji}
      </p>
      <p className="font-display text-lg sm:text-xl font-extrabold text-primary-500 dark:text-accent-300 tabular-nums">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
        {label}
      </p>
    </div>
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffH = (now.getTime() - new Date(date).getTime()) / 3600_000;
  if (diffH < 1) return "à l'instant";
  if (diffH < 24) return `il y a ${Math.round(diffH)} h`;
  const diffD = diffH / 24;
  if (diffD < 7) return `il y a ${Math.round(diffD)} j`;
  return new Date(date).toLocaleDateString("fr-FR");
}

function computeStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const days = new Set(
    dates.map((d) => {
      const dd = new Date(d);
      dd.setHours(0, 0, 0, 0);
      return dd.getTime();
    }),
  );
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let cursor = today.getTime();
  const ONE_DAY = 24 * 3600 * 1000;
  if (!days.has(cursor)) cursor -= ONE_DAY;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= ONE_DAY;
  }
  return streak;
}
