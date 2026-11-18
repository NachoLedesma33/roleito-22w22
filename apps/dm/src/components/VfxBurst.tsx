import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { memoByKey, seededRandom, type VfxType } from '../lib/vfxParticles';

export interface VfxEffect {
  id: number;
  type: VfxType;
  from: [number, number, number];
  to: [number, number, number];
  duration: number;
  startedAt?: number;
}

export type VfxPose = {
  position: [number, number, number];
  direction: [number, number, number];
};

export function vfxEmitterPose(
  type: VfxType,
  t: number,
  from: [number, number, number],
  to: [number, number, number],
  offsetY = 0,
): VfxPose {
  const preset = MOTION[type];
  const k = Math.min(1, Math.max(0, t));
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  if (preset === 'impact' || preset === 'strike') {
    return { position: [to[0], to[1] + offsetY, to[2]], direction: [0, 1, 0] };
  }
  if (preset === 'stream') {
    const len = Math.hypot(dx, dz) || 1;
    return {
      position: [from[0], from[1] + offsetY, from[2]],
      direction: [dx / len, 0, dz / len],
    };
  }
  const flat = Math.hypot(dx, dz) || 1;
  const arc = ARC[type];
  return {
    position: [
      from[0] + dx * k,
      from[1] + offsetY + (to[1] - from[1]) * k + Math.sin(k * Math.PI) * arc,
      from[2] + dz * k,
    ],
    direction: [dx / flat, (Math.cos(k * Math.PI) * arc * Math.PI) / flat, dz / flat],
  };
}

const MOTION: Record<VfxType, 'projectile' | 'impact' | 'stream' | 'strike'> = {
  fire: 'projectile', ice: 'projectile', lightning: 'projectile', heal: 'impact', void: 'impact',
  flamethrower: 'stream', thunder: 'strike', meteor: 'projectile', frostnova: 'impact',
  poison: 'projectile', holy: 'impact', shadow: 'impact', arcane: 'impact',
};

const ARC: Record<VfxType, number> = {
  fire: 1.6, ice: 0.9, lightning: 0.15, heal: 0, void: 0, flamethrower: 0,
  thunder: 0, meteor: 2.6, frostnova: 0, poison: 0.7, holy: 0, shadow: 0, arcane: 0,
};

type SpriteKind = 'soft' | 'flame' | 'smoke' | 'spark' | 'shard' | 'rune';

