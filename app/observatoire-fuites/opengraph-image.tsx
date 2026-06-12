// SPDX-License-Identifier: AGPL-3.0-or-later
import { OG_SIZE, OG_CONTENT_TYPE, renderOgCard } from "@/lib/og-card";

// Cf. app/opengraph-image.tsx pour la justification.
export const dynamic = "force-dynamic";

export const alt = "Observatoire des fuites de données françaises - Humanix Académie";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgCard({
    kicker: "Observatoire indépendant · Mise à jour quotidienne",
    title: "Les fuites de données françaises, en un seul endroit.",
    subtitle: "Sources francophones de référence. Sans dramatiser, sans publicité, sans tracker.",
    bullets: ["🔍 3 sources FR", "🚫 Zéro tracker", "🔓 Open data"],
    glyph: "🔍",
    accentColor: "#0B3D91",
  });
}
