// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Page de confirmation apres /api/unsubscribe. Affichee quand l'utilisateur
// a clique sur le lien "Se desinscrire" classique dans un mail (pas one-click
// Gmail). On confirme visuellement la prise en compte de la demande et on
// donne un moyen de re-subscribe si c'etait par erreur.

import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";
import HexMascot from "@/components/HexMascot";

export const metadata = {
  title: "Désinscription — Humanix Académie",
  description:
    "Confirmation de la prise en compte de votre demande de désinscription.",
  robots: { index: false, follow: false },
};

const LIST_LABELS: Record<string, string> = {
  transactional: "mails de connexion (magic link)",
  "admin-alerts": "alertes admin",
  marketing: "communications marketing",
  anecdote: "Cyber-Anecdote du Lundi",
};

const ERROR_MESSAGES: Record<string, string> = {
  missing_token:
    "Le lien de désinscription est incomplet. Réessaye avec le lien envoyé dans le mail.",
  malformed:
    "Le lien de désinscription est mal formé. Il a peut-être été tronqué par ton client mail.",
  bad_signature:
    "Le lien de désinscription n'est pas valide. Il a peut-être été modifié.",
  expired:
    "Le lien de désinscription a expiré (>1 an). Contacte-nous directement.",
  unknown_list: "Liste inconnue. Contacte-nous pour traiter ta demande.",
  unknown_version:
    "Format de lien obsolète. Demande un nouveau lien depuis un mail récent.",
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; list?: string; error?: string }>;
}) {
  const params = await searchParams;
  const success = !params.error && !!params.email;
  const errorMessage = params.error
    ? (ERROR_MESSAGES[params.error] ?? "Une erreur est survenue.")
    : null;
  const listLabel = params.list
    ? (LIST_LABELS[params.list] ?? params.list)
    : null;

  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section className="max-w-xl mx-auto px-4 pt-12 pb-16 sm:pt-20 sm:pb-24 text-center">
          <div className="mb-4 flex justify-center">
            <HexMascot
              mood={success ? "happy" : "neutral"}
              size="lg"
              animated
            />
          </div>

          {success ? (
            <>
              <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                ✅ Désinscription enregistrée
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-3">
                C&apos;est noté.
              </h1>
              <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 leading-relaxed mb-6">
                L&apos;adresse <strong>{params.email}</strong> ne recevra
                plus les <strong>{listLabel ?? "communications"}</strong> de
                Humanix Académie.
              </p>
              <div className="bg-white/70 dark:bg-slate-900/60 border border-gray-200/80 dark:border-slate-700/80 rounded-2xl p-5 backdrop-blur-sm space-y-2 text-left text-sm text-gray-700 dark:text-gray-200">
                <p>
                  <strong className="text-primary-500">⏱️ Effet :</strong> ta
                  demande est prise en compte immédiatement.
                </p>
                <p>
                  <strong className="text-primary-500">📬 Erreur ?</strong>{" "}
                  Si tu ne souhaitais pas te désinscrire, tu peux te
                  ré-abonner depuis ton{" "}
                  <Link
                    href="/profil"
                    className="text-accent-700 dark:text-accent-300 underline"
                  >
                    espace personnel
                  </Link>{" "}
                  ou la{" "}
                  <Link
                    href="/anecdotes"
                    className="text-accent-700 dark:text-accent-300 underline"
                  >
                    page Cyber-Anecdotes
                  </Link>{" "}
                  selon la liste concernée.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 pt-2">
                  RGPD : la trace de cette désinscription (email + IP hashée)
                  est conservée à titre de preuve. Aucune donnée n&apos;est
                  partagée avec des tiers.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-amber-600 dark:text-amber-400 mb-2">
                ⚠️ Lien invalide
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-3">
                Cette désinscription n&apos;a pas pu aboutir
              </h1>
              <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed mb-6">
                {errorMessage}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                Si le problème persiste, tu peux nous contacter directement
                en répondant à n&apos;importe quel mail Humanix, ou en
                écrivant à{" "}
                <a
                  href="mailto:contact@humanix-cybersecurity.fr?subject=Désinscription"
                  className="text-accent-700 dark:text-accent-300 underline"
                >
                  contact@humanix-cybersecurity.fr
                </a>
                .
              </p>
            </>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="btn-secondary inline-flex items-center justify-center gap-2"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </section>
      </HexBackdrop>
    </main>
  );
}
