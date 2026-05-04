// IA Coach Hex
// V1 : moteur a regles deterministe base sur les donnees reelles de l'utilisateur.
// V2 : si OPENAI_API_KEY ou ANTHROPIC_API_KEY est defini, on peut enrichir
//      avec un LLM (boucle ouverte, ne casse pas la V1 si non configure).
import { db } from "@/lib/db";

export type CoachAdvice = {
  greeting: string;
  primaryMessage: string;
  recommendation: {
    type: "module" | "library" | "phishing" | "rest";
    label: string;
    href: string;
    reason: string;
  } | null;
  microTips: string[];
  mood: "happy" | "encouraging" | "urgent" | "celebrate";
};

const GREETINGS_TIME = (hour: number, name: string) => {
  if (hour < 12) return `Bonjour ${name} ☀️`;
  if (hour < 18) return `Re ${name} 👋`;
  return `Bonsoir ${name} 🌙`;
};

const POSITIVE_MICROTIPS = [
  "Le MFA n'est pas une option : c'est ta meilleure assurance.",
  "Aucun service légitime ne te demandera ton mot de passe par mail.",
  "Doute = je vérifie hors-canal. 30 secondes peuvent sauver 30 000 €.",
  "Une session de 5 minutes par semaine bat 1 heure par trimestre.",
  "Le pire mot de passe, c'est celui qu'on réutilise.",
  "Le Wi-Fi public n'est pas ton ami. Privilégie ton partage 4G.",
  "L'erreur n'est pas grave : ne pas la signaler l'est.",
];

export async function generateCoachAdvice(
  userId: string,
): Promise<CoachAdvice> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      progress: {
        include: { saison: true, episode: true },
        orderBy: { completedAt: "desc" },
      },
      phishingResults: {
        orderBy: { sentAt: "desc" },
        take: 5,
      },
      tenant: {
        select: {
          saisonConfigs: {
            where: { isMandatory: true, isActive: true },
            include: { saison: { include: { episodes: true } } },
          },
        },
      },
    },
  });
  if (!user) throw new Error("user_not_found");

  const firstName = (user.name || user.email).split(" ")[0].split("@")[0];
  const hour = new Date().getHours();
  const greeting = GREETINGS_TIME(hour, firstName);

  // Detection des situations prioritaires
  const lastActivityDate = user.progress[0]?.completedAt ?? user.createdAt;
  const daysSinceLastActivity = Math.floor(
    (Date.now() - lastActivityDate.getTime()) / (24 * 3600 * 1000),
  );

  // Modules obligatoires non termines
  const completedSaisonsByCount = new Map<string, number>();
  for (const p of user.progress.filter((p) => p.status === "COMPLETED")) {
    completedSaisonsByCount.set(
      p.saisonId,
      (completedSaisonsByCount.get(p.saisonId) ?? 0) + 1,
    );
  }
  const missingMandatory = user.tenant.saisonConfigs.find((cfg) => {
    const totalEps = cfg.saison.episodes.length;
    const doneEps = completedSaisonsByCount.get(cfg.saisonId) ?? 0;
    return doneEps < totalEps;
  });

  // Episodes avec score faible (< 70%)
  const lowScored = user.progress.filter(
    (p) => p.status === "COMPLETED" && (p.score ?? 0) < 70,
  );
  const recentLowScore = lowScored[0]; // premier (le plus recent)

  // Phishing recent cliqué
  const recentPhishingClick = user.phishingResults.find(
    (r) => r.status === "CLICKED",
  );

  let primaryMessage: string;
  let recommendation: CoachAdvice["recommendation"] = null;
  let mood: CoachAdvice["mood"];

  // PRIORITE 1 — Phishing recent cliqué (urgent)
  if (recentPhishingClick) {
    primaryMessage =
      "Tu as cliqué sur un mail piégé récemment. Pas grave — tout le monde clique au moins une fois. Mais on va revoir ensemble pourquoi tu t'es fait avoir.";
    recommendation = {
      type: "library",
      label: "Lire : Phishing — 5 signes en 5 secondes",
      href: "/librairie/phishing-detection-5-signes",
      reason: "Pour ne plus jamais retomber dans le piège.",
    };
    mood = "urgent";
  }
  // PRIORITE 2 — Module obligatoire non fait
  else if (missingMandatory) {
    primaryMessage = `Le module "${missingMandatory.saison.title}" est obligatoire dans ta PME et tu ne l'as pas encore terminé. Quelques minutes suffisent.`;
    recommendation = {
      type: "module",
      label: `Continuer "${missingMandatory.saison.title}"`,
      href: `/apprendre/${missingMandatory.saison.slug}`,
      reason: "Module marqué obligatoire par ta direction.",
    };
    mood = "urgent";
  }
  // PRIORITE 3 — Inactivité > 14 jours
  else if (daysSinceLastActivity > 14 || user.progress.length === 0) {
    primaryMessage =
      user.progress.length === 0
        ? `Bienvenue ! Pour démarrer, je te propose une saison de 5 minutes. Tu vas voir, ça démystifie tout.`
        : `Ça fait ${daysSinceLastActivity} jours qu'on ne s'est pas vus. Une session de 5 minutes pour reprendre le rythme ?`;
    recommendation = {
      type: "module",
      label: "Reprendre l'apprentissage",
      href: "/apprendre",
      reason: "5 minutes suffisent pour entretenir tes réflexes.",
    };
    mood = "encouraging";
  }
  // PRIORITE 4 — Episode avec score faible recent
  else if (recentLowScore) {
    primaryMessage = `Tu as eu ${recentLowScore.score} XP sur "${recentLowScore.episode.title}". Tu peux le rejouer pour améliorer — la progression compte plus que la note.`;
    recommendation = {
      type: "module",
      label: `Refaire "${recentLowScore.episode.title}"`,
      href: `/apprendre/${recentLowScore.saison.slug}/${recentLowScore.episode.slug}`,
      reason:
        "Les meilleurs apprenants sont ceux qui acceptent de retravailler.",
    };
    mood = "encouraging";
  }
  // PRIORITE 5 — Tout va bien : feliciter + suggerer librairie
  else {
    primaryMessage =
      user.progress.length >= 5
        ? `Tu déchires. Ton score de risque est solide. Garde le cap.`
        : `Tu progresses bien. Continue ce rythme et tu vas devenir une référence cyber dans ta PME.`;
    recommendation = {
      type: "library",
      label: "Découvrir un article : MFA en 10 minutes",
      href: "/librairie/mfa-en-10-minutes",
      reason: "Le MFA est l'action cyber au plus haut ROI.",
    };
    mood = user.progress.length >= 5 ? "celebrate" : "happy";
  }

  // Micro-tips : 2 random
  const microTips = [...POSITIVE_MICROTIPS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  return { greeting, primaryMessage, recommendation, microTips, mood };
}

/**
 * Optionnel V2 : enrichir l'advice avec un LLM si configure.
 * Plug-and-play : si OPENAI_API_KEY ou ANTHROPIC_API_KEY est present, on l'utilise.
 * Sinon on retombe sur les regles deterministes.
 *
 * NB : implementation laissee vide pour le POC. Le slot existe :
 * il suffit d'ajouter l'appel API dans cette fonction.
 */
export async function enrichWithLLM(advice: CoachAdvice): Promise<CoachAdvice> {
  // Slot LLM : a brancher quand l'API key sera disponible.
  // Exemple :
  // if (process.env.OPENAI_API_KEY) {
  //   const llmReponse = await callOpenAI(...);
  //   return { ...advice, primaryMessage: llmReponse };
  // }
  return advice;
}
