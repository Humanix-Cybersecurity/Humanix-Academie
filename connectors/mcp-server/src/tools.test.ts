import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callTool, TOOLS } from "./tools.js";
import * as api from "./api.js";

const cfg: api.HumanixConfig = {
  baseUrl: "https://test.humanix.fr",
  apiKey: "hk_test_xxx",
};

describe("TOOLS catalog", () => {
  it("expose au moins 4 outils nommes humanix_*", () => {
    // Le catalogue grandit avec les versions. On valide juste qu'il y
    // a au moins le coeur historique (4 outils) et que TOUS respectent
    // les invariants de nommage / schema.
    expect(TOOLS.length).toBeGreaterThanOrEqual(4);
    for (const t of TOOLS) {
      expect(t.name.startsWith("humanix_")).toBe(true);
      expect(t.description.length).toBeGreaterThan(20);
      expect(t.inputSchema.type).toBe("object");
    }
  });

  it("interdit les proprietes additionnelles dans les arguments", () => {
    for (const t of TOOLS) {
      expect(t.inputSchema.additionalProperties).toBe(false);
    }
  });

  it("declare des descriptions distinctes par outil", () => {
    const names = new Set(TOOLS.map((t) => t.name));
    expect(names.size).toBe(TOOLS.length);
  });
});

describe("callTool — validation et dispatch", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchEvidenceExport").mockResolvedValue({ stub: "evidence" });
    vi.spyOn(api, "fetchUsersAtRisk").mockResolvedValue({ stub: "users" });
    vi.spyOn(api, "fetchComplianceScore").mockResolvedValue({ stub: "score" });
    vi.spyOn(api, "fetchRecentCampaigns").mockResolvedValue({ stub: "campaigns" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejette un nom d'outil inconnu", async () => {
    const r = await callTool("evil_drop_tables", {}, cfg);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("inconnu");
  });

  it("rejette un framework invalide", async () => {
    const r = await callTool(
      "humanix_evidence_export",
      { framework: "MagicFramework" },
      cfg,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("framework invalide");
  });

  it("rejette un format invalide", async () => {
    const r = await callTool(
      "humanix_evidence_export",
      { framework: "NIS2", format: "csv-evil" },
      cfg,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("format invalide");
  });

  it("accepte un evidence-export valide avec format par defaut", async () => {
    const r = await callTool(
      "humanix_evidence_export",
      { framework: "NIS2" },
      cfg,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual({ stub: "evidence" });
    expect(api.fetchEvidenceExport).toHaveBeenCalledWith(cfg, "NIS2", "humanix-v1");
  });

  it("accepte un evidence-export OSCAL", async () => {
    const r = await callTool(
      "humanix_evidence_export",
      { framework: "ISO27001:2022", format: "oscal-v1" },
      cfg,
    );
    expect(r.ok).toBe(true);
    expect(api.fetchEvidenceExport).toHaveBeenCalledWith(
      cfg,
      "ISO27001:2022",
      "oscal-v1",
    );
  });

  it("rejette un limit hors plage pour users_at_risk", async () => {
    const r1 = await callTool("humanix_users_at_risk", { limit: 0 }, cfg);
    expect(r1.ok).toBe(false);

    const r2 = await callTool("humanix_users_at_risk", { limit: 999 }, cfg);
    expect(r2.ok).toBe(false);

    const r3 = await callTool("humanix_users_at_risk", { limit: 1.5 }, cfg);
    expect(r3.ok).toBe(false);
  });

  it("accepte users_at_risk avec limit valide", async () => {
    const r = await callTool("humanix_users_at_risk", { limit: 25 }, cfg);
    expect(r.ok).toBe(true);
    expect(api.fetchUsersAtRisk).toHaveBeenCalledWith(cfg, 25);
  });

  it("applique le defaut limit=10 si absent", async () => {
    const r = await callTool("humanix_users_at_risk", {}, cfg);
    expect(r.ok).toBe(true);
    expect(api.fetchUsersAtRisk).toHaveBeenCalledWith(cfg, 10);
  });

  it("rejette des days hors plage pour recent_campaigns", async () => {
    expect((await callTool("humanix_recent_campaigns", { days: 0 }, cfg)).ok).toBe(false);
    expect((await callTool("humanix_recent_campaigns", { days: 400 }, cfg)).ok).toBe(false);
    expect((await callTool("humanix_recent_campaigns", { days: "abc" }, cfg)).ok).toBe(false);
  });

  it("propage les erreurs HumanixApiError avec leur status", async () => {
    vi.mocked(api.fetchComplianceScore).mockRejectedValueOnce(
      new api.HumanixApiError("Forbidden", 403, "Plan trop bas"),
    );
    const r = await callTool(
      "humanix_compliance_score",
      { framework: "NIS2" },
      cfg,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe(403);
      expect(r.error).toBe("Forbidden");
    }
  });

  it("propage les erreurs Error simples (timeout, DNS...)", async () => {
    vi.mocked(api.fetchEvidenceExport).mockRejectedValueOnce(
      new Error("ENOTFOUND"),
    );
    const r = await callTool(
      "humanix_evidence_export",
      { framework: "RGPD" },
      cfg,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("ENOTFOUND");
  });
});
