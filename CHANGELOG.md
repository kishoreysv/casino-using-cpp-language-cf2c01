# Changelog

## Browser adaptation — this development run

### Added
- A standalone Vite/React JavaScript application under `frontend/`, alongside the unchanged `main (1).cpp` reference.
- Setup with trimmed player names, exact whole-credit validation, minimum-balance correction, visible rules and fictional-credit terminology.
- Validated bets and guesses, uniformly selected secure random targets, and faithful original accounting: wins add ten times the bet without stake deduction; losses subtract the bet.
- A synchronous submission lock and an explicit Continue action to prevent duplicate resolution. Repeated mouse clicks on the newly rendered result preserve keyboard focus.
- Continue/Stop, automatic completion below 100, friendly final balance, and fresh setup on restart or reload. Session state remains browser-memory-only.
- Accessible labels, associated inline alerts, result announcements, focus movement, reduced-motion support and responsive warm-charcoal/amber styling.
- Safe-integer and prospective-win overflow guards up to 9,007,199,254,740,991 credits. Secure RNG failures leave the balance unchanged.
- Colocated Vitest logic/component tests and desktop/mobile Playwright journeys, including real random accounting, repeated clicks, long names, maximum-credit feedback and objective control/overflow geometry assertions.
- Pinned dependency manifests/lockfile, static nginx Docker packaging, environment template, `.gitignore`, and run/test instructions in `README.md`.

### Modified files
The run adds the frontend tier rather than modifying the console code. Shared frontend `App.jsx`, styles and feature tests were extended feature-by-feature for setup, round resolution and session completion. The result component and regression tests were subsequently corrected for double-click focus loss found by the browser suite. `frontend/e2e/session.spec.js` was extended following independent review to cover unclipped desktop/mobile states and numeric-limit journeys.

### Breaking changes and migration
No console behavior or source was removed or changed. No database or saved-session migration exists. Browser credits are fictional and reset on reload; they are not deposits, purchases or redeemable funds. Deploy `frontend/dist/` as static files, not the C++ executable. Browser exact-integer validation intentionally rejects malformed console-style input and prospective overflow before drawing.

### Verification and delivery caveat
Each feature was unit-tested and committed separately. The independent test critic passed at 1.00 with zero high-severity failures. Browser testing found and then verified the result-focus fix. The pipeline's graph refresh tool failed with `TypeError: detect() got an unexpected keyword argument 'gitignore'`; no fabricated graph is supplied. Full verification/publication evidence is reported separately in the stage test report and manifest.
