import { Budget, BudgetExhaustedError, DAILY_REQUEST_LIMIT } from './budget';
import { DATA_DIR, enabledVendors } from './config';
import { extractLinks, extractNextPage, extractProduct } from './extract';
import { matchCategory, matchEngines } from './fitment';
import { BlockedError, PoliteClient } from './http';
import { Store } from './state';
import { CatalogPart, QueueEntry, RunSummary, VendorConfig } from './types';

export interface RunOptions {
  /** Parse and plan without issuing any requests. */
  dryRun?: boolean;
  /** Lower the cap for a single run; never raises it above the daily limit. */
  limit?: number;
  /** Restrict the run to one vendor. */
  only?: string;
  log?: (msg: string) => void;
}

interface Counters {
  requests: number;
  discovered: number;
  updated: number;
  unchanged: number;
  errors: number;
}

export async function run(options: RunOptions = {}): Promise<RunSummary> {
  const log = options.log ?? ((msg: string) => console.log(msg));
  const startedAt = new Date().toISOString();

  const vendors = enabledVendors().filter((v) => !options.only || v.id === options.only);
  if (vendors.length === 0) throw new Error(`No enabled vendor matches "${options.only}"`);

  const perVendorLimit = Object.fromEntries(
    vendors.map((v) => [v.id, Math.floor(v.budgetShare * DAILY_REQUEST_LIMIT)]),
  );

  const budget = await Budget.load(DATA_DIR, perVendorLimit);
  const store = await Store.load(DATA_DIR);

  const runCap = Math.min(options.limit ?? DAILY_REQUEST_LIMIT, budget.remaining);
  log(
    `Budget: ${budget.used}/${DAILY_REQUEST_LIMIT} spent today, ${budget.remaining} left` +
      (options.limit ? ` (this run capped at ${runCap})` : ''),
  );

  const counters: Counters = { requests: 0, discovered: 0, updated: 0, unchanged: 0, errors: 0 };
  let stoppedReason: RunSummary['stoppedReason'] = 'queue-empty';

  // Seeds are queued regardless of budget so a dry run still shows the plan.
  for (const vendor of vendors) seedListings(store, vendor, log);

  if (options.dryRun) {
    reportPlan(store, vendors, perVendorLimit, log);
    await store.save();
    return finish(store, startedAt, counters, 'queue-empty');
  }

  if (budget.remaining <= 0) {
    log('Daily budget already spent — nothing to do until tomorrow.');
    return finish(store, startedAt, counters, 'budget');
  }

  for (const vendor of vendors) {
    const spentBefore = budget.used;
    if (budget.remainingFor(vendor.id) <= 0) {
      log(`[${vendor.id}] vendor budget already spent today — skipping`);
      continue;
    }

    const client = new PoliteClient(vendor, budget, log);

    try {
      // One robots.txt fetch per vendor per run, charged to its budget.
      if (!(await client.loadRobots())) continue;

      const vendorCap = Math.min(budget.remainingFor(vendor.id), runCap - (budget.used - spentBefore));
      const discoveryCap = Math.max(1, Math.floor(vendorCap * vendor.discoveryShare));

      await discover(store, client, vendor, discoveryCap, counters, log);
      await refreshProducts(store, client, vendor, counters, log);
    } catch (err) {
      if (err instanceof BudgetExhaustedError) {
        log(`[${vendor.id}] ${err.message} — stopping, the queue resumes here tomorrow`);
        stoppedReason = 'budget';
        if (err.vendorId === 'global') break;
        continue;
      }
      if (err instanceof BlockedError) {
        // The site asked us to back off. Respect it and end the vendor's run.
        log(`[${vendor.id}] ${err.message} — backing off, will retry on the next daily run`);
        stoppedReason = 'blocked';
        continue;
      }
      counters.errors += 1;
      log(`[${vendor.id}] unexpected error: ${(err as Error).message}`);
      stoppedReason = 'error';
    } finally {
      counters.requests = budget.used;
      await budget.save();
      await store.save();
    }
  }

  await budget.save();
  const summary = finish(store, startedAt, counters, stoppedReason);
  await store.save();

  log(
    `Done: ${counters.requests} requests, ${counters.discovered} new URLs, ` +
      `${counters.updated} products written, ${counters.unchanged} unchanged, ${counters.errors} errors`,
  );
  reportPlan(store, vendors, perVendorLimit, log);
  return summary;
}

