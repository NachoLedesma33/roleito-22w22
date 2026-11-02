# Adaptive Camera & Visibility System

## Core Concept

```text
Camera follows GROUP, not individual players
Adapts to environment geometry for best visibility
DM has full control over camera behavior
```

---

## System Architecture

```text
                   ┌─────────────────┐
                   │     PLAYERS     │
                   └────────┬────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ PARTY / INTEREST  │
                  │      MANAGER      │
                  └─────────┬─────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ VISIBILITY SYSTEM │
                  └─────────┬─────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
           Raycast        Rooms        Obstacles
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                  ┌───────────────────┐
                  │ CAMERA CONTROLLER │
                  └─────────┬─────────┘
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
           Zoom           Angle          Rotation
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                  ┌───────────────────┐
                  │ VISUAL ADAPTATION │
                  └─────────┬─────────┘
                            │
                    ┌───────┴───────┘
                    ▼               ▼
               Wall Fade        Cutaway
```

---

## Party Tracking

### Center of Interest

Camera tracks the GROUP, not individual players:

```typescript
interface PartyTracker {
  // Calculate center of all players
  calculateCenter(positions: Vector3[]): Vector3;
  
  // Weight players by importance
  calculateWeightedCenter(
    positions: Vector3[],
    weights: PlayerWeights
  ): Vector3;
}

interface PlayerWeights {
  active_players_weight: number;   // 1.0
  distant_players_weight: number;  // 0.3
  narrative_target_weight: number; // 0.8
  enemy_weight: number;            // 0.2
}
```

### Example

```text
Players:
  P1 at (10, 15) - weight 1.0
  P2 at (12, 15) - weight 1.0
  P3 at (11, 20) - weight 1.0
  P4 at (25, 30) - weight 0.3 (distant)

Camera Target = weighted average
```

---

## Occlusion Detection

### Raycasting System

```typescript
interface OcclusionDetector {
  // Cast ray from camera to player
  castRay(origin: Vector3, target: Vector3): RaycastResult;
  
  // Check all players
  checkVisibility(
    camera: Camera,
    players: Player[]
  ): VisibilityResult;
}

interface RaycastResult {
  hit: boolean;
  hitPoint?: Vector3;
  hitObject?: SceneObject;
  distance: number;
}

interface VisibilityResult {
  visiblePlayers: Player[];
  occludedPlayers: Player[];
  occlusionScore: number; // 0-100
}
```

### Detection Flow

```text
             CAMERA
                │
       ┌────────┼────────┐
       ▼        ▼        ▼
      P1       P2       P3
       │        │        │
       ▼        ▼        ▼
    clear    occluded   clear
```

---

## Wall Visibility Strategies

### Strategy A: Wall Fade

Walls between camera and player become transparent:

```yaml
wall_fade:
  enabled: true
  fade_distance: 2.0  # world units
  min_opacity: 0.3
  transition_speed: 0.5
  
  # Example
  before: "████████████████"
  after:  "████  30%      █"
```

### Strategy B: Wall Hide

Completely hide walls blocking view:

```yaml
wall_hide:
  enabled: true
  hide_threshold: 0.7  # hide if >70% occluded
  restore_delay: 0.5  # seconds before restoring
  
  # Example
  before: "████████████████"
  after:  "████  HIDDEN ███"
```

### Strategy C: Room Cutaway

Remove front wall when players are inside:

```yaml
room_cutaway:
  enabled: true
  trigger: player_inside_room
  cutaway_style: partial  # full, partial, none
  
  # Before
  before: "
    ┌──────────────┐
    │      P       │
    └──────────────┘
  "
  
  # After
  after: "
    ┌──────────────┐
    │      P       │
    └              ┘
  "
```

---

## Camera Modes

### 1. Exploration

Default mode for traversing the map:

```yaml
exploration:
  pitch: 40  # degrees
  zoom: adaptive
  rotation: isometric_fixed
  
  wall_fade: false
  wall_hide: false
  cutaway: false
  
  target: party_center
```

### 2. Room Interior

When players enter a room:

```yaml
room_interior:
  pitch: 50  # higher angle
  zoom: 0.85  # slightly closer
  rotation: adaptive  # adjust to room shape
  
  wall_fade: true
  wall_hide: true
  cutaway: true
  
  target: room_center
  
  adaptive_behavior:
    increase_pitch: true
    enable_cutaway: true
    prioritize_room_visibility: true
```

### 3. Combat

During battles:

```yaml
combat:
  zoom: 1.1  # wider view
  pitch: 45
  focus: combat_area
  
  wall_fade: false
  wall_hide: true  # hide walls in combat area
  
  adaptive_behavior:
    expand_view_area: true
    show_enemy_health: true
    show_initiative_order: true
```

