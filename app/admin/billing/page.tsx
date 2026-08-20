// SPDX-License-Identifier: AGPL-3.0-or-later
// Page de facturation cote tenant (admin du tenant). Affiche :
//   - Plan actuel + sièges utilisés
//   - Etat du subscription (active, past_due, canceled, etc.)
//   - Prochain renouvellement / restriction d'accès si paiement KO
//   - CTA upgrade / downgrade / annuler
//   - Coordonnees de facturation + factures telechargeables
//
// Le 2026-08-20, cette page portait une carte « 📄 Portail Mollie -
// telecharger tes factures ». Elle promettait quelque chose qui n'existait
// pas : Mollie n'expose aucun portail client hoste, /api/payments/portal
// n'accepte que POST, et la carte etait un <a href> -- donc un GET, donc
// 405. Le bouton venait de l'epoque Stripe et avait survecu a deux
// migrations. Il est remplace par de vraies factures, emises par Humanix.
//
// Defense en profondeur : layout admin/ verifie déjà le role >= ADMIN.
// On affiche cette page même aux ADMIN qui n'auraient pas le droit de modifier
// le plan -- l'action est gardée server-side dans actions.ts.

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
import { MOLLIE_BUYABLE_PLANS } from "@/lib/mollie";
import PlanUpgradeOptions from "@/components/PlanUpgradeOptions";
import { db } from "@/lib/db";
import IdentiteForm from "@/components/admin/facturation/IdentiteForm";
import ListeFactures from "@/components/admin/facturation/ListeFactures";
import PaiementsAFacturer from "@/components/admin/facturation/PaiementsAFacturer";
import { paiementsAFacturer } from "@/lib/facturation/rattrapage";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user || typeof session.user.tenantId !== "string") {
    throw new Error("Unauthorized: missing tenant context");
  }
  const tenantId = session.user.tenantId;

  const [state, usage, identite, factures, aFacturer] = await Promise.all([
    getSubscriptionState(tenantId),
    getSeatUsage(tenantId),
    db.identiteFacturation.findUnique({ where: { tenantId } }),
    db.facture.findMany({
      where: { tenantId },
      orderBy: { emiseLe: "desc" },
      select: {
        id: true,
        numero: true,
        emiseLe: true,
        totalTtcCentimes: true,
      },
      take: 100,
    }),
    // `verifierRemboursements` relit chaque paiement chez Mollie : un appel
    // reseau par paiement en attente. Acceptable ici -- la liste est courte et
    // facturer un paiement rembourse coute plus cher que 200 ms.
    paiementsAFacturer(tenantId, { verifierRemboursements: true }),
  ]);

  const upgradePlan = nextPlan(state.plan);

  return (
    <main
      id="main-content"
      className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-fadeIn"
    >
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
            <h2
              id="current-plan"
              className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300"
            >
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
          {/* `usage.max` can be non-finite (ex: Infinity) for plans without a hard seat cap.
              We only render the progress bar when there is a finite limit to display. */}
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
              <strong>{PLAN_LABEL[upgradePlan]}</strong> pour ajouter plus de
              sièges.
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

      {/* === UPGRADE - paliers supérieurs au plan courant === */}
      {upgradePlan && (
        <section aria-labelledby="upgrade-title" className="space-y-3">
          <h2
            id="upgrade-title"
            className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300"
          >
            Faire évoluer ton plan
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Tu peux changer de palier à tout moment. Le checkout Mollie calcule
            le prorata, et ton accès passe au plan supérieur dès confirmation du
            paiement.
          </p>
          <PlanUpgradeOptions
            currentPlan={state.plan}
            buyablePlans={MOLLIE_BUYABLE_PLANS}
          />
        </section>
      )}

      {/* === ACTIONS === */}
      <section
        aria-labelledby="actions-title"
        className="grid sm:grid-cols-2 gap-4"
      >
        <h2 id="actions-title" className="sr-only">
          Actions disponibles
        </h2>

        {/* Les factures vivent plus bas sur cette page : plus de renvoi vers
            un portail externe qui n'existe pas. */}
        {isPaidPlan(state.plan) && (
          <a
            href="#factures"
            className="card hover:shadow-lg transition-shadow border-gray-200 dark:border-slate-700"
          >
            <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold mb-1">
              Factures
            </p>
            <h3 className="font-display text-lg font-extrabold text-gray-700 dark:text-gray-200 mb-2">
              📄{" "}
              {factures.length > 0
                ? `${factures.length} facture${factures.length > 1 ? "s" : ""}`
                : "Mes factures"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Télécharger les PDF, renseigner les coordonnées de facturation.
            </p>
          </a>
        )}

        {/* Resiliation en libre-service.
        
            La carte pointait sur `/api/payments/cancel`, qui n'exporte que
            POST : une navigation <Link> y faisait un GET, donc un 405 sur
            l'action la plus sensible de la page. On renvoie vers
            /profil/facturation, ou BillingActions demande confirmation puis
            POSTe reellement. */}
        {isPaidPlan(state.plan) && state.state !== "suspended" && (
          <Link
            href="/profil/facturation"
            className="card hover:shadow-lg transition-shadow border-amber-200 dark:border-amber-900/40 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900"
          >
            <p className="text-xs uppercase tracking-widest text-amber-700 dark:text-amber-300 font-bold mb-1">
              Annuler l'abonnement
            </p>
            <h3 className="font-display text-lg font-extrabold text-amber-800 dark:text-amber-200 mb-2">
              ⏸ Résilier l'abonnement
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Tu garderas l'accès jusqu'à la fin de la période payée. Aucun
              prélèvement futur.
            </p>
          </Link>
        )}
      </section>

      {/* === Coordonnees de facturation et factures === */}
      <section
        id="factures"
        className="scroll-mt-8 rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300">
          Coordonnées de facturation
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Ce sont les mentions qui figureront sur vos factures. La dénomination
          et l&apos;adresse sont obligatoires : sans elles, aucune facture ne
          peut être émise.
        </p>

        {!identite && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
            Vos coordonnées ne sont pas encore renseignées. Les prélèvements
            déjà encaissés seront facturés dès que ce formulaire sera rempli.
          </div>
        )}

        <div className="mt-5">
          <IdentiteForm identite={identite} />
        </div>
      </section>

      {aFacturer.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 dark:border-amber-900/40 dark:bg-amber-950/10">
          <h2 className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300">
            {aFacturer.length} prélèvement
            {aFacturer.length > 1 ? "s" : ""} en attente de facture
          </h2>
          <p className="mt-1 mb-5 text-sm text-gray-600 dark:text-gray-300">
            Encaissés avant la mise en place de la facturation, ou en attente de
            vos coordonnées. Vérifiez chaque ligne avant d&apos;émettre.
          </p>
          <PaiementsAFacturer
            paiements={aFacturer}
            identiteRenseignee={identite !== null}
          />
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300">
          Vos factures
        </h2>
        <p className="mt-1 mb-5 text-sm text-gray-600 dark:text-gray-300">
          Émises automatiquement à chaque prélèvement. Les prix affichés sont
          TTC ; le détail HT et TVA figure sur le PDF.
        </p>
        <ListeFactures factures={factures} />

        {factures.length > 0 && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
              Export pour la comptabilité
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Une archive avec les PDF, les XML Factur-X et un récapitulatif qui
              porte la <strong>référence de paiement</strong> — c&apos;est elle
              qui permet de recroiser avec le rapport de versement de votre
              encaisseur, car un virement regroupe souvent plusieurs ventes.
            </p>
            <a
              href="/api/factures/export"
              className="mt-3 inline-flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-accent-500 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200"
            >
              <span aria-hidden="true">📦</span>
              Télécharger l&apos;archive
            </a>
          </div>
        )}
      </section>

      {/* === Help === */}
      <section className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-gray-200 dark:border-slate-700">
        <p>
          <strong className="text-gray-700 dark:text-gray-200">
            Une question sur ta facture ?
          </strong>{" "}
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
          Tous les paiements transitent par Mollie (Amsterdam, UE - régulé DNB)
          - pas de dépendance Cloud Act US.
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
    read_only:
      "bg-orange-50 dark:bg-orange-900/30 border-orange-400 dark:border-orange-700 text-orange-900 dark:text-orange-200",
    blocked:
      "bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-700 text-red-900 dark:text-red-200",
  } as const;

  if (state.restriction === "none") return null;

  const config = (() => {
    switch (state.state) {
      case "grace_period": {
        const daysLeft = state.daysLeft;
        return {
          emoji: "💳",
          title: "Échec de paiement détecté",
          message:
            typeof daysLeft === "number"
              ? `Ta dernière échéance n'a pas été honorée. Tu as ${daysLeft} jour${daysLeft !== 1 ? "s" : ""} pour mettre à jour ta carte avant restriction d'accès.`
              : "Ta dernière échéance n'a pas été honorée. Le délai exact avant restriction d'accès est en cours de mise à jour.",
          // /profil/facturation et non /api/payments/portal : cette route
          // n'accepte que POST, un lien y renvoyait un 405.
          cta: {
            label: "Mettre à jour la carte",
            href: "/profil/facturation",
          },
        };
      }
      case "read_only":
        return {
          emoji: "🔒",
          title: "Accès en lecture seule",
          message: `Tu peux consulter mais plus rien modifier. ${state.daysLeft ? `Tu as ${state.daysLeft} jour${state.daysLeft !== 1 ? "s" : ""} avant suspension complète.` : ""}`,
          cta: {
            label: "Régulariser maintenant",
            href: "/profil/facturation",
          },
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
    <div
      role="status"
      className={`rounded-2xl border-2 p-4 ${styles[styleKey]}`}
    >
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
