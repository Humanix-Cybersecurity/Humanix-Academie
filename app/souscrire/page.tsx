// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /souscrire — page de pré-checkout self-service. L'organisation choisit
// son plan + saisit email + nom d'org → submit → redirect Payplug Checkout.
// Le paiement déclenche le webhook qui provisionne tenant + ADMIN +
// envoie un magic link de bienvenue. Aucune action humaine côté Humanix.
//
// Pour les plans non self-service (premium, instance dédiée), on redirige
// vers /demande-abonnement (workflow founder).
//
// Si Payplug n'est pas configuré (env vars absentes), on affiche une
// note explicite + lien /demande-abonnement (fallback gracieux).

import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import HexBackdrop from "@/components/HexBackdrop";
import { TIERS } from "@/lib/pricing";
import {
  isPayplugConfigured,
  PAYPLUG_BUYABLE_PLANS,
} from "@/lib/payplug";
import { isPlanId } from "@/lib/plans";
import { isDevMode } from "@/lib/dev-mode";
import SouscrireForm from "./SouscrireForm";

// force-dynamic : DEMO_MODE n'est pas set au build → eviter le prerender
// statique qui fige le redirect vers /demo (cf. /inscription, /demo/layout).
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Souscrire — Humanix Académie",
  description:
    "Créez votre compte entreprise en 2 minutes : choix du plan, email professionnel, paiement Payplug, accès immédiat à la console admin via un lien magique.",
  alternates: { canonical: "/souscrire" },
};

const isDemoMode = process.env.DEMO_MODE === "true";

export default async function SouscrirePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  if (isDemoMode) {
    // En démo, le checkout n'a pas de sens : on renvoie vers le sélecteur
    // de comptes fictifs.
    redirect("/demo");
  }

  const params = await searchParams;
  const planRaw = String(params.plan ?? "").trim();

  // Plan inconnu ou non self-service → renvoyer vers /tarifs ou enterprise.
  //
  // NB : on ne gate PAS sur `isPlanBuyable()` ici (qui exige PAYPLUG_PLAN_*
  // en env). Sinon, sur une instance ou Payplug n'est pas encore configure,
  // un click sur "Demarrer l'essai gratuit" depuis /tarifs boucle vers
  // /tarifs (PR du bug : isPlanBuyable=false → redirect → user reclique).
  // La page elle-meme gere le cas "Payplug pas pret" via le banner amber
  // ci-dessous (cf. !payplugReady) avec un lien vers /demande-abonnement.
  if (!isPlanId(planRaw) || !PAYPLUG_BUYABLE_PLANS.includes(planRaw)) {
    if (planRaw === "premium") {
      redirect("/demande-abonnement?type=enterprise");
    }
    redirect("/tarifs");
  }

  const tier = TIERS.find((t) => t.id === planRaw);
  if (!tier) redirect("/tarifs");

  // En DEV_MODE, on affiche le formulaire reel : la POST sur
  // /api/payments/checkout/start detecte DEV_MODE et provisionne sans
  // appeler Payplug. Cf. lib/dev-mode.ts pour le rationale.
  const payplugReady = isPayplugConfigured() || isDevMode();

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section className="max-w-2xl mx-auto px-4 pt-12 pb-6 sm:pt-16 sm:pb-8 text-center">
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            ✨ Souscription · 2 minutes · accès immédiat
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-3">
            On y est.
          </h1>
          <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed">
            Plan choisi : <strong>{tier.name}</strong> · {tier.tagline}.
            Après paiement, vous recevez un lien magique pour entrer dans
            votre console admin.
          </p>
        </section>
      </HexBackdrop>

      <section className="max-w-2xl mx-auto px-4 pb-16">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-gray-200 dark:border-slate-700 p-6 mb-4">
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-3xl" aria-hidden="true">
              {tier.emoji}
            </span>
            <h2 className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300">
              {tier.name}
            </h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            {tier.tagline}
          </p>
          <ul className="grid sm:grid-cols-2 gap-1 text-sm">
            {tier.features.slice(0, 6).map((f, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-gray-700 dark:text-gray-300"
              >
                <span aria-hidden="true" className="text-accent-500">
                  ✓
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 flex items-baseline justify-between">
            <span className="text-sm text-gray-500">Prix mensuel</span>
            <span className="font-display text-xl font-extrabold text-primary-500 dark:text-accent-300">
              {tier.pricing.monthly.display}
            </span>
          </div>
          {tier.seats?.max && (
            <p className="text-xs text-gray-500 mt-1">
              Inclus jusqu&apos;à {tier.seats.max} sièges. Au-delà,{" "}
              <Link href="/demande-abonnement?type=enterprise" className="underline">
                contactez-nous
              </Link>
              .
            </p>
          )}
        </div>

        {!payplugReady ? (
          <div className="bg-amber-50 border-2 border-amber-300 text-amber-900 rounded-2xl p-5">
            <p className="font-bold mb-2">
              💳 Le paiement automatique n&apos;est pas encore activé sur cette
              instance.
            </p>
            <p className="text-sm leading-relaxed mb-4">
              On bascule manuellement sur le flow accompagné. Remplis ce
              court formulaire, on te configure tout sous 24h ouvrées.
            </p>
            <Link
              href={`/demande-abonnement?plan=${tier.id}`}
              className="btn-primary text-sm inline-block"
            >
              Continuer la souscription
            </Link>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="text-sm text-gray-500 text-center py-8 animate-pulse">
                Préparation du formulaire…
              </div>
            }
          >
            <SouscrireForm
              planId={tier.id}
              planName={tier.name}
              maxSeats={tier.seats?.max ?? null}
              devMode={isDevMode()}
            />
          </Suspense>
        )}

        <p className="text-xs text-center text-gray-500 mt-6">
          Besoin d&apos;une instance dédiée, +250 sièges ou d&apos;une démo
          guidée ?{" "}
          <Link
            href="/demande-abonnement?type=enterprise"
            className="text-accent-700 hover:underline font-medium"
          >
            Demander un devis
          </Link>
        </p>
      </section>
    </main>
  );
}
