// SPDX-License-Identifier: AGPL-3.0-or-later
// CGV B2B - Conditions Générales de Vente
// Couvre 3 lignes business : SaaS Humanix Académie, formation, audits cyber
import Link from "next/link";
import LegalLayout, {
  LegalSection,
  LegalSubsection,
  LegalHighlight,
} from "@/components/legal/LegalLayout";

export const metadata = {
  title: "CGV - Conditions Générales de Vente - Humanix-Cybersecurity",
  description:
    "CGV B2B applicables aux prestations Humanix-Cybersecurity (SaaS, formation, audit).",
};

const TODAY = new Date().toLocaleDateString("fr-FR");

const TOC = [
  { id: "objet", label: "1. Objet et identification" },
  { id: "prestations", label: "2. Prestations proposées" },
  { id: "commande", label: "3. Commande" },
  { id: "tarifs", label: "4. Tarifs et paiement" },
  { id: "duree", label: "5. Durée et résiliation" },
  { id: "sla", label: "6. Disponibilité (SLA)" },
  { id: "force", label: "7. Force majeure" },
  { id: "ip", label: "8. Propriété intellectuelle" },
  { id: "rgpd", label: "9. Données personnelles" },
  { id: "responsabilite", label: "10. Responsabilité" },
  { id: "audit", label: "11. Pentest / audit" },
  { id: "formation", label: "12. Formation" },
  { id: "soustraitance", label: "13. Sous-traitance" },
  { id: "confidentialite", label: "14. Confidentialité" },
  { id: "reference", label: "15. Référencement" },
  { id: "droit", label: "16. Loi applicable" },
  { id: "modifications", label: "17. Modifications" },
];

