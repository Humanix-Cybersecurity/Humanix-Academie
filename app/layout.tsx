// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { headers } from "next/headers";
import Providers from "./providers";
import HeaderBar from "@/components/HeaderBar";
import PWAInstallButton from "@/components/PWAInstallButton";
import PlausibleScript from "@/components/PlausibleScript";
import PlausibleLoader from "@/components/PlausibleLoader";
import MatomoScript from "@/components/MatomoScript";
import DemoBanner from "@/components/DemoBanner";
import CookieBanner from "@/components/CookieBanner";
import CyberMeteoTopBar from "@/components/CyberMeteoTopBar";
import SiteFooter from "@/components/SiteFooter";
import MascotPeek from "@/components/MascotPeek";
import HexChat from "@/components/HexChat";
import ScrollProgress from "@/components/ScrollProgress";
import { isHexChatAvailable } from "@/lib/ai/provider";
import { auth } from "@/lib/auth";
// Polices brand self-hostées via Fontsource (npm packages, woff2 dans node_modules).
// On importe les CSS qui déclarent les @font-face - bundlés au build par Next.js,
// aucun fetch externe au runtime ni au build (vs next/font/google qui dépend
// de la connectivité fonts.gstatic.com côté CI).
//   - Inter (variable, tous poids dans 1 fichier)
//   - Atkinson Hyperlegible (poids 400 + 700, police accessible Braille Institute)
import "@fontsource-variable/inter";
import "@fontsource/atkinson-hyperlegible/400.css";
import "@fontsource/atkinson-hyperlegible/700.css";
import "./globals.css";

const SITE_NAME = "Humanix Académie";
// Repositionnement mai 2026 : on quitte le ciblage TPE/PME exclusif pour
// adresser TOUT LE MONDE (particuliers, équipes, indépendants, collectivités,
// associations, entreprises de toute taille). Le différenciateur reste la
// promesse temporelle : 5 minutes par semaine suffisent pour ancrer les
// bons réflexes cyber. Cf. /manifeste pour le positionnement détaillé.
const SITE_TITLE =
  "Humanix Académie - La cyber pour tous, à partir de 5 minutes par semaine";
const SITE_DESCRIPTION =
  "Plateforme française gamifiée de sensibilisation cybersécurité, pour particuliers, équipes et organisations de toute taille. Modules de 5 minutes, mises en situation, conformes RGPD. Open source AGPLv3.";
// Image OG fallback pour les pages qui n'ont pas leur propre opengraph-image.tsx
// (admin, profil, api...). Les pages publiques exposées au social ont une OG
// card dédiée 1200×630 générée dynamiquement (cf. lib/og-card.tsx + chaque
// app/<route>/opengraph-image.tsx).
const SITE_OG_IMAGE = "/logo-humanix-academie-512.png";

export const metadata: Metadata = {
  // Title : chaque page marketing owns son propre `title` complet (avec son
  // suffixe " - Humanix Académie" si elle veut). Pas de template ici car
  // ~25 pages contiennent deja "Humanix" dans leur titre - un template
  // produirait des suffixes dupliques. Le titre ci-dessous est le fallback
  // utilise quand une page ne definit rien (rare, ideallement aucun pour
  // les pages indexables).
  //
  // NB : on utilise une string plate plutot que `{ default: ... }` car
  // l'API Next.js Metadata exige `template` ou `absolute` avec `default`.
  // Le fallback est aussi simple comme ca.
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Humanix Cybersecurity", url: "https://humanix-cybersecurity.fr" }],
  creator: "Humanix Cybersecurity",
  publisher: "Humanix Cybersecurity",
  generator: "Next.js",
  // Mots-cles cibles (ignore par Google depuis 2009 mais lu par Bing, Qwant,
  // Ecosia et certains agregateurs francais). Aucun cout, signal supplementaire.
  keywords: [
    "sensibilisation cybersécurité",
    "formation cyber",
    "phishing simulé",
    "RGPD",
    "NIS2",
    "cybersécurité PME",
    "cybersécurité française",
    "plateforme open source",
    "alternative française KnowBe4",
    "hébergement souverain France",
    "sensibilisation cyber gratuite",
    "sensibilisation cyber entreprise",
    "deepfake",
    "fraude au président",
    "cyber awareness français",
  ],
  category: "Cybersecurity",
  // Indexation par defaut autorisee. Les pages back-office surchargent via
  // leur propre metadata { robots: { index: false } }.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  referrer: "strict-origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
  alternates: {
    canonical: "/",
    languages: { "fr-FR": "/", "x-default": "/" },
  },
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
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: SITE_OG_IMAGE, width: 512, height: 512, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE],
  },
};

