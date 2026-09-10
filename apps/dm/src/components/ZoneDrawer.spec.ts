import { describe, it, expect } from 'vitest'
import { createZoneItem, createEmptyZoneDraft, type ZoneDraft } from './ZoneDrawer'
import { SceneLayer, type ZoneMetadata } from '@core/domain/types'

function rectDraft(a: { x: number; y: number }, b: { x: number; y: number }): ZoneDraft {
  return {
    mode: 'rect',
    points: [],
    startPoint: a,
    currentPoint: b,
  }
}

function polygonDraft(points: { x: number; y: number }[]): ZoneDraft {
  return { ...createEmptyZoneDraft('polygon'), points }
}

describe('createZoneItem', () => {
  it('rect genera shape polygon normalizado (no rectangle) con 4 puntos', () => {
    const item = createZoneItem(rectDraft({ x: -5, y: -4 }, { x: 5, y: 4 }), '#10b981', 20, 20)
    expect(item).not.toBeNull()
    expect(item!.shape?.type).toBe('polygon')
    expect(item!.metadata.type).toBe('zone')
    expect((item!.metadata as ZoneMetadata).zoneType).toBe('polygon')
    expect(item!.layer).toBe(SceneLayer.OVERLAY)
    const pts = (item!.shape as { type: 'polygon'; points: number[] }).points
    expect(pts).toEqual([0.25, 0.3, 0.75, 0.3, 0.75, 0.7, 0.25, 0.7])
  })

  it('misma zona escala con el tamaño de mapa en la normalización', () => {
    const big = createZoneItem(rectDraft({ x: -5, y: -4 }, { x: 5, y: 4 }), '#10b981', 20, 20)!
    const small = createZoneItem(rectDraft({ x: -5, y: -4 }, { x: 5, y: 4 }), '#10b981', 10, 10)!
    const ptsBig = (big.shape as { type: 'polygon'; points: number[] }).points
    const ptsSmall = (small.shape as { type: 'polygon'; points: number[] }).points
    expect(ptsSmall[0]).toBe(0)
    expect(ptsBig[0]).toBe(0.25)
    expect(ptsSmall).not.toEqual(ptsBig)
  })

  it('polígono libre con 3 puntos normaliza y cierra shape', () => {
    const item = createZoneItem(
      polygonDraft([
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 2.5, y: 4 },
      ]),
      '#38bdf8',
      10,
      10,
    )
    expect(item).not.toBeNull()
    const pts = (item!.shape as { type: 'polygon'; points: number[] }).points
    expect(pts).toEqual([0.5, 0.5, 1, 0.5, 0.75, 0.9])
  })

  it('polígono con menos de 3 puntos retorna null', () => {
    const item = createZoneItem(
      polygonDraft([
        { x: 0, y: 0 },
        { x: 5, y: 0 },
      ]),
      '#10b981',
    )
    expect(item).toBeNull()
  })

  it('rect sin startPoint retorna null', () => {
    const item = createZoneItem(createEmptyZoneDraft('rect'), '#10b981', 10, 10)
    expect(item).toBeNull()
  })

  it('todos los puntos normalizados quedan dentro de [0,1] en mapa estándar', () => {
    const item = createZoneItem(
      rectDraft({ x: -9.5, y: -9.5 }, { x: 9.5, y: 9.5 }),
      '#10b981',
      20,
      20,
    )!
    const pts = (item.shape as { type: 'polygon'; points: number[] }).points
    for (const p of pts) {
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1)
    }
  })
})