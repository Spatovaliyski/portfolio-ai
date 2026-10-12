import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { contentSchema, records } from '../../src/domain/schema.ts';
import { pageMetadata } from '../../src/public/metadata.ts';
import { routePaths } from '../../src/domain/publication.ts';

const content = contentSchema.parse(JSON.parse(readFileSync('dist/content-snapshot.json', 'utf8')));

async function waitForNavigation(page: Page, path: string) {
  await expect(page.locator('html')).toHaveAttribute('data-path', path);
  await expect(page.locator('main')).toBeFocused();
}

test('React page switches preserve the document, CSS and fonts, with metadata and history', async ({
  page,
  request,
}) => {
  const errors: string[] = [];

  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/');
  await page.waitForFunction(
    () => history.scrollRestoration === 'manual' && document.fonts.status === 'loaded',
  );
  await page.evaluate(() => {
    Object.assign(window, {
      navigationProof: {
        document,
        origin: performance.timeOrigin,
        styles: Array.from(document.querySelectorAll('link[rel="stylesheet"], style')),
      },
    });
    window.scrollTo({ top: 450, behavior: 'instant' });
  });
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(450);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.querySelector<HTMLElement>('[data-drift]')?.style.translate ?? '',
      ),
    )
    .toContain('px');

  const requests: string[] = [];

  page.on('request', (request) => {
    if (
      ['document', 'stylesheet', 'font'].includes(request.resourceType()) ||
      request.url().includes('supabase.co')
    )
      requests.push(request.url());
  });

  // Use a real site's link without Playwright scrolling it into view first.
  await page
    .locator('a[href="/projects/"]')
    .first()
    .evaluate((link) => (link as HTMLAnchorElement).click());
  await expect
    .poll(() =>
      page.evaluate(() => {
        const effect = document
          .querySelector('main header, main [data-drift]')
          ?.getAnimations()[0]?.effect;

        if (!(effect instanceof KeyframeEffect)) return null;

        return effect.getKeyframes().map((frame) => frame.opacity);
      }),
    )
    .toEqual(['0', '1']);
  await expect(page).toHaveURL('/projects/');
  await waitForNavigation(page, '/projects/');
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(page).toHaveTitle(pageMetadata(content, '/projects/').title);

  const project = records(content, 'project').find((project) => project.id === 'bausy')!;
  const path = `/projects/${project.slug}/`;

  await page.locator(`main a[href="${path}"]`).first().click();
  await waitForNavigation(page, path);
  await expect(page).toHaveTitle(project.seo.title);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    project.seo.description,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    pageMetadata(content, path).canonical,
  );
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);

  const direct = await request.get(path);
  const socialImage = (await direct.text()).match(/property="og:image" content="([^"]+)"/)?.[1];

  expect(socialImage).toBeTruthy();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', socialImage!);
  expect((await request.get(new URL(socialImage!).pathname)).status()).toBe(200);

  await page.evaluate(() => history.back());
  await waitForNavigation(page, '/projects/');
  await page.evaluate(() => history.back());
  await waitForNavigation(page, '/');
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(450);
  expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain(
    'ProfilePage',
  );
  await page.evaluate(() => history.forward());
  await waitForNavigation(page, '/projects/');

  expect(
    await page.evaluate(() => {
      const proof = (
        window as unknown as {
          navigationProof: { document: Document; origin: number; styles: Element[] };
        }
      ).navigationProof;
      const current = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));

      return (
        proof.document === document &&
        proof.origin === performance.timeOrigin &&
        proof.styles.length === current.length &&
        proof.styles.every((node, index) => node === current[index])
      );
    }),
  ).toBe(true);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test('mobile navigation closes the menu, supports fragments and preserves query filters', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.waitForFunction(() => history.scrollRestoration === 'manual');
  await page.locator('header summary').click();
  await page.locator('header details nav a[href="/projects/"]').click();
  await waitForNavigation(page, '/projects/');
  await expect(page.locator('header details')).not.toHaveAttribute('open');

  await page.locator('header a[href="/"]').first().click();
  await waitForNavigation(page, '/');
  await page.locator('main a[href="/github/"]').first().click();
  await waitForNavigation(page, '/github/');

  await page.getByLabel('Search repositories').fill('Plate');
  await expect(page).toHaveURL(/\/github\/\?q=Plate$/);
  await page.locator('header a[href="/"]').first().click();
  await waitForNavigation(page, '/');
  await page.evaluate(() => history.back());
  await waitForNavigation(page, '/github/');
  await expect(page.getByLabel('Search repositories')).toHaveValue('Plate');

  await page.evaluate(() => {
    const link = document.createElement('a');

    link.href = '/#selected-work';
    document.body.append(link);
    link.click();
    link.remove();
  });
  await waitForNavigation(page, '/');
  await expect(page).toHaveURL('/#selected-work');
  await expect
    .poll(() =>
      page
        .locator('#selected-work')
        .evaluate((element) => Math.abs(element.getBoundingClientRect().top)),
    )
    .toBeLessThan(2);

  await page.evaluate(() => {
    const link = document.querySelector<HTMLAnchorElement>('a[href="/projects/"]')!;

    Object.assign(window, {
      nativeLinkAllowed: link.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }),
      ),
    });
  });
  expect(
    await page.evaluate(
      () => (window as unknown as { nativeLinkAllowed: boolean }).nativeLinkAllowed,
    ),
  ).toBe(true);
});

