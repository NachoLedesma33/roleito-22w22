# Owlbear Rodeo — Technical Reference

Quick-reference for Roleito developers. Patterns to adopt, not a lore doc.

## 1. Architecture Overview

- **Client-side only** — no server, no database, no sync
- **Extension-based** — core has zero features; everything is an extension
- **Three-state model**: Persistent / Transient / Ephemeral
- **Stack**: React + HTML Canvas 2D (no WebGL, no Three.js)
- **No central state manager** — event-driven, each component owns its slice
- **Local-first** — data lives in browser, export/import for persistence

```
┌─────────────────────────────────────────────┐
│                UI Layer                     │
│  React components + Extension HTML panels   │
├─────────────────────────────────────────────┤
│             Interaction API                 │
│  selection$, scroll$, pointer$, ruler$      │
│  (transient, interpolated, never saved)     │
├─────────────────────────────────────────────┤
│             Broadcast API                   │
│  emotes, name tags, cursors (ephemeral)     │
├─────────────────────────────────────────────┤
│              Scene Graph                    │
│  items[] with x/y/rotation/scale/zIndex     │
│  (persistent, serialized on export)         │
└─────────────────────────────────────────────┘
```

## 2. Core Data Model

### Scene Items (Persistent)

```ts
interface Item {
  id: string
  name: string
  image: string           // URL or base64
  visible: boolean
  locked: boolean
  x: number
  y: number
  rotation: number
  scale: number
  width: number
  height: number
  zIndex: number          // order within a layer
  layer: string           // category: "map" | "tokens" | "objects" | "effects"
  metadata: Record<string, unknown>
  attachmentIds: string[] // child items
  disableHit: boolean
  disableAutoZIndex: boolean
  disableAttachmentBehavior: boolean
}
```

### Player State (Persistent, per-player)

```ts
interface PlayerState {
  selection: string[]     // selected item IDs
  scroll: { x: number; y: number }
  pointer: { x: number; y: number }
  highlights: Highlight[]
  measurement: Measurement
  ruler: Ruler
  color: string           // player color
  name: string
}
```

### Interaction API (Transient — never persisted)

Real-time, interpolated between frames:

| Observable | Purpose |
|------------|---------|
| `selection$` | Current selection (other players see highlight) |
| `scroll$` | Viewport scroll position |
| `pointer$` | Live pointer position |
| `highlights$` | Temporary visual highlights |
| `measurement$` | Active measurement tool |
| `ruler$` | Active ruler tool |

### Broadcast API (Ephemeral — fire and forget)

One-shot events, no state:

- Emotes (animated icons above tokens)
- Name tags (toggle on/off)
- Cursor images (custom cursor appearance)
- Custom events (extension-to-extension)

## 3. Key Patterns

### Selection System

Player-centric, not item-centric:

```ts
// WRONG — item-centric
item.selected = true

// RIGHT — player-centric
player.selection = [itemId1, itemId2]
// Other players see selection highlight but don't own it
```

Each player has independent selection. No global "selected item".

### Layer vs Z-Index

Two-level ordering system:

```
Layer (category)     Z-Index (order within layer)
─────────────        ───────────────────────────
"effects"            0, 1, 2, ...
"objects"
"tokens"
"map"
```

- `layer` = broad category (which render pass)
- `zIndex` = fine ordering within that layer
- Items on higher layers always render above lower layers regardless of zIndex

### Attachment System

Parent-child relationships:

```ts
// Attach child to parent
parent.attachmentIds = [child.id]

// Child inherits parent transforms:
// - Position: offset from parent origin
// - Rotation: rotates with parent
// - Scale: scales with parent
// - Visibility: hides with parent (if configured)
```

Use cases: health bars on tokens, labels on objects, conditions on characters.

### Three-State Architecture

```
PERSISTENT (saved with scene)
├── Items (map, tokens, walls, lights)
├── Player state (selection, scroll, position)
└── Scene metadata (name, background)

TRANSIENT (real-time, never saved)
├── Pointer positions (live cursors)
├── Selection highlights
├── Scroll sync
├── Measurement/ruler tool
└── Drag operations in progress

EPHEMERAL (fire-and-forget)
├── Emotes
├── Name tag toggles
├── Cursor image changes
└── Custom extension events
```

### Fog of War

Orthogonal rendering layer, not an item property:

- **Cut fog**: Remove fog from area (reveal)
- **Uncut fog**: Restore fog (hide)
- Per-player: each player has independent fog state
- Stored as polygon cut operations, not pixel data
- Rendered as overlay, separate from scene items

### Walls

Line segments on the scene graph:

```ts
interface Wall {
  id: string
  x1: number; y1: number  // start point
  x2: number; y2: number  // end point
  closed: boolean         // forms closed shape
  doors: Door[]           // optional openings
  metadata: {
    transparent: boolean   // blocks movement, allows sight
    oneWay: boolean        // only blocks from one side
  }
}
```

- Block line of sight
- Block movement (optional per wall)
- Doors: open/close, lock/unlock
- Light sources respect wall occlusion

### Lighting

Token-attached or fixed:

```ts
interface Light {
  id: string
  itemId?: string         // attached to item (moves with it)
  x: number               // or fixed position
  y: number
  radius: number
  intensity: number       // 0-1
  color: string           // hex
  shadows: boolean        // cast shadows from walls
}
```

- Walls block light
- Multiple lights blend (additive)
- Darkness level configurable per scene
- Vision cones for limited-vision tokens

### Initiative

