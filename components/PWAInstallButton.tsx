"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Bouton flottant : "Installer l'app" pour ajouter Humanix a l'ecran d'accueil mobile.
// Sur navigateurs supportant beforeinstallprompt (Chrome / Edge / Samsung Internet),
// on declenche le prompt natif. Sur iOS Safari, on affiche une instruction.
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PWAInstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Standalone déjà active = installe
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(display-mode: standalone)").matches
    ) {
      setInstalled(true);
      return;
    }

    // iOS detection (Safari ne supporte pas beforeinstallprompt)
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !/(CriOS|FxiOS)/.test(navigator.userAgent);
    if (isIOS) {
      setShowIOSHint(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed || hidden) return null;
  if (!deferred && !showIOSHint) return null;

  const onInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    }
    setDeferred(null);
  };

  return (
    <div className="fixed bottom-4 right-4 z-30 max-w-xs animate-fadeIn">
      <div className="card shadow-lg bg-white border-accent-500 border-2">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-3xl">🦊</span>
          <div>
            <p className="font-bold text-primary-500 text-sm">
              Installer Humanix
            </p>
            <p className="text-xs text-gray-500">
              Pour un accès rapide depuis ton écran d'accueil.
            </p>
          </div>
        </div>
        {deferred ? (
          <div className="flex gap-2">
            <button
              onClick={onInstall}
              className="btn-primary text-xs py-2 px-3 flex-1"
            >
              Installer
            </button>
            <button
              onClick={() => setHidden(true)}
              className="text-xs text-gray-500 hover:text-warn px-2"
            >
              Plus tard
            </button>
          </div>
        ) : showIOSHint ? (
          <div>
            <p className="text-xs text-gray-700 mb-2">
              Sur iPhone : appuie sur <strong>Partager</strong> ⬆️ puis{" "}
              <strong>« Sur l'écran d'accueil »</strong>.
            </p>
            <button
              onClick={() => setHidden(true)}
              className="text-xs text-gray-500 hover:text-warn"
            >
              Compris, fermer
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
