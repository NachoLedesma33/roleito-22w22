# LIGHTING-SYSTEM.md

> Dynamic lighting system for atmospheric RPG scenes.
>
> Light sources placed by DM or attached to tokens.
> Walls block light propagation. Light affects visibility and fog.
> Integration with vision system (darkvision sees in dark).
>
> This system is part of the Renderer layer.
> It does NOT create canon. It represents state.

---

# 1. Overview

The Lighting System provides dynamic, real-time illumination for game scenes.

Core principles:

- Light sources are placed by DM or attached to tokens
- Walls block light propagation
- Light affects visibility zones (bright / dim / dark)
- Light integrates with the vision system (darkvision, blindsight, etc.)
- Light color and intensity are configurable per source
- Darkness overlay affects all light globally
- Ambient light sets base illumination for the scene

```text
Light Source
    │
    ├── Propagation (ray casting, falloff)
    │
    ├── Wall Occlusion (solid blocks, glass reduces)
    │
    ├── Zone Calculation (bright / dim / dark)
    │
    ├── Vision Integration (darkvision, blindsight)
    │
    └── Rendering (color modification, glow effects)
```

---

# 2. Light Source Entity

Every light source in the scene is represented by this interface.

```typescript
interface LightSource {
  id: string;
  name: string;
  type: 'point' | 'cone' | 'line' | 'ambient';

  // Position
  x: number;
  y: number;
  rotation?: number;       // for cone/line lights

  // Properties
  color: string;           // hex color
  intensity: number;       // 0-1
  range: number;           // grid cells
  dimRange?: number;       // range where light is dimmed

  // Cone/Line specific
  angle?: number;          // degrees (cone) or 0 (line)
  direction?: number;      // facing direction

  // Behavior
  flicker?: FlickerConfig;
  pulse?: PulseConfig;

  // Attachment
  attachedTo?: string;     // Item ID (token)
  inheritPosition: boolean;

  // Visibility
  visible: boolean;        // visible to players
  blockedByWalls: boolean;
}
```

### FlickerConfig

```typescript
interface FlickerConfig {
  speed: number;       // cycles per second
  variance: number;    // intensity variation (0-1)
  enabled: boolean;
}
```

### PulseConfig

```typescript
interface PulseConfig {
  speed: number;       // cycles per second
  variance: number;    // intensity variation (0-1)
  enabled: boolean;
}
```

---

# 3. Light Types

### Point Light

Emits in all directions from a single position. Circular range.

Use cases: torch, lantern, campfire, magic orb, player flashlight.

```typescript
const torch: LightSource = {
  id: 'torch-01',
  name: 'Torch',
  type: 'point',
  x: 5,
  y: 3,
  color: '#FF6600',
  intensity: 0.8,
  range: 4,
  dimRange: 2,
  visible: true,
  blockedByWalls: true,
  inheritPosition: false,
};
```

### Cone Light

Emits in a cone from the source position. Configurable angle and direction.

Use cases: flashlight, headlights, dragon breath illumination, searchlight.

```typescript
const flashlight: LightSource = {
  id: 'flashlight-01',
  name: 'Flashlight',
  type: 'cone',
  x: 10,
  y: 5,
  rotation: 0,
  color: '#FFFFFF',
  intensity: 0.9,
  range: 8,
  angle: 60,
  direction: 0,
  visible: true,
  blockedByWalls: true,
  inheritPosition: false,
};
```

### Line Light

Emits along a line from the source position. Used for lights attached to walls.

Use cases: wall-mounted torch, fluorescent tube, magical beam.

```typescript
const wallTorch: LightSource = {
  id: 'wall-torch-01',
  name: 'Wall Torch',
  type: 'line',
  x: 0,
  y: 5,
  rotation: 90,
  color: '#FF8800',
  intensity: 0.7,
  range: 6,
  visible: true,
  blockedByWalls: true,
  inheritPosition: false,
};
```

### Ambient Light

