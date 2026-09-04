# NavMesh Generation & Pathfinding

## 1. Overview

NavMesh = navigation graph built from walkable polygons. A* finds shortest path on NavMesh (polygon sequence). Funnel algorithm smooths polygon sequence to waypoints. For grid maps: A* on grid is simpler and sufficient.

**Pipeline**: Walkable Space → NavMesh → A* (polygon sequence) → Funnel Algorithm (waypoints) → Movement Agent

**When to use each**:
- NavMesh: irregular rooms, variable geometry, 3D floors
- Grid A*: rectangular rooms, tile-based maps, simple cases

## 2. NavMesh Generation

Input: walkable polygons from Walkable Space. Triangulate walkable polygons (Delaunay or ear clipping). Each triangle = NavMesh node. Adjacent triangles share edges = NavMesh edges.

```typescript
interface NavMesh {
  polygons: NavPolygon[];
  edges: NavEdge[];
  portals: Portal[];
}

interface NavPolygon {
  id: string;
  vertices: Point[];
  neighbors: string[];  // adjacent polygon IDs
  center: Point;        // centroid
  area: number;         // polygon area
}

interface NavEdge {
  polygonA: string;
  polygonB: string;
  left: Point;
  right: Point;
}

interface Portal {
  left: Point;
  right: Point;
  polygonA: string;
  polygonB: string;
}
```

### 2.1 Delaunay Triangulation

Preferred for convex polygons. Produces well-shaped triangles (no skinny slivers). Libraries: delaunator (JS), triangle (C, via WASM).

```typescript
function triangulateWalkableSpace(walkablePolygons: Point[][]): NavPolygon[] {
  const allPoints = walkablePolygons.flat();
  const triangles = delaunayTriangulate(allPoints);

  // Filter: keep triangles fully inside walkable area
  const validTriangles = triangles.filter(tri =>
    isFullyInsideWalkable(tri, walkablePolygons)
  );

  return validTriangles.map((tri, i) => ({
    id: `poly-${i}`,
    vertices: tri,
    neighbors: [],
    center: centroid(tri),
    area: polygonArea(tri),
  }));
}
```

### 2.2 Ear Clipping

Fallback for non-convex polygons. Slower but handles arbitrary geometry. Good for concave rooms.

```typescript
function earClipTriangulate(polygon: Point[]): Point[][] {
  const triangles: Point[][] = [];
  const remaining = [...polygon];

  while (remaining.length > 3) {
    for (let i = 0; i < remaining.length; i++) {
      const prev = remaining[(i - 1 + remaining.length) % remaining.length];
      const curr = remaining[i];
      const next = remaining[(i + 1) % remaining.length];

      if (isConvex(prev, curr, next) && !containsReflex(remaining, prev, curr, next)) {
        triangles.push([prev, curr, next]);
        remaining.splice(i, 1);
        break;
      }
    }
  }

  triangles.push([...remaining]);
  return triangles;
}
```

### 2.3 Edge Detection

Build adjacency by checking shared edges between triangles.

```typescript
function buildEdges(polygons: NavPolygon[]): NavEdge[] {
  const edgeMap = new Map<string, NavEdge>();

  for (const poly of polygons) {
    for (let i = 0; i < poly.vertices.length; i++) {
      const a = poly.vertices[i];
      const b = poly.vertices[(i + 1) % poly.vertices.length];
      const key = edgeKey(a, b);

      if (edgeMap.has(key)) {
        const existing = edgeMap.get(key)!;
        existing.polygonB = poly.id;
        edgeMap.set(key, existing);
      } else {
        edgeMap.set(key, {
          polygonA: poly.id,
          polygonB: '',
          left: a,
          right: b,
        });
      }
    }
  }

  return Array.from(edgeMap.values()).filter(e => e.polygonB !== '');
}
```

## 3. NavMesh from Grid

For grid-based maps, NavMesh is trivial. Each walkable cell = polygon (square). Adjacent walkable cells = neighbors. No triangulation needed.

