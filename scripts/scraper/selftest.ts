/**
 * Self-test for the scraper's logic, run without touching the network.
 *
 * The pieces that can silently rot are the robots.txt matcher, the extraction
 * fallback chain, the budget cap and the de-duplication rules, so those are
 * exercised here against fixtures. Live selectors are verified separately with
 * `npm run scrape:verify`, which does need network access.
 */
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Budget, BudgetExhaustedError, DAILY_REQUEST_LIMIT } from './budget';
import { extractLinks, extractNextPage, extractProduct, parsePrice } from './extract';
import { matchCategory, matchEngines } from './fitment';
import { isAllowed, parseRobots } from './robots';
import { REFRESH_INTERVAL_DAYS, Store } from './state';
import { CatalogPart } from './types';

let passed = 0;
const check = (name: string, fn: () => void | Promise<void>) => tests.push({ name, fn });
const tests: { name: string; fn: () => void | Promise<void> }[] = [];

// ── robots.txt ──────────────────────────────────────────────────────────────

check('robots: disallow blocks, longer allow wins', () => {
  const rules = parseRobots(
    ['User-agent: *', 'Disallow: /checkout', 'Disallow: /search', 'Allow: /search/parts', 'Crawl-delay: 10'].join('\n'),
    'RedlineCatalogBot/1.0',
  );
  assert.equal(rules.crawlDelayMs, 10_000);
  assert.equal(isAllowed(rules, 'https://x.test/products/abc'), true);
  assert.equal(isAllowed(rules, 'https://x.test/checkout/cart'), false);
  assert.equal(isAllowed(rules, 'https://x.test/search?q=b58'), false);
  assert.equal(isAllowed(rules, 'https://x.test/search/parts/b58'), true);
});

check('robots: a named group overrides the wildcard group', () => {
  const rules = parseRobots(
    ['User-agent: *', 'Disallow: /', '', 'User-agent: RedlineCatalogBot', 'Disallow: /admin'].join('\n'),
    'RedlineCatalogBot/1.0 (+repo)',
  );
  assert.equal(isAllowed(rules, 'https://x.test/products/abc'), true);
  assert.equal(isAllowed(rules, 'https://x.test/admin/x'), false);
});

check('robots: wildcards and end-anchors in patterns', () => {
  const rules = parseRobots(['User-agent: *', 'Disallow: /*.pdf$', 'Disallow: /a/*/b'].join('\n'), 'RedlineCatalogBot');
  assert.equal(isAllowed(rules, 'https://x.test/manual.pdf'), false);
  assert.equal(isAllowed(rules, 'https://x.test/manual.pdf?x=1'), true);
  assert.equal(isAllowed(rules, 'https://x.test/a/zzz/b'), false);
});

// ── extraction ──────────────────────────────────────────────────────────────

const JSON_LD_PAGE = `<html><head>
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[
  {"@type":"BreadcrumbList","itemListElement":[]},
  {"@type":"Product","name":"FTP Motorsport B58 Charge Pipe","sku":"FTP-B58-CP",
   "brand":{"@type":"Brand","name":"FTP Motorsport"},"mpn":"BW0012",
   "category":"Chargepipes","image":["https://x.test/a.jpg"],
   "description":"Aluminium charge pipe for BMW G20 M340i B58 engines.",
   "offers":{"@type":"Offer","price":"329.99","priceCurrency":"USD",
             "availability":"https://schema.org/InStock"}}]}
</script></head><body><h1>ignored</h1></body></html>`;

check('extract: JSON-LD Product inside @graph', () => {
  const product = extractProduct(JSON_LD_PAGE, { productLink: 'a' });
  assert.ok(product);
  assert.equal(product.name, 'FTP Motorsport B58 Charge Pipe');
  assert.equal(product.brand, 'FTP Motorsport');
  assert.equal(product.sku, 'FTP-B58-CP');
  assert.equal(product.price, 329.99);
  assert.equal(product.currency, 'USD');
  assert.equal(product.availability, 'InStock');
  assert.equal(product.imageUrl, 'https://x.test/a.jpg');
  assert.equal(product.via, 'json-ld');
});

check('extract: falls back to Open Graph when JSON-LD is absent', () => {
  const html = `<html><head>
    <meta property="og:title" content="Wagner Intercooler B58">
    <meta property="product:price:amount" content="1,249.00">
    <meta property="product:price:currency" content="USD">
    <meta property="og:image" content="https://x.test/i.jpg">
  </head><body></body></html>`;
  const product = extractProduct(html, { productLink: 'a' });
  assert.ok(product);
  assert.equal(product.name, 'Wagner Intercooler B58');
  assert.equal(product.price, 1249);
  assert.equal(product.via, 'og');
});

