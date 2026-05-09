// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Form client de saisie de la config SAML par tenant.

"use client";

import { useState, useTransition } from "react";
import {
  upsertSamlConfig,
  deleteSamlConfig,
} from "@/app/admin/sso-saml/actions";

type Initial = {
  label: string;
  spEntityId: string;
  idpEntityId: string;
  idpSsoUrl: string;
  idpCertificate: string;
  isActive: boolean;
};

export default function SamlConfigForm({
  initial,
  hasExisting,
}: {
  initial: Initial;
  hasExisting: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await upsertSamlConfig(fd);
      if (res.ok) {
        setFeedback({ type: "ok", msg: "✅ Configuration SAML enregistrée." });
      } else {
        setFeedback({
          type: "err",
          msg: res.message ?? `Erreur : ${res.error}`,
        });
      }
    });
  };

  const onDelete = () => {
    if (!confirm("Supprimer la configuration SAML de ce tenant ?")) return;
    startTransition(async () => {
      await deleteSamlConfig();
      setFeedback({ type: "ok", msg: "🗑 Configuration SAML supprimée." });
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          name="label"
          label="Libellé interne"
          placeholder="Ex: ADFS production"
          defaultValue={initial.label}
          required
        />
        <Field
          name="spEntityId"
          label="SP Entity ID"
          defaultValue={initial.spEntityId}
          required
          monospace
          help="Identifiant unique d'Humanix côté IdP. Tu peux laisser le défaut."
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          name="idpEntityId"
          label="IdP Entity ID"
          placeholder="Ex: https://acme.okta.com/exk1abc.../sso/saml"
          defaultValue={initial.idpEntityId}
          required
          monospace
          help="Issuer de l'IdP, copié depuis la config IdP."
        />
        <Field
          name="idpSsoUrl"
          label="IdP SSO URL (HTTPS)"
          placeholder="Ex: https://acme.okta.com/app/.../sso/saml"
          defaultValue={initial.idpSsoUrl}
          required
          monospace
          type="url"
          help="URL où on redirige l'user pour le challenge SAML."
        />
      </div>

      <div>
        <label
          htmlFor="idp-certificate"
          className="block text-xs font-bold uppercase text-gray-500 mb-1"
        >
          Certificat X509 de l&apos;IdP (PEM)
        </label>
        <textarea
          id="idp-certificate"
          name="idpCertificate"
          rows={8}
          defaultValue={initial.idpCertificate}
          placeholder={`-----BEGIN CERTIFICATE-----
MIIDxxx...
-----END CERTIFICATE-----`}
          className="input w-full font-mono text-[11px] leading-tight"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Sert à valider la signature de la SAML Response. Téléchargez-le
          depuis l&apos;IdP (souvent &quot;X.509 Certificate&quot; ou
          &quot;Signing Certificate&quot;).
        </p>
      </div>

      <label className="inline-flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial.isActive}
          className="w-5 h-5 accent-accent-500"
        />
        <span className="text-sm">
          <strong className="text-gray-900 dark:text-gray-100">
            Activer SAML pour ce tenant
          </strong>
          <span className="block text-xs text-gray-500 mt-0.5">
            Une fois la voie d&apos;intégration choisie côté infra (cf. doc).
          </span>
        </span>
      </label>

      <div className="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-slate-700">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary text-sm px-5 disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : hasExisting ? "Mettre à jour" : "Enregistrer"}
        </button>
        {hasExisting && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="text-sm text-rose-600 hover:text-rose-700 underline disabled:opacity-50"
          >
            Supprimer la config
          </button>
        )}
        {feedback && (
          <span
            className={`text-sm font-medium ${feedback.type === "ok" ? "text-success" : "text-warn"}`}
          >
            {feedback.msg}
          </span>
        )}
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required,
  placeholder,
  monospace,
  help,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  monospace?: boolean;
  help?: string;
  type?: string;
}) {
  return (
    <div>
      <label
        htmlFor={`saml-${name}`}
        className="block text-xs font-bold uppercase text-gray-500 mb-1"
      >
        {label}
      </label>
      <input
        id={`saml-${name}`}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className={`input w-full ${monospace ? "font-mono text-xs" : "text-sm"}`}
      />
      {help && (
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{help}</p>
      )}
    </div>
  );
}
