import { useSyncExternalStore } from 'react';

/**
 * Volumen de audio del cliente: un master global mas un canal por tipo de
 * sonido. La idea es que ningun canal sature ni tape a otro (dados, clima y lo
 * que se sume despues). Persiste en localStorage y se comparte entre pestanas
 * (DM y jugador suelen estar en pestanas separadas del mismo navegador).
 *
 * Cada motor lee su volumen efectivo con `getEffectiveVolume(canal)` =
 * master × canal, asi un solo master baja todo sin perder la mezcla relativa.
 */
export type AudioChannel = 'weather' | 'dice';

export interface AudioSettings {
  master: number;
  weather: number;
  dice: number;
}

export type AudioSettingKey = keyof AudioSettings;

const DEFAULTS: AudioSettings = { master: 1, weather: 0.8, dice: 0.8 };

const KEYS: Record<AudioSettingKey, string> = {
  master: 'roleito:audio:master',
  weather: 'roleito:audio:weather',
  dice: 'roleito:audio:dice',
};

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

function readAll(): AudioSettings {
  return { master: readKey('master'), weather: readKey('weather'), dice: readKey('dice') };
}

let cache: AudioSettings = readAll();
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/** Snapshot estable (mismo objeto hasta que algo cambie) para useSyncExternalStore. */
export function getAudioSettings(): AudioSettings {
  return cache;
}

export function setAudioVolume(key: AudioSettingKey, value: number): void {
  const v = clamp01(value);
  if (cache[key] === v) return;
  cache = { ...cache, [key]: v };
  try {
    localStorage.setItem(KEYS[key], String(v));
  } catch {
    /* localStorage bloqueado: el volumen vive solo en memoria */
  }
  emit();
}

/** Volumen final de un canal, ya multiplicado por el master. */
export function getEffectiveVolume(channel: AudioChannel): number {
  return cache.master * cache[channel];
}

export function subscribeAudioSettings(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useAudioSettings(): AudioSettings {
  return useSyncExternalStore(subscribeAudioSettings, getAudioSettings, getAudioSettings);
}

// Otra pestana (DM o jugador) cambio el volumen: refrescamos y notificamos.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && !Object.values(KEYS).includes(e.key)) return;
    cache = readAll();
    emit();
  });
}
