// =============================================================================
// lib/cyber-score.ts — Calcul du Cyberscore (refonte mai 2026, version sévère).
//
// PHILOSOPHIE
// -----------
// En cybersécurité, l'overconfidence tue. Mieux vaut un score qui dit
// "À surveiller" alors que tout va bien que l'inverse. Cette fonction privilégie
// donc la sévérité : aucun tenant n'atteindra 100/100, le seuil "Excellent"
// (≥ 80) est réservé à une vraie maturité opérationnelle.
//
// COMPOSANTES (rapport au score brut /100)
// ----------------------------------------
//   1. Activation effective    25%  → users actifs RECEMMENT (pas juste cliqué une fois)
//   2. Maîtrise cyber           50%  → riskScore moyen (le VRAI indicateur de capacité)
//   3. Couverture fondamentaux  25%  → moyenne complétion sur saisons critiques
//                                       (phishing, mots de passe, MFA en priorité)
//
// PÉNALITÉS (soustraites au score brut)
// -------------------------------------
//   - Maillon faible          -10  : un service à <40% complétion (un attaquant ne cible que le maillon faible)
//   - Inactivité prolongée    -15  : >30% des collaborateurs sans activité depuis 30j
//   - Phishing négligé        -20  : aucun module de phishing complété (la #1 menace)
//   - Tenant trop jeune        -5  : <90j d'usage (pas assez de recul pour mesurer)
//
// COURBE NON-LINÉAIRE
// -------------------
// On applique pow(rawScore/100, 1.25) pour rendre les hauts scores difficiles
// à atteindre. Effet : 80% de raw devient ~75 final, 95% devient ~93. Les
// très bons tenants restent récompensés, les moyens restent moyens, et 100/100
// est mathématiquement quasi-impossible.
//
// SEUILS DE QUALIFICATION
// -----------------------
//   85+  : Excellent          (rare — vraie maturité opérationnelle)
//   70-84: Bon                 (cible standard pour PME engagée)
//   55-69: Correct             (acceptable mais à améliorer)
//   40-54: À surveiller        (action requise)
//   <40  : Critique            (urgence)
// =============================================================================

// -----------------------------------------------------------------------------
// Types d'entrée — alignés sur les types passés à AdminDashboard
// -----------------------------------------------------------------------------

export type CyberscoreStats = {
  totalSeats: number;
  activatedSeats: number;
  activationRate: number;
  completedEpisodes: number;
  totalEpisodes: number;
  masteryAverage: number;
};

export type CyberscoreSaison = {
  name: string;
  emoji: string;
  completed: number;
  total: number;
  pct: number;
};

export type CyberscoreTeam = {
  name: string;
  service: string;
  episodesDone: number;
  totalEpisodes: number;
  xp: number;
  lastActivity: string | null;
};

// Métadonnées tenant optionnelles (pour la pénalité "tenant jeune")
export type CyberscoreTenantMeta = {
  /** Date de création du tenant (utilisée pour la pénalité "tenant jeune") */
  createdAt?: Date;
};

// -----------------------------------------------------------------------------
// Types de sortie — détail pédagogique pour affichage UI
// -----------------------------------------------------------------------------

export type CyberscoreLevel = "excellent" | "bon" | "correct" | "warning" | "danger";

export type CyberscoreBreakdown = {
  /** Score final 0-100 (clamp + arrondi) */
  score: number;
  /** Niveau qualitatif pour l'UI */
  level: CyberscoreLevel;
  /** Libellé humain du niveau */
  label: string;
  /** Score brut avant courbe + pénalités (utile pour debug) */
  raw: number;
  /** Détail des composantes positives */
  components: {
    activation:    { score: number; max: 25; label: string; explanation: string };
    mastery:       { score: number; max: 50; label: string; explanation: string };
    fundamentals:  { score: number; max: 25; label: string; explanation: string };
  };
  /** Pénalités appliquées (vide si aucune) */
  penalties: Array<{ points: number; label: string; reason: string }>;
};

