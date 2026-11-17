import { describe, it, expect } from 'vitest'
import { layerCount, memoByKey, sampleVfx, seededRandom } from './vfxParticles'

const LAYERS = ['core', 'trail', 'motes', 'impact', 'aftermath'] as const

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
