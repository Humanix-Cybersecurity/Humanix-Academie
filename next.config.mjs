/** @type {import('next').NextConfig} */

// Content-Security-Policy : depuis Sprint 4 securite (mai 2026), le CSP
// est genere DYNAMIQUEMENT par proxy.ts avec un nonce per-request
// (strategie "Strict CSP" Google : script-src 'self' 'nonce-XXX'
// 'strict-dynamic'). Cela permet de supprimer effectivement
// 'unsafe-inline' pour les navigateurs modernes (CSP3-aware).
//
// Le proxy.ts SET le header response Content-Security-Policy, donc on ne
// le declare PAS ici (sinon next.config.mjs override le nonce avec un
// CSP statique). Les autres headers (HSTS, X-Frame, etc.) restent ici
// car ils ne dependent pas du runtime.

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
          // Content-Security-Policy : gere dynamiquement par proxy.ts
          // (nonce per-request, suppression effective de 'unsafe-inline').
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
