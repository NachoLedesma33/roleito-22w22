export type VfxType =
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'heal'
  | 'void'
  | 'flamethrower'
  | 'thunder'
  | 'meteor'
  | 'frostnova'
  | 'poison'
  | 'holy'
  | 'shadow'
  | 'arcane'
  | 'arrow'
  | 'arrowrain'
  | 'throwingknife'
  | 'javelin'
  | 'slash'
  | 'cleave'
  | 'gunshot'
  | 'burstfire'
  | 'punch'
  | 'slam'

export const MELEE_VFX: ReadonlySet<VfxType> = new Set<VfxType>([
  'slash', 'cleave', 'punch', 'slam',
]);

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

type VfxShape = 'plume' | 'shards' | 'bolt' | 'bloom' | 'vortex'

interface Recipe {
  core: [number, number, number]
  mid: [number, number, number]
  hot: [number, number, number]
  shape: VfxShape
  rise: number
  lateral: number
  radial: number
  size: number
  impactAt: [number, number]
}

const RECIPES: Record<VfxType, Recipe> = {
  fire: {
    core: [1, 0.96, 0.82],
    mid: [1, 0.55, 0.12],
    hot: [0.92, 0.16, 0.05],
    shape: 'plume',
    rise: 0.6,
    lateral: 0.3,
    radial: 1,
    size: 1,
    impactAt: [0.55, 0.78],
  },
  ice: {
    core: [0.88, 1, 1],
    mid: [0.42, 0.86, 1],
    hot: [0.18, 0.5, 0.92],
    shape: 'shards',
    rise: -0.1,
    lateral: 0,
    radial: 1.1,
    size: 0.55,
    impactAt: [0.45, 0.7],
  },
  lightning: {
    core: [1, 1, 0.88],
    mid: [1, 0.88, 0.28],
    hot: [0.82, 0.68, 1],
    shape: 'bolt',
    rise: 0,
    lateral: 0,
    radial: 0.1,
    size: 0.7,
    impactAt: [0.1, 0.72],
  },
  heal: {
    core: [0.92, 1, 0.92],
    mid: [0.42, 1, 0.58],
    hot: [0.16, 0.82, 0.4],
    shape: 'bloom',
    rise: 1,
    lateral: 0.12,
    radial: 0.7,
    size: 1.25,
    impactAt: [0.82, 0.98],
  },
  void: {
    core: [0.9, 0.82, 1],
    mid: [0.6, 0.32, 0.95],
    hot: [0.34, 0.08, 0.68],
    shape: 'vortex',
    rise: 0,
    lateral: 0,
    radial: 1.5,
    size: 0.9,
    impactAt: [0.55, 0.78],
  },
  flamethrower: {
    core: [1, 1, 0.82],
    mid: [1, 0.66, 0.12],
    hot: [0.85, 0.12, 0.03],
    shape: 'plume',
    rise: 0.25,
    lateral: 0.12,
    radial: 0.7,
    size: 1.1,
    impactAt: [0.55, 0.78],
  },
  thunder: {
    core: [1, 1, 1],
    mid: [0.78, 0.9, 1],
    hot: [0.5, 0.35, 1],
    shape: 'bolt',
    rise: 0,
    lateral: 0,
    radial: 0.12,
    size: 0.85,
    impactAt: [0.05, 0.7],
  },
  meteor: {
    core: [1, 1, 0.82],
    mid: [1, 0.58, 0.1],
    hot: [0.82, 0.14, 0.04],
    shape: 'plume',
    rise: 0.35,
    lateral: 0.2,
    radial: 0.9,
    size: 1.4,
    impactAt: [0.6, 0.85],
  },
  frostnova: {
    core: [0.92, 1, 1],
    mid: [0.45, 0.88, 1],
    hot: [0.16, 0.52, 0.95],
    shape: 'shards',
    rise: 0,
    lateral: 0,
    radial: 1.4,
    size: 0.7,
    impactAt: [0.2, 0.7],
  },
  poison: {
    core: [0.82, 1, 0.72],
    mid: [0.5, 0.85, 0.2],
    hot: [0.22, 0.5, 0.08],
    shape: 'plume',
    rise: 0.4,
    lateral: 0.2,
    radial: 1.1,
    size: 1,
    impactAt: [0.5, 0.8],
  },
  holy: {
    core: [1, 1, 0.88],
    mid: [1, 0.88, 0.42],
    hot: [1, 0.72, 0.16],
    shape: 'bloom',
    rise: 1.2,
    lateral: 0.08,
    radial: 0.8,
    size: 1.1,
    impactAt: [0.4, 0.8],
  },
  shadow: {
    core: [0.72, 0.6, 0.9],
    mid: [0.38, 0.2, 0.62],
    hot: [0.12, 0.04, 0.24],
    shape: 'vortex',
    rise: 0,
    lateral: 0,
    radial: 1.3,
    size: 1,
    impactAt: [0.45, 0.8],
  },
  arcane: {
    core: [0.8, 0.95, 1],
    mid: [0.4, 0.55, 1],
    hot: [0.8, 0.25, 0.95],
    shape: 'vortex',
    rise: 0.2,
    lateral: 0.15,
    radial: 1.1,
    size: 0.8,
    impactAt: [0.4, 0.82],
  },
  arrow: {
    core: [1, 0.96, 0.8],
    mid: [0.8, 0.62, 0.3],
    hot: [0.32, 0.16, 0.06],
    shape: 'bolt',
    rise: 0.1,
    lateral: 0,
    radial: 0.2,
    size: 0.7,
    impactAt: [0.68, 0.9],
  },
  arrowrain: {
    core: [1, 0.96, 0.8],
    mid: [0.7, 0.55, 0.3],
    hot: [0.25, 0.14, 0.06],
    shape: 'plume',
    rise: -0.2,
    lateral: 0.3,
    radial: 1.6,
    size: 0.8,
    impactAt: [0.35, 0.85],
  },
  throwingknife: {
    core: [1, 1, 0.95],
    mid: [0.72, 0.82, 0.9],
    hot: [0.2, 0.24, 0.3],
    shape: 'shards',
    rise: 0,
    lateral: 0,
    radial: 0.4,
    size: 0.6,
    impactAt: [0.7, 0.92],
  },
  javelin: {
    core: [1, 0.95, 0.85],
    mid: [0.72, 0.6, 0.4],
    hot: [0.25, 0.18, 0.1],
    shape: 'shards',
    rise: 0.2,
    lateral: 0.1,
    radial: 0.5,
    size: 0.9,
    impactAt: [0.72, 0.94],
  },
  slash: {
    core: [1, 1, 0.95],
    mid: [0.85, 0.9, 1],
    hot: [0.3, 0.4, 0.6],
    shape: 'shards',
    rise: 0.1,
    lateral: 0.2,
    radial: 1.2,
    size: 0.7,
    impactAt: [0.4, 0.7],
  },
  cleave: {
    core: [1, 1, 0.9],
    mid: [0.9, 0.7, 0.4],
    hot: [0.4, 0.2, 0.1],
    shape: 'shards',
    rise: 0.15,
    lateral: 0.3,
    radial: 1.5,
    size: 1,
    impactAt: [0.4, 0.75],
  },
  gunshot: {
    core: [1, 1, 0.9],
    mid: [1, 0.75, 0.3],
    hot: [0.35, 0.25, 0.15],
    shape: 'bolt',
    rise: 0,
    lateral: 0,
    radial: 0.1,
    size: 0.6,
    impactAt: [0.55, 0.8],
  },
  burstfire: {
    core: [1, 1, 0.9],
    mid: [1, 0.7, 0.25],
    hot: [0.3, 0.2, 0.12],
    shape: 'bolt',
    rise: 0,
    lateral: 0.1,
    radial: 0.2,
    size: 0.6,
    impactAt: [0.5, 0.85],
  },
  punch: {
    core: [1, 0.92, 0.8],
    mid: [0.85, 0.6, 0.4],
    hot: [0.4, 0.2, 0.15],
    shape: 'plume',
    rise: 0.1,
    lateral: 0.2,
    radial: 0.9,
    size: 0.9,
    impactAt: [0.5, 0.8],
  },
  slam: {
    core: [1, 0.9, 0.7],
    mid: [0.7, 0.5, 0.3],
    hot: [0.25, 0.15, 0.1],
    shape: 'plume',
    rise: -0.1,
    lateral: 0.3,
    radial: 1.4,
    size: 1.2,
    impactAt: [0.5, 0.85],
  },
}

