// SPDX-License-Identifier: AGPL-3.0-or-later
// Liste des factures du tenant, avec telechargement du PDF.
//
// Les montants affiches viennent du SNAPSHOT de chaque facture, jamais d'un
// recalcul : ce qui est montre ici est exactement ce que porte le PDF.

import Link from "next/link";
import { formaterEuros } from "@/lib/facturation/montants";

export type FactureListee = {
  id: string;
  numero: string;
  emiseLe: Date;
  totalTtcCentimes: number;
};

function jour(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(d);
}

export default function ListeFactures({
  factures,
}: {
  factures: FactureListee[];
}) {
  if (factures.length === 0) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Aucune facture pour l&apos;instant. Elles apparaîtront ici
        automatiquement à chaque prélèvement.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200 text-left dark:border-slate-700">
            <th className="py-2 pr-4 text-xs uppercase tracking-widest text-gray-500">
              Numéro
            </th>
            <th className="py-2 pr-4 text-xs uppercase tracking-widest text-gray-500">
              Date
            </th>
            <th className="py-2 pr-4 text-right text-xs uppercase tracking-widest text-gray-500">
              Total TTC
            </th>
            <th className="py-2 text-right text-xs uppercase tracking-widest text-gray-500">
              PDF
            </th>
          </tr>
        </thead>
        <tbody>
          {factures.map((f) => (
            <tr
              key={f.id}
              className="border-b border-gray-100 dark:border-slate-800"
            >
              <td className="py-3 pr-4 font-mono font-bold text-primary-500 dark:text-accent-300">
                {f.numero}
              </td>
              <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                {jour(f.emiseLe)}
              </td>
              <td className="py-3 pr-4 text-right font-bold">
                {formaterEuros(f.totalTtcCentimes)}
              </td>
              <td className="py-3 text-right">
                <Link
                  href={`/api/factures/${f.id}`}
                  className="font-medium text-accent-500 hover:underline"
                >
                  Télécharger
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
