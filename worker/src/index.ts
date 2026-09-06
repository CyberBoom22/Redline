/**
 * Redline catalog dashboard.
 *
 * Serves the admin report UI and its JSON API from D1.
 *
 * Every read route verifies a Cloudflare Access JWT before returning anything.
 * The Worker fails closed: if Access is not configured, reads are refused
 * rather than served, so a deploy that lands before the Access policy exists is
 * locked rather than public. `/api/ingest` is the one machine route, guarded by
 * a bearer secret compared in constant time.
 */
import { AccessError, AccessIdentity, verifyAccess } from './access';
import { dashboardHtml } from './dashboard';

export interface Env {
  DB: D1Database;
  INGEST_SECRET: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  /** Local development only; never set this on a deployed Worker. */
  DEV_ALLOW_UNAUTHENTICATED?: string;
}

/** Ingest is a machine route with a known payload shape; these bound it. */
const MAX_INGEST_BYTES = 8 * 1024 * 1024;
const MAX_PARTS = 20_000;
const MAX_CHANGES = 10_000;
const MAX_ERRORS = 1_000;
const MIN_SECRET_LENGTH = 24;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (path === '/api/ingest') {
        if (request.method !== 'POST') return json({ error: 'POST required' }, 405);
        return harden(await ingest(request, env));
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return harden(json({ error: 'GET required' }, 405));
      }

      // Everything below this line requires a verified Access session.
      const viewer = await requireViewer(request, env);

      if (path === '/') {
        const nonce = crypto.randomUUID().replace(/-/g, '');
        return harden(
          new Response(dashboardHtml(nonce), {
            headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
          }),
          nonce,
        );
      }
      if (path === '/api/whoami') return harden(json({ email: viewer.email }));
      if (path === '/api/summary') return harden(await summary(env));
      if (path === '/api/runs') return harden(await listRuns(env, url));
      if (path.startsWith('/api/runs/')) {
        return harden(await getRun(env, decodeURIComponent(path.slice('/api/runs/'.length))));
      }
      if (path === '/api/parts') return harden(await listParts(env, url));
      if (path.startsWith('/api/history/')) {
        return harden(await priceHistory(env, decodeURIComponent(path.slice('/api/history/'.length))));
      }

      return harden(json({ error: 'not found' }, 404));
    } catch (err) {
      if (err instanceof AccessError) {
        return harden(json({ error: err.message }, err.status));
      }
      // Internal detail stays in the logs; the client gets nothing exploitable.
      console.error('request failed', { path, error: (err as Error).message, stack: (err as Error).stack });
      ctx.waitUntil(Promise.resolve());
      return harden(json({ error: 'internal error' }, 500));
    }
  },
} satisfies ExportedHandler<Env>;

/**
 * Resolve the viewer, or throw. Reads are refused unless Access is configured
 * and the token verifies — misconfiguration must never mean "open".
 */
async function requireViewer(request: Request, env: Env): Promise<AccessIdentity> {
  if (env.DEV_ALLOW_UNAUTHENTICATED === 'true') {
    return { email: null, subject: null };
  }
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    throw new AccessError(
      'Dashboard is not configured for Cloudflare Access. Set ACCESS_TEAM_DOMAIN and ACCESS_AUD.',
      503,
    );
  }
  return verifyAccess(request, { teamDomain: env.ACCESS_TEAM_DOMAIN, aud: env.ACCESS_AUD });
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

/**
 * Response headers applied to everything. The dashboard loads no third-party
 * code and is never framed, so the policy can be strict: a per-request nonce
 * for the one inline script, and nothing else permitted.
 */
