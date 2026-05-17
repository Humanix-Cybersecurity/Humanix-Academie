// SPDX-License-Identifier: AGPL-3.0-or-later
// Trust Center - refonte cosy mai 2026.
//
// Brief : "experience, terrain, sensibilisation reelle, pas celle generee
// par la peur - celle qui sent bon la maitrise et la confiance".
//
// Registre different des autres refontes (apprendre/audit-flash/famille) :
// ici la cible est **RSSI / DSI / dirigeant** qui scrute la maturite
// d'Humanix. La page doit incarner la **maitrise sobre** plutot que la
// chaleur. Palette navy/cyan/slate (pas de rose, pas d'amber).
//
// La page existante etait factuellement solide mais visuellement plate.
// Cette refonte preserve TOUS les contenus (très apprecies des RSSI) et
// ajoute :
// - Hero avec signature de date precise (les RSSI veulent des dates)
// - Section TL;DR : 6 KPIs en cards-stat pour un coup d'oeil rapide
// - Sommaire navigation interne (anchors par section)
// - Hierarchie visuelle renforcee (sections numerotees)
// - Bandeau audit public ameliore (animate-glow, emoji filigrane)
// - Citation finale sobre et technique
//
// Aucun contenu factuel n'est modifie - un RSSI qui imprime la page
// retrouve exactement les memes informations.

import Link from "next/link";
import HexBackdrop from "@/components/HexBackdrop";
import {
  ServiceJsonLd,
  BreadcrumbJsonLd,
} from "@/lib/seo/jsonld";

const SEC_TITLE =
  "Sécurité & Conformité — Trust Center souverain | Humanix Cybersecurity";
const SEC_DESC =
  "Trust Center Humanix : hébergement souverain France (Scaleway Paris), chiffrement AES-256, RGPD-by-design, conformité NIS2/DORA, audit public, sous-traitants déclarés, code source AGPLv3 auditable.";

