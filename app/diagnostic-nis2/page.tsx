// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /diagnostic-nis2 - diagnostic public aligne sur le Referentiel Cyber
// France (ReCyF, ANSSI) : les 20 objectifs de securite, applicables de
// facon proportionnee selon le profil (entite importante / essentielle).
//
// Page publique, sans auth, stateless (rien stocke). A la soumission, le
// profil + les reponses sont encodes dans l'URL et la page resultat affiche
// le plan d'accompagnement objectif par objectif.

import type { Metadata } from "next";
import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";
import DiagnosticRecyfForm from "@/components/nis2/DiagnosticRecyfForm";
import { RECYF_META } from "@/lib/nis2/recyf";
import { submitDiagnosticRecyf } from "./actions";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title:
    "Diagnostic NIS2 / ReCyF gratuit - les 20 objectifs de sécurité | Humanix Académie",
  description:
    "Évaluez votre situation sur les 20 objectifs de sécurité du Référentiel Cyber France (ReCyF, ANSSI) pour NIS2. Score par objectif + plan d'action personnalisé. Gratuit, sans inscription.",
  alternates: { canonical: "/diagnostic-nis2" },
  openGraph: {
    title: "Diagnostic NIS2 / ReCyF - où en êtes-vous ?",
    description:
      "Les 20 objectifs de sécurité du Référentiel Cyber France, en clair. Score par objectif + plan d'action. En 10 minutes, sans inscription.",
    type: "website",
    locale: "fr_FR",
  },
};

export default function DiagnosticNis2Page() {
  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section className="max-w-4xl mx-auto px-4 pt-12 pb-10 sm:pt-16 text-center">
          <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
            Diagnostic gratuit · sans inscription
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-4">
            Où en êtes-vous sur les objectifs NIS2 ?
          </h1>
          <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed mb-6">
            Une question par objectif de sécurité du Référentiel Cyber France
            (ReCyF), le référentiel publié par l&apos;ANSSI. Vous obtenez votre
            situation et un plan d&apos;action concret, sans jargon.
          </p>
          <div className="flex flex-wrap gap-2 justify-center text-xs">
            <span className="px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 font-bold">
              <span aria-hidden="true">🇫🇷 </span>Aligné ReCyF (ANSSI)
            </span>
            <span className="px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 font-bold">
              <span aria-hidden="true">📋 </span>20 objectifs de sécurité
            </span>
            <span className="px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-bold">
              <span aria-hidden="true">🔓 </span>Rien stocké
            </span>
          </div>
        </section>
      </HexBackdrop>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <DiagnosticRecyfForm action={submitDiagnosticRecyf} />

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 italic mt-8 leading-relaxed">
          Basé sur le {RECYF_META.nom} ({RECYF_META.sigle}), version{" "}
          {RECYF_META.version}, {RECYF_META.statut.toLowerCase()} publié par
          l&apos;{RECYF_META.editeur}. Auto-évaluation indicative, qui ne
          remplace ni un audit ni un conseil juridique.{" "}
          <Link
            href="/nis2"
            className="text-accent-600 dark:text-accent-300 underline hover:no-underline"
          >
            Espace NIS2
          </Link>
        </p>
      </div>
    </main>
  );
}