Fills the entire scene with base illumination. Not affected by walls.

Use cases: daylight, moonlight, magical aura, underwater blue tint.

```typescript
const daylight: LightSource = {
  id: 'daylight-01',
  name: 'Daylight',
  type: 'ambient',
  x: 0,
  y: 0,
  color: '#FFFFFF',
  intensity: 1.0,
  range: 0,
  visible: true,
  blockedByWalls: false,
  inheritPosition: false,
};
```

---

# 4. Light Zones

Three visibility zones based on accumulated light level per cell.

### Bright Zone

- Light level > 0.5
- Full illumination
- Normal vision applies
- Advantage on Perception checks that rely on sight

### Dim Zone

- Light level 0.1 - 0.5
- Half illumination
- Disadvantage on Perception checks that rely on sight
- Darkvision required to see clearly
- Shadows obscure details

### Dark Zone

- Light level < 0.1
- No illumination
- Blindness without darkvision
- Cannot see anything without darkvision or other sense

```text
Light Level    Zone       Effect
─────────────────────────────────────────────
> 0.5         Bright     Normal vision, advantage on sight Perception
0.1 - 0.5     Dim        Disadvantage on sight Perception, darkvision needed
< 0.1         Dark       Blindness without darkvision
```

---

# 5. Light Propagation Algorithm

The lighting system computes light levels for every cell on the grid.

### Step-by-step

1. Start from each light source position
2. For each cell within the source range:
   a. Cast a ray from source position to cell center
   b. Check ray intersection with all wall segments
   c. If ray is blocked by a wall: cell is not lit by this source
   d. If ray passes: cell is lit, intensity = falloff(distance)
3. Combine all light sources for each cell (additive)
4. Apply ambient light as base illumination
5. Apply darkness overlay as reduction
6. Determine zone: bright (>0.5), dim (0.1-0.5), dark (<0.1)

### Cone/Line Light Propagation

For cone lights, only cells within the cone angle are considered.

For line lights, propagation is restricted to cells along the line direction.

### Pseudocode

```typescript
function computeLightMap(
  sources: LightSource[],
  walls: Wall[],
  ambientLight: number,
  darknessOverlay: number,
  gridSize: { width: number; height: number }
): LightZone[][] {
  const lightMap: number[][] = Array.from(
    { length: gridSize.height },
    () => Array(gridSize.width).fill(0)
  );

  for (const source of sources) {
    if (!source.visible) continue;
    if (source.type === 'ambient') {
      addToAllCells(lightMap, source.intensity);
      continue;
    }

    for (let y = 0; y < gridSize.height; y++) {
      for (let x = 0; x < gridSize.width; x++) {
        const distance = euclideanDistance(source.x, source.y, x, y);
        if (distance > source.range) continue;

        if (source.type === 'cone') {
          if (!isWithinCone(source, x, y)) continue;
        }

        if (source.type === 'line') {
          if (!isAlongLine(source, x, y)) continue;
        }

        if (source.blockedByWalls && rayBlockedByWall(source, { x, y }, walls)) {
          continue;
        }

        const intensity = computeFalloff(distance, source.range, source.dimRange);
        lightMap[y][x] += source.intensity * intensity;
      }
    }
  }

  applyAmbientLight(lightMap, ambientLight);
  applyDarknessOverlay(lightMap, darknessOverlay);
  return classifyZones(lightMap);
}
```

---

# 6. Light Falloff

Intensity decreases with distance from the source.

### Linear Falloff

```text
intensity = 1 - (distance / range)
```

Simple and predictable. Good for torches and lanterns.

### Inverse Square Falloff

```text
intensity = 1 / (distance^2 + 1)
```

More realistic light decay. Good for bright point sources.

### Dim Range

If `dimRange` is set:

- From 0 to `dimRange`: light is at full intensity
- From `dimRange` to `range`: light fades from full to 0

This creates a sharp inner circle with a soft outer edge.

