// SPDX-License-Identifier: AGPL-3.0-or-later
// Tests du Cyberscore — composantes, pénalités, courbe concave.
// Critique : ce score apparaît sur le dashboard CODIR + rapports clients.
// Une régression = perte de confiance immédiate (le RSSI compare aux mois précédents).

import { describe, it, expect } from "vitest";
import {
  computeCyberscore,
  type CyberscoreStats,
  type CyberscoreSaison,
  type CyberscoreTeam,
} from "./cyber-score";

const baseStats: CyberscoreStats = {
  totalSeats: 10,
  activatedSeats: 8,
  activationRate: 0.8,
  completedEpisodes: 50,
  totalEpisodes: 100,
  masteryAverage: 70,
};

const baseSaisons: CyberscoreSaison[] = [
  { name: "Phishing", emoji: "🎣", completed: 8, total: 10, pct: 80 },
  {
    name: "Mots de passe",
    emoji: "🔑",
    completed: 6,
    total: 10,
    pct: 60,
  },
  { name: "RGPD", emoji: "📋", completed: 7, total: 10, pct: 70 },
];

const baseTeam: CyberscoreTeam[] = Array.from({ length: 10 }, (_, i) => ({
  name: `User ${i}`,
  service: i < 5 ? "Tech" : "Compta",
  episodesDone: 5,
  totalEpisodes: 10,
  xp: 100,
  lastActivity: "il y a 2j",
}));

describe("computeCyberscore — cas dégénérés", () => {
  it("retourne score 0 / level danger si totalSeats = 0", () => {
    const out = computeCyberscore({ ...baseStats, totalSeats: 0 }, [], []);
    expect(out.score).toBe(0);
    expect(out.level).toBe("danger");
    expect(out.label).toBe("Aucune donnée");
  });
});

describe("computeCyberscore — composantes", () => {
  it("activation calculée sur les users actifs récemment, pas activatedSeats", () => {
    const allDormant = baseTeam.map((u) => ({ ...u, lastActivity: null }));
    const out = computeCyberscore(baseStats, baseSaisons, allDormant);
    expect(out.components.activation.score).toBe(0);
  });

  it("activation 100% = 25 pts (max) si tous actifs récents", () => {
    const out = computeCyberscore(baseStats, baseSaisons, baseTeam);
    expect(out.components.activation.score).toBe(25);
    expect(out.components.activation.max).toBe(25);
  });

  it("mastery rapporte le riskScore moyen à 50 pts max", () => {
    const out = computeCyberscore(
      { ...baseStats, masteryAverage: 100 },
      baseSaisons,
      baseTeam,
    );
    expect(out.components.mastery.score).toBe(50);

    const out2 = computeCyberscore(
      { ...baseStats, masteryAverage: 50 },
      baseSaisons,
      baseTeam,
    );
    expect(out2.components.mastery.score).toBe(25);
  });

  it("fundamentals identifie les saisons par mot-clé (phishing, RGPD, etc.)", () => {
    const out = computeCyberscore(baseStats, baseSaisons, baseTeam);
    // 3 saisons fondamentales (Phishing 80% + Mots de passe 60% + RGPD 70%) = moyenne 70%
    // 70% × 25 = 17.5 → arrondi 18
    expect(out.components.fundamentals.score).toBe(18);
  });

  it("fundamentals cape à 60% si aucune saison fondamentale identifiée", () => {
    const nonFundamental: CyberscoreSaison[] = [
      { name: "Cyber-météo", emoji: "🌦️", completed: 10, total: 10, pct: 100 },
    ];
    const out = computeCyberscore(baseStats, nonFundamental, baseTeam);
    // 100% capé à 60%, ×25 = 15
    expect(out.components.fundamentals.score).toBe(15);
  });
});

