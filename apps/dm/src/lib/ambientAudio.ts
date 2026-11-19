export type AmbientScene = 'medieval' | 'sci-fi' | 'combat' | 'suspense' | 'campaign';

export interface AmbientTrack {
  id: string;
  src: string;
  scene: AmbientScene;
  kind: 'music' | 'ambience' | 'stinger';
  loop: boolean;
  gain: number;
}

export function resolveSceneTracks(
  scene: AmbientScene,
  tracks: readonly AmbientTrack[],
): AmbientTrack[] {
  return tracks.filter((t) => t.scene === scene);
}

export const AMBIENT_TRACKS: readonly AmbientTrack[] = [
  { id: 'medieval-theme', src: '/api/static/audio/oga/music/medieval-tower-inn.mp3', scene: 'medieval', kind: 'music', loop: true, gain: 0.5 },
  { id: 'medieval-tavern', src: '/api/static/audio/oga/music/medieval-market-loop.mp3', scene: 'medieval', kind: 'ambience', loop: true, gain: 0.35 },
  { id: 'medieval-jingle', src: '/api/static/audio/kenney/music-jingles/Pizzicato%20jingles/jingles_PIZZI00.ogg', scene: 'medieval', kind: 'stinger', loop: false, gain: 0.7 },
  { id: 'sci-fi-theme', src: '/api/static/audio/oga/music/scifi-echoes.mp3', scene: 'sci-fi', kind: 'music', loop: true, gain: 0.5 },
  { id: 'sci-fi-computer', src: '/api/static/audio/oga/music/crashed-ship.ogg', scene: 'sci-fi', kind: 'ambience', loop: true, gain: 0.25 },
  { id: 'sci-fi-jingle', src: '/api/static/audio/kenney/music-jingles/8-Bit%20jingles/jingles_NES00.ogg', scene: 'sci-fi', kind: 'stinger', loop: false, gain: 0.6 },
  { id: 'combat-battle', src: '/api/static/audio/oga/music/medieval-battle.mp3', scene: 'combat', kind: 'music', loop: true, gain: 0.5 },
  { id: 'combat-rumble', src: '/api/static/audio/kenney/sci-fi-sounds/lowFrequency_explosion_000.ogg', scene: 'combat', kind: 'ambience', loop: true, gain: 0.12 },
  { id: 'combat-hit', src: '/api/static/audio/oga/medieval-impacts/Axe%20Katana%20Blade%20on%20Blade.wav', scene: 'combat', kind: 'stinger', loop: false, gain: 0.8 },
  { id: 'combat-metal', src: '/api/static/audio/kenney/impact-sounds/impactMetal_heavy_000.ogg', scene: 'combat', kind: 'stinger', loop: false, gain: 0.7 },
  { id: 'combat-jingle', src: '/api/static/audio/kenney/music-jingles/Hit%20jingles/jingles_HIT00.ogg', scene: 'combat', kind: 'stinger', loop: false, gain: 0.7 },
  { id: 'suspense-theme', src: '/api/static/audio/oga/music/dark-cavern-1.ogg', scene: 'suspense', kind: 'music', loop: true, gain: 0.5 },
  { id: 'suspense-noise', src: '/api/static/audio/oga/music/dark-cavern-2.ogg', scene: 'suspense', kind: 'ambience', loop: true, gain: 0.2 },
  { id: 'suspense-jingle', src: '/api/static/audio/kenney/music-jingles/Steel%20jingles/jingles_STEEL00.ogg', scene: 'suspense', kind: 'stinger', loop: false, gain: 0.6 },
  { id: 'campaign-theme', src: '/api/static/audio/oga/music/epic-orchestral-fantasy.mp3', scene: 'campaign', kind: 'music', loop: true, gain: 0.5 },
  { id: 'campaign-jingle', src: '/api/static/audio/kenney/music-jingles/Steel%20jingles/jingles_STEEL00.ogg', scene: 'campaign', kind: 'stinger', loop: false, gain: 0.6 },
];

