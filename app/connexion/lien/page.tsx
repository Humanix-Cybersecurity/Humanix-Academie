// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /connexion/lien - Confirmation du lien magique.
//
// Le mail de connexion (lib/auth.ts) et le mail d'invitation
// (lib/invite-email.ts) ne pointent plus sur le callback Auth.js mais ici.
// Le GET de cette page est sans effet : le jeton n'est envoyé au callback
// que par le bouton, en POST. Pourquoi : le jeton est à usage unique et les
// messageries d'entreprise ouvrent les liens reçus avant l'utilisateur
// (Microsoft 365, Safe Links, antispams). Cf. lib/magic-link/confirmation.ts.
import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";
import HexMascot from "@/components/HexMascot";
import {
  lireParametresLien,
  urlCallbackPourFormulaire,
} from "@/lib/magic-link/confirmation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Confirmer la connexion - Humanix Académie",
  description: "Dernière étape avant d'entrer dans Humanix Académie.",
  robots: { index: false, follow: false },
};

export default async function LienMagiquePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lien = lireParametresLien(await searchParams);

  return (
    <main
      id="main-content"
      className="overflow-x-hidden animate-fadeIn min-h-[60vh]"
    >
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section className="max-w-md mx-auto px-4 pt-12 pb-16 sm:pt-20 sm:pb-24 text-center">
          <div className="mb-4 flex justify-center">
            <HexMascot mood={lien ? "happy" : "curious"} size="lg" animated />
          </div>

          {lien ? (
            <>
              <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
                🔐 Dernière étape
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-3">
                Confirme ta connexion
              </h1>
              <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 leading-relaxed mb-6">
                Tu vas entrer dans Humanix Académie avec l&apos;adresse{" "}
                <strong className="break-all">{lien.email}</strong>.
              </p>

              <form method="post" action={urlCallbackPourFormulaire(lien)}>
                <input type="hidden" name="confirmation" value="1" />
                <button
                  type="submit"
                  className="btn-primary inline-flex items-center justify-center gap-2 text-base px-8 py-3"
                >
                  Me connecter
                  <span aria-hidden="true">→</span>
                </button>
              </form>

              <div className="mt-8 bg-white/70 dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-700/80 rounded-2xl p-5 backdrop-blur-sm text-left">
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  <strong className="text-primary-500">
                    🛡️ Pourquoi ce bouton ?
                  </strong>{" "}
                  Certaines messageries d&apos;entreprise ouvrent les liens
                  reçus pour les analyser, avant même que tu les voies. Le lien
                  ne fonctionnant qu&apos;une seule fois, il serait déjà
                  consommé à ton arrivée. Ici, rien ne se passe tant que tu
                  n&apos;as pas cliqué.
                </p>
              </div>

              <p className="mt-6 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Ce n&apos;est pas toi qui as demandé ce lien ? Ferme simplement
                cette page : sans clic, il reste inutilisé.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
                🔗 Lien incomplet
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-3">
                Ce lien ne contient pas tout
              </h1>
              <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 leading-relaxed mb-6">
                Il a sans doute été tronqué par ta messagerie. Demande un
                nouveau lien depuis la page de connexion : ça prend dix
                secondes.
              </p>
              <Link
                href="/connexion"
                className="btn-primary inline-flex items-center justify-center gap-2"
              >
                Retour à la connexion
              </Link>
            </>
          )}
        </section>
      </HexBackdrop>
    </main>
  );
}
