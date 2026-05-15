// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Catalogue Humanix des 15 menaces humaines, derive de
// connectors/ciso-assistant-frameworks/humanix-human-threats-catalog-v1.yaml.
//
// Pourquoi dupliquer ici plutot que parser le YAML ?
//   - Le YAML est publie comme stored-library a charger cote CISO Assistant.
//   - Cette liste est utilisee par le hook syncThreats qui pousse les threats
//     DIRECTEMENT dans le folder du tenant via /api/threats/ (no library load).
//   - Pas de dependance yaml runtime. La source de verite reste le YAML
//     publie ; ce fichier est regenerable a la main si la liste change.
//
// Licence du contenu : CC BY-SA 4.0 (cf. en-tete du YAML). Le code TS qui
// l'expose est AGPLv3 comme le reste du repo.

export type HumanixThreat = {
  /** Slug stable, utilise comme ref_id cote CISO Assistant. */
  refId: string;
  /** Nom affiche dans la liste Threats. */
  name: string;
  /** Description multi-ligne pour le RSSI : context + chiffres terrain. */
  description: string;
};

export const HUMANIX_HUMAN_THREATS: readonly HumanixThreat[] = [
  {
    refId: "HUMAN-T1",
    name: "Spear phishing finance / fraude au virement",
    description:
      "Email ciblé visant un comptable ou DAF, usurpant l'identité d'un " +
      "fournisseur connu ou du dirigeant, pour rediriger un virement vers " +
      "un IBAN frauduleux. Cas observés : 25 k€ à 18 M€. Vecteur n°1 de " +
      "perte financière directe pour les PME françaises.",
  },
  {
    refId: "HUMAN-T2",
    name: "Fraude au président / FOVI",
    description:
      "Variante de spear phishing où l'attaquant se fait passer pour le " +
      "PDG ou un VIP demandant un virement urgent et confidentiel. " +
      "Pression émotionnelle, court-circuit des procédures.",
  },
  {
    refId: "HUMAN-T3",
    name: "Vishing CFO / faux support IT",
    description:
      "Appel téléphonique d'un faux support IT ou faux dirigeant pour " +
      "extorquer un code MFA, un mot de passe, ou faire valider un " +
      "virement frauduleux. Volume en hausse +120% en 2025.",
  },
  {
    refId: "HUMAN-T4",
    name: "Smishing / phishing SMS",
    description:
      "Phishing via SMS (faux Chronopost, faux impôts, faux RH). Taux de " +
      "clic 8× supérieur à l'email selon CERT-FR 2024. Vecteur favori du " +
      "vol de credentials mobile et banking.",
  },
  {
    refId: "HUMAN-T5",
    name: "Quishing / QR code piégé",
    description:
      "QR code malveillant collé physiquement sur affiches/parkings/restau " +
      "ou inséré dans un PDF. Redirige vers une page de phishing ou " +
      "déclenche un téléchargement. Difficile à détecter visuellement.",
  },
  {
    refId: "HUMAN-T6",
    name: "Deepfake CEO audio ou vidéo",
    description:
      "Synthèse vocale ou vidéo d'un dirigeant utilisée pour valider un " +
      "ordre fraudulent (virement, partage de credentials). Cas 2024 : " +
      "26 M$ extorqués via fausse visio chez Arup. Génération <10 minutes " +
      "avec des outils grand public.",
  },
  {
    refId: "HUMAN-T10",
    name: "Réutilisation de mot de passe",
    description:
      "Un même mot de passe utilisé sur multiples services : si l'un est " +
      "compromis (data breach publique), tous les autres tombent par " +
      "credential stuffing. 65% des collaborateurs concernés selon NordPass.",
  },
  {
    refId: "HUMAN-T11",
    name: "Identifiants visibles (post-it, papier)",
    description:
      "Mot de passe noté sur post-it, sous-main, ou photographié par un " +
      "visiteur. Vecteur d'élévation de privilèges intra-bureau ou par " +
      "ingénierie sociale physique.",
  },
  {
    refId: "HUMAN-T12",
    name: "Shadow IT",
    description:
      "Usage d'outils non autorisés par la DSI (Dropbox perso, ChatGPT " +
      "non Business, WeTransfer pour fichiers sensibles, etc.). Fuites " +
      "de données et de propriété intellectuelle non maîtrisées.",
  },
  {
    refId: "HUMAN-T13",
    name: "Perte ou vol de matériel",
    description:
      "Laptop oublié dans le TGV, smartphone volé en terrasse, clé USB " +
      "perdue. Si le device n'est pas chiffré (FileVault/BitLocker), " +
      "tout son contenu est exposé.",
  },
  {
    refId: "HUMAN-T14",
    name: "Tailgating / accès physique non contrôlé",
    description:
      "Un attaquant suit un collaborateur dans le sas badgé sans badger " +
      "lui-même (chargé de cartons, robe de chambre fictive de coursier, " +
      "etc.). Permet l'accès aux postes ouverts, prises Ethernet, salles " +
      "de réunion.",
  },
  {
    refId: "HUMAN-T20",
    name: "Incident non signalé (sous-déclaration NIS2)",
    description:
      "Un collaborateur qui clique sur un phishing ou perd un device " +
      "n'ose pas signaler par peur de sanction. Délai de réaction étendu, " +
      "non-conformité NIS2 §23 (obligation de signaler dans 24h).",
  },
  {
    refId: "HUMAN-T21",
    name: "Fuite RGPD par négligence",
    description:
      "Envoi de fichier RH/clients à la mauvaise adresse, partage public " +
      "Drive, copie d'écran de données sensibles sur réseaux sociaux. " +
      "Vecteur n°1 des notifications CNIL (Article 33 RGPD).",
  },
  {
    refId: "HUMAN-T30",
    name: "Fuite de secrets par développeur",
    description:
      "Tokens AWS / API keys / mots de passe commités dans un repo Git " +
      "public, hardcodés dans Docker images, postés sur StackOverflow. " +
      "Détectable via TruffleHog mais pas toujours en pre-commit hook.",
  },
  {
    refId: "HUMAN-T31",
    name: "Offboarding RH bâclé",
    description:
      "Un collaborateur quitte la société mais ses accès SaaS / VPN / " +
      "boîtes mail restent actifs. Risque ex-collaborateur malveillant " +
      "ou compte zombie repris par attaquant.",
  },
] as const;