interface Playing {
  source: AudioBufferSourceNode;
  gain: GainNode;
  kind: AmbientTrack['kind'];
  baseGain: number;
}

export class AmbientMixer {
  private ctx: AudioContext | null = null;
  private output: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private playing = new Map<string, Playing>();
  private volume = 1;

  constructor(private readonly tracks: readonly AmbientTrack[] = []) {}

  private audio(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!this.ctx) {
      this.ctx = new Ctor();
      this.output = this.ctx.createGain();
      this.output.gain.value = this.volume;
      this.output.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  private load(ctx: AudioContext, src: string): Promise<AudioBuffer> {
    const cached = this.buffers.get(src);
    if (cached) return Promise.resolve(cached);
    return fetch(src)
      .then((r) => r.arrayBuffer())
      .then((b) => ctx.decodeAudioData(b))
      .then((buf) => {
        this.buffers.set(src, buf);
        return buf;
      });
  }

  private async start(ctx: AudioContext, track: AmbientTrack, loop: boolean, onEnded?: () => void): Promise<void> {
    if (!track.src) return;
    let buffer: AudioBuffer;
    try {
      buffer = await this.load(ctx, track.src);
    } catch {
      onEnded?.();
      return;
    }
    if (!this.ctx || this.ctx !== ctx) {
      onEnded?.();
      return;
    }
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = loop;
    gain.gain.setValueAtTime(loop ? track.gain : 0, ctx.currentTime);
    source.connect(gain).connect(this.output!);
    source.start();
    if (loop) {
      this.playing.set(track.id, { source, gain, kind: track.kind, baseGain: track.gain });
    } else {
      gain.gain.setValueAtTime(track.gain, ctx.currentTime + 0.01);
      source.onended = () => {
        this.playing.delete(track.id);
        onEnded?.();
      };
      this.playing.set(track.id, { source, gain, kind: track.kind, baseGain: track.gain });
    }
  }

  private stopLoops(ctx: AudioContext): void {
    for (const [id, p] of this.playing) {
      if (!p.source.loop) continue;
      p.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
      p.source.stop(ctx.currentTime + 0.5);
      this.playing.delete(id);
    }
  }

  setScene(scene: AmbientScene): void {
    const ctx = this.audio();
    if (!ctx) return;
    this.stopLoops(ctx);
    for (const t of resolveSceneTracks(scene, this.tracks)) {
      if (!t.loop || t.kind === 'stinger') continue;
      void this.start(ctx, t, true);
    }
  }

  /** Reproduce una pista del catálogo del usuario en lugar de la escena. */
  playCustom(track: { id: string; src: string; gain?: number }): void {
    const ctx = this.audio();
    if (!ctx) return;
    this.stopLoops(ctx);
    const custom: AmbientTrack = {
      id: `custom-${track.id}`,
      src: track.src,
      scene: 'campaign',
      kind: 'music',
      loop: true,
      gain: track.gain ?? 0.5,
    };
    void this.start(ctx, custom, true);
  }

  setVolume(v: number): void {
    this.volume = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
    if (this.ctx && this.output) {
      this.output.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  /** Baja la música loop mientras suena un stinger y la restaura al terminar. */
  private duckMusic(ctx: AudioContext, factor: number): void {
    for (const p of this.playing.values()) {
      if (!p.source.loop || p.kind !== 'music') continue;
      p.gain.gain.setTargetAtTime(p.baseGain * factor, ctx.currentTime, 0.05);
    }
  }

  playStinger(id: string): void {
    const track = this.tracks.find((t) => t.id === id && t.kind === 'stinger');
    const ctx = this.audio();
    if (!track || !ctx) return;
    this.duckMusic(ctx, 0.3);
    void this.start(ctx, track, false, () => this.duckMusic(ctx, 1));
  }

  dispose(): void {
    const ctx = this.ctx;
    if (ctx) {
      for (const p of this.playing.values()) {
        try {
          p.source.stop();
        } catch {}
      }
      void ctx.close().catch(() => {});
    }
    this.playing.clear();
    this.buffers.clear();
    this.ctx = null;
    this.output = null;
  }
}
