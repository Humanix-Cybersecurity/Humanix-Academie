// SPDX-License-Identifier: AGPL-3.0-or-later
// /superadmin/tenants/[id] - fiche detaillee d'un tenant.
// Sert au support / commercial pour diagnostiquer rapidement un client.
import Link from "next/link";
import { notFound } from "next/navigation";
import { computeTenantHealth } from "@/lib/tenant-health";
import { db } from "@/lib/db";
import { getSeatUsage, formatSeatUsage } from "@/lib/seats";
import {
  deactivateTenant,
  reactivateTenant,
  deleteTenant,
} from "./actions";

export const dynamic = "force-dynamic";

const SIGNAL_BG: Record<string, string> = {
  ok: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200",
  warn: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200",
  error: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200",
};

export default async function TenantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const { id } = await params;
  const { msg, error: actionError } = await searchParams;
  const health = await computeTenantHealth(id);
  if (!health) notFound();

  // Sieges (quota de plan) -- distinct des compteurs actifs/total ci-dessus.
  // Pour le tenant Communaute, getSeatUsage() retourne Infinity (cf. lib/seats.ts
  // et l'exception slug humanix-community).
  const seatUsage = await getSeatUsage(id);

  // Fetch des champs isActive / disabledAt / disabledBy / disabledReason
  // (pas dans tenant-health pour eviter de toucher la couche analytics).
  const tenantMeta = await db.tenant.findUnique({
    where: { id },
    select: {
      isActive: true,
      disabledAt: true,
      disabledBy: true,
      disabledReason: true,
      paymentSubscriptionId: true,
      subscriptionStatus: true,
    },
  });
  // tenant existe forcement (health serait null sinon). On a deja notFound() ci-dessus.
  if (!tenantMeta) notFound();

  // Liste des admins du tenant pour le support (qui contacter)
  const admins = await db.user.findMany({
    where: {
      tenantId: id,
      role: { in: ["ADMIN", "RSSI", "SUPERADMIN"] },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      emailVerified: true,
      mfaEnabled: true,
      lastLoginAt: true,
      lastSeenAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/superadmin/tenants"
            className="text-xs text-gray-500 hover:text-accent-500"
          >
            ← Tous les tenants
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 mt-2">
            {health.tenantName}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            <span className="font-mono">{health.tenantSlug}</span> · plan{" "}
            <span className="font-bold">{health.plan}</span> · créé le{" "}
            {health.createdAt.toLocaleDateString("fr-FR")}
          </p>
        </div>
      </header>

      {/* Bandeau signal */}
      <div className={`rounded-2xl border-2 p-4 ${SIGNAL_BG[health.signal]}`}>
        <p className="font-bold flex items-center gap-2">
          {health.signal === "ok" && "✓"}
          {health.signal === "warn" && "⚠"}
          {health.signal === "error" && "✗"}
          {health.signal === "ok" && " Tenant en bonne santé"}
          {health.signal === "warn" && " Points de vigilance"}
          {health.signal === "error" && " Tenant en alerte"}
        </p>
        {health.issues.length > 0 && (
          <ul className="mt-2 text-sm space-y-0.5">
            {health.issues.map((iss, idx) => (
              <li key={idx}>• {iss}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Indicateurs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat
          title="Utilisateurs"
          // Format reformule (mai 2026) : avant "X actifs / Y total" preetait a
          // confusion avec un quota de sieges. Maintenant "(sur Y inscrits)"
          // casse le pattern X/Y. Le vrai quota de sieges est sur la KPI dediee
          // ci-dessous via getSeatUsage().
          value={`${health.activeUsers} actifs (sur ${health.totalUsers} inscrits)`}
        />
        <Stat
          title="Sièges (quota plan)"
          // Pour le tenant Communaute, formatSeatUsage retourne "X sieges utilises
          // (illimite)" car getSeatUsage force max=Infinity (cf. lib/seats.ts).
          // Pour un tenant paye, "X / Y sieges utilises (Z%)".
          value={formatSeatUsage(seatUsage)}
        />
        <Stat title="Administrateurs" value={`${health.adminCount}`} />
        <Stat title="Groupes définis" value={`${health.groupCount}`} />
        <Check label="Au moins 1 admin actif" ok={health.adminActif} />
        <Check label="Email admin vérifié" ok={health.adminVerified} />
        <Check label="2FA admin activée" ok={health.admin2FA} />
        <Check label="Au moins 1 user actif" ok={health.hasUsers} />
        <Check
          label="Au moins 1 progression terminée"
          ok={health.hasProgress}
        />
        <Check
          label="Aucun mismatch de plan"
          ok={health.planMismatches.length === 0}
        />
      </section>

      {/* Administrateurs du tenant */}
      <section>
        <h2 className="font-display font-bold text-primary-500 dark:text-accent-300 mb-3">
          Administrateurs du tenant
        </h2>
        <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <caption className="sr-only">Details du tenant selectionne</caption>
            <thead className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-2 text-xs">Email / Nom</th>
                <th className="px-4 py-2 text-xs">Rôle</th>
                <th className="px-4 py-2 text-xs">Email vérifié</th>
                <th className="px-4 py-2 text-xs">2FA</th>
                <th className="px-4 py-2 text-xs">Statut</th>
                <th className="px-4 py-2 text-xs">Dernière connexion</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-gray-100 dark:border-slate-800/60 last:border-0"
                >
                  <td className="px-4 py-2">
                    <p className="font-semibold">{a.name ?? a.email.split("@")[0]}</p>
                    <p className="text-xs text-gray-500">{a.email}</p>
                  </td>
                  <td className="px-4 py-2 text-xs">{a.role}</td>
                  <td className="px-4 py-2">
                    {a.emailVerified ? "✓" : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {a.mfaEnabled ? "✓" : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {a.isActive ? "actif" : "suspendu"}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {a.lastLoginAt
                      ? a.lastLoginAt.toLocaleDateString("fr-FR")
                      : "—"}
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 italic text-rose-700 dark:text-rose-300">
                    Aucun administrateur. Le tenant est inutilisable en l'état.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Message flash (toast simple via query param ?msg=) */}
      {msg && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/15 p-3 text-sm text-emerald-900 dark:text-emerald-200"
        >
          {msg === "deactivated" && "✓ Tenant désactivé. Les utilisateurs ne peuvent plus se connecter."}
          {msg === "reactivated" && "✓ Tenant réactivé. Les utilisateurs peuvent à nouveau se connecter."}
          {msg === "already-disabled" && "ℹ Tenant déjà désactivé."}
          {msg === "already-active" && "ℹ Tenant déjà actif."}
        </div>
      )}

      {/* Banner d'erreur (toast rose via query param ?error=). Affiche le
          message remonte par les server actions deactivateTenant /
          reactivateTenant / deleteTenant. Plus fiable que throw + error
          boundary (les throws dans Server Actions pouvaient afficher un
          404 cryptique cf. bug Florian 2026-05-23). */}
      {actionError && (
        <div
          role="alert"
          className="rounded-xl border-2 border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/15 p-4 text-sm text-rose-900 dark:text-rose-200 flex items-start gap-2"
        >
          <span aria-hidden="true" className="text-lg">⚠️</span>
          <div className="flex-1">
            <p className="font-bold mb-1">Action refusée</p>
            <p>{actionError}</p>
          </div>
        </div>
      )}

      {/* === ACCES USERS (avec masquage RGPD) === */}
      <section
        aria-labelledby="users-title"
        className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
      >
        <h2
          id="users-title"
          className="font-display font-bold text-primary-500 dark:text-accent-300 mb-2"
        >
          👥 Tous les utilisateurs du tenant
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Voir la liste complète ({health.totalUsers} utilisateurs) avec
          emails et noms <strong>masqués RGPD</strong>. Accès tracé dans le
          journal d&apos;audit.
        </p>
        <Link
          href={`/superadmin/tenants/${id}/users`}
          className="btn-secondary text-sm"
        >
          Consulter la liste →
        </Link>
      </section>

      {/* === GESTION DES ADMINS (multi-tenant membership) === */}
      <section
        aria-labelledby="admins-title"
        className="rounded-2xl border border-accent-200 dark:border-accent-900/40 bg-accent-50/40 dark:bg-accent-950/20 p-5"
      >
        <h2
          id="admins-title"
          className="font-display font-bold text-primary-500 dark:text-accent-300 mb-2"
        >
          ⚙️ Gestion des admins du tenant
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Inviter de nouveaux admins natifs, accorder des memberships
          externes (acces admin cross-tenant pour des SUPERADMIN), ou
          retirer des droits existants. Chaque action est tracee dans le
          journal d&apos;audit.
        </p>
        <Link
          href={`/superadmin/tenants/${id}/admins`}
          className="btn-primary text-sm"
        >
          Gerer les admins →
        </Link>
      </section>

      {/* === DESACTIVATION / REACTIVATION === */}
      {tenantMeta?.isActive ? (
        <section
          aria-labelledby="disable-title"
          className="rounded-2xl border-2 border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-900/15 p-5"
        >
          <h2
            id="disable-title"
            className="font-display font-bold text-amber-900 dark:text-amber-200 mb-2"
          >
            ⏸ Désactiver le tenant
          </h2>
          <p className="text-sm text-amber-800 dark:text-amber-300 mb-4">
            Bloque les connexions de tous les utilisateurs de ce tenant.{" "}
            <strong>Réversible</strong> — données conservées en BDD. À utiliser
            pour suspendre temporairement (impayé, abus, demande client).
          </p>
          <form action={deactivateTenant} className="space-y-3">
            <input type="hidden" name="tenantId" value={id} />
            <div>
              <label
                htmlFor="disable-reason"
                className="block text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 mb-1"
              >
                Motif (obligatoire — pour audit)
              </label>
              <input
                id="disable-reason"
                name="reason"
                type="text"
                required
                maxLength={500}
                placeholder="Ex : impayé 30j, demande client, suspicion d'abus..."
                className="block w-full rounded-xl border-2 border-amber-200 dark:border-amber-700 bg-white dark:bg-slate-900 p-2 text-sm focus:border-accent-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition"
            >
              Désactiver le tenant
            </button>
          </form>
        </section>
      ) : (
        <section
          aria-labelledby="reactivate-title"
          className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-900/15 p-5"
        >
          <h2
            id="reactivate-title"
            className="font-display font-bold text-emerald-900 dark:text-emerald-200 mb-2"
          >
            ▶ Tenant désactivé · Réactiver
          </h2>
          <div className="text-sm text-emerald-800 dark:text-emerald-300 mb-4 space-y-1">
            <p>
              <strong>Désactivé le :</strong>{" "}
              {tenantMeta.disabledAt
                ? new Date(tenantMeta.disabledAt).toLocaleString("fr-FR")
                : "n/a"}
            </p>
            <p>
              <strong>Par :</strong> {tenantMeta.disabledBy ?? "n/a"}
            </p>
            <p>
              <strong>Motif :</strong> {tenantMeta.disabledReason ?? "n/a"}
            </p>
          </div>
          <form action={reactivateTenant}>
            <input type="hidden" name="tenantId" value={id} />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition"
            >
              Réactiver le tenant
            </button>
          </form>
        </section>
      )}

      {/* === DANGER ZONE : SUPPRESSION === */}
      <section
        aria-labelledby="delete-title"
        className="rounded-2xl border-2 border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-900/15 p-5"
      >
        <h2
          id="delete-title"
          className="font-display font-bold text-rose-900 dark:text-rose-200 mb-2"
        >
          ⚠ Danger zone · Supprimer le tenant
        </h2>
        <p className="text-sm text-rose-800 dark:text-rose-300 mb-3">
          <strong>Action irréversible</strong> — supprime le tenant et{" "}
          <strong>toutes</strong> ses données (utilisateurs, progressions,
          événements, groupes, audit logs liés). Conforme RGPD art. 17.
        </p>
        {tenantMeta?.paymentSubscriptionId &&
        tenantMeta?.subscriptionStatus === "active" ? (
          <p className="text-sm bg-rose-100 dark:bg-rose-950/40 rounded-lg p-3 text-rose-900 dark:text-rose-200">
            ⛔ Abonnement Mollie actif détecté. Résilie d&apos;abord la
            subscription via la console Mollie ou /admin/billing avant de
            pouvoir supprimer ce tenant.
          </p>
        ) : (
          <form action={deleteTenant} className="space-y-3">
            <input type="hidden" name="tenantId" value={id} />
            <div>
              <label
                htmlFor="confirm-name"
                className="block text-xs font-bold uppercase tracking-wider text-rose-900 dark:text-rose-200 mb-1"
              >
                Pour confirmer, retape exactement :{" "}
                <span className="font-mono text-sm bg-rose-100 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                  {health.tenantName}
                </span>
              </label>
              <input
                id="confirm-name"
                name="confirmName"
                type="text"
                required
                autoComplete="off"
                className="block w-full rounded-xl border-2 border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 p-2 text-sm font-mono focus:border-rose-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition"
            >
              Supprimer définitivement
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
        {title}
      </p>
      <p className="text-xl font-extrabold mt-1">{value}</p>
    </div>
  );
}

function Check({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 flex items-center gap-3 ${
        ok
          ? "border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-900/15"
          : "border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-900/15"
      }`}
    >
      <span className="text-2xl">{ok ? "✓" : "✗"}</span>
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
