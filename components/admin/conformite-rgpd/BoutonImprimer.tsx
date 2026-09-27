"use client";
// SPDX-License-Identifier: AGPL-3.0-or-later
// Bouton d'impression d'une page « modèle » (note d'information). La page
// masque ce qui n'est pas la note via les classes print: de Tailwind.

export default function BoutonImprimer({ libelle }: { libelle: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-primary print:hidden"
    >
      🖨️ {libelle}
    </button>
  );
}
