// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Page admin : configuration + sync CISO Assistant.
//
// Acces : ADMIN / RSSI / SUPERADMIN du tenant. Cf. layout admin.
//
// Sections :
//   1. Form de configuration (Base URL, username, password, folder, SSL).
//   2. Boutons "Tester la connexion" + "Supprimer la connexion".
//   3. Bouton "Synchroniser" par framework (ouvre le terminal SSE).
//   4. Historique des 20 derniers runs (status, framework, OK/Total, durée).
//
// Le terminal SSE est dans un composant client (CisoSyncForm) pour gerer
// l'EventSource. Le reste de la page est server-side rendered.

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SUPPORTED_FRAMEWORKS } from "@/lib/mapping-grc";
import CisoSyncForm from "./CisoSyncForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Connecteur CISO Assistant — Admin Humanix",
};

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  running: { label: "En cours", color: "bg-cyan-100 text-cyan-800" },
  success: { label: "OK", color: "bg-emerald-100 text-emerald-800" },
  partial: { label: "Partiel", color: "bg-amber-100 text-amber-800" },
  failed: { label: "Échec", color: "bg-red-100 text-red-800" },
};

const TEST_STATUS_LABELS: Record<string, string> = {
  ok: "OK",
  auth_failed: "Authentification refusée",
  unreachable: "Inaccessible",
  schema_error: "Schéma incompatible",
  unknown: "Erreur inconnue",
};

export default async function CisoAssistantAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion?next=/admin/integrations/ciso-assistant");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/");
  }
  const tenantId = session.user.tenantId as string;

  const [connection, runs] = await Promise.all([
    db.cisoAssistantConnection.findUnique({ where: { tenantId } }),
    db.cisoAssistantSyncRun.findMany({
      where: { tenantId },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: {
        id: true,
        framework: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        evidencesTotal: true,
        evidencesOk: true,
        evidencesFail: true,
      },
    }),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.18em] font-bold text-primary-500 dark:text-accent-300 mb-1">
          Intégrations
        </p>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
          Connecteur CISO Assistant
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-3xl">
          Synchronise les preuves de conformité Humanix vers votre instance{" "}
          <a
            href="https://github.com/intuitem/ciso-assistant-community"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-500 dark:text-accent-300 underline underline-offset-2"
          >
            CISO Assistant
          </a>{" "}
          (intuitem) en un clic. Idempotent : un cron quotidien actualise les
          statuts sans créer de doublons. Aucune modification requise côté
          intuitem — Humanix s'adapte à leur API publique.
        </p>
      </header>

      <CisoSyncForm
        existing={
          connection
            ? {
                baseUrl: connection.baseUrl,
                username: connection.username,
                folderName: connection.folderName,
                ownerEmail: connection.ownerEmail,
                verifySSL: connection.verifySSL,
                createAppliedControls: connection.createAppliedControls,
                createFindings: connection.createFindings,
                createRiskScenarios: connection.createRiskScenarios,
                syncOwnerAsActor: connection.syncOwnerAsActor,
                createIncidents: connection.createIncidents,
                pushMetrologySamples: connection.pushMetrologySamples,
                syncGroupsAsTeams: connection.syncGroupsAsTeams,
                syncCampaigns: connection.syncCampaigns,
                enableLiveMode: connection.enableLiveMode,
                lastLiveSyncAt:
                  connection.lastLiveSyncAt?.toISOString() ?? null,
                lastLiveSyncEvent: connection.lastLiveSyncEvent,
                liveSyncCount: connection.liveSyncCount,
                createWorkforceAsset: connection.createWorkforceAsset,
                syncThreats: connection.syncThreats,
                createDashboard: connection.createDashboard,
                lastTestedAt: connection.lastTestedAt?.toISOString() ?? null,
                lastTestStatus: connection.lastTestStatus,
                lastTestError: connection.lastTestError,
              }
            : null
        }
        frameworks={Array.from(SUPPORTED_FRAMEWORKS)}
        testStatusLabels={TEST_STATUS_LABELS}
      />

      <section className="mt-10">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
          Historique des synchronisations
        </h2>
        {runs.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Aucune synchronisation pour ce tenant pour l'instant.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/60 text-left text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Démarré le</th>
                  <th className="px-4 py-3">Framework</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Résultat</th>
                  <th className="px-4 py-3">Durée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {runs.map((r) => {
                  const badge = STATUS_BADGES[r.status] ?? STATUS_BADGES.failed;
                  const duration =
                    r.finishedAt && r.startedAt
                      ? `${((r.finishedAt.getTime() - r.startedAt.getTime()) / 1000).toFixed(1)}s`
                      : "—";
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 tabular-nums">
                        {r.startedAt.toLocaleString("fr-FR")}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">
                        {r.framework}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 tabular-nums">
                        {r.evidencesOk}/{r.evidencesTotal}
                        {r.evidencesFail > 0 && (
                          <span className="text-red-600 dark:text-red-400 ml-1">
                            ({r.evidencesFail} échecs)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 tabular-nums">
                        {duration}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10 p-5 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
          Comment ça marche ?
        </h3>
        <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal pl-5">
          <li>
            Connectez votre instance CISO Assistant ci-dessus (URL + un compte
            avec droits d'écriture sur les evidences).
          </li>
          <li>
            Cliquez sur <strong>Tester la connexion</strong> pour vérifier
            qu'Humanix peut s'authentifier et créer un folder dédié.
          </li>
          <li>
            Sélectionnez un framework (ISO 27001:2022, NIS2, RGPD, ANSSI HG ou
            NIST CSF) puis cliquez <strong>Synchroniser</strong>. Les preuves
            s'affichent en live dans le terminal puis dans CISO Assistant.
          </li>
          <li>
            Mettez en place un cron (côté Humanix ou côté CISO Assistant via
            le connecteur Python autonome) pour une sync automatique
            quotidienne. Le mode <em>upsert idempotent</em> garantit zéro
            doublon.
          </li>
          <li>
            Activez <strong>Live Mode</strong> (extension v2.0) pour des
            rafraîchissements temps réel : à chaque module complété,
            phishing signalé ou clic sur faux mail, une mini-sync incrémentale
            (debouncée 5 s) repousse les preuves impactées vers CISO
            Assistant — utile en présentation COMEX.
          </li>
        </ol>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
          Toutes les actions sont auditées dans{" "}
          <a
            href="/admin/audit"
            className="text-primary-500 dark:text-accent-300 underline"
          >
            /admin/audit
          </a>{" "}
          (actions <code>CISO_CONNECTION_*</code> et <code>CISO_SYNC_*</code>).
          Le password CISO Assistant est chiffré AES-256-GCM avec une clé
          dérivée par HKDF de <code>AUTH_SECRET</code>.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          Chaque preuve uploadée dans CISO Assistant est accompagnée d'un{" "}
          <strong>PDF signé Ed25519</strong> (manifeste d'intégrité en page 2)
          vérifiable hors-ligne avec la clé publique exposée sur{" "}
          <a
            href="/.well-known/humanix-pdf-pubkey.pem"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-500 dark:text-accent-300 underline"
          >
            /.well-known/humanix-pdf-pubkey.pem
          </a>
          . Procédure de vérification : OpenSSL standard (cf. dernière page de
          chaque PDF).
        </p>
      </section>
    </div>
  );
}
