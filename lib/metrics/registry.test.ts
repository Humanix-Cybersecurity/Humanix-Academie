// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import {
  getMetrics,
  recordCourriel,
  recordEpisodeTermine,
  recordHexCaracteres,
  recordHexMessage,
} from "./registry";

async function texte(): Promise<string> {
  return getMetrics().registry.metrics();
}

describe("métriques produit et IA", () => {
  it("compte les messages Hex par plan, modèle et résultat", async () => {
    recordHexMessage({
      plan: "starter",
      modele: "mistral-small-latest",
      resultat: "ok",
    });
    recordHexMessage({
      plan: "starter",
      modele: "mistral-small-latest",
      resultat: "ok",
    });
    recordHexMessage({
      plan: "pro",
      modele: "mistral-large-latest",
      resultat: "quota_jour",
    });
    const t = await texte();
    expect(t).toMatch(
      /humanix_hex_messages_total\{[^}]*plan="starter"[^}]*resultat="ok"[^}]*\} 2/,
    );
    expect(t).toMatch(
      /humanix_hex_messages_total\{[^}]*plan="pro"[^}]*resultat="quota_jour"[^}]*\} 1/,
    );
  });

  it("additionne les caractères par sens et ignore les valeurs vides", async () => {
    recordHexCaracteres({ plan: "pro", sens: "entree", nombre: 1200 });
    recordHexCaracteres({ plan: "pro", sens: "entree", nombre: 300 });
    recordHexCaracteres({ plan: "pro", sens: "sortie", nombre: 0 });
    recordHexCaracteres({ plan: "pro", sens: "sortie", nombre: Number.NaN });
    const t = await texte();
    expect(t).toMatch(
      /humanix_hex_caracteres_total\{[^}]*plan="pro"[^}]*sens="entree"[^}]*\} 1500/,
    );
    expect(t).not.toMatch(/sens="sortie"/);
  });

  it("compte les courriels par voie et résultat, et les épisodes terminés", async () => {
    recordCourriel({ voie: "smtp_tenant", resultat: "ok" });
    recordCourriel({ voie: "smtp_tenant", resultat: "smtp_auth_failed" });
    recordEpisodeTermine();
    recordEpisodeTermine();
    const t = await texte();
    // L'ordre des labels dans l'export est celui de labelNames (voie puis
    // resultat) : on ne le presume pas, deux regards en avant.
    expect(t).toMatch(
      /humanix_courriels_total\{(?=[^}]*voie="smtp_tenant")(?=[^}]*resultat="ok")[^}]*\} 1/,
    );
    expect(t).toMatch(
      /humanix_courriels_total\{[^}]*resultat="smtp_auth_failed"/,
    );
    expect(t).toMatch(/humanix_episodes_termines_total\{[^}]*\} 2/);
  });
});
