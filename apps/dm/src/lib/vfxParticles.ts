export type VfxType = 'fire' | 'ice' | 'lightning' | 'heal' | 'void'
export type VfxLayer = 'core' | 'trail' | 'motes' | 'impact' | 'aftermath'

export interface VfxParticle {
  offset: [number, number, number]
  size: number
  alpha: number
  color: [number, number, number]
  spin: number
}

export interface VfxSampleInput {
  type: VfxType
  t: number
  duration: number
  seed: number
}

const COUNTS: Record<VfxLayer, number> = {
  core: 20,
  trail: 48,
  motes: 64,
  impact: 32,
  aftermath: 28,
}

const SPREAD: Record<VfxLayer, number> = {
  core: 0.1,
  trail: 0.26,
  motes: 0.48,
  impact: 0.34,
  aftermath: 0.42,
}

interface Recipe {
  core: [number, number, number]
  mid: [number, number, number]
  hot: [number, number, number]
  rise: number
  lateral: number
  arc: boolean
  implosion: boolean
}

const RECIPES: Record<VfxType, Recipe> = {
  fire: {
    core: [1, 0.96, 0.82],
    mid: [1, 0.55, 0.12],
    hot: [0.92, 0.16, 0.05],
    rise: 0.5,
    lateral: 0.3,
    arc: false,
    implosion: false,
  },
  ice: {
    core: [0.88, 1, 1],
    mid: [0.42, 0.86, 1],
    hot: [0.18, 0.5, 0.92],
    rise: -0.18,
    lateral: 0.22,
    arc: false,
    implosion: false,
  },
  lightning: {
    core: [1, 1, 0.88],
    mid: [1, 0.88, 0.28],
    hot: [0.82, 0.68, 1],
    rise: 0,
    lateral: 0.12,
    arc: true,
    implosion: false,
  },
  heal: {
    core: [0.92, 1, 0.92],
    mid: [0.42, 1, 0.58],
    hot: [0.16, 0.82, 0.4],
    rise: 0.8,
    lateral: 0.18,
    arc: false,
    implosion: false,
  },
  void: {
    core: [0.9, 0.82, 1],
    mid: [0.6, 0.32, 0.95],
    hot: [0.34, 0.08, 0.68],
    rise: 0,
    lateral: 0.28,
    arc: false,
    implosion: true,
  },
}

export function layerCount(layer: VfxLayer): number {
  return COUNTS[layer]
}

export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), 1 | t)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashType(type: VfxType): number {
  let h = 2166136261
  for (let i = 0; i < type.length; i++) h = Math.imul(h ^ type.charCodeAt(i), 16777619)
  return h >>> 0
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  const k = clamp01(t)
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
}

function layerAlpha(layer: VfxLayer, tc: number): number {
  if (layer === 'aftermath') {
    if (tc >= 1) return 0
    return tc < 0.78 ? 0 : clamp01(1 - (tc - 0.78) / 0.22)
  }
  if (layer === 'impact') {
    return tc < 0.55 || tc >= 0.78 ? 0 : clamp01(1 - (tc - 0.55) / 0.23)
  }
  return tc <= 0.55 ? 1 : tc >= 0.78 ? 0 : clamp01(1 - (tc - 0.55) / 0.23)
}

export function sampleVfx(layer: VfxLayer, input: VfxSampleInput): VfxParticle[] {
  const tc = clamp01(input.t)
  const speed = 1500 / Math.max(1, input.duration)
  const recipe = RECIPES[input.type]
  const rnd = seededRandom((input.seed >>> 0) ^ hashType(input.type))
  const phase = layerAlpha(layer, tc)
  const spread = SPREAD[layer]
  const count = COUNTS[layer]
  const out: VfxParticle[] = []

  for (let i = 0; i < count; i++) {
    const r1 = rnd()
    const r2 = rnd()
    const r3 = rnd()
    const r4 = rnd()
    const r5 = rnd()

    const angle = r1 * Math.PI * 2
    const rad = Math.sqrt(r2) * spread
    const lateral = (r3 - 0.5) * recipe.lateral
    const arc = recipe.arc ? Math.round(r4 * 3) * 0.16 * (r5 < 0.5 ? -1 : 1) : 0
    const implosion = recipe.implosion ? Math.max(0, 1 - tc * 1.25) : 1
    const fall = layer === 'aftermath' ? -tc * 0.55 : 0
    const rise = layer === 'aftermath' ? 0 : recipe.rise * tc * 0.35
    const verticalScale = layer === 'core' ? 0.4 : 1

    const ox = (Math.cos(angle) * rad + lateral + arc) * implosion
    const oz = (Math.sin(angle) * rad + lateral * 0.6) * implosion
    const oy = (rise + fall + (r4 - 0.5) * 0.12) * verticalScale

    let color: [number, number, number]
    if (layer === 'core') color = mix(recipe.core, recipe.mid, r2 * 0.4)
    else if (layer === 'impact') color = mix(recipe.core, recipe.hot, r1 * 0.35)
    else color = mix(recipe.mid, recipe.hot, tc * 0.7 + r2 * 0.3)

    const sizeBase = layer === 'impact' ? 0.5 : layer === 'core' ? 0.35 : 0.25
    const size = clamp01(sizeBase + r5 * (1 - sizeBase) * 0.9 + (1 - tc) * 0.1)
    const alpha = clamp01(phase * (0.55 + r3 * 0.45))
    const spin = r1 * Math.PI * 2 + tc * (r5 - 0.5) * 2 * speed

    out.push({
      offset: [ox, oy, oz],
      size,
      alpha,
      color: [clamp01(color[0]), clamp01(color[1]), clamp01(color[2])],
      spin,
    })
  }

  return out
}