export const metadata = {
  title: SEC_TITLE,
  description: SEC_DESC,
  alternates: { canonical: "/securite" },
  openGraph: {
    title: SEC_TITLE,
    description: SEC_DESC,
    type: "website",
    url: "/securite",
    images: [{ url: "/logo-humanix-academie-512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sécurité & Conformité — Trust Center souverain",
    description:
      "🇫🇷 Hébergement Paris · 🔒 AES-256 · ⚖️ RGPD/NIS2 · 📂 AGPLv3 · 📅 Audit public",
    images: ["/logo-humanix-academie-512.png"],
  },
};

const TRUST_KPIS = [
  {
    value: "100 %",
    label: "Hébergement France",
    detail: "Scaleway Paris · Iliad",
  },
  {
    value: "AES-256",
    label: "Chiffrement au repos",
    detail: "+ TLS 1.3 en transit",
  },
  { value: "≥ 99 %", label: "SLA disponibilité", detail: "Mensuelle moyenne" },
  { value: "24h", label: "RPO / RTO", detail: "Restauration testée mensuelle" },
  {
    value: "0",
    label: "Secret en clair",
    detail: "Scan automatisé en CI",
  },
  {
    value: "AGPLv3",
    label: "Code public auditable",
    detail: "github.com/humanix-cybersecurity",
  },
];

export default function SecuritePage() {
  return (
    <main id="main-content" className="overflow-x-hidden animate-fadeIn">
      <ServiceJsonLd
        name="Plateforme de cybersensibilisation Humanix Académie"
        description="Sensibilisation cybersécurité française, hébergée à Paris (Scaleway), chiffrée AES-256, conforme RGPD/NIS2/DORA, code source AGPLv3 auditable. Trust Center public."
        url="/securite"
        serviceType="Cybersecurity awareness training"
        areaServed="FR"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Accueil", path: "/" },
          { name: "Sécurité & Conformité", path: "/securite" },
        ]}
      />
      {/* ============================================================
          1. HERO SOBRE - gravité technique
          ============================================================ */}
      <HexBackdrop intensity="soft" className="bg-humanix-soft">
        <section
          aria-labelledby="hero-title"
          className="max-w-4xl mx-auto px-4 pt-16 pb-10 sm:pt-24 sm:pb-12 text-center"
        >
          <p className="inline-flex items-center gap-2 text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-accent-500/30 px-4 py-2 rounded-full mb-8 shadow-sm">
            <span aria-hidden="true">🛡️</span> Trust Center · v1.0 · 2 mai 2026
          </p>

          <h1
            id="hero-title"
            className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold text-primary-500 dark:text-accent-300 leading-[1.05] mb-6 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            Sécurité &amp; Conformité.
            <br />
            <span className="bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500 bg-clip-text text-transparent animate-gradient">
              En transparence radicale.
            </span>
          </h1>

          <p
            className="text-lg sm:text-xl text-gray-700 dark:text-gray-200 max-w-2xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "220ms" }}
          >
            On vous apprend la cyber. On l'applique aussi chez nous. Voici nos
            engagements, les preuves derrière, et nos gaps assumés -{" "}
            <strong>pas l'inverse</strong>.
          </p>

          <div
            className="mt-10 flex flex-wrap justify-center gap-3 text-sm animate-slide-up"
            style={{ animationDelay: "340ms" }}
          >
            <a
              href="#sommaire"
              className="inline-flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full font-medium shadow-sm hover:scale-105 transition-transform"
            >
              <span aria-hidden="true">↓</span> Sommaire
            </a>
            <Link
              href="/securite/rapport-audit"
              className="inline-flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-accent-500/40 text-accent-700 dark:text-accent-300 px-4 py-2 rounded-full font-medium shadow-sm hover:scale-105 transition-transform"
            >
              <span aria-hidden="true">📄</span> Audit public PDF
            </Link>
            <a
              href="mailto:rgpd@humanix-cybersecurity.fr"
              className="inline-flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full font-medium shadow-sm hover:scale-105 transition-transform"
            >
              <span aria-hidden="true">✉</span> Demande dossier
            </a>
          </div>
        </section>
      </HexBackdrop>

      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16 space-y-12">
        {/* ============================================================
            2. KPIs - coup d'oeil rapide
            ============================================================ */}
        <section aria-labelledby="kpis-title">
          <div className="text-center mb-8">
            <p className="text-xs sm:text-sm uppercase tracking-[0.25em] font-bold text-accent-500 mb-2">
              En un coup d'œil
            </p>
            <h2
              id="kpis-title"
              className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300"
            >
              Les chiffres clés que vous cherchez
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {TRUST_KPIS.map((kpi, idx) => (
              <Kpi
                key={kpi.label}
                value={kpi.value}
                label={kpi.label}
                detail={kpi.detail}
                delay={idx * 60}
              />
            ))}
          </div>
        </section>

        {/* ============================================================
            3. AUDIT PUBLIC - bandeau majeur, signature transparence
            ============================================================ */}
        <section aria-labelledby="audit-title">
          <div className="card-hero relative overflow-hidden animate-glow">
            <div
              aria-hidden="true"
              className="absolute -top-12 -right-12 text-9xl opacity-15"
            >
              📄
            </div>
            <div className="relative grid sm:grid-cols-[1fr_auto] items-center gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] font-bold opacity-90 mb-2">
                  Nouveau · v1.0 · 2 mai 2026
                </p>
                <h2
                  id="audit-title"
                  className="font-display text-2xl sm:text-3xl font-extrabold mb-3"
                >
                  Notre audit de sécurité, public et signé
                </h2>
                <p className="opacity-90 leading-relaxed">
                  Méthodologie OWASP/ANSSI. 12 sections, contrôles vérifiés,
                  gaps assumés, plan de remédiation à 6 mois. Aucun acteur
                  cyber français n'expose ce niveau de transparence
                  publiquement. C'est notre signature.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 whitespace-nowrap">
                <Link
                  href="/securite/rapport-audit"
                  className="inline-flex items-center gap-2 bg-white text-primary-500 font-bold px-6 py-3 rounded-2xl shadow-md hover:scale-105 transition-transform"
                >
                  Rapport interne <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/securite/audits-externes"
                  className="inline-flex items-center gap-2 bg-primary-700 text-white font-bold px-6 py-3 rounded-2xl shadow-md hover:scale-105 transition-transform border-2 border-white/30"
                >
                  Audits externes <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================
            4. SOMMAIRE - navigation interne
            ============================================================ */}
        <section
          aria-labelledby="sommaire-title"
          id="sommaire"
          className="scroll-mt-20"
        >
          <div className="card bg-gradient-to-br from-cyan-50/50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/30 border-cyan-200 dark:border-cyan-900/40">
            <h2
              id="sommaire-title"
              className="font-display text-lg font-extrabold text-primary-500 dark:text-accent-300 mb-3 flex items-center gap-2"
            >
              <span aria-hidden="true">📑</span> Sommaire détaillé
            </h2>
            <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm tabular-nums">
              <TocItem n="01" href="#hebergement">
                Hébergement souverain France
              </TocItem>
              <TocItem n="02" href="#rgpd">
                Conformité RGPD
              </TocItem>
              <TocItem n="03" href="#technique">
                Sécurité technique de la plateforme
              </TocItem>
              <TocItem n="04" href="#secrets">
                Gestion des secrets
              </TocItem>
              <TocItem n="05" href="#sous-traitants">
                Sous-traitants techniques
              </TocItem>
              <TocItem n="06" href="#continuite">
                Continuité de service
              </TocItem>
              <TocItem n="07" href="#humain">
                Engagement humain
              </TocItem>
              <TocItem n="08" href="#roadmap">
                Roadmap conformité
              </TocItem>
              <TocItem n="09" href="#grc">
                Intégration GRC native
              </TocItem>
            </ol>
          </div>
        </section>

        {/* ============================================================
            5-13. SECTIONS DETAILLEES
            Contenu factuel preserve, hierarchie visuelle renforcee.
            ============================================================ */}
        <Section
          n="01"
          emoji="🇫🇷"
          title="Hébergement souverain en France"
          id="hebergement"
        >
          <p>
            Toutes les données de la plateforme Humanix Académie sont hébergées
            par <strong>Scaleway SAS</strong> (Paris, France), filiale du
            groupe Iliad. Datacenters en région parisienne, opérateur de droit
            français, <strong>non soumis au Cloud Act</strong>.
          </p>
          <p>
            Aucun transfert de données vers un pays tiers (notamment
            États-Unis) n'est effectué dans le cadre du fonctionnement de la
            plateforme. Si nous devions un jour recourir à un sous-traitant
            hors UE, nous appliquerions les clauses contractuelles types de la
            Commission européenne.
          </p>
          <ul>
            <li>Datacenters certifiés ISO 27001, ISO 50001, HDS</li>
            <li>Chiffrement au repos AES-256</li>
            <li>
              Sauvegardes quotidiennes chiffrées, conservées 30 jours minimum
            </li>
          </ul>
        </Section>

        <Section n="02" emoji="📋" title="Conformité RGPD" id="rgpd">
          <ul>
            <li>
              <strong>Politique de confidentialité</strong> détaillée : durées
              de conservation, droits, sous-traitants →{" "}
              <Link
                href="/confidentialite"
                className="text-accent-500 underline-offset-4 hover:underline"
              >
                la consulter
              </Link>
            </li>
            <li>
              <strong>Contrat de sous-traitance (DPA)</strong> systématiquement
              signé avec chaque client SaaS - modèle aligné sur les clauses
              types CNIL
            </li>
            <li>
              <strong>Registre des traitements</strong> tenu à jour (côté
              responsable de traitement et côté sous-traitant)
            </li>
            <li>
              <strong>Procédure violation de données</strong> : notification
              CNIL sous 72h, information des clients concernés
            </li>
            <li>
              <strong>Mesures de minimisation</strong> : nous ne collectons que
              ce qui est nécessaire à la finalité pédagogique
            </li>
          </ul>
        </Section>

        <Section
          n="03"
          emoji="🔐"
          title="Sécurité technique de la plateforme"
          id="technique"
        >
          <ul>
            <li>
              <strong>TLS 1.3</strong> pour toutes les connexions, redirection
              HTTPS forcée
            </li>
            <li>
              <strong>Headers de sécurité</strong> : HSTS, X-Frame-Options,
              X-Content-Type-Options, Referrer-Policy, Permissions-Policy
            </li>
            <li>
              <strong>Authentification</strong> : magic link par email (Scaleway TEM)
              + sessions signées (Auth.js v5)
            </li>
            <li>
              <strong>Mots de passe</strong> : aucun mot de passe stocké côté
              Humanix - authentification sans mot de passe
            </li>
            <li>
              <strong>API keys</strong> hashées en SHA-256 ; révocation 1-clic
              ; expiration configurable
            </li>
            <li>
              <strong>Cloisonnement multi-tenant</strong> : isolation logique
              par <code>tenantId</code> sur toutes les requêtes, vérifié par
              tests automatisés
            </li>
            <li>
              <strong>Principe du moindre privilège</strong> appliqué côté
              rôles applicatifs (LEARNER / MANAGER / ADMIN / SUPERADMIN)
            </li>
            <li>
              <strong>Logs d'accès</strong> conservés 12 mois, horodatés,
              immuables
            </li>
            <li>
              <strong>Limitation de débit</strong> et protection contre les
              abus de soumission
            </li>
          </ul>
        </Section>

        <Section n="04" emoji="🤐" title="Gestion des secrets" id="secrets">
          <ul>
            <li>
              Aucun secret n'est commité dans le code source - vérifié par scan
              automatisé en CI
            </li>
            <li>
              Variables d'environnement injectées au runtime, jamais
              persistées dans les images Docker
            </li>
            <li>
              Rotation périodique des secrets de chiffrement et des clés
              signature
            </li>
            <li>Coffre de secrets pour les credentials administrateur</li>
          </ul>
        </Section>

        <Section
          n="05"
          emoji="🤝"
          title="Sous-traitants techniques"
          id="sous-traitants"
        >
          <p>
            Liste des sous-traitants impliqués dans le fonctionnement du
            service :
          </p>
          <div className="overflow-x-auto -mx-2 px-2 mt-3">
            <table className="w-full text-sm border-collapse">
              <caption className="sr-only">Mesures de securite techniques de la plateforme</caption>
              <thead>
                <tr>
                  <th className="text-left p-3 bg-primary-500 text-white font-bold rounded-tl-xl">
                    Sous-traitant
                  </th>
                  <th className="text-left p-3 bg-primary-500 text-white font-bold">
                    Rôle
                  </th>
                  <th className="text-left p-3 bg-primary-500 text-white font-bold rounded-tr-xl">
                    Localisation
                  </th>
                </tr>
              </thead>
              <tbody>
                <SubcontractorRow
                  name="Scaleway SAS"
                  role="Hébergement, infra cloud, sauvegardes"
                  loc="France 🇫🇷"
                />
                <SubcontractorRow
                  name="Scaleway TEM"
                  role="Emails transactionnels (magic links, alertes, newsletter)"
                  loc="France 🇫🇷 (Paris)"
                />
                <SubcontractorRow
                  name="Payplug SA"
                  role="Prestataire de paiement (PCI-DSS niveau 1, tokenisation CB)"
                  loc="France 🇫🇷 (Paris)"
                />
                <SubcontractorRow
                  name="Olinda SAS (Qonto)"
                  role="Compte de paiement professionnel (réception virements)"
                  loc="France 🇫🇷"
                />
                <SubcontractorRow
                  name="Dougs SAS"
                  role="Expertise comptable et facturation"
                  loc="France 🇫🇷"
                />
                <SubcontractorRow
                  name="Hiscox France"
                  role="Assureur RC Pro (cas d'incident matériel uniquement)"
                  loc="France 🇫🇷"
                />
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 italic">
            Tout nouveau sous-traitant impliquant des données personnelles fait
            l'objet d'une notification écrite aux clients, avec droit
            d'objection.
          </p>
        </Section>

        <Section
          n="06"
          emoji="🔄"
          title="Continuité de service"
          id="continuite"
        >
          <ul>
            <li>
              <strong>SLA cible</strong> : 99 % de disponibilité mensuelle
              moyenne
            </li>
            <li>
              <strong>Sauvegardes</strong> : quotidiennes, chiffrées,
              conservées 30 jours, testées par restauration mensuelle
            </li>
            <li>
              <strong>RPO</strong> (perte maximale de données acceptable) : 24h
            </li>
            <li>
              <strong>RTO</strong> (temps maximal de remise en service) : 24h
            </li>
            <li>
              <strong>Réversibilité</strong> : export des données au format CSV
              ou JSON sur simple demande, à tout moment
            </li>
          </ul>
        </Section>

        <Section n="07" emoji="👤" title="Engagement humain" id="humain">
          <ul>
            <li>
              <strong>RC Pro Cybersécurité</strong> souscrite chez{" "}
              <strong>Hiscox France</strong> (assureur spécialisé en risques
              cyber et professions du numérique). Numéro de police et montants
              de garanties communiqués dans le DPA à la signature du contrat.
            </li>
            <li>
              <strong>Veille permanente</strong> sur les vulnérabilités (mise à
              jour des dépendances dans les 7 jours pour les CVE critiques)
            </li>
            <li>
              <strong>Référencement CyberMalveillance.gouv.fr</strong> en cours
              pour offrir un canal d'alerte officiel
            </li>
            <li>
              <strong>Ouverture aux audits</strong> : les clients peuvent
              réaliser leur propre audit sécurité, sur engagement écrit
              préalable
            </li>
          </ul>
        </Section>

        <Section n="08" emoji="🗺️" title="Roadmap conformité" id="roadmap">
          <ul>
            <li>
              <strong>Q3 2026 :</strong> Référencement CyberMalveillance.gouv.fr finalisé
            </li>
            <li>
              <strong>Q4 2026 :</strong> Évaluation Label Cyber Expert AFNOR
            </li>
            <li>
              <strong>2027 :</strong>{" "}
              <strong>
                Migration du code source vers une forge souveraine française
              </strong>{" "}
              (Forgejo auto-hébergé chez Scaleway, ou plateforme communautaire
              FR équivalente). GitHub reste utilisé en attendant pour la
              visibilité écosystème open source - la portabilité est garantie
              par Git lui-même.
            </li>
            <li>
              2027 : Étude qualification PASSI ANSSI (audits) - selon évolution
              business
            </li>
            <li>
              Conformité <strong>NIS2</strong> : application du référentiel
              ANSSI dès que applicable au volume d'activité
            </li>
          </ul>
        </Section>

        <Section n="09" emoji="🔗" title="Intégration GRC native" id="grc">
          <p>
            Vos preuves de sensibilisation alimentent automatiquement votre
            outil GRC via l'API <code>/api/v1/evidence-export</code>.
            Connecteur Python prêt à l'emploi pour{" "}
            <strong>CISO Assistant</strong> (intuitem). Mappings ISO 27001,
            NIS2, RGPD, ANSSI HG documentés et auditables.
          </p>
          <p className="mt-3">
            <Link
              href="/integrations/ciso-assistant"
              className="font-bold text-accent-500 underline-offset-4 hover:underline"
            >
              Voir le connecteur CISO Assistant →
            </Link>
          </p>
        </Section>

        {/* ============================================================
            14. CTA CONTACT - pour les RSSI qui veulent un dossier complet
            ============================================================ */}
        <section aria-labelledby="contact-title">
          <div className="rounded-3xl bg-gradient-to-br from-cyan-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/30 border-2 border-cyan-200 dark:border-cyan-900/40 p-8 sm:p-10 text-center">
            <p className="text-xs uppercase tracking-[0.25em] font-bold text-cyan-700 dark:text-cyan-300 mb-2">
              Pour aller plus loin
            </p>
            <h2
              id="contact-title"
              className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 mb-4"
            >
              Une question sur notre sécurité ?
            </h2>
            <p className="text-gray-700 dark:text-gray-200 max-w-xl mx-auto mb-6 leading-relaxed">
              RSSI, DSI, dirigeant : nous fournissons sur demande le DPA, le
              registre des traitements, ou un dossier complet pour vos due
              diligence. Réponse personnelle sous 48 h ouvrées.
            </p>
            <a
              href="mailto:rgpd@humanix-cybersecurity.fr"
              className="btn-primary inline-flex items-center gap-2"
            >
              <span aria-hidden="true">✉</span> Demander notre dossier sécurité
            </a>
          </div>
        </section>

        {/* ============================================================
            15. RESPIRATION - citation finale technique sobre
            ============================================================ */}
        <section className="text-center pt-4">
          <blockquote className="font-display italic text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            « La transparence n'est pas une vulnérabilité. C'est ce qui
            distingue la maîtrise du marketing. »
          </blockquote>
          <p
            aria-hidden="true"
            className="mt-4 text-xs uppercase tracking-[0.25em] text-accent-500/70 font-bold"
          >
            - Hex veille
          </p>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8 italic">
            Page mise à jour à chaque évolution majeure. État au{" "}
            <time dateTime="2026-05-05">5 mai 2026</time>.
          </p>
        </section>
      </div>
    </main>
  );
}

