// SPDX-License-Identifier: AGPL-3.0-or-later
// Page admin /admin/license - affichage de la licence Ed25519 active.
//
// Ce qui est expose :
// - Statut de la licence (valide / invalide / expiree / pas configuree)
// - Si valide : organisation, plan, sieges max, domaine, dates, features
// - Avertissement de fin de validite (warning < 14 jours)
// - Lien vers docs/LICENSE_KEY.md pour la procedure de renouvellement
//
// La licence est lue depuis HUMANIX_LICENSE_KEY (env), pas depuis la DB.
// Pour mettre a jour : modifier le .env + redemarrer l'app.
//
// Roadmap 0.2 : ajouter un upload de licence depuis l'UI (form qui POST
// vers /api/admin/license avec auth + plan-gating). Pour le MVP, on
// reste affichage seul - c'est deja une grande etape.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import HexBackdrop from "@/components/HexBackdrop";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  describeLicenseError,
  getActiveLicense,
  type License,
  type LicenseError,
} from "@/lib/license";
import { PLAN_LABEL, PLAN_EMOJI, type PlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function AdminLicensePage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const role = session.user!.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    redirect("/admin");
  }

  const result = getActiveLicense();

  return (
    <>
      <AdminPageHeader
        title="Licence Ed25519"
        description="Statut de la licence signée qui active les features Pro+ en self-host commercial. Voir docs/LICENSE_KEY.md pour la procédure d'obtention et de renouvellement."
        icon="🔐"
      />

      <div className="space-y-8 min-w-0">
        {result.valid ? (
          <ActiveLicensePanel license={result.license} warning={result.warning} />
        ) : (
          <InactiveLicensePanel error={result.error} />
        )}

        {/* Section : ce que ça fait, ce que ça ne fait pas */}
        <section
          aria-labelledby="explainer-title"
          className="rounded-3xl bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/30 border-2 border-cyan-200 dark:border-cyan-900/40 p-6 sm:p-8"
        >
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-cyan-700 dark:text-cyan-300 mb-2">
            Comment ça marche
          </p>
          <h2
            id="explainer-title"
            className="font-display text-xl sm:text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-4"
          >
            Le système de licence Humanix
          </h2>
          <div className="space-y-4 text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            <p>
              Humanix Cybersecurity émet une licence{" "}
              <strong>Ed25519 signée</strong> qui débloque les features
              payantes (Pack NIS2 turnkey, phishing IA, vishing, marketplace…)
              en self-host commercial. La licence est vérifiée localement par
              l'app, sans appel à Humanix : <strong>fonctionne offline</strong>,
              avec cache mémoire 5 minutes.
            </p>
            <p>
              <strong>Pour les utilisateurs cloud SaaS</strong>, la licence
              n'est pas pertinente - le plan est géré par votre espace de
              facturation Humanix.
            </p>
            <p>
              <strong>Pour les self-host AGPLv3</strong>, sans licence
              configurée, l'app fonctionne en plan{" "}
              <code className="px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-900/40 rounded text-cyan-800 dark:text-cyan-200 font-mono">
                trial
              </code>{" "}
              ou{" "}
              <code className="px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-900/40 rounded text-cyan-800 dark:text-cyan-200 font-mono">
                decouverte
              </code>{" "}
              avec les features de base. Pour activer le palier Pro ou
              Enterprise, il faut une licence valide.
            </p>
            <p className="italic text-gray-600 dark:text-gray-300">
              Transparence assumée : ce système n'est pas opposable légalement à
              un client AGPLv3 motivé qui patcherait la vérification. C'est
              l'esprit de l'AGPL - la vraie protection commerciale vient du
              service, du trademark et de l'expertise. Cf.{" "}
              <code className="px-1 py-0.5 bg-cyan-100 dark:bg-cyan-900/40 rounded text-cyan-800 dark:text-cyan-200 font-mono text-xs">
                docs/OPEN_CORE.md
              </code>
              .
            </p>
          </div>
        </section>

        {/* Section : actions */}
        <section
          aria-labelledby="actions-title"
          className="rounded-3xl bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-amber-950/20 dark:via-slate-900 dark:to-yellow-950/20 border-2 border-amber-200 dark:border-amber-900/40 p-6 sm:p-8"
        >
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-amber-700 dark:text-amber-300 mb-2">
            Procédure
          </p>
          <h2
            id="actions-title"
            className="font-display text-xl sm:text-2xl font-extrabold text-primary-500 dark:text-amber-200 mb-4"
          >
            Mettre à jour la licence
          </h2>
          <ol className="space-y-3 text-sm text-gray-700 dark:text-gray-200 list-decimal list-inside leading-relaxed">
            <li>
              Recevoir la nouvelle string licence par email signé depuis{" "}
              <a
                href="mailto:contact@humanix-cybersecurity.fr"
                className="text-amber-700 dark:text-amber-300 underline-offset-4 hover:underline font-bold"
              >
                contact@humanix-cybersecurity.fr
              </a>
            </li>
            <li>
              Modifier la variable{" "}
              <code className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded text-amber-800 dark:text-amber-200 font-mono text-xs">
                HUMANIX_LICENSE_KEY
              </code>{" "}
              dans le fichier <code className="font-mono text-xs">.env</code>{" "}
              de votre instance
            </li>
            <li>
              Redémarrer l'application :{" "}
              <code className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded text-amber-800 dark:text-amber-200 font-mono text-xs">
                docker compose restart app
              </code>{" "}
              ou{" "}
              <code className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded text-amber-800 dark:text-amber-200 font-mono text-xs">
                npm run start
              </code>
            </li>
            <li>Revenir sur cette page pour vérifier que la licence est active</li>
          </ol>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <a
              href="https://github.com/humanix-cybersecurity/humanix-academie/blob/main/docs/LICENSE_KEY.md"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-sm"
            >
              <span aria-hidden="true">📖</span> Documentation complète
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
            <a
              href="mailto:contact@humanix-cybersecurity.fr?subject=Renouvellement licence Humanix"
              className="btn-primary text-sm"
            >
              <span aria-hidden="true">✉</span> Demander une licence
            </a>
          </div>
        </section>

        {/* Respiration */}
        <section className="text-center pt-2">
          <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            « La transparence n'est pas une vulnérabilité. C'est ce qui
            distingue la maîtrise du marketing. »
          </blockquote>
          <p
            aria-hidden="true"
            className="mt-3 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
          >
            - Hex veille
          </p>
        </section>
      </div>
    </>
  );
}

