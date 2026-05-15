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
          Intégration RSSI · GRC
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          Le seul connecteur natif{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            sensibilisation cyber × GRC
          </span>{" "}
          en France.
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Humanix Académie pousse automatiquement vos preuves de sensibilisation
          dans <strong>CISO Assistant</strong> (intuitem). Plus de copier-coller,
          plus d'Excel partagé, plus d'audit douloureux. Tout est traçable,
          signé Ed25519, vérifiable hors-ligne.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/integrations/ciso-assistant/fonctionnalites"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 text-white font-semibold hover:bg-primary-600 transition shadow-sm"
          >
            <span aria-hidden="true">📖</span>
            Voir les 17 fonctionnalités en détail
          </Link>
        </div>
      </header>

      {/* ===== CE QU'ON ALIMENTE COTE CISO ASSISTANT ===== */}
      <section
        aria-labelledby="surfaces-title"
        className="card mb-12 border-2 border-primary-500/20"
      >
        <h2
          id="surfaces-title"
          className="text-2xl font-extrabold text-primary-500 mb-2"
        >
          7 surfaces métier alimentées automatiquement
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          Chaque hook est <strong>indépendant</strong> et <strong>désactivable</strong>{" "}
          dans la console admin. Tout est <em>fire-and-forget</em> : aucune
          inertie entre Humanix et CISO Assistant — chaque outil reste autonome.
          Aucune modification requise côté intuitem.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              📜 Evidences + PDF signé Ed25519
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              Pour chaque contrôle GRC, une preuve datée avec statut, score, owner
              désigné et expiry date. PDF audit-ready en pièce jointe, signé
              cryptographiquement, vérifiable hors-ligne avec OpenSSL pendant
              des années — sans dépendance Humanix runtime.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              🛡 Applied Controls
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              Un contrôle parent <em>"Programme de sensibilisation Humanix"</em>{" "}
              par framework, lié M2M aux evidences poussées. Le RSSI voit dans
              CISO Assistant le contrôle <strong>réel</strong> mis en place,
              pas une accumulation d'évidences orphelines.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              🎯 Findings + Findings Assessments
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              Pour chaque contrôle <code>partial</code> (P2) ou{" "}
              <code>non_compliant</code> (P1), Humanix génère un constat
              actionnable avec ETA, owner et plan d'action recommandé. Le RSSI
              a une to-do list auto-générée, pas un simple dashboard à
              interpréter.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              📊 Risk Scenarios
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              Si la couverture humaine s'effrite (≥30% non_compliant, 2+ partials,
              ou déclenchement précoce), Humanix génère un{" "}
              <em>"RiskScenario : compromission via couche humaine sous-formée"</em>{" "}
              sous un RiskAssessment dédié. Humanix participe au risk register
              avec justification chiffrée.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              🚨 Incidents (alerte NIS2 §23)
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              Si ≥1 contrôle non conforme, Humanix ouvre un Incident SEV3{" "}
              <em>"Risque humain"</em> (idempotent par jour). Traçabilité
              ISO 27001 §10.1 + NIS2 §21.2.g — sans préjuger d'une
              compromission effective.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              👤 Users + Actors (owner)
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              Le RSSI ou DPO désigné est créé comme User CISO Assistant (s'il
              n'existe pas) puis son Actor est assigné comme{" "}
              <code>owner</code> sur toutes les Evidences, Findings et Incidents.
              Le responsable filtre son périmètre nativement.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 sm:col-span-2">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              📈 Metrology — séries temporelles
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              6 métriques poussées en continu dans le module Metrology de CISO
              Assistant : score de maturité cyber humaine, taux de complétion,
              taux de signalement phishing, comptes d'évidences par statut.
              Le RSSI/DSI/DPO compose ses propres dashboards CISO Assistant
              avec des widgets pointant ces séries — évolution dans le temps,
              alerte si stale, target par métrique.
            </p>
          </div>
        </div>
      </section>

      {/* ===== MCP + COMMUNITY FRAMEWORK ===== */}
      <section className="card mb-12 bg-gradient-to-br from-accent-50 to-primary-50 dark:from-slate-800 dark:to-slate-700">
        <h2 className="text-2xl font-extrabold text-primary-500 mb-2">
          Au-delà du push : 2 contributions à l'écosystème
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm mt-4">
          <div>
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              🤖 MCP Server (agent IA souverain)
            </p>
            <p className="text-gray-700 dark:text-gray-300 text-xs">
              Premier MCP server du marché SAT/HRM. 6 tools read-only pour
              interroger Humanix en langage naturel depuis votre agent IA :
              Mistral, LM Studio, Anything LLM, Ollama via passerelle. ChatGPT /
              Claude / Gemini supportés en option. Posture souveraine : votre
              instance n'a aucune dépendance Cloud Act.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Cas d'usage type : <em>"Qui dans Marketing n'a pas compris la
              politique mdp ?"</em> → réponse pseudonymisée RGPD-safe en 1 prompt.
            </p>
          </div>
          <div>
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              📚 Community Framework (CC BY-SA 4.0)
            </p>
            <p className="text-gray-700 dark:text-gray-300 text-xs">
              Catalogue Humanix Académie publié comme framework chargeable
              dans CISO Assistant (URN <code>urn:humanix:risk:framework:humanix-awareness-catalog-v1</code>),
              + mappings open source vers ISO 27001:2022 (relations{" "}
              <code>equal</code> et <code>intersect</code>). Mappings NIS2, RGPD,
              ANSSI HG, NIST CSF en backlog. PR future sur{" "}
              <a
                href="https://github.com/intuitem/risk-libraries"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-500 underline"
              >
                intuitem/risk-libraries
              </a>.
            </p>
          </div>
        </div>
      </section>

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
          Approche <strong>Push</strong> : Humanix Académie pousse les preuves
          vivantes (statut + score + PDF signé Ed25519) vers votre instance
          CISO Assistant via son API REST publique. Aucune modification requise
          côté intuitem — Humanix s'adapte à leur schéma.
        </p>

        <svg
          viewBox="0 0 700 220"
          className="w-full max-w-3xl mx-auto"
          role="img"
          aria-label="Schema d'architecture : Humanix Academie pousse les evidences et PDFs signés Ed25519 vers CISO Assistant via REST + auth Knox."
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

          {/* Humanix box (gauche - source du push) */}
          <rect
            x="20"
            y="60"
            width="200"
            height="100"
            rx="16"
            fill="url(#grad-humanix)"
          />
          <text
            x="120"
            y="100"
            textAnchor="middle"
            fontSize="16"
            fontWeight="800"
            fill="white"
          >
            Humanix Academie
          </text>
          <text
            x="120"
            y="122"
            textAnchor="middle"
            fontSize="11"
            fill="white"
            opacity="0.85"
          >
            (sensibilisation)
          </text>
          <text
            x="120"
            y="140"
            textAnchor="middle"
            fontSize="10"
            fill="white"
            opacity="0.7"
          >
            score · certificats · PDF signe
          </text>

          {/* CISO Assistant box (droite - destination du push) */}
          <rect
            x="480"
            y="60"
            width="200"
            height="100"
            rx="16"
            fill="url(#grad-ciso)"
          />
          <text
            x="580"
            y="100"
            textAnchor="middle"
            fontSize="16"
            fontWeight="800"
            fill="white"
          >
            CISO Assistant
          </text>
          <text
            x="580"
            y="122"
            textAnchor="middle"
            fontSize="11"
            fill="white"
            opacity="0.85"
          >
            (RSSI / GRC)
          </text>
          <text
            x="580"
            y="140"
            textAnchor="middle"
            fontSize="10"
            fill="white"
            opacity="0.7"
          >
            ISO 27001 · NIS2 · RGPD
          </text>

          {/* Fleche aller : Humanix -> CISO (push principal) */}
          <line
            x1="225"
            y1="95"
            x2="475"
            y2="95"
            stroke="#00A3A1"
            strokeWidth="2.5"
            markerEnd="url(#arrow-r)"
          />
          <text
            x="350"
            y="86"
            textAnchor="middle"
            fontSize="10"
            fill="#00A3A1"
            fontWeight="700"
          >
            POST /api/evidences/ + upload PDF Ed25519
          </text>

          {/* Fleche retour : CISO -> Humanix (auth Knox) */}
          <line
            x1="475"
            y1="125"
            x2="225"
            y2="125"
            stroke="#7C3AED"
            strokeWidth="2.5"
            markerEnd="url(#arrow-l)"
          />
          <text
            x="350"
            y="142"
            textAnchor="middle"
            fontSize="10"
            fill="#7C3AED"
            fontWeight="700"
          >
            token Knox (POST /api/iam/login/)
          </text>

          {/* Bandeau bas */}
          <text
            x="350"
            y="200"
            textAnchor="middle"
            fontSize="11"
            fill="#555555"
          >
            Idempotent (GET-by-name → PATCH ou POST) · PDF signe Ed25519 ·
            verifiable hors-ligne (OpenSSL)
          </text>
        </svg>
      </section>

      {/* ===== COMPOSANT CLIENT (onglets framework, snippets, mapping) ===== */}
      <CisoAssistantBridge />

      {/* ===== SYNC 1-CLIC DEPUIS L'ADMIN HUMANIX ===== */}
      <section
        aria-labelledby="admin-console-title"
        className="card mb-10 mt-12 border-2 border-accent-500/30 bg-accent-50/40 dark:bg-accent-900/10"
      >
        <div className="flex items-start gap-3 mb-3">
          <span
            aria-hidden="true"
            className="text-3xl shrink-0 leading-none"
          >
            🖱️
          </span>
          <div>
            <h2
              id="admin-console-title"
              className="text-2xl font-extrabold text-primary-500 dark:text-accent-300"
            >
              Sync 1-clic depuis la console admin (sans Python)
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Pour les RSSI, DAF et C-Level qui ne veulent pas toucher au
              terminal : Humanix embarque une console admin dédiée. Vous
              renseignez vos credentials CISO Assistant <strong>une fois</strong>,
              et vous synchronisez en un clic, avec un terminal live façon
              GitLab CI.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mt-4 text-sm">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              1. Configurer
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Base URL, compte, password (chiffré AES-256-GCM). Bouton "Tester
              la connexion" pour valider en 2s.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              2. Synchroniser
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Sélectionnez un framework (ISO27001, NIS2, RGPD, ANSSI HG, NIST
              CSF) et cliquez. Terminal live, badge final OK / partiel / échec.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              3. Auditer
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Chaque action (config, test, sync) est tracée dans{" "}
              <code className="text-xs">/admin/audit</code> (RGPD/NIS2-ready).
              Historique des 20 derniers runs visible.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/admin/integrations/ciso-assistant"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-sm font-bold shadow-sm transition"
          >
            Ouvrir la console admin
            <span aria-hidden="true">→</span>
          </a>
          <p className="text-xs text-gray-500 dark:text-gray-400 self-center">
            Réservé aux rôles ADMIN, RSSI et SUPERADMIN du tenant.
          </p>
        </div>
      </section>

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
            <strong>Pour le RSSI externalisé</strong> : 8 PME = 8 instances
            CISO Assistant. Une seule passerelle Humanix consolide les
            preuves de sensibilisation des 8 tenants.
          </li>
          <li>
            <strong>Pour le DSI ETI en démarche ISO 27001</strong> : le
            contrôle A.6.3 (sensibilisation) est alimenté automatiquement
            en preuves vivantes (score, certificats, taux de signalement).
          </li>
          <li>
            <strong>Pour le dirigeant en conformité NIS2</strong> : le score
            NIS2 affiché dans CISO Assistant intègre désormais le facteur
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
              Vous contrôlez la fréquence côté Humanix. Trois modes :
              déclenchement manuel via la console admin (bouton{" "}
              <em>Synchroniser maintenant</em>), cron quotidien automatique
              via le connecteur Python autonome, ou push évènementiel à chaque
              completion de module / changement de score (planifié v1.3).
            </p>
          </details>
          <details className="card">
            <summary className="cursor-pointer font-bold text-primary-500">
              Et la vérification d'intégrité des preuves ?
            </summary>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Chaque PDF de preuve uploadé dans CISO Assistant contient un
              manifeste d'intégrité signé Ed25519 en page 2 (algorithme,
              empreinte clé publique, hash SHA-256, signature base64url,
              payload JSON canonical, procédure de vérification OpenSSL). La
              clé publique est servie sur{" "}
              <a
                href="/.well-known/humanix-pdf-pubkey.pem"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-500 underline"
              >
                /.well-known/humanix-pdf-pubkey.pem
              </a>
              . Un auditeur peut re-vérifier une preuve 5 ans après son émission
              sans aucune dépendance Humanix runtime.
            </p>
          </details>
          <details className="card">
            <summary className="cursor-pointer font-bold text-primary-500">
              Et la conformité RGPD de l'export ?
            </summary>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              L'export ne contient pas de PII brute : les certificats sont
              représentés par des liens (téléchargeables avec votre clé API),
              pas par leurs contenus. Les métriques sont agrégées au niveau
              tenant.
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
