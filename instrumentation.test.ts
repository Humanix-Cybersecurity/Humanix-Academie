// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Le battement de coeur porte la regle « homme mort » de
// docs/ALERTES-GRAFANA.md. S'il cesse d'etre emis, la surveillance devient
// aveugle SANS QUE RIEN NE LE SIGNALE -- exactement le mode de defaillance
// qu'il est cense rendre visible. D'ou ces tests.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { register } from "./instrumentation";

let warn: ReturnType<typeof vi.spyOn>;
const runtimeInitial = process.env.NEXT_RUNTIME;

beforeEach(() => {
  vi.useFakeTimers();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  warn.mockRestore();
  process.env.NEXT_RUNTIME = runtimeInitial;
});

describe("battement de coeur", () => {
  it("bat immediatement, sans attendre la premiere periode", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    await register();

    // Sans ce battement initial, un redemarrage laisserait un trou de 5 min
    // pendant lequel la regle « homme mort » se declencherait a tort.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.parse(warn.mock.calls[0][0] as string)).toMatchObject({
      canal: "securite",
      action: "HEARTBEAT",
    });
  });

  it("bat toutes les 5 minutes", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    await register();

    vi.advanceTimersByTime(15 * 60 * 1000);

    // 1 initial + 3 par quart d'heure : c'est le compte sur lequel le seuil
    // de la regle 5 est calibre.
    expect(warn).toHaveBeenCalledTimes(4);
  });

  it("ne bat PAS hors du runtime nodejs", async () => {
    process.env.NEXT_RUNTIME = "edge";
    await register();

    expect(warn).not.toHaveBeenCalled();
  });
});
