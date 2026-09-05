import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { CatalogPart, ChangeRecord, FieldChange, QueueEntry, RunSummary, ScrapeState, VendorId } from './types';

/**
 * Everything the scraper remembers between runs.
 *
 * Two guarantees drive the whole design, because the daily budget is only 100
 * requests:
 *
 *  1. No URL is fetched twice while another URL is still waiting. Work is
 *     always drawn oldest-first (never-fetched entries sort first), so a single
 *     pass across the catalog completes before any page is revisited.
 *  2. A page is only re-fetched once it is *due* — `refreshIntervalDays` after
 *     its last fetch. Until then it is invisible to the scheduler, so a run
 *     with spare budget moves on to new work instead of re-downloading pages
 *     whose data we already hold.
 *
 * When the budget runs out mid-pass, nothing is lost: the entries that were
 * not reached simply stay the oldest, so the next day resumes exactly where
 * this one stopped.
 */

/** How often each kind of page is worth re-checking. */
export const REFRESH_INTERVAL_DAYS = {
  /** Listing pages surface new products and discontinuations. */
  listing: 3,
  /** Product pages: price and stock move slowly enough that weekly is plenty. */
  product: 7,
} as const;

const MAX_FAILURES = 4;

export class Store {
  private constructor(
    private readonly dir: string,
    private state: ScrapeState,
    private parts: Map<string, CatalogPart>,
  ) {}

  static async load(dir: string): Promise<Store> {
    const state = await readJson<ScrapeState>(path.join(dir, 'state.json'), {
      version: 1,
      queue: [],
      robots: {},
      runs: [],
    });
    const parts = await readJson<CatalogPart[]>(path.join(dir, 'parts.json'), []);
    return new Store(dir, state, new Map(parts.map((p) => [p.id, p])));
  }

  get queue(): QueueEntry[] {
    return this.state.queue;
  }

  get allParts(): CatalogPart[] {
    return [...this.parts.values()];
  }

  get lastRunAt(): string | undefined {
    return this.state.lastRunAt;
  }

  get runs(): RunSummary[] {
    return this.state.runs;
  }

  /** True when this URL is already known, whatever its state. */
  knows(url: string): boolean {
    return this.state.queue.some((e) => e.url === url);
  }

  /**
   * Add a URL we have never seen. Returns false if it was already tracked —
   * this is the front-line guard against queueing the same product twice from
   * two different listing pages.
   */
  enqueue(entry: Omit<QueueEntry, 'discoveredAt' | 'failures'>): boolean {
    if (this.knows(entry.url)) return false;
    this.state.queue.push({ ...entry, discoveredAt: new Date().toISOString(), failures: 0 });
    return true;
  }

  /**
   * Work that is eligible right now: never fetched, or past its refresh
   * interval. Sorted oldest-first so the rotation is fair and resumable.
   */
  due(vendorId: VendorId, kind: QueueEntry['kind'], now = new Date()): QueueEntry[] {
    const intervalMs = REFRESH_INTERVAL_DAYS[kind] * 24 * 60 * 60 * 1000;
    return this.state.queue
      .filter((e) => e.vendorId === vendorId && e.kind === kind && !e.goneAt && e.failures < MAX_FAILURES)
      .filter((e) => !e.lastFetchedAt || now.getTime() - Date.parse(e.lastFetchedAt) >= intervalMs)
      .sort((a, b) => {
        // Never-fetched first, then least-recently-fetched.
        if (!a.lastFetchedAt && !b.lastFetchedAt) return Date.parse(a.discoveredAt) - Date.parse(b.discoveredAt);
        if (!a.lastFetchedAt) return -1;
        if (!b.lastFetchedAt) return 1;
        return Date.parse(a.lastFetchedAt) - Date.parse(b.lastFetchedAt);
      });
  }

  /** Entries not yet due — i.e. data we already hold and will not re-request. */
  notDue(vendorId?: VendorId, now = new Date()): QueueEntry[] {
    const dueUrls = new Set(
      (['listing', 'product'] as const).flatMap((kind) =>
        (vendorId ? [vendorId] : (['ecs', 'fcp', 'z1'] as VendorId[])).flatMap((v) =>
          this.due(v, kind, now).map((e) => e.url),
        ),
      ),
    );
    return this.state.queue.filter(
      (e) => !dueUrls.has(e.url) && !e.goneAt && (!vendorId || e.vendorId === vendorId),
    );
  }

  /** The date each not-yet-due entry becomes eligible again. */
  nextDueAt(entry: QueueEntry): string | null {
    if (!entry.lastFetchedAt) return null;
    const intervalMs = REFRESH_INTERVAL_DAYS[entry.kind] * 24 * 60 * 60 * 1000;
    return new Date(Date.parse(entry.lastFetchedAt) + intervalMs).toISOString();
  }

  markFetched(url: string, patch: Partial<Pick<QueueEntry, 'etag' | 'lastModified'>> = {}): void {
    const entry = this.state.queue.find((e) => e.url === url);
    if (!entry) return;
    entry.lastFetchedAt = new Date().toISOString();
    entry.failures = 0;
    if (patch.etag !== undefined) entry.etag = patch.etag;
    if (patch.lastModified !== undefined) entry.lastModified = patch.lastModified;
  }

