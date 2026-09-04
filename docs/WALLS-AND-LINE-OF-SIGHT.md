# Walls and Line of Sight

Technical specification for wall representation, LoS raycasting, and wall interactions with fog, lighting, and movement systems.

---

## 1. Overview

Walls define spatial boundaries within a scene. Three core systems consume wall data:

- **Line of Sight (LoS)** — determines which cells a character can see
- **Movement** — determines which cells a character can walk to
- **Lighting** — determines how light propagates and where shadows fall

All three share a single source of truth: wall entities stored as Items in the Scene Graph with `shape.type = 'line'`. Changes to a wall propagate to all dependent systems in the same frame.

---

## 2. Wall Entity Definition

Walls extend the base `Item` type. They are line segments anchored to the scene grid.

```typescript
interface WallItem extends Item {
  shape: {
    type: 'line';
    points: [Point, Point];  // start and end of wall segment
    stroke: string;
    strokeWidth: number;
  };
  metadata: {
    type: 'wall';
    wallType: 'solid' | 'door' | 'window';
    material: 'stone' | 'wood' | 'metal' | 'glass' | 'magic';
    height: number;         // feet, used for 3D rendering and vertical LoS
    thickness: number;      // pixels in 2D, affects occlusion area
    opacity: number;        // 0-1, for windows and transparent walls
    lineOfSight: boolean;   // whether this wall blocks line of sight
    movement: boolean;     // whether this wall blocks movement
    soundOcclusion: number; // 0-1, how much sound is blocked
  };
}
```

### Coordinate System

- `points[0]` = start of wall segment
- `points[1]` = end of wall segment
- Coordinates are in scene pixels (converted to grid cells at query time)
- Walls snap to grid edges during placement (vertex-aligned)
- Minimum wall length: 1 cell (prevents zero-length segments)

### Material Properties

| Material | Density | Light Absorption | Sound Occlusion | 3D Texture |
|----------|---------|------------------|-----------------|------------|
| Stone | High | 0.9 | 0.8 | masonry_a |
| Wood | Medium | 0.6 | 0.7 | wood_planks_a |
| Metal | High | 0.95 | 0.85 | iron_plate_a |
| Glass | Low | 0.1 | 0.2 | glass_clear_a |
| Magic | Variable | 0.3 | 0.5 | arcane_barrier_a |

---

## 3. Wall Properties by Type

### 3.1 Solid Walls

Standard walls. Block everything.

| Property | Value |
|----------|-------|
| Blocks LoS | Yes |
| Blocks Movement | Yes |
| Blocks Light | Yes |
| Sound Occlusion | 0.8 (stone), 0.7 (wood), 0.85 (metal) |
| Height | 8–12 ft |
| Opacity | 1.0 |
| Opacity (transparent stone) | 0.7 |

### 3.2 Doors

Walls with a togglable state. Most properties change based on open/closed status.

| Property | Closed | Open |
|----------|--------|------|
| Blocks LoS | Yes | No |
| Blocks Movement | Yes | No |
| Blocks Light | Yes | No |
| Sound Occlusion | 0.7 | 0.3 |
| Height | 7 ft | N/A (no obstruction) |

Doors can be locked, stuck, or set to auto-close.

### 3.3 Windows

Transparent walls. Partial blocking.

| Property | Value |
|----------|-------|
| Blocks LoS | No (glass), Partial (stained glass, opacity-dependent) |
| Blocks Movement | Yes |
| Blocks Light | No |
| Sound Occlusion | 0.5 |
| Height | 4 ft (can see over with elevation) |
| Opacity | 0.3–0.6 |

---

## 4. Door States

```typescript
interface DoorMetadata {
  type: 'door';
  state: 'open' | 'closed' | 'locked' | 'stuck';
  keyId?: string;           // ID of key Item that unlocks this door
  lockDC?: number;          // Dexterity check DC to pick the lock
  breakDC?: number;         // Strength check DC to break the door
  closeSound?: string;      // audio file path for closing sound
  openSound?: string;       // audio file path for opening sound
  autoClose?: boolean;      // door closes automatically after delay
  autoCloseRounds?: number; // rounds to wait before auto-close
}
```

### State Transitions

```
closed → open       (interact, no check)
closed → locked     (interact, key or lockpick required)
locked → open       (key match or lockpick DC check)
locked → stuck       (failed lockpick, optional)
stuck → open        (strength check or key)
open → closed       (interact, no check)
open → locked       (interact while open, then close)
```