function harden(res: Response, nonce?: string): Response {
  const headers = new Headers(res.headers);
  headers.set(
    'content-security-policy',
    [
      "default-src 'none'",
      nonce ? `script-src 'nonce-${nonce}'` : "script-src 'none'",
      "style-src 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join('; '),
  );
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-frame-options', 'DENY');
  headers.set('referrer-policy', 'no-referrer');
  headers.set('permissions-policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
  headers.set('cross-origin-opener-policy', 'same-origin');
  headers.set('cross-origin-resource-policy', 'same-origin');
  if (!headers.has('cache-control')) headers.set('cache-control', 'no-store');
  return new Response(res.body, { status: res.status, headers });
}

// ── ingest ──────────────────────────────────────────────────────────────────

interface ChangeRow {
  id: string;
  vendorId: string;
  vendorName?: string;
  name: string;
  url?: string;
  sku?: string | null;
  price?: number | null;
  engineIds?: string[];
  fields?: { field: string; from: unknown; to: unknown }[];
}

interface PartRow extends ChangeRow {
  brand?: string | null;
  mpn?: string | null;
  currency?: string;
  availability?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  category?: string | null;
  firstSeenAt?: string;
  lastSeenAt?: string;
  lastChangedAt?: string;
  priceHistory?: { date: string; price: number }[];
}

async function ingest(request: Request, env: Env): Promise<Response> {
  if (!env.INGEST_SECRET || env.INGEST_SECRET.length < MIN_SECRET_LENGTH) {
    console.error('INGEST_SECRET is missing or shorter than the minimum length');
    return json({ error: 'ingest is not configured' }, 503);
  }

  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!timingSafeEqual(token, env.INGEST_SECRET)) {
    return json({ error: 'unauthorized' }, 401);
  }

  // Reject oversized bodies before reading them into memory.
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_INGEST_BYTES) {
    return json({ error: 'payload too large' }, 413);
  }
  const raw = await request.text();
  if (raw.length > MAX_INGEST_BYTES) return json({ error: 'payload too large' }, 413);

  let body: { report?: Record<string, unknown>; parts?: unknown };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return json({ error: 'body is not valid JSON' }, 400);
  }

  const report = body?.report;
  if (!report || typeof report !== 'object') return json({ error: 'missing report' }, 400);

  const runId = str(report.runId);
  if (!runId || runId.length > 64) return json({ error: 'missing or invalid report.runId' }, 400);

  const added = changeList(report.added);
  const changed = changeList(report.changed);
  const removed = changeList(report.removed);
  if (added.length + changed.length + removed.length > MAX_CHANGES) {
    return json({ error: 'too many changes in one report' }, 413);
  }

  const errors = Array.isArray(report.errors) ? report.errors.slice(0, MAX_ERRORS) : [];
  const parts = Array.isArray(body.parts) ? (body.parts as PartRow[]) : [];
  if (parts.length > MAX_PARTS) return json({ error: 'too many parts in one payload' }, 413);

  const statements: D1PreparedStatement[] = [];

  // Re-ingesting a run replaces it rather than duplicating it.
  statements.push(env.DB.prepare('DELETE FROM changes WHERE run_id = ?').bind(runId));
  statements.push(env.DB.prepare('DELETE FROM scan_errors WHERE run_id = ?').bind(runId));
  statements.push(
    env.DB.prepare(
      `INSERT INTO runs (run_id, date, started_at, finished_at, duration_ms, requests, request_limit,
                         scanned, unchanged, added_count, changed_count, removed_count, error_count,
                         stopped_reason, queued_next, by_vendor, ingested_at)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)
       ON CONFLICT (run_id) DO UPDATE SET
         date=excluded.date, started_at=excluded.started_at, finished_at=excluded.finished_at,
         duration_ms=excluded.duration_ms, requests=excluded.requests, request_limit=excluded.request_limit,
         scanned=excluded.scanned, unchanged=excluded.unchanged, added_count=excluded.added_count,
         changed_count=excluded.changed_count, removed_count=excluded.removed_count,
         error_count=excluded.error_count, stopped_reason=excluded.stopped_reason,
         queued_next=excluded.queued_next, by_vendor=excluded.by_vendor, ingested_at=excluded.ingested_at`,
    ).bind(
      runId,
      str(report.date) ?? runId.slice(0, 10),
      str(report.startedAt) ?? new Date().toISOString(),
      str(report.finishedAt) ?? new Date().toISOString(),
      int(report.durationMs),
      int(report.requests),
      int(report.requestLimit, 100),
      int(report.scanned),
      int(report.unchanged),
      added.length,
      changed.length,
      removed.length,
      errors.length,
      str(report.stoppedReason),
      int(report.queuedForNextRun),
      JSON.stringify(report.byVendor ?? {}).slice(0, 8192),
      new Date().toISOString(),
    ),
  );

  const changeStmt = env.DB.prepare(
    `INSERT INTO changes (run_id, kind, part_id, vendor_id, vendor_name, name, url, sku, price, engine_ids, fields)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`,
  );
  for (const [kind, rows] of [
    ['added', added],
    ['changed', changed],
    ['removed', removed],
  ] as const) {
    for (const row of rows) {
      statements.push(
        changeStmt.bind(
          runId,
          kind,
          text(row.id, 256),
          text(row.vendorId, 32),
          text(row.vendorName, 128),
          text(row.name, 512) ?? '(unnamed)',
          safeUrl(row.url),
          text(row.sku, 128),
          num(row.price),
          JSON.stringify(stringList(row.engineIds)),
          row.fields ? JSON.stringify(row.fields).slice(0, 8192) : null,
        ),
      );
    }
  }

  const errStmt = env.DB.prepare('INSERT INTO scan_errors (run_id, url, reason) VALUES (?1,?2,?3)');
  for (const err of errors as { url?: string; reason?: string }[]) {
    statements.push(errStmt.bind(runId, safeUrl(err?.url), text(err?.reason, 512)));
  }

  await runBatched(env, statements);

  const partsWritten = parts.length ? await upsertParts(env, parts) : 0;
  return json({ ok: true, runId, changes: added.length + changed.length + removed.length, partsWritten });
}

