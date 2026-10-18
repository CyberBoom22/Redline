import type { SupabaseClient } from '@supabase/supabase-js';
import { UserDynoRun } from '../types';

/**
 * A logged dyno run as stored, either in a guest's browser or in the member
 * `dyno_runs` table. Curve data points are not stored: they are derived from
 * the peaks whenever a run is displayed.
 */
export type StoredDynoRun = Omit<UserDynoRun, 'dataPoints'> & {
  engineId: string;
  vehicleLabel: string;
};

export const DYNO_TYPES: readonly UserDynoRun['dynoType'][] = ['Dynojet', 'Mustang Dyno', 'Mainline', 'Virtual Dyno'];

/** Limits shared by the form, browser storage and the dyno_runs CHECK constraints. */
export const DYNO_LIMITS = {
  title: 120,
  fuelType: 40,
  notes: 2000,
  vehicleLabel: 160,
  power: { min: 1, max: 3000 },
} as const;

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * Coerce anything that claims to be a run into one the database will accept,
 * or null when it is not salvageable. Used on form input, on runs read back
 * from browser storage (which the visitor can edit), and before every insert.
 */
export function sanitizeRun(input: unknown): StoredDynoRun | null {
  if (!input || typeof input !== 'object') return null;
  const r = input as Record<string, unknown>;
  const title = text(r.title, DYNO_LIMITS.title);
  const engineId = typeof r.engineId === 'string' && /^[a-z0-9_]{1,40}$/.test(r.engineId) ? r.engineId : null;
  if (!title || !engineId) return null;
  const { min, max } = DYNO_LIMITS.power;
  const boost = Math.round(Number(r.maxBoostPsi) * 10) / 10;
  return {
    id: typeof r.id === 'string' && r.id ? r.id.slice(0, 64) : `run_${Date.now()}`,
    date: isDate(r.date) ? r.date : localDateKey(),
    title,
    dynoType: DYNO_TYPES.includes(r.dynoType as UserDynoRun['dynoType']) ? (r.dynoType as UserDynoRun['dynoType']) : 'Dynojet',
    peakWhp: clampInt(r.peakWhp, min, max, min),
    peakWtq: clampInt(r.peakWtq, min, max, min),
    maxBoostPsi: Number.isFinite(boost) ? Math.min(99.9, Math.max(0, boost)) : 0,
    fuelType: text(r.fuelType, DYNO_LIMITS.fuelType),
    ambientTempF: clampInt(r.ambientTempF, -40, 150, 75),
    notes: text(r.notes, DYNO_LIMITS.notes),
    engineId,
    vehicleLabel: text(r.vehicleLabel, DYNO_LIMITS.vehicleLabel),
  };
}

/** Calendar date in the visitor's own time zone, as YYYY-MM-DD. */
export function localDateKey(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// ── dyno_runs table ─────────────────────────────────────────────────────────

interface DynoRunRow {
  id: string;
  engine_id: string;
  vehicle_label: string;
  run_date: string;
  title: string;
  dyno_type: string;
  peak_whp: number;
  peak_wtq: number;
  max_boost_psi: number | string;
  fuel_type: string;
  ambient_temp_f: number;
  notes: string;
}

const COLUMNS =
  'id, engine_id, vehicle_label, run_date, title, dyno_type, peak_whp, peak_wtq, max_boost_psi, fuel_type, ambient_temp_f, notes';

function fromRow(row: DynoRunRow): StoredDynoRun | null {
  return sanitizeRun({
    id: row.id,
    engineId: row.engine_id,
    vehicleLabel: row.vehicle_label,
    date: row.run_date,
    title: row.title,
    dynoType: row.dyno_type,
    peakWhp: row.peak_whp,
    peakWtq: row.peak_wtq,
    maxBoostPsi: Number(row.max_boost_psi),
    fuelType: row.fuel_type,
    ambientTempF: row.ambient_temp_f,
    notes: row.notes,
  });
}

/** Insert payload. id and user_id are assigned by the database. */
export function toInsertRow(run: StoredDynoRun) {
  return {
    engine_id: run.engineId,
    vehicle_label: run.vehicleLabel,
    run_date: run.date,
    title: run.title,
    dyno_type: run.dynoType,
    peak_whp: run.peakWhp,
    peak_wtq: run.peakWtq,
    max_boost_psi: run.maxBoostPsi,
    fuel_type: run.fuelType,
    ambient_temp_f: run.ambientTempF,
    notes: run.notes,
  };
}

/** The signed-in member's runs, newest first. RLS limits them to their own. */
export async function fetchMemberRuns(client: SupabaseClient): Promise<StoredDynoRun[]> {
  const { data, error } = await client
    .from('dyno_runs')
    .select(COLUMNS)
    .order('run_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as DynoRunRow[]).map(fromRow).filter((r): r is StoredDynoRun => r !== null);
}

export async function insertMemberRuns(client: SupabaseClient, runs: StoredDynoRun[]): Promise<StoredDynoRun[]> {
  if (runs.length === 0) return [];
  const { data, error } = await client.from('dyno_runs').insert(runs.map(toInsertRow)).select(COLUMNS);
  if (error) throw error;
  return ((data ?? []) as DynoRunRow[]).map(fromRow).filter((r): r is StoredDynoRun => r !== null);
}