// ===========================================================================
// SOUS-COMPOSANTS LOCAUX
// ===========================================================================

function Kpi({
  value,
  label,
  detail,
  delay,
}: {
  value: string;
  label: string;
  detail: string;
  delay: number;
}) {
  return (
    <div
      className="card-stat text-center animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="font-display text-2xl sm:text-3xl font-extrabold text-primary-500 dark:text-accent-300 tabular-nums leading-tight mb-1">
        {value}
      </p>
      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">
        {label}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
        {detail}
      </p>
    </div>
  );
}

function TocItem({
  n,
  href,
  children,
}: {
  n: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <a
        href={href}
        className="flex items-baseline gap-3 py-1 text-gray-700 dark:text-gray-200 hover:text-accent-500 dark:hover:text-accent-300 transition-colors"
      >
        <span className="font-display font-extrabold text-accent-500/70 shrink-0">
          {n}
        </span>
        <span className="underline-offset-4 hover:underline">{children}</span>
      </a>
    </li>
  );
}

function Section({
  n,
  emoji,
  title,
  id,
  children,
}: {
  n: string;
  emoji: string;
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-20 card hover:shadow-md transition-shadow"
    >
      <header className="flex items-baseline gap-4 mb-4 pb-3 border-b-2 border-dashed border-gray-200 dark:border-slate-700">
        <span
          className="font-display font-extrabold text-3xl sm:text-4xl text-accent-500/70 tabular-nums shrink-0"
          aria-hidden="true"
        >
          {n}
        </span>
        <span className="text-2xl sm:text-3xl shrink-0" aria-hidden="true">
          {emoji}
        </span>
        <h2
          id={`${id}-title`}
          className="font-display text-xl sm:text-2xl font-extrabold text-primary-500 dark:text-accent-300 leading-tight"
        >
          {title}
        </h2>
      </header>
      <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
        {children}
      </div>
    </section>
  );
}

function SubcontractorRow({
  name,
  role,
  loc,
}: {
  name: string;
  role: string;
  loc: string;
}) {
  return (
    <tr className="border-b border-gray-200 dark:border-slate-700 last:border-0">
      <td className="p-3 font-bold text-primary-500 dark:text-accent-300">
        {name}
      </td>
      <td className="p-3 text-gray-700 dark:text-gray-200">{role}</td>
      <td className="p-3 text-gray-600 dark:text-gray-300 italic">{loc}</td>
    </tr>
  );
}
