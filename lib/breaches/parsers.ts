// Parsers HTML/RSS robustes pour les 3 sources publiques de fuites FR.
//
// Chaque parser tente plusieurs URLs candidates dans l'ordre et accumule
// les items trouvés. Mode `deep=true` : parcourt aussi les archives par
// année (utile pour la 1ère initialisation).
//
// Fallbacks parser : RSS standard d'abord, puis Atom, puis HTML brut
// (lien vers article + titre + date).
//
// LIMITES CONNUES : sans accès direct aux 3 sites, les regex HTML sont
// défensives (multi-patterns). Si certaines structures changent, l'endpoint
// /api/admin/breaches/debug retourne le HTML brut pour calibration.

import crypto from "node:crypto";
import type { ScrapeResult, ScrapedBreach } from "./types";

const TIMEOUT_MS = 12_000;
const MAX_BYTES = 800 * 1024;

// =============================================================================
// HELPERS GENERIQUES
// =============================================================================

export type FetchResult = {
  url: string;
  ok: boolean;
  body: string;
  bytes: number;
  status?: number;
  error?: string;
};

export async function fetchText(url: string): Promise<FetchResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; HumanixBreachesBot/1.0; +https://humanix-cybersecurity.fr)",
        accept:
          "text/html,application/xhtml+xml,application/rss+xml,application/atom+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "fr,en;q=0.5",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      return {
        url,
        ok: false,
        body: "",
        bytes: 0,
        status: res.status,
        error: `http_${res.status}`,
      };
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return {
        url,
        ok: false,
        body: "",
        bytes: buf.byteLength,
        error: "response_too_big",
      };
    }
    return {
      url,
      ok: true,
      body: new TextDecoder("utf-8").decode(buf),
      bytes: buf.byteLength,
      status: res.status,
    };
  } catch (e: any) {
    return {
      url,
      ok: false,
      body: "",
      bytes: 0,
      error: e?.name === "AbortError" ? "timeout" : String(e?.message ?? e),
    };
  } finally {
    clearTimeout(timer);
  }
}

function hashStable(parts: string[]): string {
  return crypto
    .createHash("sha256")
    .update(parts.join("|"))
    .digest("hex")
    .slice(0, 32);
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&agrave;/g, "à")
    .replace(/&ccedil;/g, "ç")
    .replace(/&ouml;/g, "ö")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

/**
 * Sanitisation des strings avant insertion BDD.
 *
 * CONTEXTE : le scraping HTML peut remonter des séquences problématiques
 * pour le moteur Prisma/Postgres :
 *   - NULL bytes  (interdit en PostgreSQL TEXT)
 *   - Caractères de contrôle (sauf \n \t \r)
 *   - Surrogate pairs Unicode mal formés (\uD800-\uDFFF non appariés)
 *   - Séquences d'échappement orphelines (backslash en fin de string)
 *
 * Sans ce nettoyage, Prisma lève "unexpected end of hex escape" lors du
 * marshalling du payload.
 */
export function sanitizeForDb(s: string): string {
  if (!s) return s;
  let out = s;

  // 1. Retire les caractères de contrôle ASCII + NULL byte (interdit en
  //    PostgreSQL TEXT). On conserve \t \n \r pour le markdown.
  out = out.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // 2. Retire les surrogate pairs Unicode orphelins (invalides en UTF-8 strict)
  out = out.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "");
  out = out.replace(/(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "$1");

  // 3. Neutralise toute séquence \u et \x mal formée. Le scraping HTML peut
  //    remonter du texte qui contient littéralement "\u00" (6 chars), et le
  //    query engine Prisma se mélange même après JSON.stringify. Le plus sûr :
  //    retirer purement et simplement tous les backslashes, qui sont sans
  //    intérêt légitime dans un titre/description de fuite de données.
  out = out.replace(/\\/g, "");

  // 4. Tab et NBSP -> espace simple
  out = out.replace(/[\t ]/g, " ");

  // 5. Espaces excessifs
  out = out.replace(/\s+/g, " ").trim();

  return out;
}

/**
 * Slice respectueux des surrogate pairs UTF-16.
 *
 * `String.prototype.slice` en JS coupe par UTF-16 code units (16 bits).
 * Pour un emoji ou caractère Unicode étendu (>= U+10000), encodé en UTF-16
 * comme une paire de surrogates (high + low), un slice à un index pair
 * peut couper la paire en deux et laisser un surrogate orphelin invalide.
 *
 * Ce surrogate orphelin fait planter le marshalling JSON de Prisma avec
 * "unexpected end of hex escape" — le moteur de query Postgres reçoit du
 * JSON dont une string contient \uD8XX sans son partenaire \uDCXX.
 *
 * Cette fonction tronque proprement en évitant ce cas.
 */
