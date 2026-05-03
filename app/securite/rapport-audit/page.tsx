// Page publique : rapport d'audit de sécurité.
// Manifeste : "on va vers la cyber, on ne la subit pas".

import Link from "next/link";

export const metadata = {
  title: "Rapport d'audit de sécurité — Humanix Académie",
  description:
    "Rapport public d'audit de sécurité de la plateforme Humanix Académie. Contrôles en place, points d'amélioration, plan de remédiation à 6 mois.",
};

export default function RapportAuditPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-10">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-2">
          🛡️ Trust Center · Transparence radicale
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          Rapport d'audit de sécurité.<br />
          <span className="text-accent-500">Public, daté, signé.</span>
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
          On vend de la sensibilisation à la cybersécurité. Le minimum d'honnêteté
          est d'appliquer la règle à nous-mêmes — et de rendre nos pratiques
          inspectables par tous.
        </p>
      </div>

      {/* CTA téléchargement */}
      <div className="card bg-gradient-to-br from-primary-500 to-accent-500 text-white mb-8">
        <div className="grid sm:grid-cols-[auto_1fr_auto] gap-5 items-center">
          <div className="text-5xl shrink-0" aria-hidden="true">📄</div>
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80 font-bold mb-1">
              Édition v1.0 · 2 mai 2026
            </p>
            <h2 className="text-xl font-bold">Rapport complet (PDF, ~12 pages)</h2>
            <p className="text-sm opacity-90 mt-1">
              Méthodologie, périmètre, contrôles vérifiés, gaps assumés, plan de remédiation à 6 mois.
            </p>
          </div>
          <a
            href="/api/securite/rapport-audit/download"
            className="bg-white text-primary-500 font-bold px-5 py-3 rounded-2xl hover:scale-105 transition shadow-lg whitespace-nowrap text-sm"
            download
          >
            📥 Télécharger
          </a>
        </div>
      </div>

      {/* Synthèse en chiffres */}
      <section className="grid grid-cols-3 gap-3 mb-10">
        <Stat value="0" label="vulnérabilité critique connue" tone="success" />
        <Stat value="100 %" label="hébergement France/UE" tone="info" />
        <Stat value="6" label="actions de remédiation à 6 mois" tone="warn" />
      </section>

      {/* Synthèse niveaux */}
      <section className="card mb-10">
        <h2 className="text-2xl font-bold text-primary-500 mb-4">
          Notre niveau de maturité par domaine
        </h2>
        <div className="space-y-2">
          <Maturity label="Authentification & autorisation" level="mature" />
          <Maturity label="Sécurité applicative (validation, anti-XSS, anti-SSRF)" level="mature" />
          <Maturity label="Sécurité réseau & infrastructure" level="mature" />
          <Maturity label="Protection des données personnelles (RGPD)" level="mature" />
          <Maturity label="SDLC sécurisé (TypeScript, ORM, CI)" level="intermediate" />
          <Maturity label="Gestion des incidents" level="intermediate" />
          <Maturity label="Audit externe formel par cabinet tiers" level="todo" />
        </div>
      </section>

      {/* Position éditoriale */}
      <section className="card mb-10 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400">
        <h2 className="font-bold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
          <span aria-hidden="true">⚖️</span> Position éditoriale assumée
        </h2>
        <ul className="text-sm text-amber-900 dark:text-amber-100 space-y-2 list-disc pl-5">
          <li>
            Nous <strong>ne prétendons pas</strong> être ISO 27001 ni SOC 2.
            Ces certifications sont disproportionnées pour notre segment (TPE/PME
            françaises avec budget cyber &lt; 5 K€/an).
          </li>
          <li>
            Nous <strong>ne prétendons pas</strong> non plus être SecNumCloud.
            Cette qualification s'adresse à des opérateurs critiques.
          </li>
          <li>
            Nous <strong>revendiquons</strong> un niveau de sécurité{" "}
            <strong>« ANSSI-PME ready »</strong> : robuste pour notre cible,
            transparent dans ses limites, en amélioration continue.
          </li>
        </ul>
      </section>

      {/* Ce qui est en place */}
      <section className="card mb-10">
        <h2 className="text-2xl font-bold text-primary-500 mb-4">
          ✅ Ce qui est en place
        </h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <Bullet text="Auth.js v5 + SSO Google/Microsoft + magic link Resend (zero-password)" />
          <Bullet text="Multi-tenant scoping strict sur tous les modèles Prisma" />
          <Bullet text="Plan-gating à 6 paliers (trial / decouverte / solo / essentielle / pro / premium)" />
          <Bullet text="HAProxy 2.9 frontend (TLS 1.2+, rate limit, ACL méthodes, anti-bots)" />
          <Bullet text="Réseaux Docker segmentés (frontend / backend privé)" />
          <Bullet text="Validation Zod systématique sur toutes les routes API" />
          <Bullet text="Anti-SSRF strict sur les webhooks (refus IPs privées + .local)" />
          <Bullet text="Sanitisation HTML pour le générateur phishing IA" />
          <Bullet text="Rate limiting applicatif (TTS, Outlook report, IA Mistral)" />
          <Bullet text="Audit trail complet (table Event, sans PII dans les payloads)" />
          <Bullet text="DPA art. 28 + registre RGPD art. 30 maintenus" />
          <Bullet text="IP hashées dans audits (anti-fingerprint utilisateur)" />
          <Bullet text="Hébergement France (Scaleway), zéro Cloud Act US sur données" />
          <Bullet text="IA souveraine (Mistral FR) pour génération phishing" />
        </div>
      </section>

      {/* Ce qui est en backlog */}
      <section className="card mb-10">
        <h2 className="text-2xl font-bold text-primary-500 mb-4">
          🔲 Ce qui est en backlog (et pourquoi)
        </h2>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <Backlog
            title="Pentest externe par cabinet PASSI"
            when="à venir"
            why="Devis pris auprès de 3 cabinets (Wavestone, Devoteam, ou cabinet PASSI plus petit). Pentest boîte grise, ~5-7 jours."
          />
          <Backlog
            title="Audit RGAA externe"
            when="à venir"
            why="Audit interne 88 % conformité déjà fait. Cabinet certifié ciblé (Atalan / Tanaguru / Access42). Budget identifié ~3 000 € HT."
          />
          <Backlog
            title="Dependabot / scan SCA en CI"
            when="à venir"
            why="Aujourd'hui : npm audit manuel mensuel. Demain : auto-PR à chaque CVE détectée."
          />
          <Backlog
            title="Scan SAST en CI (Semgrep / CodeQL)"
            when="à venir"
            why="Détection automatisée de patterns à risque dans le code. Ruleset OWASP par défaut."
          />
          <Backlog
            title="Tests E2E Playwright sur flows critiques"
            when="à venir"
            why="Auth, achat boutique, génération phishing IA, téléchargement Pack NIS2, complétion épisode."
          />
          <Backlog
            title="Programme bug bounty formalisé"
            when="à venir"
            why="Aujourd'hui : divulgation responsable via security@humanix-cybersecurity.fr (cf. plus bas). Demain : périmètre + récompenses formalisés."
          />
        </div>
      </section>

      {/* Limites assumées */}
      <section className="card mb-10 bg-gray-50 dark:bg-slate-800">
        <h2 className="text-xl font-bold text-primary-500 mb-3">
          ❌ Limites assumées par design
        </h2>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 list-disc pl-5">
          <li>
            <strong>Pas de SAML 2.0 / SCIM enterprise</strong> par défaut. Focus
            délibéré sur le segment TPE/PME. SSO Google + Microsoft Entra suffit
            pour 95 % des prospects. SAML/SCIM disponible sur demande pour les
            contrats &gt; 50 utilisateurs.
          </li>
          <li>
            <strong>Pas de chiffrement applicatif au-delà du TLS</strong> : nos
            données ne sont pas considérées comme ultra-sensibles (pas de santé,
            pas de défense). Le chiffrement TLS bout en bout + chiffrement
            filesystem Scaleway est jugé adapté au segment.
          </li>
          <li>
            <strong>Pas d'ISO 27001 ni SOC 2</strong> : disproportionné pour le
            segment PME visé. À reconsidérer si nous montons en gamme vers le
            mid-market.
          </li>
        </ul>
      </section>

      {/* Divulgation responsable */}
      <section className="card mb-10 bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-primary-900/30 dark:to-cyan-900/30 border-l-4 border-accent-500">
        <h2 className="text-xl font-bold text-primary-500 mb-3">
          🛡️ Programme de divulgation responsable
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          Vous avez découvert une faille ? Écrivez-nous, nous l'écoutons et nous
          la corrigeons. Pas de poursuites tant que les règles sont respectées.
        </p>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc pl-5 mb-4">
          <li>Accusé de réception sous <strong>48h ouvrées</strong></li>
          <li>Évaluation et plan d'action sous <strong>5 jours ouvrés</strong></li>
          <li>Information sur la résolution dans les <strong>30 jours</strong></li>
          <li>
            Crédit public sur ce rapport et la page{" "}
            <Link href="/securite" className="text-accent-500 underline">/securite</Link>{" "}
            (avec votre accord)
          </li>
        </ul>
        <a
          href="mailto:security@humanix-cybersecurity.fr"
          className="btn-primary text-sm inline-block"
        >
          security@humanix-cybersecurity.fr
        </a>
      </section>

      {/* Liens utiles */}
      <section className="card mb-10">
        <h3 className="font-bold text-primary-500 mb-3">Documents complémentaires</h3>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <Link href="/securite" className="hover:text-accent-500">
            🛡️ Trust Center (vue d'ensemble)
          </Link>
          <Link href="/comparatif" className="hover:text-accent-500">
            ⚖️ Comparatif honnête vs concurrents
          </Link>
          <Link href="/accessibilite" className="hover:text-accent-500">
            ♿ Déclaration d'accessibilité RGAA
          </Link>
          <Link href="/confidentialite" className="hover:text-accent-500">
            🔒 Politique de confidentialité (RGPD)
          </Link>
          <Link href="/observatoire-fuites" className="hover:text-accent-500">
            📊 Observatoire des fuites de données FR
          </Link>
          <Link href="/cyber-meteo" className="hover:text-accent-500">
            🇫🇷 Cyber-météo France
          </Link>
        </div>
      </section>

      {/* Footer signé */}
      <p className="text-center text-sm text-gray-500 italic">
        « La cybersécurité n'est pas une destination, c'est une trajectoire.
        Nous vous tenons informés. »<br />
        — Florian DURANO, fondateur, Humanix-Cybersecurity.
      </p>
    </div>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: "success" | "info" | "warn";
}) {
  const cls: Record<string, string> = {
    success: "border-green-300 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300",
    info: "border-cyan-300 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300",
    warn: "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  };
  return (
    <div className={`rounded-2xl border-2 p-4 text-center ${cls[tone]}`}>
      <p className="text-3xl sm:text-4xl font-extrabold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wide mt-1 leading-tight">{label}</p>
    </div>
  );
}

function Maturity({
  label,
  level,
}: {
  label: string;
  level: "mature" | "intermediate" | "todo";
}) {
  const meta = {
    mature: { color: "bg-green-500", text: "Mature", textColor: "text-green-700 dark:text-green-300" },
    intermediate: { color: "bg-amber-500", text: "Intermédiaire", textColor: "text-amber-700 dark:text-amber-300" },
    todo: { color: "bg-red-500", text: "À faire", textColor: "text-red-700 dark:text-red-300" },
  }[level];
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800">
      <span className="text-sm">{label}</span>
      <span className={`text-xs font-bold uppercase tracking-wide ${meta.textColor} flex items-center gap-2 shrink-0`}>
        <span className={`w-2 h-2 rounded-full ${meta.color}`} aria-hidden="true" />
        {meta.text}
      </span>
    </div>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-2">
      <span className="text-green-600 mt-0.5 shrink-0" aria-hidden="true">✓</span>
      <span>{text}</span>
    </p>
  );
}

function Backlog({ title, when, why }: { title: string; when: string; why: string }) {
  return (
    <div className="border-l-4 border-amber-400 pl-3">
      <p className="font-bold text-primary-500">
        {title}{" "}
        <span className="text-xs font-bold uppercase bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded ml-2">
          {when}
        </span>
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{why}</p>
    </div>
  );
}