### Auto-Close Behavior

When `autoClose` is true:
1. Door opens as normal
2. After `autoCloseRounds` rounds pass (tracked in initiative tracker)
3. Door closes automatically
4. Character in doorway gets pushed to nearest open cell
5. If no open cell available, door stays open

---

## 5. Window Properties

Windows are a specialized wall type with transparency.

### Light Behavior
- Light passes through at `1.0 - opacity` intensity
- A window with `opacity: 0.3` lets 70% of light through
- Light color is not tinted (unlike stained glass — see below)

### Stained Glass Variant
- Material: `glass`
- Opacity: 0.6
- Light passes through but tinted by window color
- Color stored in `shape.stroke` (hex color of the glass)
- Light propagation multiplies source color by window color

### Sound Behavior
- Sound passes through at 50% strength
- Partial muffling creates ambient acoustic variation
- Useful for eavesdropping mechanics

### Movement
- Windows always block movement
- Can be vaulted over if height ≤ 3 ft and character has sufficient movement
- Vaulting costs 2× movement for the cell

### LoS
- Transparent windows: full LoS, cells beyond are visible
- Obscured windows (opacity ≥ 0.5): cells beyond are visible but dimmed
- Characters on opposite sides can see each other
- Targeting through windows: allowed, but imposes disadvantage (optional rule)

---

## 6. Line of Sight Raycasting

### 6.1 Algorithm Overview

For each character that requires LoS:

1. **Origin**: Character's cell center position
2. **Target grid**: All cells within vision range (circle radius)
3. **Ray casting**: Cast one ray per target cell
4. **Intersection test**: For each ray, check against all wall segments
5. **Visibility determination**: Cell is visible if no wall blocks the ray
6. **Result**: Boolean visibility mask

### 6.2 Ray Casting (Bresenham-like Stepping)

```
function castRay(origin: Point, target: Point): boolean {
  // Step along ray from origin to target
  // At each step, check current cell for wall intersection
  // If intersection found before reaching target, ray is blocked
  
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const steps = max(abs(dx), abs(dy));
  const xInc = dx / steps;
  const yInc = dy / steps;
  
  let x = origin.x;
  let y = origin.y;
  
  for (let i = 0; i < steps; i++) {
    x += xInc;
    y += yInc;
    
    const cellX = floor(x / CELL_SIZE);
    const cellY = floor(y / CELL_SIZE);
    
    if (cellHasWall(cellX, cellY, origin)) {
      return false;  // blocked
    }
  }
  
  return true;  // visible
}
```

### 6.3 DDA Alternative (Digital Differential Analyzer)

Faster for long rays. Steps through grid cells instead of pixels.

```
function castRayDDA(origin: Point, target: Point): boolean {
  // Determine which grid lines the ray crosses
  // Step through cells along the ray
  // Check each cell for wall intersection
  
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  
  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  
  let tMaxX = ((floor(origin.x / CELL_SIZE) + (dx > 0 ? 1 : 0)) * CELL_SIZE - origin.x) / dx;
  let tMaxY = ((floor(origin.y / CELL_SIZE) + (dy > 0 ? 1 : 0)) * CELL_SIZE - origin.y) / dy;
  
  const tDeltaX = abs(CELL_SIZE / dx);
  const tDeltaY = abs(CELL_SIZE / dy);
  
  let cellX = floor(origin.x / CELL_SIZE);
  let cellY = floor(origin.y / CELL_SIZE);
  
  while (cellX !== floor(target.x / CELL_SIZE) || cellY !== floor(target.y / CELL_SIZE)) {
    if (tMaxX < tMaxY) {
      cellX += stepX;
      tMaxX += tDeltaX;
    } else {
      cellY += stepY;
      tMaxY += tDeltaY;
    }
    
    if (cellHasWallAt(cellX, cellY)) {
      return false;
    }
  }
  
  return true;
}
```

---

## 7. Wall Intersection Detection

### 7.1 Line-Segment Intersection Test

Each wall is a line segment. Each ray is a line segment. Intersection uses the cross product method.

