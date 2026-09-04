# Collision System

## 1. Overview

Collision detection answers one question: **"Can I occupy this position?"**

The system uses **configuration space** — obstacles are inflated by the agent radius so the agent becomes a point. Testing becomes point-vs-inflated-segment, which is simpler and faster than testing the full circle geometry.

Collision is separate from Navigation. Navigation answers "how do I get there?" using pathfinding. Collision answers "can I actually be at this position?" and is checked continuously during movement.

Core requirements:
- Point-vs-segment collision with penetration depth
- Swept collision to prevent tunneling at high speeds
- Wall sliding for smooth movement along surfaces
- Corner resolution to prevent trapping

## 2. Agent Configuration

Every movable entity has a collision profile that defines its physical presence in the world.

```typescript
interface AgentConfig {
  radius: number;           // collision radius in world units
  footprint: Footprint;     // shape used for collision (circle, capsule, etc.)
  maxSpeed: number;         // maximum movement speed in units per second
  slideFactor: number;      // 0-1, how much to slide on collision (0=stop, 1=full slide)
}
```

The `radius` determines how much obstacles are inflated in configuration space. A character with radius 0.3 means all walls are pushed outward by 0.3 units, and the character is tested as a point.

The `slideFactor` controls wall-sliding behavior. At 0, hitting a wall stops all movement. At 1, the character slides fully along the wall surface. Typical value: 0.8.

## 3. Point-vs-Segment Collision

The core primitive of the collision system. Tests whether a point (representing the agent center) is within the collision radius of a wall segment.

A wall segment is defined by two endpoints. The collision test finds the closest point on the segment to the agent center, then checks if the distance is less than the agent radius.

```typescript
function pointVsSegment(
  point: Point,
  segment: Segment,
  radius: number
): CollisionResult {
  // 1. Compute segment vector
  const dx = segment.end.x - segment.start.x;
  const dy = segment.end.y - segment.start.y;
  const lenSq = dx * dx + dy * dy;

  // 2. Project point onto segment (clamped to [0, 1])
  const t = clamp(
    ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) / lenSq,
    0,
    1
  );

  // 3. Closest point on segment
  const closest = {
    x: segment.start.x + t * dx,
    y: segment.start.y + t * dy,
  };

  // 4. Distance from point to closest
  const distX = point.x - closest.x;
  const distY = point.y - closest.y;
  const distance = Math.sqrt(distX * distX + distY * distY);

  // 5. Collision check
  if (distance >= radius) {
    return { hit: false, depth: 0, normal: { x: 0, y: 0 }, correction: { x: 0, y: 0 }, closestPoint: closest };
  }

  // 6. Penetration depth and normal
  const depth = radius - distance;
  const normal = distance > 0
    ? { x: distX / distance, y: distY / distance }
    : { x: 0, y: 1 }; // fallback: push up

  return {
    hit: true,
    depth,
    normal,
    correction: { x: normal.x * depth, y: normal.y * depth },
    closestPoint: closest,
  };
}
```

The function handles three edge cases:
- Point is before the start of the segment (t clamped to 0)
- Point is beyond the end of the segment (t clamped to 1)
- Point is directly on the segment (distance is 0, normal defaults to up)

## 4. Collision Result

Every collision test returns a structured result with all information needed for resolution.

```typescript
interface CollisionResult {
  hit: boolean;        // whether collision occurred
  depth: number;       // penetration depth (how far inside the wall)
  normal: Point;       // collision normal pointing outward from wall
  correction: Point;   // vector to push agent out of wall (normal * depth)
  closestPoint: Point; // closest point on wall surface
}
```

The `correction` vector is the key output. Adding it to the agent position resolves the collision by pushing the agent out of the wall along the shortest path.

The `normal` is used for wall sliding. It defines which direction is "into the wall" so velocity components can be removed.

## 5. Multiple Wall Collision

A character may collide with multiple walls at the same time — tight corridors, corners, or clusters of obstacles. Each collision must be resolved independently.

Resolution strategy:
1. Test agent position against all wall segments
2. Collect all active collisions
3. Sort by depth (deepest first)
4. Apply correction for each collision
5. Re-test after each correction (position changed)
6. Repeat until no collisions remain or max iterations reached

```typescript
function resolveMultipleCollisions(
  position: Point,
  walls: Segment[],
  radius: number,
  maxIterations: number = 3
): Point {
  let resolved = { ...position };

  for (let iter = 0; iter < maxIterations; iter++) {
    const collisions: CollisionResult[] = [];

    for (const wall of walls) {
      const result = pointVsSegment(resolved, wall, radius);
      if (result.hit) {
        collisions.push(result);
      }
    }

    if (collisions.length === 0) break;

    collisions.sort((a, b) => b.depth - a.depth);

    for (const col of collisions) {
      resolved.x += col.correction.x;
      resolved.y += col.correction.y;
    }
  }

  return resolved;
}
```

