/** Exercise the real session UI and logic with controlled browser crypto only in unit tests. */
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

let cryptoDraw;
beforeEach(() => {
  cryptoDraw = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((sample) => {
    sample[0] = 1; // target 2: guessing 1 loses.
    return sample;
  });
});
afterEach(() => vi.restoreAllMocks());

/** Start a real App session through the visible setup form. */
async function start(user, balance = '1000', name = 'Ada') {
  await user.type(screen.getByLabelText('Player name'), name);
  await user.type(screen.getByLabelText('Starting credits'), balance);
  await user.click(screen.getByRole('button', { name: 'Set up player' }));
  expect(screen.getByRole('heading', { name: 'Ready to play' })).toHaveFocus();
}

/** Resolve using the actual round form and the production resolver. */
async function submit(user, bet = '100', guess = '1') {
  await user.type(screen.getByLabelText('Bet credits'), bet);
  await user.type(screen.getByLabelText('Your guess'), guess);
  await user.click(screen.getByRole('button', { name: 'Submit guess' }));
}

/** Read a named balance summary rather than matching repeated result text. */
function balance(label = 'Current balance') {
  return screen.getAllByText(label).map((dt) => dt.parentElement.querySelector('dd').textContent);
}

describe('App sessions', () => {
  it('rejects invalid setup without a draw and permits correction with trimmed identity', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Set up player' }));
    expect(screen.getByLabelText('Player name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Player name')).toHaveFocus();
    await user.type(screen.getByLabelText('Player name'), ' Ada ');
    await user.type(screen.getByLabelText('Starting credits'), '99');
    await user.click(screen.getByRole('button', { name: 'Set up player' }));
    expect(screen.getByLabelText('Starting credits')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('form', { name: 'Place a round' })).not.toBeInTheDocument();
    expect(cryptoDraw).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText('Starting credits'));
    await user.type(screen.getByLabelText('Starting credits'), '1000');
    await user.click(screen.getByRole('button', { name: 'Set up player' }));
    expect(screen.getByText('Ada')).toBeVisible();
    expect(balance()).toEqual(['1,000 credits']);
  });

  it.each([['99', '1', 'Bet credits'], ['1001', '1', 'Bet credits'], ['100', '11', 'Your guess'], ['100', '1.5', 'Your guess']])(
    'preserves inputs and balance without drawing for invalid bet %s / guess %s', async (bet, guess, field) => {
      const user = userEvent.setup();
      render(<App />);
      await start(user);
      await submit(user, bet, guess);
      expect(screen.getByLabelText(field)).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText(field)).toHaveFocus();
      expect(screen.getByLabelText('Bet credits')).toHaveValue(bet);
      expect(screen.getByLabelText('Your guess')).toHaveValue(guess);
      expect(balance()).toEqual(['1,000 credits']);
      expect(cryptoDraw).not.toHaveBeenCalled();
      expect(screen.queryByRole('heading', { name: /Round result/ })).not.toBeInTheDocument();
    }
  );

  it.each([['1', 'Loss', '900 credits', '-100 credits'], ['2', 'Win', '2,000 credits', '+1,000 credits']])(
    'shows complete %s result, stops without drawing, and retains final balance', async (guess, outcome, final, change) => {
      const user = userEvent.setup();
      render(<App />);
      await start(user);
      await submit(user, '100', guess);
      expect(screen.getByRole('heading', { name: `Round result: ${outcome}` })).toBeVisible();
      expect(screen.getByText('Target number').parentElement).toHaveTextContent('2');
      expect(screen.getByText('Balance change').parentElement).toHaveTextContent(change);
      expect(balance()).toEqual([final, final]);
      expect(cryptoDraw).toHaveBeenCalledTimes(1);
      await user.click(screen.getByRole('button', { name: 'Stop' }));
      expect(screen.getByRole('heading', { name: 'Session complete' })).toHaveFocus();
      expect(balance('Final balance')).toEqual([final]);
      expect(screen.getByText(/Thanks for playing, Ada!/)).toBeVisible();
      expect(screen.getByRole('heading', { name: `Round result: ${outcome}` })).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
      expect(screen.queryByRole('form', { name: 'Place a round' })).not.toBeInTheDocument();
      expect(cryptoDraw).toHaveBeenCalledTimes(1);
    }
  );

  it('permits exactly 100, clears both inputs on Continue, and resolves a second round with a reset lock', async () => {
    const user = userEvent.setup();
    render(<App />);
    await start(user, '200');
    await submit(user);
    expect(balance()).toEqual(['100 credits', '100 credits']);
    expect(screen.queryByRole('heading', { name: 'Session complete' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: 'Ready to play' })).toHaveFocus();
    expect(screen.getByLabelText('Bet credits')).toHaveValue('');
    expect(screen.getByLabelText('Your guess')).toHaveValue('');
    expect(screen.getByText('Ada')).toBeVisible();
    expect(balance()).toEqual(['100 credits']);
    expect(screen.queryByRole('heading', { name: /Round result/ })).not.toBeInTheDocument();
    expect(cryptoDraw).toHaveBeenCalledTimes(1);
    await submit(user, '100', '2');
    expect(screen.getByRole('heading', { name: 'Round result: Win' })).toBeVisible();
    expect(balance()).toEqual(['1,100 credits', '1,100 credits']);
    expect(cryptoDraw).toHaveBeenCalledTimes(2);
  });

  it.each([['100', '0 credits'], ['199', '99 credits']])(
    'automatically ends below 100 from starting %s and keeps the loss result visible', async (starting, final) => {
      const user = userEvent.setup();
      render(<App />);
      await start(user, starting);
      await submit(user);
      expect(screen.getByRole('heading', { name: 'Round result: Loss' })).toBeVisible();
      expect(screen.getByText('Target number').parentElement).toHaveTextContent('2');
      expect(screen.getByText(/Your balance is below 100 credits/)).toBeVisible();
      expect(screen.getByRole('heading', { name: 'Session complete' })).toBeVisible();
      expect(balance('Final balance')).toEqual([final]);
      expect(screen.getByText(/A fresh start is always here/)).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Submit guess' })).not.toBeInTheDocument();
      expect(cryptoDraw).toHaveBeenCalledTimes(1);
    }
  );

  it('restarts into empty focused setup, discards old identity and errors, and plays as a new player', async () => {
    const user = userEvent.setup();
    render(<App />);
    await start(user);
    await submit(user);
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    await user.click(screen.getByRole('button', { name: 'New session' }));
    expect(screen.getByLabelText('Player name')).toHaveValue('');
    expect(screen.getByLabelText('Player name')).toHaveFocus();
    expect(screen.getByLabelText('Starting credits')).toHaveValue('');
    expect(screen.queryByText('Ada')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Round result|Session complete/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await start(user, '500', 'Bea');
    await submit(user, '100', '2');
    expect(screen.getByText('Bea')).toBeVisible();
    expect(balance()).toEqual(['1,500 credits', '1,500 credits']);
    expect(cryptoDraw).toHaveBeenCalledTimes(2);
  });

  it('recovers from crypto failure without losing inputs or balance and releases the failed draw lock', async () => {
    cryptoDraw.mockImplementationOnce(() => { throw new Error('Crypto unavailable'); });
    const user = userEvent.setup();
    render(<App />);
    await start(user);
    await submit(user);
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to draw a number securely');
    expect(screen.getByLabelText('Bet credits')).toHaveValue('100');
    expect(screen.getByLabelText('Your guess')).toHaveValue('1');
    expect(balance()).toEqual(['1,000 credits']);
    await user.click(screen.getByRole('button', { name: 'Submit guess' }));
    expect(screen.getByRole('heading', { name: 'Round result: Loss' })).toBeVisible();
    expect(balance()).toEqual(['900 credits', '900 credits']);
    expect(cryptoDraw).toHaveBeenCalledTimes(2);
  });

  it('guards two rapid native submits before render under StrictMode with one draw and one debit', async () => {
    const user = userEvent.setup();
    render(<StrictMode><App /></StrictMode>);
    await start(user);
    await user.type(screen.getByLabelText('Bet credits'), '100');
    await user.type(screen.getByLabelText('Your guess'), '1');
    const form = screen.getByRole('form', { name: 'Place a round' });
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(cryptoDraw).toHaveBeenCalledTimes(1);
    expect(balance()).toEqual(['900 credits', '900 credits']);
    expect(screen.getByRole('heading', { name: 'Round result: Loss' })).toBeVisible();
    fireEvent.submit(form); // A stale detached form cannot resolve another round.
    expect(cryptoDraw).toHaveBeenCalledTimes(1);
    expect(within(screen.getByRole('main')).getByRole('button', { name: 'Continue' })).toBeEnabled();
  });
});
