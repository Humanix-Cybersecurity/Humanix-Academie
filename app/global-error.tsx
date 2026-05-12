"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Filet de sauvetage : déclenché quand le root layout LUI-MÊME crash
// (provider qui throw, theme init qui boom, etc.). Doit fournir son propre
// <html>/<body> car la layout n'est plus appliquée. Donc styles inline
// uniquement, pas de Tailwind, pas de composants partagés.
//
// On vise minimal mais on-brand : navy + teal, message rassurant, bouton
// retour. Mieux qu'une page blanche.

import { useEffect } from "react";

const PRIMARY = "#0B3D91";
const ACCENT = "#00A3A1";
const SOFT = "#F4F8FB";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[humanix] global layout crash", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: SOFT,
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          color: "#0F172A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: 640,
            width: "100%",
            textAlign: "center",
            background: "white",
            borderRadius: 24,
            padding: "48px 32px",
            boxShadow: "0 12px 32px rgba(11,61,145,0.10)",
            border: `1px solid ${PRIMARY}1F`,
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "6px 16px",
              borderRadius: 999,
              background: `${ACCENT}1A`,
              color: ACCENT,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Erreur critique
          </div>
          <h1
            style={{
              fontSize: 40,
              lineHeight: 1.1,
              fontWeight: 800,
              color: PRIMARY,
              margin: "0 0 16px",
              letterSpacing: "-0.5px",
            }}
          >
            La plateforme a buté.
          </h1>
          <p
            style={{
              fontSize: 18,
              color: "#475569",
              lineHeight: 1.6,
              margin: "0 0 32px",
            }}
          >
            Ce n'est pas ta faute. On a un souci côté serveur. Essaie de
            recharger - si ça persiste, écris-nous, on regardera.
          </p>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                background: PRIMARY,
                color: "white",
                fontWeight: 700,
                fontSize: 16,
                padding: "12px 24px",
                borderRadius: 14,
                border: "none",
                cursor: "pointer",
              }}
            >
              Recharger
            </button>
            <a
              href="mailto:contact@humanix-cybersecurity.fr"
              style={{
                background: "white",
                color: PRIMARY,
                fontWeight: 700,
                fontSize: 16,
                padding: "12px 24px",
                borderRadius: 14,
                border: `2px solid ${PRIMARY}`,
                textDecoration: "none",
              }}
            >
              Nous prévenir
            </a>
          </div>
          {error.digest && (
            <p
              style={{
                marginTop: 32,
                fontSize: 12,
                color: "#94A3B8",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              Code de référence : <span style={{ userSelect: "all" }}>{error.digest}</span>
            </p>
          )}

          {/* DIAGNOSTIC : surface le message + stack pour pouvoir
              debugger sans avoir acces aux logs serveur. Volontairement
              en details/summary pour rester discret en UI. */}
          <details
            style={{
              marginTop: 24,
              textAlign: "left",
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              padding: "12px 16px",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                color: "#475569",
                userSelect: "none",
              }}
            >
              Détails techniques (à copier-coller pour support)
            </summary>
            <pre
              style={{
                marginTop: 12,
                fontSize: 11,
                lineHeight: 1.5,
                color: "#334155",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                userSelect: "all",
              }}
            >
{`name:    ${error.name || "(unknown)"}
message: ${error.message || "(empty)"}
digest:  ${error.digest || "(none)"}
stack:
${error.stack || "(no stack)"}`}
            </pre>
          </details>
        </div>
      </body>
    </html>
  );
}
