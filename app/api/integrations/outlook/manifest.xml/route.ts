// SPDX-License-Identifier: AGPL-3.0-or-later
// Sert dynamiquement le manifest Office Add-in en remplacant le domaine
// par celui de l'instance courante (NEXT_PUBLIC_APP_URL).
// Permet a chaque deploiement self-hosted (Scaleway / OVH / on-prem)
// de servir son propre manifest sans modification du XML source.

import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-cybersecurity.fr"
  ).replace(/\/$/, "");

  // Le manifest source est dans /outlook-addin/manifest.xml.
  // En build standalone, ce fichier n'est pas copie automatiquement -> fallback inline.
  let xml: string;
  try {
    const filePath = path.join(process.cwd(), "outlook-addin", "manifest.xml");
    xml = await readFile(filePath, "utf-8");
  } catch {
    // Fallback : version embarquee minimale (au cas ou le fichier n'est pas dans le bundle)
    xml = INLINE_MANIFEST;
  }

  // Remplace toutes les references au domaine par l'instance courante
  xml = xml.replace(/https:\/\/humanix-cybersecurity\.fr/g, appUrl);

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="humanix-outlook-manifest.xml"',
      "Cache-Control": "public, max-age=300",
    },
  });
}

const INLINE_MANIFEST = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1" xsi:type="MailApp" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bt="http://schemas.microsoft.com/office/officeappbasictypes/1.0" xmlns:mailappor="http://schemas.microsoft.com/office/mailappversionoverrides/1.0">
  <Id>4a34b37e-81de-4a46-bb56-d5309bb33037</Id>
  <Version>1.0.0.0</Version>
  <ProviderName>Humanix-Cybersecurity SASU</ProviderName>
  <DefaultLocale>fr-FR</DefaultLocale>
  <DisplayName DefaultValue="Humanix - Signaler un phishing" />
  <Description DefaultValue="Bouton 1-clic pour signaler un mail suspect" />
  <IconUrl DefaultValue="https://humanix-cybersecurity.fr/outlook/icon-64.png" />
  <SupportUrl DefaultValue="https://humanix-cybersecurity.fr/contact" />
  <Hosts><Host Name="Mailbox" /></Hosts>
  <Requirements><Sets><Set Name="Mailbox" MinVersion="1.5" /></Sets></Requirements>
  <FormSettings><Form xsi:type="ItemRead"><DesktopSettings><SourceLocation DefaultValue="https://humanix-cybersecurity.fr/outlook/taskpane.html" /></DesktopSettings></Form></FormSettings>
  <Permissions>ReadWriteMailbox</Permissions>
  <Rule xsi:type="RuleCollection" Mode="Or"><Rule xsi:type="ItemIs" ItemType="Message" FormType="Read" /></Rule>
</OfficeApp>`;
