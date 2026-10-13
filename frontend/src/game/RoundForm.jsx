/** Collect a stake and guess with local validation and associated correction feedback. */
import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { validateRound } from './round.js';

/**
 * Submit raw valid fields to the owner, which locks and resolves the round synchronously.
 * @param {{session: Object, onSubmit: function, disabled?: boolean}} props - Ready session and resolution callback.
 * @returns {JSX.Element} The accessible round form; owner errors are shown without losing entries.
 */
export default function RoundForm({ session, onSubmit, disabled = false }) {
  const [bet, setBet] = useState('');
  const [guess, setGuess] = useState('');
  const [errors, setErrors] = useState({});
  const betRef = useRef(null);
  const guessRef = useRef(null);
  const resultRef = useRef(null);
  const locked = disabled || session.phase !== 'ready';

  /**
   * Prevent invalid or locked submission and focus the first correction without clearing fields.
   * @param {import('react').FormEvent<HTMLFormElement>} event - Native form submission.
   * @returns {void}
   */
  function handleSubmit(event) {
    event.preventDefault();
    if (locked) {
      return;
    }
    let feedback = validateRound(session, bet, guess).errors;
    if (Object.keys(feedback).length === 0) {
      feedback = onSubmit(bet, guess)?.errors ?? {};
    }
    setErrors(feedback);
    if (feedback.bet) {
      betRef.current?.focus();
    } else if (feedback.guess) {
      guessRef.current?.focus();
    } else if (feedback.result || feedback.session) {
      // The alert is mounted after this event; queue focus after React's commit.
      setTimeout(() => resultRef.current?.focus(), 0);
    }
  }

  return (
    <form className="setup-form" onSubmit={handleSubmit} noValidate aria-label="Place a round">
      <div className="field">
        <label htmlFor="round-bet">Bet credits</label>
        <input
          ref={betRef}
          id="round-bet"
          name="bet"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required
          aria-required="true"
          disabled={locked}
          aria-invalid={Boolean(errors.bet)}
          aria-describedby={errors.bet ? 'bet-hint bet-error' : 'bet-hint'}
          value={bet}
          onChange={(event) => setBet(event.target.value)}
        />
        <p id="bet-hint" className="field-hint">Digits only. Bet at least 100 and no more than your balance.</p>
        {errors.bet && (
          <p id="bet-error" className="field-error" role="alert">
            {errors.bet}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor="round-guess">Your guess</label>
        <input
          ref={guessRef}
          id="round-guess"
          name="guess"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required
          aria-required="true"
          disabled={locked}
          aria-invalid={Boolean(errors.guess)}
          aria-describedby={errors.guess ? 'guess-hint guess-error' : 'guess-hint'}
          value={guess}
          onChange={(event) => setGuess(event.target.value)}
        />
        <p id="guess-hint" className="field-hint">Choose a whole number from 1 to 10. No spaces or decimals.</p>
        {errors.guess && (
          <p id="guess-error" className="field-error" role="alert">
            {errors.guess}
          </p>
        )}
      </div>
      {(errors.result || errors.session) && (
        <p ref={resultRef} className="field-error" role="alert" tabIndex={-1}>
          {errors.result || errors.session}
        </p>
      )}
      <button className="primary-button" type="submit" disabled={locked}>Submit guess</button>
    </form>
  );
}

RoundForm.propTypes = {
  session: PropTypes.shape({
    phase: PropTypes.string.isRequired,
    player: PropTypes.shape({ name: PropTypes.string.isRequired, balance: PropTypes.number.isRequired }).isRequired,
    round: PropTypes.object
  }).isRequired,
  onSubmit: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};
