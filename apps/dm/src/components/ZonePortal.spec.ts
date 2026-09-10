import { describe, it, expect } from 'vitest'
import { SceneItem, SceneLayer, ZoneMetadata } from '@core/domain/types'
import {
  snapToZoneEdge,
  buildPortalLocalEdge,
  createPortalBetween,
  cyclePortalState,
  removePortal,
  zonesToGeometry,
  PORTAL_LEN,
  type ZoneGeometry,
} from './ZonePortal'
import {
  extractZonePolygons,
  extractPortals,
  crossZoneBorder,
} from '../lib/wall-collision'

function zoneItem(id: string, points: number[]): SceneItem {
  return {
    id,
    name: 'Zone',
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
    shape: { type: 'polygon', points, fill: '#10b981' },
    metadata: {
      type: 'zone',
      zoneType: 'polygon',
      origin: 'manual',
      touchedByDm: false,
      shadowOnly: false,
      fillColor: '#10b981',
      fillOpacity: 0.35,
      portals: [],
    },
  }
}

const ZONE_A = [0.2, 0.2, 0.5, 0.2, 0.5, 0.8, 0.2, 0.8]
const ZONE_B = [0.5, 0.2, 0.8, 0.2, 0.8, 0.8, 0.5, 0.8]

function makeGeometry(id: string, points: number[]): ZoneGeometry {
  return { id, points: extractZonePolygons([zoneItem(id, points)], 10, 10)[0].points }
}

describe('snapToZoneEdge', () => {
  const zones = [makeGeometry('a', ZONE_A), makeGeometry('b', ZONE_B)]

  it('snapa en borde de zona A (derecha, nx=0.5)', () => {
    const snap = snapToZoneEdge({ x: 0.5, y: 0.5 }, zones)
    expect(snap).not.toBeNull()
    expect(snap!.zoneId).toBe('a')
    expect(snap!.point.x).toBeCloseTo(0.5)
  })

  it('snapa en borde de zona B si el punto está más cerca de ella', () => {
    const zonesB = [makeGeometry('a', ZONE_A), makeGeometry('b', [0.55, 0.2, 0.8, 0.2, 0.8, 0.8, 0.55, 0.8])]
    const snap = snapToZoneEdge({ x: 0.56, y: 0.6 }, zonesB)
    expect(snap).not.toBeNull()
    expect(snap!.zoneId).toBe('b')
    expect(snap!.point.x).toBeCloseTo(0.55)
  })

  it('no snapa lejos de cualquier zona', () => {
    const snap = snapToZoneEdge({ x: 0.1, y: 0.1 }, zones)
    expect(snap).toBeNull()
  })
})

describe('buildPortalLocalEdge', () => {
  it('genera segmento centrado en el punto a lo largo del borde vertical', () => {
    const edge = { point: { x: 0.5, y: 0.5 }, a: { x: 0.5, y: 0.2 }, b: { x: 0.5, y: 0.8 } }
    const [p1, p2] = buildPortalLocalEdge(edge)
    expect(Math.abs(p1.x - 0.5)).toBeLessThan(1e-9)
    expect(p1.y).toBeCloseTo(0.5 - PORTAL_LEN / 2)
    expect(p2.y).toBeCloseTo(0.5 + PORTAL_LEN / 2)
    expect(Math.hypot(p2.x - p1.x, p2.y - p1.y)).toBeCloseTo(PORTAL_LEN)
  })
})

