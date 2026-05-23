// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Page d'attente après l'envoi d'un magic link / email de vérification.
//
// Configuree dans lib/auth.ts comme `pages.verifyRequest`. Auth.js redirige
// automatiquement ici après :
//   - signIn("nodemailer", { email }) -> envoi du magic link via Scaleway TEM
//     (provider id = "nodemailer" par default, custom sendVerificationRequest)
//
// Note : on a abandonne Resend en mai 2026 pour Scaleway TEM (souverain FR).
// Le provider "resend" n'existe plus, ne pas l'utiliser.
//
// Cette page n'a aucune logique : c'est juste un message de confirmation
// pour rassurer l'utilisateur que son mail est en route. Le lien dans le
// mail le renverra ensuite vers /post-login qui aiguille selon son role.
//
// Pourquoi cette page existe :
// Sans elle, Auth.js redirige vers /connexion/vérification qui retournait
// 404 -> l'utilisateur croit que l'inscription a echoue alors que le mail
// a bien ete envoye.

import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";
import HexMascot from "@/components/HexMascot";

export const metadata = {
  title: "Mail envoyé — Humanix Académie",
  description:
    "Le lien magique de connexion a été envoyé sur ton email. Clique dessus pour finaliser ta connexion ou ton inscription.",
  robots: { index: false, follow: false },
};

export default function VerificationPage() {
  return (
    <main
      id="main-content"
      className="overflow-x-hidden animate-fadeIn min-h-[60vh]"
    >
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section className="max-w-md mx-auto px-4 pt-12 pb-16 sm:pt-20 sm:pb-24 text-center">
          <div className="mb-4 flex justify-center">
            <HexMascot mood="happy" size="lg" animated />
          </div>
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            ✉️ Mail envoyé
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-3">
            Vérifie ta boîte mail
          </h1>
          <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 leading-relaxed mb-6">
            Un lien magique vient d&apos;être envoyé à l&apos;adresse que tu as
            renseignée. Clique dessus depuis le même appareil pour finaliser
            ta connexion.
          </p>

          <div className="bg-white/70 dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-700/80 rounded-2xl p-5 backdrop-blur-sm space-y-3 text-left">
            <p className="text-sm text-gray-700 dark:text-gray-200">
              <strong className="text-primary-500">⏱️ Validité :</strong> le
              lien expire dans 24 heures et ne fonctionne qu&apos;une seule
              fois.
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              <strong className="text-primary-500">🔍 Pas reçu ?</strong>{" "}
              Vérifie tes <em>spams</em> et le dossier{" "}
              <em>&laquo;&nbsp;Promotions&nbsp;&raquo;</em> (Gmail). Si rien ne
              vient sous 5 minutes, retente l&apos;envoi.
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              <strong className="text-primary-500">🦊 Astuce :</strong> ouvre
              le mail sur le même navigateur que celui où tu as demandé le
              lien (côté sécurité).
            </p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/inscription"
              className="btn-secondary inline-flex items-center justify-center gap-2"
            >
              <span aria-hidden="true">↺</span>
              Renvoyer un lien
            </Link>
            <Link
              href="/connexion"
              className="btn-secondary inline-flex items-center justify-center gap-2"
            >
              Retour à la connexion
            </Link>
          </div>

          <p className="mt-6 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            Tu peux fermer cet onglet en attendant le mail. Le lien
            t&apos;amènera directement à ton espace.
          </p>
        </section>
      </HexBackdrop>
    </main>
  );
}
