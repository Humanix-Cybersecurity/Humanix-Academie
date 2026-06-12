// SPDX-License-Identifier: AGPL-3.0-or-later
// =============================================================================
// Landing publique - refonte cosy mai 2026 + Sprint 3b (juin 2026).
//
// Refonte juin 2026 (Sprint 3b simplicite) : la home passe de 591 lignes
// (8 sections) a ~70 lignes (5 sections). Les sections "Features 6 cartes"
// et "Newsletter Anecdote" sont retirees - elles vivent maintenant
// respectivement dans /tarifs+/demo et /ressources qui les valorisent
// mieux.
//
// 5 sections finales :
//   1. Hero (cyber-meteo + logo + h1 + CTAs + audit-flash bonus)
//   2. Comment ca se passe (voyage en 3 etapes)
//   3. Preuve sociale (chiffres + bandeau confiance)
//   4. Pricing teaser
//   5. Citation finale "Hex veille"
//
// Brief original conserve : "experience, terrain, sensibilisation reelle,
// pas celle generee par la peur - celle qui sent bon la maitrise et la
// confiance".
// =============================================================================

import type { Metadata } from "next";
import { getCyberMeteo } from "@/lib/cyber-meteo";
import HeroSection from "@/components/home/HeroSection";
import HowItWorksSection from "@/components/home/HowItWorksSection";
import ProofSection from "@/components/home/ProofSection";
import PricingTeaser from "@/components/home/PricingTeaser";
import FinalQuote from "@/components/home/FinalQuote";

export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    title:
      "Humanix Académie - La cyber pour tous, à partir de 5 minutes par semaine",
    description:
      "Pas un cours d'expert. Une habitude tranquille. Plateforme française open source de cybersensibilisation pour particuliers, équipes et organisations de toute taille.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Humanix Académie - La cyber pour tous",
    description:
      "À partir de 5 minutes par semaine. RGPD-compliant. Open source AGPLv3.",
  },
};

export default async function HomePage() {
  const meteo = await getCyberMeteo();

  return (
    <main id="main-content" className="overflow-x-hidden">
      <HeroSection meteo={meteo} />
      <ProofSection />
      <HowItWorksSection />
      <PricingTeaser />
      <FinalQuote />
    </main>
  );
}
