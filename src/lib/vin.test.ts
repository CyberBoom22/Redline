/**
 * Run with `bun test`.
 *
 * Every VIN here is synthetic: the WMI/VDS portions are invented and the check
 * digit is computed to match, so no real vehicle is referenced.
 */
import { describe, expect, test } from 'bun:test';
import { computeCheckDigit, normalizeVin, validateVin } from './vin';

/**
 * Build a synthetic VIN whose check digit is correct by construction. The
 * weight at index 8 is 0, so whatever character occupies the check position in
 * the input contributes nothing to the sum and can be replaced freely.
 */
function synthesize(body: string): string {
  const digit = computeCheckDigit(body);
  return `${body.slice(0, 8)}${digit}${body.slice(9)}`;
}

const VALID = synthesize('WBA5R7C50KAJ12345');
const VALID_X = (() => {
  // Search for a synthetic VIN whose check character is X, to cover remainder 10.
  for (let i = 0; i < 4000; i++) {
    const candidate = synthesize(`WBA5R7C5${'0'}KAJ${String(10000 + i)}`);
    if (candidate[8] === 'X') return candidate;
  }
  return null;
})();

describe('normalizeVin', () => {
  test('trims and uppercases', () => {
    expect(normalizeVin('  wba5r7c50kaj12345 ')).toBe('WBA5R7C50KAJ12345');
  });
});

describe('hard rejections', () => {
  test('empty input', () => {
    const r = validateVin('');
    expect(r.ok).toBe(false);
    expect(r.normalized).toBeNull();
  });

  test('too short', () => {
    const r = validateVin('WBA5R7C50KAJ');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('17 characters');
  });

  test('too long', () => {
    const r = validateVin('WBA5R7C50KAJ123456789');
    expect(r.ok).toBe(false);
  });

  test.each(['I', 'O', 'Q'])('rejects the letter %s', (letter) => {
    const r = validateVin(`WBA5R7C50KAJ1234${letter}`);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('I, O or Q');
  });

  test('no rejection message echoes the VIN back', () => {
    const secret = 'WBA5R7C50KAJ1234I';
    const r = validateVin(secret);
    expect(r.error).not.toContain(secret);
    expect(r.error).not.toContain('KAJ');
  });
});

describe('check digit', () => {
  test('a correctly-constructed VIN passes', () => {
    const r = validateVin(VALID);
    expect(r.ok).toBe(true);
    expect(r.checkDigitOk).toBe(true);
    expect(r.warning).toBeNull();
  });

  test('remainder 10 renders as X', () => {
    expect(VALID_X).not.toBeNull();
    const r = validateVin(VALID_X as string);
    expect(r.normalized?.[8]).toBe('X');
    expect(r.checkDigitOk).toBe(true);
  });

  test('a wrong check digit is a soft warning, not a rejection', () => {
    // Flip the check digit to something else, keeping the rest intact.
    const wrongDigit = VALID[8] === '9' ? '8' : String(Number(VALID[8]) + 1);
    const tampered = `${VALID.slice(0, 8)}${wrongDigit}${VALID.slice(9)}`;
    const r = validateVin(tampered);
    expect(r.ok).toBe(true);              // still usable
    expect(r.normalized).toBe(tampered);  // still stored
    expect(r.checkDigitOk).toBe(false);
    expect(r.warning).toBeTruthy();
  });

  test('the warning does not echo the VIN', () => {
    const wrongDigit = VALID[8] === '9' ? '8' : String(Number(VALID[8]) + 1);
    const tampered = `${VALID.slice(0, 8)}${wrongDigit}${VALID.slice(9)}`;
    expect(validateVin(tampered).warning).not.toContain(tampered);
  });

  test('lowercase input is normalized before checking', () => {
    expect(validateVin(VALID.toLowerCase()).checkDigitOk).toBe(true);
  });
});
