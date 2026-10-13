/** Orchestrate setup-to-ready state while keeping the rules visible. */
import { useEffect, useRef, useState } from 'react';
import SetupForm from './game/SetupForm.jsx';

/**
 * Show player setup or a focused ready summary without implementing rounds.
 * @returns {JSX.Element} The game shell and persistent rules.
 */
export default function App() {
  const [player, setPlayer] = useState(null);
  const readyHeading = useRef(null);

  useEffect(() => {
    if (player) {
      readyHeading.current?.focus();
    }
  }, [player]);

  return (
    <main className="game-shell">
      <header className="game-intro">
        <p className="eyebrow">A little luck. A simple guess.</p>
        <h1>Number Guessing Game</h1>
        <p className="intro-copy">Ten numbers. One match. Your own fictional credits.</p>
      </header>
      <div className="game-layout">
        <section className="game-panel" aria-labelledby={player ? 'ready-heading' : 'setup-heading'}>
          {player ? (
            <>
              <p className="eyebrow">Setup complete</p>
              <h2 id="ready-heading" ref={readyHeading} tabIndex={-1}>Ready to play</h2>
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
              <p className="ready-copy">
                Your player is ready to play: your name and starting balance are set.
                This setup-only version stops here; no bet has been placed and no credits have changed.
              </p>
            </>
          ) : (
            <>
              <p className="eyebrow">Before your first guess</p>
              <h2 id="setup-heading">Make it your game</h2>
              <p className="panel-copy">Choose a player name and start with at least 100 credits.</p>
              <SetupForm onReady={setPlayer} />
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
