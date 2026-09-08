/**
 * VIN validation (ISO 3779).
 *
 * A VIN ties to registration, title and insurance records, so it is treated as
 * personal data throughout: nothing here logs a VIN, and no message returned by
 * this module echoes the input back. Callers must not log it either.
 *
 * The check digit is a soft signal, not a gate. North American VINs must
 * satisfy it, but plenty of grey-market and non-US-market vehicles do not, and
 * refusing those would lock real owners out of their own cars. The result is
 * recorded on `vehicles.vin_check_ok` and surfaced as a warning.
 */

export interface VinResult {
  /** Passes the hard rules: 17 characters, no I, O or Q. Safe to store. */
  ok: boolean;
  /** Trimmed and uppercased. Null when the input fails the hard rules. */
  normalized: string | null;
  /** ISO 3779 check digit result, or null when it could not be computed. */
  checkDigitOk: boolean | null;
  /** Why the VIN was rejected outright. Never contains the VIN itself. */
  error: string | null;
  /** Advisory only — the VIN is still usable. Never contains the VIN itself. */
  warning: string | null;
}

/** I, O and Q are excluded from VINs to avoid confusion with 1 and 0. */
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

/** Letter values for the check-digit sum. I, O and Q have none by design. */
const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** Position 9 (index 8) carries the check digit. */
const CHECK_DIGIT_INDEX = 8;

export function normalizeVin(input: string): string {
  return input.trim().toUpperCase();
}

/**
 * Compute the ISO 3779 check character for an already-normalized VIN.
 * Returns null if any character has no transliteration value.
 */
export function computeCheckDigit(vin: string): string | null {
  let sum = 0;
  for (let i = 0; i < vin.length; i++) {
    const char = vin[i];
    const value = char >= '0' && char <= '9' ? Number(char) : TRANSLITERATION[char];
    if (value === undefined) return null;
    sum += value * WEIGHTS[i];
  }
  const remainder = sum % 11;
  return remainder === 10 ? 'X' : String(remainder);
}

export function validateVin(input: string): VinResult {
  const normalized = normalizeVin(input ?? '');

  if (normalized.length === 0) {
    return { ok: false, normalized: null, checkDigitOk: null, error: 'Enter a VIN.', warning: null };
  }
  if (normalized.length !== 17) {
    return {
      ok: false,
      normalized: null,
      checkDigitOk: null,
      // Length is stated, never the value itself.
      error: `A VIN is exactly 17 characters — this one has ${normalized.length}.`,
      warning: null,
    };
  }
  if (!VIN_PATTERN.test(normalized)) {
    return {
      ok: false,
      normalized: null,
      checkDigitOk: null,
      error: 'A VIN cannot contain the letters I, O or Q. Check for a mistyped 1 or 0.',
      warning: null,
    };
  }

  const expected = computeCheckDigit(normalized);
  const checkDigitOk = expected === null ? null : expected === normalized[CHECK_DIGIT_INDEX];

  return {
    ok: true,
    normalized,
    checkDigitOk,
    error: null,
    warning:
      checkDigitOk === false
        ? 'This VIN fails its check digit. That usually means a typo, though some ' +
          'imported and non-US-market vehicles legitimately fail it. Saved either way — ' +
          'worth a second look against your registration.'
        : null,
  };
}
