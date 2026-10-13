/** Validate player setup without coercion or changing the submitted fields. */
export const MIN_BALANCE = 100;
export const MAX_BALANCE = Number.MAX_SAFE_INTEGER;

/**
 * Parse only ASCII digit strings into nonnegative safe integers.
 * @param {unknown} input - Raw text from a numeric field; whitespace is invalid.
 * @returns {number|null} The exact integer, or null for invalid syntax or range.
 */
export function parseExactInteger(input) {
  if (typeof input !== 'string' || input.length === 0 || /[^0-9]/.test(input)) {
    return null;
  }
  const value = Number(input);
  return Number.isSafeInteger(value) ? value : null;
}

/**
 * Trim a nonempty player name without collapsing internal spaces.
 * @param {unknown} input - Raw player name.
 * @returns {string|null} The trimmed name, or null when missing or not text.
 */
export function parsePlayerName(input) {
  if (typeof input !== 'string') {
    return null;
  }
  const name = input.trim();
  return name.length > 0 ? name : null;
}

/**
 * Validate both setup fields and return a player only when both are valid.
 * @param {unknown} nameInput - Raw player name.
 * @param {unknown} balanceInput - Raw starting-credit string.
 * @returns {{errors: {name?: string, balance?: string}, player: {name: string, balance: number}|null}}
 * Field errors with no partial player on failure, or the normalized player.
 */
export function validateSetup(nameInput, balanceInput) {
  const name = parsePlayerName(nameInput);
  const balance = parseExactInteger(balanceInput);
  const errors = {};

  if (name === null) {
    errors.name = 'Enter a player name.';
  }
  if (balance === null) {
    errors.balance = 'Enter digits only, up to 9,007,199,254,740,991 credits.';
  } else if (balance < MIN_BALANCE) {
    errors.balance = 'Start with at least 100 credits.';
  }

  return {
    errors,
    player: Object.keys(errors).length === 0 ? { name, balance } : null
  };
}
