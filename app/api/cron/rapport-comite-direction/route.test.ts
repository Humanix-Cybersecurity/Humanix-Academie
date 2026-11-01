// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests de /api/cron/rapport-comite-direction : la surface HTTP du rapport
// mensuel au comite de direction.
//
// POURQUOI CETTE ROUTE MERITE DES TESTS
//
//   La crontab de l'hote appelle chaque job en POST (scripts/cron-runner.sh).
//   Cette route n'exposait que GET : Next.js repondait 405 le 1er de chaque
//   mois, et le rapport n'est jamais parti entre sa mise en service
//   (2026-08-14) et le 2026-11-01. Le premier test fige la presence des deux
//   verbes ; les autres verifient que le secret est exige quel que soit le
//   verbe, et que le travail est lance une fois, sous le nom que la table
//   CronRun attend.
//
//   L'envoi lui-meme est double : il est teste dans
//   lib/rapports/comite-direction.test.ts.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockEnvoyer, mockRecord } = vi.hoisted(() => ({
  mockEnvoyer: vi.fn(),
  mockRecord: vi.fn(),
}));

vi.mock("@/lib/rapports/comite-direction", () => ({
  envoyerRapportsMensuels: mockEnvoyer,
}));
vi.mock("@/lib/cron/record", () => ({ recordCronRun: mockRecord }));

import * as route from "./route";

// Sans « + » ni « % » : le secret passe aussi en query, et « + » y vaut une
// espace.
const SECRET = "secret-de-test-assez-long-0123";
const URL_ROUTE = "http://app:3000/api/cron/rapport-comite-direction";
const RESULTAT = {
  tenants: 2,
  envoyes: 2,
  sansDestinataire: 0,
  echecs: 0,
  erreurs: [],
};

function post(headers: Record<string, string> = {}, query = "") {
  return route.POST(
    new NextRequest(`${URL_ROUTE}${query}`, { method: "POST", headers }),
  );
}

function get(query = "", headers: Record<string, string> = {}) {
  return route.GET(
    new NextRequest(`${URL_ROUTE}${query}`, { method: "GET", headers }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = SECRET;
  mockEnvoyer.mockResolvedValue(RESULTAT);
  // recordCronRun est transparent : il execute le travail et rend son resultat.
  mockRecord.mockImplementation(
    (_nom: string, travail: () => Promise<unknown>) => travail(),
  );
});

describe("surface HTTP", () => {
  it("expose POST (la crontab de l'hote) et GET (ordonnanceurs limites au GET)", () => {
    expect(typeof route.POST).toBe("function");
    expect(typeof route.GET).toBe("function");
  });
});

describe("POST, comme l'appelle scripts/cron-runner.sh", () => {
  it("lance l'envoi avec le secret en en-tete, sous le nom attendu par CronRun", async () => {
    const res = await post({ "x-cron-secret": SECRET });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, ...RESULTAT });
    expect(mockRecord).toHaveBeenCalledWith(
      "rapport-comite-direction",
      expect.any(Function),
    );
    expect(mockEnvoyer).toHaveBeenCalledTimes(1);
  });

  it("refuse sans secret, et ne lance rien", async () => {
    const res = await post();
    expect(res.status).toBe(403);
    expect(mockRecord).not.toHaveBeenCalled();
    expect(mockEnvoyer).not.toHaveBeenCalled();
  });

  it("refuse un secret de meme longueur mais faux", async () => {
    const res = await post({ "x-cron-secret": "x".repeat(SECRET.length) });
    expect(res.status).toBe(403);
    expect(mockEnvoyer).not.toHaveBeenCalled();
  });

  it("ne lit pas le secret en query : en POST, il voyage en en-tete", async () => {
    const res = await post({}, `?secret=${SECRET}`);
    expect(res.status).toBe(403);
    expect(mockEnvoyer).not.toHaveBeenCalled();
  });

  it("refuse tout quand CRON_SECRET n'est pas configure cote serveur", async () => {
    process.env.CRON_SECRET = "";
    const res = await post({ "x-cron-secret": SECRET });
    expect(res.status).toBe(403);
    expect(mockEnvoyer).not.toHaveBeenCalled();
  });
});

describe("GET, pour les ordonnanceurs qui ne savent faire que des GET", () => {
  it("accepte le secret en query", async () => {
    const res = await get(`?secret=${SECRET}`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, ...RESULTAT });
    expect(mockEnvoyer).toHaveBeenCalledTimes(1);
  });

  it("accepte aussi le secret en en-tete", async () => {
    const res = await get("", { "x-cron-secret": SECRET });
    expect(res.status).toBe(200);
    expect(mockEnvoyer).toHaveBeenCalledTimes(1);
  });

  it("refuse sans secret", async () => {
    const res = await get();
    expect(res.status).toBe(403);
    expect(mockEnvoyer).not.toHaveBeenCalled();
  });
});