### 4. Narrative

For DM storytelling moments:

```yaml
narrative:
  follow_players: false
  focus: narrative_target
  movement: smooth_transition
  
  # DM says "show the statue behind them"
  # Camera moves to show statue
  
  target: dm_selected
```

### 5. Cinematic

For important events:

```yaml
cinematic:
  follow_players: false
  focus: scripted_target
  movement: scripted
  
  # Camera follows predetermined path
  # Used for cutscenes, reveals, etc.
```

---

## Visibility Score System

Camera evaluates different configurations:

```typescript
interface VisibilityScore {
  player_visibility: number;  // 40%
  room_visibility: number;    // 25%
  obstacle_occlusion: number; // 20%
  group_framing: number;      // 10%
  narrative_target: number;   // 5%
}

function calculateScore(config: CameraConfig): number {
  return (
    config.player_visibility * 0.4 +
    config.room_visibility * 0.25 +
    (1 - config.obstacle_occlusion) * 0.2 +
    config.group_framing * 0.1 +
    config.narrative_target * 0.05
  );
}
```

### Evaluation Process

```text
                 CAMERA
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       ANGLE A    ANGLE B    ANGLE C
          │         │         │
          ▼         ▼         ▼
       Score 72   Score 94   Score 61
                    │
                    ▼
              ELEGIR B
```

---

## Camera Parameters

### Full Configuration

```yaml
camera_system:
  type: adaptive_isometric

  objectives:
    - maintain_player_visibility
    - maintain_room_readability
    - minimize_geometry_occlusion
    - keep_party_composition
    - preserve_environment_context
    - support_narrative_focus

  parameters:
    position: dynamic
    zoom: dynamic
    pitch: dynamic
    yaw: adaptive
    target: dynamic

  tracking:
    target: party_center
    weighting: dynamic

  occlusion:
    detection: raycast
    wall_fade: true
    wall_hide: true
    room_cutaway: true

  adaptive_behavior:
    if_player_occluded:
      increase_camera_height: true
      adjust_camera_angle: true
      adjust_camera_rotation: true

    if_room_interior:
      increase_pitch: true
      enable_cutaway: true
      prioritize_room_visibility: true

    if_party_separated:
      increase_zoom: true
      prioritize_active_group: true

    if_combat:
      expand_view_area: true

  modes:
    - exploration
    - room_interior
    - combat
    - narrative
    - cinematic
```

---

## DM Camera Controls

### Commands

```yaml
commands:
  # Focus targets
  CAMERA.FOCUS(player_group)
  CAMERA.FOCUS(character_03)
  CAMERA.FOCUS(room_07)
  CAMERA.FOCUS(narrative_target)
  
  # Manual adjustments
  CAMERA.ROTATE(15)  # degrees
  CAMERA.ZOOM(0.8)   # 1.0 = default
  CAMERA.PITCH(50)   # degrees
  
  # Modes
  CAMERA.EXPLORATION()
  CAMERA.ROOM_INTERIOR()
  CAMERA.COMBAT()
  CAMERA.NARRATIVE()
  CAMERA.CINEMATIC()
  
  # Reset
  CAMERA.RESET()
```

### Example Usage

```text
DM: "I want to show them the statue behind them"

System:
1. DM selects statue_03
2. CAMERA.FOCUS(statue_03)
3. Cinematic transition
4. Show statue
5. Return to previous mode
```

---

## Room Detection

### Room System

```typescript
interface Room {
  id: string;
  bounds: BoundingBox;
  
  // Players in this room
  players: Player[];
  
  // Is this the active room?
  isActive: boolean;
}

interface RoomDetection {
  // Get room for player position
  getRoom(position: Vector3): Room;
  
  // Get active room (most players)
  getActiveRoom(rooms: Room[]): Room;
  
  // Detect if player entered new room
  detectTransition(
    player: Player,
    oldPosition: Vector3,
    newPosition: Vector3
  ): RoomTransition | null;
}
```

### Detection Flow

```text
P1 → ROOM_01
P2 → ROOM_01
P3 → CORRIDOR
P4 → ROOM_02

Active Room = ROOM_01 (2 players)
Camera adapts to ROOM_01
```

---

## Implementation

### Phase 1: Basic Camera

```text
□ Implement party center tracking
□ Basic isometric camera
□ Follow group movement
□ Manual zoom control
```

### Phase 2: Occlusion

```text
□ Raycasting system
□ Detect occluded players
□ Basic wall fade
□ Camera height adjustment
```

### Phase 3: Room System

```text
□ Room detection
□ Room interior mode
□ Cutaway system
□ Adaptive pitch
```

### Phase 4: Advanced

```text
□ Visibility scoring
□ Multiple camera modes
□ DM camera controls
□ Cinematic transitions
```
