/** Keep continuation and completion pure, guarded, and independent of random draws. */
import { MIN_BALANCE, parsePlayerName } from './setup.js';

/**
 * Check a resolved or ended session, including consistent safe round arithmetic.
 * @param {unknown} session - Candidate state from the session owner.
 * @returns {boolean} Whether the completed round and player agree.
 */
function isCompletedSession(session) {
  if (!session || !['resolved', 'ended'].includes(session.phase)) return false;
  const { player, round } = session;
  if (!player || typeof player.name !== 'string' || parsePlayerName(player.name) !== player.name
    || !Number.isSafeInteger(player.balance) || player.balance < 0 || !round) return false;
  const { bet, guess, target, outcome, change, balanceBefore, balanceAfter } = round;
  if (![bet, guess, target, change, balanceBefore, balanceAfter].every(Number.isSafeInteger)
    || bet < MIN_BALANCE || bet > balanceBefore || balanceBefore < MIN_BALANCE
    || balanceAfter < 0 || balanceAfter !== player.balance
    || guess < 1 || guess > 10 || target < 1 || target > 10) return false;
  const won = guess === target;
  return outcome === (won ? 'win' : 'loss')
    && change === (won ? 10 * bet : -bet)
    && Number.isSafeInteger(balanceBefore + 10 * bet)
    && balanceAfter === balanceBefore + change;
}

/**
 * Clear a valid eligible result without losing the player's name or current balance.
 * @param {unknown} session - Resolved session; ready/ended and duplicate requests are rejected.
 * @returns {Object|null} A fresh ready session, or null on invalid shape or transition.
 * Notes: Never mutates input and never draws a number.
 */
export function continueSession(session) {
  if (!isCompletedSession(session) || session.phase !== 'resolved'
    || session.player.balance < MIN_BALANCE) return null;
  return { phase: 'ready', player: { ...session.player }, round: null };
}

/**
 * End a completed round while retaining the player, final balance, and visible result.
 * @param {unknown} session - Valid resolved or already ended session.
 * @returns {Object|null} Ended state; repeated stops return the same state, invalid requests return null.
 * Notes: Never mutates input or invokes randomness.
 */
export function stopSession(session) {
  if (!isCompletedSession(session)) return null;
  if (session.phase === 'ended') return session;
  return { phase: 'ended', player: { ...session.player }, round: { ...session.round } };
}

/**
 * Discard all local session state, regardless of the prior phase.
 * @returns {null} The fresh setup state; no player or round survives.
 */
export function resetSession() {
  return null;
}
