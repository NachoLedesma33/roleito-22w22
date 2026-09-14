import { describe, expect, it } from 'vitest'
import { EXPLORE_RADIUS, exploredPointsFor, exploredToFogRegion, isAlreadyExplored } from './playerFog'
import { FogRegion } from './fogMask'

function exploredRegion(cx: number, cy: number, radius = EXPLORE_RADIUS, index = 0): FogRegion {
  return exploredToFogRegion(exploredPointsFor(cx, cy, radius), index)
}

describe('playerFog/explored', () => {
  it('exploredToFogRegion marca revealed + zIndex alto (corte sobre niebla) y id estable', () => {
    const r = exploredToFogRegion([0.1, 0.1, 0.2, 0.1, 0.2, 0.2], 3)
    expect(r.id).toBe('pexp-3')
    expect(r.revealed).toBe(true)
    expect(r.zIndex).toBe(1000)
  })

  it('exploredPointsFor genera circulo normalizado de radio EXPLORE_RADIUS', () => {
    const pts = exploredPointsFor(0.5, 0.5, EXPLORE_RADIUS)
    expect(pts.length % 2).toBe(0)
    for (let i = 0; i < pts.length; i += 2) {
      expect(Math.hypot(pts[i] - 0.5, pts[i + 1] - 0.5)).toBeCloseTo(EXPLORE_RADIUS, 5)
    }
  })

  it('isAlreadyExplored true si centro esta dentro de una region existente', () => {
    const regions = [exploredRegion(0.5, 0.5)]
    expect(isAlreadyExplored(regions, 0.52, 0.52, EXPLORE_RADIUS)).toBe(true)
  })

  it('isAlreadyExplored false si centro esta fuera de todas las regiones', () => {
    const regions = [exploredRegion(0.5, 0.5)]
    expect(isAlreadyExplored(regions, 0.9, 0.9, EXPLORE_RADIUS)).toBe(false)
  })

  it('isAlreadyExplored ignora regiones no reveladas (solo cortes cuentan)', () => {
    const hidden: FogRegion = {
      id: 'h0',
      points: exploredPointsFor(0.5, 0.5, EXPLORE_RADIUS),
      revealed: false,
      zIndex: 0,
    }
    expect(isAlreadyExplored([hidden], 0.52, 0.52, EXPLORE_RADIUS)).toBe(false)
  })
})