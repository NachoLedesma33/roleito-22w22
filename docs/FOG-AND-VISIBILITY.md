# Fog of War & Visibility System

## 1. Overview

Roleito implements two distinct fog systems that work together to create immersive visibility mechanics:

- **Static Fog**: Persistent map exploration (what has been seen before)
- **Dynamic Fog**: Per-turn Line of Sight visibility (what is currently visible)

Both systems render as a single Fog Layer (`SceneLayer.FOG`) on top of all scene content. GPU-based masking ensures performant rendering even with complex geometries.

The combined visibility is the intersection of static and dynamic fog: an area must be both previously explored (cut) and currently visible (in LoS) to be rendered without fog.

## 2. Static Fog of War

Static Fog manages persistent map exploration. The DM paints reveal/hide regions on the map, and players retain knowledge of explored areas across sessions.

### Area Types

- **Cut (Revealed)**: Permanently visible. No fog rendered. Players have explored this area.
- **Uncut (Unexplored)**: Fog rendered. Blocks player view. Area has never been seen.

### Persistence

Static fog data is stored in campaign data and survives session restarts. Changes are versioned for conflict resolution in multiplayer scenarios.

### DM Tools

| Tool | Description |
|------|-------------|
| Paint Reveal | Freehand brush to cut fog (reveal area) |
| Paint Hide | Freehand brush to uncut fog (re-hide area) |
| Rectangle Select | Select rectangular area to cut/uncut |
| Polygon Lasso | Freeform polygon selection |
| Flood Fill | Fill enclosed room or bounded area |
| Eraser | Remove cut region entirely |
| Clear All | Reset fog to fully uncut state |
| Layer Toggle | Show/hide specific fog layers |
| Preview Mode | Show what players see |

### Layer Support

Multiple fog layers can exist per scene, enabling multi-floor maps. Each layer has independent cut/uncut state and can be toggled independently.

## 3. Dynamic Fog of War

Dynamic Fog provides per-turn visibility based on Line of Sight. Characters have vision ranges and vision types that determine what they can currently see.

### Behavior

- Updates every turn or on character movement
- Integrates with initiative tracker for turn-based resolution
- Real-time updates via WebSocket for multiplayer sync
- DM can override dynamic fog for narrative purposes

### Visibility Calculation

For each character with an active turn:
1. Cast rays from character position to scene boundaries
2. Determine which cells are within vision range
3. Apply vision type modifiers (darkvision, blindsight, etc.)
4. Compute union of all character visibilities for player view

## 4. Line of Sight (LoS)

Line of Sight determines which areas are visible to a character based on position, facing, and obstacles.

### Raycasting

Rays are cast from the character's grid position outward. Rays terminate when:
- They reach the character's maximum vision range
- They encounter a blocking item (Wall, closed Door)
- They exit the scene boundaries

### Blocking Items

| Item | Blocks LoS | Condition |
|------|-----------|-----------|
| Wall | Yes | Always (when `lineOfSight: true`) |
| Door | Yes | When closed |
| Window | No | When transparent/open |
| Token | No | Tokens never block LoS |
| Effect | Configurable | Per-effect setting |

### Vision Types

| Type | Description |
|------|-------------|
| Normal | Standard sight. Blocked by walls and closed doors. |
| Darkvision | Sees in darkness. No color information beyond 60ft. |
| Blindsight | Ignores fog entirely. Sees all non-phantom objects. |
| Tremorsense | Sees through ground contact. Limited by range. |
| Truesight | Sees through illusions, invisibility, and magical darkness. |

## 5. Vision Configuration

Characters define vision through a `VisionConfig` object:

```typescript
interface VisionConfig {
  type: 'normal' | 'darkvision' | 'blindsight' | 'tremorsense' | 'truesight';
  range: number;           // grid cells, 0 = unlimited
  dimRange?: number;       // range where vision is dimmed (half visibility)
  angle?: number;          // cone vision in degrees, 360 = all-around
  direction?: number;      // facing direction in degrees for cone vision
}
```

### Multiple Vision Types

Characters can have multiple vision types. For example, a character might have:
- Normal vision (range: 12, dimRange: 24)
- Darkvision (range: 24)

The effective visibility is the union of all vision types.

### Dim Vision

