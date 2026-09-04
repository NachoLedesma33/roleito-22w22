# 2D to 3D Mapping System

## 1. Overview

Roleito renders the same scene graph through two distinct lenses:

- **2D View** — Tactical battlemap. Grid-based, top-down, token icons, flat colors. The primary interface for combat encounters and spatial planning.
- **3D View** — Immersive Three.js scene. Character models, volumetric lighting, environmental detail. Used for exploration, cinematic moments, and atmosphere.

Both views read from one scene graph. Changes in 2D reflect instantly in 3D and vice versa. The DM switches between views without data loss.

### Design Principles

1. **Single source of truth** — The 2D scene graph is canonical. The 3D renderer is a projection of it.
2. **Non-destructive** — 3D view never modifies the scene graph directly. It adds visual layers (particles, animations, post-processing) that exist only at render time.
3. **Graceful fallback** — If a 3D model is missing, the system falls back to a 2D sprite billboard or colored cube. No crashes, no blank spaces.
4. **Performance parity** — Both views target 60fps. 3D uses LOD, instancing, and culling to stay there.

---

## 2. Mapping Rules

Every scene item type maps to a 3D representation through a `MappingRule`. Rules are defined in configuration and overrideable per campaign.

```typescript
interface MappingRule {
  itemType: string;          // Item metadata type (e.g., "token", "wall", "door")
  model3d: string;           // 3D model template path (GLB/GLTF)
  fallbackImage: string;     // 2D sprite used if no 3D model available
  scale: number;             // Multiplier: 2D logical size → 3D world units
  yOffset: number;           // Vertical offset from ground plane (meters)
  rotation: '2d-to-3d' | 'fixed' | 'inherit';
  animation?: string;        // Default idle animation name
  billboard?: boolean;       // If true, always faces camera (for labels, markers)
}
```

### Default Mapping Rules

```typescript
const DEFAULT_MAPPING_RULES: MappingRule[] = [
  {
    itemType: 'token',
    model3d: 'models/characters/{variant}.glb',
    fallbackImage: 'sprites/tokens/{variant}.png',
    scale: 1.0,
    yOffset: 0.0,
    rotation: '2d-to-3d',
    animation: 'idle',
  },
  {
    itemType: 'wall',
    model3d: '',  // Procedural geometry
    fallbackImage: '',
    scale: 1.0,
    yOffset: 0.0,
    rotation: 'inherit',
  },
  {
    itemType: 'door',
    model3d: 'models/props/door_{material}.glb',
    fallbackImage: 'sprites/door.png',
    scale: 1.0,
    yOffset: 0.0,
    rotation: '2d-to-3d',
    animation: 'closed',
  },
  {
    itemType: 'floor',
    model3d: '',  // Procedural plane
    fallbackImage: '',
    scale: 1.0,
    yOffset: -0.01,
    rotation: 'fixed',
  },
  {
    itemType: 'effect',
    model3d: '',
    fallbackImage: '',
    scale: 1.0,
    yOffset: 1.0,
    rotation: 'fixed',
    billboard: true,
  },
  {
    itemType: 'label',
    model3d: '',
    fallbackImage: '',
    scale: 1.0,
    yOffset: 2.5,
    rotation: 'fixed',
    billboard: true,
  },
  {
    itemType: 'light',
    model3d: '',
    fallbackImage: '',
    scale: 1.0,
    yOffset: 2.0,
    rotation: 'fixed',
  },
];
```

### Rule Resolution Order

1. Check item-level override (`item.metadata.mappingRule`)
2. Check campaign-level override (`campaign.settings.mappingRules`)
3. Fall back to `DEFAULT_MAPPING_RULES`
4. If no rule matches, render as colored cube with label

---

## 3. 2D Item → 3D Object Mapping