/** Make sure every configured seed is in the queue as a listing entry. */
function seedListings(store: Store, vendor: VendorConfig, log: (m: string) => void): void {
  for (const seed of vendor.seeds) {
    if (store.enqueue({ url: seed.url, vendorId: vendor.id, kind: 'listing' })) {
      log(`[${vendor.id}] seeded listing: ${seed.label}`);
    }
  }
}

/**
 * Walk listing pages to find product URLs. Only pages that are due get
 * fetched, and only URLs we have never seen get queued.
 */
async function discover(
  store: Store,
  client: PoliteClient,
  vendor: VendorConfig,
  cap: number,
  counters: Counters,
  log: (m: string) => void,
): Promise<void> {
  const dueListings = store.due(vendor.id, 'listing');
  if (dueListings.length === 0) {
    log(`[${vendor.id}] no listing pages due for a re-check`);
    return;
  }

  let spent = 0;
  for (const entry of dueListings) {
    if (spent >= cap) break;
    if (!client.allows(entry.url)) {
      log(`[${vendor.id}] robots.txt disallows ${entry.url} — dropping`);
      store.markGone(entry.url);
      continue;
    }

    const res = await client.fetchEntry(entry);
    spent += 1;

    if (res.status === 304) {
      store.markFetched(entry.url);
      log(`[${vendor.id}] listing unchanged (304): ${entry.url}`);
      continue;
    }
    if (res.status === 404 || res.status === 410) {
      store.markGone(entry.url);
      log(`[${vendor.id}] listing gone (${res.status}): ${entry.url}`);
      continue;
    }
    if (res.status !== 200 || !res.body) {
      store.markFailed(entry.url);
      counters.errors += 1;
      log(`[${vendor.id}] listing returned ${res.status}: ${entry.url}`);
      continue;
    }

    store.markFetched(entry.url, { etag: res.etag, lastModified: res.lastModified });

    const links = extractLinks(res.body, res.finalUrl, vendor.selectors.productLink, vendor.productUrlPattern);
    let added = 0;
    for (const url of links) {
      if (!client.allows(url)) continue;
      if (store.enqueue({ url, vendorId: vendor.id, kind: 'product', discoveredFrom: entry.url })) added += 1;
    }
    counters.discovered += added;
    log(`[${vendor.id}] ${entry.url} → ${links.length} product links, ${added} new`);

    if (links.length === 0) {
      log(`[${vendor.id}] WARNING: no product links matched. Check selectors/productUrlPattern in config.ts.`);
    }

    // Queue the next page so pagination continues across future runs.
    const next = extractNextPage(res.body, res.finalUrl, vendor.selectors.nextPage);
    if (next && client.allows(next)) {
      if (store.enqueue({ url: next, vendorId: vendor.id, kind: 'listing', discoveredFrom: entry.url })) {
        log(`[${vendor.id}] queued next listing page: ${next}`);
      }
    }
  }
}

