# Parts catalog scraper

Collects parts data — price, stock, brand, fitment — from three retailers, on a
daily schedule, inside a hard cap of **100 requests per day across all sites**.

| Vendor | Site | Covers | Daily budget |
| --- | --- | --- | --- |
| `ecs` | ecstuning.com | B58 Gen 1 & Gen 2 | 34 |
| `fcp` | fcpeuro.com | B58 Gen 1 & Gen 2 | 33 |
| `z1` | z1motorsports.com | VQ37VHR, VR30DDTT | 33 |

ECS Tuning and FCP Euro are European-only retailers and carry no Infiniti or
Nissan parts, so VQ/VR coverage comes from Z1 Motorsports, the main specialist
for those platforms.

## Commands

```bash
npm run scrape            # fetch what is due, within today's remaining budget
npm run scrape:report     # what the last scan added, changed and removed
npm run scrape:plan       # show what the next run would fetch — spends nothing
npm run scrape:status     # budget, coverage, and what is queued for tomorrow
npm run scrape:verify     # check seed URLs and selectors against the live sites
npm run scrape:emit       # regenerate src/data/scrapedCatalog.ts from stored data
npm run scrape:test       # offline self-test of the parsing and budget logic
npm run scrape:e2e        # full run loop against a local fixture server
npm run scrape:push       # send the latest report to the dashboard database
```

`npm run scrape -- run --only=z1 --limit=10` restricts a run to one vendor and
caps it below the daily allowance.

## Run this first

Storefront URLs and CSS class names change without notice, and the seeds in
`config.ts` are starting points rather than verified constants. Before the first
real run:

```bash
npm run scrape:verify
```

It spends a handful of requests and reports, per seed, whether robots.txt allows
it, whether it returns 200, and how many product links the selector finds. Fix
anything reporting `0 product links` or a non-200 status in `config.ts`, then
run the scrape. Extraction prefers JSON-LD, which all three storefronts publish
for SEO, so the CSS selectors only matter as a fallback.

## How the budget is spent

`DAILY_REQUEST_LIMIT = 100` in `budget.ts` is the only place the cap is defined,
and it is enforced in the HTTP client — every request is booked against the
ledger *before* it is sent, so no code path can overspend. The ledger lives in
`data/catalog/budget.json`, rolls over on the UTC date, and is committed back to
the repo, so a manual run and the scheduled run share one allowance instead of
each getting a fresh 100.

Within a vendor's share, roughly a quarter goes to walking listing pages
(finding new products) and the rest to refreshing product pages. One request per
vendor per run goes to `robots.txt`.

Requests are serialised with a minimum 8-second gap, or the site's own
`Crawl-delay` if it asks for more — so a full 100-request day takes about
15 minutes and never puts more than one connection on a site at a time.

## How it avoids re-fetching what it already has

Everything is tracked in `data/catalog/state.json`, which is committed after
each run. Three mechanisms keep the budget going to new information:

1. **A URL is queued once.** `Store.enqueue` refuses a URL already in the queue,
   so a product linked from four different listing pages is still fetched once.

2. **A page is invisible until it is due.** After a fetch, a product page is not
   eligible again for 7 days and a listing page for 3 (`REFRESH_INTERVAL_DAYS`).
   A run with budget to spare moves on to pages it has never seen rather than
   re-downloading data it already holds.

3. **Work is drawn oldest-first.** Never-fetched entries sort ahead of
   least-recently-fetched ones. When the budget runs out mid-pass — which it
   will, on the first few days — the unreached entries simply stay oldest, so
   the next day resumes exactly where this one stopped. Nothing restarts from
   the top, and nothing gets fetched twice while something else waits.

On top of that, every refresh is a **conditional request**: stored `ETag` and
`Last-Modified` values go out as `If-None-Match` / `If-Modified-Since`, so an
unchanged page comes back as a 304 with no body. And a SHA-1 content hash means
a product is only rewritten — and its price history only appended to — when
something actually changed.

`npm run scrape:status` prints all of this: how many products are held, how many
pages are due next run, how many are current and will *not* be re-requested, and
the date the next ones come up.

### First few days

The queue starts as 10 seed listing pages and grows as products are discovered.
Expect roughly:

- **Day 1** — listing pages walked, a few hundred product URLs queued, ~90 of
  them fetched.
- **Days 2–5** — the backlog of never-fetched products drains, oldest first.
- **Steady state** — most days are cheap: only pages past their refresh interval
  are due, and many of those return 304.

## The daily change report

