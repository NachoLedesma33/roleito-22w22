import { chromium } from '@playwright/test';

const CAMPAIGN = process.argv[2] || '511d941b-e9c3-4ebd-bf5f-63c94b07ee23';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (m) => {
  const t = m.text();
  if (/texSubImage|WebGL|error/i.test(t)) console.log(`  [console] ${t.slice(0, 200)}`);
});
await page.goto(`http://localhost:5173/campaigns/${CAMPAIGN}`, { timeout: 20000 });
await page.waitForSelector('header select', { timeout: 15000 });
await page.waitForTimeout(3000);

const options = await page.locator('header select option').evaluateAll((os) =>
  os.map((o) => ({ value: o.value, label: o.textContent })).filter((o) => o.value),
);

for (let i = 0; i < options.length; i++) {
  const opt = options[i];
  await page.locator('header select').selectOption(opt.value);
  await page.waitForTimeout(7000);
  const file = `test-results/scene-check-${i}.png`;
  await page.screenshot({ path: file });
  console.log(`captura ${i}: ${opt.label} -> ${file}`);
}
await browser.close();
