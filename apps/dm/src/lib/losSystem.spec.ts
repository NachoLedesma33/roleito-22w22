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

function makeZoneItem(points: number[], lineOfSight?: boolean): SceneItem {
  return {
    id: 'zone-1',
    name: 'zone',
    x: 0, y: 0, rotation: 0, scale: 1,
    width: 0, height: 0,
    layer: SceneLayer.OVERLAY, zIndex: 0,
    visible: true, locked: false,
    disableHit: false, disableAutoZIndex: false,
    attachmentIds: [], disableAttachmentBehavior: [],
    metadata: { type: 'zone', zoneType: 'polygon', origin: 'manual', touchedByDm: false, shadowOnly: false, fillColor: '#000', fillOpacity: 0.3, portals: [], ...(lineOfSight === undefined ? {} : { lineOfSight }) },
    shape: { type: 'polygon', points, fill: '#000', stroke: '#000', strokeWidth: 1 },
  }
}

describe('losSystem/buildLoSOccluders', () => {
  it('extracts wall segments', () => {
    const items = [makeWallItem(0, 0, 1, 0)]
    const occ = buildLoSOccluders(items, 10, 10)
    expect(occ.length).toBe(1)
  })

  it('un muro con lineOfSight false no ocluye la vision', () => {
    // El flag existia pero el runtime lo ignoraba: un DM que apagaba
    // "tapa la vista" no hacia nada.
    const item = makeWallItem(0, 0, 1, 0)
    item.metadata = { ...(item.metadata as object), lineOfSight: false } as typeof item.metadata
    expect(buildLoSOccluders([item], 10, 10)).toHaveLength(0)
  })

  it('extracts zone edges', () => {
    const items = [makeZoneItem([0.3, 0.3, 0.7, 0.3, 0.7, 0.7, 0.3, 0.7])]
    const occ = buildLoSOccluders(items, 10, 10)
    expect(occ.length).toBe(4)
  })

  it('una zona con lineOfSight false no ocluye la vision', () => {
    // El borde de la zona ES la pared: el flag es el del muro. Antes la
    // zona no lo tenia, asi que "esta zona no tapa la vista" no se podia
    // pedir (solo el "solo sombra" de la zona entera).
    const items = [makeZoneItem([0.3, 0.3, 0.7, 0.3, 0.7, 0.7, 0.3, 0.7], false)]
    expect(buildLoSOccluders(items, 10, 10)).toHaveLength(0)
  })

  it('zone edges use mapWidth in X and mapHeight in Y (mapa apaisado)', () => {
    // 0.3..0.7 normalizado en ambos ejes: en un mapa 20x10 el rectangulo va de
    // -4..4 en X y -2..2 en Y. Si la X se escalara con el alto, el rectangulo
    // saldaria chato en -2..2 y la vision se recortaria antes de tiempo.
    const items = [makeZoneItem([0.3, 0.3, 0.7, 0.3, 0.7, 0.7, 0.3, 0.7])]
    const occ = buildLoSOccluders(items, 20, 10)
    const corners = [
      [-4, -2],
      [4, -2],
      [4, 2],
      [-4, 2],
    ]
    expect(occ).toHaveLength(4)
    occ.forEach((edge, i) => {
      expect(edge.a[0]).toBeCloseTo(corners[i][0], 5)
      expect(edge.a[1]).toBeCloseTo(corners[i][1], 5)
    })
    // La ultima arista cierra con el primer punto: es la que multiplicaba la X
    // por mapHeight.
    expect(occ[3].b[0]).toBeCloseTo(-4, 5)
    expect(occ[3].b[1]).toBeCloseTo(-2, 5)
  })

  it('wall line also spans the full width on a wide map', () => {
    // Mismo criterio para un muro: 0..1 normalizado = todo el ancho del mundo.
    const occ = buildLoSOccluders([makeWallItem(0, 0.5, 1, 0.5)], 20, 10)
    expect(occ[0]).toEqual({ a: [-10, 0], b: [10, 0] })
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
