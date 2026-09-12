import { expect, test, type Page } from '@playwright/test';

async function expectAuthSurface(page: Page) {
  await expect(page.getByText('TribeTracker', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText(/Sign In|Continue in Demo Mode/).first()
  ).toBeVisible();
}

function failOnRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return () => expect(errors, errors.join('\n')).toEqual([]);
}

test('loads the direct auth route without runtime errors', async ({ page }) => {
  const assertNoErrors = failOnRuntimeErrors(page);
  await page.goto('/login');
  await expectAuthSurface(page);
  assertNoErrors();
});

test('handles protected deep links and browser history while signed out', async ({ page }) => {
  const assertNoErrors = failOnRuntimeErrors(page);
  await page.goto('/challenge/challenge-42');
  await expectAuthSurface(page);
  await expect(page).toHaveURL(/\/login$/);

  await page.goto('/organization-invite/org_token-1');
  await expectAuthSurface(page);
  await expect(page).toHaveURL(/\/login$/);
  await page.goBack();
  await expectAuthSurface(page);
  await expect(page).toHaveURL(/\/login$/);
  assertNoErrors();
});

for (const width of [320, 390, 768, 1440]) {
  test(`auth surface fits a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 600 ? 720 : 900 });
    await page.goto('/login');
    await expectAuthSurface(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test.describe('system theme', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`honors ${scheme} browser preference`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/login');
      await expectAuthSurface(page);
      const expected = scheme === 'dark' ? 'rgb(0, 0, 0)' : 'rgb(249, 250, 251)';
      const hasExpectedSurface = await page.locator('div').evaluateAll(
        (nodes, color) => nodes.some(node => getComputedStyle(node).backgroundColor === color),
        expected
      );
      expect(hasExpectedSurface).toBe(true);
    });
  }
});
