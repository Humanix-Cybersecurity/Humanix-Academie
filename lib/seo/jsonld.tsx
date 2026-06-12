// SPDX-License-Identifier: AGPL-3.0-or-later
// Helpers JSON-LD pour le SEO. Schema.org markup -> rich snippets Google
// (FAQ, BreadcrumbList, Product, SoftwareApplication, Article, WebSite).
//
// Pourquoi : Google fait du *visual ranking* depuis 2020 (Core Web Vitals +
// rich snippets). Sans markup structure, on perd les FAQ accordions, les
// breadcrumbs dans la SERP, les badges "logiciel" -> on existe mais on
// n'attire pas le clic. Les concurrents (KnowBe4, Hoxhunt) marquent
// abondamment leurs pages.
//
// Pattern : chaque helper retourne un <script type="application/ld+json">
// qu'on injecte directement en JSX dans les pages. Aucun client JS requis.
// Le contenu est serialise au render et expedie dans le HTML initial.

import type { ReactElement } from "react";

const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://humanix-cybersecurity.fr";

function absUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function ldScript(data: unknown): ReactElement {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ============================================================================
// WebSite - apparait sous le knowledge panel + active SearchAction sitelinks
// ============================================================================

export function WebSiteJsonLd(): ReactElement {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Humanix Académie",
    alternateName: ["Humanix Cybersecurity", "Humanix Academie"],
    url: SITE_URL,
    inLanguage: "fr-FR",
    publisher: {
      "@type": "Organization",
      name: "Humanix Cybersecurity",
      url: SITE_URL,
    },
  };
  return ldScript(data);
}

// ============================================================================
// SoftwareApplication - la plateforme elle-meme (pour /tarifs et /demo).
// Active le badge "Logiciel" dans la SERP + la note moyenne si on en publie.
// ============================================================================

export type SoftwareAppProps = {
  name?: string;
  description?: string;
  url?: string;
  applicationCategory?: string;
  operatingSystem?: string;
  offers?: Array<{
    name: string;
    priceCurrency: string;
    price: string | number;
    priceSpecification?: {
      priceCurrency: string;
      price: string | number;
      billingDuration?: "P1M" | "P1Y";
      billingIncrement?: number;
      unitText?: string;
    };
    description?: string;
    availability?: string;
    url?: string;
  }>;
  aggregateRating?: { ratingValue: number; reviewCount: number };
};

export function SoftwareApplicationJsonLd(
  props: SoftwareAppProps = {},
): ReactElement {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: props.name ?? "Humanix Académie",
    description:
      props.description ??
      "Plateforme française open source de sensibilisation cybersécurité. Modules de 5 minutes, phishing simulé, conformité RGPD/NIS2. Hébergement souverain France.",
    url: absUrl(props.url ?? "/tarifs"),
    applicationCategory:
      props.applicationCategory ?? "SecurityApplication",
    operatingSystem: props.operatingSystem ?? "Web",
    inLanguage: "fr-FR",
    isAccessibleForFree: true,
    softwareHelp: { "@type": "CreativeWork", url: absUrl("/contact") },
    offers: props.offers?.map((o) => ({
      "@type": "Offer",
      name: o.name,
      priceCurrency: o.priceCurrency,
      price: String(o.price),
      availability: o.availability ?? "https://schema.org/InStock",
      url: o.url ? absUrl(o.url) : absUrl("/tarifs"),
      ...(o.description ? { description: o.description } : {}),
    })),
    publisher: {
      "@type": "Organization",
      name: "Humanix Cybersecurity",
      url: SITE_URL,
    },
    ...(props.aggregateRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: props.aggregateRating.ratingValue,
            reviewCount: props.aggregateRating.reviewCount,
          },
        }
      : {}),
  };
  return ldScript(data);
}

// ============================================================================
// FAQPage - accordeon FAQ visible directement dans la SERP. Pousser les
// reponses canoniques aux questions de l'audience pour capter les longs tails.
// ============================================================================

export type FaqItem = { question: string; answer: string };

export function FaqJsonLd({ items }: { items: FaqItem[] }): ReactElement {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
  return ldScript(data);
}

// ============================================================================
// BreadcrumbList - affiche le fil d'Ariane sous le titre dans la SERP a la
// place de l'URL brute. Effet visuel : on ressemble a un site structure.
// ============================================================================

export type BreadcrumbItem = { name: string; path: string };

export function BreadcrumbJsonLd({
  items,
}: {
  items: BreadcrumbItem[];
}): ReactElement {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: absUrl(it.path),
    })),
  };
  return ldScript(data);
}

// ============================================================================
// Article - pour les anecdotes hebdo et autres contenus editoriaux.
// ============================================================================

export type ArticleProps = {
  headline: string;
  description: string;
  url: string;
  datePublished: string; // ISO
  dateModified?: string;
  image?: string;
  author?: { name: string; url?: string };
  section?: string;
};

export function ArticleJsonLd(props: ArticleProps): ReactElement {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: props.headline,
    description: props.description,
    url: absUrl(props.url),
    datePublished: props.datePublished,
    dateModified: props.dateModified ?? props.datePublished,
    inLanguage: "fr-FR",
    image: props.image ? [absUrl(props.image)] : undefined,
    author: props.author
      ? {
          "@type": "Person",
          name: props.author.name,
          ...(props.author.url ? { url: props.author.url } : {}),
        }
      : { "@type": "Organization", name: "Humanix Académie" },
    publisher: {
      "@type": "Organization",
      name: "Humanix Académie",
      logo: {
        "@type": "ImageObject",
        url: absUrl("/logo-humanix-academie-512.png"),
      },
    },
    ...(props.section ? { articleSection: props.section } : {}),
  };
  return ldScript(data);
}

// ============================================================================
// Service - pour /securite, /audit-flash, /urgence-cyber. Active le badge
// "Service" et permet de declarer le type d'offre (Bxbe, particuliers...).
// ============================================================================

export type ServiceProps = {
  name: string;
  description: string;
  url: string;
  serviceType?: string;
  areaServed?: string;
  offers?: { price?: string; priceCurrency?: string; description?: string };
};

export function ServiceJsonLd(props: ServiceProps): ReactElement {
  const data = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: props.name,
    description: props.description,
    url: absUrl(props.url),
    serviceType: props.serviceType ?? "Cybersecurity awareness training",
    areaServed: props.areaServed ?? "FR",
    provider: {
      "@type": "Organization",
      name: "Humanix Cybersecurity",
      url: SITE_URL,
    },
    inLanguage: "fr-FR",
    ...(props.offers
      ? {
          offers: {
            "@type": "Offer",
            price: props.offers.price ?? "0",
            priceCurrency: props.offers.priceCurrency ?? "EUR",
            ...(props.offers.description
              ? { description: props.offers.description }
              : {}),
          },
        }
      : {}),
  };
  return ldScript(data);
}