// -----------------------------------------------------------------------------
// Constantes — tunables
// -----------------------------------------------------------------------------

/** Slugs des saisons considérées comme "fondamentales" pour le scoring. */
const FUNDAMENTAL_SAISON_KEYWORDS = [
  "phishing", "mots-de-passe", "mots de passe", "mfa",
  "authentification", "double", "donnees", "données", "rgpd",
];

/** Nombre de jours depuis lequel un user est considéré "dormant". */
const DORMANT_THRESHOLD_DAYS = 30;

/** % seuil de dormants pour déclencher la pénalité d'inactivité. */
const DORMANT_RATE_THRESHOLD = 0.30;

/** % seuil de complétion en dessous duquel un service est "maillon faible". */
const WEAK_LINK_PCT_THRESHOLD = 40;

/** Âge minimum du tenant (jours) pour ne pas écoper de la pénalité jeune. */
const YOUNG_TENANT_DAYS_THRESHOLD = 90;

/** Exposant de la courbe concave (>1 = plus sévère). */
const CONCAVE_EXPONENT = 1.25;

// -----------------------------------------------------------------------------
// Calcul principal
// -----------------------------------------------------------------------------

export function computeCyberscore(
  stats: CyberscoreStats,
  saisons: CyberscoreSaison[],
  team: CyberscoreTeam[],
  tenantMeta: CyberscoreTenantMeta = {},
): CyberscoreBreakdown {
  // Cas dégénéré : pas de sièges → score impossible à calculer
  if (stats.totalSeats === 0) {
    return {
      score: 0,
      level: "danger",
      label: "Aucune donnée",
      raw: 0,
      components: {
        activation:   { score: 0, max: 25, label: "Activation", explanation: "Aucun siège actif." },
        mastery:      { score: 0, max: 50, label: "Maîtrise", explanation: "Aucun siège actif." },
        fundamentals: { score: 0, max: 25, label: "Fondamentaux", explanation: "Aucun siège actif." },
      },
      penalties: [],
    };
  }

  // ========================================================================
  // COMPOSANTES POSITIVES
  // ========================================================================

  // 1. ACTIVATION EFFECTIVE (25 pts max)
  //    On ne compte PAS juste l'activationRate "a cliqué une fois". On compte
  //    les users qui ont eu une activité dans les 30 derniers jours (recency).
  //    Logique : un user qui s'est connecté il y a 6 mois ne protège plus rien.
  const recentlyActiveCount = countRecentlyActive(team);
  const activeRate = stats.totalSeats > 0 ? recentlyActiveCount / stats.totalSeats : 0;
  const activationScore = Math.round(activeRate * 25);

  // 2. MAÎTRISE CYBER (50 pts max)
  //    masteryAverage est déjà sur 0-100. On le rapporte sur 50.
  //    C'est la composante la plus lourde car c'est le vrai indicateur.
  const masteryScore = Math.round((stats.masteryAverage / 100) * 50);

  // 3. COUVERTURE DES FONDAMENTAUX (25 pts max)
  //    Pas la moyenne globale mais juste les saisons critiques (phishing,
  //    mots de passe, MFA, RGPD). Si elles n'existent pas dans le tenant,
  //    fallback sur la moyenne globale (mais avec un malus implicite via
  //    la pénalité "phishing négligé").
  const fundamentalsScore = computeFundamentalsScore(saisons);

  // ========================================================================
  // SCORE BRUT + COURBE CONCAVE
  // ========================================================================

  const rawScoreLinear = activationScore + masteryScore + fundamentalsScore;
  // pow(x/100, 1.25) * 100 → courbe concave qui rend les hauts scores plus durs
  const rawScoreCurved = Math.pow(rawScoreLinear / 100, CONCAVE_EXPONENT) * 100;

  // ========================================================================
  // PÉNALITÉS
  // ========================================================================

  const penalties: CyberscoreBreakdown["penalties"] = [];

  // Pénalité 1 : maillon faible
  // ---------------------------
  // Un service à <40% complétion est exploitable même si la moyenne est bonne.
  const weakest = findWeakestService(team);
  if (weakest && weakest.completionPct < WEAK_LINK_PCT_THRESHOLD && weakest.size >= 2) {
    penalties.push({
      points: 10,
      label: "Maillon faible identifié",
      reason: `Service « ${weakest.service} » à ${weakest.completionPct}% (${weakest.size} pers.) — un attaquant ciblerait ce périmètre.`,
    });
  }

  // Pénalité 2 : inactivité prolongée
  // ---------------------------------
  const dormantCount = team.length - recentlyActiveCount;
  const dormantRate = team.length > 0 ? dormantCount / team.length : 0;
  if (dormantRate > DORMANT_RATE_THRESHOLD && team.length >= 5) {
    penalties.push({
      points: 15,
      label: "Inactivité prolongée",
      reason: `${dormantCount}/${team.length} collaborateurs sans activité depuis ${DORMANT_THRESHOLD_DAYS}j+ — la vigilance s'érode.`,
    });
  }

  // Pénalité 3 : phishing négligé
  // -----------------------------
  // Le phishing est la #1 menace en PME. Si aucun module phishing n'a été fait,
  // -20 pts (la sévérité est volontaire).
  const phishingSaison = saisons.find((s) =>
    s.name.toLowerCase().includes("phishing") ||
    s.emoji === "🎣",
  );
  if (phishingSaison && phishingSaison.completed === 0 && phishingSaison.total > 0) {
    penalties.push({
      points: 20,
      label: "Phishing négligé",
      reason: `Aucun collaborateur n'a complété la saison phishing alors qu'elle est la #1 menace en PME.`,
    });
  }

  // Pénalité 4 : tenant trop jeune
  // ------------------------------
  // <90j d'usage : pas assez de recul. Le score reflète peu de comportements.
  if (tenantMeta.createdAt) {
    const ageDays = Math.floor((Date.now() - tenantMeta.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (ageDays < YOUNG_TENANT_DAYS_THRESHOLD) {
      penalties.push({
        points: 5,
        label: "Tenant en démarrage",
        reason: `Ouvert depuis ${ageDays}j seulement. Le score sera affiné après 3 mois d'usage.`,
      });
    }
  }

  // ========================================================================
  // SCORE FINAL
  // ========================================================================

  const totalPenalties = penalties.reduce((s, p) => s + p.points, 0);
  const finalScore = Math.max(0, Math.min(100, Math.round(rawScoreCurved - totalPenalties)));

  return {
    score: finalScore,
    level: levelFromScore(finalScore),
    label: labelFromScore(finalScore),
    raw: Math.round(rawScoreLinear),
    components: {
      activation: {
        score: activationScore,
        max: 25,
        label: "Activation effective",
        explanation: `${recentlyActiveCount}/${stats.totalSeats} actifs depuis ${DORMANT_THRESHOLD_DAYS}j (${Math.round(activeRate * 100)}%)`,
      },
      mastery: {
        score: masteryScore,
        max: 50,
        label: "Maîtrise cyber",
        explanation: `Risk score moyen équipe : ${stats.masteryAverage}/100`,
      },
      fundamentals: {
        score: fundamentalsScore,
        max: 25,
        label: "Fondamentaux",
        explanation: explainFundamentals(saisons),
      },
    },
    penalties,
  };
}

// -----------------------------------------------------------------------------
// Helpers internes
// -----------------------------------------------------------------------------

/**
 * Compte les users avec une activité dans les N derniers jours.
 * lastActivity est une string formatée ("il y a 2h", "il y a 3j", date FR).
 * On parse pour extraire la fenêtre.
 */
function countRecentlyActive(team: CyberscoreTeam[]): number {
  return team.filter((u) => {
    if (!u.lastActivity) return false;
    return isWithinDays(u.lastActivity, DORMANT_THRESHOLD_DAYS);
  }).length;
}

function isWithinDays(lastActivity: string, days: number): boolean {
  // Format string "il y a < 1h" / "il y a Xh" / "il y a Xj" / date "DD/MM/YYYY"
  const lower = lastActivity.toLowerCase().trim();
  if (lower.includes("h")) return true; // heures = forcément récent
  const dayMatch = lower.match(/(\d+)\s*j/);
  if (dayMatch) {
    return parseInt(dayMatch[1], 10) <= days;
  }
  // Date FR JJ/MM/AAAA
  const dateMatch = lower.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dateMatch) {
    const d = new Date(parseInt(dateMatch[3]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]));
    const ageDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    return ageDays <= days;
  }
  return false; // format inconnu = considéré comme dormant (sécuritaire)
}