```typescript
function gridToNavMesh(grid: GridMap): NavMesh {
  const polygons: NavPolygon[] = [];
  const portals: Portal[] = [];

  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (!grid.isWalkable(x, y)) continue;

      const id = `cell-${x}-${y}`;
      const vertices = gridCellVertices(x, y, grid.cellSize);

      polygons.push({
        id,
        vertices,
        neighbors: getWalkableNeighbors(grid, x, y),
        center: { x: x * grid.cellSize + grid.cellSize / 2, y: y * grid.cellSize + grid.cellSize / 2 },
        area: grid.cellSize * grid.cellSize,
      });
    }
  }

  for (const poly of polygons) {
    const neighbors = poly.neighbors;
    for (const nId of neighbors) {
      const neighbor = polygons.find(p => p.id === nId)!;
      const sharedEdge = findSharedEdge(poly.vertices, neighbor.vertices);
      if (sharedEdge) {
        portals.push({
          left: sharedEdge[0],
          right: sharedEdge[1],
          polygonA: poly.id,
          polygonB: nId,
        });
      }
    }
  }

  return { polygons, edges: [], portals };
}
```

## 4. A* Pathfinding on NavMesh

Nodes: NavMesh polygons. Edges: portal edges between adjacent polygons. Cost: distance through portals (crossing distance). Heuristic: straight-line distance to goal polygon center.

```typescript
function aStarNavMesh(
  navmesh: NavMesh,
  start: Point,
  end: Point
): string[] {
  const startPoly = findPolygonAtPoint(navmesh, start);
  const endPoly = findPolygonAtPoint(navmesh, end);

  if (!startPoly || !endPoly) return [];
  if (startPoly.id === endPoly.id) return [startPoly.id];

  const openSet = new PriorityQueue<NavPolygon>();
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  gScore.set(startPoly.id, 0);
  fScore.set(startPoly.id, heuristic(startPoly.center, endPoly.center));
  openSet.enqueue(startPoly, fScore.get(startPoly.id)!);

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue()!;

    if (current.id === endPoly.id) {
      return reconstructPath(cameFrom, current.id);
    }

    for (const neighborId of current.neighbors) {
      const neighbor = navmesh.polygons.find(p => p.id === neighborId)!;
      const portal = navmesh.portals.find(
        p => (p.polygonA === current.id && p.polygonB === neighborId) ||
             (p.polygonB === current.id && p.polygonA === neighborId)
      )!;

      const crossingCost = portalCrossingCost(portal, current.center, endPoly.center);
      const tentativeG = (gScore.get(current.id) ?? Infinity) + crossingCost;

      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, current.id);
        gScore.set(neighborId, tentativeG);
        fScore.set(neighborId, tentativeG + heuristic(neighbor.center, endPoly.center));
        openSet.enqueue(neighbor, fScore.get(neighborId)!);
      }
    }
  }

  return [];
}

function portalCrossingCost(portal: Portal, from: Point, to: Point): number {
  const portalMidpoint = midpoint(portal.left, portal.right);
  return distance(from, portalMidpoint) + distance(portalMidpoint, to);
}

function heuristic(a: Point, b: Point): number {
  return distance(a, b);
}

function reconstructPath(cameFrom: Map<string, string>, current: string): string[] {
  const path = [current];
  while (cameFrom.has(current)) {
    current = cameFrom.get(current)!;
    path.unshift(current);
  }
  return path;
}
```

### 4.1 Point-in-Polygon

Find which polygon contains a point.

```typescript
function findPolygonAtPoint(navmesh: NavMesh, point: Point): NavPolygon | null {
  for (const poly of navmesh.polygons) {
    if (pointInPolygon(point, poly.vertices)) {
      return poly;
    }
  }
  return null;
}

function pointInPolygon(point: Point, vertices: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;

    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}
```

### 4.2 Priority Queue

