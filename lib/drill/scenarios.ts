// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Scenarios de l'EXERCICE DE CRISE EN DIRECT (drill cyber collectif).
//
// Data-driven : un scenario = une suite de MANCHES. A chaque manche, un fil
// narratif horodate, une decision, des choix ponderes, et le verdict de Hex
// (le moment pedagogique). Le collectif vote en direct.
//
// Ton : humain, calme, jamais culpabilisant. On n'apprend pas par la peur, et
// on ne punit jamais "le clic". Aligne sur les bons reflexes NIS2 / ReCyF
// (notamment objectif 15 : exercices et entrainements), a but pedagogique.

export type DrillChoice = {
  id: string;
  label: string;
  /** Emoji d'illustration (l'app utilise des emojis dans l'UI). */
  emoji: string;
  /** Points gagnes si ce choix est retenu (0 a 100). */
  points: number;
  /** Le meilleur reflexe de la manche (pour la revelation). */
  isBest: boolean;
};

export type DrillRound = {
  num: number;
  /** Horodatage narratif affiche (immersion). */
  time: string;
  /** Le fil de la crise a ce moment. */
  narrative: string;
  /** La question posee au participant. */
  prompt: string;
  choices: DrillChoice[];
  /** Le mot de Hex a la revelation (reflexe a retenir). */
  hexVerdict: string;
};

export type DrillScenario = {
  id: string;
  title: string;
  /** Accroche affichee en salle d'attente. */
  intro: string;
  /** Duree indicative (minutes). */
  durationMin: number;
  rounds: DrillRound[];
};

