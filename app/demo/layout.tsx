// SPDX-License-Identifier: AGPL-3.0-or-later
// Layout pour /demo : porte les metadonnees SEO/OG.
// Necessaire car app/demo/page.tsx est "use client" (formulaire interactif)
// et ne peut pas exporter `metadata` directement.
//
// SECURITE : ce layout est un SERVER COMPONENT qui retourne 404 (notFound)
// quand DEMO_MODE != "true". Defense en profondeur :
//   - HeaderBar cache les CTAs vers /demo (UX)
//   - app/demo/layout.tsx (ICI) bloque l'acces a TOUTES les pages /demo/*
//   - Les actions /api liees a la demo doivent aussi check DEMO_MODE
// Empeche que sur la prod commerciale (DEMO_MODE=false), un visiteur tape
// directement /demo/... et obtienne acces a un compte fictif.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

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
  // Guard : si DEMO_MODE != "true", on renvoie 404 sur tout /demo/*.
  // notFound() throw une erreur React qui Next.js intercepte pour rendre
  // la page 404 standard. Pas de redirect (pour ne pas trahir l'existence
  // de la route en prod commerciale).
  if (process.env.DEMO_MODE !== "true") {
    notFound();
  }
  return <>{children}</>;
}
