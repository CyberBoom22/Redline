import { EngineId, PartCategory } from '../../src/types';

export type VendorId = 'ecs' | 'fcp' | 'z1';

/** A single page we intend to fetch, tracked across runs. */
export interface QueueEntry {
  url: string;
  vendorId: VendorId;
  kind: 'listing' | 'product';
  /** Listing page that introduced this URL, for provenance. */
  discoveredFrom?: string;
  discoveredAt: string;
  lastFetchedAt?: string;
  /** HTTP validators so refreshes can be conditional requests. */
  etag?: string;
  lastModified?: string;
  /** Consecutive failures; entries are dropped after too many. */
  failures: number;
  /** Set when a product 404s or leaves the catalog. */
  goneAt?: string;
}

export interface VendorSelectors {
  /** Anchors on a listing page that point at product detail pages. */
  productLink: string;
  /** Anchor for the "next page" of a paginated listing. */
  nextPage?: string;
  /** Fallbacks used only when structured data is absent. */
  name?: string;
  price?: string;
  brand?: string;
  sku?: string;
  availability?: string;
  image?: string;
  description?: string;
  fitment?: string;
}

export interface VendorConfig {
  id: VendorId;
  name: string;
  origin: string;
  enabled: boolean;
  /** Share of the global daily budget, 0..1. Shares across vendors must sum to <= 1. */
  budgetShare: number;
  /** Fraction of this vendor's budget spent walking listing pages vs. refreshing products. */
  discoveryShare: number;
  /** Floor between requests, in ms. robots.txt Crawl-delay overrides this when larger. */
  minDelayMs: number;
  /** Listing pages to walk for product discovery. */
  seeds: { url: string; label: string; engineHint?: EngineId[] }[];
  /** A URL must match this to be enqueued as a product page. */
  productUrlPattern: string;
  selectors: VendorSelectors;
}

export interface PricePoint {
  date: string;
  price: number;
}

/** One product as scraped from one vendor. */
export interface CatalogPart {
  /** Stable across runs: `${vendorId}:${sku ?? urlSlug}`. */
  id: string;
  vendorId: VendorId;
  vendorName: string;
  url: string;
  name: string;
  brand: string | null;
  sku: string | null;
  mpn: string | null;
  price: number | null;
  currency: string;
  availability: string | null;
  imageUrl: string | null;
  description: string | null;
  vendorCategory: string | null;
  /** Best-effort map onto Redline's own taxonomy. */
  category: PartCategory | null;
  /** Engines this part appears to fit, derived from page text. */
  engineIds: EngineId[];
  fitmentText: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  lastChangedAt: string;
  priceHistory: PricePoint[];
  /** Which extraction strategy produced this record. */
  extractedVia: 'json-ld' | 'microdata' | 'og' | 'selector';
}

export interface BudgetLedger {
  /** UTC date, YYYY-MM-DD. Rolls over automatically. */
  date: string;
  limit: number;
  used: number;
  byVendor: Record<string, number>;
  /** Requests that returned 304 — cheap for the vendor, still counted. */
  notModified: number;
}

export interface ScrapeState {
  version: 1;
  queue: QueueEntry[];
  /** Per-vendor robots.txt cache, refetched once per run day. */
  robots: Record<string, { fetchedAt: string; body: string; crawlDelayMs: number | null }>;
  lastRunAt?: string;
  runs: RunSummary[];
}

export interface RunSummary {
  startedAt: string;
  finishedAt: string;
  requests: number;
  discovered: number;
  updated: number;
  unchanged: number;
  errors: number;
  stoppedReason: 'budget' | 'queue-empty' | 'blocked' | 'error';
}
