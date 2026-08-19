# DM Dashboard — VTT Design

> Rediseño de la UI del DM basado en paradigma Virtual Tabletop (VTT).
>
> El mapa es el punto central. Todo lo demás son paneles flotantes (HUD).

---

# 1. Core Concept

```
┌──────────────────────────────────────────────────────────┐
│ [≡]  Campaign Name     [Scene 3/7]  [⚙] [🌙] [👤] │  ← TopBar
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │                                                   │    │
│  │                                                   │    │
│  │              3D SCENE (MAP)                       │    │
│  │           Tokens with drag & drop                 │    │
│  │                                                   │    │
│  │                                                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────┐                            ┌────────────┐  │
│  │ TOKEN  │                            │ SESSION    │  │
│  │ TRAY   │                            │ LOG        │  │
│  │        │                            │            │  │
│  └────────┘                            └────────────┘  │
│                                                          │
│  ┌──────────────────────┐   ┌──────────────────────┐    │
│  │ CHARACTER SHEET      │   │ SCENE NOTES          │    │
│  │ (click token to open)│   │ (per-scene notes)    │    │
│  └──────────────────────┘   └──────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

**Principle:** The map is always visible. HUD panels float on top. No page navigation during gameplay.

---

# 2. Layout Architecture

## 2.1 Full-Screen Canvas

The 3D scene (SceneRenderer) fills the entire viewport behind everything.

```
DmDashboard
├── SceneCanvas (position: absolute, z-index: 0) — fills viewport
├── TopBar (position: fixed, z-index: 10)
├── TokenTray (position: fixed, z-index: 20)
├── HudPanel[] (position: fixed, z-index: 20) — draggable
└── Sidebar (position: fixed, z-index: 30) — collapsible, icon-only
```

## 2.2 Z-Index Stack

```
0  — SceneCanvas (3D map)
10 — TopBar
20 — HUD Panels, Token Tray
30 — Sidebar (when open)
40 — Modals (character creation, settings)
50 — Context menus
```

---

# 3. Component Specification

## 3.1 SceneCanvas

**Purpose:** Full-viewport 3D scene with the map and tokens.

**Props:**
```typescript
interface SceneCanvasProps {
  scene: Scene;
  tokens: TokenData[];
  onTokenMove: (tokenId: string, x: number, z: number) => void;
  onTokenClick: (tokenId: string) => void;
  onMapClick: (x: number, z: number) => void;
}
```

**Behaviors:**
- Renders SceneRenderer with map background and tokens
- Supports OrbitControls for camera (DM only)
- Click token → calls onTokenClick → opens Character Sheet HUD
- Drag token → calls onTokenMove → updates position in DB
- Click empty map → could place new token or deselect

**Drag & Drop (3D):**
- Use R3F's `onPointerDown` / `onPointerUp` / `onPointerMove` on token meshes
- Track drag state, update position on drop
- Persist position to backend via API

## 3.2 TopBar

**Purpose:** Minimal top bar with essential controls.

```
[≡]  Campaign Name     [Scene 3/7 ▾]  [Upload BG] [Lighting ▾] [⚙]
```

**Elements:**
- **≡ (hamburger):** Toggle sidebar
- **Campaign Name:** Display only
- **Scene Selector:** Dropdown showing numbered scenes (3/7). Click to switch.
- **Upload BG:** Quick map upload for current scene
- **Lighting:** Dropdown (neutral/dark/dim/bright/torchlight)
- **⚙:** Settings (player view, export, etc.)

## 3.3 TokenTray (Left Panel)

**Purpose:** List of all tokens on scene + available entities to add.

```
┌─────────────────┐
│ ON SCENE (3)    │
│  [🟢] Ardan     │  ← click to select, highlight on map
│  [🟡] Varek     │
│  [🔴] Goblin    │
│                 │
│ AVAILABLE (5)   │
│  + María        │  ← click to add to scene
│  + Session 2 NPCs│
│                 │
│ [+ Add Token]   │  ← opens entity picker
└─────────────────┘
```

**Behaviors:**
- Lists tokens currently on scene (click to highlight/focus on map)
- Lists available characters/NPCs not on scene (click to add)
- Add button opens entity picker modal
- Remove button (×) to remove from scene
- Toggle visibility (eye icon)

## 3.4 CharacterSheetHud (Floating Panel)

**Purpose:** Show character stats when token is clicked.

```
┌──────────────────────────┐
│ Portrait  Ardan          │  ← name + portrait
│           Guerrero Humano│  ← class + race
│                          │
│ PV ████████░░ 24/32     │  ← VidaBar
│ PM █████░░░░░ 12/28     │  ← VidaBar
│                          │
│ [V:8] [I:4] [D:6] [A:5]│  ← VIDA stats
│                          │
│ Defensa: 11             │
│ Regen: 8 PV/hr          │
│                          │
│ [Edit] [Remove from Map] │
└──────────────────────────┘
```

**Behaviors:**
- Opens when token is clicked on map
- Draggable (position anywhere on screen)
- Resizable (min/max width)
- Close button (×)
- Shows real-time PV/PM
- Edit button opens full character editor (modal)

## 3.5 SessionLogHud (Floating Panel)

**Purpose:** Session notes and event log.

```
┌──────────────────────────┐
│ SESSION LOG    [Session 5]│
│──────────────────────────│
│ 🕐 14:32  Ardan abrió   │
│          la puerta       │
│ 🕐 14:45  Combate: 3    │
│          goblins         │
│ 🕐 15:02  Varek reveló  │
│          su secreto      │
│                          │
│ [+ Add Note]  [Export]   │
│──────────────────────────│
│ Nota rápida: ...         │  ← quick input
└──────────────────────────┘
```

**Behaviors:**
- Shows timestamped notes for current session
- Quick note input at bottom (Enter to add)
- Auto-scroll to latest
- Can be filtered by session number
- Export notes to markdown

## 3.6 SceneNotesHud (Floating Panel)

**Purpose:** Persistent notes attached to the current scene.

```
┌──────────────────────────┐
│ SCENE NOTES  [Scene 3]  │
│──────────────────────────│
│ La sala tiene 3 puertas: │
│ - Norte: pasillo         │
│ - Este: bóveda (cerrada) │
│ - Sur: salida            │
│                          │
│ Trampas: piso presión    │
│ en tiles (3,4) y (5,2)  │
└──────────────────────────┘
```

**Behaviors:**
- Notes persist per scene (stored in DB)
- Auto-saves on blur or debounced
- Markdown support (optional)
- Different from session log (scene-specific, not chronological)

## 3.7 MapSelectorHud (Floating Panel)

**Purpose:** Quick map switching and scene management.

```
┌──────────────────────────┐
│ SCENES                   │
│──────────────────────────│
│ 1. Templo 🟢 (active)    │
│ 2. Pasillo               │
│ 3. Bóveda                │
│ 4. Salida                │
│                          │
│ [+] New Scene            │
│ [Upload Map]             │
└──────────────────────────┘
```

**Behaviors:**
- Lists all scenes with numbers
- Active scene highlighted
- Click to switch scene
- "+" to create new scene
- Upload map for selected scene
- Drag to reorder (future)

## 3.8 QuickActionsHud (Floating Panel)

**Purpose:** Common DM actions.

```
┌──────────────────────────┐
│ QUICK ACTIONS            │
│──────────────────────────│
│ [🌙 Toggle Dark]        │
│ [🎲 Roll Dice]          │
│ [📝 Add Event]          │
│ [👥 Players View]       │
│ [💾 Save Snapshot]      │
│ [📋 Export Session]     │
└──────────────────────────┘
```

## 3.9 Collapsible Sidebar

**Purpose:** Settings and navigation (collapsed by default).

**Collapsed state:** Just icons on the left edge:
```
[≡] ← hamburger icon
[🏠] ← overview
[⚙] ← settings
```

**Expanded state:** Full sidebar with labels:
```
← Campaigns
Roleito
────────────
◆ Overview
♦ Characters
♠ Sessions
▣ Scenes
• Events
○ Players
◇ Images
□ Assets
```

**Behaviors:**
- Default collapsed (just icons)
- Click ≡ to expand
- Click outside to collapse
- On mobile: overlay mode

---

# 4. Scene Transition System

## 4.1 Concept

Scenes represent different rooms/areas. When the party moves between rooms, the DM transitions to the next scene.

```
Scene 1: Templo (entry)
    ↓ (door detected or manual)
