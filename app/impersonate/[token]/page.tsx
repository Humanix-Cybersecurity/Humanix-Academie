// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Page de consentement pour une demande « Voir en tant que ».
//
// L'utilisateur cible decouvre la demande (qui, quoi, pourquoi,
// pour combien de temps) et autorise ou refuse via double-clic
// (anti-prefetch des liens par les clients mail).

import Link from "next/link";
import { auth, getSignInPath } from "@/lib/auth";
import { db } from "@/lib/db";
import ImpersonateConsentClient from "./ImpersonateConsentClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Demande d'accès en lecture — Humanix Académie",
  description:
    "Confirmez si vous souhaitez autoriser un administrateur à consulter votre compte en lecture seule.",
};

type Props = { params: Promise<{ token: string }> };

function fmtDateTime(d: Date): string {
  return d.toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDuration(mn: number): string {
  if (mn < 60) return `${mn} minutes`;
  if (mn < 1440) {
    const h = Math.floor(mn / 60);
    return h === 1 ? "1 heure" : `${h} heures`;
  }
  return "24 heures";
}

export default async function ImpersonateConsentPage({ params }: Props) {
  const { token } = await params;

  const req = await db.impersonationSession.findUnique({
    where: { token },
    include: {
      adminUser: {
        select: { name: true, email: true, role: true },
      },
      adminTenant: {
        select: { name: true },
      },
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
          Ce lien d'autorisation n'existe pas ou a déjà été utilisé.
        </p>
        <Link href="/" className="btn-primary">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  // Etat « deja traite »
  if (req.status === "EXPIRED" || req.consentExpiresAt < new Date()) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-6" aria-hidden="true">
          ⏰
        </div>
        <h1 className="text-3xl font-extrabold text-primary-500 mb-3">
          Demande expirée
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Cette demande d'accès a expiré. L'administrateur peut vous en
          envoyer une nouvelle si nécessaire.
        </p>
        <Link href="/" className="btn-primary">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  if (req.status === "ACTIVE") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-6" aria-hidden="true">
          👁️
        </div>
        <h1 className="text-3xl font-extrabold text-primary-500 mb-3">
          Accès déjà autorisé
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Vous avez déjà accepté cette demande. L'administrateur a
          actuellement accès à votre compte en lecture seule, jusqu'au{" "}
          <strong>
            {req.endsAt ? fmtDateTime(req.endsAt) : "fin de session"}
          </strong>
          .
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Vous pouvez révoquer cet accès à tout moment depuis vos paramètres
          de sécurité.
        </p>
        <Link href="/profil/securite" className="btn-primary">
          Mes paramètres de sécurité
        </Link>
      </div>
    );
  }

  if (
    req.status === "REJECTED" ||
    req.status === "REVOKED" ||
    req.status === "ENDED"
  ) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-6" aria-hidden="true">
          🚫
        </div>
        <h1 className="text-3xl font-extrabold text-primary-500 mb-3">
          Demande déjà traitée
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Cette demande a déjà été refusée ou révoquée. Votre compte
          n'est pas accessible à l'administrateur.
        </p>
        <Link href="/" className="btn-primary">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  // Status = PENDING. Verifie que le visiteur est connecte avec
  // le bon email
  const session = await auth();
  const sessionEmail = session?.user?.email?.toLowerCase() ?? null;
  const isCorrectUser =
    sessionEmail && sessionEmail === req.targetEmail.toLowerCase();
  const isLoggedIn = !!session?.user;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <header className="text-center mb-8">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">
          Demande d'accès en lecture
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight">
          {req.adminUser.name || req.adminUser.email} demande à{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            voir votre compte
          </span>
        </h1>
      </header>

      <section className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-primary-500/20 p-6 mb-6 space-y-4">
        <p className="text-gray-700 dark:text-gray-200">
          <strong>{req.adminUser.name || req.adminUser.email}</strong>{" "}
          (<code className="font-mono text-sm">{req.adminUser.email}</code>),
          administrateur de l'espace{" "}
          <strong>{req.adminTenant.name}</strong>, demande votre autorisation
          pour consulter votre compte en <strong>lecture seule</strong>.
        </p>

        <div className="border-l-4 border-primary-500 pl-4 py-2 italic text-gray-700 dark:text-gray-200 bg-primary-50/50 dark:bg-primary-950/30 rounded-r-lg">
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 not-italic font-bold">
            Raison invoquée
          </p>
          « {req.reason} »
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4 text-sm">
            <p className="font-bold text-emerald-900 dark:text-emerald-200 mb-2">
              ✓ Ce qu'il pourra voir
            </p>
            <ul className="list-disc pl-5 space-y-1 text-emerald-900 dark:text-emerald-100 text-xs">
              <li>Progrès sur saisons et épisodes</li>
              <li>Certificats et badges obtenus</li>
              <li>Historique d'activité récent</li>
              <li>Paramètres généraux de profil</li>
            </ul>
          </div>

          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl p-4 text-sm">
            <p className="font-bold text-red-900 dark:text-red-200 mb-2">
              ✗ Ce qu'il NE pourra PAS faire
            </p>
            <ul className="list-disc pl-5 space-y-1 text-red-900 dark:text-red-100 text-xs">
              <li>Modifier ou supprimer vos données</li>
              <li>Compléter des modules à votre place</li>
              <li>Envoyer des messages en votre nom</li>
              <li>Voir vos conversations privées Hex</li>
            </ul>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 text-sm">
          <p className="font-bold text-amber-900 dark:text-amber-200 mb-2">
            ⏱ Durée demandée
          </p>
          <p className="text-amber-900 dark:text-amber-100">
            <strong>
              {fmtDuration(req.requestedDurationMinutes)} maximum
            </strong>{" "}
            à partir de votre acceptation. Vous pouvez <strong>révoquer
            l'accès à tout moment</strong> depuis vos paramètres de
            sécurité.
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
            pour autoriser ou refuser.
          </p>
          <Link
            href={`${getSignInPath()}?callbackUrl=${encodeURIComponent(`/impersonate/${token}`)}`}
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
            Cette demande concerne{" "}
            <code className="font-mono text-xs bg-red-100 dark:bg-red-900/50 px-1 py-0.5 rounded">
              {req.targetEmail}
            </code>
            . Déconnectez-vous puis reconnectez-vous avec cette adresse pour
            traiter la demande.
          </p>
          <Link href="/deconnexion" className="btn-secondary text-sm">
            Se déconnecter
          </Link>
        </section>
      )}

      {isLoggedIn && isCorrectUser && (
        <ImpersonateConsentClient token={token} />
      )}

      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8">
        Cette demande de consentement expire le{" "}
        <strong>{fmtDateTime(req.consentExpiresAt)}</strong>. Conformément
        au RGPD, l'accès n'est accordé qu'avec votre consentement explicite,
        limité dans le temps, et tracé dans le journal d'audit. Vos droits :{" "}
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
