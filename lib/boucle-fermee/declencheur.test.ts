// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tests de la boucle fermee, base mockee. On verifie les DECISIONS, pas la
// plomberie : qui est resolu, quelle saison est choisie, qui est plafonne,
// ce qu'un rejeu et un dry_run produisent.

import { beforeEach, describe, expect, it, vi } from "vitest";

const m = {
  triggerFindUnique: vi.fn(),
  triggerCreate: vi.fn(),
  triggerUpdate: vi.fn(),
  recipientFindMany: vi.fn(),
  recipientCreateMany: vi.fn(),
  recipientUpdate: vi.fn(),
  userFindMany: vi.fn(),
  saisonFindMany: vi.fn(),
  episodeFindUnique: vi.fn(),
  progressFindMany: vi.fn(),
  progressCreateMany: vi.fn(),
  eventCreate: vi.fn(),
};

vi.mock("@/lib/db", () => {
  const tx = {
    threatTrigger: { create: (...a: unknown[]) => m.triggerCreate(...a) },
    threatTriggerRecipient: {
      createMany: (...a: unknown[]) => m.recipientCreateMany(...a),
    },
    progress: { createMany: (...a: unknown[]) => m.progressCreateMany(...a) },
  };
  return {
    db: {
      threatTrigger: {
        findUnique: (...a: unknown[]) => m.triggerFindUnique(...a),
        create: (...a: unknown[]) => m.triggerCreate(...a),
        update: (...a: unknown[]) => m.triggerUpdate(...a),
      },
      threatTriggerRecipient: {
        findMany: (...a: unknown[]) => m.recipientFindMany(...a),
        update: (...a: unknown[]) => m.recipientUpdate(...a),
      },
      user: { findMany: (...a: unknown[]) => m.userFindMany(...a) },
      saison: { findMany: (...a: unknown[]) => m.saisonFindMany(...a) },
      episode: { findUnique: (...a: unknown[]) => m.episodeFindUnique(...a) },
      progress: { findMany: (...a: unknown[]) => m.progressFindMany(...a) },
      event: { create: (...a: unknown[]) => m.eventCreate(...a) },
      $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    },
  };
});

const notifier = vi.fn();
vi.mock("./notification", () => ({
  notifierDeclenchement: (...a: unknown[]) => notifier(...a),
}));
vi.mock("@/lib/webhooks/dispatcher", () => ({
  fireWebhook: vi.fn(async () => {}),
}));

import {
  cleIdempotence,
  normaliserAdresses,
  traiterDeclencheur,
  MAX_DECLENCHEMENTS_PAR_PERSONNE,
} from "./declencheur";

const ctx = { tenantId: "t1", apiKeyId: "k1" };
const saisonFlash = {
  id: "s-flash",
  slug: "remediation-flash",
  title: "Remédiation flash",
  episodes: [
    { id: "e1", slug: "01-microsoft-flash", title: "Le faux Microsoft" },
  ],
};
const alice = {
  id: "u1",
  email: "alice@acme.fr",
  name: "Alice Martin",
  firstName: null,
};
const bob = { id: "u2", email: "bob@acme.fr", name: null, firstName: "Bob" };

function base() {
  return {
    source: "mailinblack",
    logins: [
      "Alice@acme.fr",
      " bob@acme.fr ",
      "inconnu@ailleurs.fr",
      "pas-un-mail",
    ],
    reason:
      "Phishing detecte par mailinblack : sujet=Votre compte Microsoft expire",
  };
}

beforeEach(() => {
  for (const f of Object.values(m)) f.mockReset();
  notifier.mockReset();
  m.triggerFindUnique.mockResolvedValue(null);
  m.triggerCreate.mockResolvedValue({ id: "trig-1" });
  m.triggerUpdate.mockResolvedValue({});
  m.recipientFindMany.mockResolvedValue([]);
  m.recipientCreateMany.mockResolvedValue({ count: 0 });
  m.recipientUpdate.mockResolvedValue({});
  m.progressFindMany.mockResolvedValue([]);
  m.progressCreateMany.mockResolvedValue({ count: 0 });
  m.eventCreate.mockResolvedValue({});
  m.userFindMany.mockResolvedValue([alice, bob]);
  m.saisonFindMany.mockResolvedValue([saisonFlash]);
  notifier.mockResolvedValue(true);
});

describe("normaliserAdresses", () => {
  it("minuscules, sans doublon, sans les chaines qui ne sont pas des adresses", () => {
    expect(
      normaliserAdresses(["A@x.fr", "a@x.fr ", "nope", "", "b@y.org"]),
    ).toEqual(["a@x.fr", "b@y.org"]);
  });
});

