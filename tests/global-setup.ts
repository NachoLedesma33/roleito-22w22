import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { purgeSince, readStart, writeStart } from './global-teardown';

const PIN_HASH = resolve(__dirname, '../data/pin_hash.txt');

function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export default function globalSetup() {
  if (existsSync(PIN_HASH)) {
    unlinkSync(PIN_HASH);
  }
  // Corridas anteriores que muertas antes del teardown dejo basura: se purga
  // por ventana temporal (creada desde el arranque de la corrida previa).
  const prev = readStart();
  if (prev) {
    purgeSince(prev);
  }
  writeStart(stamp());
}