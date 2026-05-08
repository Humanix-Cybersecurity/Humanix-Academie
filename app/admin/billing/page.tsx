// SPDX-License-Identifier: AGPL-3.0-or-later
// Page de facturation cote tenant (admin du tenant). Affiche :
//   - Plan actuel + sieges utilises
//   - Etat du subscription (active, past_due, canceled, etc.)
//   - Prochain renouvellement / restriction d'acces si paiement KO
//   - CTA upgrade / downgrade / annuler
//   - Lien portail Payplug self-service
//
// Defense en profondeur : layout admin/ verifie deja le role >= ADMIN.
// On affiche cette page meme aux ADMIN qui n'auraient pas le droit de modifier
// le plan -- l'action est gardee server-side dans actions.ts.

import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSubscriptionState } from "@/lib/subscription-state";
import { getSeatUsage, formatSeatUsage } from "@/lib/seats";
import {
  PLAN_LABEL,
  PLAN_EMOJI,
  PLAN_PRICE_EUR_MONTHLY,
  nextPlan,
  isPaidPlan,
  type PlanId,
} from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user || typeof session.user.tenantId !== "string") {
    throw new Error("Unauthorized: missing tenant context");
  }
  const tenantId = session.user.tenantId;

  const [state, usage] = await Promise.all([
    getSubscriptionState(tenantId),
    getSeatUsage(tenantId),
  ]);

  const upgradePlan = nextPlan(state.plan);

  return (
    <main id="main-content" className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      <header>
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-1">
          Espace de facturation
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300">
          Ton abonnement Humanix
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          Tout ce qui concerne le plan, les sièges et les factures.
        </p>
      </header>

      {/* === BANDEAU ETAT (color-coded selon restriction) === */}
      <StateBanner state={state} />

      {/* === PLAN ACTUEL === */}
      <section
        aria-labelledby="current-plan"
        className="card border-2 border-primary-200 dark:border-accent-900/40 bg-gradient-to-br from-primary-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/30"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold mb-1">
              Plan actuel
            </p>
            <h2 id="current-plan" className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300">
              {PLAN_EMOJI[state.plan]} {PLAN_LABEL[state.plan]}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {priceLine(state.plan)}
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {state.currentPeriodEnd && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Prochain renouvellement :{" "}
                <strong className="text-gray-700 dark:text-gray-200">
                  {state.currentPeriodEnd.toLocaleDateString("fr-FR")}
                </strong>
              </p>
            )}
          </div>
        </div>

        {/* Jauge sièges */}
        <div className="mt-6 pt-4 border-t border-primary-200/60 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Sièges utilisés
            </span>
            <span
              className={`text-sm tabular-nums ${
                usage.atLimit
                  ? "text-warn font-bold"
                  : usage.approaching
                    ? "text-amber-600 dark:text-amber-400 font-bold"
                    : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {formatSeatUsage(usage)}
            </span>
          </div>
          {Number.isFinite(usage.max) && (
            <div className="h-2 rounded-full bg-gray-200 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usage.atLimit
                    ? "bg-warn"
                    : usage.approaching
                      ? "bg-amber-500"
                      : "bg-gradient-to-r from-primary-500 to-cyan-500"
                }`}
                style={{ width: `${Math.max(2, usage.percent)}%` }}
              />
            </div>
          )}
          {usage.atLimit && upgradePlan && (
            <p className="text-xs text-warn mt-2">
              Tu as atteint la limite. Passe en{" "}
              <strong>{PLAN_LABEL[upgradePlan]}</strong> pour ajouter plus de sièges.
            </p>
          )}
          {usage.approaching && !usage.atLimit && upgradePlan && (
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
              Plus que {usage.remaining} sièges. Pense à passer en{" "}
              <strong>{PLAN_LABEL[upgradePlan]}</strong> avant saturation.
            </p>
          )}
        </div>
      </section>

      {/* === ACTIONS === */}
      <section aria-labelledby="actions-title" className="grid sm:grid-cols-2 gap-4">
        <h2 id="actions-title" className="sr-only">
          Actions disponibles
        </h2>

        {/* Upgrade */}
        {upgradePlan && (
          <Link
            href="/tarifs"
            className="card hover:shadow-lg transition-shadow border-cyan-200 dark:border-cyan-900/40 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/30 dark:to-slate-900"
          >
            <p className="text-xs uppercase tracking-widest text-cyan-700 dark:text-cyan-300 font-bold mb-1">
              Faire évoluer
            </p>
            <h3 className="font-display text-lg font-extrabold text-cyan-800 dark:text-cyan-200 mb-2">
              ↗ Passer en {PLAN_EMOJI[upgradePlan]} {PLAN_LABEL[upgradePlan]}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Plus de sièges, plus de fonctionnalités. {priceLine(upgradePlan)}
            </p>
          </Link>
        )}

        {/* Portail Payplug self-service */}
        {isPaidPlan(state.plan) && (
          <a
            href="/api/payments/portal"
            className="card hover:shadow-lg transition-shadow border-gray-200 dark:border-slate-700"
          >
            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold mb-1">
              Gestion CB / factures
            </p>
            <h3 className="font-display text-lg font-extrabold text-gray-700 dark:text-gray-200 mb-2">
              📄 Portail Payplug
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Mettre à jour ta carte, télécharger tes factures, voir l'historique.
            </p>
          </a>
        )}

        {/* Annuler */}
        {isPaidPlan(state.plan) && state.state !== "suspended" && (
          <Link
            href="/api/payments/cancel"
            className="card hover:shadow-lg transition-shadow border-amber-200 dark:border-amber-900/40 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900"
          >
            <p className="text-xs uppercase tracking-widest text-amber-700 dark:text-amber-300 font-bold mb-1">
              Annuler l'abonnement
            </p>
            <h3 className="font-display text-lg font-extrabold text-amber-800 dark:text-amber-200 mb-2">
              ⏸ Mettre en pause
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Tu garderas l'accès jusqu'à la fin de la période payée. Aucun
              prélèvement futur.
            </p>
          </Link>
        )}
      </section>

      {/* === Help === */}
      <section className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-gray-200 dark:border-slate-700">
        <p>
          <strong className="text-gray-700 dark:text-gray-200">Une question sur ta facture ?</strong>{" "}
          Écris à{" "}
          <a
            href="mailto:contact@humanix-cybersecurity.fr"
            className="text-accent-500 dark:text-accent-300 underline"
          >
            contact@humanix-cybersecurity.fr
          </a>
          . On répond sous 24 h ouvrées.
        </p>
        <p className="mt-2 text-xs">
          Tous les paiements transitent par Payplug (Paris, France) — pas de
          dépendance américaine.
        </p>
      </section>
    </main>
  );
}

