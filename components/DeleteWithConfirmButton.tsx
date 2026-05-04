"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Mini Client Component reutilisable : un bouton de form action avec
// confirmation native window.confirm. Utilise dans toutes les tables
// admin pour eviter de sprinkler des "use client" partout.

type Props = {
  confirmMessage: string;
  ariaLabel: string;
  className?: string;
  children: React.ReactNode;
};

export default function DeleteWithConfirmButton({
  confirmMessage,
  ariaLabel,
  className,
  children,
}: Props) {
  return (
    <button
      type="submit"
      aria-label={ariaLabel}
      className={
        className ??
        "text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100"
      }
      onClick={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