Every run writes `data/catalog/runs/<runId>.json` describing exactly what it
did: pages scanned, products added, products changed **field by field**
(`price: 329.99 → 299.99`), products removed when their page 404s, and any
errors. `data/catalog/runs/index.json` keeps a rolling 90-run summary.

```bash
npm run scrape:report               # the latest scan, formatted for reading
npm run scrape:report -- --list     # one line per scan, newest first
npm run scrape:report -- --json     # the raw object, for a database or an email
npm run scrape:report -- --run=2026-09-06T0800
```

The report shape (`RunReport` in `types.ts`) is deliberately storage-agnostic —
the same object is what gets printed in CI logs, committed to the repo, and
pushed to a database or mailed out once a backend is wired up. Nothing about it
assumes where it ends up.

## Dashboard

`npm run scrape:push` posts the latest report — and the catalog snapshot — to
the Cloudflare Worker in `worker/`, which stores it in D1 and serves a private
dashboard behind Cloudflare Access. The daily workflow runs this automatically
once `REDLINE_DASHBOARD_URL` and `REDLINE_INGEST_SECRET` are configured, and
skips it silently when they are not. Setup lives in `worker/README.md`.

CI holds only a single-purpose ingest secret, not a Cloudflare API token — the
Worker owns the database, and the scraper only speaks HTTP to it.

## Being a good citizen

- `robots.txt` is fetched and obeyed per run; a disallowed URL is dropped from
  the queue, not just skipped.
- If `robots.txt` is unreachable or returns a 5xx, the vendor is skipped
  entirely for that run rather than crawled blind.
- A `429` or `503` ends that vendor's run immediately, honouring `Retry-After`.
- The User-Agent identifies the bot and links back to this repository.
- One connection at a time, per site, with the crawl delay above.

There is no anti-bot evasion here — no headless browser, no proxy rotation, no
UA spoofing. If a site starts blocking the scraper, that is a decision to
respect, and the answer is to ask the vendor about API or affiliate feed access,
not to work around it. Check each retailer's terms before running this against
them; scraped pricing is used here as reference data, not republished as your
own catalog.

## Output

- `data/catalog/parts.json` — the full scraped record, including price history.
- `data/catalog/state.json` — queue, fetch timestamps, ETags, run history.
- `data/catalog/budget.json` — today's ledger.
- `data/catalog/runs/*.json` — per-run change reports, plus `index.json`.
- `src/data/scrapedCatalog.ts` — generated module the app imports.

Scraped data covers only what a storefront publishes. The editorial fields in
`Part` — `whpGain`, `verdict`, `estLaborCost`, `careInstructions` — are
judgement calls a scraper cannot make, so the catalog is a **separate dataset**
that the curated `ALL_PARTS` can reference by SKU. It never overwrites
`src/data/parts.ts`.

```ts
import { getCatalogForEngine, getListingsForSku } from './data/scrapedCatalog';

const listings = getCatalogForEngine('b58_gen2');      // everything that fits
const prices = getListingsForSku('FTP-B58-CP');        // live price for a curated part
```

## When it breaks

The usual failure is a storefront redesign. Symptoms and fixes:

| Symptom | Cause | Fix |
| --- | --- | --- |
| `WARNING: no product links matched` | listing markup changed | update `selectors.productLink` / `productUrlPattern` |
| `could not extract a product` | JSON-LD dropped and selectors stale | update `selectors` for that vendor |
| `robots.txt returned 5xx — skipping vendor` | site trouble | none; it retries tomorrow |
| `429 … backing off` | rate limited | raise `minDelayMs`, lower `budgetShare` |

`npm run scrape:verify` reproduces the first two without waiting for a run.

## Schedule

`.github/workflows/scrape-catalog.yml` runs the scan at **3:00 a.m. Eastern,
daily**. Cron is UTC-only and does not follow daylight saving, so the workflow
registers both 07:00 and 08:00 UTC and a `gate` job drops whichever one is not
03:00 in `America/New_York` that day. Manual runs via *Run workflow* are never
gated.

GitHub only honours `schedule:` triggers on a repository's **default branch** —
the workflow has to be merged to `main` before anything fires.

## Tests

`npm run scrape:test` covers the robots matcher, the extraction fallback chain,
the budget cap and the de-duplication rules against fixtures — no network.

`npm run scrape:e2e` runs the real loop over HTTP against a local fixture
server: it asserts that disallowed and off-pattern links are never fetched,
that a second run the same day re-requests nothing, and that a price change and
a 404'd product show up correctly in the report. Both run in CI before each
scrape.
