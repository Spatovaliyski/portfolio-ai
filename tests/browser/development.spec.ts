import { expect, test } from '@playwright/test';

test('development HTML is styled before JavaScript on direct loads and navigation', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();

  // Delayed CSS must block first paint rather than reveal the browser's default styles.
  await page.route('**/*.css?direct', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.continue();
  });
  for (const path of ['/', '/pet-projects/', '/projects/bausy/', '/missing-page/']) {
    await page.goto(path, { waitUntil: 'load' });
    const links = page.locator('head link[rel="stylesheet"]');

    await expect(links).toHaveCount(2);
    expect(await page.locator('body').evaluate((body) => getComputedStyle(body).margin)).toBe(
      '0px',
    );
    expect(
      await page
        .locator('main')
        .evaluate((main) => getComputedStyle(main.parentElement!).backgroundColor),
    ).toBe('rgb(245, 242, 236)');
    expect(
      await page.locator('main h1').evaluate((heading) => getComputedStyle(heading).fontFamily),
    ).toContain('Manrope');
    // CSS Modules must have the same scoped names in SSR and the direct stylesheet.
    expect(
      await page
        .locator('header')
        .first()
        .evaluate((header) => getComputedStyle(header).display),
    ).toBe('flex');
  }
  await page.goto('/');
  await page
    .locator('header > nav')
    .getByRole('link', { name: 'Pet projects', exact: true })
    .click();
  await expect(page).toHaveURL('/pet-projects/');
  await page.waitForLoadState('load');
  expect(await page.locator('body').evaluate((body) => getComputedStyle(body).margin)).toBe('0px');
  await context.close();
});

test('development first paint has styles when the JavaScript module graph is delayed', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const firstPaintStyles: string[] = [];

    (window as unknown as { firstPaintStyles: string[] }).firstPaintStyles = firstPaintStyles;
    new PerformanceObserver((list) => {
      if (list.getEntries().some((entry) => entry.name === 'first-contentful-paint')) {
        firstPaintStyles.push(getComputedStyle(document.body).margin);
      }
    }).observe({ type: 'paint', buffered: true });
  });
  await page.route('**/src/entry-client.tsx', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });
  await page.goto('/pet-projects/');
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { firstPaintStyles: string[] }).firstPaintStyles),
    )
    .toEqual(['0px']);
});
