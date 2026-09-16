import { describe, expect, it } from 'vitest'
import { buildOccluders, intersectRaySegment2D, lightShapePoints, Occluder } from './lightOcclusion'
import { SceneItem, SceneLayer } from '@core/domain/types'

function baseItem(id: string): SceneItem {
  return {
    id,
    name: id,
    x: 0,
    y: 0,
    zIndex: 0,
    scale: 1,
    rotation: 0,
    width: 0,
    height: 0,
    opacity: 1,
    visible: true,
    locked: false,
    disableHit: false,
    disableAutoZIndex: false,
    attachmentIds: [],
    disableAttachmentBehavior: [],
    layer: SceneLayer.OVERLAY,
    metadata: { type: 'wall', wallType: 'solid', material: 'stone', height: 1, thickness: 1, opacity: 1, lineOfSight: true, movement: true, soundOcclusion: 1 },
  }
}

function wallItem(points: number[]): SceneItem {
  return { ...baseItem('wall'), shape: { type: 'line', points, stroke: '#fff', strokeWidth: 1 } }
}

function doorItem(points: number[], state: 'open' | 'closed' | 'locked'): SceneItem {
  return {
    ...baseItem('door'),
    shape: { type: 'line', points, stroke: '#fff', strokeWidth: 1 },
    metadata: { type: 'door', state, material: 'wood', autoClose: false },
  }
}

function zonePolygon(points: number[]): SceneItem {
  return {
    ...baseItem('zone'),
    shape: { type: 'polygon', points, fill: '#fff', stroke: '#fff' },
    metadata: { type: 'zone', zoneType: 'polygon', origin: 'manual', touchedByDm: true, shadowOnly: false, fillColor: '#fff', fillOpacity: 0.3, portals: [] },
  }
}

describe('intersectRaySegment2D', () => {
  it('ray horizontal cruza segmento vertical', () => {
    const t = intersectRaySegment2D(0, 0, 1, 0, 2, -1, 2, 1)
    expect(t).not.toBeNull()
    expect(t!).toBeCloseTo(2, 5)
  })

  it('rayo paralelo no cruza', () => {
    expect(intersectRaySegment2D(0, 0, 1, 0, 2, 2, 3, 2)).toBeNull()
  })

  it('segmento detras del origen no cruza', () => {
    expect(intersectRaySegment2D(0, 0, 1, 0, -2, -1, -2, 1)).toBeNull()
  })

  it('segmento fuera del alcance lateral no cruza', () => {
    expect(intersectRaySegment2D(0, 0, 1, 0, 2, 3, 2, 4)).toBeNull()
  })
})

describe('buildOccluders', () => {
  const mapW = 10
  const mapH = 10

  it('convierte wall normalizada a world', () => {
    const out = buildOccluders([wallItem([0.5, 0.5, 0.6, 0.5])], mapW, mapH)
    expect(out).toHaveLength(1)
    expect(out[0].a[0]).toBeCloseTo(0, 5)
    expect(out[0].a[1]).toBeCloseTo(0, 5)
    expect(out[0].b[0]).toBeCloseTo(1, 5)
    expect(out[0].b[1]).toBeCloseTo(0, 5)
  })

  it('puerta abierta no bloquea; cerrada si', () => {
    const closed = buildOccluders([doorItem([2, 0, 2, 1], 'closed')], mapW, mapH)
    expect(closed).toHaveLength(1)
    const open = buildOccluders([doorItem([2, 0, 2, 1], 'open')], mapW, mapH)
    expect(open).toHaveLength(0)
  })

  it('zona polygon genera edges cerrados (n puntos = n lados)', () => {
    const out = buildOccluders([zonePolygon([0.5, 0.5, 0.7, 0.5, 0.5, 0.7])], mapW, mapH)
    expect(out).toHaveLength(3)
    expect(out[0].a).toEqual([0, 0])
  })

  it('ignora items que no son oculuders', () => {
    const item = { ...baseItem('light'), metadata: { type: 'light' as const, source: { mode: 'hard' as const, color: '#fff', intensity: 1, radius: 0.1 } } }
    expect(buildOccluders([item], mapW, mapH)).toHaveLength(0)
  })
})

describe('lightShapePoints', () => {
  it('sin ocluders circular produce poligono en el radio', () => {
    const pts = lightShapePoints(0, 0, 5, null, 360, [])
    expect(pts.length).toBe(181)
    for (const [x, z] of pts) {
      expect(Math.hypot(x, z)).toBeCloseTo(5, 4)
    }
  })

  it('conico restringe a la apertura', () => {
    const pts = lightShapePoints(0, 0, 5, 0, 90, [])
    const total = Math.round(90 / 1.5)
    expect(pts.length).toBe(total + 1)
    for (const [x, z] of pts) {
      const ang = Math.atan2(z, x)
      expect(Math.abs(ang)).toBeLessThanOrEqual((45 * Math.PI) / 180 + 1e-3)
    }
  })

  it('pared vertical frente al rayo recorta puntos detras', () => {
    const occluders: Occluder[] = [{ a: [2, -1000], b: [2, 1000] }]
    const pts = lightShapePoints(0, 0, 10, null, 360, occluders)
    for (const [x] of pts) {
      expect(x).toBeLessThanOrEqual(2 + 1e-3)
    }
  })
})