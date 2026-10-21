import { existsSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(__dirname, '..');
const PURGE = join(ROOT, 'scripts', 'purge_e2e_junk.py');
const AI_CONFIG = resolve(__dirname, '../data/ai_config.json');
const AI_CONFIG_BAK = resolve(__dirname, '../data/ai_config.e2e.bak.json');

const PY = existsSync(join(ROOT, 'venv', 'Scripts', 'python.exe'))
  ? join(ROOT, 'venv', 'Scripts', 'python.exe')
  : existsSync(join(ROOT, 'venv', 'bin', 'python'))
    ? join(ROOT, 'venv', 'bin', 'python')
    : 'python';

export const START_FILE = join(tmpdir(), 'roleito-e2e-start.txt');

/**
 * Purga la basura de e2e: campañas creadas desde `start`, las que se llaman
 * `E2E Campaign %` (las de las pruebas manuales, que caen aunque no haya
 * corrida), los DMs `E2E DM %`, y las carpetas de assets huérfanas.
 *
 * La lógica vive en scripts/purge_e2e_junk.py para poder correrla a mano:
 *     python scripts/purge_e2e_junk.py [--dry-run]
 */
export function purgeSince(start: string): void {
  try {
    execFileSync(PY, [PURGE, '--since', start], { cwd: ROOT, stdio: 'inherit' });
  } catch (err) {
    console.warn('[e2e teardown] cleanup skipped:', err instanceof Error ? err.message : err);
  }
}

export default function globalTeardown() {
  // La config del DM se restores (la corrida uso un mock).
  if (existsSync(AI_CONFIG_BAK)) {
    copyFileSync(AI_CONFIG_BAK, AI_CONFIG);
    rmSync(AI_CONFIG_BAK);
  } else if (existsSync(AI_CONFIG)) {
    // No habia config antes (CI): la que creo la corrida se borra.
    rmSync(AI_CONFIG);
  }

  if (!existsSync(START_FILE)) {
    console.warn('[e2e teardown] sin marca de inicio, no se purga nada');
    return;
  }
  purgeSince(readStart()!);
}

export function readStart(): string | null {
  return existsSync(START_FILE) ? readFileSync(START_FILE, 'utf8').trim() : null;
}

export function writeStart(value: string): void {
  writeFileSync(START_FILE, value, 'utf8');
}