Min-heap for A* open set.

```typescript
class PriorityQueue<T> {
  private items: { value: T; priority: number }[] = [];

  enqueue(value: T, priority: number): void {
    this.items.push({ value, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }

  dequeue(): T | undefined {
    return this.items.shift()?.value;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}
```

## 5. A* on Grid (Simpler Alternative)

For grid maps, use grid A* directly. Each walkable cell = node. 8-directional movement (or 4 for stricter). Cost: 1 for cardinal, √2 for diagonal. Heuristic: Manhattan or octile distance.

```typescript
function aStarGrid(
  grid: GridMap,
  start: Cell,
  end: Cell
): Cell[] {
  const openSet = new PriorityQueue<Cell>();
  const cameFrom = new Map<string, Cell>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  const key = (c: Cell) => `${c.x},${c.y}`;

  gScore.set(key(start), 0);
  fScore.set(key(start), octileDistance(start, end));
  openSet.enqueue(start, fScore.get(key(start))!);

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue()!;

    if (current.x === end.x && current.y === end.y) {
      return reconstructGridPath(cameFrom, current);
    }

    for (const [dx, dy] of eightDirections) {
      const nx = current.x + dx;
      const ny = current.y + dy;

      if (!grid.inBounds(nx, ny) || !grid.isWalkable(nx, ny)) continue;

      const moveCost = (dx !== 0 && dy !== 0) ? Math.SQRT2 : 1;
      const tentativeG = (gScore.get(key(current)) ?? Infinity) + moveCost;
      const neighborKey = key({ x: nx, y: ny });

      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + octileDistance({ x: nx, y: ny }, end));
        openSet.enqueue({ x: nx, y: ny }, fScore.get(neighborKey)!);
      }
    }
  }

  return [];
}

function octileDistance(a: Cell, b: Cell): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}

function manhattanDistance(a: Cell, b: Cell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

const eightDirections: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];
```

## 6. Funnel Algorithm (String Pulling)

Input: polygon sequence from A*. Output: smooth waypoint sequence. Uses portals (shared edges between polygons). Sweeps a funnel from start to end. Adds waypoints when funnel narrows.

```typescript
function funnelAlgorithm(
  polygonSequence: string[],
  navmesh: NavMesh,
  start: Point,
  end: Point
): Point[] {
  const portals = extractPortals(polygonSequence, navmesh);
  const waypoints: Point[] = [start];

  let apex = start;
  let left = start;
  let right = start;
  let apexIndex = 0;
  let leftIndex = 0;
  let rightIndex = 0;

  for (let i = 0; i < portals.length; i++) {
    const portal = portals[i];
    const newLeft = portal.left;
    const newRight = portal.right;

    // Update right funnel edge
    if (crossProduct(apex, right, newRight) <= 0) {
      if (equalPoints(apex, right) || crossProduct(apex, left, newRight) > 0) {
        right = newRight;
        rightIndex = i;
      } else {
        // Right crossed left - snap to left, add waypoint
        waypoints.push(left);
        apex = left;
        apexIndex = leftIndex;
        left = apex;
        right = apex;
        leftIndex = apexIndex;
        rightIndex = apexIndex;
        i = apexIndex - 1;
        continue;
      }
    }

    // Update left funnel edge
    if (crossProduct(apex, left, newLeft) >= 0) {
      if (equalPoints(apex, left) || crossProduct(apex, right, newLeft) < 0) {
        left = newLeft;
        leftIndex = i;
      } else {
        // Left crossed right - snap to right, add waypoint
        waypoints.push(right);
        apex = right;
        apexIndex = rightIndex;
        left = apex;
        right = apex;
        leftIndex = apexIndex;
        rightIndex = apexIndex;
        i = apexIndex - 1;
        continue;
      }
    }
  }

  waypoints.push(end);
  return waypoints;
}

function extractPortals(polygonSequence: string[], navmesh: NavMesh): Portal[] {
  const portals: Portal[] = [];

  for (let i = 0; i < polygonSequence.length - 1; i++) {
    const a = polygonSequence[i];
    const b = polygonSequence[i + 1];

    const portal = navmesh.portals.find(
      p => (p.polygonA === a && p.polygonB === b) ||
           (p.polygonB === a && p.polygonA === b)
    );

    if (portal) {
      // Ensure consistent left/right orientation
      if (portal.polygonA === b) {
        portals.push({ left: portal.right, right: portal.left, polygonA: a, polygonB: b });
      } else {
        portals.push(portal);
      }
    }
  }

  return portals;
}

function crossProduct(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function equalPoints(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < 0.0001 && Math.abs(a.y - b.y) < 0.0001;
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
```

