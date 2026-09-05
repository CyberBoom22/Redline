import { Budget, BudgetExhaustedError } from './budget';
import { RobotsRules, isAllowed, parseRobots } from './robots';
import { QueueEntry, VendorConfig } from './types';

export const USER_AGENT =
  'RedlineCatalogBot/1.0 (+https://github.com/CyberBoom22/Redline; daily parts-catalog sync; contact via repo issues)';

export interface FetchOutcome {
  status: number;
  /** Absent on 304 — the cached copy is still current. */
  body?: string;
  etag?: string;
  lastModified?: string;
  finalUrl: string;
}

export class BlockedError extends Error {
  constructor(readonly host: string, readonly status: number, readonly retryAfterMs: number | null) {
    super(`${host} returned ${status}${retryAfterMs ? ` (Retry-After ${Math.round(retryAfterMs / 1000)}s)` : ''}`);
    this.name = 'BlockedError';
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One polite HTTP client per vendor. It serialises requests, honours the
 * crawl delay, sends conditional headers, and books every attempt against the
 * daily budget before it leaves the process.
 */
export class PoliteClient {
  private robots: RobotsRules | null = null;
  private lastRequestAt = 0;
  private crawlDelayMs: number;

  constructor(
    private readonly vendor: VendorConfig,
    private readonly budget: Budget,
    private readonly log: (msg: string) => void,
  ) {
    this.crawlDelayMs = vendor.minDelayMs;
  }

  get delayMs(): number {
    return this.crawlDelayMs;
  }

  /**
   * Fetch and apply robots.txt. Costs one request. Returns false when the site
   * is unreachable or errored, in which case the vendor is skipped for this run
   * rather than crawled blind.
   */
  async loadRobots(): Promise<boolean> {
    const url = new URL('/robots.txt', this.vendor.origin).toString();
    try {
      const res = await this.request(url);
      if (res.status === 404) {
        this.log(`[${this.vendor.id}] no robots.txt (404) — no published restrictions`);
        this.robots = { allow: [], disallow: [], crawlDelayMs: null, sitemaps: [] };
        return true;
      }
      if (res.status !== 200 || !res.body) {
        this.log(`[${this.vendor.id}] robots.txt returned ${res.status} — skipping vendor this run`);
        return false;
      }
      this.robots = parseRobots(res.body, USER_AGENT);
      if (this.robots.crawlDelayMs !== null) {
        // Always take the slower of our floor and what the site asks for.
        this.crawlDelayMs = Math.max(this.crawlDelayMs, this.robots.crawlDelayMs);
        this.log(`[${this.vendor.id}] robots.txt Crawl-delay ${this.robots.crawlDelayMs / 1000}s`);
      }
      return true;
    } catch (err) {
      if (err instanceof BudgetExhaustedError) throw err;
      this.log(`[${this.vendor.id}] robots.txt fetch failed (${(err as Error).message}) — skipping vendor`);
      return false;
    }
  }

  allows(url: string): boolean {
    if (!this.robots) return false;
    return isAllowed(this.robots, url);
  }

  /** Fetch a queue entry, sending validators so unchanged pages come back 304. */
  async fetchEntry(entry: QueueEntry): Promise<FetchOutcome> {
    const headers: Record<string, string> = {};
    if (entry.etag) headers['If-None-Match'] = entry.etag;
    if (entry.lastModified) headers['If-Modified-Since'] = entry.lastModified;
    return this.request(entry.url, headers);
  }

  private async request(url: string, extraHeaders: Record<string, string> = {}): Promise<FetchOutcome> {
    // Budget is booked before the wait so a cap stops us without burning time.
    this.budget.spend(this.vendor.id);

    const since = Date.now() - this.lastRequestAt;
    if (this.lastRequestAt && since < this.crawlDelayMs) {
      await sleep(this.crawlDelayMs - since);
    }
    this.lastRequestAt = Date.now();

    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        ...extraHeaders,
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
    });

    // A 429 or 503 is the site telling us to stop. We stop — for the whole run.
    if (res.status === 429 || res.status === 503) {
      const retryAfter = res.headers.get('retry-after');
      const retryAfterMs = retryAfter ? parseRetryAfter(retryAfter) : null;
      throw new BlockedError(new URL(url).host, res.status, retryAfterMs);
    }

    if (res.status === 304) {
      this.budget.recordNotModified();
      return { status: 304, finalUrl: res.url || url };
    }

    const body = res.status === 200 ? await res.text() : undefined;
    return {
      status: res.status,
      body,
      etag: res.headers.get('etag') ?? undefined,
      lastModified: res.headers.get('last-modified') ?? undefined,
      finalUrl: res.url || url,
    };
  }
}

function parseRetryAfter(value: string): number | null {
  const seconds = Number.parseInt(value, 10);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
}