export function safeSlice(s: string, max: number): string {
  if (s.length <= max) return s;
  let cut = s.slice(0, max);
  const lastCode = cut.charCodeAt(cut.length - 1);
  // High surrogate orphelin en fin → on recule d'1 char
  if (lastCode >= 0xd800 && lastCode <= 0xdbff) {
    cut = cut.slice(0, -1);
  }
  return cut;
}

function stripTags(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function extractCdata(s: string): string {
  return s
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .trim();
}

function absolutize(url: string, base: string): string {
  if (!url) return base;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  try {
    return new URL(url, base).toString();
  } catch {
    return base;
  }
}

// Parsing RSS/Atom unifié
type FeedItem = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
};

function parseFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];

  // RSS 2.0 : <item>
  const rssItems = xml.match(/<item[\s\S]*?<\/item>/g) ?? [];
  for (const block of rssItems) {
    const title = extractCdata(
      /<title[^>]*>([\s\S]*?)<\/title>/.exec(block)?.[1] ?? "",
    );
    // Le <link> est optionnel en pratique : certains feeds (Eleventy, JSON-feed
    // converti, etc.) ne l'incluent pas et utilisent uniquement <guid
    // isPermaLink="true">. On accepte les deux comme source de l'URL.
    let link = extractCdata(
      /<link[^>]*>([\s\S]*?)<\/link>/.exec(block)?.[1] ?? "",
    );
    if (!link) {
      const guidMatch = /<guid(?:\s[^>]*)?>([\s\S]*?)<\/guid>/.exec(block);
      if (guidMatch) link = extractCdata(guidMatch[1]);
    }
    const pubDate = extractCdata(
      (
        /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/.exec(block)?.[1] ??
        /<dc:date[^>]*>([\s\S]*?)<\/dc:date>/.exec(block)?.[1] ??
        ""
      ).trim(),
    );
    const description = extractCdata(
      (
        /<description[^>]*>([\s\S]*?)<\/description>/.exec(block)?.[1] ??
        /<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/.exec(
          block,
        )?.[1] ??
        /<summary[^>]*>([\s\S]*?)<\/summary>/.exec(block)?.[1] ??
        ""
      ).trim(),
    );
    if (title && link) items.push({ title, link, pubDate, description });
  }

  // Atom : <entry>
  if (items.length === 0) {
    const atomEntries = xml.match(/<entry[\s\S]*?<\/entry>/g) ?? [];
    for (const block of atomEntries) {
      const title = extractCdata(
        /<title[^>]*>([\s\S]*?)<\/title>/.exec(block)?.[1] ?? "",
      );
      const linkMatch = /<link[^>]+href="([^"]+)"/.exec(block);
      const link = linkMatch?.[1] ?? "";
      const pubDate = extractCdata(
        (
          /<published[^>]*>([\s\S]*?)<\/published>/.exec(block)?.[1] ??
          /<updated[^>]*>([\s\S]*?)<\/updated>/.exec(block)?.[1] ??
          ""
        ).trim(),
      );
      const description = extractCdata(
        /<summary[^>]*>([\s\S]*?)<\/summary>/.exec(block)?.[1] ??
          /<content[^>]*>([\s\S]*?)<\/content>/.exec(block)?.[1] ??
          "",
      );
      if (title && link) items.push({ title, link, pubDate, description });
    }
  }

  return items;
}

