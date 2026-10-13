/** Specify round validation, safe arithmetic, uniform draws, and immutable transition guards. */
import { describe, expect, it, vi } from 'vitest';
import { drawTarget, resolveRound, validateRound } from './round.js';
import { MAX_BALANCE } from './setup.js';

const ready = (balance = 1000) => ({ phase: 'ready', player: { name: 'Ada', balance }, round: null });

/** Assert invalid input fails before RNG and preserves the complete session. */
function reject(session, bet, guess, field) {
  const original = structuredClone(session);
  const draw = vi.fn(() => 1);
  const result = resolveRound(session, bet, guess, draw);
  expect(result.session).toBeNull();
  expect(result.errors[field]).toEqual(expect.any(String));
  expect(draw).not.toHaveBeenCalled();
  expect(session).toEqual(original);
}

describe('round validation', () => {
  it.each([undefined, null, 100, true, {}, [], '', ' ', '100 ', '\n100', '100\n', '100.0', '1e2', 'abc', '+100', '-100', '١٠٠', '１００', '1,000', '9007199254740992', '9'.repeat(400)])(
    'rejects invalid bet syntax/type %j before drawing', (bet) => reject(ready(), bet, '1', 'bet')
  );
  it.each(['0', '99', '1001', String(MAX_BALANCE)])(
    'rejects bet range %s before drawing', (bet) => reject(ready(), bet, '1', 'bet')
  );
  it.each([undefined, null, 1, false, {}, [], '', ' ', '1 ', '1\n', '1.5', '1.0', '1e0', 'x', '-1', '+1', '１', '0', '11', '9007199254740992']) (
    'rejects invalid guess %j before drawing', (guess) => reject(ready(), '100', guess, 'guess')
  );
  it.each([null, undefined, {}, { phase: 'setup' }, { ...ready(), phase: 'resolved' }, { ...ready(), round: {} },
    { phase: 'ready', player: ready().player }, { ...ready(), player: null },
    ...[null, '', ' ', ' Ada ', 42].map((name) => ({ ...ready(), player: { name, balance: 1000 } })),
    ...[null, '1000', NaN, Infinity, -1, 0, 99, 100.5, MAX_BALANCE + 1].map((balance) => ready(balance))])(
    'rejects invalid or non-ready session %j without RNG', (session) => reject(session, '100', '1', 'session')
  );
  it('reports both fields and returns no partial valid fields', () => {
    expect(validateRound(ready(), '', '')).toEqual({
      errors: { bet: expect.any(String), guess: expect.any(String) }, bet: null, guess: null
    });
    expect(validateRound(ready(), '100', '')).toMatchObject({ bet: null, guess: null });
  });
  it('rejects prospective overflow even if a loss would be safe', () => {
    reject(ready(MAX_BALANCE), '100', '1', 'bet');
    reject(ready(MAX_BALANCE - 999), '100', '1', 'bet');
    reject(ready(MAX_BALANCE - 1000), '101', '1', 'bet');
  });
  it('allows an exact maximum prospective win using BigInt boundaries', () => {
    const result = resolveRound(ready(MAX_BALANCE - 1000), '100', '1', () => 1);
    expect(result.session.player.balance).toBe(MAX_BALANCE);
    expect(result.session.round.change).toBe(1000);
    expect(Number.isSafeInteger(result.session.player.balance)).toBe(true);
  });
  it('allows the greatest safe full-balance bet and rejects the next one', () => {
    const maxFullBet = Number(BigInt(MAX_BALANCE) / 11n);
    const result = resolveRound(ready(maxFullBet), String(maxFullBet), '10', () => 10);
    expect(result.session.player.balance).toBe(Number(11n * BigInt(maxFullBet)));
    reject(ready(maxFullBet + 1), String(maxFullBet + 1), '10', 'bet');
  });
});

describe('round resolution', () => {
  it.each([
    [1000, '100', '1', 1, 'win', 1000, 2000],
    [1000, '100', '1', 10, 'loss', -100, 900],
    [100, '100', '10', 1, 'loss', -100, 0],
    [1000, '1000', '10', 10, 'win', 10000, 11000],
    [1000, '1000', '1', 10, 'loss', -1000, 0],
    [100, '00100', '01', 1, 'win', 1000, 1100]
  ])('resolves balance %s bet %s guess %s target %s exactly once', (balance, bet, guess, target, outcome, change, after) => {
    const session = Object.freeze({ ...ready(balance), player: Object.freeze(ready(balance).player) });
    const draw = vi.fn(() => target);
    const result = resolveRound(session, bet, guess, draw);
    expect(result.errors).toEqual({});
    expect(result.session).toEqual({
      phase: 'resolved', player: { name: 'Ada', balance: after },
      round: { bet: Number(bet), guess: Number(guess), target, outcome, change, balanceBefore: balance, balanceAfter: after }
    });
    expect(session).toEqual(ready(balance));
    expect(result.session).not.toBe(session);
    expect(result.session.player).not.toBe(session.player);
    expect(draw).toHaveBeenCalledTimes(1);
    expect(resolveRound(result.session, bet, guess, draw)).toMatchObject({ session: null, errors: { session: expect.any(String) } });
    expect(draw).toHaveBeenCalledTimes(1);
  });
  it.each([0, 11, 1.5, '1', null, NaN])('handles invalid dependency target %j without mutation', (target) => {
    const session = ready();
    expect(resolveRound(session, '100', '1', () => target)).toMatchObject({ session: null, errors: { result: expect.any(String) } });
    expect(session).toEqual(ready());
  });
  it('reports crypto failure without mutation and permits a subsequent attempt', () => {
    const session = ready();
    const result = resolveRound(session, '100', '1', () => { throw new Error('Crypto failed'); });
    expect(result).toMatchObject({ session: null, errors: { result: expect.stringContaining('unchanged') } });
    expect(session).toEqual(ready());
    expect(resolveRound(session, '100', '1', () => 1).session.player.balance).toBe(2000);
  });
});

describe('uniform target draw', () => {
  it.each(Array.from({ length: 10 }, (_, index) => index))('maps accepted sample %i to its outcome', (sample) => {
    expect(drawTarget(() => sample)).toBe(sample + 1);
    expect(drawTarget(() => 4294967280 + sample)).toBe(sample + 1);
  });
  it('rejects all six biased tail samples before accepting the next sample', () => {
    const samples = [4294967290, 4294967291, 4294967292, 4294967293, 4294967294, 4294967295, 4294967289];
    const read = vi.fn(() => samples.shift());
    expect(drawTarget(read)).toBe(10);
    expect(read).toHaveBeenCalledTimes(7);
  });
  it.each([-1, 4294967296, 1.5, NaN, Infinity, '1', null, undefined])('rejects invalid unsigned sample %j', (sample) => {
    expect(() => drawTarget(() => sample)).toThrow('Invalid random sample');
  });
  it('propagates sampler failure', () => {
    expect(() => drawTarget(() => { throw new Error('unavailable'); })).toThrow('unavailable');
  });
  it('uses browser crypto in production and converts failures to result errors', () => {
    const crypto = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      expect(array).toBeInstanceOf(Uint32Array);
      array[0] = 9;
      return array;
    });
    try {
      expect(drawTarget()).toBe(10);
      expect(resolveRound(ready(), '100', '10').session.player.balance).toBe(2000);
      crypto.mockImplementation(() => { throw new Error('unavailable'); });
      expect(resolveRound(ready(), '100', '1')).toMatchObject({ session: null, errors: { result: expect.any(String) } });
    } finally {
      crypto.mockRestore();
    }
  });
});
