/** Orchestrate local rounds and session endings while keeping rules and outcomes visible. */
import { useEffect, useRef, useState } from 'react';
import SetupForm from './game/SetupForm.jsx';
import RoundForm from './game/RoundForm.jsx';
import RoundResult from './game/RoundResult.jsx';
import { resolveRound } from './game/round.js';
import Completion from './game/Completion.jsx';
import { continueSession, stopSession, resetSession } from './game/session.js';

/**
 * Show setup, fresh rounds, locked results, and friendly completion.
 * @returns {JSX.Element} The game shell and persistent rules.
 */
export default function App() {
  const [session, setSession] = useState(null);
  const roundLock = useRef(false);
  const readyHeading = useRef(null);
  const setupPanel = useRef(null);
  const focusSetup = useRef(false);
  const player = session?.player;
  const panelHeading = !player ? 'setup-heading'
    : session.phase === 'ready' ? 'ready-heading'
      : session.phase === 'ended' ? 'completion-heading' : 'result-heading';

  useEffect(() => {
    if (session?.phase === 'ready') {
      readyHeading.current?.focus();
    } else if (!session && focusSetup.current) {
      setupPanel.current?.querySelector('#player-name')?.focus();
      focusSetup.current = false;
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
      setSession(result.session.player.balance < 100
        ? stopSession(result.session) : result.session);
    } else {
      roundLock.current = false;
    }
    return result;
  }

  /** Continue only a valid result and release the lock for a newly mounted form. @returns {void} */
  function handleContinue() {
    const nextSession = continueSession(session);
    if (nextSession) {
      roundLock.current = false;
      setSession(nextSession);
    }
  }

  /** Retain the last result and balance without drawing. @returns {void} */
  function handleStop() {
    const nextSession = stopSession(session);
    if (nextSession) setSession(nextSession);
  }

  /** Discard the player, round, inputs, and lock, then focus fresh setup. @returns {void} */
  function handleRestart() {
    roundLock.current = false;
    focusSetup.current = true;
    setSession(resetSession());
  }

  return (
    <main className="game-shell">
      <header className="game-intro">
        <p className="eyebrow">A little luck. A simple guess.</p>
        <h1>Number Guessing Game</h1>
        <p className="intro-copy">Ten numbers. One match. Your own fictional credits.</p>
      </header>
      <div className="game-layout">
        <section
          ref={setupPanel}
          className="game-panel"
          aria-labelledby={panelHeading}
        >
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
                <>
                  <RoundResult round={session.round} />
                  {session.phase === 'resolved' && (
                    <div className="session-actions">
                      <button className="primary-button" type="button" onClick={handleContinue}>
                        Continue
                      </button>
                      <button className="secondary-button" type="button" onClick={handleStop}>
                        Stop
                      </button>
                    </div>
                  )}
                  {session.phase === 'ended' && (
                    <Completion player={player} onRestart={handleRestart} />
                  )}
                </>
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
