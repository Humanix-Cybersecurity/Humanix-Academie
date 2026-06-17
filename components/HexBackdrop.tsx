// SPDX-License-Identifier: AGPL-3.0-or-later
// Backdrop Hex : motif hexagonal subtil en arriere-plan d'une section.
// Reference visuelle directe au nom Humanix. Tres faible opacity (6-8%).
//
// Utilisation : <HexBackdrop>{contenu}</HexBackdrop>
// Le motif est en absolu derriere le contenu, qui reste relatif et lisible.
//
// A11y : aria-hidden, pur decoratif.

import React from "react";

export default function HexBackdrop({
  children,
  intensity = "soft",
  className,
}: {
  children: React.ReactNode;
  intensity?: "soft" | "medium";
  className?: string;
}) {
  // L'intensite ne change pas l'opacity du motif (geree dans globals.css)
  // mais on peut filtrer par contraste. Pour soft : motif tel quel ; pour
  // medium : on rajoute un degrade radial subtil par dessus pour adoucir.
  return (
    <div className={`relative isolate ${className ?? ""}`}>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-hex-pattern -z-10 pointer-events-none"
        style={
          intensity === "medium"
            ? {
                maskImage:
                  "radial-gradient(ellipse at center, black 50%, transparent 100%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse at center, black 50%, transparent 100%)",
              }
            : undefined
        }
      />
      {children}
    </div>
  );
}