| 2D Item | 3D Object | Geometry | Notes |
|---------|-----------|----------|-------|
| Token (character) | Character model (GLB) | Mesh with skeleton | Idle animation plays by default. Scale from token radius. |
| Wall (line segment) | Box geometry | Procedural | Width from `wallThickness`, height from `wallHeight` metadata. |
| Door | Door model (GLB) | Mesh | Animated open/close. Triggers on interact event. |
| Floor (rectangle) | Plane geometry | Procedural | Textured per terrain type. Receives shadows. |
| Effect (particle) | Points system | Procedural | Custom shader for glow/decay. Billboard orientation. |
| Label (text) | Text geometry or sprite | TextGeometry or Sprite | Billboard by default. Font from UI settings. |
| Light source | PointLight / SpotLight | Helper | Not visible in scene, only affects lighting. |
| Elevation marker | Staircase / ramp model | GLB or procedural | Height from metadata. Connects floor planes. |
| Trap | Invisible until triggered | N/A | On trigger: particle effect + sound + damage. |
| Token mount (horse) | Mount model + rider | GLB compound | Child of token. Offset from center. |

### Coordinate Translation

2D uses a grid system. 3D uses world-space meters.

```typescript
function gridToWorld(gridX: number, gridY: number, gridSize: number): Point3D {
  return {
    x: (gridX - gridSize / 2) * CELL_SIZE,
    y: 0, // Ground plane
    z: (gridY - gridSize / 2) * CELL_SIZE,
  };
}

function worldToGrid(world: Point3D, gridSize: number): { gridX: number; gridY: number } {
  return {
    gridX: Math.floor(world.x / CELL_SIZE + gridSize / 2),
    gridY: Math.floor(world.z / CELL_SIZE + gridSize / 2),
  };
}

const CELL_SIZE = 1.5; // meters per grid cell
```

---

## 4. Camera Systems

```typescript
interface CameraConfig {
  mode: 'top-down' | 'isometric' | 'third-person' | 'first-person';
  target: Point3D;
  distance: number;
  angle: number;           // degrees from ground (0 = horizontal, 90 = top-down)
  rotation: number;        // degrees around target (Y axis)
  fov: number;             // field of view in degrees
  near: number;            // near clipping plane
  far: number;             // far clipping plane
  controls: 'orbit' | 'fixed' | 'follow';
}

interface CameraTransition {
  from: CameraConfig;
  to: CameraConfig;
  duration: number;        // milliseconds
  easing: 'linear' | 'ease-in-out' | 'spring';
}
```

### Top-Down

Orthographic camera directly above the scene. Matches the 2D battlemap perspective exactly.

- **Projection**: Orthographic
- **Angle**: 90° from ground
- **FOV**: N/A (orthographic uses `zoom`)
- **Controls**: Orbit (pan, zoom, rotate)
- **Use case**: Combat, tactical planning, grid alignment

```
Camera position: (target.x, target.y + distance, target.z)
Look-at: target
Up vector: (0, 0, -1) for screen-space consistency
```

### Isometric

45° angle view showing depth and height. Classic RPG perspective.

- **Projection**: Perspective
- **Angle**: 45° from ground
- **Rotation**: 45° around Y axis
- **FOV**: 45° (narrow for flat isometric look)
- **Controls**: Orbit (limited rotation)
- **Use case**: Exploration, building, atmosphere

### Third-Person

Behind and above the controlled character. Shows the character model and surroundings.

- **Projection**: Perspective
- **Angle**: 20–30° from ground
- **Distance**: 3–5 meters behind target
- **FOV**: 60°
- **Controls**: Follow (orbits around character)
- **Use case**: Cinematic exploration, narrative scenes

### First-Person

Character's eye level. Full immersion.

- **Projection**: Perspective
- **Angle**: 0° (horizontal)
- **Height**: 1.6–1.8 meters (adjustable per race)
- **FOV**: 75°
- **Controls**: Free look
- **Use case**: Investigation, social encounters, atmosphere

### Camera Transitions

View switches interpolate smoothly between camera configs.

```typescript
function lerpCamera(from: CameraConfig, to: CameraConfig, t: number): CameraConfig {
  return {
    mode: to.mode,
    target: lerpPoint(from.target, to.target, t),
    distance: lerp(from.distance, to.distance, t),
    angle: lerp(from.angle, to.angle, t),
    rotation: lerpAngle(from.rotation, to.rotation, t),
    fov: lerp(from.fov, to.fov, t),
    near: to.near,
    far: to.far,
    controls: to.controls,
  };
}
```

---

## 5. 3D Rendering Pipeline

