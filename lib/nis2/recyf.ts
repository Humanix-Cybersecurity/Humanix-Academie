// SPDX-License-Identifier: AGPL-3.0-or-later
//
// SOCLE ReCyF - Referentiel Cyber France (ANSSI).
//
// Les 20 OBJECTIFS DE SECURITE du referentiel publie par l'ANSSI pour
// atteindre les objectifs de securite de NIS2 en France.
//
// Source : "RECYF : REFERENTIEL CYBER FRANCE (ReCyF)", version 2.5 du
// 17/03/2026, ANSSI. https://messervices.cyber.gouv.fr/nis2
//
// POSTURE (important) : ReCyF est un DOCUMENT DE TRAVAIL. Il n'existe pas
// de version definitive tant que la transposition n'est pas adoptee. On ne
// dit JAMAIS "conforme ReCyF". Notre espace ACCOMPAGNE vers les objectifs,
// par la formation, et oriente honnetement vers le prestataire IT pour les
// volets techniques.
//
// Structure officielle :
//   - 20 objectifs de securite, regroupes en 4 thematiques (gouvernance,
//     protection, defense, resilience).
//   - Chaque objectif est "obligatoire" (le Quoi) ; les "moyens acceptables
//     de conformite" (le Comment) sont recommandes par l'ANSSI.
//   - PROPORTIONNALITE : objectifs 1 a 15 applicables aux entites
//     importantes (EI) ET essentielles (EE) ; objectifs 16 a 20 applicables
//     aux entites ESSENTIELLES uniquement.

export type RecyfGroupe = "gouvernance" | "protection" | "defense" | "resilience";

/** EI_EE = importantes ET essentielles ; EE = essentielles uniquement */
export type RecyfScope = "EI_EE" | "EE";

export type RecyfObjectif = {
  /** Numero officiel 1..20 */
  num: number;
  /** Identifiant stable (cle des reponses) */
  id: string;
  /** Intitule officiel exact */
  titre: string;
  groupe: RecyfGroupe;
  scope: RecyfScope;
  /** Rappel de l'objectif, reformule simplement */
  rappel: string;
  // ---- Diagnostic (1 question par objectif, reponse oui / en_partie / non)
  question: string;
  poids: 1 | 2 | 3;
  // ---- Plan d'accompagnement narratif
  attend: string;
  pourquoi: string;
  levierRapide: string;
  chantier: string;
  /** Comment la formation Humanix aide (null si purement technique) */
  humanixAngle: string | null;
  /** Volet a confier au prestataire IT (null si purement humain) */
  partnerAngle: string | null;
  /** Saisons Humanix qui sensibilisent sur cet objectif */
  saisons: string[];
};

export const RECYF_META = {
  nom: "Référentiel Cyber France",
  sigle: "ReCyF",
  version: "2.5",
  date: "17/03/2026",
  statut: "Document de travail",
  editeur: "ANSSI",
  url: "https://messervices.cyber.gouv.fr/nis2",
} as const;

export const RECYF_GROUPES: Record<
  RecyfGroupe,
  { label: string; emoji: string; ordre: number }
> = {
  gouvernance: { label: "Gouvernance", emoji: "🏛", ordre: 1 },
  protection: { label: "Protection", emoji: "🛡", ordre: 2 },
  defense: { label: "Défense", emoji: "🎯", ordre: 3 },
  resilience: { label: "Résilience", emoji: "🔄", ordre: 4 },
};

