/** Present a resolved round's complete arithmetic and continuation eligibility without actions. */
import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { MIN_BALANCE } from './setup.js';

/**
 * Announce and focus a resolved outcome while showing the stake, target, and balance together.
 * @param {{round: import('./round.js').Round}} props - Immutable resolved-round details.
 * @returns {JSX.Element} The result summary; continuation actions belong to the next session slice.
 */
export default function RoundResult({ round }) {
  const headingRef = useRef(null);
  const won = round.outcome === 'win';
  const eligible = round.balanceAfter >= MIN_BALANCE;
  const signedChange = `${round.change >= 0 ? '+' : '-'}${Math.abs(round.change).toLocaleString('en-US')}`;

  useEffect(() => {
    headingRef.current?.focus();
  }, [round]);

  return (
    <div onMouseDown={(event) => {
      // Keep result focus when the remaining click of a double-click lands here.
      if (event.detail > 1) event.preventDefault();
    }}>
      <h2 id="result-heading" ref={headingRef} tabIndex={-1}>Round result: {won ? 'Win' : 'Loss'}</h2>
      <p className="panel-copy" role="status" aria-live="polite" aria-atomic="true">
        {won ? 'You matched the number.' : 'Your guess did not match.'}
        {' '}Balance change: {signedChange} credits. Current balance: {round.balanceAfter.toLocaleString('en-US')} credits.
      </p>
      <dl className="player-summary">
        <div>
          <dt>Your guess</dt>
          <dd>{round.guess}</dd>
        </div>
        <div>
          <dt>Target number</dt>
          <dd>{round.target}</dd>
        </div>
        <div>
          <dt>Bet</dt>
          <dd>{round.bet.toLocaleString('en-US')} credits</dd>
        </div>
        <div>
          <dt>Balance change</dt>
          <dd>{signedChange} credits</dd>
        </div>
        <div>
          <dt>Current balance</dt>
          <dd className="balance">{round.balanceAfter.toLocaleString('en-US')} credits</dd>
        </div>
      </dl>
      <p className="ready-copy">
        {won ? 'A match adds 10 × your bet; no stake was deducted.' : 'A miss subtracts your bet, once.'}
      </p>
      <p className="ready-copy">
        {eligible
          ? 'You have at least 100 credits and are eligible to continue. This round is locked.'
          : 'Your balance is below 100 credits, so you cannot continue. This round is locked.'}
      </p>
    </div>
  );
}

RoundResult.propTypes = {
  round: PropTypes.shape({
    bet: PropTypes.number.isRequired,
    guess: PropTypes.number.isRequired,
    target: PropTypes.number.isRequired,
    outcome: PropTypes.oneOf(['win', 'loss']).isRequired,
    change: PropTypes.number.isRequired,
    balanceBefore: PropTypes.number.isRequired,
    balanceAfter: PropTypes.number.isRequired
  }).isRequired
};