When `dimRange` is specified, cells between `range` and `dimRange` are visible but dimmed. Dimmed cells:
- Render at reduced brightness
- Do not reveal colors (grayscale rendering)
- Still count as explored for static fog

## 6. Fog Rendering Pipeline

The fog rendering pipeline integrates with the scene graph rendering order:

1. **Terrain Layer** renders ground tiles
2. **Map Layer** renders walls, doors, windows
3. **Token Layer** renders character and object tokens
4. **Effects Layer** renders visual effects
5. **Fog Layer** renders on top of everything

### Fog Layer Steps

1. Create fog geometry = full scene rectangle
2. Subtract cut regions from fog geometry (static mask)
3. Subtract dynamic LoS regions in real-time (dynamic mask)
4. Remaining geometry = visible fog (dark overlay)
5. Apply fog texture/color via WebGL shader
6. Apply edge softening for smooth transitions

### Edge Softening

Fog edges are softened using a gradient falloff. This prevents harsh pixelated borders and creates a natural-looking visibility boundary.

## 7. GPU Fog Masking

Performance-critical fog masking is handled entirely on the GPU.

### Approach

- Fog rendered as a single quad covering the entire scene
- Two mask textures determine visibility:
  - **Cut Mask**: 1-bit per pixel, marks permanently revealed areas
  - **Dynamic Mask**: 1-bit per pixel, marks currently visible areas
- Combined mask = static ∩ dynamic (AND operation)
- Only pixels where both masks are 1 are rendered without fog

### Stencil Buffer Method

1. Render scene normally
2. Write cut mask to stencil buffer
3. Write dynamic mask to stencil buffer (AND with existing)
4. Render fog quad, stencil test passes only where masks are 0
5. Result: fog appears only in unexplored and currently invisible areas

### Shader Method

```glsl
uniform sampler2D uCutMask;      // static fog mask texture
uniform sampler2D uDynamicMask;  // dynamic fog mask texture
uniform vec4 uFogColor;          // fog overlay color
uniform float uEdgeSoftening;    // edge gradient width

void main() {
  vec2 uv = vUv;
  float cut = texture2D(uCutMask, uv).r;
  float dynamic = texture2D(uDynamicMask, uv).r;
  float visible = cut * dynamic;  // intersection

  // Edge softening
  float edge = smoothstep(0.0, uEdgeSoftening, visible);
  float fogAlpha = 1.0 - edge;

  gl_FragColor = vec4(uFogColor.rgb, uFogColor.a * fogAlpha);
}
```

### Performance Characteristics

- Single draw call for entire fog layer
- No per-pixel CPU work
- Mask textures are small (1KB for 100x100 grid at 1-bit per pixel)
- Dynamic mask updates only when LoS changes (not every frame)

## 8. Fog State Schema

### Core Types

```typescript
interface FogState {
  sceneId: string;
  staticFog: StaticFogData;
  dynamicFog: DynamicFogData;
  playerVisibilities: Map<string, PlayerFogState>;
}

interface StaticFogData {
  cutRegions: FogRegion[];    // permanently revealed areas
  version: number;            // for conflict resolution
  lastModified: string;       // ISO timestamp
}

interface DynamicFogData {
  visibleRegions: FogRegion[];  // currently visible
  lastUpdate: string;
  updateTrigger: 'turn_change' | 'movement' | 'ability' | 'dm_override';
}

interface FogRegion {
  id: string;
  type: 'rectangle' | 'polygon' | 'ellipse' | 'flood';
  geometry: Point[];
  cut: boolean;               // true = revealed, false = hidden
  layer?: number;             // for multi-floor scenes
}

interface PlayerFogState {
  playerId: string;
  explored: FogRegion[];      // what they've seen before
  visible: FogRegion[];       // what they see now
  lastSync: string;
}
```

### Point Type

```typescript
interface Point {
  x: number;
  y: number;
}
```

### Region Operations

Fog regions support standard geometric operations:
- **Union**: combine two regions
- **Intersection**: find overlapping area
- **Difference**: subtract one region from another
- **XOR**: areas in one or the other but not both

## 9. DM Fog Tools

### Paint Reveal

Freehand brush tool. DM clicks and drags to cut fog along the cursor path. Brush size is configurable. Creates a polygon region matching the painted path.

### Paint Hide

