/** Verify real keyboard setup and invalid-field correction on every configured device. */
import { test, expect } from '@playwright/test';

let browserErrors;

test.beforeEach(async ({ page }) => {
  browserErrors = [];
  // Attach before any navigation so startup failures cannot escape the assertion.
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    browserErrors.push(error.message);
  });
  await page.goto('./');
});

test.afterEach(() => {
  expect(browserErrors, 'No console errors or uncaught page errors').toEqual([]);
});

test('keyboard setup trims the name, shows the ready balance and preserves rules', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Number Guessing Game' })).toBeVisible();
  await expect(page.getByText(/Fictional credits only/)).toBeVisible();
  await page.keyboard.press('Tab');
  const name = page.getByRole('textbox', { name: 'Player name' });
  const credits = page.getByRole('textbox', { name: 'Starting credits' });
  await expect(name).toBeFocused();
  await page.keyboard.type('  Ada Lovelace  ');
  await page.keyboard.press('Tab');
  await expect(credits).toBeFocused();
  await page.keyboard.type('1000');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Set up player' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Ready to play' })).toBeFocused();
  await expect(page.getByText('Ada Lovelace', { exact: true })).toBeVisible();
  await expect(page.getByText('1,000 credits', { exact: true })).toBeVisible();
  await expect(page.getByText(/no bet has been placed/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The rules, in plain sight' })).toBeVisible();
  await expect(page.getByText('adds 10 × your bet', { exact: true })).toBeVisible();
  await expect(page.getByText(/with no stake deduction/)).toBeVisible();
  await expect(page.getByText('subtracts your bet', { exact: true })).toBeVisible();
  await expect(page.getByText(/Fictional credits only/)).toBeVisible();
});

test('invalid setup focuses errors and preserves good fields through correction', async ({ page }) => {
  const name = page.getByRole('textbox', { name: 'Player name' });
  const credits = page.getByRole('textbox', { name: 'Starting credits' });
  const submit = page.getByRole('button', { name: 'Set up player' });
  await name.fill('   ');
  await credits.fill('250');
  await submit.click();
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('alert')).toHaveText('Enter a player name.');
  await expect(credits).toHaveValue('250');
  await name.fill('  Mary Jane  ');
  await credits.fill('99');
  await submit.click();
  await expect(credits).toBeFocused();
  await expect(page.getByRole('alert')).toHaveText('Start with at least 100 credits.');
  await expect(name).toHaveValue('  Mary Jane  ');
  await expect(page.getByRole('heading', { name: 'Ready to play' })).toHaveCount(0);
  await credits.fill('1e2');
  await submit.click();
  await expect(page.getByRole('alert')).toHaveText(/Enter digits only/);
  await expect(credits).toHaveValue('1e2');
  await credits.fill('100');
  await credits.press('Enter');
  await expect(page.getByRole('heading', { name: 'Ready to play' })).toBeFocused();
  await expect(page.getByText('Mary Jane', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Ready to play' }).getByText('100 credits', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
