// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  destinatairesRapport,
  moisPrecedent,
  composerRapport,
} from "./comite-direction";

describe("destinatairesRapport", () => {
  it("retient ADMIN et RSSI", () => {
    expect(
      destinatairesRapport([
        { email: "a@x.fr", role: "ADMIN" },
        { email: "r@x.fr", role: "RSSI" },
      ]),
    ).toEqual(["a@x.fr", "r@x.fr"]);
  });

  it("ecarte LEARNER et MANAGER", () => {
    expect(
      destinatairesRapport([
        { email: "l@x.fr", role: "LEARNER" },
        { email: "m@x.fr", role: "MANAGER" },
      ]),
    ).toEqual([]);
  });

  it("ecarte SUPERADMIN : ce sont les comptes Humanix, pas ceux du client", () => {
    expect(
      destinatairesRapport([{ email: "nous@humanix.fr", role: "SUPERADMIN" }]),
    ).toEqual([]);
  });

  it("ecarte un email vide ou nul", () => {
    // La purge RGPD vide l'email tout en conservant l'utilisateur. Un
    // destinataire nul ferait echouer l'envoi pour TOUT le lot.
    expect(
      destinatairesRapport([
        { email: null, role: "ADMIN" },
        { email: "   ", role: "ADMIN" },
        { email: "vrai@x.fr", role: "ADMIN" },
      ]),
    ).toEqual(["vrai@x.fr"]);
  });

  it("dedoublonne sans tenir compte de la casse", () => {
    expect(
      destinatairesRapport([
        { email: "Dir@x.fr", role: "ADMIN" },
        { email: "dir@x.fr", role: "RSSI" },
      ]),
    ).toEqual(["Dir@x.fr"]);
  });
});

describe("moisPrecedent", () => {
  it("donne le mois d'avant", () => {
    expect(moisPrecedent(new Date(2026, 8, 1))).toBe("août 2026");
  });

  it("repasse a l'annee precedente en janvier", () => {
    // Le piege classique : un cron du 1er janvier doit rapporter decembre
    // de l'annee d'AVANT, pas decembre de l'annee courante.
    expect(moisPrecedent(new Date(2026, 0, 1))).toBe("décembre 2025");
  });
});

describe("composerRapport", () => {
  it("echappe le HTML du nom de tenant", () => {
    const r = composerRapport({
      nomTenant: 'ACME <script>alert("x")</script>',
      mois: "août 2026",
      urlRapport: "https://humanix-academie.fr/api/admin/conformity-report",
    });
    expect(r.html).not.toContain("<script>");
    expect(r.html).toContain("&lt;script&gt;");
  });

  it("porte le lien et jamais de piece jointe", () => {
    const r = composerRapport({
      nomTenant: "ACME",
      mois: "août 2026",
      urlRapport: "https://humanix-academie.fr/rapport",
    });
    expect(r.subject).toBe("Rapport de conformite ACME - août 2026");
    expect(r.text).toContain("https://humanix-academie.fr/rapport");
    expect(r.text).toContain("journalisee");
  });
});
