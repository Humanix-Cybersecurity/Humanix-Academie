// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /integrations/privacy-tools — Connecteur Privacy Tools dedie DPO.
//
// Publie la specification de l'endpoint `/api/v1/dpo-export` et donne
// des exemples concrets d'integration vers les 4 outils Privacy
// majeurs en France : OneTrust, Didomi, Privacy.fr, Dastra/Witik.
//
// Cible : DPO de PME/ETI qui veut centraliser ses preuves dans son
// outil Privacy habituel sans saisir manuellement les compteurs RGPD,
// la queue d'effacement, etc.

import type { Metadata } from "next";
import Link from "next/link";

const TITLE = "Connecteur Privacy Tools — Humanix Académie";
const DESC =
  "Push automatique des preuves DPO (queue effacement RGPD art. 17, compteurs 90j, AIPD, certifs sensibilisation) vers OneTrust, Didomi, Privacy.fr, Dastra. API JSON stable.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/integrations/privacy-tools" },
};

const SAMPLE_RESPONSE = `{
  "schema_version": "1.0",
  "generated_at": "2026-05-24T16:30:00.000Z",
  "tenant": {
    "id": "tenant_abc123",
    "name": "Acme PME",
    "plan": "pro",
    "data_retention_days": 365
  },
  "rgpd_counters_90d": {
    "DATA_ACCESSED": 142,
    "DATA_EXPORTED": 23,
    "DATA_ERASURE_REQUESTED": 4,
    "DATA_ERASURE_COMPLETED": 3,
    "CONSENT_GIVEN": 87,
    "CONSENT_WITHDRAWN": 12
  },
  "erasure_queue": [
    {
      "request_id": "audit_xyz",
      "user_email": "jean.dupont@example.fr",
      "requested_at": "2026-04-20T10:15:00.000Z",
      "completed_at": null,
      "days_pending": 33,
      "overdue": true
    }
  ],
  "recent_activity_30d": [
    {
      "id": "audit_aaa",
      "action": "DATA_EXPORTED",
      "actor_email": "marie@acme.fr",
      "target_label": "user:user_123",
      "occurred_at": "2026-05-23T14:22:00.000Z",
      "severity": "INFO"
    }
  ],
  "rgpd_awareness": {
    "season_slug": "dpo-quotidien",
    "module_completion_rate": 0.78,
    "users_with_certificate": 12
  },
  "links": {
    "trust_center": "https://humanix-academie.fr/securite",
    "confidentiality_policy": "https://humanix-academie.fr/confidentialite",
    "dpa_template": "https://humanix-academie.fr/securite#dpa",
    "admin_dpo_dashboard": "https://humanix-academie.fr/admin/dpo"
  }
}`;

const CURL_EXAMPLE = `# Recupere ton snapshot DPO (JSON)
curl -H "Authorization: Bearer \${HUMANIX_API_KEY}" \\
  https://humanix-academie.fr/api/v1/dpo-export`;

const PYTHON_EXAMPLE = `import os, requests

# 1. Recupere les preuves DPO depuis Humanix
r = requests.get(
    "https://humanix-academie.fr/api/v1/dpo-export",
    headers={"Authorization": f"Bearer {os.environ['HUMANIX_API_KEY']}"},
)
r.raise_for_status()
dpo = r.json()

# 2. Push vers ton outil Privacy
# Exemple OneTrust (adapter selon l'API de ton tenant) :
import requests as onetrust
onetrust.post(
    "https://your-tenant.my.onetrust.com/api/dsr/v1/import",
    headers={"Authorization": f"Bearer {os.environ['ONETRUST_TOKEN']}"},
    json={
        "source": "humanix-academie",
        "schema_version": dpo["schema_version"],
        "erasure_queue": dpo["erasure_queue"],
        "rgpd_counters": dpo["rgpd_counters_90d"],
    },
)

# 3. (Optionnel) Alerte sur les requetes en retard
overdue = [r for r in dpo["erasure_queue"] if r["overdue"]]
if overdue:
    print(f"⚠ {len(overdue)} demandes d'effacement en retard (> 30j)")
`;

