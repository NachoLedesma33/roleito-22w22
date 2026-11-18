import { useSyncExternalStore } from 'react';
import type { AmbientScene } from './ambientAudio';

/**
 * Regulador de volumen de audio, compartido por DM y jugador.
 *
 * Hay dos capas:
 *  - LOCAL: el volumen de este POV, persistido en `localStorage`. Es el que
 *    suena mientras el DM no sincronice. Cada pestana/POV tiene el suyo.
 *  - COMPARTIDO: los valores que el DM publicó con el checkbox "sincronizar
 *    sonido". Viven en el backend (`campaign.settings_json.audio`) y llegan por
 *    el snapshot. Cuando `sync` esta activo, TODOS los POV siguen estos valores
 *    y el volumen local queda en pausa.
 *
 * Volumen efectivo = capa compartida (si `sync`) o local. Dentro de la capa
 * activa, volumen del canal = master × canal (ver getEffectiveVolume).
 */
export type AudioSettingKey = 'master' | 'weather' | 'dice' | 'ambience';
export type AudioChannel = 'weather' | 'dice' | 'ambience';

export interface AudioSettings {
  master: number;
  weather: number;
  dice: number;
  ambience: number;
}

/** Volumen que el DM manda al resto de los POV (se guarda en la campaña). */
export interface SharedAudioSettings extends AudioSettings {
  sync: boolean;
  /** Escena de ambiente elegida por el DM; null = sin ambiente. */
  scene?: AmbientScene | null;
}

export interface AudioState extends AudioSettings {
  /** true = el DM sincronizó: todos los POV siguen los valores compartidos. */
  synced: boolean;
}

const KEYS: Record<AudioSettingKey, string> = {
  master: 'roleito:audio:master',
  weather: 'roleito:audio:weather',
  dice: 'roleito:audio:dice',
  ambience: 'roleito:audio:ambience',
};

const DEFAULTS: AudioSettings = { master: 1, weather: 0.8, dice: 0.8, ambience: 0.6 };

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

function readKey(key: AudioSettingKey): number {
  try {
    const raw = localStorage.getItem(KEYS[key]);
    if (raw == null) return DEFAULTS[key];
    return clamp01(Number(raw));
  } catch {
    return DEFAULTS[key];
  }
}

function readLocal(): AudioSettings {
  return { master: readKey('master'), weather: readKey('weather'), dice: readKey('dice'), ambience: readKey('ambience') };
}

/** Volumen propio de este POV (persistido). */
let local: AudioSettings = readLocal();
/** Volumen compartido (del backend). null = todavía no llegó nada. */
let shared: SharedAudioSettings | null = null;

function effectiveVolume(): AudioSettings {
  if (shared?.sync) {
    return { master: shared.master, weather: shared.weather, dice: shared.dice, ambience: shared.ambience };
  }
  return local;
}

function buildState(): AudioState {
  const e = effectiveVolume();
  return { master: e.master, weather: e.weather, dice: e.dice, ambience: e.ambience, synced: !!shared?.sync };
}

let cache: AudioState = buildState();
const listeners = new Set<() => void>();

function emit(): void {
  cache = buildState();
  for (const l of listeners) l();
}

/** Snapshot estable (mismo objeto hasta que algo cambie) para useSyncExternalStore. */
export function getAudioSettings(): AudioState {
  return cache;
}

/** Cambia el volumen LOCAL de este POV (persistido). */
export function setAudioVolume(key: AudioSettingKey, value: number): void {
  const v = clamp01(value);
  if (local[key] === v) return;
  local = { ...local, [key]: v };
  try {
    localStorage.setItem(KEYS[key], String(v));
  } catch {
    /* localStorage bloqueado: el volumen vive solo en memoria */
  }
  emit();
}

export function getSharedAudio(): SharedAudioSettings | null {
  return shared;
}

const AMBIENT_SCENES: readonly AmbientScene[] = ['medieval', 'sci-fi', 'combat', 'suspense', 'campaign'];

function sameShared(a: SharedAudioSettings | null, b: SharedAudioSettings | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.sync === b.sync && a.master === b.master && a.weather === b.weather && a.dice === b.dice && a.ambience === b.ambience && (a.scene ?? null) === (b.scene ?? null);
}

/**
 * Aplica el volumen compartido recibido del backend (campaña en el DM,
 * snapshot del jugador). No hace nada si es igual al actual, para no re-renderizar
 * en cada poll.
 */
export function setSharedAudio(next: SharedAudioSettings | null): void {
  if (sameShared(shared, next)) return;
  shared = next;
  emit();
}

/** Normaliza un objeto crudo (del backend) a SharedAudioSettings, o null. */
export function normalizeSharedAudio(raw: unknown): SharedAudioSettings | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const num = (v: unknown, fallback: number) =>
    v == null || v === '' ? fallback : Math.min(1, Math.max(0, Number(v) || 0));
  return {
    sync: !!o.sync,
    master: num(o.master, 1),
    weather: num(o.weather, 0.8),
    dice: num(o.dice, 0.8),
    ambience: num(o.ambience, 0.6),
    scene: AMBIENT_SCENES.find((s) => s === o.scene) ?? null,
  };
}

/** Volumen final de un canal, ya multiplicado por el master efectivo. */
export function getEffectiveVolume(channel: AudioChannel): number {
  const e = effectiveVolume();
  return e.master * e[channel];
}

export function subscribeAudioSettings(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useAudioSettings(): AudioState {
  return useSyncExternalStore(subscribeAudioSettings, getAudioSettings, getAudioSettings);
}

// Otra pestaña (DM o jugador) cambió el volumen local: refrescamos y notificamos.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && !Object.values(KEYS).includes(e.key)) return;
    local = readLocal();
    emit();
  });
}
