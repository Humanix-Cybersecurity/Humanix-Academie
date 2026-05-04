// Politique de confidentialité — RGPD art. 13 + 14
import Link from "next/link";
import LegalLayout, {
  LegalSection,
  LegalSubsection,
  LegalTable,
  LegalHighlight,
} from "@/components/legal/LegalLayout";

export const metadata = {
  title: "Politique de confidentialité — Humanix-Cybersecurity",
  description:
    "Comment nous traitons vos données personnelles, en application du RGPD.",
};

const TODAY = new Date().toLocaleDateString("fr-FR");

const TOC = [
  { id: "responsable", label: "1. Responsable du traitement" },
  { id: "collecte", label: "2. Quand collectons-nous ?" },
  { id: "donnees", label: "3. Quelles données ?" },
  { id: "acces", label: "4. Qui peut y accéder ?" },
  { id: "conservation", label: "5. Durée de conservation" },
  { id: "droits", label: "6. Vos droits" },
  { id: "cnil", label: "7. Réclamation CNIL" },
  { id: "securite", label: "8. Sécurité" },
  { id: "modifications", label: "9. Modifications" },
];

export default function ConfidentialitePage() {
  return (
    <LegalLayout
      badge="RGPD art. 13-14"
      title="Politique de confidentialité"
      subtitle="Comment nous traitons vos données personnelles, en application du RGPD. Quelles données, pourquoi, combien de temps, et quels sont vos droits."
      lastUpdate={TODAY}
      toc={TOC}
    >
      <LegalSection id="responsable" num="1" title="Responsable du traitement">
        <p>
          Le responsable du traitement est{" "}
          <strong>Humanix-Cybersecurity SASU</strong>, 16 Rue Joseph Loiret,
          30100 Alès, France (SIREN 103 901 799).
        </p>
        <p>
          La présente politique s'applique uniquement aux services Cloud opérés
          par Humanix-Cybersecurity (paliers Découverte, Starter, Essentielle,
          Pro, Enterprise). Les organisations qui déploient elles-mêmes{" "}
          <strong>Humanix Community Edition</strong> en self-host (à partir du
          code source publié sous licence GNU AGPL v3) deviennent{" "}
          <strong>seules responsables de traitement</strong> au sens du RGPD
          pour leur instance. Humanix-Cybersecurity n'a, dans ce cas, ni qualité
          de sous-traitant, ni accès aux données traitées, ni obligation de
          notification CNIL. Les modèles publiés dans le dépôt (
          <code>docs/PRIVACY_TEMPLATE.md</code>, registre, DPA) sont fournis à
          titre indicatif et ne constituent pas une délégation de
          responsabilité.
        </p>
        <ul>
          <li>
            Contact RGPD :{" "}
            <a href="mailto:rgpd@humanix-cybersecurity.fr">
              rgpd@humanix-cybersecurity.fr
            </a>
          </li>
          <li>Représentant : Florian Durano, Président</li>
        </ul>
        <LegalHighlight variant="info">
          À ce jour, Humanix-Cybersecurity n'a pas désigné de Délégué à la
          Protection des Données (DPO), n'étant pas légalement tenue de le faire
          au regard de l'article 37 du RGPD. Le Président est le point de
          contact opérationnel pour toute question relative aux données.
        </LegalHighlight>
      </LegalSection>

      <LegalSection
        id="collecte"
        num="2"
        title="Quand collectons-nous vos données ?"
      >
        <p>Nous collectons des données dans 4 cas :</p>
        <ol>
          <li>
            <strong>Visite du site</strong> humanix-cybersecurity.fr (cookies
            techniques uniquement)
          </li>
          <li>
            <strong>Demande de contact</strong> via formulaire ou email
          </li>
          <li>
            <strong>Utilisation de la plateforme Humanix Académie</strong> en
            tant qu'apprenant ou administrateur d'une organisation cliente
          </li>
          <li>
            <strong>Prestation de service</strong> : formation, audit,
            accompagnement RSSI
          </li>
        </ol>
      </LegalSection>

      <LegalSection
        id="donnees"
        num="3"
        title="Quelles données et pour quelle finalité ?"
      >
        <LegalSubsection num="3.1" title="Visite du site">
          <LegalTable
            headers={["Donnée", "Finalité", "Base légale", "Durée"]}
            rows={[
              [
                "Adresse IP, user agent (logs serveur)",
                "Sécurité, détection d'abus, audit",
                "Intérêt légitime",
                "12 mois",
              ],
              [
                "Cookie de session (next-auth.session-token)",
                "Maintien de votre session après connexion",
                "Intérêt légitime / nécessaire au service",
                "30 jours maximum, ou expiration de la session",
              ],
              [
                "Cookie CSRF (next-auth.csrf-token)",
                "Protection contre les attaques par falsification de requête",
                "Intérêt légitime / nécessaire au service",
                "Durée de la session",
              ],
              [
                "Préférence de thème (humanix-theme, localStorage)",
                "Mémorisation de votre choix d'affichage",
                "Intérêt légitime",
                "Persistant tant que non supprimé",
              ],
            ]}
          />
        </LegalSubsection>

        <LegalSubsection num="3.2" title="Plateforme Humanix Académie">
          <LegalHighlight variant="info">
            <strong>
              En tant qu'éditeur, nous agissons comme sous-traitant
            </strong>{" "}
            au sens de l'article 28 du RGPD pour le compte de votre employeur
            (ou de l'organisation qui vous a inscrit). Le responsable du
            traitement de vos données d'apprentissage est votre employeur ; nous
            traitons les données <em>sur ses instructions documentées</em> via
            un contrat de sous-traitance (DPA).
          </LegalHighlight>
          <LegalTable
            headers={["Donnée", "Finalité", "Durée"]}
            rows={[
              [
                "Email professionnel, prénom, nom, service",
                "Authentification, attribution des progressions",
                "Durée du contrat client + 1 an",
              ],
              [
                "Progressions, scores, badges, mascotte choisie",
                "Suivi pédagogique, gamification",
                "Durée du contrat client + 1 an",
              ],
              [
                "Logs de connexion, événements pédagogiques",
                "Traçabilité, sécurité, statistiques agrégées",
                "12 mois",
              ],
              [
                "Résultats de tests phishing simulés",
                "Mesure de maturité, formation ciblée",
                "Durée du contrat client",
              ],
            ]}
          />
        </LegalSubsection>

        <LegalSubsection num="3.3" title="Prospection et relation commerciale">
          <LegalTable
            headers={["Donnée", "Finalité", "Base légale", "Durée"]}
            rows={[
              [
                "Nom, email pro, téléphone, fonction, entreprise",
                "Réponse à demande, prospection B2B",
                "Intérêt légitime",
                "3 ans après dernier contact",
              ],
              [
                "Contenu d'échanges email",
                "Suivi commercial",
                "Mesures précontractuelles",
                "3 ans",
              ],
            ]}
          />
        </LegalSubsection>

        <LegalSubsection
          num="3.4"
          title="Prestations (formation, audit, conseil)"
        >
          <LegalTable
            headers={["Donnée", "Finalité", "Durée"]}
            rows={[
              [
                "Données de facturation, identité du contact",
                "Contrat, facturation, comptabilité",
                "10 ans (obligation légale fiscale)",
              ],
              [
                "Listes émargement formation",
                "Obligation Qualiopi / financeur OPCO",
                "3 ans après formation",
              ],
              [
                "Rapports d'audit, livrables techniques",
                "Exécution de la prestation",
                "3 ans après livraison, puis suppression sécurisée ou retour au client",
              ],
            ]}
          />
          <LegalHighlight variant="warning">
            <strong>
              Données techniques sensibles produites lors d'un audit / pentest
            </strong>{" "}
            (vulnérabilités, identifiants découverts, configurations) :
            transmises au Client exclusivement, par canal chiffré (TLS 1.3),
            jamais diffusées à des tiers. Au-delà de 3 ans, elles sont
            supprimées de manière irréversible ou restituées au Client sur
            demande, sauf obligation légale (litige, requête judiciaire).
          </LegalHighlight>
          <p className="text-sm">
            <strong>Tests de phishing simulé</strong> sur les collaborateurs du
            Client : ces tests ne sont menés qu'avec autorisation écrite
            explicite du responsable RH ou de la sécurité du Client, et ne
            contiennent aucune manipulation dolosive personnelle. Les résultats
            individuels ne sont communiqués qu'à des fins pédagogiques agrégées
            ou ciblées de formation, jamais à des fins de sanction.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection id="acces" num="4" title="Qui peut accéder à vos données ?">
        <ul>
          <li>
            <strong>En interne</strong> : le Président de Humanix-Cybersecurity
            uniquement (entreprise solo)
          </li>
          <li>
            <strong>Sous-traitants techniques</strong> :
            <ul>
              <li>
                <strong>Scaleway SAS</strong> (France 🇫🇷) — hébergement,
                sauvegardes, infrastructure
              </li>
              <li>
                <strong>Olinda SAS</strong> exploitant le service{" "}
                <strong>Qonto</strong> (France 🇫🇷) — compte de paiement
                professionnel
              </li>
              <li>
                <strong>Dougs SAS</strong> (France 🇫🇷) — expertise comptable,
                facturation
              </li>
              <li>
                <strong>Resend</strong> (UE, sous Clauses Contractuelles Types
                CE 2021/914) — emails transactionnels (lien magique de
                connexion, alertes)
              </li>
            </ul>
          </li>
          <li>
            <strong>Tiers institutionnels</strong> : administration fiscale,
            URSSAF, en cas d'obligation légale
          </li>
        </ul>
        <LegalHighlight variant="success">
          <strong>Aucun transfert hors UE</strong> n'est effectué pour les
          données traitées dans le cadre de la plateforme Humanix Académie. Si
          un transfert devait avoir lieu, il serait encadré par les clauses
          contractuelles types de la Commission européenne.
        </LegalHighlight>
      </LegalSection>

      <LegalSection
        id="connecteurs"
        num="4 bis"
        title="Connecteurs sortants activés par le client"
      >
        <p>
          La plateforme propose des connecteurs et des formats d'export
          permettant à votre employeur (responsable du traitement) d'envoyer vos
          données de progression vers ses propres outils internes : outil GRC{" "}
          <strong>CISO Assistant</strong>, SIEM{" "}
          <strong>Microsoft Sentinel</strong> ou <strong>Splunk</strong>, format{" "}
          <strong>OSCAL</strong> (NIST), endpoint <strong>SCIM v2</strong> pour
          synchronisation d'annuaire, webhooks signés HMAC-SHA256.
        </p>
        <ul>
          <li>
            Ces connecteurs ne sont{" "}
            <strong>jamais activés sans action explicite</strong> de votre
            employeur (génération d'une clé API ou configuration d'un webhook
            depuis la console admin).
          </li>
          <li>
            Aucune <strong>donnée personnelle brute</strong> (PII) n'est
            transmise par ces flux : seuls des liens d'accès aux artefacts (qui
            restent sous notre contrôle d'accès) et des métriques agrégées par
            tenant.
          </li>
          <li>
            Une fois les données arrivées dans les outils du responsable de
            traitement, elles relèvent de{" "}
            <strong>sa propre responsabilité</strong> et de sa propre politique
            de confidentialité.
          </li>
          <li>
            Toutes les exportations sont journalisées (event{" "}
            <code>evidence.exported</code>) et accessibles dans l'audit trail
            tenant.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="conservation" num="5" title="Durée de conservation">
        <p>
          Voir détail dans les tableaux ci-dessus. À l'issue des durées
          indiquées, les données sont supprimées ou anonymisées de manière
          irréversible.
        </p>
      </LegalSection>

      <LegalSection id="droits" num="6" title="Vos droits">
        <p>
          Conformément aux articles 15 à 22 du RGPD, vous disposez des droits
          suivants :
        </p>
        <ul>
          <li>
            <strong>Accès</strong> : obtenir une copie de vos données
          </li>
          <li>
            <strong>Rectification</strong> : corriger des données inexactes
          </li>
          <li>
            <strong>Effacement</strong> (droit à l'oubli) : supprimer vos
            données dans les limites prévues par la loi
          </li>
          <li>
            <strong>Limitation du traitement</strong> : geler le traitement
          </li>
          <li>
            <strong>Portabilité</strong> : récupérer vos données dans un format
            structuré
          </li>
          <li>
            <strong>Opposition</strong> : refuser le traitement (notamment
            prospection)
          </li>
          <li>
            <strong>Retrait du consentement</strong> à tout moment, sans effet
            rétroactif
          </li>
          <li>
            <strong>Définir des directives post-mortem</strong> sur le sort de
            vos données
          </li>
        </ul>
        <p>
          Pour exercer vos droits, écrivez à{" "}
          <a href="mailto:rgpd@humanix-cybersecurity.fr">
            rgpd@humanix-cybersecurity.fr
          </a>{" "}
          ou par courrier au siège social. Nous répondons dans un délai maximal
          de 1 mois.
        </p>
        <LegalHighlight variant="info">
          Si vous êtes utilisateur de la plateforme dans le cadre professionnel,
          ces demandes doivent en principe transiter par votre employeur
          (responsable du traitement). Nous nous assurerons en tout état de
          cause de leur prise en compte.
        </LegalHighlight>
      </LegalSection>

      <LegalSection id="cnil" num="7" title="Réclamation auprès de la CNIL">
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez
          introduire une réclamation auprès de la Commission nationale de
          l'informatique et des libertés (CNIL), 3 Place de Fontenoy — TSA 80715
          — 75334 PARIS CEDEX 07.{" "}
          <a
            href="https://www.cnil.fr"
            rel="noopener noreferrer"
            target="_blank"
          >
            cnil.fr
          </a>
        </p>
      </LegalSection>

      <LegalSection id="securite" num="8" title="Sécurité">
        <p>
          Humanix-Cybersecurity met en œuvre des mesures techniques et
          organisationnelles adaptées pour protéger vos données : chiffrement en
          transit (TLS), chiffrement au repos (Scaleway), authentification forte
          des accès administrateur, principe du moindre privilège,
          journalisation des accès, sauvegardes chiffrées. Le détail est
          disponible sur notre page{" "}
          <Link href="/securite">Sécurité &amp; Conformité</Link>.
        </p>
      </LegalSection>

      <LegalSection id="modifications" num="9" title="Modifications">
        <p>
          Cette politique peut être modifiée pour refléter des évolutions
          légales ou techniques. Nous indiquerons toujours la date de la
          dernière mise à jour en haut de cette page. Les modifications
          substantielles seront notifiées par email aux clients actifs.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
