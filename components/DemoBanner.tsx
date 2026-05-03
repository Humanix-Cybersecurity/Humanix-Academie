// Bandeau persistant en mode demo.
// Si l'user est connecte, on affiche le PLAN actif du tenant pour rendre
// la demo plus credible (chaque visiteur sait quelle offre il est en train
// de tester).
import { auth } from "@/lib/auth";
import { getTenantPlan, PLAN_LABEL, PLAN_EMOJI } from "@/lib/plans";

export default async function DemoBanner() {
  if (process.env.DEMO_MODE !== "true") return null;

  const session = await auth();
  const tenantId = (session?.user as any)?.tenantId as string | undefined;
  const plan = tenantId ? await getTenantPlan(tenantId) : null;

  return (
    <div className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 border-b border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-50 text-sm">
      <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-1.5 font-medium">
          <span>🎬</span>
          <strong>Mode Démo</strong>
        </span>

        {plan && (
          <span className="flex items-center gap-1.5 bg-white/60 dark:bg-slate-800/60 rounded-full px-3 py-0.5 text-xs font-bold">
            <span>{PLAN_EMOJI[plan]}</span>
            <span>Vue : {PLAN_LABEL[plan]}</span>
          </span>
        )}

        <span className="text-xs opacity-80 hidden sm:inline">
          Données fictives — aucune donnée envoyée à l'extérieur
        </span>

        <a
          href="/demo"
          className="text-xs underline font-medium hover:text-amber-700 dark:hover:text-amber-200"
        >
          {plan ? "Changer d'offre ou de rôle" : "Choisir une démo"}
        </a>
      </div>
    </div>
  );
}