export const RECYF_OBJECTIFS: RecyfObjectif[] = [
  {
    num: 1,
    id: "obj-1",
    titre: "Recensement des systèmes d'information",
    groupe: "gouvernance",
    scope: "EI_EE",
    rappel:
      "Tenir à jour la liste de vos activités, services et des systèmes d'information qui les font fonctionner.",
    question:
      "Avez-vous une liste à jour de vos activités et des systèmes d'information (logiciels, serveurs, services cloud) qui les supportent ?",
    poids: 2,
    attend:
      "Connaître et tenir à jour la liste de vos activités et des systèmes d'information qui les font fonctionner.",
    pourquoi:
      "On ne protège bien que ce qu'on a recensé. Cette liste est le socle de tout le reste : sans elle, impossible de savoir quoi prioriser.",
    levierRapide:
      "Listez en une page vos activités clés et, pour chacune, les outils et services numériques indispensables.",
    chantier:
      "Maintenir cet inventaire à jour et le réviser chaque année ou à chaque changement majeur.",
    humanixAngle:
      "Nos modules de gouvernance aident le dirigeant et les métiers à identifier ce qui est vraiment critique.",
    partnerAngle:
      "L'inventaire technique fin (cartographie détaillée) se complète avec votre prestataire IT.",
    saisons: ["nis2-pme"],
  },
  {
    num: 2,
    id: "obj-2",
    titre: "Mise en oeuvre d'un cadre de gouvernance de la sécurité numérique",
    groupe: "gouvernance",
    scope: "EI_EE",
    rappel:
      "Mettre en place une gouvernance de la sécurité numérique, sous la responsabilité du dirigeant exécutif.",
    question:
      "La sécurité numérique est-elle portée par la direction, avec des rôles clairs et une politique de sécurité écrite ?",
    poids: 3,
    attend:
      "Organiser la sécurité (rôles, responsabilités, politique écrite) sous la responsabilité directe du dirigeant exécutif.",
    pourquoi:
      "ReCyF est explicite : le dirigeant exécutif est responsable de la sécurité numérique. Ce n'est plus un sujet qu'on délègue entièrement à l'informatique.",
    levierRapide:
      "Désignez un référent sécurité et posez par écrit les 5 règles de base que tout le monde doit suivre.",
    chantier:
      "Formaliser une politique de sécurité (PSSI), la faire approuver par la direction et la revoir chaque année.",
    humanixAngle:
      "Nos parcours dirigeants expliquent ce rôle de gouvernance en langage de décideur, pour l'endosser sereinement.",
    partnerAngle:
      "La rédaction d'une politique complète peut être appuyée par un prestataire ou un RSSI à temps partagé.",
    saisons: ["cyber-dirigeants", "nis2-pme"],
  },
  {
    num: 3,
    id: "obj-3",
    titre: "Maîtrise de l'écosystème",
    groupe: "gouvernance",
    scope: "EI_EE",
    rappel:
      "Connaître vos prestataires et fournisseurs informatiques et s'assurer, par contrat, de leur sérieux en sécurité.",
    question:
      "Avez-vous la liste de vos prestataires et fournisseurs IT critiques, avec des exigences de sécurité dans les contrats ?",
    poids: 2,
    attend:
      "Cartographier vos prestataires et fournisseurs informatiques et exiger d'eux un bon niveau de sécurité, par contrat.",
    pourquoi:
      "Beaucoup d'attaques passent par un prestataire. Sa faille devient la vôtre, et vous restez responsable de vos données.",
    levierRapide:
      "Listez vos prestataires IT critiques (hébergeur, infogérant, logiciels métier) et un point de contact pour chacun.",
    chantier:
      "Ajouter des clauses de sécurité et de notification d'incident à vos contrats, et vérifier périodiquement la conformité des prestations.",
    humanixAngle:
      "La saison chaîne d'approvisionnement aide vos équipes achats et métier à poser les bonnes questions à un fournisseur.",
    partnerAngle:
      "L'évaluation technique d'un prestataire (audit, plan d'assurance sécurité) peut être appuyée par un expert.",
    saisons: ["supply-chain"],
  },
  {
    num: 4,
    id: "obj-4",
    titre: "Intégration de la sécurité numérique dans la gestion des ressources humaines",
    groupe: "gouvernance",
    scope: "EI_EE",
    rappel:
      "Sensibiliser tous les utilisateurs, former les dirigeants, et intégrer la sécurité de l'arrivée au départ des collaborateurs.",
    question:
      "Avez-vous un programme de sensibilisation pour tous, une formation pour les dirigeants, et une charte d'usage opposable ?",
    poids: 3,
    attend:
      "Sensibiliser l'ensemble des utilisateurs tout au long de leur présence, former spécifiquement les dirigeants et les fonctions à responsabilité, et encadrer arrivées et départs.",
    pourquoi:
      "C'est l'objectif où l'humain est central, et celui que ReCyF détaille le plus côté sensibilisation. C'est aussi le levier le plus rapide et le moins cher.",
    levierRapide:
      "Lancez une première campagne de sensibilisation à toute l'équipe cette semaine, dirigeants compris.",
    chantier:
      "Mettre en place un programme continu (sensibilisation, phishing simulé, formation dirigeants), une charte d'usage opposable et un processus arrivées/départs.",
    humanixAngle:
      "C'est le cœur de notre métier : catalogue complet, campagnes de phishing, parcours dirigeants, charte, et un registre des actions de sensibilisation qui se remplit tout seul comme preuve.",
    partnerAngle: null,
    saisons: [
      "phishing",
      "mots-de-passe",
      "email-pro",
      "teletravail",
      "cyber-dirigeants",
      "fraude-president",
      "deepfakes",
      "ia-generative",
      "cyber-rh",
    ],
  },
  {
    num: 5,
    id: "obj-5",
    titre: "Maîtrise des systèmes d'information",
    groupe: "gouvernance",
    scope: "EI_EE",
    rappel:
      "Disposer d'une cartographie suffisante et appliquer les correctifs de sécurité pour limiter l'exposition aux vulnérabilités.",
    question:
      "Vos logiciels et systèmes sont-ils tenus à jour (correctifs de sécurité) de façon organisée ?",
    poids: 3,
    attend:
      "Cartographier vos systèmes et appliquer les correctifs de sécurité pour réduire l'exposition aux failles connues.",
    pourquoi:
      "La majorité des intrusions exploitent une faille connue mais non corrigée. Les mises à jour sont la protection la moins chère qui existe.",
    levierRapide:
      "Activez les mises à jour automatiques partout où c'est possible, à commencer par les postes de travail et la messagerie.",
    chantier:
      "Définir un processus de gestion des correctifs avec des délais (les failles critiques en priorité) et une veille sur les vulnérabilités.",
    humanixAngle:
      "Côté sensibilisation, nos modules ancrent le réflexe « je ne reporte pas les mises à jour ».",
    partnerAngle:
      "Le maintien en condition de sécurité (gestion des correctifs, veille CERT-FR) est piloté avec votre prestataire IT.",
    saisons: ["remediation-flash"],
  },
  {
    num: 6,
    id: "obj-6",
    titre: "Maîtrise des accès physiques aux locaux",
    groupe: "protection",
    scope: "EI_EE",
    rappel:
      "Contrôler les accès physiques aux locaux, en particulier aux salles serveurs et locaux techniques.",
    question:
      "Contrôlez-vous les accès physiques à vos locaux sensibles (salles serveurs, locaux techniques) et les visiteurs ?",
    poids: 1,
    attend:
      "Limiter l'accès physique aux locaux, et surtout aux salles serveurs et locaux techniques, aux seules personnes autorisées.",
    pourquoi:
      "Un accès physique non maîtrisé contourne toutes les protections informatiques. Les visiteurs et prestataires doivent être encadrés.",
    levierRapide:
      "Mettez en place un registre des visiteurs et fermez l'accès aux locaux techniques.",
    chantier:
      "Formaliser la gestion des accès physiques (badges, accompagnement des externes) et limiter les droits au strict nécessaire.",
    humanixAngle:
      "Nos modules sur les accès physiques sensibilisent les équipes (talonnage, badges, visiteurs).",
    partnerAngle:
      "Les dispositifs techniques (contrôle d'accès, vidéosurveillance) se mettent en place avec votre prestataire.",
    saisons: ["acces-physiques"],
  },
  {
    num: 7,
    id: "obj-7",
    titre: "Sécurisation de l'architecture des systèmes d'information",
    groupe: "protection",
    scope: "EI_EE",
    rappel:
      "Cloisonner les systèmes d'information et filtrer les communications, surtout avec les systèmes tiers.",
    question:
      "Vos systèmes sont-ils cloisonnés et les flux filtrés (pare-feu), notamment avec l'extérieur ?",
    poids: 2,
    attend:
      "Cloisonner vos systèmes en zones cohérentes et filtrer les communications, en particulier vers et depuis les systèmes tiers.",
    pourquoi:
      "Sans cloisonnement, une intrusion sur un poste peut se propager à tout le système. Le filtrage limite la casse.",
    levierRapide:
      "Vérifiez avec votre prestataire que vos flux entrants et sortants sont filtrés par un pare-feu et que le réseau invités est séparé.",
    chantier:
      "Définir une architecture cloisonnée (zones de sécurité) et une politique de filtrage revue annuellement.",
    humanixAngle: null,
    partnerAngle:
      "Objectif technique : l'architecture, le cloisonnement et le filtrage relèvent de votre prestataire IT ou de votre RSSI.",
    saisons: [],
  },
  {
    num: 8,
    id: "obj-8",
    titre: "Sécurisation des accès distants aux systèmes d'information",
    groupe: "protection",
    scope: "EI_EE",
    rappel:
      "Sécuriser les accès distants : canal chiffré et authentification robuste.",
    question:
      "Les accès distants à vos systèmes (télétravail, prestataires) sont-ils sécurisés (VPN chiffré, authentification forte) ?",
    poids: 2,
    attend:
      "Protéger les accès distants par un canal chiffré et une authentification robuste.",
    pourquoi:
      "Le télétravail et les accès prestataires sont des portes d'entrée fréquentes s'ils ne sont pas sécurisés.",
    levierRapide:
      "Assurez-vous que tout accès distant passe par un VPN chiffré et une double authentification.",
    chantier:
      "Encadrer techniquement les accès distants (VPN conforme, double authentification, postes maîtrisés).",
    humanixAngle:
      "La saison télétravail sensibilise vos équipes aux bons réflexes de connexion à distance.",
    partnerAngle:
      "La mise en place technique du VPN et des protections d'accès distant se cadre avec votre prestataire.",
    saisons: ["teletravail"],
  },
  {
    num: 9,
    id: "obj-9",
    titre: "Protection des systèmes d'information contre les codes malveillants",
    groupe: "protection",
    scope: "EI_EE",
    rappel:
      "Protéger les systèmes contre les codes malveillants (antivirus / EDR, analyse des contenus externes).",
    question:
      "Vos postes et serveurs sont-ils protégés contre les virus (antivirus ou EDR) et les pièces jointes / supports analysés ?",
    poids: 2,
    attend:
      "Protéger vos ressources contre les codes malveillants et analyser les contenus venant de l'extérieur (mails, clés USB).",
    pourquoi:
      "Le rançongiciel et les virus arrivent surtout par la messagerie et les supports amovibles. La protection doit être active et à jour.",
    levierRapide:
      "Vérifiez que tous les postes ont un antivirus ou EDR actif et à jour, et limitez l'usage des clés USB.",
    chantier:
      "Déployer une protection homogène (antivirus / EDR), une analyse des mails et un contrôle des supports amovibles.",
    humanixAngle:
      "Nos modules phishing et messagerie ancrent le réflexe « je n'ouvre pas n'importe quelle pièce jointe ».",
    partnerAngle:
      "Le déploiement et le maintien de l'antivirus / EDR sont pilotés avec votre prestataire IT.",
    saisons: ["phishing", "email-pro"],
  },
  {
    num: 10,
    id: "obj-10",
    titre: "Gestion des identités et des accès des utilisateurs aux systèmes d'information",
    groupe: "protection",
    scope: "EI_EE",
    rappel:
      "Comptes individuels, authentification solide, droits au juste besoin, revus régulièrement.",
    question:
      "Chaque personne a-t-elle un compte individuel, avec une authentification solide et des droits limités au nécessaire ?",
    poids: 3,
    attend:
      "Donner à chacun un compte individuel, une authentification robuste, et des droits limités au strict besoin, revus régulièrement.",
    pourquoi:
      "Les comptes partagés, les mots de passe faibles et les droits trop larges sont des causes majeures de compromission.",
    levierRapide:
      "Activez la double authentification sur les comptes sensibles et supprimez les comptes inutilisés.",
    chantier:
      "Mettre en place comptes individuels, double authentification, principe du moindre privilège et revue annuelle des accès.",
    humanixAngle:
      "Nos modules mots de passe et authentification font adopter la double authentification et les bons réflexes sans résistance.",
    partnerAngle:
      "La gestion technique des identités (annuaire, double authentification, provisioning) se met en place avec votre prestataire.",
    saisons: ["mots-de-passe"],
  },
  {
    num: 11,
    id: "obj-11",
    titre: "Maîtrise de l'administration des systèmes d'information",
    groupe: "protection",
    scope: "EI_EE",
    rappel:
      "Réserver l'administration à des comptes dédiés, distincts des comptes courants, aux seules personnes autorisées.",
    question:
      "Vos administrateurs utilisent-ils des comptes d'administration dédiés, séparés de leur compte de tous les jours ?",
    poids: 2,
    attend:
      "Réserver l'administration à des comptes dédiés, distincts des comptes courants, utilisés par les seules personnes autorisées.",
    pourquoi:
      "Si un compte d'administration est compromis (par un phishing par exemple), c'est tout le système qui tombe. La séparation limite ce risque.",
    levierRapide:
      "Vérifiez avec votre informatique que les administrateurs ont un compte d'administration séparé de leur compte courant.",
    chantier:
      "Formaliser la gestion des comptes d'administration (dédiés, tracés, attribués au juste besoin).",
    humanixAngle: null,
    partnerAngle:
      "Objectif technique : la gestion des comptes et des annuaires d'administration relève de votre prestataire IT ou de votre RSSI.",
    saisons: [],
  },
  {
    num: 12,
    id: "obj-12",
    titre: "Identification et réaction aux incidents de sécurité",
    groupe: "defense",
    scope: "EI_EE",
    rappel:
      "Se préparer et réagir aux incidents (organisation, processus, outils de détection).",
    question:
      "Savez-vous détecter un incident et avez-vous une procédure claire (qui fait quoi) pour y réagir ?",
    poids: 3,
    attend:
      "Disposer d'une organisation et de processus pour détecter, qualifier et réagir aux incidents de sécurité.",
    pourquoi:
      "Le jour d'une attaque, on n'improvise pas. Une procédure préparée à froid fait gagner un temps décisif.",
    levierRapide:
      "Affichez une fiche réflexe : qui prévenir, le contact du prestataire, et la règle « on isole mais on n'éteint pas ».",
    chantier:
      "Écrire une procédure de gestion d'incident et mettre en place de quoi détecter (journaux, alertes).",
    humanixAngle:
      "La saison gestion de crise entraîne vos équipes à réagir vite et bien, sans panique.",
    partnerAngle:
      "La détection technique (journaux centralisés, EDR, supervision) se met en place avec votre prestataire.",
    saisons: ["crise-cyber", "remediation-flash"],
  },
  {
    num: 13,
    id: "obj-13",
    titre: "Continuité et reprise d'activité",
    groupe: "resilience",
    scope: "EI_EE",
    rappel:
      "Disposer de sauvegardes opérationnelles testées, et (pour les entités essentielles) de plans de continuité et de reprise.",
    question:
      "Avez-vous des sauvegardes fiables, testées, dont une copie hors ligne ou immuable ?",
    poids: 3,
    attend:
      "Disposer de sauvegardes opérationnelles, testées au moins une fois par an, dont une copie protégée d'un rançongiciel.",
    pourquoi:
      "C'est votre filet de sécurité. Une sauvegarde qui fonctionne, c'est la différence entre quelques heures d'arrêt et la fermeture.",
    levierRapide:
      "Vérifiez aujourd'hui qu'une sauvegarde récente existe ET qu'une copie est déconnectée ou immuable, puis testez une restauration.",
    chantier:
      "Mettre en place la règle 3-2-1, tester les restaurations régulièrement, et (si entité essentielle) des plans de continuité et de reprise.",
    humanixAngle:
      "Nos modules sauvegardes et rançongiciel ancrent le réflexe et la culture de la résilience.",
    partnerAngle:
      "Le dispositif technique de sauvegarde et les plans de continuité / reprise sont pilotés avec votre prestataire IT.",
    saisons: ["sauvegardes", "ransomware"],
  },
  {
    num: 14,
    id: "obj-14",
    titre: "Réaction aux crises d'origine cyber",
    groupe: "resilience",
    scope: "EI_EE",
    rappel:
      "Se préparer à gérer une crise d'origine cyber : organisation, personnes mobilisables, lien avec les autorités.",
    question:
      "Sauriez-vous gérer une crise cyber : qui mobiliser, comment communiquer, qui prévenir ?",
    poids: 2,
    attend:
      "Se préparer à gérer une crise cyber : organisation de crise, liste des personnes mobilisables, lien avec les autorités.",
    pourquoi:
      "Une crise cyber, ce n'est pas qu'un sujet technique : c'est de la décision, de la communication et du sang-froid sous pression.",
    levierRapide:
      "Préparez une liste, sur papier, des personnes à mobiliser en cas de crise, avec leurs coordonnées.",
    chantier:
      "Formaliser un dispositif de gestion de crise cyber (rôles, annuaire de crise, stratégie de communication).",
    humanixAngle:
      "La saison gestion de crise prépare la direction et les équipes à réagir avec méthode.",
    partnerAngle:
      "L'articulation technique avec votre prestataire et votre assureur cyber complète le dispositif.",
    saisons: ["crise-cyber"],
  },
  {
    num: 15,
    id: "obj-15",
    titre: "Exercices, tests et entraînements",
    groupe: "resilience",
    scope: "EI_EE",
    rappel:
      "Réaliser régulièrement des exercices et tests pour vérifier sa préparation.",
    question:
      "Avez-vous déjà testé votre préparation par un exercice (au moins un exercice sur table) ?",
    poids: 1,
    attend:
      "Vérifier régulièrement, par des exercices et des tests, la capacité de votre organisation à faire face.",
    pourquoi:
      "Un plan jamais testé reste théorique. Un exercice sur table d'une heure révèle les angles morts sans douleur.",
    levierRapide:
      "Organisez un exercice sur table d'une heure : « et si on était victime d'un rançongiciel lundi matin ? ».",
    chantier:
      "Mettre en place des exercices réguliers (sur table puis plus poussés) et en tirer des plans d'amélioration.",
    humanixAngle:
      "Nos exercices et mises en situation entraînent vos équipes de façon concrète et marquante.",
    partnerAngle:
      "Des exercices techniques plus poussés peuvent être animés avec un prestataire spécialisé.",
    saisons: ["crise-cyber"],
  },
  {
    num: 16,
    id: "obj-16",
    titre: "Mise en oeuvre d'une approche par les risques",
    groupe: "gouvernance",
    scope: "EE",
    rappel:
      "Piloter la sécurité par une analyse de risques, sous la responsabilité du dirigeant exécutif (entités essentielles).",
    question:
      "Menez-vous une analyse de risques formelle, pilotée par la direction, avec acceptation des risques résiduels ?",
    poids: 2,
    attend:
      "Piloter la sécurité par une analyse de risques, sous la responsabilité du dirigeant exécutif, avec acceptation explicite des risques résiduels.",
    pourquoi:
      "Pour les entités essentielles, ReCyF demande d'aller au-delà des bonnes pratiques : prioriser selon une vraie analyse de risques.",
    levierRapide:
      "Listez vos 3 scénarios redoutés (rançongiciel, fuite de données, indisponibilité) et leur impact sur l'activité.",
    chantier:
      "Mettre en place une analyse de risques (type EBIOS RM), la faire vivre et la réexaminer au moins tous les trois ans.",
    humanixAngle:
      "Nos parcours dirigeants donnent les clés pour comprendre et porter cette approche par les risques.",
    partnerAngle:
      "La conduite d'une analyse de risques approfondie peut être appuyée par un prestataire qualifié.",
    saisons: ["nis2-pme"],
  },
  {
    num: 17,
    id: "obj-17",
    titre: "Audit de la sécurité des systèmes d'information",
    groupe: "gouvernance",
    scope: "EE",
    rappel:
      "Faire auditer régulièrement la sécurité de ses systèmes (entités essentielles).",
    question:
      "Faites-vous réaliser des audits de sécurité réguliers et planifiés de vos systèmes ?",
    poids: 2,
    attend:
      "Faire auditer régulièrement la sécurité de vos systèmes, par des audits planifiés incluant au minimum un test d'intrusion.",
    pourquoi:
      "L'audit indépendant vérifie que vos mesures tiennent vraiment, au-delà des déclarations.",
    levierRapide:
      "Planifiez un premier audit sur votre périmètre le plus exposé (par exemple votre site exposé sur Internet).",
    chantier:
      "Mettre en place un programme d'audit pluriannuel, idéalement par un prestataire qualifié (PASSI), et corriger les écarts.",
    humanixAngle: null,
    partnerAngle:
      "Objectif réservé aux entités essentielles : ces audits sont réalisés par un prestataire d'audit qualifié (PASSI).",
    saisons: [],
  },
  {
    num: 18,
    id: "obj-18",
    titre: "Sécurisation de la configuration des ressources des systèmes d'information",
    groupe: "protection",
    scope: "EE",
    rappel:
      "Réduire la surface d'attaque : n'installer que le nécessaire et configurer de façon sécurisée (entités essentielles).",
    question:
      "Vos systèmes sont-ils configurés de façon durcie (seul le nécessaire installé, configurations sécurisées) ?",
    poids: 1,
    attend:
      "Limiter la surface d'attaque : n'installer que les logiciels nécessaires et appliquer des configurations sécurisées.",
    pourquoi:
      "Chaque logiciel inutile et chaque configuration par défaut est une porte potentielle. Moins il y en a, mieux c'est.",
    levierRapide:
      "Faites l'inventaire des logiciels installés et désinstallez ce qui ne sert pas.",
    chantier:
      "Définir des configurations sécurisées de référence et les revoir annuellement (scan de vulnérabilités).",
    humanixAngle: null,
    partnerAngle:
      "Objectif réservé aux entités essentielles, technique : le durcissement des configurations est piloté par votre prestataire IT.",
    saisons: [],
  },
  {
    num: 19,
    id: "obj-19",
    titre: "Administration des systèmes d'information depuis des ressources dédiées",
    groupe: "protection",
    scope: "EE",
    rappel:
      "Administrer les systèmes depuis des postes et réseaux dédiés et cloisonnés (entités essentielles).",
    question:
      "L'administration de vos systèmes se fait-elle depuis des postes et réseaux dédiés et cloisonnés ?",
    poids: 1,
    attend:
      "Réaliser l'administration depuis des postes et des réseaux dédiés, cloisonnés et chiffrés.",
    pourquoi:
      "Si l'administration se fait depuis un poste de bureautique classique, un seul phishing peut donner les clés du système.",
    levierRapide:
      "Identifiez avec votre informatique comment sont administrés vos systèmes critiques et si des postes dédiés existent.",
    chantier:
      "Mettre en place des postes et réseaux d'administration dédiés (peut s'appuyer sur un prestataire qualifié).",
    humanixAngle: null,
    partnerAngle:
      "Objectif réservé aux entités essentielles, technique : l'administration dédiée est mise en oeuvre par votre prestataire IT.",
    saisons: [],
  },
  {
    num: 20,
    id: "obj-20",
    titre: "Supervision de la sécurité des systèmes d'information",
    groupe: "defense",
    scope: "EE",
    rappel:
      "Collecter, conserver et analyser les journaux pour détecter les incidents (entités essentielles).",
    question:
      "Supervisez-vous la sécurité de vos systèmes (collecte et analyse des journaux, détection des incidents) ?",
    poids: 2,
    attend:
      "Superviser la sécurité : collecter, conserver au moins trois mois et analyser les journaux pour détecter les incidents.",
    pourquoi:
      "Sans supervision, une intrusion peut passer inaperçue des mois. La détection précoce limite drastiquement les dégâts.",
    levierRapide:
      "Vérifiez que les journaux de vos systèmes critiques sont bien collectés et conservés.",
    chantier:
      "Mettre en place une supervision de sécurité (journaux centralisés, détection), en interne ou via un prestataire (SOC).",
    humanixAngle: null,
    partnerAngle:
      "Objectif réservé aux entités essentielles, technique : la supervision (SOC) est opérée par des équipes ou un prestataire spécialisé.",
    saisons: [],
  },
];

/** Index par id pour acces direct. */
export const RECYF_BY_ID: Record<string, RecyfObjectif> = Object.fromEntries(
  RECYF_OBJECTIFS.map((o) => [o.id, o]),
);

/** Profil d'entite : importante (EI) ou essentielle (EE). */
export type RecyfProfil = "EI" | "EE";

/**
 * Objectifs applicables a un profil donne (principe de proportionnalite).
 * EI -> objectifs 1 a 15 ; EE -> objectifs 1 a 20.
 */
export function objectifsForProfil(profil: RecyfProfil): RecyfObjectif[] {
  // EE = les 20 objectifs ; EI = uniquement le socle commun (objectifs 1-15).
  return profil === "EE"
    ? RECYF_OBJECTIFS
    : RECYF_OBJECTIFS.filter((o) => o.scope === "EI_EE");
}
