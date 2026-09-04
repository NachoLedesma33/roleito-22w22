# Movement Agent System

## 1. Overview

The Movement Agent is the system responsible for physically moving characters within the world. It bridges the gap between intent (player input, AI decisions) and actual position updates. Every character — player-controlled or AI — uses the same Movement Controller to handle movement.

The Movement Agent:
- Receives desired velocity or destination from an input source
- Validates movement against the Collision System
- Updates the character's position in the world state
- Propagates position changes to both 2D and 3D representations

It does not make decisions about where to go — that is the responsibility of the input source (player, AI, or DM). The Movement Agent only handles the mechanics of getting there.

---

## 2. Architecture

```
Input Source (WASD / Click / AI)
       │
       ▼
Movement Controller
       │
       ├── desired velocity
       │
       ▼
Collision System
       │
       ├── valid position
       │
       ▼
Position Update
       │
       ├── 2D: update SceneCharacter x,z
       └── 3D: update Three.js model position
```

Data flow:
1. An input source produces a desired velocity or target position
2. The Movement Controller normalizes this into a velocity vector
3. The Collision System checks if the resulting position is valid
4. If valid, the position is updated in both 2D world state and 3D scene
5. If invalid, the controller slides along the collision surface

---

## 3. Movement Controller

The Movement Controller is the core component. Each agent (player or NPC) has one. It manages position, velocity, path following, and collision response.

```typescript
interface MovementController {
  agent: AgentConfig;
  position: Point;
  velocity: Point;
  path: Point[];        // waypoints for path following
  pathIndex: number;    // current waypoint index
  speed: number;        // current movement speed

  setDesiredVelocity(vel: Point): void;
  followPath(path: Point[]): void;
  update(dt: number): void;
  getPosition(): Point;
  stop(): void;
  isMoving(): boolean;
}
```

The controller does not run pathfinding itself. It receives a pre-computed path from the NavMesh system and follows it. Separation of concerns: pathfinding is expensive, movement is cheap.

Agent configuration determines movement parameters:

```typescript
interface AgentConfig {
  maxSpeed: number;        // units per second
  acceleration: number;    // how quickly max speed is reached
  turnSpeed: number;       // radians per second for rotation
  collisionRadius: number; // size of collision hitbox
  groundOffset: number;    // Y offset above ground plane
}
```

---

## 4. Input Methods

| Method | Source | Use Case | Pathfinding? |
|--------|--------|----------|--------------|
| WASD/QE | Keyboard | Real-time player movement | No |
| Click-move | Mouse | Point-and-click movement | Yes |
| Drag | Mouse | DM token placement | No |
| AI Path | AI Agent | NPC/creature movement | Yes |
| Teleport | System | DM override / spawn | No |

Each method feeds into the same Movement Controller. The controller does not care where the velocity came from — it only validates and applies.

---

## 5. WASD Movement

WASD movement provides real-time, continuous velocity from keyboard state. Direction is relative to the current camera angle so that "forward" always means "toward where the camera is looking."

Speed is `agent.maxSpeed * dt`. Velocity is accumulated from key states, then rotated by the camera's yaw angle before being passed to the Movement Controller.

```typescript
function handleWASDInput(
  keys: KeyState,
  cameraAngle: number,
  agent: AgentConfig,
  dt: number
): Point {
  const speed = agent.maxSpeed * dt;
  const velocity = { x: 0, z: 0 };

  if (keys.w || keys.arrowUp)    velocity.z -= speed;
  if (keys.s || keys.arrowDown)  velocity.z += speed;
  if (keys.a || keys.arrowLeft)  velocity.x -= speed;
  if (keys.d || keys.arrowRight) velocity.x += speed;

  // Diagonal normalization — prevent faster diagonal movement
  const len = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);
  if (len > speed) {
    velocity.x = (velocity.x / len) * speed;
    velocity.z = (velocity.z / len) * speed;
  }

  // Rotate by camera angle so forward matches camera view
  return rotateVector(velocity, cameraAngle);
}
```

QE rotation (optional): Q and E rotate the character in place without changing position. Useful for grid-based or tank-control schemes.

Collision is checked every frame. If the desired position is blocked, the controller slides along the blocking surface rather than stopping entirely.

---

## 6. Click-Move

Click-move is the standard point-and-click movement method. The player clicks a target position on the ground, and the character walks there along a computed path.

Flow:
1. Player clicks a point on the ground plane
2. The click position is raycast from the mouse cursor to the ground
3. The NavMesh system computes a path from current position to target
4. The path is passed to the Movement Controller via `followPath()`
5. The controller follows the path waypoint by waypoint
6. Movement stops when the path is exhausted or the player issues a new command

