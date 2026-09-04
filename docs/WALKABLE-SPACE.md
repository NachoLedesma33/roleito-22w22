# Walkable Space Generation System

## 1. Overview

Walkable Space defines every position a character can legally occupy within a scene. It is generated from **semantic geometry** (walls, doors, obstacles, rooms) — never from pixel analysis or image processing. This separation keeps the system deterministic, inspectable, and decoupled from rendering.

Two representations are supported:

- **Grid Map** — discrete cells, trivial pathfinding, ideal for grid-based battlemaps.
- **Vector Map** — continuous polygons, pixel-precision, required for free movement and NavMesh generation.

Both representations share a common configuration space step: obstacles are inflated by agent radius so movement validation treats the agent as a dimensionless point.

### Design Goals

- Source of truth lives in the world state, not in rendered tiles.
- Wall positions are canonical (DM-approved canon); walkable space is derived.
- Generation runs on-demand and is cacheable per scene version.
- Both grid and vector paths can coexist; downstream systems choose the one they need.

---

## 2. Grid Map

The grid map divides the scene into uniform cells. Each cell is either `WALKABLE` or `BLOCKED`. Simple, fast, sufficient for grid-based RPG maps where characters snap to cells.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `width` | `number` | Number of cells horizontally |
| `height` | `number` | Number of cells vertically |
| `cellSize` | `number` | Pixels per cell (e.g., 32 for 32px grid) |
| `cells` | `boolean[][]` | `true` = walkable, `false` = blocked |

### Interface

```typescript
interface GridMap {
  width: number;
  height: number;
  cellSize: number;
  cells: boolean[][];
}
```

### Cell Resolution

Cell size determines precision. A 32px cell means any obstacle smaller than 32px in a dimension may be missed or cause aliasing. For battlemaps the grid size usually matches the map tile grid (32, 48, or 64px).

### Usage

- A* pathfinding operates directly on the boolean grid — O(w × h) memory, O(w × h log(w × h)) time with a binary heap.
- Tokens snap to cell centers; movement cost = Manhattan or Chebyshev distance.
- Grid maps are cheap to generate and store (~1 byte per cell).

---

## 3. Vector Map

The vector map represents walkable area as continuous polygons. Walkable area = scene bounds minus all obstacle polygons (walls, pillars, furniture, etc.). Better for free movement — click anywhere, not just grid cells. NavMesh is built from vector map.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `bounds` | `Polygon` | Outer boundary of the scene |
| `obstacles` | `Polygon[]` | Wall segments, pillars, objects |
| `walkablePolygons` | `Polygon[]` | Computed walkable area (polygon difference) |

### Interface

```typescript
interface VectorMap {
  bounds: Polygon;
  obstacles: Polygon[];
  walkablePolygons: Polygon[];
}
```

### Polygon Difference

