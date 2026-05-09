// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /integrations/sso-saml
//
// Page publique : guide commercial + technique sur l'integration SAML 2.0
// Humanix Academie. 3 voies d'integration sont supportees, l'admin choisit
// celle qui colle a son infra.

import Link from "next/link";

export const metadata = {
  title: "SSO SAML 2.0 | Humanix Académie",
  description:
    "Fédération SAML 2.0 avec ADFS, Azure AD SAML, Okta SAML, Keycloak. 3 voies d'intégration supportées : SAML-Jackson, Bridge Keycloak, OIDC fédération.",
};

export default function SamlGuidePage() {
  return (
    <main className="animate-fadeIn">
      <header className="bg-gradient-to-br from-purple-50 via-white to-cyan-50 dark:from-purple-950/30 dark:via-slate-900 dark:to-cyan-950/20 border-b border-purple-200 dark:border-purple-900/40 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Intégration SI
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-3">
            🔐 SSO SAML 2.0
          </h1>
          <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 max-w-3xl mb-6 leading-relaxed">
            Fédération avec votre IdP SAML existant : ADFS, Azure AD SAML
            (legacy), Okta SAML, Keycloak, PingFederate. Pour OIDC moderne
            (Microsoft Entra, Google), utilisez plutôt notre intégration
            OIDC native (déjà incluse).
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/admin/sso-saml"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-medium transition"
            >
              <span aria-hidden="true">⚙️</span>
              Configurer SAML pour mon tenant
            </Link>
            <Link
              href="/integrations/scim"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-accent-500 transition font-medium"
            >
              <span aria-hidden="true">👥</span>
              SCIM 2.0 (provisioning)
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">
            3 voies d&apos;intégration au choix
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Toutes les voies consomment la même configuration saisie dans{" "}
            <Link
              href="/admin/sso-saml"
              className="text-accent-500 underline"
            >
              /admin/sso-saml
            </Link>{" "}
            (Entity ID IdP, SSO URL, certificat X509). Choisissez selon
            votre stack et votre niveau de tolérance ops.
          </p>
        </div>

        <Voie
          number="A"
          recommended
          title="SAML-Jackson sidecar (recommandé)"
          tagline="OSS, Apache 2.0, 5 min à déployer en Docker. Traduit SAML → OIDC, NextAuth consomme l'OIDC."
          pros={[
            "Solution maintenue par BoxyHQ, utilisée en production par Cal.com, Retool, Mattermost",
            "Aucune dépendance lourde côté Humanix : on parle juste OIDC à Jackson",
            "Mise à jour de la lib SAML découplée de Humanix (vous patchez Jackson, pas notre code)",
          ]}
          cons={[
            "Un service additionnel à opérer (Docker container)",
            "Latence supplémentaire ~50ms à chaque login",
          ]}
          steps={[
            "Déployez SAML-Jackson en sidecar : docker run -e DB_URL=... boxyhq/jackson",
            "Saisissez votre config IdP dans Jackson (POST /api/v1/saml/config)",
            "Pointez le client OIDC NextAuth vers https://jackson.acme.fr/oauth (issuer)",
            "Activez le toggle SAML dans /admin/sso-saml côté Humanix",
          ]}
          docUrl="https://github.com/boxyhq/jackson"
        />

        <Voie
          number="B"
          title="Bridge Keycloak"
          tagline="Le plus puissant si vous avez déjà du Keycloak. Keycloak fait l'IdP OIDC pour Humanix, et fédère votre SAML upstream."
          pros={[
            "Pas de nouvelle dépendance si Keycloak est déjà chez vous",
            "Vous gardez la main sur les politiques de session, MFA, WebAuthn",
            "Permet de chaîner avec d'autres protocols (LDAP, CAS, OAuth2)",
          ]}
          cons={[
            "Demande un Keycloak existant ou à déployer (~ ½ journée si from scratch)",
            "Vous opérez 2 layers d'identité (Keycloak + Humanix)",
          ]}
          steps={[
            "Dans Keycloak, créez un Identity Provider de type SAML 2.0 pointant vers votre ADFS/Okta",
            "Créez un client OIDC public 'humanix-academie' dans Keycloak",
            "Côté Humanix, configurez NextAuth avec le client OIDC Keycloak",
            "Les users SAML transitent par Keycloak qui les présente à Humanix en OIDC",
          ]}
          docUrl="https://www.keycloak.org/docs/latest/server_admin/#_saml-v2-0-identity-providers"
        />

        <Voie
          number="C"
          title="Implémentation native (à venir)"
          tagline="Library SAML embarquée dans Humanix, sans sidecar. En cours d'industrialisation, dispo Q3 2026."
          pros={[
            "Aucun service additionnel à opérer",
            "Latence minimale",
            "Solution simple si vous n'avez pas de Keycloak ni Docker",
          ]}
          cons={[
            "Pas encore disponible : nécessite l'intégration de @node-saml/node-saml + xml-crypto",
            "Validation XMLDSIG à industrialiser",
          ]}
          steps={[
            "Pas applicable (en cours)",
            "Pour les clients pressés : voie A ou B fonctionnent immédiatement",
            "ETA : Q3 2026, prévenu par release note",
          ]}
        />

        <hr className="border-gray-200 dark:border-slate-700" />

        <div>
          <h2 className="font-display text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">
            Endpoints SP (Service Provider)
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Une fois la voie active, ces endpoints sont fonctionnels et
            doivent être copiés dans la config de votre IdP. Saisissez la
            config IdP dans{" "}
            <Link
              href="/admin/sso-saml"
              className="text-accent-500 underline"
            >
              /admin/sso-saml
            </Link>{" "}
            pour les voir personnalisés à votre tenant.
          </p>
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-3 text-sm">
            <Endpoint
              method="GET"
              label="Métadata SP (XML)"
              path="/api/auth/saml/{tenantSlug}/metadata"
              description="XML metadata SP à uploader chez votre IdP."
            />
            <Endpoint
              method="GET"
              label="Login (initialisation SAML)"
              path="/api/auth/saml/{tenantSlug}/login"
              description="Redirect vers l'IdP avec AuthnRequest. À lancer depuis le bouton SSO Humanix."
            />
            <Endpoint
              method="POST"
              label="Assertion Consumer Service (ACS)"
              path="/api/auth/saml/{tenantSlug}/acs"
              description="Reçoit la SAML Response signée de l'IdP, valide la signature, créé/match l'user, ouvre la session NextAuth."
            />
          </div>
        </div>

        <hr className="border-gray-200 dark:border-slate-700" />

        <div className="rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700 p-6">
          <h3 className="font-display text-lg font-extrabold text-gray-900 dark:text-gray-100 mb-2">
            🇫🇷 Vous voulez nous déléguer l&apos;activation ?
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            On déploie SAML-Jackson chez vous (ou chez nous), on connecte
            votre ADFS/Okta/Entra SAML, on teste avec 3 users de votre
            choix, on documente. Forfait <strong>1 jour conseil</strong>.
          </p>
          <Link
            href="/demande-abonnement?type=sso-saml"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium transition"
          >
            Demander un devis SSO SAML →
          </Link>
        </div>
      </section>
    </main>
  );
}

