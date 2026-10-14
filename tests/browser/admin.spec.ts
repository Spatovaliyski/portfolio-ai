import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { PortfolioContent, Entity } from '../../src/domain/schema.ts';
import type { ContentRow } from '../../src/server/store.ts';

const owner = '11111111-1111-4111-8111-111111111111';
const jwt = [
  { alg: 'HS256', typ: 'JWT' },
  { sub: owner, aal: 'aal2', exp: Math.floor(Date.now() / 1000) + 3600 },
  'isolated-signature',
]
  .map((p, i) => (i < 2 ? Buffer.from(JSON.stringify(p)).toString('base64url') : p))
  .join('.');
const user = {
  id: owner,
  email: 'owner@example.com',
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  factors: [],
};

test.beforeEach(async ({ context }) => {
  await context.addInitScript(
    ({ jwt, user }) =>
      localStorage.setItem(
        'sb-lmxukzcvxhpbwtgsbrai-auth-token',
        JSON.stringify({
          access_token: jwt,
          refresh_token: 'isolated',
          token_type: 'bearer',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          user,
        }),
      ),
    { jwt, user },
  );
  await context.route('https://lmxukzcvxhpbwtgsbrai.supabase.co/auth/**', (route) =>
    route.fulfill({ json: user, headers: { 'access-control-allow-origin': '*' } }),
  );
});
test('a manual save changes public content immediately; a stale tab keeps its edits', async ({
  page,
  context,
  request,
}) => {
  const second = await context.newPage();

  for (const p of [page, second]) {
    await p.goto('/admin/');
    await p.getByRole('button', { name: /Rezolve AI/ }).click();
  }
  await page.getByLabel('Description', { exact: true }).fill('Edited through the owner dashboard.');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved and live');
  expect(await (await request.get('/experience/')).text()).toContain(
    'Edited through the owner dashboard.',
  );
  await second.getByLabel('Description', { exact: true }).fill('My unsaved second-tab edit.');
  await second.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(second.getByRole('alert')).toContainText(/conflict|newer/i);
  await expect(second.getByLabel('Description', { exact: true })).toHaveValue(
    'My unsaved second-tab edit.',
  );
  await second.close();
});
test('failed saves retain edits and the mobile editor has no serious accessibility issues', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin/');
  await page.getByRole('button', { name: /Almacena/ }).click();
  await page.getByLabel('Description', { exact: true }).fill('Keep this local change.');
  await page.route('**/api/admin/content', async (route) => {
    if (route.request().method() === 'POST')
      await route.fulfill({ status: 503, json: { error: 'Connection unavailable.' } });
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Connection unavailable');
  await expect(page.getByLabel('Description', { exact: true })).toHaveValue(
    'Keep this local change.',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const relationships = page.locator('.owner-references').first();

  await relationships.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(relationships).toHaveAttribute('open', '');
  await page.keyboard.press('Enter');
  await expect(relationships).not.toHaveAttribute('open');
  const result = await new AxeBuilder({ page }).analyze();

  expect(result.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual(
    [],
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: test.info().outputPath('owner-mobile.png'), fullPage: true });
});
test('project preview and image replacement preserve Bausy presentation and gallery order', async ({
  page,
  request,
}) => {
  const original = (await (await request.get('/api/content')).json()) as PortfolioContent;
  const project = original.entities.find((e) => e.id === 'bausy')!;
  const replacement = original.entities.find(
    (e) =>
      e.kind === 'media' && e.data.mime !== 'application/pdf' && e.id !== project.data.heroMediaId,
  )!;

  await page.goto('/admin/');
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await page.getByRole('button', { name: /^Bausy/ }).click();
  await expect(
    page.getByRole('group', { name: 'Main image', exact: true }).locator('img'),
  ).toHaveCount(1);
  await page.getByLabel('Description Markdown').first().fill('**A quick correction.**');
  await page.getByRole('button', { name: 'Preview formatting', exact: true }).first().click();
  await expect(page.locator('.owner-markdown-preview strong')).toHaveText('A quick correction.');
  await expect(page.getByRole('heading', { name: 'Gallery', exact: true })).toHaveCount(1);
  const picker = page.getByRole('group', { name: 'Main image', exact: true });

  await picker.getByRole('button', { name: 'Replace file', exact: true }).click();
  await picker
    .getByLabel('Find an image')
    .fill(String(replacement.data.caption || replacement.data.alt));
  await picker.locator('.owner-media-grid button').first().click();
  await page.getByText('More options', { exact: true }).click();
  await page.getByLabel('Page address', { exact: true }).fill('Invalid address');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('slug:');
  await expect(page.getByRole('alert')).not.toContainText('"code"');
  await expect(page.getByLabel('Page address', { exact: true })).toHaveValue('Invalid address');
  await page.getByLabel('Page address', { exact: true }).fill('bausy');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved and live');
  const live = (await (await request.get('/api/content')).json()) as PortfolioContent;
  const saved = live.entities.find((e) => e.id === 'bausy')!;

  expect(saved.data.heroMediaId).toBe(replacement.id);
  expect(
    (saved.data.blocks as Array<{ type: string }>).filter((b) => b.type === 'gallery'),
  ).toEqual((project.data.blocks as Array<{ type: string }>).filter((b) => b.type === 'gallery'));
  await page.goto('/projects/bausy/');
  await expect(page.locator('.case-phone img')).toHaveAttribute(
    'src',
    String(replacement.data.publicPath),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('media upload opens the editor despite refresh failure; old history retains current files', async ({
  page,
  request,
}) => {
  const content = (await (await request.get('/api/content')).json()) as PortfolioContent;
  const media = structuredClone(
    content.entities.find((e) => e.kind === 'media' && e.data.mime !== 'application/pdf')!,
  ) as Entity;

  media.id = 'media-isolated-upload';
  media.data.caption = 'Uploaded photo';
  let uploaded = false;
  let saved: Entity | undefined;

  await page.route('**/api/admin/media', async (route) => {
    uploaded = true;
    await route.fulfill({
      status: 201,
      json: { entity: media, version: 1, revisionId: 'isolated' },
    });
  });
  await page.route('**/api/admin/content', async (route) => {
    if (route.request().method() === 'POST') {
      saved = route.request().postDataJSON().entity;
      await route.fulfill({ json: { version: 2 } });
    } else if (uploaded)
      await route.fulfill({ status: 503, json: { error: 'Refresh unavailable.' } });
    else await route.continue();
  });
  const old = structuredClone(media);

  old.data.path = 'obsolete/original.jpg';
  old.data.bytes = 1;
  delete old.data.publicPath;
  delete old.data.variants;
  old.data.alt = 'Previous description';
  await page.route(`**/api/admin/content/${media.id}/history`, (route) =>
    route.fulfill({
      json: {
        revisions: [{ id: 'old-revision', created_at: '2026-01-01T00:00:00Z', entity: old }],
      },
    }),
  );
  await page.goto('/admin/');
  await page.getByRole('button', { name: 'Images & files', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'photo.png',
    mimeType: 'image/png',
    buffer: Buffer.from('isolated upload'),
  });
  await expect(page.getByLabel('File name or caption')).toHaveValue('Uploaded photo');
  await expect(page.getByRole('status')).toContainText('Uploaded to your media library');
  await page.getByRole('button', { name: 'Recent saves', exact: true }).click();
  await page.getByRole('button', { name: 'Load this version', exact: true }).click();
  await expect(page.getByLabel('Image description', { exact: true })).toHaveValue(
    'Previous description',
  );
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved and live');
  expect(saved?.data).toEqual({ ...media.data, alt: 'Previous description' });
});

test('the owner API creates manually editable experiences and updates projects', async ({
  page,
  request,
}) => {
  const headers = { Authorization: 'Bearer ' + jwt };
  const records = (await (await request.get('/api/admin/content', { headers })).json()) as {
    entities: ContentRow[];
  };
  const source = records.entities.find((r) => r.kind === 'experience')!;
  const experience: Entity = {
    id: 'experience-api-proof',
    kind: 'experience',
    status: 'published',
    sortOrder: -1,
    data: {
      ...source.data,
      employer: 'API-created experience',
      summary: 'Created through the owner API.',
    },
  };
  const create = await request.post('/api/admin/content', {
    headers,
    data: {
      entity: experience,
      expectedVersion: 0,
      requestKey: crypto.randomUUID(),
    },
  });

  expect(create.status()).toBe(200);
  expect(await (await request.get('/experience/')).text()).toContain(experience.data.summary);
  const project = records.entities.find((r) => r.id === 'cilect')!;
  const entity: Entity = {
    id: project.id,
    kind: project.kind,
    status: 'published',
    sortOrder: project.sort_order,
    data: { ...project.data, summary: 'Updated through the owner API.' },
  };
  const update = await request.post('/api/admin/content', {
    headers,
    data: {
      entity,
      expectedVersion: project.version,
      requestKey: crypto.randomUUID(),
    },
  });

  expect(update.status()).toBe(200);
  expect(await (await request.get('/projects/cilect/')).text()).toContain(entity.data.summary);
  expect(
    (
      await request.post('/api/admin/content', {
        data: {
          entity,
          expectedVersion: project.version + 1,
          requestKey: crypto.randomUUID(),
        },
      })
    ).status(),
  ).toBe(401);
  await page.goto('/admin/');
  await page.getByRole('button', { name: /API-created experience/ }).click();
  await expect(page.getByLabel('Description', { exact: true })).toHaveValue(
    String(experience.data.summary),
  );
  await page
    .getByLabel('Description', { exact: true })
    .fill('Manually corrected after AI creation.');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved and live');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: test.info().outputPath('owner-desktop.png'), fullPage: true });
});
