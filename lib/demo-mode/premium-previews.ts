// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Catalogue d'apercus du contenu PREMIUM, expose UNIQUEMENT en mode DEMO
// pour "appater" les visiteurs : on liste les titres + emojis + audiences
// des modules / saisons / enquetes / articles disponibles dans la formule
// commerciale, sans exposer le contenu pedagogique (scenarios, quiz,
// debriefs, prompts, IA, etc.) qui reste prive (content-pro/).
//
// Ces titres etant deja la promesse marketing du catalogue, leur exposition
// publique est intentionnelle : c'est equivalent a la page /catalogue
// d'une marque, qui annonce ses produits sans en montrer le mode d'emploi.
//
// UTILISATION :
//   - Importe par les pages list (Saisons, Articles, Enquetes, Marketplace)
//     UNIQUEMENT si process.env.DEMO_MODE === "true".
//   - Rendu par <LockedPremiumCard> en grise + verrou + CTA "/tarifs".
//
// SOURCE :
//   - Saisons : extrait de content-pro/prisma/catalog-saisons.ts (30 saisons
//     × 6 episodes = 178 modules).
//   - Articles : extrait de content-pro/lib/library-seed.ts (30 articles).
//   - Enquetes : extrait des frontmatter content-pro/content/enquetes/*.mdx
//     (21 enquetes premium, hors les 3 gratuites OSS).
//   - Modules marketplace : extrait de content-pro/lib/marketplace-seed.ts
//     (30 modules officiels + communaute).

export type PremiumSaisonPreview = {
  slug: string;
  title: string;
  emoji: string;
  audience: string;
  episodes: number;
};

export type PremiumArticlePreview = {
  slug: string;
  title: string;
  emoji: string;
  category: string;
  audience: "pro" | "tous" | "famille";
};

export type PremiumInvestigationPreview = {
  slug: string;
  title: string;
  difficulty: number; // 1..5
};

export type PremiumModulePreview = {
  slug: string;
  title: string;
  emoji: string;
  category: string;
  isOfficial: boolean;
};

