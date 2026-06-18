"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Mini-eligibilite NIS2 : 3 questions, resultat instantane cote client.
// Aucune donnee envoyee au serveur, rien stocke (RGPD-friendly). S'appuie
// sur le moteur pur lib/nis2/eligibility.

import { useState } from "react";
import Link from "next/link";
import {
  evaluateNis2Eligibility,
  NIS2_SECTEURS,
  NIS2_TAILLES,
  type Nis2Secteur,
  type Nis2Taille,
  type Nis2EligibilityResult,
} from "@/lib/nis2/eligibility";

const TON_STYLE: Record<
  Nis2EligibilityResult["ton"],
  { box: string; titre: string }
> = {
  info: {
    box: "border-primary-300 dark:border-primary-800 bg-primary-50/70 dark:bg-primary-950/30",
    titre: "text-primary-700 dark:text-accent-200",
  },
  attention: {
    box: "border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30",
    titre: "text-amber-800 dark:text-amber-200",
  },
  neutre: {
    box: "border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40",
    titre: "text-gray-800 dark:text-gray-100",
  },
};

function Pill({
  name,
  value,
  checked,
  onChange,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className="cursor-pointer block rounded-2xl border-2 border-gray-200 dark:border-slate-700 p-4 hover:border-accent-400 has-[input:checked]:border-accent-500 has-[input:checked]:bg-accent-50 dark:has-[input:checked]:bg-accent-950/40 transition-colors">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {children}
    </label>
  );
}

export default function EligibiliteWizard() {
  const [secteur, setSecteur] = useState<Nis2Secteur | null>(null);
  const [taille, setTaille] = useState<Nis2Taille | null>(null);
  const [fournisseur, setFournisseur] = useState<boolean | null>(null);
  const [result, setResult] = useState<Nis2EligibilityResult | null>(null);

  const complet = secteur !== null && taille !== null && fournisseur !== null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!complet) return;
    setResult(
      evaluateNis2Eligibility({
        secteur,
        taille,
        fournisseurEntiteRegulee: fournisseur,
      }),
    );
    // Laisse le DOM peindre le resultat avant de scroller dessus
    requestAnimationFrame(() => {
      document
        .getElementById("eligibilite-resultat")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Q1 - Secteur */}
      <fieldset className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <legend className="font-display text-lg font-bold text-primary-600 dark:text-accent-300 px-2">
          1. Dans quel secteur êtes-vous ?
        </legend>
        <div className="space-y-3 mt-2">
          {NIS2_SECTEURS.map((s) => (
            <Pill
              key={s.id}
              name="secteur"
              value={s.id}
              checked={secteur === s.id}
              onChange={() => setSecteur(s.id)}
            >
              <span className="block font-bold text-gray-900 dark:text-gray-100">
                {s.label}
              </span>
              <span className="block text-sm text-gray-600 dark:text-gray-400 mt-1">
                {s.exemples}
              </span>
            </Pill>
          ))}
        </div>
      </fieldset>

      {/* Q2 - Taille */}
      <fieldset className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <legend className="font-display text-lg font-bold text-primary-600 dark:text-accent-300 px-2">
          2. Quelle est la taille de votre organisation ?
        </legend>
        <div className="grid sm:grid-cols-2 gap-3 mt-2">
          {NIS2_TAILLES.map((t) => (
            <Pill
              key={t.id}
              name="taille"
              value={t.id}
              checked={taille === t.id}
              onChange={() => setTaille(t.id)}
            >
              <span className="block font-bold text-gray-900 dark:text-gray-100">
                {t.label}
              </span>
              <span className="block text-sm text-gray-600 dark:text-gray-400 mt-1">
                {t.critere}
              </span>
            </Pill>
          ))}
        </div>
      </fieldset>

      {/* Q3 - Fournisseur */}
      <fieldset className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <legend className="font-display text-lg font-bold text-primary-600 dark:text-accent-300 px-2">
          3. Fournissez-vous un produit ou service à une grande entreprise ou
          un acteur d'un secteur réglementé ?
        </legend>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-3 px-2 italic">
          Par exemple : vous êtes prestataire, fournisseur ou sous-traitant d'un
          hôpital, d'une banque, d'un opérateur d'énergie, d'une grande
          industrie.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Pill
            name="fournisseur"
            value="oui"
            checked={fournisseur === true}
            onChange={() => setFournisseur(true)}
          >
            <span className="block font-bold text-gray-900 dark:text-gray-100">
              Oui, au moins un client de ce type
            </span>
          </Pill>
          <Pill
            name="fournisseur"
            value="non"
            checked={fournisseur === false}
            onChange={() => setFournisseur(false)}
          >
            <span className="block font-bold text-gray-900 dark:text-gray-100">
              Non, ou je ne crois pas
            </span>
          </Pill>
        </div>
      </fieldset>

      {/* Submit */}
      <div className="text-center">
        <button
          type="submit"
          disabled={!complet}
          className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-8 py-3 rounded-xl text-lg shadow-md transition-colors"
        >
          Voir si je suis concerné →
        </button>
        {!complet && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Répondez aux 3 questions pour voir le résultat.
          </p>
        )}
      </div>

      {/* Resultat */}
      {result && (
        <section
          id="eligibilite-resultat"
          aria-live="polite"
          className={`rounded-3xl border-2 p-6 sm:p-8 ${TON_STYLE[result.ton].box}`}
        >
          <h2
            className={`font-display text-2xl font-bold mb-3 ${TON_STYLE[result.ton].titre}`}
          >
            {result.titre}
          </h2>
          <p className="text-gray-800 dark:text-gray-100 leading-relaxed mb-3">
            {result.resume}
          </p>
          <p className="text-gray-700 dark:text-gray-200 leading-relaxed mb-5">
            {result.consequence}
          </p>
          <div className="rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 p-4 mb-5">
            <p className="text-sm text-gray-700 dark:text-gray-200">
              <span aria-hidden="true">👉 </span>
              {result.prochaineEtape}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/diagnostic-nis2"
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-colors"
            >
              Faire le diagnostic →
            </Link>
            <Link
              href="/nis2/comprendre"
              className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 hover:border-accent-400 font-bold px-6 py-3 rounded-xl transition-colors"
            >
              Comprendre NIS2 d'abord
            </Link>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-5 leading-relaxed">
            Estimation indicative, fournie pour vous orienter. Elle ne
            constitue pas un avis juridique. Le périmètre exact dépend des
            textes de transposition de NIS2 et de votre situation : certaines
            entités sont concernées quelle que soit leur taille.
          </p>
        </section>
      )}
    </form>
  );
}
