import { describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()

async function freshAudio() {
  vi.resetModules();
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  } as Storage);
  return import('./audioSettings');
}

describe('audioSettings ambience channel', () => {
  it('exposes a default ambience volume', async () => {
    const audio = await freshAudio();
    expect(audio.getAudioSettings().ambience).toBe(0.6);
  });

  it('persists ambience volume locally', async () => {
    const audio = await freshAudio();
    audio.setAudioVolume('ambience', 0.3);
    expect(store.get('roleito:audio:ambience')).toBe('0.3');
    expect(audio.getAudioSettings().ambience).toBe(0.3);
  });

  it('normalizes ambience from shared settings with default', async () => {
    const audio = await freshAudio();
    expect(audio.normalizeSharedAudio({ ambience: 0.4 })?.ambience).toBe(0.4);
    expect(audio.normalizeSharedAudio({})?.ambience).toBe(0.6);
  });

  it('multiplies ambience by master for effective volume', async () => {
    const audio = await freshAudio();
    audio.setAudioVolume('master', 0.5);
    audio.setAudioVolume('ambience', 0.8);
    expect(audio.getEffectiveVolume('ambience')).toBeCloseTo(0.4);
  });

  it('uses shared ambience when synced', async () => {
    const audio = await freshAudio();
    audio.setSharedAudio({ sync: true, master: 1, weather: 0.8, dice: 0.8, ambience: 0.25 });
    expect(audio.getAudioSettings().ambience).toBe(0.25);
  });
});

describe('shared ambient scene', () => {
  it('normalizes a valid scene and rejects unknown ones', async () => {
    const audio = await freshAudio();
    expect(audio.normalizeSharedAudio({ scene: 'combat' })?.scene).toBe('combat');
    expect(audio.normalizeSharedAudio({ scene: 'nope' })?.scene).toBeNull();
    expect(audio.normalizeSharedAudio({})?.scene).toBeNull();
  });

  it('exposes the scene received from the backend', async () => {
    const audio = await freshAudio();
    audio.setSharedAudio({ sync: true, master: 1, weather: 0.8, dice: 0.8, ambience: 0.6, scene: 'sci-fi' });
    expect(audio.getSharedAudio()?.scene).toBe('sci-fi');
  });
});

describe('shared custom tracks', () => {
  const valid = { id: 'abc', name: 'Mi pista', src: '/api/static/c1/audio/tracks/abc.mp3' };

  it('normalizes valid published tracks', async () => {
    const audio = await freshAudio();
    expect(audio.normalizeSharedAudio({ custom_tracks: [valid] })?.custom_tracks).toEqual([valid]);
    expect(audio.normalizeSharedAudio({})?.custom_tracks).toEqual([]);
  });

  it('drops tracks with missing id/src, foreign src or wrong shape', async () => {
    const audio = await freshAudio();
    const raw = {
      custom_tracks: [
        valid,
        { name: 'sin id', src: '/api/static/x.mp3' },
        { id: 'n', name: 'src externo', src: 'https://evil/x.mp3' },
        { id: 'p', src: '/api/static/p.mp3' },
        null,
        'no-object',
      ],
    };
    expect(audio.normalizeSharedAudio(raw)?.custom_tracks).toEqual([
      valid,
      { id: 'p', name: 'Pista', src: '/api/static/p.mp3' },
    ]);
  });

  it('reacts to a change in track ids and ignores equal republishes', async () => {
    const audio = await freshAudio();
    let emits = 0;
    const unsub = audio.subscribeAudioSettings(() => { emits += 1; });
    try {
      audio.setSharedAudio({ sync: true, master: 1, weather: 0.8, dice: 0.8, ambience: 0.6, custom_tracks: [valid] });
      expect(audio.getSharedAudio()?.custom_tracks).toEqual([valid]);
      const afterFirst = emits;
      audio.setSharedAudio({ sync: true, master: 1, weather: 0.8, dice: 0.8, ambience: 0.6, custom_tracks: [{ ...valid, name: 'renombrada' }] });
      expect(emits).toBe(afterFirst);
      audio.setSharedAudio({ sync: true, master: 1, weather: 0.8, dice: 0.8, ambience: 0.6, custom_tracks: [{ ...valid, id: 'otra' }] });
      expect(emits).toBe(afterFirst + 1);
    } finally {
      unsub();
    }
  });
});
