// Trust Center — page commerciale + transparence sécurité
// Cible : RSSI / DSI / dirigeant qui demande "vous gérez la sécu comment ?"
import Link from "next/link";

export const metadata = {
  title: "Sécurité & Conformité — Humanix Cybersecurity",
  description: "Hébergement souverain, RGPD, gestion des secrets, sauvegardes : la sécurité chez Humanix en transparence.",
};

export default function SecuritePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14 animate-fadeIn">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="text-7xl mb-4">🛡️</div>
        <p className="text-xs uppercase tracking-widest text-accent-500 font-bold mb-3">Trust Center</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-primary-500 leading-tight mb-4">
          Sécurité &amp; Conformité
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          On vous apprend la cyber. On l'applique aussi chez nous. Voici nos engagements et
          les preuves derrière, en transparence.
        </p>
      </div>

      {/* Bandeau rapport d'audit — mis en avant */}
      <div className="card mb-12 bg-gradient-to-br from-primary-500 to-accent-500 text-white">
        <div className="grid sm:grid-cols-[auto_1fr_auto] gap-5 items-center">
          <div className="text-5xl shrink-0" aria-hidden="true">📄</div>
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80 font-bold mb-1">
              Nouveau · v1.0 — 2 mai 2026
            </p>
            <h2 className="text-xl font-bold">Rapport public d'audit de sécurité</h2>
            <p className="text-sm opacity-90 mt-1">
              Méthodologie OWASP/ANSSI, contrôles vérifiés, gaps assumés, plan de
              remédiation à 6 mois. PDF d'une douzaine de pages, public, daté, signé.
            </p>
          </div>
          <Link
            href="/securite/rapport-audit"
            className="bg-white text-primary-500 font-bold px-5 py-3 rounded-2xl hover:scale-105 transition shadow-lg whitespace-nowrap text-sm"
          >
            Consulter →
          </Link>
        </div>
      </div>

      {/* Block hébergement */}
      <Section emoji="🇫🇷" title="Hébergement souverain en France">
        <p>
          Toutes les données de la plateforme Humanix Académie sont hébergées par{" "}
          <strong>Scaleway SAS</strong> (Paris, France), filiale du groupe Iliad. Datacenters
          en région parisienne, opérateur de droit français, non soumis au Cloud Act.
        </p>
        <p>
          Aucun transfert de données vers un pays tiers (notamment États-Unis) n'est
          effectué dans le cadre du fonctionnement de la plateforme. Si nous devions un
          jour recourir à un sous-traitant hors UE, nous appliquerions les clauses
          contractuelles types de la Commission européenne.
        </p>
        <ul>
          <li>Datacenters certifiés ISO 27001, ISO 50001, HDS</li>
          <li>Chiffrement au repos AES-256</li>
          <li>Sauvegardes quotidiennes chiffrées, conservées 30 jours minimum</li>
        </ul>
      </Section>

      {/* Block RGPD */}
      <Section emoji="📋" title="Conformité RGPD">
        <ul>
          <li>
            <strong>Politique de confidentialité</strong> détaillée : durées de conservation,
            droits, sous-traitants → <Link href="/confidentialite">la consulter</Link>
          </li>
          <li>
            <strong>Contrat de sous-traitance (DPA)</strong> systématiquement signé avec
            chaque client SaaS — modèle aligné sur les clauses types CNIL
          </li>
          <li>
            <strong>Registre des traitements</strong> tenu à jour (côté responsable de
            traitement et côté sous-traitant)
          </li>
          <li>
            <strong>Procédure violation de données</strong> : notification CNIL sous 72h,
            information des clients concernés
          </li>
          <li>
            <strong>Mesures de minimisation</strong> : nous ne collectons que ce qui est
            nécessaire à la finalité pédagogique
          </li>
        </ul>
      </Section>

      {/* Block sécurité technique */}
      <Section emoji="🔐" title="Sécurité technique de la plateforme">
        <ul>
          <li><strong>TLS 1.3</strong> pour toutes les connexions, redirection HTTPS forcée</li>
          <li><strong>Headers de sécurité</strong> : HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy</li>
          <li><strong>Authentification</strong> : magic link par email (Resend) + sessions signées (Auth.js v5)</li>
          <li><strong>Mots de passe</strong> : aucun mot de passe stocké côté Humanix — authentification sans mot de passe</li>
          <li><strong>API keys</strong> hashées en SHA-256 ; révocation 1-clic ; expiration configurable</li>
          <li><strong>Cloisonnement multi-tenant</strong> : isolation logique par <code>tenantId</code> sur toutes les requêtes, vérifié par tests automatisés</li>
          <li><strong>Principe du moindre privilège</strong> appliqué côté rôles applicatifs (LEARNER / MANAGER / ADMIN / SUPERADMIN)</li>
          <li><strong>Logs d'accès</strong> conservés 12 mois, horodatés, immuables</li>
          <li><strong>Limitation de débit</strong> et protection contre les abus de soumission</li>
        </ul>
      </Section>

      {/* Block secrets */}
      <Section emoji="🤐" title="Gestion des secrets">
        <ul>
          <li>Aucun secret n'est commité dans le code source — vérifié par scan automatisé</li>
          <li>Variables d'environnement injectées au runtime, jamais persistées dans les images Docker</li>
          <li>Rotation périodique des secrets de chiffrement et des clés signature</li>
          <li>Coffre de secrets pour les credentials administrateur</li>
        </ul>
      </Section>

      {/* Block partenaires */}
      <Section emoji="🤝" title="Sous-traitants techniques">
        <p>Liste des sous-traitants impliqués dans le fonctionnement du service :</p>
        <table className="w-full text-sm border border-gray-200 dark:border-slate-700 mt-2">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-800">
              <th className="border p-2 text-left">Sous-traitant</th>
              <th className="border p-2 text-left">Rôle</th>
              <th className="border p-2 text-left">Localisation</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="border p-2">Scaleway SAS</td><td className="border p-2">Hébergement</td><td className="border p-2">France 🇫🇷</td></tr>
            <tr><td className="border p-2">Olinda SAS (Qonto)</td><td className="border p-2">Compte de paiement</td><td className="border p-2">France 🇫🇷</td></tr>
            <tr><td className="border p-2">Dougs SAS</td><td className="border p-2">Expertise comptable</td><td className="border p-2">France 🇫🇷</td></tr>
            <tr><td className="border p-2">Resend</td><td className="border p-2">Emails transactionnels (magic links)</td><td className="border p-2">UE / fournisseur engageant des clauses types</td></tr>
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-2">
          Tout nouveau sous-traitant impliquant des données personnelles fait l'objet d'une
          notification écrite aux clients, avec droit d'objection.
        </p>
      </Section>

      {/* Block continuité */}
      <Section emoji="🔄" title="Continuité de service">
        <ul>
          <li><strong>SLA cible</strong> : 99 % de disponibilité mensuelle moyenne</li>
          <li><strong>Sauvegardes</strong> : quotidiennes, chiffrées, conservées 30 jours, testées par restauration mensuelle</li>
          <li><strong>RPO</strong> (perte maximale de données acceptable) : 24h</li>
          <li><strong>RTO</strong> (temps maximal de remise en service) : 24h</li>
          <li><strong>Réversibilité</strong> : export des données au format CSV ou JSON sur simple demande, à tout moment</li>
        </ul>
      </Section>

      {/* Block engagements humains */}
      <Section emoji="👤" title="Engagement humain">
        <ul>
          <li><strong>RC Pro Cybersécurité</strong> souscrite — coordonnées de l'assureur communiquées à la signature du contrat</li>
          <li><strong>Veille permanente</strong> sur les vulnérabilités (mise à jour des dépendances dans les 7 jours pour les CVE critiques)</li>
          <li><strong>Référencement CyberMalveillance.gouv.fr</strong> en cours pour offrir un canal d'alerte officiel</li>
          <li><strong>Ouverture aux audits</strong> : les clients peuvent réaliser leur propre audit sécurité, sur engagement écrit préalable</li>
        </ul>
      </Section>

      {/* Block roadmap */}
      <Section emoji="🗺️" title="Roadmap conformité">
        <ul>
          <li>à venir : Référencement CyberMalveillance.gouv.fr finalisé</li>
          <li>à venir : Évaluation Label Cyber Expert AFNOR</li>
          <li>2027 : Étude qualification PASSI ANSSI (audits) — selon évolution business</li>
          <li>Conformité <strong>NIS2</strong> : application du référentiel ANSSI dès que applicable au volume d'activité</li>
        </ul>
      </Section>

      {/* Block intégration GRC */}
      <Section emoji="🔗" title="Intégration GRC native">
        <p>
          Vos preuves de sensibilisation alimentent automatiquement votre outil GRC via
          l'API <code>/api/v1/evidence-export</code>. Connecteur Python prêt à l'emploi
          pour <strong>CISO Assistant</strong> (intuitem). Mappings ISO 27001, NIS2,
          RGPD, ANSSI HG documentés et auditables.
        </p>
        <p className="mt-3">
          <Link href="/integrations/ciso-assistant" className="font-bold text-accent-500 hover:underline">
            Voir le connecteur CISO Assistant →
          </Link>
        </p>
      </Section>

      {/* CTA contact */}
      <div className="card bg-gradient-to-br from-primary-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 border-2 border-accent-500/30 text-center">
        <h2 className="text-2xl font-extrabold text-primary-500 mb-2">Une question sur notre sécurité ?</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          RSSI, DSI, dirigeant : nous fournissons sur demande le DPA, le registre des
          traitements, ou un dossier complet pour vos due diligence.
        </p>
        <a href="mailto:rgpd@humanix-cybersecurity.fr" className="btn-primary inline-block">
          Demander notre dossier sécurité
        </a>
      </div>

      <p className="text-center text-xs text-gray-500 mt-10">
        Cette page reflète notre état au {new Date().toLocaleDateString("fr-FR")}.
        Mise à jour à chaque évolution majeure.
      </p>
    </div>
  );
}

function Section({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <section className="card mb-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{emoji}</span>
        <h2 className="text-xl font-extrabold text-primary-500">{title}</h2>
      </div>
      <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">{children}</div>
    </section>
  );
}