const TARGETS = [
  {
    name: "OneTrust Privacy",
    region: "🇺🇸 États-Unis",
    notes:
      "Leader mondial GRC + Privacy. Adapter le payload via webhook personnalisé (DSR Import API).",
    docs: "https://my.onetrust.com",
    pertinence: "Pour les groupes internationaux. Cher (~50k €/an) mais standard de facto.",
  },
  {
    name: "Didomi",
    region: "🇫🇷 France",
    notes:
      "Consent Management + Preference Center. Privacy.fr (autre produit Didomi) couvre la partie DPO.",
    docs: "https://developers.didomi.io/",
    pertinence: "Recommandé FR si déjà client Didomi pour la CMP cookies.",
  },
  {
    name: "Dastra",
    region: "🇫🇷 France",
    notes:
      "Plateforme RGPD complète (registre, AIPD, demandes droits, audits) pour PME/ETI.",
    docs: "https://docs.dastra.eu/",
    pertinence: "Le plus aligné Humanix : ETI françaises, philosophie souveraine.",
  },
  {
    name: "Witik",
    region: "🇫🇷 France",
    notes:
      "Gestion de la conformité RGPD pour PME. Import via API REST documentée.",
    docs: "https://witik.io/",
    pertinence: "Bon rapport qualité/prix pour PME 50-250 salariés.",
  },
];