// ============================================================================
// 30 SAISONS PREMIUM (×6 episodes = 178 modules officiels)
// ============================================================================
export const PREMIUM_SAISONS_PREVIEW: PremiumSaisonPreview[] = [
  { slug: "phishing", title: "Phishing & ingénierie sociale", emoji: "🎣", audience: "tous", episodes: 6 },
  { slug: "mots-de-passe", title: "Mots de passe & double authentification", emoji: "🔑", audience: "tous", episodes: 6 },
  { slug: "donnees-sensibles", title: "Données sensibles & RGPD au quotidien", emoji: "📁", audience: "tous", episodes: 6 },
  { slug: "teletravail", title: "Télétravail & nomadisme", emoji: "💻", audience: "tous", episodes: 6 },
  { slug: "fraude-president", title: "Fraude au président & FOVI", emoji: "💼", audience: "compta", episodes: 6 },
  { slug: "ransomware", title: "Ransomware & extorsion", emoji: "🔒", audience: "tous", episodes: 6 },
  { slug: "reseaux-sociaux-pro", title: "Réseaux sociaux & e-réputation", emoji: "🌐", audience: "tous", episodes: 6 },
  { slug: "mobile-smartphone", title: "Sécurité du smartphone professionnel", emoji: "📱", audience: "tous", episodes: 6 },
  { slug: "wifi-reseaux", title: "Wi-Fi & connexions douteuses", emoji: "📶", audience: "tous", episodes: 6 },
  { slug: "stockage-cloud", title: "USB, cloud & stockage de données", emoji: "☁️", audience: "tous", episodes: 6 },
  { slug: "ia-generative", title: "IA générative au bureau", emoji: "🤖", audience: "tous", episodes: 6 },
  { slug: "deepfakes", title: "Deepfakes vocaux & vidéo", emoji: "🎭", audience: "tous", episodes: 6 },
  { slug: "email-pro", title: "Bonnes pratiques email pro", emoji: "✉️", audience: "tous", episodes: 6 },
  { slug: "crise-cyber", title: "Gestion de crise cyber", emoji: "🚨", audience: "managers", episodes: 6 },
  { slug: "supply-chain", title: "Supply chain & prestataires", emoji: "🔗", audience: "managers", episodes: 6 },
  { slug: "sauvegardes", title: "Sauvegardes & restauration", emoji: "💾", audience: "tous", episodes: 6 },
  { slug: "acces-physiques", title: "Accès physiques & cartes", emoji: "🚪", audience: "tous", episodes: 6 },
  { slug: "visios-meetings", title: "Réunions, visios & écoutes", emoji: "🎙️", audience: "tous", episodes: 6 },
  { slug: "nis2-pme", title: "NIS2 & conformité PME", emoji: "📋", audience: "managers", episodes: 6 },
  { slug: "cyber-dirigeants", title: "Cyber pour dirigeants", emoji: "👑", audience: "managers", episodes: 6 },
  { slug: "cyber-rh", title: "Cyber pour les RH", emoji: "👥", audience: "rh", episodes: 6 },
  { slug: "cyber-compta", title: "Cyber pour la comptabilité & finance", emoji: "💰", audience: "compta", episodes: 6 },
  { slug: "cyber-dev", title: "Cyber pour les développeurs", emoji: "👨‍💻", audience: "dev", episodes: 6 },
  { slug: "cyber-collaboration", title: "Outils de collaboration : Slack, Teams, Notion", emoji: "💬", audience: "tous", episodes: 6 },
  { slug: "vie-privee-bureau", title: "Vie privée & données perso au bureau", emoji: "🛡️", audience: "tous", episodes: 6 },
  { slug: "remediation-flash", title: "Remédiation flash post-phishing", emoji: "⚡", audience: "tous", episodes: 3 },
  { slug: "dpo-quotidien", title: "Le quotidien du DPO", emoji: "🛡", audience: "dpo", episodes: 6 },
  { slug: "voyages-affaires", title: "Voyages d'affaires : la cyber en mobilité", emoji: "✈️", audience: "voyageur", episodes: 6 },
  { slug: "enfants-numerique-famille", title: "Cyber-famille : protéger ses enfants", emoji: "👨‍👩‍👧‍👦", audience: "famille", episodes: 6 },
  { slug: "byod-perso-pro", title: "BYOD : la frontière vie pro / vie perso", emoji: "📱", audience: "tous", episodes: 6 },
];

