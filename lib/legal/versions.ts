// SPDX-License-Identifier: AGPL-3.0-or-later
// Versions et dates des documents légaux publics, en un seul endroit.
//
// Pourquoi : chaque page affichait `new Date()` comme date de mise à jour,
// c'est-à-dire « aujourd'hui » à chaque visite. Un document contractuel porte
// une date fixe et une version : c'est ce que le client accepte, et c'est ce
// que l'on enregistre à l'inscription (User.cguVersion, User.cguAcceptedAt).
//
// Mise à jour : changer la date ET la version quand le fond du texte change.
// Les dates antérieures au 2026-09-27 viennent de l'historique git des pages
// (dernier changement de contenu, hors reformatage).
export const DOCUMENTS_LEGAUX = {
  cgu: { version: "1.1", date: "27/09/2026" },
  cgv: { version: "1.1", date: "27/09/2026" },
  confidentialite: { version: "1.1", date: "27/09/2026" },
  mentionsLegales: { version: "1.0", date: "14/08/2026" },
  cookies: { version: "1.0", date: "12/06/2026" },
  accessibilite: { version: "1.1", date: "17/06/2026" },
} as const;

/** Version des CGU enregistrée sur le compte au moment de l'acceptation. */
export const CGU_VERSION = DOCUMENTS_LEGAUX.cgu.version;

/** Version des CGV enregistrée sur l'espace à la souscription ou à la montée de gamme. */
export const CGV_VERSION = DOCUMENTS_LEGAUX.cgv.version;