```
Scene Graph (2D items)
       │
       ▼
┌──────────────────┐
│  Item Iterator    │  For each item in scene graph
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Rule Resolver    │  Find MappingRule for item type
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Object Creator   │  Generate Three.js Object3D
│                   │  ├─ GLB loader (models)
│                   │  ├─ Procedural geometry (walls, floors)
│                   │  └─ Sprite billboard (labels, markers)
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Transform        │  Apply position, rotation, scale
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Material         │  Apply textures, shaders, colors
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Add to Scene     │  Push to Three.js Scene graph
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Post-Processing  │  Lighting, fog, post-processing
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Render           │  Three.js WebGLRenderer.draw()
└──────────────────┘
```

### Pipeline Details

```typescript
function renderScene(sceneGraph: SceneGraph, camera: CameraConfig, renderer: WebGLRenderer): void {
  const scene = new THREE.Scene();

  // 1. Skybox / Environment
  if (sceneGraph.environment.skybox) {
    scene.background = loadSkybox(sceneGraph.environment.skybox);
  }

  // 2. Terrain (floors, elevation)
  for (const floor of sceneGraph.items.filter(i => i.type === 'floor')) {
    const mesh = createFloorMesh(floor);
    scene.add(mesh);
  }

  // 3. Walls
  for (const wall of sceneGraph.items.filter(i => i.type === 'wall')) {
    const mesh = createWallMesh(wall);
    scene.add(mesh);
  }

  // 4. Doors
  for (const door of sceneGraph.items.filter(i => i.type === 'door')) {
    const model = loadOrFallback(door);
    scene.add(model);
  }

  // 5. Tokens (characters)
  for (const token of sceneGraph.items.filter(i => i.type === 'token')) {
    const model = loadCharacterModel(token);
    scene.add(model);
  }

  // 6. Effects
  for (const effect of sceneGraph.items.filter(i => i.type === 'effect')) {
    const particles = createParticleSystem(effect);
    scene.add(particles);
  }

  // 7. Labels
  for (const label of sceneGraph.items.filter(i => i.type === 'label')) {
    const sprite = createTextSprite(label);
    scene.add(sprite);
  }

  // 8. Lighting
  applyLighting(scene, sceneGraph.lighting);

  // 9. Fog of War
  applyFogOfWar(scene, sceneGraph.fogOfWar);

  // 10. Render
  const camera3d = buildCamera(camera);
  renderer.render(scene, camera3d);
}
```

---

## 6. Wall Rendering

Walls are the most common 3D element. They must look solid, cast shadows, and block line-of-sight.

### Geometry Construction

```typescript
function createWallMesh(wall: WallItem): THREE.Mesh {
  const start = gridToWorld(wall.startX, wall.startY, sceneGridSize);
  const end = gridToWorld(wall.endX, wall.endY, sceneGridSize);

  const length = distance(start, end);
  const height = wall.metadata.wallHeight ?? 3.0;   // meters
  const thickness = wall.metadata.wallThickness ?? 0.2; // meters

  const geometry = new THREE.BoxGeometry(length, height, thickness);
  const material = getWallMaterial(wall.metadata.material);

  const mesh = new THREE.Mesh(geometry, material);

  // Position at midpoint
  mesh.position.set(
    (start.x + end.x) / 2,
    height / 2,
    (start.z + end.z) / 2,
  );

  // Rotate to face wall direction
  const angle = Math.atan2(end.z - start.z, end.x - start.x);
  mesh.rotation.y = -angle;

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}
```

### Wall Materials

| Material | Color | Texture | Properties |
|----------|-------|---------|------------|
| Stone | `#8B8682` | `textures/wall_stone.png` | Rough, high normal map |
| Wood | `#8B6914` | `textures/wall_wood.png` | Medium roughness |
| Metal | `#A8A9AD` | `textures/wall_metal.png` | Smooth, metallic |
| Brick | `#B22222` | `textures/wall_brick.png` | Medium roughness |
| Ice | `#ADD8E6` | `textures/wall_ice.png` | Transparent, reflective |
| Invisible | — | — | Not rendered (DM walls) |

### Door Rendering

Doors are wall segments with animated models.

```typescript
interface DoorConfig {
  closed: THREE.Object3D;
  open: THREE.Object3D;
  animationDuration: number; // ms
}

function animateDoor(door: DoorConfig, state: 'open' | 'close'): void {
  const target = state === 'open' ? door.open.position : door.closed.position;
  // Animate position/rotation over animationDuration
}
```