Inverse of Paint Reveal. Freehand brush to uncut fog (re-hide area). Useful for correcting accidental reveals or creating dynamic fog effects.

### Rectangle Select

Click and drag to define a rectangular region. On release, choose to cut or uncut the selection. Shift-click adds to existing selection.

### Polygon Lasso

Click to place vertices. Double-click or close polygon to complete selection. Supports undo of last vertex. On completion, choose to cut or uncut.

### Flood Fill

Click within an enclosed area to fill the entire bounded region. Uses room metadata for accurate boundary detection. Configurable tolerance for imperfect boundaries.

### Eraser

Remove an existing cut region entirely. Click on a cut region to delete it, making the area uncut again. Does not affect other overlapping regions.

### Clear All

Reset entire scene fog to fully uncut state. Requires confirmation dialog. Cannot be undone.

### Layer Toggle

Toggle visibility of individual fog layers. Useful for multi-floor maps where DM needs to manage visibility per floor independently.

### Preview Mode

Toggle to show exactly what players see. Hides DM-only information and renders fog from player perspective. Updates in real-time as DM paints.

## 10. Player Fog Experience

### Visibility States

Players see three distinct states:

1. **Explored (Dimmed)**: Areas previously seen but not currently visible. Rendered at reduced brightness with fog overlay.
2. **Currently Visible (Full)**: Areas within active LoS. Rendered at full brightness, no fog.
3. **Unexplored (Black)**: Areas never seen. Completely black or fogged. No information visible.

### Transitions

- **Fade In**: Smooth 0.3s fade when area becomes visible. Prevents jarring pop-in.
- **Fade Out**: Smooth 0.5s fade when area leaves LoS. Gradual transition to dimmed state.
- **Edge Dissolve**: Soft gradient at fog boundary for natural appearance.

### Audio Feedback

Optional sound cues when new areas are revealed:
- Subtle ambient shift when entering new room
- Discovery chime for significant locations
- Configurable volume and enable/disable per player

### Minimap Integration

Explored areas are shown on the player minimap:
- Currently visible: full color
- Explored but not visible: grayscale
- Unexplored: black
- Minimap updates in real-time with LoS changes

## 11. Multiplayer Sync

### Protocol

DM fog changes broadcast via WebSocket to all connected players. Players receive only their visible state, never raw fog data.

### Message Types

```typescript
// DM -> Server
interface FogUpdateMessage {
  type: 'fog_update';
  sceneId: string;
  regions: FogRegion[];
  operation: 'cut' | 'uncut' | 'clear';
}

// Server -> Player
interface PlayerFogSyncMessage {
  type: 'fog_sync';
  sceneId: string;
  explored: FogRegion[];
  visible: FogRegion[];
  version: number;
}
```

### Conflict Resolution

- DM changes always win (DM has final authority)
- Version numbers track changes for merge resolution
- Stale updates rejected based on version comparison
- Players cannot modify fog (read-only)

### Offline Handling

- Fog state cached locally for offline players
- On reconnect, full sync from server
- Incremental updates for missed changes
- Version check ensures consistency

## 12. Performance Considerations

### Fog Mask Texture

- 1-bit per pixel
- 100x100 grid = 1,250 bytes (1KB)
- 200x200 grid = 5,000 bytes (5KB)
- 500x500 grid = 31,250 bytes (31KB)
- Texture updates are infrequent (only on LoS change)

### GPU Masking

- Single draw call for entire fog layer
- No per-pixel CPU calculations
- Stencil buffer operations are hardware-accelerated
- Shader-based masking scales with GPU, not CPU

### Raycasting Budget

- Dynamic LoS raycasting runs in Web Worker
- Maximum 50 rays per character per turn
- Rays are cast to scene edges, not individual cells
- Results cached until next LoS update

### Update Throttling

- Fog updates throttled to 30fps maximum
- Rapid movement does not cause excessive updates
- Batch updates for multiple simultaneous LoS changes
- Debounced DM paint operations

### Memory

- Fog regions stored as polygon point arrays
- Cut mask textures are small and compressed
- Dynamic mask regenerated each LoS update (not accumulated)
- Old fog data garbage collected when scenes unload

## 13. Integration with Scene Graph

### Scene Layer Position

Fog occupies `SceneLayer.FOG` (value 6), rendered last in the scene layer stack:

