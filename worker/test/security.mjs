/**
 * Security regression tests for the dashboard Worker.
 *
 * Each case maps to a specific finding from the pre-deployment audit. They run
 * against a real `wrangler dev` instance with a local D1, in two configurations:
 * one with Access enforcement on (the deployed posture) and one in dev mode
 * (where reads are deliberately open so the data paths can be exercised).
 *
 *   node test/security.mjs
 */
import { spawn, execSync } from 'node:child_process';
import assert from 'node:assert/strict';

const BASE_PORT = Number(process.env.PORT ?? 8788);
const SECRET = 'test-secret-that-is-long-enough-32';

// Each phase gets its own port: a torn-down wrangler can hold the previous one
// for a moment, and a bind failure would read as a test failure.
let PORT = BASE_PORT;
let BASE = `http://127.0.0.1:${PORT}`;

/** wrangler leaves a workerd child behind on abrupt exits; clear any strays. */
function killStrays() {
  // The bracket in `wrangl[e]r` keeps the pattern from matching the shell that
  // runs pkill itself - without it, pkill kills its own parent process.
  const cmd = "pkill -9 -f 'workerd' || true; pkill -9 -f 'wrangl[e]r dev' || true; exit 0";
  try {
    execSync(cmd, { stdio: 'ignore' });
  } catch { /* nothing to clean up */ }
}


let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  ok    ${name}`);
    passed += 1;
  } catch (err) {
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
    failed += 1;
  }
}

async function startWorker(extraVars, port) {
  killStrays();
  await new Promise((r) => setTimeout(r, 1500));
  PORT = port;
  BASE = `http://127.0.0.1:${PORT}`;

  const args = [
    'wrangler', 'dev', '--local', '--port', String(PORT), '--ip', '127.0.0.1',
    '--var', `INGEST_SECRET:${SECRET}`,
    ...extraVars.flatMap((v) => ['--var', v]),
  ];
  const child = spawn('npx', args, { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('wrangler did not start in time')), 120_000);
    const onData = (buf) => {
      if (buf.toString().includes('Ready on')) {
        clearTimeout(timer);
        setTimeout(() => resolve(child), 800);
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', reject);
  });
}

async function stop(child) {
  try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
  await new Promise((r) => setTimeout(r, 1000));
  killStrays();
  await new Promise((r) => setTimeout(r, 1000));
}

const samplePayload = (overrides = {}) => ({
  report: {
    runId: 'sec-test-run',
    date: '2026-09-06',
    startedAt: '2026-09-06T08:00:00.000Z',
    finishedAt: '2026-09-06T08:05:00.000Z',
    durationMs: 300000, requests: 10, requestLimit: 100, scanned: 1, unchanged: 0,
    added: [], changed: [], removed: [], errors: [],
    byVendor: {}, stoppedReason: 'queue-empty', queuedForNextRun: 0,
    ...overrides,
  },
  parts: [],
});

// ── enforced posture: Access configured, no dev bypass ──────────────────────

console.log('\nAccess enforcement (deployed posture)');
let worker = await startWorker(
  ['ACCESS_TEAM_DOMAIN:example.cloudflareaccess.com', 'ACCESS_AUD:test-aud'],
  BASE_PORT,
);

try {
  await check('unauthenticated read is refused, not served', async () => {
    for (const path of ['/', '/api/summary', '/api/runs', '/api/parts', '/api/whoami']) {
      const res = await fetch(BASE + path);
      assert.notEqual(res.status, 200, `${path} served content without an Access token`);
      assert.ok(res.status === 401 || res.status === 403, `${path} returned ${res.status}`);
    }
  });

  await check('a forged identity header does not authenticate', async () => {
    const res = await fetch(`${BASE}/api/summary`, {
      headers: { 'Cf-Access-Authenticated-User-Email': 'attacker@evil.test' },
    });
    assert.notEqual(res.status, 200, 'the email header alone was accepted as proof of identity');
  });

  await check('a forged JWT is rejected', async () => {
    const fake = `${btoa(JSON.stringify({ alg: 'RS256', kid: 'x' }))}.${btoa(
      JSON.stringify({ aud: 'test-aud', email: 'a@b.c', exp: 9999999999 }),
    )}.signature`;
    const res = await fetch(`${BASE}/api/summary`, { headers: { 'Cf-Access-Jwt-Assertion': fake } });
    assert.notEqual(res.status, 200, 'an unsigned token was accepted');
  });

  await check('the "none" algorithm is rejected', async () => {
    const none = `${btoa(JSON.stringify({ alg: 'none' }))}.${btoa(JSON.stringify({ aud: 'test-aud' }))}.`;
    const res = await fetch(`${BASE}/api/summary`, { headers: { 'Cf-Access-Jwt-Assertion': none } });
    assert.notEqual(res.status, 200, 'alg:none was accepted');
  });

  await check('security headers are present on refusals too', async () => {
    const res = await fetch(`${BASE}/api/summary`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.match(res.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
    assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  });

  await check('ingest still works while reads are gated', async () => {
    const res = await fetch(`${BASE}/api/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${SECRET}` },
      body: JSON.stringify(samplePayload()),
    });
    assert.equal(res.status, 200, 'CI ingest must not depend on Access');
  });
} finally {
  await stop(worker);
}

