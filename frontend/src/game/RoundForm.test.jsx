/** Exercise associated errors, preserved fields, correction, and exactly-once App wiring. */
import { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../App.jsx';
import RoundForm from './RoundForm.jsx';
import RoundResult from './RoundResult.jsx';
import { resolveRound } from './round.js';

const session = { phase: 'ready', player: { name: 'Ada', balance: 1000 }, round: null };

/** Enter setup through the same controls used by players. */
function setupApp() {
  fireEvent.change(screen.getByLabelText('Player name'), { target: { value: 'Ada' } });
  fireEvent.change(screen.getByLabelText('Starting credits'), { target: { value: '1000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Set up player' }));
}

/** Enter round values without invoking production outcome controls. */
function fillRound(bet = '100', guess = '1') {
  fireEvent.change(screen.getByLabelText('Bet credits'), { target: { value: bet } });
  fireEvent.change(screen.getByLabelText('Your guess'), { target: { value: guess } });
}

describe('RoundForm', () => {
  it('labels numeric-mode text fields and reports both empty inputs without submission', async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(<RoundForm session={session} onSubmit={submit} />);
    const bet = screen.getByLabelText('Bet credits');
    const guess = screen.getByLabelText('Your guess');
    for (const field of [bet, guess]) {
      expect(field).toBeRequired();
      expect(field).toHaveAttribute('type', 'text');
      expect(field).toHaveAttribute('inputmode', 'numeric');
      expect(field).toHaveAttribute('aria-invalid', 'false');
    }
    expect(screen.getByRole('form')).toHaveAttribute('novalidate');
    await user.click(screen.getByRole('button', { name: 'Submit guess' }));
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(bet).toHaveFocus();
    expect(bet).toHaveAccessibleDescription(/Enter a bet/);
    expect(guess).toHaveAccessibleDescription(/Enter a whole number/);
    expect(submit).not.toHaveBeenCalled();
  });
  it.each(['', '99', '1001', '1.5', '1e2', 'abc', '-100', '100 ', '9007199254740992']) (
    'preserves valid guess and focuses rejected bet %s, then allows correction', async (invalid) => {
      const user = userEvent.setup();
      const submit = vi.fn(() => ({ errors: {} }));
      render(<RoundForm session={session} onSubmit={submit} />);
      fillRound(invalid, '10');
      await user.click(screen.getByRole('button', { name: 'Submit guess' }));
      expect(submit).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Bet credits')).toHaveFocus();
      expect(screen.getByLabelText('Bet credits')).toHaveValue(invalid);
      expect(screen.getByLabelText('Your guess')).toHaveValue('10');
      expect(screen.getByLabelText('Your guess')).toHaveAttribute('aria-invalid', 'false');
      expect(screen.getAllByRole('alert')).toHaveLength(1);
      await user.clear(screen.getByLabelText('Bet credits'));
      await user.type(screen.getByLabelText('Bet credits'), '100');
      await user.keyboard('{Enter}');
      expect(submit).toHaveBeenCalledExactlyOnceWith('100', '10');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    }
  );
  it.each(['', '0', '11', '1.5', 'abc', '1 ', '9007199254740992']) (
    'preserves valid bet and focuses rejected guess %s', (guess) => {
      const submit = vi.fn();
      render(<RoundForm session={session} onSubmit={submit} />);
      fillRound('100', guess);
      fireEvent.submit(screen.getByRole('form'));
      expect(submit).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Your guess')).toHaveFocus();
      expect(screen.getByLabelText('Your guess')).toHaveAccessibleDescription(/Enter a whole number/);
      expect(screen.getByLabelText('Bet credits')).toHaveValue('100');
      expect(screen.getByLabelText('Bet credits')).toHaveAttribute('aria-invalid', 'false');
    }
  );
  it('shows prospective overflow as an associated bet error', () => {
    const submit = vi.fn();
    render(<RoundForm session={{ ...session, player: { ...session.player, balance: Number.MAX_SAFE_INTEGER } }} onSubmit={submit} />);
    fillRound();
    fireEvent.submit(screen.getByRole('form'));
    expect(screen.getByLabelText('Bet credits')).toHaveAccessibleDescription(/possible win would exceed/);
    expect(submit).not.toHaveBeenCalled();
  });
  it.each(['disabled', 'resolved'])('blocks a %s form even on programmatic submission', (mode) => {
    const submit = vi.fn();
    render(<RoundForm session={{ ...session, phase: mode === 'resolved' ? 'resolved' : 'ready' }} disabled={mode === 'disabled'} onSubmit={submit} />);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByLabelText('Bet credits')).toBeDisabled();
    expect(screen.getByLabelText('Your guess')).toBeDisabled();
    fireEvent.submit(screen.getByRole('form'));
    expect(submit).not.toHaveBeenCalled();
  });
  it.each(['result', 'session'])('displays and focuses owner %s errors without losing valid input', async (field) => {
    render(<RoundForm session={session} onSubmit={() => ({ errors: { [field]: 'Please correct this round.' } })} />);
    fillRound();
    fireEvent.submit(screen.getByRole('form'));
    expect(screen.getByRole('alert')).toHaveTextContent('Please correct this round.');
    await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
    expect(screen.getByLabelText('Bet credits')).toHaveValue('100');
    expect(screen.getByLabelText('Your guess')).toHaveValue('1');
  });
  it('submits a valid full-balance bet and displays the service result', () => {
    const submit = vi.fn((bet, guess) => resolveRound(session, bet, guess, () => 10));
    const view = render(<RoundForm session={session} onSubmit={submit} />);
    fillRound('1000', '10');
    fireEvent.submit(screen.getByRole('form'));
    expect(submit).toHaveBeenCalledExactlyOnceWith('1000', '10');
    const resolved = submit.mock.results[0].value.session;
    view.rerender(<RoundResult round={resolved.round} />);
    expect(screen.getByRole('status')).toHaveTextContent('Current balance: 11,000 credits');
  });
});

