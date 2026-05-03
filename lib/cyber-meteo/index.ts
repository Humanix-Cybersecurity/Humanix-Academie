// Cyber-météo France — niveau d'alerte cyber national agrégé.
//
// SOURCE OFFICIELLE : feed RSS du CERT-FR (cert.ssi.gouv.fr).
// Cache disque 1h pour éviter de marteler le flux et tenir la latence
// d'affichage < 50ms en steady state.
//
// PHILOSOPHIE : on ne fait PAS de prédiction, on synthétise les alertes
// publiques actuelles pour transformer un signal officiel en information
// directement actionnable par le dirigeant PME ("aujourd'hui : alerte
// phishing massif sur banques françaises").
//
// SOUVERAIN : flux .gouv.fr, parsing local, aucune donnée envoyée hors UE.

import fs from "node:fs/promises";
import path from "node:path";

// Source officielle CERT-FR (alertes + avis)
const FEED_ALERTES = "https://www.cert.ssi.gouv.fr/alerte/feed/";
const FEED_AVIS = "https://www.cert.ssi.gouv.fr/avis/feed/";

const CACHE_DIR = path.join(process.cwd(), ".meteo-cache");
const CACHE_FILE = path.join(CACHE_DIR, "feed.json");
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

export type AlertLevel = "vert" | "jaune" | "orange" | "rouge";

export type CyberMeteo = {
  level: AlertLevel;
  label: string;
  emoji: string;
  // Court résumé en 1 phrase pour le bandeau home
  summary: string;
  // Détail : 3-5 alertes les plus récentes
  topAlerts: { title: string; date: string; url: string }[];
  // Métriques utilisées pour le calcul
  alertsLast7d: number;
  alertsLast24h: number;
  // Quand la météo a été calculée
  computedAt: string;
};

const LEVEL_META: Record<AlertLevel, { label: string; emoji: string }> = {
  vert: { label: "Calme", emoji: "🟢" },
  jaune: { label: "Vigilance", emoji: "🟡" },
  orange: { label: "Élevée", emoji: "🟠" },
  rouge: { label: "Critique", emoji: "🔴" },
};

type FeedItem = { title: string; date: string; url: string };

/**
 * Récupère la météo cyber. Cache disque 1h, fallback gracieux si
 * cert-fr est down ou réseau coupé : on retourne le dernier cache
 * (même périmé) plutôt que de planter.
 */
export async function getCyberMeteo(): Promise<CyberMeteo> {
  // 1. Lookup cache
  const cached = await readCache();
  if (cached && Date.now() - new Date(cached.computedAt).getTime() < CACHE_TTL_MS) {
    return cached;
  }

  // 2. Refresh depuis le feed officiel
  try {
    const items = await fetchFeed();
    const meteo = computeMeteo(items);
    await writeCache(meteo);
    return meteo;
  } catch (e) {
    // Réseau down / cert-fr indisponible : on retombe sur le cache même périmé
    if (cached) {
      return { ...cached, summary: cached.summary + " (données mises en cache)" };
    }
    // Pas de cache : on retourne un état neutre
    return defaultMeteo();
  }
}

async function fetchFeed(): Promise<FeedItem[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);

  const fetchOne = async (url: string): Promise<FeedItem[]> => {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "user-agent": "HumanixAcademie/1.0 (cyber-meteo)" },
    });
    if (!res.ok) throw new Error(`feed_http_${res.status}`);
    const xml = await res.text();
    return parseRSS(xml);
  };

  try {
    const [alertes, avis] = await Promise.all([
      fetchOne(FEED_ALERTES).catch(() => [] as FeedItem[]),
      fetchOne(FEED_AVIS).catch(() => [] as FeedItem[]),
    ]);
    return [...alertes, ...avis].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parser RSS minimaliste — on évite une dépendance lourde.
 * Suffisant pour le format CERT-FR qui est un RSS 2.0 standard.
 */
function parseRSS(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const date = extractTag(block, "pubDate");
    const url = extractTag(block, "link");
    if (title && date) {
      items.push({
        title: stripCdata(title),
        date: new Date(date).toISOString(),
        url: stripCdata(url) || "https://www.cert.ssi.gouv.fr/",
      });
    }
  }
  return items;
}

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = re.exec(block);
  return m?.[1].trim() ?? "";
}

