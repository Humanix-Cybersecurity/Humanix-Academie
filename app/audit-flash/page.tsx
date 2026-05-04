// SPDX-License-Identifier: AGPL-3.0-or-later
// Landing publique de l'audit flash cyber.
// SEO-friendly (server component) + wizard interactif (client).
// Page accessible sans authentification : c'est notre machine a leads.

import type { Metadata } from "next";
import AuditWizard from "./AuditWizard";

export const metadata: Metadata = {
  title: "Audit Cyber Flash gratuit en 5 minutes | HumaniX Académie",
  description:
    "Évaluez la maturité cybersécurité de votre PME en 5 minutes. 15 questions, 1 rapport PDF brandé avec votre score, vos 3 risques prioritaires et des recommandations concrètes. 100 % gratuit, sans engagement.",
  alternates: { canonical: "/audit-flash" },
  openGraph: {
    title: "Audit Cyber Flash gratuit pour PME — HumaniX",
    description:
      "Score, top 3 risques, plan d'action et conformité NIS2 — en 5 minutes. Made in France.",
    type: "website",
  },
};

export default function AuditFlashPage() {
  return (
    <div className="bg-gradient-to-b from-primary-500/5 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
      {/* Hero */}
      <section
        className="max-w-5xl mx-auto px-4 pt-12 pb-8 text-center"
        aria-labelledby="hero-title"
      >
        <p className="inline-block text-xs font-bold uppercase tracking-wider text-accent-500 bg-accent-50 dark:bg-accent-900/20 px-3 py-1 rounded-full mb-4">
          🆓 100 % gratuit · Aucune carte bancaire requise
        </p>
        <h1
          id="hero-title"
          className="text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 mb-4"
        >
          Votre cybersécurité en{" "}
          <span className="text-accent-500">5 minutes chrono</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto mb-6">
          Répondez à 15 questions simples. Recevez un rapport PDF avec votre
          score, vos 3 risques prioritaires et un plan d'action concret pour
          votre PME.
        </p>

        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-2">
          <span className="flex items-center gap-1">⏱ 5 minutes</span>
          <span className="flex items-center gap-1">
            📄 Rapport PDF immédiat
          </span>
          <span className="flex items-center gap-1">🇫🇷 100 % français</span>
          <span className="flex items-center gap-1">🛡 RGPD-compliant</span>
        </div>
      </section>

      {/* Wizard */}
      <section
        className="max-w-5xl mx-auto px-4 pb-16"
        aria-label="Quiz audit cyber"
      >
        <AuditWizard />
      </section>

      {/* Reassurance / what you get */}
      <section
        className="max-w-5xl mx-auto px-4 pb-16"
        aria-labelledby="value-title"
      >
        <h2
          id="value-title"
          className="text-2xl font-bold text-primary-500 dark:text-accent-300 text-center mb-8"
        >
          Ce que vous allez recevoir
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <ValueCard
            icon="🎯"
            title="Un score sur 100"
            text="Note globale de votre maturité cyber, calculée sur 5 domaines clés (identités, données, humain, infra, conformité)."
          />
          <ValueCard
            icon="⚠"
            title="Vos 3 risques prioritaires"
            text="Les failles à corriger en premier, classées par criticité, avec une recommandation actionnable pour chacune."
          />
          <ValueCard
            icon="📋"
            title="Un plan d'action chiffré"
            text="Une recommandation HumaniX adaptée à votre taille et budget, avec des étapes concrètes pour les 30 prochains jours."
          />
        </div>
      </section>

      {/* Pourquoi nous faire confiance */}
      <section
        className="max-w-5xl mx-auto px-4 pb-16"
        aria-labelledby="trust-title"
      >
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 sm:p-10">
          <h2
            id="trust-title"
            className="text-2xl font-bold text-primary-500 dark:text-accent-300 mb-4"
          >
            Pourquoi cet audit est différent
          </h2>
          <ul className="space-y-3 text-gray-700 dark:text-gray-200">
            <TrustItem>
              <strong>Conçu pour les PME françaises.</strong> Pas un
              copier-coller d'un questionnaire ISO 27001 inadapté à votre
              réalité. Chaque question vise un risque concret pour votre TPE /
              PME.
            </TrustItem>
            <TrustItem>
              <strong>Aligné sur la réalité 2026.</strong> Inclut la conformité
              NIS2, les obligations RGPD et les attaques courantes des PME
              (rançongiciel, fraude au président, phishing ciblé).
            </TrustItem>
            <TrustItem>
              <strong>Aucun commercial ne vous appellera.</strong> Vous recevez
              le rapport, vous décidez. Si vous voulez parler à un humain, c'est
              vous qui nous écrivez.
            </TrustItem>
            <TrustItem>
              <strong>Vos données sont en sécurité.</strong> Hébergées en
              France, jamais revendues, supprimables sur demande à{" "}
              <a
                href="mailto:rgpd@humanix-cybersecurity.fr"
                className="text-accent-500 hover:underline"
              >
                rgpd@humanix-cybersecurity.fr
              </a>
              .
            </TrustItem>
          </ul>
        </div>
      </section>

      {/* Méthodologie */}
      <section
        className="max-w-5xl mx-auto px-4 pb-20"
        aria-labelledby="method-title"
      >
        <details className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-6">
          <summary className="cursor-pointer font-bold text-primary-500 dark:text-accent-300">
            Méthodologie : comment le score est calculé ?
          </summary>
          <div className="mt-4 text-sm text-gray-700 dark:text-gray-200 space-y-3">
            <p>
              Les 15 questions couvrent 5 domaines : <strong>identités</strong>{" "}
              (MFA, mots de passe), <strong>protection des données</strong>{" "}
              (sauvegardes, RGPD), <strong>facteur humain</strong> (formation,
              phishing), <strong>infrastructure</strong> (mises à jour,
              antivirus) et <strong>conformité</strong> (NIS2, plan de réponse,
              assurance cyber).
            </p>
            <p>
              Chaque question est pondérée selon sa criticité (1 à 3 points).
              Une réponse "OUI" rapporte les points, "NON" et "Je ne sais pas"
              ne rapportent rien — en cybersécurité, ne pas savoir équivaut à ne
              pas faire.
            </p>
            <p>
              Le score final est un pourcentage entre 0 et 100. Verdict
              automatique : <strong>Excellent</strong> (≥ 80),{" "}
              <strong>Solide</strong> (60-79), <strong>Fragile</strong> (40-59),{" "}
              <strong>À risque</strong> (&lt; 40).
            </p>
            <p className="italic text-xs text-gray-500 dark:text-gray-400">
              Cet audit est un diagnostic indicatif. Pour une évaluation
              certifiée, consultez un prestataire qualifié PASSI (référentiel
              ANSSI).
            </p>
          </div>
        </details>
      </section>
    </div>
  );
}

function ValueCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
      <div className="text-3xl mb-3" aria-hidden="true">
        {icon}
      </div>
      <h3 className="font-bold text-primary-500 dark:text-accent-300 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">{text}</p>
    </div>
  );
}

function TrustItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="text-accent-500 font-bold text-lg leading-tight mt-0.5"
        aria-hidden="true"
      >
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}
