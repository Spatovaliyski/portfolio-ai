import { test, expect, type Page } from '@playwright/test';
import { seedContent } from '../../src/content/seed.ts';
import { randomUUID } from 'node:crypto';

test('two-tab editing recovers conflicts and previews the real mobile viewport', async ({
  context,
}) => {
  const owner = '11111111-1111-4111-8111-111111111111';
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = [
    { alg: 'HS256', typ: 'JWT' },
    { sub: owner, aal: 'aal2', exp, aud: 'authenticated' },
    'test-signature',
  ]
    .map((part, index) =>
      index < 2
        ? Buffer.from(JSON.stringify(part)).toString('base64url')
        : Buffer.from(String(part)).toString('base64url'),
    )
    .join('.');
  const user = {
    id: owner,
    email: 'martinspatovaliyski@gmail.com',
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    app_metadata: { provider: 'email' },
    user_metadata: {},
    factors: [],
  };

  await context.addInitScript(
    ({ jwt, user, exp }) => {
      localStorage.setItem(
        'sb-lmxukzcvxhpbwtgsbrai-auth-token',
        JSON.stringify({
          access_token: jwt,
          refresh_token: 'isolated-test-refresh',
          expires_at: exp,
          expires_in: 3600,
          token_type: 'bearer',
          user,
        }),
      );
    },
    { jwt, user, exp },
  );
  const rows = seedContent.entities.map((entity) => ({
    id: entity.id,
    kind: entity.kind,
    status: 'draft',
    sort_order: entity.sortOrder,
    data: structuredClone(entity.data),
    version: 1,
    current_revision: randomUUID(),
  }));

  await context.route('https://lmxukzcvxhpbwtgsbrai.supabase.co/**', async (route) => {
    const request = route.request();
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': '*',
    };

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });

      return;
    }
    if (request.url().includes('/auth/v1/')) {
      await route.fulfill({ json: user, headers: cors });

      return;
    }
    if (request.url().includes('/storage/')) {
      const body = request.postDataJSON() as { paths?: string[] };

      await route.fulfill({
        json: (body?.paths ?? []).map((path) => ({
          path,
          signedURL: '/object/sign/portfolio-originals/' + path + '?token=isolated-test',
          error: null,
        })),
        headers: cors,
      });

      return;
    }
    const body = request.postDataJSON();

    if (body.action === 'list') {
      await route.fulfill({
        json: {
          entities: rows,
          releases: [],
          jobs: [],
          control: { desiredReleaseId: null, activeReleaseId: null },
          github: null,
        },
        headers: cors,
      });

      return;
    }
    if (body.action === 'save') {
      const row = rows.find((row) => row.id === body.entity.id)!;

      if (row.version !== body.expectedVersion) {
        await route.fulfill({ status: 409, json: { error: 'Version conflict' }, headers: cors });

        return;
      }
      Object.assign(row, {
        data: body.entity.data,
        status: body.entity.status,
        sort_order: body.entity.sortOrder,
        version: row.version + 1,
        current_revision: randomUUID(),
      });
      await route.fulfill({
        json: { version: row.version, revisionId: row.current_revision },
        headers: cors,
      });

      return;
    }
    await route.fulfill({ json: { references: [], revisions: [] }, headers: cors });
  });

  async function edit(page: Page) {
    await page.goto('/admin/');
    await page.getByRole('button', { name: 'Profile', exact: true }).click();
    await page.locator('.record-list button').last().click();
    await page.getByLabel('Autosave', { exact: true }).uncheck();
  }
  const first = await context.newPage();
  const second = await context.newPage();

  await edit(first);
  await edit(second);
  await first.getByLabel('Role', { exact: true }).fill('First tab edit');
  await first.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(first.getByRole('status')).toHaveText('Saved');
  await second.getByLabel('Role', { exact: true }).fill('Second tab edit');
  await second.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(second.getByRole('alert')).toContainText('Version conflict');
  await expect(second.getByLabel('Role', { exact: true })).toHaveValue('Second tab edit');
  await second
    .getByRole('button', { name: 'Discard local edits and load current revision' })
    .click();
  await expect(second.getByLabel('Role', { exact: true })).toHaveValue('First tab edit');
  await second.getByLabel('Role', { exact: true }).fill('Owner-approved local preview');
  await second.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(second.getByRole('status')).toHaveText('Saved');
  await second.getByRole('button', { name: 'Preview draft' }).click();
  await second.getByLabel('Viewport').selectOption('375px');
  const frame = second.frameLocator('iframe[title="Private portfolio draft"]');

  await expect(frame.getByText('Owner-approved local preview', { exact: true })).toBeVisible();
  expect(await frame.locator('body').evaluate(() => innerWidth)).toBe(375);
});
