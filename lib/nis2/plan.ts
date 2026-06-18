// SPDX-License-Identifier: AGPL-3.0-or-later
//
// Moteur de PLAN NIS2 narratif - le coeur de l'espace NIS2.
//
// Difference avec un GRC (type CISO Assistant) : on ne liste pas des
// controles a cocher. A partir du resultat du diagnostic (score par
// article), on produit, pour chaque exigence, un accompagnement en
// langage dirigeant :
//   - ce que la directive attend (sans jargon)
//   - pourquoi ca compte concretement pour l'entreprise
//   - un levier actionnable cette semaine
//   - le chantier de fond a 3-6 mois
//   - comment la formation Humanix aide (angle humain)
//   - ce qui releve du prestataire IT (angle technique) - on oriente
//     honnetement plutot que de pretendre tout couvrir
//
// Posture : on ACCOMPAGNE vers la conformite, on ne la garantit pas.
// Le contenu ci-dessous est pedagogique, pas un avis juridique.

import {
  NIS2_ARTICLES,
  NIS2_ARTICLES_ORDER,
  type Nis2Article,
  type Nis2ArticleMeta,
} from "./articles";
import type { Nis2DiagnosticResult, Nis2Verdict } from "./scoring";

export type Nis2ArticlePlanContent = {
  article: Nis2Article;
  /** Ce que la directive attend, formule simplement */
  attend: string;
  /** Pourquoi ca compte pour un dirigeant */
  pourquoi: string;
  /** Action activable tout de suite */
  levierRapide: string;
  /** Chantier de fond a 3-6 mois */
  chantier: string;
  /** Comment la formation Humanix aide (null si purement technique) */
  humanixAngle: string | null;
  /** Volet a confier au prestataire IT (null si purement humain) */
  partnerAngle: string | null;
};

// -----------------------------------------------------------------------------
// Contenu redige par article (ton calme, concret, sans jargon)
// -----------------------------------------------------------------------------