// Bareme lisible et coherent d'une manche a l'autre :
//   meilleur reflexe = 100 · bon = 70-80 · mediocre = 10-30 · pire = 0
const RANSOMWARE: DrillScenario = {
  id: "rancongiciel",
  title: "Rançongiciel · un matin ordinaire",
  intro:
    "8h30, lundi. Tout est calme. Jusqu'à ce qu'un collègue signale que ses fichiers ont des noms bizarres. Vous allez traverser cette crise ensemble, décision par décision.",
  durationMin: 15,
  rounds: [
    {
      num: 1,
      time: "08:47",
      narrative:
        "Le partage RH vient d'être chiffré. Une rançon de 40 000 € s'affiche sur les écrans. Le standard commence à recevoir des appels.",
      prompt: "Ton premier réflexe ?",
      choices: [
        {
          id: "isoler",
          label:
            "J'isole le poste : je débranche le câble réseau (sans éteindre)",
          emoji: "🔌",
          points: 100,
          isBest: true,
        },
        {
          id: "alerter",
          label: "Je préviens la direction et le prestataire IT",
          emoji: "📞",
          points: 70,
          isBest: false,
        },
        {
          id: "eteindre",
          label: "J'éteins l'ordinateur tout de suite",
          emoji: "⏻",
          points: 20,
          isBest: false,
        },
        {
          id: "payer",
          label: "Je paie la rançon pour aller vite",
          emoji: "💸",
          points: 0,
          isBest: false,
        },
      ],
      hexVerdict:
        "Débrancher, oui ! Mais on n'éteint jamais tout de suite : on garde les preuves pour l'enquête. Et on ne reste pas seul, on alerte.",
    },
    {
      num: 2,
      time: "08:55",
      narrative:
        "Trois autres postes sont touchés. La sauvegarde de cette nuit... personne n'est sûr qu'elle a bien tourné.",
      prompt: "Qui active-t-on maintenant ?",
      choices: [
        {
          id: "cellule",
          label:
            "La cellule de crise (direction + IT + prestataire), selon la procédure",
          emoji: "🧯",
          points: 100,
          isBest: true,
        },
        {
          id: "assurance",
          label: "On appelle l'assurance cyber et le prestataire",
          emoji: "🛟",
          points: 70,
          isBest: false,
        },
        {
          id: "discret",
          label: "On règle ça en interne, discrètement, pour ne pas inquiéter",
          emoji: "🤫",
          points: 20,
          isBest: false,
        },
        {
          id: "post",
          label:
            "On poste un message rassurant sur les réseaux de l'entreprise",
          emoji: "📣",
          points: 0,
          isBest: false,
        },
      ],
      hexVerdict:
        "Une crise, ça se gère en équipe et selon un plan préparé à froid. La discrétion qui isole, c'est le piège classique.",
    },
    {
      num: 3,
      time: "09:20",
      narrative:
        "Le rançongiciel se propage via les comptes d'administration. Vos sauvegardes sont branchées au même réseau.",
      prompt: "La priorité ?",
      choices: [
        {
          id: "couper-verifier",
          label:
            "Couper les accès admin compromis et vérifier qu'une sauvegarde est hors-ligne",
          emoji: "🔒",
          points: 100,
          isBest: true,
        },
        {
          id: "debrancher-tout",
          label: "Débrancher tout le réseau de l'entreprise, radicalement",
          emoji: "🔦",
          points: 50,
          isBest: false,
        },
        {
          id: "restaurer-vite",
          label: "Restaurer tout de suite depuis la première sauvegarde venue",
          emoji: "♻️",
          points: 30,
          isBest: false,
        },
        {
          id: "attendre",
          label: "Attendre de voir jusqu'où ça va",
          emoji: "⏳",
          points: 0,
          isBest: false,
        },
      ],
      hexVerdict:
        "Une sauvegarde branchée en permanence, un rançongiciel la chiffre aussi. La copie hors-ligne ou immuable, c'est le vrai filet.",
    },
    {
      num: 4,
      time: "11:00",
      narrative:
        "L'incident est sérieux : des données RH ont peut-être été exfiltrées. L'horloge réglementaire tourne.",
      prompt: "Côté obligations, on fait quoi ?",
      choices: [
        {
          id: "notifier",
          label:
            "On notifie l'autorité (ANSSI) dans les délais et on prépare le dossier",
          emoji: "🏛",
          points: 100,
          isBest: true,
        },
        {
          id: "dpo",
          label:
            "On prévient le DPO : des données personnelles sont concernées",
          emoji: "⚖️",
          points: 70,
          isBest: false,
        },
        {
          id: "plus-tard",
          label: "On verra après avoir tout remis en route",
          emoji: "🙈",
          points: 20,
          isBest: false,
        },
        {
          id: "silence",
          label: "Surtout, on ne dit rien à personne à l'extérieur",
          emoji: "🔇",
          points: 0,
          isBest: false,
        },
      ],
      hexVerdict:
        "NIS2 : alerte précoce sous 24 h, notification sous 72 h. L'avoir préparé à froid évite d'ajouter une sanction à la crise.",
    },
    {
      num: 5,
      time: "14:00",
      narrative:
        "Un journaliste local a eu vent de l'incident. En interne, les rumeurs enflent et les questions arrivent.",
      prompt: "La communication ?",
      choices: [
        {
          id: "factuel-interne",
          label:
            "Un message factuel et calme, porté par la direction, en interne d'abord",
          emoji: "🗣️",
          points: 100,
          isBest: true,
        },
        {
          id: "referent",
          label: "Un référent communication unique et préparé pour l'externe",
          emoji: "🎤",
          points: 70,
          isBest: false,
        },
        {
          id: "nier",
          label: "Silence radio, et on nie si on nous pose la question",
          emoji: "🙊",
          points: 10,
          isBest: false,
        },
        {
          id: "chacun",
          label: "Chaque salarié répond comme il le sent",
          emoji: "🌀",
          points: 0,
          isBest: false,
        },
      ],
      hexVerdict:
        "En crise, une seule voix, calme et factuelle. Le silence et l'improvisation abîment plus l'image que l'attaque elle-même.",
    },
    {
      num: 6,
      time: "J+3",
      narrative:
        "L'activité repart. La tentation, c'est de tourner la page le plus vite possible.",
      prompt: "Et maintenant ?",
      choices: [
        {
          id: "retex",
          label:
            "Un retour d'expérience à froid : ce qui a marché, ce qu'on corrige, on met à jour le plan",
          emoji: "🧭",
          points: 100,
          isBest: true,
        },
        {
          id: "prochain-exercice",
          label: "On planifie le prochain exercice et une formation ciblée",
          emoji: "🎯",
          points: 80,
          isBest: false,
        },
        {
          id: "sanctionner",
          label: "On sanctionne la personne qui a cliqué",
          emoji: "⚡",
          points: 10,
          isBest: false,
        },
        {
          id: "oublier",
          label: "On oublie et on espère que ça ne revienne pas",
          emoji: "🍃",
          points: 0,
          isBest: false,
        },
      ],
      hexVerdict:
        "La crise la mieux gérée, c'est celle dont on tire les leçons. Et surtout : on ne punit jamais le clic, on apprend ensemble.",
    },
  ],
};

