// SPDX-License-Identifier: AGPL-3.0-or-later
// Panel : licence active (vert) - affichage detail + warning d'expiration.

import HexBackdrop from "@/components/HexBackdrop";
import { type License } from "@/lib/license";
import { PLAN_LABEL, PLAN_EMOJI, type PlanId } from "@/lib/plans";
import Field from "./Field";

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ActiveLicensePanel({
  license,
  warning,
}: {
  license: License;
  warning?: string;
}) {
  const expiresAt = new Date(license.expiresAt);
  const issuedAt = new Date(license.issuedAt);
  const daysUntilExpiry = Math.ceil(
    (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  return (
    <section aria-labelledby="active-title">
      <HexBackdrop intensity="soft">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/30 border-2 border-emerald-300 dark:border-emerald-800/60 p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-4 mb-6">
            <div className="text-5xl shrink-0 animate-float" aria-hidden="true">
              ✓
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.25em] font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                Licence active
              </p>
              <h2
                id="active-title"
                className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-emerald-200"
              >
                Émise pour {license.issuedTo}
              </h2>
            </div>
          </div>

          {warning && (
            <div className="mb-6 p-4 rounded-2xl border-2 border-amber-300 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 flex items-start gap-3">
              <span className="text-2xl shrink-0" aria-hidden="true">
                ⏳
              </span>
              <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
                <strong>{warning}</strong> Pour ne pas perdre l'accès aux
                features Pro+, contactez{" "}
                <a
                  href="mailto:contact@humanix-cybersecurity.fr?subject=Renouvellement licence"
                  className="underline-offset-4 hover:underline font-bold"
                >
                  contact@humanix-cybersecurity.fr
                </a>{" "}
                pour renouveler avant la date d'expiration.
              </p>
            </div>
          )}

          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
            <Field label="Plan octroyé">
              <span className="font-display text-2xl font-extrabold text-primary-500 dark:text-emerald-200">
                <span aria-hidden="true">{PLAN_EMOJI[license.plan as PlanId] ?? ""}</span>{" "}
                {PLAN_LABEL[license.plan as PlanId] ?? license.plan}
              </span>
            </Field>
            <Field label="Sièges max">
              <span className="font-display text-2xl font-extrabold text-primary-500 dark:text-emerald-200 tabular-nums">
                {license.maxSeats === null ? "Illimité" : license.maxSeats}
              </span>
            </Field>
            <Field label="Domaine cluster-locked">
              {license.domain ? (
                <code className="text-sm font-mono bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 text-primary-500 dark:text-emerald-300 break-all">
                  {license.domain}
                </code>
              ) : (
                <span className="text-sm text-gray-600 dark:text-gray-400 italic">
                  Aucun (licence globale)
                </span>
              )}
            </Field>
            <Field label="Identifiant licence">
              <code className="text-xs font-mono bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 text-gray-700 dark:text-gray-200 break-all">
                {license.licenseId}
              </code>
            </Field>
            <Field label="Émise le">
              <time
                dateTime={license.issuedAt}
                className="text-sm text-gray-700 dark:text-gray-200 tabular-nums"
              >
                {formatDate(issuedAt)}
              </time>
            </Field>
            <Field label="Expire le">
              <div className="flex items-baseline gap-3 flex-wrap">
                <time
                  dateTime={license.expiresAt}
                  className={`text-sm font-bold tabular-nums ${
                    daysUntilExpiry <= 14
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {formatDate(expiresAt)}
                </time>
                <span
                  className={`text-xs italic tabular-nums ${
                    daysUntilExpiry <= 14
                      ? "text-amber-700 dark:text-amber-300 font-bold"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  ({daysUntilExpiry > 0 ? `dans ${daysUntilExpiry} j` : "expirée"})
                </span>
              </div>
            </Field>
          </dl>

          {license.featuresOverride.length > 0 && (
            <div className="mt-6 pt-6 border-t-2 border-dashed border-emerald-300 dark:border-emerald-800/50">
              <p className="text-xs uppercase tracking-[0.25em] font-bold text-emerald-700 dark:text-emerald-300 mb-3">
                Override de features
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 italic">
                Cette licence active une whitelist explicite de features
                (custom Enterprise) plutôt que la table par plan classique :
              </p>
              <div className="flex flex-wrap gap-2">
                {license.featuresOverride.map((f) => (
                  <code
                    key={f}
                    className="text-xs font-mono bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 rounded-lg px-2 py-1"
                  >
                    {f}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>
      </HexBackdrop>
    </section>
  );
}
