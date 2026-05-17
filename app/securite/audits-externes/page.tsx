// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /securite/audits-externes — Trust Center, page publique des audits
// sécurité externes (4 scanners reconnus). Aucune notation auto-déclarée :
// chaque audit a un lien vers le scanner officiel pour vérifier en live.
//
// Philosophie transparence radicale (cf. /comparatif, /securite/rapport-audit) :
// on ne dit pas "nous sommes excellents", on dit "voici comment vous pouvez
// vérifier vous-même". Aligné avec le positionnement souverain.

import type { Metadata } from "next";
import Link from "next/link";

const PROD_HOST = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-cybersecurity.fr"
)
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Audits sécurité externes | Trust Center Humanix",
  description:
    "Vérifiez en temps réel notre posture sécurité : Mozilla Observatory, Security Headers, SSL Labs, audit interne OWASP/ANSSI. Aucune note auto-déclarée, tous les rapports sont publics.",
  alternates: { canonical: "/securite/audits-externes" },
};

type ExternalAudit = {
  scanner: string;
  emoji: string;
  description: string;
  target: string;
  /** URL du scanner officiel avec notre domaine pré-rempli */
  liveUrl: string;
  /** Ce que le scanner mesure (1 phrase) */
  measures: string;
};

const AUDITS: ExternalAudit[] = [
  {
    scanner: "Mozilla Observatory",
    emoji: "🦊",
    description:
      "Le scanner sécurité web de référence de la fondation Mozilla. Note la qualité des en-têtes HTTP, la rigueur de la CSP, l'HTTPS, et l'isolation des ressources.",
    target: "A+",
    measures:
      "CSP, HSTS, X-Frame-Options, Referrer-Policy, SRI, cookies, redirections, CORS",
    liveUrl: `https://observatory.mozilla.org/analyze/${PROD_HOST}`,
  },
  {
    scanner: "Security Headers",
    emoji: "🛡️",
    description:
      "Service de Scott Helme (consultant sécurité reconnu, Pluralsight). Évalue chaque en-tête HTTP de sécurité et fournit un rapport public archivable.",
    target: "A+",
    measures:
      "Strict-Transport-Security, Content-Security-Policy, X-Frame-Options, Referrer-Policy, Permissions-Policy",
    liveUrl: `https://securityheaders.com/?q=https%3A%2F%2F${PROD_HOST}&followRedirects=on`,
  },
  {
    scanner: "Qualys SSL Labs",
    emoji: "🔒",
    description:
      "Référence absolue pour l'évaluation TLS depuis 2009. Note la configuration SSL/TLS du serveur, les suites chiffrement, les certificats, l'OCSP stapling.",
    target: "A+",
    measures:
      "Cipher suites, key exchange, certificate chain, OCSP, TLS 1.3, forward secrecy, attaques BEAST/POODLE/Heartbleed",
    liveUrl: `https://www.ssllabs.com/ssltest/analyze.html?d=${PROD_HOST}&hideResults=on`,
  },
  {
    scanner: "Rapport d'audit interne",
    emoji: "📋",
    description:
      "Notre auto-audit publié, méthodologie OWASP ASVS + ANSSI Hygiène. 12 sections, contrôles vérifiés, gaps assumés avec plan de remédiation à 6 mois.",
    target: "v1.0 publié",
    measures:
      "Auth, autorisation, isolation tenant, RGPD, supply chain, dépendances, secrets, journalisation, accessibilité, sauvegardes",
    liveUrl: "/securite/rapport-audit",
  },
];

