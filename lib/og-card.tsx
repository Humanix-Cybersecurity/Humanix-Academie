// SPDX-License-Identifier: AGPL-3.0-or-later
// Builder pour les cartes Open Graph dynamiques (Next.js 15 ImageResponse).
// Une seule fonction, un look unifié, configurable par page.
//
// Standard OG : 1200x630 px, lisible jusqu'à 200x100 (preview LinkedIn mobile).
// Donc : titre énorme, peu de mots, contraste fort, marge respirable.
//
// Le logo officiel (toque de diplômé + bouclier-H, public/logo-humanix-
// academie-192.png) est embarqué en base64 dans la carte. Pas d'import URL
// car ImageResponse ne fetch pas les chemins relatifs au runtime - on lit
// le fichier au build/render via fs Node.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const PRIMARY = "#0B3D91"; // navy
const ACCENT = "#00A3A1"; // teal
const SOFT_BG = "#F4F8FB"; // crème-bleuté
const INK = "#0F172A"; // texte sombre
const MUTED = "#475569"; // texte secondaire

export type OgVariant = {
  /** Eyebrow / catégorie en petit au-dessus du titre */
  kicker: string;
  /** Titre principal sur 1-2 lignes max */
  title: string;
  /** Sous-titre sur 1-2 lignes max */
  subtitle: string;
  /** Couleur d'accent du badge kicker (default : teal) */
  accentColor?: string;
  /** Bullets d'arguments en bas (3 max) */
  bullets?: string[];
  /** Caractère vedette à droite (emoji unicode ou symbole) */
  glyph?: string;
  /** Couleur du glyph (default : accent) */
  glyphColor?: string;
};

// Cache du logo en base64 (évite la relecture disque à chaque render).
let _logoDataUrl: string | null = null;
async function getLogoDataUrl(): Promise<string | null> {
  if (_logoDataUrl !== null) return _logoDataUrl;
  try {
    const buf = await readFile(
      join(process.cwd(), "public", "logo-humanix-academie-192.png"),
    );
    _logoDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
    return _logoDataUrl;
  } catch {
    return null;
  }
}

export async function renderOgCard(variant: OgVariant) {
  const accent = variant.accentColor ?? ACCENT;
  const glyph = variant.glyph ?? "";
  const glyphColor = variant.glyphColor ?? accent;
  const logoDataUrl = await getLogoDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: SOFT_BG,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Bandeau supérieur cyber-météo (signature visuelle Humanix) */}
        <div
          style={{
            display: "flex",
            height: "8px",
            background: `linear-gradient(90deg, #2E8B57 0%, ${accent} 50%, ${PRIMARY} 100%)`,
          }}
        />

        {/* Hexagones de fond (subtil, pattern Humanix) -- en SVG inline car
            le glyph Unicode ⬡ (U+2B21) n'est dans aucune Google Font, ce qui
            faisait pleuvoir des warnings "Failed to download dynamic font" au
            build (-> Satori echoue silencieusement et n'affiche rien). Un
            polygone SVG fait le job sans dependance de police. */}
        <svg
          width="700"
          height="260"
          viewBox="0 0 700 260"
          style={{
            position: "absolute",
            right: "60px",
            top: "50%",
            transform: "translateY(-50%)",
            opacity: 0.06,
          }}
        >
          {[120, 360, 600].map((cx) => (
            <polygon
              key={cx}
              points={`${cx},20 ${cx + 104},80 ${cx + 104},180 ${cx},240 ${cx - 104},180 ${cx - 104},80`}
              fill={PRIMARY}
            />
          ))}
        </svg>

        {/* Contenu principal */}
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            padding: "60px 80px 50px",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          {/* Top : marque + kicker */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "32px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              {/* Logo officiel Humanix Académie (toque + bouclier-H) */}
              {logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoDataUrl}
                  alt=""
                  width={68}
                  height={68}
                  style={{ display: "flex" }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "68px",
                    height: "68px",
                    background: PRIMARY,
                    borderRadius: "12px",
                    color: "white",
                    fontSize: "36px",
                    fontWeight: 800,
                  }}
                >
                  H
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  lineHeight: 1.1,
                }}
              >
                <div
                  style={{
                    fontSize: "30px",
                    fontWeight: 800,
                    color: PRIMARY,
                  }}
                >
                  Humanix Académie
                </div>
                <div
                  style={{
                    fontSize: "17px",
                    color: MUTED,
                    fontWeight: 500,
                  }}
                >
                  par Humanix-Cybersecurity
                </div>
              </div>
            </div>

            {/* Kicker (badge catégorie) */}
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                background: "white",
                border: `2px solid ${accent}`,
                color: accent,
                fontSize: "18px",
                fontWeight: 800,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "10px 22px",
                borderRadius: "999px",
              }}
            >
              {variant.kicker}
            </div>
          </div>

          {/* Centre : titre + subtitle + glyph */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "40px",
              marginTop: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: "68px",
                  fontWeight: 900,
                  color: INK,
                  lineHeight: 1.05,
                  letterSpacing: "-1.5px",
                }}
              >
                {variant.title}
              </div>
              <div
                style={{
                  fontSize: "30px",
                  color: MUTED,
                  fontWeight: 500,
                  lineHeight: 1.3,
                }}
              >
                {variant.subtitle}
              </div>
            </div>
            {glyph && (
              <div
                style={{
                  display: "flex",
                  fontSize: "180px",
                  lineHeight: 1,
                  color: glyphColor,
                  flexShrink: 0,
                }}
              >
                {glyph}
              </div>
            )}
          </div>

          {/* Bottom : bullets + URL */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "20px",
            }}
          >
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              {(variant.bullets ?? []).slice(0, 3).map((b, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "white",
                    color: PRIMARY,
                    fontSize: "20px",
                    fontWeight: 700,
                    padding: "12px 22px",
                    borderRadius: "999px",
                    border: `1px solid ${PRIMARY}22`,
                  }}
                >
                  {b}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "20px",
                fontWeight: 700,
                color: PRIMARY,
              }}
            >
              humanix-cybersecurity.fr
            </div>
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
