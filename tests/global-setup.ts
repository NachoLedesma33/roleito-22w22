import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const PIN_HASH = resolve(__dirname, '../data/pin_hash.txt');

export default function globalSetup() {
  if (existsSync(PIN_HASH)) {
    unlinkSync(PIN_HASH);
  }
}
