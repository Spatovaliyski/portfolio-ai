import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { contentSchema, records, type Project } from '../../src/domain/schema.ts';
import { routePaths } from '../../src/domain/publication.ts';

const content = contentSchema.parse(JSON.parse(readFileSync('dist/content-snapshot.json', 'utf8')));
const settings = records(content, 'settings')[0];
const projectPath = (project: Project) =>
  `/${project.kind === 'pet-project' ? 'pet-projects' : 'projects'}/${project.slug}/`;
const bausyPath = projectPath(
  records(content, 'project').find((project) => project.id === 'bausy')!,
);
const representativePaths = [
  ...new Set([
    '/',
    bausyPath,
    '/pet-projects/',
    '/github/',
    ...records(content, 'note')
      .slice(0, 1)
      .map((note) => `/notes/${note.slug}/`),
  ]),
];

test('every public route contains readable HTML, metadata and true status codes', async ({
  browser,
  request,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();

  for (const path of routePaths(content)) {
    const response = await page.goto(path);

    expect(response?.status(), path).toBe(200);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('main')).not.toBeEmpty();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      settings.siteUrl + path,
    );
  }
  expect((await request.get('/does-not-exist/')).status()).toBe(404);
  await page.goto('/');
  await page.getByLabel(settings.labels.openMenu, { exact: true }).click();
  const target = settings.navigation.find((link) => link.url.startsWith('/') && link.url !== '/');

  if (target) {
    await page
      .locator('header details nav')
      .getByRole('link', { name: target.label, exact: true })
      .click();
    await expect(page).toHaveURL(new URL(target.url, settings.siteUrl).pathname);
  }
  for (const redirect of records(content, 'redirect')) {
    const response = await request.get(redirect.from, { maxRedirects: 0 });

    expect(response.status(), redirect.from).toBe(301);
    expect(response.headers().location).toBe(redirect.to);
  }
  await context.close();
});
test('screenshots use a keyboard-accessible viewer and restore focus', async ({ page }) => {
  const project = records(content, 'project').find((project) =>
    project.blocks.some((block) => block.type === 'gallery' && block.images.length > 1),
  );

  test.skip(
    !project,
    'This release has no multi-image gallery. CI starter content exercises the viewer.',
  );
  const gallery = project!.blocks.find(
    (block) => block.type === 'gallery' && block.images.length > 1,
  )!;

  await page.goto(projectPath(project!));
  const trigger = page
    .locator('.block-gallery')
    .getByRole('link', {
      name: `Inspect screenshot: ${gallery.type === 'gallery' ? gallery.images[0].alt : ''}`,
      exact: true,
    })
    .first();

  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'Screenshot viewer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close viewer' })).toBeFocused();
  await page.getByRole('button', { name: 'Next screenshot' }).click();
  await expect(
    page.getByText(`Screenshot 2 of ${gallery.type === 'gallery' ? gallery.images.length : 0}`, {
      exact: true,
    }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
test('hydration stays clean and public pages never call Supabase', async ({ page }) => {
  const errors: string[] = [];

  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const backend: string[] = [];

  page.on('request', (request) => {
    if (request.url().includes('supabase.co')) backend.push(request.url());
  });
  for (const path of representativePaths) await page.goto(path);
  expect(errors).toEqual([]);
  expect(backend).toEqual([]);
});
test('representative pages pass automated accessibility and reflow checks', async ({ page }) => {
  for (const width of [320, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of [...representativePaths, '/admin/']) {
      await page.goto(path);
      await page.evaluate(async () => {
        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

        const runningAnimations = () => {
          const animations: Animation[] = [];
          const visit = (element: Element) => {
            animations.push(
              ...element.getAnimations().filter((animation) => animation.playState === 'running'),
            );

            for (const child of element.children) visit(child);
          };

          visit(document.documentElement);

          return animations;
        };
        let running = runningAnimations();

        while (running.length) {
          await Promise.all(running.map((animation) => animation.finished));
          running = runningAnimations();
        }
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        `${path} at ${width}`,
      ).toBe(true);
      if (width === 320 || width === 1440)
        expect(
          (
            await new AxeBuilder({ page })
              .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
              .analyze()
          ).violations,
          `${path} at ${width}`,
        ).toEqual([]);
    }
  }
});
test('keyboard navigation and reduced-motion fallback remain usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.getByLabel(settings.labels.openMenu, { exact: true }).click();
  await expect(page.locator('header details nav')).toBeVisible();
  const link = page.locator('header details nav a').first();

  if (await link.count()) await link.focus();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel(settings.labels.openMenu, { exact: true })).toBeFocused();
  expect(
    await page
      .locator('.button')
      .first()
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe('0s');
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
});
