/** Orchestrate setup and exactly one round while keeping the rules visible. */
import { useEffect, useRef, useState } from 'react';
import SetupForm from './game/SetupForm.jsx';
import RoundForm from './game/RoundForm.jsx';
import RoundResult from './game/RoundResult.jsx';
import { resolveRound } from './game/round.js';

/**
 * Show setup, a ready form, or a locked resolved session without continuation actions.
 * @returns {JSX.Element} The game shell and persistent rules.
 */
export default function App() {
  const [session, setSession] = useState(null);
  const roundLock = useRef(false);
  const readyHeading = useRef(null);
  const player = session?.player;

  useEffect(() => {
    if (session?.phase === 'ready') {
      readyHeading.current?.focus();
    }
  }, [session?.phase]);

  /**
   * Adopt a valid setup player with an explicit ready session shape.
   * @param {{name: string, balance: number}} nextPlayer - Valid normalized setup.
   * @returns {void}
   */
  function handleReady(nextPlayer) {
    roundLock.current = false;
    setSession({ phase: 'ready', player: nextPlayer, round: null });
  }

  /**
   * Lock before any draw, releasing only on validation or crypto failure.
   * @param {string} bet - Raw stake text.
   * @param {string} guess - Raw guess text.
   * @returns {{errors: Object<string, string>, session?: Object|null}} Resolution feedback for the form.
   */
  function handleRound(bet, guess) {
    if (roundLock.current) {
      return { errors: { session: 'This round has already been submitted.' } };
    }
    roundLock.current = true;
    const result = resolveRound(session, bet, guess);
    if (result.session) {
      setSession(result.session);
    } else {
      roundLock.current = false;
    }
    return result;
  }

  return (
    <main className="game-shell">
      <header className="game-intro">
        <p className="eyebrow">A little luck. A simple guess.</p>
        <h1>Number Guessing Game</h1>
        <p className="intro-copy">Ten numbers. One match. Your own fictional credits.</p>
      </header>
      <div className="game-layout">
        <section className="game-panel" aria-labelledby={player ? (session.phase === 'resolved' ? 'result-heading' : 'ready-heading') : 'setup-heading'}>
          {player ? (
            <>
              <p className="eyebrow">{session.phase === 'ready' ? 'Place your guess' : 'Round complete'}</p>
              {session.phase === 'ready' && (
                <h2 id="ready-heading" ref={readyHeading} tabIndex={-1}>Ready to play</h2>
              )}
              <dl className="player-summary">
                <div>
                  <dt>Player</dt>
                  <dd>{player.name}</dd>
                </div>
                <div>
                  <dt>Current balance</dt>
                  <dd className="balance">{player.balance.toLocaleString('en-US')} credits</dd>
                </div>
              </dl>
              {session.phase === 'ready' ? (
                <RoundForm session={session} onSubmit={handleRound} />
              ) : (
                <RoundResult round={session.round} />
              )}
            </>
          ) : (
            <>
              <p className="eyebrow">Before your first guess</p>
              <h2 id="setup-heading">Make it your game</h2>
              <p className="panel-copy">Choose a player name and start with at least 100 credits.</p>
              <SetupForm onReady={handleReady} />
            </>
          )}
        </section>
        <aside className="rules" aria-labelledby="rules-heading">
          <h2 id="rules-heading">The rules, in plain sight</h2>
          <ol>
            <li>Guess a whole number from <strong>1–10</strong>.</li>
            <li>You need at least <strong>100 credits</strong> to start or continue. Each bet must be at least 100 and no more than your balance.</li>
            <li>A match <strong>adds 10 × your bet</strong> to your balance, with no stake deduction.</li>
            <li>A miss <strong>subtracts your bet</strong> from your balance.</li>
            <li>Play ends when your balance falls <strong>below 100</strong>, or when you choose to stop.</li>
          </ol>
          <p className="disclaimer">Fictional credits only. No real money, payments or prizes.</p>
          <p className="local-note">Nothing is saved. Reloading this page clears your player and balance.</p>
        </aside>
      </div>
    </main>
  );
}
