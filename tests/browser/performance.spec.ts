import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('records representative mobile lab performance', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    const metrics = { lcp: 0, cls: 0, taskMax: 0 };

    (window as unknown as { portfolioMetrics: typeof metrics }).portfolioMetrics = metrics;
    new PerformanceObserver((list) => {
      for (const item of list.getEntries()) metrics.lcp = item.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const item of list.getEntries() as Array<
        PerformanceEntry & { hadRecentInput: boolean; value: number }
      >)
        if (!item.hadRecentInput) metrics.cls += item.value;
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((list) => {
      for (const item of list.getEntries())
        metrics.taskMax = Math.max(metrics.taskMax, item.duration);
    }).observe({ type: 'longtask', buffered: true });
  });
  const client = await page.context().newCDPSession(page);

  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 100,
    downloadThroughput: 1_600_000 / 8,
    uploadThroughput: 750_000 / 8,
  });
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto('/');
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  await page.waitForTimeout(500);
  const metrics = await page.evaluate(
    () =>
      (window as unknown as { portfolioMetrics: { lcp: number; cls: number; taskMax: number } })
        .portfolioMetrics,
  );

  await writeFile(
    'test-results/mobile-performance.json',
    JSON.stringify(
      { viewport: '375x812', network: '1.6 Mbps / 100ms', cpu: '4x slowdown', ...metrics },
      null,
      2,
    ),
  );
  expect(metrics.cls).toBeLessThanOrEqual(0.1);
  expect(metrics.lcp).toBeLessThanOrEqual(2500);
});
