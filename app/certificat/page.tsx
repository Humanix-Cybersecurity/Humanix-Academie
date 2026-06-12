// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /certificat - landing produit "Le certificat qui vaut quelque chose".
//
// POSITIONNEMENT STRATEGIQUE 2026-05-23 (decision Florian, sprint reconnaissance) :
//
//   "Si l'État a mis du temps à imposer Pix, on peut aller plus vite en
//    créant une valeur économique directe pour les entreprises."
//
// Trois leviers d'adoption :
//   1. ASSURANCE CYBER : convaincre AXA, Allianz, mutuelles regionales d'accorder
//      un rabais sur les primes Cyber des PME qui ont X% de salaries certifies.
//   2. NIS2 : packager le certificat comme preuve de conformite (obligation
//      legale dirigeants ETI secteurs critiques depuis octobre 2024).
//   3. ANSSI : demarche officielle d'agrement pour devenir reconnu comme
//      "Pix de la cyber" cote sensibilisation.
//
// Cette page est le hub de ces 3 angles : RSSI, dirigeant, courtier ou
// assureur qui atterrit ici doit comprendre en 30 secondes pourquoi ce
// certificat vaut quelque chose.

import type { Metadata } from "next";
import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";

const TITLE =
  "Le certificat cyber qui vaut quelque chose - Humanix Académie";
const DESC =
  "Certificat de sensibilisation cyber signé Ed25519, exportable OSCAL, conçu comme bouclier assurance cyber + preuve de conformité NIS2. Démarche d'agrément ANSSI en cours.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: "/certificat" },
  openGraph: {
    title: TITLE,
    description: DESC,
    type: "website",
    url: "/certificat",
    images: [
      { url: "/logo-humanix-academie-512.png", width: 512, height: 512 },
    ],
  },
};

