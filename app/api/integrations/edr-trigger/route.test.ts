// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Test de CONTRAT de l'endpoint : authentification, validation, codes de
// retour, et surtout ce que la reponse ne contient pas. La logique metier
// est testee dans lib/boucle-fermee/declencheur.test.ts.

import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  authenticateApiKey: (...a: unknown[]) => auth(...a),
}));

const traiter = vi.fn();
vi.mock("@/lib/boucle-fermee/declencheur", () => ({
  traiterDeclencheur: (...a: unknown[]) => traiter(...a),
}));

import { POST } from "./route";

function requete(body: unknown, opts: { auth?: string; query?: string } = {}) {
  return new Request(
    `http://test/api/integrations/edr-trigger${opts.query ?? ""}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(opts.auth ? { authorization: opts.auth } : {}),
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    },
  );
}

const corpsValide = {
  source: "mailinblack",
  logins: ["a@acme.fr", "b@acme.fr"],
  reason: "Phishing detecte",
};

const resultat = {
  trigger_id: "trig-1",
  replay: false,
  status: "assigned",
  saison: { slug: "remediation-flash", title: "Remédiation flash" },
  episode: { id: "e1", slug: "01-microsoft-flash", title: "Le faux Microsoft" },
  recipients: {
    requested: 2,
    matched: 2,
    assigned: 2,
    in_progress: 0,
    already_done: 0,
    throttled: 0,
    notified: 2,
  },
};

beforeEach(() => {
  auth.mockReset();
  traiter.mockReset();
  auth.mockResolvedValue({
    ok: true,
    tenantId: "t1",
    apiKeyId: `k-${Math.random()}`,
  });
  traiter.mockResolvedValue(resultat);
});

describe("POST /api/integrations/edr-trigger", () => {
  it("401 sans cle valide, et la logique n'est jamais appelee", async () => {
    auth.mockResolvedValue({ ok: false, error: "missing_token", status: 401 });
    const res = await POST(requete(corpsValide));
    expect(res.status).toBe(401);
    expect(traiter).not.toHaveBeenCalled();
  });

  it("402 quand le plan n'a pas l'API", async () => {
    auth.mockResolvedValue({
      ok: false,
      error: "plan_upgrade_required",
      status: 402,
    });
    const res = await POST(requete(corpsValide, { auth: "Bearer hxa_x" }));
    expect(res.status).toBe(402);
  });

  it("400 sur un JSON invalide", async () => {
    const res = await POST(requete("{pas du json", { auth: "Bearer hxa_x" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "invalid_json" });
  });

  it("400 avec le detail par champ quand le corps ne respecte pas le contrat", async () => {
    const res = await POST(
      requete({ source: "x", logins: [] }, { auth: "Bearer hxa_x" }),
    );
    expect(res.status).toBe(400);
    const j = (await res.json()) as {
      error: string;
      details: Record<string, unknown>;
    };
    expect(j.error).toBe("invalid_body");
    expect(Object.keys(j.details)).toEqual(
      expect.arrayContaining(["logins", "reason"]),
    );
    expect(traiter).not.toHaveBeenCalled();
  });

  it("202 sur un nouveau declencheur, avec le contexte tenant de la cle", async () => {
    auth.mockResolvedValue({ ok: true, tenantId: "t1", apiKeyId: "k1" });
    const res = await POST(requete(corpsValide, { auth: "Bearer hxa_x" }));
    expect(res.status).toBe(202);
    expect(traiter).toHaveBeenCalledWith(
      expect.objectContaining({ source: "mailinblack", dry_run: false }),
      { tenantId: "t1", apiKeyId: "k1" },
    );
    expect(await res.json()).toMatchObject({
      status: "assigned",
      trigger_id: "trig-1",
    });
  });

  it("200 sur un rejeu", async () => {
    traiter.mockResolvedValue({ ...resultat, replay: true });
    const res = await POST(requete(corpsValide, { auth: "Bearer hxa_x" }));
    expect(res.status).toBe(200);
  });

  it("?dry_run=1 equivaut au champ du corps", async () => {
    await POST(
      requete(corpsValide, { auth: "Bearer hxa_x", query: "?dry_run=1" }),
    );
    expect(traiter.mock.calls[0][0]).toMatchObject({ dry_run: true });
  });

  it("la reponse ne contient aucune adresse, meme si la logique en renvoyait une", async () => {
    const res = await POST(requete(corpsValide, { auth: "Bearer hxa_x" }));
    expect(JSON.stringify(await res.json())).not.toContain("@");
  });

  it("429 au-dela du plafond horaire de la cle", async () => {
    auth.mockResolvedValue({ ok: true, tenantId: "t1", apiKeyId: "k-plafond" });
    let dernier: Response | null = null;
    for (let i = 0; i < 61; i += 1) {
      dernier = await POST(requete(corpsValide, { auth: "Bearer hxa_x" }));
    }
    expect(dernier?.status).toBe(429);
    expect(dernier?.headers.get("Retry-After")).toBeTruthy();
    expect(traiter).toHaveBeenCalledTimes(60);
  });
});
