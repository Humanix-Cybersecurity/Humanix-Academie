// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tests des campagnes à diffusion manuelle — smishing et vishing (#744).
//
// Deux risques propres à ces canaux :
//   1. La saisie manuelle du résultat : elle ne doit exister QUE pour le
//      vishing. L'autoriser sur un canal tracé permettrait de maquiller
//      une mesure réelle.
//   2. L'isolation tenant : le résultat est désigné par un id opaque, un
//      admin ne doit pas pouvoir toucher celui d'un autre tenant.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    phishingCampaign: { create: vi.fn() },
    phishingResult: {
      createMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    event: { create: vi.fn() },
  },
}));

vi.mock("@/lib/crypto", () => ({
  generateTrackingToken: vi.fn(() => "tok_deterministe"),
}));

import {
  launchManualCampaign,
  recordManualOutcome,
  MANUAL_OUTCOMES,
  MANUAL_OUTCOME_LABELS,
} from "./manual-launch";
import { db } from "@/lib/db";

const dbMock = db as unknown as {
  phishingCampaign: { create: ReturnType<typeof vi.fn> };
  phishingResult: {
    createMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  event: { create: ReturnType<typeof vi.fn> };
};

const BASE = {
  tenantId: "t1",
  title: "Faux livreur",
  templateId: "fake-livreur",
  body: "Votre colis est bloqué, régularisez : https://…",
  targets: [{ id: "u1" }, { id: "u2" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.phishingCampaign.create.mockResolvedValue({ id: "camp1" });
  dbMock.phishingResult.createMany.mockResolvedValue({ count: 2 });
  dbMock.event.create.mockResolvedValue({});
});

describe("launchManualCampaign — garde-fous", () => {
  it("refuse une campagne sans cible", async () => {
    const res = await launchManualCampaign({
      ...BASE,
      channel: "SMS",
      targets: [],
    });
    expect(res).toMatchObject({ ok: false, error: "no_targets" });
    expect(dbMock.phishingCampaign.create).not.toHaveBeenCalled();
  });

  it("refuse un corps vide (script non généré)", async () => {
    const res = await launchManualCampaign({
      ...BASE,
      channel: "SMS",
      body: "   ",
    });
    expect(res).toMatchObject({ ok: false, error: "invalid_body" });
    expect(dbMock.phishingCampaign.create).not.toHaveBeenCalled();
  });

  it("refuse un ciblage manifestement erroné (garde de volume)", async () => {
    const res = await launchManualCampaign({
      ...BASE,
      channel: "SMS",
      targets: Array.from({ length: 501 }, (_, i) => ({ id: `u${i}` })),
    });
    expect(res.ok).toBe(false);
    expect(dbMock.phishingCampaign.create).not.toHaveBeenCalled();
  });
});

describe("launchManualCampaign — SMS", () => {
  it("crée la campagne sur le canal SMS avec le corps du message", async () => {
    await launchManualCampaign({ ...BASE, channel: "SMS" });
    const { data } = dbMock.phishingCampaign.create.mock.calls[0][0];
    expect(data.channel).toBe("SMS");
    expect(data.smsBody).toBe(BASE.body);
    expect(data.sentAt).toBeInstanceOf(Date);
  });

  it("crée un résultat par cible, au statut SENT", async () => {
    await launchManualCampaign({ ...BASE, channel: "SMS" });
    const { data } = dbMock.phishingResult.createMany.mock.calls[0][0];
    expect(data).toHaveLength(2);
    expect(data.every((r: { status: string }) => r.status === "SENT")).toBe(
      true,
    );
    expect(data.map((r: { userId: string }) => r.userId)).toEqual(["u1", "u2"]);
  });

  it("retourne un lien tracké par cible", async () => {
    const res = await launchManualCampaign({ ...BASE, channel: "SMS" });
    expect(res.ok && res.trackedLinks).toHaveLength(2);
  });
});

describe("launchManualCampaign — VOICE", () => {
  it("ne retourne AUCUN lien : il n'y a rien à cliquer dans un appel", async () => {
    const res = await launchManualCampaign({ ...BASE, channel: "VOICE" });
    expect(res.ok && res.trackedLinks).toEqual([]);
  });

  it("crée quand même les résultats, pour alimenter les indicateurs", async () => {
    // C'est tout l'objet de #744 : sans PhishingResult, un exercice
    // vishing ne compte dans aucun riskScore ni export.
    const res = await launchManualCampaign({ ...BASE, channel: "VOICE" });
    expect(res).toMatchObject({ ok: true, targets: 2 });
    expect(dbMock.phishingResult.createMany).toHaveBeenCalled();
  });

  it("trace un événement distinct par canal", async () => {
    await launchManualCampaign({ ...BASE, channel: "VOICE" });
    expect(dbMock.event.create.mock.calls[0][0].data.type).toBe(
      "vishing_campaign_launched",
    );
    vi.clearAllMocks();
    dbMock.phishingCampaign.create.mockResolvedValue({ id: "camp2" });
    dbMock.phishingResult.createMany.mockResolvedValue({ count: 2 });
    dbMock.event.create.mockResolvedValue({});
    await launchManualCampaign({ ...BASE, channel: "SMS" });
    expect(dbMock.event.create.mock.calls[0][0].data.type).toBe(
      "smishing_campaign_launched",
    );
  });
});

describe("recordManualOutcome — saisie de l'issue d'un appel", () => {
  it("refuse un résultat d'un AUTRE tenant", async () => {
    // findFirst filtre sur campaign.tenantId : un id deviné ne suffit pas.
    dbMock.phishingResult.findFirst.mockResolvedValue(null);

    const res = await recordManualOutcome({
      tenantId: "t1",
      resultId: "resultat-d-un-autre-tenant",
      outcome: "REPORTED",
    });
    expect(res).toEqual({ ok: false, error: "not_found" });
    expect(dbMock.phishingResult.update).not.toHaveBeenCalled();

    const { where } = dbMock.phishingResult.findFirst.mock.calls[0][0];
    expect(where.campaign).toEqual({ tenantId: "t1" });
  });

  it("refuse la saisie manuelle sur un canal tracé automatiquement", async () => {
    // Autoriser une saisie sur un canal mesuré permettrait de maquiller
    // un résultat réel — c'est la garde qui compte ici.
    dbMock.phishingResult.findFirst.mockResolvedValue({
      id: "r1",
      campaign: { channel: "SMS" },
    });

    const res = await recordManualOutcome({
      tenantId: "t1",
      resultId: "r1",
      outcome: "SUBMITTED",
    });
    expect(res).toEqual({ ok: false, error: "not_manual_channel" });
    expect(dbMock.phishingResult.update).not.toHaveBeenCalled();
  });

  it("enregistre l'issue sur un appel vishing", async () => {
    dbMock.phishingResult.findFirst.mockResolvedValue({
      id: "r1",
      campaign: { channel: "VOICE" },
    });
    dbMock.phishingResult.update.mockResolvedValue({});

    const res = await recordManualOutcome({
      tenantId: "t1",
      resultId: "r1",
      outcome: "SUBMITTED",
    });
    expect(res.ok).toBe(true);
    const { data } = dbMock.phishingResult.update.mock.calls[0][0];
    expect(data.status).toBe("SUBMITTED");
    expect(data.clickedAt).toBeInstanceOf(Date);
  });

  it("horodate le signalement quand la cible a raccroché", async () => {
    dbMock.phishingResult.findFirst.mockResolvedValue({
      id: "r1",
      campaign: { channel: "VOICE" },
    });
    dbMock.phishingResult.update.mockResolvedValue({});

    await recordManualOutcome({
      tenantId: "t1",
      resultId: "r1",
      outcome: "REPORTED",
    });
    const { data } = dbMock.phishingResult.update.mock.calls[0][0];
    expect(data.reportedAt).toBeInstanceOf(Date);
    expect(data.clickedAt).toBeUndefined();
  });

  it("libelle chaque issue proposée à l'appelant", () => {
    for (const o of MANUAL_OUTCOMES) {
      expect(MANUAL_OUTCOME_LABELS[o], o).toBeTruthy();
    }
  });
});