```text
Distance        Intensity (no dimRange)    Intensity (dimRange = 2)
──────────────────────────────────────────────────────────────────────
0               1.0                        1.0
1               0.75                       1.0
2               0.50                       1.0  ← dimRange boundary
3               0.25                       0.5
4               0.00                       0.0  ← range boundary
```

### Configuration per Light Source

```typescript
interface LightSource {
  falloffType: 'linear' | 'inverseSquare';
  range: number;
  dimRange?: number;
}
```

---

# 7. Wall Light Interaction

Walls affect light propagation based on their type.

### Solid Walls

- Block light completely
- No light passes through
- Creates sharp shadows

### Open Doors

- Light passes through freely
- Treated as empty space

### Closed Doors

- Block light completely
- Same as solid walls

### Windows

- Light passes through
- Reduced by opacity (0-1)
- Example: stained glass reduces light by 50%

### Glass Walls

- Light passes through
- Reduced by opacity
- Partial transparency

```text
Wall Type        Light Behavior
─────────────────────────────────────────────
Solid Wall       Block completely
Open Door        Pass freely
Closed Door      Block completely
Window           Pass with opacity reduction
Glass Wall       Pass with opacity reduction
```

### Wall Opacity

```typescript
interface Wall {
  id: string;
  type: 'solid' | 'door' | 'window' | 'glass';
  opacity: number;  // 0 = fully transparent, 1 = fully opaque
  isOpen: boolean;  // for doors only
}
```

---

# 8. Scene Lighting Schema

Scene-level lighting configuration.

```typescript
interface SceneLighting {
  ambientLight: number;      // 0-1, base illumination
  ambientColor: string;      // hex, tint of ambient light
  darknessOverlay: number;   // 0-1, additional darkness applied on top
  lightSources: LightSource[];
  lastModified: string;
}
```

### Ambient Light

Base illumination for the entire scene. Affects all cells equally.

- `0.0`: pitch black (no base light)
- `0.3`: dim interior
- `0.6`: well-lit room
- `1.0`: full daylight

### Ambient Color

Tint applied to ambient light. Useful for atmosphere.

```text
Scene              Ambient Color    Effect
─────────────────────────────────────────────
Sunny field        #FFFFFF          Neutral daylight
Underwater         #0066AA          Blue tint
Blood ritual       #AA0000          Red tint
Forest at dusk     #FF8800          Warm orange
Ice cave          #CCDDFF          Cold blue
```

### Darkness Overlay

Additional darkness applied after all light calculations.

- `0.0`: no overlay
- `0.5`: moderate darkness (dungeon atmosphere)
- `1.0`: total darkness (overrides all light)

Useful for DM to quickly darken a scene without removing lights.

---

# 9. DM Lighting Tools

The DM control panel provides tools for managing scene lighting.

### Add Light

Place a new light source at the cursor position on the map.

- Select light type (point, cone, line)
- Choose from preset library or create custom
- Click on map to place

### Attach to Token

Drag a light source onto a token to attach it.

- Light position follows token movement
- Light can be detached at any time
- Multiple lights can attach to one token

### Adjust Properties

Select a light source to modify:

- Color picker for light color
- Intensity slider (0-1)
- Range slider (1-20 grid cells)
- Dim range slider (optional)
- Cone angle slider (cone lights)
- Direction dial (cone/line lights)

### Flicker Toggle

Enable or disable flickering animation.

- Speed: cycles per second (0.1 - 2.0)
- Variance: intensity variation (0 - 0.5)

### Pulse Toggle

Enable or disable pulsing animation.

- Speed: cycles per second (0.1 - 2.0)
- Variance: intensity variation (0 - 0.5)

### Copy/Paste

Duplicate a light source with all its settings.

- Select light source
- Copy (Ctrl+C)
- Paste (Ctrl+V) to create clone at new position

### Delete

Remove a light source from the scene.

- Select light source
- Press Delete or click Remove button
- Confirmation for attached lights

### Preset Library

Quick-access library of common light sources.

