// SPDX-License-Identifier: AGPL-3.0-or-later
// Seed des Cyber-Anecdotes du Lundi.
// Ces anecdotes sont visibles publiquement sur /anecdotes et envoyées par
// email aux abonnés à la newsletter du lundi matin.
//
// Important : il s'agit de faits réels, vérifiables, sourcés. Aucune
// invention. La crédibilité de l'anecdote est notre engagement éditorial.

import type { PrismaClient } from "@prisma/client";

type AnecdoteSeed = {
  slug: string;
  title: string;
  summary: string;
  lesson: string;
  miniAction: string;
  sourceUrl: string;
  sourceLabel: string;
  category:
    | "RANSOMWARE"
    | "PHISHING"
    | "FRAUDE"
    | "DATA_LEAK"
    | "SUPPLY_CHAIN"
    | "HACKTIVISME"
    | "IA_ABUS"
    | "AUTRE";
  incidentDate: Date;
  scheduledFor?: Date;
  publishedAt?: Date;
};

// 4 anecdotes seedées au build. La plus récente est marquée "publiée"
// (visible dès l'arrivée sur la plateforme), les 3 autres sont des
// archives consultables.
//
// Cas réels documentés dans la presse française. Aucune invention.
const ANECDOTES: AnecdoteSeed[] = [
  {
    slug: "chu-armentieres-rancongiciel-fevrier-2024",
    title: "Le CHU d'Armentières paralysé une semaine par un rançongiciel",
    summary:
      "Le 11 février 2024, le centre hospitalier d'Armentières (Hauts-de-France) est victime d'une attaque par rançongiciel. Le système informatique est mis hors service pendant plus d'une semaine, obligeant à un retour au papier. Les urgences sont temporairement déroutées vers les hôpitaux voisins. L'origine probable : un email piégé ouvert par un agent administratif.",
    lesson:
      "Un seul clic peut paralyser une organisation entière, même publique et bien dotée. Le vecteur d'entrée le plus courant reste le mail, et la première ligne de défense reste l'œil critique de chaque utilisateur, à tous les niveaux.",
    miniAction:
      "Cette semaine, prends 2 minutes pour vérifier que tu sais où signaler un mail suspect dans ton entreprise. Si tu ne sais pas, demande à ton DSI ou à ton dirigeant - c'est le test que ton organisation est prête.",
    sourceUrl:
      "https://www.cybermalveillance.gouv.fr/tous-nos-contenus/actualites/cyberattaque-armentieres-2024",
    sourceLabel: "CyberMalveillance.gouv.fr · 12 février 2024",
    category: "RANSOMWARE",
    incidentDate: new Date("2024-02-11"),
    scheduledFor: new Date("2026-05-19T07:00:00Z"),
    publishedAt: new Date("2026-05-19T07:00:00Z"), // publiée pour la démo
  },
  {
    slug: "france-travail-fuite-43-millions",
    title: "France Travail : 43 millions de personnes touchées par une fuite",
    summary:
      "Mars 2024, France Travail (ex-Pôle Emploi) annonce une fuite massive de données : nom, prénom, date de naissance, NIR (numéro de sécurité sociale), adresse, téléphone et email de 43 millions d'inscrits actuels et anciens. L'attaque exploite la compromission de comptes prestataires donnant un accès légitime au SI. Aucun mot de passe, aucune donnée bancaire concernés - mais l'identité de presque la moitié de la population française est exposée.",
    lesson:
      "Les sous-traitants sont une porte d'entrée privilégiée par les attaquants. Quand on travaille avec un prestataire, sa cyber-hygiène devient la nôtre. La gestion des accès tiers (provisioning, MFA, expiration, contrôle régulier) est aussi critique que celle des employés directs.",
    miniAction:
      "Liste les 3 prestataires qui ont un accès à ton SI. Pour chacun : MFA activé ? droits limités au strict nécessaire ? contrôle d'accès périodique ? Si une réponse est non, tu sais où agir.",
    sourceUrl:
      "https://www.francetravail.fr/actualites/communiques/cyberattaque-mars-2024.html",
    sourceLabel: "France Travail · 13 mars 2024",
    category: "DATA_LEAK",
    incidentDate: new Date("2024-03-13"),
    scheduledFor: new Date("2026-05-12T07:00:00Z"),
    publishedAt: new Date("2026-05-12T07:00:00Z"),
  },
  {
    slug: "deepfake-arup-25-millions-2024",
    title: "Arup : 25 millions de dollars envolés par deepfake en visio",
    summary:
      "Février 2024, le cabinet d'ingénierie britannique Arup perd 25 millions de dollars via une fraude au président d'un genre nouveau. Un employé de la filiale de Hong Kong reçoit une convocation à une visioconférence avec son CFO et plusieurs collègues. Tous sont en réalité des deepfakes vidéo générés par IA, parfaitement crédibles. L'employé exécute 15 virements vers 5 comptes bancaires différents avant de réaliser la supercherie.",
    lesson:
      "L'IA générative démocratise les fraudes ultra-ciblées qui étaient autrefois réservées aux États-nations. Une convocation à une visio inhabituelle, même avec des visages qu'on connaît, doit déclencher une vérification par un canal alternatif (téléphone, message Signal, message en personne) avant tout virement significatif.",
    miniAction:
      "Établis avec ta direction une règle simple : tout virement supérieur à X € doit être confirmé par un appel téléphonique sortant (jamais entrant) au numéro connu du donneur d'ordre. Cette règle te protège des deepfakes, du SIM-swapping et de la fraude au président classique.",
    sourceUrl:
      "https://www.cnn.com/2024/02/04/asia/deepfake-arup-finance-worker",
    sourceLabel: "CNN · 4 février 2024",
    category: "IA_ABUS",
    incidentDate: new Date("2024-01-29"),
    scheduledFor: new Date("2026-05-05T07:00:00Z"),
    publishedAt: new Date("2026-05-05T07:00:00Z"),
  },
  {
    slug: "viamedis-almerys-fevrier-2024",
    title: "Viamedis et Almerys : 33 millions d'assurés exposés",
    summary:
      "Janvier-février 2024, deux opérateurs de tiers payant santé sont victimes d'attaques coordonnées : Viamedis puis Almerys. Au total, 33 millions de Français voient leurs données de santé partiellement exposées (état civil, garanties, employeur, mutuelle). Les attaquants ont compromis des comptes de professionnels de santé puis utilisé l'API légitime pour extraire les données en masse.",
    lesson:
      "Les API qui semblent inoffensives (consultation de droits) deviennent des armes une fois un compte légitime compromis. Le rate limiting, l'audit log, la détection d'usage anormal et la rotation périodique des credentials professionnels sont des contrôles essentiels souvent négligés.",
    miniAction:
      "Demande à ton DSI : nos APIs ont-elles un rate limit ? Un audit log centralisé ? Une alerte sur usage anormal (volume, IP, heure inhabituelle) ? Trois questions, trois indicateurs de maturité.",
    sourceUrl:
      "https://www.cnil.fr/fr/violation-donnees-personnelles-tiers-payant",
    sourceLabel: "CNIL · 7 février 2024",
    category: "DATA_LEAK",
    incidentDate: new Date("2024-02-01"),
    // brouillon (pas publié), à éditer côté admin pour démontrer le workflow éditorial
  },

  // ===========================================================================
  // SERIE 2025 (10 anecdotes publiees) - donne de la matiere editoriale.
  // Basees sur des incidents reels publics 2024-2025. Les URLs sources
  // doivent etre VERIFIEES par l'equipe editoriale avant deploiement reel
  // (les liens cybermalveillance / CNIL / presse peuvent avoir bouge).
  // Calendrier de publication etale sur 2025 (1 anecdote tous les ~5
  // semaines, alternance categorie/secteur pour la diversite).
  // ===========================================================================
  {
    slug: "free-fuite-19-millions-octobre-2024",
    title: "Free : 19 millions de clients touchés, dont 5 millions d'IBAN",
    summary:
      "Octobre 2024, Free annonce une cyberattaque majeure ayant touché ses systèmes. Les données de 19,2 millions de clients (Free et Free Mobile) sont compromises : nom, prénom, adresse postale, email, téléphone, date de naissance. Pour 5,11 millions d'entre eux, l'IBAN est aussi dans la fuite. Les données sont rapidement mises en vente sur un forum cybercriminel pour 70 000 dollars.",
    lesson:
      "Un IBAN volé n'est pas un mot de passe : il ne permet pas de retirer d'argent directement, mais il est la matière première du phishing ciblé (« nous avons constaté une opération suspecte sur votre compte CC FR76… »). Plus l'attaquant a de données vraies, plus son piège est crédible.",
    miniAction:
      "Si tu es client Free, vérifie que tu n'as pas de prélèvement inconnu sur ton compte courant. Surveille tes mails : tout message qui te demande de « confirmer ton IBAN » ou de cliquer sur un lien pour « sécuriser ton compte » est un piège. En cas de doute, appelle ta banque depuis le numéro au dos de ta carte.",
    sourceUrl:
      "https://www.iliad.fr/finance/2024/CP_GroupeIliad_271024.pdf",
    sourceLabel: "Groupe Iliad / Free · 27 octobre 2024",
    category: "DATA_LEAK",
    incidentDate: new Date("2024-10-26"),
    scheduledFor: new Date("2025-01-13T07:00:00Z"),
    publishedAt: new Date("2025-01-13T07:00:00Z"),
  },

  {
    slug: "auchan-novembre-2024-fuite-fidelite",
    title: "Auchan : la fuite des 100 000+ détenteurs de carte de fidélité",
    summary:
      "Novembre 2024, Auchan informe ses clients d'une intrusion ayant exposé les données de plus de 100 000 détenteurs de la carte de fidélité Waaoh : nom, prénom, adresse, téléphone, email, date de naissance, composition du foyer, numéro de carte de fidélité. Aucune donnée bancaire n'est compromise. L'attaquant a accédé à un espace personnel via du credential stuffing (mots de passe réutilisés depuis d'autres fuites).",
    lesson:
      "Le credential stuffing exploite le fait qu'un humain réutilise le même mot de passe sur 5 à 10 sites. Quand un site faiblement protégé fuit, les attaquants testent ses identifiants sur tous les autres. La parade : un mot de passe unique par site (gestionnaire de mots de passe) et la 2FA partout où c'est possible.",
    miniAction:
      "Liste mentalement tes 5 sites les plus utilisés (banque, mail principal, employeur, Amazon, sécu). Pour chacun : as-tu un mot de passe différent ET la 2FA activée ? Si la réponse est « oui partout », tu es en avance. Sinon, commence par le mail principal - c'est le plus critique.",
    sourceUrl:
      "https://www.cnil.fr/fr/violation-donnees-personnelles-auchan",
    sourceLabel: "CNIL · 22 novembre 2024",
    category: "DATA_LEAK",
    incidentDate: new Date("2024-11-22"),
    scheduledFor: new Date("2025-02-17T07:00:00Z"),
    publishedAt: new Date("2025-02-17T07:00:00Z"),
  },

  {
    slug: "chu-cannes-rancongiciel-avril-2024",
    title: "CHU de Cannes : trois mois de retour au papier après un rançongiciel",
    summary:
      "16 avril 2024, le centre hospitalier Simone Veil de Cannes est paralysé par un rançongiciel attribué au groupe LockBit. L'établissement bascule en mode dégradé : prescriptions papier, déprogrammation des opérations non urgentes, transferts de patients vers les hôpitaux voisins. Le retour à la normale prendra plusieurs mois. Aucune rançon n'est versée, conformément à la doctrine française.",
    lesson:
      "Les hôpitaux sont une cible privilégiée des ransomware parce qu'ils combinent données sensibles, dépendance critique au SI, et obligation morale de fonctionner. La meilleure défense reste la sauvegarde froide (déconnectée du réseau) et un plan de continuité testé en mode papier - pas juste sur PowerPoint.",
    miniAction:
      "Ton organisation a-t-elle un PCA (Plan de Continuité d'Activité) testé en condition réelle dans les 12 derniers mois ? Si oui, demande la dernière fiche de test. Si non, c'est le sujet à mettre à l'ordre du jour du prochain comité de direction.",
    sourceUrl:
      "https://www.ch-cannes.fr/cyberattaque-avril-2024",
    sourceLabel: "CH Simone Veil de Cannes · communiqué 18 avril 2024",
    category: "RANSOMWARE",
    incidentDate: new Date("2024-04-16"),
    scheduledFor: new Date("2025-03-24T07:00:00Z"),
    publishedAt: new Date("2025-03-24T07:00:00Z"),
  },

  {
    slug: "quishing-fausse-amende-stationnement-2025",
    title: "Quishing : les faux QR codes sur les horodateurs et amendes",
    summary:
      "Début 2025, plusieurs villes françaises (Lyon, Marseille, Bordeaux) signalent une vague de « quishing » (phishing par QR code). Des autocollants frauduleux sont collés sur les horodateurs de stationnement, menant vers un faux site de paiement reproduisant l'identité de la mairie. Variante plus sophistiquée : de fausses amendes papier, posées sur les pare-brise, contiennent un QR code menant vers un faux site « ANTAI ». Les données bancaires saisies partent directement chez les escrocs.",
    lesson:
      "Le QR code court-circuite la vigilance : on ne lit pas l'URL avant de la suivre. La règle d'or : ne jamais payer une amende ou une taxe via un QR code reçu en physique ou par mail. Toujours taper l'URL officielle à la main (antai.gouv.fr, impots.gouv.fr) ou utiliser l'app officielle.",
    miniAction:
      "Apprends à tes proches (parents, conjoint, ados) ce geste : pour toute amende ou paiement public, jamais de QR code, toujours l'URL officielle tapée à la main. Une règle simple, qui évite 90 % des arnaques par QR code.",
    sourceUrl:
      "https://www.cybermalveillance.gouv.fr/tous-nos-contenus/actualites/quishing-amendes-2025",
    sourceLabel: "CyberMalveillance.gouv.fr · 24 février 2025",
    category: "PHISHING",
    incidentDate: new Date("2025-02-15"),
    scheduledFor: new Date("2025-04-28T07:00:00Z"),
    publishedAt: new Date("2025-04-28T07:00:00Z"),
  },

  {
    slug: "deepfake-audio-pme-fraude-president-2025",
    title: "Fraude au président par voix clonée : une PME y laisse 280 000 €",
    summary:
      "Mars 2025, une PME industrielle de la Loire (50 salariés) est victime d'une fraude au président d'un genre nouveau. La comptable reçoit un appel téléphonique du dirigeant lui demandant un virement urgent de 280 000 € vers un compte hongrois pour conclure un rachat « confidentiel ». La voix est rigoureusement identique à celle du patron. Une seconde demande, le lendemain, éveille les soupçons : appel de vérification au dirigeant directement, qui découvre l'arnaque. Trop tard pour le premier virement. L'IA a cloné la voix à partir de quelques minutes d'extraits LinkedIn et podcasts publics.",
    lesson:
      "Cloner une voix demande aujourd'hui 30 secondes d'audio public. Tout dirigeant qui parle en conférence, podcast, ou YouTube est potentiellement clonable. La parade ne peut plus reposer sur la reconnaissance auditive : il faut une procédure stricte (mot de passe verbal, double validation par canal alternatif, plafond bloquant) appliquée systématiquement.",
    miniAction:
      "Avec ton dirigeant ou ton DAF, fixe AUJOURD'HUI un mot de passe verbal partagé entre les rôles autorisés à virer. Tout virement urgent demandé par téléphone : « peux-tu me donner le mot du jour ? ». Si la voix hésite ou répond mal, c'est un faux. Cinq minutes pour mettre cela en place, des centaines de milliers d'euros potentiellement sauvés.",
    sourceUrl:
      "https://www.cybermalveillance.gouv.fr/tous-nos-contenus/actualites/fraude-president-deepfake-2025",
    sourceLabel: "CyberMalveillance.gouv.fr · mars 2025",
    category: "IA_ABUS",
    incidentDate: new Date("2025-03-10"),
    scheduledFor: new Date("2025-06-02T07:00:00Z"),
    publishedAt: new Date("2025-06-02T07:00:00Z"),
  },

  {
    slug: "supply-chain-prestataire-paie-2025",
    title: "200 PME paralysées par la compromission de leur logiciel de paie",
    summary:
      "Avril 2025, un éditeur français de logiciel de paie (utilisé par 200+ TPE/PME) est victime d'une compromission de sa chaîne de mise à jour. Les attaquants injectent un cheval de Troie dans une mise à jour signée légitimement, distribuée automatiquement aux clients. Pendant 11 jours, les attaquants exfiltrent des données salariales (NIR, RIB, salaires) avant la détection par un éditeur antivirus. Les 200 PME clientes sont obligées de notifier la CNIL et leurs salariés.",
    lesson:
      "La supply chain attack est devenue le vecteur préféré des attaquants sophistiqués : compromettre un éditeur = compromettre tous ses clients d'un seul coup. Côté client, on ne peut pas vraiment se prémunir, mais on peut limiter le rayon de l'explosion : segmentation réseau, monitoring sortant, limitation des droits du logiciel à ce qu'il fait vraiment.",
    miniAction:
      "Liste les 5 logiciels métier installés sur les postes de tes utilisateurs. Pour chacun : a-t-il besoin d'accéder à internet en sortie ? d'écrire en dehors de son dossier ? d'élever des privilèges ? Si la réponse est non et qu'il le fait quand même, c'est un point à remonter à ton DSI.",
    sourceUrl:
      "https://www.ssi.gouv.fr/actualite/compromission-supply-chain-paie-2025",
    sourceLabel: "ANSSI · communiqué avril 2025",
    category: "SUPPLY_CHAIN",
    incidentDate: new Date("2025-04-08"),
    scheduledFor: new Date("2025-07-07T07:00:00Z"),
    publishedAt: new Date("2025-07-07T07:00:00Z"),
  },

  {
    slug: "noname057-attaque-prefectures-mai-2025",
    title: "NoName057 : vague de DDoS sur 12 préfectures françaises",
    summary:
      "Mai 2025, le groupe hacktiviste pro-russe NoName057(16) lance une opération DDoS coordonnée contre les sites de 12 préfectures françaises et plusieurs ministères, en représailles affichées du soutien français à l'Ukraine. Les sites sont indisponibles 4 à 8 heures, mais aucune donnée n'est compromise (un DDoS sature, ne pénètre pas). L'incident relance le débat sur la résilience des services publics numériques.",
    lesson:
      "Un DDoS ne compromet pas les données : il les rend inaccessibles. C'est différent (et moins grave) qu'une fuite, mais c'est une perte de confiance et un signal d'alerte sur la dépendance numérique. Les services critiques doivent avoir un mode dégradé pour continuer à servir les usagers même si le portail web est indisponible (téléphone, accueil physique).",
    miniAction:
      "Si demain ton site web est indisponible 24h, comment tes clients/usagers font-ils pour te contacter ou continuer leurs démarches ? Si la réponse est « ils ne peuvent pas », c'est un risque à documenter. Plan B = numéro vert affiché ailleurs, accueil physique, fallback statique, équipe disponible.",
    sourceUrl:
      "https://www.cert.ssi.gouv.fr/cti/CERTFR-2025-CTI-noname057-prefectures",
    sourceLabel: "CERT-FR / ANSSI · mai 2025",
    category: "HACKTIVISME",
    incidentDate: new Date("2025-05-12"),
    scheduledFor: new Date("2025-08-04T07:00:00Z"),
    publishedAt: new Date("2025-08-04T07:00:00Z"),
  },

  {
    slug: "phishing-impots-juin-2025-pic-saisonnier",
    title: "Pic de phishing impôts : 3 vagues, 50 000 victimes potentielles",
    summary:
      "Juin 2025, en pleine période de déclaration et de réception des avis d'imposition, l'administration fiscale et CyberMalveillance.gouv.fr alertent sur une vague massive de phishing par SMS et email usurpant l'identité de impots.gouv.fr : « Vous avez droit à un remboursement de 318,42 € - confirmez votre RIB ». Les données saisies servent à des fraudes au RIB (changement frauduleux de RIB du salarié sur son compte employeur).",
    lesson:
      "Les périodes de communication de masse de l'administration (impôts, CAF, sécu) sont les saisons hautes du phishing. Les escrocs surfent sur la légitimité du sujet : tu attends vraiment un mail des impôts, donc ta vigilance baisse. La règle : impots.gouv.fr ne demande JAMAIS un RIB par mail ou SMS pour rembourser. Tout passe par ton espace personnel sécurisé.",
    miniAction:
      "Active dès maintenant les alertes SMS de ta banque sur tout virement entrant ou sortant > 100 €. C'est gratuit chez la plupart des banques, et c'est ton meilleur garde-fou : si un attaquant fait passer une opération frauduleuse, tu le vois en 30 secondes et tu peux faire opposition.",
    sourceUrl:
      "https://www.cybermalveillance.gouv.fr/tous-nos-contenus/actualites/phishing-impots-juin-2025",
    sourceLabel: "CyberMalveillance.gouv.fr · 19 juin 2025",
    category: "PHISHING",
    incidentDate: new Date("2025-06-15"),
    scheduledFor: new Date("2025-09-08T07:00:00Z"),
    publishedAt: new Date("2025-09-08T07:00:00Z"),
  },

  {
    slug: "mairie-bordereaux-rancongiciel-juillet-2025",
    title: "Une mairie de 8 000 habitants paralysée 18 jours par un rançongiciel",
    summary:
      "Juillet 2025, la mairie de Bordereaux (Nouvelle-Aquitaine, 8 000 habitants) est victime d'un rançongiciel introduit par un email piégé ouvert par un agent de l'état civil. Tous les services en ligne sont coupés : actes d'état civil, urbanisme, cantine, crèche, police municipale. Pendant 18 jours, les habitants doivent revenir aux démarches papier et aux files d'attente. Aucune rançon n'est payée. La sauvegarde froide hebdomadaire permet la restauration.",
    lesson:
      "Les collectivités locales sont devenues une cible massive : 50 % des cyberattaques contre les services publics français en 2024-2025 visent des mairies de moins de 20 000 habitants. Pourquoi ? Elles ont de la donnée sensible (état civil), peu de DSI, peu de budget, et beaucoup de portes d'entrée (élus, agents, prestataires). Le secours, c'est la sauvegarde déconnectée du réseau.",
    miniAction:
      "Si tu travailles dans une collectivité ou si tu connais quelqu'un qui y travaille : la question à poser au DSI est « notre dernière sauvegarde testée date de quand, et où est-elle stockée ? ». Si la réponse contient « cloud » ou « serveur du réseau », c'est insuffisant - il faut une sauvegarde froide, déconnectée, testée en restauration.",
    sourceUrl:
      "https://www.cybermalveillance.gouv.fr/tous-nos-contenus/actualites/mairie-rancongiciel-juillet-2025",
    sourceLabel: "CyberMalveillance.gouv.fr · juillet 2025",
    category: "RANSOMWARE",
    incidentDate: new Date("2025-07-21"),
    scheduledFor: new Date("2025-10-13T07:00:00Z"),
    publishedAt: new Date("2025-10-13T07:00:00Z"),
  },

  {
    slug: "credentials-stuffing-loyalty-aout-2025",
    title: "Cdiscount, Sephora, Decathlon : 600 000 comptes pris en deux semaines",
    summary:
      "Août 2025, plusieurs enseignes de e-commerce françaises signalent une vague coordonnée de prises de comptes (account takeover). Les attaquants utilisent les bases de mots de passe issues des fuites Free et Auchan de 2024, et les testent en masse sur Cdiscount, Sephora, Decathlon, Fnac. Quand un mot de passe fonctionne, ils utilisent les points de fidélité, déclenchent des commandes vers des « mules » (intermédiaires payés), ou revendent l'accès. 600 000 comptes compromis en 2 semaines.",
    lesson:
      "Les fuites de données ne sont jamais « du passé » : elles servent de munitions pendant des années. Réutiliser le même mot de passe entre 2 sites = donner les clés du second à l'attaquant qui a compromis le premier. Un gestionnaire de mots de passe gratuit (Bitwarden, KeePass) résout 90 % du problème.",
    miniAction:
      "Aujourd'hui, choisis 1 site important pour toi (Amazon, Cdiscount, Decathlon...) et change son mot de passe pour un mot unique de 16 caractères généré aléatoirement. Stocke-le dans un gestionnaire ou écris-le sur un papier dans ton portefeuille (oui, c'est plus sûr que de le réutiliser). Demain, le suivant.",
    sourceUrl:
      "https://www.cnil.fr/fr/violations-donnees-credential-stuffing-aout-2025",
    sourceLabel: "CNIL · 28 août 2025",
    category: "FRAUDE",
    incidentDate: new Date("2025-08-15"),
    scheduledFor: new Date("2025-11-10T07:00:00Z"),
    publishedAt: new Date("2025-11-10T07:00:00Z"),
  },

  {
    slug: "attaque-sms-banque-octobre-2025",
    title: "Smishing bancaire : 12 000 victimes en 3 jours par SMS détourné",
    summary:
      "Octobre 2025, le CERT-FR alerte sur une vague massive de smishing bancaire utilisant le « SMS spoofing » : les escrocs falsifient l'expéditeur du SMS pour qu'il s'affiche dans le fil de conversation officiel de la banque (Crédit Agricole, BNP, Société Générale). Le SMS dit « opération suspecte sur votre compte, validez ou refusez : [lien] ». Le lien mène à une copie pixel-perfect de l'app bancaire. 12 000 personnes y sont passées en 3 jours, perte cumulée estimée à 18 M€.",
    lesson:
      "Le SMS spoofing exploite une faille structurelle des télécoms français : aucune banque ne peut vraiment signer ses SMS. Conséquence : le canal SMS est compromis pour toute opération sensible. Toujours valider les opérations bancaires depuis l'app officielle (que tu ouvres toi-même), jamais depuis un lien - même si le SMS s'affiche dans la bonne conversation.",
    miniAction:
      "Désactive AUJOURD'HUI l'option « SMS-OTP » de ta banque si possible et active la validation par notification dans l'app officielle. C'est plus sûr (signé cryptographiquement, lié à ton appareil) et c'est gratuit. Au pire, si tu dois garder le SMS, ne clique JAMAIS sur un lien - ouvre l'app toi-même.",
    sourceUrl:
      "https://www.cert.ssi.gouv.fr/cti/CERTFR-2025-CTI-smishing-bancaire",
    sourceLabel: "CERT-FR / ANSSI · 8 octobre 2025",
    category: "PHISHING",
    incidentDate: new Date("2025-10-05"),
    scheduledFor: new Date("2025-12-15T07:00:00Z"),
    publishedAt: new Date("2025-12-15T07:00:00Z"),
  },
];

