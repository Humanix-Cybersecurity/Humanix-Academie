// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Garde-fou : la page de confirmation du lien magique ne doit jamais appeler
// le callback sur un simple GET (ni script, ni rafraîchissement automatique),
// sinon les messageries qui ouvrent les liens consomment le jeton à la place
// de la personne. Seul un formulaire POST, soumis au clic, le fait.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LienMagiquePage from "./page";

const TOKEN = "f".repeat(64);

async function rendre(params: Record<string, string>) {
  const element = await LienMagiquePage({
    searchParams: Promise.resolve(params),
  });
  return renderToStaticMarkup(element);
}

describe("/connexion/lien", () => {
  it("rend un formulaire POST vers le callback, sans aucune soumission automatique", async () => {
    const html = await rendre({
      token: TOKEN,
      email: "a@b.fr",
      callbackUrl: "https://acme.humanix-academie.fr/post-login",
    });
    expect(html).toContain('method="post"');
    expect(html).toContain(
      `action="/api/auth/callback/nodemailer?callbackUrl=https%3A%2F%2Facme.humanix-academie.fr%2Fpost-login&amp;token=${TOKEN}&amp;email=a%40b.fr"`,
    );
    expect(html).toContain("a@b.fr");
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/http-equiv="refresh"/i);
  });

  it("sans paramètres valides : aucun formulaire, retour à la connexion", async () => {
    const html = await rendre({});
    expect(html).not.toContain("<form");
    expect(html).not.toContain("/api/auth/callback/nodemailer");
    expect(html).toContain('href="/connexion"');
  });
});
