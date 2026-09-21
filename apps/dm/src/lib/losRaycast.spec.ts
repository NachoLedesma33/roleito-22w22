import { describe, expect, it } from 'vitest'
import {
  castRay,
  castRayDDA,
  masksUnion,
  maskToCells,
  maskToPoints,
} from './losRaycast'
import { Occluder } from './lightOcclusion'

describe('losRaycast/castRay', () => {
  it('returns true when no occluders block the ray', () => {
    const result = castRay(0, 0, 1, 0, [], 2)
    expect(result).toBe(true)
  })

  it('returns false when an occluder blocks the ray', () => {
    const occ: Occluder[] = [{ a: [0.5, -0.5], b: [0.5, 0.5] }]
    const result = castRay(0, 0, 1, 0, occ, 2)
    expect(result).toBe(false)
  })

  it('returns true when occluder is beyond maxRange', () => {
    const occ: Occluder[] = [{ a: [2, -0.5], b: [2, 0.5] }]
    const result = castRay(0, 0, 1, 0, occ, 1.5)
    expect(result).toBe(true)
  })

  it('returns true for zero-length ray', () => {
    const result = castRay(0, 0, 0, 0, [], 1)
    expect(result).toBe(true)
  })
})

describe('losRaycast/castRayDDA', () => {
  it('returns true when no occluders', () => {
    const result = castRayDDA(0, 0, 1, 0, [], 2)
    expect(result).toBe(true)
  })

  it('returns false when occluder blocks', () => {
    const occ: Occluder[] = [{ a: [0.5, -0.5], b: [0.5, 0.5] }]
    const result = castRayDDA(0, 0, 1, 0, occ, 2)
    expect(result).toBe(false)
  })
})

describe('losRaycast/masksUnion', () => {
  it('unions two masks of same size', () => {
    const a = [[true, false], [false, false]]
    const b = [[false, false], [false, true]]
    const result = masksUnion(a, b)
    expect(result[0][0]).toBe(true)
    expect(result[0][1]).toBe(false)
    expect(result[1][0]).toBe(false)
    expect(result[1][1]).toBe(true)
  })

  it('handles different sized masks', () => {
    const a = [[true]]
    const b = [[false, true], [true, false]]
    const result = masksUnion(a, b)
    expect(result[0][0]).toBe(true)
    expect(result[0][1]).toBe(true)
    expect(result[1][0]).toBe(true)
  })
})

describe('losRaycast/maskToCells', () => {
  it('returns cells for true positions', () => {
    const mask = [[true, false], [false, true]]
    const cells = maskToCells(mask, 0.5, 1, 1)
    expect(cells.length).toBe(2)
  })
})

describe('losRaycast/maskToPoints', () => {
  it('returns flat point array', () => {
    const mask = [[true, false], [false, true]]
    const pts = maskToPoints(mask, 0.5, 1, 1)
    expect(pts.length).toBe(4)
  })
})
