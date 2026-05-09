// SPDX-License-Identifier: AGPL-3.0-or-later
// Modal accessible : focus trap + ESC pour fermer + retour focus + aria-modal.
// Pattern WCAG 2.1 SC 2.1.2 (No Keyboard Trap) + 2.4.3 (Focus Order).
"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string; // Pour aria-labelledby
  description?: string; // Pour aria-describedby
  children: ReactNode;
  closeOnEsc?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
  backdropClassName?: string;
  // Si true (defaut) le focus retourne sur l'element qui a ouvert la modale a la fermeture
  restoreFocusOnClose?: boolean;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function AccessibleDialog({
  open,
  onClose,
  title,
  description,
  children,
  closeOnEsc = true,
  closeOnBackdrop = true,
  className = "",
  backdropClassName = "",
  restoreFocusOnClose = true,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const titleId = useRef(`dlg-title-${Math.random().toString(36).slice(2, 9)}`);
  const descId = useRef(`dlg-desc-${Math.random().toString(36).slice(2, 9)}`);

  // Save focus on open
  useEffect(() => {
    if (!open) return;
    previousActiveElement.current =
      document.activeElement as HTMLElement | null;
  }, [open]);

  // Restore focus on close
  useEffect(() => {
    return () => {
      if (restoreFocusOnClose && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [restoreFocusOnClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  // Focus trap + ESC
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Focus le premier element focusable, sinon la modale elle-même
    const focusables = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      dialog.focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEsc) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      // Refresh à chaque Tab car le DOM peut bouger
      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeOnEsc, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${backdropClassName}`}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
      aria-hidden="false"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId.current}
        aria-describedby={description ? descId.current : undefined}
        tabIndex={-1}
        className={className}
      >
        {/* Title visible OU caché : on l'expose toujours pour aria */}
        <div id={titleId.current} className="sr-only-when-decorative">
          {title}
        </div>
        {description && (
          <div id={descId.current} className="sr-only-when-decorative">
            {description}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