## 7. Path Smoothing

After funnel algorithm, path may have sharp turns. Smooth by removing unnecessary waypoints. Raycast from each waypoint to skip intermediates. Result: smooth, collision-free path.

```typescript
function smoothPath(waypoints: Point[], isBlocked: (a: Point, b: Point) => boolean): Point[] {
  if (waypoints.length <= 2) return waypoints;

  const smoothed: Point[] = [waypoints[0]];
  let currentIndex = 0;

  while (currentIndex < waypoints.length - 1) {
    let farthest = currentIndex + 1;

    // Find farthest visible waypoint
    for (let i = currentIndex + 2; i < waypoints.length; i++) {
      if (!isBlocked(waypoints[currentIndex], waypoints[i])) {
        farthest = i;
      }
    }

    smoothed.push(waypoints[farthest]);
    currentIndex = farthest;
  }

  return smoothed;
}

function smoothPathWithRaycast(
  waypoints: Point[],
  isBlocked: (a: Point, b: Point) => boolean,
  stepSize: number = 0.5
): Point[] {
  if (waypoints.length <= 2) return waypoints;

  const smoothed: Point[] = [waypoints[0]];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const dist = distance(from, to);
    const steps = Math.ceil(dist / stepSize);

    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const point = lerp(from, to, t);

      if (isBlocked(smoothed[smoothed.length - 1], point)) {
        smoothed.push(lerp(from, to, (s - 1) / steps));
        break;
      }

      if (s === steps) {
        smoothed.push(to);
      }
    }
  }

  return smoothed;
}

function lerp(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}
```

## 8. Multi-Floor Navigation

Each floor = separate NavMesh. Stairs/elevators = portals between NavMeshes. Pathfinding crosses floors via portals. Elevator = instant teleport between floors.

```typescript
interface MultiFloorNavMesh {
  floors: Map<number, NavMesh>;
  connections: FloorConnection[];
}

interface FloorConnection {
  type: 'stair' | 'elevator' | 'ramp';
  fromFloor: number;
  toFloor: number;
  fromPolygon: string;
  toPolygon: string;
  cost: number;  // traversal cost (stairs = higher, elevator = lower)
}

function aStarMultiFloor(
  multiFloor: MultiFloorNavMesh,
  start: Point,
  startFloor: number,
  end: Point,
  endFloor: number
): { point: Point; floor: number }[] {
  // 1. Find start/end polygons on respective floors
  const startNavmesh = multiFloor.floors.get(startFloor)!;
  const endNavmesh = multiFloor.floors.get(endFloor)!;
  const startPoly = findPolygonAtPoint(startNavmesh, start);
  const endPoly = findPolygonAtPoint(endNavmesh, end);

  // 2. Build unified graph with floor transitions
  // Nodes: polygon ID + floor number
  // Edges: within-floor portals + cross-floor connections

  // 3. A* on unified graph
  // 4. Convert polygon sequence to point sequence with floor info
  return [];
}

function getFloorConnections(
  multiFloor: MultiFloorNavMesh,
  polygonId: string,
  floor: number
): FloorConnection[] {
  return multiFloor.connections.filter(
    c => (c.fromFloor === floor && c.fromPolygon === polygonId) ||
         (c.toFloor === floor && c.toPolygon === polygonId)
  );
}
```