export default function CGVPage() {
  return (
    <LegalLayout
      badge="CGV B2B · v1.0"
      title="Conditions Générales de Vente"
      subtitle="Conditions applicables aux relations commerciales B2B avec Humanix-Cybersecurity. Couvrent SaaS Humanix Académie, formation professionnelle, audits et conseils en cybersécurité."
      version="1.0"
      lastUpdate={TODAY}
      toc={TOC}
    >
      <LegalHighlight variant="warning">
        Les présentes CGV s'appliquent aux relations <strong>B2B</strong> entre
        professionnels. Trois types de prestations sont couverts : (a)
        abonnement à la plateforme Humanix Académie ; (b) formation
        professionnelle ; (c) prestations d'audit et de conseil en
        cybersécurité.
      </LegalHighlight>

      <LegalSection
        id="objet"
        num="Article 1"
        title="Objet et identification du prestataire"
      >
        <p>
          Les présentes Conditions Générales de Vente (ci-après{" "}
          <strong>« CGV »</strong>) régissent les relations contractuelles entre
          :
        </p>
        <ul>
          <li>
            <strong>Humanix-Cybersecurity</strong>, SASU au capital de 100 € -
            siège social 16 Rue Joseph Loiret, 30100 Alès - RCS Nîmes 103 901
            799 - TVA FR 80 103 901 799 (ci-après{" "}
            <strong>« Humanix-Cybersecurity »</strong> ou{" "}
            <strong>« le Prestataire »</strong>),
          </li>
          <li>
            et toute personne morale, professionnelle, commandant une prestation
            auprès de Humanix-Cybersecurity (ci-après{" "}
            <strong>« le Client »</strong>).
          </li>
        </ul>
        <p>
          Toute commande implique l'adhésion sans réserve du Client aux
          présentes CGV. Les conditions générales d'achat éventuelles du Client
          ne sont pas opposables, sauf accord écrit préalable.
        </p>
      </LegalSection>

      <LegalSection
        id="prestations"
        num="Article 2"
        title="Prestations proposées"
      >
        <LegalSubsection
          num="2.1"
          title="Plateforme Humanix Académie (mode SaaS)"
        >
          <p>
            Humanix-Cybersecurity met à disposition du Client la plateforme web{" "}
            <strong>Humanix Académie</strong> (par Humanix-Cybersecurity),
            accessible en mode <strong>SaaS</strong>. L'accès est consenti pour
            la durée d'abonnement souscrite, dans la limite du nombre de
            licences (sièges) commandées et selon les fonctionnalités du palier
            choisi (Starter, Pro, Enterprise). Le
            sous-palier Starter free est mis à disposition gracieusement, sans
            engagement et sans CB, dans la limite de cinq (5) sièges actifs.
            Au-delà, le palier Starter passe en forfait payant (19 €/mois HT
            jusqu'à quinze sièges).
          </p>
        </LegalSubsection>

        <LegalSubsection
          num="2.1bis"
          title="Plateforme Humanix Community Edition (self-host)"
        >
          <p>
            Humanix-Cybersecurity met également à disposition, sous licence
            libre <strong>GNU AGPLv3</strong>, le code source de la plateforme
            sous l'appellation <strong>Humanix Community Edition</strong>. Cette
            mise à disposition gracieuse est régie par les termes de la licence
            AGPLv3 (consultable sur{" "}
            <a
              href="https://www.gnu.org/licenses/agpl-3.0.html"
              rel="noreferrer"
            >
              gnu.org
            </a>
            ) et ne fait l'objet d'aucune garantie commerciale par
            Humanix-Cybersecurity. Le Client qui choisit le mode self-host est
            seul responsable de l'installation, l'exploitation, la maintenance
            et la sécurité de son instance.
          </p>
        </LegalSubsection>

        <LegalSubsection num="2.2" title="Formation professionnelle">
          <p>
            Humanix-Cybersecurity propose des actions de formation
            professionnelle en cybersécurité, en présentiel ou à distance. Ces
            prestations font l'objet d'une convention de formation distincte
            précisant l'objet, la durée, les modalités d'évaluation et le coût.
          </p>
        </LegalSubsection>

        <LegalSubsection num="2.3" title="Audit et conseil en cybersécurité">
          <p>
            Humanix-Cybersecurity réalise des prestations d'audit (tests
            d'intrusion, audit de configuration, audit d'architecture, audit de
            code), de conseil en gouvernance (RSSI externalisé, accompagnement
            NIS2, RGPD) et d'ingénierie DevSecOps. Ces prestations font l'objet
            d'un contrat de mission spécifique précisant le périmètre, les
            livrables et la durée.
          </p>
        </LegalSubsection>

        <LegalSubsection num="2.4" title="Connecteurs et intégrations">
          <p>
            La plateforme Humanix Académie expose, à partir de l'offre
            Pro, un endpoint d'export de preuves de conformité (
            <code>/api/v1/evidence-export</code>) compatible avec plusieurs
            formats standards : <strong>OSCAL v1.1.2</strong> (NIST),{" "}
            <strong>Splunk CIM v1</strong>, <strong>ArcSight CEF v1</strong>,
            ainsi qu'un format propre à <strong>CISO Assistant</strong>. Un
            endpoint <strong>SCIM v2</strong> (RFC 7643/7644) est également
            exposé pour le provisioning automatique d'utilisateurs depuis
            l'annuaire du Client. Des webhooks signés HMAC-SHA256 permettent la
            notification temps réel d'événements.
          </p>
          <p>
            Des connecteurs Python autonomes (CISO Assistant, Splunk HEC,
            Microsoft Sentinel) sont fournis sous licence MIT et sont
            utilisables librement par le Client. Humanix-Cybersecurity s'engage
            à maintenir ces connecteurs à jour avec la version courante de son
            API, mais{" "}
            <strong>ne fournit pas de support sur les outils tiers</strong>{" "}
            (CISO Assistant, Splunk, Sentinel, etc.) ni sur leur exploitation
            interne par le Client. Le bon fonctionnement de ces outils tiers
            relève de la seule responsabilité du Client et de leurs éditeurs
            respectifs.
          </p>
          <p>
            Tout connecteur sur-mesure pour un outil non couvert par la liste
            des intégrations natives publiées sur{" "}
            <Link href="/integrations">/integrations</Link> fait l'objet d'une
            prestation séparée, facturée selon le contrat de mission spécifique
            mentionné en 2.3.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection
        id="commande"
        num="Article 3"
        title="Commande et formation du contrat"
      >
        <p>
          Toute commande est précédée d'un devis écrit, valable 30 jours, qui
          devient contractuel après signature ou validation par voie
          électronique du Client. La signature du devis vaut acceptation pleine
          et entière des présentes CGV.
        </p>
      </LegalSection>

      <LegalSection
        id="tarifs"
        num="Article 4"
        title="Tarifs et modalités de paiement"
      >
        <p>
          Les tarifs sont indiqués en euros, hors taxes. La TVA française au
          taux en vigueur est applicable sauf cas d'autoliquidation pour les
          clients établis dans un autre État membre de l'UE et titulaires d'un
          numéro de TVA intracommunautaire valide.
        </p>
        <p>
          <strong>Modalités de paiement</strong> : par virement bancaire ou
          prélèvement SEPA, à 30 jours nets date de facture. Pour les
          abonnements SaaS, paiement à la souscription puis selon la périodicité
          convenue (mensuelle ou annuelle).
        </p>
        <LegalHighlight variant="warning">
          <strong>Pénalités de retard</strong> : conformément à l'article
          L441-10 du Code de commerce, tout retard de paiement entraîne de plein
          droit l'application de pénalités au taux de la BCE majoré de 10
          points, ainsi qu'une indemnité forfaitaire pour frais de recouvrement
          de 40 €.
        </LegalHighlight>
      </LegalSection>

      <LegalSection id="duree" num="Article 5" title="Durée et résiliation">
        <LegalSubsection num="5.1" title="Plateforme SaaS">
          <p>
            L'abonnement est conclu pour la durée indiquée dans le devis
            (mensuelle ou annuelle). Il est renouvelé tacitement par périodes de
            même durée, sauf dénonciation par l'une ou l'autre partie au moins
            30 jours avant l'échéance, par email à{" "}
            <a href="mailto:contact@humanix-cybersecurity.fr">
              contact@humanix-cybersecurity.fr
            </a>{" "}
            ou par lettre recommandée. Pour les contrats B2B, la durée
            d'engagement initial ne peut excéder 24 mois.
          </p>
        </LegalSubsection>

        <LegalSubsection num="5.2" title="Formation et audit">
          <p>
            Les prestations de formation et d'audit sont des prestations
            ponctuelles dont la durée est fixée au contrat. Elles ne se
            renouvellent pas tacitement.
          </p>
        </LegalSubsection>

        <LegalSubsection num="5.3" title="Résiliation pour faute">
          <p>
            En cas de manquement grave de l'une des parties non réparé dans un
            délai de 30 jours suivant mise en demeure par lettre recommandée,
            l'autre partie peut résilier de plein droit le contrat, sans
            préjudice de tous dommages et intérêts.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection
        id="sla"
        num="Article 6"
        title="Disponibilité du service SaaS (SLA)"
      >
        <p>
          Humanix-Cybersecurity s'engage à mettre en œuvre les moyens
          raisonnables pour assurer une disponibilité de la plateforme Humanix
          Académie d'<strong>au moins 99 % en moyenne mensuelle</strong>, hors :
        </p>
        <ul>
          <li>Maintenances planifiées annoncées au moins 48h à l'avance ;</li>
          <li>Cas de force majeure (article 7) ;</li>
          <li>
            Indisponibilités imputables à l'hébergeur (Scaleway) ou au
            fournisseur de connectivité ;
          </li>
          <li>Indisponibilités imputables au Client ou à ses utilisateurs.</li>
        </ul>
        <p>
          Tout incident est signalé via{" "}
          <a href="mailto:support@humanix-cybersecurity.fr">
            support@humanix-cybersecurity.fr
          </a>
          .
        </p>
        <p>
          En cas de non-atteinte répétée de l'objectif (3 incidents ou plus sur
          12 mois glissants), le Client peut demander, après mise en demeure
          restée infructueuse pendant 30 jours, soit une remise prorata sur la
          mensualité suivante, soit la résiliation anticipée sans pénalité. Les
          modalités d'un SLA premium (crédit automatique, RPO/RTO renforcés)
          sont prévues dans un avenant dédié.
        </p>
      </LegalSection>

      <LegalSection id="force" num="Article 7" title="Force majeure">
        <p>
          Aucune des parties ne pourra être tenue responsable d'un manquement à
          ses obligations résultant d'un cas de force majeure au sens de
          l'article 1218 du Code civil. Sont notamment considérés : guerres,
          attaques informatiques massives ne pouvant être raisonnablement
          parées, pandémie, décisions gouvernementales, défaillance prolongée du
          fournisseur d'hébergement ou d'électricité.
        </p>
      </LegalSection>

      <LegalSection id="ip" num="Article 8" title="Propriété intellectuelle">
        <p>
          Tous les contenus, modules, scénarios pédagogiques, mascottes, code
          source de la plateforme Humanix Académie demeurent la propriété
          exclusive de Humanix-Cybersecurity. Le Client se voit concéder un{" "}
          <strong>
            droit d'usage non exclusif, non cessible et non transférable
          </strong>
          , limité à la durée de l'abonnement et au nombre de licences
          souscrites, à des fins de formation interne uniquement.
        </p>
        <p>
          Toute extraction, reproduction ou diffusion à des tiers du contenu de
          la plateforme est strictement interdite et engage la responsabilité du
          Client.
        </p>
        <p>
          Pour les modules contribués par la communauté (marketplace), les
          licences Creative Commons (CC BY ou CC BY-SA) s'appliquent dans le
          respect des conditions de chaque licence.
        </p>
      </LegalSection>

      <LegalSection
        id="rgpd"
        num="Article 9"
        title="Données personnelles et confidentialité"
      >
        <p>
          Pour les prestations SaaS, Humanix-Cybersecurity agit en qualité de{" "}
          <strong>sous-traitant</strong> au sens de l'article 28 du RGPD, pour
          le compte du Client responsable du traitement.
        </p>
        <LegalHighlight variant="info">
          Un <strong>contrat de sous-traitance (DPA)</strong> conforme au RGPD
          art. 28 et aux Clauses Contractuelles Types de la Commission
          européenne (décision 2021/914) est transmis au Client avant toute mise
          en service de la plateforme. Sans DPA signé, la prestation SaaS ne
          peut être activée. Un modèle peut être obtenu sur demande à{" "}
          <a href="mailto:contact@humanix-cybersecurity.fr">
            contact@humanix-cybersecurity.fr
          </a>
          .
        </LegalHighlight>
        <p>
          Pour les prestations d'audit, les parties qualifient leurs rôles
          (responsable conjoint, séparé ou sous-traitant) dans le contrat de
          mission. Un accord de confidentialité (NDA) est systématiquement signé
          avant toute mission d'audit.
        </p>
        <p>
          Cf. notre{" "}
          <Link href="/confidentialite">politique de confidentialité</Link> pour
          le détail des traitements et de leur durée.
        </p>
      </LegalSection>

      <LegalSection id="responsabilite" num="Article 10" title="Responsabilité">
        <p>
          Humanix-Cybersecurity est tenue d'une{" "}
          <strong>obligation de moyens</strong> dans l'exécution de ses
          prestations. Sa responsabilité contractuelle est limitée aux dommages
          directs prouvés.
        </p>
        <p>
          Le plafond de responsabilité contractuelle, par sinistre et par année
          civile, est fixé au montant total des sommes versées par le Client au
          titre du contrat concerné au cours des{" "}
          <strong>douze (12) derniers mois</strong>. Cette limitation s'entend
          sans préjudice :
        </p>
        <ul>
          <li>
            de la garantie effectivement couverte par la police d'assurance
            Responsabilité Civile Professionnelle (cf. infra), qui peut être
            actionnée au-delà du plafond contractuel ;
          </li>
          <li>
            des cas d'exclusion légale des plafonds : faute lourde, faute
            intentionnelle, dol, atteinte aux droits fondamentaux de la personne
            ou violation intentionnelle des obligations de confidentialité.
          </li>
        </ul>
        <p>
          Sont exclus les dommages indirects (perte d'exploitation, perte de
          chance, atteinte à la réputation, perte de données dont
          Humanix-Cybersecurity n'est pas la cause directe et exclusive), sauf
          en cas de faute intentionnelle.
        </p>
        <LegalHighlight variant="success">
          Humanix-Cybersecurity dispose d'une assurance Responsabilité Civile
          Professionnelle adaptée à son activité de cybersécurité (audit,
          conseil, SaaS). Les coordonnées de l'assureur et le numéro de police
          peuvent être communiqués sur demande écrite à{" "}
          <a href="mailto:contact@humanix-cybersecurity.fr">
            contact@humanix-cybersecurity.fr
          </a>
          , et figurent dans le contrat de mission le cas échéant.
        </LegalHighlight>
      </LegalSection>

      <LegalSection
        id="audit"
        num="Article 11"
        title="Cadre spécifique aux prestations d'audit / pentest"
      >
        <LegalHighlight variant="warning">
          Les missions de tests d'intrusion ne peuvent être réalisées qu'après
          signature préalable et concomitante :
          <ul className="mt-2">
            <li>
              d'une <strong>convention de service ou lettre de mission</strong>{" "}
              précisant le périmètre exact, la fenêtre temporelle, les méthodes
              autorisées et le contact d'urgence ;
            </li>
            <li>
              d'un <strong>accord de confidentialité (NDA)</strong> protégeant
              les vulnérabilités, identifiants et configurations découverts.
            </li>
          </ul>
          En l'absence de l'un de ces deux documents signés, aucun test ne sera
          lancé.
        </LegalHighlight>
        <p>
          Le Client garantit qu'il dispose des droits nécessaires sur les
          systèmes audités. Si les systèmes sont hébergés ou opérés par des
          tiers, le Client s'engage à informer ces tiers et à obtenir leurs
          accords préalables.
        </p>
        <p>
          <strong>Tests de phishing simulé / social engineering</strong> : ces
          tests, lorsqu'ils ciblent des collaborateurs du Client, ne peuvent
          être menés qu'avec autorisation écrite explicite du responsable RH ou
          de la sécurité du Client. Ils excluent toute manipulation dolosive
          personnelle au sens de l'article 226-15 du Code pénal et tout dommage
          réel intentionnel à la personne.
        </p>
        <p>
          Les rapports d'audit, livrables et données techniques sensibles sont
          transmis exclusivement au Client, par canal chiffré (TLS 1.3 en
          minimum, ou support physique chiffré sur demande). Ils ne sont jamais
          diffusés à des tiers et sont conservés par Humanix-Cybersecurity au
          maximum 3 ans à partir de la livraison, sauf obligation légale ou
          litige.
        </p>
      </LegalSection>

      <LegalSection
        id="formation"
        num="Article 12"
        title="Cadre spécifique aux prestations de formation"
      >
        <p>
          Les actions de formation professionnelle font l'objet d'une convention
          de formation conforme aux articles L6353-1 et suivants du Code du
          travail. Cette convention détaille :
        </p>
        <ul>
          <li>l'objet de la formation et le public visé ;</li>
          <li>la durée et le calendrier prévisionnel ;</li>
          <li>les objectifs pédagogiques et modalités d'évaluation ;</li>
          <li>le coût et les modalités de paiement ;</li>
          <li>le cas échéant, les modalités de prise en charge par un OPCO.</li>
        </ul>
        <LegalHighlight variant="info">
          <strong>Numéro de déclaration d'activité de formation</strong> : [À
          COMPLÉTER après enregistrement DREETS Occitanie]
          <br />
          <strong>Statut Qualiopi</strong> : non certifié à ce jour. Démarche
          envisagée à venir.
          <br />
          En attendant la certification Qualiopi, la prise en charge par les
          OPCO peut nécessiter le recours à un organisme de formation certifié
          partenaire.
        </LegalHighlight>
        <p>
          Toute formation est précédée d'une convocation, et donne lieu à
          émargement (présentiel) ou attestation de connexion (distanciel). Une
          attestation de fin de formation et, le cas échéant, un certificat de
          réalisation sont remis au Client.
        </p>
      </LegalSection>

      <LegalSection id="soustraitance" num="Article 13" title="Sous-traitance">
        <p>
          Humanix-Cybersecurity recourt à des sous-traitants techniques pour
          l'exécution de ses prestations. La liste à jour est consultable sur la
          page <Link href="/securite">Sécurité &amp; Conformité</Link>. Au jour
          des présentes CGV, ces sous-traitants sont :
        </p>
        <ul>
          <li>
            <strong>Scaleway SAS</strong> (France 🇫🇷) - hébergement,
            sauvegardes, infrastructure cloud ;
          </li>
          <li>
            <strong>Scaleway TEM</strong> (France 🇫🇷, Paris) - emails
            transactionnels (lien magique de connexion, alertes système,
            newsletter Cyber-Anecdote du Lundi) ;
          </li>
          <li>
            <strong>Mollie B.V.</strong> (UE 🇪🇺, Amsterdam, Pays-Bas) -
            prestataire de paiement pour les abonnements SaaS Humanix Académie.
            Régulé par la DNB (Banque centrale des Pays-Bas) et agréé
            établissement de paiement UE sous PSD2. Traite les données de
            carte bancaire en mode tokenisation conforme PCI-DSS ; Humanix
            ne stocke jamais le PAN ni le CVV ;
          </li>
          <li>
            <strong>Olinda SAS / Qonto</strong> (France 🇫🇷) - compte de
            paiement professionnel pour la réception des virements et la
            tenue de compte ;
          </li>
          <li>
            <strong>Dougs SAS</strong> (France 🇫🇷) - expertise comptable
            et facturation ;
          </li>
          <li>
            <strong>Hiscox France</strong> (France 🇫🇷) - assureur
            Responsabilité Civile Professionnelle (RC Pro). Aucune donnée
            client n'est partagée hors d'un cas d'incident matériel
            indemnisé.
          </li>
        </ul>
        <p>
          Tout nouveau sous-traitant traitant des données personnelles fait
          l'objet d'une notification écrite au Client au moins 30 jours avant
          son intégration, conformément à l'article 28.2 du RGPD et au DPA. Le
          Client dispose alors d'un droit d'objection motivée.
        </p>
      </LegalSection>

      <LegalSection
        id="confidentialite"
        num="Article 14"
        title="Confidentialité"
      >
        <p>
          Chaque partie s'engage à conserver confidentielles les informations à
          caractère confidentiel reçues de l'autre partie, pendant toute la
          durée du contrat et 5 ans après son terme. Cet engagement ne
          s'applique pas aux informations publiques ou légalement exigibles.
        </p>
      </LegalSection>

      <LegalSection
        id="reference"
        num="Article 15"
        title="Référencement commercial"
      >
        <p>
          Sauf opposition écrite du Client, Humanix-Cybersecurity se réserve le
          droit de citer le nom du Client et son logo à titre de référence
          commerciale (site web, plaquettes, propositions commerciales). Le
          Client peut s'opposer à ce référencement à tout moment par simple
          email.
        </p>
      </LegalSection>

      <LegalSection
        id="droit"
        num="Article 16"
        title="Loi applicable et juridiction"
      >
        <p>
          Les présentes CGV sont régies par le droit français. Tout litige
          relatif à leur interprétation ou leur exécution, à défaut de
          résolution amiable, relève de la compétence exclusive du{" "}
          <strong>Tribunal de commerce de Nîmes</strong>.
        </p>
      </LegalSection>

      <LegalSection
        id="modifications"
        num="Article 17"
        title="Modifications des CGV"
      >
        <p>
          Humanix-Cybersecurity se réserve le droit de modifier les présentes
          CGV. Les modifications sont opposables aux nouveaux contrats à compter
          de leur publication. Pour les contrats en cours, les modifications
          substantielles seront notifiées au Client avec un préavis de 30 jours,
          ouvrant droit à résiliation sans pénalité en cas de refus.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