```typescript
function segmentsIntersect(
  a1: Point, a2: Point,
  b1: Point, b2: Point
): boolean {
  const d1 = crossProduct(b2 - b1, a1 - b1);
  const d2 = crossProduct(b2 - b1, a2 - b1);
  const d3 = crossProduct(a2 - a1, b1 - a1);
  const d4 = crossProduct(a2 - a1, b2 - a1);
  
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  
  // Collinear cases (ray runs along wall)
  if (d1 === 0 && onSegment(b1, b2, a1)) return true;
  if (d2 === 0 && onSegment(b1, b2, a2)) return true;
  if (d3 === 0 && onSegment(a1, a2, b1)) return true;
  if (d4 === 0 && onSegment(a1, a2, b2)) return true;
  
  return false;
}
```

### 7.2 Edge Cases

| Case | Handling |
|------|----------|
| Ray passes through wall endpoint | Treat as intersection (wall blocks) |
| Ray parallel to wall | No intersection unless collinear |
| Ray starts inside wall | Character clipped; resolve to nearest open cell |
| Ray exactly tangent to wall corner | Treat as intersection (conservative) |
| Wall endpoint at grid intersection | Wall blocks both adjacent cells |
| Multiple walls at same point | Any wall blocks the ray |

### 7.3 Wall Thickness

Walls have a `thickness` property that affects occlusion area.

- Thin walls (thickness ≤ 2): block only the cells they directly cross
- Thick walls (thickness > 2): block a band of cells around the line
- The band extends `thickness / 2` pixels perpendicular to the wall line
- Used for stone walls (thick) vs wooden partitions (thin)

---

## 8. Visibility Mask

### 8.1 Structure

```typescript
interface VisibilityMask {
  width: number;
  height: number;
  cells: boolean[][];       // true = visible
  lastUpdate: string;       // ISO timestamp
  updateReason: 'movement' | 'turn_change' | 'wall_change' | 'door_change';
}
```

### 8.2 Regeneration Triggers

The mask is regenerated (invalidated) when:

1. **Character movement** — origin changes, all rays must be recast
2. **Turn change** — different character may have different position/vision
3. **Wall added or removed** — topology changed
4. **Door opened or closed** — topology changed
5. **Character vision changed** — buff/debuff, item equipped

### 8.3 Caching Strategy

- Each character has an independent visibility mask
- Masks are stored in a `Map<characterId, VisibilityMask>`
- Masks persist across frames if no invalidation trigger occurs
- Cache is cleared when:
  - Campaign is unloaded
  - Scene changes
  - Memory pressure exceeds threshold

### 8.4 DM Visibility

- DM has no visibility mask (sees everything)
- Fog of War layer uses player masks to determine cut/uncut
- DM can temporarily adopt a character's mask for verification

---

## 9. Movement Pathfinding

### 9.1 Algorithm

A* pathfinding on the grid graph.

```typescript
interface MovementCost {
  cell: Point;
  cost: number;       // 1 = normal, 2 = difficult, Infinity = impassable
  terrain: TerrainType;
}
```

### 9.2 Cost Table

| Terrain | Cost | Notes |
|---------|------|-------|
| Normal | 1 | Standard movement |
| Difficult | 2 | Rough terrain, rubble |
| Wall | ∞ | Impassable |
| Closed door | ∞ | Impassable (unless unlocking) |
| Open door | 1 | Passable |
| Window | ∞ | Impassable (unless vaulting) |
| Water (shallow) | 2 | Difficult terrain |
| Water (deep) | ∞ | Impassable without swimming |
| Lava | ∞ | Impassable |
| Ice | 1 | Normal but sliding continues |
| Magic barrier | ∞ | Impassable unless dispelled |

### 9.3 Movement Budget

- Characters have a movement speed (in feet or cells)
- Each cell costs movement based on terrain
- Path must be continuous from origin
- Maximum path length = movement speed
- Remaining movement after path = movement speed - total cost

### 9.4 Path Visualization

- Valid movement range: highlighted cells (green overlay)
- Optimal path: line from origin to each reachable cell
- Selected path: thicker line showing planned movement
- Blocked paths: red overlay on impassable cells
- Difficult terrain: yellow overlay

### 9.5 Door Interaction During Movement

- Closed door: path cannot cross (A* treats as wall)
- Locked door: path cannot cross (must use interact action)
- Open door: path crosses normally (cost = 1)
- Auto-close door: path planning ignores auto-close timing

---

## 10. Multi-Character LoS

### 10.1 Individual Masks

Each character computes its own visibility mask based on:
- Position on the grid
- Vision range (race/class dependent)
- Vision type (normal, darkvision, blindsight, tremorsense)
- Active effects (blindness, fog cloud, etc.)

### 10.2 Combined Visibility

For party-level fog of war:

