/**
 * Wall collision detection for token movement.
 * Checks if a point (token center) intersects any wall segment.
 * Uses point-segment distance with token radius.
 */

function pointSegmentDistance(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-10) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

export function checkWallCollision(
  x: number, z: number,
  walls: [number, number, number, number][],
  tokenRadius: number = 0.03,
): boolean {
  for (const [x1, z1, x2, z2] of walls) {
    const dist = pointSegmentDistance(x, z, x1, z1, x2, z2);
    if (dist < tokenRadius) {
      return true;
    }
  }
  return false;
}
