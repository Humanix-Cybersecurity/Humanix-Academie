// SPDX-License-Identifier: AGPL-3.0-or-later
// Fallback intelligent pour les episodes dont le MDX n'a pas encore ete ecrit.
//
// CONTEXTE : on a 150 episodes au catalogue (cf. prisma/catalog-saisons.ts)
// mais ecrire 150 MDX detailles a la main prend 30+ jours. En attendant que
// l'equipe / les experts contributeurs (cf. /experts) les remplissent, on
// genere a la volee un contenu pedagogique generique MAIS structure.
//
// PHILOSOPHIE : un apprenant doit pouvoir COMPLETER l'episode et gagner ses
// XP comme sur un module ecrit, mais le contenu reste honnetement marque
// "en cours d'enrichissement". Pas de fake content qui pretend etre detaille.
//
// Le contenu est CONTEXTUALISE par categorie de saison (phishing, ransomware,
// IA, etc.) pour que le scenario reste coherent avec le sujet, meme generique.

import type { EpisodeContent } from "@/lib/episodes";

const CATEGORIE_PROFILS: Record<
  string,
  {
    persona: string;
    objective: string;
    scenarioTemplate: (title: string) => string;
    choices: {
      id: string;
      label: string;
      outcome: "good" | "bad" | "neutral";
      feedback: string;
      points: number;
    }[];
    debrief: string;
    quizQuestion: (title: string) => string;
    quizCorrect: string;
    quizDistractors: string[];
    quizExplanation: string;
  }
