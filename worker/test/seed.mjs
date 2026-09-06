/**
 * Seeds the local D1 with realistic sample data and starts the Worker in dev
 * mode, so the dashboard can be clicked through without deploying anything.
 *
 *   npm run preview   →  http://127.0.0.1:8787
 *
 * Dev mode disables Access enforcement, which is why it is local-only: never
 * set DEV_ALLOW_UNAUTHENTICATED on a deployed Worker.
 */
import { spawn, execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const SECRET = 'local-preview-secret-not-a-real-one';
const PORT = Number(process.env.PORT ?? 8787);

const vendors = [
  ['ecs', 'ECS Tuning'],
  ['fcp', 'FCP Euro'],
  ['z1', 'Z1 Motorsports'],
];
const catalog = [
  ['FTP Motorsport B58 Charge Pipe', 'FTP Motorsport', 'FTP-CP-01', 329.99, 'chargepipe_intercooler', ['b58_gen2'], 'ecs'],
  ['Wagner Tuning Competition Intercooler', 'Wagner Tuning', 'WAG-IC-58', 1249.0, 'chargepipe_intercooler', ['b58_gen1', 'b58_gen2'], 'ecs'],
  ['bootmod3 B58 Licence', 'proTuningFreaks', 'BM3-B58', 595.0, 'tune', ['b58_gen1', 'b58_gen2'], 'ecs'],
  ['MHD Flasher Super Licence', 'MHD Tuning', 'MHD-SUP', 490.0, 'tune', ['b58_gen1', 'b58_gen2'], 'fcp'],
  ['Genuine BMW Spark Plug Set', 'BMW', 'BMW-PLUG-6', 128.4, null, ['b58_gen1', 'b58_gen2'], 'fcp'],
  ['xHP Flashtool ZF8 Stage 3', 'xHP', 'XHP-ZF8', 350.0, 'drivetrain', ['b58_gen2'], 'fcp'],
  ['Z1 VR30 Catless Downpipes', 'Z1 Motorsports', 'Z1-DP-30', 1095.0, 'downpipe', ['vr30_redsport', 'vr30_luxe'], 'z1'],
  ['AMS Alpha VR30 Intercoolers', 'AMS Performance', 'AMS-IC-30', 1495.0, 'chargepipe_intercooler', ['vr30_redsport'], 'z1'],
  ['Z1 370Z High Flow Intake', 'Z1 Motorsports', 'Z1-INT-37', 449.99, 'intake', ['vq37vhr'], 'z1'],
  ['Stillen VQ37 Long Tube Headers', 'Stillen', 'STL-HDR-37', 1799.0, 'exhaust', ['vq37vhr'], 'z1'],
];

const sql = (v) => `'${String(v).replace(/'/g, "''")}'`;
const nullable = (v) => (v === null || v === undefined ? 'NULL' : sql(v));

const today = new Date();
const day = (back) => new Date(today.getTime() - back * 86400000).toISOString();

const statements = ['DELETE FROM changes;', 'DELETE FROM scan_errors;', 'DELETE FROM runs;', 'DELETE FROM parts;', 'DELETE FROM price_history;'];

for (const [name, brand, sku, price, category, engines, vendorId] of catalog) {
  const vendorName = vendors.find(([id]) => id === vendorId)[1];
  const id = `${vendorId}:${sku}`;
  statements.push(
    `INSERT INTO parts (id, vendor_id, vendor_name, url, name, brand, sku, price, currency, availability, category, engine_ids, first_seen_at, last_seen_at, last_changed_at)
     VALUES (${sql(id)}, ${sql(vendorId)}, ${sql(vendorName)}, ${sql(`https://example.test/${sku}`)}, ${sql(name)}, ${sql(brand)}, ${sql(sku)}, ${price}, 'USD', 'InStock', ${nullable(category)}, ${sql(JSON.stringify(engines))}, ${sql(day(30))}, ${sql(day(0))}, ${sql(day(Math.floor(Math.random() * 6)))});`,
  );
  statements.push(`INSERT INTO price_history (part_id, date, price) VALUES (${sql(id)}, ${sql(day(30).slice(0, 10))}, ${(price * 1.08).toFixed(2)});`);
  statements.push(`INSERT INTO price_history (part_id, date, price) VALUES (${sql(id)}, ${sql(day(0).slice(0, 10))}, ${price});`);
}

// Four days of scans, with the newest carrying the most interesting changes.
const runs = [
  { back: 0, requests: 97, scanned: 88, added: 2, changed: 3, removed: 1, errors: 1, stopped: 'budget', queued: 412 },
  { back: 1, requests: 100, scanned: 94, added: 6, changed: 1, removed: 0, errors: 0, stopped: 'budget', queued: 498 },
  { back: 2, requests: 100, scanned: 91, added: 11, changed: 0, removed: 0, errors: 2, stopped: 'budget', queued: 587 },
  { back: 3, requests: 43, scanned: 38, added: 38, changed: 0, removed: 0, errors: 0, stopped: 'queue-empty', queued: 0 },
];

for (const r of runs) {
  const finished = day(r.back);
  const runId = `${finished.slice(0, 10)}T0800`;
  statements.push(
    `INSERT INTO runs (run_id, date, started_at, finished_at, duration_ms, requests, request_limit, scanned, unchanged, added_count, changed_count, removed_count, error_count, stopped_reason, queued_next, by_vendor, ingested_at)
     VALUES (${sql(runId)}, ${sql(finished.slice(0, 10))}, ${sql(finished)}, ${sql(finished)}, 786000, ${r.requests}, 100, ${r.scanned}, ${r.scanned - r.added - r.changed}, ${r.added}, ${r.changed}, ${r.removed}, ${r.errors}, ${sql(r.stopped)}, ${r.queued}, ${sql(JSON.stringify({ ecs: { requests: 33, scanned: 30, added: 1, changed: 1, removed: 0 }, fcp: { requests: 32, scanned: 29, added: 1, changed: 1, removed: 1 }, z1: { requests: 32, scanned: 29, added: 0, changed: 1, removed: 0 } }))}, ${sql(finished)});`,
  );

  if (r.back === 0) {
    const rows = [
      ['added', catalog[0], null],
      ['added', catalog[7], null],
      ['changed', catalog[6], [{ field: 'price', from: 1195, to: 1095 }, { field: 'availability', from: 'OutOfStock', to: 'InStock' }]],
      ['changed', catalog[1], [{ field: 'price', from: 1199, to: 1249 }]],
      ['changed', catalog[4], [{ field: 'availability', from: 'InStock', to: 'BackOrder' }]],
      ['removed', catalog[9], null],
    ];
    for (const [kind, item, fields] of rows) {
      const [name, , sku, price, , engines, vendorId] = item;
      const vendorName = vendors.find(([id]) => id === vendorId)[1];
      statements.push(
        `INSERT INTO changes (run_id, kind, part_id, vendor_id, vendor_name, name, url, sku, price, engine_ids, fields)
         VALUES (${sql(runId)}, ${sql(kind)}, ${sql(`${vendorId}:${sku}`)}, ${sql(vendorId)}, ${sql(vendorName)}, ${sql(name)}, ${sql(`https://example.test/${sku}`)}, ${sql(sku)}, ${price}, ${sql(JSON.stringify(engines))}, ${fields ? sql(JSON.stringify(fields)) : 'NULL'});`,
      );
    }
    statements.push(
      `INSERT INTO scan_errors (run_id, url, reason) VALUES (${sql(runId)}, 'https://example.test/timeout-page', 'listing returned HTTP 503');`,
    );
  }
}

console.log('Seeding local database…');
// --command has a length limit well under this payload, so go through a file.
const seedFile = new URL('./seed.generated.sql', import.meta.url);
writeFileSync(seedFile, statements.join('\n'));
execSync('npx wrangler d1 execute redline-catalog --local --file test/seed.generated.sql', {
  stdio: ['ignore', 'ignore', 'inherit'],
});

console.log(`\n  Dashboard preview → http://127.0.0.1:${PORT}\n  (dev mode: Access enforcement is off locally)\n`);
spawn(
  'npx',
  ['wrangler', 'dev', '--local', '--port', String(PORT), '--ip', '127.0.0.1',
   '--var', `INGEST_SECRET:${SECRET}`, '--var', 'DEV_ALLOW_UNAUTHENTICATED:true'],
  { stdio: 'inherit' },
);
