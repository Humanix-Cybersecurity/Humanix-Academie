// SPDX-License-Identifier: AGPL-3.0-or-later
// CGU SaaS - Conditions Générales d'Utilisation Humanix Académie
import Link from "next/link";
import LegalLayout, {
  LegalSection,
  LegalHighlight,
} from "@/components/legal/LegalLayout";

export const metadata = {
  title: "CGU - Conditions Générales d'Utilisation - Humanix Académie",
  description: "Règles d'utilisation de la plateforme Humanix Académie.",
};

const TODAY = new Date().toLocaleDateString("fr-FR");

const TOC = [
  { id: "definitions", label: "1. Définitions" },
  { id: "acceptation", label: "2. Acceptation" },
  { id: "compte", label: "3. Création et sécurité" },
  { id: "usages", label: "4. Usages autorisés / interdits" },
  { id: "marketplace", label: "5. Marketplace et contributions" },
  { id: "disponibilite", label: "6. Disponibilité" },
  { id: "donnees", label: "7. Données personnelles" },
  { id: "propriete", label: "8. Propriété intellectuelle" },
  { id: "fermeture", label: "9. Suspension du compte" },
  { id: "tiers", label: "10. Liens et services tiers" },
  { id: "modifications", label: "11. Modifications des CGU" },
  { id: "droit", label: "12. Loi applicable" },
];

