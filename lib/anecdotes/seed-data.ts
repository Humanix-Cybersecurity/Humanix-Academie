// SPDX-License-Identifier: AGPL-3.0-or-later
// Catalogue de pre-seed pour la newsletter "Cyber-Anecdote du Lundi".
// 16 anecdotes basees sur des incidents documentes (2018-2024), avec un
// fort accent francais. Format : 1 incident reel + 1 lecon courte + 1
// mini-action concrete realisable le jour meme par le lecteur.
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
    title: "Le CHU de Corbeil-Essonnes paralysé 5 semaines par un rançongiciel",
    summary:
      "En août 2022, le groupe LockBit chiffre les serveurs du CHU. 11 To de données exfiltrées, retour au papier pour les médecins, opérations reportées. Rançon demandée : 10 M$. L'hôpital a refusé de payer.",
    lesson:
      "Aucun secteur n'est épargné. Les cybercriminels frappent là où l'arrêt fait mal - donc partout. La défense passe par : sauvegardes hors-ligne testées + plan de reprise écrit + équipes formées au phishing (vecteur d'entrée n°1).",
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
    title: "Pathé Hollande perd 19 M€ dans une fraude au président par email",
    summary:
      "Mars 2018. La directrice financière reçoit un email du « PDG » demandant un virement urgent et confidentiel pour une acquisition. Elle vire 19 M€ en plusieurs fois. Le PDG n'a jamais envoyé l'email.",
    lesson:
      "La fraude au président ne dépend pas de la taille. Elle exploite l'autorité, l'urgence et la confidentialité. Aucun outil technique n'arrête ça - seul un process humain le fait : double validation hors-mail pour tout virement &gt; un seuil défini.",
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
    sourceUrl: "https://www.bbc.com/news/world-asia-china-68246674",
    sourceLabel: "BBC, février 2024",
    category: "IA_ABUS",
    incidentDate: "2024-01-15",
  },
  {
    slug: "france-travail-43m-fuite",
    title: "France Travail : 43 millions de personnes touchées par une fuite",
    summary:
      "Mars 2024. France Travail (ex-Pôle Emploi) annonce qu'un de ses prestataires (Cap Gemini) a été compromis. Les données personnelles de 43 millions de Français - dont 10 ans de demandeurs d'emploi - sont dans la nature. Risque : phishing ciblé pendant des années.",
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
    title: "Okta piratée via le LinkedIn d'un sous-traitant",
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
  {
    slug: "chu-cannes-ransomware-2024",
    title:
      "Cannes : l'hôpital Simone-Veil bascule en mode dégradé après une cyberattaque",
    summary:
      "Avril 2024. Le centre hospitalier de Cannes Simone-Veil active son plan blanc cyber : déprogrammation des opérations non urgentes, retour au papier pendant plusieurs semaines. L'attaque vise tous les services administratifs et techniques, sans impact direct sur les soins critiques.",
    lesson:
      "Les hôpitaux français sont une cible récurrente : ils ne peuvent pas s'arrêter, donc la pression à payer est forte. La parade n'est pas technologique - c'est un plan de continuité écrit, testé, où chaque équipe sait quoi faire quand l'informatique tombe.",
    miniAction:
      "Posez-vous la question aujourd'hui : « Si tous nos écrans s'éteignent demain matin, mes équipes savent-elles travailler 48 h sans ? ». Si la réponse est non, c'est qu'il manque un plan de continuité écrit (3 pages suffisent).",
    sourceUrl:
      "https://www.lemonde.fr/pixels/article/2024/04/16/cyberattaque-au-centre-hospitalier-de-cannes_6228159_4408996.html",
    sourceLabel: "Le Monde, avril 2024",
    category: "RANSOMWARE",
    incidentDate: "2024-04-16",
  },
  {
    slug: "free-sas-19m-fuite-2024",
    title: "Free SAS : 19 millions de clients exposés, dont 5 millions d'IBAN",
    summary:
      "Octobre 2024. Free annonce une cyberattaque visant un outil interne de gestion des abonnés. État civil, adresses, numéros de tél., et pour 5 M d'abonnés, l'IBAN de prélèvement. Les données sont mises en vente sur un forum criminel.",
    lesson:
      "Un IBAN n'est pas un secret - mais combiné à un nom et une adresse, il alimente des arnaques au prélèvement frauduleux. Le RGPD impose une notification CNIL sous 72 h ET une information aux personnes concernées si risque élevé. Free a fait les deux. La transparence est devenue un actif réputationnel.",
    miniAction:
      "Si vous êtes client Free, allez sur votre espace bancaire cette semaine et activez les alertes SMS sur tout prélèvement &gt; 50 €. Les arnaques au faux prélèvement ciblent les fuites récentes pendant les 6-12 mois qui suivent.",
    sourceUrl: "https://www.cnil.fr/fr/cyberattaque-free-octobre-2024",
    sourceLabel: "CNIL, octobre 2024",
    category: "DATA_LEAK",
    incidentDate: "2024-10-26",
  },
  {
    slug: "crowdstrike-panne-mondiale-2024",
    title:
      "CrowdStrike : une mise à jour défectueuse paralyse 8,5 millions de PC dans le monde",
    summary:
      "19 juillet 2024. Un fichier de configuration mal validé est poussé via la solution antivirus CrowdStrike Falcon. Les machines Windows protégées tombent en écran bleu en chaîne. Aéroports cloués au sol (CDG, Orly), banques, hôpitaux, bourses : la panne dure 24 à 72 h selon les organisations.",
    lesson:
      "Ce n'était pas un piratage - c'était un effet de bord d'un outil de sécurité. La leçon est plus dure : la dépendance à UN fournisseur critique sans plan de bascule est un risque cyber, même si ce fournisseur est légitime. Diversité = résilience.",
    miniAction:
      "Listez aujourd'hui vos 3 fournisseurs SaaS dont la panne paralyserait votre entreprise (M365, antivirus, ERP...). Pour chacun, écrivez en 1 phrase ce que vous feriez si l'outil était indisponible 24 h. Si 2 réponses sur 3 sont « rien, on attend », c'est un signal.",
    sourceUrl: "https://en.wikipedia.org/wiki/2024_CrowdStrike-related_IT_outages",
    sourceLabel: "Wikipedia (sources presse internationale), juillet 2024",
    category: "SUPPLY_CHAIN",
    incidentDate: "2024-07-19",
  },
  {
    slug: "schneider-electric-cactus-2024",
    title: "Schneider Electric : 1,5 To exfiltrés par le ransomware Cactus",
    summary:
      "Janvier 2024. La division « Sustainability Business » du géant français est compromise par le groupe Cactus. Les attaquants exfiltrent 1,5 To de données clients (audits énergie, plans d'usine) avant de chiffrer les serveurs. Schneider a refusé de payer ; les données ont été partiellement publiées.",
    lesson:
      "L'exfiltration AVANT chiffrement est désormais le standard du ransomware. Les sauvegardes ne suffisent plus à se sortir d'affaire - les attaquants vous tiennent par la menace de publication. La parade : chiffrer ses propres données sensibles (DLP, sectorisation) pour qu'elles soient inutilisables si volées.",
    miniAction:
      "Cette semaine, identifiez le « top 5 » des dossiers qui vous embarrasseraient le plus s'ils étaient publiés (contrats clients, audits, RH). Demandez à votre IT s'ils sont chiffrés au repos. Si la réponse est « euh... », vous avez votre prochain chantier.",
    sourceUrl:
      "https://www.bleepingcomputer.com/news/security/schneider-electric-confirms-data-breach-after-cactus-ransomware-attack/",
    sourceLabel: "BleepingComputer, janvier 2024",
    category: "RANSOMWARE",
    incidentDate: "2024-01-17",
  },
  {
    slug: "snowflake-credentials-2024",
    title:
      "Snowflake : 165 entreprises piratées via des mots de passe volés sans MFA",
    summary:
      "Mai-juin 2024. Le groupe UNC5537 utilise des identifiants Snowflake volés par des infostealers (sur des PC personnels) pour entrer chez 165 entreprises clientes : Ticketmaster (560 M de comptes), Santander, AT&T, Lendingtree. Aucune des victimes n'avait activé le MFA sur Snowflake.",
    lesson:
      "Le MFA n'est pas une option « avancée » - c'est le minimum vital sur tout outil qui contient des données clients. Snowflake ne l'imposait pas par défaut ; les attaquants l'ont compris avant les RSSI. Aujourd'hui le MFA est imposé par défaut, mais combien d'autres SaaS de votre stack ne l'imposent toujours pas ?",
    miniAction:
      "Listez tous les outils SaaS où vous avez un compte admin (CRM, paie, comptabilité, hébergement...). Pour chacun, vérifiez aujourd'hui que le MFA est activé sur VOTRE compte ET imposé pour toute l'organisation. C'est gratuit et ça prend 10 minutes par outil.",
    sourceUrl:
      "https://cloud.google.com/blog/topics/threat-intelligence/unc5537-snowflake-data-theft-extortion",
    sourceLabel: "Mandiant / Google Cloud Threat Intelligence, juin 2024",
    category: "PHISHING",
    incidentDate: "2024-06-10",
  },
  {
    slug: "deepfake-le-drian-2024",
    title:
      "Faux Le Drian : des dizaines de personnalités escroquées par deepfake politique",
    summary:
      "Affaire Mounier-Kuhn, jugée en 2024. Pendant des mois, deux escrocs imitent l'ex-ministre Jean-Yves Le Drian (visage en silicone, fond Élysée reconstitué) en visioconférence pour convaincre des PDG, religieux, monarques étrangers, de financer une « libération d'otages secrète ». Préjudice cumulé : plus de 50 M€.",
    lesson:
      "Le deepfake n'a pas attendu l'IA générative pour faire des dégâts. La protection ne vient pas de la technologie mais du process : aucune décision financière, jamais, sur un seul canal. Toute demande d'argent extraordinaire DOIT être confirmée par un canal indépendant pré-établi.",
    miniAction:
      "Si vous êtes en lien avec des décideurs ou des élus : convenez avec eux d'un mot-code verbal (jamais écrit) à demander pour confirmer toute sollicitation financière inhabituelle. Une question simple - « rappelle-moi notre signal du mois ? » - bloque 99 % des escroqueries.",
    sourceUrl:
      "https://www.francetvinfo.fr/justice/proces/proces-de-la-fausse-arnaque-au-faux-jean-yves-le-drian",
    sourceLabel: "France Info, 2024",
    category: "IA_ABUS",
    incidentDate: "2024-02-15",
  },
  {
    slug: "hopital-armentieres-ransomware-2024",
    title:
      "Armentières : l'hôpital ferme ses urgences 24 h après une cyberattaque",
    summary:
      "Février 2024. Le centre hospitalier d'Armentières (Nord) est attaqué dans la nuit. Les urgences ferment, les transferts vers Lille et Roubaix s'organisent. L'attaque, ransomware, exploite une vulnérabilité connue mais non patchée sur un VPN externe.",
    lesson:
      "La majorité des ransomwares en 2024 entrent par une vulnérabilité publique non patchée. Le patch est gratuit, l'attaque coûte des millions. La discipline du patching n'est pas glamour - c'est ce qui sépare les structures qui résistent de celles qui paient.",
    miniAction:
      "Demandez aujourd'hui à votre prestataire IT : « Combien de jours en moyenne entre la sortie d'un patch critique et son déploiement chez nous ? ». La réponse acceptable est : sous 7 jours pour les patches critiques. Au-delà de 30, c'est une bombe à retardement.",
    sourceUrl:
      "https://www.lemonde.fr/pixels/article/2024/02/12/cyberattaque-l-hopital-d-armentieres-ferme-ses-urgences_6216186_4408996.html",
    sourceLabel: "Le Monde, février 2024",
    category: "RANSOMWARE",
    incidentDate: "2024-02-11",
  },
  {
    slug: "microsoft-midnight-blizzard-2024",
    title:
      "Microsoft : des dirigeants espionnés pendant 8 semaines par les services russes",
    summary:
      "Janvier 2024. Microsoft révèle que le groupe russe Midnight Blizzard (APT29) a accédé pendant 8 semaines aux boîtes mail de dirigeants du groupe, dont l'équipe sécurité. Vecteur d'entrée : un compte de test sans MFA, exploité via password spraying.",
    lesson:
      "Un compte « de test » oublié est aussi dangereux qu'une porte d'entrée laissée ouverte. Et même les géants de la cybersécurité oublient des comptes. Faites le ménage régulier de vos comptes inactifs : ils sont la cible préférée des attaquants car personne ne les surveille.",
    miniAction:
      "Cette semaine, demandez la liste des comptes utilisateurs inactifs depuis 90+ jours dans votre Active Directory ou Microsoft 365. Désactivez tous ceux qui ne correspondent pas à un congé maternité ou maladie. C'est 30 minutes pour fermer des dizaines de portes oubliées.",
    sourceUrl:
      "https://msrc.microsoft.com/blog/2024/01/microsoft-actions-following-attack-by-nation-state-actor-midnight-blizzard/",
    sourceLabel: "Microsoft Security Response Center, janvier 2024",
    category: "PHISHING",
    incidentDate: "2024-01-12",
  },
  {
    slug: "auchan-fidelite-fuite-2024",
    title:
      "Auchan : fuite massive sur les comptes carte de fidélité Waaoh!",
    summary:
      "Novembre 2024. Auchan notifie ses clients d'une cyberattaque ayant exposé les données de plusieurs millions de porteurs de carte Waaoh! : nom, prénom, adresse postale, email, numéro de fidélité, composition du foyer. Aucun mot de passe ni IBAN n'est concerné.",
    lesson:
      "Une carte de fidélité semble anodine - elle est un trésor pour les phishers. Avec votre nom, votre supermarché habituel et la composition du foyer, on fabrique des arnaques sur-mesure (« Bonjour Marie, votre commande Auchan Drive du 12 novembre... »). La data minimization du RGPD n'est pas qu'une formalité.",
    miniAction:
      "Faites le tri cette semaine dans votre boîte mail : combien d'enseignes ont votre adresse ET votre nom ET votre adresse postale ? Désinscrivez-vous des programmes de fidélité que vous n'utilisez plus. Moins de surface = moins de risque.",
    sourceUrl:
      "https://www.cnil.fr/fr/cyberattaque-auchan-novembre-2024",
    sourceLabel: "CNIL, novembre 2024",
    category: "DATA_LEAK",
    incidentDate: "2024-11-08",
  },
  {
    slug: "lockbit-operation-cronos-2024",
    title:
      "LockBit démantelé : la police saisit le site du plus prolifique gang ransomware",
    summary:
      "Février 2024. Opération Cronos menée par la NCA britannique avec 10 pays (dont la France via la JUNALCO). Les serveurs de LockBit, responsable de plus de 2 000 attaques en 4 ans, sont saisis. Clés de déchiffrement publiées gratuitement aux victimes. Plusieurs membres arrêtés.",
    lesson:
      "Ne payez jamais une rançon - c'est financer le prochain crime, et il y a une chance que la clé arrive plus tard via la justice. Si vous êtes touché, signalez à la PJ et à l'ANSSI : c'est ce qui permet ces démantèlements. Le silence des victimes est l'oxygène des cybercriminels.",
    miniAction:
      "Mettez aujourd'hui en favori les 2 numéros utiles si vous êtes piraté demain : Cybermalveillance.gouv.fr (pour les PME) et le 17 Cyber (police). Imprimer les sur une fiche au mur du bureau de votre IT. Quand ça arrive, on n'a pas le temps de chercher.",
    sourceUrl:
      "https://www.nationalcrimeagency.gov.uk/news/nca-leads-international-investigation-targeting-worlds-most-harmful-ransomware-group",
    sourceLabel: "National Crime Agency, février 2024",
    category: "RANSOMWARE",
    incidentDate: "2024-02-19",
  },
];
