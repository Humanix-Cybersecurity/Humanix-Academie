/** @type {import('next').NextConfig} */

// Content-Security-Policy : defense en profondeur (en plus de la
// sanitization Mistral via DOMPurify cf. lib/ai/mistral.ts).
//
// Decisions pragmatiques :
//  - script-src 'unsafe-inline' : necessaire pour le theme init script
//    inline dans app/layout.tsx (cf. dangerouslySetInnerHTML). Migrer
//    vers une approche par nonce reste un TODO (effort important sur
//    Next.js App Router).
//  - style-src 'unsafe-inline' : Tailwind CSS-in-JS et inline styles
//    de plusieurs composants l'exigent.
//  - connect-src whitelist : seuls les providers FR/UE actuels.
//  - frame-ancestors 'none' : double-securite avec X-Frame-Options DENY.
//  - upgrade-insecure-requests : force HTTPS pour les sous-resources.

/**
 * Origine Plausible cloud, deduit dynamiquement de l'env var pour ne PAS
 * hardcoder plausible.io dans le CSP : un fork peut utiliser un proxy
 * (ex: analytics.example.com qui forward vers Plausible) ou une instance
 * Plausible self-host avec CDN. Si non defini, l'origine reste vide et
 * la CSP n'autorise rien d'externe pour Plausible (default-deny).
 */
function plausibleOrigin() {
  const url = process.env.NEXT_PUBLIC_PLAUSIBLE_CLOUD_SCRIPT;
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

const PLAUSIBLE_ORIGIN = plausibleOrigin();

const CSP_DIRECTIVES = [
  "default-src 'self'",
  // script-src : 'unsafe-inline' pour le theme init script inline dans
  // app/layout.tsx. Plausible cloud ajoute SEULEMENT si l'operateur a
  // configure NEXT_PUBLIC_PLAUSIBLE_CLOUD_SCRIPT (sinon CSP plus stricte
  // par defaut pour les forks OSS).
  ["script-src 'self' 'unsafe-inline'", PLAUSIBLE_ORIGIN]
    .filter(Boolean)
    .join(" "),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  // media-src : pour la lecture audio TTS via TTSButton qui cree un blob:
  // URL depuis le MP3 recu de /api/tts/synthesize. Sans 'blob:', l'element
  // <audio> echoue silencieusement (CSP fallback sur default-src 'self').
  "media-src 'self' blob:",
  // connect-src whitelist : seuls les providers FR/UE actuels + l'origine
  // Plausible cloud (pour les events POST) si configuree.
  [
    "connect-src 'self'",
    "https://api.mistral.ai",
    "https://api.payplug.com",
    "https://secure.payplug.com",
    "https://api.scaleway.com",
    PLAUSIBLE_ORIGIN,
  ]
    .filter(Boolean)
    .join(" "),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Headers de securite globaux.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy", value: CSP_DIRECTIVES },
        ],
      },
    ];
  },

  // Alias pour les outils de monitoring qui s'attendent a /health (vs /api/health).
  // Ex : Uptime Robot, Datadog Synthetics, Statuscake.
  async rewrites() {
    return [{ source: "/health", destination: "/api/health" }];
  },

  // Redirects 301 - kill list de pages publiques fusionnees / regroupees.
  // Cf. ROADMAP-SIMPLICITE.md (Sprint 3a) : reduction de la surface
  // editoriale pour clarifier l'experience visiteur.
  async redirects() {
    return [
      {
        // /lancement-oss etait une landing dediee au lancement open-source
        // (mai 2026). Le contenu est maintenant integre dans /manifeste,
        // qui couvre la mission + l'aspect open-source ensemble. On conserve
        // le SEO via redirection permanente.
        source: "/lancement-oss",
        destination: "/manifeste",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