The iteration limit prevents infinite loops in degenerate cases (e.g., agent wedged between three converging walls). After 3 iterations, the agent is as close to valid as possible.

## 6. Wall Sliding

When a character moves into a wall, it should not stop dead. Instead, it slides along the wall surface, maintaining momentum in the tangential direction.

Wall sliding decomposes velocity into two components relative to the collision normal:
- **Normal component**: velocity entering the wall (removed)
- **Tangential component**: velocity along the wall surface (kept)

```
v_normal = dot(velocity, normal) * normal
v_slide = velocity - v_normal
```

The `slideFactor` controls how much of the normal component is removed:
- `slideFactor = 1`: full slide, all normal velocity removed
- `slideFactor = 0`: no slide, all velocity removed (dead stop)
- `slideFactor = 0.8`: typical, slight resistance

```typescript
function applyWallSlide(
  velocity: Point,
  normal: Point,
  slideFactor: number
): Point {
  const dotProduct = velocity.x * normal.x + velocity.y * normal.y;

  // Only slide if entering the wall (dot product negative)
  if (dotProduct >= 0) {
    return velocity; // moving away or parallel, no slide needed
  }

  // Remove normal component scaled by slideFactor
  return {
    x: velocity.x - normal.x * dotProduct * slideFactor,
    y: velocity.y - normal.y * dotProduct * slideFactor,
  };
}
```

Edge cases:
- Moving directly into a wall: full normal removal, zero tangential velocity
- Moving parallel to a wall: dot product is zero, no change
- Moving away from a wall: dot product positive, no collision

## 7. Swept Collision

At high speeds, an agent can teleport through thin walls between frames (tunneling). Swept collision prevents this by testing the entire path from start to desired position.

A swept circle-vs-segment test computes the **Time of Impact (TOI)** — the fraction of movement at which the circle first touches the segment.

```typescript
interface SweptResult {
  hit: boolean;
  time: number;        // TOI in [0, 1], 1 = no collision
  position: Point;     // position at time of impact
  normal: Point;       // collision normal at impact
  segment: Segment;    // which wall was hit
}

function sweptCircleVsSegment(
  start: Point,
  velocity: Point,
  segment: Segment,
  radius: number
): SweptResult {
  // 1. Expand segment by radius (Minkowski sum with circle)
  const expanded = expandSegment(segment, radius);

  // 2. Ray vs expanded segment (point vs expanded wall)
  const ray = { origin: start, direction: velocity };
  const intersection = rayVsSegment(ray, expanded);

  if (!intersection.hit || intersection.t > 1) {
    return { hit: false, time: 1, position: add(start, velocity), normal: { x: 0, y: 0 }, segment };
  }

  // 3. Compute impact position and normal
  const impactPos = {
    x: start.x + velocity.x * intersection.t,
    y: start.y + velocity.y * intersection.t,
  };

  const wallCenter = midpoint(segment);
  const toAgent = normalize(subtract(impactPos, wallCenter));

  return {
    hit: true,
    time: intersection.t,
    position: impactPos,
    normal: toAgent,
    segment,
  };
}
```

The TOI value is critical:
- `TOI = 0`: agent is already inside the wall (resolved by correction)
- `0 < TOI < 1`: collision occurs during this frame's movement
- `TOI >= 1`: no collision along the path

When a swept collision is detected, the agent stops at `impactPos`, applies wall sliding with the collision normal, and continues with the remaining velocity fraction.

## 8. Corner Resolution

Corners where two wall segments meet create traps. When an agent slides along one wall and hits the corner point of another wall, the two wall normals conflict and the agent gets stuck.

The solution: treat corner points as zero-radius obstacles.

```typescript
function resolveCornerCollisions(
  position: Point,
  velocity: Point,
  corners: Point[],
  radius: number
): { position: Point; velocity: Point } {
  let resolved = { ...position };
  let slideVelocity = { ...velocity };

  for (const corner of corners) {
    const dx = resolved.x - corner.x;
    const dy = resolved.y - corner.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < radius && dist > 0) {
      // Push away from corner
      const normal = { x: dx / dist, y: dy / dist };
      const depth = radius - dist;

      resolved.x += normal.x * depth;
      resolved.y += normal.y * depth;

      // Slide along corner normal
      slideVelocity = applyWallSlide(slideVelocity, normal, 1.0);
    }
  }

  return { position: resolved, velocity: slideVelocity };
}
```

Corner detection works by identifying wall endpoints that are within a threshold distance of each other. During collision resolution, after standard wall collisions are resolved, corners are tested separately.

The corner push direction is the vector from corner to agent center. This prevents the "stuck between two walls" problem where alternating wall-slide corrections cancel each other out.

## 9. Movement Pipeline

The full movement pipeline processes one frame of agent movement through all collision stages.

