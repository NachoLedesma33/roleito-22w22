# MAP-ANALYSIS.md

> Map Analysis Pipeline specification.
>
> Transforms raw map images into semantic scenes with rooms, walls, doors,
> and interactive elements. The map is the source of truth for the 2D scene.
>
> Key differentiator: Owlbear Rodeo treats map images as inert decoration.
> Roleito makes them intelligent — analyzing, interpreting, and exposing
> spatial structure as game-meaningful data.

---

# 1. Overview

```text
Raw Image
    │
    ▼
┌─────────────┐
│  Ingestion  │  Normalize, store
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Grid      │  Detect grid, cell size, origin
│  Detection  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Feature    │  AI vision: walls, doors, rooms, terrain
│  Detection  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Semantic   │  Features → game concepts (entities)
│Interpretation│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Scene     │  Generate Item entities, layers, z-index
│   Graph     │
└──────┬──────┘
       │
       ▼
    Renderer
```

Two entry modes:

1. **DM uploads existing map** — image file goes through the full pipeline
2. **AI generates map** — from natural language description, same pipeline applies

The map is the source of truth for the 2D scene. All spatial queries (fog of war, line of sight, movement) resolve against the map's semantic data, not the raw pixels.

---

# 2. Pipeline Stages

## Stage 1: Image Ingestion

**Input:** Image file (PNG, JPG, WebP)

**Processing:**

- Validate format and dimensions
- Normalize to power-of-2 or standard grid-compatible size
- Strip EXIF data for privacy
- Generate thumbnail for UI

**Output:** Stored image + basic metadata

```typescript
interface IngestedImage {
  id: string;
  campaignId: string;
  originalName: string;
  storagePath: string;       // data/campaigns/{id}/maps/{uuid}.png
  width: number;
  height: number;
  format: 'png' | 'jpg' | 'webp';
  thumbnailPath: string;
  ingestedAt: string;
}
```

**Storage path:**

```text
data/campaigns/{campaign_id}/maps/
    ├── {uuid}.png
    ├── {uuid}-thumb.png
    └── {uuid}.meta.json
```

---

## Stage 2: Grid Detection

**Input:** IngestedImage

**Processing:**

1. Analyze image for repeating line patterns (horizontal + vertical)
2. Calculate pixels-per-cell from detected spacing
3. Determine grid origin (top-left offset)
4. Detect grid type: square, hex, or none

**Algorithm approach:**

```text
1. Convert to grayscale
2. Apply edge detection (Sobel/Canny)
3. Project histogram on X and Y axes
4. Find periodic peaks → cell spacing
5. Calculate origin from first peak alignment
6. If no clear pattern → fallback to 50px/cell
```

**Output:** GridMetadata

```typescript
interface GridMetadata {
  type: 'square' | 'hex' | 'none';
  cellSize: number;           // pixels per cell
  origin: { x: number; y: number };
  offset: { x: number; y: number };
  confidence: number;         // 0-1, how clear the grid is
}
```

**Fallback behavior:**

| Condition | Action |
|-----------|--------|
| Grid detected, high confidence (>0.8) | Use detected values |
| Grid detected, low confidence (<0.8) | Suggest to DM, offer manual override |
| No grid detected | Default 50px/cell, square, DM can adjust |

---

## Stage 3: Feature Detection (AI-Assisted)

**Input:** IngestedImage + GridMetadata

**Processing:**

Send image to vision LLM or local image analysis model. Prompt for structured detection of spatial features.

**Detection targets:**

| Feature | Visual Cues | Output |
|---------|-------------|--------|
| Wall segments | Dark lines, thick borders, consistent width | Line segments with start/end points |
| Door openings | Gaps in walls, arch shapes, different color | Points with width |
| Room regions | Enclosed areas, floor color changes | Polygon outlines |
| Stairs/elevation | Step patterns, shadow gradients | Points with direction |
| Water/lava/special terrain | Color regions, texture changes | Polygons with terrain type |
| Text labels | OCR-detected text | Bounding boxes + text content |
| Objects | Tables, chairs, chests, barrels | Points with object type |