Scene 2: Pasillo
    ↓
Scene 3: Bóveda
    ↓
Scene 4: Salida
```

## 4.2 Scene Model

```typescript
interface Scene {
  id: string;
  campaign_id: string;
  number: number;           // sequential order
  name: string;
  description: string;
  background_path: string | null;
  lighting: string;
  status: 'active' | 'inactive';
  notes: string;            // scene-specific notes
  entrance_x: number;       // where tokens spawn when entering
  entrance_z: number;
  transition_points: TransitionPoint[];  // doors/exits
}
```

## 4.3 TransitionPoint

A point on the map that leads to another scene.

```typescript
interface TransitionPoint {
  id: string;
  scene_id: string;
  target_scene_id: string;
  name: string;              // "Puerta norte", "Escalera abajo"
  x: number;                 // position on map
  z: number;
  radius: number;            // detection radius
  requires_confirmation: boolean;  // DM must confirm
}
```

## 4.4 Transition Flow

```
1. Token approaches transition point (within radius)
   ↓
2. System detects proximity (or DM clicks transition button)
   ↓
3. HUD shows prompt: "Party approaching 'Puerta norte' → Bóveda"
   ↓
4. DM clicks [Confirm Transition]
   ↓
5. All tokens on current scene are moved to entrance of target scene
   ↓