/**
 * Trouve le service avec la plus faible complétion (maillon faible).
 * Ignore les services à 1 seule personne (pas représentatif).
 */
function findWeakestService(team: CyberscoreTeam[]): {
  service: string;
  completionPct: number;
  size: number;
} | null {
  if (team.length === 0) return null;

  // Group par service
  const byService = new Map<string, { totalDone: number; totalPossible: number; size: number }>();
  for (const u of team) {
    const key = u.service || "—";
    const cur = byService.get(key) ?? { totalDone: 0, totalPossible: 0, size: 0 };
    cur.totalDone += u.episodesDone;
    cur.totalPossible += u.totalEpisodes;
    cur.size += 1;
    byService.set(key, cur);
  }

  let weakest: { service: string; completionPct: number; size: number } | null = null;
  for (const [service, agg] of byService.entries()) {
    if (agg.totalPossible === 0) continue;
    const pct = Math.round((agg.totalDone / agg.totalPossible) * 100);
    if (!weakest || pct < weakest.completionPct) {
      weakest = { service, completionPct: pct, size: agg.size };
    }
  }
  return weakest;
}

/**
 * Calcule le score "fondamentaux" sur 25 :
 * - Identifie les saisons critiques (mots-clés : phishing, mots-de-passe, MFA, RGPD)
 * - Moyenne pondérée de leur complétion
 * - Si aucune saison critique trouvée → fallback moyenne globale (avec malus implicite)
 */
