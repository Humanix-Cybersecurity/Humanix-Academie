// SPDX-License-Identifier: AGPL-3.0-or-later
// /profil/facturation — page de gestion de l'abonnement.
//
// Reservee aux ADMIN/RSSI/SUPERADMIN du tenant. Affiche le statut
// d'abonnement courant et propose :
//  - Si pas de plan payant : CTA vers /tarifs
//  - Si plan payant : bouton "Mettre a jour mon moyen de paiement"
//    qui ouvre le portail Payplug (ou affiche un fallback interne si
//    Payplug ne supporte pas l'update CB hosted)
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPayplugConfigured } from "@/lib/payplug";
import BillingActions from "@/components/BillingActions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  trialing: { label: "Essai gratuit en cours", tone: "amber" },
  active: { label: "Actif", tone: "emerald" },
  past_due: { label: "Paiement en retard", tone: "rose" },
  canceled: { label: "Résilié", tone: "rose" },
  incomplete: { label: "Paiement incomplet", tone: "amber" },
  incomplete_expired: { label: "Paiement expiré", tone: "rose" },
  unpaid: { label: "Impayé", tone: "rose" },
  paused: { label: "Suspendu", tone: "amber" },
};

export default async function FacturationPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "RSSI" && role !== "SUPERADMIN") {
    redirect("/profil");
  }
  const tenantId = session.user.tenantId as string;

  const params = await searchParams;
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      plan: true,
      paymentProvider: true,
      paymentCustomerId: true,
      paymentSubscriptionId: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
      seatCount: true,
      trialEndsAt: true,
    },
  });
  if (!tenant) redirect("/profil");

  const paymentReady = isPayplugConfigured();
  const hasSub = !!tenant.paymentSubscriptionId;
  const statusMeta = tenant.subscriptionStatus
    ? (STATUS_LABELS[tenant.subscriptionStatus] ?? {
        label: tenant.subscriptionStatus,
        tone: "amber",
      })
    : null;
  const toneClass =
    statusMeta?.tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
      : statusMeta?.tone === "rose"
        ? "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
        : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";

  return (
    <main className="max-w-2xl mx-auto px-4 py-12 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-1">
          {tenant.name}
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300">
          Facturation
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Gérez votre abonnement, votre méthode de paiement et vos factures.
        </p>
      </header>

      {params.success && (
        <div
          role="status"
          className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-emerald-900 dark:text-emerald-200"
        >
          <p className="font-bold">✓ Paiement réussi</p>
          <p className="text-sm mt-1">
            Votre abonnement est activé. Le statut peut prendre quelques
            secondes à se mettre à jour ci-dessous (synchronisation Payplug).
          </p>
        </div>
      )}
      {params.canceled && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-900/20 p-4 text-amber-900 dark:text-amber-200">
          <p className="font-bold">Souscription annulée</p>
          <p className="text-sm mt-1">
            Vous avez annulé le checkout. Aucun paiement n'a été prélevé.
          </p>
        </div>
      )}

      {!paymentReady && (
        <div className="rounded-2xl border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-4 text-gray-700 dark:text-gray-300">
          <p className="font-bold">Le module de paiement n&apos;est pas configuré.</p>
          <p className="text-sm mt-1">
            Contactez l'administrateur de la plateforme pour souscrire un plan
            payant. En attendant, le plan {tenant.plan} reste actif.
          </p>
        </div>
      )}

      {/* Plan courant */}
      <section className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
              Plan actuel
            </p>
            <p className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 mt-1">
              {tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1)}
            </p>
          </div>
          {statusMeta && (
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${toneClass}`}
            >
              {statusMeta.label}
            </span>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          {tenant.currentPeriodEnd && (
            <div>
              <dt className="text-xs text-gray-500">
                Prochaine facturation
              </dt>
              <dd className="font-semibold">
                {tenant.currentPeriodEnd.toLocaleDateString("fr-FR")}
              </dd>
            </div>
          )}
          {tenant.trialEndsAt && (
            <div>
              <dt className="text-xs text-gray-500">Fin de l'essai</dt>
              <dd className="font-semibold">
                {tenant.trialEndsAt.toLocaleDateString("fr-FR")}
              </dd>
            </div>
          )}
          {tenant.seatCount && (
            <div>
              <dt className="text-xs text-gray-500">Sièges</dt>
              <dd className="font-semibold">{tenant.seatCount}</dd>
            </div>
          )}
        </dl>

        <BillingActions hasSubscription={hasSub} paymentReady={paymentReady} />
      </section>

      {!hasSub && paymentReady && (
        <section className="rounded-2xl border border-accent-200 dark:border-accent-900/40 bg-accent-50/40 dark:bg-accent-900/15 p-5">
          <p className="font-bold text-primary-500 dark:text-accent-300">
            Passer à un plan payant ?
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 mb-3">
            Débloquez les campagnes de phishing simulé, le module
            Cyber-Réflexe, l'IA Coach Hex et la marketplace de modules.
          </p>
          <Link href="/tarifs" className="btn-primary text-sm">
            Voir les plans →
          </Link>
        </section>
      )}
    </main>
  );
}