// ============================================================================
// 30 ARTICLES PREMIUM (librairie cyber-RH commerciale)
// ============================================================================
export const PREMIUM_ARTICLES_PREVIEW: PremiumArticlePreview[] = [
  { slug: "mfa-en-10-minutes", title: "Le MFA en 10 minutes", emoji: "🔐", category: "mots-de-passe", audience: "tous" },
  { slug: "reflexes-pour-ma-grand-mere", title: "Les réflexes cyber pour ma grand-mère", emoji: "👵", category: "grand-public", audience: "famille" },
  { slug: "dangers-byod", title: "Les dangers du BYOD", emoji: "📱", category: "byod", audience: "pro" },
  { slug: "phishing-detection-5-signes", title: "Phishing : 5 signes en 5 secondes", emoji: "🎣", category: "phishing", audience: "tous" },
  { slug: "donnees-personnelles-rgpd-quotidien", title: "RGPD au quotidien — Le guide express", emoji: "📁", category: "rgpd", audience: "pro" },
  { slug: "wifi-public-vraiment-dangereux", title: "Wi-Fi public : vraiment dangereux ?", emoji: "📶", category: "teletravail", audience: "tous" },
  { slug: "faux-conseiller-bancaire", title: "Le faux conseiller bancaire : l'arnaque qui a piégé 64 000 Français en 2025", emoji: "📞", category: "fraude", audience: "famille" },
  { slug: "smartphone-de-mes-parents", title: "Sécuriser le smartphone d'un parent ou grand-parent", emoji: "📱", category: "famille", audience: "famille" },
  { slug: "arnaques-rencontres-en-ligne", title: "Arnaques aux sentiments : reconnaître un escroc avant qu'il ne soit trop tard", emoji: "💔", category: "fraude", audience: "famille" },
  { slug: "securite-jeux-video-ados", title: "Sécurité des jeux en ligne : Roblox, Fortnite, Minecraft", emoji: "🎮", category: "famille", audience: "famille" },
  { slug: "perte-vol-smartphone", title: "J'ai perdu mon téléphone : les 60 minutes qui changent tout", emoji: "🔍", category: "famille", audience: "tous" },
  { slug: "photos-famille-reseaux", title: "Sharenting : protéger les photos de vos enfants", emoji: "📸", category: "famille", audience: "famille" },
  { slug: "wifi-public-vacances", title: "Wifi de l'hôtel, du train, du café : ce qui passe vraiment dessus", emoji: "📶", category: "famille", audience: "tous" },
  { slug: "compte-pirate-recuperation", title: "Mon compte est piraté : guide de récupération en 30 minutes", emoji: "🆘", category: "famille", audience: "tous" },
  { slug: "phishing-en-30-secondes", title: "Reconnaître un phishing en 30 secondes", emoji: "🎣", category: "phishing", audience: "pro" },
  { slug: "teletravail-securise-guide", title: "Le télétravail sécurisé, du salon au CODIR", emoji: "🏠", category: "teletravail", audience: "pro" },
  { slug: "ia-generative-au-boulot", title: "ChatGPT, Claude, Mistral au boulot : ce qu'il faut savoir", emoji: "🤖", category: "ia", audience: "pro" },
  { slug: "passwords-en-equipe", title: "Partager des mots de passe en équipe sans Excel", emoji: "🤝", category: "mots-de-passe", audience: "pro" },
  { slug: "rgpd-petite-pme", title: "Le RGPD pour une PME de 10 personnes", emoji: "📋", category: "rgpd", audience: "pro" },
  { slug: "emails-pro-2026", title: "Les bonnes pratiques email en 2026", emoji: "📧", category: "email", audience: "pro" },
  { slug: "sauvegardes-3-2-1", title: "La règle 3-2-1 des sauvegardes", emoji: "💾", category: "sauvegardes", audience: "tous" },
  { slug: "backup-smartphone-photos", title: "Ne perdez plus jamais les photos de votre smartphone", emoji: "📱", category: "sauvegardes", audience: "tous" },
  { slug: "faux-sav-microsoft", title: "Le faux SAV Microsoft (et autres call centers piégés)", emoji: "📞", category: "fraude", audience: "tous" },
  { slug: "sextorsion-que-faire", title: "Sextorsion : que faire si on est victime", emoji: "🚨", category: "fraude", audience: "tous" },
  { slug: "cyber-cabinet-medical", title: "Cyber-sécurité au cabinet médical", emoji: "⚕️", category: "metier-sante", audience: "pro" },
  { slug: "cyber-cabinet-avocat", title: "Cyber-sécurité au cabinet d'avocats", emoji: "⚖️", category: "metier-juridique", audience: "pro" },
  { slug: "cyber-collectivite-mairie", title: "Cyber-sécurité en collectivité territoriale", emoji: "🏛", category: "metier-public", audience: "pro" },
  { slug: "discord-twitch-enfants", title: "Discord et Twitch : protéger ses enfants", emoji: "🎮", category: "famille", audience: "famille" },
  { slug: "deces-numerique", title: "Préparer sa succession numérique", emoji: "🕊️", category: "famille", audience: "famille" },
  { slug: "phishing-vocal-vishing", title: "Vishing : l'arnaque téléphonique nouvelle génération", emoji: "📞", category: "fraude", audience: "tous" },
];

