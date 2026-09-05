/**
 * Redline catalog dashboard.
 *
 * Serves the admin report UI and its JSON API from D1. Reads are protected by
 * Cloudflare Access, which terminates identity in front of the Worker and
 * passes the authenticated user down in `Cf-Access-Authenticated-User-Email`.
 * The one route Access does not gate is /api/ingest, which the daily scan
 * posts to with a bearer secret.
 */
import { dashboardHtml } from './dashboard';

export interface Env {
  DB: D1Database;
  INGEST_SECRET: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    try {
      if (path === '/api/ingest') {
        if (request.method !== 'POST') return json({ error: 'POST required' }, 405);
        return await ingest(request, env);
      }

      if (request.method !== 'GET') return json({ error: 'GET required' }, 405);

      if (path === '/') return new Response(dashboardHtml(), { headers: { 'content-type': 'text/html; charset=utf-8' } });
      if (path === '/api/whoami') return json({ email: viewerEmail(request) });
      if (path === '/api/runs') return await listRuns(env, url);
      if (path.startsWith('/api/runs/')) return await getRun(env, decodeURIComponent(path.slice('/api/runs/'.length)));
      if (path === '/api/parts') return await listParts(env, url);
      if (path.startsWith('/api/history/')) return await priceHistory(env, decodeURIComponent(path.slice('/api/history/'.length)));
      if (path === '/api/summary') return await summary(env);

      return json({ error: 'not found' }, 404);
    } catch (err) {
      return json({ error: (err as Error).message }, 500);
    }
  },
} satisfies ExportedHandler<Env>;

/** Access puts the verified identity in this header; absent when run locally. */
function viewerEmail(request: Request): string | null {
  return request.headers.get('Cf-Access-Authenticated-User-Email');
}

// ── ingest ──────────────────────────────────────────────────────────────────

interface IngestBody {
  report: {
    runId: string;
    date: string;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    requests: number;
    requestLimit: number;
    scanned: number;
    unchanged: number;
    added: ChangeRow[];
    changed: ChangeRow[];
    removed: ChangeRow[];
    errors: { url: string; reason: string }[];
    byVendor: Record<string, unknown>;
    stoppedReason: string;
    queuedForNextRun: number;
  };
  parts?: PartRow[];
}

interface ChangeRow {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  url: string;
  sku: string | null;
  price: number | null;
  engineIds: string[];
  fields?: { field: string; from: unknown; to: unknown }[];
}

interface PartRow {
  id: string;
  vendorId: string;
  vendorName: string;
  url: string;
  name: string;
  brand: string | null;
  sku: string | null;
  mpn: string | null;
  price: number | null;
  currency: string;
  availability: string | null;
  imageUrl: string | null;
  description: string | null;
  category: string | null;
  engineIds: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  lastChangedAt: string;
  priceHistory?: { date: string; price: number }[];
}

async function ingest(request: Request, env: Env): Promise<Response> {
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!env.INGEST_SECRET || !timingSafeEqual(token, env.INGEST_SECRET)) {
    return json({ error: 'unauthorized' }, 401);
  }

  const body = (await request.json()) as IngestBody;
  const report = body?.report;
  if (!report?.runId) return json({ error: 'missing report.runId' }, 400);

  const statements: D1PreparedStatement[] = [];

  // Re-ingesting the same run replaces it rather than duplicating it.
  statements.push(env.DB.prepare('DELETE FROM changes WHERE run_id = ?').bind(report.runId));
  statements.push(env.DB.prepare('DELETE FROM scan_errors WHERE run_id = ?').bind(report.runId));
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
      report.runId,
      report.date,
      report.startedAt,
      report.finishedAt,
      report.durationMs ?? 0,
      report.requests ?? 0,
      report.requestLimit ?? 100,
      report.scanned ?? 0,
      report.unchanged ?? 0,
      report.added?.length ?? 0,
      report.changed?.length ?? 0,
      report.removed?.length ?? 0,
      report.errors?.length ?? 0,
      report.stoppedReason ?? null,
      report.queuedForNextRun ?? 0,
      JSON.stringify(report.byVendor ?? {}),
      new Date().toISOString(),
    ),
  );

  const changeStmt = env.DB.prepare(
    `INSERT INTO changes (run_id, kind, part_id, vendor_id, vendor_name, name, url, sku, price, engine_ids, fields)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`,
  );
  for (const [kind, rows] of [
    ['added', report.added ?? []],
    ['changed', report.changed ?? []],
    ['removed', report.removed ?? []],
  ] as const) {
    for (const row of rows) {
      statements.push(
        changeStmt.bind(
          report.runId,
          kind,
          row.id,
          row.vendorId,
          row.vendorName ?? null,
          row.name,
          row.url ?? null,
          row.sku ?? null,
          row.price ?? null,
          JSON.stringify(row.engineIds ?? []),
          row.fields ? JSON.stringify(row.fields) : null,
        ),
      );
    }
  }

  const errStmt = env.DB.prepare('INSERT INTO scan_errors (run_id, url, reason) VALUES (?1,?2,?3)');
  for (const err of report.errors ?? []) {
    statements.push(errStmt.bind(report.runId, err.url ?? null, err.reason ?? null));
  }

  await runBatched(env, statements);

  // The catalog snapshot is optional — a report-only ingest is valid.
  let partsWritten = 0;
  if (body.parts?.length) {
    partsWritten = await upsertParts(env, body.parts);
  }

  return json({
    ok: true,
    runId: report.runId,
    changes: (report.added?.length ?? 0) + (report.changed?.length ?? 0) + (report.removed?.length ?? 0),
    partsWritten,
  });
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
  for (const part of parts) {
    statements.push(
      partStmt.bind(
        part.id,
        part.vendorId,
        part.vendorName ?? null,
        part.url ?? null,
        part.name,
        part.brand ?? null,
        part.sku ?? null,
        part.mpn ?? null,
        part.price ?? null,
        part.currency ?? 'USD',
        part.availability ?? null,
        part.imageUrl ?? null,
        part.description ?? null,
        part.category ?? null,
        JSON.stringify(part.engineIds ?? []),
        part.firstSeenAt ?? null,
        part.lastSeenAt ?? null,
        part.lastChangedAt ?? null,
      ),
    );
    for (const point of part.priceHistory ?? []) {
      statements.push(historyStmt.bind(part.id, point.date, point.price));
    }
  }

  await runBatched(env, statements);
  return parts.length;
}