export function layerCount(layer: VfxLayer): number {
  return COUNTS[layer]
}

const MEMO_CACHE = new Map<string, unknown>()

export function memoByKey<T>(key: string, make: () => T): T {
  if (MEMO_CACHE.has(key)) return MEMO_CACHE.get(key) as T
  const value = make()
  MEMO_CACHE.set(key, value)
  return value
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

function layerAlpha(layer: VfxLayer, tc: number, impactAt: [number, number]): number {
  if (layer === 'aftermath') {
    if (tc >= 1) return 0
    return tc < 0.78 ? 0 : clamp01(1 - (tc - 0.78) / 0.22)
  }
  if (layer === 'impact') {
    const [a, b] = impactAt
    return tc < a || tc >= b ? 0 : clamp01((tc - a) / (b - a))
  }
  return tc <= 0.55 ? 1 : tc >= 0.78 ? 0 : clamp01(1 - (tc - 0.55) / 0.23)
}

export function sampleVfx(layer: VfxLayer, input: VfxSampleInput): VfxParticle[] {
  const tc = clamp01(input.t)
  const speed = 1500 / Math.max(1, input.duration)
  const recipe = RECIPES[input.type]
  const rnd = seededRandom((input.seed >>> 0) ^ hashType(input.type))
  const phase = layerAlpha(layer, tc, recipe.impactAt)
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
    const rad = Math.sqrt(r2) * spread * recipe.radial
    const verticalScale = layer === 'core' ? 0.4 : 1
    let ox: number
    let oy: number
    let oz: number

    switch (recipe.shape) {
      case 'plume':
        ox = Math.cos(angle) * rad + (r3 - 0.5) * recipe.lateral
        oz = Math.sin(angle) * rad
        oy = recipe.rise * tc * 0.6 + (r4 - 0.5) * 0.12
        break
      case 'shards': {
        const spoke = Math.floor(r1 * 6)
        const a = spoke * (Math.PI / 3) + (r5 - 0.5) * 0.08
        const shardRad = rad * (0.5 + tc * 1.1)
        ox = Math.cos(a) * shardRad
        oz = Math.sin(a) * shardRad
        oy = recipe.rise * tc * 0.35 + (r4 - 0.5) * 0.05
        break
      }
      case 'bolt':
        ox = ((i % 5) - 2) * 0.022 + (r3 - 0.5) * 0.02
        oz = Math.sin(i * 1.9) * 0.045 + (r4 - 0.5) * 0.02
        oy = (r5 - 0.5) * 0.035
        break
      case 'bloom':
        ox = Math.cos(angle) * rad * 0.75
        oz = Math.sin(angle) * rad * 0.75
        oy = recipe.rise * tc * 0.9 + (r4 - 0.5) * 0.1
        break
      case 'vortex': {
        const a = angle + tc * 3.2
        const swirlRad = rad * (1 - tc * 0.85)
        ox = Math.cos(a) * swirlRad
        oz = Math.sin(a) * swirlRad
        oy =
          layer === 'aftermath'
            ? -tc * 0.6 - 0.05
            : recipe.rise * tc * 0.35 + (r4 - 0.5) * 0.08
        break
      }
    }
    oy *= verticalScale

    let color: [number, number, number]
    if (layer === 'core') color = mix(recipe.core, recipe.mid, r2 * 0.4)
    else if (layer === 'impact') color = mix(recipe.core, recipe.hot, r1 * 0.35)
    else color = mix(recipe.mid, recipe.hot, tc * 0.7 + r2 * 0.3)

    const sizeBase = layer === 'impact' ? 0.5 : layer === 'core' ? 0.35 : 0.25
    const size = clamp01((sizeBase + r5 * (1 - sizeBase) * 0.9 + (1 - tc) * 0.1) * recipe.size)
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
