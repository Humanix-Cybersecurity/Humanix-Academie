// SPDX-License-Identifier: AGPL-3.0-or-later
// Catalogue des 5 types d'incidents cyber typiques en PME francaise.
//
// Source d'inspiration : retours terrain Humanix Cybersecurity
// (10 ans en pentest + audit) + recommandations CERT-FR + ANSSI.
//
// Chaque incident contient :
// - immediate : 5 reflexes a faire DANS LES 60 PREMIERES MINUTES
// - dontDo   : 5 actions a NE PAS faire (et pourquoi)
// - within24h: 5 actions a entreprendre dans les 24 premieres heures
// - tools    : outils souverains a utiliser (FR/UE en priorite)

export type IncidentType =
  | "ransomware"
  | "fuite-donnees"
  | "fraude-president"
  | "compte-compromis"
  | "vol-perte-materiel";

export type IncidentAction = {
  text: string;
  why?: string;
};

export type IncidentFiche = {
  slug: IncidentType;
  emoji: string;
  title: string;
  subtitle: string;
  /** Description en 1 phrase pour les cards du hub. */
  shortDesc: string;
  /** 5 reflexes immediats (60 premieres minutes). */
  immediate: IncidentAction[];
  /** 5 erreurs frequentes a eviter, avec le "pourquoi" pour pedagogie. */
  dontDo: IncidentAction[];
  /** 5 actions cle dans les 24 premieres heures. */
  within24h: IncidentAction[];
  /** Outils souverains references pour ce type d'incident. */
  tools: Array<{ name: string; url: string; note: string }>;
  /** Quand contacter Humanix pour intervention curative ? */
  whenToCallHumanix: string;
};

