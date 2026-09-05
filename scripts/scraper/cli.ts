#!/usr/bin/env node
import { Budget, DAILY_REQUEST_LIMIT } from './budget';
import { DATA_DIR, enabledVendors } from './config';
import { emit } from './emit';
import { extractLinks } from './extract';
import { BlockedError, PoliteClient } from './http';
import { run } from './run';
import { Store } from './state';

const [command = 'run', ...rest] = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const hit = rest.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : undefined;
};

async function main() {
  switch (command) {
    case 'run':
      await run({ limit: flag('limit') ? Number(flag('limit')) : undefined, only: flag('only') });
      break;
    case 'plan':
      await run({ dryRun: true, only: flag('only') });
      break;
    case 'status':
      await status();
      break;
    case 'verify':
      await verify();
      break;
    case 'emit':
      await emit(flag('out'));
      break;
    default:
      console.log(
        [
          'Usage: npm run scrape -- <command>',
          '',
          '  run [--limit=N] [--only=ecs|fcp|z1]   Fetch what is due, within the daily budget',
          '  plan [--only=…]                       Show what the next run would fetch (no requests)',
          '  status                                Budget, coverage, and what is queued for tomorrow',
          '  verify                                Check seeds and selectors against the live sites',
          '  emit [--out=path]                     Regenerate src/data/scrapedCatalog.ts',
        ].join('\n'),
      );
      process.exitCode = command === 'help' ? 0 : 1;
  }
}

/** Read-only report: what we hold, what is due, and when the rest comes up. */
async function status() {
  const vendors = enabledVendors();
  const perVendorLimit = Object.fromEntries(
    vendors.map((v) => [v.id, Math.floor(v.budgetShare * DAILY_REQUEST_LIMIT)]),
  );
  const budget = await Budget.load(DATA_DIR, perVendorLimit);
  const store = await Store.load(DATA_DIR);
  const ledger = budget.snapshot();

  console.log(`Budget for ${ledger.date}: ${ledger.used}/${ledger.limit} used, ${budget.remaining} remaining`);
  if (ledger.notModified > 0) {
    console.log(`  ${ledger.notModified} of those returned 304 Not Modified (page unchanged since last fetch)`);
  }
  console.log(`Last run: ${store.lastRunAt ?? 'never'}`);
  console.log('');

  let totalDue = 0;
  for (const vendor of vendors) {
    const held = store.allParts.filter((p) => p.vendorId === vendor.id);
    const dueListing = store.due(vendor.id, 'listing');
    const dueProduct = store.due(vendor.id, 'product');
    const waiting = store.notDue(vendor.id);
    const cap = perVendorLimit[vendor.id];
    totalDue += dueListing.length + dueProduct.length;

    console.log(`${vendor.name} (${vendor.id}) — ${cap} requests/day, ${budget.usedBy(vendor.id)} used today`);
    console.log(`  collected      ${held.length} products (${held.filter((p) => p.price !== null).length} with a price)`);
    console.log(`  due next run   ${dueListing.length} listing + ${dueProduct.length} product pages`);
    console.log(`  already current ${waiting.length} pages — these will NOT be re-requested yet`);

    const upcoming = waiting
      .map((e) => ({ url: e.url, at: store.nextDueAt(e) }))
      .filter((e): e is { url: string; at: string } => Boolean(e.at))
      .sort((a, b) => a.at.localeCompare(b.at))
      .slice(0, 3);
    for (const item of upcoming) {
      console.log(`    next due ${item.at.slice(0, 10)}  ${item.url}`);
    }
    console.log('');
  }

  const dailyCap = Object.values(perVendorLimit).reduce((a, b) => a + b, 0);
  if (totalDue > 0) {
    console.log(`${totalDue} page(s) queued overall — roughly ${Math.ceil(totalDue / dailyCap)} day(s) to work through.`);
  } else {
    console.log('Nothing is due. Every tracked page is current; the next run will be a no-op.');
  }
}

/**
 * Spends a small number of requests confirming the config is still valid:
 * robots.txt permission, seed reachability, and whether the link selector
 * actually finds products. Run this after any storefront redesign.
 */
async function verify() {
  const vendors = enabledVendors();
  const perVendorLimit = Object.fromEntries(vendors.map((v) => [v.id, Math.floor(v.budgetShare * DAILY_REQUEST_LIMIT)]));
  const budget = await Budget.load(DATA_DIR, perVendorLimit);

  for (const vendor of vendors) {
    console.log(`\n=== ${vendor.name} (${vendor.origin}) ===`);
    const client = new PoliteClient(vendor, budget, (m) => console.log(`  ${m}`));

    try {
      if (!(await client.loadRobots())) {
        console.log('  robots.txt unavailable — cannot verify this vendor');
        continue;
      }
      console.log(`  crawl delay in effect: ${client.delayMs / 1000}s`);

      for (const seed of vendor.seeds) {
        if (!client.allows(seed.url)) {
          console.log(`  DISALLOWED by robots.txt: ${seed.url}`);
          continue;
        }
        const res = await client.fetchEntry({
          url: seed.url,
          vendorId: vendor.id,
          kind: 'listing',
          discoveredAt: new Date().toISOString(),
          failures: 0,
        });
        if (res.status !== 200 || !res.body) {
          console.log(`  HTTP ${res.status}  ${seed.url}  <- fix this seed URL in config.ts`);
          continue;
        }
        const links = extractLinks(res.body, res.finalUrl, vendor.selectors.productLink, vendor.productUrlPattern);
        const verdict = links.length === 0 ? '<- fix productLink / productUrlPattern in config.ts' : 'OK';
        console.log(`  HTTP 200  ${links.length} product links  ${seed.label}  ${verdict}`);
      }
    } catch (err) {
      if (err instanceof BlockedError) console.log(`  ${err.message} — stop and retry later`);
      else console.log(`  error: ${(err as Error).message}`);
    }
  }

  await budget.save();
  console.log(`\nVerification spent ${budget.used} of today's ${DAILY_REQUEST_LIMIT} requests.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