**Output:** FeatureMap

```typescript
interface FeatureMap {
  walls: DetectedWall[];
  doors: DetectedDoor[];
  rooms: DetectedRoom[];
  stairs: DetectedStairs[];
  terrain: DetectedTerrain[];
  labels: DetectedLabel[];
  objects: DetectedObject[];
  confidence: number;
  rawResponse: string;        // raw LLM response for debugging
}

interface DetectedWall {
  start: Point;
  end: Point;
  thickness: number;
  confidence: number;
}

interface DetectedDoor {
  position: Point;
  width: number;
  angle: number;
  confidence: number;
}

interface DetectedRoom {
  vertices: Point[];
  label: string | null;
  confidence: number;
}
```

**Confidence scoring:**

Each detected element carries a confidence score (0-1). The pipeline uses these to:

- Auto-accept features with confidence > 0.8
- Flag features with confidence 0.5-0.8 for DM review
- Discard features with confidence < 0.5 (or keep as suggestions)

---

## Stage 4: Semantic Interpretation

**Input:** FeatureMap + GridMetadata

**Processing:**

Convert geometric primitives into game-meaningful concepts.

**Mapping rules:**

| Detected Feature | Game Concept | Additional Properties |
|------------------|--------------|----------------------|
| Wall segment | Wall entity | height, material, opacity, destructible |
| Door gap | Door entity | open/closed, locked, requires key |
| Room region | Room entity | name, description, terrain type |
| Terrain zone | Terrain type | difficult, blocking, water, lava |
| Stairs | Elevation change | direction (up/down), height |
| Text label | Annotation | text content, associated region |

**Semantic enrichment:**

- Adjacent walls merge into continuous wall chains
- Enclosed wall chains auto-detect room boundaries
- Door positions snap to nearest wall gap
- Room names inherited from labels if detected

**Output:** SemanticScene

```typescript
interface SemanticScene {
  rooms: RoomEntity[];
  walls: WallEntity[];
  doors: DoorEntity[];
  terrain: TerrainEntity[];
  elevation: ElevationEntity[];
  annotations: AnnotationEntity[];
}

interface RoomEntity {
  id: string;
  name: string;
  description: string;
  bounds: Rectangle;
  vertices: Point[];
  terrain: TerrainType;
  connectedDoors: string[];   // door entity IDs
  connectedRooms: string[];   // adjacent room IDs
}

interface WallEntity {
  id: string;
  start: Point;
  end: Point;
  height: number;             // for 3D extrusion
  material: WallMaterial;
  opacity: number;            // 0-1, for glass/ethereal walls
  destructible: boolean;
  roomId: string | null;      // which room this wall belongs to
}

interface DoorEntity {
  id: string;
  position: Point;
  width: number;
  angle: number;
  state: 'open' | 'closed' | 'locked';
  requiresKey: boolean;
  wallId: string;             // which wall this door is in
  roomA: string;              // room on one side
  roomB: string;              // room on other side
}

type TerrainType = 'normal' | 'difficult' | 'water' | 'lava' | 'ice' | 'web' | 'pit';

type WallMaterial = 'stone' | 'wood' | 'metal' | 'glass' | 'ethereal' | 'ice' | 'unknown';
```

**DM review step:**

After semantic interpretation, the DM sees a summary:

```text
Detected: 12 walls, 4 doors, 3 rooms, 1 water zone
Confidence: 87% overall

[Review & Edit]  [Accept All]  [Regenerate]
```

DM can:

- Accept all detected features
- Review each feature individually
- Manually add/remove/modify any feature
- Override confidence thresholds
- Mark features as confirmed (locks them from re-analysis)

---

## Stage 5: Scene Graph Generation

