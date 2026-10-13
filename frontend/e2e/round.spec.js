/** Verify real random resolution, invalid-input preservation, and repeated-submit lock through the UI. */
import { test, expect } from '@playwright/test';

let browserErrors;

test.beforeEach(async ({ page }) => {
  browserErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.goto('./');
  await page.getByRole('textbox', { name: 'Player name' }).fill('Ada');
  await page.getByRole('textbox', { name: 'Starting credits' }).fill('1000');
  await page.getByRole('button', { name: 'Set up player' }).click();
});

test.afterEach(() => {
  expect(browserErrors, 'No console or uncaught page errors').toEqual([]);
});

test('real target determines exact arithmetic and a resolved round cannot submit again', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Bet credits' }).fill('100');
  await page.getByRole('textbox', { name: 'Your guess' }).fill('1');
  // Double-click is a real UI action, not an injected outcome or event handler.
  await page.getByRole('button', { name: 'Submit guess' }).dblclick();
  const targetRow = page.locator('dl div').filter({ has: page.getByText('Target number', { exact: true }) });
  const target = Number(await targetRow.locator('dd').innerText());
  expect(Number.isInteger(target)).toBe(true);
  expect(target).toBeGreaterThanOrEqual(1);
  expect(target).toBeLessThanOrEqual(10);
  const win = target === 1;
  const balance = win ? 2000 : 900;
  await expect(page.getByRole('heading', { name: `Round result: ${win ? 'Win' : 'Loss'}` })).toBeFocused();
  await expect(page.getByRole('status')).toHaveText(
    `${win ? 'You matched the number.' : 'Your guess did not match.'} Balance change: ${win ? '+1,000' : '-100'} credits. `
    + `Current balance: ${balance.toLocaleString('en-US')} credits.`
  );
  await expect(page.locator('dl div').filter({ has: page.getByText('Your guess', { exact: true }) }).locator('dd')).toHaveText('1');
  await expect(page.locator('dl div').filter({ has: page.getByText('Balance change', { exact: true }) }).locator('dd'))
    .toHaveText(`${win ? '+1,000' : '-100'} credits`);
  await expect(page.getByRole('button', { name: 'Submit guess' })).toHaveCount(0);
  await expect(page.getByRole('form', { name: 'Place a round' })).toHaveCount(0);
  const result = await page.getByRole('status').innerText();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText(result);
  await expect(page.getByText(/This round is locked/)).toBeVisible();
  await expect(page.getByText(/Fictional credits only/)).toBeVisible();
});

test('invalid bets and guesses preserve balance and entries until corrected through controls', async ({ page }) => {
  const bet = page.getByRole('textbox', { name: 'Bet credits' });
  const guess = page.getByRole('textbox', { name: 'Your guess' });
  const submit = page.getByRole('button', { name: 'Submit guess' });
  await guess.fill('10');
  for (const value of ['', '99', '1001', '100.5', 'abc', '9007199254740992']) {
    await bet.fill(value);
    await submit.click();
    await expect(bet).toBeFocused();
    await expect(bet).toHaveAttribute('aria-invalid', 'true');
    await expect(bet).toHaveValue(value);
    await expect(guess).toHaveValue('10');
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByText('1,000 credits', { exact: true })).toBeVisible();
  }
  await bet.fill('100');
  for (const value of ['', '0', '11', '1.5', 'x']) {
    await guess.fill(value);
    await submit.click();
    await expect(guess).toBeFocused();
    await expect(guess).toHaveAttribute('aria-invalid', 'true');
    await expect(bet).toHaveValue('100');
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByText('1,000 credits', { exact: true })).toBeVisible();
  }
  await guess.fill('10');
  await submit.click();
  const targetRow = page.locator('dl div').filter({ has: page.getByText('Target number', { exact: true }) });
  const target = Number(await targetRow.locator('dd').innerText());
  expect(target).toBeGreaterThanOrEqual(1);
  expect(target).toBeLessThanOrEqual(10);
  await expect(page.getByRole('status')).toContainText(`Current balance: ${target === 10 ? '2,000' : '900'} credits.`);
  await expect(page.getByRole('alert')).toHaveCount(0);
});
