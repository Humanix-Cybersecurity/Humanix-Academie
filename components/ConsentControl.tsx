"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// ConsentControl - panneau permettant a l'utilisateur de revoir / modifier
// son choix de consentement analytics a tout moment.
//
// Affiche :
//   - Etat courant ("Vous avez accepté" / "Vous avez refusé" / "Pas encore
//     décidé")
//   - 2 boutons pour changer le choix (parite stricte)
//   - Date de la decision (si disponible - best effort, optionnel)
//
// A integrer sur les pages /confidentialite et /cookies pour respecter le
// droit RGPD de revoquer son consentement aussi facilement que de l'avoir
// donne (article 7.3 RGPD).
// =============================================================================

import { useEffect, useState } from "react";

const STORAGE_KEY = "humanix-cookie-consent";

type Consent = "granted" | "denied" | null;

/**
 * Memes regles que CookieBanner : pas de tracker cloud configure = pas
 * de panneau (rien a consentir, donc rien a revoquer).
 */
const NEEDS_CONSENT =
  typeof process !== "undefined" &&
  !!process.env.NEXT_PUBLIC_PLAUSIBLE_CLOUD_SCRIPT;

export default function ConsentControl() {
  const [consent, setConsent] = useState<Consent>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      if (v === "granted" || v === "denied") setConsent(v);
    } catch {
      /* localStorage indisponible (mode prive) */
    }

    // Synchronisation cross-tab : si l'user change son choix dans un autre
    // onglet, on met a jour ici aussi.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const v = e.newValue;
        if (v === "granted" || v === "denied") setConsent(v);
        else setConsent(null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setChoice = (next: "granted" | "denied") => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    setConsent(next);
    // Notifie PlausibleLoader (qui ecoute cet event)
    window.dispatchEvent(
      new CustomEvent("humanix-consent-changed", { detail: next }),
    );
  };

  if (!mounted) {
    // Evite l'hydration mismatch : rien ne s'affiche tant qu'on n'a pas
    // lu le localStorage (cote client uniquement).
    return null;
  }

  if (!NEEDS_CONSENT) {
    // Aucun traceur soumis a consentement n'est configure : on affiche un
    // message neutre plutot que de masquer la section silencieusement.
    return (
      <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-900/15 p-5 sm:p-6 my-6">
        <p className="text-xs uppercase tracking-[0.25em] font-bold text-emerald-700 dark:text-emerald-300 mb-2">
          Mesure d&apos;audience
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          🔒 Cette instance n&apos;active aucun traceur soumis a consentement.
          Aucun cookie analytics, aucun appel reseau vers un tiers - rien a
          accepter ou refuser.
        </p>
      </div>
    );
  }

  const statusLabel =
    consent === "granted"
      ? "✅ Vous avez accepté la mesure d'audience anonyme."
      : consent === "denied"
        ? "🚫 Vous avez refusé la mesure d'audience."
        : "❓ Vous n'avez pas encore choisi.";

  const helpText =
    consent === "granted"
      ? "Le script Plausible Analytics est chargé. Aucun cookie tiers, aucun profilage. Vos données restent en Europe."
      : consent === "denied"
        ? "Aucun script analytics n'est chargé. Aucun appel réseau vers plausible.io."
        : "Le bandeau de consentement s'affiche jusqu'à votre choix.";

  return (
    <div className="rounded-2xl border-2 border-accent-500/30 bg-accent-50/40 dark:bg-accent-900/15 p-5 sm:p-6 my-6">
      <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-700 dark:text-accent-300 mb-2">
        Votre choix
      </p>
      <h3 className="font-display text-lg font-bold text-primary-500 dark:text-accent-300 mb-2">
        Mesure d'audience anonyme (Plausible)
      </h3>
      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-4">
        {statusLabel}
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
        {helpText}
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => setChoice("denied")}
          aria-pressed={consent === "denied"}
          className={`px-4 py-2 rounded-lg border-2 text-sm font-bold transition ${
            consent === "denied"
              ? "border-gray-700 bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-gray-100"
              : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 hover:border-gray-400"
          }`}
        >
          Refuser
        </button>
        <button
          type="button"
          onClick={() => setChoice("granted")}
          aria-pressed={consent === "granted"}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm ${
            consent === "granted"
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-primary-500 text-white hover:bg-primary-600"
          }`}
        >
          {consent === "granted" ? "Accepté ✓" : "Accepter"}
        </button>
      </div>
    </div>
  );
}
