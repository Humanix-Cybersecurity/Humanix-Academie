"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Error boundary dediee a /superadmin/tenants/[id]/.
//
// CONTEXTE : les server actions deactivateTenant / reactivateTenant /
// deleteTenant `throw new Error("...")` sur les cas refus (mauvais nom
// de confirmation, tenant Communaute protege, abonnement Mollie actif,
// etc.). Sans error boundary a ce niveau, l'exception remonte au
// boundary global app/error.tsx - et dans le contexte particulier des
// Server Actions Next.js, on peut voir un 404 cryptique au lieu d'un
// message d'erreur lisible.
//
// Signale par Florian 2026-05-23 :
// "je ne peu pas supprimer definitivement un tenant, j'ai une erreur
// 404 une fois le clic sur le bouton"
//
// Ce boundary attrape les throws des server actions cote serveur ET les
// erreurs runtime cote client. Il affiche le message technique (en
// devs / staging) ou un message generique cosy en prod.

import Link from "next/link";
import { useEffect } from "react";

export default function TenantPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[superadmin/tenant] action error", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  // En dev / staging on affiche le message technique pour faciliter le
  // debug. En prod on reste user-friendly. Le digest est toujours montre
  // pour la tracabilite (rapprochement avec les logs).
  const showRawMessage = process.env.NODE_ENV !== "production";
  const friendlyMessage =
    error.message || "Action impossible sur ce tenant.";

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="rounded-2xl border-2 border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-6">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="text-2xl">
            ⚠️
          </span>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-rose-900 dark:text-rose-200">
              Action refusée
            </h1>
            <p className="mt-2 text-sm text-rose-800 dark:text-rose-300">
              {friendlyMessage}
            </p>
            {showRawMessage && error.digest && (
              <p className="mt-3 text-[11px] font-mono text-rose-600 dark:text-rose-400">
                digest: {error.digest}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold px-4 py-2 transition"
          >
            Réessayer
          </button>
          <Link
            href="/superadmin/tenants"
            className="inline-flex items-center justify-center rounded-xl border-2 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 text-sm font-bold px-4 py-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition"
          >
            ← Retour à la liste des tenants
          </Link>
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
        <p className="font-semibold mb-1">Causes les plus fréquentes :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Le nom de confirmation ne matche pas exactement (espaces,
            accents, majuscules - copie-colle depuis le label en gras pour
            être sûr)
          </li>
          <li>
            Le tenant Communauté ne peut pas être supprimé (protection
            intégrée - il accueille les apprenants gratuits)
          </li>
          <li>
            Un abonnement Mollie actif est rattaché - résilie d'abord la
            subscription via la console Mollie
          </li>
          <li>
            Tu as perdu ta session ou ton rôle SUPERADMIN - reconnecte-toi
          </li>
        </ul>
      </div>
    </div>
  );
}
