// SPDX-License-Identifier: AGPL-3.0-or-later
// Page admin "Intégrations" - gestion des webhooks Slack/Teams/generiques.
// Acces : ADMIN, MANAGER, SUPERADMIN. Pas de gate plan.
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events";
import WebhookTable from "@/components/WebhookTable";
import {
  createWebhook,
  deleteWebhook,
  fireTestWebhook,
  toggleWebhook,
} from "./actions";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const session = await auth();
  const tenantId = session!.user.tenantId as string;

  const webhooks = await db.tenantWebhook.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <AdminPageHeader
        title="Intégrations"
        description="Reliez Humanix Académie à Slack, Microsoft Teams, ou tout outil acceptant un webhook (Zapier, n8n, custom). Notification temps réel des évènements clés."
      />

      <div className="space-y-6 min-w-0">
        <AdminSection title="Autres intégrations">
          <ul className="grid sm:grid-cols-2 gap-3">
            <li>
              <a
                href="/admin/integrations/ciso-assistant"
                className="block p-4 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-accent-400 dark:hover:border-accent-500 hover:shadow-sm transition group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0" aria-hidden="true">
                    🛡
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-primary-500 dark:text-accent-300 group-hover:underline">
                      CISO Assistant (intuitem)
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      Push 1-clic des preuves de conformité Humanix
                      (ISO 27001, NIS2, RGPD, ANSSI, NIST CSF) vers votre
                      instance CISO Assistant. Terminal live, idempotent.
                    </p>
                  </div>
                </div>
              </a>
            </li>
            <li>
              <a
                href="/admin/sso-saml"
                className="block p-4 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-accent-400 dark:hover:border-accent-500 hover:shadow-sm transition group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0" aria-hidden="true">
                    🔐
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-primary-500 dark:text-accent-300 group-hover:underline">
                      SSO SAML / SCIM
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      Authentification entreprise (Entra ID, Okta, Google,
                      Keycloak) + provisioning auto. Pro+.
                    </p>
                  </div>
                </div>
              </a>
            </li>
            <li>
              <a
                href="/admin/api-keys"
                className="block p-4 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-accent-400 dark:hover:border-accent-500 hover:shadow-sm transition group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0" aria-hidden="true">
                    🔑
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-primary-500 dark:text-accent-300 group-hover:underline">
                      API Keys
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                      Clés d'API tenant pour outils GRC tiers (Eramba, Splunk,
                      Sentinel, etc.) et connecteurs externes.
                    </p>
                  </div>
                </div>
              </a>
            </li>
          </ul>
        </AdminSection>

        <AdminSection title="Vos webhooks configurés">
          <WebhookTable
            webhooks={webhooks.map((w) => ({
              id: w.id,
              label: w.label,
              type: w.type,
              urlMasked: maskUrl(w.url),
              events: w.events.split(",").filter(Boolean),
              isActive: w.isActive,
              successCount: w.successCount,
              failureCount: w.failureCount,
              lastFiredAt: w.lastFiredAt?.toISOString() ?? null,
              lastError: w.lastError,
            }))}
            onDeleteAction={deleteWebhook}
            onTestAction={fireTestWebhook}
            onToggleAction={toggleWebhook}
          />
        </AdminSection>

        <AdminSection title="Ajouter un webhook">
          <p className="text-sm text-gray-500 mb-4">
            Pour Slack : créez un{" "}
            <a
              href="https://api.slack.com/messaging/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-500 underline"
            >
              Incoming Webhook
            </a>{" "}
            dans votre workspace, puis collez l'URL ici. Pour Teams : ajoutez un{" "}
            <a
              href="https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-500 underline"
            >
              connecteur Incoming Webhook
            </a>{" "}
            dans le canal cible.
          </p>

          <form action={createWebhook} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="webhook-label"
                  className="block text-xs font-bold uppercase text-gray-500 mb-1"
                >
                  Libellé
                </label>
                <input
                  id="webhook-label"
                  name="label"
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Ex : Canal #cyber-team"
                  className="input w-full"
                />
              </div>
              <div>
                <label
                  htmlFor="webhook-type"
                  className="block text-xs font-bold uppercase text-gray-500 mb-1"
                >
                  Type
                </label>
                <select
                  id="webhook-type"
                  name="type"
                  required
                  className="input w-full"
                >
                  <option value="SLACK">💬 Slack</option>
                  <option value="TEAMS">🟦 Microsoft Teams</option>
                  <option value="JIRA">🟦 Jira (créer un issue)</option>
                  <option value="SERVICENOW">
                    🟩 ServiceNow (créer un incident)
                  </option>
                  <option value="PAGERDUTY">
                    🟧 PagerDuty (déclencher une alerte)
                  </option>
                  <option value="GENERIC">🔌 Générique (JSON signé HMAC)</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="webhook-url"
                className="block text-xs font-bold uppercase text-gray-500 mb-1"
              >
                URL du webhook (HTTPS uniquement)
              </label>
              <input
                id="webhook-url"
                name="url"
                type="url"
                required
                pattern="https://.*"
                placeholder="https://hooks.slack.com/services/..."
                className="input w-full font-mono text-sm"
                aria-describedby="webhook-url-help"
              />
              <p id="webhook-url-help" className="text-xs text-gray-500 mt-1">
                Les URLs locales ou IPs privées sont automatiquement refusées
                (anti-SSRF).
              </p>
            </div>

            {/* Secret / auth — requis pour Jira/ServiceNow/PagerDuty,
                optionnel pour Generic (auto-genere si vide), inutile pour
                Slack/Teams (auth via URL). */}
            <div>
              <label
                htmlFor="webhook-secret"
                className="block text-xs font-bold uppercase text-gray-500 mb-1"
              >
                Secret / authentification
              </label>
              <input
                id="webhook-secret"
                name="secret"
                type="password"
                autoComplete="off"
                maxLength={2000}
                placeholder="Selon le type (cf. aide ci-dessous)"
                className="input w-full font-mono text-sm"
                aria-describedby="webhook-secret-help"
              />
              <details
                id="webhook-secret-help"
                className="text-xs text-gray-500 mt-1"
              >
                <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                  Quel secret pour quel type ?
                </summary>
                <ul className="mt-2 space-y-1 list-disc pl-5">
                  <li>
                    <strong>Slack / Teams</strong> : laisser vide. L&apos;auth
                    est dans l&apos;URL du webhook.
                  </li>
                  <li>
                    <strong>Jira</strong> : <code>base64(email:apitoken)</code>
                    . Génère un API token sur{" "}
                    <a
                      href="https://id.atlassian.com/manage-profile/security/api-tokens"
                      className="underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      id.atlassian.com
                    </a>{" "}
                    puis <code>echo -n &quot;email@xx:apitoken&quot; | base64</code>.
                    URL avec <code>?projectKey=SEC</code> obligatoire.
                  </li>
                  <li>
                    <strong>ServiceNow</strong> : <code>base64(user:pass)</code>.
                    Crée un user d&apos;intégration dédié dans ServiceNow.
                  </li>
                  <li>
                    <strong>PagerDuty</strong> :{" "}
                    <code>routing_key</code> (Integration Key, 32 chars hex)
                    fournie par PagerDuty quand tu crées un service Events
                    API v2.
                  </li>
                  <li>
                    <strong>Générique</strong> : auto-généré si vide (HMAC
                    SHA-256 envoyé en header{" "}
                    <code>x-humanix-signature</code>).
                  </li>
                </ul>
              </details>
            </div>

            <fieldset>
              <legend className="block text-xs font-bold uppercase text-gray-500 mb-2">
                Évènements à notifier
              </legend>
              <div className="grid sm:grid-cols-2 gap-2">
                {Object.entries(WEBHOOK_EVENTS).map(([key, meta]) => (
                  <label
                    key={key}
                    className="flex items-start gap-2 p-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      name="events"
                      value={key}
                      defaultChecked
                      className="mt-1"
                    />
                    <span className="text-sm">
                      <strong className="text-primary-500">{meta.label}</strong>
                      <span className="block text-xs text-gray-500 mt-0.5">
                        {meta.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <button type="submit" className="btn-primary">
              Créer le webhook
            </button>
          </form>
        </AdminSection>

        <AdminSection variant="muted" title="Format des payloads">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            <strong>Slack &amp; Teams :</strong> les messages sont formatés avec
            un titre, un résumé contextuel et un bouton « Ouvrir le dashboard ».
            Aucun setup côté Humanix : collez l'URL et c'est joué.
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <strong>Générique :</strong> POST JSON{" "}
            <code className="bg-white dark:bg-slate-900 px-1 rounded text-xs">
              {`{ event, eventLabel, tenantId, tenantName, occurredAt, data }`}
            </code>
            . Signature HMAC-SHA256 dans l'en-tête{" "}
            <code className="bg-white dark:bg-slate-900 px-1 rounded text-xs">
              x-humanix-signature
            </code>{" "}
            si un secret est configuré (calculé sur le body brut).
          </p>
        </AdminSection>
      </div>
    </>
  );
}

function maskUrl(url: string): string {
  // On masque les segments après /services/ ou /T*** pour éviter de leak
  // les tokens en cas de capture d'ecran admin.
  try {
    const u = new URL(url);
    const path = u.pathname.split("/").filter(Boolean);
    const maskedPath = path
      .map((p, i) =>
        i < 1 ? p : p.length > 4 ? `${p.slice(0, 2)}…${p.slice(-2)}` : "…",
      )
      .join("/");
    return `${u.origin}/${maskedPath}`;
  } catch {
    return url.slice(0, 40) + "…";
  }
}