const FRAUDE_PRESIDENT: DrillScenario = {
  id: "fraude-president",
  title: "Fraude au président · l'urgence piégée",
  intro:
    "14h12. Un mail du « PDG » arrive dans la boîte de la comptable : une opération confidentielle, un virement urgent, et surtout : n'en parle à personne. Vous allez démêler le vrai du faux, ensemble.",
  durationMin: 15,
  rounds: [
    {
      num: 1,
      time: "14:12",
      narrative:
        "Mail du « PDG » : « Opération confidentielle, je compte sur toi. Vire 48 000 € aujourd'hui à ce nouveau fournisseur. Ne parle à personne. »",
      prompt: "Ta réaction ?",
      choices: [
        {
          id: "verifier-canal",
          label:
            "Je vérifie par un autre canal : je l'appelle sur son numéro connu",
          emoji: "📞",
          points: 100,
          isBest: true,
        },
        {
          id: "alerter",
          label: "J'en parle tout de suite au service comptable et au RSSI",
          emoji: "🧯",
          points: 70,
          isBest: false,
        },
        {
          id: "repondre",
          label: "Je réponds au mail pour demander confirmation",
          emoji: "↩️",
          points: 20,
          isBest: false,
        },
        {
          id: "virer",
          label: "Je vire : c'est le PDG et c'est urgent",
          emoji: "💸",
          points: 0,
          isBest: false,
        },
      ],
      hexVerdict:
        "Urgence + secret + virement = les 3 signaux de la fraude au président. On vérifie toujours par un canal indépendant.",
    },
    {
      num: 2,
      time: "14:20",
      narrative:
        "Nouveau mail : « Tu es encore là ?? L'affaire capote si on ne paie pas dans l'heure. Je suis en réunion, ne m'appelle pas. »",
      prompt: "La pression monte.",
      choices: [
        {
          id: "procedure",
          label:
            "Je m'en tiens à la procédure : pas de vérif indépendante, pas de virement",
          emoji: "🛡️",
          points: 100,
          isBest: true,
        },
        {
          id: "collegue",
          label: "Je demande son avis à un collègue de confiance",
          emoji: "🤝",
          points: 60,
          isBest: false,
        },
        {
          id: "repondre2",
          label: "Je réponds que je vérifie d'abord",
          emoji: "↩️",
          points: 40,
          isBest: false,
        },
        {
          id: "payer",
          label: "« Ne m'appelle pas » : je ne vérifie pas et je paie",
          emoji: "😰",
          points: 0,
          isBest: false,
        },
      ],
      hexVerdict:
        "« Ne m'appelle pas » est justement là pour t'empêcher de vérifier. La pression au temps est un outil de manipulation, pas une raison.",
    },
    {
      num: 3,
      time: "14:35",
      narrative:
        "Le « fournisseur » envoie un RIB à l'étranger, jamais utilisé par l'entreprise.",
      prompt: "Ce RIB ?",
      choices: [
        {
          id: "double-validation",
          label:
            "Nouveau bénéficiaire = double validation et vérification du fournisseur",
          emoji: "✅",
          points: 100,
          isBest: true,
        },
        {
          id: "verifier-fournisseur",
          label:
            "Je vérifie que le fournisseur existe vraiment (SIREN, contrat)",
          emoji: "🔍",
          points: 80,
          isBest: false,
        },
        {
          id: "rien",
          label: "Un RIB étranger, c'est courant, je ne m'inquiète pas",
          emoji: "🤷",
          points: 10,
          isBest: false,
        },
        {
          id: "enregistrer",
          label: "J'enregistre le RIB et je paie",
          emoji: "💸",
          points: 0,
          isBest: false,
        },
      ],
      hexVerdict:
        "Un nouveau bénéficiaire, surtout à l'étranger, déclenche une double validation. Le circuit de paiement est ta meilleure défense.",
    },
    {
      num: 4,
      time: "15:00",
      narrative:
        "Tu as bien fait : c'était une fraude. Reste à décider quoi en faire.",
      prompt: "Maintenant ?",
      choices: [
        {
          id: "signaler",
          label: "Je signale en interne : si je suis ciblé, d'autres le sont",
          emoji: "📣",
          points: 100,
          isBest: true,
        },
        {
          id: "banque-preuve",
          label: "Je préviens la banque et je conserve le mail comme preuve",
          emoji: "🏦",
          points: 80,
          isBest: false,
        },
        {
          id: "garder",
          label: "Je garde ça pour moi, j'ai géré",
          emoji: "🤐",
          points: 20,
          isBest: false,
        },
        {
          id: "supprimer",
          label: "Je supprime le mail pour tourner la page",
          emoji: "🗑️",
          points: 0,
          isBest: false,
        },
      ],
      hexVerdict:
        "Un signalement protège toute l'équipe. Et on garde les preuves : elles serviront à la banque et à la plainte.",
    },
    {
      num: 5,
      time: "15:30",
      narrative:
        "Imaginons le pire : un virement est déjà parti sur le RIB frauduleux.",
      prompt: "On récupère quoi ?",
      choices: [
        {
          id: "banque-rappel",
          label:
            "Je contacte la banque immédiatement pour tenter le rappel des fonds",
          emoji: "🏦",
          points: 100,
          isBest: true,
        },
        {
          id: "plainte",
          label: "Je préviens la direction et je dépose plainte",
          emoji: "⚖️",
          points: 80,
          isBest: false,
        },
        {
          id: "attendre",
          label: "J'attends de voir si l'argent revient",
          emoji: "⏳",
          points: 10,
          isBest: false,
        },
        {
          id: "perdu",
          label: "Je me dis que c'est perdu",
          emoji: "🍃",
          points: 0,
          isBest: false,
        },
      ],
      hexVerdict:
        "Les premières heures comptent : la banque peut parfois bloquer ou rappeler les fonds. On agit vite et on porte plainte.",
    },
    {
      num: 6,
      time: "J+2",
      narrative: "Pour que ça ne se reproduise pas ?",
      prompt: "On installe quoi ?",
      choices: [
        {
          id: "procedure-virements",
          label:
            "Une procédure claire : double validation des virements, aucune exception à l'urgence",
          emoji: "🧭",
          points: 100,
          isBest: true,
        },
        {
          id: "sensibiliser",
          label:
            "On sensibilise les équipes finance et direction à la fraude au président",
          emoji: "🎓",
          points: 80,
          isBest: false,
        },
        {
          id: "confiance",
          label: "On fait confiance, ça n'arrivera plus",
          emoji: "🙈",
          points: 0,
          isBest: false,
        },
        {
          id: "interdire",
          label: "On interdit les mails, trop risqués",
          emoji: "🚫",
          points: 10,
          isBest: false,
        },
      ],
      hexVerdict:
        "La fraude au président se déjoue par la procédure et le réflexe, pas par la chance. L'exception à l'urgence, c'est la faille.",
    },
  ],
};

