// SPDX-License-Identifier: AGPL-3.0-or-later
// Carte « lis les règles de ton organisation » sur /apprendre : affichée
// tant que les regles sont adoptees et que la personne n'a pas atteste.
import Link from "next/link";
import { dateLongue } from "@/lib/regles-organisation/deliberation";

export default function ReglesCard({
  nomOrganisation,
  adopteeLe,
}: {
  nomOrganisation: string;
  adopteeLe: Date;
}) {
  return (
    <section aria-labelledby="regles-card-title">
      <div className="rounded-3xl border-2 border-primary-200 dark:border-primary-900/50 bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-6 sm:p-8">
        <div className="flex items-start gap-4 flex-wrap">
          <span className="text-5xl shrink-0" aria-hidden="true">
            📜
          </span>
          <div className="flex-1 min-w-[220px]">
            <p className="text-xs uppercase tracking-widest font-bold text-accent-600 dark:text-accent-300 mb-1">
              À lire une fois, trois minutes
            </p>
            <h2
              id="regles-card-title"
              className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-2"
            >
              Les règles de {nomOrganisation || "ton organisation"}
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-4">
              Cinq règles adoptées le {dateLongue(adopteeLe)}, qui disent quoi
              faire sans avoir à juger, et qui te couvrent quand tu refuses.
              Lis-les et atteste que tu les as lues.
            </p>
            <Link href="/regles" className="btn-primary inline-flex">
              Lire les règles
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
