// SPDX-License-Identifier: AGPL-3.0-or-later
// Types + validation Zod pour le Mode Enqueteur.
//
// Source de verite : le frontmatter MDX de chaque enquete sous
// `content/enquetes-demo/*.mdx` (OSS) ou `content-pro/content/enquetes/*.mdx`
// (payant). Le `loader.ts` parse et valide via ce schema.
//
// Cf. ROADMAP_MODE_ENQUETEUR.md (hors repo) pour le contexte produit.

import { z } from "zod";

// Aligne sur l'enum Prisma InvestigationType (cf. schema.prisma).
// On garde une copie en TypeScript pour pouvoir charger le MDX sans
// importer @prisma/client en environnement edge / build statique.
export const INVESTIGATION_TYPES = [
  "EMAIL",
  "SMS",
  "LINKEDIN",
  "FACEBOOK",
  "PROFILE_PUBLIC",
  "PHOTO_OFFICE",
  "PHOTO_PIGGYBACK",
  "TRASH_BIN",
  "PUBLIC_WIFI",
] as const;
export type InvestigationType = (typeof INVESTIGATION_TYPES)[number];

// Un signal (red flag) que l'apprenant doit reperer.
// `points` est positif et reflete la subtilite du signal (5-25 typiquement).
const RedFlagSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/, "id doit etre alpha-num-tirets-underscores"),
  label: z.string().min(5).max(200),
  points: z.number().int().min(1).max(50),
  // Phrase pedagogique affichee apres validation. Repond a "pourquoi
  // c'est un signal ?". Contraint > 20 chars pour eviter les explications
  // trop courtes type "c'est suspect".
  explanation: z.string().min(20).max(600),
  // Zone visuelle a surligner sur le media (optionnel). Coordonnees
  // en % pour rester resolution-independent. Si absent : pas de surlignage.
  zone: z
    .object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
      w: z.number().min(0).max(100),
      h: z.number().min(0).max(100),
    })
    .optional(),
});
export type RedFlag = z.infer<typeof RedFlagSchema>;

// Un faux positif (distractor) qu'on s'attend a voir coche par les
// debutants. La penalite mesure la DISCRIMINATION : un bon detective
// sait NE PAS sur-alarmer. Typiquement 5-10 points de penalite.
const DistractorSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/),
  label: z.string().min(5).max(200),
  penalty: z.number().int().min(1).max(20),
  // Pourquoi ce n'est PAS un signal. Pedagogique : on contre l'idee recue.
  explanation: z.string().min(20).max(600),
});
export type Distractor = z.infer<typeof DistractorSchema>;

