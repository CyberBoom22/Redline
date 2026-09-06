import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './config';
import { readReport } from './report';
import { CatalogPart, RunReport } from './types';

/**
 * Ships a scan report to the dashboard's ingest endpoint.
 *
 * The Worker owns the database; this only speaks HTTP, so CI holds a
 * single-purpose ingest secret rather than a Cloudflare API token that could
 * read or drop anything else in the account.
 */

export interface PushOptions {
  url?: string;
  secret?: string;
  runId?: string;
  /** Send the report only, skipping the catalog snapshot. */
  reportOnly?: boolean;
  log?: (msg: string) => void;
}

export async function push(options: PushOptions = {}): Promise<void> {
  const log = options.log ?? ((m: string) => console.log(m));
  const base = (options.url ?? process.env.REDLINE_DASHBOARD_URL ?? '').replace(/\/+$/, '');
  const secret = options.secret ?? process.env.REDLINE_INGEST_SECRET ?? '';

  if (!base) throw new Error('Set REDLINE_DASHBOARD_URL (or pass --url=) to the deployed Worker origin');
  if (!secret) throw new Error('Set REDLINE_INGEST_SECRET (or pass --secret=) to the Worker ingest secret');

  // The secret travels in a header, so the transport has to be encrypted.
  // localhost is exempt so `npm run preview` can be tested without TLS.
  const parsed = new URL(base);
  const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !isLocal) {
    throw new Error(`Refusing to send the ingest secret over ${parsed.protocol}// — use https`);
  }
  if (secret.length < 24) {
    throw new Error('REDLINE_INGEST_SECRET is too short — use at least 24 characters (openssl rand -hex 32)');
  }

  const report = await readReport(options.runId);
  if (!report) throw new Error('No scan report found. Run `npm run scrape` first.');

  const parts = options.reportOnly ? [] : await readParts();
  const payload = { report, parts };
  const bytes = Buffer.byteLength(JSON.stringify(payload));
  log(
    `Pushing run ${report.runId}: ${report.added.length} added, ${report.changed.length} changed, ` +
      `${report.removed.length} removed, ${parts.length} catalog rows (${(bytes / 1024).toFixed(0)} KB)`,
  );

  const res = await postWithRetry(`${base}/api/ingest`, secret, payload, log);
  const body = (await res.json()) as { ok?: boolean; error?: string; partsWritten?: number };
  if (!res.ok || !body.ok) {
    throw new Error(`Ingest failed (HTTP ${res.status}): ${body.error ?? 'unknown error'}`);
  }
  log(`Ingested run ${report.runId} — ${body.partsWritten ?? 0} catalog rows written`);
}

/** The scan is the expensive part; a transient 5xx here shouldn't waste it. */
async function postWithRetry(
  url: string,
  secret: string,
  payload: { report: RunReport; parts: CatalogPart[] },
  log: (m: string) => void,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60_000),
      });
      // 4xx is our mistake — a bad secret or payload won't fix itself.
      if (res.status < 500) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err as Error;
    }

    if (attempt < 4) {
      const waitMs = 2 ** attempt * 1000;
      log(`Ingest attempt ${attempt} failed (${lastError.message}) — retrying in ${waitMs / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw lastError ?? new Error('Ingest failed');
}

async function readParts(): Promise<CatalogPart[]> {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, 'parts.json'), 'utf8')) as CatalogPart[];
  } catch {
    return [];
  }
}
