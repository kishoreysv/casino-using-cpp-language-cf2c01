/** Verify friendly completion, safe player text, balance edges, and restart interaction. */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Completion from './Completion.jsx';

describe('Completion', () => {
  it('shows normal final balance and focuses the accessible completion heading', async () => {
    const onRestart = vi.fn();
    render(<Completion player={{ name: 'Ada', balance: 1234 }} onRestart={onRestart} />);
    expect(screen.getByRole('heading', { name: 'Session complete' })).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('Thanks for playing, Ada!');
    expect(screen.getByRole('status')).toHaveTextContent('You chose to finish');
    expect(screen.getByText('Final balance')).toBeVisible();
    expect(screen.getByText('1,234 credits')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'New session' }));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it.each([0, 99, -1])('gives friendly exhausted feedback at %i credits without a Continue action', (balance) => {
    render(<Completion player={{ name: 'Sam', balance }} onRestart={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('fewer than 100 credits');
    expect(screen.getByRole('status')).toHaveTextContent('A fresh start is always here');
    expect(screen.getByText(`${balance} credits`)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New session' })).toBeEnabled();
  });

  it.each([100, Number.MAX_SAFE_INTEGER])('uses normal completion for eligible balance %i', (balance) => {
    render(<Completion player={{ name: 'Ada', balance }} onRestart={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('You chose to finish');
    expect(screen.getByText(`${balance.toLocaleString('en-US')} credits`)).toBeVisible();
  });

  it('renders markup-like names as text and restarts from the keyboard', async () => {
    const onRestart = vi.fn();
    const user = userEvent.setup();
    const name = '<img src=x onerror=alert(1)>';
    const { container } = render(<Completion player={{ name, balance: 100 }} onRestart={onRestart} />);
    expect(screen.getByRole('status')).toHaveTextContent(name);
    expect(container.querySelector('img')).toBeNull();
    await user.tab();
    expect(screen.getByRole('button', { name: 'New session' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});
