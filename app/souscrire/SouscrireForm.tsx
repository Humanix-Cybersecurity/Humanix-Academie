"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Form client de /souscrire : email + organisation + (optionnel) sièges
// → POST /api/payments/checkout/start → window.location.href = checkout url.

import { useState, useTransition } from "react";

type Props = {
  planId: string;
  planName: string;
  /** Nb max de sièges du tier (UI : limite haute du selecteur). Null = no cap. */
  maxSeats: number | null;
  /** Cycle de facturation choisi sur /tarifs (mensuel sans engagement / annuel −X%). */
  billing: "monthly" | "annual";
  /** Si true : copie adaptee (pas de paiement Mollie, auto-login direct). */
  devMode?: boolean;
};

export default function SouscrireForm({
  planId,
  planName,
  maxSeats,
  billing,
  devMode = false,
}: Props) {
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [seats, setSeats] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const seatsNum = seats ? Number(seats) : undefined;
    startTransition(async () => {
      try {
        const res = await fetch("/api/payments/checkout/start", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            plan: planId,
            email,
            organization,
            seats: seatsNum,
            billing,
          }),
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          setError(data.error ?? "Impossible de démarrer le paiement.");
          return;
        }
        // Hard navigate vers Mollie (sortie de l'app)
        window.location.href = data.url;
      } catch (err) {
        setError(
          err instanceof Error
            ? `Erreur réseau : ${err.message}`
            : "Erreur réseau, réessaye dans un instant.",
        );
      }
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-gray-200 dark:border-slate-700 p-6 space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300">
          Vos coordonnées
        </h3>
        <span
          className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-1 rounded-full ${
            billing === "annual"
              ? "bg-success/10 text-success"
              : "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300"
          }`}
          aria-label={
            billing === "annual"
              ? "Cycle annuel - engagement 12 mois"
              : "Cycle mensuel - sans engagement"
          }
        >
          {billing === "annual" ? "Annuel · 12 mois" : "Mensuel · sans engagement"}
        </span>
      </div>

      <div>
        <label
          htmlFor="souscrire-org"
          className="block text-sm font-medium mb-1"
        >
          Nom de l&apos;organisation <span className="text-warn">*</span>
        </label>
        <input
          id="souscrire-org"
          type="text"
          required
          maxLength={120}
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          placeholder="Mon organisation"
          className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="souscrire-email"
          className="block text-sm font-medium mb-1"
        >
          Email professionnel (deviendra le compte ADMIN){" "}
          <span className="text-warn">*</span>
        </label>
        <input
          id="souscrire-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="dsi@mapme.fr"
          className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          {devMode
            ? "DEV_MODE actif : pas d'email envoyé, auto-login immédiat sur /admin."
            : "Vous recevrez un lien magique sur cet email après paiement pour accéder à votre console admin."}
        </p>
      </div>

      {maxSeats && maxSeats > 1 && (
        <div>
          <label
            htmlFor="souscrire-seats"
            className="block text-sm font-medium mb-1"
          >
            Nombre d&apos;utilisateurs prévus (estimation)
          </label>
          <input
            id="souscrire-seats"
            type="number"
            min={1}
            max={maxSeats}
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            placeholder={`Jusqu'à ${maxSeats}`}
            className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Le plan {planName} couvre jusqu&apos;à {maxSeats} sièges. Vous
            pourrez ajuster depuis votre console admin.
          </p>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="text-sm bg-amber-50 border border-amber-300 text-amber-900 rounded-lg p-3"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !email || !organization}
        className="btn-primary w-full"
      >
        {pending
          ? devMode
            ? "Provisioning…"
            : "Préparation du paiement…"
          : devMode
            ? "Provisionner et entrer (DEV_MODE)"
            : "Continuer vers le paiement"}
      </button>

      <p className="text-xs text-gray-500 text-center">
        {devMode
          ? "🛠️ DEV_MODE : tenant + ADMIN créés sans appel Mollie."
          : billing === "annual"
            ? "Paiement sécurisé Mollie 🇫🇷 · CB / SEPA · engagement 12 mois, prélèvement annuel."
            : "Paiement sécurisé Mollie 🇫🇷 · CB / SEPA · résiliable à tout moment."}
      </p>
    </form>
  );
}
