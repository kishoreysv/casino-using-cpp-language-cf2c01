# Number Guessing Game

A small browser adaptation of this repository's original C++ console game. All credits are fictional and have no monetary value. No accounts, backend, payments, tracking, external assets or persistence are involved. `main (1).cpp` remains unchanged as the reference implementation; the browser application is in `frontend/`.

## Run locally

Use Node.js 20.19+ (verified with Node 22) and npm.

```sh
cd frontend
npm ci --no-bin-links
npm run dev -- --host 0.0.0.0
```

Open the address printed by Vite. To serve the production build:

```sh
npm run build
npm run preview -- --host 0.0.0.0
```

Deploy the contents of `frontend/dist/` to a static host. The included `frontend/Dockerfile` builds the bundle and serves it with nginx on port 80; `nginx.conf` includes SPA fallback and no backend proxy. Container build was not part of browser/build verification. For Docker-capable environments: `docker build -t number-game frontend` then `docker run --rm -p 8080:80 number-game`.

## Play

1. Read the visible rules, enter a player name and starting credits (at least 100).
2. Bet a whole number of credits, at least 100 and no more than your balance. Guess from 1 through 10.
3. Submit once. A matching guess **adds 10 × the bet without subtracting the stake**. For example, 1,000 with a 100 bet becomes 2,000. A miss subtracts the bet, leaving 900 in that example.
4. See the guess, random target, credit change and updated balance. Continue explicitly for a fresh round or Stop to finish.
5. Below 100 credits the session ends automatically. Exactly 100 is still eligible. New session clears the previous player and credits; reload also starts fresh.

Inputs and prospective winnings must stay within JavaScript's exact safe-integer range: **0–9,007,199,254,740,991**. Only ASCII digit text is accepted for credits/bets/guesses (no fractions, signs, exponent syntax or spaces). Starting below 100 can be corrected before play. A bet whose potential win would exceed the maximum is rejected before drawing, even if the actual outcome might lose. At the maximum balance no legal bet fits; reload/new session permits choosing a smaller starting balance. Names are trimmed, multiword names are supported, and displayed names are escaped by React.

Targets use browser `crypto.getRandomValues` with rejection sampling to avoid modulo bias. There is no target selection control in production. If secure randomness is unavailable, the form explains the failure and keeps the balance unchanged. Host on HTTPS or localhost for browser secure APIs.

## Test

```sh
cd frontend
npm test
npm run build
node node_modules/@playwright/test/cli.js install --with-deps chromium
npm run test:e2e
```

Vitest exercises setup, round arithmetic/validation/randomness, session transitions, components and App wiring. Playwright starts a production preview automatically and runs real-random user journeys on desktop Chrome and a Pixel 7 viewport; no server or database is required. Do not start another preview on the configured test port. Ports/base URL can be overridden with `PLAYWRIGHT_PORT` and `PLAYWRIGHT_BASE_URL`; see `.env.example`. `VITE_BASE_PATH` controls build-time public path.

In the Ubuntu 26.04 sandbox, Playwright 1.51 required the compatibility variable `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64` for installation and test commands, plus the documented OS shared libraries. Invoke package entries with Node when npm bin links are disabled. Browser specs capture console errors and assert no horizontal overflow or clipped controls. Session specs attach screenshots, ARIA trees, rendered HTML, styles and geometry; use `--reporter=html,list` to retain successful attachments.

## Structure

- `frontend/src/game/setup.js` and `SetupForm.jsx`: setup validation and correction.
- `frontend/src/game/round.js`, `RoundForm.jsx`, `RoundResult.jsx`: exact accounting, unbiased target and locked result.
- `frontend/src/game/session.js`, `Completion.jsx`: guarded Continue/Stop/reset and final balance.
- `frontend/src/App.jsx`: local session orchestration; no persistent storage.
- Colocated `*.test.js`/`*.test.jsx` and `frontend/e2e/*.spec.js`: tests.

The original C++ builds with `g++ -std=c++17 'main (1).cpp' -o number-game-console`. Its original seed/input/overflow limitations remain in the reference; use the browser adaptation for the improved interaction. No data migration or breaking change to the console file is required.
