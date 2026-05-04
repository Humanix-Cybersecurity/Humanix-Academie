// SPDX-License-Identifier: AGPL-3.0-or-later
// Catalogue de modules marketplace pré-seedés (community + officiels Humanix).
// Chaque module = 1 épisode autonome (5-8 min). Format respectant
// strictement lib/marketplace/schema.ts (pas de <, >, &, longueurs bornées).
//
// Status :
//  - APPROVED → visible dans la marketplace, installable
//  - PENDING_REVIEW → en attente, visible côté modérateur
//
// Author :
//  - "vincent" → SUPERADMIN Humanix, modules officiels (isOfficial: true)
//  - "lea"     → MANAGER PME démo, modules communauté
//  - "sophie"  → ADMIN PME démo, modules communauté

export type MarketplaceSeed = {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  category:
    | "phishing"
    | "mots-de-passe"
    | "donnees-sensibles"
    | "teletravail"
    | "fraude"
    | "reseaux-sociaux"
    | "crise"
    | "rgpd"
    | "ia-generative"
    | "autre";
  difficulty: "easy" | "medium" | "hard";
  author: "vincent" | "lea" | "sophie";
  authorOrgName: string;
  isOfficial: boolean;
  status: "APPROVED" | "PENDING_REVIEW";
  license: "CC_BY" | "CC_BY_SA" | "PROPRIETARY";
  payload: {
    episodes: Array<{
      title: string;
      durationMinutes: number;
      scenario: string;
      choices: Array<{
        id: string;
        label: string;
        outcome: "good" | "bad" | "neutral";
        feedback: string;
        points: number;
      }>;
      debrief: string;
      quiz: Array<{
        question: string;
        choices: Array<{ id: string; label: string; correct: boolean }>;
        explanation: string;
      }>;
      xpReward: number;
    }>;
  };
};

