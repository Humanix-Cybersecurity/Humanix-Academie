"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Boutons d'action pour /profil/facturation : ouvrir le Customer Portal
// Stripe ou rediriger vers /tarifs.

import { useState } from "react";

export default function BillingActions({
  hasSubscription,
  stripeReady,
}: {
  hasSubscription: boolean;
  stripeReady: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPortal = async () => {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Impossible d'ouvrir le portail Stripe.");
        setPending(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Erreur réseau.");
      setPending(false);
    }
  };

  if (!hasSubscription) return null;

  return (
    <div>
      {error && (
        <p
          role="alert"
          className="text-sm bg-amber-50 border border-amber-300 text-amber-900 rounded p-2 mb-2"
        >
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={onPortal}
        disabled={pending || !stripeReady}
        className="btn-primary text-sm"
      >
        {pending ? "Ouverture…" : "Gérer mon abonnement (Stripe)"}
      </button>
      <p className="text-xs text-gray-500 mt-2">
        Vous serez redirigé vers le portail sécurisé Stripe pour modifier
        votre méthode de paiement, télécharger vos factures ou changer de plan.
      </p>
    </div>
  );
}
