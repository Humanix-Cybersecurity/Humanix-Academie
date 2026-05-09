// SPDX-License-Identifier: AGPL-3.0-or-later
// PlanGate generique reutilisable pour toute fonctionnalite gatee.
// Substitue progressivement les PlanGateNis2/PlanGateXXX dedies.
//
// MAJ mai 2026 : labels alignes sur la nouvelle grille (Pro reste, Premium
// devient Enterprise). On reutilise PLAN_LABEL de lib/plans pour éviter toute
// duplication / desynchronisation future.

import Link from "next/link";
import { PLAN_LABEL, PlanId } from "@/lib/plans";

type Props = {
  plan: PlanId;
  featureLabel: string;
  featureExplain: string;
  minPlan: "pro" | "enterprise";
};

export default function PlanGateGeneric({
  plan,
  featureLabel,
  featureExplain,
  minPlan,
}: Props) {
  return (
    <div className="card border-2 border-amber-300 bg-amber-50 dark:bg-amber-900/20 mt-6">
      <h2 className="font-bold text-amber-700 dark:text-amber-300 mb-2">
        {featureLabel} - disponible à partir de l'offre {PLAN_LABEL[minPlan]}
      </h2>
      <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
        Votre offre actuelle est <strong>{PLAN_LABEL[plan]}</strong>.
      </p>
      <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
        {featureExplain}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href={`/tarifs#${minPlan}`} className="btn-primary text-sm">
          Voir l'offre {PLAN_LABEL[minPlan]}
        </Link>
        <Link href="/contact" className="btn-secondary text-sm">
          Demander une démo
        </Link>
      </div>
    </div>
  );
}
