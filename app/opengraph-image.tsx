// SPDX-License-Identifier: AGPL-3.0-or-later
import { OG_SIZE, OG_CONTENT_TYPE, renderOgCard } from "@/lib/og-card";

export const alt = "Humanix Académie — La cybersécurité de votre PME, en 5 minutes par semaine";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgCard({
    kicker: "Cybersécurité PME · Souveraine",
    title: "La cybersécurité de votre PME, en 5 minutes par semaine.",
    subtitle: "Pas un cours d'expert. Une habitude tranquille.",
    bullets: ["🇫🇷 Made in France", "🛡️ RGPD-compliant", "🌱 AGPLv3 libre"],
    glyph: "🛡️",
  });
}