```
0: TERRAIN        — ground textures, water, lava
1: MAP            — static map image elements
2: EFFECTS_BELOW  — effects rendered below tokens
3: TOKENS         — character/creature tokens
4: EFFECTS_ABOVE  — effects rendered above tokens
5: OVERLAY        — UI overlays, labels, annotations
6: FOG            — fog of war (rendered last, masks everything below)
```

> Canonical source: `SCENE-GRAPH.md` §3.

### Item Dependencies

Fog system reads from scene items:
- **Wall items** with `lineOfSight: true` block LoS raycasting
- **Door items** block LoS when in closed state
- **Window items** pass LoS when in transparent state
- **Room metadata** used for flood fill boundary detection

### Map Metadata

- Grid cell size determines fog mask resolution
- Scene bounds determine fog quad dimensions
- Grid offset aligns fog mask to terrain tiles

### Event Integration

Fog responds to scene events:
- `item.placed`: update LoS blocking geometry
- `item.removed`: update LoS blocking geometry
- `item.state_changed`: recalculate LoS for doors/windows
- `token.moved`: trigger dynamic fog update
- `turn.changed`: recalculate all visibilities
- `fog.painted`: update static fog mask

## 14. API Endpoints

### Static Fog

```
GET    /api/scenes/:sceneId/fog              - Get fog state
PUT    /api/scenes/:sceneId/fog              - Update fog regions
DELETE /api/scenes/:sceneId/fog              - Clear all fog
POST   /api/scenes/:sceneId/fog/paint        - Paint fog region
```

### Dynamic Fog

```
GET    /api/scenes/:sceneId/fog/dynamic      - Get current visibilities
POST   /api/scenes/:sceneId/fog/recalculate  - Force LoS recalculation
```

### Player Fog

```
GET    /api/players/:playerId/fog/:sceneId   - Get player fog state
PUT    /api/players/:playerId/fog/:sceneId   - Update player exploration
```

## 15. Configuration

```typescript
interface FogConfig {
  enabled: boolean;
  defaultFogColor: string;        // hex color, default: '#000000'
  defaultFogOpacity: number;      // 0-1, default: 0.85
  edgeSoftening: number;          // pixels, default: 2
  fadeSpeed: number;              // seconds, default: 0.3
  maxRaycastingBudget: number;    // rays per turn, default: 50
  updateThrottleMs: number;       // milliseconds, default: 33 (30fps)
  enableAudioCues: boolean;       // default: true
  enableMinimapFog: boolean;      // default: true
  maskResolution: 'grid' | 'half' | 'quarter';  // default: 'grid'
}
```

## 16. Accessibility

- High contrast mode: brighter fog edges for visibility
- Screen reader announcements when new areas revealed
- Keyboard shortcuts for all DM fog tools
- Reduced motion option disables fade animations
- Colorblind mode uses patterns instead of colors for dim/bright distinction

---

## 17. Current Implementation Status

Fog of War is **not yet implemented**. The current codebase has no fog system:

| Existing Code | Fog System Equivalent | Notes |
|---------------|----------------------|-------|
| `SceneCharacter.visible` (boolean) | Per-item visibility | Current: simple show/hide. New: per-player fog state. |
| `SceneRenderer` (SceneRenderer.tsx) | SceneCanvas | No fog layer exists. |
| `Scene.lighting` (string) | Lighting affects fog zones | Current: 5 presets. New: data-driven light sources. |

### What Does NOT Exist Yet

- `FogState`, `StaticFogData`, `DynamicFogData` — no fog data model
- `FogRegion` — no fog region geometry
- `VisionConfig` — no character vision types
- Fog rendering — no fog layer in SceneRenderer
- DM fog tools — no paint/erase/flood fill
- Per-player fog state — no per-player explored/visible tracking
- GPU fog masking — no stencil buffer or fog shader
- Line of Sight raycasting — see `WALLS-AND-LINE-OF-SIGHT.md`

### Dependency Chain

Fog of War requires:
1. **Scene Graph** (SCENE-GRAPH.md) — fog is a SceneLayer
2. **Walls & Doors** (WALLS-AND-LINE-OF-SIGHT.md) — walls block LoS for dynamic fog
3. **Lighting** (LIGHTING-SYSTEM.md) — light zones affect visibility