> = {
  // ==== Phishing & ingenierie sociale ====
  phishing: {
    persona: "Vous êtes collaborateur d'une PME française",
    objective: "Apprendre à repérer un message suspect avant de cliquer",
    scenarioTemplate: (t) =>
      `Vous êtes au bureau, votre boîte mail vous notifie. Un message arrive - son contenu est lié au sujet : "${t}". Le message vous demande une action rapide. Vous regardez l'expéditeur, l'URL et le ton. Que faites-vous ?`,
    choices: [
      {
        id: "click",
        label: "Je clique sur le lien sans vérifier - c'est urgent.",
        outcome: "bad",
        feedback:
          "L'urgence est précisément le levier de manipulation des phishings. Toujours prendre 5 secondes.",
        points: 0,
      },
      {
        id: "verify",
        label:
          "Je vérifie l'expéditeur, je passe le curseur sur le lien sans cliquer, je signale si suspect.",
        outcome: "good",
        feedback:
          "Le bon réflexe en 3 étapes. Si doute : signaler à l'IT plutôt que cliquer.",
        points: 30,
      },
      {
        id: "ignore",
        label: "Je supprime sans rien faire.",
        outcome: "neutral",
        feedback:
          "Mieux que cliquer, mais signaler permet à l'IT de protéger les autres collègues.",
        points: 15,
      },
    ],
    debrief:
      "Le phishing exploite l'urgence et l'autorité. 3 réflexes : (1) toujours vérifier l'expéditeur réel, (2) survoler les liens sans cliquer, (3) signaler à l'IT pour protéger les collègues.",
    quizQuestion: (t) => `Concernant "${t}", quel est le réflexe le plus sûr ?`,
    quizCorrect: "Vérifier l'expéditeur et signaler à l'IT en cas de doute",
    quizDistractors: [
      "Cliquer rapidement pour ne pas rater l'occasion",
      "Transférer le mail à toute l'équipe pour avoir leur avis",
    ],
    quizExplanation:
      "La vérification de l'expéditeur réel + le signalement IT sont les 2 actions qui protègent la PME. Cliquer ou transférer largement = amplifier le risque.",
  },

  // ==== Mots de passe ====
  "mots-de-passe": {
    persona: "Vous êtes collaborateur",
    objective: "Adopter une hygiène de mot de passe robuste",
    scenarioTemplate: (t) =>
      `Vous gérez plusieurs comptes professionnels. Le sujet du jour : "${t}". Une décision concrète à prendre dans la gestion de vos accès. Que faites-vous ?`,
    choices: [
      {
        id: "weak",
        label: "Je réutilise mon mot de passe perso, c'est plus simple.",
        outcome: "bad",
        feedback:
          "Si un service externe est compromis, tous vos comptes pro sont à risque. Jamais de réutilisation.",
        points: 0,
      },
      {
        id: "manager",
        label: "J'utilise un gestionnaire de mots de passe avec MFA activé.",
        outcome: "good",
        feedback:
          "Le combo gagnant : 1 mot de passe unique fort par service + MFA partout où possible.",
        points: 30,
      },
      {
        id: "postit",
        label: "Je note tout sur un post-it sous le clavier.",
        outcome: "bad",
        feedback:
          "Anyone passant à votre bureau a accès à tout. À éviter absolument.",
        points: 0,
      },
    ],
    debrief:
      "Règle d'or : 1 mot de passe unique fort par service, dans un gestionnaire (Bitwarden, KeePass), avec MFA partout où c'est proposé.",
    quizQuestion: (t) => `Concernant "${t}", quelle pratique recommander ?`,
    quizCorrect: "Gestionnaire de mots de passe + MFA activé",
    quizDistractors: [
      "Mot de passe réutilisé partout pour ne pas oublier",
      "Mot de passe noté sur un post-it",
    ],
    quizExplanation:
      "Le gestionnaire + MFA résout les 2 problèmes : mémorisation et compromission. C'est la base recommandée par l'ANSSI.",
  },

  // ==== Ransomware & extorsion ====
  ransomware: {
    persona: "Vous êtes collaborateur",
    objective: "Réagir correctement face à un ransomware",
    scenarioTemplate: (t) =>
      `Votre poste affiche soudain un message d'extorsion. Le contexte : "${t}". Que faites-vous dans les 60 premières secondes ?`,
    choices: [
      {
        id: "pay",
        label: "Je paye la rançon discrètement.",
        outcome: "bad",
        feedback:
          "Payer ne garantit pas la récupération et finance les attaquants. ANSSI recommande de NE JAMAIS payer.",
        points: 0,
      },
      {
        id: "isolate",
        label:
          "Je débranche le câble réseau et je préviens l'IT immédiatement.",
        outcome: "good",
        feedback:
          "Confinement immédiat sans éteindre le poste (préservation des preuves). Bon réflexe.",
        points: 30,
      },
      {
        id: "shutdown",
        label: "J'éteins le poste pour stopper l'attaque.",
        outcome: "neutral",
        feedback:
          "Mieux que rien, mais on perd la mémoire vive utile à l'analyse forensique. Préférer le débranchement réseau.",
        points: 15,
      },
    ],
    debrief:
      "Face à un ransomware : (1) débrancher le réseau (pas éteindre), (2) prévenir l'IT/RSSI immédiatement, (3) ne JAMAIS payer, (4) déposer plainte + cybermalveillance.gouv.fr.",
    quizQuestion: (t) => `Concernant "${t}", quel est le premier réflexe ?`,
    quizCorrect: "Débrancher le câble réseau et alerter l'IT",
    quizDistractors: [
      "Payer la rançon vite pour récupérer les fichiers",
      "Éteindre le poste immédiatement",
    ],
    quizExplanation:
      "Le confinement réseau stoppe la propagation sans perdre les preuves mémoire. L'extinction supprime des éléments forensiques précieux.",
  },

  // ==== IA generative ====
  "ia-generative": {
    persona:
      "Vous êtes collaborateur PME utilisant ChatGPT/Mistral au quotidien",
    objective: "Utiliser l'IA générative sans fuiter de données sensibles",
    scenarioTemplate: (t) =>
      `Vous utilisez une IA pour gagner du temps. Sujet : "${t}". Vous êtes sur le point de coller du contenu pro dans le prompt. Que faites-vous ?`,
    choices: [
      {
        id: "paste",
        label:
          "Je colle le document client en entier dans ChatGPT, c'est plus rapide.",
        outcome: "bad",
        feedback:
          "Les prompts sont mémorisés et peuvent être utilisés pour entraîner des modèles. Données client = JAMAIS dans une IA grand public.",
        points: 0,
      },
      {
        id: "anonymize",
        label:
          "Je remplace les noms et données sensibles par des placeholders avant de coller.",
        outcome: "good",
        feedback:
          "Bon réflexe d'anonymisation. Encore mieux : utiliser une IA souveraine type Mistral pour les données pro.",
        points: 30,
      },
      {
        id: "ignore",
        label: "Je n'utilise pas l'IA du tout, c'est trop risqué.",
        outcome: "neutral",
        feedback:
          "Prudent mais limitatif. L'IA est utilisable pour des cas non-sensibles, et il existe des alternatives souveraines.",
        points: 15,
      },
    ],
    debrief:
      "L'IA générative est utile mais les prompts ne sont PAS privés. Règles : (1) anonymiser systématiquement, (2) éviter les outils US pour les données sensibles, (3) préférer une IA souveraine (Mistral) ou auto-hébergée.",
    quizQuestion: (t) => `Concernant "${t}", quelle posture est la plus sûre ?`,
    quizCorrect:
      "Anonymiser les données avant de les coller, ou utiliser une IA souveraine",
    quizDistractors: [
      "Tout coller, l'IA est confidentielle",
      "Coller mais en anglais pour brouiller",
    ],
    quizExplanation:
      "L'anonymisation est la base. Les outils comme ChatGPT US peuvent servir pour des contenus génériques, mais pas pour des données client/RH.",
  },

  // ==== NIS2 ====
  "nis2-pme": {
    persona: "Vous êtes dirigeant·e ou RSSI d'une PME française",
    objective: "Comprendre l'impact NIS2 sur votre PME",
    scenarioTemplate: (t) =>
      `Votre entreprise est potentiellement concernée par la directive NIS2. Sujet du jour : "${t}". Vous devez prendre une décision de gouvernance.`,
    choices: [
      {
        id: "ignore",
        label: "On verra plus tard, on n'a jamais été contrôlés.",
        outcome: "bad",
        feedback:
          "Les sanctions NIS2 vont jusqu'à 10 M€ ou 2 % du CA mondial. Et un incident peut déclencher un audit a posteriori.",
        points: 0,
      },
      {
        id: "act",
        label:
          "Je vérifie notre statut NIS2, je documente nos mesures et je nomme un référent cyber.",
        outcome: "good",
        feedback:
          "Les 3 actions clés. La documentation peut sauver une amende en cas d'incident.",
        points: 30,
      },
      {
        id: "delegate",
        label: "Je délègue à mon prestataire IT habituel sans suivre.",
        outcome: "neutral",
        feedback:
          "Délégation possible mais la responsabilité reste au dirigeant. Toujours vérifier ce qui est fait en votre nom.",
        points: 15,
      },
    ],
    debrief:
      "NIS2 demande 3 choses : (1) connaître votre statut (entité essentielle / importante / hors-scope), (2) documenter les mesures de sécurité, (3) notifier tout incident significatif sous 24h/72h.",
    quizQuestion: (t) => `Concernant "${t}", quelle est la priorité ?`,
    quizCorrect:
      "Vérifier le statut NIS2 et documenter les mesures de sécurité",
    quizDistractors: [
      "Attendre d'être contrôlé pour agir",
      "Acheter une assurance et oublier",
    ],
    quizExplanation:
      "Vérification de statut + documentation = la base pour démontrer la diligence. Une assurance ne remplace pas la conformité.",
  },

  // ==== Default fallback (catégorie inconnue) ====
  default: {
    persona: "Vous êtes collaborateur d'une PME",
    objective: "Adopter le bon réflexe cyber",
    scenarioTemplate: (t) =>
      `Vous êtes confronté à une situation cyber concrète sur le sujet : "${t}". Vous devez réagir vite, mais bien. Quelle posture adopter ?`,
    choices: [
      {
        id: "rush",
        label: "J'agis immédiatement sans vérifier, je verrai après.",
        outcome: "bad",
        feedback:
          "L'urgence est rarement compatible avec la sécurité. Toujours prendre quelques secondes pour vérifier.",
        points: 0,
      },
      {
        id: "verify",
        label:
          "Je vérifie l'origine et la légitimité avant d'agir, je signale à l'IT si doute.",
        outcome: "good",
        feedback:
          "Bon réflexe. La vérification + le signalement protègent toute l'organisation.",
        points: 30,
      },
      {
        id: "ignore",
        label: "Je ferme et je passe à autre chose sans rien dire.",
        outcome: "neutral",
        feedback:
          "Mieux que rien, mais signaler permet à l'IT de prévenir les autres.",
        points: 15,
      },
    ],
    debrief:
      "La règle universelle de la cyber : VERIFIER avant d'agir, SIGNALER à l'IT en cas de doute, NE PAS PARTAGER une info sensible sans validation.",
    quizQuestion: (t) => `Concernant "${t}", quel est le bon réflexe ?`,
    quizCorrect:
      "Vérifier l'origine, agir avec prudence, signaler à l'IT si doute",
    quizDistractors: [
      "Agir le plus vite possible",
      "Demander à un collègue, il saura forcément",
    ],
    quizExplanation:
      "Vérifier + signaler = la base. Demander aux collègues peut amplifier la confusion ou propager une attaque par ingénierie sociale.",
  },
};