function guessOrganization(title: string): string | null {
  const patterns = [
    /(?:fuite\s+(?:massive\s+)?(?:à|chez|de)|chez|piratage\s+(?:de|chez)|leak\s+(?:chez|de))\s+(?:la\s+|le\s+|les\s+|l'|de\s+l'|du\s+|de\s+la\s+)?([A-ZÀ-Ÿ][\wÀ-ÿ\s&.'-]+?)(?:\s*[-—:|,]|\s+\d|\s+expose|\s+touche|\s+annonce|$)/i,
    /^([A-ZÀ-Ÿ][\wÀ-ÿ\s&.-]+?)\s*[-—:|]/,
  ];
  for (const re of patterns) {
    const m = re.exec(title);
    if (m && m[1]) {
      const org = m[1].trim().replace(/\s+/g, " ");
      if (org.length >= 2 && org.length <= 80) return org;
    }
  }
  return null;
}

function parseRecordsExposed(text: string): number | null {
  const t = text.toLowerCase();
  const re = /([\d.,\s]+)\s*(milliards?|millions?|m\b)/;
  const m = re.exec(t);
  if (m) {
    const num = parseFloat(m[1].replace(/[\s.]/g, "").replace(",", "."));
    if (!Number.isFinite(num)) return null;
    if (m[2].startsWith("milliard")) return Math.round(num * 1_000_000_000);
    return Math.round(num * 1_000_000);
  }
  const re2 =
    /\b(\d{4,})\b\s*(?:enregistrements?|comptes?|utilisateurs?|clients?|emails?|adresses|données|donnees|personnes|lignes|fiches)/;
  const m2 = re2.exec(t);
  if (m2) {
    const n = parseInt(m2[1], 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function inferSeverity(
  records: number | null,
): "low" | "medium" | "high" | "critical" {
  if (records == null) return "medium";
  if (records >= 1_000_000) return "critical";
  if (records >= 100_000) return "high";
  if (records >= 10_000) return "medium";
  return "low";
}

const MONTHS_FR: Record<string, number> = {
  janvier: 0,
  février: 1,
  fevrier: 1,
  mars: 2,
  avril: 3,
  mai: 4,
  juin: 5,
  juillet: 6,
  août: 7,
  aout: 7,
  septembre: 8,
  octobre: 9,
  novembre: 10,
  décembre: 11,
  decembre: 11,
};

function parseDateFr(s: string): Date | null {
  if (!s) return null;
  const direct = new Date(s);
  if (!Number.isNaN(direct.getTime())) return direct;
  // "12 mars 2026" / "12/03/2026" / "12-03-2026" / "2026-03-12"
  const reFr =
    /(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})/i;
  const m = reFr.exec(s);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = MONTHS_FR[m[2].toLowerCase()];
    const y = parseInt(m[3], 10);
    if (Number.isFinite(d) && mo != null && Number.isFinite(y))
      return new Date(y, mo, d);
  }
  const reSlash = /(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/;
  const m2 = reSlash.exec(s);
  if (m2) {
    const d = parseInt(m2[1], 10);
    const mo = parseInt(m2[2], 10) - 1;
    const y = parseInt(m2[3], 10);
    if (Number.isFinite(d) && mo >= 0 && mo < 12 && Number.isFinite(y))
      return new Date(y, mo, d);
  }
  const reIso = /(\d{4})-(\d{2})-(\d{2})/;
  const m3 = reIso.exec(s);
  if (m3) return new Date(`${m3[1]}-${m3[2]}-${m3[3]}T12:00:00Z`);
  return null;
}

function makeBreach(args: {
  url: string;
  title: string;
  description?: string;
  date?: string | Date | null;
  baseUrl: string;
}): ScrapedBreach {
  // ORDRE CRITIQUE : sanitize -> slice -> sanitize (re-pass au cas où le
  // safeSlice révèle un surrogate orphelin restant). Le 1er sanitize retire
  // les chars de contrôle, le safeSlice respecte les surrogate pairs, le
  // 2ème sanitize finalise au cas où.
  const url = sanitizeForDb(
    safeSlice(absolutize(args.url, args.baseUrl), 1000),
  );
  const cleanTitle = sanitizeForDb(safeSlice(sanitizeForDb(args.title), 500));
  const cleanDesc = args.description
    ? sanitizeForDb(safeSlice(sanitizeForDb(stripTags(args.description)), 500))
    : null;
  const date =
    args.date instanceof Date
      ? args.date
      : args.date
        ? (parseDateFr(args.date) ?? new Date())
        : new Date();
  const records = parseRecordsExposed(`${cleanTitle} ${cleanDesc ?? ""}`);
  const org = guessOrganization(cleanTitle);
  return {
    externalId: hashStable([url, cleanTitle, date.toISOString().slice(0, 10)]),
    sourceUrl: url,
    title: cleanTitle,
    organization: org ? sanitizeForDb(org) : null,
    country: "FR",
    sector: null,
    incidentDate: date,
    summary: cleanDesc,
    recordsExposed: records,
    dataTypes: null,
    severity: inferSeverity(records),
  };
}

// Dédup intra-scrape (peut arriver si la même page est listée 2 fois)
function dedupItems(items: ScrapedBreach[]): ScrapedBreach[] {
  const seen = new Set<string>();
  const out: ScrapedBreach[] = [];
  for (const it of items) {
    if (seen.has(it.externalId)) continue;
    seen.add(it.externalId);
    out.push(it);
  }
  return out;
}

// =============================================================================
// SCRAPER 1 : frenchbreaches.com
// Structure observée : site PHP, articles sous /blog/<slug> et /alertes/<slug>,
// archives sous /archives.php, catégorie /blog/categorie/fuites-de-donnees
// =============================================================================
export async function scrapeFrenchBreaches(
  opts: { deep?: boolean } = {},
): Promise<ScrapeResult> {
  const result: ScrapeResult = {
    source: "FRENCHBREACHES",
    ok: false,
    count: 0,
    errors: [],
    items: [],
  };
  const base = "https://frenchbreaches.com";

  // URLs candidates : RSS d'abord (cf. mention dans /a-propos), puis HTML
  const candidates = [
    `${base}/feed.xml`,
    `${base}/rss.xml`,
    `${base}/feed.rss`,
    `${base}/blog/feed`,
    `${base}/blog/feed.xml`,
    `${base}/blog/rss`,
    `${base}/blog/categorie/fuites-de-donnees`,
    `${base}/archives.php`,
    `${base}/blog/`,
    `${base}/`,
  ];

  // En mode deep, on parcourt aussi les archives par année (si la page existe)
  if (opts.deep) {
    const yearNow = new Date().getFullYear();
    for (let y = yearNow; y >= yearNow - 1; y--) {
      candidates.push(`${base}/archives.php?annee=${y}`);
      candidates.push(`${base}/archives/${y}`);
      candidates.push(`${base}/${y}`);
    }
  }

  for (const url of candidates) {
    const fr = await fetchText(url);
    if (!fr.ok) {
      // Logge seulement si erreur autre que 404 (404 = essai normal)
      if (fr.error && fr.error !== "http_404") {
        result.errors.push(`${url}: ${fr.error}`);
      }
      continue;
    }

    // Tenter parser feed (RSS/Atom)
    const items = parseFeed(fr.body);
    if (items.length > 0) {
      for (const it of items.slice(0, 80)) {
        result.items.push(
          makeBreach({
            url: it.link,
            title: it.title,
            description: it.description,
            date: it.pubDate || null,
            baseUrl: base,
          }),
        );
      }
    }

    // Tenter parser HTML : liens d'articles
    if (items.length === 0) {
      // Pattern 1 : <article> avec <h2>/<h3> + lien
      const articleRe = /<article[\s\S]*?<\/article>/g;
      const articles = fr.body.match(articleRe) ?? [];
      for (const a of articles.slice(0, 50)) {
        const titleMatch = /<h[123][^>]*>([\s\S]*?)<\/h[123]>/.exec(a);
        const linkMatch = /<a[^>]+href="([^"]+)"/.exec(a);
        if (!titleMatch || !linkMatch) continue;
        const title = stripTags(titleMatch[1]);
        if (title.length < 5) continue;
        result.items.push(
          makeBreach({
            url: linkMatch[1],
            title,
            description: stripTags(a).slice(0, 400),
            date: null,
            baseUrl: base,
          }),
        );
      }

      // Pattern 2 : liens directs vers /blog/<slug> ou /alertes/<slug>
      if (result.items.length === 0) {
        const linkRe =
          /<a[^>]+href="(\/(?:blog|alertes)\/[^"]+)"[^>]*>([^<]{10,200})<\/a>/g;
        let m: RegExpExecArray | null;
        while (
          (m = linkRe.exec(fr.body)) !== null &&
          result.items.length < 50
        ) {
          const href = m[1];
          const text = stripTags(m[2]);
          if (text.length < 10) continue;
          result.items.push(
            makeBreach({
              url: href,
              title: text,
              baseUrl: base,
              date: null,
            }),
          );
        }
      }
    }

    // Si on a trouvé des items dans un feed, on s'arrête (priorité au RSS)
    if (result.items.length >= 10) break;
  }

  result.items = dedupItems(result.items);
  result.ok = result.items.length > 0;
  result.count = result.items.length;
  return result;
}

