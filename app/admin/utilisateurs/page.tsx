// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// /admin/utilisateurs - Gestion des collaborateurs (activer/désactiver, rôle,
// invitation, import CSV, rappels, suppression RGPD).
//
// REFONTE MAI 2026 : aligné design system Linear (PageHeader, Section).
// =============================================================================

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";
import { getCurrentTenantId } from "@/lib/current-tenant";
import UsersTable from "@/components/UsersTable";
import InviteUserForm from "@/components/InviteUserForm";
import CsvImporter from "@/components/CsvImporter";
import RemindersButton from "@/components/RemindersButton";
import RequestImpersonationForm from "@/components/admin/RequestImpersonationForm";
import ActiveImpersonationsList from "@/components/admin/ActiveImpersonationsList";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  // Auth garantie par app/admin/layout.tsx (defense-in-depth déjà appliquée).
  const session = await auth();
  // Resout le tenant ACTIF (sous-domaine + membership) plutot que d'utiliser
  // toujours session.user.tenantId. Permet a un SUPERADMIN avec membership
  // de voir les users du tenant cible plutot que ceux de son home.
  const tenantId = await getCurrentTenantId();
  const currentUserId = session!.user.id as string;
  const currentUserRole = session!.user.role as Role;

  const [users, allGroups] = await Promise.all([
    db.user.findMany({
      where: { tenantId },
      include: {
        progress: { select: { score: true, status: true, completedAt: true } },
        groups: {
          include: {
            group: { select: { id: true, name: true, emoji: true, color: true } },
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    db.group.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, emoji: true, color: true },
    }),
  ]);

  const totalEpisodes = await db.episode.count({
    where: { isPublished: true },
  });

  const now = Date.now();
  const enriched = users.map((u) => {
    const completed = u.progress.filter((p) => p.status === "COMPLETED").length;
    const xp = u.progress.reduce((s, p) => s + (p.score || 0), 0);
    const lastActivity = u.progress
      .map((p) => p.completedAt)
      .filter(Boolean)
      .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] as
      | Date
      | undefined;
    return {
      id: u.id,
      name: u.name ?? u.email.split("@")[0],
      email: u.email,
      role: u.role,
      service: u.service,
      isActive: u.isActive,
      isCurrent: u.id === currentUserId,
      coins: u.coins,
      completed,
      totalEpisodes,
      xp,
      lastActivity: lastActivity ? formatRelative(lastActivity) : null,
      mfaEnabled: u.mfaEnabled,
      mfaForced: u.mfaForced,
      isLocked: u.lockedUntil ? u.lockedUntil.getTime() > now : false,
      hasPassword: !!u.passwordHash,
      groupIds: u.groups.map((ug) => ug.group.id),
      groupBadges: u.groups.map((ug) => ({
        id: ug.group.id,
        name: ug.group.name,
        emoji: ug.group.emoji,
        color: ug.group.color,
      })),
    };
  });

  const activeCount = enriched.filter((u) => u.isActive).length;
  const adminCount = enriched.filter(
    (u) =>
      u.role === "ADMIN" || u.role === "SUPERADMIN" || u.role === "RSSI",
  ).length;
  const mfaCount = enriched.filter((u) => u.mfaEnabled).length;
  const suspendedCount = enriched.length - activeCount;

  return (
    <>
      <AdminPageHeader
        title="Utilisateurs"
        description="Gestion fine de votre programme de sensibilisation cyber."
      />

      <div className="space-y-6 min-w-0">
        {/* KPI strip - 5 chiffres clés */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Utilisateurs" value={enriched.length} />
          <StatCard label="Actifs" value={activeCount} accent="emerald" />
          <StatCard
            label="Suspendus"
            value={suspendedCount}
            accent={suspendedCount > 0 ? "amber" : undefined}
          />
          <StatCard label="Admins / RSSI" value={adminCount} />
          <StatCard
            label="2FA activée"
            value={mfaCount}
            accent={mfaCount === enriched.length ? "emerald" : undefined}
          />
        </div>

        {/* Layout 2/3 + 1/3 : table principale + actions latérales */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
          <AdminSection
            title="Tous mes collaborateurs"
            description={`${enriched.length} utilisateur${enriched.length > 1 ? "s" : ""} dans votre organisation`}
          >
            <UsersTable
              users={enriched}
              allGroups={allGroups}
              currentUserRole={currentUserRole}
            />
          </AdminSection>

          <div className="space-y-4 min-w-0">
            <AdminSection
              title="Inviter un collaborateur"
              description="Le nouvel utilisateur recevra un magic link pour se connecter."
            >
              <InviteUserForm />
            </AdminSection>

            <AdminSection
              title="Import CSV en masse"
              description="Onboarde toute ton équipe en 30 secondes."
            >
              <CsvImporter />
            </AdminSection>

            <AdminSection
              title="Rappels aux inactifs"
              description="Notifie ceux qui n'ont pas commencé leur parcours."
            >
              <RemindersButton />
            </AdminSection>

            <AdminSection
              title="Voir un compte (debug / support)"
              description="Demande d'accès en lecture seule avec consentement explicite de l'utilisateur."
            >
              <ActiveImpersonationsList
                tenantId={tenantId}
                adminUserId={currentUserId}
              />
              <div className="mt-4">
                <RequestImpersonationForm />
              </div>
            </AdminSection>

            {/* Notice RGPD - variante visuelle warning */}
            <article className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/15 p-4">
              <h3 className="font-bold text-amber-800 dark:text-amber-200 text-sm flex items-center gap-2">
                <span aria-hidden="true">⚖️</span>
                Conformité RGPD
              </h3>
              <p className="text-xs text-amber-800/80 dark:text-amber-200/80 mt-2 leading-relaxed">
                La suppression d'un utilisateur efface toutes ses données
                (progression, événements). Une trace agrégée et anonymisée est
                conservée pour la conformité (preuve de formation suivie).
              </p>
            </article>
          </div>
        </div>
      </div>
    </>
  );
}

// =============================================================================
// Sous-composants locaux
// =============================================================================

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "emerald" | "amber" | "rose";
}) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : accent === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : accent === "rose"
          ? "text-rose-600 dark:text-rose-400"
          : "text-gray-900 dark:text-gray-100";
  return (
    <article className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 min-w-0">
      <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold">
        {label}
      </p>
      <p
        className={`text-2xl sm:text-3xl font-extrabold mt-1 tabular-nums ${accentClass}`}
      >
        {value}
      </p>
    </article>
  );
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diffH = (now.getTime() - new Date(date).getTime()) / 3600_000;
  if (diffH < 1) return "il y a < 1h";
  if (diffH < 24) return `il y a ${Math.round(diffH)}h`;
  const diffD = diffH / 24;
  if (diffD < 7) return `il y a ${Math.round(diffD)}j`;
  return new Date(date).toLocaleDateString("fr-FR");
}
