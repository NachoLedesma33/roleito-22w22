import { getAudioSettings } from './audioSettings';
import type { VfxType } from './vfxParticles';

let ctx: AudioContext | null = null;
let whiteNoise: AudioBuffer | null = null;
let pinkNoise: AudioBuffer | null = null;
let output: GainNode | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

function noiseBuffer(c: AudioContext, pink: boolean): AudioBuffer {
  if (pink && pinkNoise) return pinkNoise;
  if (!pink && whiteNoise) return whiteNoise;
  const len = Math.floor(c.sampleRate * 2);
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (pink) {
      last = (last + 0.022 * w) / 1.022;
      data[i] = last * 3.2;
    } else {
      data[i] = w;
    }
  }
  if (pink) pinkNoise = buffer; else whiteNoise = buffer;
  return buffer;
}

function outputBus(c: AudioContext): GainNode {
  if (!output) {
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.16;
    comp.connect(c.destination);
    output = c.createGain();
    output.connect(comp);
  }
  output.gain.value = getAudioSettings().master * 0.55;
  return output;
}

interface Bus {
  c: AudioContext;
  out: GainNode;
  t: number;
  r: () => number;
}

function env(g: GainNode, t: number, attack: number, dur: number, peak: number): void {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
}

interface ToneOpts {
  wave?: OscillatorType;
  f0: number;
  f1?: number;
  dur: number;
  gain: number;
  at?: number;
  attack?: number;
  cutoff?: number;
  filter?: BiquadFilterType;
}

function tone(b: Bus, o: ToneOpts): void {
  const t = b.t + (o.at ?? 0);
  const attack = o.attack ?? 0.004;
  const osc = b.c.createOscillator();
  osc.type = o.wave ?? 'sine';
  osc.frequency.setValueAtTime(Math.max(20, o.f0), t);
  if (o.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
  let tail: AudioNode = osc;
  if (o.cutoff !== undefined) {
    const f = b.c.createBiquadFilter();
    f.type = o.filter ?? 'lowpass';
    f.frequency.value = o.cutoff;
    osc.connect(f);
    tail = f;
  }
  const g = b.c.createGain();
  env(g, t, attack, o.dur, o.gain);
  tail.connect(g).connect(b.out);
  osc.start(t);
  osc.stop(t + attack + o.dur + 0.02);
}

interface NoiseOpts {
  f0: number;
  f1?: number;
  q?: number;
  filter?: BiquadFilterType;
  dur: number;
  gain: number;
  at?: number;
  attack?: number;
  pink?: boolean;
}

function hiss(b: Bus, o: NoiseOpts): void {
  const t = b.t + (o.at ?? 0);
  const attack = o.attack ?? 0.006;
  const src = b.c.createBufferSource();
  src.buffer = noiseBuffer(b.c, !!o.pink);
  src.playbackRate.value = 0.85 + b.r() * 0.3;
  const f = b.c.createBiquadFilter();
  f.type = o.filter ?? 'bandpass';
  f.frequency.setValueAtTime(Math.max(30, o.f0), t);
  if (o.f1 !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.f1), t + o.dur);
  f.Q.value = o.q ?? 1;
  const g = b.c.createGain();
  env(g, t, attack, o.dur, o.gain);
  src.connect(f).connect(g).connect(b.out);
  src.start(t);
  src.stop(t + attack + o.dur + 0.05);
}

function partials(b: Bus, base: number, ratios: number[], dur: number, gain: number, at = 0, wave: OscillatorType = 'sine'): void {
  ratios.forEach((ratio, i) => tone(b, {
    wave, f0: base * ratio, dur: dur * (1 - i * 0.1), gain: gain / (1 + i * 0.8), at, attack: 0.002,
  }));
}

function ticks(b: Bus, count: number, dur: number, gain: number, freq: number, spread: number, at = 0, pink = false): void {
  for (let i = 0; i < count; i++) {
    hiss(b, {
      f0: freq * (0.6 + b.r() * 0.9), q: 0.8, dur: dur * (0.4 + b.r()),
      gain: gain * (0.4 + b.r() * 0.6), at: at + b.r() * spread, attack: 0.001, pink,
    });
  }
}

