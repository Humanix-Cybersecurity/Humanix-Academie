// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Génère le CSS de surcharge du thème pour un tenant en marque blanche.
//
// Les couleurs Tailwind primary/accent sont pilotées par des variables CSS en
// triplets RGB (cf. tailwind.config.mts + app/globals.css). Ici on convertit
// les 2 couleurs choisies par le client (primaire + accent, le ton "500") en
// triplets, et on DÉRIVE les nuances 600 (plus foncée) et 50 (teinte claire)
// pour une rampe cohérente à partir d'une seule couleur. On surcharge aussi les
// `--color-*` (hex) utilisés par le CSS custom (.btn-primary, etc.).
//
// Pure function (testable). Renvoie "" si les couleurs sont invalides -> le
// thème Humanix par défaut reste en place.

import type { EffectiveBranding } from "./tenant-branding";
import { isValidHexColor } from "./tenant-branding";

/** "#0B3D91" | "#abc" -> [11, 61, 145] (ou null si invalide). */
function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const triplet = (rgb: [number, number, number]) => rgb.join(" ");

/** Assombrit vers le noir (amount 0..1). */
function darken(rgb: [number, number, number], amount: number): [number, number, number] {
  return [clamp(rgb[0] * (1 - amount)), clamp(rgb[1] * (1 - amount)), clamp(rgb[2] * (1 - amount))];
}

/** Éclaircit vers le blanc (amount 0..1) — pour la teinte "50". */
function tint(rgb: [number, number, number], amount: number): [number, number, number] {
  return [
    clamp(rgb[0] + (255 - rgb[0]) * amount),
    clamp(rgb[1] + (255 - rgb[1]) * amount),
    clamp(rgb[2] + (255 - rgb[2]) * amount),
  ];
}

const toHex = (rgb: [number, number, number]) =>
  "#" + rgb.map((c) => clamp(c).toString(16).padStart(2, "0")).join("");

/**
 * Construit le bloc CSS `:root{...}` qui surcharge la palette pour ce tenant.
 * Renvoie "" si pas de branding custom ou couleurs invalides (-> défaut).
 */
export function buildTenantThemeCss(branding: EffectiveBranding): string {
  if (!branding.isCustom) return "";
  if (!isValidHexColor(branding.primaryColor) || !isValidHexColor(branding.accentColor)) {
    return "";
  }
  const primary = hexToRgb(branding.primaryColor);
  const accent = hexToRgb(branding.accentColor);
  if (!primary || !accent) return "";

  const primary600 = darken(primary, 0.18);
  const primary50 = tint(primary, 0.9);
  const accent600 = darken(accent, 0.18);

  // Variables Tailwind (triplets) + variables --color-* (hex) du CSS custom.
  return (
    ":root{" +
    `--primary-500:${triplet(primary)};` +
    `--primary-600:${triplet(primary600)};` +
    `--primary-50:${triplet(primary50)};` +
    `--accent-500:${triplet(accent)};` +
    `--accent-600:${triplet(accent600)};` +
    `--color-primary:${branding.primaryColor};` +
    `--color-primary-50:${toHex(primary50)};` +
    `--color-accent:${branding.accentColor};` +
    "}"
  );
}
