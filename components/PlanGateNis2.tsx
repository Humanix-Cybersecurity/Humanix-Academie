// PlanGate dedie au Pack NIS2 (incluse en plan Pro+).

import Link from "next/link";
import { PLAN_LABEL, PlanId } from "@/lib/plans";

export default function PlanGateNis2({ plan }: { plan: PlanId }) {
  return (
    <div className="card border-2 border-amber-300 bg-amber-50 dark:bg-amber-900/20 mt-6">
      <h2 className="font-bold text-amber-700 dark:text-amber-300 mb-2">
        Disponible à partir de l'offre Pro
      </h2>
      <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
        Le Pack Conformité NIS2 est inclus dans les offres <strong>Pro</strong>{" "}
        et <strong>Enterprise</strong>. Votre offre actuelle est{" "}
        <strong>{PLAN_LABEL[plan]}</strong>.
      </p>
      <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
        Pourquoi cette restriction : ce pack constitue une preuve documentaire
        utilisée auprès d'assureurs cyber, d'auditeurs clients et de l'ANSSI. Sa
        génération inclut des informations sensibles (nom dirigeant, contacts
        crise) qui justifient un palier d'engagement supérieur.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/tarifs#pro" className="btn-primary text-sm">
          Voir l'offre Pro
        </Link>
        <Link href="/contact" className="btn-secondary text-sm">
          Demander une démo
        </Link>
      </div>
    </div>
  );
}
