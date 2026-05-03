// Generation de phishing PERSONNALISES par employe via Mistral.
// Chaque employe recoit un mail unique base sur :
//   - son service (Compta, RH, Direction, IT...)
//   - son manager (donne du poids social)
//   - un evenement contextuel recent (CSE, seminaire, deal client...)
//   - le ton de l'attaquant suppose
//
// Garde-fous :
//   - tenant-scope strict
//   - DEMO_MODE = fixture sans appel API
//   - rate limit 1 req/sec pour respecter les quotas Mistral
//   - retry 1x avec backoff 3s en cas d'echec transitoire
//   - aucun nom/email reel dans le prompt (l'attaquant simule un domaine fictif)
//
// IMPORTANT - LEGAL :
// Cette fonctionnalite genere des MAILS DE TEST PEDAGOGIQUE. Elle n'envoie
// aucun mail reel. C'est l'admin qui decide de declencher la campagne via
// l'infrastructure phishing existante apres validation des contenus generes.

import {
  generatePhishing,
  type GeneratedPhishing,
  isMistralEnabled,
} from "@/lib/ai/mistral";

export type EmployeeTarget = {
  id: string;
  name: string | null;
  email: string;
  service: string | null;
};

export type CampaignContext = {
  recentEvent?: string; // Ex: "CSE du 15 mai", "Seminaire Lyon", "Lancement produit X"
  attackerStyle?: "urgent" | "amical" | "autoritaire" | "discret";
  template: "fake-microsoft" | "fake-fournisseur" | "fake-rh" | "fake-banque" | "fake-livreur" | "free";
  difficulty: "easy" | "medium" | "hard";
};

export type PersonalizedPhishing = {
  targetId: string;
  targetEmail: string;
  targetService: string | null;
  generated: GeneratedPhishing;
  promptHash: string; // identifiant du contenu personnalise
  generatedAt: string;
};

export type BatchProgress = {
  total: number;
  done: number;
  errors: number;
  current?: string;
};

const STYLE_HINTS: Record<NonNullable<CampaignContext["attackerStyle"]>, string> = {
  urgent:
    "Ton URGENT et pressant. L'expediteur insiste sur la deadline immediate.",
  amical:
    "Ton AMICAL et familier. L'expediteur fait semblant de connaitre la personne (ex: utilise 'Salut' au lieu de 'Bonjour').",
  autoritaire:
    "Ton AUTORITAIRE. L'expediteur se presente comme une figure d'autorite (DG, DSI, expert-comptable).",
  discret:
    "Ton DISCRET et calme. L'expediteur essaie de paraitre legitime sans appel a l'urgence.",
};

const RATE_LIMIT_MS = 1000; // 1 req/sec entre chaque appel Mistral

/**
 * Genere les phishings pour un batch d'employes en respectant le rate limit.
 * Retourne un tableau de PersonalizedPhishing (succes) et collecte les erreurs.
 *
 * onProgress : callback optionnel pour streamer la progression (UI).
 */
export async function generateBatch(
  targets: EmployeeTarget[],
  ctx: CampaignContext,
  onProgress?: (p: BatchProgress) => void,
): Promise<{ results: PersonalizedPhishing[]; errors: { target: EmployeeTarget; message: string }[] }> {
  const results: PersonalizedPhishing[] = [];
  const errors: { target: EmployeeTarget; message: string }[] = [];

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    onProgress?.({
      total: targets.length,
      done: results.length,
      errors: errors.length,
      current: t.email,
    });

    try {
      const personalized = await generateOne(t, ctx);
      results.push(personalized);
    } catch (e: any) {
      // Retry 1x avec backoff
      try {
        await sleep(3000);
        const personalized = await generateOne(t, ctx);
        results.push(personalized);
      } catch (e2: any) {
        errors.push({
          target: t,
          message: String(e2?.message ?? e2).slice(0, 200),
        });
      }
    }

    // Rate limit
    if (i < targets.length - 1) await sleep(RATE_LIMIT_MS);
  }

  onProgress?.({
    total: targets.length,
    done: results.length,
    errors: errors.length,
  });

  return { results, errors };
}

async function generateOne(
  target: EmployeeTarget,
  ctx: CampaignContext,
): Promise<PersonalizedPhishing> {
  // Construit un prompt contextuel SANS leak de PII reel :
  // on ne passe pas le nom de la personne, juste son service.
  const contextBits: string[] = [];
  if (ctx.recentEvent) contextBits.push(`Évènement à mentionner : ${ctx.recentEvent}.`);
  if (ctx.attackerStyle) contextBits.push(STYLE_HINTS[ctx.attackerStyle]);

  const generated = await generatePhishing({
    template: ctx.template,
    service: target.service ?? "general",
    context: contextBits.join(" ").slice(0, 200),
    difficulty: ctx.difficulty,
  });

  return {
    targetId: target.id,
    targetEmail: target.email,
    targetService: target.service,
    generated,
    promptHash: hashId(`${target.id}|${ctx.template}|${ctx.difficulty}|${ctx.recentEvent ?? ""}`),
    generatedAt: new Date().toISOString(),
  };
}

function hashId(input: string): string {
  // Hash deterministe court (8 chars) pour identifier le contenu genere.
  // Pas de crypto required, juste un identifiant lisible.
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).padStart(8, "0").slice(0, 8);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function isPersonalizedPhishingEnabled(): boolean {
  // Toujours active : en absence de cle Mistral, on tombe sur les fixtures demo
  // (utile pour montrer l'UI a un prospect).
  return true;
}

export function isUsingMistralLive(): boolean {
  return isMistralEnabled() && process.env.DEMO_MODE !== "true";
}
