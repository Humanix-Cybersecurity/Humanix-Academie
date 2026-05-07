// SPDX-License-Identifier: AGPL-3.0-or-later
// Sources de veille officielles cybersecurite (FR + UE).
// Cette liste sert de reponse au point 3 de CyberMalveillance.gouv.fr :
// "Pouvez-vous nous donner des references d'organismes pouvant vous
// apporter des connaissances techniques (formation et information) en
// cybersecurite."

export type SourceCategory = "etat" | "magazine" | "associatif" | "europe";

export type Source = {
  name: string;
  url: string;
  description: string;
  category: SourceCategory;
};

export const SOURCES: Source[] = [
  // ============== ETAT FRANCAIS ==============
  {
    name: "ANSSI",
    url: "https://cyber.gouv.fr",
    description:
      "Agence nationale de la securite des systemes d'information. Reference absolue : guides, recommandations, alertes CERT-FR.",
    category: "etat",
  },
  {
    name: "CERT-FR",
    url: "https://www.cert.ssi.gouv.fr",
    description:
      "Centre gouvernemental de veille, d'alerte et de reponse aux attaques informatiques. Bulletins quotidiens, fiches CVE majeures.",
    category: "etat",
  },
  {
    name: "CNIL",
    url: "https://www.cnil.fr",
    description:
      "Commission nationale de l'informatique et des libertes. Doctrine RGPD, jurisprudence sanctions, guide securite.",
    category: "etat",
  },
  {
    name: "CyberMalveillance.gouv.fr",
    url: "https://www.cybermalveillance.gouv.fr",
    description:
      "Plateforme officielle d'assistance victimes + diagnostic gratuit. Mise en relation avec prestataires labellises.",
    category: "etat",
  },
  {
    name: "data.gouv.fr - cybersecurite",
    url: "https://www.data.gouv.fr/fr/topics/cybersecurite",
    description:
      "Donnees ouvertes publiques sur les incidents et les pratiques cyber.",
    category: "etat",
  },

  // ============== UE ==============
  {
    name: "ENISA",
    url: "https://www.enisa.europa.eu",
    description:
      "European Union Agency for Cybersecurity. Threat landscape annuel, frameworks NIS2, audits sectoriels.",
    category: "europe",
  },
  {
    name: "EUR-Lex - NIS2 Directive",
    url: "https://eur-lex.europa.eu/eli/dir/2022/2555",
    description:
      "Texte officiel de la directive NIS2, en vigueur depuis le 17 octobre 2024 (transposition en droit francais en cours).",
    category: "europe",
  },
  {
    name: "EuropolCybercrime",
    url: "https://www.europol.europa.eu/about-europol/european-cybercrime-centre-ec3",
    description:
      "European Cybercrime Centre. Co-fondateur de NoMoreRansom. Operations internationales documentees.",
    category: "europe",
  },

  // ============== MAGAZINES / MEDIAS ==============
  {
    name: "Global Security Mag",
    url: "https://www.globalsecuritymag.fr",
    description:
      "Magazine francais de reference cyber. Interviews CISO, analyses produit, baromètres trimestriels.",
    category: "magazine",
  },
  {
    name: "Le MagIT - Securite",
    url: "https://www.lemagit.fr/securite",
    description:
      "Volet securite du magazine IT francais. Analyses de fond, decryptages techniques.",
    category: "magazine",
  },
  {
    name: "Numerama",
    url: "https://www.numerama.com/cyberguerre",
    description:
      "Section CyberGuerre. Vulgarisation de qualite + investigations sur les acteurs etatiques.",
    category: "magazine",
  },
  {
    name: "Krebs on Security (EN)",
    url: "https://krebsonsecurity.com",
    description:
      "Investigation cyber par Brian Krebs. Souvent cite par l'ANSSI. Contenu en anglais mais incontournable.",
    category: "magazine",
  },
  {
    name: "The Hacker News (EN)",
    url: "https://thehackernews.com",
    description:
      "Veille tres rapide sur les CVE et incidents internationaux. A lire avec les articles ANSSI/CERT-FR pour la perspective FR.",
    category: "magazine",
  },

  // ============== ASSOCIATIF / COMMUNAUTAIRE ==============
  {
    name: "Clusif",
    url: "https://www.clusif.fr",
    description:
      "Club de la Securite de l'Information Francais. Etudes annuelles, groupes de travail, conferences mensuelles.",
    category: "associatif",
  },
  {
    name: "OSSIR",
    url: "https://www.ossir.org",
    description:
      "Observatoire de la securite des systemes d'information et des reseaux. Conferences techniques mensuelles, publiques et gratuites.",
    category: "associatif",
  },
  {
    name: "AFCDP",
    url: "https://www.afcdp.net",
    description:
      "Association francaise des correspondants a la protection des donnees. Reference DPO en France.",
    category: "associatif",
  },
  {
    name: "Open Web Application Security Project (OWASP)",
    url: "https://owasp.org",
    description:
      "Reference mondiale en securite applicative. OWASP Top 10, guides, outils gratuits. Chapitres locaux en France.",
    category: "associatif",
  },
  {
    name: "Filigran (OpenCTI)",
    url: "https://filigran.io",
    description:
      "Editeur francais de la plateforme OpenCTI (threat intelligence open source). Communaute, documentation, blog technique.",
    category: "associatif",
  },
  {
    name: "intuitem (CISO Assistant)",
    url: "https://intuitem.com",
    description:
      "Editeur francais de la plateforme GRC CISO Assistant (open source AGPL). Documentation, frameworks, blog.",
    category: "associatif",
  },
];

// Compteurs pour affichage
export const SOURCES_BY_CATEGORY: Record<SourceCategory, Source[]> = {
  etat: SOURCES.filter((s) => s.category === "etat"),
  europe: SOURCES.filter((s) => s.category === "europe"),
  magazine: SOURCES.filter((s) => s.category === "magazine"),
  associatif: SOURCES.filter((s) => s.category === "associatif"),
};

export const CATEGORY_LABEL: Record<SourceCategory, string> = {
  etat: "État français",
  europe: "Union européenne",
  magazine: "Magazines & médias",
  associatif: "Associatif & communautaire",
};

export const CATEGORY_EMOJI: Record<SourceCategory, string> = {
  etat: "🇫🇷",
  europe: "🇪🇺",
  magazine: "📰",
  associatif: "🤝",
};