/** Spend whatever budget is left on the least-recently-fetched product pages. */
async function refreshProducts(
  store: Store,
  client: PoliteClient,
  vendor: VendorConfig,
  counters: Counters,
  log: (m: string) => void,
): Promise<void> {
  const dueProducts = store.due(vendor.id, 'product');
  if (dueProducts.length === 0) {
    log(`[${vendor.id}] no product pages due — catalog is current`);
    return;
  }

  // The budget is enforced inside the client, which throws once the cap is
  // reached; whatever is left unfetched stays at the front of the rotation.
  log(`[${vendor.id}] ${dueProducts.length} product page(s) due for refresh`);

  for (const entry of dueProducts) {
    const res = await client.fetchEntry(entry);

    if (res.status === 304) {
      store.markFetched(entry.url);
      store.touchByUrl(entry.url);
      counters.unchanged += 1;
      continue;
    }
    if (res.status === 404 || res.status === 410) {
      store.markGone(entry.url);
      log(`[${vendor.id}] product gone (${res.status}): ${entry.url}`);
      continue;
    }
    if (res.status !== 200 || !res.body) {
      store.markFailed(entry.url);
      counters.errors += 1;
      continue;
    }

    store.markFetched(entry.url, { etag: res.etag, lastModified: res.lastModified });

    const raw = extractProduct(res.body, vendor.selectors);
    if (!raw) {
      counters.errors += 1;
      log(`[${vendor.id}] could not extract a product from ${entry.url}`);
      continue;
    }

    const part = toCatalogPart(raw, entry, vendor);
    const result = store.upsert(part);
    if (result === 'unchanged') counters.unchanged += 1;
    else counters.updated += 1;
  }
}

function toCatalogPart(
  raw: NonNullable<ReturnType<typeof extractProduct>>,
  entry: QueueEntry,
  vendor: VendorConfig,
): CatalogPart {
  const now = new Date().toISOString();
  const slug = new URL(entry.url).pathname.split('/').filter(Boolean).pop() ?? entry.url;
  const seedHint = vendor.seeds.find((s) => s.url === entry.discoveredFrom)?.engineHint ?? [];

  const engineIds = matchEngines(raw.name, raw.description, raw.fitmentText, raw.category, entry.url);

  return {
    id: `${vendor.id}:${raw.sku ?? slug}`,
    vendorId: vendor.id,
    vendorName: vendor.name,
    url: entry.url,
    name: raw.name as string,
    brand: raw.brand,
    sku: raw.sku,
    mpn: raw.mpn,
    price: raw.price,
    currency: raw.currency ?? 'USD',
    availability: raw.availability,
    imageUrl: raw.imageUrl,
    description: raw.description,
    vendorCategory: raw.category,
    category: matchCategory(raw.name, raw.category, raw.description),
    // Fall back to the seed's known fitment when the page text is ambiguous.
    engineIds: engineIds.length > 0 ? engineIds : seedHint,
    fitmentText: raw.fitmentText,
    firstSeenAt: now,
    lastSeenAt: now,
    lastChangedAt: now,
    priceHistory: [],
    extractedVia: raw.via,
  };
}

/** Print what today covered and what the next run will pick up. */
function reportPlan(
  store: Store,
  vendors: VendorConfig[],
  perVendorLimit: Record<string, number>,
  log: (m: string) => void,
): void {
  log('');
  log('Coverage / next run:');
  for (const vendor of vendors) {
    const held = store.allParts.filter((p) => p.vendorId === vendor.id).length;
    const dueListing = store.due(vendor.id, 'listing').length;
    const dueProduct = store.due(vendor.id, 'product').length;
    const waiting = store.notDue(vendor.id).length;
    const cap = perVendorLimit[vendor.id] ?? 0;
    const days = dueListing + dueProduct === 0 ? 0 : Math.ceil((dueListing + dueProduct) / Math.max(1, cap - 1));
    log(
      `  ${vendor.name.padEnd(16)} ${String(held).padStart(4)} products held · ` +
        `${dueListing + dueProduct} due (${dueListing} listing, ${dueProduct} product) · ` +
        `${waiting} already current · ~${days} day(s) to clear at ${cap}/day`,
    );
  }
}

function finish(store: Store, startedAt: string, counters: Counters, reason: RunSummary['stoppedReason']): RunSummary {
  const summary: RunSummary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    ...counters,
    stoppedReason: reason,
  };
  store.recordRun(summary);
  return summary;
}