function Voie({
  number,
  title,
  tagline,
  recommended,
  pros,
  cons,
  steps,
  docUrl,
}: {
  number: string;
  title: string;
  tagline: string;
  recommended?: boolean;
  pros: string[];
  cons: string[];
  steps: string[];
  docUrl?: string;
}) {
  return (
    <article
      className={`rounded-2xl border-2 ${
        recommended
          ? "border-emerald-300 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900"
          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900"
      } p-6`}
    >
      <header className="flex items-start gap-4 mb-3 flex-wrap">
        <span
          className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-display text-xl font-extrabold flex-shrink-0 ${
            recommended
              ? "bg-emerald-500 text-white"
              : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300"
          }`}
        >
          {number}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-lg font-extrabold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            {recommended && (
              <span className="text-[10px] uppercase tracking-widest font-bold bg-emerald-200 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-100 px-2 py-0.5 rounded-full">
                Recommandé
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 italic mt-1">
            {tagline}
          </p>
        </div>
      </header>

      <div className="grid sm:grid-cols-2 gap-4 mt-4 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-700 dark:text-emerald-400 mb-1">
            Avantages
          </p>
          <ul className="text-xs text-gray-700 dark:text-gray-300 list-disc pl-4 space-y-1">
            {pros.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-rose-700 dark:text-rose-400 mb-1">
            À considérer
          </p>
          <ul className="text-xs text-gray-700 dark:text-gray-300 list-disc pl-4 space-y-1">
            {cons.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400 mb-2">
          Étapes d&apos;activation
        </p>
        <ol className="text-xs text-gray-700 dark:text-gray-300 list-decimal pl-4 space-y-1">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </div>

      {docUrl && (
        <p className="text-xs mt-4">
          <a
            href={docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-500 hover:text-accent-600 underline"
          >
            Documentation officielle →
          </a>
        </p>
      )}
    </article>
  );
}

function Endpoint({
  method,
  label,
  path,
  description,
}: {
  method: "GET" | "POST";
  label: string;
  path: string;
  description: string;
}) {
  const color =
    method === "GET"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
      : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
  return (
    <div className="grid sm:grid-cols-[80px_220px_1fr] gap-3 items-start">
      <span
        className={`text-[10px] font-bold tracking-wider px-2 py-1 rounded-md text-center ${color}`}
      >
        {method}
      </span>
      <code className="text-xs font-mono text-gray-900 dark:text-gray-100 break-all">
        {path}
      </code>
      <div>
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
          {label}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}