const FUITE_DONNEES: DrillScenario = {
  id: "fuite-donnees",
  title: "Fuite de données · le fichier qui s'échappe",
  intro:
    "Un client vous alerte : il reçoit des messages qui utilisent des informations que seul votre fichier client contient. Quelque chose a fuité. Vous allez le gérer pas à pas, RGPD compris.",
  durationMin: 15,
  rounds: [
    {
      num: 1,
      time: "Jour J · 09:30",
      narrative:
        "Un client signale un mail de phishing très personnalisé, avec des infos que seul votre fichier client détient.",
      prompt: "Premier réflexe ?",
      choices: [
        {
          id: "prendre-au-serieux",
          label:
            "Je prends l'alerte au sérieux et je lance une vérification interne",
          emoji: "🔎",
          points: 100,
          isBest: true,
        },
        {
          id: "verifier-autres",
          label: "Je vérifie si d'autres clients signalent la même chose",
          emoji: "📊",
          points: 70,
          isBest: false,
        },
        {
          id: "ignorer",
          label: "J'ignore : un seul cas, c'est du hasard",
          emoji: "🤷",
          points: 10,
          isBest: false,
        },
        {
          id: "nier",
          label: "Je réponds au client que c'est impossible chez nous",
          emoji: "🙅",
          points: 0,
          isBest: false,
        },
      ],
      hexVerdict:
        "Une donnée qui ne circule que chez vous et qui ressort dehors, c'est un signal fort. On prend au sérieux et on enquête.",
    },
    {
      num: 2,
      time: "Jour J · 11:00",
      narrative:
        "L'enquête montre qu'un export du fichier clients a été téléchargé depuis un compte compromis.",
      prompt: "La priorité ?",
      choices: [
        {
          id: "couper-mesurer",
          label:
            "Je coupe l'accès compromis et je mesure quelles données sont concernées",
          emoji: "🔒",
          points: 100,
          isBest: true,
        },
        {
          id: "qualifier",
          label:
            "Je détermine combien de personnes sont touchées et quelles données",
          emoji: "🧮",
          points: 80,
          isBest: false,
        },
        {
          id: "restaurer",
          label: "Je restaure une sauvegarde et je passe à autre chose",
          emoji: "♻️",
          points: 20,
          isBest: false,
        },
        {
          id: "attendre",
          label: "J'attends d'en savoir plus avant d'agir",
          emoji: "⏳",
          points: 0,
          isBest: false,
        },
      ],
      hexVerdict:
        "On contient d'abord (couper l'accès), puis on qualifie : qui, quelles données. C'est ce qui pilotera toute la suite.",
    },
    {
      num: 3,
      time: "Jour J · 14:00",
      narrative:
        "Des données personnelles sont concernées : noms, emails, téléphones.",
      prompt: "Côté RGPD ?",
      choices: [
        {
          id: "dpo",
          label:
            "Je préviens le DPO ou le référent : l'horloge des 72h peut démarrer",
          emoji: "⚖️",
          points: 100,
          isBest: true,
        },
        {
          id: "documenter",
          label: "Je documente la violation : nature, volume, mesures prises",
          emoji: "📝",
          points: 80,
          isBest: false,
        },
        {
          id: "plus-tard",
          label: "On verra le RGPD plus tard",
          emoji: "🙈",
          points: 20,
          isBest: false,
        },
        {
          id: "minimiser",
          label: "Ce ne sont que des emails, rien de grave",
          emoji: "🤏",
          points: 0,
          isBest: false,
        },
      ],
      hexVerdict:
        "Fuite de données personnelles = réflexe DPO. La notification à la CNIL peut être requise sous 72h (RGPD art. 33). On documente tout.",
    },
    {
      num: 4,
      time: "Jour J+1",
      narrative: "La violation est significative. Les obligations se cumulent.",
      prompt: "On notifie qui ?",
      choices: [
        {
          id: "cnil-anssi",
          label:
            "La CNIL sous 72h si risque pour les personnes, et l'ANSSI au titre de NIS2",
          emoji: "🏛",
          points: 100,
          isBest: true,
        },
        {
          id: "dossier-froid",
          label:
            "Je prépare le dossier de notification, je ne rate pas le délai",
          emoji: "🗂️",
          points: 80,
          isBest: false,
        },
        {
          id: "attendre-sur",
          label: "J'attends d'être sûr à 100% avant de notifier",
          emoji: "🐢",
          points: 30,
          isBest: false,
        },
        {
          id: "personne",
          label: "Personne, on gère en interne",
          emoji: "🔇",
          points: 0,
          isBest: false,
        },
      ],
      hexVerdict:
        "RGPD (CNIL) et NIS2 (ANSSI) peuvent se cumuler. Mieux vaut notifier dans les délais avec ce qu'on sait que rater l'échéance.",
    },
    {
      num: 5,
      time: "Jour J+2",
      narrative: "Les personnes touchées risquent désormais du phishing ciblé.",
      prompt: "On les prévient ?",
      choices: [
        {
          id: "informer-clair",
          label:
            "Oui, clairement, avec les précautions à prendre (méfiance, mots de passe)",
          emoji: "📢",
          points: 100,
          isBest: true,
        },
        {
          id: "factuel-contact",
          label: "On informe de façon factuelle et on donne un contact dédié",
          emoji: "☎️",
          points: 80,
          isBest: false,
        },
        {
          id: "attendre-su",
          label: "On attend que ça se sache tout seul",
          emoji: "🌀",
          points: 10,
          isBest: false,
        },
        {
          id: "cacher",
          label: "Non, ça va les inquiéter pour rien",
          emoji: "🙊",
          points: 0,
          isBest: false,
        },
      ],
      hexVerdict:
        "Informer les personnes est une obligation quand le risque est élevé, et c'est surtout ce qui les protège. On reste factuel et utile.",
    },
    {
      num: 6,
      time: "Jour J+5",
      narrative: "La fuite est traitée. Et maintenant ?",
      prompt: "Pour la suite ?",
      choices: [
        {
          id: "retex-cause",
          label:
            "Retour d'expérience et correction de la cause (compte compromis, accès trop larges)",
          emoji: "🧭",
          points: 100,
          isBest: true,
        },
        {
          id: "mfa-acces",
          label: "On renforce l'authentification et la revue des accès",
          emoji: "🔑",
          points: 80,
          isBest: false,
        },
        {
          id: "blamer",
          label: "On cherche un coupable à blâmer",
          emoji: "⚡",
          points: 10,
          isBest: false,
        },
        {
          id: "clos",
          label: "On considère l'incident clos, rien à changer",
          emoji: "🍃",
          points: 0,
          isBest: false,
        },
      ],
      hexVerdict:
        "Une fuite bien gérée renforce durablement : on corrige la cause (accès, MFA) et on apprend. Blâmer ne protège personne.",
    },
  ],
};

export const DRILL_SCENARIOS: DrillScenario[] = [
  RANSOMWARE,
  FRAUDE_PRESIDENT,
  FUITE_DONNEES,
];

export function getScenario(id: string): DrillScenario | null {
  return DRILL_SCENARIOS.find((s) => s.id === id) ?? null;
}

/** Score maximum atteignable (somme des meilleurs choix). */
export function maxScore(scenario: DrillScenario): number {
  return scenario.rounds.reduce(
    (sum, r) => sum + Math.max(...r.choices.map((c) => c.points)),
    0,
  );
}

// Roles proposes en mode table-top (facon exercice ANSSI). En mode eclair,
// les participants n'ont pas de role.
export const DRILL_ROLES = [
  "Direction",
  "Communication",
  "Informatique",
  "Sécurité",
] as const;

export type DrillRole = (typeof DRILL_ROLES)[number];

export function isDrillRole(v: unknown): v is DrillRole {
  return (
    typeof v === "string" && (DRILL_ROLES as readonly string[]).includes(v)
  );
}
