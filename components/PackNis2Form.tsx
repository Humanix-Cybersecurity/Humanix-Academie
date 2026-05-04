"use client";

// Formulaire de saisie des variables du Pack NIS2.
// Soumission GET vers /api/admin/pack-nis2/download avec query params.
// Pas d'etat serveur a stocker : a chaque telechargement on re-genere.

import { useState } from "react";

type Props = { tenantName: string };

export default function PackNis2Form({ tenantName }: Props) {
  const [submitting, setSubmitting] = useState(false);

  function onSubmit() {
    setSubmitting(true);
    // On laisse le navigateur gerer la soumission GET native ; le timeout
    // ci-dessous reactive le bouton si l'utilisateur reste sur la page.
    setTimeout(() => setSubmitting(false), 4000);
  }

  return (
    <form
      action="/api/admin/pack-nis2/download"
      method="GET"
      onSubmit={onSubmit}
      className="card space-y-5"
      aria-label="Génération du pack NIS2"
    >
      <h2 className="text-xl font-bold text-primary-500">
        Vos informations
      </h2>
      <p className="text-sm text-gray-500">
        Saisissez ces informations une fois — elles seront injectées dans les 4
        documents PDF générés. Aucune information n'est stockée serveur côté
        Humanix au-delà de la requête.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="nis2-tenant-name" className="block text-xs font-bold uppercase text-gray-500 mb-1">
            Raison sociale <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="nis2-tenant-name"
            name="tenantName"
            type="text"
            required
            defaultValue={tenantName}
            className="input w-full"
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="nis2-siren" className="block text-xs font-bold uppercase text-gray-500 mb-1">
            SIREN
          </label>
          <input
            id="nis2-siren"
            name="tenantSiren"
            type="text"
            pattern="\d{9}"
            placeholder="123 456 789"
            className="input w-full font-mono"
          />
        </div>
        <div>
          <label htmlFor="nis2-city" className="block text-xs font-bold uppercase text-gray-500 mb-1">
            Ville du siège <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="nis2-city"
            name="headquarterCity"
            type="text"
            required
            placeholder="Paris"
            className="input w-full"
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="nis2-director-name" className="block text-xs font-bold uppercase text-gray-500 mb-1">
            Nom du dirigeant signataire <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="nis2-director-name"
            name="directeurName"
            type="text"
            required
            placeholder="Jean Dupont"
            className="input w-full"
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="nis2-director-title" className="block text-xs font-bold uppercase text-gray-500 mb-1">
            Fonction du dirigeant <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="nis2-director-title"
            name="directeurTitle"
            type="text"
            required
            placeholder="Président"
            defaultValue="Président"
            className="input w-full"
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="nis2-director-email" className="block text-xs font-bold uppercase text-gray-500 mb-1">
            Email du dirigeant <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="nis2-director-email"
            name="directeurEmail"
            type="email"
            required
            placeholder="contact@entreprise.fr"
            className="input w-full"
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="nis2-dpo" className="block text-xs font-bold uppercase text-gray-500 mb-1">
            DPO ou référent cyber
          </label>
          <input
            id="nis2-dpo"
            name="dpoOrReferent"
            type="text"
            placeholder="Marie Martin (DPO)"
            className="input w-full"
          />
        </div>
        <div>
          <label htmlFor="nis2-crisis-name" className="block text-xs font-bold uppercase text-gray-500 mb-1">
            Contact crise (nom)
          </label>
          <input
            id="nis2-crisis-name"
            name="contactCriseName"
            type="text"
            placeholder="Marie Martin"
            className="input w-full"
          />
        </div>
        <div>
          <label htmlFor="nis2-crisis-email" className="block text-xs font-bold uppercase text-gray-500 mb-1">
            Contact crise (email)
          </label>
          <input
            id="nis2-crisis-email"
            name="contactCriseEmail"
            type="email"
            placeholder="cyber@entreprise.fr"
            className="input w-full"
          />
        </div>
        <div>
          <label htmlFor="nis2-crisis-tel" className="block text-xs font-bold uppercase text-gray-500 mb-1">
            Contact crise (téléphone)
          </label>
          <input
            id="nis2-crisis-tel"
            name="contactCriseTel"
            type="tel"
            placeholder="+33 1 23 45 67 89"
            className="input w-full"
          />
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "Génération en cours…" : "📄 Télécharger mon pack PDF"}
      </button>
    </form>
  );
}
