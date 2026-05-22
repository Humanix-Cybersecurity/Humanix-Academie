// SPDX-License-Identifier: AGPL-3.0-or-later
// Cle publique Humanix Cybersecurity pour la verification des licences.
//
// CLE DE PRODUCTION (Ed25519, format X.509 SubjectPublicKeyInfo).
// Generee 2026-05-22 pour le launch v1.1.0. La cle privee correspondante
// est stockee hors-bande (1Password "Humanix License Signing Key" +
// papier coffre + USB chiffree geographiquement separee).
//
// SECURITE : la cle publique est publique par definition, elle peut etre
// committee sans risque. Elle sert UNIQUEMENT a verifier les licences
// emises par Humanix Cybersecurity. Un attaquant qui aurait la cle
// publique ne peut PAS forger de licences.
//
// FORKS OSS : l'env HUMANIX_LICENSE_PUBLIC_KEY peut override cette valeur,
// utile pour les forks AGPL qui operent leur propre PKI (signer leurs
// propres licences pour leurs propres clients). L'AGPL le permet, c'est
// meme l'esprit du projet.
//
// ROTATION : si la cle privee fuit, procedure :
//   1. npm run licensing:keygen pour generer une nouvelle paire
//   2. (Optionnel) maintenir l'ancienne pubkey en parallele pendant la
//      fenetre de migration des licences existantes (multi-key support)
//   3. Re-emettre les licences clients avec la nouvelle privkey
//   4. Apres expiration des anciennes licences, retirer l'ancienne pubkey

export const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA6dXiU+kwGBjazR/tNaDVaFNDyVjVBGyWz4GoUs/MzIM=
-----END PUBLIC KEY-----
`;
