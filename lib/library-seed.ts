// Articles de micro-learning pre-rediges (seed)
// Texte plein en markdown LIGHT (juste paragraphes et puces) — pas de HTML.
export type LibraryArticleSeed = {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  category: string;
  audience: "pro" | "tous" | "famille";
  readTimeMinutes: number;
  authorName: string;
  body: string; // markdown plain
};

export const LIBRARY_ARTICLES: LibraryArticleSeed[] = [
  {
    slug: "mfa-en-10-minutes",
    title: "Le MFA en 10 minutes",
    description: "Comprendre et activer la double authentification sur tes outils du quotidien — sans rien casser.",
    emoji: "🔐",
    category: "mots-de-passe",
    readTimeMinutes: 10,
    audience: "tous",
    authorName: "Humanix",
    body: `# Le MFA, c'est quoi ?

MFA = Multi-Factor Authentication. En français : double authentification, ou "le truc qui demande un code après le mot de passe".

Concrètement, pour te connecter, il te faut deux choses au lieu d'une :
- Quelque chose que tu **sais** (ton mot de passe).
- Quelque chose que tu **as** (ton téléphone, une clé physique, une app dédiée).

Si un attaquant a ton mot de passe, il lui manque le second facteur. C'est la différence entre porte fermée à clé, et porte fermée à clé + serrure de sécurité.

# Pourquoi c'est non négociable

Plus de 95 % des attaques réussies sur des comptes M365 ou Google ont un point commun : le MFA n'était pas activé. Microsoft elle-même publie ce chiffre. Activer le MFA ne supprime pas tous les risques, mais il neutralise le scénario le plus courant : le vol de mot de passe.

# Les types de MFA, du moins bon au meilleur

- **SMS** : un code arrive par texto. Mieux que rien, mais le SIM swap (l'attaquant fait transférer ton numéro) le rend contournable.
- **App authenticator** (Microsoft Authenticator, Google Authenticator, Authy) : un code à 6 chiffres généré toutes les 30 secondes. Solide, gratuit, recommandé.
- **Notification push** : ton app demande "c'est bien toi ?", tu approuves. Très bonne expérience.
- **Clé physique FIDO2** (YubiKey) : un objet physique branché en USB ou NFC. Inviolable contre le phishing. Le top.

# Activer le MFA en 5 minutes — Microsoft 365

1. Va sur https://aka.ms/mfasetup
2. Choisis "Microsoft Authenticator".
3. Installe l'app sur ton smartphone (App Store / Play Store).
4. Scanne le QR code que Microsoft te montre.
5. Valide une notification de test.
6. C'est fini.

# Activer le MFA en 5 minutes — Google

1. Va sur https://myaccount.google.com/security
2. Active "Validation en deux étapes".
3. Suis les instructions (téléphone, app, ou clé).

# Et si je perds mon téléphone ?

Au moment de l'activation, tu reçois ou tu génères des **codes de récupération** (8 à 10 codes à usage unique). Imprime-les, range-les dans ton coffre, ou colle-les dans un gestionnaire de mots de passe sécurisé. Si tu perds ton téléphone, ces codes te débloquent.

# Le réflexe à graver

Sur tous les services qui tiennent un peu : MFA activé, sans exception. Mail pro, mail perso, banque, réseaux sociaux, outils SaaS. Ça te prend 2 minutes par service. C'est probablement le geste cyber au plus haut ROI que tu feras cette année.`,
  },
  {
    slug: "reflexes-pour-ma-grand-mere",
    title: "Les réflexes cyber pour ma grand-mère",
    description: "5 règles d'or qu'on peut expliquer à n'importe qui en 5 minutes — sans aucun jargon.",
    emoji: "👵",
    category: "grand-public",
    readTimeMinutes: 6,
    audience: "famille",
    authorName: "Humanix",
    body: `# La cyber, sans jargon

Tu connais quelqu'un qui n'est pas à l'aise avec l'informatique ? Voici 5 règles à lui transmettre. Pas de "MFA", pas de "VPN", juste du français.

# Règle 1 — Si c'est urgent, c'est suspect

Quand un message dit "agis vite" ou "tu n'as que 24h", ralentis. Les vrais services importants (ta banque, l'État, La Poste) ne te mettent **jamais** la pression par mail. Si on te bouscule, c'est parce qu'on veut t'empêcher de réfléchir.

# Règle 2 — Si on te demande un mot de passe ou un code, NON

Personne — ni ta banque, ni Microsoft, ni Apple, ni un "technicien" qui appelle — n'a le droit de te demander ton mot de passe ou ton code reçu par SMS. Si quelqu'un te le demande, c'est forcément un escroc. Sans exception.

# Règle 3 — Si c'est trop beau pour être vrai, c'est faux

Tu as gagné un iPhone alors que tu n'as rien tenté ? Une "fortune" t'attend en Afrique ? Quelqu'un veut te louer son appart à Paris pour 300 € ? Non.

# Règle 4 — Vérifier, c'est jamais grossier

Reçu un mail bizarre de ta banque ? Ne réponds pas. Ferme le mail. Appelle ta banque sur son numéro habituel (celui sur ta carte bancaire, pas celui du mail). Trente secondes pour vérifier valent mieux que trois mois de galère.

# Règle 5 — En cas de doute, demande à un proche

Tu n'es pas sûr ? Demande à ton fils, ta fille, ton voisin connecté, ton banquier. La cybersécurité, c'est comme la santé : on n'a pas à se débrouiller seul.

# Bonus — le geste du jour

Active la double sécurité sur ta boîte mail. C'est gratuit, ça prend 5 minutes, et ça multiplie par 100 ta sécurité. Demande à quelqu'un de t'aider à le faire.

# Le pire mensonge qu'on raconte aux non-tech

> "La cybersécurité, c'est trop technique pour moi."

Faux. La cybersécurité, c'est **du bon sens**, comme fermer sa porte à clé. Tu sais déjà tout ce qu'il faut. Il manque juste le vocabulaire — et tu n'en as même pas besoin.`,
  },
  {
    slug: "dangers-byod",
    title: "Les dangers du BYOD",
    description: "BYOD = ton smartphone perso utilisé pour le boulot. Pratique, mais pas sans pièges.",
    emoji: "📱",
    category: "byod",
    readTimeMinutes: 7,
    audience: "pro",
    authorName: "Humanix",
    body: `# BYOD, c'est quoi ?

BYOD = Bring Your Own Device. Concrètement : tu utilises ton smartphone, ton ordi perso, ta tablette, pour bosser. Mails pro sur ton iPhone perso, fichiers clients sur ton MacBook qui sert aussi le soir à regarder Netflix.

C'est pratique. Mais ça mélange deux mondes — et ce mélange crée des risques.

# Le risque numéro 1 — Tu installes Candy Crush sur le device qui contient les données clients

Une appli gratuite, c'est rarement gratuit. Elle paie ses serveurs en collectant des données. Sur un appareil perso, c'est ton problème. Sur un appareil qui contient aussi ta boîte mail pro et tes fichiers clients, c'est le problème de toute ta PME.

# Le risque numéro 2 — Tu prêtes ton appareil

Tu prêtes ton iPhone à ton enfant pour qu'il joue dans la voiture. Ton enfant ne sait pas qu'il y a la boîte mail de ton dirigeant ouverte en arrière-plan. Il appuie sur un mail, supprime, transfert, qui sait. Ça arrive plus souvent que tu ne crois.

# Le risque numéro 3 — Tu pars de l'entreprise

Tu changes de job. Le matériel pro, tu le rends. Le matériel perso qui contient les données pro... reste avec toi. Tu deviens un risque ambulant.

# Le risque numéro 4 — Le vol

Ton smartphone perso est volé dans le métro. Le voleur pense avoir un Samsung à 600 €. Il a en fait accès à ta boîte mail M365, à ton OneDrive, à ton ERP... s'ils sont mal sécurisés.

# Les 5 réflexes BYOD sains

1. **Sépare les contextes** : si possible, profil pro / profil perso (Android le permet nativement).
2. **Pas de mots de passe stockés en clair** : utilise un gestionnaire de mots de passe, jamais "se souvenir de moi" sur un site pro.
3. **Verrouillage strict** : code à 6 chiffres minimum, biométrie en plus, verrouillage automatique après 1-2 minutes.
4. **Apps pro depuis l'app store officiel uniquement** : pas de fichiers .apk envoyés par mail.
5. **Sauvegardes régulières** : si tu perds le device, tu peux le reconstituer.

# Pour ton dirigeant : la solution propre

C'est le **MDM** (Mobile Device Management). Avec Microsoft Intune ou Google Workspace MDM, tu peux :
- Forcer le verrouillage et le chiffrement
- Effacer à distance les **données pro uniquement** (pas les photos perso)
- Bloquer les apps non approuvées dans le contexte pro

Coût ? Inclus dans la plupart des licences M365 Business / Google Workspace. Gratuit, finalement.

# Le compromis

Le BYOD n'est pas le mal. C'est un compromis. Tu gagnes en confort, tu paies en complexité de sécurité. Si ta PME ne veut pas ce compromis, elle fournit du matos pro à chacun. Si elle veut, elle met du MDM. Mais pas de BYOD non encadré : c'est l'un ou l'autre.`,
  },
  {
    slug: "phishing-detection-5-signes",
    title: "Phishing : 5 signes en 5 secondes",
    description: "Comment détecter un mail piégé sans devenir paranoïaque.",
    emoji: "🎣",
    category: "phishing",
    readTimeMinutes: 5,
    audience: "tous",
    authorName: "Humanix",
    body: `# Le phishing en une phrase

Un mail (ou SMS) qui se fait passer pour quelqu'un de légitime, dans le but de te faire faire quelque chose : cliquer, payer, donner un code.

# Les 5 signes qui doivent te mettre en alerte

## 1. L'urgence anormale

"Action requise dans 24h !"
"Suspendons votre compte demain si..."
"Dernier rappel avant blocage."

Un service légitime ne te met **jamais** la pression. C'est précisément pour empêcher ta réflexion.

## 2. L'expéditeur bizarre

Regarde l'**adresse complète**, pas juste le nom affiché. "Microsoft" peut afficher "Microsoft" en nom, mais l'email complet sera "microsoft-security.com" (faux) au lieu de "microsoft.com" (vrai). Sur smartphone : appuie longtemps sur le nom de l'expéditeur pour voir l'adresse complète.

## 3. Les liens suspects

**Ne clique pas direct sur un lien de mail** quand le mail est bizarre. Sur ordi : passe la souris sur le lien (sans cliquer) et regarde l'URL en bas du navigateur. Sur smartphone : appuie longtemps pour voir l'URL réelle.

Si l'URL ressemble à "support-microsoft.com.update-now.xyz/login" : c'est un piège.

## 4. La langue maladroite

Beaucoup de phishing sont mal traduits ou écrits par des bots. Phrases bizarres, fautes d'orthographe, ton hors contexte : signal.

⚠️ Mais attention : avec l'IA, le phishing est de plus en plus bien écrit. Ce signe est moins fiable qu'avant. Les autres signes restent solides.

## 5. La demande inhabituelle

"Donne ton mot de passe pour vérifier ton compte." → Aucun service légitime ne fait ça.
"Effectue ce virement urgent et confidentiel." → Aucune entreprise saine ne fait ça.
"Confirme ton numéro de carte par mail." → Idem.

Si la demande sort des clous, c'est suspect.

# Le réflexe universel

Doute = je ne clique pas, je ne réponds pas, je n'agis pas.

Je vérifie autrement : par téléphone (sur un numéro que je connais), en allant sur le vrai site officiel (en tapant l'URL moi-même), en demandant à un collègue.

# Ce qu'il ne faut PAS faire

- ❌ Répondre au mail (l'attaquant contrôle l'adresse de réponse).
- ❌ Cliquer pour "vérifier rapidement".
- ❌ Te dire "j'ai été stupide" si tu cliques. Tout le monde clique au moins une fois. Le critère, c'est : est-ce que tu **signales** vite ?

# Le test ultime

> "Si je devais expliquer ce mail au RSSI ou à mon dirigeant, est-ce que ça me semblerait normal ?"

Si la réponse est "non, c'est weird" : ne fais rien. Vérifie.`,
  },
  {
    slug: "donnees-personnelles-rgpd-quotidien",
    title: "RGPD au quotidien — Le guide express",
    description: "Les 7 réflexes RGPD à avoir quand tu manipules des données clients ou collègues.",
    emoji: "📁",
    category: "rgpd",
    readTimeMinutes: 8,
    audience: "pro",
    authorName: "Humanix",
    body: `# Le RGPD en une phrase

C'est une loi européenne qui dit : **les données personnelles, c'est sérieux, on ne fait pas n'importe quoi avec**.

Données personnelles = tout ce qui permet d'identifier une personne : nom, mail, téléphone, adresse, mais aussi numéro client, IP, photo, voix...

# Les 7 réflexes du quotidien

## 1. Ne collecter que ce qui sert

Tu fais un formulaire de contact ? Demande : email + message. Pas la date de naissance "au cas où", pas le nom de jeune fille de la mère.

Principe : **minimisation**. Plus tu collectes, plus tu es responsable.

## 2. Demander la permission quand il faut

Pour une newsletter ? Case à cocher claire (jamais pré-cochée). Pour des cookies marketing ? Bandeau de consentement. Pour une photo dans la newsletter interne ? Email d'accord à conserver.

## 3. Ne jamais envoyer de données sensibles en clair par mail

Mots de passe, RIB, numéros de sécu, données médicales : pas dans un mail. Utilise un partage sécurisé (SharePoint avec lien limité, Tresorit, Proton Drive).

## 4. Vérifier l'identité avant de donner accès

Un client demande "envoie-moi mes anciennes commandes" ? Tu ne lui envoies pas tant que tu n'as pas vérifié que c'est bien lui. Email d'invitation à se connecter au compte officiel, ou copie de pièce d'identité.

## 5. Pas de données de tiers sans consentement

Un client te demande "c'est quoi le mail de mon collègue Pierre ?" → Refuse poliment. Le mail de Pierre est la donnée de Pierre, pas du client.

## 6. Conserver ce qui doit l'être, supprimer le reste

Une facture client se conserve 10 ans (obligation comptable).
Un CV non retenu doit être supprimé sous 2 ans max (sauf consentement explicite pour la "CVthèque").
Les données prospects non clients : 3 ans après le dernier contact.

## 7. Réagir vite en cas de fuite

Un fichier client est compromis ? Tu as **72 heures** pour notifier la CNIL (si risque pour les personnes). C'est court, mais c'est la loi (article 33 RGPD).

# Les 6 droits des personnes

Toute personne dont tu as les données peut te demander :
1. **L'accès** : "que sais-tu de moi ?"
2. **La rectification** : "corrige cette info"
3. **L'effacement** ("droit à l'oubli") : "supprime tout"
4. **La portabilité** : "donne-moi un export"
5. **La limitation** : "garde mais n'utilise pas"
6. **L'opposition** : "arrête de m'envoyer ta newsletter"

Tu dois répondre dans le mois (extensible à 3 mois si demande complexe).

# Ton DPO, ton meilleur ami

Si tu as un DPO (Data Protection Officer), c'est lui qui gère. Si ta PME n'en a pas, externalise-le (300-500 €/an chez plusieurs cabinets). Une PME sans DPO en 2026 prend un risque inutile.

# Le test du dirigeant

> "Est-ce que je serais à l'aise si demain ce traitement de données passait au JT de 20h ?"

Si la réponse est "non", c'est que tu as un sujet RGPD à régler.`,
  },
  {
    slug: "wifi-public-vraiment-dangereux",
    title: "Wi-Fi public : vraiment dangereux ?",
    description: "Démêler le vrai du faux sur les réseaux Wi-Fi en gare, café, hôtel.",
    emoji: "📶",
    category: "teletravail",
    readTimeMinutes: 5,
    audience: "tous",
    authorName: "Humanix",
    body: `# Le mythe et la réalité

On entend souvent : "Le Wi-Fi public, c'est dangereux, n'utilise jamais."

Réalité plus nuancée :
- En 2024-2026, le HTTPS partout (cadenas dans la barre d'adresse) chiffre la quasi-totalité du trafic web.
- Donc oui, les attaques classiques de "sniff de Wi-Fi" sont **moins efficaces qu'avant**.
- Mais d'autres attaques restent valides.

# Les 3 risques réels

## 1. L'evil twin

Un attaquant monte un faux point d'accès "WIFI_HOTEL_GUEST" identique au vrai. Tu te connectes au sien (parfois automatiquement si ton smartphone l'a en mémoire). Il intercepte tout ton trafic — y compris si tu cliques OK sur des avertissements de certificat.

## 2. Le captive portal piégé

Tu te connectes au Wi-Fi du café, on te demande de t'authentifier via "Google" ou "Facebook". Le formulaire est en fait un faux qui collecte tes identifiants. Très efficace.

## 3. Les apps mal sécurisées

Toutes les apps n'utilisent pas HTTPS correctement. Une vieille app interne d'entreprise peut envoyer des choses en clair. Sur un Wi-Fi hostile, c'est exposé.

# La parade qui marche toujours

**Le partage de connexion 4G/5G de ton smartphone**.

Pourquoi c'est mieux :
- Ton opérateur est ton meilleur Wi-Fi (chiffré, identifié, pas d'evil twin possible).
- Tu choisis qui se connecte avec un mot de passe que tu maîtrises.
- Tu peux le couper en 1 seconde.

Coût : un peu de batterie + un peu de data (quelques dizaines de MB pour une session de boulot normale).

# Si tu DOIS utiliser le Wi-Fi public

3 conditions à respecter :
1. **Active ton VPN d'entreprise** (s'il existe) avant tout autre trafic.
2. **Ne te connecte qu'aux Wi-Fi protégés par mot de passe affiché** (pas les "open" totalement libres).
3. **Évite les actions sensibles** : pas de virement bancaire, pas de connexion à un service critique sans 2FA.

# Le vrai risque, pas celui qu'on croit

Le risque numéro 1 du Wi-Fi public en 2026, ce n'est pas le sniff réseau. C'est **toi-même qui acceptes une popup d'avertissement**. Quand le navigateur dit "ce certificat n'est pas valide, voulez-vous continuer ?", tu cliques OK parce que tu es pressé. Ne le fais jamais.

# Résumé

- 4G/5G perso > Wi-Fi public, par défaut.
- Si Wi-Fi public obligatoire : VPN entreprise + comportement prudent.
- Jamais "OK" sur un avertissement de certificat.

C'est tout.`,
  },

  // ===========================================================================
  // EXTENSION CYBER FAMILLE — articles grand public
  // ===========================================================================

  {
    slug: "faux-conseiller-bancaire",
    title: "Le faux conseiller bancaire : l'arnaque qui a piégé 64 000 Français en 2025",
    description: "Un appel \"de votre banque\" pour bloquer un virement frauduleux… qui finit par vider votre compte. Les 4 signes à connaître.",
    emoji: "📞",
    category: "fraude",
    readTimeMinutes: 8,
    audience: "famille",
    authorName: "Humanix",
    body: `# Le scénario qui se répète

Vous recevez un SMS : "Tentative de virement de 1 287 € depuis votre compte. Cliquez ici si ce n'est pas vous." Vous cliquez, paniqué·e. Une page imite votre banque. Vous tapez vos identifiants pour "annuler" le virement.

Quelques minutes plus tard, votre téléphone sonne. Au bout du fil : un homme calme, professionnel, qui se présente comme votre conseiller fraude. Il connaît votre nom, votre numéro de compte, votre dernière opération. Il vous demande de "valider la procédure de sécurité" en lui dictant les codes que votre vraie banque va vous envoyer.

À la fin de l'appel, votre compte est vidé. Pour l'attaquant, l'opération a duré 12 minutes.

Ce scénario s'appelle "spoofing bancaire" ou "fraude au faux conseiller". En 2025, **64 000 victimes recensées en France** par Tracfin, pour un préjudice moyen de **9 200 €** par dossier.

# Pourquoi ça marche aussi bien

Trois leviers psychologiques sont activés en cascade :

**1. L'urgence.** "Votre argent va partir dans 60 secondes." Vous n'avez pas le temps de réfléchir, de vérifier, d'appeler quelqu'un.

**2. L'autorité.** L'attaquant connaît des informations qu'il ne devrait pas connaître (votre nom, votre IBAN, votre dernier achat). Il les a obtenues via une fuite de données ou via votre saisie sur le faux site bancaire.

**3. Le soulagement.** Quand quelqu'un dit "je suis là pour vous protéger", on a envie d'y croire. C'est un soulagement émotionnel après la peur.

Ces 3 leviers réunis désactivent la pensée rationnelle. Même des personnes très diplômées, des avocats, des informaticiens se font avoir.

# Les 4 signes qui doivent vous alerter

**1. Une banque ne vous demande JAMAIS un code reçu par SMS.** Jamais. Ni votre conseiller, ni le service fraude, ni "le directeur d'agence". Si on vous le demande, c'est une arnaque, sans aucune exception.

**2. Une banque ne vous demande JAMAIS de "valider" un virement par téléphone.** Les vraies validations passent par votre app bancaire, jamais par voix.

**3. Le numéro affiché peut être truqué.** Le spoofing téléphonique permet à l'attaquant d'afficher le vrai numéro de votre banque sur votre écran. Voir le bon numéro ne prouve rien.

**4. La pression temporelle.** Toute personne qui vous met la pression pour aller vite — surtout sur de l'argent — ment.

# Le bon réflexe en 30 secondes

Si vous recevez un appel "de votre banque" qui demande quoi que ce soit :

1. **Raccrochez.** Sans politesse, sans hésitation.
2. **Appelez VOUS-MÊME votre banque** au numéro inscrit au dos de votre carte (pas le numéro qui vient de vous appeler).
3. Demandez si une opération est en cours. Dans 99 % des cas, la réponse sera : "Non, il n'y a rien."

Si vous avez déjà donné des informations :
1. Appelez votre banque immédiatement.
2. Faites opposition à votre carte si nécessaire.
3. Déposez plainte (en ligne sur **pre-plainte-en-ligne.gouv.fr** ou en commissariat).
4. Signalez l'arnaque sur **cybermalveillance.gouv.fr**.

# Ce qu'il faut transmettre à vos proches

Si vous avez des parents âgés, des enfants jeunes adultes, ou des amis peu à l'aise avec la cyber, transmettez-leur **une seule règle** :

> "Ma banque ne me demandera jamais un code par téléphone. Si on me le demande, je raccroche et je rappelle moi-même."

Cette règle, gravée, sauve des comptes en banque.`,
  },

  {
    slug: "smartphone-de-mes-parents",
    title: "Sécuriser le smartphone d'un parent ou grand-parent",
    description: "10 minutes pour vérifier 5 réglages essentiels qui éviteront 90 % des arnaques courantes.",
    emoji: "📱",
    category: "famille",
    readTimeMinutes: 12,
    audience: "famille",
    authorName: "Humanix",
    body: `# Pourquoi c'est urgent

Les seniors sont la cible préférée des escrocs en 2026. Ils ont souvent plus d'épargne, sont plus polis au téléphone, et ont rarement été formés à la cyber. Selon Cybermalveillance, **une personne de plus de 65 ans sur 4** a déjà été victime d'au moins une tentative d'arnaque en ligne.

La bonne nouvelle : **5 réglages bien faits sur leur smartphone bloquent l'écrasante majorité des attaques**. C'est 10 minutes la prochaine fois que vous passez les voir.

# Réglage 1 : verrouillage automatique + biométrie

**Pourquoi :** un téléphone qui s'auto-verrouille en 30 secondes est inexploitable s'il est volé ou oublié.

**iPhone :**
- Réglages → Face ID et code → Activer Face ID
- Réglages → Affichage et luminosité → Verrouillage auto → 30 secondes ou 1 minute

**Android :**
- Paramètres → Écran de verrouillage → Configurer le déverrouillage par empreinte
- Paramètres → Affichage → Mise en veille → 30 secondes

Demandez aussi à la personne de **ne jamais désactiver le verrouillage** — même chez elle, même "parce que c'est plus pratique".

# Réglage 2 : pas d'apps en dehors des stores officiels

**Pourquoi :** les apps installées hors App Store / Play Store peuvent contenir des virus voleurs de mots de passe ou de coordonnées bancaires.

**iPhone :** par défaut, c'est impossible. Rien à faire.

**Android :** Paramètres → Sécurité → Sources inconnues → **Désactiver** pour toutes les apps. Si la personne l'a activé "pour télécharger un truc", désactivez-le.

# Réglage 3 : sauvegarde automatique

**Pourquoi :** si le téléphone est perdu, volé ou cassé, on récupère tout sans drame. Les photos de famille, les contacts, les SMS importants.

**iPhone :**
- Réglages → [Nom] → iCloud → Sauvegarde iCloud → Activer
- Vérifier qu'il y a au moins 5 Go libres (sinon proposer le forfait à 0,99 €/mois)

**Android :**
- Paramètres → Système → Sauvegarde → Activer "Sauvegarde sur Google Drive"

# Réglage 4 : filtrage des appels inconnus

**Pourquoi :** la majorité des arnaques téléphoniques viennent de numéros inconnus ou usurpés. Une option simple : tous les appels de numéros non enregistrés vont en messagerie.

**iPhone :** Réglages → Téléphone → Faire taire les appels inconnus → Activer.

**Android (Google Pixel et la plupart) :** App Téléphone → trois points → Paramètres → Filtre anti-spam → Activer.

L'inconvénient : votre médecin doit laisser un message s'il appelle d'un numéro inconnu. Ça vaut largement le coup.

# Réglage 5 : MFA sur les comptes sensibles

**Pourquoi :** même si quelqu'un vole le mot de passe Gmail / Facebook / banque, il ne peut pas se connecter sans le téléphone de la personne.

À configurer ensemble pendant que vous y êtes :
- **Compte Gmail** : myaccount.google.com → Sécurité → Validation en 2 étapes
- **Compte Apple** : Réglages → [Nom] → Mot de passe et sécurité → Authentification à 2 facteurs
- **Compte banque** : déjà obligatoire en France depuis la DSP2, normalement actif

# La règle d'or à transmettre

Avant de quitter la personne, lui répéter une seule règle, à mémoriser :

> "Quand on me demande un code par téléphone, par SMS ou par mail, je RACCROCHE / je SUPPRIME et je n'agis pas."

Cette règle empêche 80 % des arnaques classiques.

# Bonus : afficher un mémo "anti-arnaque"

Imprimez et collez sur le frigo (ou côté téléphone) :

> "✋ STOP avant de cliquer ou de répondre :
> 1. Est-ce que c'est urgent ? Une vraie urgence attend toujours 5 minutes.
> 2. Est-ce qu'on me demande un code, un mot de passe, un virement ? Si oui = ARNAQUE.
> 3. Est-ce que le numéro est inconnu ? Je laisse sonner.
> 4. En cas de doute : j'appelle [votre numéro / un proche]."

Cette feuille collée bien en évidence est l'investissement cyber le plus rentable du monde.`,
  },

  {
    slug: "arnaques-rencontres-en-ligne",
    title: "Arnaques aux sentiments : reconnaître un escroc avant qu'il ne soit trop tard",
    description: "L'arnaque qui coûte en moyenne 16 800 € par victime en France. 7 signaux faibles à connaître.",
    emoji: "💔",
    category: "fraude",
    readTimeMinutes: 10,
    audience: "famille",
    authorName: "Humanix",
    body: `# Une arnaque industrialisée

Les arnaques sentimentales (ou "love scams") ne sont plus l'œuvre de petits escrocs isolés. Ce sont des **équipes professionnelles**, souvent basées en Afrique de l'Ouest, en Asie du Sud-Est ou en Europe de l'Est, qui appliquent un script éprouvé sur des centaines de victimes simultanément.

En France, **2 800 plaintes recensées en 2025** par la cellule "Cyberescroquerie" de la gendarmerie. Préjudice moyen : **16 800 €** par victime. Mais le vrai chiffre est probablement 5 à 10 fois plus élevé : la honte empêche beaucoup de victimes de porter plainte.

# Le profil-type

L'escroc se présente avec :
- Une photo trop belle (souvent volée à un militaire américain, un médecin "humanitaire", ou un veuf charmant)
- Un métier exotique ou impressionnant : ingénieur sur plate-forme pétrolière, architecte en mission au Moyen-Orient, militaire en opération extérieure, médecin dans une ONG
- Une **histoire personnelle qui justifie l'absence physique** : il/elle ne peut pas vous rencontrer "pour le moment" mais voudrait tellement…
- Une grande maturité émotionnelle, des messages très attentionnés, parfois poétiques
- Une régularité parfaite : il/elle écrit chaque jour, à des heures variables (jour/nuit), comme s'il était dans un autre fuseau horaire

# Les 7 signaux faibles

**1. La photo a quelque chose de trop "carte postale".** Faites une recherche d'image inversée sur Google Images ou TinEye. Si la photo apparaît sur d'autres profils ou sites, c'est terminé : escroc identifié.

**2. Il/elle ne veut pas faire de visio.** Toujours une excuse : la connexion, la pudeur, la situation pro. Un vrai partenaire fait un FaceTime de 30 secondes pour vous rassurer.

**3. La conversation devient profondément intime très vite.** Au bout de 3-4 jours, on parle déjà mariage, enfants, projet de vie. Dans la vraie vie, ça prend des mois.

**4. Les histoires personnelles sont trop romanesques.** Veuf depuis le décès tragique de sa femme, militaire revenu d'Irak avec un fils à élever seul, milliardaire incompris par sa famille. Plus c'est dramatique et émouvant, plus c'est suspect.

**5. La demande d'argent finit par arriver.** Toujours pour une raison "qui n'arrive qu'une fois" : taxes de douane sur un colis, frais médicaux d'urgence, virement bloqué qu'il faut "débloquer", prêt court pour un investissement génial. Dès qu'on parle d'argent, c'est ARNAQUE jusqu'à preuve du contraire.

**6. La somme augmente progressivement.** L'escroc commence par 200 €, puis 800 €, puis 5 000 €. La méthode du "pied dans la porte" — chaque fois qu'on a déjà donné, c'est plus dur de dire stop.

**7. Le sentiment de honte vous pousse à ne pas en parler.** C'est exactement ce que veut l'escroc. Tant que vous n'en parlez pas à un proche, il a le contrôle.

# Comment se protéger en amont

- **Ne jamais accepter une demande de connexion d'un inconnu** sur Facebook, Instagram, LinkedIn (les escrocs commencent souvent là).
- **Sur les sites de rencontre** (Meetic, Tinder, Bumble, etc.) : si la personne refuse une visio dans la première semaine, c'est suspect.
- **Recherche d'image inversée systématique** sur les photos qu'on vous envoie.
- **Ne jamais envoyer d'argent** à une personne rencontrée en ligne, même après plusieurs mois. Aucune exception.

# Si c'est trop tard

Si vous (ou un proche) avez déjà envoyé de l'argent :

1. **Stop immédiat** : plus aucun virement, plus aucun message. Bloquer le contact partout.
2. **Préserver les preuves** : screenshots des conversations, relevés bancaires, profils en ligne (avant que l'escroc ne les supprime).
3. **Plainte** : pre-plainte-en-ligne.gouv.fr ou commissariat.
4. **Signalement** sur cybermalveillance.gouv.fr et sur Pharos (internet-signalement.gouv.fr).
5. **Banque** : prévenir, faire annuler les virements pas encore effectifs (rarement possible mais on tente).
6. **Soutien** : en parler. C'est l'étape la plus dure et la plus utile. France Victimes, l'association SOS Aide aux Victimes, ou simplement un proche.

# Le mot de la fin

Si quelqu'un de votre entourage tombe amoureux d'un inconnu rencontré sur internet et commence à parler de lui sans cesse — surtout si la personne refuse les visios — **ne moquez pas, n'accusez pas, posez juste une question** :

> "Tu as essayé de chercher sa photo sur Google Images ? Juste pour être sûr·e ?"

Cette question, posée avec bienveillance, évite des drames financiers et émotionnels.`,
  },

  {
    slug: "securite-jeux-video-ados",
    title: "Sécurité des jeux en ligne : ce que les parents doivent savoir sur Roblox, Fortnite et Minecraft",
    description: "Grooming, vol de comptes, achats cachés : 6 réglages parentaux qui changent tout.",
    emoji: "🎮",
    category: "famille",
    readTimeMinutes: 11,
    audience: "famille",
    authorName: "Humanix",
    body: `# Pourquoi c'est important

Les jeux en ligne sont **la première porte d'entrée** des problèmes cyber pour les enfants et ados. Selon une étude de la CNIL en 2025 :

- **78 %** des enfants de 8-14 ans jouent à un jeu en ligne
- **34 %** ont déjà été contactés par un inconnu via le chat in-game
- **18 %** ont déjà fait un achat sans accord des parents (skins, V-Bucks, Robux)
- **9 %** ont déjà été victimes d'une tentative de vol de compte

La bonne nouvelle : les plateformes ont toutes des **contrôles parentaux gratuits** simples à activer.

# Roblox (8-15 ans, 70 millions d'utilisateurs/jour)

Le principal risque : **le grooming** (adultes qui se font passer pour des enfants pour se rapprocher d'eux). Roblox a fait des progrès mais reste une plateforme à risque.

**Réglages essentiels :**
1. Compte → Sécurité → **Activer la PIN parental** (4 chiffres connus de vous seul·e)
2. Compte → Confidentialité → Choix âge "moins de 13 ans" → Désactive le chat libre, ne laisse que les phrases pré-approuvées
3. Limiter les expériences accessibles : "Cocher uniquement les jeux adaptés à l'âge"
4. Désactiver les achats sans PIN

**À expliquer à l'enfant :**
- "Ne donne jamais ton vrai prénom, ton âge précis, ta ville, ton école dans le chat."
- "Si quelqu'un te demande ces infos ou veut te parler hors du jeu (Discord, WhatsApp), viens me voir."

# Fortnite (10-17 ans surtout)

Risques principaux : **chat vocal hostile** (insultes, harcèlement) et **achats compulsifs** (V-Bucks).

**Réglages essentiels :**
1. Paramètres → Audio → **Couper le chat vocal** par défaut, ou le limiter aux amis acceptés
2. Paramètres → Compte → **Activer le contrôle parental Epic Games** (epicgames.com/help)
3. Paramètres → Confidentialité → Désactiver les invitations de joueurs inconnus
4. Définir une **limite d'achats mensuels** (0 € au début, à ajuster ensuite)

**Bonus très utile :** activer le **MFA sur le compte Epic** (avec une app Authenticator). Ça empêche les vols de compte par "amis qui prêtent leur skin", scam très courant chez les ados.

# Minecraft (7-14 ans)

Plus paisible que les deux autres, mais des risques sur les **serveurs publics** (chat libre, mods douteux qui peuvent installer des malwares).

**Réglages essentiels :**
1. Microsoft Family → Comptes enfants → **Activer le contrôle parental Xbox** (même pour Minecraft Java/Bedrock)
2. **Limiter aux serveurs whitelistés** : Realms, Hypixel (modéré), serveurs amis
3. **Interdire les mods téléchargés en dehors de Curseforge ou Modrinth** (les sites officiels de mods)

**À expliquer :** "Ne télécharge pas de mod depuis un lien YouTube ou Discord. Demande-moi avant."

# Réflexes communs aux 3 jeux

**1. Compte parental + compte enfant séparés.** Jamais l'enfant joueur et payeur sur le même compte que le parent qui gère.

**2. Pas de carte bancaire enregistrée par défaut.** Acheter par cartes prépayées (Roblox Gift Card, V-Bucks Card, Microsoft Gift Card) pour limiter mécaniquement le risque de dérive.

**3. Mot de passe long, unique, dans le gestionnaire familial.** Surtout pas le même mot de passe que la boîte mail !

**4. Vérification d'authentification (MFA) sur le compte de la plateforme** (Roblox, Epic, Microsoft) : empêche le vol de compte qui est très répandu.

**5. Discussion ouverte plutôt qu'interdiction.** L'enfant qui se fait harceler ou approcher par un adulte ne viendra parler que s'il sait qu'il ne sera pas puni. Posez régulièrement la question : "Quelqu'un de bizarre t'a parlé en jeu cette semaine ?"

# Quand s'inquiéter vraiment

Signes qu'un adulte mal intentionné approche votre enfant via un jeu :

- L'enfant **réclame du temps de jeu** soudainement, à des horaires précis (l'adulte se connecte à 21h)
- L'enfant **refuse que vous regardiez l'écran**, change de fenêtre quand vous arrivez
- L'enfant utilise des **mots adultes** ou des allusions sexuelles inhabituelles
- Vous trouvez **des photos de vous / de votre maison** envoyées en chat
- L'enfant veut **passer sur Discord, WhatsApp, Snapchat** avec un "ami du jeu"

Si plusieurs de ces signes sont présents, c'est sérieux. Action immédiate :

1. **Préservez les conversations** (ne supprimez pas le compte, le serveur, les messages — ce sont des preuves).
2. **Signalez sur** [pharos.interieur.gouv.fr](https://pharos.interieur.gouv.fr) (signalement officiel pour faits criminels en ligne).
3. **Appelez le 119** (Allo Enfance en Danger, gratuit, 24/7) ou le **3018** (numéro contre les violences numériques).
4. **Plainte** au commissariat ou en gendarmerie.

L'enfant n'est jamais en faute. Ne le grondez pas. Protégez-le.`,
  },

  {
    slug: "perte-vol-smartphone",
    title: "J'ai perdu mon téléphone : les 60 minutes qui changent tout",
    description: "Les 5 actions à faire dans l'heure pour transformer un drame en simple incident.",
    emoji: "🔍",
    category: "famille",
    readTimeMinutes: 8,
    audience: "tous",
    authorName: "Humanix",
    body: `# Pourquoi 60 minutes

Plus vite vous agissez, moins l'incident sera coûteux. Selon une étude Wavestone 2025, un téléphone perdu **non bloqué dans l'heure** entraîne en moyenne **2 100 € de fraude** sur les 24h suivantes (achats Apple Pay, prélèvements, abonnements). Bloqué dans l'heure : **42 € en moyenne**.

C'est l'écart entre une journée chiante et une journée détruite.

# Action 1 — Localiser à distance (5 minutes)

**iPhone :**
1. Sur n'importe quel autre appareil → ouvrir [icloud.com/find](https://icloud.com/find)
2. Se connecter avec votre compte Apple
3. Voir où est le téléphone sur la carte

**Android :**
1. Sur n'importe quel autre appareil → ouvrir [google.com/android/find](https://google.com/android/find)
2. Se connecter avec votre compte Google
3. Voir où est le téléphone sur la carte

Si le téléphone est dans un endroit public où vous étiez (resto, gare), il y a 80 % de chances qu'il soit récupérable en y retournant. Si la carte montre un endroit inconnu, passez à l'action 2.

# Action 2 — Bloquer le téléphone (3 minutes)

Toujours depuis la même page web (icloud.com/find ou google.com/android/find) :

**iPhone :** cliquer sur **"Mode Perdu"**. Le téléphone se verrouille, affiche un message ("Téléphone perdu, contactez 06...") et désactive Apple Pay.

**Android :** cliquer sur **"Sécuriser l'appareil"**. Même fonctionnement.

Si vous **ne retrouvez pas le téléphone dans la journée**, vous pourrez ensuite cliquer sur "Effacer l'appareil" pour le wiper à distance dès qu'il se rallume sur Internet.

# Action 3 — Bloquer la SIM (5 minutes)

**Pourquoi :** un voleur qui a votre SIM peut recevoir vos SMS de double authentification (codes banque, codes mail) et donc se connecter à vos comptes.

Appelez votre opérateur depuis un autre téléphone :

| Opérateur | Numéro |
|---|---|
| Orange | 0 800 100 740 |
| SFR | 1023 ou 06 1000 1023 |
| Bouygues | 614 ou 0 800 29 1000 |
| Free Mobile | 3244 ou 1 78 56 95 60 |

Demandez : "Mon téléphone a été perdu/volé, je veux bloquer la ligne immédiatement."

L'opérateur peut aussi vous envoyer une nouvelle SIM en 48-72h.

# Action 4 — Changer les mots de passe critiques (15 minutes)

Depuis votre ordinateur, changer en priorité :

1. **Compte mail** (Gmail, iCloud, Outlook) — c'est la porte d'entrée vers tout le reste
2. **Compte bancaire** — voir aussi appel banque ci-dessous
3. **Comptes sociaux** (Facebook, Instagram, Twitter, LinkedIn)
4. **Comptes de paiement** (PayPal, Stripe, services pro)

Profitez-en pour activer le MFA partout où ce n'est pas déjà fait.

# Action 5 — Prévenir banque et déposer plainte (15 minutes)

**Banque :** appelez votre conseiller (numéro derrière la carte). Faites bloquer la carte virtuelle si elle existait sur le téléphone, demandez la surveillance des opérations sur 7 jours.

**Plainte :** [pre-plainte-en-ligne.gouv.fr](https://pre-plainte-en-ligne.gouv.fr) → "Vol simple" ou "Perte". Indiquez le numéro IMEI du téléphone (vous le trouvez dans votre compte Apple/Google ou sur la boîte d'origine du téléphone).

Le **récépissé de plainte** vous sera demandé par votre assurance habitation (l'assurance MRH couvre souvent les téléphones, vérifiez votre contrat).

# Au quotidien : préparer le pire à l'avance

Pour que les 60 minutes soient efficaces le jour où ça arrive, faites **maintenant** :

✅ **Vérifier que la localisation à distance est activée** (Réglages → [Nom] → Localiser sur iPhone, Paramètres → Sécurité → Localiser mon appareil sur Android).

✅ **Sauvegarde automatique activée** (iCloud ou Google) — comme ça si vous wipez le téléphone à distance, vous ne perdez rien.

✅ **Code de verrouillage à 6 chiffres** (pas 4) ou biométrie. Le 4 chiffres se craque en quelques heures.

✅ **Numéro IMEI noté quelque part** (gestionnaire de mots de passe, fiche papier dans le tiroir). Ça simplifie la plainte et l'assurance.

✅ **Liste des comptes à changer en cas de vol** notée à l'avance. Le jour J, vous gagnerez 20 minutes de réflexion.

# Le scénario "le téléphone n'est pas perdu, juste oublié à la maison"

C'est 90 % des cas. Avant de paniquer, **testez-le 10 minutes** :
- Cherchez bien partout (canapé, voiture, manteau)
- Faites sonner depuis une autre ligne ou un site de localisation
- Demandez aux endroits que vous venez de quitter

La règle : **si après 30 minutes vous ne l'avez pas retrouvé, démarrez le processus de blocage**. Vous le débloquerez s'il finit par revenir, ce n'est pas grave.`,
  },

  {
    slug: "photos-famille-reseaux",
    title: "Sharenting : pourquoi protéger les photos de vos enfants n'est pas excessif",
    description: "Ce que des milliers de photos d'enfants partagées chaque seconde deviennent vraiment.",
    emoji: "📸",
    category: "famille",
    readTimeMinutes: 9,
    audience: "famille",
    authorName: "Humanix",
    body: `# Le mot et la réalité

**Sharenting** = partager (share) + parenting. C'est le fait pour des parents de poster régulièrement des photos et anecdotes de leurs enfants sur les réseaux sociaux.

Ce n'est pas un jugement moral : tous les parents sont fiers de leurs enfants. Mais en 2026, la réalité technique de ce que deviennent ces photos a changé. Voici ce qu'il faut savoir.

# Ce qui se passe réellement avec les photos d'enfants postées en ligne

**1. Elles sont aspirées par des moteurs d'IA générative.** Les principaux modèles (OpenAI, Stability, Midjourney, MidJourney) ont entraîné leurs modèles sur des milliards d'images publiques scrapées. Une photo de votre enfant postée en public sur Instagram est statistiquement déjà dans un dataset d'entraînement.

**2. Elles peuvent être détournées.** Selon la Commission Australienne pour la Sécurité en Ligne, **environ 50 % des images partagées sur des sites pédocriminels proviennent de comptes parentaux légaux**. Pas de pédocriminels qui photographient en cachette : des images publiques détournées de leur contexte.

**3. Elles construisent une empreinte numérique permanente.** Quand votre enfant aura 18 ans et cherchera un emploi, son recruteur tapera son nom sur Google. Tout ce que vous avez posté sera trouvable. Y compris les photos rigolotes-mais-gênantes que vous trouviez mignonnes en 2026.

**4. La géolocalisation est souvent embarquée.** Une photo prise sur votre iPhone et postée brute peut révéler les coordonnées GPS exactes de votre maison.

# La règle des 5 questions avant de poster

Avant de poster une photo de votre enfant, posez-vous ces 5 questions :

1. **Mon enfant approuverait-il à 18 ans ?** Si la réponse est "probablement pas" → ne postez pas.
2. **Y a-t-il une info de localisation visible ?** École, panneau de rue, intérieur de la maison qui peut être identifié → masquer ou ne pas poster.
3. **Mon enfant est-il identifiable nominativement ?** Tag avec prénom + nom de famille = données qui resteront indexables 30 ans.
4. **Le contexte est-il intime ?** Bain, déshabillage, malade, pleurs → jamais en ligne, même en privé.
5. **Mon audience est-elle vraiment privée ?** "Mes 800 amis Facebook" ce n'est pas privé.

Si vous bloquez sur 1 seule question, repostez plutôt en privé via une conversation à 2-3 personnes (la grand-mère, la marraine).

# Le bon réglage compte privé

Sur Instagram et Facebook, **passer son compte en privé** réduit énormément le risque, mais ne l'élimine pas (les amis peuvent capturer/repartager).

**Mieux : créer un compte "famille" dédié et privé**, séparé de votre compte personnel. Avec une whitelist stricte : grand-parents, frère/sœur, marraine. Pas plus.

**Encore mieux : applications dédiées comme FamilyAlbum, Tinybeans, Cluster.** Pas indexées par les moteurs, utilisateurs sur invitation uniquement, et la vie privée est leur modèle économique (vs Instagram dont le modèle = exploiter vos données).

# Demander à l'entourage de respecter votre choix

Le piège classique : VOUS ne postez pas, mais les **grands-parents le font**. Tata Geneviève fière publie 4 photos de votre enfant à chaque réunion familiale.

Demandez-leur, gentiment et clairement, dès la naissance :

> "On a décidé de protéger l'image de [Prénom]. Merci de ne rien poster sur les réseaux où il/elle apparaît. On vous enverra des photos via [Famille Album / WhatsApp privé / SMS] avec plaisir."

Ce n'est pas un caprice. C'est de la protection.

# Les photos déjà postées, comment les supprimer

**Sur Facebook / Instagram :**
- Vos propres posts : suppression individuelle. Pour un volume important, l'app "Manage Posts" sur Facebook permet une suppression en masse par dates.
- Les posts d'amis qui vous taggent : leur demander la suppression directement.

**Sur Google (résultats de recherche) :**
- Demande de suppression sur [google.com/webmasters/tools/removals](https://search.google.com/search-console/removals)
- Pour les photos d'enfants spécifiquement : il existe un formulaire dédié RGPD "minor's image"

**Sur les sites tiers** (blogs, forums) :
- Contacter le webmaster
- En cas de refus : signalement à la CNIL

# Et l'école ?

L'école demande chaque année une **autorisation droit à l'image**. Lisez-la attentivement :
- Une autorisation **pour le journal interne et le site école** : OK généralement
- Une autorisation **pour les réseaux sociaux de l'école** : à refuser ou limiter strictement
- Une autorisation **pour la presse locale** : OK ponctuel mais à vérifier

Vous avez le droit absolu de **refuser** ou de **limiter** ces autorisations. C'est un droit RGPD reconnu en France.

# Conclusion

L'enfance est une parenthèse de 18 ans. Les souvenirs photos sont précieux et méritent d'être conservés, partagés, célébrés. Mais ils n'ont pas vocation à être indexés par Google et stockés à vie chez Meta.

Les vrais souvenirs : albums papier, vidéos privées, applications famille. Le réseau public, c'est juste un piège dont vos enfants devront se sortir plus tard.`,
  },

  {
    slug: "wifi-public-vacances",
    title: "Wifi de l'hôtel, du train, du café : ce qui passe vraiment dessus",
    description: "Le risque réel, ce qui change avec un VPN, et la règle simple à appliquer en vacances.",
    emoji: "📶",
    category: "famille",
    readTimeMinutes: 7,
    audience: "tous",
    authorName: "Humanix",
    body: `# Le mythe vs la réalité

Pendant 15 ans, on a entendu : "Le wifi public est dangereux, un hacker peut tout voir." En 2026, c'est en partie faux — et en partie pire.

**Ce qui a changé :** la quasi-totalité des sites web utilisent **HTTPS** (le petit cadenas dans la barre d'adresse). Cela signifie que même sur un wifi public, vos communications avec votre banque, vos mails, votre WhatsApp sont **chiffrées de bout en bout**. Le hacker au fond du café qui sniff le réseau ne voit que du jargon.

**Ce qui n'a pas changé :** il existe deux risques **toujours réels** sur un wifi public.

# Risque réel n°1 : l'Evil Twin

Un attaquant crée un point d'accès qui s'appelle "Hôtel_Marriott_Free" alors que vous êtes au Marriott. Vous vous connectez. Toutes les requêtes DNS passent par lui. Il peut :
- Vous rediriger vers une fausse page de connexion qui ressemble à celle de votre banque
- Servir des certificats falsifiés (mais votre navigateur va heureusement crier)
- Lire les requêtes des apps mal codées qui ne valident pas le SSL (ça existe encore)

**La parade :**
- Demandez le **vrai nom** du wifi à la réception (souvent affiché sur la carte d'accès chambre)
- Si votre navigateur affiche une **alerte de certificat**, ne JAMAIS cliquer "continuer". Reculez.

# Risque réel n°2 : l'attaque captive

Vous vous connectez au wifi, une page de connexion s'affiche. Sur certains réseaux compromis, **cette page sert un malware**, ou bien demande des infos personnelles "pour continuer".

**La parade :**
- Si la page de connexion demande **votre numéro de carte bancaire**, votre **adresse mail privée** ou votre **mot de passe Google/Facebook** : c'est SUSPECT. Refusez.
- Si elle demande juste votre **mail + nom de chambre + nom de famille** : c'est OK pour la plupart des hôtels.

# Le VPN, utile ou théâtre de sécurité ?

**Vrai bénéfice d'un VPN public :**
- Cacher votre IP et votre localisation (utile pour la vie privée)
- Contourner les restrictions de pays (Netflix US, etc.)
- Protéger contre l'Evil Twin si le VPN est correctement configuré

**Faux bénéfice :**
- "Le VPN protège vos communications" : non, **HTTPS le fait déjà**. Votre VPN ne change rien à la sécurité de vos mails ou de votre banque qui sont déjà chiffrés.

**Le piège :** **les VPN gratuits sont eux-mêmes le risque**. Plusieurs études (incluant celle de Top10VPN en 2024) ont montré que des VPN gratuits revendaient les données de leurs utilisateurs ou injectaient des publicités. Si vous utilisez un VPN, prenez-en un payant et réputé : ProtonVPN (suisse), Mullvad (suédois), NordVPN (panaméen).

# La règle simple en vacances

Pour 95 % des gens, voici la règle :

| Action | Wifi public OK ? |
|---|---|
| Lire ses mails (Gmail, Outlook) | ✅ Oui (HTTPS) |
| Consulter son compte bancaire | ✅ Oui (HTTPS + MFA) |
| Faire un virement bancaire important | ⚠️ À éviter — préférez la 4G/5G perso |
| Acheter en ligne sur un site connu | ✅ Oui |
| Acheter sur un site obscur | ❌ Non — pas de wifi public |
| Visioconférence pro confidentielle | ❌ Non — partage de connexion |
| Logiciels de bureau pro (M365, Slack) | ✅ Oui (chiffré) |
| Connexion à un service sans MFA | ❌ Si vous le faites, activez le MFA dès maintenant |

# La règle absolue, peu importe le wifi

**Si votre navigateur dit "ce site n'est pas sécurisé" ou affiche une alerte de certificat : ne contournez JAMAIS.** C'est le seul vrai garde-fou. Cliquer "continuer" est l'erreur la plus dangereuse qu'on puisse faire sur internet, peu importe le wifi.

# Bonus : la 4G/5G personnelle, le bon réflexe

En 2026, votre forfait mobile vous donne souvent 50 Go ou plus. **Le partage de connexion (hotspot perso) depuis votre smartphone vers votre laptop** est plus sûr que n'importe quel wifi public, et ne nécessite ni VPN ni configuration. Activez-le par défaut dès que vous voyagez.

iPhone : Réglages → Partage de connexion → Activer.
Android : Paramètres → Réseau → Point d'accès mobile → Activer.

C'est le 1-clic qui résout le problème.`,
  },

  {
    slug: "deces-numerique",
    title: "Préparer sa succession numérique : pour ne pas laisser un cauchemar à ses proches",
    description: "Mots de passe, comptes, photos : ce qu'il faut anticiper, et comment le faire en 30 minutes.",
    emoji: "🕊️",
    category: "famille",
    readTimeMinutes: 9,
    audience: "famille",
    authorName: "Humanix",
    body: `# Pourquoi en parler maintenant

Si vous décédez demain, vos proches devront gérer votre **vie numérique** en plus du reste : comptes mail, photos cloud, abonnements (Netflix, Disney+, Amazon...), cryptos, comptes sur réseaux sociaux. Sans préparation, c'est un **cauchemar administratif qui peut durer des mois**.

Ce sujet n'est pas glauque : c'est un **acte d'amour pour ceux qui restent**. 30 minutes de votre temps maintenant = des semaines économisées plus tard. Voilà comment.

# Étape 1 — Faire la liste de votre patrimoine numérique

Listez sur papier (ou dans votre gestionnaire de mots de passe) :

**Comptes financiers**
- Banques en ligne (Boursorama, Hello Bank, Revolut, etc.)
- Plateformes d'investissement (Bourse, PEA, assurance-vie en ligne)
- Cryptos (Coinbase, Binance, wallets)
- PayPal, Lydia, Wero

**Comptes pros et perso**
- Boîtes mail principales (Gmail, iCloud, Outlook)
- Comptes Apple ID / Google
- Comptes professionnels (LinkedIn, Github, comptes pro Microsoft 365)

**Souvenirs et données**
- Photos cloud (iCloud, Google Photos, Amazon Photos, Dropbox)
- Documents importants (impôts, CV, testament numérique)
- Comptes réseaux sociaux (Facebook, Instagram, X)

**Abonnements à résilier**
- Streaming (Netflix, Spotify, Disney+, Amazon Prime)
- Apps payantes (Apple One, Microsoft 365, Adobe)
- Sites de presse, jeux en ligne, services divers

# Étape 2 — Activer les "contacts héritiers" sur les grands services

Les principales plateformes proposent gratuitement un système de **contact héritier** : une personne désignée à qui l'accès est transmis à votre décès.

**Apple ID (iPhone, iCloud) :**
- Réglages → [Votre nom] → Mot de passe et sécurité → **Contact d'héritage**
- Désigner 1 ou 2 personnes
- Apple génère une clé d'accès à imprimer ou stocker. Donnez-la à la personne désignée (sous pli scellé chez le notaire, par exemple).

**Compte Google (Gmail, Drive, Photos) :**
- [myaccount.google.com](https://myaccount.google.com) → **Compte inactif**
- Définir une période d'inactivité (3-6 mois recommandé)
- Désigner jusqu'à 10 personnes qui recevront un accès à des données spécifiques

**Facebook :**
- Paramètres → Comptes commémoratifs → **Contact légataire**
- Cette personne pourra gérer le compte commémoratif après votre décès

**Microsoft :** pas de système intégré. Solution : laisser les credentials dans un coffre numérique (cf. étape 4).

# Étape 3 — Préparer le coffre-fort numérique

Toutes les infos sensibles doivent être dans **UN SEUL endroit accessible à votre conjoint·e ou héritier·e principal·e**.

**Solution recommandée : gestionnaire de mots de passe avec partage d'urgence**

- **Bitwarden** (gratuit, open-source, basé en France via Eutopia) — fonction "Emergency Access"
- **1Password** (15 €/mois famille, excellent UX) — fonction "Family Recovery"
- **KeePass** (gratuit, local) — partage du fichier .kdbx + master password chez le notaire

**Configuration "Emergency Access" :**
1. Désigner votre conjoint·e ou un parent de confiance comme "contact d'urgence"
2. Définir un délai d'attente (7 jours par exemple) : à votre décès, la personne demande l'accès, vous avez 7 jours pour refuser. Si pas de réponse → accès accordé
3. La personne récupère TOUS vos mots de passe d'un coup

**Si vous préférez le papier** (parfaitement valable) : une feuille avec vos identifiants principaux, scellée dans une enveloppe, déposée chez votre notaire avec votre testament.

# Étape 4 — Écrire des instructions claires

Joignez à votre testament (ou aux côtés du gestionnaire de mots de passe) un fichier "lettre numérique" avec :

> **Mes volontés numériques**
>
> 1. Mes comptes mail principaux : conservez le compte Gmail [adresse] pendant 1 an pour récupérer les abonnements / contacts importants. Puis fermez-le.
>
> 2. Mes photos : elles sont sur [iCloud / Google Photos]. Téléchargez-les pour [Conjoint·e + enfants]. Vous pouvez ensuite fermer le compte.
>
> 3. Mes comptes sociaux : Facebook → compte commémoratif. Instagram → fermeture. LinkedIn → fermeture. X → fermeture.
>
> 4. Mes abonnements : la liste est dans le gestionnaire de mots de passe. À résilier dans le mois.
>
> 5. Mes cryptos : il y a [montant] sur [exchange]. La phrase de récupération de mon wallet matériel est dans [endroit physique précis].
>
> 6. Mon testament : [chez Maître X, notaire à...]

Cette feuille épargne **des semaines** de tâtonnement à vos proches.

# Étape 5 — Le testament et la dimension légale

Pour les sujets qui ont une valeur juridique (cryptos, droits d'auteur sur du contenu en ligne, comptes pro avec valeur commerciale) :

**Mention dans le testament :**
> "Je désigne [nom du conjoint] comme légataire universel, y compris pour mes biens numériques détenus sur des plateformes en ligne. Les modalités d'accès sont consignées chez Maître [X], notaire à [ville]."

Le **notaire** peut conserver une enveloppe scellée avec :
- La master password de votre gestionnaire de mots de passe
- La phrase de récupération de votre wallet crypto (12 ou 24 mots)
- Vos clés Apple Heritage / Google Inactive

C'est gratuit ou à très faible coût (frais de garde notaire) et **infiniment plus sûr** que de noter ça sur un post-it.

# La checklist finale (30 minutes chrono)

- [ ] Gestionnaire de mots de passe configuré, master password mémorisée
- [ ] Emergency Access activé pour 1-2 personnes de confiance
- [ ] Apple Heritage Contact configuré (si Apple)
- [ ] Google Inactive Account configuré (si Gmail)
- [ ] Facebook : contact légataire désigné
- [ ] Lettre "volontés numériques" rédigée et placée chez le notaire (ou avec le testament)
- [ ] Conjoint·e informé·e de l'existence de tout ça (sans forcément donner les codes maintenant)

C'est tout. Et c'est assez. Vous venez de faire à vos proches le plus beau cadeau cyber qu'on puisse leur faire.`,
  },

  {
    slug: "compte-pirate-recuperation",
    title: "Mon compte est piraté : guide de récupération en 30 minutes",
    description: "Gmail, Facebook, Instagram, banque : ce qu'il faut faire dans l'ordre, même en panique.",
    emoji: "🆘",
    category: "famille",
    readTimeMinutes: 10,
    audience: "tous",
    authorName: "Humanix",
    body: `# Le scénario typique

Vous recevez un message de Facebook : "Quelqu'un s'est connecté à votre compte depuis Casablanca." Vous essayez de vous reconnecter, votre mot de passe ne marche plus. L'attaquant l'a changé. Vous voyez votre photo de profil disparaître, des messages partir à vos contacts en votre nom.

Pas de panique. **Dans 90 % des cas, le compte est récupérable** si vous agissez vite et dans le bon ordre.

# Règle 1 — Ne pas paniquer, mais aller vite

Plus l'attaquant a de temps, plus il fait de dégâts (escroqueries à vos contacts, suppression de données, exfiltration de photos). Mais pas besoin de courir partout : **30 minutes méthodiques** valent mieux que 2 heures de panique.

# Cas 1 — Compte Gmail / Google piraté

**Pourquoi c'est prioritaire :** Gmail est la **clé maître** de tous vos autres comptes (la majorité des sites envoient les liens de réinitialisation par mail). Récupérer Gmail = récupérer tout le reste.

**Procédure :**

1. Aller sur [g.co/recover](https://g.co/recover)
2. Entrer votre email
3. Suivre les questions : Google va vérifier votre identité avec :
   - Le dernier mot de passe que vous vous souvenez
   - Le numéro de téléphone associé (si vous l'aviez configuré)
   - Une question de sécurité
   - Les dates de création de votre compte / dernier accès

**Si la procédure échoue, il y a un formulaire spécifique :** [accounts.google.com/signin/recovery](https://accounts.google.com/signin/recovery). Soyez précis : depuis quel pays vous vous connectez d'habitude, quels services Google vous utilisez, quels emails vous avez envoyés récemment. Plus vous donnez d'infos, plus Google rétablit l'accès.

**Une fois récupéré :**
- Changer le mot de passe (long, unique)
- Activer la **double authentification** (myaccount.google.com → Sécurité → Vérification en deux étapes)
- Vérifier les **applications connectées** et révoquer celles que vous ne reconnaissez pas
- Vérifier les **filtres et redirections** (l'attaquant a peut-être configuré une redirection automatique de vos mails vers son adresse)

# Cas 2 — Facebook / Instagram piraté

**Procédure Facebook :**

1. Aller sur [facebook.com/hacked](https://facebook.com/hacked)
2. Entrer votre email ou numéro de téléphone
3. Si Facebook reconnaît la tentative, suivre les étapes (vérification d'identité, photo, etc.)

**Procédure Instagram :**

1. Sur l'app Instagram → écran de connexion → "Vous avez besoin d'aide ?"
2. Choisir "Mon compte a été piraté"
3. Suivre les étapes (vérification email/téléphone)

**Si Meta vous demande une selfie-vidéo :** c'est légitime, ne paniquez pas. C'est leur méthode pour vérifier que vous êtes bien la personne sur les photos du compte.

**Une fois récupéré :**
- Vérifier les **sessions actives** et déconnecter toutes celles qu'on ne reconnaît pas
- Vérifier les **mails de récupération** (l'attaquant les a peut-être changés)
- Activer la **double authentification**
- Prévenir vos contacts qu'un message frauduleux a peut-être circulé

# Cas 3 — Compte bancaire compromis

**Action immédiate, sans délai :**

1. **Bloquer la carte** depuis l'app bancaire ou en appelant le numéro derrière votre carte
2. **Faire opposition complète** sur le compte (la banque suspend toutes les opérations)
3. **Lister les opérations frauduleuses** des 30 derniers jours
4. **Plainte** sur [pre-plainte-en-ligne.gouv.fr](https://pre-plainte-en-ligne.gouv.fr) — vous pouvez le faire avant d'aller au commissariat
5. **Demande de remboursement** auprès de la banque (formulaire L133-19 du Code monétaire et financier — la banque doit rembourser sous 1 jour ouvrable les opérations non autorisées, sauf preuve de négligence)

# Cas 4 — Boîte mail OVH / Free / Orange / SFR piratée

Plus rare mais plus grave si la boîte est utilisée pour récupérer d'autres comptes.

**Procédure :**

1. Appeler le **service client opérateur**
2. Demander **réinitialisation forcée** du mot de passe (ils peuvent l'envoyer par courrier postal en 5-7 jours)
3. En attendant, vérifier les comptes liés à cette adresse mail : changez les mots de passe en utilisant le numéro de téléphone comme méthode de récupération secondaire

# Cas 5 — Compte Apple ID / Microsoft

**Apple :** [iforgot.apple.com](https://iforgot.apple.com) → suivre les étapes. Si Apple bloque, appeler le support : 0805 540 003 (gratuit).

**Microsoft :** [account.live.com/acsr](https://account.live.com/acsr) → procédure de récupération avec vérification d'identité.

# Après la récupération : faire le ménage complet

Une fois le compte principal récupéré, **bloquez 1 heure** pour la suite :

✅ **Changer les mots de passe de TOUS les comptes liés à cette adresse mail.** Si Gmail a été piraté, l'attaquant a peut-être déjà demandé des resets sur Amazon, Netflix, votre banque, etc.

✅ **Vérifier les paramètres de sécurité** : numéros de téléphone, mails de récupération, questions de sécurité. L'attaquant les a peut-être modifiés pour reprendre l'accès plus tard.

✅ **Activer le MFA partout** où ce n'est pas déjà fait (avec une app type Authy / Microsoft Authenticator, pas par SMS).

✅ **Lancer un scan antivirus** sur votre PC : si l'attaquant a obtenu votre mot de passe, c'est peut-être par un keylogger sur votre machine.

✅ **Prévenir vos contacts** : "Mon compte X a été piraté hier. Si vous avez reçu un message bizarre de moi, ignorez-le."

# Le réflexe préventif

90 % des piratages de compte arrivent à des gens qui n'avaient **pas activé la double authentification**. Si vous avez 10 minutes maintenant, activez-la sur :

1. Boîte mail principale
2. Compte bancaire (normalement déjà obligatoire en France)
3. Réseaux sociaux principaux
4. Compte Apple / Google / Microsoft

C'est le geste cyber qui a le meilleur rapport effort/protection au monde.`,
  },
];