### Window Rendering

Windows are wall segments with transparent material and glass-like properties.

```typescript
function createWindowMesh(wall: WallItem): THREE.Mesh {
  const mesh = createWallMesh(wall);
  mesh.material = new THREE.MeshPhysicalMaterial({
    color: 0x88ccff,
    transparent: true,
    opacity: 0.3,
    roughness: 0.1,
    metalness: 0.0,
    transmission: 0.9,
    thickness: 0.1,
  });
  return mesh;
}
```

---

## 7. Character Rendering

Characters are the focal point of 3D scenes. Each token maps to a full character model with animations.

### Model Loading

```typescript
interface CharacterModel {
  mesh: THREE.SkinnedMesh;
  mixer: THREE.AnimationMixer;
  animations: Map<string, THREE.AnimationClip>;
  currentAction: THREE.AnimationAction | null;
}

async function loadCharacterModel(token: TokenItem): Promise<CharacterModel> {
  const modelPath = resolveModelPath(token);
  const gltf = await loadGLTF(modelPath);

  const mesh = gltf.scene.children[0] as THREE.SkinnedMesh;
  const mixer = new THREE.AnimationMixer(mesh);

  const animations = new Map<string, THREE.AnimationClip>();
  for (const clip of gltf.animations) {
    animations.set(clip.name, clip);
  }

  return { mesh, mixer, animations, currentAction: null };
}
```

### Animation System

| Animation | Trigger | Loop | Blend Time |
|-----------|---------|------|------------|
| `idle` | Default / no action | Yes | 0.3s |
| `walk` | Movement event | Yes | 0.2s |
| `run` | Dash / sprint | Yes | 0.2s |
| `attack` | Melee attack action | No | 0.15s |
| `cast` | Spell cast action | No | 0.2s |
| `die` | Death event | No | 0.5s |
| `revive` | Revive event | No | 0.5s |
| `emote_*` | Emote action | Varies | 0.3s |

```typescript
function playAnimation(model: CharacterModel, name: string, loop: boolean = true): void {
  const clip = model.animations.get(name);
  if (!clip) return;

  if (model.currentAction) {
    model.currentAction.fadeOut(0.3);
  }

  const action = model.mixer.clipAction(clip);
  action.reset();
  action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.fadeIn(0.3);
  action.play();

  model.currentAction = action;
}
```

### Character Scale

2D tokens have a radius. 3D models have a natural height. The mapping scales the model to match the token's footprint.

```typescript
function getCharacterScale(token: TokenItem, model: CharacterModel): number {
  const tokenRadius = token.metadata.radius ?? 0.5;
  const modelHeight = getBoundingBox(model.mesh).height;
  const targetHeight = token.metadata.characterHeight ?? 1.8;

  // Scale so model height matches target height
  return targetHeight / modelHeight;
}
```

### Facing Direction

2D tokens have a facing direction (angle in degrees). 3D models rotate around Y axis.

```typescript
function applyFacing(model: CharacterModel, facingDegrees: number): void {
  model.mesh.rotation.y = THREE.MathUtils.degToRad(-facingDegrees);
}
```

---

## 8. Terrain Rendering

Floors and terrain define the ground plane. Each floor tile maps to a textured plane.

### Floor Mesh

```typescript
function createFloorMesh(floor: FloorItem): THREE.Mesh {
  const width = floor.width * CELL_SIZE;
  const depth = floor.height * CELL_SIZE;
  const elevation = floor.metadata.elevation ?? 0;

  const geometry = new THREE.PlaneGeometry(width, depth);
  geometry.rotateX(-Math.PI / 2); // Lay flat

  const material = getTerrainMaterial(floor.metadata.terrainType);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(
    gridToWorld(floor.x, floor.y, sceneGridSize).x,
    elevation,
    gridToWorld(floor.x, floor.y, sceneGridSize).z,
  );

  mesh.receiveShadow = true;

  return mesh;
}
```

### Terrain Types