// ===========================================================================
// PANELS
// ===========================================================================

function ActiveLicensePanel({
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

function InactiveLicensePanel({ error }: { error: LicenseError }) {
  const message = describeLicenseError(error);

  // Si la licence n'est pas configuree, c'est un cas normal - pas une erreur.
  // Les licences sont optionnelles ; sans elles, l'app marche en plan trial.
  if (error === "missing") {
    return (
      <section
        aria-labelledby="missing-title"
        className="rounded-3xl bg-gradient-to-br from-slate-50 via-white to-gray-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/50 border-2 border-gray-200 dark:border-slate-700 p-6 sm:p-8"
      >
        <div className="flex items-start gap-4">
          <div className="text-5xl shrink-0" aria-hidden="true">
            🌱
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
              Aucune licence configurée
            </p>
            <h2
              id="missing-title"
              className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-3"
            >
              L'application fonctionne en mode tranquille
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-4">
              Aucune variable{" "}
              <code className="font-mono text-xs bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                HUMANIX_LICENSE_KEY
              </code>{" "}
              n'est définie. C'est le comportement attendu pour les
              installations <strong>self-host AGPLv3</strong> sans contrat
              commercial : l'app fonctionne en plan{" "}
              <code className="font-mono text-xs bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                trial
              </code>{" "}
              ou{" "}
              <code className="font-mono text-xs bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                decouverte
              </code>{" "}
              avec les features de base.
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
              Pour activer Pro/Enterprise (Pack NIS2 turnkey, phishing IA,
              vishing souverain, marketplace…), il faut souscrire à un contrat
              commercial avec Humanix Cybersecurity et configurer la licence.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Erreurs reelles (signature falsifiee, licence expiree, mauvais domaine, etc.)
  return (
    <section
      aria-labelledby="error-title"
      className="rounded-3xl bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-rose-950/30 dark:via-slate-900 dark:to-amber-950/20 border-2 border-rose-300 dark:border-rose-800/60 p-6 sm:p-8"
    >
      <div className="flex items-start gap-4">
        <div className="text-5xl shrink-0" aria-hidden="true">
          ⚠
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-rose-700 dark:text-rose-300 mb-2">
            Licence non valide
          </p>
          <h2
            id="error-title"
            className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-rose-200 mb-3"
          >
            {message}
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-4">
            La licence configurée dans{" "}
            <code className="font-mono text-xs bg-rose-100 dark:bg-rose-900/40 px-1.5 py-0.5 rounded text-rose-800 dark:text-rose-200">
              HUMANIX_LICENSE_KEY
            </code>{" "}
            n'a pas pu être validée. L'app fonctionne actuellement en plan
            trial / découverte.
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            Vérifiez que vous avez collé la string complète (commençant par{" "}
            <code className="font-mono text-xs">HUMANIX-LICENSE-v1.</code>),
            que l'horloge serveur est à jour, et que le domaine de l'app
            correspond à celui de la licence si elle est cluster-lockée.
          </p>
          <div className="mt-6">
            <a
              href="mailto:contact@humanix-cybersecurity.fr?subject=Probleme licence Humanix"
              className="btn-primary text-sm"
            >
              <span aria-hidden="true">✉</span> Contacter le support
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===========================================================================
// SOUS-COMPOSANTS LOCAUX
// ===========================================================================

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.25em] font-bold text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
