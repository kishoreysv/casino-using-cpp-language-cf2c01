/** Exercise field feedback, correction, safe display and setup-to-ready wiring. */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SetupForm from './SetupForm.jsx';
import App from '../App.jsx';

describe('SetupForm', () => {
  it('labels required text inputs and uses numeric input mode without browser coercion', () => {
    render(<SetupForm onReady={vi.fn()} />);
    expect(screen.getByRole('form', { name: 'Player setup' })).toHaveAttribute('novalidate');
    const name = screen.getByRole('textbox', { name: 'Player name' });
    const credits = screen.getByRole('textbox', { name: 'Starting credits' });
    expect(name).toBeRequired();
    expect(credits).toBeRequired();
    expect(credits).toHaveAttribute('type', 'text');
    expect(credits).toHaveAttribute('inputmode', 'numeric');
    expect(name).toHaveAttribute('aria-invalid', 'false');
    expect(credits).toHaveAccessibleDescription(/Digits only/);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reports both empty fields, focuses the first error, and allows keyboard correction', async () => {
    const user = userEvent.setup();
    const onReady = vi.fn();
    render(<SetupForm onReady={onReady} />);
    await user.click(screen.getByRole('button', { name: 'Set up player' }));
    const name = screen.getByRole('textbox', { name: 'Player name' });
    const credits = screen.getByRole('textbox', { name: 'Starting credits' });
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(name).toHaveFocus();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription(/Enter a player name/);
    expect(credits).toHaveAttribute('aria-invalid', 'true');
    expect(credits).toHaveAccessibleDescription(/Enter digits only/);
    expect(onReady).not.toHaveBeenCalled();
    await user.type(name, '  Ada Lovelace  ');
    await user.tab();
    expect(credits).toHaveFocus();
    await user.type(credits, '100');
    await user.tab();
    await user.keyboard('{Enter}');
    expect(onReady).toHaveBeenCalledExactlyOnceWith({ name: 'Ada Lovelace', balance: 100 });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(['99', '100.0', '1e2', '-100', '9007199254740992', '100 '])(
    'rejects credits %s, preserves the valid name and permits correction', async (invalid) => {
      const user = userEvent.setup();
      const onReady = vi.fn();
      render(<SetupForm onReady={onReady} />);
      const name = screen.getByRole('textbox', { name: 'Player name' });
      const credits = screen.getByRole('textbox', { name: 'Starting credits' });
      await user.type(name, 'Mary  Jane');
      await user.type(credits, invalid);
      await user.click(screen.getByRole('button', { name: 'Set up player' }));
      expect(onReady).not.toHaveBeenCalled();
      expect(screen.getAllByRole('alert')).toHaveLength(1);
      expect(credits).toHaveFocus();
      expect(credits).toHaveValue(invalid);
      expect(name).toHaveValue('Mary  Jane');
      expect(name).toHaveAttribute('aria-invalid', 'false');
      await user.clear(credits);
      await user.type(credits, '250');
      await user.click(screen.getByRole('button', { name: 'Set up player' }));
      expect(onReady).toHaveBeenCalledExactlyOnceWith({ name: 'Mary  Jane', balance: 250 });
      expect(credits).toHaveAttribute('aria-invalid', 'false');
      expect(credits).toHaveAttribute('aria-describedby', 'balance-hint');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    }
  );

  it('preserves eligible credits when correcting a whitespace-only name', async () => {
    const user = userEvent.setup();
    const onReady = vi.fn();
    render(<SetupForm onReady={onReady} />);
    const name = screen.getByRole('textbox', { name: 'Player name' });
    const credits = screen.getByRole('textbox', { name: 'Starting credits' });
    await user.type(name, '   ');
    await user.type(credits, '9007199254740991');
    await user.click(screen.getByRole('button', { name: 'Set up player' }));
    expect(name).toHaveFocus();
    expect(credits).toHaveValue('9007199254740991');
    expect(credits).toHaveAttribute('aria-invalid', 'false');
    expect(onReady).not.toHaveBeenCalled();
    await user.clear(name);
    await user.type(name, '  Grace Hopper  ');
    await user.click(screen.getByRole('button', { name: 'Set up player' }));
    expect(onReady).toHaveBeenCalledExactlyOnceWith({ name: 'Grace Hopper', balance: Number.MAX_SAFE_INTEGER });
  });
});

describe('setup orchestration', () => {
  it('shows a focused ready summary, safely renders the name as text and keeps all rules', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const unsafeName = '<img src=x onerror=alert(1)>';
    expect(screen.getByRole('heading', { name: 'The rules, in plain sight' })).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Player name' }), `  ${unsafeName}  `);
    await user.type(screen.getByRole('textbox', { name: 'Starting credits' }), '1000');
    await user.click(screen.getByRole('button', { name: 'Set up player' }));
    expect(screen.getByRole('heading', { name: 'Ready to play' })).toHaveFocus();
    expect(screen.getByText(unsafeName)).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('1,000 credits')).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Player setup' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Bet/ })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Your guess' })).toHaveValue('');
    expect(screen.getByText('1–10')).toBeInTheDocument();
    expect(screen.getByText('adds 10 × your bet')).toBeInTheDocument();
    expect(screen.getByText(/with no stake deduction/)).toBeInTheDocument();
    expect(screen.getByText('subtracts your bet')).toBeInTheDocument();
    expect(screen.getByText(/when you choose to stop/)).toBeInTheDocument();
    expect(screen.getByText(/Fictional credits only/)).toBeInTheDocument();
  });
});