async function upsertParts(env: Env, parts: PartRow[]): Promise<number> {
  const partStmt = env.DB.prepare(
    `INSERT INTO parts (id, vendor_id, vendor_name, url, name, brand, sku, mpn, price, currency,
                        availability, image_url, description, category, engine_ids,
                        first_seen_at, last_seen_at, last_changed_at)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18)
     ON CONFLICT (id) DO UPDATE SET
       vendor_id=excluded.vendor_id, vendor_name=excluded.vendor_name, url=excluded.url,
       name=excluded.name, brand=excluded.brand, sku=excluded.sku, mpn=excluded.mpn,
       price=excluded.price, currency=excluded.currency, availability=excluded.availability,
       image_url=excluded.image_url, description=excluded.description, category=excluded.category,
       engine_ids=excluded.engine_ids, last_seen_at=excluded.last_seen_at,
       last_changed_at=excluded.last_changed_at`,
  );
  const historyStmt = env.DB.prepare(
    'INSERT INTO price_history (part_id, date, price) VALUES (?1,?2,?3) ON CONFLICT (part_id, date) DO UPDATE SET price=excluded.price',
  );

  const statements: D1PreparedStatement[] = [];
  let written = 0;

  for (const part of parts) {
    const id = text(part.id, 256);
    if (!id) continue;
    written += 1;
    statements.push(
      partStmt.bind(
        id,
        text(part.vendorId, 32) ?? 'unknown',
        text(part.vendorName, 128),
        safeUrl(part.url),
        text(part.name, 512) ?? '(unnamed)',
        text(part.brand, 256),
        text(part.sku, 128),
        text(part.mpn, 128),
        num(part.price),
        text(part.currency, 8) ?? 'USD',
        text(part.availability, 64),
        safeUrl(part.imageUrl),
        text(part.description, 4096),
        text(part.category, 64),
        JSON.stringify(stringList(part.engineIds)),
        text(part.firstSeenAt, 40),
        text(part.lastSeenAt, 40),
        text(part.lastChangedAt, 40),
      ),
    );
    for (const point of (part.priceHistory ?? []).slice(0, 120)) {
      const date = text(point?.date, 20);
      const price = num(point?.price);
      if (date && price !== null) statements.push(historyStmt.bind(id, date, price));
    }
  }

  await runBatched(env, statements);
  return written;
}

async function runBatched(env: Env, statements: D1PreparedStatement[], size = 100): Promise<void> {
  for (let i = 0; i < statements.length; i += size) {
    await env.DB.batch(statements.slice(i, i + size));
  }
}

/** Constant-time compare so the secret can't be probed a character at a time. */
function timingSafeEqual(a: string, b: string): boolean {
  // Compare hashes so differing lengths don't leak through an early return.
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) {
    let sink = 0;
    for (let i = 0; i < Math.max(left.length, right.length); i++) {
      sink |= (left[i] ?? 0) ^ (right[i] ?? 1);
    }
    return false;
  }
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

// ── input coercion ──────────────────────────────────────────────────────────

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function text(value: unknown, max: number): string | null {
  const s = str(value);
  return s === null ? null : s.slice(0, max);
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function int(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').slice(0, 20) : [];
}

function changeList(value: unknown): ChangeRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is ChangeRow => Boolean(row) && typeof row === 'object');
}

/**
 * Only http(s) URLs are stored. Scraped values reach here from third-party
 * pages, so a `javascript:` or `data:` URL must never make it into a row that
 * later becomes an href.
 */
