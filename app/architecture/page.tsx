// SPDX-License-Identifier: AGPL-3.0-or-later
//
// /architecture — Cartographie technique publique de la plateforme
// Humanix Academie. Couvre la mesure ANSSI HG 5 (disposer d'une
// cartographie precise de l'installation informatique).
//
// PHILOSOPHIE : on ne se contente pas d'avoir un schema architecture.md
// dans un placard interne. On le publie. C'est la meme demarche que pour
// le code AGPLv3 : la transparence n'est pas une vulnerabilite, c'est
// la preuve de la maturite.
//
// Cible : RSSI client en due diligence, auditeur ANSSI, contributeur OSS,
// curieux technique.

import Link from "next/link";

export const metadata = {
  title:
    "Architecture technique — Humanix Académie",
  description:
    "Cartographie publique de l'infrastructure Humanix Académie : stack souveraine, cloisonnement réseau, crypto, sauvegardes, sous-traitants. Conforme mesure 5 du Guide d'hygiène informatique ANSSI v2.",
  alternates: { canonical: "/architecture" },
};

type Component = {
  emoji: string;
  name: string;
  role: string;
  tech: string;
  location: string;
  notes?: string;
};

const COMPONENTS: Component[] = [
  {
    emoji: "🌐",
    name: "DNS + domaine",
    role: "Résolution + email DMARC/DKIM/SPF",
    tech: "OVHcloud",
    location: "France 🇫🇷",
    notes: "Domaine humanix-academie.fr enregistré OVH, DNSSEC actif.",
  },
  {
    emoji: "🛡️",
    name: "Reverse-proxy frontal",
    role: "Terminaison TLS, rate-limit, WAF léger, redirect HTTPS",
    tech: "HAProxy 2.9 (bare-metal)",
    location: "Scaleway Paris 🇫🇷",
    notes:
      "Seul composant exposé Internet. TLS 1.3 only. HSTS preload. Rate-limit 600 req / 200 err / 150 conn par 10s par IP via stick-table.",
  },
  {
    emoji: "⚛️",
    name: "Application Next.js",
    role: "Frontend SSR + API routes + Server Actions",
    tech: "Next.js 16 + React 19 + Auth.js v5 (Docker)",
    location: "Scaleway Paris 🇫🇷",
    notes:
      "Conteneur isolé, IP privée uniquement. Reçoit uniquement le trafic forwardé par HAProxy.",
  },
  {
    emoji: "🗄️",
    name: "Base de données",
    role: "Persistance multi-tenant + audit trail",
    tech: "PostgreSQL 16 + Prisma 6.16+",
    location: "Scaleway Paris 🇫🇷",
    notes:
      "Disque chiffré LUKS au niveau hôte. Accès uniquement depuis l'app Next.js par IP privée. Connexions TLS.",
  },
  {
    emoji: "📧",
    name: "Email transactionnel",
    role: "Magic links Auth.js, alertes, notifications",
    tech: "Scaleway TEM (Transactional Email)",
    location: "France 🇫🇷",
    notes: "API authentifiée par clé révocable, DMARC alignement strict.",
  },
  {
    emoji: "🤖",
    name: "IA (Hex chat + génération contenu)",
    role: "Coach pédagogique conversationnel + génération phishing/quishing",
    tech: "Mistral AI (mistral-large + mistral-embed)",
    location: "France 🇫🇷",
    notes:
      "Prompt injection garde-fous, contexte tenant strict, pas de fuite cross-tenant.",
  },
  {
    emoji: "💳",
    name: "Paiement",
    role: "Souscription abonnement, gestion factures",
    tech: "Mollie B.V.",
    location: "UE 🇪🇺 (Amsterdam)",
    notes:
      "Webhooks HMAC-SHA256 obligatoires, fenêtre 5 min. PCI-DSS niveau 1, tokenisation CB.",
  },
  {
    emoji: "💾",
    name: "Sauvegardes",
    role: "Backup quotidien BDD + objets",
    tech: "pg_dump + chiffrement age (X25519) + FTPS Scaleway Object Storage",
    location: "Scaleway Paris 🇫🇷 + miroir Amsterdam",
    notes:
      "Cycle 30 jours rolling + 12 mois mensuel. Test restauration trimestriel.",
  },
  {
    emoji: "🔐",
    name: "Signature certificats apprenants",
    role: "Émission certificat Ed25519 vérifiable",
    tech: "Ed25519 RFC 8032 (clé hors-bande)",
    location: "1Password vault interne",
    notes:
      "Clé privée jamais dans le repo, jamais dans l'app runtime. Signature dans une étape isolée.",
  },
  {
    emoji: "📊",
    name: "Logs + supervision",
    role: "Audit trail tamper-evident + métriques",
    tech: "Table Event Prisma (append-only) + Scaleway Cockpit",
    location: "Scaleway Paris 🇫🇷",
    notes:
      "Retention 1 an minimum, 5 ans si incident déclaré. 20+ types d'événements audités.",
  },
];

