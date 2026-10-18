import { describe, expect, test } from 'bun:test';
import {
  EMPTY_GUEST_STATE, GUEST_STORAGE_KEY, guestRunsLeft, readGuestState, recordGuestRun, restoreGuestRuns, takeGuestRuns,
} from './guestDyno';
import { localDateKey, sanitizeRun, StoredDynoRun } from './dynoRuns';

const memory = () => {
  const map = new Map<string, string>();
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), map };
};

const run = sanitizeRun({ title: 'Stage 2 pull', engineId: 'b58_gen2', peakWhp: 480, peakWtq: 500, maxBoostPsi: 18 }) as StoredDynoRun;

describe('guest dyno allowance', () => {
  test('one run per calendar day', () => {
    const storage = memory();
    let state = readGuestState(storage);
    expect(guestRunsLeft(state, '2026-10-18')).toBe(1);
    state = recordGuestRun(storage, state, run, '2026-10-18');
    expect(guestRunsLeft(state, '2026-10-18')).toBe(0);
    expect(guestRunsLeft(readGuestState(storage), '2026-10-18')).toBe(0); // survives a reload
    expect(guestRunsLeft(state, '2026-10-19')).toBe(1); // resets the next day
  });

  test('works without storage for the page session', () => {
    let state = readGuestState(null);
    state = recordGuestRun(null, state, run, '2026-10-18');
    expect(guestRunsLeft(state, '2026-10-18')).toBe(0);
  });

  test('throwing storage is treated as unavailable', () => {
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(readGuestState(broken)).toEqual(EMPTY_GUEST_STATE);
    expect(() => recordGuestRun(broken, EMPTY_GUEST_STATE, run, '2026-10-18')).not.toThrow();
  });

  test('corrupt or hostile storage is cleaned on read', () => {
    const storage = memory();
    storage.setItem(GUEST_STORAGE_KEY, '{not json');
    expect(readGuestState(storage)).toEqual(EMPTY_GUEST_STATE);
    storage.setItem(
      GUEST_STORAGE_KEY,
      JSON.stringify({ lastLoggedOn: 'yesterday', loggedToday: -3, runs: [{ title: '' }, { ...run, peakWhp: 1e9 }, 'x'] }),
    );
    const state = readGuestState(storage);
    expect(state.lastLoggedOn).toBeNull();
    expect(state.loggedToday).toBe(0);
    expect(state.runs).toHaveLength(1);
    expect(state.runs[0].peakWhp).toBe(3000);
  });

  test('moving runs into an account keeps today\'s count', () => {
    const storage = memory();
    let state = recordGuestRun(storage, EMPTY_GUEST_STATE, run, '2026-10-18');
    const [taken, after] = takeGuestRuns(storage, state);
    expect(taken).toHaveLength(1);
    expect(readGuestState(storage).runs).toHaveLength(0);
    expect(guestRunsLeft(after, '2026-10-18')).toBe(0);
    state = restoreGuestRuns(storage, after, taken);
    expect(readGuestState(storage).runs).toHaveLength(1);
  });
});

describe('sanitizeRun', () => {
  test('rejects runs without a title or a valid engine', () => {
    expect(sanitizeRun({ title: '  ', engineId: 'b58_gen2' })).toBeNull();
    expect(sanitizeRun({ title: 'x', engineId: 'DROP TABLE' })).toBeNull();
    expect(sanitizeRun(null)).toBeNull();
  });

  test('clamps numbers and trims text to the database limits', () => {
    const r = sanitizeRun({
      title: 't'.repeat(500), engineId: 'vq37vhr', peakWhp: -10, peakWtq: 'abc', maxBoostPsi: 250, notes: 'n'.repeat(5000),
      dynoType: 'Hamster Wheel',
    })!;
    expect(r.title).toHaveLength(120);
    expect(r.notes).toHaveLength(2000);
    expect(r.peakWhp).toBe(1);
    expect(r.peakWtq).toBe(1);
    expect(r.maxBoostPsi).toBe(99.9);
    expect(r.dynoType).toBe('Dynojet');
  });

  test('localDateKey uses the local calendar day', () => {
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