**Input:** SemanticScene + MapMetadata

**Processing:**

Create Item entities for all detected features. Assign layers, z-index, and spatial properties.

**Layer assignment:**

```text
Layer 0: MAP          — background image
Layer 1: TERRAIN      — terrain overlays (water, lava, difficult)
Layer 2: WALL         — wall segments
Layer 3: DOOR         — door objects
Layer 4: OVERLAY      — labels, annotations, markers
Layer 5: TOKEN        — character/NPC tokens (placed at runtime)
Layer 6: EFFECT       — visual effects, lighting
```

**Z-index formula:**

```text
zIndex = layer * 1000 + y_position_pixels
```

This ensures proper rendering order: walls render above terrain, doors above walls, tokens above everything.

**Output:** Scene Graph items

```typescript
interface MapSceneItem {
  id: string;
  type: 'map' | 'wall' | 'door' | 'room' | 'terrain' | 'elevation' | 'annotation';
  layer: number;
  zIndex: number;
  bounds: Rectangle;
  geometry: Point[];          // polygon or line vertices
  metadata: Record<string, unknown>;
  visible: boolean;
  interactive: boolean;
  groupId: string | null;     // groups related items (room + its walls)
}
```

---

# 3. DM-Driven Map Authoring

Beyond the automated pipeline, the DM can manually author map features.

## Brush Tools

```text
┌─────────────────────────────────────────┐
│  [═] Wall Brush   Draw wall segments    │
│  [□] Door Brush   Place doors on walls  │
│  [○] Room Brush   Define room polygons  │
│  [~] Terrain Brush Paint terrain zones  │
│  [T] Text Brush   Place labels          │
│  [×] Erase Brush  Remove features       │
└─────────────────────────────────────────┘
```

## Brush Behavior

**Wall Brush:**

- Click + drag to draw wall segment
- Snaps to grid if grid is enabled
- Creates WallEntity with default properties
- Auto-merges with adjacent walls if endpoints match

**Door Brush:**

- Click on existing wall to place door
- Validates that door is on a wall segment
- Creates DoorEntity linked to that wall
- Splits wall into two segments at door position

**Room Brush:**

- Click vertices to define polygon
- Double-click or close polygon to finalize
- Creates RoomEntity with computed bounds
- Auto-names based on order (Room 1, Room 2, ...) or DM input

**Terrain Brush:**

- Paint terrain zones with selected terrain type
- Supports rectangle and freeform modes
- Creates TerrainEntity with geometry

**Erase Brush:**

- Click on any feature to remove it
- Cascading deletion: removing a wall removes connected doors
- Confirmation prompt for large deletions

## Override Precedence

Manual overrides always take precedence over detected features:

```text
DM manual feature > AI-detected feature > default values
```

When the DM manually draws a wall, the AI-detected wall in the same position is suppressed. If the DM deletes the manual wall, the AI detection can re-emerge.

---

# 4. AI Map Generation

Two modes for AI-assisted map creation.

## Mode A: Image Generation

```text
DM description → AI generates map image → Full analysis pipeline
```

The DM describes the map in natural language:

```text
"A medieval tavern with a main hall, kitchen in the back,
 storage room to the left, and a cellar accessible through
 a trapdoor behind the bar."
```

AI generates:

1. Map image (via image generation model)
2. Suggested metadata (room names, connections)

The generated image then goes through the standard pipeline (Stages 1-5).

## Mode B: Pure Scene Graph

```text
DM description → AI generates Scene Graph directly (no image)
```

AI creates:

1. Room entities with polygon geometry
2. Wall entities connecting rooms
3. Door entities at connection points
4. Terrain annotations

The renderer then draws the map procedurally from the Scene Graph. This mode is useful when:

- DM wants a quick functional map without artwork
- Map will be rendered in 3D directly
- Iteration speed matters more than visual polish

## Mode Selection