export default function CertificatPage() {
  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      {/* ====================================================================
          1. HERO - positionnement direct
          ==================================================================== */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section
          aria-labelledby="hero-title"
          className="max-w-4xl mx-auto px-4 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center"
        >
          <p className="inline-flex items-center gap-2 text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-accent-500/30 px-4 py-2 rounded-full mb-8 shadow-sm">
            <span aria-hidden="true">🛡️</span> Le Pix de la cybersécurité - en
            construction
          </p>

          <h1
            id="hero-title"
            className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-6 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            Le certificat cyber
            <br />
            <span className="bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500 bg-clip-text text-transparent animate-gradient">
              qui vaut quelque chose.
            </span>
          </h1>

          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "220ms" }}
          >
            Pas un PDF décoratif. Un certificat signé{" "}
            <strong>Ed25519 inviolable</strong>, exportable au format{" "}
            <strong>OSCAL</strong>, conçu comme bouclier d'assurance cyber et
            preuve de conformité NIS2 pour les PME et ETI françaises.
          </p>

          <div
            className="mt-10 flex flex-wrap justify-center gap-3 text-sm animate-slide-up"
            style={{ animationDelay: "340ms" }}
          >
            <a
              href="#assurance"
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-5 py-3 rounded-2xl font-bold shadow-md hover:scale-105 transition-transform"
            >
              🛡️ Bouclier assurance cyber
            </a>
            <a
              href="#nis2"
              className="inline-flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 border-2 border-accent-500/40 text-accent-700 dark:text-accent-300 px-5 py-3 rounded-2xl font-bold shadow-sm hover:scale-105 transition-transform"
            >
              📋 Preuve conformité NIS2
            </a>
            <a
              href="#anssi"
              className="inline-flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 border-2 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 px-5 py-3 rounded-2xl font-bold shadow-sm hover:scale-105 transition-transform"
            >
              🇫🇷 Démarche ANSSI
            </a>
          </div>
        </section>
      </HexBackdrop>

      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16 space-y-20">
        {/* ==================================================================
            2. VOLET 1 - ASSURANCE CYBER
            ================================================================== */}
        <section
          id="assurance"
          aria-labelledby="assurance-title"
          className="scroll-mt-24"
        >
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-emerald-600 mb-3">
            🛡️ Levier #1 · Assurance cyber
          </p>
          <h2
            id="assurance-title"
            className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 mb-6"
          >
            Quand ton effectif est formé,
            <br />
            ta prime cyber baisse.
          </h2>

          <p className="text-lg text-gray-700 dark:text-gray-200 mb-6 leading-relaxed">
            Les compagnies d'assurance refusent désormais de couvrir les PME
            sans preuve de sensibilisation cyber, ou augmentent massivement les
            franchises (parfois × 3 en 2 ans). Le facteur humain est leur
            premier critère de souscription.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-5">
              <p className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-300">
                85 %
              </p>
              <p className="text-sm text-emerald-900 dark:text-emerald-200 mt-1">
                des assureurs cyber français exigent une preuve de
                sensibilisation pour souscrire en 2026 (source : Hiscox France,
                rapport sectoriel 2026).
              </p>
            </div>
            <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-5">
              <p className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-300">
                −15 à −40 %
              </p>
              <p className="text-sm text-emerald-900 dark:text-emerald-200 mt-1">
                de réduction sur la prime cyber pour les PME dont 80 % de
                l'effectif est certifié sensibilisation (négociations en cours
                avec courtiers partenaires).
              </p>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-emerald-950/20 p-6 sm:p-8">
            <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-200 mb-3">
              Le format Certificat Humanix pour les assureurs
            </h3>
            <ul className="space-y-3 text-sm text-emerald-900/90 dark:text-emerald-200/90">
              <li className="flex items-start gap-3">
                <span aria-hidden="true" className="text-emerald-600 mt-0.5">
                  ✓
                </span>
                <span>
                  <strong>Vérification cryptographique en 1 seconde</strong> :
                  signature Ed25519 sur clé publique vérifiable. Un assureur
                  scanne, valide la signature, conclut. Pas de PDF photoshoppé
                  qui passe.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span aria-hidden="true" className="text-emerald-600 mt-0.5">
                  ✓
                </span>
                <span>
                  <strong>Rapport par tenant</strong> : pourcentage de
                  l'effectif certifié, dates de complétion, scores moyens. Tout
                  ce dont un souscripteur a besoin pour ajuster la prime.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span aria-hidden="true" className="text-emerald-600 mt-0.5">
                  ✓
                </span>
                <span>
                  <strong>Renouvellement traçable</strong> : un certificat
                  expire 12 mois après émission. La prime peut donc être révisée
                  annuellement sur la base d'un effectif maintenu formé.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span aria-hidden="true" className="text-emerald-600 mt-0.5">
                  ✓
                </span>
                <span>
                  <strong>API B2B dédiée</strong> : webhook signé HMAC-SHA256
                  qui pousse en temps réel l'état des certifications vers le
                  système du courtier ou de l'assureur.
                </span>
              </li>
            </ul>
            <p className="text-sm italic text-emerald-800 dark:text-emerald-300 mt-5">
              Vous êtes courtier ou souscripteur cyber ? On vous propose un
              entretien de 30 min pour vous montrer la chaîne complète et
              discuter du barème de réduction.{" "}
              <a
                href="mailto:contact@humanix-cybersecurity.fr?subject=Partenariat%20assurance%20cyber"
                className="underline font-bold"
              >
                contact@humanix-cybersecurity.fr
              </a>
            </p>
          </div>
        </section>

        {/* ==================================================================
            3. VOLET 2 - CONFORMITE NIS2
            ================================================================== */}
        <section
          id="nis2"
          aria-labelledby="nis2-title"
          className="scroll-mt-24"
        >
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-primary-600 mb-3">
            📋 Levier #2 · Conformité NIS2
          </p>
          <h2
            id="nis2-title"
            className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 mb-6"
          >
            Ta preuve de conformité,
            <br />
            opposable en audit.
          </h2>

          <p className="text-lg text-gray-700 dark:text-gray-200 mb-6 leading-relaxed">
            Depuis octobre 2024, la directive NIS2 impose aux dirigeants
            d'entités essentielles et importantes (ETI, certaines PME de
            secteurs critiques) <strong>une obligation légale</strong> de se
            former à la cybersécurité et de veiller à la sensibilisation de leur
            personnel. Sanctions en cas d'audit défaillant : jusqu'à{" "}
            <strong>10 millions d'euros ou 2 % du CA mondial</strong>.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl border-2 border-primary-200 dark:border-primary-900/50 bg-primary-50/50 dark:bg-primary-950/20 p-5">
              <p className="text-xs uppercase font-bold text-primary-600 dark:text-primary-300 mb-2">
                Pour le dirigeant
              </p>
              <p className="text-sm text-primary-900 dark:text-primary-200">
                Certificat personnel sur 3 modules de gouvernance cyber
                (responsabilité juridique, déclaration d'incident,
                continuité d'activité).
              </p>
            </div>
            <div className="rounded-2xl border-2 border-primary-200 dark:border-primary-900/50 bg-primary-50/50 dark:bg-primary-950/20 p-5">
              <p className="text-xs uppercase font-bold text-primary-600 dark:text-primary-300 mb-2">
                Pour l'effectif
              </p>
              <p className="text-sm text-primary-900 dark:text-primary-200">
                Sensibilisation modulée par rôle (RH, compta, dev, support,
                direction). 5 à 12 minutes par semaine, taux de complétion
                tracké.
              </p>
            </div>
            <div className="rounded-2xl border-2 border-primary-200 dark:border-primary-900/50 bg-primary-50/50 dark:bg-primary-950/20 p-5">
              <p className="text-xs uppercase font-bold text-primary-600 dark:text-primary-300 mb-2">
                Pour l'auditeur
              </p>
              <p className="text-sm text-primary-900 dark:text-primary-200">
                Export <strong>OSCAL v1.1.2</strong> (NIST) intégrable
                directement dans CISO Assistant. Mapping technique
                préétabli vers les contrôles NIS2.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-primary-300 dark:border-primary-900/60 bg-gradient-to-br from-primary-50 via-white to-primary-50/50 dark:from-primary-950/30 dark:via-slate-900 dark:to-primary-950/20 p-6 sm:p-8">
            <h3 className="text-xl font-bold text-primary-900 dark:text-primary-200 mb-3">
              Comment le certificat tient en audit NIS2
            </h3>
            <ol className="space-y-3 text-sm text-primary-900/90 dark:text-primary-200/90 list-decimal pl-5">
              <li>
                <strong>Audit trail intégral</strong> - chaque action de
                formation, chaque scénario joué, chaque quiz validé est
                journalisé en table AuditLog avec horodatage signé.
              </li>
              <li>
                <strong>Mapping ANSSI HG → NIS2</strong> - chacun des 200+
                modules est cartographié sur les 42 mesures du Guide Hygiène
                ANSSI et les contrôles NIS2 (cf.{" "}
                <code className="bg-primary-100 dark:bg-primary-900/40 px-1.5 py-0.5 rounded text-xs">
                  lib/mapping-grc.ts
                </code>{" "}
                - code source public AGPLv3).
              </li>
              <li>
                <strong>Rapport conformité PDF</strong> signé Ed25519 + export
                OSCAL machine-readable, à présenter directement à l'ANSSI lors
                d'un contrôle ou à l'assureur en cas de sinistre.
              </li>
              <li>
                <strong>Diagnostic interactif gratuit</strong> :{" "}
                <Link
                  href="/diagnostic-nis2"
                  className="underline font-bold text-primary-700 dark:text-primary-300"
                >
                  /diagnostic-nis2
                </Link>{" "}
                te dit en 5 minutes si tu es dans le périmètre NIS2 et quels
                modules Humanix te mettent à jour.
              </li>
            </ol>
          </div>
        </section>

        {/* ==================================================================
            4. VOLET 3 - DEMARCHE ANSSI
            ================================================================== */}
        <section
          id="anssi"
          aria-labelledby="anssi-title"
          className="scroll-mt-24"
        >
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-rose-600 mb-3">
            🇫🇷 Levier #3 · Reconnaissance ANSSI
          </p>
          <h2
            id="anssi-title"
            className="font-display text-3xl sm:text-4xl font-extrabold text-primary-500 dark:text-accent-300 mb-6"
          >
            Le Pix de la cyber,
            <br />
            en chantier.
          </h2>

          <p className="text-lg text-gray-700 dark:text-gray-200 mb-6 leading-relaxed">
            Pix a mis dix ans à devenir la référence numérique reconnue par
            l'État pour les compétences digitales (collèges, lycées,
            entreprises). Humanix Académie s'inscrit dans la même logique pour
            la <strong>cybersécurité du facteur humain</strong>, avec une
            démarche d'agrément formelle auprès de l'ANSSI lancée en 2026.
          </p>

          <div className="rounded-2xl border-2 border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-6 sm:p-8 mb-6">
            <h3 className="text-xl font-bold text-rose-900 dark:text-rose-200 mb-4">
              Pourquoi l'ANSSI prendra Humanix au sérieux
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm text-rose-900/90 dark:text-rose-200/90">
              <div>
                <p className="font-bold mb-2">🇫🇷 Souveraineté technique</p>
                <p>
                  Hébergement Scaleway Paris, IA Mistral, paiement Mollie UE,
                  email Scaleway TEM. Zéro dépendance Cloud Act US. Audit
                  Triple A+ (Mozilla Observatory 110/100, Security Headers 6/6,
                  SSL Labs PQC ready).
                </p>
              </div>
              <div>
                <p className="font-bold mb-2">📜 Code source AGPLv3</p>
                <p>
                  Tout le code est public, auditable. Mapping technique des
                  contrôles RGPD/NIS2/ANSSI HG/ISO 27001/NIST CSF dans{" "}
                  <code className="text-xs bg-rose-100 dark:bg-rose-900/40 px-1 rounded">
                    lib/mapping-grc.ts
                  </code>
                  . L'ANSSI peut vérifier chaque ligne.
                </p>
              </div>
              <div>
                <p className="font-bold mb-2">🧠 Format pédagogique éprouvé</p>
                <p>
                  200+ modules MDX experts, format 5-10 minutes par semaine,
                  scénarii français terrain, debriefs avec sources ANSSI/CNIL,
                  quiz contre-intuitifs. Pas du e-learning vidéo générique.
                </p>
              </div>
              <div>
                <p className="font-bold mb-2">🔐 Sécurité défense en profondeur</p>
                <p>
                  Certificats Ed25519, signatures PDF, anti-PII régex strict
                  sur prompts IA, CSP nonce-based, HSTS preload, MFA TOTP +
                  FIDO2. Conforme RGS B ANSSI.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 sm:p-6">
            <p className="text-xs uppercase font-bold text-accent-500 mb-2">
              État de la démarche
            </p>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span aria-hidden="true" className="text-emerald-500">
                  ✓
                </span>
                <span>
                  <strong>Dossier technique préparé</strong> : architecture,
                  sécurité, mapping de conformité, gouvernance OSS - documenté
                  publiquement.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden="true" className="text-amber-500">
                  ⏳
                </span>
                <span>
                  <strong>Échanges initiés avec l'ANSSI</strong> - réponse
                  attendue 2026 Q3.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden="true" className="text-gray-400">
                  ○
                </span>
                <span>
                  <strong>Reconnaissance officielle</strong> visée 2027 - sera
                  affichée sur cette page dès obtention.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* ==================================================================
            5. APPEL FINAL - CTA dirigeants + courtiers
            ================================================================== */}
        <section
          aria-labelledby="cta-title"
          className="rounded-3xl border-2 border-accent-300 dark:border-accent-700 bg-gradient-to-br from-accent-50 via-white to-accent-50/50 dark:from-accent-950/30 dark:via-slate-900 dark:to-accent-950/20 p-6 sm:p-10 text-center"
        >
          <h2
            id="cta-title"
            className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-4"
          >
            Discutons certificat,
            <br />
            assurance ou conformité.
          </h2>
          <p className="text-base text-gray-700 dark:text-gray-200 max-w-2xl mx-auto mb-8 leading-relaxed">
            Dirigeant qui veut sécuriser son audit NIS2 ? Courtier ou
            souscripteur cyber qui négocie son barème ? RSSI qui veut piloter
            le facteur humain ? On vous propose un entretien de 30 minutes
            pour vous montrer la chaîne complète.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <a
              href="mailto:contact@humanix-cybersecurity.fr?subject=Demande%20entretien%20Certificat%20Humanix"
              className="inline-flex items-center justify-center rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-bold px-6 py-3 transition-colors shadow-md"
            >
              ✉ Demander un entretien
            </a>
            <Link
              href="/diagnostic-nis2"
              className="inline-flex items-center justify-center rounded-2xl border-2 border-primary-500 dark:border-accent-300 text-primary-500 dark:text-accent-300 font-bold px-6 py-3 hover:bg-primary-50 dark:hover:bg-slate-800 transition-colors"
            >
              🧭 Diagnostic NIS2 gratuit
            </Link>
            <Link
              href="/tarifs"
              className="inline-flex items-center justify-center rounded-2xl text-primary-500 dark:text-accent-300 font-bold px-6 py-3 hover:underline"
            >
              💶 Voir les tarifs
            </Link>
          </div>
        </section>

        {/* ==================================================================
            6. FOOTER - citation
            ================================================================== */}
        <div className="text-center pt-4">
          <blockquote className="font-display italic text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            « Un certificat qui ne vaut rien, c'est un PDF. Un certificat qui
            baisse ta prime ou tient en audit, c'est un actif. On a choisi le
            deuxième. »
          </blockquote>
          <p
            aria-hidden="true"
            className="mt-3 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
          >
            - Florian Durano, fondateur Humanix Cybersecurity
          </p>
        </div>
      </div>
    </main>
  );
}