export default function PrivacyToolsIntegrationPage() {
  return (
    <main id="main-content" className="overflow-x-hidden">
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
        {/* Hero */}
        <header className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500">
            Intégrations · Connecteur dédié DPO
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300">
            Privacy Tools · push automatique
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Récupère tes preuves DPO (queue d'effacement RGPD art. 17,
            compteurs 90 jours, AIPD, certifs sensibilisation) dans un JSON
            stable. Importable dans <strong>OneTrust</strong>,{" "}
            <strong>Didomi</strong>, <strong>Privacy.fr</strong>,{" "}
            <strong>Dastra</strong>, <strong>Witik</strong>, ou tout outil
            qui consomme du JSON.
          </p>
        </header>

        {/* Quickstart */}
        <section>
          <h2 className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-4">
            🚀 Démarrage en 30 secondes
          </h2>
          <ol className="space-y-3 text-base text-gray-700 dark:text-gray-200 leading-relaxed">
            <li>
              <strong>1.</strong> Active une clé API dans{" "}
              <Link
                href="/admin/api-keys"
                className="text-accent-500 underline-offset-4 hover:underline"
              >
                /admin/api-keys
              </Link>{" "}
              (rôle ADMIN/RSSI, plan Pro ou Enterprise).
            </li>
            <li>
              <strong>2.</strong> Appelle{" "}
              <code className="font-mono text-sm bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                GET /api/v1/dpo-export
              </code>{" "}
              avec le header{" "}
              <code className="font-mono text-sm bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                Authorization: Bearer hxa_…
              </code>
              .
            </li>
            <li>
              <strong>3.</strong> Parse le JSON et importe-le dans ton outil
              Privacy (script Python, n8n, Zapier, webhook).
            </li>
          </ol>
        </section>

        {/* Exemple curl */}
        <section>
          <h2 className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-3">
            🌐 Exemple curl
          </h2>
          <pre className="text-xs sm:text-sm font-mono bg-slate-900 text-emerald-300 p-4 rounded-2xl overflow-x-auto leading-snug border border-slate-700">
            {CURL_EXAMPLE}
          </pre>
        </section>

        {/* Exemple Python */}
        <section>
          <h2 className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-3">
            🐍 Exemple Python : pull Humanix + push OneTrust
          </h2>
          <pre className="text-xs sm:text-sm font-mono bg-slate-900 text-emerald-300 p-4 rounded-2xl overflow-x-auto leading-snug border border-slate-700">
            {PYTHON_EXAMPLE}
          </pre>
          <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
            Adapter le 2e bloc selon l'outil Privacy cible (Didomi, Privacy.fr,
            Dastra, Witik utilisent chacun leur propre endpoint d'import).
          </p>
        </section>

        {/* Schema JSON */}
        <section>
          <h2 className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-4">
            📦 Réponse JSON (schema v1.0)
          </h2>
          <pre className="text-xs sm:text-sm font-mono bg-slate-900 text-emerald-300 p-4 rounded-2xl overflow-x-auto leading-snug border border-slate-700">
            {SAMPLE_RESPONSE}
          </pre>
          <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
            <strong>Stabilité du schéma</strong> : on ne renomme jamais un
            champ. Les évolutions se font uniquement par <strong>ajout</strong>
            {" "}de nouveaux champs (rétrocompatible). Le champ{" "}
            <code className="font-mono">schema_version</code> change
            uniquement si un breaking change est inévitable.
          </p>
        </section>

        {/* Outils cibles */}
        <section>
          <h2 className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-4">
            🎯 Outils Privacy compatibles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TARGETS.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
              >
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <h3 className="font-display font-bold text-primary-500 dark:text-accent-300">
                    {t.name}
                  </h3>
                  <span className="text-xs text-gray-500">{t.region}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-200 mb-2 leading-relaxed">
                  {t.notes}
                </p>
                <p className="text-xs italic text-gray-600 dark:text-gray-300 mb-2">
                  💡 {t.pertinence}
                </p>
                <a
                  href={t.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent-500 underline-offset-4 hover:underline"
                >
                  Documentation officielle →
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Sécurité & rate limit */}
        <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 p-5 sm:p-6">
          <h2 className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300 mb-3">
            🔐 Sécurité & quotas
          </h2>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
            <li>
              ✓ <strong>Auth :</strong> API key tenant (header{" "}
              <code>Authorization: Bearer</code>), hash SHA-256 stocké en BDD, révocable
              en 1 clic depuis{" "}
              <Link
                href="/admin/api-keys"
                className="text-accent-500 underline-offset-4 hover:underline"
              >
                /admin/api-keys
              </Link>
              .
            </li>
            <li>
              ✓ <strong>Plan-gating :</strong> Pro et Enterprise uniquement.
            </li>
            <li>
              ✓ <strong>Rate limit :</strong> 10 requêtes/heure par tenant
              (le DPO sync typiquement 1× par jour, le quota est large).
            </li>
            <li>
              ✓ <strong>Audit trail :</strong> chaque appel logue un
              événement <code>DPO_EXPORT_REQUESTED</code> visible dans{" "}
              <Link
                href="/admin/audit"
                className="text-accent-500 underline-offset-4 hover:underline"
              >
                /admin/audit
              </Link>
              .
            </li>
            <li>
              ✓ <strong>Pas de PII inutile :</strong> les emails d'utilisateurs
              n'apparaissent que dans la queue d'effacement (où c'est la finalité
              même de la demande) et l'activité récente (où l'audit log les a
              déjà). Pas de bulk export d'annuaire.
            </li>
          </ul>
        </section>

        {/* Liens connexes */}
        <section className="grid sm:grid-cols-3 gap-3">
          <RelatedCard
            href="/dpo"
            title="Espace DPO"
            desc="Landing dédiée + dashboard /admin/dpo + générateur AIPD"
          />
          <RelatedCard
            href="/integrations/ciso-assistant"
            title="Connecteur CISO Assistant"
            desc="Pour les RSSI : push GRC ISO 27001, NIS2, ANSSI HG"
          />
          <RelatedCard
            href="/integrations/api"
            title="API complète"
            desc="Documentation OpenAPI 3.1, tous les endpoints v1"
          />
        </section>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 italic">
          Connecteur lancé le 24 mai 2026. Schema v1.0 stable, évolutions par
          ajout de champs uniquement.
        </p>
      </div>
    </main>
  );
}

function RelatedCard({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-accent-300 dark:hover:border-accent-700 transition-colors"
    >
      <p className="font-display font-bold text-primary-500 dark:text-accent-300">
        {title}
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{desc}</p>
    </Link>
  );
}