```typescript
function handleClickMove(
  clickWorldPos: Point,
  currentPos: Point,
  navMesh: NavMesh,
  controller: MovementController
): void {
  const path = navMesh.findPath(currentPos, clickWorldPos);
  if (path && path.length > 0) {
    controller.followPath(path);
  }
}
```

If the player clicks a new target while already moving, the current path is replaced. No need to stop first — just overwrite.

Visual feedback: a movement indicator (e.g., a ring or trail) shows the path while the character is walking.

---

## 7. Drag Movement (DM)

The DM can drag character tokens directly to a target position. This is a direct position set with no pathfinding — the token moves in a straight line from A to B.

Drag movement does not bypass collision. The DM cannot drag a token into a wall or through a closed door. If the target position is invalid, the token snaps to the nearest valid position along the drag vector.

```typescript
function handleDragMove(
  token: SceneCharacter,
  targetPos: Point,
  collisionSystem: CollisionSystem,
  gridSnap: boolean
): void {
  let finalPos = targetPos;

  // Collision response — find nearest valid position
  if (!collisionSystem.isValid(token.agentId, finalPos)) {
    finalPos = collisionSystem.findNearestValid(token.position, finalPos, token.agent);
  }

  // Grid snap if enabled
  if (gridSnap) {
    finalPos = snapToGrid(finalPos, GRID_SIZE);
  }

  token.position = finalPos;
  updatePosition(token);
}
```

Grid snap: when grid mode is active, the dragged position snaps to the nearest grid cell center. This ensures tokens always align to the grid.

---

## 8. Path Following

The Movement Controller follows a sequence of waypoints. It moves toward the current waypoint, and when close enough, advances to the next one.

Termination conditions:
- All waypoints visited: stop
- Player issues new command: replace path
- Collision blocks further movement: stop or recalculate

```typescript
function followPath(controller: MovementController, dt: number): void {
  if (controller.pathIndex >= controller.path.length) {
    controller.stop();
    return;
  }

  const target = controller.path[controller.pathIndex];
  const dir = subtract(target, controller.position);
  const dist = length(dir);

  // Waypoint reached — advance
  if (dist < WAYPOINT_THRESHOLD) {
    controller.pathIndex++;
    if (controller.pathIndex >= controller.path.length) {
      controller.stop();
    }
    return;
  }

  // Move toward waypoint
  const vel = multiply(normalize(dir), controller.agent.maxSpeed);
  controller.setDesiredVelocity(vel);
}
```

Waypoint threshold: a small distance (e.g., 0.1 units) below which the controller considers a waypoint "reached." Prevents oscillation around the target point.

When following a path, the controller does not recompute pathfinding. It trusts the pre-computed path. If something blocks the path at runtime (e.g., a door closes), the path is invalidated and the character stops.

---

## 9. 2D vs 3D Position

Characters exist in a 3D world but are often represented in 2D on a top-down map. The Movement Agent must keep both representations synchronized.

**2D position**: `(x, z)` on the ground plane. Used for the top-down map, token placement, and collision detection on the NavMesh.

**3D position**: `(x, y, z)` with height. Used for the Three.js renderer. The `y` component represents ground height and may be elevated for stairs, ramps, or platforms.

For navigation purposes, `y` is always ground level. The 3D renderer computes visual height separately based on the scene geometry.

```typescript
// 2D token position for the map
const pos2D: Point2D = { x: worldX, z: worldZ };

// 3D model position for the renderer
const pos3D: Point3D = {
  x: worldX,
  y: groundHeightAt(worldX, worldZ),
  z: worldZ
};

// Sync both
function updatePosition(character: SceneCharacter): void {
  character.position = pos2D;
  character.model.position = pos3D;
}
```

Coordinate transform: the 2D map and 3D scene share the same `(x, z)` origin. No transform is needed between them — only the `y` component is added for 3D.

---

## 10. Network Sync

In multiplayer sessions, movement must be synchronized across clients. The system uses client-side prediction with server reconciliation.

**Player movement (local)**:
1. Player input is applied immediately (local prediction)
2. The predicted position is rendered without waiting for server confirmation
3. The position is sent to the server

**Server validation**:
1. Server receives the position update
2. Server validates against the Collision System and game rules
3. Server broadcasts the validated position to all other clients

**Other players (remote)**:
1. Client receives the remote player's validated position
2. Client interpolates the remote character toward the received position
3. Interpolation smooths out network jitter

**Conflict resolution**: the server always wins. If the server rejects a position, the client snaps back to the server-authoritative position.

```typescript
// Client-side prediction
function handleLocalMovement(input: MovementInput, dt: number): void {
  const newPos = movementController.update(input, dt);
  localPlayer.position = newPos;              // immediate render
  network.sendPositionUpdate(newPos);         // tell server
}

// Receiving remote position
function handleRemotePositionUpdate(data: PositionUpdate): void {
  const remote = players.get(data.playerId);
  if (remote) {
    remote.targetPosition = data.position;    // interpolation target
  }
}
```

