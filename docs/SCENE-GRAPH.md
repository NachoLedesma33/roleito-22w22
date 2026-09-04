# Scene Graph

The Scene Graph is the authoritative data structure for the 2D battlemap. It is a flat list of Items, optionally connected via attachments, representing every renderable entity on the map: tokens, walls, doors, terrain, effects, labels, fog, and more.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Item Entity](#2-item-entity)
3. [Scene Layers](#3-scene-layers)
4. [zIndex Management](#4-zindex-management)
5. [Attachments](#5-attachments)
6. [Item Shapes](#6-item-shapes)
7. [Item Metadata](#7-item-metadata)
8. [Scene Graph Operations](#8-scene-graph-operations)
9. [Rendering Pipeline](#9-rendering-pipeline)
10. [Integration Points](#10-integration-points)
11. [Constraints and Invariants](#11-constraints-and-invariants)
12. [Examples](#12-examples)

---

## 1. Overview

### Purpose

The Scene Graph stores every entity that exists on the 2D battlemap. It is the single source of truth for spatial state: where things are, how they are layered, and how they relate to each other.

### Mental Model

Think of the Scene Graph as a stack of透明 layers, each holding Items at specific positions. Most Items exist independently. Some Items are attached to others (a weapon on a character, a label on a token), forming parent-child relationships.

### Key Principles

- **Flat by default.** Items are siblings. Attachments are the exception, not the rule.
- **Layer determines category. zIndex determines order within that category.**
- **Selection is per-Player, not per-Item.** The Scene Graph does not store selection state.
- **The Graph is authoritative.** All systems (DM Dashboard, Player View, 3D Renderer, Event System) read from and write to this structure.
- **Attachments create hierarchy.** A parent Item can have children. Children inherit parent transforms unless overridden.

### Data Flow

```
Map Analysis  ──► Scene Graph  ◄── DM Dashboard
                     │
                     ├──► Player View (visible items only)
                     ├──► 3D Renderer (interpretation)
                     ├──► Event System (mutations broadcast)
                     └──► Canon Engine (game-state queries)
```

---

## 2. Item Entity

Every entity on the 2D battlemap is an Item. The Item interface is the canonical definition of what exists, where it is, and how it behaves.

```typescript
interface Item {
  id: string;
  name: string;

  // Transform
  x: number;
  y: number;
  rotation: number;          // degrees, 0–360
  scale: number;             // multiplier, 1 = original size

  // Dimensions
  width: number;
  height: number;

  // Visual
  image?: string;            // URL to sprite or texture
  tint?: string;             // CSS color overlay (e.g., '#ff000080')
  opacity?: number;          // 0–1, default 1

  // Sorting
  layer: SceneLayer;
  zIndex: number;

  // State
  visible: boolean;          // false = hidden from players
  locked: boolean;           // true = DM-only, cannot be moved by players

  // Hit testing
  disableHit: boolean;       // true = pointer events pass through

  // Z-index management
  disableAutoZIndex: boolean; // true = zIndex is manually controlled

  // Attachments
  attachmentIds: string[];          // IDs of child Items
  disableAttachmentBehavior: AttachmentBehavior[]; // inherited transforms to override

  // Metadata (game-specific payload)
  metadata: ItemMetadata;

  // Shape (for non-image items)
  shape?: ItemShape;
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | yes | Unique identifier (UUID) |
| `name` | `string` | yes | Human-readable label |
| `x` | `number` | yes | World X coordinate (pixels or grid units) |
| `y` | `number` | yes | World Y coordinate (pixels or grid units) |
| `rotation` | `number` | yes | Rotation in degrees, clockwise from top |
| `scale` | `number` | yes | Scale multiplier (1 = identity) |
| `width` | `number` | yes | Bounding width in world units |
| `height` | `number` | yes | Bounding height in world units |
| `image` | `string` | no | URL to image resource |
| `tint` | `string` | no | Color overlay applied to rendered image |
| `opacity` | `number` | no | Transparency (0 = invisible, 1 = opaque) |
| `layer` | `SceneLayer` | yes | Which render layer this Item belongs to |
| `zIndex` | `number` | yes | Sort order within the layer |
| `visible` | `boolean` | yes | Whether players can see this Item |
| `locked` | `boolean` | yes | Whether DM-only lock is active |
| `disableHit` | `boolean` | yes | Whether hit testing is disabled |
| `disableAutoZIndex` | `boolean` | yes | Whether zIndex is manually controlled |
| `attachmentIds` | `string[]` | yes | Child Item IDs (empty array = no children) |
| `disableAttachmentBehavior` | `AttachmentBehavior[]` | yes | Transforms not inherited from parent |
| `metadata` | `ItemMetadata` | yes | Game-specific payload (see §7) |
| `shape` | `ItemShape` | no | Vector shape definition (see §6) |

### Defaults

When creating a new Item, the following defaults apply unless overridden:

| Field | Default |
|-------|---------|
| `rotation` | `0` |
| `scale` | `1` |
| `image` | `undefined` |
| `tint` | `undefined` |
| `opacity` | `1` |
| `visible` | `true` |
| `locked` | `false` |
| `disableHit` | `false` |
| `disableAutoZIndex` | `false` |
| `attachmentIds` | `[]` |
| `disableAttachmentBehavior` | `[]` |
| `shape` | `undefined` |

---

## 3. Scene Layers

Layers define the broad render categories. Items are grouped by layer; within a layer, they are ordered by zIndex.

```typescript
enum SceneLayer {
  TERRAIN       = 0,   // Ground textures, water, lava, grass
  MAP           = 1,   // Static map image elements (grid lines, borders)
  EFFECTS_BELOW = 2,   // Effects rendered below tokens (auras, halos)
  TOKENS        = 3,   // Character and creature tokens
  EFFECTS_ABOVE = 4,   // Effects rendered above tokens (explosions, spell FX)
  OVERLAY       = 5,   // UI overlays, labels, annotations, rulers
  FOG           = 6,   // Fog of war (rendered last, masks everything below)
}
```

### Layer Order

Layers render bottom-to-top. Layer 0 (TERRAIN) is drawn first; layer 6 (FOG) is drawn last and can occlude everything below it.

```
FOG           ▲ drawn last (top)
OVERLAY       │
EFFECTS_ABOVE │
TOKENS        │
EFFECTS_BELOW │
MAP           │
TERRAIN       ▼ drawn first (bottom)
```

### Layer Semantics

| Layer | Purpose | Typical Items |
|-------|---------|---------------|
| TERRAIN | Ground-level visuals | Grass textures, water tiles, lava pools, dirt patches |
| MAP | Structural map elements | Grid lines, room borders, compass rose, scale bar |
| EFFECTS_BELOW | Effects under tokens | Aura rings, healing circles, prone markers |
| TOKENS | Living entities | Player characters, NPCs, monsters, vehicles |
| EFFECTS_ABOVE | Effects over tokens | Fireballs, lightning bolts, poison clouds |
| OVERLAY | Non-diegetic UI | Name labels, health bars, rulers, annotations |
| FOG | Visibility masking | Fog of war, darkness, cloud cover |

### Layer Constraints

- An Item's layer is immutable after creation. To move an Item to a different layer, remove it and re-add it with the new layer.
- The FOG layer is special: Items in this layer are rendered as a mask. Only the FOG Item type is permitted in layer 6.
- DM-only Items (e.g., hidden traps) still belong to a layer but may have `visible: false`.

---

## 4. zIndex Management

zIndex determines the render order of Items within the same layer. Lower zIndex renders behind higher zIndex.

### Auto Mode

When `disableAutoZIndex = false` (default), zIndex is computed automatically from the Item's y-position:

```
zIndex = Math.floor(y)
```

Items lower on the screen (higher y) render on top of items higher on the screen (lower y). This produces natural "painter's algorithm" behavior: things in front cover things behind.

**Pros:** Automatic, no manual sorting needed, intuitive for top-down maps.
**Cons:** DM cannot override order. Moving an item changes its z-order.

### Manual Mode

When `disableAutoZIndex = true`, the DM or system sets zIndex explicitly. The value is not derived from position.

**Pros:** Full control over render order. Useful for labels, overlays, persistent effects.
**Cons:** Must be managed manually. Items may overlap unexpectedly if zIndex is not updated when positions change.

### Mixed Usage

Auto and manual items can coexist in the same layer. The sort key is:

```
sortKey = layer * 1_000_000 + zIndex
```

Items with the same zIndex within a layer are sub-sorted by y-position (for auto items) or insertion order (for manual items).

### Recommendations

- Use auto mode for tokens, terrain, and dynamic entities.
- Use manual mode for persistent labels, overlays, and fog.
- Never set the same zIndex for two auto items at very different y-positions within the same layer; the visual result is nondeterministic.

---

## 5. Attachments

Attachments create parent-child relationships between Items. A child Item is spatially linked to its parent.

### How It Works

1. Parent Item has `attachmentIds: ['child-a', 'child-b']`.
2. Child Items exist independently in the Scene Graph (they are also top-level entries).
3. When rendering, the child inherits the parent's `x`, `y`, `rotation`, and `scale` by default.
4. The child's own `x`, `y`, `rotation`, `scale` become offsets relative to the parent.

### Inherited Transforms

| Parent Property | Inheritance Rule |
|-----------------|------------------|
| `x` | Child's x = parent.x + child.x (offset) |
| `y` | Child's y = parent.y + child.y (offset) |
| `rotation` | Child's rotation = parent.rotation + child.rotation (accumulated) |
| `scale` | Child's scale = parent.scale × child.scale (multiplicative) |

### Override Behaviors

The `disableAttachmentBehavior` array lets a child opt out of specific inherited transforms:

```typescript
type AttachmentBehavior = 'position' | 'rotation' | 'scale';
```

| Value | Effect |
|-------|--------|
| `'position'` | Child ignores parent's x/y. Uses its own absolute position. |
| `'rotation'` | Child ignores parent's rotation. Uses its own absolute rotation. |
| `'scale'` | Child ignores parent's scale. Uses its own absolute scale. |

Example: A name label attached to a token might disable rotation so the text stays upright even when the token rotates.

### Maximum Depth

Attachment chains are limited to **3 levels deep**. This prevents:

- Circular references (A → B → C → A)
- Deep inheritance chains that are hard to debug
- Performance degradation from recursive transform resolution

```
Level 0: Parent (token)
Level 1: Child (weapon sprite)
Level 2: Grandchild (weapon glow effect)
Level 3: NOT ALLOWED
```

### Use Cases

| Parent | Child | disableAttachmentBehavior | Reason |
|--------|-------|---------------------------|--------|
| Character token | Weapon sprite | `[]` | Weapon follows token exactly |
| Character token | Name label | `['rotation']` | Label stays upright |
| Character token | Health bar | `['rotation']` | Bar stays horizontal |
| Token | Aura ring | `['scale']` | Aura uses its own size |
| Door | Keyhole indicator | `[]` | Indicator follows door state |

### Detaching

When a child is detached (`detachItem`), it remains in the Scene Graph as an independent Item. Its position reverts to absolute world coordinates (the offset is baked in at detach time).

---

## 6. Item Shapes

Shapes define vector graphics for Items that do not use an image. Shapes are rendered as SVG or Canvas paths.

```typescript
type ItemShape =
  | { type: 'rectangle'; fill: string; stroke?: string; strokeWidth?: number }
  | { type: 'ellipse'; fill: string; stroke?: string; strokeWidth?: number }
  | { type: 'polygon'; points: Point[]; fill: string; stroke?: string }
  | { type: 'line'; points: Point[]; stroke: string; strokeWidth: number }
  | { type: 'text'; text: string; fontSize: number; fontFamily: string; color: string }
  | { type: 'template'; templateId: string; templateVars: Record<string, any> };

interface Point {
  x: number;
  y: number;
}
```

### Shape Types

| Type | Description | Typical Use |
|------|-------------|-------------|
| `rectangle` | Axis-aligned rectangle with optional stroke | Walls, rooms, zones |
| `ellipse` | Circle or ellipse with optional stroke | Area-of-effect circles, aura rings |
| `polygon` | Arbitrary polygon defined by points | Cones, custom zones, irregular areas |
| `line` | Open path defined by points | Rulers, path traces, rays |
| `text` | Rendered text with font properties | Labels, annotations, callouts |
| `template` | Reusable shape defined by a template ID and variables | Spell templates, standardized zones |

### Rendering

- Shapes are rendered as vector graphics. They scale without pixelation.
- If an Item has both `image` and `shape`, the image takes precedence. Shape is ignored.
- If an Item has neither `image` nor `shape`, it is invisible (valid for attachment-only Items).

### Template Shapes

Template shapes reference a reusable definition stored in the campaign's template library:

```typescript
// Template definition (stored separately)
interface ShapeTemplate {
  id: string;
  name: string;
  baseShape: Omit<ItemShape, 'type' | 'templateId' | 'templateVars'>;
  variables: string[];       // list of variable names
  defaultValues: Record<string, any>;
}

// Usage in Item
{
  type: 'template',
  templateId: 'cone-45',
  templateVars: { radius: 30, color: '#ff440080' }
}
```

---

## 7. Item Metadata

Metadata is a discriminated union that carries game-specific payload for each Item type. The `type` field determines the shape of the rest of the object.

```typescript
type ItemMetadata =
  | TokenMetadata
  | WallMetadata
  | DoorMetadata
  | TerrainMetadata
  | EffectMetadata
  | LabelMetadata
  | TemplateMetadata
  | FogMetadata
  | RoomMetadata;

interface TokenMetadata {
  type: 'token';
  characterId: string;       // references Campaign.characters
  ownerId: string;           // player who controls this token
}

interface WallMetadata {
  type: 'wall';
  wallType: 'solid' | 'door' | 'window';
  material: string;          // e.g., 'stone', 'wood', 'iron'
  height: number;            // wall height in world units
}

interface DoorMetadata {
  type: 'door';
  state: 'open' | 'closed' | 'locked';
  keyId?: string;            // Item ID of the key that unlocks this door
}

interface TerrainMetadata {
  type: 'terrain';
  terrainType: string;       // e.g., 'grass', 'water', 'lava'
  movementCost: number;      // 0 = impassable, 1 = normal, >1 = difficult
}

interface EffectMetadata {
  type: 'effect';
  effectType: string;        // e.g., 'fireball', 'healing_aura', 'poison_cloud'
  duration?: number;         // turns remaining, undefined = permanent
}

interface LabelMetadata {
  type: 'label';
  text: string;
  fontSize: number;
  color: string;
}

interface TemplateMetadata {
  type: 'template';
  templateType: string;      // e.g., 'cone', 'line', 'sphere'
  radius?: number;           // for area templates
  coneAngle?: number;        // for cone templates, in degrees
}

interface FogMetadata {
  type: 'fog';
  fogType: 'static' | 'dynamic';
  cutMask?: string;          // URL to mask image defining revealed areas
}

interface RoomMetadata {
  type: 'room';
  roomId: string;            // references campaign room definitions
  name: string;
  description: string;
}
```

### Metadata Rules

- `metadata.type` must match the Item's role. A token Item must have `TokenMetadata`.
- Metadata is validated on insert and update. Invalid metadata is rejected.
- Metadata fields are game-logic only; they do not affect rendering directly (except through derived visual properties).

---

## 8. Scene Graph Operations

All mutations to the Scene Graph go through a defined API. These operations are the only way to modify graph state.

### addItem

Insert a new Item into the graph.

```typescript
function addItem(item: Item): void;
```

- `item.id` must not already exist.
- `item.layer` must be a valid `SceneLayer`.
- If `item.metadata.type` is `'fog'`, `item.layer` must be `SceneLayer.FOG`.
- After insert, the Item is broadcast via the Event System.

### updateItem

Modify one or more fields on an existing Item.

```typescript
function updateItem(id: string, patch: Partial<Item>): void;
```

- Item must exist.
- `patch.id` is ignored (cannot change ID).
- `patch.layer` changes are blocked (see §3).
- `patch.metadata` is validated against the new metadata shape.
- After update, the Item is broadcast via the Event System.

### removeItem

Delete an Item from the graph.

```typescript
function removeItem(id: string): void;
```

- Item must exist.
- If the Item has `attachmentIds`, all children are detached first (they become independent).
- If the Item is a child of another Item, it is detached from the parent.
- After removal, the removal is broadcast via the Event System.

### attachItem

Create a parent-child relationship.

```typescript
function attachItem(parentId: string, childId: string): void;
```

- Both Items must exist.
- `childId` must not already be a child of `parentId`.
- `childId` must not already have a different parent (each Item can have at most one parent).
- Attaching would create a cycle (depth > 3) is rejected.
- The child's `x`, `y`, `rotation`, `scale` are converted to offsets relative to the parent.
- After attach, both Items are broadcast via the Event System.

### detachItem

Break a parent-child relationship.

```typescript
function detachItem(parentId: string, childId: string): void;
```

- Both Items must exist.
- `childId` must be a child of `parentId`.
- After detach, the child's position is baked: `child.x = parent.x + child.offset.x`.
- After detach, both Items are broadcast via the Event System.

### reorderItem

Move an Item to a new layer and/or zIndex.

```typescript
function reorderItem(id: string, layer: SceneLayer, zIndex: number): void;
```

- Item must exist.
- Target layer must be valid.
- If the Item has `disableAutoZIndex = false`, this also sets `disableAutoZIndex = true` (manual override).
- After reorder, the Item is broadcast via the Event System.

### lockItem / unlockItem

Toggle DM-only lock.

```typescript
function lockItem(id: string): void;
function unlockItem(id: string): void;
```

- Locked Items cannot be moved, rotated, or scaled by players.
- DM can still manipulate locked Items.
- After toggle, the Item is broadcast via the Event System.

### hideItem / showItem

Toggle player visibility.

```typescript
function hideItem(id: string): void;
function showItem(id: string): void;
```

- Hidden Items are not rendered in Player View.
- Hidden Items are rendered in DM Dashboard (with a visual indicator).
- Hidden Items still exist in the graph and can be queried.
- After toggle, the Item is broadcast via the Event System.

---

## 9. Rendering Pipeline

The rendering pipeline transforms the Scene Graph into pixels on screen.

### Step 1: Collect Visible Items

```
visibleItems = graph.items.filter(item => item.visible || isDM)
```

### Step 2: Sort by Render Order

```
visibleItems.sort((a, b) => {
  const layerDiff = a.layer - b.layer;
  if (layerDiff !== 0) return layerDiff;

  const zDiff = a.zIndex - b.zIndex;
  if (zDiff !== 0) return zDiff;

  // Tiebreaker: auto items by y-position, manual items by insertion order
  if (!a.disableAutoZIndex && !b.disableAutoZIndex) {
    return a.y - b.y;
  }
  return 0;
});
```

### Step 3: Resolve Transforms

For each Item:

1. Compute world position: `(x, y)` or `(parent.x + offset.x, parent.y + offset.y)` if attached.
2. Compute world rotation: `rotation` or `parent.rotation + rotation` if attached.
3. Compute world scale: `scale` or `parent.scale × scale` if attached.
4. Apply `disableAttachmentBehavior` overrides.

### Step 4: Render Each Item

```
for item in visibleItems:
  if item.image:
    drawImage(item.image, transform)
  elif item.shape:
    drawShape(item.shape, transform)

  if item.tint:
    applyTint(item.tint)

  applyOpacity(item.opacity)
  applyEffects(item)  // e.g., glow, shadow, outline
```

### Step 5: Render Attachments

After all top-level Items are rendered, render their children in attachment order:

```
for item in visibleItems:
  for childId in item.attachmentIds:
    render(child)  // uses resolved transform from Step 3
```

### Step 6: Render Fog

Fog Items (layer 6) are rendered last as a mask. They occlude all layers below them.

```
fogItems = visibleItems.filter(i => i.layer === SceneLayer.FOG)
for fog in fogItems:
  applyFogMask(fog)
```

### Performance Considerations

- Items outside the viewport are culled (not rendered).
- Items with `opacity = 0` are culled.
- Fog mask is cached and only re-rendered when fog Items change.
- Attachment transforms are cached per frame; invalidated on parent change.

---

## 10. Integration Points

The Scene Graph connects to every major subsystem in Roleito.

### World State

The Scene Graph is stored as part of the World State. All mutations are persisted to the database and broadcast to connected clients.

```
WorldState {
  sceneGraph: SceneGraph;    // ← this document
  // ... other state
}
```

### Map Analysis

When a map image is uploaded, the Map Analysis pipeline:

1. Detects walls, doors, rooms, and terrain regions.
2. Creates Items for each detected element.
3. Populates `metadata` with analysis results.
4. Inserts all Items into the Scene Graph.

### DM Dashboard

The DM Dashboard provides the manipulation UI:

- Drag-and-drop token placement
- Wall/door drawing tools
- Fog of war painting
- Item property inspector (layer, zIndex, metadata)
- Attachment management (drag child onto parent)

### Player View

Player View reads the Scene Graph and:

1. Filters to `visible: true` Items only.
2. Filters by knowledge scope (what can this player see).
3. Renders visible Items using the pipeline from §9.
4. Sends interaction events (click, drag) back to the server.

### 3D Renderer

The 3D Renderer (Three.js + R3F) interprets the Scene Graph:

- Tokens → 3D character models or flat sprites
- Walls → 3D wall meshes
- Doors → animated door models
- Terrain → ground plane textures
- Fog → volumetric fog or flat mask
- Effects → particle systems or billboards

The 3D Renderer does not modify the Scene Graph directly. It reads state and renders.

### Event System

Every Scene Graph operation emits an event:

```typescript
type SceneGraphEvent =
  | { type: 'item-added'; item: Item }
  | { type: 'item-updated'; id: string; patch: Partial<Item> }
  | { type: 'item-removed'; id: string }
  | { type: 'item-attached'; parentId: string; childId: string }
  | { type: 'item-detached'; parentId: string; childId: string }
  | { type: 'item-reordered'; id: string; layer: SceneLayer; zIndex: number }
  | { type: 'item-locked'; id: string }
  | { type: 'item-unlocked'; id: string }
  | { type: 'item-hidden'; id: string }
  | { type: 'item-shown'; id: string };
```

Events are broadcast to all connected clients (DM + Players) and persisted for audit.

---

## 11. Constraints and Invariants

These invariants must hold at all times. Violations are rejected at the API level.

### Structural Invariants

1. **Unique IDs.** Every Item has a unique `id`. No duplicates.
2. **Valid layers.** `item.layer` is a valid `SceneLayer` enum value.
3. **FOG constraint.** Only Items with `metadata.type === 'fog'` may occupy `SceneLayer.FOG`.
4. **Single parent.** Each Item can be a child of at most one parent.
5. **No cycles.** Attachment graphs are acyclic.
6. **Max depth.** Attachment chains are at most 3 levels deep.
7. **Metadata match.** `item.metadata.type` must match the Item's intended role.

### State Invariants

8. **Parent references.** If `item.attachmentIds` contains `childId`, then `childId`'s parent is `item.id`.
9. **Child references.** If `childId` has a parent `parentId`, then `parentId`'s `attachmentIds` contains `childId`.
10. **zIndex bounds.** `zIndex` is an integer in the range `[0, 999_999]`.
11. **Scale positive.** `scale > 0`. Zero or negative scale is rejected.
12. **Opacity bounds.** `opacity` is in the range `[0, 1]`.
13. **Rotation bounds.** `rotation` is in the range `[0, 360)`. Values outside are normalized.

### Behavioral Invariants

14. **Locked immutability.** If `item.locked === true`, players cannot modify `x`, `y`, `rotation`, `scale`, or `metadata`.
15. **Hidden opacity.** If `item.visible === false`, players cannot see or interact with the Item.
16. **Attachment offset bake.** When detaching, child offsets are baked into absolute coordinates.

---

## 12. Examples

### Example 1: Player Character Token

```typescript
const fighter: Item = {
  id: 'tok-001',
  name: 'Fighter',
  x: 120,
  y: 340,
  rotation: 0,
  scale: 1,
  width: 48,
  height: 48,
  image: '/assets/tokens/fighter.png',
  layer: SceneLayer.TOKENS,
  zIndex: 340,
  visible: true,
  locked: false,
  disableHit: false,
  disableAutoZIndex: false,
  attachmentIds: ['label-001', 'hp-bar-001'],
  disableAttachmentBehavior: [],
  metadata: {
    type: 'token',
    characterId: 'char-fighter-001',
    ownerId: 'player-1',
  },
};
```

### Example 2: Weapon Attachment

```typescript
const sword: Item = {
  id: 'weap-001',
  name: 'Longsword',
  x: 20,   // offset from parent
  y: 10,   // offset from parent
  rotation: 45,
  scale: 0.8,
  width: 32,
  height: 32,
  image: '/assets/items/longsword.png',
  layer: SceneLayer.TOKENS,
  zIndex: 340,
  visible: true,
  locked: false,
  disableHit: true,
  disableAutoZIndex: true,
  attachmentIds: [],
  disableAttachmentBehavior: [],
  metadata: {
    type: 'token',
    characterId: 'item-sword-001',
    ownerId: 'player-1',
  },
};
```

### Example 3: Wall

```typescript
const wall: Item = {
  id: 'wall-001',
  name: 'North Wall',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  width: 400,
  height: 12,
  layer: SceneLayer.MAP,
  zIndex: 10,
  visible: true,
  locked: true,
  disableHit: false,
  disableAutoZIndex: true,
  attachmentIds: [],
  disableAttachmentBehavior: [],
  metadata: {
    type: 'wall',
    wallType: 'solid',
    material: 'stone',
    height: 10,
  },
  shape: {
    type: 'rectangle',
    fill: '#555555',
    stroke: '#333333',
    strokeWidth: 2,
  },
};
```

### Example 4: Fog of War

```typescript
const fog: Item = {
  id: 'fog-001',
  name: 'Dungeon Fog',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  width: 1200,
  height: 800,
  layer: SceneLayer.FOG,
  zIndex: 0,
  visible: true,
  locked: false,
  disableHit: true,
  disableAutoZIndex: true,
  attachmentIds: [],
  disableAttachmentBehavior: [],
  metadata: {
    type: 'fog',
    fogType: 'dynamic',
    cutMask: '/campaigns/camp-001/fog-mask-room1.png',
  },
};
```

### Example 5: Spell Template

```typescript
const fireball: Item = {
  id: 'fx-001',
  name: 'Fireball',
  x: 200,
  y: 400,
  rotation: 0,
  scale: 1,
  width: 60,
  height: 60,
  layer: SceneLayer.EFFECTS_ABOVE,
  zIndex: 500,
  visible: true,
  locked: false,
  disableHit: true,
  disableAutoZIndex: true,
  attachmentIds: [],
  disableAttachmentBehavior: [],
  metadata: {
    type: 'effect',
    effectType: 'fireball',
    duration: 1,
  },
  shape: {
    type: 'template',
    templateId: 'sphere-20ft',
    templateVars: {
      radius: 60,
      color: '#ff440060',
      strokeColor: '#ff2200',
    },
  },
};
```

---

## Appendix A: Relationship to 3D Renderer

The 3D Renderer reads the Scene Graph and interprets Items for Three.js:

| 2D Item | 3D Interpretation |
|---------|-------------------|
| Token with image | Sprite in 3D space or full 3D model |
| Wall with shape | Box geometry with wall material |
| Door with state | Animated door model (open/closed) |
| Terrain with type | Ground plane with texture |
| Effect with template | Particle system or billboard |
| Fog with mask | Volumetric fog or flat plane mask |
| Label with text | Text sprite or 3D text mesh |

The 3D Renderer never writes to the Scene Graph. It is a read-only consumer.

---

## Appendix B: Event System Integration

Every Scene Graph operation broadcasts an event. The Event System handles:

1. **Persistence.** Event is written to the event log (SQLite).
2. **Broadcast.** Event is sent to all connected clients via WebSocket.
3. **Side effects.** Event triggers downstream handlers (e.g., fog update → recompute visibility).

Events are processed sequentially. The Scene Graph is updated before the event is broadcast. Clients receive the event and update their local copy of the graph.

---

## Appendix C: Database Schema

The Scene Graph is stored in SQLite as a JSON blob within the World State:

```sql
CREATE TABLE world_state (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  scene_graph TEXT NOT NULL,  -- JSON-serialized SceneGraph
  updated_at DATETIME NOT NULL,
  version INTEGER NOT NULL
);
```

For query performance, frequently accessed Items are indexed:

```sql
CREATE INDEX idx_scene_items_layer ON scene_items(layer);
CREATE INDEX idx_scene_items_owner ON scene_items(owner_id);
CREATE TABLE scene_items (
  id TEXT PRIMARY KEY,
  world_state_id TEXT NOT NULL,
  item_data TEXT NOT NULL,  -- JSON-serialized Item
  layer INTEGER NOT NULL,
  owner_id TEXT,
  FOREIGN KEY (world_state_id) REFERENCES world_state(id)
);
```

---

## 13. Current Implementation Status

This section maps the Scene Graph design to the existing codebase. The Scene Graph is **not yet implemented** — the current code uses a simpler model.

### Existing Code → Scene Graph Mapping

| Existing Code | Scene Graph Equivalent | Notes |
|---------------|----------------------|-------|
| `SceneCharacter` (backend/models.py:220) | `Item` with `metadata.type === 'token'` | SceneCharacter has x,y,z; Item uses x,y. SceneCharacter has `order`; Item uses `zIndex` + `layer`. |
| `SceneCharacter.entity_type` | `Item.metadata.type` | `'character'`/`'npc'` → `'token'` |
| `SceneCharacter.token_scale` | `Item.scale` | Different field name |
| `SceneCharacter.brightness` | `Item.metadata.brightness` | Move to metadata |
| `Scene.lighting` (string) | Multiple `LightSource` entities | Current: 5 hardcoded modes. New: data-driven light sources. |
| `SceneBackground` (SceneRenderer.tsx:47) | `Item` with `layer === SceneLayer.MAP` | Background becomes a MAP layer Item |
| `GridOverlay` (SceneRenderer.tsx:111) | `Item` with `layer === SceneLayer.TERRAIN` | Grid becomes a TERRAIN layer Item |
| `TokenSprite` (TokenSprite.tsx) | `ItemRenderer` for token Items | Billboard + circle → Item with image or shape |
| `TokenModel` (TokenModel.tsx) | `ItemRenderer` for token Items with 3D | GLB model from asset system |
| `SceneRenderer` (SceneRenderer.tsx:431) | `SceneCanvas` | Renamed to avoid confusion |
| `DragController` (SceneRenderer.tsx:140) | Built into `SceneCanvas` | Selection + drag logic |

### Naming Collision

`core/domain/types.ts` defines `InventoryItem` (renamed from `Item` to avoid collision). The Scene Graph `Item` is a **different entity** — it represents a renderable scene object, not an inventory item.

### What Does NOT Exist Yet

- `enum SceneLayer` — no layer system in code
- `Item` interface (scene) — only `SceneCharacter` exists
- `ItemMetadata` types — no discriminated union metadata
- `ItemShape` types — no vector shape rendering
- Attachment system — no parent-child relationships
- `zIndex` system — render order is array order only
- Wall/Door entities — not implemented
- Fog system — not implemented
- Dynamic lighting — only hardcoded presets

---

*This document is the authoritative definition of the Scene Graph system. All implementations must conform to the interfaces, constraints, and behaviors described here.*
