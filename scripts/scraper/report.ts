import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './config';
import { ChangeRecord, RunReport } from './types';

/**
 * Per-run change reports.
 *
 * Each run writes one JSON file describing what it scanned, added, changed and
 * removed. The shape is deliberately storage-agnostic: the same object is what
 * gets rendered in the terminal, committed to the repo, and pushed to a
 * database or emailed once a backend is wired up.
 */

const REPORT_DIR = path.join(DATA_DIR, 'runs');
const INDEX_FILE = path.join(REPORT_DIR, 'index.json');
const KEEP_REPORTS = 90;

export interface ReportIndexEntry {
  runId: string;
  date: string;
  finishedAt: string;
  requests: number;
  scanned: number;
  added: number;
  changed: number;
  removed: number;
  errors: number;
}

export async function writeReport(report: RunReport): Promise<string> {
  await fs.mkdir(REPORT_DIR, { recursive: true });
  const file = path.join(REPORT_DIR, `${report.runId}.json`);
  await fs.writeFile(file, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const index = await readIndex();
  const entry: ReportIndexEntry = {
    runId: report.runId,
    date: report.date,
    finishedAt: report.finishedAt,
    requests: report.requests,
    scanned: report.scanned,
    added: report.added.length,
    changed: report.changed.length,
    removed: report.removed.length,
    errors: report.errors.length,
  };
  const next = [...index.filter((e) => e.runId !== entry.runId), entry]
    .sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
    .slice(0, KEEP_REPORTS);
  await fs.writeFile(INDEX_FILE, `${JSON.stringify(next, null, 2)}\n`, 'utf8');

  await pruneOldReports(new Set(next.map((e) => e.runId)));
  return file;
}

export async function readIndex(): Promise<ReportIndexEntry[]> {
  try {
    return JSON.parse(await fs.readFile(INDEX_FILE, 'utf8')) as ReportIndexEntry[];
  } catch {
    return [];
  }
}

export async function readReport(runId?: string): Promise<RunReport | null> {
  const id = runId ?? (await readIndex())[0]?.runId;
  if (!id) return null;
  try {
    return JSON.parse(await fs.readFile(path.join(REPORT_DIR, `${id}.json`), 'utf8')) as RunReport;
  } catch {
    return null;
  }
}

async function pruneOldReports(keep: Set<string>): Promise<void> {
  try {
    for (const file of await fs.readdir(REPORT_DIR)) {
      if (file === 'index.json' || !file.endsWith('.json')) continue;
      if (!keep.has(file.replace(/\.json$/, ''))) {
        await fs.unlink(path.join(REPORT_DIR, file));
      }
    }
  } catch {
    // Nothing to prune yet.
  }
}

/** Human-readable rendering, used by `npm run scrape:report` and CI logs. */
export function formatReport(report: RunReport): string {
  const lines: string[] = [];
  const mins = (report.durationMs / 60_000).toFixed(1);

  lines.push(`Scan report — ${report.date} (${report.runId})`);
  lines.push('='.repeat(56));
  lines.push(
    `${report.requests}/${report.requestLimit} requests · ${report.scanned} pages scanned · ` +
      `${report.unchanged} unchanged · ${mins} min`,
  );
  lines.push(
    `${report.added.length} added · ${report.changed.length} changed · ` +
      `${report.removed.length} removed · ${report.errors.length} errors`,
  );
  lines.push(`stopped: ${report.stoppedReason} · ${report.queuedForNextRun} page(s) queued for the next run`);
  lines.push('');

  for (const [vendorId, tally] of Object.entries(report.byVendor)) {
    lines.push(
      `  ${vendorId.padEnd(4)} ${String(tally.requests).padStart(3)} req · ` +
        `${tally.scanned} scanned · +${tally.added} / ~${tally.changed} / -${tally.removed}`,
    );
  }

  if (report.added.length) {
    lines.push('', `Added (${report.added.length})`, '-'.repeat(56));
    for (const item of report.added.slice(0, 40)) lines.push(`  + ${describe(item)}`);
    if (report.added.length > 40) lines.push(`  … and ${report.added.length - 40} more`);
  }

  if (report.changed.length) {
    lines.push('', `Changed (${report.changed.length})`, '-'.repeat(56));
    for (const item of report.changed.slice(0, 40)) {
      lines.push(`  ~ ${describe(item)}`);
      for (const field of item.fields ?? []) {
        lines.push(`      ${field.field}: ${short(field.from)} → ${short(field.to)}`);
      }
    }
    if (report.changed.length > 40) lines.push(`  … and ${report.changed.length - 40} more`);
  }

  if (report.removed.length) {
    lines.push('', `Removed (${report.removed.length})`, '-'.repeat(56));
    for (const item of report.removed) lines.push(`  - ${describe(item)}`);
  }

  if (report.errors.length) {
    lines.push('', `Errors (${report.errors.length})`, '-'.repeat(56));
    for (const err of report.errors.slice(0, 20)) lines.push(`  ! ${err.reason}: ${err.url}`);
  }

  return lines.join('\n');
}

function describe(item: ChangeRecord): string {
  const price = item.price !== null ? ` $${item.price.toFixed(2)}` : '';
  const engines = item.engineIds.length ? ` [${item.engineIds.join(', ')}]` : '';
  return `${item.vendorName}: ${item.name}${price}${engines}`;
}

function short(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.join('/') || '—';
  const text = String(value);
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}
