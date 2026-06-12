# public/fonts

## TwemojiCountryFlags.woff2 (78 KB)

Source : [country-flag-emoji-polyfill v0.1](https://www.npmjs.com/package/country-flag-emoji-polyfill) (Apache-2.0).

Pourquoi : sur Windows 10/11, la police systeme Segoe UI Emoji ne contient
pas les glyphs des drapeaux (🇫🇷, 🇪🇺, 🇺🇸, etc.) - elle les affiche en
paires de lettres regional indicators (FR, EU, US). Cette police self-hostee
restaure le rendu attendu sur Windows.

Ne pas changer le nom du fichier sans synchroniser `app/globals.css` (regle
`@font-face`).

Le fichier est self-hoste (et non charge depuis un CDN) pour respecter la
Content-Security-Policy (`font-src 'self'`) configuree dans `next.config.mjs`.
