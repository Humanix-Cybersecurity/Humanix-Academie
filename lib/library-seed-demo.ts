// SPDX-License-Identifier: AGPL-3.0-or-later
//
// LIBRARY_ARTICLES_DEMO - 5 articles cyber-RH livres en open source dans
// le repo public, sous licence CC BY-SA 4.0 (sources : ANSSI, CERT-FR,
// CNIL, NIST publications publiques).
//
// USAGE : seeding d'une instance en mode DEMO ou d'un fork OSS pur.
// La librairie complete (30+ articles persona-specifiques, IA, deepfakes,
// fraude au president, NIS2, etc.) reste dans le repo prive
// content-pro/lib/library-seed.ts.
//
// Cf. prisma/seed-data-loader.ts -> loadLibraryArticles() qui bascule
// sur ce catalogue quand DEMO_MODE=true.

import type { LibraryArticleSeed } from "./library-seed-types";

export const LIBRARY_ARTICLES_DEMO: LibraryArticleSeed[] = [
  {
    slug: "demo-3-reflexes-phishing",
    title: "Les 3 réflexes face à un email suspect",
    description:
      "Vérifier, résister, signaler : trois gestes simples qui neutralisent 90 % des tentatives de phishing.",
    emoji: "🎣",
    category: "phishing",
    audience: "tous",
    readTimeMinutes: 5,
    authorName: "Humanix Académie · CC BY-SA",
    body: `# 1. Vérifier le domaine, pas le nom affiché

Un email frauduleux peut afficher "Microsoft" en expéditeur tout en venant de \`microsft-support@xyz.com\`. Le **nom affiché** est trivial à falsifier - seul le **domaine** compte.

Avant de cliquer sur quoi que ce soit, regarde l'adresse complète : sur ordinateur, survole l'expéditeur ; sur mobile, tape dessus pour la dérouler. Si le domaine ne correspond pas à l'organisation prétendue, c'est suspect.

# 2. Résister au levier d'urgence

Les escrocs ont une arme universelle : la pression du temps. "Vous avez 24h", "votre compte sera bloqué", "votre commande est en attente"... C'est conçu pour court-circuiter ta réflexion.

La règle d'or : **plus c'est urgent, plus c'est suspect**. Une vraie banque, une vraie administration, un vrai service ne te bousculera jamais par email. Pose le téléphone, prends 5 minutes, vérifie par un autre canal (site officiel, numéro habituel).

# 3. Signaler, ne pas se contenter de supprimer

Quand tu reçois un phishing, ne le jette pas - signale-le. C'est gratuit et ça protège les autres :

- **Phishing classique** : fais suivre à \`signal-spam@signal-spam.fr\` ou utilise [signalspam.fr](https://www.signal-spam.fr).
- **SMS frauduleux** : transfère au **33700** (gratuit).
- **En entreprise** : remonte à ton service IT ou au RSSI - même si tu n'as pas cliqué, l'attaque cible peut-être tes collègues.

# À retenir

Vérifier le domaine. Ralentir face à l'urgence. Signaler systématiquement. Ces 3 réflexes coûtent 30 secondes et évitent l'écrasante majorité des arnaques.

> Source : recommandations publiques ANSSI / CERT-FR, sous licence ouverte.`,
  },
  {
    slug: "demo-mot-de-passe-sans-galere",
    title: "Choisir un bon mot de passe sans devenir fou",
    description:
      "Phrase de passe, gestionnaire, double authentification : la méthode pratique qui marche en vrai.",
    emoji: "🔑",
    category: "mots-de-passe",
    audience: "tous",
    readTimeMinutes: 6,
    authorName: "Humanix Académie · CC BY-SA",
    body: `# Le problème : impossible d'en retenir 100

L'utilisateur moyen a une centaine de comptes en ligne. Personne ne peut mémoriser 100 mots de passe forts et **uniques**. Il faut donc une méthode - pas une mémoire de génie.

# La méthode en 3 étapes

## 1. Une phrase de passe, pas un mot de passe

Oublie \`P@ssw0rd!\` qui se craque en 2 secondes. Choisis une **phrase** longue mais simple à retenir :

> "MonChatRoux-Mange-15Croquettes!"

Longue (28 caractères), facile à taper, impossible à deviner. C'est le mot de passe que tu mémorises pour **un seul endroit** : ton gestionnaire.

## 2. Un gestionnaire pour le reste

Un gestionnaire de mots de passe (Bitwarden, KeePass, 1Password, ProtonPass...) fait 3 choses :

- Génère des mots de passe aléatoires uniques pour chaque site.
- Les retient à ta place, chiffrés localement.
- Les remplit automatiquement quand tu te connectes.

**Bitwarden** est gratuit, open source, audité. Recommandé par l'ANSSI. Tu installes l'app, tu choisis ta phrase de passe maître, tu y mets tout le reste. Voilà.

## 3. La double authentification partout où c'est possible

Sur les comptes critiques (email, banque, gestionnaire de mdp), active la 2FA. Même si quelqu'un vole ton mot de passe, il lui manquera le code généré par ton téléphone. C'est le pare-feu le plus rentable que tu installeras cette année.

# Et si je perds mon téléphone ?

À chaque activation 2FA, on te propose des **codes de secours** (8-10 codes à usage unique). Imprime-les, garde-les dans un endroit sûr (coffre, classeur fermé). Si tu perds ton téléphone, ces codes te débloquent.

# À retenir

Une phrase pour le gestionnaire. Le gestionnaire pour tous les autres comptes. 2FA sur ce qui compte. C'est tout.

> Source : recommandations publiques ANSSI, CNIL, NIST SP 800-63B.`,
  },
  {
    slug: "demo-wifi-public-piege",
    title: "Le Wi-Fi public, ce piège élégant",
    description:
      "Aéroport, hôtel, café : pourquoi ces réseaux gratuits coûtent cher, et comment s'en sortir en 30 secondes.",
    emoji: "📶",
    category: "mobilite",
    audience: "tous",
    readTimeMinutes: 5,
    authorName: "Humanix Académie · CC BY-SA",
    body: `# Le scénario qui pourrit la vie

Tu es à l'aéroport. Tu vois "Free-Airport-WiFi". Tu te connectes. Tu consultes ta banque, ton mail pro, tu paies un truc.

Sauf que "Free-Airport-WiFi" a été créé il y a 5 minutes par un type avec un boîtier à 80 € dans son sac. Tout ce qui passe par ce réseau, il le voit.

C'est ce qu'on appelle un **point d'accès pirate** (rogue AP). Très facile à faire, indétectable pour la victime.

# Les 3 règles qui te protègent

## Règle 1 : Ne fais rien de sensible sur un Wi-Fi public

Pas de banque, pas de mails pro, pas d'achats en ligne. Si tu dois absolument le faire, utilise la 4G/5G de ton téléphone - c'est chiffré nativement par l'opérateur.

## Règle 2 : Utilise un VPN si tu n'as pas le choix

Un VPN (Proton VPN, Mullvad, etc.) chiffre tout ce qui sort de ton appareil. Même connecté au pire Wi-Fi du monde, l'attaquant ne voit que des données illisibles.

Gratuit ou payant, peu importe : l'essentiel est qu'il soit **toujours activé** quand tu es sur un Wi-Fi inconnu.

## Règle 3 : Désactive la connexion automatique

Par défaut, ton téléphone se reconnecte tout seul à n'importe quel réseau au nom familier. Un attaquant peut créer un faux "FreeWifi_Hotel_X" et te capturer sans que tu t'en rendes compte.

Dans les réglages Wi-Fi : "Oublier le réseau" pour tous les hotspots publics que tu as utilisés.

# Le partage de connexion : la vraie solution

Activer le partage de connexion (4G/5G) de ton smartphone est **plus sûr** que n'importe quel Wi-Fi public. Tu paies un peu de data, mais tu es chez toi sur ton réseau opérateur.

# À retenir

Wi-Fi public = canal hostile. VPN ou 4G pour tout ce qui compte. Connexion automatique désactivée. Trois minutes de réglages te protègent à vie.

> Source : recommandations publiques ANSSI, CERT-FR.`,
  },
  {
    slug: "demo-sauvegarder-photos-famille",
    title: "Sauvegarder ses photos de famille (sans s'arracher les cheveux)",
    description:
      "La règle 3-2-1, expliquée comme à un proche : 3 copies, 2 supports, 1 hors-site.",
    emoji: "📸",
    category: "sauvegardes",
    audience: "famille",
    readTimeMinutes: 7,
    authorName: "Humanix Académie · CC BY-SA",
    body: `# Pourquoi c'est urgent

Les photos qu'on prend tous les jours sont sur 1 seul appareil. S'il tombe à l'eau, s'il est volé, s'il est chiffré par un rançongiciel, ou si tu le perds dans le métro - c'est fini. 10 ans de famille perdus en 3 secondes.

Et pourtant, sauvegarder, c'est gratuit ou presque, et ça prend une heure à mettre en place pour toute une vie.

# La règle 3-2-1 (recommandée par l'ANSSI)

**3 copies** de ce qui compte, sur **2 supports différents**, dont **1 hors site** (chez quelqu'un, chez toi mais déconnecté, ou dans le cloud).

## Application concrète pour une famille

- **Copie 1** : sur ton téléphone / ordi (l'original).
- **Copie 2** : sur un disque dur externe à 50 €, chez toi. Branchement mensuel, copie tout, débranchement (un disque branché en permanence peut être chiffré par un rançongiciel).
- **Copie 3** : sur un service cloud (iCloud, Google Photos, Proton Drive, pCloud). Choisis-en un, paie l'abonnement (3-5 €/mois pour 200 Go), et active la synchro automatique.

# Et la confidentialité ?

Si tu n'es pas à l'aise avec Google ou Apple sur tes photos privées :

- **Proton Drive** (Suisse, chiffré côté client) : tes photos sont illisibles même pour Proton.
- **pCloud Crypto** : option crypto qui chiffre un dossier de bout en bout.
- **Disque dur externe chez un proche** : faible coût, contrôle total. Tu lui donnes un disque chiffré (VeraCrypt, gratuit) tous les 3 mois.

# La méthode du dimanche soir

Une fois par mois, 15 minutes :

1. Branche le disque dur externe.
2. Copie/synchronise les nouvelles photos.
3. Vérifie que le cloud est à jour.
4. Débranche le disque.
5. Range-le.

C'est tout. Une heure par an. Une vie de souvenirs.

# Que faire si tu as déjà tout perdu ?

Si c'est un téléphone récent, la synchro cloud (iCloud, Google Photos) avait peut-être déjà sauvé une partie. Connecte-toi sur le service depuis un autre appareil.

Si tout est perdu : c'est une dure leçon. Mets en place la règle 3-2-1 **maintenant**, pour les photos à venir.

> Source : guide ANSSI "Bonnes pratiques de sauvegarde" + recommandations CERT-FR.`,
  },
  {
    slug: "demo-verifier-fuite-haveibeenpwned",
    title: "Vérifier si tes comptes ont déjà fuité",
    description:
      "Un outil gratuit, 30 secondes, et tu sais quels mots de passe tu dois changer en priorité.",
    emoji: "🔍",
    category: "fuites-de-donnees",
    audience: "tous",
    readTimeMinutes: 4,
    authorName: "Humanix Académie · CC BY-SA",
    body: `# Le problème invisible

Chaque année, des dizaines de milliards d'identifiants fuitent dans la nature : LinkedIn (700M), Dropbox (68M), Adobe (153M), Yahoo (3 milliards)... La probabilité qu'au moins UN de tes mots de passe traîne quelque part est très élevée.

Si tu réutilises ce mot de passe ailleurs, un attaquant peut le tester en masse sur tous les services (Netflix, Amazon, ta banque...). C'est ce qu'on appelle le **credential stuffing**.

# L'outil de référence : Have I Been Pwned

[haveibeenpwned.com](https://haveibeenpwned.com) est un service gratuit, créé par Troy Hunt (expert reconnu, ancien Microsoft). Il agrège les fuites publiques et te dit si ton email apparaît dedans.

C'est sérieux : utilisé par les gouvernements, le FBI, l'ANSSI, et intégré nativement dans Firefox, Chrome, et 1Password.

# Comment l'utiliser en 30 secondes

1. Va sur [haveibeenpwned.com](https://haveibeenpwned.com).
2. Tape ton adresse email principale.
3. Clique "pwned?".
4. Lis le verdict.

Si c'est vert : aucune fuite connue. Continue à faire attention.

Si c'est rouge : ton email apparaît dans X fuites. La liste te dit lesquelles (LinkedIn 2012, Adobe 2013, etc.) - change immédiatement le mot de passe sur ces services, et **partout où tu l'as réutilisé**.

# L'alerte automatique (gratuite)

Plutôt que de vérifier tous les 6 mois, abonne-toi aux **notifications** : tu mets ton email, tu confirmes (lien dans le mail), et tu seras prévenu à la prochaine fuite contenant ton adresse. Zéro effort, zéro spam.

# Pourquoi c'est sûr de mettre son email là

Have I Been Pwned ne te demande **jamais ton mot de passe**. Il vérifie uniquement si ton email est dans des bases qui sont déjà publiques (souvent depuis des années, sur des forums underground). Mettre ton email là ne crée aucun risque supplémentaire - l'attaquant l'a déjà.

# À retenir

Vérifier ses emails 1 fois. S'abonner aux alertes. Changer les mots de passe compromis. 3 minutes pour reprendre le contrôle.

> Source : Have I Been Pwned est cité par l'ANSSI dans ses recommandations grand public.`,
  },
  // -----------------------------------------------------------------------------
  // SERIE "MAITRISE DE L'IA EN FAMILLE" (mai 2026)
  // Ajout post-launch suite au feedback Digital 113 Members Day : grosse
  // demande grand public pour comprendre l'IA generative sans alarmisme.
  // 3 articles pour les 3 publics famille : seniors, ados, victimes deepfake.
  // -----------------------------------------------------------------------------
  {
    slug: "demo-mamie-chatgpt-pas-google",
    title: "Mamie, ChatGPT n'est pas Google",
    description:
      "ChatGPT donne des réponses fluides mais peut inventer. La méthode douce pour expliquer la différence à un proche senior.",
    emoji: "👵",
    category: "ia",
    audience: "famille",
    readTimeMinutes: 6,
    authorName: "Humanix Académie · CC BY-SA",
    body: `# Le malentendu de départ

Quand Mamie tape une question dans Google, elle obtient une liste de sites. Elle clique, elle lit, elle compare. C'est lent mais elle a appris : on vérifie sur 2-3 sources avant de croire.

Quand Mamie tape la même question dans ChatGPT, elle obtient **une seule réponse**, rédigée comme si c'était évident, sans aucun lien. Le ton est confiant. Le texte est bien écrit. **Pourtant, ChatGPT peut tout simplement inventer** - un médicament, une date, une procédure, une loi.

C'est ce qu'on appelle une **hallucination**. Et c'est très différent d'une erreur Google : sur Google, l'info fausse est sur UN site qu'on peut identifier. Avec ChatGPT, l'info fausse arrive sans source, mélangée à des infos vraies, impossible à distinguer.

# Les 3 cas réels documentés en 2025

- **Faux médicaments** : une étude américaine a montré que ChatGPT recommandait, dans 27 % des cas testés, des dosages dangereux ou des interactions médicamenteuses inexistantes - toujours formulés avec aplomb.
- **Faux articles juridiques** : un avocat new-yorkais a déposé en cour des références à 6 jugements... qui n'existaient pas. ChatGPT les avait fabriqués. Sanction disciplinaire à la clé.
- **Faux historique de famille** : des utilisateurs demandent à ChatGPT "qui était mon grand-père" et reçoivent des biographies inventées de toutes pièces, parce que ChatGPT "complète" l'absence de données.

# Comment expliquer ça à Mamie sans la décourager

Pas la peine de dire "ChatGPT ment" - elle ne l'utilisera plus du tout, et c'est dommage parce que ça reste un bon outil pour reformuler une lettre, traduire, ou expliquer un mot. La bonne formule est :

> *"ChatGPT, c'est comme un voisin très bavard qui a lu beaucoup de livres. Il te répond toujours avec assurance, mais parfois il invente parce qu'il ne veut pas dire 'je ne sais pas'. Pour tout ce qui est important - santé, banque, juridique, identité - il faut toujours vérifier sur un vrai site officiel."*

# La règle "3 cas où on ne fait JAMAIS confiance"

1. **Santé** : symptômes, médicaments, dosages → toujours médecin ou pharmacien.
2. **Argent** : virements, impôts, succession → toujours sa banque, son notaire, le site impots.gouv.fr.
3. **Démarches administratives** : papiers, droits sociaux → toujours service-public.fr ou la mairie.

Pour tout le reste - recettes, idées de cadeau, reformuler une lettre, comprendre un mot - ChatGPT est OK, à condition de garder son bon sens.

# À retenir

ChatGPT n'est pas un moteur de recherche : c'est un assistant qui peut inventer avec assurance. La règle simple à transmettre : **santé, argent, papiers → JAMAIS ChatGPT seul, toujours vérifier sur une source officielle**.

> Source : Stanford HAI 2025 "Hallucination Rates in Consumer LLMs", étude Mata vs Avianca (cas réel 2023, sanction 2024).`,
  },
  {
    slug: "demo-ado-chatgpt-devoirs",
    title: "Quand ton ado utilise ChatGPT pour ses devoirs",
    description:
      "Interdire est inutile et contre-productif. Encadrer pour qu'il apprenne à utiliser l'IA sans déléguer son cerveau.",
    emoji: "🎓",
    category: "ia",
    audience: "famille",
    readTimeMinutes: 7,
    authorName: "Humanix Académie · CC BY-SA",
    body: `# La mauvaise question : "Comment l'empêcher ?"

D'abord, c'est impossible. Tous les ados (et la plupart des collégiens) utilisent déjà ChatGPT, Claude ou Gemini pour leurs devoirs. C'est aussi inutile à interdire que la calculatrice en 1990.

La bonne question est : **comment lui apprendre à s'en servir comme un assistant, pas comme une béquille** ? Parce que l'enjeu n'est pas la note du contrôle, c'est de continuer à muscler son cerveau.

# Le vrai risque : l'atrophie cognitive

Une étude du MIT Media Lab (2025, *"Your Brain on ChatGPT"*) a mesuré l'activité cérébrale de jeunes utilisateurs pendant une rédaction. Résultat : **chez ceux qui utilisent ChatGPT pour rédiger, l'activité dans les zones du raisonnement diminue mesurablement**. Plus inquiétant : cette baisse **persiste** plusieurs jours après l'arrêt de l'outil.

En clair : si ton ado fait rédiger tous ses devoirs par ChatGPT, **il perd progressivement la capacité à structurer une pensée par lui-même**. C'est l'équivalent intellectuel de ne plus jamais marcher parce qu'on a une voiture.

# La méthode "3 niveaux d'usage" à proposer

**Niveau 0 - Devoir simple (apprentissage des bases)** : pas de ChatGPT.
- Exercices de math, conjugaison, vocabulaire, mémorisation : c'est exactement ce qui muscle.
- ChatGPT à ce niveau = ne plus marcher quand on apprend à marcher.

**Niveau 1 - Devoir long (rédaction, dissertation)** : ChatGPT comme correcteur, pas comme rédacteur.
- Ton ado écrit son brouillon SEUL. Puis demande à ChatGPT : *"Cite-moi 3 fautes de structure dans ce texte sans réécrire"*.
- ChatGPT pointe les problèmes, ton ado les corrige LUI.
- Il apprend la méta-cognition : *"je me rends compte que ma structure est faible"*.

**Niveau 2 - Recherche complexe** : ChatGPT comme starter, pas comme conclusion.
- "ChatGPT, donne-moi 5 angles pour traiter ce sujet de philo."
- Ton ado choisit 1 angle, fait ses propres recherches (Wikipédia, manuels, prof), construit son argumentation.
- ChatGPT a juste été un brainstorming.

# Les 3 phrases magiques à apprendre

À chaque fois que ton ado utilise ChatGPT, il doit pouvoir répondre OUI à ces 3 questions :

1. **"Est-ce que j'ai compris ce que je viens de produire ?"** Si non, c'est ChatGPT qui a fait le devoir, pas lui.
2. **"Est-ce que je pourrais le réexpliquer sans ChatGPT, dans 1 semaine ?"** C'est le vrai test d'apprentissage.
3. **"Si le prof me pose une question orale, je sais répondre ?"** C'est l'épreuve de vérité au lycée et en supérieur.

# L'angle parent (sans devenir le flic)

Au lieu de surveiller ses sessions ChatGPT (impossible et destructeur de confiance), demande-lui simplement :

> *"Tu as utilisé ChatGPT pour ce devoir ? OK. Tu peux m'expliquer en 30 secondes ce que tu as appris avec ?"*

S'il bafouille, le devoir est creux. S'il explique clairement, il a vraiment appris - peu importe qu'il ait utilisé ChatGPT ou pas.

# À retenir

ChatGPT est là pour rester. Interdire = perdre. La méthode qui marche : **3 niveaux d'usage (jamais, correcteur, starter)** + **3 questions de contrôle** que ton ado apprend à se poser tout seul. L'objectif n'est pas la note, c'est de garder un cerveau qui fonctionne sans l'outil.

> Source : MIT Media Lab "Your Brain on ChatGPT" (2025), Stanford HAI "Cognitive Offloading at Scale" (2025).`,
  },
  {
    slug: "demo-proche-victime-deepfake",
    title: "Mon proche est tombé pour un deepfake - comment réagir",
    description:
      "Reconnaître un deepfake vocal ou vidéo, désamorcer le moment de panique, et accompagner sans culpabiliser.",
    emoji: "🎭",
    category: "ia",
    audience: "famille",
    readTimeMinutes: 6,
    authorName: "Humanix Académie · CC BY-SA",
    body: `# Le nouveau visage des arnaques

Avant, l'arnaque au "neveu en détresse" passait par un appel anonyme avec une voix étouffée. C'était grossier, beaucoup raccrochaient.

Aujourd'hui, **3 secondes d'audio suffisent** à un outil d'IA grand public pour cloner la voix de n'importe qui. Un escroc qui récupère un message vocal Facebook ou Instagram de ton fils peut, dans la même journée, t'appeler en imitant parfaitement sa voix, avec ses tics de langage, son ton, son rythme. La détection à l'oreille est devenue presque impossible.

Idem pour la vidéo : un appel WhatsApp de 30 secondes avec l'image de quelqu'un, et un attaquant peut générer une vidéo crédible où cette personne "demande" un virement urgent.

# Si c'est arrivé : les 3 priorités, dans cet ordre

**Priorité 1 - Ne pas culpabiliser le proche**

C'est le plus important. Une victime de deepfake se sent souvent "ridicule" alors qu'elle ne l'est pas du tout : ces outils trompent même des experts en cybersécurité. Si tu lui dis *"tu aurais dû te méfier"*, tu casses la confiance et tu l'isoles. Au contraire :

> *"Ce qui t'est arrivé arrive à des centaines de personnes par mois, y compris des PDG et des banquiers. Les outils sont devenus indétectables. Tu n'es pas naïf - tu es la première vague d'une nouvelle escroquerie."*

**Priorité 2 - Geler l'argent si virement parti**

Si un virement bancaire a été effectué dans les **dernières 24-72h** :
1. Appeler immédiatement la banque (numéro au dos de la carte) pour demander un **rappel de virement** (procédure SEPA recall). Plus tu agis vite, plus tu as de chances.
2. Déposer plainte en gendarmerie ou commissariat - c'est obligatoire pour la suite (assurance, fiscalité, démarches bancaires).
3. Signaler sur [cybermalveillance.gouv.fr](https://www.cybermalveillance.gouv.fr) - service public gratuit, ils orientent et accompagnent.

**Priorité 3 - Sécuriser pour la suite**

L'escroc a utilisé un échantillon de voix/vidéo qui existe quelque part. Aide ton proche à :
- Passer ses comptes Facebook, Instagram, TikTok en privé (ses messages vocaux ne doivent plus être accessibles aux inconnus).
- Activer la double authentification sur tous ses comptes.
- Convenir d'un **mot de passe familial** (un mot anodin que seuls les proches connaissent) à demander en cas d'appel suspect. *"Maman, c'est moi, le code c'est quoi ?"* - si l'appelant ne sait pas, c'est un deepfake.

# Comment reconnaître un deepfake AVANT de tomber

C'est de plus en plus difficile, mais voici les signaux d'alarme actuels (qui disparaîtront dans 2-3 ans) :

- **Vocal** : voix légèrement "trop fluide", rythme régulier sans pause naturelle, intonations un peu mécaniques sur les fins de phrase. Si la personne parle vite et sans respirer, demande-lui de chuchoter ou de répéter une phrase précise - les deepfakes basiques ratent souvent ces variations.
- **Vidéo** : clignements d'yeux anormaux (trop rares ou trop réguliers), peau du cou qui ne bouge pas en cohérence avec la mâchoire, éclairage incohérent entre visage et arrière-plan.
- **Comportemental** : urgence extrême + demande financière + interdiction de raccrocher = combo classique. Une vraie urgence familiale n'empêche jamais de raccrocher pour rappeler depuis le numéro habituel.

# La règle d'or à transmettre

> **Si on te demande de l'argent par téléphone, même de ton fils, même de ton patron, même de ta banque : raccroche et rappelle depuis le numéro habituel.** Toujours. Sans exception. Pas négociable.

C'est le seul réflexe qui marche à 100 % contre les deepfakes vocaux et vidéo.

# À retenir

Le deepfake est une arnaque industrielle, pas une faille personnelle. Ne pas culpabiliser. Geler l'argent vite. Sécuriser les comptes. Apprendre le réflexe "raccrocher et rappeler". Ces 4 réactions sauvent.

> Source : ANSSI alerte mars 2025 "Augmentation des fraudes par clonage vocal IA", Cybermalveillance.gouv.fr rapport annuel 2025.`,
  },
];