/** D1 caps how much one batch can carry, so long runs are split. */
async function runBatched(env: Env, statements: D1PreparedStatement[], size = 100): Promise<void> {
  for (let i = 0; i < statements.length; i += size) {
    await env.DB.batch(statements.slice(i, i + size));
  }
}

/** Constant-time compare so the secret can't be probed a character at a time. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── reads ───────────────────────────────────────────────────────────────────

async function summary(env: Env): Promise<Response> {
  const [parts, latest, vendors] = await Promise.all([
    env.DB.prepare(
      'SELECT COUNT(*) AS total, COUNT(price) AS priced, MAX(last_seen_at) AS last_seen FROM parts',
    ).first(),
    env.DB.prepare('SELECT * FROM runs ORDER BY finished_at DESC LIMIT 1').first(),
    env.DB.prepare(
      'SELECT vendor_id, COUNT(*) AS parts, AVG(price) AS avg_price FROM parts GROUP BY vendor_id ORDER BY vendor_id',
    ).all(),
  ]);
  return json({ parts, latest, vendors: vendors.results });
}

async function listRuns(env: Env, url: URL): Promise<Response> {
  const limit = clamp(Number(url.searchParams.get('limit') ?? 30), 1, 200);
  const { results } = await env.DB.prepare('SELECT * FROM runs ORDER BY finished_at DESC LIMIT ?1')
    .bind(limit)
    .all();
  return json({ runs: results });
}

async function getRun(env: Env, runId: string): Promise<Response> {
  const run = await env.DB.prepare('SELECT * FROM runs WHERE run_id = ?1').bind(runId).first();
  if (!run) return json({ error: 'run not found' }, 404);

  const [changes, errors] = await Promise.all([
    env.DB.prepare(
      `SELECT kind, part_id, vendor_id, vendor_name, name, url, sku, price, engine_ids, fields
       FROM changes WHERE run_id = ?1
       ORDER BY CASE kind WHEN 'added' THEN 0 WHEN 'changed' THEN 1 ELSE 2 END, name`,
    )
      .bind(runId)
      .all(),
    env.DB.prepare('SELECT url, reason FROM scan_errors WHERE run_id = ?1').bind(runId).all(),
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
  if (vendor) {
    where.push(`vendor_id = ?${binds.length + 1}`);
    binds.push(vendor);
  }
  if (engine) {
    where.push(`engine_ids LIKE ?${binds.length + 1}`);
    binds.push(`%"${engine}"%`);
  }
  if (query) {
    where.push(`(name LIKE ?${binds.length + 1} OR brand LIKE ?${binds.length + 1} OR sku LIKE ?${binds.length + 1})`);
    binds.push(`%${query}%`);
  }

  const sql =
    `SELECT id, vendor_id, vendor_name, name, brand, sku, price, currency, availability, category,
            engine_ids, url, last_seen_at, last_changed_at
     FROM parts ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY last_changed_at DESC LIMIT ?${binds.length + 1}`;

  const { results } = await env.DB.prepare(sql)
    .bind(...binds, limit)
    .all();
  return json({
    parts: results.map((row) => ({ ...row, engine_ids: safeParse(row.engine_ids as string, []) })),
  });
}

async function priceHistory(env: Env, partId: string): Promise<Response> {
  const { results } = await env.DB.prepare(
    'SELECT date, price FROM price_history WHERE part_id = ?1 ORDER BY date',
  )
    .bind(partId)
    .all();
  return json({ partId, history: results });
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