const TLS_FACTS = [
  { label: "TLS version", value: "1.3 only" },
  { label: "HSTS", value: "preload, max-age 1 an" },
  { label: "Cipher suites", value: "AES-GCM + ChaCha20-Poly1305" },
  { label: "OCSP stapling", value: "activé" },
  { label: "Certificat", value: "Let's Encrypt, renouvellement auto acme.sh" },
];

const CRYPTO_FACTS = [
  { algo: "Hash mots de passe", value: "scrypt RFC 7914 (N=2^15, r=8, p=1)" },
  { algo: "MFA TOTP", value: "HMAC-SHA1 RFC 6238 (standard)" },
  { algo: "MFA WebAuthn", value: "ES256 + EdDSA (FIDO2 W3C)" },
  { algo: "Signature certificats", value: "Ed25519 RFC 8032" },
  { algo: "Webhooks HMAC", value: "HMAC-SHA256" },
  { algo: "Chiffrement backup", value: "age (X25519 + ChaCha20-Poly1305)" },
  { algo: "TLS en transit", value: "TLS 1.3 partout" },
  { algo: "Disque BDD", value: "LUKS AES-XTS" },
];

export default function ArchitecturePage() {
  return (
    <main id="main-content" className="overflow-x-hidden">
      <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
        {/* Hero */}
        <header className="text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] font-bold text-accent-500">
            Trust Center · Cartographie publique
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-primary-500 dark:text-accent-300">
            Architecture technique
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            La transparence n'est pas une vulnérabilité. Voici la
            cartographie complète de l'infrastructure Humanix Académie :
            composants, technos, localisations, choix souverains. Conforme à
            la <strong>mesure 5 du Guide d'hygiène informatique ANSSI</strong>{" "}
            (cartographie précise de l'installation maintenue à jour).
          </p>
        </header>

        {/* Schéma ASCII */}
        <section>
          <h2 className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-4">
            🗺️ Schéma de l'architecture
          </h2>
          <pre
            aria-label="Schéma de l'architecture Humanix Académie en ASCII art"
            className="text-xs sm:text-sm font-mono bg-slate-900 text-emerald-300 dark:text-emerald-300 p-4 sm:p-6 rounded-2xl overflow-x-auto leading-snug border border-slate-700"
          >
            {`
                       Internet 🌐
                           │
                           │ HTTPS (TLS 1.3, HSTS preload)
                           ▼
                ┌──────────────────────┐
                │  HAProxy 2.9         │  ★ seul composant exposé
                │  bare-metal frontal  │     rate-limit, WAF léger
                │  Scaleway Paris 🇫🇷  │     stick-table 10s window
                └──────────┬───────────┘
                           │ IP privée (VPC Scaleway)
                           ▼
                ┌──────────────────────┐
                │  App Next.js 16      │  React 19 + Auth.js v5
                │  + API routes        │  Server Actions Prisma
                │  Docker, isolé       │  RBAC + step-up WebAuthn
                │  Scaleway Paris 🇫🇷  │
                └────┬────────┬────────┘
                     │        │
                     │        └──────────────────┐
                     ▼                           ▼
              ┌──────────────┐          ┌──────────────────┐
              │ PostgreSQL16 │          │ Services externes│
              │ + Prisma     │          │ - Mistral 🇫🇷    │
              │ LUKS         │          │ - Mollie 🇳🇱     │
              │ Scaleway 🇫🇷 │          │ - TEM Scaleway🇫🇷│
              └──────┬───────┘          └──────────────────┘
                     │
                     │ pg_dump quotidien + age
                     ▼
              ┌──────────────────────┐
              │ Backup Object Storage│  Chiffré X25519 age
              │ Scaleway 🇫🇷+ Amsterdam│ 30j rolling + 12 mois
              └──────────────────────┘
`}
          </pre>
          <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-3">
            Schéma source de vérité, mis à jour à chaque évolution majeure de
            l'infra.
          </p>
        </section>

        {/* Liste des composants */}
        <section>
          <h2 className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-4">
            🧩 Détail des composants
          </h2>
          <ul className="space-y-3">
            {COMPONENTS.map((c) => (
              <li
                key={c.name}
                className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5"
              >
                <div className="flex items-start gap-3 flex-wrap">
                  <span className="text-2xl" aria-hidden="true">
                    {c.emoji}
                  </span>
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="font-display font-bold text-primary-500 dark:text-accent-300">
                      {c.name}
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-200 mt-0.5">
                      {c.role}
                    </p>
                  </div>
                  <div className="text-right text-xs space-y-1">
                    <p className="font-mono bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 px-2 py-1 rounded">
                      {c.tech}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">
                      {c.location}
                    </p>
                  </div>
                </div>
                {c.notes && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-3 leading-relaxed border-t border-gray-100 dark:border-slate-800 pt-3">
                    {c.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Crypto */}
        <section>
          <h2 className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-4">
            🔐 Algorithmes cryptographiques utilisés
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Tous les algorithmes sont conformes aux recommandations{" "}
            <strong>RGS B+ de l'ANSSI</strong> et aux standards
            NIST / IETF en vigueur.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-primary-500 text-white">
                <tr>
                  <th className="text-left px-4 py-3 font-bold">Usage</th>
                  <th className="text-left px-4 py-3 font-bold">Algorithme</th>
                </tr>
              </thead>
              <tbody>
                {CRYPTO_FACTS.map((f, i) => (
                  <tr
                    key={f.algo}
                    className={
                      i % 2 === 0
                        ? "bg-white dark:bg-slate-900"
                        : "bg-gray-50/60 dark:bg-slate-900/60"
                    }
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                      {f.algo}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-200">
                      {f.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* TLS */}
        <section>
          <h2 className="font-display text-2xl font-extrabold text-primary-500 dark:text-accent-300 mb-4">
            🔒 Posture TLS
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {TLS_FACTS.map((f) => (
              <li
                key={f.label}
                className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
              >
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400">
                  {f.label}
                </p>
                <p className="text-sm font-mono mt-1 text-gray-900 dark:text-gray-100">
                  {f.value}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-3">
            Validations indépendantes :{" "}
            <Link
              href="https://www.ssllabs.com/ssltest/analyze.html?d=humanix-academie.fr"
              className="text-accent-500 underline-offset-4 hover:underline"
            >
              SSL Labs A+
            </Link>
            ,{" "}
            <Link
              href="https://observatory.mozilla.org/analyze/humanix-academie.fr"
              className="text-accent-500 underline-offset-4 hover:underline"
            >
              Mozilla Observatory A+
            </Link>
            ,{" "}
            <Link
              href="https://securityheaders.com/?q=humanix-academie.fr"
              className="text-accent-500 underline-offset-4 hover:underline"
            >
              securityheaders.com A+
            </Link>
            .
          </p>
        </section>

        {/* Choix souverains */}
        <section className="rounded-3xl border-2 border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-900/15 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mb-3">
            🇫🇷 Choix souverains motivés
          </h2>
          <ul className="space-y-2 text-sm text-emerald-900 dark:text-emerald-200">
            <li>
              <strong>Hébergement Scaleway Paris</strong> : opérateur de
              droit français (filiale Iliad), non soumis au Cloud Act US.
            </li>
            <li>
              <strong>IA Mistral (France)</strong> au lieu d'OpenAI ou
              Anthropic US : préserve la souveraineté sur le contexte tenant
              (prompts, réponses, embeddings).
            </li>
            <li>
              <strong>Paiement Mollie B.V. (Pays-Bas)</strong> : régulé DNB
              (banque centrale néerlandaise), PSD2 UE, pas de Stripe US.
            </li>
            <li>
              <strong>Email Scaleway TEM (France)</strong> : pas de SendGrid
              US, pas de Mailgun US, pas de Resend US.
            </li>
            <li>
              <strong>Backup Object Storage Scaleway</strong> : copies
              redondantes UE uniquement (Paris + Amsterdam).
            </li>
            <li>
              <strong>Domaine OVHcloud France</strong> : enregistrement DNS
              sur sol français.
            </li>
          </ul>
        </section>

        {/* Liens vers détail */}
        <section className="grid sm:grid-cols-3 gap-3">
          <RelatedCard
            href="/conformite/anssi-hg"
            title="Conformité 42 mesures ANSSI HG"
            desc="Mapping public mesure par mesure (M1-M42)"
          />
          <RelatedCard
            href="/securite"
            title="Trust Center"
            desc="RGPD, sous-traitants, continuité, engagement humain"
          />
          <RelatedCard
            href="https://github.com/Humanix-Cybersecurity/Humanix-Academie"
            title="Code source AGPLv3"
            desc="Tout le code de la plateforme, auditable publiquement"
          />
        </section>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 italic">
          Architecture mise à jour à chaque évolution majeure. État au{" "}
          <time dateTime="2026-05-23">23 mai 2026</time>.
        </p>
      </div>
    </main>
  );
}

function RelatedCard({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-accent-300 dark:hover:border-accent-700 transition-colors"
    >
      <p className="font-display font-bold text-primary-500 dark:text-accent-300">
        {title}
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{desc}</p>
    </Link>
  );
}
