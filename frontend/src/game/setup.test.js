/** Specify exact parsing and all setup validation boundaries. */
import { describe, expect, it } from 'vitest';
import { MAX_BALANCE, MIN_BALANCE, parseExactInteger, parsePlayerName, validateSetup } from './setup.js';

describe('parseExactInteger', () => {
  it.each([
    ['0', 0], ['99', 99], ['100', 100], ['101', 101],
    ['000100', 100], ['9007199254740990', MAX_BALANCE - 1],
    ['9007199254740991', MAX_BALANCE]
  ])('parses %s exactly as %s', (input, expected) => {
    expect(parseExactInteger(input)).toBe(expected);
  });

  it.each([
    '', ' ', ' 100', '100 ', '\n100', '100\n', '1e2', '1E2',
    '100.0', '1.5', '-100', '-0', '+100', '1,000', '1_000', '0x64',
    'NaN', 'Infinity', '１２３', '١٠٠', '100abc', '1 00',
    '9007199254740992', '9007199254740993', '999999999999999999999999999999',
    undefined, null, 100, -100, NaN, Infinity, true, false, {}, [], ['100'], 100n
  ])('rejects invalid syntax, unsafe values or non-string input: %s', (input) => {
    expect(parseExactInteger(input)).toBeNull();
  });

  it('rejects an extremely large digit string rather than rounding it', () => {
    expect(parseExactInteger('9'.repeat(400))).toBeNull();
  });
});

describe('parsePlayerName', () => {
  it.each([
    ['Ada', 'Ada'], ['  Ada Lovelace  ', 'Ada Lovelace'],
    ['\tMary  Jane\n', 'Mary  Jane'], ['李 明', '李 明'],
    ['<script>alert(1)</script>', '<script>alert(1)</script>']
  ])('trims only the edges of %s', (input, expected) => {
    expect(parsePlayerName(input)).toBe(expected);
  });

  it.each(['', ' ', '\t\n', '\u00a0', undefined, null, 123, true, {}, [], ['Ada']])(
    'rejects missing or non-text names: %s', (input) => {
      expect(parsePlayerName(input)).toBeNull();
    }
  );
});

describe('validateSetup', () => {
  it.each(['100', '101', '9007199254740991'])('accepts eligible credits %s', (credits) => {
    expect(validateSetup('  Ada Lovelace  ', credits)).toEqual({
      errors: {}, player: { name: 'Ada Lovelace', balance: Number(credits) }
    });
  });

  it.each(['0', '1', '99'])('rejects below-minimum credits %s without creating a player', (credits) => {
    expect(validateSetup('Ada', credits)).toEqual({
      errors: { balance: 'Start with at least 100 credits.' }, player: null
    });
  });

  it('keeps the setup minimum at exactly 100', () => {
    expect(MIN_BALANCE).toBe(100);
    expect(MAX_BALANCE).toBe(Number.MAX_SAFE_INTEGER);
  });

  it.each(['1e2', '100.0', '-100', '9007199254740992', undefined, 100])(
    'reports invalid credits without accepting a partial player: %s', (credits) => {
      const result = validateSetup('Ada', credits);
      expect(result.player).toBeNull();
      expect(result.errors).toEqual({ balance: 'Enter digits only, up to 9,007,199,254,740,991 credits.' });
    }
  );

  it('reports both failures in one submission', () => {
    expect(validateSetup('  ', '')).toEqual({
      errors: {
        name: 'Enter a player name.',
        balance: 'Enter digits only, up to 9,007,199,254,740,991 credits.'
      },
      player: null
    });
  });

  it('rejects a missing name even with a valid balance', () => {
    expect(validateSetup(null, '100')).toEqual({
      errors: { name: 'Enter a player name.' }, player: null
    });
  });
});
