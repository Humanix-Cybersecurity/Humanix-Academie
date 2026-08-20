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

  // Coordonnees de facturation. Obligatoires : sans denomination ni adresse
  // de l'acheteur, aucune facture conforme ne peut etre emise (article 242
  // nonies A de l'annexe II au CGI). Les collecter ici evite qu'un client
  // paie sans pouvoir etre facture.
  const [adresse, setAdresse] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [ville, setVille] = useState("");
  const [pays, setPays] = useState("FR");
  const [siren, setSiren] = useState("");
  const [tvaIntra, setTvaIntra] = useState("");
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
            // La denomination de facturation reprend le nom d'organisation :
            // un champ de moins a remplir, et c'est la meme entite.
            raisonSociale: organization,
            adresse,
            codePostal,
            ville,
            pays,
            siren,
            tvaIntra,
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
          {billing === "annual"
            ? "Annuel · 12 mois"
            : "Mensuel · sans engagement"}
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

      {/* ================= Coordonnees de facturation =================
          Obligatoires cote loi : une facture sans denomination ni adresse de
          l'acheteur n'est pas conforme. Les demander ici plutot qu'apres le
          paiement evite qu'un client paie sans pouvoir etre facture. */}
      <fieldset className="space-y-4 rounded-xl border-2 border-gray-200 p-4 dark:border-slate-700">
        <legend className="px-2 text-sm font-bold">
          Coordonnées de facturation
        </legend>
        <p className="text-xs text-gray-500">
          Elles figureront sur vos factures. La raison sociale reprend le nom
          d&apos;organisation saisi plus haut.
        </p>

        <div>
          <label
            htmlFor="souscrire-adresse"
            className="block text-sm font-medium mb-1"
          >
            Adresse <span className="text-warn">*</span>
          </label>
          <input
            id="souscrire-adresse"
            type="text"
            required
            maxLength={200}
            autoComplete="street-address"
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder="12 rue de l'Exemple"
            className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="souscrire-cp"
              className="block text-sm font-medium mb-1"
            >
              Code postal <span className="text-warn">*</span>
            </label>
            <input
              id="souscrire-cp"
              type="text"
              required
              maxLength={20}
              autoComplete="postal-code"
              value={codePostal}
              onChange={(e) => setCodePostal(e.target.value)}
              className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="souscrire-ville"
              className="block text-sm font-medium mb-1"
            >
              Ville <span className="text-warn">*</span>
            </label>
            <input
              id="souscrire-ville"
              type="text"
              required
              maxLength={100}
              autoComplete="address-level2"
              value={ville}
              onChange={(e) => setVille(e.target.value)}
              className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="souscrire-pays"
              className="block text-sm font-medium mb-1"
            >
              Pays <span className="text-warn">*</span>
            </label>
            <input
              id="souscrire-pays"
              type="text"
              required
              maxLength={2}
              autoComplete="country"
              value={pays}
              onChange={(e) => setPays(e.target.value.toUpperCase())}
              placeholder="FR"
              className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none uppercase"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="souscrire-siren"
              className="block text-sm font-medium mb-1"
            >
              SIREN
            </label>
            <input
              id="souscrire-siren"
              type="text"
              maxLength={20}
              value={siren}
              onChange={(e) => setSiren(e.target.value)}
              placeholder="123456789"
              className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Obligatoire entre entreprises établies en France.
            </p>
          </div>
          <div>
            <label
              htmlFor="souscrire-tva"
              className="block text-sm font-medium mb-1"
            >
              N° de TVA intracommunautaire
            </label>
            <input
              id="souscrire-tva"
              type="text"
              maxLength={20}
              value={tvaIntra}
              onChange={(e) => setTvaIntra(e.target.value)}
              placeholder="FR80103901799"
              className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Hors de France, il permet l&apos;autoliquidation.
            </p>
          </div>
        </div>
      </fieldset>

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
            ? "Paiement sécurisé Mollie 🇪🇺 · CB / SEPA / PayPal / Apple Pay · engagement 12 mois, prélèvement annuel."
            : "Paiement sécurisé Mollie 🇪🇺 · CB / SEPA / PayPal / Apple Pay · résiliable à tout moment."}
      </p>
    </form>
  );
}
