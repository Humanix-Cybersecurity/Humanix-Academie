// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /admin/revendeur/[clientId] - Fiche d'un client (revendeur). Permet d'éditer
// sa marque (nom, couleurs, logo, favicon, sous-domaine, masquage Humanix) et
// de le suspendre/réactiver. Vérifie systématiquement que le client appartient
// bien au revendeur connecté (getClientForReseller).

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { getResellerGate, getClientForReseller } from "@/lib/reseller";
import { getRootDomain } from "@/lib/subdomain-tenant";
import { saveClientBranding, setClientActive } from "../actions";

export const dynamic = "force-dynamic";

const ERROR_LABELS: Record<string, string> = {
  invalid_color: "Couleur invalide (format #RRGGBB).",
  invalid_subdomain:
    "Sous-domaine invalide (lettres, chiffres, tirets ; 2 à 40 caractères).",
  subdomain_reserved: "Ce sous-domaine est réservé.",
  subdomain_taken: "Ce sous-domaine est déjà pris.",
  file_too_large: "Fichier trop lourd (max 256 Ko).",
  file_type: "Format non supporté (PNG, JPG, WEBP, SVG, GIF).",
};

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const { clientId } = await params;
  const { msg, error } = await searchParams;

  const gate = await getResellerGate();
  if (!gate.ok) redirect("/admin/revendeur");

  const client = await getClientForReseller(gate.tenantId, clientId);
  if (!client) notFound();

  const rootDomain = getRootDomain();
  const logoUrl = client.brandLogoMime
    ? `/api/branding/${client.id}/logo`
    : null;
  const faviconUrl = client.brandFaviconMime
    ? `/api/branding/${client.id}/favicon`
    : null;

  const inputCls =
    "w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm";
  const labelCls =
    "block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/revendeur"
          className="text-xs text-gray-500 hover:text-accent-500"
        >
          ← Tous mes clients
        </Link>
      </div>
      <AdminPageHeader
        title={client.name}
        description={`Plan ${client.plan} · créé le ${client.createdAt.toLocaleDateString("fr-FR")} · identifiant ${client.slug}`}
        icon="🏢"
      />

      {msg && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/15 p-3 text-sm text-emerald-900 dark:text-emerald-200"
        >
          {msg === "saved" && "✓ Marque du client enregistrée."}
          {msg === "activated" && "✓ Client réactivé."}
          {msg === "suspended" && "✓ Client suspendu."}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border-2 border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-900/15 p-3 text-sm text-rose-900 dark:text-rose-200"
        >
          ⚠ {ERROR_LABELS[error] ?? "Une erreur est survenue."}
        </div>
      )}

      {/* Édition de la marque */}
      <section className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="font-display font-bold text-primary-500 dark:text-accent-300 mb-1">
          Marque du client
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Activez la marque propre pour personnaliser ce client. Désactivée, le
          client hérite de votre marque ({gate.tenant.name}).
        </p>

        <form action={saveClientBranding} className="space-y-5">
          <input type="hidden" name="clientId" value={client.id} />

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="brandingEnabled"
              defaultChecked={client.brandingEnabled}
              className="h-4 w-4"
            />
            Activer la marque propre de ce client
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cb-name" className={labelCls}>
                Nom de marque
              </label>
              <input
                id="cb-name"
                name="brandName"
                maxLength={80}
                defaultValue={client.brandName ?? ""}
                placeholder="ACME Académie"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="cb-from" className={labelCls}>
                Nom d&apos;expéditeur des emails
              </label>
              <input
                id="cb-from"
                name="emailFromName"
                maxLength={80}
                defaultValue={client.brandEmailFromName ?? ""}
                placeholder="ACME Académie"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cb-primary" className={labelCls}>
                Couleur primaire
              </label>
              <input
                id="cb-primary"
                name="primaryColor"
                type="color"
                defaultValue={client.brandPrimaryColor || "#0B3D91"}
                className="h-10 w-20 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label htmlFor="cb-accent" className={labelCls}>
                Couleur d&apos;accent
              </label>
              <input
                id="cb-accent"
                name="accentColor"
                type="color"
                defaultValue={client.brandAccentColor || "#00A3A1"}
                className="h-10 w-20 rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cb-subdomain" className={labelCls}>
              Sous-domaine
            </label>
            <div className="flex items-center">
              <input
                id="cb-subdomain"
                name="subdomain"
                pattern="[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?"
                defaultValue={client.brandSubdomain ?? ""}
                placeholder="acme"
                className="w-40 rounded-l-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono"
              />
              <span className="rounded-r-lg border border-l-0 border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-2 text-sm text-gray-500 font-mono">
                .{rootDomain}
              </span>
            </div>
          </div>

          {/* Logo */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cb-logo" className={labelCls}>
                Logo {logoUrl && "(actuel ci-contre)"}
              </label>
              <input
                id="cb-logo"
                name="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                className="text-sm"
              />
              {logoUrl && (
                <div className="mt-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- logo tenant dynamique */}
                  <img
                    src={logoUrl}
                    alt="Logo client"
                    className="h-10 w-auto rounded border border-gray-200 dark:border-slate-700 bg-white p-1"
                  />
                  <label className="flex items-center gap-1 text-xs text-gray-500">
                    <input type="checkbox" name="logo_remove" /> retirer
                  </label>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="cb-favicon" className={labelCls}>
                Favicon {faviconUrl && "(actuel ci-contre)"}
              </label>
              <input
                id="cb-favicon"
                name="favicon"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                className="text-sm"
              />
              {faviconUrl && (
                <div className="mt-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- favicon tenant dynamique */}
                  <img
                    src={faviconUrl}
                    alt="Favicon client"
                    className="h-8 w-8 rounded border border-gray-200 dark:border-slate-700 bg-white p-1"
                  />
                  <label className="flex items-center gap-1 text-xs text-gray-500">
                    <input type="checkbox" name="favicon_remove" /> retirer
                  </label>
                </div>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="hidePoweredBy"
              defaultChecked={client.brandHidePoweredBy}
              className="h-4 w-4"
            />
            Masquer les mentions « Humanix » (footer)
          </label>

          <button type="submit" className="btn-primary text-sm">
            Enregistrer la marque
          </button>
        </form>
      </section>

      {/* Activation / suspension */}
      <section className="rounded-2xl border-2 border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-900/15 p-5">
        <h2 className="font-display font-bold text-amber-900 dark:text-amber-200 mb-2">
          {client.isActive ? "Suspendre le client" : "Réactiver le client"}
        </h2>
        <p className="text-sm text-amber-800 dark:text-amber-300 mb-4">
          {client.isActive
            ? "Bloque les connexions de tous les utilisateurs de ce client. Réversible, données conservées."
            : "Réautorise les connexions des utilisateurs de ce client."}
        </p>
        <form action={setClientActive}>
          <input type="hidden" name="clientId" value={client.id} />
          <input
            type="hidden"
            name="enable"
            value={client.isActive ? "false" : "true"}
          />
          <button type="submit" className="btn-secondary text-sm">
            {client.isActive ? "Suspendre" : "Réactiver"}
          </button>
        </form>
      </section>
    </div>
  );
}
