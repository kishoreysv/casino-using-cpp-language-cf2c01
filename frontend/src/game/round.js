/** Validate one round before drawing, then return an immutable resolved session. */
import { MAX_BALANCE, MIN_BALANCE, parseExactInteger, parsePlayerName } from './setup.js';

/**
 * @typedef {{name: string, balance: number}} Player
 * @typedef {{bet: number, guess: number, target: number, outcome: 'win'|'loss',
 * change: number, balanceBefore: number, balanceAfter: number}} Round
 * @typedef {{phase: 'ready'|'resolved', player: Player, round: Round|null}} Session
 */

/**
 * Check the session and both raw fields without drawing or changing input.
 * @param {Session|unknown} session - Ready sessions require a valid player and round: null.
 * @param {unknown} betInput - ASCII digit string containing the stake.
 * @param {unknown} guessInput - ASCII digit string containing a number from one to ten.
 * @returns {{errors: Object<string, string>, bet: number|null, guess: number|null}} Validated fields or errors.
 */
export function validateRound(session, betInput, guessInput) {
  const errors = {};
  const player = session?.player;
  if (session?.phase !== 'ready' || session?.round !== null
    || !player || parsePlayerName(player.name) !== player.name || typeof player.name !== 'string'
    || !Number.isSafeInteger(player.balance) || player.balance < MIN_BALANCE || player.balance > MAX_BALANCE) {
    return { errors: { session: 'This session is not ready for a round.' }, bet: null, guess: null };
  }

  const bet = parseExactInteger(betInput);
  const guess = parseExactInteger(guessInput);
  if (bet === null) {
    errors.bet = 'Enter a bet using digits only and a safe whole number.';
  } else if (bet < MIN_BALANCE) {
    errors.bet = 'Bet at least 100 credits and no more than your current balance. Your bet is below the minimum.';
  } else if (bet > player.balance) {
    errors.bet = 'Bet at least 100 credits and no more than your current balance. Your bet exceeds your balance.';
  } else if (BigInt(player.balance) + 10n * BigInt(bet) > BigInt(MAX_BALANCE)) {
    errors.bet = 'A possible win would exceed the safe credit limit. Choose a smaller bet.';
  }
  if (guess === null || guess < 1 || guess > 10) {
    errors.guess = 'Enter a whole number from 1 to 10 using digits only.';
  }
  const valid = Object.keys(errors).length === 0;
  return { errors, bet: valid ? bet : null, guess: valid ? guess : null };
}

/**
 * Read a cryptographically random browser unsigned integer; never fall back to weak randomness.
 * @returns {number} One unsigned 32-bit sample.
 * @throws {Error} When browser crypto is unavailable or fails.
 */
function browserUint32() {
  const sample = new Uint32Array(1);
  globalThis.crypto.getRandomValues(sample);
  return sample[0];
}

/**
 * Draw uniformly from one to ten by rejecting the six biased tail samples.
 * @param {function(): number} readUint32 - Optional unsigned sampler for unit tests only.
 * @returns {number} An unbiased target from one to ten.
 * @throws {Error} When the sampler fails or supplies an invalid unsigned integer.
 */
export function drawTarget(readUint32 = browserUint32) {
  let sample;
  do {
    sample = readUint32();
    if (!Number.isInteger(sample) || sample < 0 || sample > 4294967295) {
      throw new Error('Invalid random sample.');
    }
  } while (sample >= 4294967290);
  return sample % 10 + 1;
}

/**
 * Resolve only ready sessions, preserving all input objects on success and failure.
 * @param {Session|unknown} session - A ready session with no previous round.
 * @param {unknown} betInput - Raw stake text.
 * @param {unknown} guessInput - Raw guess text.
 * @param {function(): number} draw - Optional target dependency for unit tests only; App never supplies it.
 * @returns {{errors: Object<string, string>, session: Session|null}} A resolved session or correctable errors.
 * Notes: Winning adds 10 × bet without stake deduction. No RNG runs before all validation passes.
 */
export function resolveRound(session, betInput, guessInput, draw = drawTarget) {
  const { errors, bet, guess } = validateRound(session, betInput, guessInput);
  if (Object.keys(errors).length > 0) {
    return { errors, session: null };
  }
  let target;
  try {
    target = draw();
    if (!Number.isInteger(target) || target < 1 || target > 10) {
      throw new Error('Invalid target.');
    }
  } catch {
    return { errors: { result: 'Unable to draw a number securely. Your balance is unchanged. Please try again.' }, session: null };
  }
  const outcome = guess === target ? 'win' : 'loss';
  const change = outcome === 'win' ? bet * 10 : -bet;
  const balanceAfter = session.player.balance + change;
  return {
    errors: {},
    session: {
      ...session,
      phase: 'resolved',
      player: { ...session.player, balance: balanceAfter },
      round: { bet, guess, target, outcome, change, balanceBefore: session.player.balance, balanceAfter }
    }
  };
}
