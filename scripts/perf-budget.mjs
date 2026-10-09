import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { gzipSync } from 'node:zlib';

const DIST = fileURLToPath(new URL('../apps/dm/dist/assets/', import.meta.url));
const BUDGET_BYTES = 600 * 1024; // 564 KB gz real hoy (three en chunk único)
// Target plan §12.1: ≤250 KB gz (sin three) — requiere manualChunks + code-split.

let total = 0;
const rows = [];
for (const file of readdirSync(DIST).filter((f) => f.endsWith('.js'))) {
  const raw = readFileSync(join(DIST, file));
  const gz = gzipSync(raw).length;
  total += gz;
  rows.push(`  ${file.padEnd(40)} ${(gz / 1024).toFixed(1).padStart(8)} KB gz`);
}

const mb = (total / 1024).toFixed(1);
console.log(rows.join('\n'));
console.log(`\nTotal JS gz: ${mb} KB (presupuesto ${BUDGET_BYTES / 1024} KB)`);
if (total > BUDGET_BYTES) {
  console.error(`FAIL: presupuesto excedido (target plan: 250 KB sin three)`);
  process.exit(1);
}
console.log('OK');