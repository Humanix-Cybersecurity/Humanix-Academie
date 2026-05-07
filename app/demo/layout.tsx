// SPDX-License-Identifier: AGPL-3.0-or-later
// Layout pour /demo : porte les metadonnees SEO/OG.
// Necessaire car app/demo/page.tsx est "use client" (formulaire interactif)
// et ne peut pas exporter `metadata` directement.
import type { Metadata } from "next";
import type { ReactNode } from "react";

const TITLE = "Démo live - Humanix Académie";
const DESCRIPTION =
  "Tester l'application en 1 clic : choisis un palier (Découverte, Starter, Essentielle, Pro, Enterprise) et un rôle (apprenant, admin, modérateur). Aucune inscription, données fictives.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    images: [
      {
        url: "/logo-humanix-academie-512.png",
        width: 512,
        height: 512,
        alt: "Humanix Académie",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/logo-humanix-academie-512.png"],
  },
};

export default function DemoLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