6. Scene switches to target scene
   ↓
7. Event is logged: "Party transitioned from Scene 2 to Scene 3"
```

## 4.5 DM Confirmation

The DM must always confirm transitions. This allows:
- Narration before transition ("You see a heavy iron door...")
- Roll for traps/checks before opening
- Decide which party members go through
- Pause for player decisions

## 4.6 Door Detection (Future AI)

> **Note:** AI door detection is a Phase 2+ feature. For MVP, transitions are manually placed by DM.

Manual placement:
1. DM clicks "Add Transition" on a scene
2. DM clicks on map to place the point
3. DM selects target scene
4. Done

---

# 5. Token System

## 5.1 Token Data

```typescript
interface TokenData {
  id: string;              // scene-character id
  entity_id: string;       // character or NPC id
  entity_type: 'character' | 'npc';
  name: string;
  portrait_url: string | null;
  x: number;
  z: number;
  visible: boolean;
  status: 'alive' | 'dead' | 'unconscious';
}
```

## 5.2 Token Colors

Based on entity type:
- Character (player): Green (#4ade80)
- NPC (friendly): Yellow (#facc15)
- NPC (hostile): Red (#ef4444)
- Creature: Orange (#f97316)

## 5.3 Token Interactions

| Action | Behavior |
|--------|----------|
| Click | Select token, open Character Sheet HUD |
| Double-click | Open full editor modal |
| Drag | Move token on map |
| Right-click | Context menu (hide, remove, edit) |
| Hover | Show name tooltip |

## 5.4 Drag & Drop Implementation

```typescript
// In SceneRenderer, on token mesh:
onPointerDown={(e) => {
  e.stopPropagation();
  setSelectedToken(token.id);
  setIsDragging(true);
}}
onPointerMove={(e) => {
  if (isDragging) {
    // Convert screen coords to world coords
    // Update token position locally
  }
}}
onPointerUp={(e) => {
  if (isDragging) {
    // Persist new position to backend
    api.scenes.updateCharacterPosition(campaignId, sceneId, token.id, newX, newZ);
    setIsDragging(false);
  }
}}
```

---

# 6. State Management

## 6.1 DmDashboard Context

```typescript
interface DmDashboardState {
  // Scene
  currentScene: Scene | null;
  scenes: Scene[];
  
  // Tokens
  tokens: TokenData[];
  
  // HUD Panel visibility
  panels: {
    characterSheet: { open: boolean; tokenId: string | null };
    sessionLog: { open: boolean };
    sceneNotes: { open: boolean };
    tokenTray: { open: boolean };
    mapSelector: { open: boolean };
    quickActions: { open: boolean };
  };
  
  // Sidebar
  sidebarOpen: boolean;
  