// Schema.org Organization - aide Google a comprendre que Humanix est une
// app cybersecurite française. Permet rich snippets et knowledge panel.
const SITE_URL_RUNTIME =
  process.env.NEXT_PUBLIC_APP_URL || "https://humanix-cybersecurity.fr";
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL_RUNTIME}/#organization`,
  name: SITE_NAME,
  alternateName: ["Humanix Cybersecurity", "Humanix Academie", "Académie Humanix"],
  url: SITE_URL_RUNTIME,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL_RUNTIME}/logo-humanix-academie-512.png`,
    width: 512,
    height: 512,
  },
  description: SITE_DESCRIPTION,
  foundingDate: "2025",
  founder: {
    "@type": "Person",
    name: "Florian Durano",
  },
  address: {
    "@type": "PostalAddress",
    addressCountry: "FR",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      email: "contact@humanix-cybersecurity.fr",
      contactType: "customer service",
      areaServed: "FR",
      availableLanguage: ["French"],
    },
    {
      "@type": "ContactPoint",
      email: "security@humanix-cybersecurity.fr",
      contactType: "security",
      areaServed: "FR",
      availableLanguage: ["French"],
    },
  ],
  knowsAbout: [
    "Cybersecurity",
    "Cyber awareness",
    "Phishing simulation",
    "GDPR compliance",
    "NIS2 compliance",
    "Open source software",
    "Sensibilisation cybersécurité",
    "Sécurité informatique",
  ],
  sameAs: [
    "https://github.com/Humanix-Cybersecurity/Humanix-Academie",
    "https://www.linkedin.com/company/humanix-cybersecurity",
  ],
};

// Schema.org WebSite - declare le site lui-meme (different de l'Organization).
// Inclut potentiellement une SearchAction si on expose un endpoint de recherche.
const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL_RUNTIME}/#website`,
  url: SITE_URL_RUNTIME,
  name: SITE_NAME,
  alternateName: "Humanix Cybersecurity",
  description: SITE_DESCRIPTION,
  inLanguage: "fr-FR",
  publisher: { "@id": `${SITE_URL_RUNTIME}/#organization` },
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

// Script anti-flash : applique le theme AVANT le render React pour éviter
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Detection demo mode : combinaison de l'env var DEMO_MODE ET du host.
  // Pourquoi le host : si le subdomain demo.humanix-academie.fr est mal
  // configure cote env (oubli de DEMO_MODE=true au deploy), on fallback
  // sur la detection par hostname pour que la UX reste coherente. Belt
  // and suspenders.
  const headersList = await headers();
  const host = (headersList.get("host") ?? "").toLowerCase();
  const isDemoByEnv = process.env.DEMO_MODE === "true";
  const isDemoByHost = host.startsWith("demo.");
  const isDemo = isDemoByEnv || isDemoByHost;

  // Hex chat : on n'affiche le FAB qu'aux users connectes ET si un
  // provider IA est configure cote serveur. Anonymous = pas de chat
  // (coûts API + tracage). Mode demo : on autorise quand meme pour
  // que la feature soit demontrable lors d'evenements.
  const session = await auth();
  const hexChatEnabled =
    isHexChatAvailable() && (Boolean(session?.user?.id) || isDemo);

  // CSP nonce per-request : genere par proxy.ts (edge), recupere ici
  // pour autoriser les scripts inline (theme init, JSON-LD) avec
  // 'nonce-XXX' dans script-src. Sans cet attribut, le navigateur les
  // bloquerait. Cf. lib/csp-nonce.ts.
  const cspNonce = headersList.get("x-csp-nonce") ?? undefined;

  return (
    <html lang="fr">
      <head>
        <script
          nonce={cspNonce}
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        {/* JSON-LD Organization + WebSite - SEO knowledge panel +
            rich snippets + sitelinks searchbox eligible */}
        <script
          type="application/ld+json"
          nonce={cspNonce}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          nonce={cspNonce}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(webSiteJsonLd),
          }}
        />
      </head>
      <body className="min-h-screen">
        {/* Analytics :
            - PlausibleScript : self-host (active si NEXT_PUBLIC_PLAUSIBLE_DOMAIN
              est defini, sous regime exemption CNIL recommandation 2020-091).
            - PlausibleLoader : cloud (active SI consent explicite via le
              CookieBanner, sinon aucun appel reseau).
            - MatomoScript : self-host alternatif si configure.
            Les 3 sont mutuellement compatibles : le Loader cloud se desactive
            automatiquement si une instance self-host est detectee (cf.
            HAS_SELFHOST dans PlausibleLoader). */}
        <PlausibleScript />
        <PlausibleLoader />
        <MatomoScript />
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
          <HeaderBar demoMode={isDemo} />
          <ScrollProgress />
          <main id="main-content" tabIndex={-1} aria-label="Contenu principal">
            {children}
          </main>
          <PWAInstallButton />
          {/* HexChat : assistant cyber conversationnel (Phase 1 roadmap IA).
              Affiche un FAB flottant + panneau de chat. N'apparaît que si
              un provider Mistral ou Ollama est configure cote serveur ET
              que l'user est authentifie (cf. lib/ai/provider.ts). */}
          <HexChat enabled={hexChatEnabled} />
          {/* CookieBanner : consentement explicite Accepter/Refuser pour
              activer le tracking analytics (Plausible cloud notamment).
              Conforme CNIL recommandation 2020-091 (parite stricte + pas
              de pre-cochage). Modifiable depuis /confidentialite. */}
          <CookieBanner />
          <MascotPeek />
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
