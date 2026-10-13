/** Verify real-RNG local sessions on the globally configured desktop and mobile projects. */
import { test, expect } from '@playwright/test';

const browserErrors = new WeakMap();
test.beforeEach(async ({ page }) => {
  const errors = [];
  browserErrors.set(page, errors);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  // Register both listeners before the first navigation.
  await page.goto('/');
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page), 'No browser console or page errors').toEqual([]);
});

/** Attach native browser evidence for human design review, not a separate scanner. */
async function attachState(page, testInfo, state) {
  await testInfo.attach(`${state}-screenshot`, {
    body: await page.screenshot({ fullPage: true }), contentType: 'image/png'
  });
  await testInfo.attach(`${state}-aria`, {
    body: await page.locator('main').ariaSnapshot(), contentType: 'text/plain'
  });
  await testInfo.attach(`${state}-html`, {
    body: await page.content(), contentType: 'text/html'
  });
  const styles = await page.locator('.game-panel').evaluate((panel) => {
    const style = getComputedStyle(panel);
    const heading = getComputedStyle(panel.querySelector('h2'));
    const button = getComputedStyle(panel.querySelector('button'));
    return {
      panel: { background: style.backgroundColor, color: style.color, padding: style.padding,
        radius: style.borderRadius, width: style.width },
      heading: { font: heading.fontFamily, size: heading.fontSize },
      button: { background: button.backgroundColor, color: button.color, minHeight: button.minHeight },
      viewport: { width: innerWidth, height: innerHeight }
    };
  });
  await testInfo.attach(`${state}-styles`, {
    body: JSON.stringify(styles, null, 2), contentType: 'application/json'
  });
}

/** Assert real arithmetic using the displayed target, never a controlled random source. */
async function checkResult(page, before, bet, guess) {
  const targetRow = page.locator('.player-summary div').filter({ has: page.getByText('Target number', { exact: true }) });
  const target = Number(await targetRow.locator('dd').innerText());
  expect(target).toBeGreaterThanOrEqual(1);
  expect(target).toBeLessThanOrEqual(10);
  const won = target === guess;
  const change = won ? bet * 10 : -bet;
  const after = before + change;
  await expect(page.getByRole('heading', { name: `Round result: ${won ? 'Win' : 'Loss'}` })).toBeVisible();
  const changeRow = page.locator('.player-summary div').filter({ has: page.getByText('Balance change', { exact: true }) });
  await expect(changeRow.locator('dd')).toHaveText(`${change > 0 ? '+' : '-'}${Math.abs(change).toLocaleString('en-US')} credits`);
  const balances = page.locator('.player-summary div').filter({ has: page.getByText('Current balance', { exact: true }) });
  await expect(balances).toHaveCount(2);
  for (const row of await balances.all()) {
    await expect(row.locator('dd')).toHaveText(`${after.toLocaleString('en-US')} credits`);
  }
  return after;
}

test('keyboard journey: validation, two real rounds, Continue, Stop, restart, and reload reset', async ({ page }, testInfo) => {
  await attachState(page, testInfo, 'setup');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Player name')).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Player name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Player name')).toBeFocused();
  await attachState(page, testInfo, 'setup-error');
  await page.keyboard.type('Ada');
  await page.keyboard.press('Tab');
  await page.keyboard.type('1000');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Ready to play' })).toBeFocused();
  await attachState(page, testInfo, 'ready');

  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Bet credits')).toBeFocused();
  await page.keyboard.type('99');
  await page.keyboard.press('Tab');
  await page.keyboard.type('1');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Bet credits')).toBeFocused();
  await expect(page.getByLabel('Bet credits')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Your guess')).toHaveValue('1');
  await expect(page.getByRole('heading', { name: 'Ready to play' })).toBeVisible();
  await attachState(page, testInfo, 'round-error');
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('100');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  const firstBalance = await checkResult(page, 1000, 100, 1);
  await attachState(page, testInfo, 'first-result');
  await expect(page.getByRole('heading', { name: /Round result:/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Continue' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Ready to play' })).toBeFocused();
  await expect(page.getByLabel('Bet credits')).toHaveValue('');
  await expect(page.getByLabel('Your guess')).toHaveValue('');
  await expect(page.getByText('Ada', { exact: true })).toBeVisible();
  await expect(page.locator('.balance')).toHaveText(`${firstBalance.toLocaleString('en-US')} credits`);
  await page.keyboard.press('Tab');
  await page.keyboard.type('100');
  await page.keyboard.press('Tab');
  await page.keyboard.type('1');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  const finalBalance = await checkResult(page, firstBalance, 100, 1);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Session complete' })).toBeFocused();
  const finalRow = page.locator('.player-summary div').filter({ has: page.getByText('Final balance', { exact: true }) });
  await expect(finalRow.locator('dd')).toHaveText(`${finalBalance.toLocaleString('en-US')} credits`);
  await expect(page.getByText(/Thanks for playing, Ada!/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /Round result:/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Submit guess' })).toHaveCount(0);
  await attachState(page, testInfo, 'stopped');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'New session' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Player name')).toBeFocused();
  await expect(page.getByLabel('Player name')).toHaveValue('');
  await expect(page.getByLabel('Starting credits')).toHaveValue('');
  await expect(page.getByText('Ada', { exact: true })).toHaveCount(0);
  await page.keyboard.type('Bea');
  await page.keyboard.press('Tab');
  await page.keyboard.type('1000');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Bea', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Player name')).toHaveValue('');
  await expect(page.getByLabel('Starting credits')).toHaveValue('');
  await expect(page.getByText('Bea', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Round result:|Session complete|Ready to play/ })).toHaveCount(0);
  await attachState(page, testInfo, 'reloaded');
});

test('all-balance real round retains outcome on exhaustion or permits stopping a win', async ({ page }, testInfo) => {
  await page.getByLabel('Player name').fill('Sam');
  await page.getByLabel('Starting credits').fill('100');
  await page.getByRole('button', { name: 'Set up player' }).click();
  await page.getByLabel('Bet credits').fill('100');
  await page.getByLabel('Your guess').fill('1');
  await page.getByRole('button', { name: 'Submit guess' }).click();
  const finalBalance = await checkResult(page, 100, 100, 1);
  if (finalBalance === 0) {
    await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible();
    await expect(page.getByText(/A fresh start is always here/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue' })).toHaveCount(0);
  } else {
    await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled();
    await page.getByRole('button', { name: 'Stop', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: /Round result:/ })).toBeVisible();
  await expect(page.getByText('Final balance').locator('..').locator('dd')).toHaveText(`${finalBalance.toLocaleString('en-US')} credits`);
  await attachState(page, testInfo, finalBalance === 0 ? 'exhausted' : 'winning-end');
  await page.getByRole('button', { name: 'New session' }).click();
  await expect(page.getByLabel('Player name')).toBeFocused();
  await expect(page.getByLabel('Player name')).toHaveValue('');
  await expect(page.getByLabel('Starting credits')).toHaveValue('');
});

// No backend/API/loading/persistence checks apply: this is a synchronous local-only static app.
// Reload intentionally starts fresh. Controlled losing boundaries are proved in App unit tests.
