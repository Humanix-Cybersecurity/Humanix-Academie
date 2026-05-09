// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/users/at-risk
//
// Page RSSI : liste les utilisateurs vulnerables (riskScore bas et/ou
// inactifs) pour permettre une action ciblee :
//   - Export CSV (rapport COMEX, suivi DPO)
//   - Envoi rappel email a une selection
//
// Filtres en query string (?threshold=40&days=60) pour permettre les
// liens partages ("envoie-moi le rapport des < 30 et inactifs > 90j")
// et les bookmarks RSSI.
//
// Auth gate : ADMIN, RSSI, MANAGER (read-only), SUPERADMIN

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listAtRiskUsers } from "@/lib/admin/at-risk-users";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AtRiskUsersTable from "@/components/admin/AtRiskUsersTable";
import EmptyState from "@/components/admin/EmptyState";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ threshold?: string; days?: string }>;

export default async function AdminUsersAtRiskPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (
    role !== "ADMIN" &&
    role !== "RSSI" &&
    role !== "MANAGER" &&
    role !== "SUPERADMIN"
  ) {
    redirect("/admin");
  }
  const tenantId = session.user.tenantId as string;

  const params = await searchParams;
  const threshold = params.threshold ? parseInt(params.threshold, 10) : 40;
  const days = params.days ? parseInt(params.days, 10) : 60;

  const { users, filters, totals } = await listAtRiskUsers(tenantId, {
    threshold,
    daysInactive: days,
  });

  // MANAGER : lecture seule (pas de bouton d'envoi rappel)
  const canAct = role === "ADMIN" || role === "RSSI" || role === "SUPERADMIN";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Utilisateurs vulnérables"
        description="Liste actionnable des collaborateurs avec un score de risque bas et/ou inactifs. Le lundi matin du RSSI."
        icon="⚠️"
      />

      {users.length === 0 ? (
        <EmptyState
          icon="✅"
          title="Personne n'est en zone rouge"
          description={`Avec les seuils actuels (riskScore < ${filters.threshold}, inactif > ${filters.daysInactive}j), aucun collaborateur n'est signalé. Ajuste les filtres si tu veux voir plus de monde.`}
        />
      ) : (
        <AtRiskUsersTable
          initialUsers={users}
          totals={totals}
          filters={filters}
          canAct={canAct}
        />
      )}
    </div>
  );
}
