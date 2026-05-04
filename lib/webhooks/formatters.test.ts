// Tests des formatters Slack/Teams.
// Critique : un escape oublié = injection markdown chez Slack/Teams.

import { describe, it, expect } from "vitest";
import { formatSlackBlocks, formatTeamsCard } from "./formatters";

describe("formatSlackBlocks", () => {
  it("retourne un objet avec text + blocks", () => {
    const out = formatSlackBlocks(
      "user.invited",
      "Utilisateur invité",
      "ACME",
      { email: "test@x.fr" },
    );
    expect(out.text).toContain("Utilisateur invité");
    expect(out.text).toContain("ACME");
    expect(Array.isArray(out.blocks)).toBe(true);
    expect(out.blocks.length).toBeGreaterThan(0);
  });

  it("inclut un block header avec emoji 🛡️", () => {
    const out = formatSlackBlocks("user.invited", "Test", "X", {});
    const header = out.blocks.find((b: any) => b.type === "header");
    expect(header).toBeDefined();
    expect((header as any).text.text).toContain("🛡️");
  });

  it("inclut un bouton vers le dashboard", () => {
    const out = formatSlackBlocks("user.invited", "Test", "X", {});
    const actions = out.blocks.find((b: any) => b.type === "actions");
    expect(actions).toBeDefined();
    expect(((actions as any).elements[0] as any).url).toContain(
      "/admin/business",
    );
  });

  it("limite les fields à 8 maximum (raisonnable pour Slack)", () => {
    const data: Record<string, unknown> = {};
    for (let i = 0; i < 20; i++) data[`field${i}`] = `value${i}`;
    const out = formatSlackBlocks("user.invited", "Test", "X", data);
    const section = out.blocks.find(
      (b: any) => b.type === "section" && b.fields,
    ) as any;
    expect(section?.fields.length).toBeLessThanOrEqual(8);
  });

  it("ignore les clés qui commencent par underscore", () => {
    const out = formatSlackBlocks("user.invited", "Test", "X", {
      visible: "yes",
      _internal: "should be hidden",
    });
    const json = JSON.stringify(out);
    // humanizeKey met une majuscule sur la 1re lettre → "Visible"
    expect(json.toLowerCase()).toContain("visible");
    expect(json).not.toContain("should be hidden");
  });

  it("escape les chevrons (anti-injection markdown Slack)", () => {
    const out = formatSlackBlocks("phishing.reported", "Phishing", "ACME", {
      userName: "Alice <script>",
      fromAddress: "evil@x.fr",
      subject: "Hi",
    });
    const json = JSON.stringify(out);
    expect(json).not.toContain("<script>");
    expect(json).toContain("&lt;script&gt;");
  });

  it("génère un summary contextuel pour phishing.campaign_completed", () => {
    const out = formatSlackBlocks(
      "phishing.campaign_completed",
      "Campagne terminée",
      "ACME",
      {
        campaignTitle: "Q1 2026",
        sentTo: 100,
        clicked: 12,
        reported: 67,
        reportRate: 0.67,
      },
    );
    const json = JSON.stringify(out);
    expect(json).toContain("100");
    expect(json).toContain("67");
    expect(json).toContain("Q1 2026");
  });
});

describe("formatTeamsCard", () => {
  it("est conforme au schéma MessageCard", () => {
    const out = formatTeamsCard("user.invited", "Utilisateur invité", "ACME", {
      email: "test@x.fr",
    }) as Record<string, unknown>;
    expect(out["@type"]).toBe("MessageCard");
    expect(out["@context"]).toBe("https://schema.org/extensions");
    expect(out.themeColor).toMatch(/^[0-9A-F]{6}$/i);
  });

  it("inclut un titre avec emoji et label", () => {
    const out = formatTeamsCard(
      "user.invited",
      "Mon évènement",
      "ACME",
      {},
    ) as Record<string, unknown>;
    expect(out.title).toContain("Mon évènement");
  });

  it("inclut un bouton OpenUri vers le dashboard", () => {
    const out = formatTeamsCard("user.invited", "Test", "X", {}) as Record<
      string,
      unknown
    >;
    const actions = out.potentialAction as Array<{
      targets?: { uri?: string }[];
    }>;
    expect(actions[0].targets?.[0].uri).toContain("/admin/business");
  });

  it("convertit les data en facts (name/value)", () => {
    const out = formatTeamsCard("user.invited", "Test", "X", {
      email: "alice@x.fr",
      invitedBy: "Bob",
    }) as Record<string, unknown>;
    const sections = out.sections as Array<{
      facts?: { name: string; value: string }[];
    }>;
    const facts = sections[0].facts ?? [];
    expect(facts.length).toBeGreaterThan(0);
    const emailFact = facts.find((f) => /email/i.test(f.name));
    expect(emailFact?.value).toBe("alice@x.fr");
  });

  it("humanise les keys camelCase et snake_case", () => {
    const out = formatTeamsCard("user.invited", "Test", "X", {
      campaignTitle: "Q1",
      report_rate: 0.5,
    }) as Record<string, unknown>;
    const sections = out.sections as Array<{ facts?: { name: string }[] }>;
    const names = sections[0].facts?.map((f) => f.name) ?? [];
    expect(names.some((n) => n === "Campaign Title")).toBe(true);
    expect(names.some((n) => n === "Report rate")).toBe(true);
  });
});