describe("cleIdempotence", () => {
  it("prend l'identifiant de la source quand il existe", () => {
    expect(
      cleIdempotence({ ...base(), external_id: " evt-42 " }, ["a@x.fr"]),
    ).toBe("evt-42");
  });
  it("sinon une empreinte stable, insensible a l'ordre des adresses", () => {
    const a = cleIdempotence(base(), ["a@x.fr", "b@x.fr"]);
    const b = cleIdempotence(base(), ["b@x.fr", "a@x.fr"]);
    expect(a).toBe(b);
    expect(a).toMatch(/^fp_[0-9a-f]{64}$/);
  });
  it("change des que le contenu change", () => {
    expect(cleIdempotence(base(), ["a@x.fr"])).not.toBe(
      cleIdempotence({ ...base(), reason: "autre" }, ["a@x.fr"]),
    );
  });
});

describe("traiterDeclencheur", () => {
  it("resout les adresses en utilisateurs du tenant et assigne le premier episode", async () => {
    const r = await traiterDeclencheur(base(), ctx);

    expect(r.status).toBe("assigned");
    expect(r.replay).toBe(false);
    expect(r.trigger_id).toBe("trig-1");
    expect(r.saison?.slug).toBe("remediation-flash");
    expect(r.episode?.id).toBe("e1");
    // 4 logins recus, 3 adresses valides apres normalisation, 2 connues.
    expect(r.recipients).toMatchObject({
      requested: 3,
      matched: 2,
      assigned: 2,
      throttled: 0,
    });

    // La recherche d'utilisateurs est bornee au tenant et aux actifs.
    expect(m.userFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "t1", isActive: true }),
      }),
    );
    // Deux Progress crees, un par personne, en NOT_STARTED.
    const appel = m.progressCreateMany.mock.calls[0][0] as {
      data: { status: string }[];
    };
    expect(appel.data).toHaveLength(2);
    expect(appel.data.every((d) => d.status === "NOT_STARTED")).toBe(true);
    // Les deux notifies, et le compteur remonte.
    expect(notifier).toHaveBeenCalledTimes(2);
    expect(r.recipients.notified).toBe(2);
  });

  it("promeut la saison « juste apres » en tete pour une menace de phishing reelle", async () => {
    await traiterDeclencheur(base(), ctx);
    const where = (
      m.saisonFindMany.mock.calls[0][0] as { where: { slug: { in: string[] } } }
    ).where;
    expect(where.slug.in[0]).toBe("remediation-flash");
    expect(where.slug.in).toContain("phishing");
  });

  it("prefere la suggestion du pont quand elle est un slug valide et existant", async () => {
    m.saisonFindMany.mockResolvedValue([
      { ...saisonFlash, id: "s-ph", slug: "phishing", title: "Phishing" },
      saisonFlash,
    ]);
    const r = await traiterDeclencheur(
      { ...base(), trigger_module: "phishing" },
      ctx,
    );
    expect(r.saison?.slug).toBe("phishing");
  });

  it("ignore une suggestion qui n'est pas publiee et retombe sur la cartographie", async () => {
    const r = await traiterDeclencheur(
      { ...base(), trigger_module: "saison-inexistante" },
      ctx,
    );
    expect(r.saison?.slug).toBe("remediation-flash");
  });

  it("plafonne une personne qui a deja recu cette saison dans la fenetre", async () => {
    m.recipientFindMany.mockResolvedValue([
      { userId: "u1", trigger: { saisonSlug: "remediation-flash" } },
    ]);
    const r = await traiterDeclencheur(base(), ctx);
    expect(r.recipients).toMatchObject({ assigned: 1, throttled: 1 });
    const cree = (
      m.recipientCreateMany.mock.calls[0][0] as {
        data: { userId: string; outcome: string }[];
      }
    ).data;
    expect(cree.find((d) => d.userId === "u1")?.outcome).toBe("throttled");
    expect(cree.find((d) => d.userId === "u2")?.outcome).toBe("assigned");
    expect(notifier).toHaveBeenCalledTimes(1);
  });

  it("plafonne au-dela du nombre total de declenchements par personne", async () => {
    const autres = Array.from(
      { length: MAX_DECLENCHEMENTS_PAR_PERSONNE },
      (_, i) => ({
        userId: "u1",
        trigger: { saisonSlug: `autre-${i}` },
      }),
    );
    m.recipientFindMany.mockResolvedValue(autres);
    const r = await traiterDeclencheur(base(), ctx);
    expect(r.recipients.throttled).toBe(1);
  });

  it("ne reassigne pas un episode deja termine, mais relance un episode en cours", async () => {
    m.progressFindMany.mockResolvedValue([
      { userId: "u1", status: "COMPLETED" },
      { userId: "u2", status: "IN_PROGRESS" },
    ]);
    const r = await traiterDeclencheur(base(), ctx);
    expect(r.recipients).toMatchObject({
      already_done: 1,
      in_progress: 1,
      assigned: 0,
    });
    expect(r.status).toBe("assigned");
    expect(m.progressCreateMany).not.toHaveBeenCalled();
    expect(notifier).toHaveBeenCalledTimes(1);
    expect(notifier.mock.calls[0][0]).toMatchObject({ to: "bob@acme.fr" });
  });

  it("statut already_done quand tout le monde a deja fait l'episode", async () => {
    m.progressFindMany.mockResolvedValue([
      { userId: "u1", status: "COMPLETED" },
      { userId: "u2", status: "COMPLETED" },
    ]);
    const r = await traiterDeclencheur(base(), ctx);
    expect(r.status).toBe("already_done");
    expect(notifier).not.toHaveBeenCalled();
  });

  it("no_recipients quand aucune adresse n'appartient au tenant, et trace quand meme", async () => {
    m.userFindMany.mockResolvedValue([]);
    const r = await traiterDeclencheur(base(), ctx);
    expect(r.status).toBe("no_recipients");
    expect(r.recipients.matched).toBe(0);
    expect(m.triggerCreate).toHaveBeenCalledTimes(1);
    expect(m.saisonFindMany).not.toHaveBeenCalled();
    expect(notifier).not.toHaveBeenCalled();
  });

  it("no_match quand aucune saison publiee ne correspond", async () => {
    m.saisonFindMany.mockResolvedValue([]);
    const r = await traiterDeclencheur({ ...base(), reason: "zzz" }, ctx);
    expect(r.status).toBe("no_match");
    expect(r.saison).toBeNull();
    expect(m.triggerCreate).toHaveBeenCalledTimes(1);
  });

  it("dry_run calcule tout et n'ecrit rien", async () => {
    const r = await traiterDeclencheur({ ...base(), dry_run: true }, ctx);
    expect(r.status).toBe("dry_run");
    expect(r.trigger_id).toBeNull();
    expect(r.recipients).toMatchObject({ matched: 2, assigned: 2 });
    expect(r.saison?.slug).toBe("remediation-flash");
    expect(m.triggerFindUnique).not.toHaveBeenCalled();
    expect(m.triggerCreate).not.toHaveBeenCalled();
    expect(m.progressCreateMany).not.toHaveBeenCalled();
    expect(notifier).not.toHaveBeenCalled();
  });

  it("un rejeu renvoie le resultat precedent sans rien refaire", async () => {
    m.triggerFindUnique.mockResolvedValue({
      id: "trig-0",
      status: "assigned",
      saisonSlug: "remediation-flash",
      episodeId: "e1",
      recipientsRequested: 3,
      recipientsMatched: 2,
      recipientsAssigned: 2,
      recipientsThrottled: 0,
      recipientsNotified: 2,
      recipients: [{ outcome: "assigned" }, { outcome: "assigned" }],
    });
    m.episodeFindUnique.mockResolvedValue({
      id: "e1",
      slug: "01-microsoft-flash",
      title: "Le faux Microsoft",
      saison: { slug: "remediation-flash", title: "Remédiation flash" },
    });
    const r = await traiterDeclencheur(base(), ctx);
    expect(r.replay).toBe(true);
    expect(r.trigger_id).toBe("trig-0");
    expect(r.recipients.notified).toBe(2);
    expect(m.userFindMany).not.toHaveBeenCalled();
    expect(m.triggerCreate).not.toHaveBeenCalled();
    expect(notifier).not.toHaveBeenCalled();
  });

  it("un echec d'envoi ne fait pas echouer l'assignation", async () => {
    notifier.mockResolvedValue(false);
    const r = await traiterDeclencheur(base(), ctx);
    expect(r.status).toBe("assigned");
    expect(r.recipients.assigned).toBe(2);
    expect(r.recipients.notified).toBe(0);
    expect(m.triggerUpdate).not.toHaveBeenCalled();
  });

  it("l'Event trace des compteurs, jamais d'adresse", async () => {
    await traiterDeclencheur(base(), ctx);
    const payload = JSON.stringify(
      (m.eventCreate.mock.calls[0][0] as { data: { payload: unknown } }).data
        .payload,
    );
    expect(payload).not.toContain("@");
    expect(payload).toContain("remediation-flash");
  });
});
