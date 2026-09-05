/**
 * End-to-end test against a local fixture server.
 *
 * The unit self-test covers the pieces in isolation; this drives the real run
 * loop — robots.txt, discovery, extraction, budget, de-duplication and the
 * change report — over HTTP, against pages we control. It never touches a
 * real vendor and never writes to the committed catalog.
 */
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'redline-e2e-'));
process.env.REDLINE_DATA_DIR = dataDir;

// Imported after REDLINE_DATA_DIR is set, so the modules pick it up.
const { VENDORS } = await import('./config');
const { run } = await import('./run');
const { readReport, formatReport } = await import('./report');
const { Store } = await import('./state');

// ── fixture site ────────────────────────────────────────────────────────────

let price = 329.99;
let secondProductExists = true;

const productPage = (name: string, sku: string, value: number, fitment: string) => `<!doctype html>
<html><head><script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product","name":${JSON.stringify(name)},
 "sku":${JSON.stringify(sku)},"brand":{"@type":"Brand","name":"FTP Motorsport"},
 "description":${JSON.stringify(fitment)},
 "offers":{"@type":"Offer","price":"${value}","priceCurrency":"USD",
           "availability":"https://schema.org/InStock"}}
</script></head><body></body></html>`;

const server = http.createServer((req, res) => {
  const url = req.url ?? '/';

  if (url === '/robots.txt') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('User-agent: *\nDisallow: /checkout\nCrawl-delay: 0\n');
    return;
  }

  if (url === '/catalog/b58') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(`<html><body>
      <a class="product-name" href="/product/charge-pipe">Charge pipe</a>
      <a class="product-name" href="/product/charge-pipe#reviews">dupe</a>
      ${secondProductExists ? '<a class="product-name" href="/product/downpipe">Downpipe</a>' : ''}
      <a class="product-name" href="/checkout/cart">disallowed</a>
      <a class="product-name" href="/blog/guide">not a product</a>
    </body></html>`);
    return;
  }

  if (url === '/product/charge-pipe') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(productPage('FTP B58 Charge Pipe', 'FTP-CP-01', price, 'Fits BMW G20 M340i B58 engines.'));
    return;
  }

  if (url === '/product/downpipe') {
    if (!secondProductExists) {
      res.writeHead(404).end('gone');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(productPage('FTP B58 Downpipe', 'FTP-DP-01', 899, 'Catless downpipe for F30 340i B58.'));
    return;
  }

  res.writeHead(404).end('not found');
});

await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

// Point a single vendor at the fixture and disable the rest.
for (const vendor of VENDORS) vendor.enabled = false;
const fixture = VENDORS[0];
fixture.enabled = true;
fixture.origin = origin;
fixture.minDelayMs = 0;
fixture.seeds = [{ url: `${origin}/catalog/b58`, label: 'fixture B58 listing' }];
fixture.productUrlPattern = `^${origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/product/[^/]+$`;
fixture.selectors = { ...fixture.selectors, productLink: 'a.product-name' };

const silent = () => {};
let failures = 0;
const expect = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FAIL  ${name}\n      ${(err as Error).message}`);
    failures += 1;
  }
};

try {
  // ── run 1: cold start ─────────────────────────────────────────────────────
  await run({ log: silent });
  const first = await readReport();
  assert.ok(first, 'the first run must write a report');

  expect('run 1: both products discovered and scanned', () => {
    assert.equal(first.added.length, 2);
    assert.equal(first.scanned, 2);
    assert.deepEqual(
      first.added.map((a) => a.sku).sort(),
      ['FTP-CP-01', 'FTP-DP-01'],
    );
  });

  expect('run 1: robots.txt and the URL pattern filtered the rest', () => {
    // 1 robots + 1 listing + 2 products = 4. The /checkout and /blog links
    // must never have been fetched.
    assert.equal(first.requests, 4, `expected 4 requests, got ${first.requests}`);
  });

  expect('run 1: fitment was derived from page text', () => {
    const chargePipe = first.added.find((a) => a.sku === 'FTP-CP-01');
    const downpipe = first.added.find((a) => a.sku === 'FTP-DP-01');
    assert.deepEqual(chargePipe?.engineIds, ['b58_gen2']);
    assert.deepEqual(downpipe?.engineIds, ['b58_gen1']);
  });

  // ── run 2: same day, nothing due ──────────────────────────────────────────
  const before = first.requests;
  await run({ log: silent });
  const second = await readReport();

  expect('run 2: nothing is re-requested while it is still current', () => {
    assert.equal(second?.requests, before + 1, 'only robots.txt should be re-fetched');
    assert.equal(second?.scanned, 0);
    assert.equal(second?.added.length, 0);
  });

  // ── run 3: a price moves and a product disappears ─────────────────────────
  price = 299.99;
  secondProductExists = false;

  // Fast-forward past the refresh intervals.
  const store = await Store.load(dataDir);
  const past = new Date(Date.now() - 30 * 86_400_000).toISOString();
  for (const entry of store.queue) entry.lastFetchedAt = past;
  await store.save();
  await fs.rm(path.join(dataDir, 'budget.json'), { force: true }); // a new day

  await run({ log: silent });
  const third = await readReport();

  expect('run 3: the price change is reported field by field', () => {
    assert.equal(third?.changed.length, 1);
    assert.deepEqual(third?.changed[0].fields, [{ field: 'price', from: 329.99, to: 299.99 }]);
  });

  expect('run 3: a 404 product is reported as removed', () => {
    assert.equal(third?.removed.length, 1);
    assert.equal(third?.removed[0].sku, 'FTP-DP-01');
  });

  expect('run 3: the report renders without throwing', () => {
    const text = formatReport(third!);
    assert.match(text, /Changed \(1\)/);
    assert.match(text, /price: 329\.99 → 299\.99/);
    assert.match(text, /Removed \(1\)/);
  });

  console.log(`\n${failures === 0 ? 'e2e passed' : `${failures} e2e check(s) failed`}`);
  if (failures > 0) process.exitCode = 1;
} finally {
  server.close();
  await fs.rm(dataDir, { recursive: true, force: true });
}