test('a later in-page click replaces the earlier route without reloading styles', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => history.scrollRestoration === 'manual');
  const before = await page.evaluate(() => ({
    origin: performance.timeOrigin,
    styles: document.querySelectorAll('link[rel="stylesheet"], style').length,
  }));

  await page.evaluate(() => {
    let calls = 0;

    document.startViewTransition = (() => {
      calls += 1;

      return {
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition() {},
      };
    }) as typeof document.startViewTransition;
    Object.assign(window, { viewTransitionCalls: () => calls });
    document.querySelector<HTMLAnchorElement>('a[href="/projects/"]')!.click();
    document.querySelector<HTMLAnchorElement>('a[href="/contact/"]')!.click();
  });
  await expect(page).toHaveURL('/contact/');
  await waitForNavigation(page, '/contact/');
  await expect(page).toHaveTitle(pageMetadata(content, '/contact/').title);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(before.origin);
  expect(
    await page.evaluate(() => document.querySelectorAll('link[rel="stylesheet"], style').length),
  ).toBe(before.styles);
  expect(
    await page.evaluate(() =>
      (window as unknown as { viewTransitionCalls: () => number }).viewTransitionCalls(),
    ),
  ).toBe(0);
});

test('all public routes and editor controls render text at 16px or larger', async ({ page }) => {
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });

    for (const path of [...routePaths(content), '/404/', '/admin/']) {
      await page.goto(path);

      const smallText = await page.evaluate(() =>
        Array.from(document.body.querySelectorAll<HTMLElement>('*'))
          .filter((element) => {
            const hasText = Array.from(element.childNodes).some(
              (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
            );
            const isControl = element.matches('input, select, textarea');
            const visible =
              element.getClientRects().length > 0 &&
              getComputedStyle(element).visibility !== 'hidden' &&
              !element.closest('[aria-hidden="true"], .sr-only');

            return (
              (hasText || isControl) &&
              visible &&
              parseFloat(getComputedStyle(element).fontSize) < 16
            );
          })
          .map(
            (element) =>
              `${element.tagName}: ${element.textContent?.trim().slice(0, 50)} (${getComputedStyle(element).fontSize})`,
          ),
      );

      expect(smallText, `${path} at ${width}px`).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        `${path} at ${width}px`,
      ).toBe(true);
    }
  }
});
