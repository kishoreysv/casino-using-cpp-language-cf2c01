/** Verify complete outcome presentation, live announcement, focus, and eligibility boundaries. */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RoundResult from './RoundResult.jsx';

const loss = { bet: 100, guess: 1, target: 10, outcome: 'loss', change: -100, balanceBefore: 1000, balanceAfter: 900 };

describe('RoundResult', () => {
  it('shows a focused win with signed change and no stake deduction', () => {
    render(<RoundResult round={{ ...loss, target: 1, outcome: 'win', change: 1000, balanceAfter: 2000 }} />);
    expect(screen.getByRole('heading', { name: 'Round result: Win' })).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('You matched the number.');
    expect(screen.getByRole('status')).toHaveTextContent('Balance change: +1,000 credits. Current balance: 2,000 credits.');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Balance change', { exact: true }).parentElement).toHaveTextContent('+1,000 credits');
    expect(screen.getByText('Target number').parentElement).toHaveTextContent('1');
    expect(screen.getByText('Your guess').parentElement).toHaveTextContent('1');
    expect(screen.getByText('Bet', { exact: true }).parentElement).toHaveTextContent('100 credits');
    expect(screen.getByText(/no stake was deducted/)).toBeInTheDocument();
    expect(screen.getByText(/eligible to continue/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it.each([0, 99, 100, 900])('shows loss arithmetic and correct eligibility at %i credits', (balanceAfter) => {
    render(<RoundResult round={{ ...loss, balanceBefore: balanceAfter + 100, balanceAfter }} />);
    expect(screen.getByRole('heading', { name: 'Round result: Loss' })).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('Your guess did not match.');
    expect(screen.getByRole('status')).toHaveTextContent(`Balance change: -100 credits. Current balance: ${balanceAfter} credits.`);
    expect(within(screen.getByText('Current balance', { exact: true }).parentElement).getByText(`${balanceAfter} credits`)).toBeVisible();
    expect(screen.getByText('Your guess').parentElement).toHaveTextContent('1');
    expect(screen.getByText('Target number').parentElement).toHaveTextContent('10');
    expect(screen.getByText(/subtracts your bet, once/)).toBeVisible();
    expect(screen.getByText(balanceAfter < 100 ? /cannot continue/ : /eligible to continue/)).toBeVisible();
    expect(screen.getByText(/This round is locked/)).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
