// SPDX-License-Identifier: AGPL-3.0-or-later
// Les composants client qui affichent une date venue du serveur doivent
// rendre le meme HTML sur le serveur (UTC) et dans le navigateur (Paris).
// Meme principe que app/profil/securite/hydratation.test.tsx, pour les
// composants reperes par le grep du 2026-11-02. CisoSyncForm, trop lourd a
// instancier ici, est tenu par la regle de components/dates-client.test.ts.
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import AnecdoteAdminTable from "@/components/AnecdoteAdminTable";
import ApiKeysManager from "@/components/ApiKeysManager";
import ExternalAdminRow from "@/components/superadmin/ExternalAdminRow";
import WebhookTable from "@/components/WebhookTable";

// Hors de Next, les server actions et <Link> sont remplaces par des coquilles.
vi.mock("@/app/admin/api-keys/actions", () => ({
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
  deleteApiKey: vi.fn(),
}));
vi.mock("@/app/admin/anecdotes/actions", () => ({
  dispatchNow: vi.fn(),
  deleteAnecdote: vi.fn(),
}));
vi.mock("@/app/superadmin/tenants/[id]/admins/actions", () => ({
  revokeExternalAdminMembership: vi.fn(),
  updateExternalAdminMembershipRole: vi.fn(),
}));
vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: (p: { href: string; children?: React.ReactNode }) =>
      React.createElement("a", { href: p.href }, p.children),
  };
});

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

// 13 h 12 UTC : une autre heure a Paris. 23 h 30 UTC : deja le lendemain.
const rien = async () => {};

const webhooks = (
  <WebhookTable
    webhooks={[
      {
        id: "w1",
        label: "Alertes Slack",
        type: "SLACK",
        urlMasked: "https://hooks.slack.com/***",
        events: ["phishing.clicked"],
        isActive: true,
        successCount: 12,
        failureCount: 0,
        lastFiredAt: "2026-10-31T13:12:52.000Z",
        lastError: null,
      },
    ]}
    onDeleteAction={rien}
    onTestAction={rien}
    onToggleAction={rien}
  />
);

const clesApi = (
  <ApiKeysManager
    keys={[
      {
        id: "k1",
        name: "SIEM",
        prefix: "hx_live_ab12",
        scopes: "read:events",
        isActive: true,
        lastUsedAt: "2026-10-31T23:30:00.000Z",
        expiresAt: "2026-12-31T23:30:00.000Z",
        createdAt: "2026-01-15T10:00:00.000Z",
      },
    ]}
  />
);

const anecdotes = (
  <AnecdoteAdminTable
    anecdotes={[
      {
        id: "a1",
        slug: "fraude-au-president",
        title: "Fraude au président",
        category: "FRAUDE",
        isActive: true,
        publishedAt: "2026-10-31T23:30:00.000Z",
        scheduledFor: null,
        sentCount: 3,
        incidentDate: "2026-06-30T22:30:00.000Z",
      },
    ]}
  />
);

const adminExterne = (
  <ExternalAdminRow
    tenantId="t1"
    entry={{
      userId: "u1",
      email: "nicolas@exemple.fr",
      name: "Nicolas",
      effectiveRole: "ADMIN",
      source: "external",
      homeTenantId: "t0",
      homeTenantName: "Alsace Micro Services",
      grantedBy: "florian",
      grantedAt: new Date("2026-10-31T23:30:00.000Z"),
      isActive: true,
    }}
    roleLabel={{
      ADMIN: { label: "Admin", emoji: "👔" },
      RSSI: { label: "RSSI", emoji: "🛡️" },
      MANAGER: { label: "Manager", emoji: "📋" },
    }}
  />
);

describe("composants d'administration : serveur en UTC, navigateur a Paris", () => {
  it.each([
    ["WebhookTable", webhooks, "Dernier : 31/10/2026 14:12:52"],
    ["ApiKeysManager", clesApi, "01/11/2026"],
    ["AnecdoteAdminTable", anecdotes, "01/07/2026"],
    ["ExternalAdminRow", adminExterne, "Accordé le 01/11/2026"],
  ])("%s rend le meme HTML des deux cotes", (_nom, element, attendu) => {
    const serveur = renduDans("UTC", element);
    expect(serveur).toBe(renduDans("Europe/Paris", element));
    expect(serveur).toContain(attendu);
  });

  it("ApiKeysManager et AnecdoteAdminTable datent a Paris chaque colonne", () => {
    expect(renduDans("UTC", clesApi)).toContain("01/01/2027");
    expect(renduDans("UTC", anecdotes)).toContain("01/11/2026");
  });
});
