// Catalogue de pre-seed pour la newsletter "Cyber-Anecdote du Lundi".
// 6 anecdotes basees sur des incidents documentes en France (2023-2025).
// Format : 1 incident reel + 1 lecon courte + 1 mini-action concrete realisable
// le jour meme par le lecteur.
//
// Ces anecdotes sont l'amorce. La console admin permet d'en ajouter de nouvelles
// chaque semaine (curation manuelle ou IA assistee).

import { AnecdoteCategory } from "@prisma/client";

export type SeedAnecdote = {
  slug: string;
  title: string;
  summary: string;
  lesson: string;
  miniAction: string;
  sourceUrl: string;
  sourceLabel: string;
  category: AnecdoteCategory;
  incidentDate: string; // ISO YYYY-MM-DD
};

export const ANECDOTES_SEED: SeedAnecdote[] = [
  {
    slug: "chu-corbeil-essonnes-rancongiciel",
    title:
      "Le CHU de Corbeil-Essonnes paralysé 5 semaines par un rançongiciel",
    summary:
      "En août 2022, le groupe LockBit chiffre les serveurs du CHU. 11 To de données exfiltrées, retour au papier pour les médecins, opérations reportées. Rançon demandée : 10 M$. L'hôpital a refusé de payer.",
    lesson:
      "Aucun secteur n'est épargné. Les cybercriminels frappent là où l'arrêt fait mal — donc partout. La défense passe par : sauvegardes hors-ligne testées + plan de reprise écrit + équipes formées au phishing (vecteur d'entrée n°1).",
    miniAction:
      "Demandez aujourd'hui à votre prestataire IT : « À quand remonte le dernier test de restauration de nos sauvegardes ? » Si la réponse est floue, c'est qu'il n'y en a pas eu.",
    sourceUrl:
      "https://www.lemonde.fr/pixels/article/2022/08/22/cyberattaque-au-centre-hospitalier-sud-francilien-de-corbeil-essonnes_6138774_4408996.html",
    sourceLabel: "Le Monde, août 2022",
    category: "RANSOMWARE",
    incidentDate: "2022-08-21",
  },
  {
    slug: "fraude-president-pathe-19m",
    title:
      "Pathé Hollande perd 19 M€ dans une fraude au président par email",
    summary:
      "Mars 2018. La directrice financière reçoit un email du « PDG » demandant un virement urgent et confidentiel pour une acquisition. Elle vire 19 M€ en plusieurs fois. Le PDG n'a jamais envoyé l'email.",
    lesson:
      "La fraude au président ne dépend pas de la taille. Elle exploite l'autorité, l'urgence et la confidentialité. Aucun outil technique n'arrête ça — seul un process humain le fait : double validation hors-mail pour tout virement &gt; un seuil défini.",
    miniAction:
      "Définissez aujourd'hui votre seuil de double validation (ex : 5 000 €) et votre canal de confirmation (appel téléphonique au numéro carnet d'adresses, JAMAIS celui de l'email). Communiquez-le à votre comptable et à votre banque.",
    sourceUrl:
      "https://www.zdnet.fr/actualites/pathe-hollande-victime-d-une-fraude-au-president-d-un-montant-de-19-millions-d-euros-39880941.htm",
    sourceLabel: "ZDNet, octobre 2018",
    category: "FRAUDE",
    incidentDate: "2018-03-08",
  },
  {
    slug: "viamedis-almerys-fuite-33m",
    title: "33 millions de Français exposés : la fuite Viamedis & Almerys",
    summary:
      "Février 2024. Deux opérateurs de tiers payant santé (Viamedis et Almerys) sont compromis suite à du phishing ciblé sur les comptes de professionnels de santé. État civil, NIR, mutuelle de la moitié de la population française dans la nature.",
    lesson:
      "Vos données ne sont pas que chez vous. Elles sont chez vos sous-traitants, leurs sous-traitants, et leurs prestataires. Un seul maillon faible suffit. Conséquence : exigez de TOUS vos sous-traitants une preuve de leur démarche cyber (clause RGPD article 28).",
    miniAction:
      "Listez vos 5 principaux prestataires qui touchent à des données sensibles (paie, santé, RH). Cette semaine, envoyez à chacun un mail : « Pouvez-vous me transmettre votre dernier rapport de sécurité ou votre certification ? »",
    sourceUrl: "https://www.cnil.fr/fr/cyberattaque-viamedis-almerys",
    sourceLabel: "CNIL, février 2024",
    category: "DATA_LEAK",
    incidentDate: "2024-02-01",
  },
  {
    slug: "deepfake-arup-25m",
    title:
      "Hong Kong : un employé vire 25 M$ après une visioconférence deepfake",
    summary:
      "Janvier 2024. Un employé du cabinet d'ingénierie Arup reçoit une visio Teams avec son « directeur financier » et plusieurs collègues. Tous lui demandent un virement urgent. Tous étaient des deepfakes générés par IA. Préjudice : 25 M$.",
    lesson:
      "L'IA générative a tué le « j'ai reconnu sa voix / son visage » comme preuve d'identité. Tout protocole de validation doit désormais reposer sur un deuxième canal indépendant (numéro connu, mot de passe partagé, présence physique).",
    miniAction:
      "Définissez avec vos équipes un « mot de code » verbal, jamais écrit nulle part, à demander en cas de doute lors d'un appel ou d'une visio anormale. Ex : la question « Quel est notre safe word de l'année ? » doit recevoir la bonne réponse.",
    sourceUrl:
      "https://www.bbc.com/news/world-asia-china-68246674",
    sourceLabel: "BBC, février 2024",
    category: "IA_ABUS",
    incidentDate: "2024-01-15",
  },
  {
    slug: "france-travail-43m-fuite",
    title:
      "France Travail : 43 millions de personnes touchées par une fuite",
    summary:
      "Mars 2024. France Travail (ex-Pôle Emploi) annonce qu'un de ses prestataires (Cap Gemini) a été compromis. Les données personnelles de 43 millions de Français — dont 10 ans de demandeurs d'emploi — sont dans la nature. Risque : phishing ciblé pendant des années.",
    lesson:
      "Une fois les données fuitées, elles le sont POUR TOUJOURS. Elles servent à fabriquer des phishings ultra-crédibles (« Bonjour Jean, suite à votre dossier d'inscription du 14/03/2018... »). La seule défense : entraîner vos équipes à se méfier MÊME quand l'email semble parfaitement légitime.",
    miniAction:
      "Cette semaine, partagez à votre équipe la règle du « pause de 10 secondes » : avant de cliquer sur un lien dans un email, fermer les yeux 10 secondes et se demander « Est-ce que j'attendais ce mail ? ». Si la réponse n'est pas un OUI franc, on ne clique pas.",
    sourceUrl: "https://www.cnil.fr/fr/cyberattaque-france-travail",
    sourceLabel: "CNIL, mars 2024",
    category: "DATA_LEAK",
    incidentDate: "2024-03-13",
  },
  {
    slug: "phishing-mfa-okta",
    title:
      "Okta piratée via le LinkedIn d'un sous-traitant",
    summary:
      "Octobre 2023. Le géant de l'authentification Okta est compromis. Vecteur d'entrée : un employé de leur sous-traitant a stocké ses identifiants Okta dans son compte Google personnel… qui a été piraté via un phishing. Impact : 134 clients Okta touchés, dont 1Password et Cloudflare.",
    lesson:
      "Le mélange perso/pro est un risque cyber sous-estimé. Synchroniser ses mots de passe pro dans un coffre Google personnel = donner les clés du bureau à n'importe qui qui pirate votre compte personnel. Cloisonner = protéger.",
    miniAction:
      "Vérifiez aujourd'hui où est stocké votre mot de passe pro principal (Microsoft 365, Google Workspace…). Si c'est dans un gestionnaire personnel ou dans le navigateur sur votre PC perso, déplacez-le dans un coffre dédié pro (Bitwarden Business, 1Password Business).",
    sourceUrl:
      "https://www.theverge.com/2023/11/29/23981798/okta-october-data-breach-all-customers-affected",
    sourceLabel: "The Verge, novembre 2023",
    category: "PHISHING",
    incidentDate: "2023-10-19",
  },
];