export const NIS2_PLAN_CONTENT: Record<Nis2Article, Nis2ArticlePlanContent> = {
  "21.2.a": {
    article: "21.2.a",
    attend:
      "Mettre par écrit comment vous gérez le risque numérique : une politique de sécurité simple, signée par la direction, et savoir quels sont vos outils et données vraiment critiques.",
    pourquoi:
      "C'est la colonne vertébrale. Sans une vision claire de ce qui compte (vos données clients, votre outil de production, votre messagerie), impossible de protéger l'essentiel ni d'arbitrer un budget.",
    levierRapide:
      "Listez en une page vos 5 systèmes les plus critiques et ce qui se passerait si chacun tombait 48 heures. C'est déjà le début d'une analyse de risque.",
    chantier:
      "Formaliser une politique de sécurité courte (périmètre, qui décide quoi, règles de base), la faire signer par la direction et la revoir une fois par an.",
    humanixAngle:
      "Nos modules expliquent la gouvernance cyber en langage dirigeant, pour que la politique soit comprise et appliquée, pas rangée dans un tiroir.",
    partnerAngle:
      "L'inventaire technique détaillé et l'analyse de risque approfondie (type EBIOS) se cadrent avec votre prestataire ou un accompagnement dédié.",
  },
  "21.2.b": {
    article: "21.2.b",
    attend:
      "Savoir quoi faire, qui appeler et dans quel ordre quand quelque chose tourne mal, avant que ça n'arrive.",
    pourquoi:
      "Le jour d'une attaque, on n'improvise pas. Quelques pages préparées à froid font gagner des heures et limitent fortement les dégâts.",
    levierRapide:
      "Affichez une fiche réflexe : qui prévenir en interne, le numéro de votre prestataire IT, et la règle « on isole mais on n'éteint pas » pour préserver les preuves.",
    chantier:
      "Écrire une procédure de gestion d'incident simple et la tester une fois par an avec un exercice de mise en situation.",
    humanixAngle:
      "La saison de gestion de crise entraîne vos équipes à réagir vite et calmement, et nos exercices simulent un scénario réel.",
    partnerAngle:
      "La centralisation des journaux techniques (logs) et la détection se montent avec votre prestataire ou un service de supervision.",
  },
  "21.2.c": {
    article: "21.2.c",
    attend:
      "Pouvoir redémarrer après un sinistre : des sauvegardes fiables, dont au moins une copie hors d'atteinte d'une attaque.",
    pourquoi:
      "C'est votre filet de sécurité contre le rançongiciel. Une sauvegarde qui fonctionne, c'est la différence entre quelques heures d'arrêt et la fermeture.",
    levierRapide:
      "Vérifiez aujourd'hui que vous avez une sauvegarde récente ET qu'au moins une copie est déconnectée ou immuable. Puis testez une restauration.",
    chantier:
      "Mettre en place la règle 3-2-1 (3 copies, 2 supports, 1 hors-site) et tester la restauration chaque trimestre.",
    humanixAngle:
      "Nos modules sensibilisent les équipes aux rançongiciels et ancrent le réflexe sauvegarde, côté usage quotidien.",
    partnerAngle:
      "Le dispositif technique de sauvegarde et de reprise relève de votre prestataire IT : c'est le premier chantier à cadrer avec lui.",
  },
  "21.2.d": {
    article: "21.2.d",
    attend:
      "Connaître vos fournisseurs numériques critiques et vous assurer qu'ils sont sérieux sur la sécurité.",
    pourquoi:
      "Beaucoup d'attaques passent aujourd'hui par un prestataire. Leur faille devient la vôtre, et vous restez responsable de vos données.",
    levierRapide:
      "Listez vos sous-traitants IT critiques (hébergeur, infogérant, logiciels métier) et repérez ceux dont l'arrêt vous bloquerait.",
    chantier:
      "Ajouter des clauses de sécurité à vos contrats (notification d'incident, droit de regard) et évaluer la posture des nouveaux fournisseurs avant de signer.",
    humanixAngle:
      "La saison dédiée à la chaîne d'approvisionnement aide vos équipes achats et métier à poser les bonnes questions à un fournisseur.",
    partnerAngle:
      "L'évaluation technique approfondie d'un fournisseur (audit, certifications) peut être appuyée par un expert.",
  },
  "21.2.e": {
    article: "21.2.e",
    attend:
      "Garder vos logiciels et systèmes à jour, et corriger vite les failles connues.",
    pourquoi:
      "La majorité des intrusions exploitent une faille déjà connue mais non corrigée. Les mises à jour sont la protection la moins chère qui existe.",
    levierRapide:
      "Activez les mises à jour automatiques partout où c'est possible, en commençant par les postes de travail et la messagerie.",
    chantier:
      "Définir un processus de mise à jour avec des délais (failles critiques sous 7 jours) et scanner régulièrement vos systèmes.",
    humanixAngle:
      "Côté sensibilisation, nos modules ancrent le réflexe « je ne reporte pas les mises à jour ». Pour les équipes qui développent, une saison dédiée au code sécurisé.",
    partnerAngle:
      "Le suivi des correctifs et la gestion des vulnérabilités sont avant tout techniques : un chantier à piloter avec votre prestataire IT.",
  },
  "21.2.f": {
    article: "21.2.f",
    attend:
      "Vérifier de temps en temps que vos mesures fonctionnent vraiment, et en rendre compte à la direction.",
    pourquoi:
      "Ce qui ne se mesure pas ne s'améliore pas. Quelques indicateurs suivis au comité de direction suffisent à garder le cap.",
    levierRapide:
      "Choisissez 3 indicateurs simples : taux de comptes avec double authentification, incidents du trimestre, part des équipes formées.",
    chantier:
      "Réaliser un auto-audit annuel (la grille des mesures ANSSI est publique) et présenter les indicateurs au comité de direction.",
    humanixAngle:
      "La plateforme fournit déjà ces indicateurs (taux de formation, réflexes au phishing) et un rapport prêt pour votre comité de direction.",
    partnerAngle:
      "Un audit externe approfondi peut compléter l'auto-évaluation quand vous voulez un regard neutre.",
  },
  "21.2.g": {
    article: "21.2.g",
    attend:
      "Former tous vos collaborateurs, dirigeants compris, aux bons réflexes cyber. C'est l'une des rares mesures que la directive nomme explicitement.",
    pourquoi:
      "La quasi-totalité des incidents commence par un clic, un mot de passe faible ou un appel. C'est le levier le moins cher et le plus rapide à activer, et celui que les auditeurs et les assureurs regardent en premier.",
    levierRapide:
      "Lancez une première campagne de sensibilisation à toute l'équipe cette semaine : 15 minutes par personne, et c'est déjà mesurable.",
    chantier:
      "Mettre en place un programme de formation continue, des campagnes de phishing simulées régulières, et une formation spécifique pour les dirigeants.",
    humanixAngle:
      "C'est le cœur de notre métier : un catalogue complet, des campagnes de phishing, des parcours dirigeants, et un registre des actions de sensibilisation qui se remplit tout seul comme preuve.",
    partnerAngle: null,
  },
  "21.2.h": {
    article: "21.2.h",
    attend:
      "Protéger vos données sensibles par le chiffrement, au repos comme lorsqu'elles circulent.",
    pourquoi:
      "Si un ordinateur portable est volé ou qu'une base de données fuit, le chiffrement fait la différence entre un incident mineur et une fuite grave à déclarer.",
    levierRapide:
      "Activez le chiffrement du disque sur les ordinateurs (BitLocker, FileVault) et vérifiez que vos sites et mails utilisent bien des connexions sécurisées (HTTPS, TLS).",
    chantier:
      "Étendre le chiffrement aux bases de données et sauvegardes sensibles, et formaliser une règle simple sur son usage.",
    humanixAngle:
      "Nos modules sur les données sensibles et le cloud font comprendre aux équipes quand et pourquoi chiffrer.",
    partnerAngle:
      "La mise en oeuvre technique du chiffrement (bases, sauvegardes, gestion des clés) se cadre avec votre prestataire IT.",
  },
  "21.2.i": {
    article: "21.2.i",
    attend:
      "Maîtriser qui a accès à quoi, et couper les accès des personnes qui partent.",
    pourquoi:
      "Un ancien collaborateur dont le compte reste actif, ou un accès trop large, c'est une porte ouverte. L'une des causes de fuite les plus fréquentes et les plus évitables.",
    levierRapide:
      "Vérifiez qu'il existe une checklist de départ qui coupe tous les accès sous 24 heures, et passez en revue les comptes ayant des droits d'administration.",
    chantier:
      "Appliquer le principe du moindre privilège (chacun n'a que ce dont il a besoin) et séparer les comptes courants des comptes d'administration.",
    humanixAngle:
      "La saison dédiée aux RH aide à intégrer ces réflexes dans l'arrivée et le départ des collaborateurs.",
    partnerAngle:
      "L'automatisation de la gestion des accès (création, révocation) se met en place avec votre prestataire IT ou votre outil RH.",
  },
  "21.2.j": {
    article: "21.2.j",
    attend:
      "Ajouter une double vérification (authentification à plusieurs facteurs) à la connexion, en priorité sur les comptes sensibles.",
    pourquoi:
      "La double authentification bloque la grande majorité des piratages de compte, même quand le mot de passe a fuité. L'une des protections les plus efficaces pour le moins d'effort.",
    levierRapide:
      "Activez la double authentification cette semaine sur vos comptes les plus sensibles : messagerie, banque, hébergeur, outils d'administration.",
    chantier:
      "Étendre la double authentification à tous les collaborateurs et privilégier les méthodes résistantes au phishing (clé physique ou application plutôt que SMS).",
    humanixAngle:
      "Nos modules sur les mots de passe et l'authentification font adopter le MFA sans résistance, en expliquant simplement pourquoi il protège.",
    partnerAngle:
      "Le déploiement technique du MFA se fait dans vos outils (Microsoft 365, Google) avec votre prestataire IT.",
  },
  "23": {
    article: "23",
    attend:
      "En cas d'incident important, savoir prévenir l'autorité (l'ANSSI en France) dans les délais : une première alerte sous 24 heures, une notification sous 72 heures.",
    pourquoi:
      "Ces délais sont courts et l'horloge tourne pendant la crise. Avoir préparé le qui-fait-quoi à froid évite de les rater et d'ajouter une sanction à l'incident.",
    levierRapide:
      "Notez dès maintenant qui, chez vous, déclenche l'alerte, et gardez sous la main le point de contact de l'ANSSI et celui de votre prestataire.",
    chantier:
      "Préparer un modèle de notification pré-rempli (quoi, quand, périmètre, mesures prises) et identifier un référent communication de crise.",
    humanixAngle:
      "La saison de gestion de crise intègre la notification réglementaire dans les réflexes, pour que personne ne découvre les délais le jour J.",
    partnerAngle:
      "Le format technique de notification et le lien avec le CSIRT peuvent être préparés avec votre prestataire ou votre assureur cyber.",
  },
};