```text
Preset         Type      Color       Intensity  Range  Flicker
─────────────────────────────────────────────────────────────────
Torch          point     #FF6600     0.8        4      yes
Lantern        point     #FFCC00     0.6        6      no
Campfire       point     #FF3300     1.0        8      yes
Magic          point     #00CCFF     0.7        5      no (pulse)
Daylight       ambient   #FFFFFF     1.0        0      no
Moonlight      ambient   #CCDDFF     0.3        0      no
Candle         point     #FFAA00     0.3        2      yes
Holy Glow      point     #FFFFCC     0.9        5      no (pulse)
Darkness       ambient   #000000     0.0        0      no
```

---

# 10. Light Presets

```typescript
const LIGHT_PRESETS: Record<string, Partial<LightSource>> = {
  torch: {
    type: 'point',
    color: '#FF6600',
    intensity: 0.8,
    range: 4,
    dimRange: 2,
    flicker: { speed: 0.3, variance: 0.1, enabled: true },
  },
  lantern: {
    type: 'point',
    color: '#FFCC00',
    intensity: 0.6,
    range: 6,
    dimRange: 3,
    flicker: { speed: 0.1, variance: 0.05, enabled: true },
  },
  campfire: {
    type: 'point',
    color: '#FF3300',
    intensity: 1.0,
    range: 8,
    dimRange: 4,
    flicker: { speed: 0.5, variance: 0.2, enabled: true },
  },
  magic: {
    type: 'point',
    color: '#00CCFF',
    intensity: 0.7,
    range: 5,
    dimRange: 3,
    pulse: { speed: 1.0, variance: 0.3, enabled: true },
  },
  candle: {
    type: 'point',
    color: '#FFAA00',
    intensity: 0.3,
    range: 2,
    dimRange: 1,
    flicker: { speed: 0.4, variance: 0.15, enabled: true },
  },
  daylight: {
    type: 'ambient',
    color: '#FFFFFF',
    intensity: 1.0,
    range: 0,
    blockedByWalls: false,
  },
  moonlight: {
    type: 'ambient',
    color: '#CCDDFF',
    intensity: 0.3,
    range: 0,
    blockedByWalls: false,
  },
  holyGlow: {
    type: 'point',
    color: '#FFFFCC',
    intensity: 0.9,
    range: 5,
    dimRange: 3,
    pulse: { speed: 0.5, variance: 0.1, enabled: true },
  },
  darkness: {
    type: 'ambient',
    color: '#000000',
    intensity: 0.0,
    range: 0,
    blockedByWalls: false,
  },
};
```

---

# 11. Lighting Rendering Pipeline

The lighting system integrates into the main render loop.

### Pipeline Steps

1. **Scene renders all layers**: terrain → map → tokens → effects
2. **Lighting pass**: for each pixel, calculate total accumulated light
3. **Apply light zones as color modification**:
   - Bright: full color, no modification
   - Dim: desaturated, darker (multiply by 0.5)
   - Dark: black overlay (multiply by 0.05)
4. **Apply flicker/pulse animations**: modulate intensity over time
5. **Render light source visuals**: glow sprites, particle effects

### Color Modification

```text
Zone      Color Operation
──────────────────────────────────
Bright    result = originalColor
Dim       result = desaturate(originalColor) * 0.5
Dark      result = originalColor * 0.05
```

### Light Source Visual Effects

Each light source renders visual indicators:

- **Point light**: circular glow sprite, soft edges
- **Cone light**: triangular glow, directional
- **Line light**: elongated glow along direction
- **Ambient light**: no visual indicator (affects entire scene)

### Animation

Flicker and pulse animations modulate intensity per frame:

```typescript
function animateLight(source: LightSource, time: number): number {
  let modulation = 1.0;

  if (source.flicker?.enabled) {
    const noise = Math.sin(time * source.flicker.speed * Math.PI * 2);
    modulation += noise * source.flicker.variance;
  }

  if (source.pulse?.enabled) {
    const wave = Math.sin(time * source.pulse.speed * Math.PI * 2);
    modulation += wave * source.pulse.variance;
  }

  return Math.max(0, Math.min(1, modulation));
}
```

