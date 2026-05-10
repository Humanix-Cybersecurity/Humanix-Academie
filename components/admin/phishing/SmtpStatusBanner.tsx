// SPDX-License-Identifier: AGPL-3.0-or-later
// Bandeau dynamique du statut SMTP : 3 etats (non configure / non verifie / pret).
// L'etat "non configure" affiche un CTA fort vers /admin/smtp.

import Link from "next/link";

type Props = {
  configured: boolean;
  verified: boolean;
  host?: string;
  fromEmail?: string;
};

export default function SmtpStatusBanner({
  configured,
  verified,
  host,
  fromEmail,
}: Props) {
  if (!configured) {
    return (
      <article className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
        <h3 className="font-bold text-amber-900 dark:text-amber-100 text-sm flex items-center gap-2">
          <span aria-hidden="true">📭</span>
          SMTP non configuré — l&apos;envoi des phishing est bloqué
        </h3>
        <p className="text-xs text-amber-900/90 dark:text-amber-100/90 mt-2 leading-relaxed">
          Humanix-Cybersecurity ne partage pas son serveur SMTP pour les
          phishing simulés. Tu dois configurer{" "}
          <strong>ton propre SMTP</strong> pour envoyer depuis ton domaine
          (réputation IP, SPF, DKIM, DMARC à ta charge).
        </p>
        <p className="text-xs text-amber-900/90 dark:text-amber-100/90 mt-2 leading-relaxed">
          <strong>3 options</strong> : (1) self-host (Postfix, M365 dédié),
          (2) provider transactionnel (Brevo, Mailjet, Scaleway TEM client),
          ou (3){" "}
          <Link
            href="/demande-abonnement?type=opsec"
            className="underline font-bold"
          >
            prestation Humanix au forfait
          </Link>{" "}
          (mise en place + suivi réputation).
        </p>
        <p className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/admin/smtp"
            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
          >
            <span aria-hidden="true">⚙️</span>
            Configurer mon SMTP →
          </Link>
          <Link
            href="/opsec-phishing"
            className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 text-xs font-bold px-4 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 transition"
          >
            <span aria-hidden="true">📚</span>
            Lire le cadrage OPSEC (5 min)
          </Link>
        </p>
      </article>
    );
  }

  if (!verified) {
    return (
      <article className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/15 p-4">
        <h3 className="font-bold text-amber-900 dark:text-amber-100 text-sm flex items-center gap-2">
          <span aria-hidden="true">⚠️</span>
          SMTP configuré mais jamais vérifié (ou dernier test échoué)
        </h3>
        <p className="text-xs text-amber-900/90 dark:text-amber-100/90 mt-2 leading-relaxed">
          <strong>{host}</strong> — l&apos;envoi peut échouer. Va sur{" "}
          <Link href="/admin/smtp" className="underline font-bold">
            /admin/smtp
          </Link>{" "}
          et clique « Tester la connexion » pour valider avant de lancer une
          campagne.
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-900/15 p-4">
      <p className="text-xs text-emerald-900 dark:text-emerald-100 leading-relaxed flex items-center gap-2">
        <span aria-hidden="true">✅</span>
        <span>
          <strong>SMTP prêt</strong> — envois depuis{" "}
          <code className="font-mono bg-white/60 dark:bg-slate-900/40 px-1.5 py-0.5 rounded">
            {fromEmail}
          </code>{" "}
          via <code className="font-mono">{host}</code>.{" "}
          <Link href="/admin/smtp" className="underline">
            Modifier
          </Link>
        </span>
      </p>
    </article>
  );
}