// ============================================================================
// 21 ENQUETES PREMIUM (Mode Enqueteur, hors les 3 gratuites OSS)
// ============================================================================
export const PREMIUM_INVESTIGATIONS_PREVIEW: PremiumInvestigationPreview[] = [
  { slug: "email-banque-bnp-alerte", title: "Le SMS d'alerte de ta « banque »", difficulty: 3 },
  { slug: "email-fournisseur-changement-iban", title: "L'email du fournisseur qui change d'IBAN", difficulty: 4 },
  { slug: "email-fournisseur-rib", title: "Le changement d'IBAN du fournisseur électricité", difficulty: 4 },
  { slug: "email-livreur-douane", title: "Le colis Colissimo bloqué en douane", difficulty: 2 },
  { slug: "email-office365-licence-expiration", title: "L'email Office 365 d'expiration de licence", difficulty: 2 },
  { slug: "email-recouvrement-cabinet-avocat", title: "L'email du cabinet d'avocats pour facture impayée", difficulty: 4 },
  { slug: "email-rh-bulletin-paie", title: "Le mail RH « bulletin de paie en attente »", difficulty: 3 },
  { slug: "email-rh-prime-fin-annee", title: "L'email RH de prime exceptionnelle de fin d'année", difficulty: 3 },
  { slug: "facebook-anniversaire-enfant", title: "Le post Facebook pour l'anniversaire de Léo", difficulty: 3 },
  { slug: "facebook-test-quel-personnage", title: "Le test Facebook « Quel personnage de One Piece es-tu ? »", difficulty: 2 },
  { slug: "facebook-vacances-creteois", title: "Le post Facebook des vacances en Crête", difficulty: 2 },
  { slug: "linkedin-ancien-camarade-promo", title: "L'ancien camarade de promo qui réapparaît", difficulty: 4 },
  { slug: "linkedin-cv-leak", title: "Le post LinkedIn de recherche d'emploi", difficulty: 3 },
  { slug: "linkedin-recruteur-cabinet-prestige", title: "Le recruteur LinkedIn d'un cabinet prestigieux", difficulty: 3 },
  { slug: "linkedin-stage-rentree", title: "Le post LinkedIn du stagiaire enthousiaste", difficulty: 4 },
  { slug: "photo-piggyback-parking-garage", title: "Le parking garage avec barrière automatique", difficulty: 3 },
  { slug: "photo-piggyback-sas", title: "Le sas d'entrée du matin", difficulty: 3 },
  { slug: "photo-salle-reunion-whiteboard", title: "La salle de réunion juste après le COMEX", difficulty: 4 },
  { slug: "photo-trash-bin", title: "La poubelle commune de l'open-space", difficulty: 3 },
  { slug: "public-wifi-hotspot-conference", title: "Le hotspot Wi-Fi de la salle de conférence", difficulty: 4 },
  { slug: "sms-vinted-livraison-bloquee", title: "Le SMS Vinted de livraison bloquée", difficulty: 2 },
  { slug: "sms-banque-blocage", title: "Le SMS bancaire de blocage immédiat", difficulty: 2 },
  { slug: "sms-cnam-remboursement-soin", title: "Le SMS CNAM de remboursement de soin", difficulty: 2 },
  { slug: "sms-impots-remboursement", title: "Le SMS de remboursement des impôts", difficulty: 2 },
];

