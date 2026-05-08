// SPDX-License-Identifier: AGPL-3.0-or-later
// /admin/dpo - Dashboard DPO interne.
//
// Concretise la roadmap promise sur la page publique /dpo.
//
// Donnees affichees (toutes derivees du modele AuditLog existant) :
//   - Compteurs RGPD des 90 derniers jours (acces, exports, effacements,
//     consentements donnes/retires)
//   - Queue des demandes d'effacement (article 17) en cours, avec flag
//     "en retard" si > 30 jours sans completion
//   - Activite RGPD recente (50 dernieres actions)
//   - Lien vers le generateur AIPD (sous-page /admin/dpo/aipd)
//   - Liens vers les modules pedagogiques de la saison dpo-quotidien
//
// Roles autorises : ADMIN, RSSI, SUPERADMIN.
// Note : on n'a pas encore de role "DPO" dedie dans le schema - un DPO
// externe accede aujourd'hui via un compte ADMIN. Sujet a discuter en
// follow-up (creer un Role.DPO ?).

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";

export const dynamic = "force-dynamic";

const NINETY_DAYS_MS = 90 * 24 * 3600 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 3600 * 1000;

export default async function AdminDpoPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/admin");
  }

  const tenantId = session.user.tenantId as string;
  const since = new Date(Date.now() - NINETY_DAYS_MS);

  // 1. Compteurs RGPD sur 90 jours
  const counts = await db.auditLog.groupBy({
    by: ["action"],
    where: {
      tenantId,
      createdAt: { gte: since },
      action: {
        in: [
          "DATA_ACCESSED",
          "DATA_EXPORTED",
          "DATA_ERASURE_REQUESTED",
          "DATA_ERASURE_COMPLETED",
          "CONSENT_GIVEN",
          "CONSENT_WITHDRAWN",
        ],
      },
    },
    _count: { _all: true },
  });

  const countsByAction: Record<string, number> = {};
  for (const c of counts) {
    countsByAction[c.action] = c._count._all;
  }

  // 2. Queue des demandes d'effacement en attente
  // Pour un cas reel : on cherche les DATA_ERASURE_REQUESTED qui n'ont pas de
  // DATA_ERASURE_COMPLETED ulterieur sur le meme targetId (utilisateur).
  const erasureRequests = await db.auditLog.findMany({
    where: {
      tenantId,
      action: "DATA_ERASURE_REQUESTED",
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const erasureCompletions = await db.auditLog.findMany({
    where: {
      tenantId,
      action: "DATA_ERASURE_COMPLETED",
      createdAt: { gte: since },
    },
    select: { targetId: true, createdAt: true },
  });

  const completionsByTarget = new Map<string, Date>();
  for (const c of erasureCompletions) {
    if (!c.targetId) continue;
    const existing = completionsByTarget.get(c.targetId);
    if (!existing || c.createdAt > existing) {
      completionsByTarget.set(c.targetId, c.createdAt);
    }
  }

  type QueueRow = {
    id: string;
    targetLabel: string | null;
    targetId: string | null;
    requestedAt: Date;
    completedAt: Date | null;
    isLate: boolean;
    daysSince: number;
  };
  const now = Date.now();
  const queue: QueueRow[] = erasureRequests.map((r) => {
    const completedAt =
      r.targetId && completionsByTarget.get(r.targetId)
        ? completionsByTarget.get(r.targetId) ?? null
        : null;
    const daysSince = Math.round(
      (now - r.createdAt.getTime()) / (24 * 3600 * 1000),
    );
    return {
      id: r.id,
      targetLabel: r.targetLabel,
      targetId: r.targetId,
      requestedAt: r.createdAt,
      completedAt,
      isLate: !completedAt && now - r.createdAt.getTime() > THIRTY_DAYS_MS,
      daysSince,
    };
  });

  const pendingCount = queue.filter((q) => !q.completedAt).length;
  const lateCount = queue.filter((q) => q.isLate).length;

  // 3. Activite RGPD recente
  const recent = await db.auditLog.findMany({
    where: {
      tenantId,
      action: {
        in: [
          "DATA_ACCESSED",
          "DATA_EXPORTED",
          "DATA_ERASURE_REQUESTED",
          "DATA_ERASURE_COMPLETED",
          "CONSENT_GIVEN",
          "CONSENT_WITHDRAWN",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Espace DPO"
        description="Demandes RGPD, journal d'audit, AIPD generator. Tout ce qu'un DPO interne ou mutualise consulte au quotidien."
        icon="🛡"
        actions={
          <Link
            href="/admin/dpo/aipd"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 transition shadow-sm"
          >
            <span aria-hidden="true">📝</span>
            Generateur AIPD
          </Link>
        }
      />

      {/* ============================================================
          1. Compteurs RGPD - 90 derniers jours
          ============================================================ */}
      <AdminSection
        title="Vue d'ensemble · 90 derniers jours"
        description="Activite RGPD globale du tenant. Source : AuditLog."
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <CounterCard
            emoji="👁"
            label="Acces aux donnees"
            value={countsByAction.DATA_ACCESSED ?? 0}
            tone="info"
          />
          <CounterCard
            emoji="📤"
            label="Exports (article 20)"
            value={countsByAction.DATA_EXPORTED ?? 0}
            tone="info"
          />
          <CounterCard
            emoji="🗑"
            label="Effacements demandes"
            value={countsByAction.DATA_ERASURE_REQUESTED ?? 0}
            tone="warning"
          />
          <CounterCard
            emoji="✅"
            label="Effacements termines"
            value={countsByAction.DATA_ERASURE_COMPLETED ?? 0}
            tone="success"
          />
          <CounterCard
            emoji="✓"
            label="Consentements donnes"
            value={countsByAction.CONSENT_GIVEN ?? 0}
            tone="success"
          />
          <CounterCard
            emoji="✗"
            label="Consentements retires"
            value={countsByAction.CONSENT_WITHDRAWN ?? 0}
            tone="warning"
          />
        </div>
      </AdminSection>

      {/* ============================================================
          2. Queue demandes d'effacement
          ============================================================ */}
      <AdminSection
        title="Queue des demandes d'effacement (article 17)"
        description={
          pendingCount === 0
            ? "Aucune demande en attente. La queue est a jour."
            : `${pendingCount} demande${pendingCount > 1 ? "s" : ""} en attente · ${lateCount} en retard (> 30 jours)`
        }
        action={
          <Link
            href="/admin/audit?action=DATA_ERASURE_REQUESTED"
            className="text-sm text-accent-500 hover:underline font-medium"
          >
            Voir tout l'historique →
          </Link>
        }
      >
        {queue.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            Aucune demande d'effacement enregistree dans les 90 derniers jours.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm min-w-[600px]">
              <caption className="sr-only">
                Demandes d'effacement RGPD article 17 enregistrees dans les
                90 derniers jours, avec personne concernee, date de demande,
                etat de traitement et delai legal restant
              </caption>
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700 text-left">
                  <th className="p-2 font-medium text-gray-700 dark:text-gray-300">
                    Personne concernee
                  </th>
                  <th className="p-2 font-medium text-gray-700 dark:text-gray-300">
                    Demande recue
                  </th>
                  <th className="p-2 font-medium text-gray-700 dark:text-gray-300">
                    Etat
                  </th>
                  <th className="p-2 font-medium text-gray-700 dark:text-gray-300">
                    Delai
                  </th>
                </tr>
              </thead>
              <tbody>
                {queue.map((q) => (
                  <tr
                    key={q.id}
                    className="border-b border-gray-100 dark:border-slate-800"
                  >
                    <td className="p-2 text-gray-800 dark:text-gray-200">
                      {q.targetLabel ?? q.targetId ?? "—"}
                    </td>
                    <td className="p-2 text-gray-600 dark:text-gray-400 tabular-nums">
                      {q.requestedAt.toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-2">
                      {q.completedAt ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                          <span aria-hidden="true">✅</span>
                          Termine le{" "}
                          {q.completedAt.toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      ) : q.isLate ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs font-bold">
                          <span aria-hidden="true">⚠</span>
                          En retard
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
                          <span aria-hidden="true">⏳</span>
                          En cours
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-gray-600 dark:text-gray-400 tabular-nums">
                      {q.daysSince} j
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>

      {/* ============================================================
          3. Activite RGPD recente
          ============================================================ */}
      <AdminSection
        title="Activite RGPD recente"
        description={`${recent.length} derniere${recent.length > 1 ? "s" : ""} action${recent.length > 1 ? "s" : ""} sur les donnees personnelles`}
        action={
          <Link
            href="/admin/audit"
            className="text-sm text-accent-500 hover:underline font-medium"
          >
            Journal complet →
          </Link>
        }
      >
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            Aucune activite RGPD enregistree.
          </p>
        ) : (
          <ul className="space-y-2">
            {recent.map((r) => (
              <li
                key={r.id}
                className="flex items-start gap-3 text-sm border-b border-gray-100 dark:border-slate-800 last:border-0 pb-2"
              >
                <span className="text-lg shrink-0" aria-hidden="true">
                  {ACTION_EMOJI[r.action] ?? "•"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 dark:text-gray-200">
                    <span className="font-medium">
                      {ACTION_LABEL[r.action] ?? r.action}
                    </span>
                    {r.targetLabel && (
                      <>
                        {" "}
                        ·{" "}
                        <span className="text-gray-600 dark:text-gray-400">
                          {r.targetLabel}
                        </span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                    {r.createdAt.toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {r.actorEmail && ` · ${r.actorEmail}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      {/* ============================================================
          4. Ressources DPO
          ============================================================ */}
      <AdminSection
        title="Ressources DPO"
        description="Modules pedagogiques et outils pour le quotidien du DPO"
        variant="muted"
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <ResourceLink
            href="/admin/dpo/aipd"
            emoji="📝"
            title="Generateur AIPD"
            description="Modele d'analyse d'impact pre-rempli, exportable en Markdown"
          />
          <ResourceLink
            href="/apprendre/dpo-quotidien/01-aipd"
            emoji="📚"
            title="Module AIPD"
            description="Mener une AIPD avec le PIA Tool CNIL, sans cabinet"
          />
          <ResourceLink
            href="/apprendre/dpo-quotidien/02-controle-cnil"
            emoji="📚"
            title="Module Controle CNIL"
            description="7 reflexes du controle inopine + sanctions article 83"
          />
          <ResourceLink
            href="/apprendre/dpo-quotidien/03-transferts-hors-ue"
            emoji="📚"
            title="Module Transferts hors UE"
            description="DPF post-Schrems, TIA, CCT, BCR"
          />
          <ResourceLink
            href="/apprendre/dpo-quotidien/04-profilage-decision-auto"
            emoji="📚"
            title="Module Profilage et IA"
            description="Article 22 RGPD + AI Act risque eleve"
          />
          <ResourceLink
            href="/dpo"
            emoji="🌐"
            title="Page publique /dpo"
            description="6 promesses tracables a partager avec la direction"
          />
        </div>
      </AdminSection>

      {/* ============================================================
          5. Citation finale Hex veille
          ============================================================ */}
      <section className="text-center pt-4 pb-2">
        <blockquote className="font-display italic text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
          « Un DPO ne devrait pas avoir a choisir entre un outil cyber utile
          et un outil cyber conforme. On a passe deux ans a construire
          l'option qui est les deux a la fois. »
        </blockquote>
        <p
          aria-hidden="true"
          className="mt-3 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
        >
          - Hex veille
        </p>
      </section>
    </div>
  );
}

// ============================================================================
// SOUS-COMPOSANTS
// ============================================================================

function CounterCard({
  emoji,
  label,
  value,
  tone,
}: {
  emoji: string;
  label: string;
  value: number;
  tone: "info" | "success" | "warning";
}) {
  const toneClass: Record<typeof tone, string> = {
    info: "border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20",
    success:
      "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20",
    warning:
      "border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20",
  };
  return (
    <div
      className={`rounded-2xl border ${toneClass[tone]} p-4 text-center transition-all hover:scale-[1.02]`}
    >
      <div className="text-2xl mb-1" aria-hidden="true">
        {emoji}
      </div>
      <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tabular-nums">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-widest font-medium text-gray-600 dark:text-gray-400 mt-1">
        {label}
      </p>
    </div>
  );
}

function ResourceLink({
  href,
  emoji,
  title,
  description,
}: {
  href: string;
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0" aria-hidden="true">
          {emoji}
        </span>
        <div className="min-w-0">
          <p className="font-bold text-primary-500 dark:text-accent-300 text-sm leading-tight">
            {title}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}

const ACTION_EMOJI: Record<string, string> = {
  DATA_ACCESSED: "👁",
  DATA_EXPORTED: "📤",
  DATA_ERASURE_REQUESTED: "🗑",
  DATA_ERASURE_COMPLETED: "✅",
  CONSENT_GIVEN: "✓",
  CONSENT_WITHDRAWN: "✗",
};

const ACTION_LABEL: Record<string, string> = {
  DATA_ACCESSED: "Acces aux donnees personnelles",
  DATA_EXPORTED: "Export de donnees (article 20)",
  DATA_ERASURE_REQUESTED: "Demande d'effacement (article 17)",
  DATA_ERASURE_COMPLETED: "Effacement effectue",
  CONSENT_GIVEN: "Consentement donne",
  CONSENT_WITHDRAWN: "Consentement retire",
};