export const INCIDENTS: IncidentFiche[] = [
  // -----------------------------------------------------------------------
  {
    slug: "ransomware",
    emoji: "🔒",
    title: "Rançongiciel",
    subtitle: "Vos fichiers sont chiffres et un message demande une rançon",
    shortDesc:
      "Tout est chiffre, un message demande de l'argent. La premiere heure compte autant que les 30 jours suivants.",
    immediate: [
      {
        text: "Debranchez le poste du reseau IMMEDIATEMENT (cable + Wi-Fi)",
        why: "Pour stopper la propagation aux autres postes et serveurs.",
      },
      {
        text: "Ne PAS eteindre la machine — la garder sous tension",
        why: "L'extinction detruit la memoire vive, qui contient des indices forensic precieux (cles de chiffrement parfois).",
      },
      {
        text: "Photographier l'ecran avec son telephone (message + URL paiement)",
        why: "Premiere preuve forensic, datee, hors machine compromise.",
      },
      {
        text: "Identifier les autres machines potentiellement touchees",
        why: "Memes serveurs partages, NAS, sauvegardes en ligne, services tiers.",
      },
      {
        text: "Appeler immediatement votre RSSI / DSI / prestataire cyber",
        why: "Plus on agit tot, plus la fenetre de remediation est grande.",
      },
    ],
    dontDo: [
      {
        text: "Ne PAS payer la rançon",
        why: "Aucune garantie de recevoir la cle. Et finance le crime organise. Position constante CNIL, ANSSI, gouvernement francais.",
      },
      {
        text: "Ne PAS eteindre les machines",
        why: "Fenetre forensic perdue.",
      },
      {
        text: "Ne PAS reformater dans la panique",
        why: "Detruit les preuves, empeche l'enquete et la potentielle decryption gratuite (NoMoreRansom).",
      },
      {
        text: "Ne PAS communiquer publiquement avant qualification",
        why: "Une communication confuse aggrave le prejudice reputationnel et legal.",
      },
      {
        text: "Ne PAS supprimer le mail/document a l'origine de l'infection",
        why: "C'est une preuve cle, conservez-le tel quel (sans le re-cliquer).",
      },
    ],
    within24h: [
      {
        text: "Declarer l'incident en ligne sur cybermalveillance.gouv.fr",
        why: "Obtient un numero de dossier et une orientation officielle gratuite.",
      },
      {
        text: "Deposer plainte en gendarmerie ou commissariat",
        why: "Obligation prealable a toute indemnisation cyber-assurance.",
      },
      {
        text: "Si donnees personnelles touchees : notifier la CNIL sous 72h",
        why: "Article 33 RGPD. Ne pas le faire = sanction administrative qui aggrave le dossier.",
      },
      {
        text: "Verifier sur NoMoreRansom.org si une cle de decryption gratuite existe",
        why: "Le projet europeen propose ~150 outils de decryption gratuits.",
      },
      {
        text: "Activer votre cyber-assurance si vous en avez une",
        why: "Beaucoup ont des hotlines 24h/7j et prennent en charge les frais d'intervention.",
      },
    ],
    tools: [
      {
        name: "NoMoreRansom.org",
        url: "https://www.nomoreransom.org/fr/index.html",
        note: "Outils de decryption gratuits par familles de ransomware (projet Europol + ANSSI)",
      },
      {
        name: "ID Ransomware",
        url: "https://id-ransomware.malwarehunterteam.com/",
        note: "Identification de la souche de ransomware par hash ou note de rançon",
      },
      {
        name: "CyberMalveillance.gouv.fr — diagnostic gratuit",
        url: "https://www.cybermalveillance.gouv.fr/diagnostic",
        note: "Parcours guide officiel + mise en relation prestataires labellises",
      },
    ],
    whenToCallHumanix:
      "Des que la propagation est stoppee. Notre equipe se deplace en metropole pour intervention curative directe (sans sous-traitance). Premier appel diagnostic gratuit.",
  },

  // -----------------------------------------------------------------------
  {
    slug: "fuite-donnees",
    emoji: "💧",
    title: "Fuite de donnees",
    subtitle: "Des donnees clients ou collaborateurs apparaissent en ligne",
    shortDesc:
      "Une base de donnees, des emails ou des fichiers se retrouvent sur le web (forum, dark web, archive publique).",
    immediate: [
      {
        text: "Capturer la preuve (URL + date + screenshot horodate)",
        why: "Le contenu peut disparaitre vite. La preuve est cruciale.",
      },
      {
        text: "Identifier l'origine probable (compte compromis ? base mal configuree ? fuite interne ?)",
        why: "Conditionne la priorite des actions de fermeture.",
      },
      {
        text: "Couper l'acces a la base/service concerne",
        why: "Stoppe l'exfiltration en cours si elle continue.",
      },
      {
        text: "Inventorier le perimetre (combien de personnes, quel type de donnees)",
        why: "Le RGPD impose une evaluation rapide du risque pour les personnes.",
      },
      {
        text: "Bloquer ou rotation des credentials suspects",
        why: "Si compte admin compromis, l'attaquant peut revenir.",
      },
    ],
    dontDo: [
      {
        text: "Ne PAS contacter le forum/site de fuite pour negocier",
        why: "Renforce l'idee que vous payez en cas de fuite, vous serez recible.",
      },
      {
        text: "Ne PAS supprimer les logs sans copie forensic prealable",
        why: "Indispensables pour comprendre l'origine et notifier la CNIL.",
      },
      {
        text: "Ne PAS communiquer publiquement avant qualification CNIL",
        why: "Une communication confuse aggrave le prejudice et expose juridiquement.",
      },
      {
        text: "Ne PAS minimiser l'incident pour eviter la notification CNIL",
        why: "L'omission est sanctionnee plus durement que l'incident.",
      },
      {
        text: "Ne PAS attendre d'etre 'sur a 100 %' pour agir",
        why: "Le delai 72h CNIL court des la 'connaissance raisonnable' de l'incident.",
      },
    ],
    within24h: [
      {
        text: "Notifier la CNIL si donnees personnelles concernees (delai 72h)",
        why: "Formulaire en ligne, vous pouvez completer le dossier ensuite.",
      },
      {
        text: "Informer les personnes concernees si risque eleve",
        why: "Article 34 RGPD. Modele de notification a preparer.",
      },
      {
        text: "Verifier HaveIBeenPwned pour voir si la fuite est deja indexee",
        why: "Permet de mesurer la diffusion publique.",
      },
      {
        text: "Lancer une rotation des mots de passe pour les comptes a risque",
        why: "Surtout si emails leakes : ils servent au credential stuffing.",
      },
      {
        text: "Documenter l'incident dans votre registre RGPD (article 33-5)",
        why: "Obligation legale meme si vous ne notifiez pas la CNIL.",
      },
    ],
    tools: [
      {
        name: "HaveIBeenPwned",
        url: "https://haveibeenpwned.com",
        note: "Recherche par email/domaine si donnees deja indexees publiquement",
      },
      {
        name: "Notification CNIL (formulaire en ligne)",
        url: "https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles",
        note: "Formulaire officiel de notification 72h",
      },
      {
        name: "Registre RGPD modele CNIL",
        url: "https://www.cnil.fr/fr/RGDP-le-registre-des-activites-de-traitement",
        note: "Documenter l'incident est obligatoire meme sans notification",
      },
    ],
    whenToCallHumanix:
      "Pour qualifier l'incident avec un expert RSSI externalise et preparer la notification CNIL. Notre equipe se deplace pour analyse forensic sur place si necessaire.",
  },

  // -----------------------------------------------------------------------
  {
    slug: "fraude-president",
    emoji: "📞",
    title: "Fraude au president / virement frauduleux",
    subtitle: "Un faux PDG ou faux fournisseur a obtenu un virement",
    shortDesc:
      "Le comptable a effectue un virement sur la base d'un faux email/appel. Premiere heure decisive pour annuler.",
    immediate: [
      {
        text: "Appeler immediatement la banque emettrice (numero de fraude prioritaire)",
        why: "Si le virement n'est pas execute, il peut etre rappele. Compteur en heures.",
      },
      {
        text: "Identifier l'IBAN destinataire et bloquer tous les virements vers ce compte",
        why: "Empeche un 2e virement si l'attaquant insiste.",
      },
      {
        text: "Verifier si d'autres mails frauduleux sont en attente de validation",
        why: "Les attaques sont souvent en serie sur plusieurs services.",
      },
      {
        text: "Conserver TOUS les emails/SMS/appels lies (sans repondre)",
        why: "Preuves cruciales pour la plainte et l'assurance.",
      },
      {
        text: "Alerter la direction et le service compta",
        why: "Pour eviter qu'un autre collaborateur tombe dans le meme piege en parallele.",
      },
    ],
    dontDo: [
      {
        text: "Ne PAS repondre au mail/appel frauduleux",
        why: "Renforce l'attaque sociale et donne des informations supplementaires.",
      },
      {
        text: "Ne PAS supprimer les emails frauduleux",
        why: "Preuves. Conserver dans un dossier dedie.",
      },
      {
        text: "Ne PAS payer une 'rançon' demandee pour annuler",
        why: "Variante d'arnaque sur l'arnaque. La banque seule peut rappeler le virement.",
      },
      {
        text: "Ne PAS attendre le lendemain pour declarer",
        why: "Apres 24-72h, la chance de recuperation chute drastiquement.",
      },
      {
        text: "Ne PAS communiquer en interne avant alignement avec la direction",
        why: "Limite la circulation d'information et la panique.",
      },
    ],
    within24h: [
      {
        text: "Deposer plainte en gendarmerie ou commissariat",
        why: "Obligation prealable a toute indemnisation par l'assurance ou la banque.",
      },
      {
        text: "Activer la cyber-assurance si vous en avez une",
        why: "Hotline 24h/7j, prise en charge frais juridique et investigation.",
      },
      {
        text: "Faire un signalement TRACFIN si montant > seuil",
        why: "Obligation legale pour certains secteurs (banque, immo, expert-comptable).",
      },
      {
        text: "Lancer un audit des process de validation virement (4 yeux, double appel, etc.)",
        why: "Eviter la recidive immediate.",
      },
      {
        text: "Signaler sur cybermalveillance.gouv.fr",
        why: "Numero de dossier officiel + orientation prestataires.",
      },
    ],
    tools: [
      {
        name: "PERCEVAL (signalement fraude bancaire)",
        url: "https://www.service-public.fr/particuliers/vosdroits/N31976",
        note: "Service du ministere de l'Interieur pour signaler la fraude",
      },
      {
        name: "PHAROS (signalement contenu illicite)",
        url: "https://www.internet-signalement.gouv.fr",
        note: "Signalement officiel du contenu mensonger en ligne",
      },
      {
        name: "Tracfin (declaration soupcon)",
        url: "https://www.economie.gouv.fr/tracfin",
        note: "Pour les professionnels assujettis a la lutte anti-blanchiment",
      },
    ],
    whenToCallHumanix:
      "Notre equipe peut intervenir sur site pour audit des processus comptables, formation flash anti-fraude, et accompagnement avec la banque. Sans sous-traitance.",
  },

  // -----------------------------------------------------------------------
  {
    slug: "compte-compromis",
    emoji: "🔓",
    title: "Compte compromis",
    subtitle:
      "Mot de passe vole, compte mail/CRM utilise par un tiers, MFA contourne",
    shortDesc:
      "Quelqu'un d'autre a acces a un de vos comptes professionnels — emails sortants suspects, regles de transfert ajoutees, donnees consultees.",
    immediate: [
      {
        text: "Forcer la deconnexion de toutes les sessions actives",
        why: "Coupe l'acces immediat de l'attaquant. Disponible dans tous les services pro.",
      },
      {
        text: "Changer le mot de passe sur un AUTRE appareil (pas celui compromis)",
        why: "Si le poste est compromis, le keylogger capture le nouveau mot de passe.",
      },
      {
        text: "Activer ou re-verifier la double authentification MFA",
        why: "Empeche la reconnexion par mot de passe seul.",
      },
      {
        text: "Verifier les regles de transfert de mails (Outlook, Gmail) et delegues",
        why: "Vecteur typique : l'attaquant met une regle 'tout copier vers email-attaquant'.",
      },
      {
        text: "Verifier les applications/connexions OAuth tierces autorisees",
        why: "L'attaquant peut avoir cree un acces persistant via un app malveillante.",
      },
    ],
    dontDo: [
      {
        text: "Ne PAS continuer a utiliser le poste si keylogger suspecte",
        why: "Tous les nouveaux mots de passe sont compromis aussitot saisis.",
      },
      {
        text: "Ne PAS re-utiliser le mot de passe compromis ailleurs",
        why: "Credential stuffing : vos autres comptes seront testes en quelques heures.",
      },
      {
        text: "Ne PAS supprimer les emails suspects sortants envoyes en votre nom",
        why: "Preuves de l'utilisation frauduleuse.",
      },
      {
        text: "Ne PAS hesiter a alerter les contacts qui ont recu des emails suspects",
        why: "Ils peuvent etre cibles d'arnaque en aval (faux RIB, etc.).",
      },
      {
        text: "Ne PAS attendre pour notifier la CNIL si donnees personnelles consultees",
        why: "Delai 72h des connaissance raisonnable.",
      },
    ],
    within24h: [
      {
        text: "Auditer les logs d'acces (date, IP, user-agent) sur 30 jours",
        why: "Determine la duree de la compromission et les actions de l'attaquant.",
      },
      {
        text: "Lister les emails/fichiers consultes ou exfiltres pendant la periode",
        why: "Necessaire pour notification CNIL si donnees personnelles touchees.",
      },
      {
        text: "Lancer la rotation des mots de passe sur les autres comptes lies",
        why: "Si l'attaquant a vu votre coffre-fort de mots de passe, tous sont a risque.",
      },
      {
        text: "Verifier sur HaveIBeenPwned si vos credentials sont publiquement leakes",
        why: "Origine possible du compromise = autre fuite de service.",
      },
      {
        text: "Documenter l'incident dans votre registre RGPD (article 33-5)",
        why: "Obligation legale meme si vous ne notifiez pas la CNIL.",
      },
    ],
    tools: [
      {
        name: "HaveIBeenPwned",
        url: "https://haveibeenpwned.com",
        note: "Verifier si email + mot de passe sont leakes publiquement",
      },
      {
        name: "Microsoft 365 — verifier connexions",
        url: "https://account.activedirectory.windowsazure.com/r#/profile",
        note: "Activite de connexion + applications tierces autorisees",
      },
      {
        name: "Google Workspace — securite du compte",
        url: "https://myaccount.google.com/security",
        note: "Connexions recentes + appareils + 2FA",
      },
    ],
    whenToCallHumanix:
      "Pour audit forensic complet du compte (timeline + impact), formation post-incident, et mise en place d'un MFA renforce. Intervention sur site possible.",
  },

  // -----------------------------------------------------------------------
  {
    slug: "vol-perte-materiel",
    emoji: "💼",
    title: "Vol ou perte de materiel pro",
    subtitle: "Laptop, telephone, cle USB ou disque externe disparu",
    shortDesc:
      "Le materiel contient des donnees pro (mails, fichiers, acces) — comportement immediat conditionne le risque RGPD et metier.",
    immediate: [
      {
        text: "Bloquer/effacer a distance via le MDM ou les outils du fournisseur",
        why: "Apple Find My, Microsoft Intune, Google Find My Device : effacement a distance possible si chiffrement actif.",
      },
      {
        text: "Changer immediatement les mots de passe des comptes auxquels le materiel avait acces",
        why: "L'attaquant peut tenter de se connecter depuis vos cookies/sessions caches.",
      },
      {
        text: "Forcer la deconnexion des sessions actives (mail, CRM, drive)",
        why: "Coupe l'acces persistent meme si le mot de passe n'a pas ete change.",
      },
      {
        text: "Identifier ce qui etait stocke dessus (fichiers locaux, mails caches, certificats, cles SSH)",
        why: "Le perimetre conditionne la suite (notification CNIL, auto-evaluation risque).",
      },
      {
        text: "Si vol : deposer plainte (bureau de police local) avec numero serie",
        why: "Obligatoire pour assurance + permet la geolocalisation par les forces de l'ordre si tracking actif.",
      },
    ],
    dontDo: [
      {
        text: "Ne PAS attendre pour bloquer les comptes",
        why: "Une heure de retard suffit pour exfiltrer des Go via le compte cloud reste connecte.",
      },
      {
        text: "Ne PAS reactiver le mot de passe initial 'au cas ou il revient'",
        why: "Si le materiel revient compromis, votre nouveau mot de passe est instantanement vole.",
      },
      {
        text: "Ne PAS racheter un materiel d'occasion sans verification d'origine",
        why: "Pourrait etre votre propre laptop revendu apres compromission.",
      },
      {
        text: "Ne PAS minimiser l'impact RGPD si donnees clients/RH stockees localement",
        why: "Notification CNIL probable. Anticipez plutot que subir.",
      },
      {
        text: "Ne PAS oublier les peripheriques associes (token YubiKey, smartcard)",
        why: "Si la cle physique est avec le materiel, ils peuvent contourner le MFA.",
      },
    ],
    within24h: [
      {
        text: "Notifier la CNIL si donnees personnelles non chiffrees stockees",
        why: "Si le disque est chiffre (BitLocker, FileVault), le risque est generalement faible.",
      },
      {
        text: "Demander a l'IT/RSSI un audit complet des permissions / certificats stockes",
        why: "Cles SSH, certificats VPN, mots de passe en cache : le perimetre est plus large que prevu.",
      },
      {
        text: "Activer la geolocalisation continue si ce n'est pas deja fait",
        why: "Apple Find My, Google Find My Device : permet potentiellement recuperation.",
      },
      {
        text: "Declarer a la cyber-assurance si applicable",
        why: "Beaucoup couvrent le vol de materiel pro et l'investigation associee.",
      },
      {
        text: "Documenter dans le registre RGPD interne",
        why: "Obligation Article 33-5 RGPD.",
      },
    ],
    tools: [
      {
        name: "Apple Find My",
        url: "https://www.icloud.com/find",
        note: "Localiser, verrouiller, effacer a distance les Mac et iPhone",
      },
      {
        name: "Microsoft Find My Device",
        url: "https://account.microsoft.com/devices",
        note: "Localiser, verrouiller, effacer Windows + Surface",
      },
      {
        name: "Google Find My Device",
        url: "https://www.google.com/android/find",
        note: "Pour les smartphones Android",
      },
    ],
    whenToCallHumanix:
      "Pour audit d'impact complet, mise en place d'un MDM (gestion des appareils) si absent, et formation aux reflexes de protection physique. Intervention sur site.",
  },
];

export const INCIDENTS_INDEX: Record<IncidentType, IncidentFiche> =
  Object.fromEntries(INCIDENTS.map((i) => [i.slug, i])) as Record<
    IncidentType,
    IncidentFiche
  >;
