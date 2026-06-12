// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Declarations de modules ambient pour TypeScript.
//
// Pourquoi : depuis TypeScript 6, les "side-effect imports"
// (`import "package";` sans nom) requierent que le module soit declare
// quelque part - sinon TS leve "Cannot find module or type declarations
// for side-effect import of '...'".
//
// Les packages Fontsource et les fichiers .css n'embarquent pas de .d.ts
// (ils servent uniquement au bundler Next.js pour charger les polices /
// styles). On les declare ici en wildcard pour ne plus avoir a ajouter
// d'entree a chaque nouvelle police importee.

// Wildcard pour TOUS les packages Fontsource (couvre import direct du
// package et import de sous-chemin /400.css, /700.css, /style.css, etc.)
declare module "@fontsource/*";
declare module "@fontsource-variable/*";

// Fichiers CSS importes en side-effect (globals.css, et toute future
// feuille de style locale). Next.js gere le bundle, TS n'a rien a typer.
declare module "*.css";
