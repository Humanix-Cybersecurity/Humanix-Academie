// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /souscrire/succès — landing post-paiement Payplug.
// Le webhook a (ou est en train de) provisionné le tenant + ADMIN +
// envoyé un magic link. On rassure l'user pendant qu'il regarde sa
// boîte mail. Pas d'auth requise (l'user n'a pas encore cliqué le lien).

import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";

export const metadata = {
  title: "Paiement reçu — Humanix Académie",
  description: "Votre abonnement est activé. Le lien d'accès est en route.",
  alternates: { canonical: "/souscrire/succes" },
};

export default async function SouscrireSuccesPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const params = await searchParams;
  const plan = params.plan ?? "";

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section className="max-w-2xl mx-auto px-4 pt-16 pb-12 sm:pt-20 sm:pb-16 text-center">
          <p className="text-5xl mb-4" aria-hidden="true">
            🎉
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-3">
            Bienvenue dans Humanix.
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-200 leading-relaxed max-w-xl mx-auto">
            Votre paiement a bien été reçu. On finalise la création de
            votre console et on vous envoie un lien magique sur l&apos;email
            que vous avez utilisé.
          </p>
        </section>
      </HexBackdrop>

      <section className="max-w-2xl mx-auto px-4 pb-16">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-accent-200 dark:border-accent-900/40 p-6 mb-6">
          <h2 className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300 mb-3">
            Et maintenant ?
          </h2>
          <ol className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-accent-500 font-bold">1.</span>
              <span>
                Ouvrez votre boîte mail. Un message{" "}
                <em>« 🦊 Hex t&apos;invite à entrer »</em> est en route
                (≤ 2 min).
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent-500 font-bold">2.</span>
              <span>
                Cliquez le lien depuis le même appareil. Vous arriverez sur
                votre console admin (rôle ADMIN), prête à inviter votre
                équipe et à configurer vos modules.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent-500 font-bold">3.</span>
              <span>
                Activez la 2FA dans votre profil sécurité dès la première
                connexion (recommandé pour le rôle ADMIN).
              </span>
            </li>
          </ol>
        </div>

        <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300">
          <p className="font-bold mb-1">Le mail tarde ?</p>
          <p className="leading-relaxed">
            Vérifiez vos spams. Sinon, écrivez à{" "}
            <a
              href="mailto:contact@humanix-cybersecurity.fr"
              className="text-accent-700 underline"
            >
              contact@humanix-cybersecurity.fr
            </a>{" "}
            avec le plan choisi
            {plan ? ` (${plan})` : ""} et l&apos;email utilisé — on regarde
            tout de suite.
          </p>
        </div>

        <p className="text-center mt-6">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-accent-700 hover:underline"
          >
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </section>
    </main>
  );
}