describe('createPortalBetween / colisión con portales', () => {
  const a = zoneItem('a', ZONE_A)
  const b = zoneItem('b', ZONE_B)
  const localEdge: [ { x: number; y: number }, { x: number; y: number } ] = [
    { x: 0.5, y: 0.46 },
    { x: 0.5, y: 0.54 },
  ]

  it('espeja el portal en ambas zonas y queda open por defecto', () => {
    const { zoneA: a2, zoneB: b2 } = createPortalBetween(a, b, localEdge)
    const portalA = (a2.metadata as ZoneMetadata).portals
    const portalB = (b2.metadata as ZoneMetadata).portals
    expect(portalA).toHaveLength(1)
    expect(portalB).toHaveLength(1)
    expect(portalA[0].id).toBe(portalB[0].id)
    expect(portalA[0].state).toBe('open')
    expect(portalA[0].zoneA).toBe('a')
    expect(portalA[0].zoneB).toBe('b')
  })

  function buildItems(portalState: 'open' | 'closed' | 'locked' | undefined) {
    const created = createPortalBetween(a, b, localEdge)
    if (!portalState) return [created.zoneA, created.zoneB]
    const set = { ...created.zoneA, metadata: { ...(created.zoneA.metadata as ZoneMetadata), portals: [{ ...(created.zoneA.metadata as ZoneMetadata).portals[0], state: portalState }] } }
    const setB = { ...created.zoneB, metadata: { ...(created.zoneB.metadata as ZoneMetadata), portals: [{ ...(created.zoneB.metadata as ZoneMetadata).portals[0], state: portalState }] } }
    return [set, setB]
  }

  it('con portal open el cruce A→B no está bloqueado', () => {
    const items = buildItems('open')
    const zones = extractZonePolygons(items, 10, 10)
    const portals = extractPortals(items)
    expect(portals.length).toBeGreaterThan(0)
    expect(crossZoneBorder(0.45, 0.5, 0.55, 0.5, zones, portals)).toBe(false)
  })

  it('con portal closed el cruce A→B está bloqueado', () => {
    const items = buildItems('closed')
    const zones = extractZonePolygons(items, 10, 10)
    const portals = extractPortals(items)
    expect(crossZoneBorder(0.45, 0.5, 0.55, 0.5, zones, portals)).toBe(true)
  })

  it('cruzar lejos del portal sigue bloqueado aunque exista un portal open', () => {
    const items = buildItems('open')
    const zones = extractZonePolygons(items, 10, 10)
    const portals = extractPortals(items)
    expect(crossZoneBorder(0.45, 0.3, 0.55, 0.3, zones, portals)).toBe(true)
  })

  it('sin datos de portal mantiene el comportamiento original (bloquea)', () => {
    const items = buildItems(undefined)
    const zones = extractZonePolygons(items, 10, 10)
    expect(crossZoneBorder(0.45, 0.5, 0.55, 0.5, zones)).toBe(true)
    expect(crossZoneBorder(0.45, 0.5, 0.5, 0.5, zones)).toBe(true)
  })
})

describe('cyclePortalState / removePortal', () => {
  const a = zoneItem('a', ZONE_A)
  const b = zoneItem('b', ZONE_B)
  const localEdge: [ { x: number; y: number }, { x: number; y: number } ] = [
    { x: 0.5, y: 0.46 },
    { x: 0.5, y: 0.54 },
  ]

  it('cicla open → closed → locked → open en ambas zonas', () => {
    const { zoneA: a2, zoneB: b2 } = createPortalBetween(a, b, localEdge)
    const portalId = (a2.metadata as ZoneMetadata).portals[0].id

    const closed = cyclePortalState([a2, b2], portalId)
    expect((closed[0].metadata as ZoneMetadata).portals[0].state).toBe('closed')
    expect((closed[1].metadata as ZoneMetadata).portals[0].state).toBe('closed')

    const locked = cyclePortalState(closed, portalId)
    expect((locked[0].metadata as ZoneMetadata).portals[0].state).toBe('locked')
    expect((locked[1].metadata as ZoneMetadata).portals[0].state).toBe('locked')

    const open = cyclePortalState(locked, portalId)
    expect((open[0].metadata as ZoneMetadata).portals[0].state).toBe('open')
  })

  it('borra el portal de ambas zonas', () => {
    const { zoneA: a2, zoneB: b2 } = createPortalBetween(a, b, localEdge)
    const portalId = (a2.metadata as ZoneMetadata).portals[0].id
    const after = removePortal([a2, b2], portalId)
    for (const item of after) {
      expect((item.metadata as ZoneMetadata).portals).toHaveLength(0)
    }
  })
})

describe('zonesToGeometry', () => {
  it('pasa zonas con id', () => {
    const items = [zoneItem('a', ZONE_A), zoneItem('b', ZONE_B)]
    const zones = zonesToGeometry(extractZonePolygons(items, 10, 10))
    expect(zones.map((z) => z.id).sort()).toEqual(['a', 'b'])
  })
})