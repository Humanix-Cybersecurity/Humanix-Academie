// SPDX-License-Identifier: AGPL-3.0-or-later
// Cle publique Humanix Cybersecurity pour la verification des licences.
//
// IMPORTANT - placeholder a remplacer avant le launch prod :
//
// 1. Generer une paire de cles avec :
//      npm run licensing:keygen
//    Cela cree humanix-license-keypair.json a la racine (gitignored).
//
// 2. Copier la `publicKeyPem` du JSON dans la constante PUBLIC_KEY_PEM
//    ci-dessous.
//
// 3. Stocker la `privateKeyPem` dans 1Password / Bitwarden / KeePass /
//    HSM (jamais dans le repo, jamais en email/Slack).
//
// 4. Supprimer humanix-license-keypair.json apres copie.
//
// La cle publique etant publique par definition, elle peut etre committee
// sans risque. Elle sert UNIQUEMENT a verifier les licences emises par
// Humanix Cybersecurity. Un attaquant qui aurait la cle publique ne peut
// PAS forger de licences.
//
// L'env HUMANIX_LICENSE_PUBLIC_KEY peut override cette valeur (utile pour
// les forks self-host qui veulent operer leur propre PKI - l'AGPL le
// permet, c'est meme l'esprit).

export const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
REPLACE_BEFORE_PROD_AVEC_LA_CLE_PUBLIQUE_GENEREE_PAR_npm_run_license_keygen
-----END PUBLIC KEY-----
`;
