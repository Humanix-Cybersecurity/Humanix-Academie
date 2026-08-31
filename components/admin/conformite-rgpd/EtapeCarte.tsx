"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Une etape du parcours de conformite.
//
// L'ORDRE D'AFFICHAGE EST LA REGLE : la question en francais d'abord, puis
// pourquoi ca compte, puis l'action de la semaine. La reference legale vient
// EN DERNIER, en petit -- pour qui veut verifier, jamais pour accueillir.
//
// Ouvrir par « article 30 » ferait fuir exactement la personne qu'on vise.
import { useState, useTransition } from "react";
import { definirStatutEtape } from "@/app/admin/conformite-rgpd/actions";
import type {
  EtapeParcours,
  StatutEtape,
} from "@/lib/conformite-rgpd/catalogue";
import type { EtatEtape } from "@/lib/conformite-rgpd/etat";
import { MODELES_PAR_ETAPE } from "@/lib/conformite-rgpd/modeles";

const LIBELLE_STATUT: Record<string, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  fait: "Fait",
  sans_objet: "Sans objet",
};

const VERDICT: Record<string, { texte: string; classe: string }> = {
  humanix_fait: {
    texte: "Humanix le fait",
    classe:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  },
  humanix_aide: {
    texte: "On vous aide",
    classe: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  },
  hors_perimetre: {
    texte: "Hors de notre périmètre",
    classe: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-200",
  },
};

export default function EtapeCarte({
  etape,
  etat,
  estProchaine,
}: {
  etape: EtapeParcours;
  etat?: EtatEtape;
  estProchaine: boolean;
}) {
  const [statut, setStatut] = useState(etat?.statut ?? "a_faire");
  const [note, setNote] = useState(etat?.note ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const traitee = statut === "fait" || statut === "sans_objet";
  const verdict = VERDICT[etape.verdict];

  // `sans_objet` n'est offert que si l'etape l'autorise : on ne declare pas
  // sans objet le fait de comprendre le RGPD.
  const statutsOfferts: StatutEtape[] = etape.peutEtreSansObjet
    ? ["a_faire", "en_cours", "fait", "sans_objet"]
    : ["a_faire", "en_cours", "fait"];

  function enregistrer(nouveau: StatutEtape, nouvelleNote?: string) {
    setErreur(null);
    const avant = statut;
    setStatut(nouveau);
    demarrer(async () => {
      const r = await definirStatutEtape(etape.cle, nouveau, nouvelleNote);
      // On remet l'affichage dans l'etat du serveur plutot que de laisser
      // croire a un enregistrement qui n'a pas eu lieu.
      if (!r.ok) {
        setStatut(avant);
        setErreur("Enregistrement impossible. Réessayez.");
      }
    });
  }

  return (
    <article
      className={`rounded-2xl border p-5 transition-colors ${
        traitee
          ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/10"
          : estProchaine
            ? "border-sky-300 bg-white dark:border-sky-800 dark:bg-slate-900"
            : "border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-display text-lg font-bold text-gray-900 dark:text-gray-100">
          {etape.question}
        </h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${verdict.classe}`}
        >
          {verdict.texte}
        </span>
      </div>

      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        {etape.pourquoi}
      </p>

      <div className="mt-3 rounded-xl bg-gray-50 p-3 dark:bg-slate-800/60">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
          Cette semaine
        </p>
        <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">
          {etape.action}
        </p>
      </div>

      {/* Le modele avant le lien externe : pour quelqu'un devant une page
          blanche, un tableau deja structure vaut mieux qu'un site a lire. */}
      {MODELES_PAR_ETAPE[etape.cle] && (
        <a
          href={`/admin/conformite-rgpd/modele/${etape.cle}`}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          <span aria-hidden="true">⬇</span>
          {MODELES_PAR_ETAPE[etape.cle].libelle}
        </a>
      )}

      {etape.ressource && (
        <a
          href={etape.ressource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm font-semibold text-sky-700 underline dark:text-sky-300"
        >
          {etape.ressource.libelle} ↗
        </a>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {statutsOfferts.map((s) => (
          <button
            key={s}
            type="button"
            disabled={enCours}
            aria-pressed={statut === s}
            onClick={() =>
              enregistrer(s, etape.portee === "entreprise" ? note : undefined)
            }
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              statut === s
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-700 dark:text-gray-200"
            }`}
          >
            {LIBELLE_STATUT[s]}
          </button>
        ))}
      </div>

      {/* La note n'existe que sur les etapes d'entreprise : c'est ce que le
          successeur lira en premier. L'apprentissage d'une personne n'a pas
          besoin d'etre justifie. */}
      {etape.portee === "entreprise" && (
        <div className="mt-3">
          <label
            htmlFor={`note-${etape.cle}`}
            className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400"
          >
            Où vous en êtes
          </label>
          <textarea
            id={`note-${etape.cle}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => enregistrer(statut, note)}
            rows={2}
            maxLength={2000}
            placeholder="« Fait pour la paie, reste le recrutement »"
            className="mt-1 w-full rounded-xl border border-gray-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          {etat?.majPar && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Dernière mise à jour par {etat.majPar}
            </p>
          )}
        </div>
      )}

      {etape.reference && (
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          {etape.reference}
        </p>
      )}

      {erreur && (
        <p
          role="alert"
          className="mt-2 text-sm font-medium text-red-600 dark:text-red-400"
        >
          {erreur}
        </p>
      )}
    </article>
  );
}
