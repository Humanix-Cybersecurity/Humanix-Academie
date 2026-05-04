// SPDX-License-Identifier: AGPL-3.0-or-later
// Mentions légales — obligation LCEN art. 6-III-1
import Link from "next/link";
import LegalLayout, {
  LegalSection,
  LegalHighlight,
} from "@/components/legal/LegalLayout";

export const metadata = {
  title: "Mentions légales — Humanix-Cybersecurity",
  description:
    "Informations légales relatives à l'éditeur du site et de la plateforme Humanix Académie.",
};

const TODAY = new Date().toLocaleDateString("fr-FR");

const TOC = [
  { id: "editeur", label: "1. Éditeur du site" },
  { id: "contact", label: "2. Contact" },
  { id: "hebergement", label: "3. Hébergement" },
  { id: "propriete", label: "4. Propriété intellectuelle" },
  { id: "responsabilite", label: "5. Responsabilité" },
  { id: "donnees", label: "6. Données personnelles" },
  { id: "cookies", label: "7. Cookies" },
  { id: "droit", label: "8. Droit applicable" },
  { id: "mediation", label: "9. Médiation" },
];

export default function MentionsLegalesPage() {
  return (
    <LegalLayout
      badge="LCEN art. 6-III-1"
      title="Mentions légales"
      subtitle="Informations légales relatives à l'éditeur du site humanix-cybersecurity.fr et de la plateforme Humanix Académie."
      lastUpdate={TODAY}
      toc={TOC}
    >
      <LegalSection id="editeur" num="1" title="Éditeur du site">
        <p>
          Le présent site et la plateforme <strong>Humanix Académie</strong>{" "}
          (par Humanix-Cybersecurity) sont édités par :
        </p>
        <ul>
          <li>
            <strong>Humanix-Cybersecurity</strong>, Société par actions
            simplifiée unipersonnelle (SASU)
          </li>
          <li>Capital social : 100,00 €</li>
          <li>Siège social : 16 Rue Joseph Loiret, 30100 Alès, France</li>
          <li>SIREN : 103 901 799 — RCS Nîmes</li>
          <li>SIRET : 103 901 799 00017</li>
          <li>N° TVA intracommunautaire : FR 80 103 901 799</li>
          <li>
            Code APE : 6202A — Conseil en systèmes et logiciels informatiques
          </li>
          <li>Président et directeur de la publication : Florian Durano</li>
        </ul>
      </LegalSection>

      <LegalSection id="contact" num="2" title="Contact">
        <ul>
          <li>
            <strong>Directeur de la publication</strong> : Florian Durano —{" "}
            <a href="mailto:contact@humanix-cybersecurity.fr">
              contact@humanix-cybersecurity.fr
            </a>
          </li>
          <li>
            Email général :{" "}
            <a href="mailto:contact@humanix-cybersecurity.fr">
              contact@humanix-cybersecurity.fr
            </a>
          </li>
          <li>
            Email questions RGPD / données personnelles :{" "}
            <a href="mailto:rgpd@humanix-cybersecurity.fr">
              rgpd@humanix-cybersecurity.fr
            </a>
          </li>
          <li>
            Email support technique :{" "}
            <a href="mailto:support@humanix-cybersecurity.fr">
              support@humanix-cybersecurity.fr
            </a>
          </li>
        </ul>
        <p className="text-xs italic mt-2">
          Aucun Délégué à la Protection des Données (DPO) n'a été désigné,
          Humanix-Cybersecurity n'étant pas légalement tenue de le faire au
          regard de l'article 37 du RGPD.
        </p>
      </LegalSection>

      <LegalSection id="hebergement" num="3" title="Hébergement">
        <p>Le site et la plateforme sont hébergés en France par :</p>
        <ul>
          <li>
            <strong>Scaleway SAS</strong>
          </li>
          <li>8 rue de la Ville l'Évêque, 75008 Paris, France</li>
          <li>RCS Paris 433 115 904</li>
          <li>
            Site web :{" "}
            <a
              href="https://www.scaleway.com"
              rel="noopener noreferrer"
              target="_blank"
            >
              scaleway.com
            </a>
          </li>
        </ul>
        <LegalHighlight variant="success">
          <strong>Données stockées exclusivement en Union européenne.</strong>{" "}
          Scaleway est un opérateur de droit français, non soumis au Cloud Act
          américain.
        </LegalHighlight>
      </LegalSection>

      <LegalSection id="propriete" num="4" title="Propriété intellectuelle">
        <p>
          L'ensemble des contenus (textes, illustrations, mascottes, code
          source, modules pédagogiques, scénarios) publiés sur ce site et au
          sein de la plateforme Humanix Académie sont protégés par le droit
          d'auteur et le droit des marques. Toute reproduction, représentation,
          modification ou exploitation, partielle ou totale, sans autorisation
          écrite préalable de Humanix-Cybersecurity, constitue une contrefaçon
          sanctionnée par les articles L335-2 et suivants du Code de la
          propriété intellectuelle.
        </p>
        <p>
          Les modules contribués par la communauté sur la marketplace sont
          publiés sous licence Creative Commons (CC BY ou CC BY-SA selon le
          choix de l'auteur). Les modules officiels Humanix sont publiés sous
          licence propriétaire.
        </p>
      </LegalSection>

      <LegalSection id="responsabilite" num="5" title="Responsabilité">
        <p>
          Humanix-Cybersecurity met tout en œuvre pour fournir des informations
          exactes et à jour. Toutefois, l'éditeur ne peut garantir l'exactitude,
          la complétude ou l'actualité des informations diffusées sur le site.
          La responsabilité de Humanix-Cybersecurity ne saurait être engagée à
          raison d'omissions, d'inexactitudes ou de carences dans la mise à
          jour.
        </p>
        <p>
          Le contenu pédagogique de la plateforme Humanix Académie ne saurait se
          substituer à un conseil personnalisé en cybersécurité. L'éditeur
          recommande à chaque organisation de compléter la sensibilisation par
          un audit ou un accompagnement adapté à son contexte.
        </p>
      </LegalSection>

      <LegalSection id="donnees" num="6" title="Données personnelles">
        <p>
          Le traitement des données personnelles est détaillé dans notre{" "}
          <Link href="/confidentialite">politique de confidentialité</Link>.
          Pour toute demande relative à vos données, contactez{" "}
          <a href="mailto:rgpd@humanix-cybersecurity.fr">
            rgpd@humanix-cybersecurity.fr
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="cookies" num="7" title="Cookies">
        <p>
          L'usage des cookies est encadré par notre{" "}
          <Link href="/cookies">politique de gestion des cookies</Link>. Aucun
          cookie publicitaire ni traceur tiers n'est déposé sur ce site.
        </p>
      </LegalSection>

      <LegalSection id="droit" num="8" title="Droit applicable">
        <p>
          Le présent site est soumis au droit français. Tout litige relatif à
          son utilisation relève de la compétence exclusive du{" "}
          <strong>Tribunal de commerce de Nîmes</strong>, conformément à
          l'article 16 des <a href="/cgv">Conditions Générales de Vente</a>.
        </p>
      </LegalSection>

      <LegalSection id="mediation" num="9" title="Médiation">
        <p>
          Humanix-Cybersecurity exerce son activité exclusivement en relation
          B2B (entre professionnels). À ce titre, le dispositif de médiation de
          la consommation prévu à l'article L612-1 du Code de la consommation ne
          s'applique pas.
        </p>
        <p className="text-xs italic mt-2">
          En cas d'évolution future vers une activité B2C, un médiateur agréé
          sera désigné et ses coordonnées publiées ici.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