function bell(b: Bus, base: number, at: number, gain = 0.08): void {
  partials(b, base, [1, 2.01, 2.99, 4.2], 0.85, gain, at);
}

function gun(b: Bus, at = 0): void {
  hiss(b, { filter: 'bandpass', f0: 3800, f1: 2600, q: 3, dur: 0.014, gain: 0.16, at, attack: 0.0005 });
  partials(b, 2100, [1, 1.9], 0.04, 0.04, at);
  hiss(b, { filter: 'highpass', f0: 3000, f1: 800, dur: 0.08, gain: 0.62, at: at + 0.008, attack: 0.0003 });
  hiss(b, { f0: 1600, f1: 400, q: 0.7, dur: 0.12, gain: 0.42, at: at + 0.008, attack: 0.0004 });
  hiss(b, { filter: 'lowpass', f0: 700, f1: 160, q: 1, dur: 0.26, gain: 0.5, at: at + 0.01, attack: 0.001, pink: true });
  partials(b, 1100, [1, 1.6, 2.7, 3.9], 0.24, 0.055, at + 0.012);
  tone(b, { wave: 'sine', f0: 90, f1: 32, dur: 0.3, gain: 0.5, at: at + 0.01, attack: 0.001 });
  tone(b, { wave: 'sine', f0: 52, f1: 26, dur: 0.42, gain: 0.32, at: at + 0.016, attack: 0.002 });
  hiss(b, { filter: 'highpass', f0: 4200, f1: 900, dur: 0.3, gain: 0.1, at: at + 0.04, attack: 0.006 });
  hiss(b, { filter: 'lowpass', f0: 900, f1: 90, dur: 0.7, gain: 0.24, at: at + 0.05, attack: 0.015, pink: true });
  hiss(b, { f0: 1400, f1: 400, q: 0.8, dur: 0.18, gain: 0.09, at: at + 0.24, attack: 0.004 });
}

function arrow(b: Bus, at = 0, heavy = false): void {
  hiss(b, { f0: heavy ? 600 : 900, f1: heavy ? 1800 : 2800, q: 2, dur: heavy ? 0.2 : 0.14, gain: 0.17, at });
  tone(b, { wave: 'sine', f0: heavy ? 140 : 190, f1: 60, dur: 0.13, gain: heavy ? 0.26 : 0.18, at: at + 0.09 });
}

function bolt(b: Bus, at = 0): void {
  hiss(b, { filter: 'highpass', f0: 2600, f1: 900, q: 0.7, dur: 0.09, gain: 0.32, at, attack: 0.001 });
  tone(b, { wave: 'sawtooth', f0: 120, f1: 50, dur: 0.18, gain: 0.14, at, cutoff: 900 });
}

