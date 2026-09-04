# Dynamic Obstacles

## 1. Overview

Dynamic obstacles change state during gameplay. Doors open and close, stairs connect floors, traps activate and deactivate. When an obstacle state changes, walkable space and the NavMesh must update to reflect the new movement possibilities.

Incremental updates are preferred over full rebuilds. A door opening should not require recomputing the entire floor's navigation data.

---

## 2. Door States

Doors are the most common dynamic obstacle. Each door has a position, dimensions, and a state that determines whether it blocks movement.

```typescript
interface DoorState {
  id: string;
  position: Point;
  width: number;
  rotation: number;
  state: 'open' | 'closed' | 'locked' | 'destroyed';

  // Collision geometry when closed
  closedGeometry: Polygon;

  // Walkable geometry when open (usually empty, fully walkable)
  openGeometry: Polygon;
}
```

### State Descriptions

| State | Movement | Interaction | Rendering |
|-------|----------|-------------|-----------|
| `open` | Passable | Can close | Door model in open position |
| `closed` | Blocked | Can open | Door model in closed position |
| `locked` | Blocked | Cannot open (requires key/event) | Door model in closed position, lock visible |
| `destroyed` | Passable | None | Door model replaced with debris or removed |

---

## 3. Door State Transitions

Transitions define what happens when a door changes state. Each transition has a movement effect and an interaction effect.

| From | To | Movement Effect | Interaction Effect |
|------|-----|-----------------|---------------------|
| `CLOSED` | `OPEN` | Remove obstacle polygon from NavMesh | Door becomes passable |
| `OPEN` | `CLOSED` | Add obstacle polygon to NavMesh | Door blocks movement |
| `CLOSED` | `LOCKED` | No movement change | Interaction blocked until unlocked |
| `LOCKED` | `CLOSED` | No movement change | Interaction allowed again |
| `OPEN` | `DESTROYED` | No movement change (already passable) | Door removed permanently |
| `CLOSED` | `DESTROYED` | Remove obstacle polygon permanently | Door removed permanently |
| `LOCKED` | `DESTROYED` | Remove obstacle polygon permanently | Door removed permanently |

### Transition Implementation

```typescript
interface DoorTransition {
  from: DoorState['state'];
  to: DoorState['state'];
  requiresKey?: string;
  requiresEvent?: string;
  animationDuration: number; // ms
}

const DOOR_TRANSITIONS: DoorTransition[] = [
  { from: 'closed', to: 'open', animationDuration: 800 },
  { from: 'open', to: 'closed', animationDuration: 800 },
  { from: 'closed', to: 'locked', animationDuration: 0 },
  { from: 'locked', to: 'closed', animationDuration: 0 },
  { from: 'open', to: 'destroyed', animationDuration: 500 },
  { from: 'closed', to: 'destroyed', animationDuration: 500 },
  { from: 'locked', to: 'destroyed', animationDuration: 500 },
];
```

---

## 4. Door Impact on Walkable Space

A closed door occupies space in the walkable area. An open door does not. The door's width determines how much walkable space changes on transition.

### Width Categories

| Width | Cells Affected | NavMesh Impact | Example |
|-------|----------------|----------------|---------|
| 1 cell | 1 polygon | Minimal | Single door in a wall |
| 2 cells | 2 polygons | Moderate | Double doors |
| 3+ cells | 3+ polygons | Significant | Portcullis, large gate |

### Walkable Space Update Rules

1. When a door closes, its `closedGeometry` is added as an obstacle polygon
2. When a door opens, its obstacle polygon is removed
3. Neighboring polygons must be reconnected after the change
4. Polygons fully inside the door area are split or merged as needed

```typescript
function computeDoorObstacle(door: DoorState): Polygon | null {
  if (door.state === 'open' || door.state === 'destroyed') {
    return null; // No obstacle
  }

  // Closed or locked: door blocks movement
  return door.closedGeometry;
}
```

---

## 5. Incremental NavMesh Update

Full NavMesh rebuilds are expensive. Door state changes should trigger incremental updates that only modify the affected region.

### Update Algorithm

```typescript
function updateNavMeshForDoor(
  navmesh: NavMesh,
  door: DoorState
): NavMesh {
  // 1. Find polygons that intersect with the door's closed geometry
  const affected = navmesh.polygons.filter(p =>
    polygonIntersects(p, door.closedGeometry)
  );

  // 2. Recompute those polygons based on new door state
  const updated = recomputePolygons(affected, door.state);

  // 3. Update neighbor connections for affected polygons
  updateConnections(navmesh, updated);

  // 4. Recalculate cost for paths through the door
  updatePathCosts(navmesh, door);

  return navmesh;
}
```

### Polygon Recomputation

