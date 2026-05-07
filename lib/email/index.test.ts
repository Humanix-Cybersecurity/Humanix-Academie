// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests pour lib/email/index.ts - facade provider-agnostique.
//
// On verifie ici :
//   - DEMO_MODE coupe court tout envoi reel (renvoie reason="demo_mode")
//   - isEmailConfigured() reflete bien la configuration provider
//   - sendEmail delegue au provider Scaleway TEM dans le cas standard
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { mockSendViaScalewayTem, mockIsScalewayTemConfigured } = vi.hoisted(
  () => ({
    mockSendViaScalewayTem: vi.fn(),
    mockIsScalewayTemConfigured: vi.fn(),
  }),
);

vi.mock("./scaleway-tem", () => ({
  sendViaScalewayTem: mockSendViaScalewayTem,
  isScalewayTemConfigured: mockIsScalewayTemConfigured,
}));

import { sendEmail, isEmailConfigured } from "./index";

let envSnapshot: NodeJS.ProcessEnv;
beforeEach(() => {
  envSnapshot = { ...process.env };
  mockSendViaScalewayTem.mockReset();
  mockIsScalewayTemConfigured.mockReset();
});
afterEach(() => {
  process.env = envSnapshot;
});

describe("isEmailConfigured", () => {
  it("retourne false en DEMO_MODE meme si Scaleway est configure", () => {
    process.env.DEMO_MODE = "true";
    mockIsScalewayTemConfigured.mockReturnValue(true);
    expect(isEmailConfigured()).toBe(false);
  });

  it("retourne true si Scaleway TEM est configure et DEMO_MODE off", () => {
    delete process.env.DEMO_MODE;
    mockIsScalewayTemConfigured.mockReturnValue(true);
    expect(isEmailConfigured()).toBe(true);
  });

  it("retourne false si Scaleway TEM n'est pas configure", () => {
    delete process.env.DEMO_MODE;
    mockIsScalewayTemConfigured.mockReturnValue(false);
    expect(isEmailConfigured()).toBe(false);
  });
});

describe("sendEmail - DEMO_MODE", () => {
  it("court-circuite en DEMO_MODE (pas d'envoi reel)", async () => {
    process.env.DEMO_MODE = "true";

    const result = await sendEmail({
      to: "user@x.fr",
      subject: "Hi",
      html: "<p>...</p>",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("demo_mode");
    expect(mockSendViaScalewayTem).not.toHaveBeenCalled();
  });
});

describe("sendEmail - delegue a Scaleway TEM", () => {
  it("appelle sendViaScalewayTem avec les params tels quels", async () => {
    delete process.env.DEMO_MODE;
    mockSendViaScalewayTem.mockResolvedValue({
      ok: true,
      providerMessageId: "msg-123",
    });

    const params = {
      to: "user@x.fr",
      subject: "Bienvenue",
      html: "<p>Bonjour</p>",
      from: "no-reply@humanix.fr",
      fromName: "Humanix",
      headers: { "List-Unsubscribe": "<mailto:unsub@x.fr>" },
    };
    const result = await sendEmail(params);

    expect(mockSendViaScalewayTem).toHaveBeenCalledTimes(1);
    expect(mockSendViaScalewayTem).toHaveBeenCalledWith(params);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.providerMessageId).toBe("msg-123");
  });

  it("propage les echecs provider sans throw", async () => {
    delete process.env.DEMO_MODE;
    mockSendViaScalewayTem.mockResolvedValue({
      ok: false,
      reason: "scaleway_tem_not_configured",
    });

    const result = await sendEmail({
      to: "user@x.fr",
      subject: "Test",
      text: "plain",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("scaleway_tem_not_configured");
  });

  it("supporte un tableau de destinataires (broadcast)", async () => {
    delete process.env.DEMO_MODE;
    mockSendViaScalewayTem.mockResolvedValue({
      ok: true,
      providerMessageId: null,
    });

    await sendEmail({
      to: ["a@x.fr", "b@x.fr", "c@x.fr"],
      subject: "Newsletter",
      text: "Hello team",
    });

    expect(mockSendViaScalewayTem).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["a@x.fr", "b@x.fr", "c@x.fr"],
      }),
    );
  });
});
