// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Page d'acceptation/refus d'une demande de rattachement.
//
// Accessible via le lien magique envoye par mail. L'action (accept/
// reject) est appelee depuis le client component apres choix explicite,
// jamais automatiquement par le serveur. Cela garantit un consentement
// formel et evite les pieges de pre-fetch (Slack/Outlook qui suivent
// les liens automatiquement).

import Link from "next/link";
import { auth, getSignInPath } from "@/lib/auth";
import { db } from "@/lib/db";
import TransferConfirmClient from "./TransferConfirmClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Demande de rattachement - Humanix Académie",
  description:
    "Confirmez si vous souhaitez rejoindre l'espace Humanix Académie qui vous a été proposé.",
};

type Props = { params: Promise<{ token: string }> };

export default async function TransferPage({ params }: Props) {
  const { token } = await params;

  // On charge la demande sans la modifier. La page ne fait QUE de
  // l'affichage + delegue les actions Accepter/Refuser au client.
  const req = await db.tenantTransferRequest.findUnique({
    where: { token },
    select: {
      id: true,
      targetEmail: true,
      status: true,
      expiresAt: true,
      personalMessage: true,
      requestedByUserId: true,
      requestedByTenantId: true,
    },
  });

  if (!req) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-6" aria-hidden="true">
          🔎
        </div>
        <h1 className="text-3xl font-extrabold text-primary-500 mb-3">
          Lien introuvable
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Ce lien de rattachement n'existe pas ou a été déjà utilisé.
          Pour rattacher un compte, demandez à l'administrateur de
          renouveler la demande.
        </p>
        <Link href="/" className="btn-primary">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  if (req.status === "EXPIRED" || req.expiresAt < new Date()) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-6" aria-hidden="true">
          ⏰
        </div>
        <h1 className="text-3xl font-extrabold text-primary-500 mb-3">
          Demande expirée
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Cette demande de rattachement a expiré. Demandez à
          l'administrateur de vous en envoyer une nouvelle.
        </p>
        <Link href="/" className="btn-primary">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  if (req.status === "ACCEPTED") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-6" aria-hidden="true">
          ✅
        </div>
        <h1 className="text-3xl font-extrabold text-primary-500 mb-3">
          Rattachement déjà effectué
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Vous avez déjà accepté ce rattachement. Vous êtes maintenant
          membre de l'espace.
        </p>
        <Link href="/apprendre" className="btn-primary">
          Accéder à mes contenus
        </Link>
      </div>
    );
  }

  if (req.status === "REJECTED" || req.status === "REVOKED") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-6" aria-hidden="true">
          🚫
        </div>
        <h1 className="text-3xl font-extrabold text-primary-500 mb-3">
          Demande déjà traitée
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Cette demande a déjà été refusée ou annulée. Votre compte
          actuel n'a pas été modifié.
        </p>
        <Link href="/" className="btn-primary">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  // Status = PENDING : on prepare l'affichage
  const [tenant, requester] = await Promise.all([
    db.tenant.findUnique({
      where: { id: req.requestedByTenantId },
      select: { name: true },
    }),
    db.user.findUnique({
      where: { id: req.requestedByUserId },
      select: { name: true, email: true },
    }),
  ]);

  // Verifier que le visiteur est bien connecte avec l'email cible
  const session = await auth();
  const sessionEmail = session?.user?.email?.toLowerCase() ?? null;
  const isCorrectUser =
    sessionEmail && sessionEmail === req.targetEmail.toLowerCase();
  const isLoggedIn = !!session?.user;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <header className="text-center mb-8">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">
          Demande de rattachement RGPD
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight">
          Rejoindre l'espace{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            {tenant?.name ?? "Humanix Académie"}
          </span>{" "}
          ?
        </h1>
      </header>

      <section className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-primary-500/20 p-6 mb-6 space-y-4">
        <p className="text-gray-700 dark:text-gray-200">
          <strong>{requester?.name || requester?.email || "Un administrateur"}</strong>{" "}
          souhaite que votre compte Humanix Académie (à l'adresse{" "}
          <code className="font-mono text-sm bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            {req.targetEmail}
          </code>
          ) soit rattaché à son espace{" "}
          <strong>{tenant?.name ?? "Humanix Académie"}</strong>.
        </p>

        {req.personalMessage && (
          <blockquote className="border-l-4 border-primary-500 pl-4 py-2 italic text-gray-600 dark:text-gray-300 bg-primary-50/50 dark:bg-primary-950/30 rounded-r-lg">
            « {req.personalMessage} »
          </blockquote>
        )}

        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4 text-sm">
          <p className="font-bold text-emerald-900 dark:text-emerald-200 mb-2">
            Ce qui change si vous acceptez :
          </p>
          <ul className="list-disc pl-5 space-y-1 text-emerald-900 dark:text-emerald-100">
            <li>
              Vos identifiants restent les mêmes (email + mot de passe)
            </li>
            <li>
              Vos progrès, certificats et badges sont conservés
            </li>
            <li>
              Vous accédez aux saisons et règles de l'espace{" "}
              <strong>{tenant?.name}</strong>
            </li>
          </ul>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 text-sm">
          <p className="font-bold text-amber-900 dark:text-amber-200 mb-2">
            Si vous refusez ou ignorez :
          </p>
          <p className="text-amber-900 dark:text-amber-100">
            Votre compte actuel n'est pas modifié. Vous continuez à
            utiliser Humanix Académie comme avant.
          </p>
        </div>
      </section>

      {!isLoggedIn && (
        <section className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 p-5 text-sm text-blue-900 dark:text-blue-100 text-center mb-6">
          <p className="font-bold mb-2">Connectez-vous pour confirmer</p>
          <p className="mb-3">
            Cette action nécessite un consentement explicite. Connectez-vous
            avec l'adresse{" "}
            <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 rounded">
              {req.targetEmail}
            </code>{" "}
            pour accepter ou refuser.
          </p>
          <Link
            href={`${getSignInPath()}?callbackUrl=${encodeURIComponent(`/transferer/${token}`)}`}
            className="btn-primary inline-block"
          >
            Se connecter
          </Link>
        </section>
      )}

      {isLoggedIn && !isCorrectUser && (
        <section className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 p-5 text-sm text-red-900 dark:text-red-100 mb-6">
          <p className="font-bold mb-2">Mauvais compte connecté</p>
          <p className="mb-3">
            Cette demande concerne l'adresse{" "}
            <code className="font-mono text-xs bg-red-100 dark:bg-red-900/50 px-1 py-0.5 rounded">
              {req.targetEmail}
            </code>
            . Vous êtes actuellement connecté avec un autre email.
            Déconnectez-vous puis reconnectez-vous avec la bonne adresse
            pour traiter cette demande.
          </p>
          <Link href="/deconnexion" className="btn-secondary text-sm">
            Se déconnecter
          </Link>
        </section>
      )}

      {isLoggedIn && isCorrectUser && (
        <TransferConfirmClient token={token} tenantName={tenant?.name ?? ""} />
      )}

      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8">
        Conformément au RGPD, votre compte ne sera transféré qu'avec
        votre consentement explicite. Cette demande expire le{" "}
        {req.expiresAt.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        . Vos données personnelles restent protégées :{" "}
        <a
          href="mailto:rgpd@humanix-cybersecurity.fr"
          className="text-primary-500 underline"
        >
          rgpd@humanix-cybersecurity.fr
        </a>
        .
      </p>
    </div>
  );
}