---

# 12. Integration with Vision System

Light zones affect characters differently based on their vision type.

### Normal Vision

- Affected by all light zones
- Bright: normal sight
- Dim: disadvantage on sight-based Perception
- Dark: blind (cannot see)

### Darkvision

- Sees in color in bright light
- Sees in grayscale in dim light (treated as bright)
- Sees in grayscale in dark (treated as dim)
- Range: typically 60 feet (12 grid cells)

```text
Zone      Normal Vision        Darkvision
──────────────────────────────────────────────────
Bright    Full color, clear    Full color, clear
Dim       Grayscale,模糊       Grayscale, clear (treated as bright)
Dark      Blind                Grayscale,模糊 (treated as dim)
```

### Blindsight

- Ignores lighting entirely
- perceives through non-visual senses
- Works in all zones

### Tremorsense

- Ignores lighting entirely
- Detects vibrations through ground
- Works in all zones

### Truesight

- Ignores lighting entirely
- Sees through illusions
- Sees into Ethereal Plane
- Works in all zones

### Vision Integration

```typescript
function canSee(
  character: Character,
  cell: { x: number; y: number },
  lightZone: LightZone
): boolean {
  if (character.senses.blindsight) return true;
  if (character.senses.tremorsense) return true;
  if (character.senses.truesight) return true;

  if (character.senses.darkvision) {
    return lightZone !== 'dark' || character.senses.darkvision >= distanceToSource;
  }

  return lightZone === 'bright' || lightZone === 'dim';
}
```

---

# 13. Performance Considerations

### Computational Cost

Light propagation is the most expensive lighting operation.

- Ray casting for wall occlusion: O(sources × cells × walls)
- Light level accumulation: O(sources × cells)
- Zone classification: O(cells)

### Optimization Strategies

**GPU-computed light maps**: Light propagation runs in a fragment shader.

- Each pixel computes its own light level
- Parallel computation across all cells
- Ray marching for wall intersection

**Web Worker ray casting**: Wall occlusion computed off main thread.

- Prevents frame drops during light map updates
- Results posted back to main thread

**Light map caching**: Cached and invalidated on change.

- Cache key: hash of (light sources, walls, ambient, darkness)
- Invalidated when any light source moves/changes
- Invalidated when walls change (door open/close)

### Limits

```text
Parameter                    Limit
──────────────────────────────────────
Max light sources per scene  64
Max light range              20 grid cells
Light update frequency       30 fps
Light map resolution         1 cell per pixel
```

### Throttling

Light map updates are throttled to 30fps to prevent excessive computation.

- DM adjusts light: immediate visual feedback (preview)
- Propagation calculation: throttled to 30fps
- Full light map update: on wall/door changes

---

# 14. Data Persistence

Light sources are stored as part of scene data.

### Database Schema

```sql
CREATE TABLE light_sources (
  id TEXT PRIMARY KEY,
  scene_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,           -- point, cone, line, ambient
  x REAL NOT NULL,
  y REAL NOT NULL,
  rotation REAL,
  color TEXT NOT NULL,
  intensity REAL NOT NULL,
  range REAL NOT NULL,
  dim_range REAL,
  angle REAL,
  direction REAL,
  flicker_config TEXT,          -- JSON
  pulse_config TEXT,            -- JSON
  attached_to TEXT,             -- token ID
  inherit_position BOOLEAN DEFAULT FALSE,
  visible BOOLEAN DEFAULT TRUE,
  blocked_by_walls BOOLEAN DEFAULT TRUE,
  falloff_type TEXT DEFAULT 'linear',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (scene_id) REFERENCES scenes(id)
);
```

### Scene Lighting Config