## 9. Pathfinding Budget

| Metric | Limit | Reason |
|--------|-------|--------|
| Max polygons visited | 1000 | Prevent runaway searches |
| Max time per query | 10ms | Maintain 60fps responsiveness |
| Cache size | 100 paths | Recent paths reused |
| NavMesh rebuild | On scene load | Not per-frame |

### 9.1 Caching

```typescript
interface PathCache {
  paths: Map<string, string[]>;  // key = "startPoly->endPoly"
  maxSize: number;
  version: number;  // incremented on NavMesh change
}

function getCachedPath(
  cache: PathCache,
  startPoly: string,
  endPoly: string,
  currentVersion: number
): string[] | null {
  if (cache.version !== currentVersion) {
    cache.paths.clear();
    cache.version = currentVersion;
    return null;
  }

  return cache.paths.get(`${startPoly}->${endPoly}`) ?? null;
}

function setCachedPath(
  cache: PathCache,
  startPoly: string,
  endPoly: string,
  path: string[]
): void {
  if (cache.paths.size >= cache.maxSize) {
    const firstKey = cache.paths.keys().next().value;
    cache.paths.delete(firstKey);
  }

  cache.paths.set(`${startPoly}->${endPoly}`, path);
}
```

### 9.2 Rebuild Triggers

NavMesh rebuilds when:
- Door opens/closes (adds/removes portal)
- Obstacle placed/removed (modifies walkable area)
- Wall modified (changes polygon geometry)
- Scene loaded (full rebuild)

```typescript
interface NavMeshVersion {
  version: number;
  lastRebuild: number;
  dirtyPolygons: string[];
}

function onDoorToggle(
  navmesh: NavMesh,
  version: NavMeshVersion,
  doorPolygon: string,
  isOpen: boolean
): void {
  // Toggle walkability of door polygon
  const poly = navmesh.polygons.find(p => p.id === doorPolygon);
  if (!poly) return;

  if (isOpen) {
    // Connect polygon's neighbors through door
    connectDoorPortal(navmesh, doorPolygon);
  } else {
    // Remove door portal connections
    disconnectDoorPortal(navmesh, doorPolygon);
  }

  version.version++;
  version.dirtyPolygons.push(doorPolygon);
}
```

## 10. Integration Points

```
Walkable Space → input polygons for NavMesh
Doors → dynamic obstacles that modify NavMesh
Movement Agent → follows path from pathfinding
Scene Graph → wall/door items trigger NavMesh rebuild
```

### 10.1 Walkable Space → NavMesh

```typescript
function buildNavMesh(walkableSpace: WalkableSpace): NavMesh {
  const polygons = triangulateWalkableSpace(walkableSpace.polygons);
  const edges = buildEdges(polygons);
  const portals = buildPortals(edges);

  return { polygons, edges, portals };
}
```

### 10.2 Door Integration

```typescript
interface Door {
  id: string;
  position: Point;
  isOpen: boolean;
  wallSegment: string;
}

function onDoorStateChange(
  navmesh: NavMesh,
  door: Door,
  version: NavMeshVersion
): void {
  // Find polygons affected by door
  const affected = navmesh.polygons.filter(p =>
    sharesEdgeWithDoor(p, door)
  );

  if (door.isOpen) {
    // Merge adjacent polygons through door
    mergePolygonsThroughDoor(navmesh, affected, door);
  } else {
    // Split merged polygon back
    splitPolygonAtDoor(navmesh, affected, door);
  }

  version.version++;
}
```

### 10.3 Movement Agent