// ============================================================================
// 30 MODULES MARKETPLACE PREMIUM (officiels Humanix + curation communaute)
// ============================================================================
export const PREMIUM_MODULES_PREVIEW: PremiumModulePreview[] = [
  { slug: "bonnes-pratiques-dev", title: "Bonnes pratiques de dev sécurisé", emoji: "💻", category: "autre", isOfficial: true },
  { slug: "bonnes-pratiques-hebergement", title: "Bonnes pratiques d'hébergement", emoji: "🏗️", category: "autre", isOfficial: true },
  { slug: "protection-cicd", title: "Protéger sa chaîne CI/CD", emoji: "🔧", category: "autre", isOfficial: true },
  { slug: "intervention-poste-distance", title: "Intervenir sur un poste à distance", emoji: "🖥️", category: "autre", isOfficial: false },
  { slug: "reset-mfa-support", title: "Reset MFA au support : qui valide quoi", emoji: "🔄", category: "autre", isOfficial: false },
  { slug: "cas-byod", title: "Le cas BYOD : son perso au boulot", emoji: "📱", category: "teletravail", isOfficial: false },
  { slug: "admin-de-son-poste", title: "Admin de son poste : utile ou dangereux", emoji: "🛡️", category: "teletravail", isOfficial: false },
  { slug: "principe-moindre-privilege", title: "Le principe du moindre privilège", emoji: "🔐", category: "autre", isOfficial: true },
  { slug: "zero-knowledge-protocol", title: "Zero-Knowledge : prouver sans révéler", emoji: "🤐", category: "donnees-sensibles", isOfficial: true },
  { slug: "signature-des-commits", title: "Signer ses commits Git", emoji: "✍️", category: "autre", isOfficial: true },
  { slug: "niveau-confidentialite", title: "Le bon niveau de confidentialité", emoji: "🏷️", category: "donnees-sensibles", isOfficial: false },
  { slug: "transports-en-commun", title: "Sécurité dans les transports en commun", emoji: "🚆", category: "donnees-sensibles", isOfficial: false },
  { slug: "parler-boulot-train", title: "Parler boulot dans le train", emoji: "🗣️", category: "donnees-sensibles", isOfficial: false },
  { slug: "besoin-d-en-connaitre", title: "Le besoin d'en connaître", emoji: "🔍", category: "donnees-sensibles", isOfficial: true },
  { slug: "diffusion-restreinte", title: "Diffusion Restreinte : la mention qui change tout", emoji: "📜", category: "donnees-sensibles", isOfficial: true },
  { slug: "reconnaitre-intrusion-comptes", title: "Reconnaître une intrusion sur ses comptes", emoji: "🔍", category: "fraude", isOfficial: false },
  { slug: "securiser-sauvegardes-3-2-1", title: "Sécuriser ses sauvegardes (règle 3-2-1)", emoji: "💾", category: "donnees-sensibles", isOfficial: true },
  { slug: "wifi-public-risques", title: "Wi-Fi public : ce que vous risquez vraiment", emoji: "📶", category: "teletravail", isOfficial: false },
  { slug: "verifier-url", title: "Vérifier une URL en 5 secondes", emoji: "🔗", category: "phishing", isOfficial: true },
  { slug: "detecter-faux-site", title: "Détecter un faux site bancaire / impôts", emoji: "🏛️", category: "phishing", isOfficial: false },
  { slug: "securiser-routeur-pme", title: "Sécuriser le routeur Wi-Fi de l'entreprise", emoji: "📡", category: "autre", isOfficial: false },
  { slug: "qr-code-piege", title: "Le piège des QR codes (quishing)", emoji: "📲", category: "phishing", isOfficial: true },
  { slug: "securite-cloud-saas", title: "Sécurité de vos SaaS (Drive, Slack, Notion)", emoji: "☁️", category: "autre", isOfficial: true },
  { slug: "cyber-pour-les-ados", title: "Sensibiliser les ados à la cyber", emoji: "🧒", category: "autre", isOfficial: false },
  { slug: "sim-swapping", title: "Le SIM swapping : votre numéro volé", emoji: "📵", category: "fraude", isOfficial: true },
  { slug: "decrypter-assurance-cyber", title: "Décrypter son contrat d'assurance cyber", emoji: "📑", category: "autre", isOfficial: false },
  { slug: "iot-bureau", title: "Sécurité IoT au bureau (caméras, imprimantes, thermostats)", emoji: "🖨️", category: "autre", isOfficial: false },
  { slug: "cyber-com-responsable", title: "Cyber pour le ou la responsable com", emoji: "📢", category: "crise", isOfficial: true },
  { slug: "securite-acces-partages", title: "Comptes partagés : la mauvaise idée à corriger", emoji: "👥", category: "mots-de-passe", isOfficial: false },
  { slug: "cyber-interimaires", title: "Cyber pour intérimaires et CDD", emoji: "📅", category: "autre", isOfficial: true },
];

/**
 * Helper : indique si l'instance est en mode demo (et donc si on doit
 * afficher les apercus premium grises dans les pages list).
 *
 * Centralise la lecture de la variable d'env pour eviter les duplications
 * et faciliter un eventuel changement de regle (cf. NEXT_PUBLIC_DEMO_MODE
 * si on en a besoin cote client un jour).
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}