function makeSprite(kind: SpriteKind): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(32, 32);
  const rnd = seededRandom(kind.length * 7919);

  if (kind === 'soft' || kind === 'smoke') {
    const puffs = kind === 'soft' ? 1 : 9;
    for (let i = 0; i < puffs; i++) {
      const x = puffs === 1 ? 0 : (rnd() - 0.5) * 22;
      const y = puffs === 1 ? 0 : (rnd() - 0.5) * 22;
      const r = puffs === 1 ? 30 : 12 + rnd() * 14;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, kind === 'soft' ? '#ffffff' : '#ffffffcc');
      g.addColorStop(0.45, kind === 'soft' ? '#ffffffcc' : '#ffffff66');
      g.addColorStop(1, '#ffffff00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'flame') {
    const g = ctx.createLinearGradient(0, -30, 0, 28);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, '#ffffffdd');
    g.addColorStop(0.8, '#ffffff66');
    g.addColorStop(1, '#ffffff00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.bezierCurveTo(16, -12, 20, 6, 8, 20);
    ctx.bezierCurveTo(2, 28, -4, 28, -9, 19);
    ctx.bezierCurveTo(-20, 4, -14, -12, 0, -30);
    ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = ctx.createRadialGradient(0, 12, 0, 0, 12, 14 + rnd() * 10);
      a.addColorStop(0, '#ffffff66');
      a.addColorStop(1, '#ffffff00');
      ctx.fillStyle = a;
      ctx.beginPath();
      ctx.arc((rnd() - 0.5) * 16, 8 + (rnd() - 0.5) * 16, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'spark') {
    const g = ctx.createLinearGradient(0, -31, 0, 31);
    g.addColorStop(0, '#ffffff00');
    g.addColorStop(0.42, '#ffffff66');
    g.addColorStop(0.5, '#ffffff');
    g.addColorStop(0.58, '#ffffff66');
    g.addColorStop(1, '#ffffff00');
    ctx.fillStyle = g;
    ctx.fillRect(-2.5, -31, 5, 62);
    const h = ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
    h.addColorStop(0, '#ffffffee');
    h.addColorStop(1, '#ffffff00');
    ctx.fillStyle = h;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'shard') {
    const g = ctx.createLinearGradient(-10, -28, 12, 26);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.45, '#ffffffcc');
    g.addColorStop(1, '#ffffff44');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(10, -6);
    ctx.lineTo(5, 26);
    ctx.lineTo(-7, 10);
    ctx.lineTo(-9, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * 24;
      const y = Math.sin(a) * 24;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-24, 0);
    ctx.lineTo(24, 0);
    ctx.moveTo(0, -24);
    ctx.lineTo(0, 24);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function getSprite(kind: SpriteKind): THREE.Texture {
  return memoByKey(`vfx-sprite-${kind}`, () => makeSprite(kind));
}

type Mode = 'head' | 'trail' | 'burst' | 'stream' | 'rise' | 'implode' | 'orbit';

type LayerCfg = {
  kind: SpriteKind;
  mode: Mode;
  count: number;
  colors: [number, number, number];
  birth: [number, number];
  life: [number, number];
  size: [number, number];
  speed: [number, number];
  spread: number;
  rise: number;
  gravity: number;
  drag: number;
  radius: number;
  spin: number;
  glow: number;
  opacity: number;
  endScale: number;
  additive: boolean;
};

type LayerInput = Partial<LayerCfg> & Pick<LayerCfg, 'kind' | 'mode' | 'count' | 'colors'>;

function def(input: LayerInput): LayerCfg {
  return {
    birth: [0, 0.45], life: [0.3, 0.65], size: [0.18, 0.45], speed: [0.8, 2],
    spread: 0.5, rise: 0, gravity: 0, drag: 0, radius: 0.6, spin: 0,
    glow: 2.2, opacity: 0.85, endScale: 1.6, additive: true, ...input,
  };
}

const FIRE = [0xfffbe0, 0xffa010, 0x601000] as [number, number, number];
const FIRE_SMOKE = [0x554640, 0x2a201c, 0x0b0808] as [number, number, number];
const ICE = [0xffffff, 0x8fe8ff, 0x103c9c] as [number, number, number];
const ICE_MIST = [0xcdeeff, 0x7ab6d8, 0x24405c] as [number, number, number];
const VOLT = [0xffffff, 0x9fd0ff, 0x4030b0] as [number, number, number];
const HEAL = [0xffffe8, 0xa0ffb0, 0x1a8040] as [number, number, number];
const VOID = [0xd0a0ff, 0x6a20c0, 0x080010] as [number, number, number];
const POISON = [0xd8ff90, 0x60c020, 0x0b3008] as [number, number, number];
const HOLY = [0xffffe0, 0xffd060, 0xa05000] as [number, number, number];
const SHADOW = [0x8a70c0, 0x2a1040, 0x000000] as [number, number, number];
const ARCANE = [0xd0f0ff, 0x6050ff, 0xa020d0] as [number, number, number];

type Look = {
  layers: LayerCfg[];
  ribbon?: 'arc' | 'strike';
  ring?: { color: number; radius: number; at: number };
  light?: { color: number; intensity: number };
  rock?: boolean;
};

const LOOKS: Record<VfxType, Look> = {
  fire: {
    layers: [
      def({ kind: 'soft', mode: 'head', count: 1, birth: [0, 0.7], life: [9, 9], size: [0.38, 0.38], speed: [0, 0], spread: 0, colors: [0xffffff, 0xffd070, 0xff6a10], glow: 3.8, opacity: 1, endScale: 1 }),
      def({ kind: 'flame', mode: 'head', count: 1, birth: [0, 0.7], life: [9, 9], size: [0.62, 0.62], speed: [0, 0], spread: 0, colors: FIRE, glow: 2.6, opacity: 0.75, endScale: 1, spin: 0 }),
      def({ kind: 'flame', mode: 'trail', count: 38, birth: [0, 0.68], life: [0.24, 0.48], size: [0.28, 0.78], speed: [2, 4.5], spread: 0.9, rise: 0.9, colors: FIRE, glow: 2.7, opacity: 0.88, spin: 3 }),
      def({ kind: 'spark', mode: 'trail', count: 34, birth: [0, 0.7], life: [0.18, 0.42], size: [0.04, 0.12], speed: [3, 6], spread: 1.2, gravity: -4, colors: [0xffffff, 0xffc040, 0xff3000], glow: 4, opacity: 0.95, spin: 11 }),
      def({ kind: 'smoke', mode: 'trail', count: 22, birth: [0.04, 0.64], life: [0.55, 1.1], size: [0.6, 1.4], speed: [0.25, 0.8], spread: 1, rise: 1.4, colors: FIRE_SMOKE, glow: 1, opacity: 0.26, additive: false, endScale: 3, spin: 0.6 }),
      def({ kind: 'flame', mode: 'burst', count: 52, birth: [0.71, 0.76], life: [0.3, 0.66], size: [0.4, 1.15], speed: [4, 9], spread: 1, rise: 1.5, colors: FIRE, glow: 3.1, opacity: 0.92, endScale: 2.2, spin: 3 }),
      def({ kind: 'smoke', mode: 'burst', count: 32, birth: [0.73, 0.8], life: [0.8, 1.2], size: [0.8, 2], speed: [0.8, 2.2], spread: 1, rise: 1.8, colors: FIRE_SMOKE, glow: 1, opacity: 0.38, additive: false, endScale: 3.2 }),
    ],
    ring: { color: 0xff9020, radius: 2.6, at: 0.74 },
    light: { color: 0xff9020, intensity: 2.8 },
  },
  ice: {
    layers: [
      def({ kind: 'shard', mode: 'head', count: 1, birth: [0, 0.7], life: [9, 9], size: [0.5, 0.5], speed: [0, 0], spread: 0, colors: ICE, glow: 2.4, opacity: 0.95, endScale: 1, spin: 0 }),
      def({ kind: 'soft', mode: 'head', count: 1, birth: [0, 0.7], life: [9, 9], size: [0.22, 0.22], speed: [0, 0], spread: 0, colors: ICE, glow: 2.8, opacity: 0.55, endScale: 1 }),
      def({ kind: 'shard', mode: 'trail', count: 10, birth: [0, 0.68], life: [0.32, 0.64], size: [0.18, 0.45], speed: [0.2, 0.7], spread: 0.6, colors: ICE, glow: 2.3, opacity: 0.95, spin: 6 }),
      def({ kind: 'spark', mode: 'trail', count: 30, birth: [0, 0.7], life: [0.2, 0.5], size: [0.03, 0.1], speed: [1.8, 4], spread: 1, gravity: -2, colors: [0xffffff, 0x9fe8ff, 0x2050c0], glow: 3.6, opacity: 0.95, spin: 9 }),
      def({ kind: 'smoke', mode: 'trail', count: 18, birth: [0.05, 0.65], life: [0.6, 1], size: [0.5, 1.2], speed: [0.4, 1.2], spread: 0.9, rise: 0.9, colors: ICE_MIST, glow: 1, opacity: 0.24, additive: false, endScale: 2.6 }),
      def({ kind: 'shard', mode: 'burst', count: 48, birth: [0.71, 0.76], life: [0.38, 0.74], size: [0.16, 0.55], speed: [3.5, 8], spread: 0.9, rise: 0.6, gravity: -5, colors: ICE, glow: 2.4, opacity: 0.95, spin: 8 }),
      def({ kind: 'smoke', mode: 'burst', count: 26, birth: [0.73, 0.8], life: [0.7, 1.1], size: [0.7, 1.8], speed: [0.8, 2.4], spread: 1, rise: 0.5, colors: ICE_MIST, glow: 1, opacity: 0.32, additive: false, endScale: 2.8 }),
    ],
    ring: { color: 0x8fe8ff, radius: 2.4, at: 0.74 },
    light: { color: 0x8fe8ff, intensity: 1.4 },
  },
  lightning: {
    layers: [
      def({ kind: 'spark', mode: 'burst', count: 60, birth: [0, 0.04], life: [0.15, 0.45], size: [0.05, 0.18], speed: [4, 10], spread: 1.2, gravity: -5, colors: VOLT, glow: 4, opacity: 1, spin: 12 }),
      def({ kind: 'soft', mode: 'burst', count: 20, birth: [0, 0.05], life: [0.18, 0.42], size: [0.2, 0.6], speed: [1, 4], spread: 1, colors: [0xffffff, 0x9fd0ff, 0x3020a0], glow: 3.4, opacity: 0.7, endScale: 2 }),
      def({ kind: 'smoke', mode: 'burst', count: 12, birth: [0.02, 0.08], life: [0.5, 0.9], size: [0.5, 1.2], speed: [0.5, 1.5], spread: 1, rise: 0.9, colors: [0x303040, 0x181828, 0x080810], glow: 1, opacity: 0.25, additive: false, endScale: 2.6 }),
    ],
    ribbon: 'arc',
    ring: { color: 0x9fd0ff, radius: 2.2, at: 0.02 },
    light: { color: 0xbfe0ff, intensity: 4 },
  },
  thunder: {
    layers: [
      def({ kind: 'spark', mode: 'burst', count: 80, birth: [0, 0.05], life: [0.2, 0.6], size: [0.06, 0.22], speed: [5, 12], spread: 1.3, gravity: -6, colors: VOLT, glow: 4.2, opacity: 1, spin: 14 }),
      def({ kind: 'shard', mode: 'burst', count: 26, birth: [0.01, 0.07], life: [0.4, 0.8], size: [0.1, 0.3], speed: [3, 8], spread: 1, rise: 1, gravity: -9, colors: [0x9fa8b8, 0x505868, 0x181820], glow: 1.2, opacity: 0.8, spin: 10 }),
      def({ kind: 'smoke', mode: 'burst', count: 20, birth: [0.02, 0.1], life: [0.7, 1.2], size: [0.7, 1.8], speed: [0.8, 2.2], spread: 1, rise: 1.4, colors: [0x343440, 0x1a1a26, 0x07070c], glow: 1, opacity: 0.32, additive: false, endScale: 2.8 }),
    ],
    ribbon: 'strike',
    ring: { color: 0xbfe0ff, radius: 3.2, at: 0.04 },
    light: { color: 0xd8e8ff, intensity: 5 },
  },
  heal: {
    layers: [
      def({ kind: 'soft', mode: 'head', count: 1, birth: [0, 1], life: [9, 9], size: [0.3, 0.3], speed: [0, 0], spread: 0, colors: HEAL, glow: 2.2, opacity: 0.45, endScale: 1 }),
      def({ kind: 'spark', mode: 'rise', count: 72, birth: [0, 0.65], life: [0.5, 1], size: [0.04, 0.14], speed: [0.9, 2.4], spread: 0.8, rise: 1.8, colors: HEAL, glow: 3.2, opacity: 0.95, spin: 6, radius: 0.6 }),
      def({ kind: 'soft', mode: 'rise', count: 28, birth: [0, 0.7], life: [0.6, 1.1], size: [0.15, 0.45], speed: [0.3, 0.9], spread: 0.7, rise: 1.3, colors: HEAL, glow: 2, opacity: 0.3, endScale: 2.2, radius: 0.45 }),
      def({ kind: 'spark', mode: 'burst', count: 34, birth: [0.02, 0.1], life: [0.4, 0.75], size: [0.03, 0.11], speed: [1.5, 4], spread: 0.7, rise: 1.6, colors: HEAL, glow: 3.2, opacity: 0.85, spin: 7 }),
    ],
    ring: { color: 0xa0ffb0, radius: 1.8, at: 0.03 },
    light: { color: 0xa0ffb0, intensity: 1.2 },
  },
  void: {
    layers: [
      def({ kind: 'soft', mode: 'head', count: 1, birth: [0, 0.95], life: [9, 9], size: [0.75, 0.75], speed: [0, 0], spread: 0, colors: [0x1a0030, 0x2a0840, 0x000000], glow: 1, opacity: 0.98, additive: false, endScale: 1, radius: 1 }),
      def({ kind: 'soft', mode: 'head', count: 1, birth: [0, 0.95], life: [9, 9], size: [1.05, 1.05], speed: [0, 0], spread: 0, colors: VOID, glow: 1, opacity: 0.16, additive: false, endScale: 1.4, radius: 1 }),
      def({ kind: 'spark', mode: 'implode', count: 60, birth: [0, 0.55], life: [0.45, 0.85], size: [0.04, 0.14], speed: [2.5, 5], spread: 0.5, colors: VOID, glow: 2.6, opacity: 0.85, spin: 9, radius: 2 }),
      def({ kind: 'smoke', mode: 'implode', count: 36, birth: [0, 0.6], life: [0.7, 1.15], size: [0.6, 1.5], speed: [1, 2.6], spread: 0.7, colors: VOID, glow: 1, opacity: 0.48, additive: false, endScale: 1.5, radius: 2.2 }),
    ],
    ring: { color: 0x8a40d0, radius: 2.2, at: 0.02 },
    light: { color: 0x8a40d0, intensity: 1.3 },
  },
  flamethrower: {
    layers: [
      def({ kind: 'flame', mode: 'stream', count: 130, birth: [0, 0.62], life: [0.26, 0.5], size: [0.28, 0.8], speed: [13, 20], spread: 0.75, rise: 0.6, colors: [0xffffff, 0xffb020, 0x802000], glow: 2.8, opacity: 0.9, endScale: 2.1, spin: 3 }),
      def({ kind: 'flame', mode: 'stream', count: 60, birth: [0, 0.52], life: [0.18, 0.36], size: [0.18, 0.5], speed: [16, 24], spread: 0.45, rise: 0.4, colors: [0xffffff, 0xffd060, 0xff6000], glow: 3.6, opacity: 0.9, endScale: 1.7, spin: 2 }),
      def({ kind: 'soft', mode: 'stream', count: 40, birth: [0, 0.5], life: [0.14, 0.3], size: [0.16, 0.38], speed: [14, 22], spread: 0.4, colors: [0xffffff, 0xffd060, 0xff6000], glow: 3.6, opacity: 0.75, endScale: 1.5 }),
      def({ kind: 'spark', mode: 'stream', count: 70, birth: [0, 0.66], life: [0.3, 0.65], size: [0.04, 0.12], speed: [10, 18], spread: 1.4, gravity: -3, colors: [0xffffff, 0xffc040, 0xff4000], glow: 4, opacity: 0.9, spin: 13 }),
      def({ kind: 'smoke', mode: 'stream', count: 60, birth: [0, 0.6], life: [0.55, 1.1], size: [0.5, 1.4], speed: [4, 9], spread: 1.2, rise: 1.4, colors: FIRE_SMOKE, glow: 1, opacity: 0.34, additive: false, endScale: 3, spin: 0.8 }),
      def({ kind: 'flame', mode: 'burst', count: 34, birth: [0.3, 0.75], life: [0.28, 0.56], size: [0.35, 0.95], speed: [1.5, 4], spread: 0.9, rise: 1.2, colors: FIRE, glow: 2.6, opacity: 0.85, endScale: 2 }),
      def({ kind: 'smoke', mode: 'burst', count: 24, birth: [0.66, 0.8], life: [0.7, 1.1], size: [0.8, 2], speed: [0.8, 2], spread: 1, rise: 1.6, colors: FIRE_SMOKE, glow: 1, opacity: 0.4, additive: false, endScale: 3 }),
    ],
    light: { color: 0xff9020, intensity: 3 },
  },
  meteor: {
    layers: [
      def({ kind: 'soft', mode: 'head', count: 1, birth: [0, 0.72], life: [9, 9], size: [0.4, 0.4], speed: [0, 0], spread: 0, colors: [0xffffff, 0xffe080, 0xff7a10], glow: 3.4, opacity: 0.9, endScale: 1 }),
      def({ kind: 'flame', mode: 'trail', count: 52, birth: [0, 0.7], life: [0.28, 0.58], size: [0.45, 1.1], speed: [2, 4.5], spread: 1, rise: 1.2, colors: FIRE, glow: 2.9, opacity: 0.92, endScale: 2.2, spin: 3 }),
      def({ kind: 'spark', mode: 'trail', count: 46, birth: [0, 0.72], life: [0.28, 0.64], size: [0.06, 0.2], speed: [4, 7.5], spread: 1.2, gravity: -5, colors: [0xffffff, 0xffb040, 0xff3000], glow: 4, opacity: 0.95, spin: 13 }),
      def({ kind: 'smoke', mode: 'trail', count: 34, birth: [0.03, 0.68], life: [0.7, 1.2], size: [0.7, 1.7], speed: [0.5, 1.6], spread: 1.1, rise: 1.7, colors: FIRE_SMOKE, glow: 1, opacity: 0.38, additive: false, endScale: 3 }),
      def({ kind: 'flame', mode: 'burst', count: 68, birth: [0.73, 0.78], life: [0.38, 0.8], size: [0.55, 1.5], speed: [5, 11], spread: 1, rise: 1.8, colors: FIRE, glow: 3.2, opacity: 0.95, endScale: 2.6, spin: 4 }),
      def({ kind: 'shard', mode: 'burst', count: 44, birth: [0.74, 0.79], life: [0.55, 1.1], size: [0.14, 0.42], speed: [5, 10], spread: 1, rise: 1.2, gravity: -12, colors: [0x8a7060, 0x40302a, 0x120c0a], glow: 1.1, opacity: 0.92, spin: 11 }),
      def({ kind: 'smoke', mode: 'burst', count: 36, birth: [0.75, 0.82], life: [0.9, 1.3], size: [1, 2.2], speed: [1, 3.4], spread: 1, rise: 2, colors: FIRE_SMOKE, glow: 1, opacity: 0.45, additive: false, endScale: 3.2 }),
    ],
    rock: true,
    ring: { color: 0xffb040, radius: 3.8, at: 0.76 },
    light: { color: 0xffa030, intensity: 3.4 },
  },
  frostnova: {
    layers: [
      def({ kind: 'shard', mode: 'burst', count: 44, birth: [0.02, 0.08], life: [0.45, 0.85], size: [0.18, 0.5], speed: [4, 8], spread: 0.8, rise: 0.5, gravity: -4, colors: ICE, glow: 2.5, opacity: 0.95, spin: 8 }),
      def({ kind: 'shard', mode: 'orbit', count: 64, birth: [0, 0.14], life: [0.55, 0.95], size: [0.18, 0.6], speed: [0, 0], spread: 0, rise: 0.25, colors: ICE, glow: 2.5, opacity: 0.95, spin: 4, radius: 1.8 }),
      def({ kind: 'spark', mode: 'orbit', count: 80, birth: [0, 0.2], life: [0.45, 0.85], size: [0.04, 0.14], speed: [0, 0], spread: 0, rise: 0.5, colors: [0xffffff, 0x9fe8ff, 0x2050c0], glow: 3.8, opacity: 0.95, spin: 6, radius: 2.2 }),
      def({ kind: 'smoke', mode: 'orbit', count: 34, birth: [0, 0.2], life: [0.75, 1.15], size: [0.6, 1.5], speed: [0, 0], spread: 0, rise: 0.35, colors: ICE_MIST, glow: 1, opacity: 0.34, additive: false, endScale: 2.6, radius: 1.6 }),
    ],
    ring: { color: 0x9fe8ff, radius: 3.6, at: 0.02 },
    light: { color: 0x9fe8ff, intensity: 1.6 },
  },
  poison: {
    layers: [
      def({ kind: 'soft', mode: 'head', count: 1, birth: [0, 0.72], life: [9, 9], size: [0.6, 0.6], speed: [0, 0], spread: 0, colors: POISON, glow: 1.1, opacity: 0.5, additive: false, endScale: 1.6, radius: 0.9 }),
      def({ kind: 'smoke', mode: 'trail', count: 44, birth: [0, 0.7], life: [0.5, 1], size: [0.5, 1.3], speed: [0.7, 1.8], spread: 1.3, rise: 1, colors: POISON, glow: 1.1, opacity: 0.42, additive: false, endScale: 2.8, spin: 1 }),
      def({ kind: 'soft', mode: 'trail', count: 18, birth: [0, 0.68], life: [0.4, 0.85], size: [0.3, 0.8], speed: [0.5, 1.2], spread: 1.1, rise: 0.9, colors: POISON, glow: 1.2, opacity: 0.28, additive: false, endScale: 2.4 }),
      def({ kind: 'spark', mode: 'trail', count: 26, birth: [0, 0.7], life: [0.3, 0.7], size: [0.04, 0.12], speed: [1.2, 3], spread: 1.3, gravity: -2.5, colors: POISON, glow: 2.6, opacity: 0.8, spin: 7 }),
      def({ kind: 'smoke', mode: 'burst', count: 52, birth: [0.72, 0.79], life: [0.8, 1.3], size: [0.8, 2], speed: [1, 3.2], spread: 1, rise: 1.4, colors: POISON, glow: 1.1, opacity: 0.48, additive: false, endScale: 3.2, spin: 1 }),
      def({ kind: 'spark', mode: 'burst', count: 30, birth: [0.73, 0.8], life: [0.45, 0.85], size: [0.04, 0.13], speed: [2, 5], spread: 1, gravity: -3, colors: POISON, glow: 2.8, opacity: 0.85, spin: 9 }),
    ],
    ring: { color: 0x60c020, radius: 3.2, at: 0.75 },
    light: { color: 0x60c020, intensity: 1.3 },
  },
  holy: {
    layers: [
      def({ kind: 'soft', mode: 'head', count: 1, birth: [0, 0.7], life: [9, 9], size: [0.34, 0.34], speed: [0, 0], spread: 0, colors: [0xffffff, 0xffe080, 0xffc040], glow: 3.2, opacity: 0.7, endScale: 1 }),
      def({ kind: 'spark', mode: 'rise', count: 92, birth: [0, 0.6], life: [0.5, 1], size: [0.04, 0.15], speed: [1.1, 2.8], spread: 0.6, rise: 2.4, colors: HOLY, glow: 3.8, opacity: 0.95, spin: 7, radius: 0.7 }),
      def({ kind: 'soft', mode: 'rise', count: 36, birth: [0, 0.65], life: [0.55, 0.95], size: [0.16, 0.5], speed: [0.5, 1.3], spread: 0.45, rise: 1.9, colors: HOLY, glow: 2.4, opacity: 0.34, endScale: 2.2, radius: 0.5 }),
      def({ kind: 'spark', mode: 'burst', count: 40, birth: [0.01, 0.09], life: [0.4, 0.75], size: [0.03, 0.12], speed: [2, 5], spread: 0.7, rise: 1.8, colors: HOLY, glow: 3.6, opacity: 0.9, spin: 8 }),
      def({ kind: 'shard', mode: 'burst', count: 30, birth: [0, 0.08], life: [0.45, 0.8], size: [0.1, 0.3], speed: [2.5, 6], spread: 0.8, rise: 2.2, colors: [0xfff0b0, 0xffc040, 0xa05000], glow: 2.8, opacity: 0.88, spin: 9 }),
    ],
    ring: { color: 0xffd060, radius: 2.4, at: 0.02 },
    light: { color: 0xffd060, intensity: 2 },
  },
  shadow: {
    layers: [
      def({ kind: 'soft', mode: 'head', count: 1, birth: [0, 0.9], life: [9, 9], size: [0.7, 0.7], speed: [0, 0], spread: 0, colors: [0x000000, 0x140020, 0x000000], glow: 1, opacity: 0.98, additive: false, endScale: 1 }),
      def({ kind: 'soft', mode: 'head', count: 1, birth: [0, 0.9], life: [9, 9], size: [1.1, 1.1], speed: [0, 0], spread: 0, colors: SHADOW, glow: 1, opacity: 0.18, additive: false, endScale: 1.4, radius: 1 }),
      def({ kind: 'smoke', mode: 'implode', count: 56, birth: [0, 0.6], life: [0.6, 1.1], size: [0.6, 1.6], speed: [1.2, 2.8], spread: 0.9, colors: SHADOW, glow: 1, opacity: 0.55, additive: false, endScale: 1.4, radius: 2.3, spin: 2 }),
      def({ kind: 'spark', mode: 'implode', count: 58, birth: [0, 0.6], life: [0.4, 0.85], size: [0.04, 0.14], speed: [2.5, 5], spread: 0.7, colors: [0xa080d0, 0x402060, 0x000000], glow: 2.4, opacity: 0.85, spin: 10, radius: 2 }),
      def({ kind: 'shard', mode: 'burst', count: 28, birth: [0.02, 0.1], life: [0.45, 0.9], size: [0.1, 0.3], speed: [2, 5], spread: 0.9, gravity: -5, colors: SHADOW, glow: 1.4, opacity: 0.8, spin: 8 }),
    ],
    ring: { color: 0x6a30a0, radius: 2.4, at: 0.02 },
    light: { color: 0x6a30a0, intensity: 1.1 },
  },
  arcane: {
    layers: [
      def({ kind: 'soft', mode: 'head', count: 1, birth: [0, 0.7], life: [9, 9], size: [0.3, 0.3], speed: [0, 0], spread: 0, colors: [0xffffff, 0x8060ff, 0x3010a0], glow: 3, opacity: 0.65, endScale: 1 }),
      def({ kind: 'rune', mode: 'orbit', count: 30, birth: [0, 0.3], life: [0.65, 1], size: [0.12, 0.28], speed: [0, 0], spread: 0, rise: 0.55, colors: ARCANE, glow: 3, opacity: 0.95, spin: 5, radius: 1.6 }),
      def({ kind: 'spark', mode: 'orbit', count: 90, birth: [0, 0.45], life: [0.5, 0.95], size: [0.04, 0.15], speed: [0, 0], spread: 0, rise: 1, colors: [0xffffff, 0x6050ff, 0xa020d0], glow: 3.8, opacity: 0.95, spin: 7, radius: 2.1 }),
      def({ kind: 'soft', mode: 'orbit', count: 30, birth: [0, 0.4], life: [0.55, 0.95], size: [0.16, 0.45], speed: [0, 0], spread: 0, rise: 0.75, colors: ARCANE, glow: 2.2, opacity: 0.36, endScale: 2.2, radius: 1.2 }),
      def({ kind: 'spark', mode: 'burst', count: 44, birth: [0.01, 0.09], life: [0.4, 0.8], size: [0.03, 0.12], speed: [2.5, 6], spread: 0.8, rise: 0.8, colors: ARCANE, glow: 3.6, opacity: 0.9, spin: 9 }),
    ],
    ring: { color: 0x6050ff, radius: 2.8, at: 0.02 },
    light: { color: 0x6050ff, intensity: 1.6 },
  },
};

const VERTEX = `
attribute float aAge;
attribute float aSize;
attribute float aSeed;
uniform float uPixelScale;
uniform float uEndScale;
varying float vAge;
varying float vSeed;
void main() {
  vAge = aAge;
  vSeed = aSeed;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float s = aSize * mix(1.0, uEndScale, clamp(aAge, 0.0, 1.0));
  gl_PointSize = clamp(s * uPixelScale / max(0.25, -mv.z), 1.0, 120.0);
  gl_Position = projectionMatrix * mv;
}`;

const FRAGMENT = `
uniform sampler2D uMap;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uOpacity;
uniform float uGlow;
uniform float uSpin;
varying float vAge;
varying float vSeed;
void main() {
  if (vAge < 0.0 || vAge > 1.0) discard;
  vec2 p = gl_PointCoord - 0.5;
  float a = vSeed * 6.2831853 + vAge * uSpin;
  float ca = cos(a), sa = sin(a);
  vec2 uv = vec2(ca * p.x - sa * p.y, sa * p.x + ca * p.y) + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
  float alpha = texture2D(uMap, uv).a * uOpacity;
  alpha *= smoothstep(0.0, 0.08, vAge) * (1.0 - smoothstep(0.55, 1.0, vAge));
  if (alpha < 0.01) discard;
  vec3 col = vAge < 0.5
    ? mix(uColorA, uColorB, vAge * 2.0)
    : mix(uColorB, uColorC, (vAge - 0.5) * 2.0);
  gl_FragColor = vec4(col * uGlow, alpha);
}`;

type Particle = {
  birth: number;
  life: number;
  size: number;
  speed: number;
  seed: number;
  ox: number; oy: number; oz: number;
  dx: number; dy: number; dz: number;
  rx: number; ry: number; rz: number;
  ux: number; uy: number; uz: number;
};

type Layer = {
  cfg: LayerCfg;
  particles: Particle[];
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  points: THREE.Points;
  positions: Float32Array;
  ages: Float32Array;
  sizes: Float32Array;
  seeds: Float32Array;
};

function basis(dx: number, dy: number, dz: number): [number, number, number, number, number, number, number, number, number] {
  const len = Math.hypot(dx, dy, dz) || 1;
  const nx = dx / len, ny = dy / len, nz = dz / len;
  const ax = Math.abs(ny) > 0.9 ? 1 : 0;
  const ay = Math.abs(ny) > 0.9 ? 0 : 1;
  let rx = ny * 0 - nz * ay;
  let ry = nz * ax - nx * 0;
  let rz = nx * ay - ny * ax;
  const rl = Math.hypot(rx, ry, rz) || 1;
  rx /= rl; ry /= rl; rz /= rl;
  return [nx, ny, nz, rx, ry, rz, ry * nz - rz * ny, rz * nx - rx * nz, rx * ny - ry * nx];
}

function buildLayer(
  cfg: LayerCfg,
  seed: number,
  durationSec: number,
  type: VfxType,
  from: [number, number, number],
  to: [number, number, number],
  offsetY: number,
): Layer {
  const particles: Particle[] = [];
  const flow = basis(to[0] - from[0], 0, to[2] - from[2]);
  const targetDir = basis(flow[0], 0, flow[2]);
  for (let i = 0; i < cfg.count; i++) {
    const rnd = seededRandom((seed ^ Math.imul(i + 1, 2654435761)) >>> 0);
    const birth = cfg.birth[0] + (cfg.birth[1] - cfg.birth[0]) * rnd();
    const pose = vfxEmitterPose(type, birth, from, to, offsetY);
    const jitterA = (rnd() - 0.5) * cfg.spread;
    const jitterB = (rnd() - 0.5) * cfg.spread;
    let ox: number, oy: number, oz: number;
    let dirX: number, dirY: number, dirZ: number;

    if (cfg.mode === 'trail' || cfg.mode === 'head') {
      ox = pose.position[0]; oy = pose.position[1]; oz = pose.position[2];
      dirX = -pose.direction[0]; dirY = -pose.direction[1]; dirZ = -pose.direction[2];
    } else if (cfg.mode === 'stream') {
      ox = from[0] + flow[3] * jitterA;
      oy = from[1] + offsetY + jitterB * 0.35;
      oz = from[2] + flow[5] * jitterA;
      dirX = targetDir[0]; dirY = 0; dirZ = targetDir[2];
    } else if (cfg.mode === 'rise') {
      ox = to[0] + flow[3] * jitterA;
      oy = to[1] + offsetY;
      oz = to[2] + flow[5] * jitterA;
      dirX = 0; dirY = 1; dirZ = 0;
    } else if (cfg.mode === 'implode') {
      const theta = rnd() * Math.PI * 2;
      const phi = Math.acos(2 * rnd() - 1);
      const ux = Math.sin(phi) * Math.cos(theta);
      const uy = Math.cos(phi) * 0.5;
      const uz = Math.sin(phi) * Math.sin(theta);
      ox = to[0] + ux * cfg.radius;
      oy = to[1] + offsetY + uy * cfg.radius;
      oz = to[2] + uz * cfg.radius;
      dirX = -ux; dirY = -uy; dirZ = -uz;
    } else if (cfg.mode === 'orbit') {
      ox = to[0]; oy = to[1] + offsetY; oz = to[2];
      dirX = 0; dirY = 1; dirZ = 0;
    } else {
      const theta = rnd() * Math.PI * 2;
      const phi = Math.acos(2 * rnd() - 1);
      ox = to[0]; oy = to[1] + offsetY; oz = to[2];
      dirX = Math.sin(phi) * Math.cos(theta);
      dirY = Math.cos(phi) * 0.75 + 0.25;
      dirZ = Math.sin(phi) * Math.sin(theta);
    }
    const b = basis(dirX, dirY, dirZ);
    particles.push({
      birth: birth * durationSec,
      life: cfg.life[0] + (cfg.life[1] - cfg.life[0]) * rnd(),
      size: cfg.size[0] + (cfg.size[1] - cfg.size[0]) * rnd(),
      speed: cfg.speed[0] + (cfg.speed[1] - cfg.speed[0]) * rnd(),
      seed: rnd(),
      ox, oy, oz,
      dx: b[0], dy: b[1], dz: b[2],
      rx: b[3], ry: b[4], rz: b[5],
      ux: b[6], uy: b[7], uz: b[8],
    });
  }

  const count = particles.length;
  const positions = new Float32Array(count * 3);
  const ages = new Float32Array(count).fill(-1);
  const sizes = new Float32Array(count);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) seeds[i] = particles[i].seed;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aAge', new THREE.BufferAttribute(ages, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: getSprite(cfg.kind) },
      uColorA: { value: new THREE.Color(cfg.colors[0]) },
      uColorB: { value: new THREE.Color(cfg.colors[1]) },
      uColorC: { value: new THREE.Color(cfg.colors[2]) },
      uOpacity: { value: cfg.opacity },
      uGlow: { value: cfg.glow },
      uSpin: { value: cfg.spin },
      uPixelScale: { value: 600 },
      uEndScale: { value: cfg.endScale },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: cfg.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { cfg, particles, geometry, material, points, positions, ages, sizes, seeds };
}

type Ribbon = {
  geometry: THREE.BufferGeometry;
  positions: Float32Array;
  glowGeometry: THREE.BufferGeometry;
  glowPositions: Float32Array;
  core: THREE.MeshBasicMaterial;
  glow: THREE.MeshBasicMaterial;
  coreMesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  strand: number;
};

const RIBBON_NODES = 26;

function buildRibbon(strand: number): Ribbon {
  const size = (RIBBON_NODES + 1) * 2 * 3;
  const positions = new Float32Array(size);
  const glowPositions = new Float32Array(size);
  const indices: number[] = [];
  for (let i = 0; i < RIBBON_NODES; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const glowGeometry = new THREE.BufferGeometry();
  glowGeometry.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));
  glowGeometry.setIndex(indices);
  const core = new THREE.MeshBasicMaterial({
    color: new THREE.Color(3, 3.2, 3.6), transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  const glow = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.35, 0.6, 2.4), transparent: true, opacity: 0.32,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  const glowMesh = new THREE.Mesh(glowGeometry, glow);
  const coreMesh = new THREE.Mesh(geometry, core);
  glowMesh.frustumCulled = false;
  coreMesh.frustumCulled = false;
  glowMesh.renderOrder = 10;
  coreMesh.renderOrder = 11;
  return { geometry, positions, glowGeometry, glowPositions, core, glow, coreMesh, glowMesh, strand };
}

export function VfxBurst({ effect, offsetY = 0 }: { effect: VfxEffect; offsetY?: number }) {
  const startedRef = useRef<number | null>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const look = LOOKS[effect.type];
  const durationSec = effect.duration / 1000;

  const engine = useMemo(() => {
    const seed = effect.id >>> 0;
    const layers = look.layers.map((cfg, i) =>
      buildLayer(cfg, (seed ^ Math.imul(i + 1, 40503)) >>> 0, durationSec, effect.type, effect.from, effect.to, offsetY),
    );
    const ribbons = look.ribbon
      ? [buildRibbon(0), buildRibbon(1), buildRibbon(2), buildRibbon(3), buildRibbon(4)]
      : [];
    const ring = look.ring
      ? new THREE.Mesh(
          new THREE.RingGeometry(0.82, 1, 64),
          new THREE.MeshBasicMaterial({
            color: look.ring.color, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
          }),
        )
      : null;
    if (ring) {
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(effect.to[0], offsetY + 0.04, effect.to[2]);
      ring.frustumCulled = false;
    }
    const rock = look.rock
      ? new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.26, 1),
          new THREE.MeshStandardMaterial({
            color: 0x2a1b14, emissive: 0xff5a10, emissiveIntensity: 1.8,
            flatShading: true, roughness: 0.9,
          }),
        )
      : null;
    const light = look.light ? new THREE.PointLight(look.light.color, 0, 9) : null;
    if (light) light.position.set(effect.to[0], effect.to[1] + offsetY + 0.5, effect.to[2]);
    return { layers, ribbons, ring, rock, light };
  }, [effect.id, effect.type, effect.from, effect.to, durationSec, look, offsetY]);

  useEffect(
    () => () => {
      for (const layer of engine.layers) {
        layer.geometry.dispose();
        layer.material.dispose();
      }
      for (const ribbon of engine.ribbons) {
        ribbon.geometry.dispose();
        ribbon.glowGeometry.dispose();
        ribbon.core.dispose();
        ribbon.glow.dispose();
      }
      engine.ring?.geometry.dispose();
      (engine.ring?.material as THREE.Material | undefined)?.dispose();
      engine.rock?.geometry.dispose();
      (engine.rock?.material as THREE.Material | undefined)?.dispose();
    },
    [engine],
  );

  useFrame(() => {
    if (startedRef.current === null) startedRef.current = performance.now();
    const t = Math.min(1, (performance.now() - startedRef.current) / effect.duration);
    const tSec = t * durationSec;
    const pose = vfxEmitterPose(effect.type, t, effect.from, effect.to, offsetY);
    const cam = camera as THREE.PerspectiveCamera;
    const fov = cam.isPerspectiveCamera ? cam.fov : 50;
    const pixelScale = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));

    const streamDist = Math.hypot(effect.to[0] - effect.from[0], effect.to[2] - effect.from[2]);

    for (const layer of engine.layers) {
      const { cfg, particles, positions, ages, sizes } = layer;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const ageSec = tSec - p.birth;
        if (ageSec < 0 || ageSec > p.life) {
          ages[i] = -1;
          continue;
        }
        const a = ageSec / p.life;
        const travel = cfg.drag
          ? (p.speed * (1 - Math.exp(-cfg.drag * ageSec))) / cfg.drag
          : p.speed * ageSec;
        const wob = Math.sin(ageSec * (7 + p.seed * 11) + p.seed * 37) * cfg.spread * (0.18 + a * 0.8);
        const wob2 = Math.cos(ageSec * (6 + p.seed * 9) + p.seed * 19) * cfg.spread * (0.18 + a * 0.8);
        let x: number, y: number, z: number;
        if (cfg.mode === 'head') {
          x = pose.position[0]; y = pose.position[1]; z = pose.position[2];
        } else if (cfg.mode === 'trail') {
          x = p.ox + p.dx * travel + p.rx * wob + p.ux * wob2;
          y = p.oy + p.dy * travel + p.ry * wob + p.uy * wob2;
          z = p.oz + p.dz * travel + p.rz * wob + p.uz * wob2;
        } else if (cfg.mode === 'stream') {
          const reach = cfg.drag
            ? (p.speed * (1 - Math.exp(-cfg.drag * ageSec))) / cfg.drag
            : p.speed * ageSec;
          if (reach > streamDist * 1.05) {
            ages[i] = -1;
            continue;
          }
          x = p.ox + p.dx * reach + p.rx * wob + p.ux * wob2;
          y = p.oy + p.dy * reach + p.ry * wob + p.uy * wob2;
          z = p.oz + p.dz * reach + p.rz * wob + p.uz * wob2;
        } else if (cfg.mode === 'burst') {
          x = p.ox + p.dx * travel + p.rx * wob + p.ux * wob2;
          y = p.oy + p.dy * travel + p.ry * wob + p.uy * wob2;
          z = p.oz + p.dz * travel + p.rz * wob + p.uz * wob2;
        } else if (cfg.mode === 'rise') {
          x = p.ox + p.rx * wob * 1.4 + p.dx * travel * 0.35;
          y = p.oy + cfg.rise * ageSec + p.dy * travel * 0.35;
          z = p.oz + p.rz * wob * 1.4 + p.dz * travel * 0.35;
        } else if (cfg.mode === 'implode') {
          const k = Math.max(0, 1 - a);
          const spin = a * cfg.spin;
          const cs = Math.cos(spin), sn = Math.sin(spin);
          const vx = (p.ox - effect.to[0]) * k;
          const vz = (p.oz - effect.to[2]) * k;
          x = effect.to[0] + vx * cs - vz * sn + p.rx * wob;
          z = effect.to[2] + vx * sn + vz * cs + p.rz * wob;
          y = effect.to[1] + offsetY + (p.oy - effect.to[1] - offsetY) * k;
        } else {
          const ang = p.seed * Math.PI * 2 + ageSec * cfg.spin;
          x = effect.to[0] + Math.cos(ang) * cfg.radius;
          z = effect.to[2] + Math.sin(ang) * cfg.radius;
          y = effect.to[1] + offsetY + cfg.rise * ageSec + Math.sin(ageSec * 4 + p.seed * 9) * 0.1;
        }
        if (cfg.gravity) y += cfg.gravity * ageSec * ageSec * 0.5;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        ages[i] = a;
        sizes[i] = p.size;
      }
      layer.geometry.attributes.position.needsUpdate = true;
      layer.geometry.attributes.aAge.needsUpdate = true;
      layer.geometry.attributes.aSize.needsUpdate = true;
      layer.material.uniforms.uPixelScale.value = pixelScale;
    }

    if (engine.ribbons.length) {
      const strike = look.ribbon === 'strike';
      const start: [number, number, number] = strike
        ? [effect.to[0], effect.to[1] + offsetY + 4.5, effect.to[2]]
        : [effect.from[0], effect.from[1] + offsetY + 0.35, effect.from[2]];
      const end: [number, number, number] = [effect.to[0], effect.to[1] + offsetY + 0.1, effect.to[2]];
      const dx = end[0] - start[0], dz = end[2] - start[2];
      const len = Math.hypot(dx, dz) || 1;
      const sx = -dz / len, sz = dx / len;
      const tick = Math.floor(t * 26);
      const env = t < 0.05 ? t / 0.05 : t < 0.28 ? 1 : Math.max(0, 1 - (t - 0.28) / 0.16);
      for (const ribbon of engine.ribbons) {
        const main = ribbon.strand < 3;
        const rnd = seededRandom((effect.id ^ Math.imul(tick + 1, 2246822519) ^ Math.imul(ribbon.strand + 1, 3266489917)) >>> 0);
        const fromT = main ? 0 : 0.25 + rnd() * 0.4;
        const toT = main ? 1 : Math.min(1, fromT + 0.18 + rnd() * 0.2);
        const branch = (rnd() - 0.5) * 1.6;
        const phase = rnd() * 12;
        const width = (main ? 0.16 : 0.07) * (strike ? 1.25 : 1);
        for (let i = 0; i <= RIBBON_NODES; i++) {
          const s = fromT + (toT - fromT) * (i / RIBBON_NODES);
          const envNode = Math.sin(Math.PI * (i / RIBBON_NODES));
          const kink = Math.sin(s * 41 + phase + tick * 2.1) * 0.16 + Math.sin(s * 97 + phase) * 0.07;
          const bx = start[0] + dx * s + sx * (kink + branch * s);
          const bz = start[2] + dz * s + sz * (kink + branch * s);
          const by = start[1] + (end[1] - start[1]) * s + Math.sin(s * Math.PI) * (strike ? 0 : 0.25);
          const tx = dx, ty = end[1] - start[1], tz = dz;
          const vx = camera.position.x - bx, vy = camera.position.y - by, vz = camera.position.z - bz;
          let px = ty * vz - tz * vy, py = tz * vx - tx * vz, pz = tx * vy - ty * vx;
          const pl = Math.hypot(px, py, pz) || 1;
          px /= pl; py /= pl; pz /= pl;
          const taper = 0.2 + 0.8 * envNode;
          const w = width * taper;
          const gw = w * 3.4;
          const o = i * 6;
          ribbon.positions[o] = bx - px * w;
          ribbon.positions[o + 1] = by - py * w;
          ribbon.positions[o + 2] = bz - pz * w;
          ribbon.positions[o + 3] = bx + px * w;
          ribbon.positions[o + 4] = by + py * w;
          ribbon.positions[o + 5] = bz + pz * w;
          ribbon.glowPositions[o] = bx - px * gw;
          ribbon.glowPositions[o + 1] = by - py * gw;
          ribbon.glowPositions[o + 2] = bz - pz * gw;
          ribbon.glowPositions[o + 3] = bx + px * gw;
          ribbon.glowPositions[o + 4] = by + py * gw;
          ribbon.glowPositions[o + 5] = bz + pz * gw;
        }
        ribbon.geometry.attributes.position.needsUpdate = true;
        ribbon.glowGeometry.attributes.position.needsUpdate = true;
        const flicker = 0.72 + 0.28 * Math.abs(Math.sin(tick * 2.7 + ribbon.strand));
        ribbon.core.opacity = env * flicker * (main ? 1 : 0.7);
        ribbon.glow.opacity = env * flicker * (main ? 0.34 : 0.2);
      }
    }

    if (engine.ring && look.ring) {
      const u = Math.max(0, (t - look.ring.at) / (1 - look.ring.at));
      const s = 0.2 + look.ring.radius * u;
      engine.ring.scale.set(s, s, s);
      (engine.ring.material as THREE.MeshBasicMaterial).opacity =
        u <= 0 ? 0 : 0.85 * (1 - Math.min(1, u * 1.35)) * Math.min(1, u * 12);
    }

    if (engine.rock) {
      const impactAt = 0.76;
      engine.rock.visible = t < impactAt;
      engine.rock.position.set(pose.position[0], pose.position[1], pose.position[2]);
      engine.rock.rotation.set(t * 7, t * 11, t * 5);
    }

    if (engine.light && look.light) {
      const flick = 0.78 + 0.22 * Math.sin(t * 91 + effect.id) * Math.sin(t * 47 + 1.3);
      engine.light.intensity = look.light.intensity * flick * (t < 0.85 ? 1 : (1 - t) / 0.15);
      engine.light.position.set(pose.position[0], pose.position[1] + 0.2, pose.position[2]);
    }
  });

  return (
    <>
      {engine.layers.map((layer, i) => <primitive key={i} object={layer.points} />)}
      {engine.ribbons.map((ribbon, i) => (
        <group key={i}>
          <primitive object={ribbon.glowMesh} />
          <primitive object={ribbon.coreMesh} />
        </group>
      ))}
      {engine.ring && <primitive object={engine.ring} />}
      {engine.rock && <primitive object={engine.rock} />}
      {engine.light && <primitive object={engine.light} />}
    </>
  );
}
