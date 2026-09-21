import { describe, expect, it } from 'vitest'
import {
  computeReachableCells,
  findPath,
  isCellBlocked,
  movementRangeToPoints,
  pathToPoints,
} from './movementRange'
import { Occluder } from './lightOcclusion'

describe('movementRange/isCellBlocked', () => {
  it('returns false when no occluders', () => {
    expect(isCellBlocked(0, 0, [], 0.05)).toBe(false)
  })

  it('returns true when occluder is in cell', () => {
    const occ: Occluder[] = [{ a: [0.025, -0.1], b: [0.025, 0.1] }]
    expect(isCellBlocked(0, 0, occ, 0.05)).toBe(true)
  })
})

describe('movementRange/computeReachableCells', () => {
  it('returns at least the starting cell', () => {
    const result = computeReachableCells(0, 0, 5, [], 0.05, 10, 10)
    expect(result.cells.length).toBeGreaterThanOrEqual(1)
  })

  it('limits movement by speed', () => {
    const slow = computeReachableCells(0, 0, 1, [], 0.05, 10, 10)
    const fast = computeReachableCells(0, 0, 5, [], 0.05, 10, 10)
    expect(fast.cells.length).toBeGreaterThan(slow.cells.length)
  })

  it('blocks movement through walls', () => {
    const occ: Occluder[] = [{ a: [0, -5], b: [0, 5] }]
    const result = computeReachableCells(-1, 0, 10, occ, 0.05, 10, 10)
    const hasRight = result.cells.some((c) => c.x > 0.1)
    expect(hasRight).toBe(false)
  })
})

describe('movementRange/findPath', () => {
  it('finds a path when no obstacles', () => {
    const path = findPath(0, 0, 0.5, 0, [], 0.05, 10, 10)
    expect(path).not.toBeNull()
    expect(path!.length).toBeGreaterThan(1)
  })

  it('returns null when path is blocked by full wall', () => {
    const occ: Occluder[] = [{ a: [0, -5], b: [0, 5] }]
    const path = findPath(-1, 0, 1, 0, occ, 0.05, 10, 10)
    expect(path).toBeNull()
  })
})

describe('movementRange/movementRangeToPoints', () => {
  it('converts cells to flat points', () => {
    const cells = [{ x: 1, y: 2, cost: 1, terrain: 'normal' as const }]
    const pts = movementRangeToPoints(cells, 10, 10)
    expect(pts.length).toBe(2)
  })
})

describe('movementRange/pathToPoints', () => {
  it('converts path to flat points', () => {
    const path = [{ x: 0, y: 0 }, { x: 1, y: 0 }]
    const pts = pathToPoints(path, 10, 10)
    expect(pts.length).toBe(4)
  })
})