| Type | Texture | Shader | Animation |
|------|---------|--------|-----------|
| Grass | `textures/grass.png` | Standard | Wind sway (vertex shader) |
| Stone | `textures/stone.png` | Standard | None |
| Dirt | `textures/dirt.png` | Standard | None |
| Wood | `textures/wood_floor.png` | Standard | None |
| Water | `textures/water.png` | Custom water | Waves, reflection, flow |
| Lava | `textures/lava.png` | Custom emissive | Glow, flow, heat distortion |
| Ice | `textures/ice.png` | Standard | Slight specular highlight |
| Sand | `textures/sand.png` | Standard | Wind displacement |

### Water Shader

```glsl
// Simplified water fragment shader
uniform float uTime;
uniform sampler2D uTexture;
uniform vec3 uDeepColor;
uniform vec3 uShallowColor;

varying vec2 vUv;
varying float vWaveHeight;

void main() {
  vec2 uv = vUv + vec2(sin(uTime + vUv.x * 6.0) * 0.02, uTime * 0.05);
  vec4 texColor = texture2D(uTexture, uv);

  float depth = smoothstep(-0.5, 0.5, vWaveHeight);
  vec3 waterColor = mix(uDeepColor, uShallowColor, depth);

  gl_FragColor = vec4(waterColor * texColor.rgb, 0.85);
}
```

### Elevation

Rooms can have multiple elevation layers. Each floor tile has an `elevation` property (meters above ground).

```typescript
function buildElevationLayers(sceneGraph: SceneGraph): THREE.Group[] {
  const layers = new Map<number, THREE.Group>();

  for (const floor of sceneGraph.items.filter(i => i.type === 'floor')) {
    const elevation = floor.metadata.elevation ?? 0;
    if (!layers.has(elevation)) {
      layers.set(elevation, new THREE.Group());
    }
    layers.get(elevation)!.add(createFloorMesh(floor));
  }

  return Array.from(layers.values());
}
```

---

## 9. Effect Rendering

2D effects (particles, spell effects, ambient) become 3D particle systems.

### Particle System

```typescript
interface EffectConfig {
  count: number;           // Number of particles
  lifetime: number;        // Seconds
  speed: number;           // Units per second
  spread: number;          // Random spread radius
  color: THREE.Color;
  size: number;
  opacity: number;
  gravity: number;         // Y acceleration
  shape: 'sphere' | 'cone' | 'cylinder' | 'ring';
  blendMode: THREE.AdditiveBlending | THREE.NormalBlending;
}

function createParticleSystem(effect: EffectItem): THREE.Points {
  const config = getEffectConfig(effect.metadata.effectType);
  const geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(config.count * 3);
  const velocities = new Float32Array(config.count * 3);
  const lifetimes = new Float32Array(config.count);

  for (let i = 0; i < config.count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.random() * config.spread;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    velocities[i * 3] = (Math.random() - 0.5) * config.speed;
    velocities[i * 3 + 1] = Math.random() * config.speed;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * config.speed;

    lifetimes[i] = Math.random() * config.lifetime;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: config.color,
    size: config.size,
    transparent: true,
    opacity: config.opacity,
    blending: config.blendMode,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  points.position.copy(gridToWorld(effect.x, effect.y, sceneGridSize));
  points.position.y += effect.metadata.yOffset ?? 1.0;

  return points;
}
```

### Effect Types

| 2D Effect | 3D Particle Config | Notes |
|-----------|-------------------|-------|
| Fireball | Orange/red, cone shape, high speed | Travels to target |
| Heal | Green/gold, ring shape, upward | Expands outward |
| Lightning | White/blue, line of particles | Flash then fade |
| Fog cloud | Gray, sphere, slow drift | Volumetric feel |
| Blood splatter | Red, ring, fast outward | One-shot burst |
| Sparkle | Gold, sphere, slow drift | Ambient, looping |
| Dust | Brown, cone, slow drift | Movement-triggered |
| Rain | Blue, cylinder, downward | Persistent, screen-wide |

### Audio Positioning

3D effects can include spatial audio sources.

```typescript
function positionAudioSource(audio: THREE.Audio, position: THREE.Vector3): void {
  audio.position.copy(position);
  audio.setRefDistance(5);
  audio.setRolloffFactor(1);
  audio.setDistanceModel('inverse');
}
```

---

## 10. Fog of War in 3D

Fog of war must work in 3D space while staying synchronized with the 2D mask.

### Approach 1: Volumetric Fog

Fog meshes physically occupy hidden areas. Simple, reliable, performant for small maps.