When a door opens, obstacle polygons in the door area are removed and neighboring polygons expand to fill the gap. When a door closes, a new obstacle polygon is inserted and neighboring polygons are clipped.

```typescript
function recomputePolygons(
  affected: Polygon[],
  doorState: DoorState['state']
): Polygon[] {
  if (doorState === 'open' || doorState === 'destroyed') {
    // Remove obstacle: merge affected polygons into neighbors
    return mergePolygons(affected);
  } else {
    // Add obstacle: clip polygons around door geometry
    return clipPolygons(affected, computeDoorObstacle(door));
  }
}
```

### Connection Updates

After polygon recomputation, neighbor connections must be updated. Polygons that were previously connected through the door area may no longer be adjacent, and new connections may form.

```typescript
function updateConnections(
  navmesh: NavMesh,
  updatedPolygons: Polygon[]
): void {
  for (const poly of updatedPolygons) {
    // Remove old connections
    poly.neighbors = poly.neighbors.filter(n =>
      updatedPolygons.includes(n) || polygonsIntersect(poly, n)
    );

    // Add new connections
    for (const candidate of navmesh.polygons) {
      if (candidate === poly) continue;
      if (polygonsAdjacent(poly, candidate)) {
        if (!poly.neighbors.includes(candidate)) {
          poly.neighbors.push(candidate);
        }
      }
    }
  }
}
```

---

## 6. Multi-Floor Navigation

Each floor has its own walkable space and NavMesh. Stairs, elevators, ramps, and holes connect floors. These connectors are called floor portals.

### Floor Portal Interface

```typescript
interface FloorPortal {
  id: string;
  type: 'stairs' | 'elevator' | 'ramp' | 'hole';
  position: Point;
  width: number;
  floorA: string;  // floor ID
  floorB: string;  // floor ID
  state: 'active' | 'blocked';
  elevation: number; // height difference in units
}
```

### Portal Types

| Type | Movement | Cost | State Changes |
|------|----------|------|---------------|
| `stairs` | Walk up/down | Distance × 2 | Can be blocked by debris, lock |
| `elevator` | Instant teleport | Distance = 0 | Can be powered off, jammed |
| `ramp` | Walk up/down | Distance × 1.5 | Can be collapsed, blocked |
| `hole` | Fall down (one-way) | Distance = 0, damage | Can be covered, filled |

---

## 7. Floor Navigation Graph

Floors and portals form a graph. Pathfinding traverses this graph to find routes across floors.

```
Floor 0 NavMesh ←→ Floor 1 NavMesh
       ↑                   ↑
    Portal              Portal
    (stairs)          (elevator)
```

### Cross-Floor Pathfinding

A* searches across floors via portals. The algorithm treats each floor's NavMesh as a subgraph and portals as edges between subgraphs.

```typescript
interface FloorGraph {
  floors: Map<string, NavMesh>;
  portals: FloorPortal[];
}

function findPathCrossFloor(
  graph: FloorGraph,
  start: { floor: string; position: Point },
  end: { floor: string; position: Point }
): Path | null {
  // 1. If same floor, use standard A* on that floor's NavMesh
  if (start.floor === end.floor) {
    return findPath(graph.floors.get(start.floor)!, start.position, end.position);
  }

  // 2. Find portals connecting start floor to end floor
  const reachablePortals = findReachablePortals(graph, start.floor, end.floor);

  // 3. For each portal, compute cost: distance + elevation penalty
  const bestPortal = selectBestPortal(reachablePortals, start, end);

  // 4. Path: start → portal on floorA → portal on floorB → end
  return computeMultiFloorPath(graph, start, end, bestPortal);
}
```

### Portal Crossing Cost

Different portal types have different movement costs:

```typescript
function portalCost(portal: FloorPortal): number {
  switch (portal.type) {
    case 'stairs':
      return Math.abs(portal.elevation) * 2; // Slow, tiring
    case 'ramp':
      return Math.abs(portal.elevation) * 1.5; // Moderate
    case 'elevator':
      return 0; // Instant
    case 'hole':
      return 0; // Instant (fall), but may cause damage
    default:
      return Math.abs(portal.elevation);
  }
}
```

### Portal State Effects

| Portal State | Effect |
|--------------|--------|
| `active` | Portal is usable, normal cost applied |
| `blocked` | Portal is impassable, removed from navigation graph |

---

## 8. Trap and Obstacle Activation

Traps are dynamic obstacles that activate based on triggers. They block movement when active and are passable when inactive.

### Trap Types

| Trap | Blocks Movement | Trigger | Deactivation |
|------|-----------------|---------|--------------|
| Pit trap | Yes (gap in floor) | Proximity, pressure plate | Rope, bridge |
| Fallen pillar | Yes (debris) | Time, interaction | Clear debris |
| Magical barrier | Yes (wall of force) | Event, spell | Dispel magic |
| Spiked door | Yes (when closed) | Interaction | Unlock, break |

