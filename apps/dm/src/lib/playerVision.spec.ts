import { describe, it, expect } from 'vitest'
import { attachLightToToken, createLightItem } from './light'
import { computeVisionRegions, lightVisionOrigin } from './playerVision'

const MAP_W = 10
const MAP_H = 10

function regionCenter(points: number[]): { x: number; y: number } {
  let sx = 0
  let sy = 0
  const n = points.length / 2
  for (let i = 0; i < n; i++) {
    sx += points[i * 2]
    sy += points[i * 2 + 1]
  }
  return { x: sx / n, y: sy / n }
}

function maxRadius(points: number[], cx: number, cy: number): number {
  let m = 0
  for (let i = 0; i + 1 < points.length; i += 2) {
    m = Math.max(m, Math.hypot(points[i] - cx, points[i + 1] - cy))
  }
  return m
}

describe('playerVision', () => {
  it('lightVisionOrigin: luz estática usa item.x/item.y en world coords', () => {
    const item = createLightItem('torch', { x: 0.5, y: 0.5 }, MAP_W, MAP_H)!
    const origin = lightVisionOrigin(item, new Map())
    expect(origin).toEqual({ x: 0, z: 0 })
  })

  it('lightVisionOrigin: luz adjunta usa posición del token, no la del item', () => {
    const item = attachLightToToken(createLightItem('torch', { x: 0.5, y: 0.5 }, MAP_W, MAP_H)!, 'ch-1')
    const charPos = new Map([['ch-1', { x: 3, z: -4 }]])
    const origin = lightVisionOrigin(item, charPos)
    expect(origin).toEqual({ x: 3, z: -4 })
  })

  it('lightVisionOrigin: token faltante → null (se saltea)', () => {
    const item = attachLightToToken(createLightItem('torch', { x: 0.5, y: 0.5 })!, 'ch-x')
    expect(lightVisionOrigin(item, new Map())).toBeNull()
  })

  it('computeVisionRegions: luz estática hard recorta círculo de radio del source', () => {
    const light = createLightItem('torch', { x: 0.5, y: 0.5 }, MAP_W, MAP_H)!
    const regions = computeVisionRegions([light], new Map(), null, MAP_W, MAP_H)
    expect(regions.length).toBe(1)
    const r = regions[0]
    expect(r.revealed).toBe(true)
    expect(r.zIndex).toBe(1000)
    expect(r.id).toBe(`vision-${light.id}`)
    expect(r.points.length).toBe(2 * 181)
    const c = regionCenter(r.points)
    expect(c.x).toBeCloseTo(0.5, 2)
    expect(c.y).toBeCloseTo(0.5, 2)
    expect(maxRadius(r.points, c.x, c.y)).toBeLessThanOrEqual(0.15 + 0.02)
    expect(maxRadius(r.points, c.x, c.y)).toBeGreaterThan(0.14)
  })

  it('computeVisionRegions: luz adjunta a otro token se excluye si shareCarriedLights=false', () => {
    const staticLight = createLightItem('lantern', { x: 0.2, y: 0.2 }, MAP_W, MAP_H)!
    const other = attachLightToToken(createLightItem('torch', { x: 0.5, y: 0.5 }, MAP_W, MAP_H)!, 'ch-other')
    const charPos = new Map([['ch-other', { x: 6, z: 6 }]])
    const regions = computeVisionRegions([staticLight, other], charPos, 'ch-mine', MAP_W, MAP_H, {
      shareCarriedLights: false,
    })
    const ids = new Set(regions.map((r) => r.id))
    expect(ids.has(`vision-${other.id}`)).toBe(false)
    expect(ids.has(`vision-${staticLight.id}`)).toBe(true)
  })

  it('computeVisionRegions: shareCarriedLights default true incluye antorchas ajenas + ambient propio', () => {
    const own = attachLightToToken(createLightItem('torch', { x: 0.5, y: 0.5 }, MAP_W, MAP_H)!, 'ch-mine')
    const other = attachLightToToken(createLightItem('candle', { x: 0.5, y: 0.5 }, MAP_W, MAP_H)!, 'ch-other')
    const charPos = new Map([
      ['ch-mine', { x: 1, z: 1 }],
      ['ch-other', { x: -3, z: -2 }],
    ])
    const regions = computeVisionRegions([own, other], charPos, 'ch-mine', MAP_W, MAP_H)
    const ids = new Set(regions.map((r) => r.id))
    expect(ids.has('vision-ambient')).toBe(true)
    expect(ids.has(`vision-${own.id}`)).toBe(true)
    expect(ids.has(`vision-${other.id}`)).toBe(true)
  })

  it('computeVisionRegions: región adjunta centra en el token, no en posición del item', () => {
    const own = attachLightToToken(createLightItem('torch', { x: 0.5, y: 0.5 }, MAP_W, MAP_H)!, 'ch-mine')
    const charPos = new Map([['ch-mine', { x: 3, z: -4 }]])
    const regions = computeVisionRegions([own], charPos, 'ch-mine', MAP_W, MAP_H)
    const r = regions.find((x) => x.id === `vision-${own.id}`)!
    const c = regionCenter(r.points)
    expect(c.x).toBeCloseTo(0.8, 2)
    expect(c.y).toBeCloseTo(0.1, 2)
  })
})