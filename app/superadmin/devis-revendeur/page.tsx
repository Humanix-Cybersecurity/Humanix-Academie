// SPDX-License-Identifier: AGPL-3.0-or-later
// /superadmin/devis-revendeur - generateur de devis pour un prospect revendeur
// (MSP, ESN, cabinet). Applique la grille de lib/reseller/tarification.ts a
// une hypothese « n espaces clients de m utilisateurs », affiche le detail et
// produit le PDF via /api/superadmin/devis-revendeur.
import Link from "next/link";
import { auth } from "@/lib/auth";
import { formaterEuros } from "@/lib/facturation/montants";
import {
  calculerDevis,
  lireParametresDevis,
  LIMITES_DEVIS,
} from "@/lib/reseller/devis";
import { GRILLE_REVENDEUR, libelleTranche } from "@/lib/reseller/tarification";

export const dynamic = "force-dynamic";

const CHAMP =
  "w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm";
const LIBELLE =
  "block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1";

export default async function DevisRevendeurPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") {
    return (
      <p className="text-sm text-rose-700">Accès réservé au SUPERADMIN.</p>
    );
  }
  const params = await searchParams;
  const saisie = Object.keys(params).length > 0;
  const p = lireParametresDevis(params);
  const calcul = p ? calculerDevis(p) : null;
  const tva = calcul ? Math.round(calcul.totalHtCentimes * 0.2) : 0;
  const qs = p
    ? new URLSearchParams({
        prospect: p.prospect,
        espaces: String(p.nbEspaces),
        utilisateurs: String(p.utilisateursParEspace),
      }).toString()
    : "";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-1">
          Revendeurs
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300">
          Devis revendeur
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Une hypothèse de volume, la grille partenaire, un PDF à envoyer. La
          grille vit dans <code>lib/reseller/tarification.ts</code>.
        </p>
      </header>

      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5">
        <form method="get" className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label htmlFor="dv-prospect" className={LIBELLE}>
              Prospect *
            </label>
            <input
              id="dv-prospect"
              name="prospect"
              required
              maxLength={120}
              defaultValue={p?.prospect ?? ""}
              placeholder="Alsace Micro Services"
              className={CHAMP}
            />
          </div>
          <div>
            <label htmlFor="dv-espaces" className={LIBELLE}>
              Espaces clients
            </label>
            <input
              id="dv-espaces"
              name="espaces"
              type="number"
              min={1}
              max={LIMITES_DEVIS.nbEspacesMax}
              required
              defaultValue={p?.nbEspaces ?? 5}
              className={CHAMP}
            />
          </div>
          <div>
            <label htmlFor="dv-utilisateurs" className={LIBELLE}>
              Utilisateurs actifs par espace
            </label>
            <input
              id="dv-utilisateurs"
              name="utilisateurs"
              type="number"
              min={1}
              max={LIMITES_DEVIS.utilisateursParEspaceMax}
              required
              defaultValue={p?.utilisateursParEspace ?? 20}
              className={CHAMP}
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary text-sm">
              Calculer
            </button>
          </div>
        </form>
        {saisie && !p && (
          <p role="alert" className="mt-3 text-sm text-rose-700">
            Paramètres invalides : un prospect, de 1 à{" "}
            {LIMITES_DEVIS.nbEspacesMax} espaces, de 1 à{" "}
            {LIMITES_DEVIS.utilisateursParEspaceMax} utilisateurs par espace.
          </p>
        )}
      </section>

      {p && calcul && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300">
                {p.prospect}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {p.nbEspaces} espace(s) de {p.utilisateursParEspace}{" "}
                utilisateurs, soit {calcul.utilisateursFacturables} utilisateurs
                facturables (plancher de{" "}
                {GRILLE_REVENDEUR.minimumUtilisateursParEspace} par espace).
              </p>
            </div>
            <a
              href={`/api/superadmin/devis-revendeur?${qs}`}
              className="btn-primary text-sm whitespace-nowrap"
            >
              Télécharger le devis PDF
            </a>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="py-2 font-medium">Désignation</th>
                <th className="py-2 font-medium text-right">Qté</th>
                <th className="py-2 font-medium text-right">P.U. HT</th>
                <th className="py-2 font-medium text-right">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {calcul.lignes.map((l) => (
                <tr
                  key={l.designation}
                  className="border-b border-gray-100 dark:border-slate-800/60"
                >
                  <td className="py-2">{l.designation}</td>
                  <td className="py-2 text-right tabular-nums">{l.quantite}</td>
                  <td className="py-2 text-right tabular-nums">
                    {formaterEuros(l.prixUnitaireHtCentimes)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {formaterEuros(l.totalHtCentimes)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="font-semibold">
              <tr>
                <td colSpan={3} className="py-2 text-right">
                  Total HT par mois
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formaterEuros(calcul.totalHtCentimes)}
                </td>
              </tr>
              <tr className="text-gray-600 dark:text-gray-300 font-normal">
                <td colSpan={3} className="py-1 text-right">
                  TVA 20 % (indicatif, France)
                </td>
                <td className="py-1 text-right tabular-nums">
                  {formaterEuros(tva)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="py-2 text-right">
                  Total TTC par mois
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formaterEuros(calcul.totalHtCentimes + tva)}
                </td>
              </tr>
              <tr className="text-gray-600 dark:text-gray-300 font-normal">
                <td colSpan={3} className="py-1 text-right">
                  Par an, HT
                  {calcul.prixMoyenParUtilisateurCentimes !== null &&
                    ` · ${formaterEuros(calcul.prixMoyenParUtilisateurCentimes)} par utilisateur et par mois`}
                </td>
                <td className="py-1 text-right tabular-nums">
                  {formaterEuros(calcul.totalHtCentimes * 12)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      <section className="text-sm text-gray-600 dark:text-gray-300">
        <h2 className="font-display font-bold text-primary-500 dark:text-accent-300 mb-2">
          Grille en vigueur
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Licence revendeur :{" "}
            {formaterEuros(GRILLE_REVENDEUR.licenceMensuelleHtCentimes)} HT par
            mois, collaborateurs du revendeur inclus.
          </li>
          {GRILLE_REVENDEUR.tranches.map((t, i) => (
            <li key={t.jusqua}>
              Tranche{" "}
              {libelleTranche(
                t,
                i === 0 ? 0 : GRILLE_REVENDEUR.tranches[i - 1].jusqua,
              )}{" "}
              : {formaterEuros(t.prixHtCentimes)} HT par utilisateur actif et
              par mois.
            </li>
          ))}
          <li>
            Plancher : {GRILLE_REVENDEUR.minimumUtilisateursParEspace}{" "}
            utilisateurs facturés par espace client.
          </li>
        </ul>
        <p className="mt-3">
          Les revendeurs actifs se facturent depuis leur page :{" "}
          <Link href="/superadmin/tenants" className="underline">
            liste des tenants
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
