import { describe, it, expect } from 'vitest'
import {
  extractZonePolygons,
  crossZoneBorder,
  insideAnyZone,
  type ShadowItem,
} from './wall-collision'

function polygonZone(points: number[]): ShadowItem {
  return {
    metadata: { type: 'zone' },
    shape: { type: 'polygon', points },
  }
}

function legacyRectZone(x: number, z: number, width: number, height: number): ShadowItem {
  return {
    metadata: { type: 'zone' },
    shape: { type: 'rectangle' },
    x,
    y: z,
    width,
    height,
  }
}

const ZONE = [0.4, 0.4, 0.6, 0.4, 0.6, 0.6, 0.4, 0.6]

describe('extractZonePolygons', () => {
  it('extrae polígono de zona normalizado tal cual', () => {
    const zones = extractZonePolygons([polygonZone(ZONE)], 20, 20)
    expect(zones).toHaveLength(1)
    expect(zones[0].points).toEqual([
      [0.4, 0.4],
      [0.6, 0.4],
      [0.6, 0.6],
      [0.4, 0.6],
    ])
  })

  it('convierte zona rect legacy (coords mundo) a normalizada con mapW/mapH', () => {
    const zones = extractZonePolygons([legacyRectZone(2, 0, 4, 4)], 20, 10)
    expect(zones).toHaveLength(1)
    expect(zones[0].points).toEqual([
      [0.5, 0.3],
      [0.7, 0.3],
      [0.7, 0.7],
      [0.5, 0.7],
    ])
  })

  it('omite items que no son zonas (walls, doors)', () => {
    const wall: ShadowItem = {
      metadata: { type: 'wall' },
      shape: { type: 'line', points: [0.1, 0.1, 0.9, 0.1] },
    }
    const zones = extractZonePolygons([wall, polygonZone(ZONE)])
    expect(zones).toHaveLength(1)
  })

  it('ignora polígonos de zona con menos de 3 puntos', () => {
    const zones = extractZonePolygons([polygonZone([0.4, 0.4, 0.6, 0.4])])
    expect(zones).toHaveLength(0)
  })
})

describe('crossZoneBorder', () => {
  it('bloquea cruce adentro → afuera', () => {
    const zones = extractZonePolygons([polygonZone(ZONE)])
    expect(crossZoneBorder(0.5, 0.5, 0.7, 0.5, zones)).toBe(true)
    expect(crossZoneBorder(0.5, 0.5, 0.5, 0.8, zones)).toBe(true)
  })

  it('no bloquea movimiento dentro de la zona', () => {
    const zones = extractZonePolygons([polygonZone(ZONE)])
    expect(crossZoneBorder(0.45, 0.45, 0.55, 0.55, zones)).toBe(false)
  })

  it('no bloquea movimiento fuera de la zona', () => {
    const zones = extractZonePolygons([polygonZone(ZONE)])
    expect(crossZoneBorder(0.1, 0.1, 0.2, 0.1, zones)).toBe(false)
  })
})

describe('insideAnyZone', () => {
  it('detecta punto dentro y fuera', () => {
    const zones = extractZonePolygons([polygonZone(ZONE)])
    expect(insideAnyZone(0.5, 0.5, zones)).toBe(true)
    expect(insideAnyZone(0.9, 0.9, zones)).toBe(false)
  })
})