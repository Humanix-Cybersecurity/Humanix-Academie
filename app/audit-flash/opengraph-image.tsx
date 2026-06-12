// SPDX-License-Identifier: AGPL-3.0-or-later
import { OG_SIZE, OG_CONTENT_TYPE, renderOgCard } from "@/lib/og-card";

// Cf. app/opengraph-image.tsx pour la justification.
export const dynamic = "force-dynamic";

export const alt = "Audit Cyber Flash gratuit en 5 minutes - Humanix Académie";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgCard({
    kicker: "Diagnostic offert · 5 minutes",
    title: "Faisons le point. Tranquillement.",
    subtitle: "Une photo bienveillante de votre maturité cyber, avec un PDF brandé reçu par mail.",
    bullets: ["📄 PDF immédiat", "🇫🇷 100 % français", "🤝 Aucune relance auto"],
    glyph: "🌿",
    accentColor: "#2E8B57", // success green
  });
}
