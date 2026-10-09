import { test, expect } from '@playwright/test';

test('P1: LCP landing ≤ 2.5 s (plan §12.1)', async ({ page }) => {
  await page.goto('/');
  const lcp = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const observed: number[] = [];
        const po = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) observed.push(entry.startTime);
        });
        po.observe({ type: 'largest-contentful-paint', buffered: true });
        window.setTimeout(() => {
          po.disconnect();
          resolve(observed.length ? observed[observed.length - 1] : -1);
        }, 3000);
      }),
  );
  expect(lcp, 'LCP no medido').toBeGreaterThan(0);
  expect(lcp, `LCP ${lcp.toFixed(0)} ms > 2500 ms`).toBeLessThanOrEqual(2500);
});