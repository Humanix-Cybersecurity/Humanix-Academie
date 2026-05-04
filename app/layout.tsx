import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import Providers from "./providers";
import HeaderBar from "@/components/HeaderBar";
import PWAInstallButton from "@/components/PWAInstallButton";
import DemoBanner from "@/components/DemoBanner";
import CookieNotice from "@/components/CookieNotice";
import CyberMeteoTopBar from "@/components/CyberMeteoTopBar";
import SiteFooter from "@/components/SiteFooter";
import MascotPeek from "@/components/MascotPeek";
import ScrollProgress from "@/components/ScrollProgress";
import "./globals.css";

export const metadata: Metadata = {
  title: "Humanix Académie — Cybersécurité ludique pour PME",
  description:
    "Plateforme gamifiée de sensibilisation cybersécurité pour TPE et PME. Modules de 5 minutes, mises en situation, conformes RGPD.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Humanix",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      {
        url: "/logo-humanix-academie-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/logo-humanix-academie-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [{ url: "/logo-humanix-academie-512.png" }],
    shortcut: "/logo-humanix-academie-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0B3D91" },
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Script anti-flash : applique le theme AVANT le render React pour eviter
// un flash de couleur au chargement.
// Defaut produit : MODE CLAIR. Le mode sombre s'active uniquement si
// l'utilisateur l'a choisi explicitement (saved === 'dark') ou s'il a
// activé le mode "system" ET son OS est en sombre.
const themeInitScript = `
(function() {
  try {
    var saved = localStorage.getItem('humanix-theme');
    var dark = saved === 'dark' || (
      saved === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen">
        <Providers>
          <a href="#main-content" className="skip-link">
            Aller au contenu principal
          </a>
          {/* Signature visuelle : barre cyber-meteo France 4px tout en haut.
              Couleur dynamique (vert/orange/rouge) selon le niveau d'alerte. */}
          <Suspense
            fallback={
              <div className="h-1 w-full bg-emerald-500" aria-hidden="true" />
            }
          >
            <CyberMeteoTopBar />
          </Suspense>
          {/* Bandeau démo dynamique : montre l'offre active si l'user est connecté */}
          <DemoBanner />
          <HeaderBar />
          <ScrollProgress />
          <main id="main-content" tabIndex={-1} aria-label="Contenu principal">
            {children}
          </main>
          <PWAInstallButton />
          <CookieNotice />
          <MascotPeek />
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
