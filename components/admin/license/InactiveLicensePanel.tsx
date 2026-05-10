// SPDX-License-Identifier: AGPL-3.0-or-later
// Panel : licence absente ou invalide.
// 2 cas : "missing" (cas normal AGPL self-host) ou erreur (signature, expire, etc.)

import { describeLicenseError, type LicenseError } from "@/lib/license";

export default function InactiveLicensePanel({ error }: { error: LicenseError }) {
  const message = describeLicenseError(error);

  // Si la licence n'est pas configuree, c'est un cas normal - pas une erreur.
  // Les licences sont optionnelles ; sans elles, l'app marche en plan
  // starter sub-tier free (5 sieges max).
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
                starter
              </code>{" "}
              (sub-tier free, 5 sièges) avec les features de base.
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
            découverte.
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