| Criteria | Mode A (Image) | Mode B (Scene Graph) |
|----------|----------------|----------------------|
| Visual quality | High (AI art) | Low (procedural) |
| Semantic accuracy | Needs analysis | Direct from AI |
| Iteration speed | Slow (regen image) | Fast (edit graph) |
| 3D compatibility | Needs extrusion | Direct geometry |
| DM artistic control | High | Low |

---

# 5. Map Metadata Schema

## Core Types

```typescript
interface MapMetadata {
  id: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
  grid: GridMetadata;
  rooms: RoomMetadata[];
  walls: WallMetadata[];
  doors: DoorMetadata[];
  terrain: TerrainMetadata[];
  labels: LabelMetadata[];
  analysisConfidence: number;
  analysisVersion: string;
  dmOverrides: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GridMetadata {
  type: 'square' | 'hex' | 'none';
  cellSize: number;
  origin: { x: number; y: number };
  offset: { x: number; y: number };
  confidence: number;
}

interface RoomMetadata {
  id: string;
  name: string;
  bounds: Rectangle;
  vertices: Point[];
  description: string;
  terrain: TerrainType;
  confidence: number;
}

interface WallMetadata {
  id: string;
  start: Point;
  end: Point;
  height: number;
  material: WallMaterial;
  opacity: number;
  destructible: boolean;
  confidence: number;
}

interface DoorMetadata {
  id: string;
  position: Point;
  width: number;
  angle: number;
  state: 'open' | 'closed' | 'locked';
  requiresKey: boolean;
  wallId: string;
  confidence: number;
}

interface TerrainMetadata {
  id: string;
  type: TerrainType;
  vertices: Point[];
  intensity: number;         // 0-1, for partial effects
  confidence: number;
}

interface LabelMetadata {
  id: string;
  text: string;
  position: Point;
  fontSize: number;
  bounds: Rectangle;
  confidence: number;
}

interface Point {
  x: number;
  y: number;
}

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

type TerrainType = 'normal' | 'difficult' | 'water' | 'lava' | 'ice' | 'web' | 'pit';
type WallMaterial = 'stone' | 'wood' | 'metal' | 'glass' | 'ethereal' | 'ice' | 'unknown';
```

## Storage

Map metadata is stored alongside the campaign:

```text
data/campaigns/{campaign_id}/maps/
    ├── {map_id}.png
    ├── {map_id}-thumb.png
    └── {map_id}.meta.json     ← MapMetadata JSON
```

The `.meta.json` file is the canonical source for map analysis results. It is read by the renderer, fog of war system, and line of sight engine.

---

# 6. Integration with World State

## Map in Campaign Data

```text
Campaign
    │
    ├── scenes[]
    │     ├── scene_01
    │     │     ├── mapId → MapMetadata.id
    │     │     ├── tokens[]
    │     │     └── notes
    │     └── scene_02
    │           └── mapId → MapMetadata.id
    │
    └── maps[]
          ├── map_01 → MapMetadata
          └── map_02 → MapMetadata
```

A single map can be referenced by multiple scenes (same dungeon, different encounters).

## Scene Graph Reference

Scene Graph items reference map features by ID:

```typescript
interface SceneGraphItem {
  id: string;
  mapFeatureId: string | null;   // links to WallEntity, RoomEntity, etc.
  type: ItemType;
  layer: number;
  zIndex: number;
  // ...
}
```

This allows the renderer to look up semantic data for any visual element.

## Fog of War Integration

The fog of war system uses room and wall data for masking:

```text
Room boundaries → fog mask polygons
Wall segments   → raycasting barriers
Door states     → passage open/closed
```

When the DM reveals a room, the fog system uses the room's `vertices` polygon to compute the visible area. Wall segments block line of sight. Open doors allow sight to pass through.

See `FOG-OF-WAR.md` for full fog system specification.

## Line of Sight Integration

Wall segments provide the geometry for raycasting:

```text
Character position
      │
      ▼
Raycast in all directions
      │
      ▼
Wall segments block rays
      │
      ▼
Visible polygon computed
      │
      ▼
Apply to fog mask
```

Wall `height` property determines vertical line of sight (important for 3D mode — tall walls block sight over short obstacles).

## 3D Renderer Integration

The 3D renderer uses map metadata for scene construction:

```text
MapMetadata
    │
    ├── Image → textured ground plane
    ├── Walls → extruded 3D geometry (height from WallEntity)
    ├── Doors → animated open/close models
    ├── Rooms → spatial zones for triggers/events
    ├── Terrain → material/color overrides on ground
    └── Elevation → stepped geometry for stairs
```

Wall `material` property maps to 3D materials:

| Material | 3D Appearance |
|----------|---------------|
| stone | Gray, rough texture |
| wood | Brown, plank texture |
| metal | Dark, reflective |
| glass | Transparent, refractive |
| ethereal | Semi-transparent, glowing |
| ice | Blue-white, slightly transparent |

---

# 7. Analysis Versioning

Each analysis run records its version:

```typescript
interface AnalysisRecord {
  mapId: string;
  version: string;            // e.g., "1.0.0", "1.1.0"
  algorithm: string;          // "grid-detect-v1", "vision-llm-v2"
  model: string;              // which LLM/vision model was used
  inputHash: string;          // hash of source image
  outputHash: string;         // hash of analysis result
  confidence: number;
  duration: number;           // ms
  createdAt: string;
}
```

This enables:

- Re-running analysis with improved algorithms
- Comparing results between analysis versions
- Auditing what changed and why
- Rolling back to previous analysis if DM prefers it

---

# 8. Future: Progressive Analysis

## Phase 1 — Manual + Basic Grid (MVP)

- DM uploads image manually
- Basic grid detection (line histogram)
- DM draws all walls/doors/rooms manually
- No AI feature detection

## Phase 2 — AI-Assisted Feature Detection

- Vision LLM analyzes uploaded images
- Auto-detects walls, doors, rooms with confidence scores
- DM reviews and approves/rejects detected features
- Manual brush tools for corrections

## Phase 3 — Full Semantic Understanding

- Multi-pass analysis (structure → details → labels)
- Cross-reference with campaign context (room names from lore)
- Confidence scoring across entire analysis
- Automatic scene graph generation
- Integration with world state for contextual enrichment

## Phase 4 — Real-Time Streaming Analysis

- Progressive upload with live analysis feedback
- Streaming detection results as image uploads
- Incremental scene graph updates
- Real-time DM preview during upload

## Phase 5 — Multi-Map Intelligence

- Cross-map relationship detection (dungeon levels, building floors)
- Automatic connection point identification between maps
- Consistent coordinate systems across campaign maps
- Spatial indexing for campaign-wide queries

---

# 9. Error Handling

| Error | Recovery |
|-------|----------|
| Image format unsupported | Reject with message, suggest conversion |
| Image too large (>20MB) | Reject, suggest compression |
| Grid detection fails | Fallback to 50px default, notify DM |
| Vision LLM unavailable | Queue for retry, allow manual authoring |
| Feature detection low confidence | Flag for DM review, don't auto-accept |
| Analysis timeout | Partial results saved, allow DM to continue |
| Corrupted metadata | Re-run analysis from image |

---

# 10. Performance Considerations

- Grid detection: <100ms for images up to 4096x4096
- Vision LLM analysis: 2-10s depending on model and image size
- Scene graph generation: <500ms
- Total pipeline (without LLM): <1s
- Total pipeline (with LLM): 2-12s

**Optimization strategies:**

- Cache grid detection results (grid doesn't change)
- Lazy-load full analysis — show basic map immediately, refine in background
- Incremental DM updates — don't re-run full analysis on each manual edit
- Thumbnail generation during ingestion for instant UI feedback