const RECIPES: Record<VfxType, (b: Bus) => void> = {
  fire(b) {
    hiss(b, { f0: 320, f1: 1400, q: 0.7, dur: 0.28, gain: 0.22, attack: 0.02 });
    ticks(b, 18, 0.05, 0.09, 2200, 0.35);
    tone(b, { wave: 'sine', f0: 150, f1: 55, dur: 0.25, gain: 0.3 });
  },
  ice(b) {
    partials(b, 2400, [1, 1.5, 2.3, 3.4], 0.4, 0.09);
    partials(b, 3600, [1, 1.7], 0.3, 0.06, 0.06);
    hiss(b, { filter: 'highpass', f0: 6000, f1: 3000, dur: 0.25, gain: 0.14, attack: 0.004 });
    ticks(b, 14, 0.03, 0.06, 5200, 0.2);
    tone(b, { wave: 'sine', f0: 180, f1: 80, dur: 0.2, gain: 0.16, at: 0.05 });
  },
  lightning(b) {
    bolt(b);
    hiss(b, { filter: 'lowpass', f0: 400, f1: 90, q: 0.6, dur: 0.7, gain: 0.14, attack: 0.02, pink: true });
  },
  heal(b) {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => bell(b, f, i * 0.09, 0.08));
    partials(b, 392, [1, 1.5, 2], 1.2, 0.045, 0.06);
    hiss(b, { filter: 'highpass', f0: 2800, f1: 6800, dur: 1.1, gain: 0.065, attack: 0.35 });
    tone(b, { wave: 'sine', f0: 196, f1: 262, dur: 0.9, gain: 0.1, attack: 0.25 });
  },
  void(b) {
    hiss(b, { filter: 'lowpass', f0: 2600, f1: 160, q: 1.1, dur: 0.7, gain: 0.22, attack: 0.03, pink: true });
    tone(b, { wave: 'sawtooth', f0: 170, f1: 48, dur: 0.8, gain: 0.12, cutoff: 380 });
    tone(b, { wave: 'sine', f0: 62, f1: 36, dur: 0.9, gain: 0.26 });
  },
  flamethrower(b) {
    hiss(b, { filter: 'lowpass', f0: 950, f1: 520, q: 0.6, dur: 0.85, gain: 0.3, attack: 0.05, pink: true });
    hiss(b, { f0: 1600, f1: 800, q: 0.5, dur: 0.85, gain: 0.1, attack: 0.05 });
    ticks(b, 36, 0.04, 0.05, 2400, 0.8);
  },
  thunder(b) {
    hiss(b, { filter: 'highpass', f0: 4200, f1: 1400, dur: 0.11, gain: 0.3, attack: 0.001 });
    hiss(b, { filter: 'lowpass', f0: 900, f1: 110, q: 0.6, dur: 1.5, gain: 0.28, attack: 0.02, pink: true });
    hiss(b, { filter: 'lowpass', f0: 540, f1: 75, q: 0.5, dur: 2, gain: 0.2, at: 0.22, attack: 0.05, pink: true });
    hiss(b, { filter: 'lowpass', f0: 380, f1: 55, q: 0.5, dur: 2.2, gain: 0.14, at: 0.5, attack: 0.1, pink: true });
    tone(b, { wave: 'sine', f0: 74, f1: 26, dur: 2.1, gain: 0.32, attack: 0.04 });
    ticks(b, 14, 0.12, 0.035, 460, 1.5, 0.3, true);
  },
  meteor(b) {
    hiss(b, { filter: 'lowpass', f0: 320, f1: 2600, q: 0.7, dur: 0.85, gain: 0.34, attack: 0.07 });
    tone(b, { wave: 'sawtooth', f0: 60, f1: 130, dur: 0.8, gain: 0.16, attack: 0.06, cutoff: 500 });
    hiss(b, { filter: 'highpass', f0: 4200, f1: 1000, dur: 0.18, gain: 0.3, at: 0.5, attack: 0.001 });
    tone(b, { wave: 'sine', f0: 110, f1: 22, dur: 1.5, gain: 0.7, at: 0.5, attack: 0.006 });
    tone(b, { wave: 'sine', f0: 68, f1: 20, dur: 1.8, gain: 0.4, at: 0.54, attack: 0.01 });
    hiss(b, { filter: 'lowpass', f0: 1800, f1: 90, q: 0.5, dur: 1.6, gain: 0.32, at: 0.52, pink: true });
    hiss(b, { filter: 'lowpass', f0: 620, f1: 48, q: 0.5, dur: 2, gain: 0.22, at: 0.75, attack: 0.08, pink: true });
    ticks(b, 26, 0.07, 0.07, 1200, 1.2, 0.6, true);
  },
  frostnova(b) {
    hiss(b, { f0: 700, f1: 6000, q: 0.8, dur: 0.45, gain: 0.18, attack: 0.03 });
    partials(b, 1200, [1, 1.33, 2, 3], 0.6, 0.07, 0.1);
    tone(b, { wave: 'sine', f0: 120, f1: 50, dur: 0.4, gain: 0.24, at: 0.18 });
  },
  poison(b) {
    hiss(b, { filter: 'lowpass', f0: 1400, f1: 500, q: 1, dur: 0.5, gain: 0.14, pink: true });
    for (let i = 0; i < 7; i++) {
      tone(b, { wave: 'sine', f0: 280 + b.r() * 260, f1: 620 + b.r() * 340, dur: 0.08, gain: 0.05, at: b.r() * 0.45 });
    }
  },
  holy(b) {
    [440, 554.37, 659.25, 880].forEach((f, i) => bell(b, f, i * 0.06, 0.085));
    hiss(b, { filter: 'highpass', f0: 2600, f1: 5600, dur: 1.1, gain: 0.06, attack: 0.3 });
  },
  shadow(b) {
    hiss(b, { filter: 'lowpass', f0: 2200, f1: 200, q: 0.9, dur: 0.6, gain: 0.2, pink: true });
    tone(b, { wave: 'sawtooth', f0: 180, f1: 55, dur: 0.7, gain: 0.1, cutoff: 420 });
  },
  arcane(b) {
    tone(b, { wave: 'sine', f0: 523, f1: 784, dur: 0.9, gain: 0.11, attack: 0.06 });
    tone(b, { wave: 'sine', f0: 527, f1: 790, dur: 0.9, gain: 0.08, attack: 0.06 });
    partials(b, 1046, [1, 1.5, 2, 3], 0.9, 0.07, 0.04);
    hiss(b, { filter: 'highpass', f0: 2600, f1: 6400, dur: 1, gain: 0.06, attack: 0.2 });
    ticks(b, 18, 0.06, 0.04, 5200, 0.8);
  },
  arrow(b) { arrow(b); },
  arrowrain(b) {
    for (let i = 0; i < 7; i++) arrow(b, 0.04 + i * 0.09);
  },
  throwingknife(b) {
    hiss(b, { filter: 'highpass', f0: 5200, f1: 1800, q: 2.4, dur: 0.18, gain: 0.2, attack: 0.002 });
    tone(b, { wave: 'triangle', f0: 3200, f1: 1300, dur: 0.14, gain: 0.06, attack: 0.003 });
    partials(b, 2900, [1, 2.1, 3.3], 0.2, 0.04, 0.02);
    tone(b, { wave: 'sine', f0: 240, f1: 90, dur: 0.1, gain: 0.2, at: 0.13 });
  },
  javelin(b) {
    hiss(b, { f0: 420, f1: 1800, q: 1.8, dur: 0.32, gain: 0.26, attack: 0.015 });
    hiss(b, { filter: 'highpass', f0: 2400, f1: 5200, q: 1.6, dur: 0.22, gain: 0.14, at: 0.04 });
    tone(b, { wave: 'triangle', f0: 180, f1: 320, dur: 0.3, gain: 0.05, at: 0.02 });
    partials(b, 1400, [1, 2.2, 3.6], 0.24, 0.045, 0.06);
    tone(b, { wave: 'sine', f0: 220, f1: 55, dur: 0.28, gain: 0.36, at: 0.28, attack: 0.003 });
    hiss(b, { filter: 'highpass', f0: 1800, f1: 600, dur: 0.14, gain: 0.2, at: 0.28, attack: 0.002 });
    hiss(b, { filter: 'lowpass', f0: 1100, f1: 150, dur: 0.4, gain: 0.18, at: 0.29, pink: true });
    ticks(b, 12, 0.05, 0.06, 1500, 0.3, 0.29);
  },
  slash(b) {
    hiss(b, { f0: 600, f1: 2800, q: 1.4, dur: 0.18, gain: 0.22, attack: 0.01 });
    partials(b, 2400, [1, 1.7], 0.22, 0.05, 0.06);
  },
  cleave(b) {
    hiss(b, { f0: 420, f1: 1900, q: 1.2, dur: 0.26, gain: 0.26, attack: 0.015, pink: true });
    tone(b, { wave: 'sine', f0: 160, f1: 55, dur: 0.22, gain: 0.24, at: 0.09 });
  },
  gunshot(b) { gun(b); },
  burstfire(b) {
    for (let i = 0; i < 6; i++) gun(b, i * 0.11);
  },
  punch(b) {
    hiss(b, { f0: 700, f1: 1500, q: 1, dur: 0.12, gain: 0.14 });
    tone(b, { wave: 'sine', f0: 210, f1: 70, dur: 0.16, gain: 0.3, at: 0.07 });
  },
  slam(b) {
    tone(b, { wave: 'sine', f0: 130, f1: 32, dur: 0.6, gain: 0.5, attack: 0.006 });
    hiss(b, { filter: 'lowpass', f0: 1600, f1: 180, dur: 0.5, gain: 0.24, pink: true });
    ticks(b, 14, 0.05, 0.07, 1400, 0.3);
  },
  chainlightning(b) {
    for (let i = 0; i < 5; i++) bolt(b, i * 0.13);
  },
  icespear(b) {
    hiss(b, { filter: 'highpass', f0: 2000, f1: 5600, q: 2.6, dur: 0.2, gain: 0.2, attack: 0.003 });
    partials(b, 2800, [1, 1.5, 2.4], 0.26, 0.07);
    ticks(b, 10, 0.03, 0.05, 5600, 0.16);
    tone(b, { wave: 'sine', f0: 210, f1: 65, dur: 0.16, gain: 0.26, at: 0.17 });
    hiss(b, { filter: 'lowpass', f0: 1400, f1: 200, dur: 0.3, gain: 0.14, at: 0.17, pink: true });
  },
  hail(b) {
    hiss(b, { filter: 'lowpass', f0: 4800, f1: 2200, q: 0.7, dur: 1.1, gain: 0.12, attack: 0.1 });
    ticks(b, 60, 0.022, 0.05, 4200, 1.1);
    ticks(b, 26, 0.035, 0.045, 2600, 1.1, 0.06);
    for (let i = 0; i < 10; i++) partials(b, 3400 + b.r() * 2200, [1, 1.8], 0.1, 0.035, b.r() * 1);
    tone(b, { wave: 'sine', f0: 110, f1: 50, dur: 0.6, gain: 0.12 });
  },
  earthquake(b) {
    tone(b, { wave: 'sine', f0: 46, f1: 24, dur: 1.4, gain: 0.5, attack: 0.08 });
    hiss(b, { filter: 'lowpass', f0: 500, f1: 90, q: 0.6, dur: 1.3, gain: 0.24, attack: 0.1, pink: true });
    ticks(b, 22, 0.06, 0.05, 900, 1.1, 0, true);
  },
  vines(b) {
    hiss(b, { filter: 'lowpass', f0: 900, f1: 2600, q: 1.3, dur: 0.3, gain: 0.22, attack: 0.02 });
    hiss(b, { f0: 2400, f1: 700, q: 0.8, dur: 0.7, gain: 0.18, attack: 0.05, pink: true });
    ticks(b, 16, 0.04, 0.05, 2200, 0.6);
    tone(b, { wave: 'sawtooth', f0: 150, f1: 55, dur: 0.4, gain: 0.1, at: 0.24, cutoff: 600 });
    tone(b, { wave: 'sine', f0: 170, f1: 60, dur: 0.22, gain: 0.26, at: 0.26 });
    hiss(b, { filter: 'lowpass', f0: 1300, f1: 240, dur: 0.35, gain: 0.14, at: 0.27, pink: true });
  },
  bleed(b) {
    hiss(b, { filter: 'highpass', f0: 2600, f1: 900, q: 1.8, dur: 0.16, gain: 0.2, attack: 0.002 });
    hiss(b, { filter: 'lowpass', f0: 2000, f1: 320, q: 1, dur: 0.38, gain: 0.28, at: 0.06, attack: 0.01, pink: true });
    tone(b, { wave: 'sine', f0: 340, f1: 80, dur: 0.34, gain: 0.16, at: 0.05 });
    hiss(b, { f0: 700, f1: 300, q: 4, dur: 0.3, gain: 0.12, at: 0.14 });
    ticks(b, 8, 0.03, 0.05, 1100, 0.24, 0.12, true);
  },
  toxiccloud(b) {
    hiss(b, { filter: 'lowpass', f0: 1200, f1: 600, q: 0.9, dur: 1, gain: 0.16, attack: 0.12, pink: true });
    for (let i = 0; i < 12; i++) {
      tone(b, { wave: 'sine', f0: 240 + b.r() * 200, f1: 560 + b.r() * 300, dur: 0.09, gain: 0.04, at: b.r() * 0.9 });
    }
  },
  sonicwave(b) {
    tone(b, { wave: 'sine', f0: 180, f1: 1400, dur: 0.45, gain: 0.24, attack: 0.02 });
    hiss(b, { f0: 400, f1: 2600, q: 4, dur: 0.5, gain: 0.14, attack: 0.02 });
    tone(b, { wave: 'sine', f0: 120, f1: 40, dur: 0.5, gain: 0.22, at: 0.35 });
  },
  forcepush(b) {
    hiss(b, { filter: 'lowpass', f0: 200, f1: 3200, q: 0.7, dur: 0.35, gain: 0.3, attack: 0.03 });
    tone(b, { wave: 'sine', f0: 90, f1: 34, dur: 0.5, gain: 0.34, at: 0.18 });
  },
  gravityfield(b) {
    tone(b, { wave: 'sine', f0: 48, f1: 32, dur: 1.2, gain: 0.4, attack: 0.12 });
    tone(b, { wave: 'sine', f0: 96, f1: 64, dur: 1.2, gain: 0.14, attack: 0.12 });
    hiss(b, { filter: 'lowpass', f0: 700, f1: 200, q: 2, dur: 1.1, gain: 0.1, attack: 0.2, pink: true });
  },
  barrier(b) {
    partials(b, 660, [1, 1.5, 2.2], 0.9, 0.1);
    hiss(b, { filter: 'highpass', f0: 2200, f1: 5200, dur: 0.5, gain: 0.08, attack: 0.06 });
    tone(b, { wave: 'sine', f0: 150, f1: 60, dur: 0.3, gain: 0.2, at: 0.12 });
  },
  lifedrain(b) {
    hiss(b, { filter: 'lowpass', f0: 2400, f1: 300, q: 1.3, dur: 0.95, gain: 0.2, attack: 0.05, pink: true });
    tone(b, { wave: 'sine', f0: 72, f1: 40, dur: 1, gain: 0.22 });
    hiss(b, { filter: 'highpass', f0: 1600, f1: 3600, dur: 0.1, gain: 0.1, attack: 0.003 });
    tone(b, { wave: 'sawtooth', f0: 250, f1: 150, dur: 0.42, gain: 0.11, at: 0.06, cutoff: 1100 });
    tone(b, { wave: 'sawtooth', f0: 220, f1: 120, dur: 0.36, gain: 0.09, at: 0.5, cutoff: 900 });
    for (let i = 0; i < 14; i++) {
      const at = 0.09 + i * 0.055;
      tone(b, { wave: 'sine', f0: 170 - i * 4, f1: 150 - i * 4, dur: 0.05, gain: 0.028, at, attack: 0.006 });
    }
    hiss(b, { f0: 1400, f1: 700, q: 1.5, dur: 0.14, gain: 0.05, at: 0.44 });
    hiss(b, { f0: 1200, f1: 600, q: 1.5, dur: 0.14, gain: 0.045, at: 0.85 });
  },
  hex(b) {
    partials(b, 330, [1, 1.06, 1.5, 2.12], 0.9, 0.075);
    hiss(b, { filter: 'highpass', f0: 3400, f1: 1600, dur: 0.7, gain: 0.09, attack: 0.08, pink: true });
    tone(b, { wave: 'sine', f0: 130, f1: 52, dur: 0.8, gain: 0.18 });
  },
};

export function playVfxSound(type: VfxType): void {
  const c = audio();
  if (!c) return;
  const recipe = RECIPES[type];
  if (!recipe) return;
  recipe({ c, out: outputBus(c), t: c.currentTime + 0.005, r: Math.random });
}
