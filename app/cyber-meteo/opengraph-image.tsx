// SPDX-License-Identifier: AGPL-3.0-or-later
import { OG_SIZE, OG_CONTENT_TYPE, renderOgCard } from "@/lib/og-card";

export const alt = "Cyber-météo France — Le niveau d'alerte cyber national, en clair";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderOgCard({
    kicker: "CERT-FR · Temps réel · Souverain",
    title: "Le niveau d'alerte cyber, en clair.",
    subtitle: "Données officielles CERT-FR, agrégées toutes les heures. Sans alarmisme, sans télémétrie.",
    bullets: ["🟢 Calme", "🟡 Vigilance", "🔴 Critique"],
    glyph: "🌦️",
    accentColor: "#C0392B", // warn (cohérent avec niveau critique aujourd'hui)
  });
}
