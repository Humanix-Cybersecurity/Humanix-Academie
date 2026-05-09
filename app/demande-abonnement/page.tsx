// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /demande-abonnement — VOIE EXCEPTIONNELLE pour les besoins qui ne
// rentrent pas dans le self-service Payplug.
//
// CAS D'USAGE :
//   - +250 sièges (au-delà du plan Pro)
//   - Instance dédiée / isolée (pas multi-tenant SaaS)
//   - Hébergement SecNumCloud, white-label, intégrations sur-mesure
//   - Demandes spécifiques nécessitant un échange humain
//
// Pour TOUS les autres cas (Starter / Pro standards), le user
// passe par /tarifs → /souscrire → Payplug Checkout → webhook qui
// provisionne tenant + ADMIN automatiquement. Aucune action humaine.
//
// Workflow ici :
//   1. Le DSI/RSSI/DAF/DPO remplit le formulaire avec son contexte.
//   2. Notification email vers FOUNDER_NOTIFICATION_EMAIL.
//   3. Le founder répond sous 24h ouvrées avec une proposition adaptée
//      (devis, instance dédiée, etc.) et provisionne via /superadmin
//      ou lib/tenant-provisioning.ts manuellement si besoin.

import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";
import { submitDemandeAbonnement } from "./actions";

export const metadata = {
  title: "Demande d'abonnement entreprise — Humanix Académie",
  description:
    "Votre organisation cherche à équiper ses équipes d'une plateforme de cybersensibilisation française et souveraine ? Décrivez votre besoin, nous revenons vers vous sous 24h ouvrées.",
  alternates: { canonical: "/demande-abonnement" },
};

const PLAN_OPTIONS = [
  { value: "starter", label: "Starter — 1 à 15 sièges (gratuit ≤5, 19 €/mois 6-15)" },
  { value: "pro", label: "Pro — 16 à 250 sièges (3 €/utilisateur/mois)" },
  { value: "enterprise", label: "Enterprise — 250+ sièges / sur-mesure" },
  { value: "non-decide", label: "Je n'ai pas encore décidé, conseillez-moi" },
];

export default async function DemandeAbonnementPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; error?: string }>;
}) {
  const params = await searchParams;
  const submitted = params.submitted === "1";
  const errorMsg = params.error
    ? "Une erreur est survenue. Réessaye dans un instant ou écris-nous directement à contact@humanix-cybersecurity.fr."
    : null;

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section className="max-w-2xl mx-auto px-4 pt-12 pb-6 sm:pt-16 sm:pb-8 text-center">
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            👑 Enterprise · Sur devis
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-3">
            Au-delà du standard.
          </h1>
          <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed">
            Pour <strong>+250 sièges</strong>,{" "}
            <strong>instance dédiée</strong>, <strong>SecNumCloud</strong>,{" "}
            white-label ou intégrations sur-mesure. Tous les autres besoins
            sont self-service via{" "}
            <Link href="/tarifs" className="text-accent-700 underline">
              /tarifs
            </Link>
            .
          </p>
        </section>
      </HexBackdrop>

      <section className="max-w-2xl mx-auto px-4 pb-16">
        {submitted ? (
          <div
            role="status"
            className="bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl p-6 text-center"
          >
            <p className="text-2xl mb-2" aria-hidden="true">✅</p>
            <h2 className="font-display font-extrabold text-emerald-900 dark:text-emerald-200 text-xl mb-2">
              Demande reçue.
            </h2>
            <p className="text-emerald-800 dark:text-emerald-300 text-sm leading-relaxed">
              Florian (le founder) revient vers vous sous 24h ouvrées par
              email. Si vous avez besoin d&apos;une réponse plus rapide,
              écrivez-nous directement à{" "}
              <a
                href="mailto:contact@humanix-cybersecurity.fr"
                className="underline font-bold"
              >
                contact@humanix-cybersecurity.fr
              </a>
              .
            </p>
            <Link
              href="/"
              className="inline-block mt-4 text-sm text-accent-700 hover:underline"
            >
              ← Retour à l&apos;accueil
            </Link>
          </div>
        ) : (
          <>
            {errorMsg && (
              <div
                role="alert"
                className="text-sm bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-3 mb-4"
              >
                {errorMsg}
              </div>
            )}
            <form
              action={submitDemandeAbonnement}
              className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-gray-200 dark:border-slate-700 p-6 space-y-4"
            >
              <div>
                <label
                  htmlFor="organization"
                  className="block text-sm font-medium mb-1"
                >
                  Nom de l&apos;organisation <span className="text-warn">*</span>
                </label>
                <input
                  id="organization"
                  name="organization"
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Ma PME SAS"
                  className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1"
                >
                  Votre email professionnel <span className="text-warn">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="prenom.nom@mapme.fr"
                  className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="role"
                    className="block text-sm font-medium mb-1"
                  >
                    Votre rôle
                  </label>
                  <input
                    id="role"
                    name="role"
                    type="text"
                    maxLength={80}
                    placeholder="DSI / RSSI / DAF / DPO"
                    className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="size"
                    className="block text-sm font-medium mb-1"
                  >
                    Effectif total
                  </label>
                  <select
                    id="size"
                    name="size"
                    className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none bg-white dark:bg-slate-900"
                  >
                    <option value="">— Préférez ne pas répondre —</option>
                    <option value="1-9">1 à 9 personnes</option>
                    <option value="10-49">10 à 49 personnes</option>
                    <option value="50-249">50 à 249 personnes</option>
                    <option value="250+">250 et plus</option>
                  </select>
                </div>
              </div>
              <div>
                <label
                  htmlFor="plan"
                  className="block text-sm font-medium mb-1"
                >
                  Plan envisagé <span className="text-warn">*</span>
                </label>
                <select
                  id="plan"
                  name="plan"
                  required
                  className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none bg-white dark:bg-slate-900"
                  defaultValue="non-decide"
                >
                  {PLAN_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium mb-1"
                >
                  Contexte ou question (optionnel)
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  maxLength={2000}
                  placeholder="Quelques mots sur votre besoin : NIS2, RGPD, déploiement urgent, attaques récentes…"
                  className="block w-full rounded-xl border-2 border-gray-200 dark:border-slate-700 p-3 focus:border-accent-500 focus:outline-none"
                />
              </div>
              {/* Honeypot */}
              <div className="hidden" aria-hidden="true">
                <label>
                  Ne rien remplir :
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-2">
                <button type="submit" className="btn-primary">
                  Envoyer la demande
                </button>
                <p className="text-xs text-gray-500">
                  RGPD : ces données sont stockées 6 mois max, sans cession à
                  un tiers.
                </p>
              </div>
            </form>

            <p className="text-xs text-center text-gray-500 mt-6">
              Préfère-tu apprendre seul·e gratuitement ?{" "}
              <Link
                href="/inscription"
                className="text-accent-700 hover:underline font-medium"
              >
                Inscription Communauté
              </Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
