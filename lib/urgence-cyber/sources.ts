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
      "Agence nationale de la sécurité des systèmes d'information. Référence absolue : guides, recommandations, alertes CERT-FR.",
    category: "etat",
  },
  {
    name: "CERT-FR",
    url: "https://www.cert.ssi.gouv.fr",
    description:
      "Centre gouvernemental de veille, d'alerte et de réponse aux attaques informatiques. Bulletins quotidiens, fiches CVE majeures.",
    category: "etat",
  },
  {
    name: "CNIL",
    url: "https://www.cnil.fr",
    description:
      "Commission nationale de l'informatique et des libertés. Doctrine RGPD, jurisprudence sanctions, guide sécurité.",
    category: "etat",
  },
  {
    name: "CyberMalveillance.gouv.fr",
    url: "https://www.cybermalveillance.gouv.fr",
    description:
      "Plateforme officielle d'assistance victimes + diagnostic gratuit. Mise en relation avec prestataires labellisés.",
    category: "etat",
  },
  {
    name: "data.gouv.fr - cybersécurité",
    url: "https://www.data.gouv.fr/fr/topics/cybersecurite",
    description:
      "Données ouvertes publiques sur les incidents et les pratiques cyber.",
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
      "Texte officiel de la directive NIS2. Les États avaient jusqu'au 17 octobre 2024 pour la transposer ; en France, la loi de transposition est encore en cours d'adoption.",
    category: "europe",
  },
  {
    name: "EuropolCybercrime",
    url: "https://www.europol.europa.eu/about-europol/european-cybercrime-centre-ec3",
    description:
      "European Cybercrime Centre. Co-fondateur de NoMoreRansom. Opérations internationales documentées.",
    category: "europe",
  },

  // ============== MAGAZINES / MEDIAS ==============
  {
    name: "Global Security Mag",
    url: "https://www.globalsecuritymag.fr",
    description:
      "Magazine français de référence cyber. Interviews CISO, analyses produit, baromètres trimestriels.",
    category: "magazine",
  },
  {
    name: "Le MagIT - Sécurité",
    url: "https://www.lemagit.fr/securite",
    description:
      "Volet sécurité du magazine IT français. Analyses de fond, décryptages techniques.",
    category: "magazine",
  },
  {
    name: "Numerama",
    url: "https://www.numerama.com/cyberguerre",
    description:
      "Section CyberGuerre. Vulgarisation de qualité + investigations sur les acteurs étatiques.",
    category: "magazine",
  },
  {
    name: "Krebs on Security (EN)",
    url: "https://krebsonsecurity.com",
    description:
      "Investigation cyber par Brian Krebs. Souvent cité par l'ANSSI. Contenu en anglais mais incontournable.",
    category: "magazine",
  },
  {
    name: "The Hacker News (EN)",
    url: "https://thehackernews.com",
    description:
      "Veille très rapide sur les CVE et incidents internationaux. À lire avec les articles ANSSI/CERT-FR pour la perspective FR.",
    category: "magazine",
  },

  // ============== ASSOCIATIF / COMMUNAUTAIRE ==============
  {
    name: "Clusif",
    url: "https://www.clusif.fr",
    description:
      "Club de la Sécurité de l'Information Français. Études annuelles, groupes de travail, conférences mensuelles.",
    category: "associatif",
  },
  {
    name: "OSSIR",
    url: "https://www.ossir.org",
    description:
      "Observatoire de la sécurité des systèmes d'information et des réseaux. Conférences techniques mensuelles, publiques et gratuites.",
    category: "associatif",
  },
  {
    name: "AFCDP",
    url: "https://www.afcdp.net",
    description:
      "Association française des correspondants à la protection des données. Référence DPO en France.",
    category: "associatif",
  },
  {
    name: "Open Web Application Security Project (OWASP)",
    url: "https://owasp.org",
    description:
      "Référence mondiale en sécurité applicative. OWASP Top 10, guides, outils gratuits. Chapitres locaux en France.",
    category: "associatif",
  },
  {
    name: "Filigran (OpenCTI)",
    url: "https://filigran.io",
    description:
      "Éditeur français de la plateforme OpenCTI (threat intelligence open source). Communauté, documentation, blog technique.",
    category: "associatif",
  },
  {
    name: "intuitem (CISO Assistant)",
    url: "https://intuitem.com",
    description:
      "Éditeur français de la plateforme GRC CISO Assistant (open source AGPL). Documentation, frameworks, blog.",
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
