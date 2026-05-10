// SPDX-License-Identifier: AGPL-3.0-or-later
// Types partages des widgets du dashboard admin.
//
// Garde la compatibilite stricte avec le contrat de Props de
// AdminDashboard (page server passe ces structures depuis Prisma).

export type Stats = {
  totalSeats: number;
  activatedSeats: number;
  activationRate: number;
  completedEpisodes: number;
  totalEpisodes: number;
  averageXpPerEpisode: number;
  masteryAverage: number;
  totalXP: number;
};

export type SaisonRow = {
  name: string;
  emoji: string;
  completed: number;
  total: number;
  pct: number;
};

export type TeamRow = {
  name: string;
  service: string;
  episodesDone: number;
  totalEpisodes: number;
  xp: number;
  lastActivity: string | null;
};

export type WeeklyPoint = { day: string; completions: number };

export type Action = {
  level: "danger" | "warning" | "info";
  icon: string;
  title: string;
  description: string;
  cta: { label: string; href: string };
};
