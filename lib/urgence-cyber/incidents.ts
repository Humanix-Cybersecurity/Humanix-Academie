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
    subtitle: "Vos fichiers sont chiffrés et un message demande une rançon",
    shortDesc:
      "Tout est chiffré, un message demande de l'argent. La première heure compte autant que les 30 jours suivants.",
    immediate: [
      {
        text: "Débranchez le poste du réseau IMMÉDIATEMENT (câble + Wi-Fi)",
        why: "Pour stopper la propagation aux autres postes et serveurs.",
      },
      {
        text: "Ne PAS éteindre la machine - la garder sous tension",
        why: "L'extinction détruit la mémoire vive, qui contient des indices forensic précieux (clés de chiffrement parfois).",
      },
      {
        text: "Photographier l'écran avec son téléphone (message + URL paiement)",
        why: "Première preuve forensic, datée, hors machine compromise.",
      },
      {
        text: "Identifier les autres machines potentiellement touchées",
        why: "Mêmes serveurs partagés, NAS, sauvegardes en ligne, services tiers.",
      },
      {
        text: "Appeler immédiatement votre RSSI / DSI / prestataire cyber",
        why: "Plus on agit tôt, plus la fenêtre de remédiation est grande.",
      },
    ],
    dontDo: [
      {
        text: "Ne PAS payer la rançon",
        why: "Aucune garantie de recevoir la clé. Et finance le crime organisé. Position constante CNIL, ANSSI, gouvernement français.",
      },
      {
        text: "Ne PAS éteindre les machines",
        why: "Fenêtre forensic perdue.",
      },
      {
        text: "Ne PAS reformater dans la panique",
        why: "Détruit les preuves, empêche l'enquête et la potentielle decryption gratuite (NoMoreRansom).",
      },
      {
        text: "Ne PAS communiquer publiquement avant qualification",
        why: "Une communication confuse aggrave le préjudice réputationnel et légal.",
      },
      {
        text: "Ne PAS supprimer le mail/document à l'origine de l'infection",
        why: "C'est une preuve clé, conservez-le tel quel (sans le re-cliquer).",
      },
    ],
    within24h: [
      {
        text: "Déclarer l'incident en ligne sur cybermalveillance.gouv.fr",
        why: "Obtient un numéro de dossier et une orientation officielle gratuite.",
      },
      {
        text: "Déposer plainte en gendarmerie ou commissariat",
        why: "Obligation préalable à toute indemnisation cyber-assurance.",
      },
      {
        text: "Si données personnelles touchées : notifier la CNIL sous 72h",
        why: "Article 33 RGPD. Ne pas le faire = sanction administrative qui aggrave le dossier.",
      },
      {
        text: "Vérifier sur NoMoreRansom.org si une clé de decryption gratuite existe",
        why: "Le projet européen propose ~150 outils de decryption gratuits.",
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
        name: "CyberMalveillance.gouv.fr - diagnostic gratuit",
        url: "https://www.cybermalveillance.gouv.fr/diagnostic",
        note: "Parcours guidé officiel + mise en relation prestataires labellisés",
      },
    ],
    whenToCallHumanix:
      "Dès que la propagation est stoppée. Notre équipe se déplace en métropole pour intervention curative directe (sans sous-traitance). Premier appel diagnostic gratuit.",
  },

  // -----------------------------------------------------------------------
  {
    slug: "fuite-donnees",
    emoji: "💧",
    title: "Fuite de données",
    subtitle: "Des données clients ou collaborateurs apparaissent en ligne",
    shortDesc:
      "Une base de données, des emails ou des fichiers se retrouvent sur le web (forum, dark web, archive publique).",
    immediate: [
      {
        text: "Capturer la preuve (URL + date + screenshot horodaté)",
        why: "Le contenu peut disparaître vite. La preuve est cruciale.",
      },
      {
        text: "Identifier l'origine probable (compte compromis ? base mal configurée ? fuite interne ?)",
        why: "Conditionne la priorité des actions de fermeture.",
      },
      {
        text: "Couper l'accès à la base/service concerné",
        why: "Stoppe l'exfiltration en cours si elle continue.",
      },
      {
        text: "Inventorier le périmètre (combien de personnes, quel type de données)",
        why: "Le RGPD impose une évaluation rapide du risque pour les personnes.",
      },
      {
        text: "Bloquer ou rotation des credentials suspects",
        why: "Si compte admin compromis, l'attaquant peut revenir.",
      },
    ],
    dontDo: [
      {
        text: "Ne PAS contacter le forum/site de fuite pour négocier",
        why: "Renforce l'idée que vous payez en cas de fuite, vous serez reciblé.",
      },
      {
        text: "Ne PAS supprimer les logs sans copie forensic préalable",
        why: "Indispensables pour comprendre l'origine et notifier la CNIL.",
      },
      {
        text: "Ne PAS communiquer publiquement avant qualification CNIL",
        why: "Une communication confuse aggrave le préjudice et expose juridiquement.",
      },
      {
        text: "Ne PAS minimiser l'incident pour éviter la notification CNIL",
        why: "L'omission est sanctionnée plus durement que l'incident.",
      },
      {
        text: "Ne PAS attendre d'être 'sûr à 100 %' pour agir",
        why: "Le délai 72h CNIL court dès la 'connaissance raisonnable' de l'incident.",
      },
    ],
    within24h: [
      {
        text: "Notifier la CNIL si données personnelles concernées (délai 72h)",
        why: "Formulaire en ligne, vous pouvez compléter le dossier ensuite.",
      },
      {
        text: "Informer les personnes concernées si risque élevé",
        why: "Article 34 RGPD. Modèle de notification à préparer.",
      },
      {
        text: "Vérifier HaveIBeenPwned pour voir si la fuite est déjà indexée",
        why: "Permet de mesurer la diffusion publique.",
      },
      {
        text: "Lancer une rotation des mots de passe pour les comptes à risque",
        why: "Surtout si emails leakés : ils servent au credential stuffing.",
      },
      {
        text: "Documenter l'incident dans votre registre RGPD (article 33-5)",
        why: "Obligation légale même si vous ne notifiez pas la CNIL.",
      },
    ],
    tools: [
      {
        name: "HaveIBeenPwned",
        url: "https://haveibeenpwned.com",
        note: "Recherche par email/domaine si données déjà indexées publiquement",
      },
      {
        name: "Notification CNIL (formulaire en ligne)",
        url: "https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles",
        note: "Formulaire officiel de notification 72h",
      },
      {
        name: "Registre RGPD modèle CNIL",
        url: "https://www.cnil.fr/fr/RGDP-le-registre-des-activites-de-traitement",
        note: "Documenter l'incident est obligatoire même sans notification",
      },
    ],
    whenToCallHumanix:
      "Pour qualifier l'incident avec un expert RSSI externalisé et préparer la notification CNIL. Notre équipe se déplace pour analyse forensic sur place si nécessaire.",
  },

  // -----------------------------------------------------------------------
  {
    slug: "fraude-president",
    emoji: "📞",
    title: "Fraude au président / virement frauduleux",
    subtitle: "Un faux PDG ou faux fournisseur a obtenu un virement",
    shortDesc:
      "Le comptable a effectué un virement sur la base d'un faux email/appel. Première heure décisive pour annuler.",
    immediate: [
      {
        text: "Appeler immédiatement la banque émettrice (numéro de fraude prioritaire)",
        why: "Si le virement n'est pas exécuté, il peut être rappelé. Compteur en heures.",
      },
      {
        text: "Identifier l'IBAN destinataire et bloquer tous les virements vers ce compte",
        why: "Empêche un 2e virement si l'attaquant insiste.",
      },
      {
        text: "Vérifier si d'autres mails frauduleux sont en attente de validation",
        why: "Les attaques sont souvent en série sur plusieurs services.",
      },
      {
        text: "Conserver TOUS les emails/SMS/appels liés (sans répondre)",
        why: "Preuves cruciales pour la plainte et l'assurance.",
      },
      {
        text: "Alerter la direction et le service compta",
        why: "Pour éviter qu'un autre collaborateur tombe dans le même piège en parallèle.",
      },
    ],
    dontDo: [
      {
        text: "Ne PAS répondre au mail/appel frauduleux",
        why: "Renforce l'attaque sociale et donne des informations supplémentaires.",
      },
      {
        text: "Ne PAS supprimer les emails frauduleux",
        why: "Preuves. Conserver dans un dossier dédié.",
      },
      {
        text: "Ne PAS payer une 'rançon' demandée pour annuler",
        why: "Variante d'arnaque sur l'arnaque. La banque seule peut rappeler le virement.",
      },
      {
        text: "Ne PAS attendre le lendemain pour déclarer",
        why: "Après 24-72h, la chance de récupération chute drastiquement.",
      },
      {
        text: "Ne PAS communiquer en interne avant alignement avec la direction",
        why: "Limite la circulation d'information et la panique.",
      },
    ],
    within24h: [
      {
        text: "Déposer plainte en gendarmerie ou commissariat",
        why: "Obligation préalable à toute indemnisation par l'assurance ou la banque.",
      },
      {
        text: "Activer la cyber-assurance si vous en avez une",
        why: "Hotline 24h/7j, prise en charge frais juridique et investigation.",
      },
      {
        text: "Faire un signalement TRACFIN si montant > seuil",
        why: "Obligation légale pour certains secteurs (banque, immo, expert-comptable).",
      },
      {
        text: "Lancer un audit des process de validation virement (4 yeux, double appel, etc.)",
        why: "Éviter la récidive immédiate.",
      },
      {
        text: "Signaler sur cybermalveillance.gouv.fr",
        why: "Numéro de dossier officiel + orientation prestataires.",
      },
    ],
    tools: [
      {
        name: "PERCEVAL (signalement fraude bancaire)",
        url: "https://www.service-public.fr/particuliers/vosdroits/N31976",
        note: "Service du ministère de l'Intérieur pour signaler la fraude",
      },
      {
        name: "PHAROS (signalement contenu illicite)",
        url: "https://www.internet-signalement.gouv.fr",
        note: "Signalement officiel du contenu mensonger en ligne",
      },
      {
        name: "Tracfin (déclaration soupçon)",
        url: "https://www.economie.gouv.fr/tracfin",
        note: "Pour les professionnels assujettis à la lutte anti-blanchiment",
      },
    ],
    whenToCallHumanix:
      "Notre équipe peut intervenir sur site pour audit des processus comptables, formation flash anti-fraude, et accompagnement avec la banque. Sans sous-traitance.",
  },

  // -----------------------------------------------------------------------
  {
    slug: "compte-compromis",
    emoji: "🔓",
    title: "Compte compromis",
    subtitle:
      "Mot de passe volé, compte mail/CRM utilisé par un tiers, MFA contourné",
    shortDesc:
      "Quelqu'un d'autre a accès à un de vos comptes professionnels - emails sortants suspects, règles de transfert ajoutées, données consultées.",
    immediate: [
      {
        text: "Forcer la déconnexion de toutes les sessions actives",
        why: "Coupe l'accès immédiat de l'attaquant. Disponible dans tous les services pro.",
      },
      {
        text: "Changer le mot de passe sur un AUTRE appareil (pas celui compromis)",
        why: "Si le poste est compromis, le keylogger capture le nouveau mot de passe.",
      },
      {
        text: "Activer ou re-vérifier la double authentification MFA",
        why: "Empêche la reconnexion par mot de passe seul.",
      },
      {
        text: "Vérifier les règles de transfert de mails (Outlook, Gmail) et délégués",
        why: "Vecteur typique : l'attaquant met une règle 'tout copier vers email-attaquant'.",
      },
      {
        text: "Vérifier les applications/connexions OAuth tierces autorisées",
        why: "L'attaquant peut avoir créé un accès persistant via une app malveillante.",
      },
    ],
    dontDo: [
      {
        text: "Ne PAS continuer à utiliser le poste si keylogger suspecté",
        why: "Tous les nouveaux mots de passe sont compromis aussitôt saisis.",
      },
      {
        text: "Ne PAS ré-utiliser le mot de passe compromis ailleurs",
        why: "Credential stuffing : vos autres comptes seront testés en quelques heures.",
      },
      {
        text: "Ne PAS supprimer les emails suspects sortants envoyés en votre nom",
        why: "Preuves de l'utilisation frauduleuse.",
      },
      {
        text: "Ne PAS hésiter à alerter les contacts qui ont reçu des emails suspects",
        why: "Ils peuvent être cibles d'arnaque en aval (faux RIB, etc.).",
      },
      {
        text: "Ne PAS attendre pour notifier la CNIL si données personnelles consultées",
        why: "Délai 72h dès connaissance raisonnable.",
      },
    ],
    within24h: [
      {
        text: "Auditer les logs d'accès (date, IP, user-agent) sur 30 jours",
        why: "Détermine la durée de la compromission et les actions de l'attaquant.",
      },
      {
        text: "Lister les emails/fichiers consultés ou exfiltrés pendant la période",
        why: "Nécessaire pour notification CNIL si données personnelles touchées.",
      },
      {
        text: "Lancer la rotation des mots de passe sur les autres comptes liés",
        why: "Si l'attaquant a vu votre coffre-fort de mots de passe, tous sont à risque.",
      },
      {
        text: "Vérifier sur HaveIBeenPwned si vos credentials sont publiquement leakés",
        why: "Origine possible du compromise = autre fuite de service.",
      },
      {
        text: "Documenter l'incident dans votre registre RGPD (article 33-5)",
        why: "Obligation légale même si vous ne notifiez pas la CNIL.",
      },
    ],
    tools: [
      {
        name: "HaveIBeenPwned",
        url: "https://haveibeenpwned.com",
        note: "Vérifier si email + mot de passe sont leakés publiquement",
      },
      {
        name: "Microsoft 365 - vérifier connexions",
        url: "https://account.activedirectory.windowsazure.com/r#/profile",
        note: "Activité de connexion + applications tierces autorisées",
      },
      {
        name: "Google Workspace - sécurité du compte",
        url: "https://myaccount.google.com/security",
        note: "Connexions récentes + appareils + 2FA",
      },
    ],
    whenToCallHumanix:
      "Pour audit forensic complet du compte (timeline + impact), formation post-incident, et mise en place d'un MFA renforcé. Intervention sur site possible.",
  },

  // -----------------------------------------------------------------------
  {
    slug: "vol-perte-materiel",
    emoji: "💼",
    title: "Vol ou perte de matériel pro",
    subtitle: "Laptop, téléphone, clé USB ou disque externe disparu",
    shortDesc:
      "Le matériel contient des données pro (mails, fichiers, accès) - comportement immédiat conditionne le risque RGPD et métier.",
    immediate: [
      {
        text: "Bloquer/effacer à distance via le MDM ou les outils du fournisseur",
        why: "Apple Find My, Microsoft Intune, Google Find My Device : effacement à distance possible si chiffrement actif.",
      },
      {
        text: "Changer immédiatement les mots de passe des comptes auxquels le matériel avait accès",
        why: "L'attaquant peut tenter de se connecter depuis vos cookies/sessions cachés.",
      },
      {
        text: "Forcer la déconnexion des sessions actives (mail, CRM, drive)",
        why: "Coupe l'accès persistant même si le mot de passe n'a pas été changé.",
      },
      {
        text: "Identifier ce qui était stocké dessus (fichiers locaux, mails cachés, certificats, clés SSH)",
        why: "Le périmètre conditionne la suite (notification CNIL, auto-évaluation risque).",
      },
      {
        text: "Si vol : déposer plainte (bureau de police local) avec numéro série",
        why: "Obligatoire pour assurance + permet la géolocalisation par les forces de l'ordre si tracking actif.",
      },
    ],
    dontDo: [
      {
        text: "Ne PAS attendre pour bloquer les comptes",
        why: "Une heure de retard suffit pour exfiltrer des Go via le compte cloud resté connecté.",
      },
      {
        text: "Ne PAS réactiver le mot de passe initial 'au cas où il revient'",
        why: "Si le matériel revient compromis, votre nouveau mot de passe est instantanément volé.",
      },
      {
        text: "Ne PAS racheter un matériel d'occasion sans vérification d'origine",
        why: "Pourrait être votre propre laptop revendu après compromission.",
      },
      {
        text: "Ne PAS minimiser l'impact RGPD si données clients/RH stockées localement",
        why: "Notification CNIL probable. Anticipez plutôt que subir.",
      },
      {
        text: "Ne PAS oublier les périphériques associés (token YubiKey, smartcard)",
        why: "Si la clé physique est avec le matériel, ils peuvent contourner le MFA.",
      },
    ],
    within24h: [
      {
        text: "Notifier la CNIL si données personnelles non chiffrées stockées",
        why: "Si le disque est chiffré (BitLocker, FileVault), le risque est généralement faible.",
      },
      {
        text: "Demander à l'IT/RSSI un audit complet des permissions / certificats stockés",
        why: "Clés SSH, certificats VPN, mots de passe en cache : le périmètre est plus large que prévu.",
      },
      {
        text: "Activer la géolocalisation continue si ce n'est pas déjà fait",
        why: "Apple Find My, Google Find My Device : permet potentiellement récupération.",
      },
      {
        text: "Déclarer à la cyber-assurance si applicable",
        why: "Beaucoup couvrent le vol de matériel pro et l'investigation associée.",
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
        note: "Localiser, verrouiller, effacer à distance les Mac et iPhone",
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
      "Pour audit d'impact complet, mise en place d'un MDM (gestion des appareils) si absent, et formation aux réflexes de protection physique. Intervention sur site.",
  },
];

export const INCIDENTS_INDEX: Record<IncidentType, IncidentFiche> =
  Object.fromEntries(INCIDENTS.map((i) => [i.slug, i])) as Record<
    IncidentType,
    IncidentFiche
  >;