  markFailed(url: string): void {
    const entry = this.state.queue.find((e) => e.url === url);
    if (!entry) return;
    entry.failures += 1;
    // Push it to the back of the rotation so one bad URL can't stall the queue.
    entry.lastFetchedAt = new Date().toISOString();
  }

  markGone(url: string): void {
    const entry = this.state.queue.find((e) => e.url === url);
    if (entry) entry.goneAt = new Date().toISOString();
  }

  getRobots(vendorId: VendorId) {
    return this.state.robots[vendorId];
  }

  setRobots(vendorId: VendorId, body: string, crawlDelayMs: number | null): void {
    this.state.robots[vendorId] = { fetchedAt: new Date().toISOString(), body, crawlDelayMs };
  }

  /**
   * Merge a freshly scraped product. Returns 'new', 'changed', or 'unchanged'
   * based on a content hash, so price history only grows on real movement.
   */
  upsert(part: CatalogPart): UpsertResult {
    const now = new Date().toISOString();
    const existing = this.parts.get(part.id);

    if (!existing) {
      this.parts.set(part.id, {
        ...part,
        firstSeenAt: now,
        lastSeenAt: now,
        lastChangedAt: now,
        priceHistory: part.price !== null ? [{ date: now.slice(0, 10), price: part.price }] : [],
      });
      return { status: 'new', fields: [] };
    }

    const fields = diffFields(existing, part);
    const changed = fields.length > 0;
    const priceMoved = part.price !== null && part.price !== existing.price;

    const merged: CatalogPart = {
      ...existing,
      ...part,
      firstSeenAt: existing.firstSeenAt,
      lastSeenAt: now,
      lastChangedAt: changed ? now : existing.lastChangedAt,
      priceHistory: priceMoved
        ? [...existing.priceHistory, { date: now.slice(0, 10), price: part.price as number }].slice(-60)
        : existing.priceHistory,
    };

    this.parts.set(part.id, merged);
    return { status: changed ? 'changed' : 'unchanged', fields };
  }

  /** Parts whose page has 404'd since the last report was written. */
  removedSince(iso: string): CatalogPart[] {
    const gone = new Set(
      this.state.queue.filter((e) => e.goneAt && e.goneAt > iso).map((e) => e.url),
    );
    return this.allParts.filter((p) => gone.has(p.url));
  }

  /** Total pages still waiting to be fetched, across every vendor. */
  totalQueued(now = new Date()): number {
    return (['ecs', 'fcp', 'z1'] as VendorId[]).reduce(
      (sum, vendorId) =>
        sum + this.due(vendorId, 'listing', now).length + this.due(vendorId, 'product', now).length,
      0,
    );
  }

  /** Refresh lastSeenAt without a re-parse, for 304 responses. */
  touchByUrl(url: string): void {
    for (const part of this.parts.values()) {
      if (part.url === url) part.lastSeenAt = new Date().toISOString();
    }
  }

  recordRun(summary: RunSummary): void {
    this.state.lastRunAt = summary.finishedAt;
    // Keep a month of history; enough to spot a scraper that has quietly broken.
    this.state.runs = [...this.state.runs, summary].slice(-30);
  }

  async save(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    const parts = this.allParts.sort((a, b) => a.id.localeCompare(b.id));
    await writeJson(path.join(this.dir, 'state.json'), this.state);
    await writeJson(path.join(this.dir, 'parts.json'), parts);
  }
}

export interface UpsertResult {
  status: 'new' | 'changed' | 'unchanged';
  fields: FieldChange[];
}

/** Fields worth reporting on; timestamps and bookkeeping are excluded. */
const TRACKED_FIELDS = [
  'name',
  'brand',
  'sku',
  'price',
  'availability',
  'description',
  'imageUrl',
  'category',
  'engineIds',
] as const;

/**
 * Field-level diff between the stored record and a freshly scraped one. This
 * is what makes the daily report specific — "price 329.99 -> 299.99" rather
 * than just "1 product changed".
 */
function diffFields(before: CatalogPart, after: CatalogPart): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const field of TRACKED_FIELDS) {
    const from = before[field];
    const to = after[field];
    const same = Array.isArray(from) && Array.isArray(to)
      ? JSON.stringify([...from].sort()) === JSON.stringify([...to].sort())
      : from === to;
    if (!same) changes.push({ field, from, to });
  }
  return changes;
}

/** Stable identity hash, used to spot changes without holding a full copy. */
function contentHash(part: CatalogPart): string {
  const subject = Object.fromEntries(
    TRACKED_FIELDS.map((f) => [f, Array.isArray(part[f]) ? [...(part[f] as unknown[])].sort() : part[f]]),
  );
  return createHash('sha1').update(JSON.stringify(subject)).digest('hex');
}

/** Shrink a part down to what the change report needs to show. */
export function toChangeRecord(part: CatalogPart, fields?: FieldChange[]): ChangeRecord {
  return {
    id: part.id,
    vendorId: part.vendorId,
    vendorName: part.vendorName,
    name: part.name,
    url: part.url,
    sku: part.sku,
    price: part.price,
    engineIds: part.engineIds,
    ...(fields && fields.length > 0 ? { fields } : {}),
  };
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
