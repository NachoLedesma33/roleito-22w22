# Navigation and Collision System

Master overview of all navigation and collision subsystems in Roleito.

## 1. Overview

Characters must walk correctly on 2D maps, avoiding walls and obstacles. The map image is **not** the collision source — semantic geometry is. Map images are visual only. All movement logic operates on extracted geometric data.

**Pipeline:**

```
Map Image → Map Analyzer → Semantic Geometry → Walkable Space → Configuration Space → Collision / NavMesh → Movement
```

The system extracts walls, doors, and rooms from the map. These become walkable polygons. Collision checks and pathfinding run against these polygons, never against pixels.

## 2. Architecture

```
                         2D MAP
                            │
                            ▼
                     MAP ANALYZER
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
              WALLS       DOORS       ROOMS
                │           │           │
                └───────────┼───────────┘
                            ▼
                    SEMANTIC MAP
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
         COLLISION GEOMETRY          NAVMESH
               │                         │
               │                        A*
               │                         │
               │                     FUNNEL
               │                         │
               └────────────┬────────────┘
                            ▼
                      MOVEMENT AGENT
                            │
                   ┌────────┴────────┐
                   ▼                 ▼
               2D TOKEN          3D MODEL
                   │                 │
                   └────────┬────────┘
                            ▼
                      WORLD POSITION
```

## 3. Subsystem Index

| Subsystem | Doc | Purpose |
|-----------|-----|---------|
| Walkable Space | `WALKABLE-SPACE.md` | Map → walkable polygons → configuration space |
| Collision | `COLLISION-SYSTEM.md` | Agent footprint, swept collision, wall sliding |
| NavMesh | `NAVMESH-AND-PATHFINDING.md` | NavMesh generation, A*, funnel algorithm |
| Movement | `MOVEMENT-AGENT.md` | Movement controller, 2D/3D integration |
| Dynamic Obstacles | `DYNAMIC-OBSTACLES.md` | Doors, multi-floor, state changes |

Each subsystem operates independently. They share the semantic map as input and the world position as output.

## 4. Design Principles

### Semantic, not pixel-based

Walls are geometry (line segments, polygons), not image analysis. Map images are visual references only. All collision and pathfinding data comes from extracted semantic geometry.

### Collision ≠ Navigation

Two separate systems solve different problems:

- **Collision**: prevents overlapping walls (real-time, per-frame)
- **Navigation**: finds optimal path between points (on-demand, per request)

They share input geometry but produce different outputs.

### Agent as point in configuration space

Configuration space inflates all obstacles by the agent radius. After inflation, the agent is a point. Collision detection reduces to point-in-polygon and point-vs-segment tests.

### Footprint for collision, point for navigation

Hybrid approach:

- **Navigation**: agent is a point on the NavMesh (simpler pathfinding)
- **Collision**: agent has a circular footprint (realistic wall interaction)

### Visual mesh ≠ collision mesh

- **GLB models**: rendering only, high polygon count
- **Capsule/circle**: physics, low cost, used for collision
- Never use visual mesh for collision queries

### Grid A* for grid maps

Standard A* on a grid is sufficient for RPG battlemaps. Grid resolution matches token size (e.g., 512×512 map → 32×32 grid for 16px tokens).

### NavMesh for free movement

Click-to-move and smooth paths use NavMesh. A* finds polygon sequence, funnel algorithm smooths to waypoints.

## 5. Data Flow

1. **Map Analysis** produces walls, doors, rooms (semantic geometry)
2. **Walkable Space** generates walkable polygons from semantic geometry
3. **Configuration Space** inflates obstacles by agent radius
4. **Collision System** uses inflated geometry for point-vs-segment tests
5. **NavMesh** generates navigation graph from walkable polygons
6. **A*** finds polygon sequence on NavMesh
7. **Funnel algorithm** smooths path to waypoints
8. **Movement Agent** follows waypoints with collision detection
9. **3D Model** receives world position from Movement Agent

## 6. Coordinate System

### Map 2D

- Origin: top-left corner
- X axis: right
- Y axis: down
- Units: pixels

### Three.js World

- Origin: center of map
- X axis: right
- Y axis: up (height)
- Z axis: forward (into screen, maps to map Y)
- Units: world units (configurable scale)

### Transform Formulas

```
worldX = (mapX - mapWidth / 2) * scale
worldY = height * scale
worldZ = (mapY - mapHeight / 2) * scale
```

Inverse:

```
mapX = (worldX / scale) + mapWidth / 2
mapY = (worldZ / scale) + mapHeight / 2
height = worldY / scale
```

### Scale

Default: 1 world unit = 1 pixel. Configurable per campaign. Grid maps use `gridSize * tokenSize` as the effective scale.

## 7. Integration Points

| System | Document | Relationship |
|--------|----------|-------------|
| Map Analysis | `MAP-ANALYSIS.md` | Produces semantic geometry (walls, doors, rooms) |
| Scene Graph | `SCENE-GRAPH.md` | Wall and door items stored as scene entities |
| Walls & LoS | `WALLS-AND-LINE-OF-SIGHT.md` | Shares wall segments for line-of-sight |
| Fog of War | `FOG-AND-VISIBILITY.md` | Visibility data affects navigation options |
| 2D→3D Mapping | `2D-TO-3D.md` | Coordinate transformation between spaces |
| Lighting | `LIGHTING-SYSTEM.md` | Light sources may affect movement (optional) |
| Event System | `EVENT-SYSTEM.md` | Door state changes propagate through events |
| World State | `WORLD-STATE.md` | Canonical entity positions, obstacle states |

## 8. Performance Considerations

### Spatial Partitioning

Wall segments and obstacles indexed in quadtree or uniform grid. Queries return only nearby segments. Avoids O(n) checks against all walls every frame.

### Incremental NavMesh Updates

Door open/close triggers局部 NavMesh rebuild, not full regeneration. Only affected polygons and edges are recalculated.

### Cached Walkable Polygons

Walkable polygons cached per map. Invalidated only when walls change (door state, destructible terrain, DM edits). Cache key: map ID + obstacle hash.

### Pathfinding Budget

Max 100ms per query. If exceeded, return partial path or nearest reachable point. Long paths split into segments with progressive refinement.

### Agent Radius Pre-computation

Configuration space inflation computed once when map loads or obstacles change. Not computed per-frame. Stored as inflated polygon set.

### Frame Budget

- Collision check: < 1ms per agent per frame
- Pathfinding: < 100ms per request
- NavMesh rebuild (door): < 50ms
- Full NavMesh build: < 500ms (async, non-blocking)

## 9. Error Handling

### Degenerate Geometry

Wall segments shorter than 1px ignored. Overlapping walls merged. Self-intersecting polygons clipped. All produce warnings, never crash.

### Pathfinding Failure

If no path exists, agent stops at last reachable point. UI notifies user. DM can override wall constraints.

### Stale Cache

If walkable polygon cache is invalidated mid-path, current path completes using old geometry. New path request uses fresh geometry.

## 10. Testing Strategy

| Test Type | Coverage |
|-----------|----------|
| Unit | Geometry operations, point-in-polygon, segment intersection |
| Integration | Full pipeline: map → walkable → navmesh → path |
| Visual | Debug overlay showing walkable area, navmesh, paths |
| Performance | 100+ agents on 1024×1024 map, stress test pathfinding |
| Edge Cases | Zero-width corridors, single-pixel gaps, circular rooms |

Debug visualization available in DM dashboard:

- Toggle walkable area overlay
- Toggle NavMesh wireframe
- Toggle agent footprints
- Toggle path visualization
- Toggle collision points
