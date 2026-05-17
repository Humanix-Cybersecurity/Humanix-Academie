// SPDX-License-Identifier: AGPL-3.0-or-later
// Section "Mettre a jour la licence" - procedure step-by-step + CTA contact.

export default function UpdateProcedure() {
  return (
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
          dans le fichier <code className="font-mono text-xs">.env</code> de
          votre instance
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
          href="mailto:contact@humanix-cybersecurity.fr?subject=Renouvellement licence Humanix"
          className="btn-primary text-sm"
        >
          <span aria-hidden="true">✉</span> Demander une licence
        </a>
      </div>
    </section>
  );
}
