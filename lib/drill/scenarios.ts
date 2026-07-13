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

export const DRILL_SCENARIOS: DrillScenario[] = [RANSOMWARE];

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
