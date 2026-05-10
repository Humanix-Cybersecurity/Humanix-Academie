// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique : passerelle Humanix Academie <-> CISO Assistant.
// Cible : RSSI / DSI qui evalue notre integration GRC.
// Contraintes editoriales :
//  - A11y RGAA 4.1 : semantic HTML, headings hierarchiques, aria, focus visible
//  - UI/UX differenciante : schema SVG anime, snippet copiable, tableau filtrable
//  - Honnetete : on dit ce qu'on couvre ET ce qui est hors scope

import Link from "next/link";
import CisoAssistantBridge from "@/components/CisoAssistantBridge";

export const metadata = {
  title: "Connecteur CISO Assistant - Humanix Academie",
  description:
    "Le seul connecteur natif entre une plateforme française de sensibilisation cyber et CISO Assistant (intuitem). Vos preuves de sensibilisation alimentent automatiquement votre GRC.",
};

export default function CisoAssistantIntegrationPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14 animate-fadeIn">
      {/* ===== HERO ===== */}
      <header className="text-center mb-12">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">
          Integration RSSI · GRC
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          Le seul connecteur natif{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            sensibilisation cyber × GRC
          </span>{" "}
          en France.
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Vos preuves de sensibilisation, certificats individuels, score de
          maturite et Pack NIS2 alimentent automatiquement{" "}
          <strong>CISO Assistant</strong> (intuitem) et tout outil GRC
          compatible. Plus de copier-coller, plus d'Excel partage, plus d'audit
          douloureux.
        </p>
      </header>

      {/* ===== SCHEMA ARCHITECTURE ===== */}
      <section
        aria-labelledby="archi-title"
        className="card mb-12 bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700"
      >
        <h2
          id="archi-title"
          className="text-xl font-extrabold text-primary-500 text-center mb-2"
        >
          Comment ça marche ?
        </h2>
        <p className="text-center text-sm text-gray-600 dark:text-gray-300 mb-6">
          Approche <strong>Pull</strong> : votre instance CISO Assistant
          interroge l'API Humanix, recupere les preuves vivantes, les attache
          automatiquement aux controles. Aucun couplage fort.
        </p>

        <svg
          viewBox="0 0 700 220"
          className="w-full max-w-3xl mx-auto"
          role="img"
          aria-label="Schema d'architecture : CISO Assistant interroge Humanix Academie via l'API REST evidence-export, qui retourne un bundle JSON de preuves de conformité."
        >
          <defs>
            <linearGradient
              id="grad-humanix"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#0B3D91" />
              <stop offset="100%" stopColor="#00A3A1" />
            </linearGradient>
            <linearGradient id="grad-ciso" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7C3AED" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
            <marker
              id="arrow-r"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#00A3A1" />
            </marker>
            <marker
              id="arrow-l"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#7C3AED" />
            </marker>
          </defs>

          {/* CISO Assistant box (gauche) */}
          <rect
            x="20"
            y="60"
            width="200"
            height="100"
            rx="16"
            fill="url(#grad-ciso)"
          />
          <text
            x="120"
            y="100"
            textAnchor="middle"
            fontSize="16"
            fontWeight="800"
            fill="white"
          >
            CISO Assistant
          </text>
          <text
            x="120"
            y="122"
            textAnchor="middle"
            fontSize="11"
            fill="white"
            opacity="0.85"
          >
            (RSSI / GRC)
          </text>
          <text
            x="120"
            y="140"
            textAnchor="middle"
            fontSize="10"
            fill="white"
            opacity="0.7"
          >
            ISO 27001 · NIS2 · RGPD
          </text>

          {/* Humanix box (droite) */}
          <rect
            x="480"
            y="60"
            width="200"
            height="100"
            rx="16"
            fill="url(#grad-humanix)"
          />
          <text
            x="580"
            y="100"
            textAnchor="middle"
            fontSize="16"
            fontWeight="800"
            fill="white"
          >
            Humanix Academie
          </text>
          <text
            x="580"
            y="122"
            textAnchor="middle"
            fontSize="11"
            fill="white"
            opacity="0.85"
          >
            (sensibilisation)
          </text>
          <text
            x="580"
            y="140"
            textAnchor="middle"
            fontSize="10"
            fill="white"
            opacity="0.7"
          >
            score · certificats · NIS2
          </text>

          {/* Fleche aller : CISO -> Humanix */}
          <line
            x1="225"
            y1="95"
            x2="475"
            y2="95"
            stroke="#7C3AED"
            strokeWidth="2.5"
            markerEnd="url(#arrow-l)"
          />
          <text
            x="350"
            y="86"
            textAnchor="middle"
            fontSize="10"
            fill="#7C3AED"
            fontWeight="700"
          >
            GET /api/v1/evidence-export
          </text>

          {/* Fleche retour : Humanix -> CISO */}
          <line
            x1="475"
            y1="125"
            x2="225"
            y2="125"
            stroke="#00A3A1"
            strokeWidth="2.5"
            markerEnd="url(#arrow-r)"
          />
          <text
            x="350"
            y="142"
            textAnchor="middle"
            fontSize="10"
            fill="#00A3A1"
            fontWeight="700"
          >
            bundle JSON (preuves vivantes)
          </text>

          {/* Bandeau bas */}
          <text
            x="350"
            y="200"
            textAnchor="middle"
            fontSize="11"
            fill="#555555"
          >
            Auth : API key tenant · Rate limit : 10 req/h · Audit trail : event
            evidence.exported
          </text>
        </svg>
      </section>

      {/* ===== COMPOSANT CLIENT (onglets framework, snippets, mapping) ===== */}
      <CisoAssistantBridge />

      {/* ===== POURQUOI ===== */}
      <section
        aria-labelledby="why-title"
        className="card mb-10 mt-12 bg-gradient-to-br from-primary-500 to-accent-500 text-white"
      >
        <h2 id="why-title" className="text-2xl font-extrabold mb-4">
          Pourquoi cette integration ?
        </h2>
        <ul className="space-y-3 text-sm">
          <li>
            <strong>Pour le RSSI externalise</strong> : 8 PME = 8 instances CISO
            Assistant. Une seule passerelle Humanix consolide les preuves de
            sensibilisation des 8 tenants.
          </li>
          <li>
            <strong>Pour le DSI ETI en demarche ISO 27001</strong> : le controle
            A.6.3 (sensibilisation) est aliment automatiquement en preuves
            vivantes (score, certificats, taux de signalement).
          </li>
          <li>
            <strong>Pour le dirigeant en conformite NIS2</strong> : le score
            NIS2 affiche dans CISO Assistant integre desormais le facteur
            humain.
          </li>
        </ul>
      </section>

      {/* ===== FAQ TECHNIQUE ===== */}
      <section aria-labelledby="faq-title" className="mb-10">
        <h2
          id="faq-title"
          className="text-2xl font-extrabold text-primary-500 mb-5"
        >
          Questions techniques
        </h2>
        <div className="space-y-3">
          <details className="card">
            <summary className="cursor-pointer font-bold text-primary-500">
              CISO Assistant n'est pas requis ?
            </summary>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Non. Le format <code>ciso-assistant-v1</code> est documente et
              stable. N'importe quel outil GRC (Eramba, MetricStream, ServiceNow
              GRC, ou un script maison) peut consommer l'endpoint. Le format{" "}
              <code>raw</code> donne accès aux données brutes.
            </p>
          </details>
          <details className="card">
            <summary className="cursor-pointer font-bold text-primary-500">
              Quels frameworks sont supportes ?
            </summary>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              ISO 27001:2022, NIS2, RGPD, ANSSI Hygiene Informatique en
              couverture detaillee. NIST CSF en couverture partielle (mapping
              complet en v1.1). Tous les mappings sont open-source et
              auditables.
            </p>
          </details>
          <details className="card">
            <summary className="cursor-pointer font-bold text-primary-500">
              Quelle est la fréquence de rafraichissement ?
            </summary>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Vous controlez la fréquence depuis votre cote. Un cron quotidien
              suffit pour la plupart des usages. Le rate limit est de 10 req/h
              par tenant.
            </p>
          </details>
          <details className="card">
            <summary className="cursor-pointer font-bold text-primary-500">
              Et le mode push (webhook) ?
            </summary>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Prevu en v1.1 : un webhook outbound <code>evidence.created</code>{" "}
              signe HMAC-SHA256 sera disponible pour pousser les preuves en
              temps reel a chaque generation de certificat ou changement de
              score.
            </p>
          </details>
          <details className="card">
            <summary className="cursor-pointer font-bold text-primary-500">
              Et la conformité RGPD de l'export ?
            </summary>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              L'export ne contient pas de PII brute : les certificats sont
              represente par des liens (telechargeables avec votre cle API), pas
              par leurs contenus. Les metriques sont agregees au niveau tenant.
            </p>
          </details>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section
        aria-labelledby="cta-title"
        className="card text-center bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 border-2 border-accent-500/30"
      >
        <h2
          id="cta-title"
          className="text-2xl font-extrabold text-primary-500 mb-2"
        >
          Pret a brancher votre GRC ?
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-5 max-w-xl mx-auto">
          On vous accompagne sur la configuration. Connecteur Python pret-a-
          l'emploi, mapping documente, support direct.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a
            href="mailto:contact@humanix-cybersecurity.fr?subject=Connecteur%20CISO%20Assistant"
            className="btn-primary"
          >
            Demander une demo
          </a>
          <Link href="/admin/api-keys" className="btn-secondary">
            Générer ma cle API
          </Link>
          <a
            href="https://github.com/intuitem/ciso-assistant-community"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            CISO Assistant sur GitHub ↗
          </a>
        </div>
      </section>

      <p className="text-center text-xs text-gray-500 mt-10">
        Spec technique :{" "}
        <a href="/INTEGRATION_CISO_ASSISTANT.md" className="underline">
          INTEGRATION_CISO_ASSISTANT.md
        </a>{" "}
        · Mapping : <code>lib/mapping-grc.ts</code> · Endpoint :{" "}
        <code>/api/v1/evidence-export</code>
      </p>
    </div>
  );
}
