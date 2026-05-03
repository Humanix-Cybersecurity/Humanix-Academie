"use client";

// Bandeau d'information cookies.
// Pas un bandeau de consentement RGPD : nous n'utilisons que des cookies
// strictement nécessaires (session, CSRF, préférence thème), donc le
// consentement n'est pas requis (CNIL, art. 82 LIL). On informe simplement
// l'utilisateur, en première visite, avec lien vers /cookies.
//
// Si Humanix intègre un jour un traceur soumis à consentement (Matomo non
// anonymisé, mesure publicitaire, etc.), ce composant doit être remplacé
// par un vrai outil de Consent Management (CMP) avec boutons Accepter /
// Refuser de poids égal.

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "humanix-cookie-notice-dismissed";

export default function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
    } catch {
      // localStorage indisponible (mode privé strict) — on n'affiche pas
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="region"
      aria-label="Information cookies"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 animate-fadeIn"
    >
      <div className="bg-white dark:bg-slate-800 border-2 border-primary-200 dark:border-slate-600 rounded-2xl shadow-2xl p-4">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl shrink-0">🍪</span>
          <div className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            <p className="font-bold text-primary-500 mb-1">Cookies, version courte</p>
            <p>
              On utilise uniquement des cookies <strong>strictement nécessaires</strong>{" "}
              (session, sécurité, choix de thème). Pas de tracking publicitaire, pas de
              pixels tiers, pas de revente.{" "}
              <Link href="/cookies" className="text-accent-500 hover:underline font-medium">
                Voir le détail
              </Link>
            </p>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="btn-primary w-full text-sm py-2"
          aria-label="J'ai compris, ne plus afficher ce bandeau"
        >
          J'ai compris
        </button>
      </div>
    </div>
  );
}