check('extract: falls back to CSS selectors as a last resort', () => {
  const html = `<html><body>
    <h1 class="product-name">Z1 VR30 Downpipes</h1>
    <span class="price">$1,095.00</span>
    <div class="fitment">Fits Q50 / Q60 Red Sport 400</div>
  </body></html>`;
  const product = extractProduct(html, {
    productLink: 'a',
    name: 'h1.product-name',
    price: '.price',
    fitment: '.fitment',
  });
  assert.ok(product);
  assert.equal(product.name, 'Z1 VR30 Downpipes');
  assert.equal(product.price, 1095);
  assert.match(product.fitmentText ?? '', /Red Sport/);
  assert.equal(product.via, 'selector');
});

check('extract: malformed JSON-LD does not throw', () => {
  const html = `<html><head><script type="application/ld+json">{ oops </script></head>
    <body><h1 class="n">Part</h1></body></html>`;
  const product = extractProduct(html, { productLink: 'a', name: 'h1.n' });
  assert.equal(product?.name, 'Part');
});

check('extract: product links are absolutised, filtered and de-duplicated', () => {
  const html = `<html><body>
    <a class="product-name" href="/products/charge-pipe">A</a>
    <a class="product-name" href="/products/charge-pipe#reviews">A again</a>
    <a class="product-name" href="/blog/how-to-tune">Not a product</a>
    <a class="product-name" href="https://www.fcpeuro.com/products/downpipe">B</a>
  </body></html>`;
  const links = extractLinks(html, 'https://www.fcpeuro.com/BMW-parts/G20/', 'a.product-name', '^https://www\\.fcpeuro\\.com/products/[^/]+/?$');
  assert.deepEqual(links.sort(), [
    'https://www.fcpeuro.com/products/charge-pipe',
    'https://www.fcpeuro.com/products/downpipe',
  ]);
});

check('security: non-http(s) links are never queued', () => {
  const html = `<html><body>
    <a class="product-name" href="javascript:alert(1)">xss</a>
    <a class="product-name" href="data:text/html,<script>alert(1)</script>">data</a>
    <a class="product-name" href="file:///etc/passwd">file</a>
    <a class="product-name" href="https://www.fcpeuro.com/products/ok">fine</a>
  </body></html>`;
  const links = extractLinks(html, 'https://www.fcpeuro.com/x/', 'a.product-name', '.*');
  assert.deepEqual(links, ['https://www.fcpeuro.com/products/ok']);
});

check('security: a next-page link with a non-http scheme is dropped', () => {
  const html = '<html><body><a rel="next" href="javascript:alert(1)">next</a></body></html>';
  assert.equal(extractNextPage(html, 'https://www.fcpeuro.com/x/', 'a[rel=\"next\"]'), null);
});

check('extract: price parsing strips symbols and separators', () => {
  assert.equal(parsePrice('$1,299.95'), 1299.95);
  assert.equal(parsePrice('USD 89'), 89);
  assert.equal(parsePrice('Call for pricing'), null);
});

// ── fitment ─────────────────────────────────────────────────────────────────

check('fitment: generation-specific B58 chassis map to one engine', () => {
  assert.deepEqual(matchEngines('BMW G20 M340i charge pipe'), ['b58_gen2']);
  assert.deepEqual(matchEngines('F30 340i downpipe'), ['b58_gen1']);
});

check('fitment: a bare B58 reference fits both generations', () => {
  assert.deepEqual(matchEngines('Universal B58 oil catch can').sort(), ['b58_gen1', 'b58_gen2']);
});

check('fitment: VQ and VR platforms are recognised', () => {
  assert.ok(matchEngines('Z1 370Z VQ37VHR intake').includes('vq37vhr'));
  assert.ok(matchEngines('Q50 Red Sport 400 downpipes').includes('vr30_redsport'));
  assert.ok(matchEngines('VR30DDTT intercooler').includes('vr30_luxe'));
});

check('fitment: unrelated text matches nothing', () => {
  assert.deepEqual(matchEngines('Audi B9 S4 brake pads'), []);
  assert.deepEqual(matchEngines(null, undefined, ''), []);
});

check('fitment: categories map onto the Redline taxonomy', () => {
  assert.equal(matchCategory('bootmod3 Flash Tune'), 'tune');
  assert.equal(matchCategory('Catless Downpipe'), 'downpipe');
  assert.equal(matchCategory('Wagner Competition Intercooler'), 'chargepipe_intercooler');
  assert.equal(matchCategory('Floor mats'), null);
});

// ── budget ──────────────────────────────────────────────────────────────────

check('budget: the daily cap is 100 and cannot be exceeded', async () => {
  const dir = await tmpdir();
  const budget = await Budget.load(dir, { ecs: 34, fcp: 33, z1: 33 });
  assert.equal(DAILY_REQUEST_LIMIT, 100);

  for (let i = 0; i < 34; i++) budget.spend('ecs');
  assert.throws(() => budget.spend('ecs'), BudgetExhaustedError, 'per-vendor cap should hold');

  for (let i = 0; i < 33; i++) budget.spend('fcp');
  for (let i = 0; i < 33; i++) budget.spend('z1');
  assert.equal(budget.used, 100);
  assert.equal(budget.remaining, 0);
  assert.throws(() => budget.spend('fcp'), BudgetExhaustedError, 'global cap should hold');
});

