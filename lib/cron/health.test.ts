// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Tests du verdict de santé des crons (#749).
//
// Le risque de cette page, c'est de mentir dans un sens ou dans l'autre :
// afficher « OK » sur un cron mort (le bug qu'on veut justement voir), ou
// crier au loup à chaque décalage de quelques minutes et se faire ignorer.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeCronStatus, sortByUrgency, STALE_FACTOR } from "./health";
import { CRON_REGISTRY, CRON_BY_SLUG } from "./registry";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NOW = new Date("2026-08-09T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600 * 1000);

describe("computeCronStatus", () => {
  it("signale « never » quand aucune exécution n'a jamais été enregistrée", () => {
    // C'EST le cas d'un cron oublié dans l'ordonnanceur : il n'échoue pas,
    // il n'existe simplement pas. Sans ça, la page ne sert à rien.
    expect(
      computeCronStatus({
        expectedEveryHours: 24,
        lastRunAt: null,
        lastStatus: null,
        now: NOW,
      }),
    ).toEqual({ status: "never", hoursSinceLastRun: null });
  });

  it("est OK quand le dernier passage est dans les temps", () => {
    const r = computeCronStatus({
      expectedEveryHours: 24,
      lastRunAt: hoursAgo(3),
      lastStatus: "ok",
      now: NOW,
    });
    expect(r.status).toBe("ok");
    expect(r.hoursSinceLastRun).toBeCloseTo(3);
  });

  it("tolère un retard modéré sans crier au loup", () => {
    // 30 h pour un cron quotidien : en retard sur le papier, mais sous le
    // facteur de tolérance. Rester silencieux, sinon la page devient du bruit.
    expect(
      computeCronStatus({
        expectedEveryHours: 24,
        lastRunAt: hoursAgo(30),
        lastStatus: "ok",
        now: NOW,
      }).status,
    ).toBe("ok");
  });

  it("bascule en « late » au-delà du facteur de tolérance", () => {
    expect(
      computeCronStatus({
        expectedEveryHours: 24,
        lastRunAt: hoursAgo(24 * STALE_FACTOR + 1),
        lastStatus: "ok",
        now: NOW,
      }).status,
    ).toBe("late");
  });

  it("applique le seuil relatif à la cadence, pas une constante", () => {
    // 4 h de silence : anodin pour un cron quotidien, alarmant pour un horaire.
    const commun = { lastRunAt: hoursAgo(4), lastStatus: "ok", now: NOW };
    expect(
      computeCronStatus({ ...commun, expectedEveryHours: 24 }).status,
    ).toBe("ok");
    expect(computeCronStatus({ ...commun, expectedEveryHours: 1 }).status).toBe(
      "late",
    );
  });

  it("fait primer l'erreur sur le retard", () => {
    // Un cron qui vient de planter est plus actionnable qu'un cron en retard.
    expect(
      computeCronStatus({
        expectedEveryHours: 24,
        lastRunAt: hoursAgo(1),
        lastStatus: "error",
        now: NOW,
      }).status,
    ).toBe("error");
  });

  it("reste en erreur même si l'exécution est ancienne", () => {
    expect(
      computeCronStatus({
        expectedEveryHours: 1,
        lastRunAt: hoursAgo(500),
        lastStatus: "error",
        now: NOW,
      }).status,
    ).toBe("error");
  });
});

describe("sortByUrgency", () => {
  const row = (over: Record<string, unknown>) =>
    ({
      slug: "x",
      label: "X",
      expectedEveryHours: 24,
      criticality: "normal",
      description: "",
      status: "ok",
      lastRunAt: null,
      lastDurationMs: null,
      lastResult: null,
      lastError: null,
      hoursSinceLastRun: null,
      errorsLast7d: 0,
      ...over,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

  it("remonte ce qui demande une action, erreurs en tête", () => {
    const sorted = sortByUrgency([
      row({ slug: "a", status: "ok" }),
      row({ slug: "b", status: "late" }),
      row({ slug: "c", status: "error" }),
      row({ slug: "d", status: "never" }),
    ]);
    expect(sorted.map((r) => r.status)).toEqual([
      "error",
      "never",
      "late",
      "ok",
    ]);
  });

  it("à statut égal, place les tâches critiques devant", () => {
    const sorted = sortByUrgency([
      row({ slug: "a", status: "late", criticality: "normal", label: "A" }),
      row({ slug: "b", status: "late", criticality: "high", label: "B" }),
    ]);
    expect(sorted.map((r) => r.slug)).toEqual(["b", "a"]);
  });
});

describe("registre des crons", () => {
  it("n'a ni slug dupliqué ni cadence absurde", () => {
    const slugs = CRON_REGISTRY.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const c of CRON_REGISTRY) {
      expect(c.expectedEveryHours, c.slug).toBeGreaterThan(0);
      expect(c.label.length, c.slug).toBeGreaterThan(0);
    }
  });

  it("indexe chaque cron par son slug", () => {
    for (const c of CRON_REGISTRY) {
      expect(CRON_BY_SLUG[c.slug]).toBe(c);
    }
  });

  it("couvre exposure-scan, l'endpoint qui n'était planifié nulle part", () => {
    // Garde-fou de non-régression sur la trouvaille de #749.
    expect(CRON_BY_SLUG["exposure-scan"]).toBeDefined();
  });
});

// Le test qui aurait attrapé l'oubli : `exposure-scan` existait sur disque
// depuis sa création, sans être déclaré dans docs/CRON.md ni dans Ofelia.
// Il n'a donc jamais tourné, en silence. On ancre les trois surfaces sur la
// réalité du système de fichiers.
describe("cohérence registre ↔ endpoints réels", () => {
  const CRON_DIR = path.join(__dirname, "..", "..", "app", "api", "cron");

  const endpointsOnDisk = fs
    .readdirSync(CRON_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  it("déclare exactement les endpoints présents dans app/api/cron/", () => {
    expect(CRON_REGISTRY.map((c) => c.slug).sort()).toEqual(endpointsOnDisk);
  });

  it("planifie chaque endpoint dans infra/ofelia/config.ini", () => {
    const ofelia = fs.readFileSync(
      path.join(__dirname, "..", "..", "infra", "ofelia", "config.ini"),
      "utf8",
    );
    const nonPlanifies = endpointsOnDisk.filter(
      (slug) => !ofelia.includes(`cron-runner.sh ${slug}`),
    );
    expect(nonPlanifies, "endpoints jamais déclenchés").toEqual([]);
  });

  it("documente chaque endpoint dans docs/CRON.md", () => {
    const doc = fs.readFileSync(
      path.join(__dirname, "..", "..", "docs", "CRON.md"),
      "utf8",
    );
    const nonDocumentes = endpointsOnDisk.filter(
      (slug) => !doc.includes(`/api/cron/${slug}`),
    );
    expect(nonDocumentes, "endpoints non documentés").toEqual([]);
  });
});
