# Player View & 3D Token System

## Core Philosophy

```text
Players see ONLY what their character sees
DM sees EVERYTHING
3D tokens = chess pieces with animations
Abilities = visual effects (particles, animations)
```

---

## Player POV

### What Players See

```yaml
player_view:
  # Their own character (3D token)
  character:
    model: "warrior_token"
    position: {x: 15, y: 22}
    animation: "idle"
    
  # Other characters in line of sight
  visible_characters:
    - id: "ally_001"
      model: "mage_token"
      position: {x: 16, y: 22}
      
    - id: "enemy_001"
      model: "goblin_token"
      position: {x: 20, y: 25}
      status: "hostile"
      
  # Environment (based on character's location)
  environment:
    current_map: "prison_level_3"
    visible_areas: ["corridor", "cell_01"]
    fog_of_war: true
    
  # HUD
  hud:
    character_stats:
      pv: "15/20"
      pm: "8/16"
      conditions: ["WOUNDED"]
      
    abilities:
      - name: "Attack"
        icon: "sword.png"
        cooldown: 0
        
      - name: "Shield Block"
        icon: "shield.png"
        cooldown: 2
        
    inventory:
      - "Sword"
      - "Shield"
      - "Health Potion"
```

### What Players DON'T See

```yaml
hidden_from_players:
  - enemy_positions_in_fog
  - hidden_traps
  - DM_notes
  - other_characters_not_in_line_of_sight
  - world_state_snapshots
  - event_history
```

---

## 3D Token System

### Token Types

| Type | Description | Source |
|------|-------------|--------|
| **Character** | Player characters | Buy/download/custom |
| **NPC** | Non-player characters | Buy/download/custom |
| **Enemy** | Hostile creatures | Buy/download/custom |
| **Summoned** | Summoned creatures | Buy/download/custom |
| **Object** | Interactive objects | Buy/download/custom |

### Token Structure

```yaml
token:
  id: "warrior_001"
  type: "character"
  
  # 3D Model
  model:
    file: "warrior.glb"
    scale: 1.0
    rotation: 0
    
  # Visual config
  visual:
    color_tint: null
    highlight_color: "#00ff00"
    name_tag: true
    health_bar: true
    
  # Animations
  animations:
    idle: "warrior_idle.glb"
    walk: "warrior_walk.glb"
    attack: "warrior_attack.glb"
    cast: "warrior_cast.glb"
    death: "warrior_death.glb"
    
  # Size
  size:
    width: 1.0
    height: 1.0
    grid_units: 1
```

---

## Ability System

### Ability Types

| Type | Animation | Example |
|------|-----------|---------|
| **Melee** | Swing + hit effect | Sword attack |
| **Ranged** | Projectile + impact | Arrow shot |
| **Magic** | Particle + glow | Fireball |
| **Summon** | Spawn animation | Summon familiar |
| **Buff** | Aura + glow | Shield spell |
| **Heal** | Green particles | Healing touch |
| **Debuff** | Dark particles | Curse |

### Ability Structure

```yaml
ability:
  id: "fireball"
  name: "Fireball"
  type: "magic"
  
  # Visual effect
  effect:
    type: "projectile"
    model: "fireball.glb"
    color: "#ff4400"
    size: 0.5
    speed: 10
    
    # Trail
    trail:
      enabled: true
      color: "#ff8800"
      length: 2.0
      
    # Impact
    impact:
      type: "explosion"
      radius: 2.0
      particles: "fire_explosion"
      duration: 1.0
      
  # Sound
  sound:
    cast: "fireball_cast.mp3"
    impact: "fireball_impact.mp3"
    
  # Duration
  duration: 1.5  # seconds
```

### Animation Examples

```yaml
# Melee Attack
melee_attack:
  phases:
    - name: "windup"
      duration: 0.3
      animation: "attack_windup"
      
    - name: "strike"
      duration: 0.2
      animation: "attack_strike"
      hit_effect: "slash"
      
    - name: "recovery"
      duration: 0.5
      animation: "attack_recovery"

# Magic Cast
magic_cast:
  phases:
    - name: "gather"
      duration: 0.5
      animation: "cast_gather"
      particles: "magic_gather"
      
    - name: "release"
      duration: 0.3
      animation: "cast_release"
      projectile: "fireball"
      
    - name: "impact"
      duration: 0.5
      animation: "cast_impact"
      particles: "fire_explosion"

# Summon
summon_creature:
  phases:
    - name: "circle_appear"
      duration: 0.5
      animation: "summon_circle"
      particles: "magic_circle"
      
    - name: "creature_spawn"
      duration: 1.0
      animation: "creature_emerge"
      model: "summoned_creature"
      
    - name: "creature_idle"
      duration: 0.5
      animation: "creature_idle"
```