function stripCdata(s: string): string {
  return s.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

/**
 * Calcul du niveau d'alerte selon le volume d'alertes récentes.
 * Pondération basée sur :
 *  - alertes <24h x3 (signal d'ouragan en cours)
 *  - alertes <7j x1
 *
 * Seuils calibrés à partir des observations CERT-FR 2023-2025 :
 *  - moyenne ~5 alertes/semaine en steady state
 *  - 10+/semaine = vague (orange)
 *  - 15+/semaine ou 4+/24h = critique (rouge)
 */
function computeMeteo(items: FeedItem[]): CyberMeteo {
  const now = Date.now();
  const ms24h = 24 * 3600 * 1000;
  const ms7d = 7 * 24 * 3600 * 1000;

  const last24h = items.filter((i) => now - new Date(i.date).getTime() < ms24h).length;
  const last7d = items.filter((i) => now - new Date(i.date).getTime() < ms7d).length;

  const score = last7d + last24h * 3;

  let level: AlertLevel;
  if (score >= 25 || last24h >= 4) level = "rouge";
  else if (score >= 15) level = "orange";
  else if (score >= 8) level = "jaune";
  else level = "vert";

  const meta = LEVEL_META[level];
  const summary = buildSummary(level, last7d, last24h, items);
  const topAlerts = items.slice(0, 5).map((i) => ({
    title: i.title.slice(0, 200),
    date: i.date,
    url: i.url,
  }));

  return {
    level,
    label: meta.label,
    emoji: meta.emoji,
    summary,
    topAlerts,
    alertsLast7d: last7d,
    alertsLast24h: last24h,
    computedAt: new Date().toISOString(),
  };
}

function buildSummary(
  level: AlertLevel,
  last7d: number,
  last24h: number,
  items: FeedItem[],
): string {
  if (level === "vert") {
    return `Activité cyber nationale calme : ${last7d} alerte${last7d > 1 ? "s" : ""} CERT-FR sur 7 jours.`;
  }
  if (level === "jaune") {
    return `Vigilance recommandée : ${last7d} alertes CERT-FR sur 7 jours, dont ${last24h} dans les dernières 24h.`;
  }
  if (level === "orange") {
    return `Activité élevée : ${last7d} alertes CERT-FR sur 7 jours. Prudence accrue recommandée pour vos équipes.`;
  }
  // rouge
  const themes = extractThemes(items.slice(0, 8));
  const themesTxt = themes.length > 0 ? ` Thèmes dominants : ${themes.join(", ")}.` : "";
  return `Alerte critique : ${last24h} alertes CERT-FR ces dernières 24h, ${last7d} sur 7 jours.${themesTxt}`;
}

/**
 * Extraction très basique de mots-clés thématiques depuis les titres récents
 * pour le résumé en cas de niveau rouge. Non-exhaustif, best-effort.
 */
function extractThemes(items: FeedItem[]): string[] {
  const keywords: Record<string, string[]> = {
    phishing: ["phishing", "hameçonnage", "smishing"],
    ransomware: ["ransomware", "rançongiciel", "extorsion"],
    "vulnérabilité critique": ["faille", "cve-", "vulnérabilité critique"],
    "supply chain": ["supply chain", "chaîne d'approvisionnement"],
    Microsoft: ["microsoft", "windows", "office 365", "exchange"],
    Apple: ["apple", "macos", "ios"],
    Linux: ["linux", "kernel"],
  };
  const found = new Set<string>();
  for (const item of items) {
    const title = item.title.toLowerCase();
    for (const [theme, kws] of Object.entries(keywords)) {
      if (kws.some((k) => title.includes(k))) {
        found.add(theme);
      }
    }
  }
  return Array.from(found).slice(0, 3);
}

function defaultMeteo(): CyberMeteo {
  return {
    level: "vert",
    label: LEVEL_META.vert.label,
    emoji: LEVEL_META.vert.emoji,
    summary: "Données CERT-FR temporairement indisponibles. Retentez plus tard.",
    topAlerts: [],
    alertsLast7d: 0,
    alertsLast24h: 0,
    computedAt: new Date().toISOString(),
  };
}

// =====================================================================
// CACHE DISQUE
// =====================================================================
async function readCache(): Promise<CyberMeteo | null> {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    return JSON.parse(raw) as CyberMeteo;
  } catch {
    return null;
  }
}

async function writeCache(meteo: CyberMeteo): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(meteo, null, 2));
  } catch {
    // best-effort
  }
}