// -----------------------------------------------------------------------------
// Assemblage du plan a partir du resultat du diagnostic
// -----------------------------------------------------------------------------

export type Nis2PlanStatus = "prioritaire" | "a_renforcer" | "solide";

export type Nis2PlanItem = {
  article: Nis2Article;
  meta: Nis2ArticleMeta;
  content: Nis2ArticlePlanContent;
  /** Score 0-100 de l'article (issu du diagnostic) */
  score: number;
  status: Nis2PlanStatus;
  /** Fait partie des 3 chantiers prioritaires du diagnostic */
  isPriority: boolean;
  /** Saisons Humanix qui couvrent cet article */
  saisons: string[];
};

export type Nis2Plan = {
  globalScore: number;
  verdict: Nis2Verdict;
  /** Tous les articles, ordonnes : priorites d'abord, puis score croissant */
  items: Nis2PlanItem[];
  priorityCount: number;
  solidCount: number;
};

function statusFromScore(score: number): Nis2PlanStatus {
  if (score >= 80) return "solide";
  if (score >= 50) return "a_renforcer";
  return "prioritaire";
}

export const PLAN_STATUS_LABEL: Record<Nis2PlanStatus, string> = {
  prioritaire: "Chantier prioritaire",
  a_renforcer: "À renforcer",
  solide: "Solide",
};

