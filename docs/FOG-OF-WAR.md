# DM Environment Control & Fog of War

## Core Concept

```text
DM sees EVERYTHING
Players see ONLY what DM allows
Fog of war hides unexplored areas
DM can show/hide anything at any time
```

---

## Fog of War System

### Visibility States

Each area of the map has a visibility state:

```typescript
enum VisibilityState {
  HIDDEN = 'hidden',        // Players can't see at all
  EXPLORED = 'explored',    // Players saw it before, now dimmed
  VISIBLE = 'visible',      // Players can see current state
  REVEALED = 'revealed',    // DM manually revealed
}
```

### Area Types

```yaml
area_visibility:
  # Room fully hidden
  room_01:
    state: hidden
    players_can_see: false
    dm_notes: "Secret room, not discovered yet"
    
  # Room explored before but players left
  room_02:
    state: explored
    players_can_see: false  # only last known state
    last_known_state:
      enemies: 2
      items: ["chest"]
      notes: "Players cleared this room"
      
  # Room currently visible
  room_03:
    state: visible
    players_can_see: true
    current_state:
      players_present: ["P1", "P2"]
      enemies: 1
      lighting: dim
      fog: light
      
  # DM manually revealed
  room_04:
    state: revealed
    players_can_see: true
    reason: "DM wants to show something"
```

---

## DM Control Interface

### Fog of War Panel

```
┌─────────────────────────────────────────┐
│  Fog of War Control                     │
│  ─────────────────────────────────────  │
│  Current Map: Prison Level 3            │
│  ─────────────────────────────────────  │
│  Mode: [Brush] [Rectangle] [Room]       │
│  ─────────────────────────────────────  │
│  Actions:                               │
│  [Reveal Selected]  [Hide Selected]     │
│  [Reveal All]  [Hide All]               │
│  [Reveal Room]  [Reveal Corridor]       │
│  ─────────────────────────────────────  │
│  Quick Actions:                         │
│  [Fog of War ON/OFF]                    │
│  [Auto-Reveal on Player Move]           │
│  [Show/Hide Enemies]                    │
│  [Show/Hide Items]                      │
│  ─────────────────────────────────────  │
│  Brush Size: [1] [2] [3] [5]           │
│  ─────────────────────────────────────  │
│  [Save Layout]  [Load Layout]           │
└─────────────────────────────────────────┘
```

### Room-by-Room Control

```
┌─────────────────────────────────────────┐
│  Room Visibility Control                │
│  ─────────────────────────────────────  │
│  Room: Guard Room                       │
│  Status: VISIBLE                        │
│  ─────────────────────────────────────  │
│  Players in room: P1, P2               │
│  ─────────────────────────────────────  │
│  Visibility:                            │
│  ☑ Room structure                       │
│  ☑ Enemies (2 guards)                  │
│  ☑ Items (key on desk)                 │
│  ☐ Secret passage (DM only)            │
│  ☐ Trap under floor (DM only)          │
│  ─────────────────────────────────────  │
│  [Reveal All]  [Hide All]              │
│  [Reveal to Players]  [Hide from Players]│
└─────────────────────────────────────────┘
```

---

## Object Visibility Control

### Per-Object Visibility

Each object in the world can have independent visibility:

```typescript
interface WorldObject {
  id: string;
  type: string;
  
  // Visibility
  visibility: {
    dm_only: boolean;        // Only DM can see
    players_can_see: boolean;
    revealed_to: string[];   // Player IDs who can see
    
    // Conditional visibility
    visible_when: {
      player_nearby: number;  // Distance in grid units
      light_source: boolean;
      searching: boolean;
      specific_player: string;
    };
  };
}
```

### Object Examples

```yaml
objects:
  # Regular door - everyone can see
  door_01:
    visibility:
      dm_only: false
      players_can_see: true
      
  # Hidden trap - only DM sees
  trap_01:
    visibility:
      dm_only: true
      players_can_see: false
      
  # Secret passage - DM can reveal
  secret_passage_01:
    visibility:
      dm_only: true
      players_can_see: false
      reveal_condition: "player searches wall"
      
  # Key on table - visible when in room
  key_01:
    visibility:
      dm_only: false
      players_can_see: true
      visible_when:
        player_nearby: 2
        
  # Enemy behind door - hidden until opened
  guard_01:
    visibility:
      dm_only: false
      players_can_see: false
      visible_when:
        door_opened: true
```

---

## Environment Effects

### Smoke Bomb

```yaml
effect:
  type: smoke_bomb
  caster: "P1"
  location: {x: 15, y: 22}
  
  # Effect properties
  radius: 3  # grid units
  duration: 30  # seconds
  opacity: 0.9
  
  # Visibility impact
  visibility:
    inside_smoke:
      players_can_see: false
      enemies_can_see: false
      
    outside_smoke:
      players_can_see: true  # can see the smoke cloud
      
  # DM control
  dm_options:
    - "Remove smoke early"
    - "Extend duration"
    - "Change opacity"
    - "Add wind direction"
```