/**
 * Bandeau coloré en haut de la page selon l'état du subscription.
 * Composant Server, pas d'interaction client.
 */
function StateBanner({
  state,
}: {
  state: Awaited<ReturnType<typeof getSubscriptionState>>;
}) {
  const styles = {
    warn: "bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200",
    read_only: "bg-orange-50 dark:bg-orange-900/30 border-orange-400 dark:border-orange-700 text-orange-900 dark:text-orange-200",
    blocked: "bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-700 text-red-900 dark:text-red-200",
  } as const;

  if (state.restriction === "none") return null;

  const config = (() => {
    switch (state.state) {
      case "grace_period":
        return {
          emoji: "💳",
          title: "Échec de paiement détecté",
          message: `Ta dernière échéance n'a pas été honorée. Tu as ${state.daysLeft} jour${(state.daysLeft ?? 0) > 1 ? "s" : ""} pour mettre à jour ta carte avant restriction d'accès.`,
          cta: { label: "Mettre à jour la carte", href: "/api/payments/portal" },
        };
      case "read_only":
        return {
          emoji: "🔒",
          title: "Accès en lecture seule",
          message: `Tu peux consulter mais plus rien modifier. ${state.daysLeft ? `Tu as ${state.daysLeft} jour${state.daysLeft > 1 ? "s" : ""} avant suspension complète.` : ""}`,
          cta: { label: "Régulariser maintenant", href: "/api/payments/portal" },
        };
      case "suspended":
        return {
          emoji: "⛔",
          title: "Compte suspendu",
          message:
            "Ton accès est suspendu. Régularise pour réactiver (toutes tes données sont conservées 90 jours).",
          cta: { label: "Réactiver", href: "/tarifs" },
        };
      default:
        return null;
    }
  })();

  if (!config) return null;

  // state.restriction !== "none" est garanti par le early-return en haut
  // de la fonction, donc state.restriction est ici "warn" | "read_only"
  // | "blocked" : on peut indexer styles directement.
  const styleKey = state.restriction;

  return (
    <div role="status" className={`rounded-2xl border-2 p-4 ${styles[styleKey]}`}>
      <div className="flex items-start gap-3 flex-wrap">
        <span className="text-2xl shrink-0" aria-hidden="true">
          {config.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold">{config.title}</p>
          <p className="text-sm mt-1 opacity-90">{config.message}</p>
        </div>
        <Link
          href={config.cta.href}
          className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-bold border border-current/20 transition shadow-sm whitespace-nowrap"
        >
          {config.cta.label}
        </Link>
      </div>
    </div>
  );
}

function priceLine(plan: PlanId): string {
  const m = PLAN_PRICE_EUR_MONTHLY[plan];
  if (m === null) return "Tarif sur devis (Enterprise).";
  if (m === 0) return "Gratuit.";
  return `${m} €/mois HT par tenant.`;
}