export const MARKETPLACE_MODULES: MarketplaceSeed[] = [
  // =========================================================================
  // 1. Bonnes pratiques de dev (officiel)
  // =========================================================================
  {
    slug: "bonnes-pratiques-dev",
    title: "Bonnes pratiques de dev sécurisé",
    description:
      "Code review, secrets en clair, dépendances : 3 réflexes pour un code défendable en prod.",
    emoji: "💻",
    category: "autre",
    difficulty: "medium",
    author: "vincent",
    authorOrgName: "Humanix Cybersecurity",
    isOfficial: true,
    status: "APPROVED",
    license: "PROPRIETARY",
    payload: {
      episodes: [
        {
          title: "Les 3 péchés du code prod",
          durationMinutes: 7,
          scenario:
            "Tu finalises une feature urgente avant la démo client. Tu as hardcodé la clé API Stripe en haut du fichier pour aller vite, tu as commit avec le message 'fix bug', et tu pushes direct sur main sans passer par une review. Ton CTO part en vacances ce soir.",
          choices: [
            {
              id: "a",
              label: "Je push, on verra plus tard",
              outcome: "bad",
              feedback:
                "Aïe : la clé API se retrouve dans l'historique git pour toujours. Même si tu la supprimes après, elle reste accessible via git log. Le bot GitHub Trufflehog la détectera en 2 minutes.",
              points: -20,
            },
            {
              id: "b",
              label:
                "Je crée une branche, je sors la clé en variable d'env, je fais une PR avec review",
              outcome: "good",
              feedback:
                "Réflexe pro : la clé reste hors du code, l'historique git est propre, la PR force une relecture.",
              points: 30,
            },
            {
              id: "c",
              label:
                "Je push direct mais je supprime la clé dans un commit suivant",
              outcome: "bad",
              feedback:
                "Trop tard : le commit initial est dans l'historique. Il faut révoquer la clé chez Stripe et nettoyer l'historique avec git filter-branch (douloureux).",
              points: -10,
            },
          ],
          debrief:
            "Trois principes non négociables : 1) zéro secret hardcodé (utilise .env, vault, secrets manager) ; 2) zéro push direct sur main (PR + au moins 1 review) ; 3) commits messages explicites (pour pouvoir tracer une régression). Bonus : active gitleaks ou trufflehog en pre-commit hook pour bloquer les fuites avant qu'elles ne partent.",
          quiz: [
            {
              question:
                "Une clé API hardcodée commitée puis supprimée dans un commit suivant est :",
              choices: [
                {
                  id: "a",
                  label: "Toujours présente dans l'historique git",
                  correct: true,
                },
                { id: "b", label: "Effacée définitivement", correct: false },
              ],
              explanation:
                "Git conserve toute l'histoire. Un secret commité doit être révoqué côté provider, puis l'historique nettoyé (git filter-repo).",
            },
            {
              question: "Le minimum vital avant un push sur main :",
              choices: [
                {
                  id: "a",
                  label: "Une PR + relecture par un pair",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Un message de commit court",
                  correct: false,
                },
                {
                  id: "c",
                  label: "Que les tests passent en local",
                  correct: false,
                },
              ],
              explanation:
                "La review par un pair attrape les fautes de raisonnement, les regressions et les fuites de secrets. C'est le filet de sécurité humain.",
            },
          ],
          xpReward: 60,
        },
      ],
    },
  },

  // =========================================================================
  // 2. Bonnes pratiques d'hébergement (officiel)
  // =========================================================================
  {
    slug: "bonnes-pratiques-hebergement",
    title: "Bonnes pratiques d'hébergement",
    description:
      "Localisation, chiffrement, sauvegardes : choisir un hébergeur sans se faire avoir.",
    emoji: "🏗️",
    category: "autre",
    difficulty: "hard",
    author: "vincent",
    authorOrgName: "Humanix Cybersecurity",
    isOfficial: true,
    status: "APPROVED",
    license: "PROPRIETARY",
    payload: {
      episodes: [
        {
          title: "Le choix du cloud : pas que le prix",
          durationMinutes: 8,
          scenario:
            "Ton dirigeant te demande de migrer la base clients vers le cloud le moins cher. Tu trouves un hébergeur US à 30 pour cent moins cher qu'OVH ou Scaleway. Le commercial te dit : 'on a des serveurs en Europe, vous êtes RGPD'. Tu signes ?",
          choices: [
            {
              id: "a",
              label: "Oui, le serveur est en Europe, c'est bon",
              outcome: "bad",
              feedback:
                "Erreur fréquente : un hébergeur US, même avec serveurs en UE, reste soumis au Cloud Act et au FISA. Les autorités US peuvent demander accès aux données stockées en UE. Cela viole l'arrêt Schrems II.",
              points: -15,
            },
            {
              id: "b",
              label:
                "Je vérifie : nationalité juridique de l'hébergeur, sous-traitants, certifications SecNumCloud",
              outcome: "good",
              feedback:
                "Excellent : pour des données clients UE, vise un hébergeur de droit européen (OVH, Scaleway, Outscale, Clever Cloud). Pour des données sensibles, exige SecNumCloud (qualification ANSSI).",
              points: 30,
            },
            {
              id: "c",
              label: "Je demande juste une clause RGPD au contrat",
              outcome: "neutral",
              feedback:
                "Mieux que rien mais insuffisant : la clause ne te protège pas du Cloud Act. Le bon réflexe est de vérifier la nationalité juridique de l'entité signataire.",
              points: 5,
            },
          ],
          debrief:
            "Le RGPD n'est pas qu'une affaire de localisation des serveurs : c'est aussi le droit applicable à l'hébergeur. Un AWS Frankfurt reste juridiquement américain. Pour des données sensibles ou stratégiques, privilégie un hébergeur européen souverain. SecNumCloud (ANSSI) est le standard exigeant : isolement, chiffrement, contrôle d'accès, audit. Hyperscalers US passent en 'qualifié' uniquement via des montages comme Bleu (Microsoft x Capgemini x Orange).",
          quiz: [
            {
              question:
                "Un cloud US avec datacenter à Paris est-il automatiquement RGPD-compliant ?",
              choices: [
                {
                  id: "a",
                  label: "Non, le Cloud Act US prévaut sur la localisation",
                  correct: true,
                },
                { id: "b", label: "Oui, c'est en Europe", correct: false },
              ],
              explanation:
                "L'arrêt Schrems II (CJUE 2020) a invalidé le Privacy Shield. Pour des données personnelles UE, la nationalité juridique de l'hébergeur compte autant que la localisation physique.",
            },
            {
              question: "La qualification SecNumCloud est délivrée par :",
              choices: [
                { id: "a", label: "L'ANSSI", correct: true },
                { id: "b", label: "La CNIL", correct: false },
                { id: "c", label: "La Commission européenne", correct: false },
              ],
              explanation:
                "L'ANSSI qualifie SecNumCloud comme référentiel français de cloud souverain et sécurisé.",
            },
          ],
          xpReward: 70,
        },
      ],
    },
  },

  // =========================================================================
  // 3. Protection CI/CD (officiel)
  // =========================================================================
  {
    slug: "protection-cicd",
    title: "Protéger sa chaîne CI/CD",
    description:
      "Secrets en pipeline, dépendances pourries, runner compromis : durcir GitHub Actions et GitLab CI.",
    emoji: "🔧",
    category: "autre",
    difficulty: "hard",
    author: "vincent",
    authorOrgName: "Humanix Cybersecurity",
    isOfficial: true,
    status: "APPROVED",
    license: "PROPRIETARY",
    payload: {
      episodes: [
        {
          title: "Le pipeline qui fuit",
          durationMinutes: 7,
          scenario:
            "Un dev de ton équipe ajoute une nouvelle action GitHub : 'awesome-deploy@v1' trouvée sur le marketplace. Elle simplifie le déploiement. Elle a accès à secrets.AWS_KEY parce qu'elle déploie sur S3. Le repo source de l'action n'est pas pinné par hash, juste par tag.",
          choices: [
            {
              id: "a",
              label: "Si elle a 200 stars, c'est bon",
              outcome: "bad",
              feedback:
                "Les attaques de supply chain via GitHub Actions explosent. Un mainteneur qui compromet son tag v1 peut exfiltrer tous les secrets de tous les pipelines qui utilisent l'action.",
              points: -15,
            },
            {
              id: "b",
              label:
                "Je pinne par hash SHA, je limite les secrets exposés, et je revois le code de l'action",
              outcome: "good",
              feedback:
                "Pratique standard pro : 'uses: org/action@abc123' (hash 40 caractères) figeule l'action. Plus de surprise sur push silencieux d'une nouvelle version.",
              points: 30,
            },
            {
              id: "c",
              label: "Je pinne juste sur la version v1.2.3",
              outcome: "neutral",
              feedback:
                "Mieux que '@v1' (qui suit le dernier patch) mais une release peut être republished avec un payload malicieux. Le hash SHA est la seule garantie d'immutabilité.",
              points: 10,
            },
          ],
          debrief:
            "La CI/CD est devenue la cible n°1 du supply chain attack (cf. SolarWinds, Codecov, GitHub Actions tj-actions/changed-files en 2025). Hardening minimum : 1) pin par SHA et pas par tag ; 2) principe du moindre privilège sur les secrets (un secret = une action) ; 3) runners self-hosted isolés, jamais réutilisés entre repos ; 4) provenance SLSA + SBOM ; 5) blocage des actions tierces non auditées via allowlist.",
          quiz: [
            {
              question:
                "Pour qu'une GitHub Action soit immutable, on la pinne :",
              choices: [
                {
                  id: "a",
                  label: "Par hash SHA complet (40 caractères)",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Par tag de version (v1.2.3)",
                  correct: false,
                },
                { id: "c", label: "Par tag majeur (v1)", correct: false },
              ],
              explanation:
                "Un tag git est un pointeur mutable. Seul le SHA garantit que le contenu ne changera jamais.",
            },
            {
              question: "Un runner CI self-hosted devrait être :",
              choices: [
                {
                  id: "a",
                  label: "Éphémère et isolé par exécution",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Persistant pour gagner du temps",
                  correct: false,
                },
              ],
              explanation:
                "Un runner persistant accumule des artefacts entre exécutions. Une action malicieuse peut laisser une backdoor pour la prochaine pipeline.",
            },
          ],
          xpReward: 70,
        },
      ],
    },
  },

  // =========================================================================
  // 4. Intervention à distance (community Lea)
  // =========================================================================
  {
    slug: "intervention-poste-distance",
    title: "Intervenir sur un poste à distance",
    description:
      "TeamViewer, AnyDesk, RustDesk : qui peut prendre la main, et dans quelles conditions.",
    emoji: "🖥️",
    category: "autre",
    difficulty: "medium",
    author: "lea",
    authorOrgName: "PME Démo (RH)",
    isOfficial: false,
    status: "APPROVED",
    license: "CC_BY_SA",
    payload: {
      episodes: [
        {
          title: "Mon poste rame, le support arrive",
          durationMinutes: 6,
          scenario:
            "Tu reçois un appel : 'Bonjour, c'est le support Microsoft, on a détecté un virus sur votre poste. Téléchargez TeamViewer et donnez-moi le code, je règle ça en 5 minutes.' L'interlocuteur connaît ton nom et ton entreprise.",
          choices: [
            {
              id: "a",
              label: "Je télécharge et je donne le code, ils sont rapides",
              outcome: "bad",
              feedback:
                "Tu viens de donner accès complet à ton poste à un escroc. Variantes connues : faux support Microsoft, faux service informatique, faux antivirus. Une fois connecté, ils chiffrent ou volent des données pour rançon.",
              points: -20,
            },
            {
              id: "b",
              label:
                "Je raccroche et j'appelle le numéro officiel de mon DSI ou prestataire IT",
              outcome: "good",
              feedback:
                "Réflexe en or : aucun support légitime ne t'appelle de manière non sollicitée. Vérification par canal de confiance.",
              points: 30,
            },
            {
              id: "c",
              label: "Je leur demande de prouver leur identité par mail",
              outcome: "neutral",
              feedback:
                "Bon réflexe partiel mais l'escroc a aussi ton mail. Mieux : raccroche et rappelle TON support avec le numéro que TU connais déjà.",
              points: 10,
            },
          ],
          debrief:
            "L'attaque par fausse intervention est extrêmement répandue (arnaque type Tech Support Scam). Règle absolue : un support légitime ne t'appelle JAMAIS spontanément pour t'aider. Si tu as un vrai souci, c'est TOI qui appelles ton support, sur le numéro que tu connais. Côté entreprise : avoir une procédure écrite (qui appelle, par quel canal) et la former. Côté outil : préfère des solutions où l'utilisateur DOIT initier la session (pas de prise en main passive sans accord explicite).",
          quiz: [
            {
              question:
                "Un support légitime te contacte spontanément pour t'aider :",
              choices: [
                {
                  id: "a",
                  label: "Très rare. Toujours suspect par défaut",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Normal, c'est bienveillant",
                  correct: false,
                },
              ],
              explanation:
                "99 pour cent du temps, le support attend que TU appelles. L'inverse est un signal d'arnaque.",
            },
            {
              question: "Avant d'autoriser une prise en main, tu dois :",
              choices: [
                {
                  id: "a",
                  label:
                    "Vérifier l'identité par un canal indépendant que TU choisis",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Faire confiance si la personne connaît ton nom",
                  correct: false,
                },
              ],
              explanation:
                "Connaître ton nom et ton entreprise est trivial via LinkedIn ou OSINT. Cela ne prouve rien.",
            },
          ],
          xpReward: 50,
        },
      ],
    },
  },

  // =========================================================================
  // 5. Reset MFA au support (community Sophie)
  // =========================================================================
  {
    slug: "reset-mfa-support",
    title: "Reset MFA au support : qui valide quoi",
    description:
      "Le maillon faible n'est pas le MFA, c'est sa procédure de réinitialisation.",
    emoji: "🔄",
    category: "autre",
    difficulty: "medium",
    author: "sophie",
    authorOrgName: "PME Démo (Direction)",
    isOfficial: false,
    status: "APPROVED",
    license: "CC_BY_SA",
    payload: {
      episodes: [
        {
          title: "L'appel du support à 18h",
          durationMinutes: 6,
          scenario:
            "Tu es support IT d'une PME. À 18h vendredi, un appel : 'Bonjour, c'est Marc Dupont du commercial, j'ai perdu mon téléphone avec l'app Authenticator, je dois absolument accéder à mes mails ce soir pour un client. Tu peux reset mon MFA en urgence ?'",
          choices: [
            {
              id: "a",
              label: "Le pauvre, je reset et je lui envoie un nouveau code",
              outcome: "bad",
              feedback:
                "Tu viens de tomber dans une attaque de social engineering classique. L'attaquant connaissait juste le nom 'Marc Dupont' (LinkedIn) et a joué l'urgence. Il a maintenant accès au compte mail.",
              points: -20,
            },
            {
              id: "b",
              label:
                "Je lui demande de venir physiquement le lundi avec sa pièce d'identité, ou j'appelle son N+1 sur SON numéro pro pour valider",
              outcome: "good",
              feedback:
                "Procédure correcte : tu vérifies l'identité par un canal indépendant que tu contrôles. L'urgence n'est jamais une excuse pour shorter la sécurité.",
              points: 30,
            },
            {
              id: "c",
              label:
                "Je lui pose 2-3 questions de sécurité (date de naissance, dernière connexion)",
              outcome: "bad",
              feedback:
                "Insuffisant : ces infos sont en partie publiques (LinkedIn, Pages Blanches) ou volables par phishing. Il faut un canal hors-bande.",
              points: -5,
            },
          ],
          debrief:
            "Le MFA est aussi solide que sa procédure de reset. Beaucoup d'attaques contournent le MFA en se faisant passer pour l'utilisateur auprès du support. Procédure type à appliquer : 1) jamais de reset uniquement sur appel ; 2) vérification par canal indépendant (manager, RH, présence physique) ; 3) traçabilité écrite (ticket horodaté, identité du valideur) ; 4) procédure d'urgence formalisée pour les cas légitimes (clé de secours scellée, code-mot validé par 2 personnes).",
          quiz: [
            {
              question:
                "Une demande de reset MFA en urgence par téléphone est :",
              choices: [
                {
                  id: "a",
                  label:
                    "Un signal d'alerte qui exige une vérification hors-bande",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Un cas légitime qu'il faut traiter vite",
                  correct: false,
                },
              ],
              explanation:
                "L'urgence est un levier classique de social engineering. La règle : plus c'est urgent, plus on vérifie.",
            },
            {
              question: "Le canal de vérification doit être :",
              choices: [
                {
                  id: "a",
                  label: "Initié par le support (rappel sur numéro pro connu)",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Le téléphone donné par le demandeur lui-même",
                  correct: false,
                },
              ],
              explanation:
                "Si l'attaquant te donne son numéro, il contrôle le canal. Tu dois rappeler sur le numéro que TU connais (annuaire interne).",
            },
          ],
          xpReward: 60,
        },
      ],
    },
  },

  // =========================================================================
  // 6. BYOD (community Lea)
  // =========================================================================
  {
    slug: "cas-byod",
    title: "Le cas BYOD : son perso au boulot",
    description:
      "Mon téléphone perso pour les mails pro : ce qui est OK, ce qui est interdit.",
    emoji: "📱",
    category: "teletravail",
    difficulty: "medium",
    author: "lea",
    authorOrgName: "PME Démo (RH)",
    isOfficial: false,
    status: "APPROVED",
    license: "CC_BY_SA",
    payload: {
      episodes: [
        {
          title: "Mon téléphone perso, mes mails pro",
          durationMinutes: 6,
          scenario:
            "Ton dirigeant te dit : 'On a pas de budget pour des téléphones pro, mets juste tes mails Outlook sur ton tel perso.' Tu installes l'app, tu te connectes, tu valides la demande de 'gérer le device'. Trois mois plus tard, tu démissionnes.",
          choices: [
            {
              id: "a",
              label: "Je quitte, mes mails restent dans l'app Outlook",
              outcome: "bad",
              feedback:
                "Risque RGPD majeur : des mails clients restent sur ton appareil personnel après ton départ. Si tu perds le téléphone ou si tu le vends, fuite garantie. Côté employeur, c'est non conforme.",
              points: -10,
            },
            {
              id: "b",
              label:
                "Avant, j'exige une charte BYOD écrite avec MDM, container pro/perso et procédure de wipe au départ",
              outcome: "good",
              feedback:
                "Excellente exigence : Microsoft Intune, Google Workspace, ou MDM tiers cloisonnent les données pro dans un container chiffré. Au départ, l'employeur wipe UNIQUEMENT le container pro.",
              points: 30,
            },
            {
              id: "c",
              label: "Je supprime juste l'app Outlook au départ",
              outcome: "neutral",
              feedback:
                "Mieux que rien mais incomplet : des fichiers téléchargés (PDF clients, photos prises pendant un déplacement) peuvent rester ailleurs sur le téléphone.",
              points: 10,
            },
          ],
          debrief:
            "Le BYOD ('Bring Your Own Device') sans cadre est une bombe RGPD à retardement. Cadre minimum : 1) charte BYOD signée par les 2 parties ; 2) MDM avec containerisation (les données pro vivent dans un espace chiffré séparé du perso) ; 3) au départ, wipe ciblé du seul container pro (l'employeur ne peut pas effacer les photos perso) ; 4) pour des données sensibles (financières, médicales), proscrire le BYOD au profit d'un appareil pro fourni.",
          quiz: [
            {
              question: "BYOD sans MDM ni charte, c'est :",
              choices: [
                {
                  id: "a",
                  label:
                    "Une fuite de données quasi-garantie au départ d'un salarié",
                  correct: true,
                },
                { id: "b", label: "Une économie maligne", correct: false },
              ],
              explanation:
                "Sans cloisonnement technique, l'employeur n'a aucun moyen propre d'effacer les données pro à la fin du contrat sans toucher au perso.",
            },
            {
              question: "Le 'container pro' dans un MDM permet :",
              choices: [
                {
                  id: "a",
                  label:
                    "D'effacer uniquement les données pro sans toucher au perso",
                  correct: true,
                },
                {
                  id: "b",
                  label: "De suivre la position GPS du salarié",
                  correct: false,
                },
              ],
              explanation:
                "Le container isole les apps et fichiers pro. Le wipe est sélectif. Le respect de la vie privée du salarié est ainsi garanti.",
            },
          ],
          xpReward: 50,
        },
      ],
    },
  },

  // =========================================================================
  // 7. Admin de son poste (community Lea)
  // =========================================================================
  {
    slug: "admin-de-son-poste",
    title: "Admin de son poste : utile ou dangereux",
    description:
      "Pourquoi le compte admin sur ton ordi pro double la surface d'attaque.",
    emoji: "🛡️",
    category: "teletravail",
    difficulty: "easy",
    author: "lea",
    authorOrgName: "PME Démo (RH)",
    isOfficial: false,
    status: "APPROVED",
    license: "CC_BY_SA",
    payload: {
      episodes: [
        {
          title: "Tu veux installer ce logiciel ?",
          durationMinutes: 5,
          scenario:
            "Tu reçois ton nouvel ordi pro. Le DSI t'a créé un compte standard, pas admin. Tu veux installer un outil de capture d'écran que tu utilises depuis 10 ans. Une popup te demande le mot de passe admin. Le DSI met 3 jours à répondre. Tu trouves le mot de passe admin dans un post-it d'un ancien collègue.",
          choices: [
            {
              id: "a",
              label: "Je l'utilise pour gagner du temps, je le rends après",
              outcome: "bad",
              feedback:
                "Tu fragilises tout : un malware exécuté pendant ta session admin obtient les mêmes droits, soit l'accès complet à la machine. Le post-it doit être détruit immédiatement.",
              points: -15,
            },
            {
              id: "b",
              label:
                "Je signale la fuite du mot de passe au DSI et je passe par le canal d'install officiel",
              outcome: "good",
              feedback:
                "Réflexe parfait : tu protèges l'entreprise et tu utilises la procédure prévue.",
              points: 30,
            },
            {
              id: "c",
              label: "Je l'utilise juste pour cet outil, c'est pas grave",
              outcome: "bad",
              feedback:
                "Le concept de 'juste cette fois' est exactement la faille. Ouvre la session admin une seule fois, ouvre par accident un mail piégé pendant cette session, tu es compromis.",
              points: -10,
            },
          ],
          debrief:
            "Le compte standard (non-admin) est la fondation du moindre privilège : si un malware s'exécute, il hérite seulement de tes droits limités. Le compte admin doit être réservé aux installations volontaires, et idéalement séparé de ton compte de travail quotidien (un admin connecte explicitement quand il a besoin, pas H24). La règle d'or : aucun mot de passe admin sur un post-it, aucun partage entre collègues, et zéro réutilisation entre serveurs et postes.",
          quiz: [
            {
              question: "Travailler en compte admin au quotidien :",
              choices: [
                {
                  id: "a",
                  label: "Multiplie l'impact d'un éventuel malware",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Améliore la productivité sans risque",
                  correct: false,
                },
              ],
              explanation:
                "Un malware exécuté hérite des droits du compte courant. En admin, il peut tout faire ; en standard, il est très limité.",
            },
            {
              question: "Un mot de passe admin partagé sur un post-it est :",
              choices: [
                {
                  id: "a",
                  label: "Une vulnérabilité majeure, à signaler et changer",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Une commodité acceptable en PME",
                  correct: false,
                },
              ],
              explanation:
                "Un mot de passe admin doit être unique, fort, et stocké dans un coffre (KeePass, Bitwarden, vault). Jamais en clair.",
            },
          ],
          xpReward: 40,
        },
      ],
    },
  },

  // =========================================================================
  // 8. Moindre privilège (officiel)
  // =========================================================================
  {
    slug: "principe-moindre-privilege",
    title: "Le principe du moindre privilège",
    description:
      "Donner le strict minimum : un concept simple qui désamorce 80 pour cent des incidents.",
    emoji: "🔐",
    category: "autre",
    difficulty: "medium",
    author: "vincent",
    authorOrgName: "Humanix Cybersecurity",
    isOfficial: true,
    status: "APPROVED",
    license: "PROPRIETARY",
    payload: {
      episodes: [
        {
          title: "Le stage qui devient tragédie",
          durationMinutes: 6,
          scenario:
            "Un stagiaire arrive en compta. Pour aller vite, le DSI lui donne le même profil que le DAF : accès à toute la BDD compta, exports illimités, modification des écritures. Le stagiaire clique par erreur sur un lien dans un mail piégé. Son poste est compromis.",
          choices: [
            {
              id: "a",
              label: "Pas grave, c'est juste un stagiaire",
              outcome: "bad",
              feedback:
                "Faux : le stagiaire avait les mêmes droits que le DAF. L'attaquant a maintenant accès à toute la BDD compta, peut exfiltrer les données et modifier les écritures avant la clôture.",
              points: -15,
            },
            {
              id: "b",
              label:
                "Je revois la politique d'accès : chaque rôle a strictement les droits dont il a besoin",
              outcome: "good",
              feedback:
                "Excellent : c'est le principe du moindre privilège (least privilege). Un stagiaire en saisie n'a besoin que de saisir, pas d'exporter ni de modifier les écritures clôturées.",
              points: 30,
            },
            {
              id: "c",
              label: "Je laisse, mais j'active des logs",
              outcome: "neutral",
              feedback:
                "Les logs détectent après coup. Le moindre privilège prévient avant. Ce n'est pas l'un OU l'autre, c'est les deux.",
              points: 5,
            },
          ],
          debrief:
            "Le principe du moindre privilège (Least Privilege Principle, NIST SP 800-53) consiste à n'attribuer à chaque utilisateur, application ou service que les droits strictement nécessaires à sa tâche. Il s'applique partout : accès fichiers, droits BDD, rôles cloud (IAM), permissions d'app mobile. Bénéfices concrets : 1) limite la casse en cas de compromission ; 2) facilite l'audit (on sait qui peut quoi) ; 3) force à documenter les rôles métier. Anti-pattern à bannir : 'j'ai donné admin à tout le monde, on verra plus tard'.",
          quiz: [
            {
              question: "Le moindre privilège, c'est :",
              choices: [
                {
                  id: "a",
                  label:
                    "N'attribuer que les droits strictement nécessaires à la tâche",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Mettre tout le monde en lecture seule",
                  correct: false,
                },
              ],
              explanation:
                "C'est l'ajustement précis du droit à la fonction. Pas un nivellement par le bas généralisé.",
            },
            {
              question: "Un stagiaire en saisie compta a besoin de :",
              choices: [
                {
                  id: "a",
                  label:
                    "Saisir uniquement, pas exporter ni modifier les écritures clôturées",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Tous les droits du DAF pour aller vite",
                  correct: false,
                },
              ],
              explanation:
                "Le rôle 'saisie' est limité par construction. C'est exactement le moindre privilège appliqué.",
            },
          ],
          xpReward: 60,
        },
      ],
    },
  },

  // =========================================================================
  // 9. Zero knowledge protocol (officiel)
  // =========================================================================
  {
    slug: "zero-knowledge-protocol",
    title: "Zero-Knowledge : prouver sans révéler",
    description:
      "Pourquoi ton coffre Bitwarden ne peut pas, techniquement, lire tes mots de passe.",
    emoji: "🤐",
    category: "donnees-sensibles",
    difficulty: "hard",
    author: "vincent",
    authorOrgName: "Humanix Cybersecurity",
    isOfficial: true,
    status: "APPROVED",
    license: "PROPRIETARY",
    payload: {
      episodes: [
        {
          title: "Le coffre que personne ne peut ouvrir",
          durationMinutes: 7,
          scenario:
            "Tu compares deux gestionnaires de mots de passe pour ta PME. L'éditeur A te dit : 'Si vous oubliez votre mot de passe maître, on peut le réinitialiser.' L'éditeur B te dit : 'Si vous l'oubliez, vous perdez tout, y compris nous on ne peut pas vous aider.' Le commercial te pousse vers A.",
          choices: [
            {
              id: "a",
              label: "Je prends A, c'est plus pratique",
              outcome: "bad",
              feedback:
                "Si l'éditeur peut reset ton mot de passe, c'est qu'il a accès au déchiffrement de ton coffre. Donc il peut lire tes mots de passe. Donc un attaquant qui compromet l'éditeur lit aussi tout. C'est l'inverse du zero-knowledge.",
              points: -15,
            },
            {
              id: "b",
              label:
                "Je prends B : zero-knowledge, l'éditeur ne peut techniquement rien voir",
              outcome: "good",
              feedback:
                "Excellent : Bitwarden, 1Password, KeePass, Proton sont en zero-knowledge. Le mot de passe maître ne quitte jamais ton appareil ; il dérive la clé qui chiffre ton coffre localement.",
              points: 30,
            },
          ],
          debrief:
            "Zero-Knowledge Protocol (ZKP) : ton fournisseur stocke tes données mais ne peut PAS les déchiffrer car il ne connaît pas ta clé. Avantages : 1) une compromission de l'éditeur ne révèle pas tes secrets (Bitwarden hack 2022 = aucun mot de passe lu) ; 2) résistance aux subpoenas : l'éditeur ne peut pas livrer ce qu'il ne lit pas. Limite : si tu perds ton mot de passe maître, c'est définitif. Bonne pratique : générer une clé de récupération imprimée, stockée hors-ligne dans un coffre physique.",
          quiz: [
            {
              question:
                "Si un éditeur peut réinitialiser ton mot de passe maître, c'est qu'il :",
              choices: [
                {
                  id: "a",
                  label: "Peut techniquement lire tes données chiffrées",
                  correct: true,
                },
                { id: "b", label: "Est juste plus serviable", correct: false },
              ],
              explanation:
                "Le reset implique l'accès au déchiffrement. Donc l'éditeur a une copie de la clé. Donc ce n'est pas zero-knowledge.",
            },
            {
              question: "Le zero-knowledge protège contre :",
              choices: [
                {
                  id: "a",
                  label: "La compromission du fournisseur lui-même",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Tes propres erreurs de mot de passe maître",
                  correct: false,
                },
              ],
              explanation:
                "ZKP empêche le fournisseur de lire tes données. Mais si TU perds ton mot de passe maître, personne ne peut t'aider — c'est le compromis assumé.",
            },
          ],
          xpReward: 70,
        },
      ],
    },
  },

  // =========================================================================
  // 10. Signature des commits (officiel)
  // =========================================================================
  {
    slug: "signature-des-commits",
    title: "Signer ses commits Git",
    description:
      "Comment prouver que c'est bien toi qui as commité, et pas un attaquant qui se fait passer pour toi.",
    emoji: "✍️",
    category: "autre",
    difficulty: "medium",
    author: "vincent",
    authorOrgName: "Humanix Cybersecurity",
    isOfficial: true,
    status: "APPROVED",
    license: "PROPRIETARY",
    payload: {
      episodes: [
        {
          title: "Le commit qui n'est pas le mien",
          durationMinutes: 7,
          scenario:
            "Tu es lead dev. Tu vois passer un commit dans master signé 'Marc Dupont, marc@boite.fr'. Sauf que Marc t'a juré qu'il n'avait rien commité hier. Vous découvrez qu'un attaquant a compromis le poste d'un autre dev et a poussé du code en falsifiant le nom et l'email Marc dans la config git locale.",
          choices: [
            {
              id: "a",
              label: "Pas grave, on va surveiller",
              outcome: "bad",
              feedback:
                "Sans signature, l'auteur d'un commit n'est qu'une chaîne de texte modifiable par quiconque. L'attaquant peut continuer à pousser du code en se faisant passer pour n'importe qui de l'équipe.",
              points: -15,
            },
            {
              id: "b",
              label:
                "On active la signature GPG ou Sigstore obligatoire pour merger sur main",
              outcome: "good",
              feedback:
                "Excellent : seuls les commits cryptographiquement signés par une clé connue de l'équipe peuvent atterrir en production. L'usurpation devient impossible.",
              points: 30,
            },
            {
              id: "c",
              label: "On met juste plus de reviewers sur les PR",
              outcome: "neutral",
              feedback:
                "Bon, mais insuffisant : un reviewer voit le nom de l'auteur tel que présenté par git. Il ne peut pas distinguer un faux d'un vrai sans signature.",
              points: 5,
            },
          ],
          debrief:
            "La signature de commit (GPG, SSH, ou Sigstore/gitsign) prouve cryptographiquement l'identité de l'auteur. Sans elle, 'Author: Bob' dans git log est juste une étiquette modifiable. Mise en place : 1) chaque dev génère une clé ; 2) la clé publique est ajoutée à GitHub/GitLab ; 3) git config commit.gpgsign true ; 4) côté repo : règle de protection 'require signed commits'. Sigstore/keyless (gitsign) est l'évolution moderne : pas de gestion de clé GPG, signature via OIDC (Google, GitHub).",
          quiz: [
            {
              question:
                "Sans signature de commit, le champ 'Author' dans git log est :",
              choices: [
                {
                  id: "a",
                  label: "Modifiable par n'importe qui",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Cryptographiquement vérifié",
                  correct: false,
                },
              ],
              explanation:
                "git config user.name et user.email peuvent contenir n'importe quoi. Aucune vérification par défaut.",
            },
            {
              question: "L'évolution moderne de la signature GPG s'appelle :",
              choices: [
                {
                  id: "a",
                  label: "Sigstore / gitsign (signature keyless via OIDC)",
                  correct: true,
                },
                { id: "b", label: "MD5", correct: false },
                { id: "c", label: "SHA-256", correct: false },
              ],
              explanation:
                "Sigstore signe via une identité fédérée (Google, GitHub) avec un certificat éphémère. Plus de clé GPG à gérer.",
            },
          ],
          xpReward: 60,
        },
      ],
    },
  },

  // =========================================================================
  // 11. Niveau de confidentialité (community Sophie)
  // =========================================================================
  {
    slug: "niveau-confidentialite",
    title: "Le bon niveau de confidentialité",
    description:
      "Public, interne, confidentiel, secret : comment classer un document pour ne pas tout protéger pareil.",
    emoji: "🏷️",
    category: "donnees-sensibles",
    difficulty: "easy",
    author: "sophie",
    authorOrgName: "PME Démo (Direction)",
    isOfficial: false,
    status: "APPROVED",
    license: "CC_BY_SA",
    payload: {
      episodes: [
        {
          title: "Tout chiffrer ou rien chiffrer",
          durationMinutes: 5,
          scenario:
            "Ton patron te dit : 'Mets un mot de passe sur tous nos documents, comme ça on est sûr.' Tu te retrouves à protéger des fiches recettes de la cantine ET le contrat de cession de la société avec le même process — c'est ingérable.",
          choices: [
            {
              id: "a",
              label: "Je mets un mot de passe partout, comme demandé",
              outcome: "bad",
              feedback:
                "Tout protéger = rien protéger, parce que les gens vont contourner (post-it, mots de passe simples, partage sur clé USB). La protection n'est suivie que si elle est proportionnée.",
              points: -10,
            },
            {
              id: "b",
              label:
                "Je propose une grille : Public / Interne / Confidentiel / Secret avec règles différentes",
              outcome: "good",
              feedback:
                "Bonne approche : seules les données sensibles méritent les protections fortes. Les autres peuvent circuler librement. C'est la classification (cf. ISO 27001).",
              points: 30,
            },
            {
              id: "c",
              label: "Je laisse tomber, c'est trop compliqué",
              outcome: "bad",
              feedback:
                "Risque inverse : tout circule en clair, y compris ce qui ne devrait pas. Le sujet est gérable avec 4 niveaux maximum.",
              points: -10,
            },
          ],
          debrief:
            "La classification est la base de la protection des données : on ne protège pas une recette de cantine et un brevet stratégique avec les mêmes outils. Schéma classique en 4 niveaux : 1) Public (site web, plaquettes) ; 2) Interne (organigramme, procédures, tout ce qui ne sort pas mais peut circuler en interne) ; 3) Confidentiel (contrats, RH, données clients) ; 4) Secret (brevets, M&A, plans stratégiques, accès très restreint). Chaque niveau a ses règles : stockage, transmission, droits d'accès, durée de rétention.",
          quiz: [
            {
              question:
                "Tout protéger pareil, indépendamment de la sensibilité, c'est :",
              choices: [
                {
                  id: "a",
                  label:
                    "Inefficace : les utilisateurs contournent les contrôles excessifs",
                  correct: true,
                },
                {
                  id: "b",
                  label: "La meilleure protection possible",
                  correct: false,
                },
              ],
              explanation:
                "Une politique non proportionnée crée du shadow IT (post-it, partage WhatsApp, clé USB). La proportionnalité est clé.",
            },
            {
              question: "Un brevet stratégique relève typiquement de :",
              choices: [
                {
                  id: "a",
                  label:
                    "Niveau Secret (accès très restreint, chiffrement, traçabilité)",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Niveau Public (puisque le brevet sera déposé)",
                  correct: false,
                },
              ],
              explanation:
                "Avant dépôt, un brevet doit rester ultra-confidentiel. Après dépôt il devient public, mais les variantes d'innovation associées restent souvent Secret.",
            },
          ],
          xpReward: 40,
        },
      ],
    },
  },

  // =========================================================================
  // 12. Transports en commun (community Lea)
  // =========================================================================
  {
    slug: "transports-en-commun",
    title: "Sécurité dans les transports en commun",
    description:
      "Wi-Fi public, écran visible, écouteurs partagés : les pièges quotidiens du métro et du train.",
    emoji: "🚆",
    category: "donnees-sensibles",
    difficulty: "easy",
    author: "lea",
    authorOrgName: "PME Démo (RH)",
    isOfficial: false,
    status: "APPROVED",
    license: "CC_BY_SA",
    payload: {
      episodes: [
        {
          title: "30 minutes de RER, 30 risques",
          durationMinutes: 5,
          scenario:
            "Tu prends le RER pour aller à un rendez-vous client. Tu en profites pour répondre à des mails. Le wagon est bondé. Ton voisin de droite peut clairement voir ton écran. Tu as connecté ton laptop au Wi-Fi 'SNCF_Free'. Tu as aussi sorti des documents papier 'Contrat client 2026'.",
          choices: [
            {
              id: "a",
              label: "Personne ne fait attention, je continue",
              outcome: "bad",
              feedback:
                "Faux sentiment de sécurité. Le shoulder surfing (espionnage par-dessus l'épaule) capte des mots de passe et des bouts de contrats. Le Wi-Fi public peut intercepter du trafic non chiffré. Les documents papier peuvent être photographiés.",
              points: -10,
            },
            {
              id: "b",
              label:
                "Je sors un filtre de confidentialité, j'utilise le 4G via partage de connexion, je range les papiers",
              outcome: "good",
              feedback:
                "Trois bonnes pratiques d'un coup : filtre écran (limite l'angle de vue), 4G perso au lieu du Wi-Fi public, et papier rangé tant que je ne suis pas seul.",
              points: 30,
            },
            {
              id: "c",
              label: "Je fais juste attention à ce que je tape",
              outcome: "neutral",
              feedback:
                "Mieux que rien mais le filtre écran et la 4G règlent le problème de manière passive, sans effort permanent.",
              points: 10,
            },
          ],
          debrief:
            "Le transport en commun cumule 3 risques : 1) shoulder surfing (visuel) ; 2) Wi-Fi public hostile (un attaquant peut monter un faux 'SNCF_Free' en quelques minutes) ; 3) écoute audio des conversations en visio. Boite à outils pratique : filtre de confidentialité 3M ou Belkin (~30 euros, dispo en plusieurs tailles), partage de connexion 4G du téléphone, écouteurs Bluetooth quand tu prends un appel pro. Les documents papier sensibles ne sortent jamais du sac dans un transport public.",
          quiz: [
            {
              question: "Un Wi-Fi public 'gratuit' nommé 'SNCF_Free' est :",
              choices: [
                {
                  id: "a",
                  label:
                    "Imitable en 5 minutes par un attaquant avec un Pineapple",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Forcément le vrai Wi-Fi de la SNCF",
                  correct: false,
                },
              ],
              explanation:
                "Un Wi-Fi Pineapple ou un simple smartphone peut diffuser un point d'accès du même nom. Tout le trafic non chiffré HTTPS y passe en clair pour l'attaquant.",
            },
            {
              question: "Le bon réflexe en transport bondé pour bosser :",
              choices: [
                {
                  id: "a",
                  label: "Filtre de confidentialité + 4G perso",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Tourner l'écran face à la fenêtre",
                  correct: false,
                },
              ],
              explanation:
                "Le filtre rend l'écran illisible au-delà de 30 degrés. La 4G évite le Wi-Fi public hostile. Combiné, c'est très robuste.",
            },
          ],
          xpReward: 40,
        },
      ],
    },
  },

  // =========================================================================
  // 13. Parler boulot dans le train (community Lea)
  // =========================================================================
  {
    slug: "parler-boulot-train",
    title: "Parler boulot dans le train",
    description:
      "Visio en gare, appels clients à voix haute : ce que tu donnes gratuitement à tes voisins.",
    emoji: "🗣️",
    category: "donnees-sensibles",
    difficulty: "easy",
    author: "lea",
    authorOrgName: "PME Démo (RH)",
    isOfficial: false,
    status: "APPROVED",
    license: "CC_BY_SA",
    payload: {
      episodes: [
        {
          title: "L'appel qui en dit trop",
          durationMinutes: 5,
          scenario:
            "Dans le TGV Paris-Lyon, ton voisin parle fort au téléphone. En 20 minutes tu as appris : le nom de son entreprise, le nom de son client, le montant du contrat (350 000 euros), les difficultés financières du client, et le prénom de son N+1 qu'il critique. Tu n'as rien fait pour entendre.",
          choices: [
            {
              id: "a",
              label: "C'est lui qui parle, c'est son problème",
              outcome: "neutral",
              feedback:
                "Vrai à titre individuel, mais les rôles peuvent s'inverser : si TOI tu parles fort, tu offres exactement ces infos à un concurrent ou un attaquant qui prépare une fraude au président.",
              points: 0,
            },
            {
              id: "b",
              label:
                "Je note : je ne ferai jamais ça. Mes appels sensibles attendent un endroit privé",
              outcome: "good",
              feedback:
                "Bonne prise de conscience : les conversations pro contiennent en moyenne plus de renseignement utile à un concurrent que ce qu'on imagine. Le train est un terrain de chasse pour la veille concurrentielle.",
              points: 30,
            },
            {
              id: "c",
              label: "Je l'enregistre pour rigoler",
              outcome: "bad",
              feedback:
                "Enregistrer une conversation à l'insu d'autrui est interdit en France (article 226-1 du Code pénal) sauf cas très précis. Mauvaise idée juridique et éthique.",
              points: -15,
            },
          ],
          debrief:
            "La fuite par conversation orale est l'une des plus sous-estimées. Les commerciaux concurrents et les enquêteurs OSINT exploitent activement les transports (TGV, vols, taxis). En 20 minutes d'écoute passive, on peut reconstruire un organigramme, un pipeline commercial, une stratégie. Règles de discipline : 1) jamais de noms de clients à voix haute ; 2) jamais de chiffres sensibles (montants, parts de marché) ; 3) si l'appel est urgent, sortir sur le quai à l'arrêt suivant ou utiliser le mode 'remettre à plus tard' avec un SMS du genre 'rappel à 16h depuis le bureau' ; 4) en visio, écouteurs obligatoires et caméra coupée si décor visible.",
          quiz: [
            {
              question:
                "Parler à voix haute d'un contrat client en TGV, c'est :",
              choices: [
                {
                  id: "a",
                  label:
                    "Du renseignement gratuit pour la concurrence et les attaquants",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Sans risque, personne n'écoute",
                  correct: false,
                },
              ],
              explanation:
                "Les transports professionnels sont fréquentés par tes concurrents directs. Les conversations sont une mine d'informations exploitables.",
            },
            {
              question: "Si l'appel est urgent en transport :",
              choices: [
                {
                  id: "a",
                  label: "Tu décales et tu rappelles depuis un endroit privé",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Tu prends sans contrainte, c'est urgent",
                  correct: false,
                },
              ],
              explanation:
                "Un SMS 'rappel à 16h' suffit dans 95 pour cent des cas. La sécurité passe avant la réactivité illusoire.",
            },
          ],
          xpReward: 40,
        },
      ],
    },
  },

  // =========================================================================
  // 14. Besoin d'en connaître (officiel)
  // =========================================================================
  {
    slug: "besoin-d-en-connaitre",
    title: "Le besoin d'en connaître",
    description:
      "Pourquoi limiter l'accès à une info, même pour quelqu'un de confiance qui pourrait la voir.",
    emoji: "🔍",
    category: "donnees-sensibles",
    difficulty: "medium",
    author: "vincent",
    authorOrgName: "Humanix Cybersecurity",
    isOfficial: true,
    status: "APPROVED",
    license: "PROPRIETARY",
    payload: {
      episodes: [
        {
          title: "Une note pour le DAF, et seulement pour lui",
          durationMinutes: 6,
          scenario:
            "Tu prépares une note d'analyse pour ton DAF sur un projet d'acquisition. Ton DG passe et te dit : 'Ah, mets aussi en copie tout le ComEx, ça intéresse tout le monde.' La note contient les chiffres confidentiels de la cible et l'offre que vous allez faire.",
          choices: [
            {
              id: "a",
              label: "OK, je mets tout le ComEx en copie",
              outcome: "bad",
              feedback:
                "Tu viens d'élargir le cercle de ceux qui connaissent l'opération. Plus le cercle est large, plus le risque de fuite est élevé (insider trading, négociation faussée, dépression de la cible si elle apprend la rumeur).",
              points: -15,
            },
            {
              id: "b",
              label:
                "Je propose au DG une note résumée pour le ComEx, et la version complète uniquement pour le DAF",
              outcome: "good",
              feedback:
                "Excellent : tu appliques le besoin d'en connaître. Chacun reçoit ce qu'il lui faut pour son rôle, ni plus ni moins.",
              points: 30,
            },
            {
              id: "c",
              label: "Je fais ce que dit le DG, c'est lui qui décide",
              outcome: "neutral",
              feedback:
                "L'autorité hiérarchique ne dispense pas du devoir d'alerter sur un risque. Tu peux dire oui en proposant un format adapté, c'est la posture pro.",
              points: 0,
            },
          ],
          debrief:
            "Le 'besoin d'en connaître' (need-to-know) est un principe né dans le militaire et le renseignement, repris en cybersécurité d'entreprise : avoir une habilitation suffisante NE SUFFIT PAS pour accéder à une information. Il faut aussi en avoir BESOIN pour son rôle. Cas d'usage : sur une opération M&A, seuls 5-10 personnes doivent connaître. Sur un licenciement, seuls le RH, le N+1 et la paie. Sur un brevet, l'inventeur et 2-3 personnes du juridique. Le 'besoin d'en connaître' réduit la surface d'attaque et la probabilité de fuite, qu'elle soit intentionnelle ou accidentelle.",
          quiz: [
            {
              question:
                "Le besoin d'en connaître ajoute au principe d'habilitation :",
              choices: [
                {
                  id: "a",
                  label:
                    "Le fait d'avoir une raison opérationnelle de voir l'info",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Une couche bureaucratique inutile",
                  correct: false,
                },
              ],
              explanation:
                "Habilité oui, mais pour cette info précise et ce moment précis. Les deux conditions sont cumulatives.",
            },
            {
              question: "Sur une opération M&A, le bon réflexe est :",
              choices: [
                {
                  id: "a",
                  label: "Cercle minimal, communications cloisonnées par phase",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Informer largement pour faire adhérer",
                  correct: false,
                },
              ],
              explanation:
                "Plus le cercle est large, plus la fuite est probable. L'élargissement se fait par étapes contrôlées.",
            },
          ],
          xpReward: 60,
        },
      ],
    },
  },

  // =========================================================================
  // 15. Diffusion restreinte (officiel)
  // =========================================================================
  {
    slug: "diffusion-restreinte",
    title: "Diffusion Restreinte : la mention qui change tout",
    description:
      "DR, secret commercial, NDA : reconnaître et traiter un document sensible en PME.",
    emoji: "📜",
    category: "donnees-sensibles",
    difficulty: "medium",
    author: "vincent",
    authorOrgName: "Humanix Cybersecurity",
    isOfficial: true,
    status: "APPROVED",
    license: "PROPRIETARY",
    payload: {
      episodes: [
        {
          title: "Le PDF marqué Diffusion Restreinte",
          durationMinutes: 6,
          scenario:
            "Tu reçois par mail un document de ton client industriel, marqué 'DIFFUSION RESTREINTE' en haut de chaque page. C'est leur cahier des charges technique. Tu veux gagner du temps, tu transfères le PDF à ton sous-traitant pour qu'il chiffre le développement.",
          choices: [
            {
              id: "a",
              label: "Je transfère par mail simple, c'est le plus rapide",
              outcome: "bad",
              feedback:
                "Tu viens de violer la mention DR. Le client peut rompre le contrat, demander des dommages, et tu as une obligation de signaler une fuite (RGPD, accord de confidentialité). Le sous-traitant n'avait peut-être pas signé l'engagement de confidentialité.",
              points: -20,
            },
            {
              id: "b",
              label:
                "Je vérifie le NDA du sous-traitant, je transmets via canal chiffré, je trace l'envoi",
              outcome: "good",
              feedback:
                "Procédure pro : NDA signé, canal de transmission contrôlé (espace partagé sécurisé, mail chiffré PGP, clé USB chiffrée remise en main propre), et journal des transmissions pour traçabilité.",
              points: 30,
            },
            {
              id: "c",
              label: "Je copie-colle juste les passages utiles dans un mail",
              outcome: "bad",
              feedback:
                "La mention DR couvre l'information, pas seulement le format. Extraire des passages reste une diffusion. Et tu perds le marquage qui rappelait au destinataire la sensibilité.",
              points: -10,
            },
          ],
          debrief:
            "La mention 'Diffusion Restreinte' (DR) est une classification française non classifiée de défense, mais juridiquement opposable dans un contrat. En PME, on la rencontre dans : 1) les marchés publics sensibles ; 2) les contrats avec des grands groupes industriels ; 3) les opérateurs d'importance vitale (OIV) et essentielle (OSE). Règles à appliquer : 1) ne jamais transmettre à un tiers sans engagement de confidentialité signé ; 2) canal de transmission contrôlé (jamais de mail simple en clair) ; 3) traçabilité des accès et copies ; 4) destruction sécurisée en fin d'usage (broyeur, suppression chiffrée). Bonus : la mention est volontairement visible — son rôle est aussi pédagogique pour le destinataire.",
          quiz: [
            {
              question: "La mention 'Diffusion Restreinte' couvre :",
              choices: [
                {
                  id: "a",
                  label: "L'information, dans n'importe quel format ou extrait",
                  correct: true,
                },
                { id: "b", label: "Seulement le PDF original", correct: false },
              ],
              explanation:
                "C'est l'info qui est protégée. Recopier, photographier, extraire : tout reste sous DR.",
            },
            {
              question:
                "Avant de transmettre un document DR à un sous-traitant :",
              choices: [
                {
                  id: "a",
                  label: "NDA signé + canal chiffré + traçabilité",
                  correct: true,
                },
                {
                  id: "b",
                  label: "Confiance verbale, c'est plus rapide",
                  correct: false,
                },
              ],
              explanation:
                "Sans engagement écrit, en cas de fuite tu n'as aucun recours. Le NDA est la base.",
            },
          ],
          xpReward: 60,
        },
      ],
    },
  },

  // ===========================================================================
  // EXTENSION CATALOGUE (V0.4) — 15 modules supplémentaires pour porter le
  // total marketplace à 30. Combiné aux 150 épisodes officiels (cf. catalog-
  // saisons.ts), on atteint 180 modules d'apprentissage visibles côté
  // catalogue. Payload condensé volontairement (1 épisode, 1 quiz par module)
  // pour rester maintenable. Les modules les plus joués pourront être
  // étoffés progressivement.
  // ===========================================================================

  // 16. Reconnaitre une intrusion sur ses comptes (community)
  {
    slug: "reconnaitre-intrusion-comptes",
    title: "Reconnaître une intrusion sur ses comptes",
    description:
      "Connexion bizarre, mail oublié, paramètres modifiés : 5 signes que votre compte est compromis.",
    emoji: "🔍",
    category: "fraude",
    difficulty: "easy",
    author: "lea",
    authorOrgName: "PME Démo",
    isOfficial: false,
    status: "APPROVED",
    license: "CC_BY_SA",
    payload: {
      episodes: [
        {
          title: "Les 5 signes d'une intrusion",
          durationMinutes: 6,
          scenario:
            "Vous remarquez un mail dans votre boîte d'envoi que vous n'avez pas écrit. Que faire en priorité ?",
          choices: [
            {
              id: "ignore",
              label: "Ignorer, c'est sûrement un bug",
              outcome: "bad",
              feedback: "Mauvaise idée. C'est un signe d'intrusion fort.",
              points: 0,
            },
            {
              id: "logout-tout",
              label:
                "Se déconnecter de toutes les sessions, changer le mot de passe et activer le MFA",
              outcome: "good",
              feedback:
                "Bon réflexe. Les 3 actions à faire en moins de 10 min.",
              points: 30,
            },
            {
              id: "supprimer",
              label: "Supprimer le mail et continuer",
              outcome: "bad",
              feedback: "Tu effaces une preuve sans bloquer l'attaquant.",
              points: 5,
            },
          ],
          debrief:
            "Une intrusion se voit aux traces : mails inconnus, sessions actives suspectes, paramètres modifiés. Réflexe : déconnexion globale + nouveau MdP + MFA.",
          quiz: [
            {
              question: "Quel est le premier réflexe en cas d'intrusion ?",
              choices: [
                { id: "a", label: "Supprimer les preuves", correct: false },
                {
                  id: "b",
                  label:
                    "Se déconnecter de toutes les sessions et changer le mot de passe",
                  correct: true,
                },
                { id: "c", label: "Attendre 24h pour voir", correct: false },
              ],
              explanation:
                "Couper l'accès attaquant en priorité, puis sécuriser.",
            },
          ],
          xpReward: 50,
        },
      ],
    },
  },

  // 17. Sécuriser ses sauvegardes (officiel)
  {
    slug: "securiser-sauvegardes-3-2-1",
    title: "Sécuriser ses sauvegardes (règle 3-2-1)",
    description:
      "3 copies, 2 supports, 1 hors-site : la formule simple qui sauve une PME victime de ransomware.",
    emoji: "💾",
    category: "donnees-sensibles",
    difficulty: "medium",
    author: "vincent",
    authorOrgName: "Humanix Cybersecurity",
    isOfficial: true,
    status: "APPROVED",
    license: "PROPRIETARY",
    payload: {
      episodes: [
        {
          title: "La règle 3-2-1 en pratique",
          durationMinutes: 7,
          scenario:
            "Votre PME sauvegarde tous les soirs sur un NAS branché au réseau. Un ransomware frappe. Vos sauvegardes sont-elles utilisables ?",
          choices: [
            {
              id: "oui",
              label: "Oui, on a un NAS",
              outcome: "bad",
              feedback:
                "Le NAS est sur le même réseau : il a aussi été chiffré.",
              points: 0,
            },
            {
              id: "non-online",
              label: "Non, le NAS est en ligne donc chiffré aussi",
              outcome: "good",
              feedback:
                "Exactement. Il faut une sauvegarde déconnectée ou immuable.",
              points: 25,
            },
            {
              id: "depend",
              label: "Ça dépend du ransomware",
              outcome: "neutral",
              feedback:
                "Trop optimiste : la majorité des ransomwares actuels ciblent les NAS.",
              points: 10,
            },
          ],
          debrief:
            "La règle 3-2-1 : 3 copies des données, sur 2 supports différents, dont 1 hors-site et déconnecté. Sans ça, un NAS branché ne sauve rien.",
          quiz: [
            {
              question:
                "Combien de copies de sauvegarde recommande la règle 3-2-1 ?",
              choices: [
                { id: "a", label: "1", correct: false },
                { id: "b", label: "3", correct: true },
                { id: "c", label: "5", correct: false },
              ],
              explanation: "3 copies au total, dont 1 hors-site déconnecté.",
            },
          ],
          xpReward: 60,
        },
      ],
    },
  },

  // 18. Wi-Fi public : les vrais risques (community)
  {
    slug: "wifi-public-risques",
    title: "Wi-Fi public : ce que vous risquez vraiment",
    description:
      "Café, gare, hôtel : ce qui se passe quand vous vous connectez, et comment vous protéger en 2 min.",
    emoji: "📶",
    category: "teletravail",
    difficulty: "easy",
    author: "sophie",
    authorOrgName: "PME Démo",
    isOfficial: false,
    status: "APPROVED",
    license: "CC_BY_SA",
    payload: {
      episodes: [
        {
          title: "Le Wi-Fi de la gare",
          durationMinutes: 5,
          scenario:
            "Vous attendez votre train à Lyon Part-Dieu. Un Wi-Fi 'SNCF-Free' s'affiche. Vous vous connectez ?",
          choices: [
            {
              id: "go",
              label: "Oui, le nom inspire confiance",
              outcome: "bad",
              feedback:
                "Un attaquant peut nommer son Wi-Fi 'SNCF-Free' en 30 secondes.",
              points: 0,
            },
            {
              id: "partage",
              label: "Non, j'utilise le partage de connexion de mon téléphone",
              outcome: "good",
              feedback: "Le bon réflexe.",
              points: 25,
            },
            {
              id: "vpn",
              label: "Oui, mais avec un VPN actif",
              outcome: "good",
              feedback: "Acceptable si le VPN est de confiance.",
              points: 20,
            },
          ],
          debrief:
            "Sur Wi-Fi public, partage de connexion 4G/5G > VPN > rien. Jamais de saisie de mot de passe sans VPN.",
          quiz: [
            {
              question: "Quelle est la meilleure option en gare ?",
              choices: [
                { id: "a", label: "Partage de connexion 4G/5G", correct: true },
                { id: "b", label: "Wi-Fi public sans VPN", correct: false },
              ],
              explanation:
                "Le partage de connexion mobile est sous votre contrôle.",
            },
          ],
          xpReward: 45,
        },
      ],
    },
  },

  // 19. Vérifier une URL (officiel)
  {
    slug: "verifier-url",
    title: "Vérifier une URL en 5 secondes",
    description:
      "humanix-cybersecurity.fr ou humanix-cybersecurity.fr.malware-host.ru ? Le réflexe qui sauve.",
    emoji: "🔗",
    category: "phishing",
    difficulty: "easy",
    author: "vincent",
    authorOrgName: "Humanix Cybersecurity",
    isOfficial: true,
    status: "APPROVED",
    license: "PROPRIETARY",
    payload: {
      episodes: [
        {
          title: "Lire une URL : le bon morceau",
          durationMinutes: 5,
          scenario:
            "Vous recevez un mail avec un lien : login.microsoft-365.support-update.com. Cliquez ?",
          choices: [
            {
              id: "go",
              label: "Oui, c'est un sous-domaine Microsoft",
              outcome: "bad",
              feedback:
                "FAUX. Le domaine c'est support-update.com, pas microsoft.com.",
              points: 0,
            },
            {
              id: "no",
              label:
                "Non, le vrai domaine est support-update.com qui n'est pas Microsoft",
              outcome: "good",
              feedback: "Exactement. Toujours lire de droite à gauche.",
              points: 30,
            },
          ],
          debrief:
            "Une URL se lit de droite à gauche. Le domaine = ce qui est juste avant le premier slash. Tout ce qui précède n'est qu'un sous-domaine que n'importe qui peut nommer.",
          quiz: [
            {
              question:
                "Dans https://login.microsoft.exemple.com/, quel est le domaine ?",
              choices: [
                { id: "a", label: "microsoft.com", correct: false },
                { id: "b", label: "exemple.com", correct: true },
              ],
              explanation: "Le domaine = juste avant le premier /.",
            },
          ],
          xpReward: 50,
        },
      ],
    },
  },

  // 20. Détecter un faux site (community)
  {
    slug: "detecter-faux-site",
    title: "Détecter un faux site bancaire / impôts",
    description:
      "8 signaux faibles qui trahissent un faux site, même bien fait.",
    emoji: "🏛️",
    category: "phishing",
    difficulty: "medium",
    author: "lea",
    authorOrgName: "PME Démo",
    isOfficial: false,
    status: "APPROVED",
    license: "CC_BY_SA",
    payload: {
      episodes: [
        {
          title: "Les 8 signaux faibles",
          durationMinutes: 7,
          scenario:
            "Un site '.com' se présente comme impots-gouv. Que vérifiez-vous ?",
          choices: [
            {
              id: "https",
              label: "Le HTTPS et le cadenas",
              outcome: "neutral",
              feedback:
                "Insuffisant : 70% des phishings ont un HTTPS valide aujourd'hui.",
              points: 10,
            },
            {
              id: "tld",
              label: "Le TLD (.gouv.fr pour l'État)",
              outcome: "good",
              feedback: "Bon. Les services publics français sont en .gouv.fr.",
              points: 30,
            },
            {
              id: "design",
              label: "Le design",
              outcome: "bad",
              feedback: "Le design se copie en 5 min.",
              points: 0,
            },
          ],
          debrief:
            "Vérifications à faire : TLD officiel, fautes d'ortho, urgence artificielle, demandes d'infos sensibles, certificat émis depuis < 30 jours.",
          quiz: [
            {
              question: "Le TLD officiel des services publics français est ?",
              choices: [
                { id: "a", label: ".com", correct: false },
                { id: "b", label: ".gouv.fr", correct: true },
              ],
              explanation: "Tout site public français est en .gouv.fr.",
            },
          ],
          xpReward: 60,
        },
      ],
    },
  },

  // 21. Sécuriser son routeur (community)
  {
    slug: "securiser-routeur-pme",
    title: "Sécuriser le routeur Wi-Fi de l'entreprise",
    description:
      "Mot de passe par défaut, firmware à jour, WPA3 : le routeur, premier rempart.",
    emoji: "📡",
    category: "autre",
    difficulty: "medium",
    author: "sophie",
    authorOrgName: "PME Démo",
    isOfficial: false,
    status: "APPROVED",
    license: "CC_BY_SA",
    payload: {
      episodes: [
        {
          title: "Audit express du routeur",
          durationMinutes: 8,
          scenario:
            "Votre routeur PME a admin/admin comme login. Quelle est la priorité ?",
          choices: [
            {
              id: "tout",
              label: "Changer immédiatement le mot de passe admin et le SSID",
              outcome: "good",
              feedback:
                "Étape 1. Ensuite : firmware à jour, WPA3, désactiver WPS.",
              points: 30,
            },
            {
              id: "wps",
              label: "Activer le WPS pour la facilité",
              outcome: "bad",
              feedback: "WPS a des failles connues. Désactiver.",
              points: 0,
            },
          ],
          debrief:
            "Audit routeur : (1) MdP admin fort, (2) firmware à jour, (3) WPA3 (sinon WPA2-AES), (4) WPS désactivé, (5) UPnP désactivé, (6) Wi-Fi invité séparé.",
          quiz: [
            {
              question: "Quel protocole Wi-Fi est recommandé en 2026 ?",
              choices: [
                { id: "a", label: "WEP", correct: false },
                { id: "b", label: "WPA3", correct: true },
                { id: "c", label: "Pas de chiffrement", correct: false },
              ],
              explanation: "WPA3 ou WPA2-AES.",
            },
          ],
          xpReward: 60,
        },
      ],
    },
  },

  // 22. Le piège des QR codes (officiel)
  {
    slug: "qr-code-piege",
    title: "Le piège des QR codes (quishing)",
    description:
      "QR code dans le métro, sur un parking, dans un restaurant : la nouvelle vague de phishing.",
    emoji: "📲",
    category: "phishing",
    difficulty: "easy",
    author: "vincent",
    authorOrgName: "Humanix Cybersecurity",
    isOfficial: true,
    status: "APPROVED",
    license: "PROPRIETARY",
    payload: {
      episodes: [
        {
          title: "Le QR code du parking",
          durationMinutes: 5,
          scenario:
            "Une étiquette QR code 'Paiement parking' est collée sur l'horodateur. Vous scannez ?",
          choices: [
            {
              id: "scan",
              label: "Oui, c'est officiel",
              outcome: "bad",
              feedback:
                "Une étiquette se colle en 2 secondes. URL frauduleuse.",
              points: 0,
            },
            {
              id: "url",
              label: "Je vérifie l'URL avant de continuer",
              outcome: "good",
              feedback:
                "Toujours vérifier l'URL après scan, avant toute saisie.",
              points: 25,
            },
            {
              id: "horodateur",
              label: "Je paye à l'horodateur uniquement",
              outcome: "good",
              feedback: "Le plus sûr.",
              points: 30,
            },
          ],
          debrief:
            "Le quishing (QR phishing) explose en 2025-2026. Réflexe : ne jamais scanner un QR collé en extérieur sans vérifier l'URL avant la saisie.",
          quiz: [
            {
              question:
                "Avant tout paiement après scan d'un QR code, on vérifie ?",
              choices: [
                { id: "a", label: "Le design du site", correct: false },
                { id: "b", label: "L'URL et le TLD", correct: true },
              ],
              explanation: "Domaine d'abord, design ensuite.",
            },
          ],
          xpReward: 45,
        },
      ],
    },
  },

  // 23. Sécurité du Cloud (officiel)
  {
    slug: "securite-cloud-saas",
    title: "Sécurité de vos SaaS (Drive, Slack, Notion)",
    description:
      "Permissions, partages publics, MFA admin : 5 règles pour une utilisation sûre des SaaS quotidiens.",
    emoji: "☁️",
    category: "autre",
    difficulty: "medium",
    author: "vincent",
    authorOrgName: "Humanix Cybersecurity",
    isOfficial: true,
    status: "APPROVED",
    license: "PROPRIETARY",
    payload: {
      episodes: [
        {
          title: "Le partage public oublié",
          durationMinutes: 7,
          scenario:
            "Vous créez un Google Doc 'Plan stratégique 2026' et l'envoyez à 3 collègues via le bouton 'Toute personne ayant le lien'. Risque ?",
          choices: [
            {
              id: "ok",
              label: "Pas de risque, le lien est secret",
              outcome: "bad",
              feedback:
                "Le lien peut être partagé, il fuite via emails ou Slack.",
              points: 0,
            },
            {
              id: "specifique",
              label: "Mauvais : il faut partager nommément",
              outcome: "good",
              feedback:
                "Toujours partage nominatif. Lien public = fuite assurée à terme.",
              points: 30,
            },
          ],
          debrief:
            "Sur SaaS : partage nominatif uniquement, MFA obligatoire pour les admins, audit trimestriel des partages publics, déboarding immédiat.",
          quiz: [
            {
              question: "Quel partage est le plus sûr sur Google Drive ?",
              choices: [
                {
                  id: "a",
                  label: "Toute personne ayant le lien",
                  correct: false,
                },
                {
                  id: "b",
                  label: "Personnes spécifiques nommées",
                  correct: true,
                },
              ],
              explanation: "Le partage nominatif limite la diffusion.",
            },
          ],
          xpReward: 55,
        },
      ],
    },
  },

  // 24. Sensibiliser ses enfants (community)
  {
    slug: "cyber-pour-les-ados",
    title: "Sensibiliser les ados à la cyber",
    description:
      "TikTok, Snap, Discord, jeux : ce que vos ados doivent savoir avant qu'il ne soit trop tard.",
    emoji: "🧒",
    category: "autre",
    difficulty: "easy",
    author: "lea",
    authorOrgName: "PME Démo",
    isOfficial: false,
    status: "APPROVED",
    license: "CC_BY",
    payload: {
      episodes: [
        {
          title: "Les 4 règles à transmettre",
          durationMinutes: 6,
          scenario:
            "Votre ado de 13 ans veut s'inscrire sur Discord. Que vérifiez-vous ensemble ?",
          choices: [
            {
              id: "rien",
              label: "Rien, c'est leur vie privée",
              outcome: "bad",
              feedback:
                "À 13 ans, l'accompagnement reste nécessaire (CNIL : majorité numérique 15 ans).",
              points: 5,
            },
            {
              id: "regles",
              label:
                "Vie privée, MFA, pas de photos perso, ne jamais accepter d'inconnu",
              outcome: "good",
              feedback: "Les 4 règles de base.",
              points: 30,
            },
          ],
          debrief:
            "À transmettre aux ados : (1) Tout ce qu'on poste reste, (2) Activer le MFA, (3) Ne jamais accepter un inconnu, (4) Parler à un adulte si malaise.",
          quiz: [
            {
              question: "Quelle est la majorité numérique en France ?",
              choices: [
                { id: "a", label: "13 ans", correct: false },
                { id: "b", label: "15 ans (loi 2024)", correct: true },
                { id: "c", label: "18 ans", correct: false },
              ],
              explanation:
                "Loi française du 29 juin 2024 : 15 ans pour les réseaux sociaux.",
            },
          ],
          xpReward: 45,
        },
      ],
    },
  },

  // 25. SIM swapping (officiel)
  {
    slug: "sim-swapping",
    title: "Le SIM swapping : votre numéro volé",
    description:
      "L'attaque qui prend le contrôle de votre téléphone et vide vos comptes en 30 minutes.",
    emoji: "📵",
    category: "fraude",
    difficulty: "hard",
    author: "vincent",
    authorOrgName: "Humanix Cybersecurity",
    isOfficial: true,
    status: "APPROVED",
    license: "PROPRIETARY",
    payload: {
      episodes: [
        {
          title: "Mon numéro a été volé",
          durationMinutes: 8,
          scenario:
            "Votre téléphone affiche 'Pas de service' et vous recevez une alerte de connexion bancaire. Vous suspectez quoi ?",
          choices: [
            {
              id: "panne",
              label: "Une panne réseau",
              outcome: "bad",
              feedback:
                "Trop optimiste : combiné à l'alerte bancaire = SIM swapping en cours.",
              points: 0,
            },
            {
              id: "swap",
              label:
                "SIM swapping en cours, j'appelle mon opérateur immédiatement",
              outcome: "good",
              feedback:
                "Bon réflexe : appeler depuis un autre téléphone, bloquer la SIM, prévenir la banque.",
              points: 40,
            },
          ],
          debrief:
            "Réflexes SIM swap : (1) appeler opérateur depuis un autre téléphone, (2) bloquer la SIM, (3) changer mots de passe email + banque, (4) appeler la banque, (5) déposer plainte.",
          quiz: [
            {
              question:
                "Le SMS comme 2e facteur d'authentification est-il fiable face au SIM swap ?",
              choices: [
                { id: "a", label: "Oui, totalement", correct: false },
                {
                  id: "b",
                  label: "Non, préférer une app TOTP ou un passkey",
                  correct: true,
                },
              ],
              explanation: "TOTP (Authenticator) ou passkey > SMS.",
            },
          ],
          xpReward: 80,
        },
      ],
    },
  },

  // 26. Cyber assurance : décrypter son contrat (community)
  {
    slug: "decrypter-assurance-cyber",
    title: "Décrypter son contrat d'assurance cyber",
    description:
      "Franchise, exclusions, limite par sinistre : ce qu'il faut vraiment regarder avant de signer.",
    emoji: "📑",
    category: "autre",
    difficulty: "hard",
    author: "sophie",
    authorOrgName: "PME Démo",
    isOfficial: false,
    status: "APPROVED",
    license: "CC_BY_SA",
    payload: {
      episodes: [
        {
          title: "Les 5 lignes à vérifier",
          durationMinutes: 8,
          scenario:
            "Votre assureur vous propose une cyber-assurance à 800 €/an. Que vérifiez-vous en priorité ?",
          choices: [
            {
              id: "prix",
              label: "Le prix uniquement",
              outcome: "bad",
              feedback:
                "L'important c'est ce qui est couvert et exclu, pas le prix.",
              points: 0,
            },
            {
              id: "details",
              label:
                "Franchise, plafond, exclusions (rançon, négligence), délai d'indemnisation",
              outcome: "good",
              feedback: "Les 4 lignes critiques.",
              points: 35,
            },
          ],
          debrief:
            "Lignes-clés : franchise (souvent 5-10 K€), plafond annuel (souvent 500 K€-1 M€), exclusions courantes (rançon, négligence grave, conflits armés), délai d'indemnisation, conditions préalables (MFA, sauvegardes).",
          quiz: [
            {
              question:
                "Quelle exclusion est la plus courante en cyber-assurance ?",
              choices: [
                { id: "a", label: "Le ransomware", correct: false },
                { id: "b", label: "Le paiement de la rançon", correct: true },
              ],
              explanation:
                "Beaucoup d'assureurs excluent désormais le paiement direct de rançon.",
            },
          ],
          xpReward: 75,
        },
      ],
    },
  },

  // 27. Sécurité IoT bureau (community)
  {
    slug: "iot-bureau",
    title: "Sécurité IoT au bureau (caméras, imprimantes, thermostats)",
    description:
      "L'imprimante de l'open-space est une porte d'entrée. Cas Casino, Mirai botnet.",
    emoji: "🖨️",
    category: "autre",
    difficulty: "medium",
    author: "lea",
    authorOrgName: "PME Démo",
    isOfficial: false,
    status: "APPROVED",
    license: "CC_BY_SA",
    payload: {
      episodes: [
        {
          title: "L'imprimante compromise",
          durationMinutes: 7,
          scenario:
            "Votre imprimante réseau est restée avec login admin/admin depuis 2018. Que faut-il faire ?",
          choices: [
            {
              id: "rien",
              label: "Rien, c'est juste une imprimante",
              outcome: "bad",
              feedback:
                "L'imprimante a accès au réseau et stocke des docs : porte d'entrée idéale.",
              points: 0,
            },
            {
              id: "audit",
              label:
                "Audit des objets connectés : MdP, firmware, segmentation VLAN",
              outcome: "good",
              feedback: "Bon. Idéalement, mettre les IoT sur un VLAN séparé.",
              points: 30,
            },
          ],
          debrief:
            "Tout objet connecté est une cible. Réflexes : changer MdP par défaut, firmware à jour, VLAN dédié IoT, désactiver UPnP.",
          quiz: [
            {
              question: "Que faire des objets connectés en entreprise ?",
              choices: [
                {
                  id: "a",
                  label: "Les laisser sur le réseau principal",
                  correct: false,
                },
                {
                  id: "b",
                  label: "Les isoler sur un VLAN dédié",
                  correct: true,
                },
              ],
              explanation: "Segmentation = limitation du blast radius.",
            },
          ],
          xpReward: 60,
        },
      ],
    },
  },

  // 28. Cyber pour responsable communication (officiel)
  {
    slug: "cyber-com-responsable",
    title: "Cyber pour le ou la responsable com",
    description:
      "Réseaux sociaux entreprise, gestion de crise, fake news : le rôle clé en cas d'incident.",
    emoji: "📢",
    category: "crise",
    difficulty: "medium",
    author: "vincent",
    authorOrgName: "Humanix Cybersecurity",
    isOfficial: true,
    status: "APPROVED",
    license: "PROPRIETARY",
    payload: {
      episodes: [
        {
          title: "Communiquer après un incident",
          durationMinutes: 7,
          scenario:
            "Votre PME vient d'être victime d'un ransomware. Un journaliste local appelle. Que dites-vous ?",
          choices: [
            {
              id: "nier",
              label: "Nier l'incident",
              outcome: "bad",
              feedback:
                "Mensonge = perte de confiance amplifiée. Risque légal.",
              points: 0,
            },
            {
              id: "tout",
              label: "Tout dire en détail",
              outcome: "bad",
              feedback: "Pas en cours d'enquête : aide les attaquants.",
              points: 5,
            },
            {
              id: "mesure",
              label:
                "Confirmer l'incident, dire les actions prises, ne pas spéculer sur l'auteur",
              outcome: "good",
              feedback: "Posture juste. Transparence + retenue.",
              points: 35,
            },
          ],
          debrief:
            "Communication post-incident : (1) Confirmer ce qui est public, (2) Dire les mesures prises, (3) Ne pas spéculer, (4) Renvoyer vers un porte-parole unique, (5) Coordonner avec ANSSI/CNIL.",
          quiz: [
            {
              question: "En cas d'incident cyber, qui parle aux médias ?",
              choices: [
                {
                  id: "a",
                  label: "Tout le monde, pour la transparence",
                  correct: false,
                },
                {
                  id: "b",
                  label: "Un porte-parole unique désigné",
                  correct: true,
                },
              ],
              explanation: "Un seul canal officiel évite les contradictions.",
            },
          ],
          xpReward: 65,
        },
      ],
    },
  },

  // 29. Sécurité des accès partagés (community)
  {
    slug: "securite-acces-partages",
    title: "Comptes partagés : la mauvaise idée à corriger",
    description:
      "Le compte admin@entreprise.fr connu de toute l'équipe : pourquoi c'est dangereux et comment sortir.",
    emoji: "👥",
    category: "mots-de-passe",
    difficulty: "medium",
    author: "lea",
    authorOrgName: "PME Démo",
    isOfficial: false,
    status: "APPROVED",
    license: "CC_BY_SA",
    payload: {
      episodes: [
        {
          title: "Le compte admin partagé",
          durationMinutes: 7,
          scenario:
            "5 personnes utilisent le même compte admin@entreprise.fr avec le même mot de passe. Une démissionne. Que faire ?",
          choices: [
            {
              id: "rien",
              label: "Rien, ça va aller",
              outcome: "bad",
              feedback:
                "L'ex-employé garde l'accès. Risque légal et de sécurité.",
              points: 0,
            },
            {
              id: "mdp",
              label: "Changer le mot de passe immédiatement",
              outcome: "neutral",
              feedback: "Solution court terme. Mais le problème reste.",
              points: 15,
            },
            {
              id: "individuel",
              label: "Migrer vers des comptes individuels avec MFA",
              outcome: "good",
              feedback: "Bon. Audit trail + offboarding propre.",
              points: 35,
            },
          ],
          debrief:
            "Compte partagé = aucun audit trail, offboarding cassé, MFA impossible. Solution : 1 compte par personne + droits granulaires + MFA obligatoire.",
          quiz: [
            {
              question: "Pourquoi un compte partagé est-il dangereux ?",
              choices: [
                {
                  id: "a",
                  label: "Pas d'audit trail individuel",
                  correct: true,
                },
                { id: "b", label: "Plus économique", correct: false },
              ],
              explanation: "Impossible de savoir qui a fait quoi.",
            },
          ],
          xpReward: 60,
        },
      ],
    },
  },

  // 30. Hygiène cyber pour intérimaires (officiel)
  {
    slug: "cyber-interimaires",
    title: "Cyber pour intérimaires et CDD",
    description:
      "Onboarding accéléré, accès limité, offboarding immédiat : protocoles spécifiques RH.",
    emoji: "📅",
    category: "autre",
    difficulty: "medium",
    author: "vincent",
    authorOrgName: "Humanix Cybersecurity",
    isOfficial: true,
    status: "APPROVED",
    license: "PROPRIETARY",
    payload: {
      episodes: [
        {
          title: "Le contrat court : enjeux cyber",
          durationMinutes: 7,
          scenario:
            "Vous embauchez un intérimaire pour 2 semaines. Quels accès lui donnez-vous ?",
          choices: [
            {
              id: "tout",
              label: "Les mêmes que les salariés",
              outcome: "bad",
              feedback: "Risque exposé : surface d'attaque inutile.",
              points: 0,
            },
            {
              id: "minimum",
              label:
                "Le strict minimum + sensibilisation 30 min + offboarding J+0",
              outcome: "good",
              feedback: "Bon. Principle of Least Privilege appliqué.",
              points: 35,
            },
          ],
          debrief:
            "Pour un contrat court : (1) Sensibilisation cyber 30 min obligatoire, (2) Accès minimum nécessaire, (3) Pas de partage de compte, (4) Offboarding au dernier jour, (5) Re-vérification des accès toutes les semaines.",
          quiz: [
            {
              question: "Quand révoquer les accès d'un intérimaire ?",
              choices: [
                {
                  id: "a",
                  label: "Après 30 jours par sécurité",
                  correct: false,
                },
                {
                  id: "b",
                  label: "Le jour-même de la fin du contrat",
                  correct: true,
                },
              ],
              explanation: "Offboarding doit être immédiat.",
            },
          ],
          xpReward: 60,
        },
      ],
    },
  },
];
