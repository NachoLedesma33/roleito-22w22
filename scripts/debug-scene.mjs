import { chromium } from '@playwright/test';

const urls = process.argv.slice(2);
const CAMPAIGN = '566921f6-83ef-4b78-ad0d-5ae179ddd84f';

for (const base of urls.length ? urls : ['http://localhost:5173', 'http://127.0.0.1:5173']) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const logs = [];
  page.on('console', (m) => logs.push(`[console.${m.type()}] ${m.text().slice(0, 300)}`));
  page.on('requestfailed', (r) => logs.push(`[reqfail] ${r.url().slice(0, 140)} :: ${r.failure()?.errorText}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${String(e).slice(0, 300)}`));
  try {
    await page.goto(`${base}/campaigns/${CAMPAIGN}`, { timeout: 20000 });
    await page.waitForTimeout(9000);
    const info = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return {
        canvas: !!canvas,
        placeholder: document.body.innerText.includes('No scene selected'),
        headerSelect: document.querySelector('header select')?.value ?? null,
      };
    });
    const tag = base.includes('127') ? '127' : 'localhost';
    await page.screenshot({ path: `test-results/scene-debug-${tag}.png` });
    console.log(`\n===== ${base} =====`);
    console.log('info:', JSON.stringify(info));
    console.log(logs.slice(0, 30).join('\n') || '(sin logs)');
  } catch (e) {
    console.log(`\n===== ${base} ===== ERROR: ${String(e).slice(0, 200)}`);
    console.log(logs.slice(0, 15).join('\n'));
  }
  await browser.close();
}
