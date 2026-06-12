// SPDX-License-Identifier: AGPL-3.0-or-later
//
// GET /.well-known/humanix-pdf-pubkey.pem
//
// Expose la cle publique Ed25519 utilisee pour signer les PDF de preuves
// audit envoyes vers CISO Assistant (v1.2 du connecteur).
//
// Permet a un auditeur tiers de verifier les signatures incrustees dans
// les PDF, sans aucune dependance a Humanix runtime. Procedure de
// verification : cf. derniere page de chaque PDF de preuve.
//
// Acces : public, no-auth (la cle publique n'est pas un secret).
// Cache : 5 minutes -- la cle peut etre regeneree au boot du process
// (mode ephemere par defaut, persistante si HUMANIX_PDF_SIGNING_PRIVATE_KEY_PEM
// est definie en env).

import { NextResponse } from "next/server";
import { getCurrentPublicKeyPem } from "@/lib/ciso-assistant/pdf-signing";

export const dynamic = "force-dynamic";

export async function GET() {
  const { pem, fingerprint, ephemeral } = getCurrentPublicKeyPem();

  const body =
    `# Humanix Académie - clé publique Ed25519\n` +
    `# Empreinte SHA-256 : ${fingerprint}\n` +
    `# Mode : ${ephemeral ? "ÉPHÉMÈRE (régénérée à chaque redémarrage du process)" : "persistante (env HUMANIX_PDF_SIGNING_PRIVATE_KEY_PEM)"}\n` +
    `# Servie depuis : /.well-known/humanix-pdf-pubkey.pem\n` +
    `# Documentation : /integrations/ciso-assistant#verification\n` +
    `\n` +
    pem;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/x-pem-file; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Humanix-Pubkey-Fingerprint": fingerprint,
      "X-Humanix-Pubkey-Ephemeral": ephemeral ? "true" : "false",
    },
  });
}
