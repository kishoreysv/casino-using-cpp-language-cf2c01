/** Offer a friendly ending and a fresh start without hiding the last round. */
import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * Show the final balance and keep the player's name as safe React text.
 * @param {{player: {name: string, balance: number}, onRestart: function}} props - Final player and reset action.
 * @returns {JSX.Element} Completion summary and keyboard-accessible restart button.
 */
export default function Completion({ player, onRestart }) {
  const headingRef = useRef(null);
  const exhausted = player.balance < 100;

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="completion">
      <h2 id="completion-heading" ref={headingRef} tabIndex={-1}>
        Session complete
      </h2>
      <p className="panel-copy" role="status" aria-live="polite">
        Thanks for playing, {player.name}!
        {' '}{exhausted
          ? 'You have fewer than 100 credits, so this session has ended. A fresh start is always here.'
          : 'You chose to finish. Come back for another guess whenever you like.'}
      </p>
      <dl className="player-summary">
        <div>
          <dt>Final balance</dt>
          <dd className="balance">{player.balance.toLocaleString('en-US')} credits</dd>
        </div>
      </dl>
      <button className="primary-button" type="button" onClick={onRestart}>
        New session
      </button>
    </div>
  );
}

Completion.propTypes = {
  player: PropTypes.shape({
    name: PropTypes.string.isRequired,
    balance: PropTypes.number.isRequired
  }).isRequired,
  onRestart: PropTypes.func.isRequired
};
