import { describe, it, expect } from 'vitest'
import { layerCount, MELEE_VFX, memoByKey, sampleVfx, seededRandom, type VfxType } from './vfxParticles'
import { vfxEmitterPose } from '../components/VfxBurst'

const LAYERS = ['core', 'trail', 'motes', 'impact', 'aftermath'] as const
const NEW_TYPES: VfxType[] = ['arrow', 'arrowrain', 'throwingknife', 'javelin', 'slash', 'cleave', 'gunshot', 'burstfire', 'punch', 'slam']

describe('seededRandom', () => {
  it('mismo seed -> misma secuencia, seed distinto -> distinta', () => {
    const a = seededRandom(7)
    const b = seededRandom(7)
    const c = seededRandom(8)
    const av = [a(), a(), a()]
    expect(av).toEqual([b(), b(), b()])
    expect(av).not.toEqual([c(), c(), c()])
    for (const v of av) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('sampleVfx', () => {
  it('determinista para el mismo seed', () => {
    const a = sampleVfx('motes', { type: 'fire', t: 0.4, duration: 1500, seed: 7 })
    const b = sampleVfx('motes', { type: 'fire', t: 0.4, duration: 1500, seed: 7 })
    expect(a).toEqual(b)
  })

  it('varía con el seed y dentro de la capa', () => {
    const a = sampleVfx('motes', { type: 'fire', t: 0.4, duration: 1500, seed: 7 })
    const b = sampleVfx('motes', { type: 'fire', t: 0.4, duration: 1500, seed: 8 })
    expect(a).not.toEqual(b)
    expect(new Set(a.map((p) => p.size)).size).toBeGreaterThan(1)
  })

  it('acota t y duration sin NaN ni alpha fuera de rango', () => {
    for (const t of [-0.1, 0, 1, 1.4]) {
      for (const duration of [500, 1500, 9000]) {
        for (const p of sampleVfx('trail', { type: 'void', t, duration, seed: 1 })) {
          expect([...p.offset, p.size, p.alpha, ...p.color].every(Number.isFinite)).toBe(true)
          expect(p.alpha).toBeGreaterThanOrEqual(0)
          expect(p.alpha).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('aftermath decrece y termina en alpha 0', () => {
    const alphaAt = (t: number) =>
      sampleVfx('aftermath', { type: 'ice', t, duration: 1500, seed: 3 }).map((p) => p.alpha)
    const end = alphaAt(1)
    expect(end.every((a) => a === 0)).toBe(true)
    const mid = alphaAt(0.9)
    for (let i = 0; i < mid.length; i++) expect(mid[i]).toBeGreaterThan(end[i])
  })

  it('respeta el tope de partículas por capa', () => {
    for (const layer of LAYERS) {
      expect(sampleVfx(layer, { type: 'heal', t: 0.5, duration: 1500, seed: 1 })).toHaveLength(
        layerCount(layer),
      )
    }
    expect(LAYERS.reduce((sum, l) => sum + layerCount(l), 0)).toBe(192)
  })

  it('cada familia tiene silueta propia, no la misma nube', () => {
    const stat = (type: 'fire' | 'ice' | 'lightning' | 'heal' | 'void') => {
      const ps = sampleVfx('motes', { type, t: 0.35, duration: 1500, seed: 11 })
      const mean = (vals: number[]) => vals.reduce((a, b) => a + b, 0) / vals.length
      return {
        radial: mean(ps.map((p) => Math.hypot(p.offset[0], p.offset[2]))),
        up: mean(ps.map((p) => p.offset[1])),
        size: mean(ps.map((p) => p.size)),
      }
    }
    const fire = stat('fire')
    const ice = stat('ice')
    const bolt = stat('lightning')
    const heal = stat('heal')
    const voidv = stat('void')
    expect(bolt.radial).toBeLessThan(fire.radial * 0.5)
    expect(heal.up).toBeGreaterThan(fire.up)
    expect(ice.size).toBeLessThan(fire.size)
    expect(voidv.radial).toBeGreaterThan(bolt.radial)
  })

  it('hielo usa direcciones angulares, no un disco continuo', () => {
    const angles = sampleVfx('motes', { type: 'ice', t: 0.35, duration: 1500, seed: 5 }).map((p) =>
      ((Math.round((Math.atan2(p.offset[2], p.offset[0]) / (Math.PI * 2)) * 12) % 12) + 12) % 12,
    )
    expect(new Set(angles).size).toBeLessThanOrEqual(6)
  })

  it('vacío implosiona: radio cae y el polvo baja', () => {
    const radius = (t: number) => {
      const ps = sampleVfx('motes', { type: 'void', t, duration: 1500, seed: 9 })
      return ps.reduce((a, p) => a + Math.hypot(p.offset[0], p.offset[2]), 0) / ps.length
    }
    expect(radius(0.8)).toBeLessThan(radius(0.1))
    expect(
      sampleVfx('aftermath', { type: 'void', t: 0.85, duration: 1500, seed: 9 }).every(
        (p) => p.offset[1] < 0,
      ),
    ).toBe(true)
  })

  it('rayo alcanza el impacto antes que sanación', () => {
    const impactAlpha = (type: 'lightning' | 'heal') =>
      sampleVfx('impact', { type, t: 0.6, duration: 1500, seed: 2 }).reduce((a, p) => a + p.alpha, 0)
    expect(impactAlpha('lightning')).toBeGreaterThan(0)
    expect(impactAlpha('heal')).toBe(0)
  })
})

describe('vfxEmitterPose', () => {
  const from: [number, number, number] = [2, 0.6, 3]
  const to: [number, number, number] = [8, 0.6, -4]

  it('proyectiles arrancan en el atacante y llegan al objetivo', () => {
    for (const type of ['fire', 'ice', 'lightning', 'meteor', 'poison'] as const) {
      expect(vfxEmitterPose(type, 0, from, to).position).toEqual([2, 0.6, 3])
      const end = vfxEmitterPose(type, 1, from, to).position
      expect(end[0]).toBeCloseTo(8)
      expect(end[2]).toBeCloseTo(-4)
    }
  })

  it('efectos de área aparecen en el objetivo', () => {
    for (const type of ['heal', 'void', 'frostnova', 'holy', 'shadow', 'arcane'] as const) {
      expect(vfxEmitterPose(type, 0, from, to).position).toEqual([8, 0.6, -4])
    }
  })

  it('trueno cae sobre el objetivo (no es proyectil)', () => {
    expect(vfxEmitterPose('thunder', 0, from, to).position).toEqual([8, 0.6, -4])
    expect(vfxEmitterPose('thunder', 1, from, to).position).toEqual([8, 0.6, -4])
  })

  it('lanzallamas arranca en el atacante y apunta al objetivo', () => {
    const pose = vfxEmitterPose('flamethrower', 0, from, to)
    expect(pose.position).toEqual([2, 0.6, 3])
    expect(pose.direction[0]).toBeGreaterThan(0)
    expect(pose.direction[2]).toBeLessThan(0)
  })

  it('proyectiles nuevos arrancan en el atacante y llegan al objetivo', () => {
    for (const type of ['arrow', 'throwingknife', 'javelin', 'slash', 'cleave', 'punch', 'slam'] as const) {
      expect(vfxEmitterPose(type, 0, from, to).position).toEqual([2, 0.6, 3])
      const end = vfxEmitterPose(type, 1, from, to).position
      expect(end[0]).toBeCloseTo(8)
      expect(end[2]).toBeCloseTo(-4)
    }
  })

  it('disparos arrancan en el atacante y apuntan al objetivo', () => {
    for (const type of ['gunshot', 'burstfire'] as const) {
      const pose = vfxEmitterPose(type, 0, from, to)
      expect(pose.position).toEqual([2, 0.6, 3])
      expect(pose.direction[0]).toBeGreaterThan(0)
      expect(pose.direction[2]).toBeLessThan(0)
    }
  })

  it('lluvia de flechas aparece en el objetivo', () => {
    expect(vfxEmitterPose('arrowrain', 0, from, to).position).toEqual([8, 0.6, -4])
  })
})

describe('catálogo ampliado', () => {
  it('los 10 tipos nuevos muestrean finito y determinista', () => {
    for (const type of NEW_TYPES) {
      const a = sampleVfx('impact', { type, t: 0.5, duration: 1500, seed: 4 })
      expect(a).toEqual(sampleVfx('impact', { type, t: 0.5, duration: 1500, seed: 4 }))
      expect(a.every((p) => [...p.offset, p.size, p.alpha, ...p.color].every(Number.isFinite))).toBe(true)
    }
  })

  it('MELEE_VFX marca solo los cuatro golpes cuerpo a cuerpo', () => {
    expect([...MELEE_VFX].sort()).toEqual(['cleave', 'punch', 'slam', 'slash'])
  })
})

describe('memoByKey', () => {
  it('reutiliza el valor por clave', () => {
    let calls = 0
    const make = () => ({ n: ++calls })
    expect(memoByKey('vfx-test-fire', make)).toBe(memoByKey('vfx-test-fire', make))
    expect(memoByKey('vfx-test-ice', make)).not.toBe(memoByKey('vfx-test-fire', make))
    expect(calls).toBe(2)
  })
})
