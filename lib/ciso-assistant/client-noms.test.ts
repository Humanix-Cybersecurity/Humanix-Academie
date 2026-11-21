// SPDX-License-Identifier: AGPL-3.0-or-later
// Rapprochement des noms d'objets CISO Assistant sans les accents.
//
// Les libelles du mapping GRC (lib/mapping-grc.ts) entrent dans le nom des
// preuves et des constats, que la synchronisation retrouve par leur nom.
// Quand un libelle prend ses accents, l'objet cree avant doit etre RETROUVE
// et renomme par le PATCH, pas dedouble dans l'instance du client.
//
// Le client est simule au niveau de `request()` : on observe les appels
// (methode, chemin, corps) sans reseau.

import { describe, it, expect, vi } from "vitest";
import { CisoAssistantClient, cleDeNom } from "./client";
import type { CisoEvidence } from "./build-bundle";

type Appel = { method: string; path: string; body?: Record<string, unknown> };

function reponse(status: number, corps: unknown): Response {
  return new Response(JSON.stringify(corps), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Client dont `request()` est remplace par `repondre`, folder deja resolu. */
function clientSimule(repondre: (a: Appel) => Response) {
  const client = new CisoAssistantClient({
    baseUrl: "https://ciso.example.com",
    username: "admin",
    password: "secret",
    folderName: "Humanix Académie",
    verifySSL: true,
  });
  const appels: Appel[] = [];
  const c = client as unknown as Record<string, unknown>;
  c.folderId = "folder-1";
  c.request = vi.fn(
    async (method: string, path: string, body?: Record<string, unknown>) => {
      const appel = { method, path, body };
      appels.push(appel);
      return repondre(appel);
    },
  );
  return { client, appels };
}

const AUDIT = {
  ownerEmail: null,
  coverageStart: "2026-01-01T00:00:00.000Z",
  coverageEnd: "2026-11-21T00:00:00.000Z",
  contentVersion: "1.17.0",
  expiryDate: "2027-11-21",
};

const NOM_AVANT =
  "Principes relatifs au traitement des donnees a caractere personnel";
const NOM_APRES =
  "Principes relatifs au traitement des données à caractère personnel";

function preuve(controlName: string): CisoEvidence {
  return {
    control_ref: "art-5",
    control_name: controlName,
    category: "Principes",
    status: "compliant",
    artifacts: [],
  };
}

describe("cleDeNom", () => {
  it("retire les accents et garde tout le reste", () => {
    expect(cleDeNom(`Humanix · art-5 · ${NOM_APRES}`)).toBe(
      `Humanix · art-5 · ${NOM_AVANT}`,
    );
    expect(cleDeNom("Règlement (UE) 2016/679 - Protection des données")).toBe(
      "Reglement (UE) 2016/679 - Protection des donnees",
    );
  });

  it("ne rapproche pas deux noms qui different autrement que par les accents", () => {
    expect(cleDeNom("[art-5] Principes")).not.toBe(
      cleDeNom("[art-6] Principes"),
    );
    expect(cleDeNom("Securite")).not.toBe(cleDeNom("securite"));
  });
});

describe("upsertEvidence - un libelle qui prend ses accents", () => {
  it("retrouve la preuve creee sans accents et la RENOMME (PATCH), sans en creer une seconde", async () => {
    const { client, appels } = clientSimule((a) => {
      if (a.method === "GET" && a.path.startsWith("/api/evidences/")) {
        return reponse(200, {
          results: [
            { id: "ev-ancienne", name: `Humanix · art-5 · ${NOM_AVANT}` },
          ],
        });
      }
      if (a.method === "PATCH") return reponse(200, { id: "ev-ancienne" });
      return reponse(201, { id: "ev-nouvelle" });
    });

    await client.loadExistingEvidences();
    const r = await client.upsertEvidence(
      preuve(NOM_APRES),
      "https://humanix.example.com",
      AUDIT,
    );

    expect(r).toMatchObject({ ok: true, action: "PATCH", id: "ev-ancienne" });
    expect(appels.filter((a) => a.method === "POST")).toHaveLength(0);
    const patch = appels.find((a) => a.method === "PATCH");
    expect(patch?.path).toBe("/api/evidences/ev-ancienne/");
    expect(patch?.body?.name).toBe(`Humanix · art-5 · ${NOM_APRES}`);
  });

  it("temoin : un autre controle reste une nouvelle preuve (POST)", async () => {
    const { client, appels } = clientSimule((a) => {
      if (a.method === "GET") {
        return reponse(200, {
          results: [
            { id: "ev-art6", name: "Humanix · art-6 · Liceite du traitement" },
          ],
        });
      }
      return reponse(201, { id: "ev-nouvelle" });
    });

    await client.loadExistingEvidences();
    const r = await client.upsertEvidence(
      preuve(NOM_APRES),
      "https://humanix.example.com",
      AUDIT,
    );

    expect(r).toMatchObject({ ok: true, action: "POST", id: "ev-nouvelle" });
    expect(appels.filter((a) => a.method === "PATCH")).toHaveLength(0);
  });

  it("une preuve creee pendant la synchronisation est retrouvee ensuite, accents ou non", async () => {
    const { client, appels } = clientSimule((a) => {
      if (a.method === "GET") return reponse(200, { results: [] });
      if (a.method === "POST") return reponse(201, { id: "ev-creee" });
      return reponse(200, { id: "ev-creee" });
    });

    await client.loadExistingEvidences();
    await client.upsertEvidence(
      preuve(NOM_AVANT),
      "https://h.example.com",
      AUDIT,
    );
    const r = await client.upsertEvidence(
      preuve(NOM_APRES),
      "https://h.example.com",
      AUDIT,
    );

    expect(r).toMatchObject({ ok: true, action: "PATCH", id: "ev-creee" });
    expect(appels.filter((a) => a.method === "POST")).toHaveLength(1);
  });
});

describe("upsertFinding - un libelle qui prend ses accents", () => {
  const ARGS = {
    findingsAssessmentId: "fa-1",
    controlRef: "art-5",
    controlName: NOM_APRES,
    status: "partial",
    score: 0.5,
    etaDate: "2027-01-01",
  };

  it("retrouve le constat cree sans accents et le RENOMME (PATCH), sans en creer un second", async () => {
    const { client, appels } = clientSimule((a) => {
      if (a.method === "GET") {
        return reponse(200, {
          results: [{ id: "f-ancien", name: `[art-5] ${NOM_AVANT}` }],
        });
      }
      if (a.method === "PATCH") return reponse(200, { id: "f-ancien" });
      return reponse(201, { id: "f-nouveau" });
    });

    const r = await client.upsertFinding(ARGS);

    expect(r).toMatchObject({ ok: true, action: "PATCH", id: "f-ancien" });
    expect(appels.filter((a) => a.method === "POST")).toHaveLength(0);
    const patch = appels.find((a) => a.method === "PATCH");
    expect(patch?.path).toBe("/api/findings/f-ancien/");
    expect(patch?.body?.name).toBe(`[art-5] ${NOM_APRES}`);
  });

  it("temoin : le constat d'un autre controle n'est pas repris (POST)", async () => {
    const { client, appels } = clientSimule((a) => {
      if (a.method === "GET") {
        return reponse(200, {
          results: [{ id: "f-art6", name: `[art-6] ${NOM_AVANT}` }],
        });
      }
      return reponse(201, { id: "f-nouveau" });
    });

    const r = await client.upsertFinding(ARGS);

    expect(r).toMatchObject({ ok: true, action: "POST", id: "f-nouveau" });
    expect(appels.filter((a) => a.method === "PATCH")).toHaveLength(0);
  });
});
