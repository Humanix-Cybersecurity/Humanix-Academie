// SPDX-License-Identifier: AGPL-3.0-or-later
// Catalogue des 12 posters mensuels - 1 thème par mois.
//
// PHILOSOPHIE : un poster = une accroche graphique + un message simple +
// un appel à l'action. Format A3 portrait, imprimable en couleur sur
// imprimante laser standard. Chaque mois colle au calendrier cyber FR :
//  - Octobre = Cyber-Mois (sensibilisation européenne)
//  - Janvier = bonnes résolutions
//  - Vacances = vigilance hôtels/wifi public
//  - etc.

export type PosterTheme = {
  month: number; // 1-12
  monthLabel: string;
  emoji: string;
  title: string;
  subtitle: string;
  // Couleurs (gradients de fond compatibles @react-pdf)
  bgColor: string;
  accentColor: string;
  // Le message principal (1-2 lignes)
  hook: string;
  // 3 actions concrètes à afficher
  actions: string[];
  // Citation / fact rappelé en bas
  factOrQuote: string;
};

export const POSTER_THEMES: Record<number, PosterTheme> = {
  1: {
    month: 1,
    monthLabel: "Janvier",
    emoji: "🎯",
    title: "Nouvelle année,\nnouveaux réflexes cyber.",
    subtitle: "Les 3 résolutions qui changent tout.",
    bgColor: "#0B3D91",
    accentColor: "#00A3A1",
    hook: "Sur 100 PME, 60 subiront un incident cyber cette année. Les autres 40 ont de meilleurs réflexes - pas plus de budget.",
    actions: [
      "Activer la double authentification (MFA) sur tous mes comptes pro",
      "Vérifier mes sauvegardes : où ? quand ? testées ?",
      "Signaler les mails suspects à l'IT plutôt que de les ignorer",
    ],
    factOrQuote:
      "« Le maillon faible n'est pas l'humain - c'est l'humain mal informé. »",
  },
  2: {
    month: 2,
    monthLabel: "Février",
    emoji: "🎣",
    title: "Saint-Valentin :\nles arnaques sentimentales explosent.",
    subtitle: "Phishing, faux LinkedIn, faux profils.",
    bgColor: "#C0392B",
    accentColor: "#F59E0B",
    hook: "78% des arnaques sentimentales en ligne ont lieu entre janvier et avril. Les escrocs visent solitude et urgence.",
    actions: [
      "Une demande d'argent en ligne ? STOP. Verification audio/vidéo obligatoire.",
      "Un nouveau contact LinkedIn avec photo trop parfaite ? Verifier sa cohérence (poste, parcours, autres contacts).",
      "Ne JAMAIS partager de selfie ou document d'identité avec une rencontre numérique.",
    ],
    factOrQuote:
      "« Les escrocs sentimentaux gagnent en moyenne 5 800 € par victime française. - ANSSI 2024 »",
  },
  3: {
    month: 3,
    monthLabel: "Mars",
    emoji: "🔑",
    title: "Mois des mots de passe.\nFaisons le ménage.",
    subtitle: "Un gestionnaire, un MFA, et c'est plié.",
    bgColor: "#0B3D91",
    accentColor: "#7C3AED",
    hook: "Le mot de passe parfait n'existe pas - sauf si vous n'avez pas à vous en souvenir.",
    actions: [
      "Installer un gestionnaire de mots de passe pro (Bitwarden, KeePass, 1Password)",
      "Activer le MFA sur les comptes critiques (mail, banque, ERP, paie)",
      "Bannir les mots de passe sur post-it, dans Excel, ou dans le bloc-notes",
    ],
    factOrQuote:
      "« 81% des piratages d'entreprises commencent par un mot de passe faible ou réutilisé. - Verizon DBIR »",
  },
  4: {
    month: 4,
    monthLabel: "Avril",
    emoji: "💾",
    title: "Sauvegardes : la règle 3-2-1.",
    subtitle: "L'assurance vie de votre entreprise.",
    bgColor: "#2E8B57",
    accentColor: "#F59E0B",
    hook: "Une PME sur deux qui subit un ransomware sans sauvegarde fait faillite dans les 6 mois.",
    actions: [
      "3 copies des données critiques minimum",
      "2 supports différents (interne + externe)",
      "1 copie hors-site et déconnectée du réseau",
    ],
    factOrQuote:
      "« Une sauvegarde non testée n'est pas une sauvegarde. C'est de l'optimisme. »",
  },
  5: {
    month: 5,
    monthLabel: "Mai",
    emoji: "💻",
    title: "Télétravail : la cyber suit\nle clavier - pas le bureau.",
    subtitle: "Bonnes pratiques quand on bosse de chez soi.",
    bgColor: "#0B3D91",
    accentColor: "#00A3A1",
    hook: "À la maison, le wifi du voisin n'est pas votre ami. Ni la borne du café.",
    actions: [
      "VPN d'entreprise activé pour tout accès aux données sensibles",
      "Verrouiller son écran dès qu'on quitte la pièce (Win+L / Cmd+Ctrl+Q)",
      "Pas de visio confidentielle sur wifi public",
    ],
    factOrQuote:
      "« 67% des fuites de données en télétravail viennent du wifi public. - IBM Security 2024 »",
  },
  6: {
    month: 6,
    monthLabel: "Juin",
    emoji: "📱",
    title: "Le smartphone pro\nest un coffre-fort.",
    subtitle: "S'il fuit, c'est toute l'entreprise qui fuit.",
    bgColor: "#7C3AED",
    accentColor: "#F59E0B",
    hook: "Votre smartphone pro contient mails, contrats, planning, et accès à 30 SaaS. Un cambrioleur en rêverait.",
    actions: [
      "Code PIN/biométrie obligatoire, jamais désactivé",
      'Pas d\'apps perso douteuses (jeux gratuits, VPN "pas chers")',
      "Activer la localisation à distance et l'effacement à distance",
    ],
    factOrQuote:
      "« Un smartphone professionnel volé sans MDM = 0 €/jour de chiffre d'affaires pour la PME concernée. »",
  },
  7: {
    month: 7,
    monthLabel: "Juillet",
    emoji: "✈️",
    title: "Vacances : la cyber\npart-elle avec vous ?",
    subtitle: "Les 3 réflexes avant de fermer la porte du bureau.",
    bgColor: "#00A3A1",
    accentColor: "#F59E0B",
    hook: "Les pirates ne prennent pas de vacances. Et l'absence est leur meilleure fenêtre.",
    actions: [
      "Mettre à jour les équipements et systèmes avant de partir",
      "Activer les notifications de connexion suspectes sur les comptes critiques",
      "Désigner un référent cyber joignable en cas d'incident pendant vos congés",
    ],
    factOrQuote:
      "« Les attaques ransomware augmentent de 40% en juillet-août. Les attaquants ciblent les périodes creuses. - Cybermalveillance 2024 »",
  },
  8: {
    month: 8,
    monthLabel: "Août",
    emoji: "🏖️",
    title: "Bornes USB publiques :\nle piège invisible.",
    subtitle: "Aéroport, gare, hôtel : ne branchez jamais.",
    bgColor: "#C0392B",
    accentColor: "#F59E0B",
    hook: 'Une borne USB publique peut injecter un malware en 3 secondes. Le "juice jacking" existe vraiment.',
    actions: [
      "Toujours utiliser votre propre chargeur sur prise secteur",
      'Si vous DEVEZ utiliser un USB public, prenez un câble "data blocker" (5€ sur Amazon)',
      'Ne jamais accepter une demande de "faire confiance à cet ordinateur" depuis votre téléphone pro',
    ],
    factOrQuote:
      "« 1 borne USB publique sur 100 a été modifiée pour voler des données. - étude Kaspersky 2023 »",
  },
  9: {
    month: 9,
    monthLabel: "Septembre",
    emoji: "🎒",
    title: "Rentrée IT :\non range, on durcit.",
    subtitle: "Le grand ménage cyber de septembre.",
    bgColor: "#0B3D91",
    accentColor: "#2E8B57",
    hook: "L'été a laissé des traces : comptes oubliés, droits trop larges, postes pas mis à jour. Septembre, on nettoie.",
    actions: [
      "Audit des comptes inactifs > 60 jours : suspendre ou supprimer",
      "Vérifier les droits d'accès (principe de moindre privilège)",
      "Forcer les mises à jour OS / antivirus sur tous les postes",
    ],
    factOrQuote:
      "« 38% des incidents cyber PME viennent d'un compte d'ex-collaborateur encore actif. »",
  },
  10: {
    month: 10,
    monthLabel: "Octobre",
    emoji: "🛡️",
    title: "Cyber-Mois Européen.\nC'est maintenant ou jamais.",
    subtitle: "30 jours pour ancrer les bons réflexes.",
    bgColor: "#0B3D91",
    accentColor: "#F59E0B",
    hook: "Octobre est LE mois pour mobiliser. Profitez-en : un challenge inter-équipes, un quiz hebdo, des affiches dans la salle de pause.",
    actions: [
      'Lancer un challenge "signaleur du mois" sur les phishings simulés',
      "Afficher un poster cyber chaque semaine dans la salle de pause",
      "Faire un quiz collectif de 10 min en réunion d'équipe",
    ],
    factOrQuote:
      "« Le Cyber-Mois Européen, lancé en 2012, est aujourd'hui suivi dans 30 pays. C'est le moment où la cyber se vit collectivement. »",
  },
  11: {
    month: 11,
    monthLabel: "Novembre",
    emoji: "📋",
    title: "NIS2 : votre PME\nest peut-être concernée.",
    subtitle: "Vérifier en 5 minutes.",
    bgColor: "#7C3AED",
    accentColor: "#00A3A1",
    hook: "Si votre PME est dans la santé, l'industrie, l'eau, l'énergie, le transport, ou la sous-traitance d'un acteur essentiel : vous êtes potentiellement concernée.",
    actions: [
      "Faire l'audit flash NIS2 sur humanix-cybersecurity.fr/audit-flash",
      "Si concerné : nommer un référent cyber et documenter les mesures",
      "En cas d'incident significatif : notification CSIRT-FR sous 24h obligatoire",
    ],
    factOrQuote:
      "« Sanctions NIS2 : jusqu'à 10 M€ ou 2% du CA mondial. Mieux vaut prévenir. »",
  },
  12: {
    month: 12,
    monthLabel: "Décembre",
    emoji: "🎁",
    title: "Bilan cyber de l'année.\nEt cap sur 2027.",
    subtitle: "Ce qu'on a appris, ce qu'on améliore.",
    bgColor: "#2E8B57",
    accentColor: "#0B3D91",
    hook: "Décembre est le meilleur mois pour un bilan honnête : qu'est-ce qui a marché en cyber cette année ? Qu'est-ce qu'on prend pour l'an prochain ?",
    actions: [
      "Bilan : 3 incidents évités grâce à un signalement utilisateur",
      "Bilan : 95% des modules de sensibilisation complétés par l'équipe",
      "Cap 2027 : un objectif simple, mesurable, ambitieux pour la cyber",
    ],
    factOrQuote:
      "« La sécurité, c'est un parcours, pas une destination. Chaque mois compte. »",
  },
};

export function getPosterTheme(month: number): PosterTheme {
  return POSTER_THEMES[month] ?? POSTER_THEMES[1];
}