```sql
CREATE TABLE scene_lighting (
  scene_id TEXT PRIMARY KEY,
  ambient_light REAL DEFAULT 0.3,
  ambient_color TEXT DEFAULT '#FFFFFF',
  darkness_overlay REAL DEFAULT 0.0,
  last_modified TEXT NOT NULL,
  FOREIGN KEY (scene_id) REFERENCES scenes(id)
);
```

---

# 15. Integration Points

The lighting system connects to multiple subsystems.

### Scene Graph

LightSource entities are part of the world state.

```text
WorldState
    └── Scenes[]
         └── Scene
              ├── Terrain
              ├── Walls[]
              ├── Tokens[]
              ├── LightSources[]    ← Lighting System
              ├── Effects[]
              └── Audio[]
```

### Walls

Wall segments are used for light occlusion calculations.

```text
LightSource → Ray Cast → Wall Segments → Occlusion Test → Cell Light Level
```

### Fog of War

Light affects visibility zones in the fog of war system.

```text
Light Zones → Visibility Calculation → Fog of War Overlay
```

- Bright zones: fully visible
- Dim zones: partially visible (explored state)
- Dark zones: hidden (unless darkvision)

### 3D Renderer

Light sources map to Three.js light objects.

```text
LightSource (2D) → Three.js Light (3D)
  point   → PointLight
  cone    → SpotLight
  line    → SpotLight (narrow angle)
  ambient → AmbientLight
```

### AI Director

The AI Director can modify lighting for atmosphere.

```text
AI Director
    │
    ├── Propose lighting change (via Event System)
    │
    └── DM approves/rejects
```

Examples:

- "Dim the lights as the party enters the crypt"
- "Bright flash when the spell is cast"
- "Flickering torches in the haunted hallway"

### Audio System

Light changes can trigger ambient sounds.

```text
Light Change Event
    │
    ├── Torch lit → crackling fire sound
    ├── Lights out → silence, then eerie wind
    ├── Magic glow → humming, shimmering sound
    └── Campfire → crackling, wildlife sounds
```

### Event System

All lighting changes go through the event system.

```typescript
interface LightingEvent {
  type: 'ADD_LIGHT' | 'REMOVE_LIGHT' | 'MOVE_LIGHT' | 'UPDATE_LIGHT' | 'SET_AMBIENT' | 'SET_DARKNESS';
  payload: {
    lightId?: string;
    sceneId: string;
    data?: Partial<LightSource>;
    ambientLight?: number;
    darknessOverlay?: number;
  };
  timestamp: string;
  source: 'dm' | 'ai' | 'system';
}
```

---

# 16. API Endpoints

Lighting management endpoints on the FastAPI backend.

```typescript
// Get scene lighting config
GET /api/scenes/:sceneId/lighting

// Update scene lighting config
PUT /api/scenes/:sceneId/lighting
Body: { ambientLight, ambientColor, darknessOverlay }

// Add light source
POST /api/scenes/:sceneId/lights
Body: LightSource

// Update light source
PUT /api/scenes/:sceneId/lights/:lightId
Body: Partial<LightSource>

// Delete light source
DELETE /api/scenes/:sceneId/lights/:lightId

// Get light presets
GET /api/presets/lights
```

---

# 17. DM Dashboard UI

The lighting controls in the DM dashboard.

```text
┌─────────────────────────────────────────────┐
│  LIGHTING PANEL                             │
├─────────────────────────────────────────────┤
│                                             │
│  Ambient Light    [====|----] 0.4           │
│  Ambient Color    [#FFFFFF] [Pick]          │
│  Darkness Overlay [----|----] 0.0           │
│                                             │
│  ─── Light Sources ────────────────────     │
│                                             │
│  [+] Add Light                              │
│                                             │
│  ☐ Torch #1      point   [Edit] [Del]      │
│  ☐ Lantern #1    point   [Edit] [Del]      │
│  ☐ Campfire      point   [Edit] [Del]      │
│                                             │
│  ─── Presets ──────────────────────────     │
│                                             │
│  [Torch] [Lantern] [Campfire] [Magic]       │
│  [Candle] [Daylight] [Moonlight]            │
│                                             │
│  ─── Selected: Torch #1 ──────────────     │
│                                             │
│  Color       [#FF6600] [Pick]               │
│  Intensity   [====----] 0.8                 │
│  Range       [==------] 4 cells             │
│  Dim Range   [=-------] 2 cells             │
│  Flicker     [ON] Speed: 0.3 Var: 0.1      │
│  Pulse       [OFF]                          │
│  Attach to   [Select Token...]              │
│  Visible     [☑]                            │
│  Block Walls [☑]                            │
│                                             │
└─────────────────────────────────────────────┘
```