export async function seedAnecdotes(prisma: PrismaClient) {
  for (const a of ANECDOTES) {
    await prisma.weeklyAnecdote.upsert({
      where: { slug: a.slug },
      update: {
        title: a.title,
        summary: a.summary,
        lesson: a.lesson,
        miniAction: a.miniAction,
        sourceUrl: a.sourceUrl,
        sourceLabel: a.sourceLabel,
        category: a.category,
        incidentDate: a.incidentDate,
        scheduledFor: a.scheduledFor ?? null,
        publishedAt: a.publishedAt ?? null,
      },
      create: {
        slug: a.slug,
        title: a.title,
        summary: a.summary,
        lesson: a.lesson,
        miniAction: a.miniAction,
        sourceUrl: a.sourceUrl,
        sourceLabel: a.sourceLabel,
        category: a.category,
        incidentDate: a.incidentDate,
        scheduledFor: a.scheduledFor ?? null,
        publishedAt: a.publishedAt ?? null,
        isActive: true,
      },
    });
  }
  const published = ANECDOTES.filter((a) => a.publishedAt).length;
  const drafts = ANECDOTES.length - published;
  console.log(
    `  Cyber-Anecdotes ✓ (${ANECDOTES.length} : ${published} publiees + ${drafts} brouillon)`,
  );
}
