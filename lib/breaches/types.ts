// SPDX-License-Identifier: AGPL-3.0-or-later
// Types partages entre scrapers et repository.

// FUITESINFOS : valeur de l'enum Prisma conservée pour ne pas migrer, et
// rien d'autre. La source a été retirée avant la première version, n'a
// jamais alimenté la base, et son éditeur a demandé le 2026-10-03 que rien
// ne soit repris : ni nom, ni adresse, ni collecte, nulle part dans l'image.
export type BreachSourceKey =
  "FRENCHBREACHES" | "BONJOURLAFUITE" | "FUITESINFOS";

export type ScrapedBreach = {
  // Identifiant externe stable cote source. Si la source n'en propose pas,
  // on utilise un hash sha256(title + date) ou (title + url).
  externalId: string;
  sourceUrl: string;
  title: string;
  organization?: string | null;
  country?: string;
  sector?: string | null;
  incidentDate: Date;
  summary?: string | null;
  recordsExposed?: number | null;
  dataTypes?: string | null;
  severity?: "low" | "medium" | "high" | "critical";
};

export type ScrapeResult = {
  source: BreachSourceKey;
  ok: boolean;
  count: number;
  errors: string[];
  items: ScrapedBreach[];
};

export const SOURCE_META: Record<
  BreachSourceKey,
  { name: string; url: string; description: string; active?: boolean }
> = {
  FRENCHBREACHES: {
    name: "FrenchBreaches",
    url: "https://frenchbreaches.com",
    description:
      "Veille des fuites de données touchant des organisations françaises.",
    active: true,
  },
  BONJOURLAFUITE: {
    name: "Bonjour la Fuite",
    url: "https://bonjourlafuite.eu.org",
    description:
      "Suivi indépendant des incidents de fuites de données en France.",
    active: true,
  },
  // Source retirée : entrée vide, ne couvre que l'enum Prisma. `active:
  // false` la tient hors de l'affichage, et il n'y a plus ni nom ni
  // adresse à afficher (cf. la note en tête de fichier).
  FUITESINFOS: { name: "", url: "", description: "", active: false },
};

// Liste des sources actives (pour les filtres UI et le scrape)
export const ACTIVE_SOURCES: BreachSourceKey[] = (
  Object.entries(SOURCE_META) as [
    BreachSourceKey,
    (typeof SOURCE_META)[BreachSourceKey],
  ][]
)
  .filter(([, meta]) => meta.active)
  .map(([key]) => key);