### Trap Interface

```typescript
interface TrapState {
  id: string;
  type: 'pit' | 'debris' | 'barrier' | 'door';
  position: Point;
  geometry: Polygon;
  state: 'inactive' | 'active' | 'disabled';
  trigger: TrapTrigger;
  deactivationRequirement?: string; // event or item needed
}

interface TrapTrigger {
  type: 'proximity' | 'interaction' | 'time' | 'event';
  radius?: number;
  eventId?: string;
  delay?: number; // ms for time-based triggers
}
```

### Trap Activation Rules

1. When a trap activates, its geometry becomes an obstacle polygon
2. When a trap deactivates or is disabled, its obstacle polygon is removed
3. Trap activation uses the same incremental NavMesh update as doors
4. Traps in the `disabled` state cannot re-activate

---

## 9. Performance

Dynamic obstacles must update quickly to maintain smooth gameplay.

### Update Timings

| Operation | Target Time | Method |
|-----------|-------------|--------|
| Door state change → NavMesh update | < 5 ms | Incremental polygon update |
| Floor portal activation | < 1 ms | Graph edge toggle |
| Trap activation | < 5 ms | Same as door update |
| Full NavMesh rebuild | < 50 ms | Only on scene load |

### Optimization Strategies

- Cache walkable polygons per floor
- Pre-compute door influence regions (which polygons each door affects)
- Batch multiple door changes in the same frame
- Use spatial indexing for polygon lookups
- Lazy recomputation: only update when pathfinding queries the affected area

```typescript
interface NavMeshCache {
  floors: Map<string, {
    polygons: Polygon[];
    doorRegions: Map<string, Polygon[]>; // door ID → affected polygons
    lastUpdate: number;
  }>;
}
```

### Cache Invalidation

- Door state change: invalidate only the door's cached region
- Portal state change: invalidate the portal's graph edges
- Scene load: full rebuild and cache population
- Scene edit: rebuild affected floor's cache

---

## 10. Integration Points

Dynamic obstacles connect to multiple systems in the engine.

### System Connections

| System | Integration | Direction |
|--------|-------------|-----------|
| Scene Graph | Door/trap items with state | Scene → Obstacles |
| Walkable Space | Obstacle polygons | Obstacles → Walkable Space |
| NavMesh & Pathfinding | Incremental updates | Obstacles → NavMesh |
| Collision System | Real-time obstacle checks | Obstacles ↔ Collision |
| Map Analysis | Initial door/trap placement | Analysis → Obstacles |
| Event System | State change events | Events → Obstacles |
| Renderer | Door/trap visual state | Obstacles → Renderer |

### Event Flow

```
User Interaction / AI Action
    ↓
Event System (DOOR_OPEN, TRAP_ACTIVATE)
    ↓
Obstacle State Update
    ↓
Walkable Space Recalculation
    ↓
NavMesh Incremental Update
    ↓
Pathfinding Cache Invalidation
    ↓
Renderer Update (door model, trap visual)
```

### Data Flow

1. **Scene Graph** stores door/trap definitions and current state
2. **Obstacle System** reads state and computes obstacle polygons
3. **Walkable Space** merges obstacle polygons with static walkable area
4. **NavMesh** receives incremental update for affected polygons
5. **Pathfinding** uses updated NavMesh for route calculation
6. **Collision System** checks against current obstacle polygons in real-time
7. **Renderer** updates visual representation of door/trap state

### API Surface

```typescript
// Door operations
openDoor(doorId: string): void;
closeDoor(doorId: string): void;
lockDoor(doorId: string, keyId: string): boolean;
unlockDoor(doorId: string, keyId: string): boolean;
destroyDoor(doorId: string): void;

// Portal operations
activatePortal(portalId: string): void;
blockPortal(portalId: string): void;

// Trap operations
activateTrap(trapId: string): void;
disableTrap(trapId: string): boolean;

// NavMesh queries
getNavMeshForFloor(floorId: string): NavMesh;
findPath(start: Point, end: Point, floorId: string): Path | null;
findPathCrossFloor(start: FloorPosition, end: FloorPosition): Path | null;
```

---

## 11. Implementation Checklist

- [ ] DoorState interface and transitions
- [ ] Door obstacle polygon computation
- [ ] Incremental NavMesh update for doors
- [ ] FloorPortal interface
- [ ] Floor navigation graph
- [ ] Cross-floor pathfinding with A*
- [ ] Portal cost calculation by type
- [ ] TrapState interface and triggers
- [ ] Trap activation/deactivation
- [ ] NavMesh cache per floor
- [ ] Cache invalidation on state change
- [ ] Event System integration
- [ ] Renderer state sync
- [ ] Performance benchmarks (< 5ms updates)