```typescript
function createFogVolume(region: FogRegion): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(region.width, 10, region.depth);
  const material = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.95,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(region.centerX, 5, region.centerZ);
  mesh.renderOrder = 999; // Render last

  return mesh;
}
```

**Pros**: Simple, no shader complexity, works with any lighting.
**Cons**: Doesn't handle partial visibility well, can look blocky.

### Approach 2: Post-Processing Fog

Fog applied as a screen-space effect based on depth and visibility mask.

```typescript
const fogShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    tFogMask: { value: null },
    fogColor: { value: new THREE.Color(0x000000) },
    cameraNear: { value: 0.1 },
    cameraFar: { value: 100 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform sampler2D tFogMask;
    uniform vec3 fogColor;
    uniform float cameraNear;
    uniform float cameraFar;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float depth = texture2D(tDepth, vUv).r;
      float fogMask = texture2D(tFogMask, vUv).r;

      float fogFactor = smoothstep(cameraNear, cameraFar, depth) * fogMask;
      vec3 finalColor = mix(color.rgb, fogColor, fogFactor);

      gl_FragColor = vec4(finalColor, color.a);
    }
  `,
};
```

**Pros**: Smooth gradients, handles partial visibility, looks cinematic.
**Cons**: More complex, requires depth buffer access.

### Hybrid Approach

Roleito uses a hybrid approach:
- **Explored but not visible**: Semi-transparent fog (post-processing)
- **Never explored**: Opaque fog (volumetric)
- **Visible**: No fog

```typescript
function updateFogState(fogMask: FogMask, visibility: VisibilityMap): void {
  for (const cell of fogMask.cells) {
    const vis = visibility.get(cell.gridX, cell.gridY);

    if (vis === 'hidden') {
      cell.opacity = 1.0;   // Fully opaque
      cell.type = 'volumetric';
    } else if (vis === 'explored') {
      cell.opacity = 0.6;   // Semi-transparent
      cell.type = 'post-process';
    } else {
      cell.opacity = 0.0;   // Fully visible
      cell.type = 'none';
    }
  }
}
```

### Dynamic Line of Sight

Fog updates every frame based on token positions and vision cones.

```typescript
function computeVisibility(sceneGraph: SceneGraph, viewer: TokenItem): VisibilityMap {
  const map = new VisibilityMap(sceneGraph.gridSize);

  const origin = gridToWorld(viewer.x, viewer.y, sceneGraph.gridSize);
  const range = viewer.metadata.visionRange ?? 6; // grid cells
  const angle = viewer.metadata.facingDegrees ?? 0;
  const coneWidth = viewer.metadata.visionConeDegrees ?? 360;

  // Raycast from viewer position in all directions within vision cone
  for (let deg = angle - coneWidth / 2; deg <= angle + coneWidth / 2; deg += 2) {
    const rad = THREE.MathUtils.degToRad(deg);
    const dir = new THREE.Vector3(Math.cos(rad), 0, Math.sin(rad));

    for (let d = 0; d <= range; d++) {
      const point = origin.clone().add(dir.clone().multiplyScalar(d * CELL_SIZE));
      const grid = worldToGrid(point, sceneGraph.gridSize);

      if (isBlockedByWall(sceneGraph, origin, point)) break;

      map.set(grid.gridX, grid.gridY, 'visible');
    }
  }

  return map;
}
```

---

## 11. Performance

3D rendering must stay at 60fps. The system employs several optimization strategies.

### Level of Detail (LOD)

Objects further from the camera use simpler representations.

```typescript
function createLODModel(token: TokenItem): THREE.LOD {
  const lod = new THREE.LOD();

  // High detail: < 10m
  const high = loadCharacterModel(token);
  lod.addLevel(high.mesh, 0);

  // Medium detail: 10–30m
  const medium = createSimplifiedModel(token, 12);
  lod.addLevel(medium, 10);

  // Low detail: > 30m
  const low = createSimplifiedModel(token, 4);
  lod.addLevel(low, 30);

  // Billboard: > 50m
  const billboard = createBillboard(token);
  lod.addLevel(billboard, 50);

  return lod;
}
```

### Instancing

Identical objects (floor tiles, wall segments, torches) share geometry and materials.

```typescript
function createInstancedFloor(floors: FloorItem[]): THREE.InstancedMesh {
  const geometry = new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE);
  geometry.rotateX(-Math.PI / 2);

  const material = getTerrainMaterial('stone');
  const mesh = new THREE.InstancedMesh(geometry, material, floors.length);

  const matrix = new THREE.Matrix4();
  for (let i = 0; i < floors.length; i++) {
    const pos = gridToWorld(floors[i].x, floors[i].y, sceneGridSize);
    matrix.setPosition(pos.x, floors[i].metadata.elevation ?? 0, pos.z);
    mesh.setMatrixAt(i, matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.receiveShadow = true;

  return mesh;
}
```

### Frustum Culling

Three.js automatically culls objects outside the camera frustum. Enable explicitly:

```typescript
renderer.info.autoReset = false;
scene.traverse(obj => {
  if (obj instanceof THREE.Mesh) {
    obj.frustumCulled = true;
  }
});
```

### Occlusion Culling

For complex interiors, precompute an occlusion buffer.

```typescript
interface OcclusionBuffer {
  cells: Map<string, boolean>; // grid key → is occluded
}

function isOccluded(buffer: OcclusionBuffer, gridX: number, gridY: number): boolean {
  return buffer.cells.get(`${gridX},${gridY}`) ?? false;
}
```

### Texture Streaming

Textures load on demand based on camera position.

```typescript
async function streamTextures(scene: THREE.Scene, camera: THREE.Camera, radius: number): Promise<void> {
  const camPos = camera.position;

  for (const obj of scene.children) {
    if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
      const dist = camPos.distanceTo(obj.position);

      if (dist < radius && !obj.material.map?.isLoaded) {
        obj.material.map = await loadTexture(obj.userData.texturePath);
        obj.material.map.needsUpdate = true;
      }
    }
  }
}
```

### Performance Budget

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| FPS | 60 | < 45 | < 30 |
| Draw calls | < 500 | > 800 | > 1200 |
| Triangles | < 500k | > 800k | > 1.2M |
| Textures | < 50 | > 80 | > 120 |
| Memory | < 512MB | > 768MB | > 1GB |

### Profiling

```typescript
function profileScene(scene: THREE.Scene): void {
  const info = renderer.info;

  console.log(`Draw calls: ${info.render.calls}`);
  console.log(`Triangles: ${info.render.triangles}`);
  console.log(`Textures: ${info.memory.textures}`);
  console.log(`Geometries: ${info.memory.geometries}`);
}
```

---

## 12. Integration Points

The 3D renderer connects to every major subsystem in Roleito.

### Scene Graph

The 2D scene graph is the source of truth. The 3D renderer reads it every frame and reconciles differences.

```typescript
function reconcileScene(scene3d: THREE.Scene, sceneGraph: SceneGraph): void {
  const currentItems = new Set(scene3d.children.map(c => c.userData.itemId));
  const targetItems = new Set(sceneGraph.items.map(i => i.id));

  // Remove objects no longer in scene graph
  for (const id of currentItems) {
    if (!targetItems.has(id)) {
      const obj = scene3d.children.find(c => c.userData.itemId === id);
      if (obj) scene3d.remove(obj);
    }
  }

  // Add new objects
  for (const item of sceneGraph.items) {
    if (!currentItems.has(item.id)) {
      const obj3d = createObject3D(item);
      scene3d.add(obj3d);
    }
  }

  // Update existing objects
  for (const item of sceneGraph.items) {
    const obj3d = scene3d.children.find(c => c.userData.itemId === item.id);
    if (obj3d) updateObject3D(obj3d, item);
  }
}
```

### Asset System

3D models and textures are managed through the asset system.

```
/assets/models/
  characters/     — GLB character models
  props/          — Doors, furniture, decorations
  environments/   — Skyboxes, terrain tiles
  effects/        — Particle textures