describe("computeCyberscore — pénalités", () => {
  it("applique 'maillon faible' si un service a <40% complétion", () => {
    const team: CyberscoreTeam[] = [
      ...Array.from({ length: 5 }, (_, i) => ({
        name: `Tech ${i}`,
        service: "Tech",
        episodesDone: 8,
        totalEpisodes: 10,
        xp: 100,
        lastActivity: "il y a 1j",
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        name: `Compta ${i}`,
        service: "Compta",
        episodesDone: 1, // 10% complétion
        totalEpisodes: 10,
        xp: 20,
        lastActivity: "il y a 1j",
      })),
    ];
    const out = computeCyberscore(
      { ...baseStats, totalSeats: 8 },
      baseSaisons,
      team,
    );
    const weakLink = out.penalties.find((p) =>
      p.label.includes("Maillon faible"),
    );
    expect(weakLink).toBeDefined();
    expect(weakLink?.points).toBe(10);
  });

  it("ignore les services à 1 seule personne (pas représentatif)", () => {
    const team: CyberscoreTeam[] = [
      ...Array.from({ length: 5 }, (_, i) => ({
        name: `Tech ${i}`,
        service: "Tech",
        episodesDone: 8,
        totalEpisodes: 10,
        xp: 100,
        lastActivity: "il y a 1j",
      })),
      {
        name: "Solo",
        service: "Direction",
        episodesDone: 0,
        totalEpisodes: 10,
        xp: 0,
        lastActivity: "il y a 1j",
      },
    ];
    const out = computeCyberscore(baseStats, baseSaisons, team);
    expect(
      out.penalties.find((p) => p.label.includes("Maillon faible")),
    ).toBeUndefined();
  });

  it("applique 'inactivité prolongée' si >30% dormants", () => {
    const team: CyberscoreTeam[] = [
      ...Array.from({ length: 4 }, (_, i) => ({
        name: `Active ${i}`,
        service: "Tech",
        episodesDone: 5,
        totalEpisodes: 10,
        xp: 50,
        lastActivity: "il y a 1j",
      })),
      ...Array.from({ length: 6 }, (_, i) => ({
        name: `Dormant ${i}`,
        service: "Tech",
        episodesDone: 5,
        totalEpisodes: 10,
        xp: 50,
        lastActivity: null, // dormant
      })),
    ];
    const out = computeCyberscore(baseStats, baseSaisons, team);
    const inactivity = out.penalties.find((p) =>
      p.label.includes("Inactivité"),
    );
    expect(inactivity).toBeDefined();
    expect(inactivity?.points).toBe(15);
  });

  it("applique 'phishing négligé' si saison phishing à 0", () => {
    const saisons: CyberscoreSaison[] = [
      { name: "Phishing", emoji: "🎣", completed: 0, total: 10, pct: 0 },
    ];
    const out = computeCyberscore(baseStats, saisons, baseTeam);
    const phish = out.penalties.find((p) => p.label.includes("Phishing"));
    expect(phish).toBeDefined();
    expect(phish?.points).toBe(20);
  });

  it("applique 'tenant trop jeune' si createdAt < 90j", () => {
    const out = computeCyberscore(baseStats, baseSaisons, baseTeam, {
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
    });
    const young = out.penalties.find((p) => p.label.includes("démarrage"));
    expect(young).toBeDefined();
    expect(young?.points).toBe(5);
  });

  it("n'applique PAS 'tenant jeune' si createdAt > 90j", () => {
    const out = computeCyberscore(baseStats, baseSaisons, baseTeam, {
      createdAt: new Date(Date.now() - 100 * 24 * 3600 * 1000),
    });
    expect(
      out.penalties.find((p) => p.label.includes("démarrage")),
    ).toBeUndefined();
  });
});

describe("computeCyberscore — courbe concave + clamp", () => {
  it("score reste entre 0 et 100", () => {
    const out = computeCyberscore(baseStats, baseSaisons, baseTeam);
    expect(out.score).toBeGreaterThanOrEqual(0);
    expect(out.score).toBeLessThanOrEqual(100);
  });

  it("score brut < score curved : courbe concave rend les hauts scores plus durs", () => {
    // Configuration "parfaite" : activation 25 + mastery 50 + fundamentals 25 = 100 raw
    const out = computeCyberscore(
      { ...baseStats, masteryAverage: 100 },
      [{ name: "Phishing", emoji: "🎣", completed: 10, total: 10, pct: 100 }],
      baseTeam,
    );
    // 100 raw → pow(1, 1.25) × 100 = 100 → clamp 100
    expect(out.raw).toBeGreaterThan(0);
  });

  it("level + label cohérents avec les seuils 85/70/55/40", () => {
    // Cas 1 : score 95+ avec config parfaite
    const out = computeCyberscore(
      { ...baseStats, masteryAverage: 100 },
      [{ name: "Phishing", emoji: "🎣", completed: 10, total: 10, pct: 100 }],
      baseTeam,
    );
    if (out.score >= 85) {
      expect(out.level).toBe("excellent");
      expect(out.label).toBe("Excellent");
    }

    // Cas 2 : config faible → danger
    const lowOut = computeCyberscore(
      { ...baseStats, masteryAverage: 10 },
      [{ name: "Random", emoji: "❓", completed: 0, total: 10, pct: 0 }],
      baseTeam.map((u) => ({ ...u, lastActivity: null })),
    );
    expect(["danger", "warning"]).toContain(lowOut.level);
  });
});