```
combinedMask = union(all player masks)
```

- A cell is cut (dark) only if ALL party members cannot see it
- A cell is lit if ANY party member can see it
- Party members share vision automatically (unless separated)

### 10.3 Separated Party

When party members are in different rooms/areas:
- Each member sees only their own area
- Combined mask = union of all individual masks
- Cells between areas may be partially cut
- DM can see the full map regardless

### 10.4 Enemy Visibility

- Enemies have their own visibility masks
- Enemies are visible to players only if:
  - Enemy is in a player's visibility mask, OR
  - Enemy is in line of sight with no obstruction
- Enemy visibility does NOT affect fog of war (enemies don't reveal map)
- Stealth checks: enemy must be hidden to avoid detection

---

## 11. Performance

### 11.1 Ray Budget

- Maximum 50 rays per character per update
- Rays are distributed evenly across vision range
- Close cells get more rays (higher resolution near character)
- Far cells get fewer rays (lower resolution at range)

### 11.2 Spatial Indexing

Wall segments are stored in a spatial index for fast intersection queries.

```typescript
interface WallSpatialIndex {
  // Quadtree or grid-based spatial index
  insert(wall: WallItem): void;
  remove(wallId: string): void;
  queryRegion(bounds: Rect): WallItem[];
  queryRay(origin: Point, target: Point): WallItem[];
}
```

- Grid cell size: matches scene grid cell size
- Each wall is inserted into all cells it crosses
- Ray queries only check walls in cells along the ray path
- Reduces intersection checks from O(W) to O(W/cells_per_ray)

### 11.3 Caching

- Visibility masks cached per character
- Cache invalidated only on specific triggers (see §8.2)
- Movement paths cached for current turn
- Wall spatial index rebuilt on wall add/remove (not per frame)

### 11.4 Web Worker

Raycasting offloaded to a Web Worker to avoid blocking the main thread.

```
Main Thread ←→ Worker Thread
  send: character position, vision range, wall data
  receive: visibility mask (boolean[][])
```

- Wall data sent as flat array (Transferable)
- Visibility mask received as Uint8Array (0/1 per cell)
- Target latency: <16ms for full recalculation
- Fallback: if worker busy, use last cached mask

### 11.5 Incremental Updates

When only one wall changes:
- Don't recompute entire mask
- Find cells whose rays intersect the changed wall
- Recompute only those rays
- Merge result into cached mask
- Typically reduces computation by 80–90%

---

## 12. Integration Points

### 12.1 Scene Graph

Walls are first-class Items in the Scene Graph.

- Stored in `scene.walls` collection
- CRUD operations through Scene Graph API
- Part of undo/redo stack
- Serialized in scene snapshots
- Versioned with scene metadata

### 12.2 Fog of War

- Visibility mask determines fog layer state
- `cells[y][x] === true` → fog cut (visible)
- `cells[y][x] === false` → fog uncut (dark)
- Fog transitions: instant (tactical) or gradual (cinematic)
- DM can manually override fog state per cell

### 12.3 Lighting

Walls affect light propagation:

```
function propagateLight(
  source: LightSource,
  walls: WallItem[],
  maxRange: number
): LightMap {
  // Cast rays from light source in all directions
  // At each step, check for wall intersection
  // If wall blocks light: stop ray, mark cell as shadow
  // If wall is transparent (window): reduce light intensity
  // If no wall: light propagates normally (inverse square falloff)
}
```

- Solid walls: block light completely
- Windows: attenuate light by `1.0 - opacity`
- Open doors: no light blocking
- Closed doors: block light like solid walls
- Light sources have color; walls with material `glass` tint light

### 12.4 Map Analysis

- AI analyzes uploaded map images to detect walls
- Edge detection identifies wall segments
- Wall candidates are proposed as WallItem objects
- DM approves/rejects each candidate
- Approved walls are added to Scene Graph

### 12.5 DM Dashboard

Wall editing tools in the DM control panel:

| Tool | Function |
|------|----------|
| Draw Wall | Click-drag to create wall segment |
| Erase Wall | Click wall to remove |
| Edit Wall | Click wall to modify properties |
| Door Tool | Click to place door on wall |
| Window Tool | Click to place window on wall |
| Wall Preset | Select from predefined wall types |
| Bulk Edit | Select multiple walls, modify properties |
| Snap to Grid | Toggle grid snapping for wall endpoints |

### 12.6 Initiative Tracker

- Movement budget tracked per character per turn
- Wall interactions consume actions (open door = interact action)
- Auto-close doors tracked in initiative order
- Movement remaining displayed in character sheet

---

## 13. API Endpoints

### Wall Management

```
POST   /api/scenes/{sceneId}/walls          — create wall
GET    /api/scenes/{sceneId}/walls          — list walls
GET    /api/scenes/{sceneId}/walls/{wallId} — get wall
PATCH  /api/scenes/{sceneId}/walls/{wallId} — update wall
DELETE /api/scenes/{sceneId}/walls/{wallId} — delete wall
```

### Visibility Queries

```
POST /api/scenes/{sceneId}/visibility      — compute visibility mask
Body: { characterId, position, visionRange, visionType }
Response: { mask: boolean[][], computedAt: string }

GET  /api/scenes/{sceneId}/visibility/{characterId} — cached mask
```

### Movement Queries

```
POST /api/scenes/{sceneId}/movement-range   — compute reachable cells
Body: { characterId, position, movementSpeed, includeDiagonals }
Response: { cells: Point[], paths: Map<Point, Point[]> }

POST /api/scenes/{sceneId}/pathfind        — compute path
Body: { origin, destination, movementSpeed }
Response: { path: Point[], cost: number }
```

---

## 14. Event Types

Walls generate events through the Event System:

```typescript
// Wall lifecycle
WALL_CREATED    // new wall segment added
WALL_UPDATED    // wall properties changed
WALL_REMOVED    // wall segment deleted

// Door events
DOOR_OPENED     // door state changed to open
DOOR_CLOSED     // door state changed to closed
DOOR_LOCKED     // door state changed to locked
DOOR_UNLOCKED   // door state changed to unlocked
DOOR_BROKEN     // door was destroyed

// LoS events
VISIBILITY_CHANGED  // character's visibility mask updated
VISIBILITY_REVEALED // new cell revealed (for fog of war)
VISIBILITY_HIDDEN   // cell became hidden
```

All wall events propagate to:
- Fog of War system (visibility update)
- Lighting system (light recalculation)
- Movement system (pathfinding invalidation)
- Renderer (visual update)
- Audio system (door sounds)

---

## 15. Database Schema

```sql
CREATE TABLE walls (
  id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL REFERENCES scenes(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  start_x REAL NOT NULL,
  start_y REAL NOT NULL,
  end_x REAL NOT NULL,
  end_y REAL NOT NULL,
  wall_type TEXT NOT NULL CHECK (wall_type IN ('solid', 'door', 'window')),
  material TEXT NOT NULL DEFAULT 'stone',
  height REAL NOT NULL DEFAULT 8.0,
  thickness REAL NOT NULL DEFAULT 2.0,
  opacity REAL NOT NULL DEFAULT 1.0,
  blocks_los INTEGER NOT NULL DEFAULT 1,
  blocks_movement INTEGER NOT NULL DEFAULT 1,
  sound_occlusion REAL NOT NULL DEFAULT 0.8,
  door_state TEXT CHECK (door_state IN ('open', 'closed', 'locked', 'stuck')),
  door_key_id TEXT,
  door_lock_dc INTEGER,
  door_break_dc INTEGER,
  door_close_sound TEXT,
  door_open_sound TEXT,
  door_auto_close INTEGER DEFAULT 0,
  door_auto_close_rounds INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_walls_scene ON walls(scene_id);
CREATE INDEX idx_walls_type ON walls(wall_type);
CREATE INDEX idx_walls_doors ON walls(door_state) WHERE wall_type = 'door';
```

---

## 16. See Also

> See also: `SCENE-GRAPH.md` for Item system definition and wall entity storage.
> See also: `FOG-AND-VISIBILITY.md` for fog rendering pipeline and visibility mask consumption.
> See also: `LIGHTING-SYSTEM.md` for light propagation with wall occlusion.

---

## 17. Future Considerations

- **Vertical LoS**: 3D awareness for multi-story buildings
- **Destructible walls**: walls that can be damaged/destroyed
- **Moving walls**: animated walls (portcullis, sliding door)
- **Wall templates**: save/load common wall configurations
- **Bulk wall operations**: merge, split, offset wall segments
- **LoS visualization**: debug mode showing ray paths
- **Sound propagation**: full acoustic simulation using wall occlusion
- **Pathfinding shortcuts**: diagonal movement optimization
- **Fog of war smoothing**: gradient edges instead of hard pixel boundaries