/assets/textures/
  terrain/        — Floor and wall textures
  ui/             — HUD elements for 3D view
```

### Lighting System

The lighting system defines 3D light sources from 2D light items.

```typescript
function createLight(light: LightItem): THREE.Light {
  switch (light.metadata.lightType) {
    case 'point':
      return new THREE.PointLight(
        light.metadata.color,
        light.metadata.intensity,
        light.metadata.range,
      );
    case 'spot':
      return new THREE.SpotLight(
        light.metadata.color,
        light.metadata.intensity,
        light.metadata.range,
        light.metadata.angle,
        light.metadata.penumbra,
      );
    case 'ambient':
      return new THREE.AmbientLight(
        light.metadata.color,
        light.metadata.intensity,
      );
    default:
      return new THREE.PointLight(0xffffff, 1, 10);
  }
}
```

### Fog of War

Fog of War state drives the 3D fog rendering. Updates come from the visibility system.

```typescript
sceneGraph.on('fog-change', (fogMask: FogMask) => {
  updateFog3D(scene3d, fogMask);
});
```

### Camera System

The camera system manages transitions between view modes.

```typescript
sceneGraph.on('view-change', (view: '2d' | '3d') => {
  if (view === '3d') {
    camera.transitionTo(defaultCameraConfig('isometric'));
  } else {
    camera.transitionTo(defaultCameraConfig('top-down'));
  }
});
```

### AI Director

The AI Director can propose 3D scene modifications (atmosphere, lighting, effects) that the DM approves.

```typescript
aiDirector.on('scene-proposal', (proposal: SceneProposal) => {
  dmDashboard.showProposal(proposal, {
    onApprove: () => applySceneProposal(scene3d, proposal),
    onReject: () => discardProposal(proposal),
  });
});
```

### DM Dashboard

The DM Dashboard provides a 3D preview mode for reviewing scenes before players see them.

```typescript
dmDashboard.on('preview-3d', (sceneId: string) => {
  const scene = loadScene(sceneId);
  previewRenderer.render(scene, previewCamera);
});
```

---

## 13. File Structure

```
/apps/renderer/
  src/
    Renderer.tsx            — Main React Three Canvas component
    hooks/
      useSceneGraph.ts      — Subscribes to 2D scene graph
      useCamera.ts          — Camera controller
      useAnimation.ts       — Animation loop
      usePerformance.ts     — FPS monitoring, LOD
    systems/
      MappingSystem.ts      — Applies MappingRules to items
      WallSystem.ts         — Wall geometry generation
      CharacterSystem.ts    — Character model loading and animation
      TerrainSystem.ts      — Floor and terrain rendering
      EffectSystem.ts       — Particle systems
      FogSystem.ts          — Fog of war rendering
      LightingSystem.ts     — 3D light creation
      CameraSystem.ts       — Camera modes and transitions
      LODSystem.ts          — Level of detail management
      OcclusionSystem.ts    — Occlusion culling
    shaders/
      water.ts              — Water shader
      lava.ts               — Lava shader
      fog.ts                — Fog post-processing shader
    utils/
      coordinate.ts         — Grid ↔ world translation
      loaders.ts            — GLB, texture, audio loaders
      materials.ts          — Material factory
      geometry.ts           — Procedural geometry helpers
