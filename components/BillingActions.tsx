"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Boutons d'action pour /profil/facturation : update CB Payplug ou
// annulation d'abonnement.

import { useState } from "react";

export default function BillingActions({
  hasSubscription,
  paymentReady,
}: {
  hasSubscription: boolean;
  paymentReady: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);

  const onPortal = async () => {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/payments/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible d'ouvrir le portail.");
        setPending(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      // Payplug n'a pas pu generer une URL hosted -> fallback : on affiche
      // l'option d'annulation ci-dessous
      setFallback(true);
      setPending(false);
    } catch {
      setError("Erreur réseau.");
      setPending(false);
    }
  };

  const onCancel = async () => {
    if (
      !confirm(
        "Annuler votre abonnement ? Votre tenant retombera sur le plan d'essai à la fin de la période en cours.",
      )
    ) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/payments/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible d'annuler l'abonnement.");
        setPending(false);
        return;
      }
      window.location.reload();
    } catch {
      setError("Erreur réseau.");
      setPending(false);
    }
  };

  if (!hasSubscription) return null;

  return (
    <div className="space-y-2">
      {error && (
        <p
          role="alert"
          className="text-sm bg-amber-50 border border-amber-300 text-amber-900 rounded p-2"
        >
          {error}
        </p>
      )}
      {!fallback ? (
        <>
          <button
            type="button"
            onClick={onPortal}
            disabled={pending || !paymentReady}
            className="btn-primary text-sm"
          >
            {pending ? "Ouverture…" : "Mettre à jour mon moyen de paiement"}
          </button>
          <p className="text-xs text-gray-500">
            Vous serez redirigé vers la page sécurisée Payplug pour modifier
            votre carte bancaire.
          </p>
        </>
      ) : (
        <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 rounded p-2">
          Pour modifier votre moyen de paiement, contactez{" "}
          <a
            href="mailto:facturation@humanix-cybersecurity.fr"
            className="underline"
          >
            facturation@humanix-cybersecurity.fr
          </a>{" "}
          (le portail self-service Payplug sera ajouté prochainement).
        </p>
      )}

      <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="text-xs text-rose-700 hover:underline"
        >
          Annuler mon abonnement
        </button>
      </div>
    </div>
  );
}
