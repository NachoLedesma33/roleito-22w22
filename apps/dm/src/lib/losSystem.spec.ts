import { describe, expect, it } from 'vitest'
import {
  buildLoSOccluders,
  computeCharacterLoS,
  computePartyLoS,
  isInLoS,
} from './losSystem'
import { SceneItem, SceneLayer } from '@core/domain/types'

function makeWallItem(x1: number, y1: number, x2: number, y2: number): SceneItem {
  return {
    id: 'wall-1',
    name: 'wall',
    x: 0, y: 0, rotation: 0, scale: 1,
    width: 0, height: 0,
    layer: SceneLayer.MAP, zIndex: 0,
    visible: true, locked: false,
    disableHit: false, disableAutoZIndex: false,
    attachmentIds: [], disableAttachmentBehavior: [],
    metadata: { type: 'wall', wallType: 'solid', material: 'stone', height: 10, thickness: 2, opacity: 1, lineOfSight: true, movement: true, soundOcclusion: 0.8 },
    shape: { type: 'line', points: [x1, y1, x2, y2], stroke: '#000', strokeWidth: 2 },
  }
}

function makeZoneItem(points: number[]): SceneItem {
  return {
    id: 'zone-1',
    name: 'zone',
    x: 0, y: 0, rotation: 0, scale: 1,
    width: 0, height: 0,
    layer: SceneLayer.OVERLAY, zIndex: 0,
    visible: true, locked: false,
    disableHit: false, disableAutoZIndex: false,
    attachmentIds: [], disableAttachmentBehavior: [],
    metadata: { type: 'zone', zoneType: 'polygon', origin: 'manual', touchedByDm: false, shadowOnly: false, fillColor: '#000', fillOpacity: 0.3, portals: [] },
    shape: { type: 'polygon', points, fill: '#000', stroke: '#000', strokeWidth: 1 },
  }
}

describe('losSystem/buildLoSOccluders', () => {
  it('extracts wall segments', () => {
    const items = [makeWallItem(0, 0, 1, 0)]
    const occ = buildLoSOccluders(items, 10, 10)
    expect(occ.length).toBe(1)
  })

  it('extracts zone edges', () => {
    const items = [makeZoneItem([0.3, 0.3, 0.7, 0.3, 0.7, 0.7, 0.3, 0.7])]
    const occ = buildLoSOccluders(items, 10, 10)
    expect(occ.length).toBe(4)
  })

  it('skips invisible items', () => {
    const item = makeWallItem(0, 0, 1, 0)
    item.visible = false
    const occ = buildLoSOccluders([item], 10, 10)
    expect(occ.length).toBe(0)
  })
})

describe('losSystem/computeCharacterLoS', () => {
  it('returns a mask when character has vision', () => {
    const mask = computeCharacterLoS(
      { sceneCharId: 'sc1', entityId: 'c1', x: 0, z: 0, rotation: 0, visions: [{ type: 'normal', range: 1 }] },
      [],
      10, 10,
      0.5,
    )
    expect(mask).not.toBeNull()
    expect(mask!.length).toBeGreaterThan(0)
  })

  it('returns null when no visions', () => {
    const mask = computeCharacterLoS(
      { sceneCharId: 'sc1', entityId: 'c1', x: 0, z: 0, rotation: 0, visions: [] },
      [],
      10, 10,
    )
    expect(mask).toBeNull()
  })
})

describe('losSystem/computePartyLoS', () => {
  it('unions multiple character visibilities', () => {
    const chars = [
      { sceneCharId: 'sc1', entityId: 'c1', x: -1, z: 0, rotation: 0, visions: [{ type: 'normal' as const, range: 1 }] },
      { sceneCharId: 'sc2', entityId: 'c2', x: 1, z: 0, rotation: 0, visions: [{ type: 'normal' as const, range: 1 }] },
    ]
    const mask = computePartyLoS(chars, [], 10, 10, 0.5)
    expect(mask).not.toBeNull()
  })
})

describe('losSystem/isInLoS', () => {
  it('returns true when no occluders', () => {
    expect(isInLoS(0, 0, 1, 0, [], 2)).toBe(true)
  })

  it('returns false when occluder blocks', () => {
    const occ = [{ a: [0.5, -0.5] as [number, number], b: [0.5, 0.5] as [number, number] }]
    expect(isInLoS(0, 0, 1, 0, occ, 2)).toBe(false)
  })
})