/**
 * Construit le plan d'accompagnement a partir du resultat du diagnostic.
 *
 * Ordre des items :
 *   1. les 3 chantiers prioritaires (dans l'ordre du diagnostic, plus gros
 *      ecart d'abord),
 *   2. les autres articles, du score le plus faible au plus eleve (le plus
 *      de travail restant en premier).
 */
export function buildNis2Plan(result: Nis2DiagnosticResult): Nis2Plan {
  const priorityIds = new Set(result.topPriorities.map((p) => p.article));
  const scoreByArticle = new Map(
    result.articleScores.map((a) => [a.article, a.score]),
  );

  const items: Nis2PlanItem[] = NIS2_ARTICLES_ORDER.map((article) => {
    const score = scoreByArticle.get(article) ?? 0;
    return {
      article,
      meta: NIS2_ARTICLES[article],
      content: NIS2_PLAN_CONTENT[article],
      score,
      status: statusFromScore(score),
      isPriority: priorityIds.has(article),
      saisons: NIS2_ARTICLES[article].coveredBySaisons,
    };
  });

  // Ordre des priorites tel que renvoye par le diagnostic (gap decroissant).
  const priorityOrder = new Map(
    result.topPriorities.map((p, i) => [p.article, i]),
  );

  items.sort((a, b) => {
    if (a.isPriority && b.isPriority) {
      return (
        (priorityOrder.get(a.article) ?? 0) -
        (priorityOrder.get(b.article) ?? 0)
      );
    }
    if (a.isPriority) return -1;
    if (b.isPriority) return 1;
    return a.score - b.score;
  });

  return {
    globalScore: result.globalScore,
    verdict: result.verdict,
    items,
    priorityCount: items.filter((i) => i.status === "prioritaire").length,
    solidCount: items.filter((i) => i.status === "solide").length,
  };
}
