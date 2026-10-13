/** Collect local setup fields with associated feedback and predictable focus. */
import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { validateSetup } from './setup.js';

/**
 * Submit a normalized player only after both local fields pass validation.
 * @param {{onReady: function}} props - Callback receiving a valid player.
 * @returns {JSX.Element} The accessible setup form.
 */
export default function SetupForm({ onReady }) {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [errors, setErrors] = useState({});
  const nameRef = useRef(null);
  const balanceRef = useRef(null);

  /**
   * Keep valid inputs intact and focus the first failing field on submission.
   * @param {import('react').FormEvent<HTMLFormElement>} event - Submit event.
   * @returns {void}
   */
  function handleSubmit(event) {
    event.preventDefault();
    const result = validateSetup(name, balance);
    setErrors(result.errors);
    if (result.player) {
      onReady(result.player);
    } else {
      const firstField = result.errors.name ? nameRef : balanceRef;
      firstField.current?.focus();
    }
  }

  return (
    <form className="setup-form" onSubmit={handleSubmit} noValidate aria-label="Player setup">
      <div className="field">
        <label htmlFor="player-name">Player name</label>
        <input
          ref={nameRef}
          id="player-name"
          name="playerName"
          type="text"
          autoComplete="off"
          required
          aria-required="true"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'name-hint name-error' : 'name-hint'}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <p id="name-hint" className="field-hint">Use any name. It stays in this page only.</p>
        {errors.name && (
          <p id="name-error" className="field-error" role="alert">
            {errors.name}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor="starting-credits">Starting credits</label>
        <input
          ref={balanceRef}
          id="starting-credits"
          name="startingCredits"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required
          aria-required="true"
          aria-invalid={Boolean(errors.balance)}
          aria-describedby={errors.balance ? 'balance-hint balance-error' : 'balance-hint'}
          value={balance}
          onChange={(event) => setBalance(event.target.value)}
        />
        <p id="balance-hint" className="field-hint">
          Digits only, from 100 to 9,007,199,254,740,991. No commas or decimals.
        </p>
        {errors.balance && (
          <p id="balance-error" className="field-error" role="alert">
            {errors.balance}
          </p>
        )}
      </div>
      <button className="primary-button" type="submit">Set up player</button>
    </form>
  );
}

SetupForm.propTypes = {
  onReady: PropTypes.func.isRequired
};
