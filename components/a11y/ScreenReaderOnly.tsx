// SPDX-License-Identifier: AGPL-3.0-or-later
// Texte invisible visuellement mais lu par les lecteurs d'écran.
// Pattern WCAG standard "sr-only" - utile pour donner du contexte
// (ex: "Mascotte, niveau 3, débloqué").
import type { ReactNode, ElementType } from "react";

export default function ScreenReaderOnly({
  children,
  as: Tag = "span",
}: {
  children: ReactNode;
  as?: ElementType;
}) {
  return (
    <Tag
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        borderWidth: 0,
      }}
    >
      {children}
    </Tag>
  );
}