```typescript
interface MovementAgent {
  id: string;
  position: Point;
  floor: number;
  path: Point[];
  pathIndex: number;
  speed: number;
}

function updateAgent(agent: MovementAgent, delta: number): void {
  if (agent.pathIndex >= agent.path.length) return;

  const target = agent.path[agent.pathIndex];
  const direction = {
    x: target.x - agent.position.x,
    y: target.y - agent.position.y,
  };
  const dist = Math.sqrt(direction.x ** 2 + direction.y ** 2);

  if (dist < 0.1) {
    agent.pathIndex++;
    return;
  }

  const step = Math.min(agent.speed * delta, dist);
  agent.position.x += (direction.x / dist) * step;
  agent.position.y += (direction.y / dist) * step;
}
```

### 10.4 Scene Graph Triggers

```typescript
function onSceneGraphChange(
  sceneGraph: SceneGraph,
  navmesh: NavMesh,
  version: NavMeshVersion
): void {
  const walls = sceneGraph.getItemsByType('wall');
  const doors = sceneGraph.getItemsByType('door');
  const obstacles = sceneGraph.getItemsByType('obstacle');

  // Check if any wall/door changed since last build
  const changed = [...walls, ...doors, ...obstacles].filter(
    item => item.version > version.lastRebuild
  );

  if (changed.length > 0) {
    rebuildNavMesh(sceneGraph, navmesh, version);
  }
}
```

## Appendix A: Distance Functions

```typescript
function euclideanDistance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function manhattanDistance(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function chebyshevDistance(a: Point, b: Point): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function octileDistance(a: Point, b: Point): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
}
```

## Appendix B: Polygon Utilities

```typescript
function centroid(vertices: Point[]): Point {
  const n = vertices.length;
  return {
    x: vertices.reduce((sum, v) => sum + v.x, 0) / n,
    y: vertices.reduce((sum, v) => sum + v.y, 0) / n,
  };
}

function polygonArea(vertices: Point[]): number {
  let area = 0;
  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }

  return Math.abs(area) / 2;
}

function isConvex(a: Point, b: Point, c: Point): boolean {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 0;
}

function edgeKey(a: Point, b: Point): string {
  const min = a.x < b.x || (a.x === b.x && a.y < b.y) ? a : b;
  const max = a.x < b.x || (a.x === b.x && a.y < b.y) ? b : a;
  return `${min.x},${min.y}-${max.x},${max.y}`;
}

function gridCellVertices(x: number, y: number, size: number): Point[] {
  return [
    { x: x * size, y: y * size },
    { x: (x + 1) * size, y: y * size },
    { x: (x + 1) * size, y: (y + 1) * size },
    { x: x * size, y: (y + 1) * size },
  ];
}

function getWalkableNeighbors(grid: GridMap, x: number, y: number): string[] {
  const neighbors: string[] = [];

  for (const [dx, dy] of eightDirections) {
    const nx = x + dx;
    const ny = y + dy;
    if (grid.inBounds(nx, ny) && grid.isWalkable(nx, ny)) {
      neighbors.push(`cell-${nx}-${ny}`);
    }
  }

  return neighbors;
}
```

## Appendix C: Performance Optimization

| Technique | Impact | When to use |
|-----------|--------|-------------|
| Hierarchical A* | 10x faster for large maps | Maps > 1000 polygons |
| Jump Point Search | 50x faster on uniform grids | Grid-based maps only |
| Flow fields | Best for multi-agent | RTS-style movement |
| Lazy NavMesh | Build only visited areas | Very large open worlds |

```typescript
interface HierarchicalNavMesh {
  clusters: NavCluster[];
  clusterGraph: NavMesh;  // coarse-level graph
  detailMeshes: Map<string, NavMesh>;  // per-cluster fine graphs
}

interface NavCluster {
  id: string;
  polygonIds: string[];
  borders: string[];  // polygons adjacent to other clusters
  center: Point;
}

function aStarHierarchical(
  hnavmesh: HierarchicalNavMesh,
  start: Point,
  end: Point
): Point[] {
  // 1. Coarse search: A* on cluster graph
  // 2. For each cluster transition, refine with detail NavMesh
  // 3. Concatenate refined paths
  return [];
}
```
