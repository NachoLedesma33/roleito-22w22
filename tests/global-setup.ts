import { existsSync, unlinkSync, copyFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { purgeSince, readStart, writeStart } from './global-teardown';

const PIN_HASH = resolve(__dirname, '../data/pin_hash.txt');
const AI_CONFIG = resolve(__dirname, '../data/ai_config.json');
const AI_CONFIG_BAK = resolve(__dirname, '../data/ai_config.e2e.bak.json');

/**
 * La corrida arranca con el provider mock.
 *
 * Antes los agentes usaban SIEMPRE el mock (la config se leia del CWD del
 * backend y no se encontraba). Ahora que leen la config de verdad, una corrida
 * con el provider "remote" del DM pegaria llamadas de verdad (y gastaria su
 * plata) durante los tests. Asi que la corrida usa un mock y la config del
 * DM se restaura al terminar.
 */
const MOCK_CONFIG = {
  provider: 'mock',
  local_base_url: 'http://localhost:11434',
  remote_base_url: 'https://api.groq.com/openai/v1',
  model: null,
  max_tokens: 512,
  temperature: 0.7,
};

function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export default function globalSetup() {
  if (existsSync(PIN_HASH)) {
    unlinkSync(PIN_HASH);
  }
  // La config del DM se respalda y se vuelve a mock durante la corrida.
  if (existsSync(AI_CONFIG)) {
    copyFileSync(AI_CONFIG, AI_CONFIG_BAK);
  }
  writeFileSync(AI_CONFIG, JSON.stringify(MOCK_CONFIG, null, 2), 'utf8');
  // Corridas anteriores que muertas antes del teardown dejaron basura: se purga
  // por ventana temporal (creada desde el arranque de la corrida previa).
  const prev = readStart();
  if (prev) {
    purgeSince(prev);
  }
  writeStart(stamp());
}