export default function CGUPage() {
  return (
    <LegalLayout
      badge="Conditions d'utilisation · v1.0"
      title="Conditions Générales d'Utilisation"
      subtitle="Règles d'utilisation de la plateforme Humanix Académie pour les apprenants, managers et administrateurs des organisations clientes."
      version="1.0"
      lastUpdate={TODAY}
      toc={TOC}
    >
      <LegalHighlight variant="info">
        Les présentes CGU régissent votre utilisation de la plateforme{" "}
        <strong>Humanix Académie</strong> en qualité d'utilisateur final. Pour
        les conditions commerciales (souscription d'un abonnement, prix, durée),
        voir les <Link href="/cgv">CGV</Link>.
      </LegalHighlight>

      <LegalSection id="definitions" num="1" title="Définitions">
        <ul>
          <li>
            <strong>Plateforme</strong> : le service Humanix Académie édité par
            Humanix-Cybersecurity SASU, accessible à l'adresse{" "}
            <code>academie.humanix-cybersecurity.fr</code> (URL définitive
            communiquée à la souscription du Client).
          </li>
          <li>
            <strong>Client</strong> : l'organisation (entreprise, école,
            collectivité, association) qui a souscrit un abonnement à la
            Plateforme et qui agit en qualité de responsable du traitement au
            sens du RGPD.
          </li>
          <li>
            <strong>Licence</strong> : un siège utilisateur activé pour un
            membre de l'organisation Cliente. Une Licence correspond à un
            Utilisateur unique.
          </li>
          <li>
            <strong>Utilisateur</strong> : toute personne physique titulaire
            d'une Licence et accédant à la Plateforme dans le cadre du contrat
            conclu par le Client (apprenant, manager, administrateur).
          </li>
          <li>
            <strong>Compte</strong> : l'espace personnel de l'Utilisateur sur la
            Plateforme.
          </li>
          <li>
            <strong>Contenu</strong> : modules, articles, scénarios, quiz mis à
            disposition par Humanix-Cybersecurity ou par d'autres utilisateurs
            sur la marketplace.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="acceptation" num="2" title="Acceptation">
        <p>
          En accédant à la Plateforme, l'Utilisateur reconnaît avoir lu et
          accepté les présentes CGU. L'utilisation est réservée aux personnes
          ayant la capacité juridique de contracter ou agissant sous l'autorité
          d'un représentant légal.
        </p>
        <p>
          Les présentes CGU s'appliquent uniquement à l'utilisation de la
          Plateforme dans son <strong>mode Cloud SaaS</strong> opérée par
          Humanix-Cybersecurity. Les utilisateurs d'instances{" "}
          <strong>Humanix Community Edition self-host</strong> (déployées par
          leur organisation à partir du code source publié sous licence GNU AGPL
          v3) ne sont pas liés par les présentes CGU mais par les termes de la{" "}
          <Link href="/CGU_SELFHOST">licence libre AGPLv3</Link> et, le cas
          échéant, par les conditions internes propres à leur organisation hôte.
        </p>
      </LegalSection>

      <LegalSection id="compte" num="3" title="Création et sécurité du compte">
        <p>
          L'Utilisateur s'engage à fournir des informations exactes lors de la
          création de son compte et à mettre à jour son profil en cas de
          changement. Il est seul responsable de la confidentialité de ses
          identifiants. Toute action effectuée sur son compte est réputée
          effectuée par lui, sauf usurpation prouvée.
        </p>
        <p>
          En cas de soupçon de compromission, l'Utilisateur informe sans délai
          son administrateur ou Humanix-Cybersecurity à{" "}
          <a href="mailto:support@humanix-cybersecurity.fr">
            support@humanix-cybersecurity.fr
          </a>
          .
        </p>
        <p>
          Le compte peut également être créé, mis à jour ou désactivé
          automatiquement par l'organisation Cliente via l'endpoint standard{" "}
          <strong>SCIM v2</strong> (RFC 7643/7644) connecté à son annuaire
          d'entreprise (Microsoft Entra ID, Okta, Google Workspace, Keycloak…).
          Dans ce cas, le cycle de vie du compte suit celui de l'annuaire de
          l'organisation. La désactivation par défaut préserve l'historique de
          progression ; la suppression définitive (droit à l'effacement RGPD)
          reste possible sur demande.
        </p>
      </LegalSection>

      <LegalSection id="usages" num="4" title="Usages autorisés et interdits">
        <p>
          L'Utilisateur s'engage à utiliser la Plateforme conformément à sa
          finalité pédagogique. Sont notamment <strong>interdits</strong> :
        </p>
        <ul>
          <li>
            Tenter ou réussir à accéder à des données, comptes ou ressources ne
            lui appartenant pas, y compris par manipulation d'URL, exploration
            des permissions ou contournement des contrôles d'accès ;
          </li>
          <li>
            Réaliser des tests d'intrusion sur la Plateforme sans accord écrit
            préalable de Humanix-Cybersecurity (un programme de divulgation
            responsable existe pour les chercheurs) ;
          </li>
          <li>
            Extraire massivement, copier, rediffuser ou commercialiser le
            Contenu en dehors de l'organisation Cliente ;
          </li>
          <li>
            Publier des contenus illicites, diffamatoires, haineux, ou violant
            les droits de tiers (notamment lors de contributions à la
            marketplace) ;
          </li>
          <li>
            Faire usage de la Plateforme pour des activités à caractère
            personnel non liées à la formation, ou pour des finalités
            commerciales tierces ;
          </li>
          <li>
            Interférer avec le bon fonctionnement de la Plateforme (déni de
            service, abus de requêtes, scraping automatisé sans accord,
            exploitation de failles).
          </li>
        </ul>
        <LegalHighlight variant="warning">
          Tout manquement peut entraîner la suspension ou la suppression du
          compte, sans préjudice de poursuites judiciaires si le manquement
          constitue une infraction pénale (notamment articles 323-1 et suivants
          du Code pénal).
        </LegalHighlight>
      </LegalSection>

      <LegalSection
        id="marketplace"
        num="5"
        title="Marketplace et contributions"
      >
        <p>
          Les Utilisateurs habilités par leur organisation peuvent proposer des
          modules pédagogiques sur la marketplace. Toute contribution est
          soumise à modération préalable par Humanix-Cybersecurity, dans un
          délai indicatif de <strong>5 jours ouvrables</strong>. L'auteur est
          informé de l'acceptation ou du refus motivé par email.
        </p>
        <p>La contribution implique :</p>
        <ul>
          <li>
            La cession à Humanix-Cybersecurity d'un droit d'usage{" "}
            <strong>non exclusif</strong> pour la diffusion du module au sein de
            la marketplace ;
          </li>
          <li>
            Le respect d'une licence Creative Commons (CC BY ou CC BY-SA selon
            le choix de l'auteur) ;
          </li>
          <li>
            La garantie que le Contenu contribué est original ou que
            l'Utilisateur dispose des droits nécessaires ;
          </li>
          <li>
            L'absence de balises HTML, scripts, ou liens externes vers des
            contenus malveillants - Humanix-Cybersecurity se réserve le droit de
            refuser tout module non conforme à la charte de sécurité de la
            marketplace.
          </li>
        </ul>
        <p>
          <strong>Droits de l'auteur</strong> : l'auteur conserve l'intégralité
          de ses droits moraux (paternité, intégrité de l'œuvre). Les
          contributions sont acceptées et diffusées à titre gratuit ;
          Humanix-Cybersecurity ne rémunère pas les contributeurs. L'auteur peut
          demander le retrait de son module de la marketplace à tout moment via{" "}
          <a href="mailto:rgpd@humanix-cybersecurity.fr">
            rgpd@humanix-cybersecurity.fr
          </a>
          , moyennant un délai de 30 jours pour permettre la migration
          éventuelle des organisations Clientes ayant installé le module.
        </p>
      </LegalSection>

      <LegalSection
        id="disponibilite"
        num="6"
        title="Disponibilité, évolutions et maintenance"
      >
        <p>
          Humanix-Cybersecurity s'efforce d'assurer une disponibilité optimale
          de la Plateforme. Des interruptions peuvent toutefois survenir pour
          maintenance, évolutions techniques ou raisons indépendantes de la
          volonté de l'éditeur. Les engagements de niveau de service détaillés
          figurent dans les <Link href="/cgv">CGV</Link>.
        </p>
        <p>
          La Plateforme évolue régulièrement. De nouvelles fonctionnalités
          peuvent être ajoutées, modifiées ou retirées sans préavis dès lors que
          cela ne dégrade pas substantiellement le service souscrit par le
          Client.
        </p>
      </LegalSection>

      <LegalSection id="donnees" num="7" title="Données personnelles">
        <p>
          Le traitement des données personnelles de l'Utilisateur est encadré
          par notre{" "}
          <Link href="/confidentialite">politique de confidentialité</Link>.
        </p>
        <LegalHighlight variant="info">
          Étant donné que l'Utilisateur accède à la Plateforme dans le cadre du
          contrat conclu par son organisation Cliente (qui est responsable du
          traitement au sens du RGPD), les demandes d'exercice des droits RGPD
          doivent en principe transiter par cette organisation. L'Utilisateur
          peut cependant nous contacter directement à{" "}
          <a href="mailto:rgpd@humanix-cybersecurity.fr">
            rgpd@humanix-cybersecurity.fr
          </a>{" "}
          ; nous nous chargerons en tout état de cause de la prise en compte de
          la demande, en lien avec le Client.
        </LegalHighlight>
      </LegalSection>

      <LegalSection id="propriete" num="8" title="Propriété intellectuelle">
        <p>
          Tous les éléments de la Plateforme (graphismes, mascottes, code,
          scénarios, modules officiels) sont protégés par le droit d'auteur.
          L'Utilisateur s'interdit toute reproduction non autorisée. Les modules
          communautaires sont publiés sous les licences indiquées sur leur
          fiche.
        </p>
      </LegalSection>

      <LegalSection
        id="fermeture"
        num="9"
        title="Suspension et fermeture du compte"
      >
        <p>
          L'organisation Cliente peut révoquer l'accès d'un Utilisateur à tout
          moment. Humanix-Cybersecurity peut suspendre ou supprimer un compte en
          cas de manquement aux présentes CGU, après mise en demeure par tout
          moyen écrit lorsque la nature du manquement le permet.
        </p>
      </LegalSection>

      <LegalSection id="tiers" num="10" title="Liens et services tiers">
        <p>
          La Plateforme peut référencer des outils tiers (lecture de PDF,
          hébergement d'images, etc.). Humanix-Cybersecurity n'est pas
          responsable du contenu, de la disponibilité ou des pratiques de ces
          tiers, mais s'engage à choisir des partenaires conformes au RGPD pour
          tout traitement de données personnelles.
        </p>
      </LegalSection>

      <LegalSection id="modifications" num="11" title="Modifications des CGU">
        <p>
          Les présentes CGU peuvent être modifiées. Les Utilisateurs sont
          informés des modifications substantielles par notification sur la
          Plateforme ou par email. La poursuite de l'utilisation après
          modification vaut acceptation.
        </p>
      </LegalSection>

      <LegalSection id="droit" num="12" title="Loi applicable et juridiction">
        <p>
          Les CGU sont régies par le droit français. Les litiges relatifs à
          l'utilisation de la Plateforme relèvent de la compétence exclusive du{" "}
          <strong>Tribunal de commerce de Nîmes</strong>, les Utilisateurs
          accédant à la Plateforme dans un cadre exclusivement professionnel via
          leur organisation Cliente.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