describe('App round wiring', () => {
  it('locks synchronous duplicate submits and draws once under StrictMode', () => {
    const crypto = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array) => {
      array[0] = 0;
      return array;
    });
    try {
      render(
        <StrictMode>
          <App />
        </StrictMode>
      );
      setupApp();
      expect(screen.getByRole('heading', { name: 'Ready to play' })).toHaveFocus();
      fillRound();
      const form = screen.getByRole('form');
      act(() => {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      expect(crypto).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('status')).toHaveTextContent('Current balance: 2,000 credits');
      expect(screen.getByRole('heading', { name: 'Round result: Win' })).toHaveFocus();
      expect(screen.queryByRole('form')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Submit guess' })).not.toBeInTheDocument();
      expect(screen.getByText('Ada')).toBeVisible();
      expect(screen.getByText(/Fictional credits only/)).toBeVisible();
    } finally {
      crypto.mockRestore();
    }
  });
  it('preserves balance on invalid fields and releases crypto-failure lock for a corrected retry', () => {
    const crypto = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(() => { throw new Error('unavailable'); });
    try {
      render(<App />);
      setupApp();
      fillRound('99', '1');
      fireEvent.submit(screen.getByRole('form'));
      expect(crypto).not.toHaveBeenCalled();
      expect(screen.getByText('1,000 credits')).toBeVisible();
      fillRound();
      fireEvent.submit(screen.getByRole('form'));
      expect(screen.getByRole('alert')).toHaveTextContent('Your balance is unchanged');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByText('1,000 credits')).toBeVisible();
      expect(screen.getByLabelText('Bet credits')).toHaveValue('100');
      crypto.mockImplementation((array) => { array[0] = 9; return array; });
      fireEvent.submit(screen.getByRole('form'));
      expect(screen.getByRole('status')).toHaveTextContent('Current balance: 900 credits');
      expect(crypto).toHaveBeenCalledTimes(2);
    } finally {
      crypto.mockRestore();
    }
  });
});