check('budget: spend survives a reload within the same day', async () => {
  const dir = await tmpdir();
  const first = await Budget.load(dir, { ecs: 34 });
  for (let i = 0; i < 10; i++) first.spend('ecs');
  await first.save();

  const second = await Budget.load(dir, { ecs: 34 });
  assert.equal(second.used, 10, 'a second run the same day must see the spend');
  assert.equal(second.remaining, 90);
});

// ── state: the no-duplicate-requests guarantees ─────────────────────────────

check('state: the same URL is never queued twice', async () => {
  const store = await Store.load(await tmpdir());
  assert.equal(store.enqueue({ url: 'https://x.test/p/1', vendorId: 'ecs', kind: 'product' }), true);
  assert.equal(store.enqueue({ url: 'https://x.test/p/1', vendorId: 'ecs', kind: 'product' }), false);
  assert.equal(store.queue.length, 1);
});

check('state: a fetched page is not due again until its interval elapses', async () => {
  const store = await Store.load(await tmpdir());
  store.enqueue({ url: 'https://x.test/p/1', vendorId: 'ecs', kind: 'product' });
  assert.equal(store.due('ecs', 'product').length, 1, 'never-fetched pages are due immediately');

  store.markFetched('https://x.test/p/1');
  assert.equal(store.due('ecs', 'product').length, 0, 'just-fetched pages must not be re-requested');
  assert.equal(store.notDue('ecs').length, 1);

  const later = new Date(Date.now() + (REFRESH_INTERVAL_DAYS.product + 1) * 86_400_000);
  assert.equal(store.due('ecs', 'product', later).length, 1, 'it becomes due again after the interval');
});

check('state: work is drawn oldest-first, so a budget stop resumes cleanly', async () => {
  const store = await Store.load(await tmpdir());
  for (const n of [1, 2, 3, 4, 5]) {
    store.enqueue({ url: `https://x.test/p/${n}`, vendorId: 'ecs', kind: 'product' });
  }
  // Simulate a run that could only afford two pages.
  const firstPass = store.due('ecs', 'product').slice(0, 2);
  for (const entry of firstPass) store.markFetched(entry.url);

  const nextPass = store.due('ecs', 'product').map((e) => e.url);
  assert.deepEqual(
    nextPass,
    ['https://x.test/p/3', 'https://x.test/p/4', 'https://x.test/p/5'],
    'the next run must continue where the last one stopped, not restart',
  );
});

check('state: upsert distinguishes new, changed and unchanged', async () => {
  const store = await Store.load(await tmpdir());
  const base: CatalogPart = {
    id: 'ecs:FTP-B58-CP',
    vendorId: 'ecs',
    vendorName: 'ECS Tuning',
    url: 'https://x.test/p/1',
    name: 'Charge Pipe',
    brand: 'FTP',
    sku: 'FTP-B58-CP',
    mpn: null,
    price: 329.99,
    currency: 'USD',
    availability: 'InStock',
    imageUrl: null,
    description: null,
    vendorCategory: null,
    category: 'chargepipe_intercooler',
    engineIds: ['b58_gen2'],
    fitmentText: null,
    firstSeenAt: '',
    lastSeenAt: '',
    lastChangedAt: '',
    priceHistory: [],
    extractedVia: 'json-ld',
  };

  assert.equal(store.upsert(base).status, 'new');
  assert.equal(store.upsert({ ...base }).status, 'unchanged', 'identical data must not count as a change');

  const priceDrop = store.upsert({ ...base, price: 299.99 });
  assert.equal(priceDrop.status, 'changed');
  assert.deepEqual(
    priceDrop.fields,
    [{ field: 'price', from: 329.99, to: 299.99 }],
    'the report needs to know which field moved, not just that one did',
  );

  const stored = store.allParts.find((p) => p.id === base.id);
  assert.equal(stored?.price, 299.99);
  assert.deepEqual(
    stored?.priceHistory.map((h) => h.price),
    [329.99, 299.99],
    'price history should record only real movements',
  );
});

check('state: queue and catalog survive a save/load round-trip', async () => {
  const dir = await tmpdir();
  const store = await Store.load(dir);
  store.enqueue({ url: 'https://x.test/p/1', vendorId: 'z1', kind: 'product' });
  store.markFetched('https://x.test/p/1', { etag: 'W/"abc"' });
  await store.save();

  const reloaded = await Store.load(dir);
  assert.equal(reloaded.queue.length, 1);
  assert.equal(reloaded.queue[0].etag, 'W/"abc"', 'the ETag must persist so the next fetch is conditional');
  assert.equal(reloaded.due('z1', 'product').length, 0, 'a reloaded run must not re-request a current page');
});

async function tmpdir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'redline-scraper-'));
}

(async () => {
  for (const test of tests) {
    try {
      await test.fn();
      passed += 1;
      console.log(`  ok  ${test.name}`);
    } catch (err) {
      console.error(`FAIL  ${test.name}`);
      console.error(`      ${(err as Error).message}`);
      process.exitCode = 1;
    }
  }
  console.log(`\n${passed}/${tests.length} passed`);
})();