Metadata-driven, not built-in:

```ts
// Stored in item metadata
item.metadata.initiative = {
  value: 15,
  isActive: true,
  isGM: false
}
```

- Context menu: "Add to Initiative", "Remove from Initiative"
- Extension UI: initiative tracker panel
- Sort by initiative value
- Round/turn tracking in extension state

### Extension System

Extensions are isolated, communicate via events:

```ts
// Extension registration
UI.register({
  type: "panel",           // "panel" | "popover" | "action"
  positions: ["right"],    // dock positions
  render: () => <MyPanel />
})

// Tool registration
setTool({
  id: "my-tool",
  icon: "icon.svg",
  cursor: "crosshair",
  onPointerDown: (e) => { ... },
  onPointerMove: (e) => { ... },
  onPointerUp: (e) => { ... }
})

// Action registration
registerAction({
  id: "my-action",
  label: "Do Thing",
  icon: "icon.svg",
  perform: () => { ... }
})
```

**Key rules:**
- Extensions can't access other extensions' state directly
- Communication only through Broadcast API or shared scene items
- Each extension manages its own UI lifecycle
- Extensions can register tools, actions, panels, popovers

### Variable Fonts

Runtime font styling via OpenType axes:

```ts
// Default (regular)
"font-variation-settings": "wdth 100, wght 400"

// Condensed bold
"font-variation-settings": "wdth 75, wght 700"

// Wide light
"font-variation-settings": "wdth 125, wght 300"
```

- `wdth`: Width axis (75-125 typical)
- `wght`: Weight axis (300-700 typical)
- Applied per-element, no font file swapping
- Useful for token labels, UI text, chat

## 4. Message Types

```
InputMessage
└── Raw user input (pointer, keyboard, touch)

Message
└── State mutations (item.create, item.change, item.delete)

TransactionMessage
└── Atomic batch of mutations (all succeed or all fail)

WaitMessage
└── Loading indicator (extension tells UI to show spinner)
```

## 5. Event Reference

Scene item events:
- `item.create` — new item added to scene
- `item.delete` — item removed
- `item.change` — item properties modified

Player events:
- `player.change` — player state updated
- `player.delete` — player disconnected

Interaction events:
- `selection.change`
- `scroll.change`
- `pointer.change`
- `highlights.change`
- `measurement.change`
- `ruler.change`

Broadcast events:
- `message.send` — ephemeral message sent
- `message.delete` — ephemeral message removed

## 6. Extension API Quick Reference

| Function | Purpose |
|----------|---------|
| `setTool(tool)` | Register a canvas tool |
| `registerAction(action)` | Add context menu action |
| `deregisterAction(id)` | Remove context menu action |
| `UI.register(config)` | Register UI panel/popover |
| `UI.deregister(id)` | Remove UI panel/popover |
| `on(event, handler)` | Subscribe to event |
| `off(event, handler)` | Unsubscribe |
| `emit(event, data)` | Broadcast event |
| `get state` | Read current scene state |
| `pushTransaction(msgs)` | Atomic state mutation |
| `getSelected()` | Get selected item IDs |
| `getPlayerState()` | Get local player state |

## 7. What Owlbear Does NOT Do

Roleito differentiators — gaps Owlbear leaves open:

| Feature | Owlbear | Roleito |
|---------|---------|---------|
| Semantic map analysis | None | AI reads terrain, identifies tactical features |
| AI generation | None | Procedural content, NPC dialogue, worldbuilding |
| TTS / voice | None | AI voice for NPCs |
| 3D rendering | None | Three.js scene renderer |
| Server-side processing | None | FastAPI backend, world state engine |
| Campaign management | None | Persistent campaigns, sessions, story arcs |
| Dynamic fog | None | AI-driven fog, predictive visibility |
| Environmental effects | None | Weather, time of day, seasons |
| NPC intelligence | None | AI-controlled NPCs with memory |

## 8. Implementation Priority

Align with Roleito roadmap:

```
Phase 1-2: Core Scene
├── Scene graph with items (match Owlbear's Item model)
├── Selection system (player-centric)
├── Layer + Z-Index ordering
├── Basic tools (select, move, measure)
└── Extension system (UI panels, actions)

Phase 3: Tactical Layer
├── Fog of War (expand Owlbear's cut/uncut)
├── Walls + doors (add height for future 3D)
├── Lighting system (add color temperature)
└── Initiative tracker

Phase 4: AI Integration (Roleito's edge)
├── Semantic scene analysis
├── AI-generated content
├── NPC dialogue engine
└── Dynamic environmental effects

Phase 5: 3D Rendering
├── Three.js scene from scene graph
├── Procedural 3D models (img2threejs)
├── Camera controls
└── Atmospheric effects
```

## 9. Rendering Pipeline Comparison

```
Owlbear:                    Roleito:
─────────                   ────────
React UI                    React UI
    │                           │
Canvas 2D                   Three.js / WebGL2
    │                           │
Skia (SkSL shaders)         GLSL shaders
    │                           │
HTML overlay panels         HTML overlay panels (same pattern)
```

**Adopt from Owlbear:**
- Extension UI pattern (HTML panels over canvas)
- Event-driven updates (not polling)
- Player-centric state model
- Three-state architecture
- Layer + Z-Index ordering

**Don't copy:**
- Skia/SkSL (use GLSL/WebGL2 instead)
- Canvas 2D rendering (use Three.js)
- Client-only architecture (Roleito has server)
- Extension isolation (Roleito needs tighter AI integration)