// ── dev posture: reads open, so the data paths can be exercised ─────────────

console.log('\nInput handling and injection');
worker = await startWorker(['DEV_ALLOW_UNAUTHENTICATED:true'], BASE_PORT + 1);

try {
  await check('ingest rejects a wrong secret', async () => {
    const res = await fetch(`${BASE}/api/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer wrong-secret-wrong-secret-xx' },
      body: JSON.stringify(samplePayload()),
    });
    assert.equal(res.status, 401);
  });

  await check('ingest rejects a missing Authorization header', async () => {
    const res = await fetch(`${BASE}/api/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(samplePayload()),
    });
    assert.equal(res.status, 401);
  });

  await check('ingest rejects an oversized payload', async () => {
    const res = await fetch(`${BASE}/api/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${SECRET}` },
      body: JSON.stringify({ report: { runId: 'big', name: 'x'.repeat(9 * 1024 * 1024) } }),
    });
    assert.equal(res.status, 413);
  });

  await check('ingest rejects malformed JSON without leaking internals', async () => {
    const res = await fetch(`${BASE}/api/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${SECRET}` },
      body: '{ not json',
    });
    assert.equal(res.status, 400);
    const body = await res.text();
    assert.doesNotMatch(body, /at Object|\.ts:|node_modules|SyntaxError/, 'a stack trace leaked to the client');
  });

  await check('a javascript: URL is never stored', async () => {
    await fetch(`${BASE}/api/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${SECRET}` },
      body: JSON.stringify({
        ...samplePayload({
          runId: 'xss-run',
          added: [{
            id: 'evil:1', vendorId: 'ecs', vendorName: 'ECS', name: 'XSS attempt',
            url: 'javascript:alert(document.cookie)', sku: 'X', price: 1, engineIds: ['b58_gen2'],
          }],
        }),
        parts: [{
          id: 'evil:1', vendorId: 'ecs', vendorName: 'ECS', name: 'XSS attempt',
          url: 'javascript:alert(1)', imageUrl: 'data:text/html,<script>alert(1)</script>',
          sku: 'X', price: 1, currency: 'USD', engineIds: ['b58_gen2'],
          firstSeenAt: '2026-09-06T08:00:00Z', lastSeenAt: '2026-09-06T08:00:00Z',
          lastChangedAt: '2026-09-06T08:00:00Z',
        }],
      }),
    });

    const run = await (await fetch(`${BASE}/api/runs/xss-run`)).json();
    assert.equal(run.changes[0].url, null, 'a javascript: URL was stored on a change row');

    const parts = await (await fetch(`${BASE}/api/parts?q=XSS`)).json();
    assert.equal(parts.parts[0].url, null, 'a javascript: URL was stored on a part row');
  });

  await check('SQL metacharacters in search are treated as data', async () => {
    for (const q of ["' OR 1=1 --", '"; DROP TABLE parts; --', "%' --", 'x\\%']) {
      const res = await fetch(`${BASE}/api/parts?q=${encodeURIComponent(q)}`);
      assert.equal(res.status, 200, `search for ${q} errored`);
      const body = await res.json();
      assert.ok(Array.isArray(body.parts), 'search did not return a result set');
    }
    // The table must still exist after the injection attempts.
    const after = await (await fetch(`${BASE}/api/parts`)).json();
    assert.ok(Array.isArray(after.parts));
  });

  await check('a LIKE wildcard in search does not match everything', async () => {
    const all = await (await fetch(`${BASE}/api/parts`)).json();
    const wild = await (await fetch(`${BASE}/api/parts?q=${encodeURIComponent('%')}`)).json();
    assert.ok(wild.parts.length < all.parts.length || all.parts.length === 0,
      'a bare % matched the whole table, so wildcards are not escaped');
  });

  await check('oversized identifiers are rejected, not passed to the database', async () => {
    const res = await fetch(`${BASE}/api/runs/${'a'.repeat(500)}`);
    assert.equal(res.status, 400);
  });

  await check('an unknown route does not leak internals', async () => {
    const res = await fetch(`${BASE}/api/../../etc/passwd`);
    assert.ok(res.status === 404 || res.status === 400);
    const body = await res.text();
    assert.doesNotMatch(body, /\.ts:|node_modules|at async/);
  });

  await check('the dashboard ships a nonce-based CSP, not unsafe-inline', async () => {
    const res = await fetch(`${BASE}/`);
    assert.equal(res.status, 200);
    const csp = res.headers.get('content-security-policy') ?? '';
    assert.match(csp, /script-src 'nonce-[a-f0-9]+'/, 'script-src is not nonce-based');
    assert.doesNotMatch(csp, /script-src[^;]*unsafe-inline/, "script-src allows 'unsafe-inline'");
    const html = await res.text();
    assert.match(html, /<script nonce="[a-f0-9]+">/, 'the inline script carries no nonce');
  });
} finally {
  await stop(worker);
}

killStrays();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
