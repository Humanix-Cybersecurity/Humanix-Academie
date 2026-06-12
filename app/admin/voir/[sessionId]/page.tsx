// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Page admin « Voir en tant que » - lecture seule du compte d'un
// utilisateur, sous reserve d'une ImpersonationSession ACTIVE et
// non expiree.
//
// SECURITE :
//  - Charge la session, verifie qu'elle existe et qu'elle est ACTIVE
//  - Verifie que l'admin connecte est bien celui qui a fait la demande
//  - Verifie que endsAt > now (sinon auto-marque ENDED + redirige)
//  - Log un AuditAction IMPERSONATION_VIEW a chaque chargement
//  - Toutes les donnees affichees sont du TARGET, pas de l'admin

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLog, AuditActions } from "@/lib/audit";
import EndImpersonationButton from "./EndImpersonationButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vue en tant que - Humanix Académie",
  description: "Consultation en lecture seule du compte d'un utilisateur.",
};

type Props = { params: Promise<{ sessionId: string }> };

function fmtDateTime(d: Date): string {
  return d.toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtRemaining(endsAt: Date): string {
  const diffMs = endsAt.getTime() - Date.now();
  if (diffMs <= 0) return "expiré";
  const mn = Math.floor(diffMs / 60000);
  if (mn < 60) return `${mn} min restantes`;
  const h = Math.floor(mn / 60);
  const remainder = mn % 60;
  return `${h}h${remainder.toString().padStart(2, "0")} restantes`;
}

export default async function ImpersonateAdminViewPage({ params }: Props) {
  const { sessionId } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect("/connexion?callbackUrl=/admin");
  }
  const role = session.user.role as string;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/");
  }

  const imp = await db.impersonationSession.findUnique({
    where: { id: sessionId },
    include: {
      targetUser: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          service: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          coins: true,
          level: true,
          tenantId: true,
        },
      },
      adminTenant: { select: { name: true } },
    },
  });

  if (!imp) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-extrabold text-primary-500 mb-3">
          Session introuvable
        </h1>
        <Link href="/admin/utilisateurs" className="btn-primary">
          Retour aux utilisateurs
        </Link>
      </div>
    );
  }

  // Verifications
  if (imp.adminUserId !== session.user.id) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-extrabold text-red-600 mb-3">
          Accès refusé
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Cette session d'accès en lecture a été ouverte par un autre
          administrateur.
        </p>
        <Link href="/admin/utilisateurs" className="btn-primary">
          Retour aux utilisateurs
        </Link>
      </div>
    );
  }

  if (imp.status !== "ACTIVE") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-6">🔚</div>
        <h1 className="text-3xl font-extrabold text-primary-500 mb-3">
          Session terminée
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Cette session d'accès est{" "}
          {imp.status === "REVOKED"
            ? "révoquée par l'utilisateur"
            : imp.status === "REJECTED"
              ? "refusée par l'utilisateur"
              : imp.status === "EXPIRED"
                ? "expirée (lien de consentement non utilisé)"
                : "terminée"}
          . Pour consulter ce compte à nouveau, faites une nouvelle
          demande.
        </p>
        <Link href="/admin/utilisateurs" className="btn-primary">
          Retour aux utilisateurs
        </Link>
      </div>
    );
  }

  if (imp.endsAt && imp.endsAt < new Date()) {
    // Auto-cleanup
    await db.impersonationSession.update({
      where: { id: imp.id },
      data: {
        status: "ENDED",
        endedAt: new Date(),
        endedReason: "expired",
      },
    });
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-6">⏰</div>
        <h1 className="text-3xl font-extrabold text-primary-500 mb-3">
          Session expirée
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Cette session a atteint sa durée maximale et a été
          automatiquement clôturée.
        </p>
        <Link href="/admin/utilisateurs" className="btn-primary">
          Retour aux utilisateurs
        </Link>
      </div>
    );
  }

  const target = imp.targetUser;

  // Audit : on log chaque chargement de la page « voir »
  await auditLog({
    action: AuditActions.IMPERSONATION_VIEW,
    actor: {
      userId: session.user.id as string,
      email: session.user.email as string | undefined,
      role,
    },
    tenantId: imp.adminTenantId,
    target: { type: "user", id: target.id, label: target.email },
    metadata: { impersonationId: imp.id, view: "dashboard" },
  });

  // Donnees a afficher (lecture seule, calculees server-side)
  const [progress, badges, recentEvents, groups, totalXpSum] =
    await Promise.all([
      db.progress.findMany({
        where: { userId: target.id },
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: {
          episodeId: true,
          status: true,
          score: true,
          bestScore: true,
          updatedAt: true,
          episode: {
            select: {
              title: true,
              saison: { select: { title: true, slug: true } },
            },
          },
        },
      }),
    db.userAchievement.findMany({
      where: { userId: target.id },
      orderBy: { unlockedAt: "desc" },
      take: 8,
      select: {
        unlockedAt: true,
        achievement: {
          select: { title: true, emoji: true },
        },
      },
    }),
    db.event.findMany({
      where: { userId: target.id },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        type: true,
        createdAt: true,
      },
    }),
    db.userGroup.findMany({
      where: { userId: target.id },
      select: {
        group: {
          select: { name: true, slug: true, emoji: true },
        },
      },
    }),
    db.progress.aggregate({
      where: { userId: target.id },
      _sum: { score: true },
    }),
  ]);
  const totalXp = totalXpSum._sum.score ?? 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* ============ BANDEAU TOP « impersonation active » ============ */}
      <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-500/40 p-4 mb-6 flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <div className="text-3xl shrink-0">👁️</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-amber-900 dark:text-amber-200">
            Vue en tant que {target.name || target.email}
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-100 mt-1">
            Mode lecture seule · session ouverte avec consentement explicite ·{" "}
            {imp.endsAt
              ? `expire à ${fmtDateTime(imp.endsAt)} (${fmtRemaining(imp.endsAt)})`
              : "session ouverte"}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 italic">
            Raison : « {imp.reason} »
          </p>
        </div>
        <EndImpersonationButton sessionId={imp.id} />
      </div>

      {/* ============ EN-TETE PROFIL ============ */}
      <header className="mb-8 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-6">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-2">
          Profil utilisateur - Lecture seule
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
          {target.name || target.email}
        </h1>
        <div className="text-sm text-gray-600 dark:text-gray-300 flex flex-wrap gap-x-4 gap-y-1">
          <span>
            <strong>Email :</strong>{" "}
            <code className="font-mono text-xs">{target.email}</code>
          </span>
          <span>
            <strong>Rôle :</strong> {target.role}
          </span>
          {target.service && (
            <span>
              <strong>Service :</strong> {target.service}
            </span>
          )}
          <span>
            <strong>Compte créé le :</strong>{" "}
            {target.createdAt.toLocaleDateString("fr-FR")}
          </span>
          {target.lastLoginAt && (
            <span>
              <strong>Dernière connexion :</strong>{" "}
              {fmtDateTime(target.lastLoginAt)}
            </span>
          )}
          <span>
            <strong>Statut :</strong>{" "}
            {target.isActive ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                actif
              </span>
            ) : (
              <span className="text-gray-500">désactivé</span>
            )}
          </span>
        </div>
      </header>

      {/* ============ STATS RAPIDES ============ */}
      <section className="grid sm:grid-cols-4 gap-3 mb-8">
        <div className="rounded-xl bg-primary-500/5 dark:bg-primary-500/10 border border-primary-500/20 p-4 text-center">
          <div className="text-3xl font-extrabold text-primary-500 mb-1">
            {target.level ?? 1}
          </div>
          <div className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
            Niveau
          </div>
        </div>
        <div className="rounded-xl bg-accent-500/5 dark:bg-accent-500/10 border border-accent-500/20 p-4 text-center">
          <div className="text-3xl font-extrabold text-accent-500 mb-1">
            {totalXp}
          </div>
          <div className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
            XP cumulés
          </div>
        </div>
        <div className="rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 p-4 text-center">
          <div className="text-3xl font-extrabold text-amber-600 mb-1">
            {target.coins ?? 0}
          </div>
          <div className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
            Coins
          </div>
        </div>
        <div className="rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
          <div className="text-3xl font-extrabold text-emerald-600 mb-1">
            {badges.length}
          </div>
          <div className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
            Badges
          </div>
        </div>
      </section>

      {/* ============ GROUPES ============ */}
      {groups.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            Équipes
          </h2>
          <div className="flex flex-wrap gap-2">
            {groups.map((g, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-300"
              >
                <span aria-hidden="true">{g.group.emoji}</span>
                {g.group.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ============ PROGRES RECENTS ============ */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
          10 dernières activités sur les modules
        </h2>
        {progress.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            Aucune activité sur les modules pour l'instant.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/60 text-left text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-2">Saison · Épisode</th>
                  <th className="px-4 py-2">Statut</th>
                  <th className="px-4 py-2 text-right">Score</th>
                  <th className="px-4 py-2 text-right">Mis à jour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {progress.map((p, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {p.episode?.title ?? p.episodeId}
                      </div>
                      <div className="text-xs text-gray-500">
                        {p.episode?.saison.title}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 dark:bg-slate-800">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {p.bestScore ?? p.score}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-gray-500 tabular-nums">
                      {fmtDateTime(p.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ============ BADGES ============ */}
      {badges.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            Badges débloqués
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {badges.map((b, i) => (
              <div
                key={i}
                className="rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 p-3 text-center"
              >
                <div className="text-3xl mb-1" aria-hidden="true">
                  {b.achievement.emoji}
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {b.achievement.title}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {b.unlockedAt.toLocaleDateString("fr-FR")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============ EVENEMENTS RECENTS ============ */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
          Journal d'activité (15 derniers événements)
        </h2>
        {recentEvents.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            Aucun événement récent.
          </p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {recentEvents.map((e, i) => (
              <li
                key={i}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-800/40"
              >
                <code className="font-mono text-xs text-primary-500 dark:text-accent-300 shrink-0">
                  {e.type}
                </code>
                <span className="text-xs text-gray-500 ml-auto tabular-nums shrink-0">
                  {fmtDateTime(e.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-12">
        Cette page est consultée en mode lecture seule, avec l'accord
        explicite de l'utilisateur. Chaque chargement est tracé dans le
        journal d'audit. La session se ferme automatiquement à{" "}
        {imp.endsAt ? fmtDateTime(imp.endsAt) : "la fin"} ou sur action
        manuelle.
      </p>
    </div>
  );
}