// Media + donnees a injecter dans le composant Mockup. Le shape varie
// selon le type d'enquete. On garde `data` comme un objet libre pour
// laisser la liberte aux auteurs MDX, mais chaque mockup valide ce qu'il
// attend cote rendu (defensive programming).
const MediaSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("email-mockup"),
    data: z.object({
      from: z.string(),
      fromEmail: z.string(),
      to: z.string().optional(),
      subject: z.string(),
      sentAt: z.string().optional(), // libre, ex: "Mardi 16h47"
      body: z.string(),
      hasAttachment: z.boolean().optional(),
      attachmentName: z.string().optional(),
      links: z
        .array(
          z.object({
            label: z.string(),
            displayedHref: z.string(),
            realHref: z.string(),
          }),
        )
        .optional(),
    }),
  }),
  z.object({
    type: z.literal("linkedin-mockup"),
    data: z.object({
      author: z.string(),
      authorHeadline: z.string(),
      authorAvatarUrl: z.string().optional(),
      timeAgo: z.string(),
      body: z.string(),
      reactions: z.number().optional(),
      comments: z.number().optional(),
    }),
  }),
  z.object({
    type: z.literal("facebook-mockup"),
    data: z.object({
      author: z.string(),
      timeAgo: z.string(),
      body: z.string(),
      photo: z.string().optional(),
      location: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("sms-mockup"),
    data: z.object({
      from: z.string(),
      body: z.string(),
      receivedAt: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal("photo-office-mockup"),
    data: z.object({
      // Description textuelle de la scene rendue en SVG/JSX cote mockup.
      // Liste des elements et leur position (% relatif).
      // Aussi utilise pour les scenes piggyback (badge reader, porte
      // tenue) et trash bin (papiers visibles, broyeur absent).
      sceneType: z
        .enum(["office", "piggyback", "trash_bin"])
        .default("office"),
      scene: z.array(
        z.object({
          id: z.string(),
          kind: z.enum([
            // Office
            "laptop_unlocked",
            "sticky_note_password",
            "paper_confidential",
            "phone_visible",
            "open_drawer",
            "trash_bin",
            "window_view",
            "coffee_mug",
            "office_chair",
            "desk_lamp",
            // Piggyback (sas badge)
            "badge_reader",
            "open_door",
            "polite_holder",
            "unbadged_intruder",
            "security_camera",
            "tailgate_notice",
            // Trash bin (poubelle non securisee)
            "loose_papers",
            "envelope_confidential",
            "missing_shredder",
            "id_card_thrown",
            "post_it_sensitive",
            "broken_lock",
          ]),
          x: z.number().min(0).max(100),
          y: z.number().min(0).max(100),
          label: z.string().optional(), // texte affiche, ex: "MdP : Soleil2026!"
        }),
      ),
    }),
  }),
]);
export type Media = z.infer<typeof MediaSchema>;

// Frontmatter complet d'une enquete.
export const InvestigationFrontmatterSchema = z.object({
  title: z.string().min(5).max(200),
  kind: z.literal("investigation"),
  investigationType: z.enum(INVESTIGATION_TYPES),
  // Difficulte 1-5 etoiles. Sert au tri + au scoring du rank Detective.
  difficulty: z.number().int().min(1).max(5),
  // Duree recommandee en secondes (sert au mode chronometre + a la UX).
  durationSeconds: z.number().int().min(15).max(600),
  xpReward: z.number().int().min(1).max(500),
  // True = enquete libre, dispo dans content/enquetes-demo/ (OSS).
  // False = enquete premium, dispo dans content-pro/content/enquetes/ (paye).
  isFree: z.boolean().default(false),
  media: MediaSchema,
  // Brief affiche avant le start. Mise en scene narrative pour engager
  // l'apprenant ("Tu es detective stagiaire chez Acme, on te confie...").
  brief: z.string().min(20).max(2000),
  redFlags: z.array(RedFlagSchema).min(1).max(15),
  distractors: z.array(DistractorSchema).min(0).max(10),
  // Debrief affiche apres validation. Synthese pedagogique.
  debrief: z.string().min(20).max(5000),
  // Tags pour le tri / filtres (ex: "rgpd", "ingenierie-sociale").
  tags: z.array(z.string()).default([]),
});
export type InvestigationFrontmatter = z.infer<
  typeof InvestigationFrontmatterSchema
>;

// Enquete deja parsee + enrichie d'info de runtime (slug derive du nom de
// fichier, sourcePath pour le debug, isPaid derive de l'inverse de isFree).
export type Investigation = InvestigationFrontmatter & {
  slug: string; // ex: "email-faux-microsoft-365"
  sourcePath: string; // chemin relatif depuis cwd, pour debug
};

// Resultat d'un user pour une enquete donnee. Mirroir du modele Prisma
// InvestigationResult, mais avec les types JSON typés. On le passe entre
// la server action et le composant client.
export type InvestigationResultPayload = {
  scenarioSlug: string;
  foundIds: string[];
  distractorIds: string[];
  durationSeconds: number;
};

// Compute le score d'une enquete. EXPORTEE pour testabilite (cf.
// lib/investigations/scoring.test.ts).
export function computeScore(
  scenario: Pick<InvestigationFrontmatter, "redFlags" | "distractors">,
  result: { foundIds: string[]; distractorIds: string[] },
): { score: number; maxScore: number; passed: boolean; passRatio: number } {
  const maxScore = scenario.redFlags.reduce((acc, rf) => acc + rf.points, 0);
  const foundPoints = scenario.redFlags
    .filter((rf) => result.foundIds.includes(rf.id))
    .reduce((acc, rf) => acc + rf.points, 0);
  const penaltyPoints = scenario.distractors
    .filter((d) => result.distractorIds.includes(d.id))
    .reduce((acc, d) => acc + d.penalty, 0);
  const score = Math.max(0, foundPoints - penaltyPoints);
  const passRatio = maxScore > 0 ? score / maxScore : 0;
  return {
    score,
    maxScore,
    passed: passRatio >= 0.6, // seuil 60% pour valider
    passRatio,
  };
}

// Calcule le rank Detective d'un user a partir de l'historique de ses
// resultats. Le rank = niveau le plus haut atteint sur ≥3 enquetes
// distinctes (anti-luck : pas de rank gagne sur 1 seul scenario).
export type DetectiveRank =
  | "aspirant"
  | "detective-junior"
  | "detective-confirme"
  | "cyber-sherlock"
  | "maitre-detective";

export const DETECTIVE_RANK_LABELS: Record<DetectiveRank, string> = {
  aspirant: "Aspirant",
  "detective-junior": "Détective Junior",
  "detective-confirme": "Détective Confirmé",
  "cyber-sherlock": "Cyber Sherlock",
  "maitre-detective": "Maître Détective",
};

export const DETECTIVE_RANK_THRESHOLDS: {
  rank: DetectiveRank;
  minRatio: number; // ratio de score min
  minPassed: number; // nb d'enquetes valides distinctes min
}[] = [
  { rank: "maitre-detective", minRatio: 1.0, minPassed: 50 },
  { rank: "cyber-sherlock", minRatio: 0.9, minPassed: 25 },
  { rank: "detective-confirme", minRatio: 0.75, minPassed: 10 },
  { rank: "detective-junior", minRatio: 0.6, minPassed: 3 },
];

export function computeDetectiveRank(
  results: { score: number; maxScore: number; passed: boolean }[],
): DetectiveRank {
  const passed = results.filter((r) => r.passed);
  for (const { rank, minRatio, minPassed } of DETECTIVE_RANK_THRESHOLDS) {
    const qualifying = passed.filter(
      (r) => r.maxScore > 0 && r.score / r.maxScore >= minRatio,
    );
    if (qualifying.length >= minPassed) {
      return rank;
    }
  }
  return "aspirant";
}
