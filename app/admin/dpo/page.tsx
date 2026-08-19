// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// /admin/dpo - « Vos donnees chez Humanix ».
//
// UN SEUL SUJET ICI : ce que HUMANIX detient des utilisateurs du tenant, et ce
// que le client peut en exiger. Retention, demandes d'effacement, journal.
//
// Ce qui n'est PAS ici : la mise en conformite de l'entreprise cliente -- sa
// paie, sa videosurveillance, son fichier clients. Ca vit sous
// /admin/conformite-rgpd, et les deux n'ont aucun rapport.
//
//   Les deux ont cohabite sur cette page jusqu'au 2026-08-19, sous l'intitule
//   « Espace DPO ». Un nom de ROLE, pas de sujet -- et comme les deux sujets
//   concernent la meme personne, tout s'y est agrege. La confusion etait
//   couteuse : on pouvait croire que regler la retention Humanix avancait la
//   conformite de sa propre entreprise. L'URL est conservee (champ
//   `admin_dpo_dashboard` de l'API publique dpo-export, schema 1.0).
//
// Données affichees (toutes derivees du modèle AuditLog existant) :
//   - Compteurs RGPD des 90 derniers jours
//   - Queue des demandes d'effacement (article 17) avec flag "en retard"
//   - Activite RGPD recente (30 dernieres actions)
//   - Ressources sur Humanix comme sous-traitant
//
// Roles autorises : ADMIN, RSSI, SUPERADMIN.
// =============================================================================

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import ComplianceCounters, {
  type ComplianceCounts,
} from "@/components/admin/dpo/ComplianceCounters";
import ErasureQueue, {
  type QueueRow,
} from "@/components/admin/dpo/ErasureQueue";
import RecentActivity, {
  type RecentEntry,
} from "@/components/admin/dpo/RecentActivity";
import RessourcesHumanix from "@/components/admin/dpo/RessourcesHumanix";

export const dynamic = "force-dynamic";

const NINETY_DAYS_MS = 90 * 24 * 3600 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 3600 * 1000;

const RGPD_ACTIONS = [
  "DATA_ACCESSED",
  "DATA_EXPORTED",
  "DATA_ERASURE_REQUESTED",
  "DATA_ERASURE_COMPLETED",
  "CONSENT_GIVEN",
  "CONSENT_WITHDRAWN",
] as const;

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
      action: { in: [...RGPD_ACTIONS] },
    },
    _count: { _all: true },
  });

  const countsByAction: ComplianceCounts = {};
  for (const c of counts) {
    (countsByAction as Record<string, number>)[c.action] = c._count._all;
  }

  // 2. Queue des demandes d'effacement en attente
  // Pour chaque DATA_ERASURE_REQUESTED, on cherche un DATA_ERASURE_COMPLETED
  // ulterieur sur le meme targetId (utilisateur) pour determiner l'etat.
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

  const now = Date.now();
  const queue: QueueRow[] = erasureRequests.map((r) => {
    const completedAt =
      r.targetId && completionsByTarget.get(r.targetId)
        ? (completionsByTarget.get(r.targetId) ?? null)
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
  const recentRows = await db.auditLog.findMany({
    where: {
      tenantId,
      action: { in: [...RGPD_ACTIONS] },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const recent: RecentEntry[] = recentRows.map((r) => ({
    id: r.id,
    action: r.action,
    targetLabel: r.targetLabel,
    actorEmail: r.actorEmail,
    createdAt: r.createdAt,
  }));

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Vos données chez Humanix"
        description="Ce que la plateforme conserve de vos utilisateurs : durée de rétention, demandes d'effacement, journal des accès."
        icon="🛡"
        actions={
          <Link
            href="/admin/dpo/retention"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 text-sm font-bold hover:border-accent-500 transition shadow-sm"
          >
            <span aria-hidden="true">🗓</span>
            Durée de rétention
          </Link>
        }
      />

      {/* La contrepartie de l'encart de /admin/conformite-rgpd. Les deux pages
          se renvoient l'une a l'autre en disant ce qu'elles NE sont PAS : c'est
          la seule facon de tuer durablement la confusion, un lien discret dans
          une barre d'actions n'y suffisait pas. */}
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm dark:border-sky-900/40 dark:bg-sky-950/20">
        <p className="font-semibold text-sky-900 dark:text-sky-200">
          Cette page parle de <em>nous</em>, pas de vous
        </p>
        <p className="mt-1 text-sky-800 dark:text-sky-300">
          Tout ce qui suit décrit ce que Humanix fait des données que vous nous
          confiez. Rien ici ne concerne les traitements de votre entreprise —
          votre paie, vos caméras, votre fichier clients. Pour ceux-là,{" "}
          <Link
            href="/admin/conformite-rgpd"
            className="underline font-semibold"
          >
            mettez votre entreprise en conformité
          </Link>{" "}
          est la bonne page.
        </p>
      </div>

      <AdminSection
        title="Vue d'ensemble · 90 derniers jours"
        description="Activite RGPD globale du tenant. Source : AuditLog."
      >
        <ComplianceCounters counts={countsByAction} />
      </AdminSection>

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
        <ErasureQueue queue={queue} />
      </AdminSection>

      <AdminSection
        title="Activite RGPD recente"
        description={`${recent.length} derniere${recent.length > 1 ? "s" : ""} action${recent.length > 1 ? "s" : ""} sur les données personnelles`}
        action={
          <Link
            href="/admin/audit"
            className="text-sm text-accent-500 hover:underline font-medium"
          >
            Journal complet →
          </Link>
        }
      >
        <RecentActivity entries={recent} />
      </AdminSection>

      <AdminSection
        title="Humanix comme sous-traitant"
        description="Ce que vous pouvez consulter, exiger ou transmettre à votre direction."
        variant="muted"
      >
        <RessourcesHumanix />
      </AdminSection>

      <section className="text-center pt-4 pb-2">
        <blockquote className="font-display italic text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
          « Un DPO ne devrait pas avoir a choisir entre un outil cyber utile et
          un outil cyber conforme. On a passe deux ans a construire l'option qui
          est les deux a la fois. »
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
