/**
 * Movement range calculation and A* pathfinding.
 * Determines which cells a character can reach given movement speed and obstacles.
 */

import { Occluder } from './lightOcclusion'

export interface MovementCell {
  x: number
  y: number
  cost: number
  terrain: 'normal' | 'difficult' | 'impassable'
}

export interface PathNode {
  x: number
  y: number
  g: number
  h: number
  f: number
  parent: PathNode | null
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

export function isCellBlocked(
  cx: number,
  cy: number,
  occluders: Occluder[],
  cellSize: number,
): boolean {
  const wx = (cx + 0.5) * cellSize
  const wy = (cy + 0.5) * cellSize

  for (const occ of occluders) {
    const dx = occ.b[0] - occ.a[0]
    const dy = occ.b[1] - occ.a[1]
    const lenSq = dx * dx + dy * dy
    if (lenSq < 1e-10) continue

    const t = Math.max(0, Math.min(1, ((wx - occ.a[0]) * dx + (wy - occ.a[1]) * dy) / lenSq))
    const projX = occ.a[0] + t * dx
    const projY = occ.a[1] + t * dy
    const dist = Math.hypot(wx - projX, wy - projY)

    if (dist < cellSize * 0.6) return true
  }

  return false
}

export function computeReachableCells(
  startX: number,
  startY: number,
  moveSpeed: number,
  occluders: Occluder[],
  cellSize: number = 0.05,
  mapWidth: number = 10,
  mapHeight: number = 10,
): { cells: MovementCell[]; paths: Map<string, { x: number; y: number }[]> } {
  const halfW = mapWidth / 2
  const halfH = mapHeight / 2

  const startCX = Math.floor((startX + halfW) / cellSize)
  const startCY = Math.floor((startY + halfH) / cellSize)

  const reachable: MovementCell[] = []
  const paths = new Map<string, { x: number; y: number }[]>()
  const visited = new Set<string>()
  const queue: PathNode[] = []

  const startNode: PathNode = {
    x: startCX,
    y: startCY,
    g: 0,
    h: 0,
    f: 0,
    parent: null,
  }
  queue.push(startNode)
  visited.add(cellKey(startCX, startCY))

  const dirs = [
    [0, 1], [0, -1], [1, 0], [-1, 0],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ]

  while (queue.length > 0) {
    queue.sort((a, b) => a.f - b.f)
    const current = queue.shift()!

    const wx = (current.x + 0.5) * cellSize - halfW
    const wy = (current.y + 0.5) * cellSize - halfH

    reachable.push({
      x: wx,
      y: wy,
      cost: current.g,
      terrain: 'normal',
    })

    const path: { x: number; y: number }[] = []
    let node: PathNode | null = current
    while (node) {
      path.unshift({
        x: (node.x + 0.5) * cellSize - halfW,
        y: (node.y + 0.5) * cellSize - halfH,
      })
      node = node.parent
    }
    paths.set(cellKey(current.x, current.y), path)

    for (const [dx, dy] of dirs) {
      const nx = current.x + dx
      const ny = current.y + dy
      const key = cellKey(nx, ny)

      if (visited.has(key)) continue

      const nwx = (nx + 0.5) * cellSize - halfW
      const nwy = (ny + 0.5) * cellSize - halfH

      if (Math.abs(nwx) > halfW || Math.abs(nwy) > halfH) continue

      if (isCellBlocked(nwx, nwy, occluders, cellSize)) continue

      const moveCost = (dx !== 0 && dy !== 0) ? 1.414 : 1.0
      const newG = current.g + moveCost

      if (newG > moveSpeed) continue

      visited.add(key)
      queue.push({
        x: nx,
        y: ny,
        g: newG,
        h: 0,
        f: newG,
        parent: current,
      })
    }
  }

  return { cells: reachable, paths }
}

export function findPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  occluders: Occluder[],
  cellSize: number = 0.05,
  mapWidth: number = 10,
  mapHeight: number = 10,
): { x: number; y: number }[] | null {
  const halfW = mapWidth / 2
  const halfH = mapHeight / 2

  const startCX = Math.floor((startX + halfW) / cellSize)
  const startCY = Math.floor((startY + halfH) / cellSize)
  const endCX = Math.floor((endX + halfW) / cellSize)
  const endCY = Math.floor((endY + halfH) / cellSize)

  const openSet = new Map<string, PathNode>()
  const closedSet = new Set<string>()

  const startNode: PathNode = {
    x: startCX,
    y: startCY,
    g: 0,
    h: Math.hypot(endCX - startCX, endCY - startCY),
    f: Math.hypot(endCX - startCX, endCY - startCY),
    parent: null,
  }
  openSet.set(cellKey(startCX, startCY), startNode)

  const dirs = [
    [0, 1], [0, -1], [1, 0], [-1, 0],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ]

  while (openSet.size > 0) {
    let current: PathNode | null = null
    for (const node of openSet.values()) {
      if (!current || node.f < current.f) {
        current = node
      }
    }
    if (!current) break

    if (current.x === endCX && current.y === endCY) {
      const path: { x: number; y: number }[] = []
      let node: PathNode | null = current
      while (node) {
        path.unshift({
          x: (node.x + 0.5) * cellSize - halfW,
          y: (node.y + 0.5) * cellSize - halfH,
        })
        node = node.parent
      }
      return path
    }

    const key = cellKey(current.x, current.y)
    openSet.delete(key)
    closedSet.add(key)

    for (const [dx, dy] of dirs) {
      const nx = current.x + dx
      const ny = current.y + dy
      const nKey = cellKey(nx, ny)

      if (closedSet.has(nKey)) continue

      const nwx = (nx + 0.5) * cellSize - halfW
      const nwy = (ny + 0.5) * cellSize - halfH

      if (Math.abs(nwx) > halfW || Math.abs(nwy) > halfH) continue
      if (isCellBlocked(nwx, nwy, occluders, cellSize)) continue

      const moveCost = (dx !== 0 && dy !== 0) ? 1.414 : 1.0
      const newG = current.g + moveCost

      const existing = openSet.get(nKey)
      if (existing && newG >= existing.g) continue

      const h = Math.hypot(endCX - nx, endCY - ny)
      const node: PathNode = {
        x: nx,
        y: ny,
        g: newG,
        h,
        f: newG + h,
        parent: current,
      }
      openSet.set(nKey, node)
    }
  }

  return null
}

export function movementRangeToPoints(
  cells: MovementCell[],
  mapWidth: number,
  mapHeight: number,
): number[] {
  const points: number[] = []
  for (const cell of cells) {
    points.push(cell.x / mapWidth + 0.5, cell.y / mapHeight + 0.5)
  }
  return points
}

export function pathToPoints(
  path: { x: number; y: number }[],
  mapWidth: number,
  mapHeight: number,
): number[] {
  const points: number[] = []
  for (const pt of path) {
    points.push(pt.x / mapWidth + 0.5, pt.y / mapHeight + 0.5)
  }
  return points
}
