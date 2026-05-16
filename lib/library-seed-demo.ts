// SPDX-License-Identifier: AGPL-3.0-or-later
//
// LIBRARY_ARTICLES_DEMO — 5 articles cyber-RH livres en open source dans
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

Un email frauduleux peut afficher "Microsoft" en expéditeur tout en venant de \`microsft-support@xyz.com\`. Le **nom affiché** est trivial à falsifier — seul le **domaine** compte.

Avant de cliquer sur quoi que ce soit, regarde l'adresse complète : sur ordinateur, survole l'expéditeur ; sur mobile, tape dessus pour la dérouler. Si le domaine ne correspond pas à l'organisation prétendue, c'est suspect.

# 2. Résister au levier d'urgence

Les escrocs ont une arme universelle : la pression du temps. "Vous avez 24h", "votre compte sera bloqué", "votre commande est en attente"... C'est conçu pour court-circuiter ta réflexion.

La règle d'or : **plus c'est urgent, plus c'est suspect**. Une vraie banque, une vraie administration, un vrai service ne te bousculera jamais par email. Pose le téléphone, prends 5 minutes, vérifie par un autre canal (site officiel, numéro habituel).

# 3. Signaler, ne pas se contenter de supprimer

Quand tu reçois un phishing, ne le jette pas — signale-le. C'est gratuit et ça protège les autres :

- **Phishing classique** : fais suivre à \`signal-spam@signal-spam.fr\` ou utilise [signalspam.fr](https://www.signal-spam.fr).
- **SMS frauduleux** : transfère au **33700** (gratuit).
- **En entreprise** : remonte à ton service IT ou au RSSI — même si tu n'as pas cliqué, l'attaque cible peut-être tes collègues.

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

L'utilisateur moyen a une centaine de comptes en ligne. Personne ne peut mémoriser 100 mots de passe forts et **uniques**. Il faut donc une méthode — pas une mémoire de génie.

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

Pas de banque, pas de mails pro, pas d'achats en ligne. Si tu dois absolument le faire, utilise la 4G/5G de ton téléphone — c'est chiffré nativement par l'opérateur.

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

Les photos qu'on prend tous les jours sont sur 1 seul appareil. S'il tombe à l'eau, s'il est volé, s'il est chiffré par un rançongiciel, ou si tu le perds dans le métro — c'est fini. 10 ans de famille perdus en 3 secondes.

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

Si c'est rouge : ton email apparaît dans X fuites. La liste te dit lesquelles (LinkedIn 2012, Adobe 2013, etc.) — change immédiatement le mot de passe sur ces services, et **partout où tu l'as réutilisé**.

# L'alerte automatique (gratuite)

Plutôt que de vérifier tous les 6 mois, abonne-toi aux **notifications** : tu mets ton email, tu confirmes (lien dans le mail), et tu seras prévenu à la prochaine fuite contenant ton adresse. Zéro effort, zéro spam.

# Pourquoi c'est sûr de mettre son email là

Have I Been Pwned ne te demande **jamais ton mot de passe**. Il vérifie uniquement si ton email est dans des bases qui sont déjà publiques (souvent depuis des années, sur des forums underground). Mettre ton email là ne crée aucun risque supplémentaire — l'attaquant l'a déjà.

# À retenir

Vérifier ses emails 1 fois. S'abonner aux alertes. Changer les mots de passe compromis. 3 minutes pour reprendre le contrôle.

> Source : Have I Been Pwned est cité par l'ANSSI dans ses recommandations grand public.`,
  },
];
