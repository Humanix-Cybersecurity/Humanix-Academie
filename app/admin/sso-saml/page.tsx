// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/sso-saml
//
// Configuration SAML 2.0 par tenant. Page admin de saisie. La validation
// runtime (signature SAML XMLDSIG) est faite par la voie d'integration
// active cote infra (cf. /integrations/sso-saml pour les 3 voies).
//
// Auth : ADMIN, RSSI, SUPERADMIN

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSection from "@/components/admin/AdminSection";
import SamlConfigForm from "@/components/admin/SamlConfigForm";

export const dynamic = "force-dynamic";

export default async function AdminSamlPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/admin");
  }
  const tenantId = session.user.tenantId as string;

  const [tenant, config] = await Promise.all([
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    }),
    db.tenantSamlConfig.findUnique({
      where: { tenantId },
    }),
  ]);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-cybersecurity.fr";
  const defaultSpEntityId = `${baseUrl}/api/auth/saml/${tenant?.slug ?? ""}/metadata`;
  const acsUrl = `${baseUrl}/api/auth/saml/${tenant?.slug ?? ""}/acs`;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="SSO SAML 2.0"
        description="Fédération avec votre IdP SAML (ADFS, Azure AD SAML, Okta SAML, Keycloak). Pour OIDC moderne (Microsoft Entra, Google Workspace), utilisez plutôt /admin/api-keys."
        icon="🔐"
      />

      {/* Bandeau d'information : voies d'integration */}
      <article className="rounded-xl border border-cyan-200 dark:border-cyan-900/40 bg-cyan-50/60 dark:bg-cyan-900/15 p-4">
        <h3 className="font-bold text-cyan-900 dark:text-cyan-100 text-sm flex items-center gap-2 mb-2">
          <span aria-hidden="true">ℹ️</span>
          Activation de SAML : 3 voies disponibles
        </h3>
        <p className="text-xs text-cyan-900/85 dark:text-cyan-100/85 leading-relaxed">
          Selon ton infra, choisis la voie qui te convient — toutes
          consomment la config saisie ci-dessous.{" "}
          <Link
            href="/integrations/sso-saml"
            className="underline font-semibold"
          >
            Lire le guide complet (5 min) →
          </Link>
        </p>
      </article>

      <AdminSection
        title="Endpoints SP (à donner à votre administrateur IdP)"
        description="Copiez ces valeurs dans la config de votre IdP (ADFS, Okta, Entra...) lors de la déclaration de l'application."
      >
        <dl className="space-y-3 text-sm">
          <Field
            label="SP Entity ID (Entity ID, Identifier)"
            value={defaultSpEntityId}
          />
          <Field
            label="Assertion Consumer Service (ACS URL, Reply URL)"
            value={acsUrl}
          />
          <Field
            label="NameID Format"
            value="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
          />
          <Field label="Binding" value="HTTP-POST" />
        </dl>
        <p className="text-xs text-gray-500 mt-3 italic">
          Note : ces URLs deviennent fonctionnelles UNE FOIS la voie
          d&apos;intégration SAML activée côté infra (cf. lien plus haut).
        </p>
      </AdminSection>

      <AdminSection
        title="Configuration de l'IdP"
        description="Saisissez les infos copiées depuis votre IdP. Le certificat sert à valider la signature des SAML Responses."
      >
        <SamlConfigForm
          initial={
            config
              ? {
                  label: config.label,
                  spEntityId: config.spEntityId,
                  idpEntityId: config.idpEntityId,
                  idpSsoUrl: config.idpSsoUrl,
                  idpCertificate: config.idpCertificate,
                  isActive: config.isActive,
                }
              : {
                  label: "",
                  spEntityId: defaultSpEntityId,
                  idpEntityId: "",
                  idpSsoUrl: "",
                  idpCertificate: "",
                  isActive: false,
                }
          }
          hasExisting={!!config}
        />
      </AdminSection>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid sm:grid-cols-[280px_1fr] gap-2 items-start">
      <dt className="text-xs uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd>
        <code className="font-mono text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md px-2 py-1 break-all">
          {value}
        </code>
      </dd>
    </div>
  );
}