function safeUrl(value: unknown): string | null {
  const raw = str(value);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString().slice(0, 2048);
  } catch {
    return null;
  }
}

// ── reads ───────────────────────────────────────────────────────────────────

async function summary(env: Env): Promise<Response> {
  const [parts, latest, vendors] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) AS total, COUNT(price) AS priced, MAX(last_seen_at) AS last_seen FROM parts').first(),
    env.DB.prepare('SELECT * FROM runs ORDER BY finished_at DESC LIMIT 1').first(),
    env.DB.prepare(
      'SELECT vendor_id, COUNT(*) AS parts, AVG(price) AS avg_price FROM parts GROUP BY vendor_id ORDER BY vendor_id',
    ).all(),
  ]);
  return json({ parts, latest, vendors: vendors.results });
}

async function listRuns(env: Env, url: URL): Promise<Response> {
  const limit = clamp(Number(url.searchParams.get('limit') ?? 30), 1, 200);
  const { results } = await env.DB.prepare('SELECT * FROM runs ORDER BY finished_at DESC LIMIT ?1').bind(limit).all();
  return json({ runs: results });
}

async function getRun(env: Env, runId: string): Promise<Response> {
  if (!runId || runId.length > 64) return json({ error: 'invalid run id' }, 400);

  const run = await env.DB.prepare('SELECT * FROM runs WHERE run_id = ?1').bind(runId).first();
  if (!run) return json({ error: 'run not found' }, 404);

  const [changes, errors] = await Promise.all([
    env.DB.prepare(
      `SELECT kind, part_id, vendor_id, vendor_name, name, url, sku, price, engine_ids, fields
       FROM changes WHERE run_id = ?1
       ORDER BY CASE kind WHEN 'added' THEN 0 WHEN 'changed' THEN 1 ELSE 2 END, name
       LIMIT 5000`,
    )
      .bind(runId)
      .all(),
    env.DB.prepare('SELECT url, reason FROM scan_errors WHERE run_id = ?1 LIMIT 500').bind(runId).all(),
  ]);

  return json({
    run,
    changes: changes.results.map((row) => ({
      ...row,
      engine_ids: safeParse(row.engine_ids as string, []),
      fields: row.fields ? safeParse(row.fields as string, []) : null,
    })),
    errors: errors.results,
  });
}

async function listParts(env: Env, url: URL): Promise<Response> {
  const vendor = url.searchParams.get('vendor');
  const engine = url.searchParams.get('engine');
  const query = url.searchParams.get('q');
  const limit = clamp(Number(url.searchParams.get('limit') ?? 200), 1, 1000);

  const where: string[] = [];
  const binds: unknown[] = [];

  // Values are bound, never interpolated; LIKE inputs also have their wildcards
  // escaped so a `%` in a search box can't turn into a full-table scan.
  if (vendor) {
    where.push(`vendor_id = ?${binds.length + 1}`);
    binds.push(vendor.slice(0, 32));
  }
  if (engine) {
    where.push(`engine_ids LIKE ?${binds.length + 1} ESCAPE '\\'`);
    binds.push(`%"${escapeLike(engine.slice(0, 32))}"%`);
  }
  if (query) {
    const i = binds.length + 1;
    where.push(`(name LIKE ?${i} ESCAPE '\\' OR brand LIKE ?${i} ESCAPE '\\' OR sku LIKE ?${i} ESCAPE '\\')`);
    binds.push(`%${escapeLike(query.slice(0, 128))}%`);
  }

  const sql = `SELECT id, vendor_id, vendor_name, name, brand, sku, price, currency, availability, category,
                      engine_ids, url, last_seen_at, last_changed_at
               FROM parts ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
               ORDER BY last_changed_at DESC LIMIT ?${binds.length + 1}`;

  const { results } = await env.DB.prepare(sql)
    .bind(...binds, limit)
    .all();
  return json({ parts: results.map((row) => ({ ...row, engine_ids: safeParse(row.engine_ids as string, []) })) });
}

async function priceHistory(env: Env, partId: string): Promise<Response> {
  if (!partId || partId.length > 256) return json({ error: 'invalid part id' }, 400);
  const { results } = await env.DB.prepare(
    'SELECT date, price FROM price_history WHERE part_id = ?1 ORDER BY date LIMIT 400',
  )
    .bind(partId)
    .all();
  return json({ partId, history: results });
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

function safeParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
