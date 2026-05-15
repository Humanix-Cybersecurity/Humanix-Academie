// SPDX-License-Identifier: AGPL-3.0-or-later
// Page publique : passerelle Humanix Académie <-> CISO Assistant.
// Cible : RSSI / DSI qui évalue notre intégration GRC.
// Contraintes éditoriales :
//  - Accessibilité RGAA 4.1 : HTML sémantique, hiérarchie de titres, ARIA,
//    focus visible
//  - UX différenciante : schéma SVG animé, extrait copiable, tableau filtrable
//  - Honnêteté : on dit ce qu'on couvre ET ce qui est hors périmètre
//  - Français assumé : pas d'anglicismes inutiles, accents et ponctuation
//    soignés. C'est une page souveraine.

import Link from "next/link";
import CisoAssistantBridge from "@/components/CisoAssistantBridge";

export const metadata = {
  title: "Connecteur CISO Assistant — Humanix Académie",
  description:
    "Le seul connecteur natif entre une plateforme française de sensibilisation cyber et CISO Assistant (intuitem). Vos preuves de sensibilisation alimentent automatiquement votre outil de gouvernance, risque et conformité.",
};

export default function CisoAssistantIntegrationPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14 animate-fadeIn">
      {/* ===== EN-TÊTE ===== */}
      <header className="text-center mb-12">
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">
          Intégration RSSI · Gouvernance, risque et conformité
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          Le seul connecteur natif{" "}
          <span className="bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
            sensibilisation cyber × outil GRC
          </span>{" "}
          en France.
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Humanix Académie transmet automatiquement vos preuves de
          sensibilisation à <strong>CISO Assistant</strong> (intuitem). Fini
          le copier-coller, fini le tableur partagé, fini l'audit douloureux.
          Tout est tracé, signé Ed25519, vérifiable hors-ligne avec OpenSSL.
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

      {/* ===== CE QUE NOUS ALIMENTONS CÔTÉ CISO ASSISTANT ===== */}
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
          Chaque branchement est <strong>indépendant</strong> et{" "}
          <strong>désactivable</strong> dans la console d'administration.
          Tout fonctionne en <em>émission sans attente d'accusé</em> : aucune
          inertie entre Humanix et CISO Assistant, chaque outil reste
          autonome. Aucune modification n'est requise côté intuitem.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              📜 Preuves de conformité + PDF signé Ed25519
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              Pour chaque contrôle du référentiel, une preuve datée avec
              statut, score, responsable désigné et date d'expiration. Un
              PDF prêt pour audit y est joint, signé cryptographiquement
              et vérifiable hors-ligne avec OpenSSL pendant des années — sans
              aucune dépendance à Humanix.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              🛡 Contrôles appliqués
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              Un contrôle parent <em>« Programme de sensibilisation Humanix »</em>{" "}
              par référentiel, lié à toutes les preuves transmises. Le RSSI
              voit dans CISO Assistant le contrôle <strong>réel</strong> mis
              en place, plutôt qu'une accumulation de preuves orphelines.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              🎯 Constats et évaluations de constats
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              Pour chaque contrôle <code>partiel</code> (priorité 2) ou{" "}
              <code>non conforme</code> (priorité 1), Humanix génère un
              constat actionnable avec échéance, responsable et plan
              d'action recommandé. Le RSSI dispose d'une liste de tâches
              générée automatiquement, plutôt que d'un simple tableau de
              bord à interpréter.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              📊 Scénarios de risque
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              Si la couverture humaine s'effrite (au moins 30 % de contrôles
              non conformes, deux contrôles partiels ou plus, ou
              déclenchement précoce), Humanix génère un scénario{" "}
              <em>« Compromission via couche humaine sous-formée »</em>{" "}
              sous une analyse de risque dédiée. Humanix participe
              ainsi au registre des risques avec une justification chiffrée.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              🚨 Incidents (alerte NIS2 §23)
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              Si au moins un contrôle est non conforme, Humanix ouvre un
              incident de sévérité 3 <em>« Risque humain »</em>, idempotent
              par jour. Cela garantit la traçabilité ISO 27001 §10.1 et
              NIS2 §21.2.g, sans préjuger d'une compromission effective.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              👤 Utilisateurs et responsable désigné
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              Le RSSI ou le DPO désigné est créé comme utilisateur CISO
              Assistant s'il n'existe pas, puis affecté comme{" "}
              <em>responsable</em> sur toutes les preuves, constats et
              incidents. Le responsable filtre son périmètre nativement
              dans l'interface CISO Assistant.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 sm:col-span-2">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              📈 Métrologie — séries temporelles
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              Six métriques transmises en continu dans le module Métrologie
              de CISO Assistant : score de maturité cyber humaine, taux
              d'achèvement, taux de signalement de tentatives d'hameçonnage,
              nombre de preuves par statut. Le RSSI, le DSI ou le DPO
              compose ensuite ses propres tableaux de bord CISO Assistant
              avec des vignettes pointant sur ces séries — évolution dans le
              temps, alerte si la valeur devient périmée, cible par
              métrique.
            </p>
          </div>
        </div>
      </section>

      {/* ===== SERVEUR MCP + RÉFÉRENTIEL COMMUNAUTAIRE ===== */}
      <section className="card mb-12 bg-gradient-to-br from-accent-50 to-primary-50 dark:from-slate-800 dark:to-slate-700">
        <h2 className="text-2xl font-extrabold text-primary-500 mb-2">
          Au-delà de la transmission : deux contributions à l'écosystème
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm mt-4">
          <div>
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              🤖 Serveur MCP (agent IA souverain)
            </p>
            <p className="text-gray-700 dark:text-gray-300 text-xs">
              Premier serveur MCP du marché de la sensibilisation cyber.
              Six outils en lecture seule pour interroger Humanix en
              langage naturel depuis votre agent d'IA : Mistral, LM Studio,
              Anything LLM, ou Ollama via passerelle. ChatGPT, Claude et
              Gemini sont également pris en charge en option. Posture
              souveraine assumée : votre instance n'a aucune dépendance
              à la loi américaine d'extraterritorialité (Cloud Act).
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Cas d'usage type :{" "}
              <em>
                « Qui dans le Marketing n'a pas compris la politique de mot
                de passe ? »
              </em>{" "}
              — réponse pseudonymisée et compatible RGPD en une requête.
            </p>
          </div>
          <div>
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              📚 Référentiel communautaire (CC BY-SA 4.0)
            </p>
            <p className="text-gray-700 dark:text-gray-300 text-xs">
              Catalogue Humanix Académie publié en bibliothèque chargeable
              dans CISO Assistant (URN{" "}
              <code>urn:humanix:risk:framework:humanix-awareness-catalog-v1</code>
              ), accompagné de correspondances libres vers ISO 27001:2022
              (relations <code>equal</code> et <code>intersect</code>). Les
              correspondances NIS2, RGPD, ANSSI Hygiène Informatique et
              NIST CSF arrivent ensuite. Contribution future sur{" "}
              <a
                href="https://github.com/intuitem/risk-libraries"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-500 underline"
              >
                intuitem/risk-libraries
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ===== SCHÉMA D'ARCHITECTURE ===== */}
      <section
        aria-labelledby="archi-title"
        className="card mb-12 bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700"
      >
        <h2
          id="archi-title"
          className="text-xl font-extrabold text-primary-500 text-center mb-2"
        >
          Comment cela fonctionne ?
        </h2>
        <p className="text-center text-sm text-gray-600 dark:text-gray-300 mb-6">
          Approche par <strong>transmission</strong> : Humanix Académie
          transmet les preuves vivantes (statut, score, PDF signé Ed25519) à
          votre instance CISO Assistant via son API publique. Aucune
          modification n'est requise côté intuitem — c'est Humanix qui
          s'adapte à leur schéma.
        </p>

        <svg
          viewBox="0 0 700 220"
          className="w-full max-w-3xl mx-auto"
          role="img"
          aria-label="Schéma d'architecture : Humanix Académie transmet les preuves et les PDF signés Ed25519 à CISO Assistant via API REST, après authentification Knox."
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

          {/* Humanix (gauche - source de la transmission) */}
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
            Humanix Académie
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
            score · certificats · PDF signé
          </text>

          {/* CISO Assistant (droite - destination) */}
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
            (RSSI · GRC)
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

          {/* Flèche aller : Humanix vers CISO Assistant */}
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
            POST /api/evidences/ + envoi du PDF Ed25519
          </text>

          {/* Flèche retour : authentification Knox */}
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
            jeton Knox (POST /api/iam/login/)
          </text>

          {/* Bandeau bas */}
          <text
            x="350"
            y="200"
            textAnchor="middle"
            fontSize="11"
            fill="#555555"
          >
            Idempotent (recherche par nom puis mise à jour ou création) · PDF
            signé Ed25519 · vérifiable hors-ligne (OpenSSL)
          </text>
        </svg>
      </section>

      {/* ===== COMPOSANT CLIENT (onglets référentiel, exemples, correspondances) ===== */}
      <CisoAssistantBridge />

      {/* ===== SYNCHRONISATION EN UN CLIC DEPUIS L'ADMIN HUMANIX ===== */}
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
              Synchronisation en un clic depuis l'administration (sans
              ligne de commande)
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Pour les RSSI, DAF et membres de la direction qui ne veulent
              pas toucher au terminal : Humanix embarque une console
              d'administration dédiée. Vous renseignez vos identifiants
              CISO Assistant <strong>une seule fois</strong>, puis vous
              synchronisez en un clic, avec un terminal en direct à la
              manière d'un journal d'intégration continue.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mt-4 text-sm">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              1. Configurer
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              URL de base, compte, mot de passe (chiffré en
              AES-256-GCM). Le bouton « Tester la connexion » valide en
              deux secondes.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              2. Synchroniser
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Sélectionnez un référentiel (ISO 27001, NIS2, RGPD, ANSSI
              Hygiène ou NIST CSF) et cliquez. Terminal en direct,
              indicateur final OK, partiel ou en échec.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
            <p className="font-bold text-primary-500 dark:text-accent-300 mb-1">
              3. Auditer
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Chaque action (configuration, test, synchronisation) est
              tracée dans <code className="text-xs">/admin/audit</code>{" "}
              (conforme RGPD et NIS2). L'historique des 20 dernières
              exécutions reste consultable.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/admin/integrations/ciso-assistant"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-sm font-bold shadow-sm transition"
          >
            Ouvrir la console d'administration
            <span aria-hidden="true">→</span>
          </a>
          <p className="text-xs text-gray-500 dark:text-gray-400 self-center">
            Réservé aux rôles ADMIN, RSSI et SUPERADMIN du compte client.
          </p>
        </div>
      </section>

      {/* ===== POURQUOI ===== */}
      <section
        aria-labelledby="why-title"
        className="card mb-10 mt-12 bg-gradient-to-br from-primary-500 to-accent-500 text-white"
      >
        <h2 id="why-title" className="text-2xl font-extrabold mb-4">
          Pourquoi cette intégration ?
        </h2>
        <ul className="space-y-3 text-sm">
          <li>
            <strong>Pour le RSSI externalisé</strong> : huit PME, huit
            instances CISO Assistant. Une seule passerelle Humanix
            consolide les preuves de sensibilisation des huit comptes
            clients.
          </li>
          <li>
            <strong>Pour le DSI d'une ETI en démarche ISO 27001</strong> :
            le contrôle A.6.3 (sensibilisation) est alimenté
            automatiquement en preuves vivantes — score, certificats,
            taux de signalement.
          </li>
          <li>
            <strong>Pour le dirigeant en conformité NIS2</strong> : le
            score affiché dans CISO Assistant intègre désormais le facteur
            humain, première ligne de défense.
          </li>
        </ul>
      </section>

      {/* ===== QUESTIONS FRÉQUENTES ===== */}
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
              CISO Assistant est-il obligatoire ?
            </summary>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Non. Le format <code>ciso-assistant-v1</code> est documenté
              et stable. N'importe quel outil GRC — Eramba, MetricStream,
              ServiceNow GRC, ou un script maison — peut consommer le
              service. Le format <code>raw</code> donne accès aux données
              brutes.
            </p>
          </details>
          <details className="card">
            <summary className="cursor-pointer font-bold text-primary-500">
              Quels référentiels sont pris en charge ?
            </summary>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              ISO 27001:2022, NIS2, RGPD et ANSSI Hygiène Informatique en
              couverture détaillée. NIST CSF en couverture partielle (la
              correspondance complète arrive en version 1.1). Toutes les
              correspondances sont libres et auditables.
            </p>
          </details>
          <details className="card">
            <summary className="cursor-pointer font-bold text-primary-500">
              Quelle est la fréquence de rafraîchissement ?
            </summary>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Vous choisissez la fréquence côté Humanix. Trois modes
              cohabitent : déclenchement manuel depuis la console
              d'administration (bouton{" "}
              <em>Synchroniser maintenant</em>), tâche planifiée
              quotidienne via le connecteur Python autonome, ou
              transmission événementielle à chaque achèvement de module
              ou changement de score (mode temps réel, depuis la version
              2.0).
            </p>
          </details>
          <details className="card">
            <summary className="cursor-pointer font-bold text-primary-500">
              Et la vérification d'intégrité des preuves ?
            </summary>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Chaque PDF de preuve envoyé dans CISO Assistant contient un
              manifeste d'intégrité signé Ed25519 en page 2 — algorithme,
              empreinte de la clé publique, hachage SHA-256, signature
              base64url, charge utile JSON canonique et procédure de
              vérification OpenSSL. La clé publique est exposée à
              l'adresse{" "}
              <a
                href="/.well-known/humanix-pdf-pubkey.pem"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-500 underline"
              >
                /.well-known/humanix-pdf-pubkey.pem
              </a>
              . Un auditeur peut vérifier une preuve cinq ans après son
              émission, sans aucune dépendance à Humanix.
            </p>
          </details>
          <details className="card">
            <summary className="cursor-pointer font-bold text-primary-500">
              Et la conformité RGPD de l'export ?
            </summary>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              L'export ne contient aucune donnée personnelle en clair :
              les certificats sont représentés par des liens
              téléchargeables avec votre clé d'API, jamais par leur
              contenu. Les métriques sont agrégées au niveau du compte
              client.
            </p>
          </details>
        </div>
      </section>

      {/* ===== APPEL À L'ACTION ===== */}
      <section
        aria-labelledby="cta-title"
        className="card text-center bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 border-2 border-accent-500/30"
      >
        <h2
          id="cta-title"
          className="text-2xl font-extrabold text-primary-500 mb-2"
        >
          Prêt à brancher votre outil GRC ?
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-5 max-w-xl mx-auto">
          Nous vous accompagnons sur la configuration. Connecteur Python
          prêt à l'emploi, correspondances documentées, accompagnement
          direct.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a
            href="mailto:contact@humanix-cybersecurity.fr?subject=Connecteur%20CISO%20Assistant"
            className="btn-primary"
          >
            Demander une démonstration
          </a>
          <Link href="/admin/api-keys" className="btn-secondary">
            Générer ma clé d'API
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
        Spécification technique :{" "}
        <a href="/INTEGRATION_CISO_ASSISTANT.md" className="underline">
          INTEGRATION_CISO_ASSISTANT.md
        </a>{" "}
        · Correspondances : <code>lib/mapping-grc.ts</code> · Service :{" "}
        <code>/api/v1/evidence-export</code>
      </p>
    </div>
  );
}