// =============================================================================
// SCRAPER 2 : bonjourlafuite.eu.org
// Structure observée : site timeline, probablement Hugo/static, page unique
// avec liste chronologique d'incidents.
// =============================================================================
export async function scrapeBonjourLaFuite(
  opts: { deep?: boolean } = {},
): Promise<ScrapeResult> {
  const result: ScrapeResult = {
    source: "BONJOURLAFUITE",
    ok: false,
    count: 0,
    errors: [],
    items: [],
  };
  const base = "https://bonjourlafuite.eu.org";

  const candidates = [
    `${base}/feed.xml`,
    `${base}/atom.xml`,
    `${base}/rss.xml`,
    `${base}/feed/`,
    `${base}/rss`,
    `${base}/index.xml`,
    `${base}/`,
  ];

  if (opts.deep) {
    candidates.push(`${base}/timeline`);
    candidates.push(`${base}/incidents`);
    candidates.push(`${base}/archives`);
  }

  for (const url of candidates) {
    const fr = await fetchText(url);
    if (!fr.ok) {
      if (fr.error && fr.error !== "http_404") {
        result.errors.push(`${url}: ${fr.error}`);
      }
      continue;
    }

    // RSS/Atom UNIQUEMENT (Eleventy expose un feed.xml propre).
    // PAS de fallback HTML : la home contient un footer de signalement
    // ("Pour signaler une nouvelle fuite : fuites@imirhil.fr ...") qui était
    // capturé comme s'il s'agissait d'une fuite. Si le RSS échoue, on
    // s'abstient plutôt que de polluer la BDD.
    const items = parseFeed(fr.body);
    if (items.length > 0) {
      for (const it of items.slice(0, 80)) {
        result.items.push(
          makeBreach({
            url: it.link,
            title: it.title,
            description: it.description,
            date: it.pubDate || null,
            baseUrl: base,
          }),
        );
      }
      // Dès que le RSS retourne des items, on s'arrête immédiatement
      break;
    }
  }

  result.items = dedupItems(result.items);
  result.ok = result.items.length > 0;
  result.count = result.items.length;
  return result;
}

