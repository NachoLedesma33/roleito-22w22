import { SceneItem } from '@core/domain/types'

export interface WallSegment {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  blocksMovement: boolean
  blocksLoS: boolean
}

export interface CollisionResult {
  blocked: boolean
  intersectionPoint: { x: number; y: number } | null
  wallId: string | null
}

export function extractWallSegments(items: SceneItem[]): WallSegment[] {
  const segments: WallSegment[] = []
  for (const item of items) {
    if (item.metadata.type !== 'wall' || item.shape?.type !== 'line') continue
    const meta = item.metadata
    segments.push({
      id: item.id,
      x1: item.x + item.shape.points[0],
      y1: item.y + item.shape.points[1],
      x2: item.x + item.shape.points[2],
      y2: item.y + item.shape.points[3],
      blocksMovement: meta.movement,
      blocksLoS: meta.lineOfSight,
    })
  }
  return segments
}

export function extractDoorSegments(items: SceneItem[]): WallSegment[] {
  const segments: WallSegment[] = []
  for (const item of items) {
    if (item.metadata.type !== 'door' || item.shape?.type !== 'line') continue
    const meta = item.metadata
    if (meta.state === 'open') continue
    segments.push({
      id: item.id,
      x1: item.x + item.shape.points[0],
      y1: item.y + item.shape.points[1],
      x2: item.x + item.shape.points[2],
      y2: item.y + item.shape.points[3],
      blocksMovement: meta.state !== 'open',
      blocksLoS: meta.state !== 'open',
    })
  }
  return segments
}

function segmentsIntersect(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number,
): { x: number; y: number } | null {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (Math.abs(denom) < 1e-10) return null

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    }
  }
  return null
}

export function checkLineSegmentCollision(
  x1: number, y1: number,
  x2: number, y2: number,
  walls: WallSegment[],
  onlyMovement = true,
): CollisionResult {
  let closestDist = Infinity
  let closestPoint: { x: number; y: number } | null = null
  let closestWallId: string | null = null

  for (const wall of walls) {
    if (onlyMovement && !wall.blocksMovement) continue

    const intersection = segmentsIntersect(x1, y1, x2, y2, wall.x1, wall.y1, wall.x2, wall.y2)
    if (intersection) {
      const dist = Math.hypot(intersection.x - x1, intersection.y - y1)
      if (dist < closestDist) {
        closestDist = dist
        closestPoint = intersection
        closestWallId = wall.id
      }
    }
  }

  return {
    blocked: closestPoint !== null,
    intersectionPoint: closestPoint,
    wallId: closestWallId,
  }
}

export function slideAlongWall(
  x1: number, y1: number,
  x2: number, y2: number,
  walls: WallSegment[],
): { x: number; y: number } {
  const collision = checkLineSegmentCollision(x1, y1, x2, y2, walls, true)
  if (!collision.blocked || !collision.intersectionPoint) {
    return { x: x2, y: y2 }
  }

  const ix = collision.intersectionPoint.x
  const iy = collision.intersectionPoint.y
  const wall = walls.find(w => w.id === collision.wallId)
  if (!wall) return { x: ix, y: iy }

  const wallDx = wall.x2 - wall.x1
  const wallDy = wall.y2 - wall.y1
  const wallLen = Math.hypot(wallDx, wallDy)
  const wallNx = -wallDy / wallLen
  const wallNy = wallDx / wallLen

  const moveDx = x2 - x1
  const moveDy = y2 - y1
  const dot = moveDx * wallNx + moveDy * wallNy

  const slideX = ix + dot * wallNx * 0.99
  const slideY = iy + dot * wallNy * 0.99

  const secondCollision = checkLineSegmentCollision(ix, iy, slideX, slideY, walls, true)
  if (secondCollision.blocked) {
    return { x: ix, y: iy }
  }

  return { x: slideX, y: slideY }
}

export function isPointInsideWalls(
  px: number, py: number,
  walls: WallSegment[],
): boolean {
  let inside = false
  for (const wall of walls) {
    const { x1, y1, x2, y2 } = wall
    if (((y1 > py) !== (y2 > py)) && (px < (x2 - x1) * (py - y1) / (y2 - y1) + x1)) {
      inside = !inside
    }
  }
  return inside
}