---

## Asset Sources

### Free Assets

| Source | Type | Quality |
|--------|------|---------|
| **Quaternius** | Characters, creatures | Good |
| **Kenney** | Tokens, effects | Good |
| **Mixamo** | Animations | Excellent |
| **OpenGameArt** | 2D sprites, effects | Variable |
| **Sketchfab** | Models (free tier) | Variable |

### Paid Assets

| Source | Type | Price |
|--------|------|-------|
| **Unity Asset Store** | Characters, VFX | $5-50 |
| **Unreal Marketplace** | Characters, VFX | $5-100 |
| **Turbosquid** | 3D models | $10-200 |
| **CGTrader** | 3D models | $10-500 |

### Custom Creation

| Tool | Use Case | Difficulty |
|------|----------|------------|
| **Blender** | 3D modeling | Hard |
| **MagicaVoxel** | Voxel characters | Easy |
| **ReadyPlayerMe** | Avatars | Easy |
| **AI Generation** | Concepts | Easy |

---

## Token Library

### Starter Pack (Recommended)

```yaml
starter_pack:
  characters:
    - warrior
    - mage
    - rogue
    - cleric
    
  enemies:
    - goblin
    - skeleton
    - orc
    - dragon
    
  npcs:
    - villager
    - merchant
    - guard
    - king
    
  objects:
    - chest
    - door
    - barrel
    - campfire
    
  effects:
    - fireball
    - lightning
    - heal
    - shield
```

### Animation Library

```yaml
animations:
  movement:
    - idle
    - walk
    - run
    - sneak
    
  combat:
    - attack_sword
    - attack_bow
    - attack_magic
    - defend
    - dodge
    
  magic:
    - cast_fire
    - cast_ice
    - cast_heal
    - cast_buff
    - cast_summon
    
  effects:
    - hit
    - death
    - level_up
    - heal
```

---

## Implementation Approach

### Phase 1: Basic Tokens

```text
□ Import simple 3D models (low-poly)
□ Place tokens on grid
□ Basic movement animation
□ Name tags + health bars
```

### Phase 2: Combat Animations

```text
□ Melee attack animations
□ Ranged projectile system
□ Hit effects
□ Death animations
```

### Phase 3: Magic System

```text
□ Particle effects
□ Projectile spells
□ Area of effect spells
□ Buff/debuff visuals
```

### Phase 4: Summoning

```text
□ Summoning circle
□ Creature spawn animation
□ Creature token system
□ Summoned creature AI
```

---

## Technical Stack

### 3D Engine

```yaml
renderer:
  engine: "Three.js"
  library: "React Three Fiber"
  helpers: "Drei"
  
  features:
    - GLTF/GLB model loading
    - Animation mixer
    - Particle systems
    - Post-processing
```

### Asset Pipeline

```yaml
pipeline:
  format: "GLB (GLTF Binary)"
  texture_format: "PNG"
  animation_format: "GLB or BVH"
  
  optimization:
    - Draco compression
    - Texture atlasing
    - LOD (Level of Detail)
```

---

## Player Controls

### Input Methods

```yaml
controls:
  desktop:
    - mouse_click: "move/select"
    - right_click: "context_menu"
    - keyboard_shortcuts: "abilities"
    - number_keys: "hotbar"
    
  mobile:
    - tap: "move/select"
    - long_press: "context_menu"
    - swipe: "camera"
    - buttons: "abilities"
```

### Player UI

```
┌─────────────────────────────────────┐
│  [Character Name]         [Stats]   │
│  ─────────────────────────────────  │
│                                     │
│         ┌─────────────┐            │
│         │  3D VIEWPORT │            │
│         │             │            │
│         │   [Token]   │            │
│         │             │            │
│         └─────────────┘            │
│                                     │
│  ─────────────────────────────────  │
│  [Ability 1] [Ability 2] [Ability 3]│
│  [Ability 4] [Ability 5] [Ability 6]│
│  ─────────────────────────────────  │
│  [Inventory]  [Character Sheet]    │
└─────────────────────────────────────┘
```