export default function AuditsExternesPage() {
  return (
    <main
      id="main-content"
      className="max-w-5xl mx-auto px-4 py-10 sm:py-14 animate-fadeIn"
    >
      <Link
        href="/securite"
        className="text-sm text-accent-500 hover:text-accent-600 underline-offset-4 hover:underline mb-3 inline-block"
      >
        ← Trust Center
      </Link>

      <header className="mb-10">
        <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
          Transparence radicale
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-4">
          Audits sécurité externes
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-200 max-w-3xl leading-relaxed">
          Pour ne pas être juge et partie, nous nous soumettons à 4 audits
          publics réalisés par des outils tiers reconnus. Aucune note
          auto-déclarée :{" "}
          <strong>
            tous les rapports sont accessibles en un clic, vérifiables par
            n&apos;importe qui, à n&apos;importe quel moment
          </strong>
          .
        </p>
        <div className="mt-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-900/40 p-4">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            <strong>Notre engagement</strong> — si l&apos;un de ces scores
            descend en-dessous de la cible affichée, vous le verrez avant nous.
            Les liens ci-dessous interrogent les scanners en temps réel : pas
            de capture d&apos;écran datée, pas de communiqué arrangé.
          </p>
        </div>
      </header>

      <section
        aria-label="Liste des audits externes publics"
        className="grid sm:grid-cols-2 gap-5 mb-12"
      >
        {AUDITS.map((a) => (
          <article
            key={a.scanner}
            className="rounded-3xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 flex flex-col"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-3xl shrink-0" aria-hidden="true">
                  {a.emoji}
                </span>
                <h2 className="font-display text-lg sm:text-xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight">
                  {a.scanner}
                </h2>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-xs font-bold tabular-nums whitespace-nowrap">
                Cible : {a.target}
              </span>
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-4">
              {a.description}
            </p>

            <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-4 flex-1">
              <strong className="text-gray-700 dark:text-gray-300 not-italic">
                Ce que c&apos;est mesuré :{" "}
              </strong>
              {a.measures}
            </p>

            <a
              href={a.liveUrl}
              target={a.liveUrl.startsWith("/") ? undefined : "_blank"}
              rel={
                a.liveUrl.startsWith("/")
                  ? undefined
                  : "noopener noreferrer"
              }
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors"
            >
              {a.liveUrl.startsWith("/")
                ? "Voir le rapport →"
                : "Vérifier en live →"}
            </a>
          </article>
        ))}
      </section>

      <section className="rounded-3xl bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-primary-950/30 dark:via-slate-900 dark:to-accent-950/30 border-2 border-primary-200 dark:border-primary-900/40 p-6 sm:p-8">
        <h2 className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-3">
          Pourquoi cette page existe
        </h2>
        <p className="text-gray-700 dark:text-gray-200 leading-relaxed mb-3">
          On vend de la cybersécurité. Si notre propre site web ne tenait pas
          la route, ce serait incohérent.
        </p>
        <p className="text-gray-700 dark:text-gray-200 leading-relaxed mb-3">
          Mais surtout, on est convaincus qu&apos;une démarche cyber crédible
          repose sur trois piliers : <strong>du code lisible</strong>{" "}
          <span className="text-gray-500 dark:text-gray-400">
            (notre repo est public sous AGPLv3)
          </span>
          , <strong>des audits indépendants</strong>{" "}
          <span className="text-gray-500 dark:text-gray-400">
            (cette page)
          </span>
          , et <strong>la possibilité de tout reproduire chez soi</strong>{" "}
          <span className="text-gray-500 dark:text-gray-400">
            (self-host AGPLv3)
          </span>
          .
        </p>
        <p className="text-gray-700 dark:text-gray-200 leading-relaxed">
          Si vous trouvez une faille — réelle ou potentielle — voici comment
          nous joindre :{" "}
          <a
            href="mailto:security@humanix-cybersecurity.fr"
            className="text-accent-600 dark:text-accent-300 font-semibold hover:underline"
          >
            security@humanix-cybersecurity.fr
          </a>{" "}
          (PGP key dispo, programme de divulgation responsable détaillé dans
          notre{" "}
          <a
            href="/.well-known/security.txt"
            className="text-accent-600 dark:text-accent-300 font-semibold hover:underline"
          >
            security.txt
          </a>
          ).
        </p>
      </section>
    </main>
  );
}