---

# 18. Event Flow

Complete event flow for a lighting change.

```text
DM Action
    │
    ├── Click "Add Light" in dashboard
    │
    ├── Select preset (torch)
    │
    ├── Click on map at position (5, 3)
    │
    ├── Frontend creates LightSource object
    │
    ├── Frontend emits: ADD_LIGHT event
    │
    ├── Backend receives event
    │
    ├── Backend validates: light count < 64, position in bounds
    │
    ├── Backend persists to database
    │
    ├── Backend emits: STATE_CHANGED event
    │
    ├── Frontend receives STATE_CHANGED
    │
    ├── Frontend recomputes light map
    │
    ├── Frontend re-renders scene with new lighting
    │
    └── Players see updated lighting (if visible)
```

---

# 19. Testing

### Unit Tests

- Light propagation with no walls
- Light propagation with single wall
- Light propagation with multiple walls
- Light falloff functions (linear, inverse square)
- Zone classification (bright, dim, dark)
- Cone/line light angle calculations
- Flicker/pulse animation math

### Integration Tests

- Add light source → light map updates
- Remove light source → light map updates
- Move light source → light map updates
- Open/close door → light map updates
- Token movement with attached light → light follows
- Ambient light change → scene brightness changes
- Darkness overlay → all lights dimmed

### Visual Tests

- Torch produces correct circular glow
- Campfire flickers visually
- Cone light shows correct angle
- Dim zone shows desaturated colors
- Dark zone shows near-black
- Multiple overlapping lights blend additively

### Performance Tests

- 64 light sources render at 30fps
- Light map recomputation < 16ms
- Door open/close triggers light update < 50ms
- No frame drops during DM light adjustment

---

# 20. See Also

> See also: `SCENE-GRAPH.md` for Item system definition and light source storage.
> See also: `WALLS-AND-LINE-OF-SIGHT.md` for wall intersection detection and raycasting used by light propagation.

---

# 21. Roadmap

### Phase 1 (MVP)

- [ ] Basic point light sources
- [ ] Ambient light configuration
- [ ] Wall occlusion (solid walls only)
- [ ] Three zones (bright, dim, dark)
- [ ] DM add/remove/move lights
- [ ] Light presets (torch, lantern, campfire)
- [ ] Basic falloff (linear)

### Phase 2

- [ ] Cone and line lights
- [ ] Light attachment to tokens
- [ ] Flicker and pulse animations
- [ ] Darkvision integration
- [ ] Door/window light interaction
- [ ] Darkness overlay
- [ ] Copy/paste light sources

### Phase 3

- [ ] GPU-accelerated light propagation
- [ ] Inverse square falloff
- [ ] Color temperature (warm/cool shift)
- [ ] Light source particles (sparks, smoke)
- [ ] AI Director lighting proposals
- [ ] Audio system integration
- [ ] Light source animations (swinging torch)

### Phase 4

- [ ] Volumetric light effects (fog interaction)
- [ ] Dynamic shadows (soft shadows)
- [ ] Light bouncing (indirect illumination)
- [ ] Day/night cycle
- [ ] Weather-based lighting (rain darkens, snow brightens)
- [ ] Magic item light effects
- [ ] Spell illumination (fireball flash, lightning bolt)
