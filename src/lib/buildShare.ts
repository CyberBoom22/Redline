import { VehicleSelection } from '../types';
import { DEFAULT_VEHICLE, getGoalRange, PLATFORMS, TRANSMISSIONS } from '../data/platforms';
import { getPartsForEngine } from '../data/parts';
import { ALL_WARNINGS } from '../data/warnings';

/**
 * Build Card share links.
 *
 * A build is encoded into URL query parameters so that opening the link
 * restores the exact build. Everything decoded is validated against the
 * platform, parts and warnings data, because a link is untrusted input:
 * unknown IDs are dropped, out-of-range numbers are clamped, and anything that
 * cannot be repaired falls back to the defaults.
 *
 * The VIN is deliberately never encoded. It ties to registration, title and
 * insurance records and is treated as personal data (see README).
 */
export interface SharedBuild {
  vehicle: VehicleSelection;
  goalWhp: number;
  ownedPartIds: string[];
  acknowledgedWarningIds: string[];
}

const VERSION = '1';

const P = {
  version: 'v',
  platform: 'p',
  engine: 'e',
  chassis: 'c',
  trim: 't',
  transmission: 'tr',
  year: 'y',
  goal: 'g',
  owned: 'o',
  acknowledged: 'a',
} as const;

export function encodeBuild(build: SharedBuild): URLSearchParams {
  const { vehicle } = build;
  const params = new URLSearchParams();
  params.set(P.version, VERSION);
  params.set(P.platform, vehicle.platformId);
  params.set(P.engine, vehicle.engineId);
  params.set(P.chassis, vehicle.chassis);
  params.set(P.trim, vehicle.trim);
  params.set(P.transmission, vehicle.transmission);
  params.set(P.year, String(vehicle.year));
  params.set(P.goal, String(build.goalWhp));
  if (build.ownedPartIds.length) params.set(P.owned, build.ownedPartIds.join(','));
  if (build.acknowledgedWarningIds.length) params.set(P.acknowledged, build.acknowledgedWarningIds.join(','));
  return params;
}

/** True when the query carries a share link this app wrote. */
export function hasSharedBuild(params: URLSearchParams): boolean {
  return params.get(P.version) === VERSION && params.has(P.engine);
}

const list = (value: string | null) => (value ? value.split(',').filter(Boolean) : []);
const unique = (ids: string[]) => [...new Set(ids)];

/** Restore a build from a share link, or null when the link is absent or unusable. */
export function decodeBuild(params: URLSearchParams): SharedBuild | null {
  if (!hasSharedBuild(params)) return null;

  const platform = PLATFORMS.find((p) => p.id === params.get(P.platform));
  const engine = platform?.engines.find((e) => e.id === params.get(P.engine));
  if (!platform || !engine) return null;

  const chassis = params.get(P.chassis) ?? '';
  const trim = params.get(P.trim) ?? '';
  const transmission = params.get(P.transmission) ?? '';
  const year = Number(params.get(P.year));

  const vehicle: VehicleSelection = {
    platformId: platform.id,
    engineId: engine.id,
    chassis: engine.chassisList.includes(chassis) ? chassis : engine.chassisList[0],
    trim: engine.trims.includes(trim) ? trim : engine.trims[0],
    transmission: (TRANSMISSIONS as readonly string[]).includes(transmission)
      ? (transmission as VehicleSelection['transmission'])
      : DEFAULT_VEHICLE.transmission,
    year: Number.isInteger(year) && year >= 1990 && year <= 2100 ? year : DEFAULT_VEHICLE.year,
    vin: '',
  };

  const range = getGoalRange(engine.stockWhp);
  const rawGoal = params.has(P.goal) ? Number(params.get(P.goal)) : NaN;
  const goalWhp = Number.isFinite(rawGoal)
    ? Math.min(range.max, Math.max(range.min, Math.round(rawGoal / range.step) * range.step))
    : engine.stockWhp + 110;

  const partIds = new Set(getPartsForEngine(engine.id).map((p) => p.id));
  const warningIds = new Set(ALL_WARNINGS.filter((w) => w.engineId === engine.id).map((w) => w.id));

  return {
    vehicle,
    goalWhp,
    ownedPartIds: unique(list(params.get(P.owned)).filter((id) => partIds.has(id))),
    acknowledgedWarningIds: unique(list(params.get(P.acknowledged)).filter((id) => warningIds.has(id))),
  };
}

/** Remove share-link parameters, keeping any others. */
export function stripBuildParams(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  Object.values(P).forEach((key) => next.delete(key));
  return next;
}
