// SPDX-License-Identifier: AGPL-3.0-or-later
// Politique cookies - recommandations CNIL
import Link from "next/link";
import LegalLayout, {
  LegalSection,
  LegalTable,
  LegalHighlight,
} from "@/components/legal/LegalLayout";
import ConsentControl from "@/components/ConsentControl";

export const metadata = {
  title: "Politique de cookies - Humanix-Cybersecurity",
  description: "Quels cookies utilisons-nous, pourquoi, comment les refuser.",
};

const TODAY = new Date().toLocaleDateString("fr-FR");

const TOC = [
  { id: "definition", label: "1. Qu'est-ce qu'un cookie ?" },
  { id: "approche", label: "2. Notre approche" },
  { id: "liste", label: "3. Liste des cookies" },
  { id: "audience", label: "4. Mesure d'audience" },
  { id: "refus", label: "5. Refuser ou supprimer" },
  { id: "plus", label: "6. Plus d'informations" },
];

export default function CookiesPage() {
  return (
    <LegalLayout
      badge="CNIL · e-Privacy"
      title="Politique de cookies"
      subtitle="Pas de tracking publicitaire. Pas de pixel tiers. Juste les cookies techniques pour faire fonctionner le service."
      lastUpdate={TODAY}
      toc={TOC}
    >
      <LegalSection id="definition" num="1" title="Qu'est-ce qu'un cookie ?">
        <p>
          Un cookie est un petit fichier texte stocké par votre navigateur sur
          votre appareil lors de la visite d'un site. Il permet par exemple de
          mémoriser vos préférences ou de maintenir une session ouverte après
          connexion.
        </p>
      </LegalSection>

      <LegalSection
        id="approche"
        num="2"
        title="Notre approche : zéro tracking publicitaire"
      >
        <LegalHighlight variant="success" emoji="🔒">
          Humanix-Cybersecurity ne dépose{" "}
          <strong>
            aucun cookie publicitaire, aucun cookie de suivi tiers, aucun pixel
            de réseaux sociaux
          </strong>
          . Les cookies strictement nécessaires au fonctionnement du service ne
          nécessitent pas votre consentement préalable (article 82 de la loi
          Informatique et Libertés).
        </LegalHighlight>
        <p>
          Pour la mesure d'audience anonyme (Plausible Analytics), nous{" "}
          <strong>recueillons votre consentement explicite</strong> via une
          bannière conforme à la recommandation CNIL n° 2020-091 (parité stricte
          entre « Accepter » et « Refuser », aucune case pré-cochée). Vous
          pouvez modifier votre choix à tout moment depuis la{" "}
          <a href="#audience">section 4</a> de cette page.
        </p>
      </LegalSection>

      <LegalSection id="liste" num="3" title="Liste des cookies utilisés">
        <LegalTable
          headers={["Cookie", "Finalité", "Durée", "Type"]}
          rows={[
            [
              "next-auth.session-token",
              "Maintien de votre session après connexion",
              "30 jours",
              "Strictement nécessaire",
            ],
            [
              "next-auth.csrf-token",
              "Protection contre les attaques CSRF",
              "Session",
              "Strictement nécessaire",
            ],
            [
              "humanix-theme (localStorage)",
              "Mémorisation de votre choix de thème (clair / sombre / système)",
              "Persistant tant que non supprimé",
              "Préférence",
            ],
            [
              "humanix-cookie-consent (localStorage)",
              "Mémorisation de votre choix de consentement à la mesure d'audience (« granted » / « denied »)",
              "Persistant tant que non supprimé",
              "Préférence",
            ],
          ]}
        />
      </LegalSection>

      <LegalSection
        id="audience"
        num="4"
        title="Mesure d'audience anonyme (Plausible)"
      >
        <p>
          Nous utilisons{" "}
          <a
            href="https://plausible.io/privacy-focused-web-analytics"
            rel="noopener noreferrer"
            target="_blank"
          >
            Plausible Analytics
          </a>
          , un outil de mesure d'audience{" "}
          <strong>respectueux de la vie privée</strong>, hébergé en Europe. Il
          ne dépose <strong>aucun cookie</strong>, ne suit pas les utilisateurs
          entre les sites, et ne collecte ni adresse IP brute ni identifiant
          personnel — uniquement des statistiques agrégées (pages vues, pays,
          navigateur).
        </p>
        <p>
          Conformément à la recommandation CNIL n° 2020-091, son chargement
          n'intervient qu'après votre consentement explicite. Vous pouvez le
          revoir, l'accepter ou le refuser à tout moment ci-dessous —{" "}
          <strong>aussi facilement que vous l'avez donné</strong> (article 7.3
          du RGPD).
        </p>
        <ConsentControl />
      </LegalSection>

      <LegalSection
        id="refus"
        num="5"
        title="Comment refuser ou supprimer les cookies"
      >
        <p>
          Les cookies de session sont{" "}
          <strong>indispensables au fonctionnement</strong> du service
          authentifié (impossible de rester connecté sans). Vous pouvez les
          supprimer à tout moment via les paramètrès de votre navigateur, mais
          cela vous déconnectera de la plateforme.
        </p>
        <p>Liens utiles selon votre navigateur :</p>
        <ul>
          <li>
            <a
              href="https://support.mozilla.org/fr/kb/protection-renforcee-contre-pistage-firefox-ordinateur"
              rel="noopener noreferrer"
              target="_blank"
            >
              Firefox
            </a>
          </li>
          <li>
            <a
              href="https://support.google.com/chrome/answer/95647?hl=fr"
              rel="noopener noreferrer"
              target="_blank"
            >
              Chrome
            </a>
          </li>
          <li>
            <a
              href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac"
              rel="noopener noreferrer"
              target="_blank"
            >
              Safari
            </a>
          </li>
          <li>
            <a
              href="https://support.microsoft.com/fr-fr/microsoft-edge"
              rel="noopener noreferrer"
              target="_blank"
            >
              Edge
            </a>
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="plus" num="6" title="Plus d'informations">
        <p>
          Pour le traitement global de vos données personnelles, consultez notre{" "}
          <Link href="/confidentialite">politique de confidentialité</Link>.
        </p>
        <p>
          Pour toute question technique relative aux cookies ou au
          fonctionnement du site, contactez{" "}
          <a href="mailto:support@humanix-cybersecurity.fr">
            support@humanix-cybersecurity.fr
          </a>
          . Pour les demandes liées aux droits RGPD, écrivez à{" "}
          <a href="mailto:rgpd@humanix-cybersecurity.fr">
            rgpd@humanix-cybersecurity.fr
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
