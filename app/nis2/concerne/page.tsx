// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /nis2/concerne - mini-eligibilite NIS2 en 3 questions.
// Aide un dirigeant a savoir, en clair, s'il est probablement concerne et a
// quel titre. Calcul cote client, rien stocke (cf. EligibiliteWizard).

import type { Metadata } from "next";
import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";
import EligibiliteWizard from "@/components/nis2/EligibiliteWizard";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Suis-je concerné par NIS2 ? - test en 3 questions | Humanix Académie",
  description:
    "Découvrez en 3 questions si votre organisation est probablement concernée par NIS2 (entité essentielle, importante, ou concernée indirectement). Gratuit, indicatif, rien stocké.",
  alternates: { canonical: "/nis2/concerne" },
  openGraph: {
    title: "Suis-je concerné par NIS2 ?",
    description:
      "3 questions pour savoir si NIS2 vous concerne et à quel titre. Sans inscription.",
    type: "website",
    locale: "fr_FR",
  },
};

export default function Nis2ConcernePage() {
  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section className="max-w-3xl mx-auto px-4 pt-12 pb-8 sm:pt-16 text-center">
          <Link
            href="/nis2"
            className="text-sm text-accent-500 hover:text-accent-600 underline-offset-4 hover:underline mb-3 inline-block"
          >
            ← Espace NIS2
          </Link>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight mb-4">
            Suis-je concerné par NIS2 ?
          </h1>
          <p className="text-base sm:text-lg text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed">
            Trois questions suffisent pour une première réponse claire. Pas de
            panique : être concerné ne veut pas dire être en faute, juste avoir
            un cap à suivre.
          </p>
        </section>
      </HexBackdrop>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <EligibiliteWizard />
      </div>
    </main>
  );
}
