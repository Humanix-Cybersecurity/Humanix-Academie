// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, it, expect } from "vitest";
import { sanitizeEmailHtml } from "./sanitize-html";

describe("sanitizeEmailHtml — neutralise les vecteurs XSS", () => {
  it("supprime <script>", () => {
    const out = sanitizeEmailHtml('<p>ok</p><script>alert(1)</script>');
    expect(out).toContain("<p>ok</p>");
    expect(out.toLowerCase()).not.toContain("<script");
  });

  it("retire les gestionnaires on* (garde la balise)", () => {
    const out = sanitizeEmailHtml('<img src="https://x/a.png" onerror="alert(1)">');
    expect(out).toContain("<img");
    expect(out.toLowerCase()).not.toContain("onerror");
  });

  it("neutralise les URLs javascript:", () => {
    const out = sanitizeEmailHtml('<a href="javascript:alert(1)">x</a>');
    expect(out.toLowerCase()).not.toContain("javascript:");
  });

  it("supprime <iframe>, <svg>, <object>", () => {
    const out = sanitizeEmailHtml(
      '<iframe src="//evil"></iframe><svg onload="x"></svg><object data="evil"></object>',
    );
    expect(out.toLowerCase()).not.toContain("<iframe");
    expect(out.toLowerCase()).not.toContain("<svg");
    expect(out.toLowerCase()).not.toContain("<object");
  });
});

describe("sanitizeEmailHtml — préserve le présentationnel (réalisme)", () => {
  it("garde les styles inline", () => {
    const out = sanitizeEmailHtml('<div style="color:#0078d4;padding:20px">Microsoft</div>');
    expect(out).toContain("style=");
    expect(out).toContain("Microsoft");
  });

  it("garde images, tables et liens https", () => {
    const out = sanitizeEmailHtml(
      '<table><tr><td><img src="https://cdn/logo.png" alt="logo"></td></tr></table><a href="https://x">lien</a>',
    );
    expect(out).toContain("<table");
    expect(out).toContain("<img");
    expect(out).toContain("https://cdn/logo.png");
    expect(out).toContain('href="https://x"');
  });

  it("garde le formulaire de landing (champs)", () => {
    const out = sanitizeEmailHtml(
      '<form action="/x"><label>Mot de passe</label><input type="password" name="pwd"></form>',
    );
    expect(out).toContain("<form");
    expect(out).toContain("<input");
    expect(out).toContain('type="password"');
  });
});
