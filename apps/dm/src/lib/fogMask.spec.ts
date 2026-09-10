import { describe, expect, it } from 'vitest'
import { SceneItem, SceneLayer } from '@core/domain/types'
import { circlePoints, extractFogRegions, isFogItem } from './fogMask'

function fogItem(id: string, revealed: boolean, points: number[], zIndex = 0): SceneItem {
  return {
    id,
    name: 'Fog',
    x: 0,
    y: 0,
    zIndex,
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
    layer: SceneLayer.FOG,
    shape: { type: 'polygon', points, fill: '#000000' },
    metadata: { type: 'fog', fogType: 'static', revealed },
  }
}

describe('fogMask/roundtrip', () => {
  it('extractFogRegions filtra y mapea los items de niebla', () => {
    const items = [
      fogItem('f1', true, circlePoints(0.5, 0.5, 0.1)),
      fogItem('f2', false, [0.1, 0.1, 0.2, 0.1, 0.2, 0.2, 0.1, 0.2]),
      { ...fogItem('f3', true, [0.4, 0.4, 0.4, 0.5]), id: 'short' },
      {
        id: 'wall-x',
        name: 'W',
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
        layer: 1,
        shape: { type: 'line' as const, points: [0, 0, 1, 1], stroke: '#333', strokeWidth: 1 },
        metadata: { type: 'wall' as const, wallType: 'solid' as const, material: 'stone' as const, height: 1, thickness: 0.1, opacity: 0, lineOfSight: true, movement: true, soundOcclusion: 0 },
      },
    ]
    const regions = extractFogRegions(items)
    expect(regions.map((r) => r.id)).toEqual(['f1', 'f2'])
    expect(regions[0].revealed).toBe(true)
    expect(regions[0].points).toHaveLength(32)
    expect(regions[1].revealed).toBe(false)
  })

  it('isFogItem distingue niebla de otros items', () => {
    expect(isFogItem(fogItem('f', true, circlePoints(0.5, 0.5, 0.1)))).toBe(true)
    expect(isFogItem({ ...fogItem('f', true, circlePoints(0.5, 0.5, 0.1)), metadata: { type: 'zone', zoneType: 'polygon', origin: 'manual', touchedByDm: false, shadowOnly: false, fillColor: '#111', fillOpacity: 0.3, portals: [] } as never })).toBe(false)
  })

  it('circlePoints genera circulo normalizado con radio dado', () => {
    const pts = circlePoints(0.5, 0.5, 0.1, 8)
    expect(pts).toHaveLength(16)
    for (let i = 0; i < pts.length; i += 2) {
      const dx = pts[i] - 0.5
      const dy = pts[i + 1] - 0.5
      const r = Math.hypot(dx, dy)
      expect(r).toBeCloseTo(0.1, 5)
    }
    const north = circlePoints(0.5, 0.5, 0.1, 4)
    expect(north[3]).toBeCloseTo(0.5 + 0.1, 5)
  })
})