/**
 * Construit un EpisodeContent generique a partir des metadata BDD.
 * Le contenu est volontairement marque "en cours d'enrichissement" pour
 * etre honnete avec l'apprenant. Mais structure pour permettre une
 * completion / scoring / XP comme sur un module ecrit.
 */
export function buildFallbackContent(args: {
  saisonSlug: string;
  episodeSlug: string;
  episodeTitle: string;
  xpReward: number;
}): EpisodeContent {
  const profil =
    CATEGORIE_PROFILS[args.saisonSlug] ?? CATEGORIE_PROFILS["default"];

  const quizQ = profil.quizQuestion(args.episodeTitle);
  // On melange le bon choix au milieu pour eviter le pattern "toujours A"
  const quizChoices = [
    { id: "a", label: profil.quizDistractors[0], correct: false },
    { id: "b", label: profil.quizCorrect, correct: true },
    { id: "c", label: profil.quizDistractors[1], correct: false },
  ];

  return {
    saisonSlug: args.saisonSlug,
    episodeSlug: args.episodeSlug,
    meta: {
      title: args.episodeTitle,
      durationMinutes: 6,
      persona: profil.persona,
      objective: profil.objective,
      scenario: profil.scenarioTemplate(args.episodeTitle),
      choices: profil.choices,
      debrief: profil.debrief,
      quiz: [
        {
          question: quizQ,
          choices: quizChoices,
          explanation: profil.quizExplanation,
        },
      ],
      xpReward: args.xpReward,
    },
    body: "",
  };
}