/core/domain/
  types.ts                  — Shared types including MappingRule
```

---

## 14. Roadmap

| Phase | Deliverable | Status |
|-------|-------------|--------|
| Phase 5 | Basic 3D renderer with token models | Planned |
| Phase 5 | Wall and floor rendering | Planned |
| Phase 5 | Camera system (top-down, isometric) | Planned |
| Phase 6 | Character animations | Planned |
| Phase 6 | Fog of war in 3D | Planned |
| Phase 6 | Lighting system | Planned |
| Phase 7 | Effect particles | Planned |
| Phase 7 | Water and lava shaders | Planned |
| Phase 7 | LOD and performance optimization | Planned |
| Phase 8 | First-person camera | Planned |
| Phase 8 | AI Director 3D proposals | Planned |
| Phase 8 | VR support (optional) | Planned |

---

## 15. Open Questions

1. **Model format**: GLB vs GLTF vs custom? GLB is single-file, good for distribution. GLTF is easier to inspect.
2. **Animation format**: Skeletal (bone-based) vs morph targets? Skeletal is standard for characters.
3. **Multiplayer sync**: Should 3D state (camera position, animation state) sync between DM and players?
4. **Performance target**: Is 60fps achievable on mid-range hardware (GTX 1060 / equivalent)?
5. **Mobile support**: Should the 3D renderer work on mobile devices? If so, what LOD cutoffs?
6. **Custom models**: Can DMs upload their own GLB models for characters and props?
