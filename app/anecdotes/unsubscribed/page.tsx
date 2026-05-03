// Page de confirmation de desinscription. Atterrissage du lien dans l'email.
// Pas de PII : on n'affiche pas l'email de l'utilisateur dans le HTML.

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Désinscription confirmée | HumaniX Académie",
  robots: { index: false, follow: false },
};

export default async function UnsubscribedPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const isError = sp.error === "invalid";

  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      {isError ? (
        <>
          <div className="text-5xl mb-4" aria-hidden="true">
            ⚠
          </div>
          <h1 className="text-2xl font-bold text-amber-700 dark:text-amber-300 mb-3">
            Lien invalide ou expiré
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Nous n'avons pas pu trouver votre abonnement. Il a peut-être déjà
            été supprimé.
          </p>
        </>
      ) : (
        <>
          <div className="text-5xl mb-4" aria-hidden="true">
            ✅
          </div>
          <h1 className="text-2xl font-bold text-primary-500 dark:text-accent-300 mb-3">
            Désinscription confirmée
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Vous ne recevrez plus la Cyber-Anecdote du Lundi. Vos données seront
            supprimées sous 30 jours conformément au RGPD.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Si c'était une erreur, vous pouvez vous réabonner à tout moment
            depuis notre page d'accueil.
          </p>
        </>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/anecdotes" className="btn-secondary">
          Voir les archives
        </Link>
        <Link href="/" className="btn-primary">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