`walkablePolygons` is computed by subtracting all obstacle polygons from `bounds`. The result may be multiple disconnected polygons (rooms connected by corridors, areas around pillars, etc.). Libraries like [clipper2](https://www.angusj.com/clipper2/) or [polypartition](https://github.com/Mapbox/polypartition) handle boolean polygon operations robustly.

### Usage

- Click-to-move: cast a ray from camera, intersect with walkable polygon, validate path.
- NavMesh generation: triangulate walkable polygons, generate adjacency graph.
- Token placement: find nearest point on walkable polygon to desired position.

---

## 4. Generation Pipeline

Walkable space generation is a deterministic pipeline that transforms scene geometry into navigable regions.

### Steps

```
1. Start with scene bounds (map dimensions)
         │
         ▼
2. Subtract wall segments (inflated by wall thickness)
         │
         ▼
3. Subtract closed door rectangles
         │
         ▼
4. Subtract obstacle polygons (furniture, pillars, etc.)
         │
         ▼
5. Result = walkable polygons
         │
         ▼
6. Optionally discretize to grid
```

### Step 1: Scene Bounds

The scene bounds define the outer boundary — typically the map image dimensions or a DM-defined rectangle. All subtraction operates within this boundary.

### Step 2: Wall Subtraction

Wall segments from the scene graph are converted to thin rectangles (wall thickness from map metadata or default). Each wall rectangle is subtracted from the current walkable area.

### Step 3: Door Subtraction

Closed doors are subtracted as rectangles matching the door geometry. When a door transitions to OPEN, its rectangle is removed from the obstacle set and the pipeline re-runs (or the walkable area is patched).

### Step 4: Obstacle Subtraction

All scene objects tagged as obstacles (furniture, pillars, environmental hazards) are subtracted. Each object contributes its axis-aligned or oriented bounding polygon.

### Step 5: Result

The remaining polygons are the walkable areas. Disconnected regions are stored as separate polygons. Each polygon carries metadata: room ID, floor type, lighting zone, etc.

### Step 6: Grid Discretization (Optional)

If grid-based movement is needed, the vector walkable area is rasterized to a boolean grid. Each cell center is tested against the walkable polygons; if inside, the cell is `WALKABLE`.

---

## 5. Configuration Space

Configuration space transforms the world so the agent becomes a dimensionless point. Obstacles are inflated by the agent's radius (or full footprint shape), allowing simple point-based collision checks.

### Concept

In world space, an agent with radius `r` collides with a wall if any part of its body overlaps the wall. In configuration space, the wall is inflated by `r` on all sides, and the agent is a single point. The point-in-polygon check is equivalent to the original collision check but far simpler to implement.

### Minkowski Difference

```
C_free = C_world ⊖ B(r)
```

Where:
- `C_world` = world configuration space (all valid positions)
- `B(r)` = agent footprint as a ball of radius `r`
- `⊖` = Minkowski difference (erosion)

Geometrically: for each obstacle point, expand outward by `r` in all directions. The union of all expanded obstacles is the forbidden region in configuration space. Everything else is `C_free`.

### Visual

```
WALL                    INFLATED WALL (by agent radius r)

████████████████        ████████████████████████████████
                        ← r →                  ← r →

Agent (radius r)        Agent as point
    ██                      •
    ██                      •
    • (center)
```

The point-agent cannot enter the inflated region. This is equivalent to the original agent (with radius) not touching the original wall.

### Implementation

```typescript
function buildConfigurationSpace(
  obstacles: Polygon[],
  agentRadius: number
): Polygon[] {
  return obstacles.map(obstacle => inflatePolygon(obstacle, agentRadius));
}
```

The Minkowski difference for a convex polygon and a circle (agent radius) produces a polygon with rounded corners (offset curve). For grid-based systems, this is approximated by inflating each obstacle cell by `ceil(agentRadius / cellSize)` cells in all directions.

---

## 6. Agent Footprint Types

Different characters have different body shapes. The footprint determines how obstacles are inflated and how collision checks are performed.

### Types

```typescript
type Footprint =
  | { type: 'circle'; radius: number }
  | { type: 'capsule'; radius: number; length: number }
  | { type: 'rectangle'; width: number; height: number }
  | { type: 'polygon'; vertices: Point[] };
```

### Circle

Simplest footprint. Obstacles inflated by radius in all directions. Good for tokens on battlemaps. Rotation is irrelevant — collision is symmetric.

```typescript
{ type: 'circle', radius: 0.5 } // 1-unit diameter token
```

### Capsule

Circle swept along a line segment. Good for humanoid characters — wider in one dimension. Inflation is a rectangle with semicircular ends. The capsule's orientation matters; collision depends on facing direction.

```typescript
{ type: 'capsule', radius: 0.3, length: 1.0 } // humanoid: narrow, tall
```

### Rectangle

Axis-aligned or oriented rectangle. Good for large creatures, vehicles, or furniture. Inflation expands each edge outward by the minimum penetration distance. Oriented rectangles require rotation-aware inflation.

```typescript
{ type: 'rectangle', width: 2.0, height: 3.0 } // large creature
```

### Polygon

Arbitrary convex or concave polygon. Most accurate representation — model a dragon's wingspan, a spider's legs, or irregular furniture. Most expensive: inflation requires polygon offset algorithms, and collision checks use point-in-polygon tests on the inflated shape.

```typescript
{ type: 'polygon', vertices: [/* ... */] } // custom shape
```

### Selection Guide

| Footprint | Complexity | Accuracy | Use Case |
|-----------|-----------|----------|----------|
| Circle | Low | Medium | Tokens, small creatures |
| Capsule | Medium | High | Humanoid characters |
| Rectangle | Medium | High | Large creatures, vehicles |
| Polygon | High | Highest | Dragons, irregular shapes |

---

## 7. Wall Inflation

Wall inflation converts thin wall segments into thick obstacle polygons that account for agent size. A wall segment is a line; after inflation it becomes a capsule-shaped polygon (rectangle + semicircular endpoints).

### Process

For each wall segment:
1. Compute the perpendicular normal vector.
2. Offset the segment outward by `agentRadius` on each side, creating a rectangle.
3. Cap both endpoints with semicircles of radius `agentRadius`.
4. The result is a capsule polygon.

```typescript
function inflateWall(wall: Segment, radius: number): Polygon {
  const normal = perpendicular(wall.direction);
  const offsetA = add(wall.a, scale(normal, radius));
  const offsetB = add(wall.b, scale(normal, radius));
  const offsetC = add(wall.b, scale(normal, -radius));
  const offsetD = add(wall.a, scale(normal, -radius));

  // Rectangle vertices + semicircle arcs at endpoints
  return {
    vertices: [
      ...rectangleVertices(offsetA, offsetB, offsetC, offsetD),
      ...semicircleArc(wall.a, radius, normal),
      ...semicircleArc(wall.b, radius, normal),
    ],
  };
}
```

### Corner Handling

Where two walls meet at a corner, their inflated polygons overlap. This is correct — the overlapping region is doubly forbidden. No special corner treatment is needed; the polygon difference operation handles overlaps naturally.

For grid-based systems, wall inflation is simpler: mark the wall cell and all adjacent cells within `ceil(radius / cellSize)` distance as blocked.

### Wall Thickness

Walls have physical thickness in the map. The inflation accounts for both:
- Wall visual thickness (the rendered wall width)
- Agent radius (the character's body size)

Total obstacle width = wall thickness + 2 × agent radius.

---

## 8. Grid vs Vector Decision

Choose the representation based on the game's movement model.

| Feature | Grid | Vector |
|---------|------|--------|
| RPG battlemap (square grid) | ✓ Best | Overkill |
| Free movement (click anywhere) | ✗ | ✓ Best |
| Performance | ✓ Fast | Moderate |
| Precision | Cell-level | Pixel-level |
| NavMesh generation | Not needed | Required |
| Token snapping | Natural | Manual |
| Pathfinding complexity | Low (A* on grid) | Medium (A* on navmesh) |
| Memory | O(w × h) | O(n vertices) |
| Door open/close | Toggle cells | Re-polygonize |
| Token collision | Cell overlap | Point-in-polygon |

### When to Use Grid

- D&D/Pathfinder-style battlemaps with square grids.
- Tokens move cell-by-cell.
- Simple pathfinding is sufficient.
- Performance is critical (large maps, many entities).

### When to Use Vector

- Free-form movement (click to move, WASD).
- Irregular token shapes or sizes.
- NavMesh is needed for smooth agent steering.
- Precision matters (tight corridors, narrow gaps).

### Hybrid Approach

Both can coexist. Grid map for quick pathfinding and token snapping. Vector map for precise collision checks and NavMesh steering. The grid is derived from the vector map via rasterization, so they stay in sync.

---

## 9. Integration Points

Walkable space generation connects to several subsystems.

### Map Analysis → Wall Segments

The map analysis module extracts wall segments and room polygons from the scene graph. These are the primary inputs to walkable space generation. Wall segments are `Segment[]` (two endpoints each). Room polygons define named regions.

### Scene Graph → Wall/Door Items

The scene graph stores wall and door items with their geometry. When a wall is added, removed, or moved, the walkable space is regenerated. When a door opens/closes, the obstacle set changes and regeneration is triggered.

### Collision System → Movement Validation

The collision system queries walkable space to validate movement requests. For grid maps: check if destination cell is walkable. For vector maps: check if destination point is inside a walkable polygon. The collision system uses the configuration space version (obstacles inflated by agent radius).

### NavMesh → Pathfinding

The NavMesh is built by triangulating the vector walkable polygons. Each triangle becomes a NavMesh node; adjacency is computed from shared edges. A* on the NavMesh provides smooth, continuous paths. The NavMesh is regenerated whenever walkable space changes.

### 2D→3D → World Position Transform

The walkable space exists in 2D map coordinates. The 2D→3D transform converts these to world positions for the Three.js renderer. Map (x, y) → World (x, 0, y) with appropriate scale and offset. The transform is stored in the scene metadata and applied during rendering.

---

## 10. Caching and Invalidation

Walkable space generation is deterministic and can be cached. Invalidation is triggered by:

- Wall added, removed, or moved
- Door state changed (open ↔ closed)
- Obstacle added or removed
- Map bounds changed
- Agent radius changed (configuration space)

Cache key = hash of (scene version, agent radius, footprint type). When a dependency changes, the cache entry is evicted and regeneration runs on next query.

For grid maps, cached cells persist until invalidation. For vector maps, cached walkable polygons persist until invalidation. Both use the same cache key scheme.

---

## 11. Edge Cases

### Zero-Width Gaps

Two parallel walls with a gap smaller than agent diameter produce a walkable polygon that is too narrow for the agent. After configuration space inflation, this gap disappears (correct behavior). Before inflation, the gap exists but should be flagged as impassable by the collision system.

### Floating Tokens

Tokens can be placed on non-walkable areas (e.g., mid-air, inside walls) for cinematic purposes. The collision system distinguishes between "placed" and "moving" — movement is validated against walkable space, but placement is unrestricted.

### Multi-Level Scenes

Scenes with elevation (stairs, balconies) have per-level walkable spaces. The 2D→3D transform includes the Y component. Pathfinding across levels requires level transition points (stairs, elevators) that connect walkable spaces on different floors.

### Dynamic Obstacles

Movable objects (crates, tables) are obstacles that change position at runtime. Their polygons are added to the obstacle set dynamically. Walkable space is regenerated after each move. For performance, only the local region around the moved object is regenerated.
