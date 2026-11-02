import { describe, expect, it } from "vitest";
import {
  CHEMIN_CALLBACK,
  CHEMIN_PAGE_CONFIRMATION,
  lireParametresLien,
  urlCallbackPourFormulaire,
  versPageDeConfirmation,
} from "./confirmation";

const TOKEN =
  "0223c49cd0dc9bd904e99fd8518f1e39f752628aae1d037071c29f01f8c36c4a";

describe("versPageDeConfirmation", () => {
  it("remplace le chemin du callback par la page, sans toucher au reste", () => {
    const url = `https://humanix-academie.fr${CHEMIN_CALLBACK}?callbackUrl=${encodeURIComponent(
      "https://alsace-micro-services.humanix-academie.fr/post-login",
    )}&token=${TOKEN}&email=${encodeURIComponent("backup@example.org")}`;
    const page = new URL(versPageDeConfirmation(url));
    expect(page.origin).toBe("https://humanix-academie.fr");
    expect(page.pathname).toBe(CHEMIN_PAGE_CONFIRMATION);
    expect(page.searchParams.get("token")).toBe(TOKEN);
    expect(page.searchParams.get("email")).toBe("backup@example.org");
    expect(page.searchParams.get("callbackUrl")).toBe(
      "https://alsace-micro-services.humanix-academie.fr/post-login",
    );
  });

  it("garde l'origine du callback, sous-domaine compris", () => {
    const url = `https://acme.humanix-academie.fr${CHEMIN_CALLBACK}?token=${TOKEN}&email=a%40b.fr`;
    expect(versPageDeConfirmation(url)).toBe(
      `https://acme.humanix-academie.fr${CHEMIN_PAGE_CONFIRMATION}?token=${TOKEN}&email=a%40b.fr`,
    );
  });

  it("laisse intacte une URL qui n'est pas un callback nodemailer", () => {
    const autre = "https://humanix-academie.fr/api/auth/callback/google?code=x";
    expect(versPageDeConfirmation(autre)).toBe(autre);
    expect(versPageDeConfirmation("pas une url")).toBe("pas une url");
  });
});

describe("lireParametresLien", () => {
  it("accepte un lien complet et conserve le callbackUrl", () => {
    expect(
      lireParametresLien({
        token: TOKEN,
        email: "backup@example.org",
        callbackUrl: "https://acme.humanix-academie.fr/post-login",
      }),
    ).toEqual({
      token: TOKEN,
      email: "backup@example.org",
      callbackUrl: "https://acme.humanix-academie.fr/post-login",
    });
  });

  it("accepte un lien sans callbackUrl", () => {
    expect(lireParametresLien({ token: TOKEN, email: "a@b.fr" })).toEqual({
      token: TOKEN,
      email: "a@b.fr",
      callbackUrl: null,
    });
  });

  it("refuse un lien sans jeton, sans email, ou malformé", () => {
    expect(lireParametresLien({ email: "a@b.fr" })).toBeNull();
    expect(lireParametresLien({ token: TOKEN })).toBeNull();
    expect(lireParametresLien({ token: "court", email: "a@b.fr" })).toBeNull();
    expect(
      lireParametresLien({ token: `${TOKEN}<script>`, email: "a@b.fr" }),
    ).toBeNull();
    expect(
      lireParametresLien({ token: TOKEN, email: "sans-arobase" }),
    ).toBeNull();
    expect(lireParametresLien({ token: TOKEN, email: "a b@c.fr" })).toBeNull();
    expect(
      lireParametresLien({ token: [TOKEN, TOKEN], email: "a@b.fr" }),
    ).toBeNull();
  });

  it("ignore un callbackUrl démesuré plutôt que de refuser le lien", () => {
    const lu = lireParametresLien({
      token: TOKEN,
      email: "a@b.fr",
      callbackUrl: `https://x.fr/${"a".repeat(3000)}`,
    });
    expect(lu?.callbackUrl).toBeNull();
    expect(lu?.token).toBe(TOKEN);
  });
});

describe("urlCallbackPourFormulaire", () => {
  it("vise le callback du même hôte avec les paramètres dans la query", () => {
    const cible = urlCallbackPourFormulaire({
      token: TOKEN,
      email: "backup+syn@example.org",
      callbackUrl: "https://acme.humanix-academie.fr/post-login",
    });
    expect(cible.startsWith(`${CHEMIN_CALLBACK}?`)).toBe(true);
    const q = new URLSearchParams(cible.slice(cible.indexOf("?") + 1));
    expect(q.get("token")).toBe(TOKEN);
    expect(q.get("email")).toBe("backup+syn@example.org");
    expect(q.get("callbackUrl")).toBe(
      "https://acme.humanix-academie.fr/post-login",
    );
  });

  it("omet callbackUrl quand il est absent", () => {
    const cible = urlCallbackPourFormulaire({
      token: TOKEN,
      email: "a@b.fr",
      callbackUrl: null,
    });
    expect(cible).toBe(`${CHEMIN_CALLBACK}?token=${TOKEN}&email=a%40b.fr`);
  });

  it("aller-retour : la page reconstruit exactement le callback d'origine", () => {
    const origine = `https://humanix-academie.fr${CHEMIN_CALLBACK}?callbackUrl=${encodeURIComponent(
      "https://humanix-academie.fr/post-login",
    )}&token=${TOKEN}&email=${encodeURIComponent("nicolas@example.org")}`;
    const page = new URL(versPageDeConfirmation(origine));
    const lu = lireParametresLien(Object.fromEntries(page.searchParams));
    expect(lu).not.toBeNull();
    const retour = new URL(urlCallbackPourFormulaire(lu!), page.origin);
    const attendu = new URL(origine);
    expect(retour.pathname).toBe(attendu.pathname);
    expect(Object.fromEntries(retour.searchParams)).toEqual(
      Object.fromEntries(attendu.searchParams),
    );
  });
});