```
Input:
  current position
  desired velocity (from input or AI)
  delta time
  wall geometry

Pipeline:
  1. desiredPosition = current + velocity * dt
  2. sweptCollision(current, velocity, walls)
     → if hit: stop at impactPoint, compute remaining velocity
  3. wallSlide(remainingVelocity, collisionNormal)
     → adjusted velocity along wall surface
  4. pointVsSegment(desiredPosition, walls)
     → resolve any remaining overlaps
  5. cornerResolution(position, corners)
     → resolve corner traps
  6. finalPosition = validated position
```

```typescript
function processMovement(
  current: Point,
  velocity: Point,
  dt: number,
  walls: Segment[],
  corners: Point[],
  config: AgentConfig
): Point {
  const desiredVelocity = clampSpeed(velocity, config.maxSpeed);
  const displacement = { x: desiredVelocity.x * dt, y: desiredVelocity.y * dt };

  // Step 1: Swept collision along path
  const swept = findEarliestCollision(current, displacement, walls, config.radius);

  let position: Point;
  let remaining: Point;

  if (swept.hit) {
    position = swept.position;
    const timeRemaining = 1 - swept.time;
    remaining = {
      x: desiredVelocity.x * dt * timeRemaining,
      y: desiredVelocity.y * dt * timeRemaining,
    };

    // Step 2: Wall slide
    remaining = applyWallSlide(remaining, swept.normal, config.slideFactor);
  } else {
    position = add(current, displacement);
    remaining = { x: 0, y: 0 };
  }

  // Step 3: Resolve overlap collisions
  position = resolveMultipleCollisions(position, walls, config.radius);

  // Step 4: Corner resolution
  const cornerResult = resolveCornerCollisions(position, remaining, corners, config.radius);
  position = cornerResult.position;

  return position;
}
```

The pipeline is designed for one frame. It runs every frame at 60fps for smooth movement. The swept collision handles fast movement, the overlap resolution handles small penetrations, and corner resolution handles geometric traps.

## 10. Collision vs NavMesh

| Feature | Collision | NavMesh |
|---------|-----------|---------|
| Question | "Can I be here?" | "How do I get there?" |
| Used by | Player WASD, drag, physics | AI pathfinding, click-move |
| Input | Current position + desired position | Start position + end position |
| Output | Valid position (possibly adjusted) | Waypoint sequence |
| Speed | Very fast (per-frame, O(walls)) | Slower (per-query, graph search) |
| Geometry | Wall segments (explicit) | Walkable polygon mesh |
| Agent size | Radius inflation | baked into navmesh |
| Tunneling prevention | Swept collision | N/A (follows edges) |
| Wall sliding | Yes | No (path avoids walls) |

Collision and NavMesh are complementary. NavMesh provides the high-level route. Collision provides continuous per-frame validation. An AI agent follows waypoints from NavMesh, but collision ensures it never phases through walls between waypoints.

## 11. Integration Points

### Walkable Space
Provides inflated geometry for collision tests. Walkable Space computes walkable regions by inflating obstacles by the agent radius. The collision system uses these inflated boundaries for point-vs-segment tests.

### Movement Agent
The Movement Agent module uses collision for position validation. Every frame, Movement Agent computes desired position and passes it through the collision pipeline. The result is the valid position the agent actually occupies.

### Scene Graph
Wall and door items from the Scene Graph provide collision geometry. Each wall item exposes one or more segments. Door items expose segments that toggle between blocking and non-blocking states. The collision system queries Scene Graph for relevant segments near the agent.

### 2D→3D Coordinate System
All collision math operates in 2D world coordinates. The 2D→3D module converts between screen space (where player input happens) and world space (where collision math happens). The collision system never deals with pixel coordinates.

### Event System
Collision events feed into the Event System:
- `COLLISION_DETECTED`: agent hit a wall (for sound effects, feedback)
- `COLLISION_RESOLVED`: agent position corrected (for animation blending)
- `MOVEMENT_BLOCKED`: agent cannot reach desired position (for UI feedback)

These events are consumed by audio, animation, and UI systems without affecting world state.

## 12. Performance Considerations

The collision system runs every frame for every moving agent. Performance is critical.

**Spatial partitioning**: Divide the world into a grid. Each agent only tests walls in its current cell and adjacent cells. This reduces wall checks from O(totalWalls) to O(nearbyWalls).

**Early rejection**: Before the full segment test, check bounding box. If the agent bounding box does not overlap the wall bounding box, skip the detailed test.

**Swept collision optimization**: Only run swept collision when agent speed exceeds a threshold. Below the threshold, point-vs-segment is sufficient and faster.

**Maximum iteration cap**: The multiple-collision resolution loop is capped at 3 iterations. This prevents degenerate cases from consuming unlimited time while handling 99% of real-world scenarios.

**Walls cache**: Segment geometry changes infrequently. Cache expanded segments (inflated by radius) and only recompute when walls change (door open/close, wall placed/removed).
