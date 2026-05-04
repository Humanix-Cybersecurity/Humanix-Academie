// Types partages entre scrapers et repository.

// FUITESINFOS reste dans le type pour rétrocompat (enum Prisma + items déjà
// en BDD), mais ne figure plus dans SOURCE_META et n'est plus scrapé
// (structure non-stable, retournait du contenu non exploitable).
export type BreachSourceKey =
  | "FRENCHBREACHES"
  | "BONJOURLAFUITE"
  | "FUITESINFOS";

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
  // Source historique non scrapée — voir lib/breaches/parsers.ts pour la note.
  // Les items déjà en BDD restent affichés (filtre côté UI : source.active).
  FUITESINFOS: {
    name: "Fuites Infos",
    url: "https://fuitesinfos.fr",
    description: "Source historique (non rafraîchie).",
    active: false,
  },
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
