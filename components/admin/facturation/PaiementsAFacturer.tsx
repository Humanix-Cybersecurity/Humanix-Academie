// SPDX-License-Identifier: AGPL-3.0-or-later
// Paiements encaisses qui n'ont pas encore de facture.
//
// L'emission est UNITAIRE et manuelle, pas un bouton « tout facturer ». Un
// paiement peut avoir ete rembourse depuis : le double prelevement du
// 2026-08-17 en est l'exemple. On affiche donc le remboursement releve chez
// Mollie, et c'est un humain qui tranche.

import { emettreFactureManquante } from "@/app/admin/billing/actions";
import { formaterEuros } from "@/lib/facturation/montants";
import type { PaiementAFacturer } from "@/lib/facturation/rattrapage";

function jour(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(d);
}

export default function PaiementsAFacturer({
  paiements,
  identiteRenseignee,
}: {
  paiements: PaiementAFacturer[];
  identiteRenseignee: boolean;
}) {
  if (paiements.length === 0) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Tous vos prélèvements sont facturés.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {!identiteRenseignee && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          Renseignez d&apos;abord vos coordonnées de facturation ci-dessus :
          sans dénomination ni adresse, une facture ne serait pas conforme.
        </div>
      )}

      {paiements.map((p) => {
        const rembourseTout =
          p.rembourseCentimes !== null &&
          p.rembourseCentimes >= p.montantTtcCentimes;
        const remboursePartiel =
          p.rembourseCentimes !== null &&
          p.rembourseCentimes > 0 &&
          !rembourseTout;
        return (
          <div
            key={p.ref}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4 dark:border-slate-700"
          >
            <div className="min-w-0">
              <p className="font-bold">
                {formaterEuros(p.montantTtcCentimes)}{" "}
                <span className="font-normal text-gray-500">
                  le {jour(p.encaisseLe)}
                </span>
              </p>
              <p className="mt-0.5 font-mono text-xs text-gray-500">{p.ref}</p>
              {rembourseTout && (
                <p className="mt-1 text-xs font-bold text-red-600 dark:text-red-400">
                  Intégralement remboursé. Ne facturez que si vous savez
                  pourquoi : sinon un avoir devra suivre.
                </p>
              )}
              {remboursePartiel && (
                <p className="mt-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                  {formaterEuros(p.rembourseCentimes!)} déjà remboursés sur ce
                  paiement.
                </p>
              )}
              {p.rembourseCentimes === null && (
                <p className="mt-1 text-xs text-gray-500">
                  Remboursements non vérifiés (Mollie injoignable).
                </p>
              )}
            </div>
            <form action={emettreFactureManquante}>
              <input type="hidden" name="paiementRef" value={p.ref} />
              <button
                type="submit"
                disabled={!identiteRenseignee}
                className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Émettre la facture
              </button>
            </form>
          </div>
        );
      })}
    </div>
  );
}