function computeFundamentalsScore(saisons: CyberscoreSaison[]): number {
  if (saisons.length === 0) return 0;

  const fundamentals = saisons.filter((s) =>
    FUNDAMENTAL_SAISON_KEYWORDS.some((kw) => s.name.toLowerCase().includes(kw)),
  );

  // Si aucune saison fondamentale identifiée, on utilise la moyenne globale
  // mais avec un cap à 60% (puisqu'on ne peut pas vérifier les fondamentaux)
  if (fundamentals.length === 0) {
    const avg = saisons.reduce((s, sa) => s + sa.pct, 0) / saisons.length;
    return Math.round(Math.min(60, avg) / 100 * 25);
  }

  const avg = fundamentals.reduce((s, sa) => s + sa.pct, 0) / fundamentals.length;
  return Math.round((avg / 100) * 25);
}

function explainFundamentals(saisons: CyberscoreSaison[]): string {
  const fundamentals = saisons.filter((s) =>
    FUNDAMENTAL_SAISON_KEYWORDS.some((kw) => s.name.toLowerCase().includes(kw)),
  );
  if (fundamentals.length === 0) {
    return `Aucune saison fondamentale identifiée (capage à 60% de la moyenne globale)`;
  }
  const names = fundamentals.slice(0, 3).map((s) => s.name).join(" · ");
  const avgPct = Math.round(fundamentals.reduce((s, sa) => s + sa.pct, 0) / fundamentals.length);
  return `Moyenne ${avgPct}% sur ${fundamentals.length} saison(s) critique(s) : ${names}`;
}

function levelFromScore(score: number): CyberscoreLevel {
  if (score >= 85) return "excellent";
  if (score >= 70) return "bon";
  if (score >= 55) return "correct";
  if (score >= 40) return "warning";
  return "danger";
}

function labelFromScore(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Bon";
  if (score >= 55) return "Correct";
  if (score >= 40) return "À surveiller";
  return "Critique";
}
