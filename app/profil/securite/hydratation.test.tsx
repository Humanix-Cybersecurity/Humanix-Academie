// SPDX-License-Identifier: AGPL-3.0-or-later
// /profil/securite : le HTML que le serveur envoie et celui que le navigateur
// recalcule a l'hydratation doivent etre identiques, caractere pour caractere.
//
// Le serveur de la demo tourne en UTC, le navigateur de la personne a Paris.
// Une date formatee avec le fuseau du processus donne donc deux textes
// differents, et React abandonne le HTML du serveur (erreur #418, constatee
// le 2026-11-02 sur « Derniere connexion »). On rejoue ici les deux rendus
// en changeant le fuseau du processus, comme le ferait un conteneur puis un
// navigateur.
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import SecurityPanel from "@/components/SecurityPanel";
import WebAuthnPanel from "@/components/WebAuthnPanel";

// Les deux panneaux importent des server actions (auth, Prisma) et le routeur
// de Next : hors de Next, des coquilles suffisent, seul le rendu compte ici.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
}));
vi.mock("@/app/profil/securite/actions", () => ({
  setPassword: vi.fn(),
  startMfaEnrollment: vi.fn(),
  confirmMfaEnrollment: vi.fn(),
  disableMfa: vi.fn(),
  regenerateBackupCodes: vi.fn(),
}));
vi.mock("@/app/profil/securite/webauthn-actions", () => ({
  renameWebauthnCredential: vi.fn(),
  deleteWebauthnCredential: vi.fn(),
}));
vi.mock("@simplewebauthn/browser", () => ({ startRegistration: vi.fn() }));

const FUSEAU_INITIAL = process.env.TZ;
afterEach(() => {
  if (FUSEAU_INITIAL === undefined) delete process.env.TZ;
  else process.env.TZ = FUSEAU_INITIAL;
});

/** Rend l'element comme le ferait un hote dont le fuseau est `tz`. */
function renduDans(tz: string, element: ReactElement): string {
  process.env.TZ = tz;
  return renderToStaticMarkup(element);
}

// Instants choisis pour qu'UTC et Paris ne donnent ni la meme heure
// (connexion a 13 h 12 UTC) ni le meme jour (les autres a 22 h 30 ou 23 h 30
// UTC : deja le lendemain a Paris).
const securite = (
  <SecurityPanel
    email="florian@exemple.fr"
    hasPassword
    passwordUpdatedAt="2026-09-30T22:30:00.000Z"
    mfaEnabled
    mfaEnabledAt="2026-08-31T22:30:00.000Z"
    mfaForced={false}
    backupCodesRemaining={8}
    lastLoginAt="2026-10-31T13:12:52.000Z"
  />
);

const cles = (
  <WebAuthnPanel
    credentials={[
      {
        id: "cle-1",
        deviceName: "YubiKey 5C",
        transports: "usb",
        backedUp: false,
        userVerified: true,
        createdAt: "2026-06-30T22:30:00.000Z",
        lastUsedAt: "2026-10-31T23:30:00.000Z",
      },
    ]}
    isSuperAdmin={false}
  />
);

describe("/profil/securite : serveur en UTC, navigateur a Paris", () => {
  it("SecurityPanel rend le meme HTML des deux cotes", () => {
    expect(renduDans("UTC", securite)).toBe(
      renduDans("Europe/Paris", securite),
    );
  });

  it("SecurityPanel affiche les dates a l'heure de Paris", () => {
    const html = renduDans("UTC", securite);
    expect(html).toContain("Dernière connexion : 31/10/2026 14:12:52");
    expect(html).toContain("Modifié le 01/10/2026");
    expect(html).toContain("Activée le 01/09/2026");
  });

  it("WebAuthnPanel rend le meme HTML des deux cotes", () => {
    expect(renduDans("UTC", cles)).toBe(renduDans("Europe/Paris", cles));
  });

  it("WebAuthnPanel affiche les dates a l'heure de Paris", () => {
    const html = renduDans("UTC", cles);
    expect(html).toContain("Enregistrée 01/07/2026");
    expect(html).toContain("dernière utilisation 01/11/2026");
  });
});
