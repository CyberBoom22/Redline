import { localDateKey, sanitizeRun, StoredDynoRun } from './dynoRuns';

/**
 * The guest dyno allowance: one logged run per calendar day, kept in this
 * browser only.
 *
 * This is a nudge toward creating an account, not a security control. A
 * visitor can reset it by clearing site data or opening a private window, and
 * that is accepted: nothing about a guest is stored server-side, and no IP
 * address or fingerprint is used to count them.
 *
 * Every read and write tolerates storage being unavailable (private modes,
 * blocked site data). Then the allowance simply lasts for the page session.
 */
export const GUEST_STORAGE_KEY = 'stage0.dyno.guest.v1';
export const GUEST_DAILY_LIMIT = 1;

export interface GuestDynoState {
  /** Calendar day (YYYY-MM-DD, visitor's time zone) of the last log, if any. */
  lastLoggedOn: string | null;
  /** How many runs were logged on that day. */
  loggedToday: number;
  /** Runs waiting to be moved into an account at sign-in. */
  runs: StoredDynoRun[];
}

export const EMPTY_GUEST_STATE: GuestDynoState = { lastLoggedOn: null, loggedToday: 0, runs: [] };

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readGuestState(storage: KeyValueStorage | null): GuestDynoState {
  if (!storage) return EMPTY_GUEST_STATE;
  try {
    const raw = storage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return EMPTY_GUEST_STATE;
    const parsed = JSON.parse(raw) as Partial<GuestDynoState>;
    const lastLoggedOn =
      typeof parsed.lastLoggedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.lastLoggedOn) ? parsed.lastLoggedOn : null;
    const loggedToday = Number.isInteger(parsed.loggedToday) ? Math.max(0, parsed.loggedToday as number) : 0;
    const runs = Array.isArray(parsed.runs)
      ? parsed.runs.map(sanitizeRun).filter((r): r is StoredDynoRun => r !== null).slice(0, 50)
      : [];
    return { lastLoggedOn, loggedToday: lastLoggedOn ? loggedToday : 0, runs };
  } catch {
    return EMPTY_GUEST_STATE;
  }
}

function write(storage: KeyValueStorage | null, state: GuestDynoState): void {
  if (!storage) return;
  try {
    storage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota or blocked storage: the in-memory state still applies this session.
  }
}

/** Runs a guest may still log today. */
export function guestRunsLeft(state: GuestDynoState, today: string = localDateKey()): number {
  const used = state.lastLoggedOn === today ? state.loggedToday : 0;
  return Math.max(0, GUEST_DAILY_LIMIT - used);
}

/** Record a guest run against today's allowance. Returns the new state. */
export function recordGuestRun(
  storage: KeyValueStorage | null,
  state: GuestDynoState,
  run: StoredDynoRun,
  today: string = localDateKey(),
): GuestDynoState {
  const loggedToday = (state.lastLoggedOn === today ? state.loggedToday : 0) + 1;
  const next: GuestDynoState = { lastLoggedOn: today, loggedToday, runs: [run, ...state.runs].slice(0, 50) };
  write(storage, next);
  return next;
}

/**
 * Hand the stored runs over (for moving into an account) and forget them.
 * Today's count is kept, so signing out does not hand back a fresh guest log.
 */
export function takeGuestRuns(storage: KeyValueStorage | null, state: GuestDynoState): [StoredDynoRun[], GuestDynoState] {
  const next = { ...state, runs: [] };
  write(storage, next);
  return [state.runs, next];
}

/** Put runs back after a failed move, so nothing a guest logged is lost. */
export function restoreGuestRuns(storage: KeyValueStorage | null, state: GuestDynoState, runs: StoredDynoRun[]): GuestDynoState {
  const next = { ...state, runs: [...runs, ...state.runs].slice(0, 50) };
  write(storage, next);
  return next;
}
