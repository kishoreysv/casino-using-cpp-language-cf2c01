/** Prove session transitions preserve valid state and reject malformed or duplicate requests. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { continueSession, resetSession, stopSession } from './session.js';

/** Build a consistent losing result at the requested final balance. */
function resolved(balance = 900) {
  return {
    phase: 'resolved', player: { name: 'Ada', balance },
    round: { bet: 100, guess: 1, target: 2, outcome: 'loss', change: -100,
      balanceBefore: balance + 100, balanceAfter: balance }
  };
}

afterEach(() => vi.restoreAllMocks());

describe('continueSession', () => {
  it.each([100, 101, 900])('continues at %i credits, retaining identity and discarding the round', (balance) => {
    const input = resolved(balance);
    const before = structuredClone(input);
    Object.freeze(input.player);
    Object.freeze(input.round);
    Object.freeze(input);
    const next = continueSession(input);
    expect(next).toEqual({ phase: 'ready', player: { name: 'Ada', balance }, round: null });
    expect(next).not.toBe(input);
    expect(next.player).not.toBe(input.player);
    expect(input).toEqual(before);
    expect(continueSession(next)).toBeNull();
  });

  it('retains winning arithmetic without recalculating or drawing', () => {
    const input = resolved(2000);
    input.round = { bet: 100, guess: 10, target: 10, outcome: 'win', change: 1000,
      balanceBefore: 1000, balanceAfter: 2000 };
    const draw = vi.spyOn(globalThis.crypto, 'getRandomValues');
    expect(continueSession(input).player.balance).toBe(2000);
    expect(stopSession(input).player.balance).toBe(2000);
    expect(resetSession(input)).toBeNull();
    expect(draw).not.toHaveBeenCalled();
  });

  it.each([0, 99])('rejects continuation below minimum at %i without mutation', (balance) => {
    const input = resolved(balance);
    const before = structuredClone(input);
    expect(continueSession(input)).toBeNull();
    expect(input).toEqual(before);
    expect(stopSession(input)).toEqual({ ...input, phase: 'ended' });
  });
});

describe('completed-state validation', () => {
  const invalid = [
    null, undefined, {}, [], 'resolved',
    { ...resolved(), phase: 'ready', round: null },
    { ...resolved(), phase: 'unknown' },
    { ...resolved(), player: null },
    { ...resolved(), player: { name: '', balance: 900 } },
    { ...resolved(), player: { name: ' Ada ', balance: 900 } },
    { ...resolved(), player: { name: 3, balance: 900 } },
    ...[-1, NaN, Infinity, 0.5, '900', Number.MAX_SAFE_INTEGER + 1].map((balance) => ({
      ...resolved(), player: { name: 'Ada', balance }
    })),
    { ...resolved(), round: null },
    { ...resolved(), round: {} },
    ...[
      { bet: 99 }, { bet: -100 }, { bet: 1001 }, { bet: Number.MAX_SAFE_INTEGER + 1 },
      { guess: 0 }, { guess: 11 }, { guess: 1.5 }, { target: 0 }, { target: 11 },
      { outcome: 'win' }, { outcome: 'unknown' }, { change: 100 }, { change: '-100' },
      { balanceBefore: -1 }, { balanceBefore: 99 }, { balanceAfter: 899 },
      { balanceAfter: -1 }, { balanceAfter: Number.MAX_SAFE_INTEGER + 1 }
    ].map((patch) => ({ ...resolved(), round: { ...resolved().round, ...patch } })),
    resolved(Number.MAX_SAFE_INTEGER - 100)
  ];
  it.each(invalid.map((input, index) => [index, input]))('fails closed for malformed state %i', (_, input) => {
    const before = structuredClone(input);
    expect(continueSession(input)).toBeNull();
    expect(stopSession(input)).toBeNull();
    expect(input).toEqual(before);
  });
});

describe('stopSession and resetSession', () => {
  it('stops immutably, retains all result details, and safely accepts duplicate stop', () => {
    const input = resolved();
    const before = structuredClone(input);
    Object.freeze(input.player);
    Object.freeze(input.round);
    Object.freeze(input);
    const ended = stopSession(input);
    expect(ended).toEqual({ ...before, phase: 'ended' });
    expect(ended).not.toBe(input);
    expect(ended.player).not.toBe(input.player);
    expect(ended.round).not.toBe(input.round);
    expect(stopSession(ended)).toBe(ended);
    expect(continueSession(ended)).toBeNull();
    expect(input).toEqual(before);
  });

  it.each([null, resolved(), stopSession(resolved()), { phase: 'ready', player: { name: 'Ada', balance: 100 }, round: null }, {}])(
    'resets any prior state to fresh null without mutation', (input) => {
      const before = structuredClone(input);
      expect(resetSession(input)).toBeNull();
      expect(resetSession(resetSession(input))).toBeNull();
      expect(input).toEqual(before);
    }
  );
});
