// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Formulaire de configuration de la marque blanche, avec APERÇU LIVE.
// Objectif : facilité d'usage maximale — l'admin upload un logo, choisit 2
// couleurs, et voit immédiatement le rendu sans recharger.

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBranding } from "./actions";

export type BrandingInitial = {
  brandingEnabled: boolean;
  brandName: string;
  emailFromName: string;
  primaryColor: string;
  accentColor: string;
  hidePoweredBy: boolean;
  brandSubdomain: string;
  logoUrl: string | null;
  faviconUrl: string | null;
};

export default function MarqueBlancheForm({
  initial,
}: {
  initial: BrandingInitial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { kind: "success" | "error"; message: string } | null
  >(null);

  // État live (pour l'aperçu). Les valeurs par défaut Humanix servent de repère.
  const [enabled, setEnabled] = useState(initial.brandingEnabled);
  const [brandName, setBrandName] = useState(initial.brandName);
  const [primary, setPrimary] = useState(initial.primaryColor || "#0B3D91");
  const [accent, setAccent] = useState(initial.accentColor || "#00A3A1");
  const [hidePoweredBy, setHidePoweredBy] = useState(initial.hidePoweredBy);
  const [subdomain, setSubdomain] = useState(initial.brandSubdomain);
  // Aperçu local du logo (data URL) si un nouveau fichier est choisi.
  const [logoPreview, setLogoPreview] = useState<string | null>(initial.logoUrl);

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(String(reader.result));
    reader.readAsDataURL(f);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveBranding(fd);
      if (res.ok) {
        setFeedback({
          kind: "success",
          message: "✓ Marque blanche enregistrée. Rechargement de l'aperçu réel…",
        });
        router.refresh();
      } else {
        setFeedback({ kind: "error", message: res.error });
      }
    });
  };

  const labelCls =
    "block text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1";
  const inputCls =
    "block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sm focus:border-accent-500 focus:outline-none transition";

  return (
    <form onSubmit={onSubmit} className="grid lg:grid-cols-2 gap-6">
      {/* ----------------- Colonne réglages ----------------- */}
      <div className="space-y-5">
        {feedback && (
          <div
            role={feedback.kind === "error" ? "alert" : "status"}
            className={`text-sm rounded-xl p-3 ${
              feedback.kind === "error"
                ? "bg-amber-50 dark:bg-amber-900/30 border border-amber-300 text-amber-900 dark:text-amber-100"
                : "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-300 text-emerald-900 dark:text-emerald-100"
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Interrupteur maître */}
        <label className="flex items-center gap-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 cursor-pointer">
          <input
            type="checkbox"
            name="brandingEnabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-5 w-5"
          />
          <span>
            <span className="block text-sm font-bold">
              Activer la marque blanche
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              Tant que c'est désactivé, l'identité Humanix par défaut s'applique.
            </span>
          </span>
        </label>

        <div>
          <label htmlFor="brandName" className={labelCls}>
            Nom de marque
          </label>
          <input
            id="brandName"
            name="brandName"
            type="text"
            maxLength={80}
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="Ex : Académie Cyber ACME"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="primaryColor" className={labelCls}>
              Couleur primaire
            </label>
            <div className="flex items-center gap-2">
              <input
                id="primaryColor"
                name="primaryColor"
                type="color"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="h-10 w-14 rounded-lg border-2 border-gray-200 dark:border-slate-700 cursor-pointer"
              />
              <span className="text-xs font-mono text-gray-500">{primary}</span>
            </div>
          </div>
          <div>
            <label htmlFor="accentColor" className={labelCls}>
              Couleur d'accent
            </label>
            <div className="flex items-center gap-2">
              <input
                id="accentColor"
                name="accentColor"
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="h-10 w-14 rounded-lg border-2 border-gray-200 dark:border-slate-700 cursor-pointer"
              />
              <span className="text-xs font-mono text-gray-500">{accent}</span>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="logo" className={labelCls}>
            Logo (PNG, SVG, JPG - max 256 Ko)
          </label>
          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
            onChange={onLogoChange}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-accent-500 file:px-3 file:py-2 file:text-white file:cursor-pointer"
          />
          {initial.logoUrl && (
            <label className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
              <input type="checkbox" name="logo_remove" /> Retirer le logo actuel
            </label>
          )}
        </div>

        <div>
          <label htmlFor="favicon" className={labelCls}>
            Favicon (PNG/SVG, max 256 Ko)
          </label>
          <input
            id="favicon"
            name="favicon"
            type="file"
            accept="image/png,image/svg+xml,image/x-icon,image/webp"
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-accent-500 file:px-3 file:py-2 file:text-white file:cursor-pointer"
          />
          {initial.faviconUrl && (
            <label className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
              <input type="checkbox" name="favicon_remove" /> Retirer le favicon
            </label>
          )}
        </div>

        <div>
          <label htmlFor="emailFromName" className={labelCls}>
            Nom d'expéditeur des emails
          </label>
          <input
            id="emailFromName"
            name="emailFromName"
            type="text"
            maxLength={80}
            defaultValue={initial.emailFromName}
            placeholder="Ex : Académie Cyber ACME"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="brandSubdomain" className={labelCls}>
            Sous-domaine public
          </label>
          <div className="flex items-center">
            <input
              id="brandSubdomain"
              name="brandSubdomain"
              type="text"
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              placeholder="acme"
              className={`${inputCls} rounded-r-none`}
            />
            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-slate-800 border-2 border-l-0 border-gray-200 dark:border-slate-700 rounded-r-xl px-3 py-2.5">
              .humanix-academie.fr
            </span>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="hidePoweredBy"
            checked={hidePoweredBy}
            onChange={(e) => setHidePoweredBy(e.target.checked)}
            className="h-5 w-5"
          />
          <span className="text-sm">
            Masquer les mentions « Humanix » (footer, signatures)
          </span>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "💾 Enregistrer la marque blanche"}
        </button>
      </div>

      {/* ----------------- Colonne aperçu live ----------------- */}
      <div className="lg:sticky lg:top-6 h-fit">
        <p className="text-xs uppercase tracking-wider font-bold text-gray-400 mb-2">
          Aperçu en direct
        </p>
        <div className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
          {/* En-tête simulé */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: `3px solid ${accent}` }}
          >
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPreview}
                alt=""
                className="h-8 w-auto"
                style={{ maxWidth: 120 }}
              />
            ) : (
              <div
                className="h-8 w-8 rounded-lg"
                style={{ background: primary }}
                aria-hidden="true"
              />
            )}
            <span className="font-extrabold" style={{ color: primary }}>
              {brandName || "Nom de marque"}
            </span>
          </div>
          {/* Corps simulé */}
          <div className="p-5 space-y-3 bg-white dark:bg-slate-900">
            <span
              className="inline-block text-xs font-bold px-2.5 py-1 rounded-full text-white"
              style={{ background: accent }}
            >
              Badge accent
            </span>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Exemple de contenu de la plateforme avec vos couleurs.
            </p>
            <button
              type="button"
              className="text-sm font-bold text-white px-4 py-2 rounded-xl"
              style={{ background: primary }}
            >
              Bouton primaire
            </button>
            <p className="text-xs pt-2" style={{ color: accent }}>
              Lien d'accent →
            </p>
          </div>
          {/* Footer simulé */}
          <div className="px-4 py-2 text-[10px] text-gray-400 border-t border-gray-100 dark:border-slate-800">
            © {new Date().getFullYear()} {brandName || "Votre marque"}
            {!hidePoweredBy && " · par Humanix-Cybersecurity"}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {enabled
            ? "Marque blanche active : ces réglages s'appliquent à toute la plateforme après enregistrement."
            : "Marque blanche désactivée : l'identité Humanix par défaut reste affichée."}
        </p>
      </div>
    </form>
  );
}