  // Settings
  lighting: string;
}
```

## 6.2 Actions

```typescript
type DmDashboardAction =
  | { type: 'SET_SCENE'; scene: Scene }
  | { type: 'SET_TOKENS'; tokens: TokenData[] }
  | { type: 'MOVE_TOKEN'; tokenId: string; x: number; z: number }
  | { type: 'TOGGLE_PANEL'; panel: string }
  | { type: 'OPEN_CHARACTER_SHEET'; tokenId: string }
  | { type: 'CLOSE_CHARACTER_SHEET' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_LIGHTING'; lighting: string };
```

---

# 7. Routes (Updated)

```
/                                    → CampaignList
/campaigns/new                       → CampaignForm
/campaigns/:id                       → DmDashboard (VTT!)
/campaigns/:id/edit                  → CampaignForm
/campaigns/:id/characters            → CharacterList (management)
/campaigns/:id/characters/new        → CharacterForm
/campaigns/:id/characters/:charId    → CharacterDetail (management)
/campaigns/:id/sessions              → SessionList (management)
/campaigns/:id/sessions/:sid         → SessionDetail (management)
/campaigns/:id/events                → EventList (management)
/campaigns/:id/images                → ImageLibrary (management)
```

**Key change:** `/campaigns/:id` now renders DmDashboard (the VTT), not CampaignDetail.

---

# 8. Implementation Phases

## Phase 6.5: DmDashboard Shell
1. Create DmDashboard page component
2. SceneCanvas fills viewport
3. TopBar with scene selector
4. Basic token rendering on map

## Phase 7: Token System
1. Token drag & drop on 3D map
2. Token click → open CharacterSheetHud
3. TokenTray (add/remove tokens)
4. Token state (visibility, status)

## Phase 8: HUD Panels
1. CharacterSheetHud (draggable panel)
2. SessionLogHud
3. SceneNotesHud (per-scene persistence)
4. QuickActionsHud
5. MapSelectorHud (scene switching)

## Phase 9: Scene Transitions
1. TransitionPoint model
2. Manual placement of transitions
3. DM confirmation dialog
4. Auto-move tokens to entrance
5. Scene switching

## Phase 10: Polish
1. Collapsible sidebar
2. Keyboard shortcuts
3. Player view (read-only token movement)
4. Context menus

---

# 9. Backend Changes

## 9.1 Scene Model Updates

```python
class Scene(Base):
    # ... existing fields ...
    notes = Column(Text, default="")
    entrance_x = Column(Float, default=0.0)
    entrance_z = Column(Float, default=0.0)
    transition_points_json = Column(Text, default="[]")  # JSON array
```

## 9.2 Scene API Updates

```python
# New endpoints:
PUT /campaigns/{cid}/scenes/{sid}/notes     → update scene notes
PUT /campaigns/{cid}/scenes/{sid}/position  → update entrance position
POST /campaigns/{cid}/scenes/{sid}/transitions → add transition point
DELETE /campaigns/{cid}/scenes/{sid}/transitions/{tid} → remove transition
POST /campaigns/{cid}/scenes/{sid}/transition/{tid}/execute → execute transition
```

## 9.3 Token Position API

```python
# Update token position (drag & drop)
PUT /campaigns/{cid}/scenes/{sid}/characters/{scid}/position
Body: { "x": 2.5, "z": -1.3 }
```

---

# 10. Design Decisions

## 10.1 Why Collapsible Sidebar?
- Sidebar competes with map for space
- Collapsed = icons only = minimal footprint
- Expanded = for management tasks, not gameplay

## 10.2 Why Floating HUD Panels?
- DM needs to see map AND data simultaneously
- Panels can be positioned where DM prefers
- Multiple panels can be open at once
- Each panel is independent

## 10.3 Why Manual Transition Confirmation?
- AI door detection is unreliable (Phase 2+)
- DM needs narrative control over transitions
- Players might not go through every door
- Allows for traps, checks, decisions

## 10.4 Why Scene Notes Separate from Session Log?
- Scene notes = spatial (about the room)
- Session log = temporal (what happened)
- Both are useful but serve different purposes
- Scene notes persist across sessions, session log is per-session
