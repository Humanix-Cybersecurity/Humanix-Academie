// SPDX-License-Identifier: AGPL-3.0-or-later
// Formulaire des coordonnees de facturation du client.
//
// Ces champs ne sont pas du confort : la denomination et l'adresse de
// l'acheteur sont des mentions OBLIGATOIRES (article 242 nonies A de l'annexe
// II au CGI), et le SIREN l'est aussi entre assujettis etablis en France.
// Tant qu'ils manquent, aucune facture n'est emise -- on ne devine pas une
// adresse.

import { enregistrerIdentiteFacturation } from "@/app/admin/billing/actions";

export type IdentiteExistante = {
  raisonSociale: string;
  adresse: string;
  codePostal: string;
  ville: string;
  pays: string;
  siren: string | null;
  tvaIntra: string | null;
} | null;

const champ =
  "w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none";
const etiquette =
  "block text-xs uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400 mb-1";

export default function IdentiteForm({
  identite,
}: {
  identite: IdentiteExistante;
}) {
  return (
    <form action={enregistrerIdentiteFacturation} className="space-y-4">
      <div>
        <label htmlFor="raisonSociale" className={etiquette}>
          Dénomination sociale *
        </label>
        <input
          id="raisonSociale"
          name="raisonSociale"
          required
          maxLength={200}
          defaultValue={identite?.raisonSociale ?? ""}
          placeholder="Ma Société SAS"
          className={champ}
        />
      </div>

      <div>
        <label htmlFor="adresse" className={etiquette}>
          Adresse *
        </label>
        <input
          id="adresse"
          name="adresse"
          required
          maxLength={200}
          defaultValue={identite?.adresse ?? ""}
          placeholder="12 rue de l'Exemple"
          className={champ}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="codePostal" className={etiquette}>
            Code postal *
          </label>
          <input
            id="codePostal"
            name="codePostal"
            required
            maxLength={20}
            defaultValue={identite?.codePostal ?? ""}
            className={champ}
          />
        </div>
        <div>
          <label htmlFor="ville" className={etiquette}>
            Ville *
          </label>
          <input
            id="ville"
            name="ville"
            required
            maxLength={100}
            defaultValue={identite?.ville ?? ""}
            className={champ}
          />
        </div>
        <div>
          <label htmlFor="pays" className={etiquette}>
            Pays *
          </label>
          <input
            id="pays"
            name="pays"
            required
            maxLength={2}
            defaultValue={identite?.pays ?? "FR"}
            placeholder="FR"
            className={`${champ} uppercase`}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="siren" className={etiquette}>
            SIREN
          </label>
          <input
            id="siren"
            name="siren"
            maxLength={20}
            defaultValue={identite?.siren ?? ""}
            placeholder="123456789"
            className={champ}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Obligatoire sur les factures entre entreprises établies en France.
          </p>
        </div>
        <div>
          <label htmlFor="tvaIntra" className={etiquette}>
            N° de TVA intracommunautaire
          </label>
          <input
            id="tvaIntra"
            name="tvaIntra"
            maxLength={20}
            defaultValue={identite?.tvaIntra ?? ""}
            placeholder="FR80103901799"
            className={champ}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Hors de France, c&apos;est lui qui permet l&apos;autoliquidation.
            Sans lui, la TVA française s&apos;applique.
          </p>
        </div>
      </div>

      <button
        type="submit"
        className="rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-600"
      >
        Enregistrer
      </button>
    </form>
  );
}
