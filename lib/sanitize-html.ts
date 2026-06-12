// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Sanitisation HTML des templates phishing (corps email + landing custom).
//
// Contrainte : ces HTML doivent rester REALISTES (styles inline, images,
// tableaux de mise en page, formulaire de landing) pour imiter un vrai mail
// /une vraie page de connexion. On NE PEUT donc PAS reutiliser le sanitizer
// strict de lib/ai/mistral.ts (qui supprime `style`, `img`, etc. — adapte aux
// previews IA, pas aux templates).
//
// Ce sanitizer PRESERVE le presentationnel (style, img, table, form) mais
// NEUTRALISE tous les vecteurs d'execution : <script>, gestionnaires on*,
// URLs javascript:/data:, <iframe>/<object>/<embed>/<svg>/<math>, <meta>/<link>
// /<base>. DOMPurify (parseur HTML5, audit Cure53) assainit aussi le CONTENU
// des attributs `style` (retire expression(), url(javascript:)…).
//
// Defense en profondeur : la landing est de toute facon rendue en <iframe
// sandbox> SANS allow-scripts (cf. app/phishing/[token]/page.tsx) ; ce
// sanitizer ferme le vecteur cote ADMIN (preview du template) et en stockage.

import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  // Texte / structure
  "p", "br", "hr", "strong", "em", "u", "b", "i", "s", "small", "sub", "sup",
  "a", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "code", "pre", "span", "div", "center", "font",
  // Mise en page email
  "img", "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup", "col",
  // Formulaire de landing (rendu en iframe sandbox sans scripts)
  "form", "input", "textarea", "select", "option", "button", "label", "fieldset", "legend",
];

const ALLOWED_ATTR = [
  // Liens / images
  "href", "title", "target", "rel", "src", "alt",
  // Presentation (email legacy : align/bgcolor/width… sont courants)
  "width", "height", "align", "valign", "bgcolor", "color", "style", "class",
  "colspan", "rowspan", "cellpadding", "cellspacing", "border", "dir",
  // Champs de formulaire (landing)
  "type", "name", "placeholder", "value", "for", "id", "action", "method", "required", "checked", "disabled",
];

export function sanitizeEmailHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    // http(s) + mailto autorises ; javascript:, data:, vbscript: neutralises.
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: [
      "script", "iframe", "object", "embed", "style", "link", "meta",
      "svg", "math", "base",
    ],
    FORBID_ATTR: [
      "onerror", "onload", "onclick", "onmouseover", "onmouseout",
      "onfocus", "onblur", "onchange", "onsubmit", "onkeydown", "formaction",
    ],
    KEEP_CONTENT: true,
  });
}