// =============================================================================
// SCRAPER 3 : fuitesinfos.fr — RETIRÉ
// Le site WordPress + Yoast retournait un /feed/ HTML non parsable et une
// API REST WP inaccessible / vide. Sans structure exploitable de manière
// fiable, on a retiré la source plutôt que de polluer la BDD avec des
// items mal extraits. L'enum BreachSource.FUITESINFOS reste dans le
// schema Prisma pour rétrocompat des items déjà en BDD (à purger via
// `DELETE FROM "DataBreach" WHERE source = 'FUITESINFOS';`).
// =============================================================================

// (fonction retirée — voir l'enum BreachSource côté Prisma)

// =============================================================================
// EXPORT PUBLIC
// =============================================================================

export async function scrapeAllSources(
  opts: { deep?: boolean } = {},
): Promise<ScrapeResult[]> {
  return Promise.all([
    scrapeFrenchBreaches(opts).catch(
      (e): ScrapeResult => ({
        source: "FRENCHBREACHES",
        ok: false,
        count: 0,
        errors: [String(e?.message ?? e)],
        items: [],
      }),
    ),
    scrapeBonjourLaFuite(opts).catch(
      (e): ScrapeResult => ({
        source: "BONJOURLAFUITE",
        ok: false,
        count: 0,
        errors: [String(e?.message ?? e)],
        items: [],
      }),
    ),
    // FUITESINFOS retiré (cf. note plus haut)
  ]);
}

// =============================================================================
// DEBUG : retourne le HTML brut récupéré pour calibration
// =============================================================================

export async function debugFetchAll(): Promise<
  {
    source: string;
    url: string;
    ok: boolean;
    status?: number;
    bytes: number;
    error?: string;
    bodyExcerpt: string;
  }[]
> {
  const sources = [
    {
      label: "FRENCHBREACHES",
      urls: [
        "https://frenchbreaches.com/feed.xml",
        "https://frenchbreaches.com/blog/feed",
        "https://frenchbreaches.com/blog/categorie/fuites-de-donnees",
        "https://frenchbreaches.com/archives.php",
        "https://frenchbreaches.com/",
      ],
    },
    {
      label: "BONJOURLAFUITE",
      urls: [
        "https://bonjourlafuite.eu.org/feed.xml",
        "https://bonjourlafuite.eu.org/atom.xml",
        "https://bonjourlafuite.eu.org/index.xml",
        "https://bonjourlafuite.eu.org/",
      ],
    },
    // FUITESINFOS retiré du diagnostic (source non scrapée)
  ];

  const out: ReturnType<typeof debugFetchAll> extends Promise<infer T>
    ? T
    : never = [];
  // Mode "verbose" : on teste TOUTES les URLs candidates de chaque source
  // pour pouvoir comparer ce que chacune retourne et identifier la bonne.
  for (const s of sources) {
    for (const url of s.urls) {
      const fr = await fetchText(url);
      out.push({
        source: s.label,
        url,
        ok: fr.ok,
        status: fr.status,
        bytes: fr.bytes,
        error: fr.error,
        bodyExcerpt: fr.body.slice(0, 2000),
      });
    }
  }
  return out;
}
