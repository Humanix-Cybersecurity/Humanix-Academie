"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Liste les paliers SUPÉRIEURS au plan courant et propose un upgrade en
// un clic via POST /api/payments/checkout. Pour Enterprise (non
// self-service), redirige vers /demande-abonnement.
//
// Avant ce composant, le seul "upgrade" sur /admin/billing était un
// <Link href="/tarifs"> qui renvoyait l'admin sur la page marketing
// publique : pas de checkout déclenché, pas de continuité avec sa
// session, dead end UX. Ici on appelle directement l'endpoint auth-
// gated qui crée la session Mollie et on redirige vers l'URL hostée.

import { useState } from "react";
import Link from "next/link";
import {
  PLAN_LABEL,
  PLAN_EMOJI,
  PLAN_PRICE_EUR_MONTHLY,
  PLAN_PRICE_PER_USER_EUR_MONTHLY,
  PLAN_RANK,
  type PlanId,
} from "@/lib/plans";

type Props = {
  currentPlan: PlanId;
  // Plans pour lesquels le checkout self-service est dispo (sinon, on
  // bascule sur le formulaire "Demande d'abonnement" pour Enterprise ou
  // pour les instances sans Mollie configuré).
  buyablePlans: readonly PlanId[];
};

// Ordre fixe — aligné sur lib/plans.ts PLAN_RANK.
const PLAN_ORDER: PlanId[] = ["starter", "pro", "enterprise"];

function priceLine(plan: PlanId): string {
  const monthly = PLAN_PRICE_EUR_MONTHLY[plan];
  const perUser = PLAN_PRICE_PER_USER_EUR_MONTHLY[plan];
  if (monthly !== null && monthly !== undefined && monthly > 0) {
    return `${monthly} €/mois HT · forfait`;
  }
  if (perUser !== null && perUser !== undefined) {
    return `${perUser} €/utilisateur/mois HT`;
  }
  if (plan === "enterprise") return "Tarif sur devis";
  return "Gratuit";
}

export default function PlanUpgradeOptions({
  currentPlan,
  buyablePlans,
}: Props) {
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Pro requiert un nombre de sieges pour calculer le montant Mollie
  // (3 EUR/siege/mois). Default 16 = palier minimum Pro (cf. /tarifs).
  const [proSeats, setProSeats] = useState<number>(16);
  // Cycle de facturation (annuel = -10 %). Default = annuel pour booster
  // l'engagement, l'utilisateur peut switch en cliquant.
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "annual",
  );

  const upgrades = PLAN_ORDER.filter(
    (p) => PLAN_RANK[p] > PLAN_RANK[currentPlan],
  );

  if (upgrades.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Tu es déjà sur le plan le plus complet. Pour des besoins
        spécifiques (multi-instances, SLA dédié), écris-nous à{" "}
        <a
          href="mailto:contact@humanix-cybersecurity.fr"
          className="text-accent-500 underline"
        >
          contact@humanix-cybersecurity.fr
        </a>
        .
      </p>
    );
  }

  async function startCheckout(plan: PlanId) {
    setBusyPlan(plan);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        plan,
        billing: billingCycle,
      };
      // Le plan Pro requiert un nombre de sieges (3 EUR/siege/mois).
      // Pour les autres plans (starter forfait), l'API choisit un default.
      if (plan === "pro") {
        body.seats = proSeats;
      }
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(
          data.error ?? `Échec du checkout (HTTP ${res.status})`,
        );
      }
      window.location.href = data.url;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      setError(msg);
      setBusyPlan(null);
    }
  }

  return (
    <div className="space-y-3">
      {upgrades.map((plan) => {
        const isBuyable = buyablePlans.includes(plan);
        const isBusy = busyPlan === plan;

        return (
          <div
            key={plan}
            className="card border-2 border-cyan-200 dark:border-cyan-900/40 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/30 dark:to-slate-900"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-widest text-cyan-700 dark:text-cyan-300 font-bold mb-1">
                  Passer en
                </p>
                <h3 className="font-display text-lg font-extrabold text-cyan-800 dark:text-cyan-200 mb-1">
                  {PLAN_EMOJI[plan]} {PLAN_LABEL[plan]}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {priceLine(plan)}
                </p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                {isBuyable ? (
                  <button
                    type="button"
                    onClick={() => startCheckout(plan)}
                    disabled={isBusy}
                    className="btn-primary text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBusy ? "Redirection…" : `Souscrire ${PLAN_LABEL[plan]}`}
                  </button>
                ) : (
                  <Link
                    href={`/demande-abonnement?plan=${plan}`}
                    className="btn-primary text-sm whitespace-nowrap"
                  >
                    Demander un devis
                  </Link>
                )}
                {plan === "enterprise" && (
                  <p className="text-xs text-gray-500 max-w-[14rem] text-right">
                    Process commercial : devis + contrat dédié.
                  </p>
                )}
              </div>
            </div>

            {/* === Configurateur (Pro uniquement) === */}
            {isBuyable && plan === "pro" && (
              <div className="mt-4 pt-4 border-t border-cyan-200/60 dark:border-cyan-900/40 grid sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor={`seats-${plan}`}
                    className="block text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 mb-1.5"
                  >
                    Nombre de sièges
                  </label>
                  <input
                    id={`seats-${plan}`}
                    type="number"
                    min={16}
                    max={250}
                    value={proSeats}
                    onChange={(e) =>
                      setProSeats(
                        Math.max(
                          16,
                          Math.min(250, parseInt(e.target.value, 10) || 16),
                        ),
                      )
                    }
                    className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-2 focus:border-accent-500 focus:outline-none text-sm bg-white dark:bg-slate-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    16 à 250 sièges · 3 €/siège/mois
                  </p>
                </div>
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 mb-1.5">
                    Cycle de paiement
                  </span>
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center gap-2 cursor-pointer rounded-xl border-2 border-gray-200 dark:border-slate-700 p-2 hover:border-accent-500 has-checked:border-accent-500 has-checked:bg-accent-50 dark:has-checked:bg-accent-900/20">
                      <input
                        type="radio"
                        name={`billing-${plan}`}
                        value="monthly"
                        checked={billingCycle === "monthly"}
                        onChange={() => setBillingCycle("monthly")}
                        className="accent-accent-500"
                      />
                      <span className="text-xs">Mensuel</span>
                    </label>
                    <label className="flex-1 flex items-center gap-2 cursor-pointer rounded-xl border-2 border-gray-200 dark:border-slate-700 p-2 hover:border-accent-500 has-checked:border-accent-500 has-checked:bg-accent-50 dark:has-checked:bg-accent-900/20">
                      <input
                        type="radio"
                        name={`billing-${plan}`}
                        value="annual"
                        checked={billingCycle === "annual"}
                        onChange={() => setBillingCycle("annual")}
                        className="accent-accent-500"
                      />
                      <span className="text-xs">
                        Annuel <span className="text-emerald-600">−10 %</span>
                      </span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Total :{" "}
                    <strong>
                      {billingCycle === "annual"
                        ? (proSeats * 3 * 12 * 0.9).toFixed(0)
                        : (proSeats * 3).toFixed(0)}
                      &nbsp;€ HT
                    </strong>{" "}
                    {billingCycle === "annual" ? "/ an" : "/ mois"}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {error && (
        <div
          role="alert"
          className="rounded-xl border-2 border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-900 p-3 text-sm text-red-800 dark:text-red-200"
        >
          <strong>Échec de la souscription :</strong> {error}
        </div>
      )}
    </div>
  );
}