Interpolation: remote characters are smoothly moved toward their target position over a fixed interval (e.g., 100ms). This prevents teleporting on every network packet.

---

## 11. Performance

Movement is a hot path — it runs every frame for every moving character. Performance targets:

| Operation | Target Time | Notes |
|-----------|-------------|-------|
| Movement Controller update | <1ms per agent | Velocity + position update |
| Collision check | <0.1ms per agent | Spatial partitioning (quadtree) |
| Pathfinding | <10ms per query | Cached; recomputed only on demand |
| Position interpolation | <0.1ms per remote | Linear interpolation |
| Max simultaneous agents | 50 | With 16ms frame budget |

Optimization strategies:
- **Spatial partitioning**: collision checks only test nearby entities
- **Path caching**: identical queries return cached results
- **Dirty flags**: position updates only propagate when position actually changes
- **LOD movement**: distant NPCs update at lower frequency (e.g., every 3rd frame)
- **Batch updates**: multiple position changes batched into a single state update

Frame budget: with a 60fps target (16.67ms per frame), movement + collision for 50 agents must complete within ~5ms to leave room for rendering and other systems.

---

## 12. Integration Points

The Movement Agent connects to several other systems:

| System | Direction | Purpose |
|--------|-----------|---------|
| Collision System | Out → In | Validates positions, provides slide vectors |
| NavMesh & Pathfinding | Out → In | Provides computed paths for path following |
| Scene Graph | Out → Writes | Stores character positions in world state |
| 2D→3D Transform | Out → Writes | Updates Three.js model positions |
| Network Sync | Out ↔ In | Sends/receives position updates |
| Input System | In → Feeds | Receives WASD, click, and drag inputs |
| AI Agent | In → Feeds | Receives movement commands from AI decisions |
| DM Panel | In → Feeds | Receives drag and teleport commands |
| Animation System | Out → Triggers | Starts/stops walk animations based on velocity |

Data dependencies:
- Movement Agent depends on Collision System (must be initialized first)
- Movement Agent depends on NavMesh (for path following)
- 2D and 3D position updates depend on Movement Agent output
- Network Sync depends on Movement Agent for position data

Initialization order: NavMesh → Collision System → Movement Agent → Network Sync.

---

## 13. Error Handling

| Error | Handling |
|-------|----------|
| Path blocked mid-route | Stop movement, notify AI/player |
| Invalid target position | Clamp to nearest valid position |
| Agent exceeds max speed | Cap velocity at maxSpeed |
| Network desync detected | Snap to server position |
| Collision system timeout | Allow movement, log warning |
| Pathfinding returns empty | Stop movement, no action |

Degraded mode: if the Collision System is unavailable, the Movement Agent operates in "noclip" mode — all positions are accepted. This is useful for debugging but should never run in production.

---

## 14. Configuration

Movement parameters are tunable per agent type:

```typescript
const AGENT_PRESETS: Record<string, AgentConfig> = {
  player: {
    maxSpeed: 6.0,
    acceleration: 20.0,
    turnSpeed: Math.PI * 4,
    collisionRadius: 0.3,
    groundOffset: 0.0
  },
  npc_slow: {
    maxSpeed: 2.0,
    acceleration: 8.0,
    turnSpeed: Math.PI * 2,
    collisionRadius: 0.3,
    groundOffset: 0.0
  },
  npc_fast: {
    maxSpeed: 8.0,
    acceleration: 16.0,
    turnSpeed: Math.PI * 3,
    collisionRadius: 0.4,
    groundOffset: 0.0
  },
  creature_large: {
    maxSpeed: 4.0,
    acceleration: 12.0,
    turnSpeed: Math.PI,
    collisionRadius: 0.8,
    groundOffset: 0.0
  }
};
```

Speed units: world units per second. 1 world unit ≈ 1 meter. A player at 6.0 moves at roughly 6 m/s (sprinting pace).

---

## 15. Testing

Unit tests should cover:
- Velocity calculation from WASD input
- Diagonal normalization
- Camera rotation of input vectors
- Path following advancement and termination
- Collision response (blocked, sliding)
- Grid snap behavior
- Position synchronization (2D ↔ 3D)
- Network prediction and reconciliation
- Edge cases: zero-length path, single waypoint, immediate stop

Integration tests should cover:
- Full click-move flow: click → pathfind → follow → arrive
- DM drag with collision: drag into wall → snap to valid
- Multiple agents moving simultaneously
- Network sync: two clients, position broadcast
- Path invalidation: obstacle appears mid-route

Performance benchmarks:
- 50 agents moving simultaneously at 60fps
- Pathfinding query under 10ms for a 50-waypoint path
- Collision check batch for 50 agents under 5ms total
