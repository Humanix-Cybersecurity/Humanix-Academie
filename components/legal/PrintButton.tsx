"use client";

// Bouton "Imprimer" pour les pages légales — isolé en client component
// car les Server Components ne peuvent pas recevoir d'event handlers.
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="text-xs text-gray-500 hover:text-primary-500 flex items-center gap-1.5"
    >
      🖨️ Imprimer cette page
    </button>
  );
}