### Room Fog

```yaml
effect:
  type: fog
  room: "room_03"
  
  # Fog properties
  density: light  # light, medium, thick
  color: "#e8e8e8"
  
  # Visibility impact
  visibility:
    inside_fog:
      player_vision: 3  # grid units
      enemy_vision: 3
      
    outside_fog:
      can_see_into: false  # fog blocks view
      
  # DM control
  dm_options:
    - "Change density"
    - "Clear fog"
    - "Move fog"
    - "Make fog thicker"
```

### Darkness

```yaml
effect:
  type: darkness
  area: "dungeon_level_2"
  
  # Darkness properties
  level: total  # partial, total
  light_sources: ["torch_01", "torch_02"]
  
  # Visibility impact
  visibility:
    without_light:
      player_vision: 1
      can_see_anything: false
      
    with_light:
      player_vision: 5
      can_see周围: true
      
  # DM control
  dm_options:
    - "Add light source"
    - "Remove light source"
    - "Change light radius"
    - "Make total darkness"
```

---

## DM Visibility Commands

### Global Commands

```yaml
commands:
  # Fog of War
  FOG.TOGGLE()           # Enable/disable fog
  FOG.REVEAL_ALL()       # Reveal entire map
  FOG.HIDE_ALL()         # Hide entire map
  FOG.REVEAL_ROOM(id)    # Reveal specific room
  FOG.HIDE_ROOM(id)      # Hide specific room
  
  # Object visibility
  VISIBLE.SHOW(object_id)      # Show to players
  VISIBLE.HIDE(object_id)      # Hide from players
  VISIBLE.REVEAL(object_id)    # Reveal with effect
  VISIBLE.TOGGLE(object_id)    # Toggle visibility
  
  # Effects
  EFFECT.ADD(effect_type, params)
  EFFECT.REMOVE(effect_id)
  EFFECT.MODIFY(effect_id, params)
  
  # Player vision
  VISION.SET(player_id, range)
  VISION.RESET(player_id)
  VISION.GRANT(player_id, object_id)
```

### Example Usage

```text
DM: "There's a trap under the floor"

System:
1. DM places trap object
2. VISIBLE.HIDE(trap_01)
3. Trap is now DM-only
4. Players can't see it

DM: "The room fills with fog"

System:
1. EFFECT.ADD(fog, {room: "room_03", density: "medium"})
2. Players inside see reduced vision
3. Players outside can't see in
4. DM can modify fog anytime

DM: "Show them the secret passage"

System:
1. VISIBLE.REVEAL(secret_passage_01)
2. Secret passage appears to players
3. DM can hide it again if needed
```

---

## Player Vision Rules

### What Players Can See

```yaml
player_vision:
  # Always visible
  always:
    - their_own_character
    - characters_in_line_of_sight
    - room_they_are_currently_in
    - corridor_they_are_currently_in
    
  # Conditionally visible
  conditional:
    - other_rooms:
        condition: "player has been there"
        visibility: "last_known_state"
        
    - objects:
        condition: "player is searching"
        visibility: "if_found"
        
    - enemies:
        condition: "enemy is in line of sight"
        visibility: "visible"
        
  # Never visible (DM only)
  dm_only:
    - hidden_traps
    - secret_doors
    - future_events
    - enemy_positions_outside_vision
    - dm_notes
```

### Vision Range

```yaml
vision_range:
  # Normal conditions
  normal:
    distance: 6  # grid units
    light_required: false
    
  # Low light
  low_light:
    distance: 3
    light_required: true
    
  # Darkness
  darkness:
    distance: 1
    light_required: true
    
  # Fog
  fog:
    distance: 2
    light_required: true
```

---

## DM Workflow

### Starting a Session

```text
1. Load map
2. Set initial fog (all hidden except starting area)
3. Place players in starting room
4. Reveal starting room and adjacent corridors
5. Start session
```

### During Play

```text
1. Players move to new room
2. System auto-reveals room (if enabled)
3. DM can manually reveal/hide additional elements
4. DM adds effects (fog, darkness, smoke)
5. DM shows/hides objects as needed
```

### Ending a Session

```text
1. Pause session
2. Save fog state
3. Save all object visibility states
4. Save effects
5. Next session restores everything
```

---

## Implementation

### Phase 1: Basic Fog

```text
□ Fog of war layer on map
□ Brush/rectangle reveal tools
□ Room-based reveal
□ Save/load fog state
```

### Phase 2: Object Control

```text
□ Per-object visibility toggle
□ DM-only objects
□ Conditional visibility
□ Reveal/hide commands
```

### Phase 3: Effects

```text
□ Fog effect (room-based)
□ Smoke bomb effect
□ Darkness effect
□ Effect duration system
```

### Phase 4: Advanced

```text
□ Auto-reveal on player movement
□ Vision range system
□ Line of sight calculation
□ DM control panel
```
