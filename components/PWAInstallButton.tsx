"use client";

// SPDX-License-Identifier: AGPL-3.0-or-later
// Bouton flottant : "Installer l'app" pour ajouter Humanix a l'ecran d'accueil mobile.
// Sur navigateurs supportant beforeinstallprompt (Chrome / Edge / Samsung Internet),
// on declenche le prompt natif. Sur iOS Safari, on affiche une instruction.
//
// COMPORTEMENT DE NON-NUISANCE :
//   - Le dismiss ("Plus tard" / "Compris, fermer") est persiste 30 jours
//     dans localStorage : le popin ne re-apparait pas a chaque rechargement.
//   - Si l'user clique "Installer" (accepted) -> on note "installed" pour
//     toujours (jusqu'au clear du localStorage).
//   - Delai de 4 secondes avant la 1ere apparition pour ne pas spammer
//     le 1er chargement de l'app.
//   - Garde-fou anti-doublon : on tag le container avec un attribut data-*
//     et on refuse de monter si une autre instance est deja dans le DOM
//     (cas hot-reload ou layout remount).

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const STORAGE_KEY = "humanix:pwa-install-state";
const DISMISS_TTL_DAYS = 30;
const SHOW_DELAY_MS = 4000;
const DOM_TAG = "data-humanix-pwa-install-mounted";

type PersistedState =
  | { kind: "dismissed"; at: number } // timestamp ms
  | { kind: "installed" };

function loadPersistedState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed.kind === "installed") return parsed;
    if (parsed.kind === "dismissed") {
      const ageDays = (Date.now() - parsed.at) / (24 * 3600 * 1000);
      if (ageDays > DISMISS_TTL_DAYS) return null; // TTL expire, re-prompt OK
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function savePersistedState(state: PersistedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage indisponible (mode prive, quota) -- silencieux
  }
}

export default function PWAInstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [delayElapsed, setDelayElapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Anti-doublon : si une autre instance est deja dans le DOM, on ne
    // monte pas la seconde (cas hot-reload / layout remount).
    if (document.body.getAttribute(DOM_TAG) === "1") {
      return;
    }
    document.body.setAttribute(DOM_TAG, "1");

    let beforeInstallHandler: ((e: Event) => void) | null = null;
    const timeoutId = window.setTimeout(
      () => setDelayElapsed(true),
      SHOW_DELAY_MS,
    );

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      if (beforeInstallHandler) {
        window.removeEventListener("beforeinstallprompt", beforeInstallHandler);
      }
      document.body.removeAttribute(DOM_TAG);
    };

    // Standalone deja active = installe (PWA deja sur ecran d'accueil)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      savePersistedState({ kind: "installed" });
      return cleanup;
    }

    // Lit l'etat persiste : si dismiss recent OU installed -> on ne montre rien.
    const persisted = loadPersistedState();
    if (persisted?.kind === "installed") {
      setInstalled(true);
      return cleanup;
    }
    if (persisted?.kind === "dismissed") {
      setDismissed(true);
      return cleanup;
    }

    // iOS detection (Safari ne supporte pas beforeinstallprompt)
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !/(CriOS|FxiOS)/.test(navigator.userAgent);
    if (isIOS) {
      setShowIOSHint(true);
    } else {
      beforeInstallHandler = (e: Event) => {
        e.preventDefault();
        setDeferred(e as BeforeInstallPromptEvent);
      };
      window.addEventListener("beforeinstallprompt", beforeInstallHandler);
    }

    return cleanup;
  }, []);

  if (installed || dismissed) return null;
  if (!delayElapsed) return null;
  if (!deferred && !showIOSHint) return null;

  const onInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      savePersistedState({ kind: "installed" });
    } else {
      // Dismissed via le prompt natif -> on traite comme un dismiss user
      setDismissed(true);
      savePersistedState({ kind: "dismissed", at: Date.now() });
    }
    setDeferred(null);
  };

  const onDismiss = () => {
    setDismissed(true);
    savePersistedState({ kind: "dismissed", at: Date.now() });
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
              onClick={onDismiss}
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
              onClick={onDismiss}
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
