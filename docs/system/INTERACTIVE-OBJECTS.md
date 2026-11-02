# Interactive Scene Objects

> Sistema genérico de objetos interactivos en escena. Objetos que responden
> a interacción del jugador con efectos, animaciones y cambios de estado.
> Agnóstico de situaciones específicas — cubre cualquier patrón de interacción.

---

## 1. Concept

Interactive objects are scene items that go beyond static decoration. They:

- **Listen** to player actions (click, proximity, collision, timer, event)
- **React** with effects (animation, sound, particles, state change)
- **Persist** state across sessions (opened/closed, used/unused, charged/depleted)
- **Chain** into other systems (map transition, loot generation, narrative trigger)

The same object type can serve different purposes depending on context:

| Object Type | Tavern Context | Spaceship Context | Dungeon Context |
|-------------|---------------|-------------------|-----------------|
| Rest surface | Bed → sleep | Cryo pod → stasis | Sleeping bag → rest |
| Container | Chest → loot | Supply crate → ammo | Coffin → trap? |
| Portal | Door → next room | Airlock → exterior | Gate → boss room |
| Mechanism | Lever → open passage | Console → activate system | Pressure plate → trap |
| Obstacle | Table → blocks path | Debris → blocks corridor | Rubble → climb over |
| Decoration | Torch → ambient light | Console lights → ambiance | Crystals → glow |

---

## 2. Object Taxonomy

Every interactive object belongs to one or more categories. Categories define the default interaction behavior.

### 2.1 Rest Objects

Surfaces that characters can use to recover, sleep, or wait.

```
triggers:
  - proximity      # character enters radius
  - interaction    # player clicks "Use"
  - command        # DM says "you rest"

effects:
  - heal           # restore HP
  - rest           # long rest / short rest
  - status         # apply buff/debuff
  - animation      # Zzz, healing particles
  - time_skip      # advance game clock
  - narrative      # trigger dreams, events

state:
  - occupied       # someone is using it
  - available      # free to use
  - damaged        # partially broken
  - destroyed      # unusable
```

**Examples across settings:**

| Setting | Object | Rest Type | Special Effect |
|---------|--------|-----------|----------------|
| Medieval tavern | Bed, cot | Long rest | Heal full, advance 8h |
| Medieval野外 | Campfire | Short rest | Heal 50%, cook food |
| Spaceship | Cryo pod | Stasis | Heal full, time anomaly risk |
| Sci-fi base | Med bay bed | Quick heal | Heal 25%, no time skip |
| Underwater | Air pocket | Rest | Oxygen restore |
| Ethereal plane | Dream anchor | Meditation | Gain temporary ability |

### 2.2 Container Objects

Objects that hold items, loot, or information when opened/searched.

```
triggers:
  - interaction    # player clicks "Open" / "Search"
  - proximity      # character enters radius + action
  - event          # triggered by another system

effects:
  - loot           # generate or reveal items
  - inventory      # add items to character/party
  - trap           # trigger trap on open
  - narrative      # reveal clue or information
  - animation      # open lid, glow, particles
  - sound          # creak, click, magical hum

state:
  - sealed         # unopened, full contents
  - opened         # contents revealed
  - looted         # empty, searched
  - trapped        # has active trap
  - locked         # requires key/ability
  - destroyed      # broken, contents scattered
```

**Examples across settings:**

| Setting | Object | Contents | Special |
|---------|--------|----------|---------|
| Dungeon | Chest | Gold, items | Trap on open |
| Tavern | Barrel | Food, ale | Breakable |
| Spaceship | Supply crate | Ammo, medkits | Locked, needs code |
| Alien ruin | Vault | Ancient artifact | Puzzle lock |
| Shipwreck | Locked box | Treasure | Waterlogged, items damaged |
| Haunted house | Music box | Clue | Plays melody, reveals secret |

### 2.3 Portal Objects

Objects that transition characters between locations, maps, or states.

```
triggers:
  - proximity      # character walks into it
  - interaction    # player clicks "Use" / "Enter"
  - condition      # requires item, key, or state
  - event          # triggered by narrative

effects:
  - transition     # change map / scene
  - teleport       # move character within same map
  - plane_shift    # move to different plane/dimension
  - animation      # fade, swirl, dissolve
  - sound          # whoosh, crackle, hum
  - particles      # sparkles, fog, energy

state:
  - active         # passable, functional
  - blocked        # locked, sealed, broken
  - one_way        # can enter but not exit
  - conditional    # requires condition to use
  - hidden         # invisible until discovered
```

**Examples across settings:**

| Setting | Object | Transition | Condition |
|---------|--------|------------|-----------|
| Castle | Door | Room → hallway | None |
| Dungeon | Secret door | Corridor → treasure room | Perception check |
| Spaceship | Airlock | Interior → exterior | Vacuum suit required |
| Portal hub | Rune circle | Hub → random dungeon | Magic attunement |
| Forest | Hollow tree | Forest → Feywild | Only at night |
| Labyrinth | Wrong turn | Room → trap room | None (penalty) |

### 2.4 Mechanism Objects

Objects that change world state when activated.

```
triggers:
  - interaction    # player clicks "Activate"
  - proximity      # step on pressure plate
  - item_use       # use specific item on it
  - event          # triggered by narrative

effects:
  - world_state    # change map element (door, wall, water level)
  - spawn          # create new objects/enemies
  - despawn        # remove objects/enemies
  - lighting       # change light state
  - sound          # mechanical noise, alarm
  - particles      # steam, sparks, magic

state:
  - inactive       # not yet activated
  - active         # currently activated
  - toggled        # on/off switch
  - consumed       # single-use, spent
  - broken         # damaged, unreliable
  - jammed         # stuck, needs repair
```

**Examples across settings:**

| Setting | Object | Effect | Reversible |
|---------|--------|--------|------------|
| Dungeon | Lever | Opens stone door | Yes (toggle) |
| Dungeon | Pressure plate | Spawns arrows | No (consumed) |
| Spaceship | Console | Activates defense system | Yes (toggle) |
| Factory | Emergency button | Stops all machines | Yes (toggle) |
| Temple | Altar | Summons guardian | No (one-time) |
| Cave | Dam valve | Lowers water level | Yes (slow) |

### 2.5 Obstacle Objects

Objects that block or impede movement. Can be static or dynamic.

```
triggers:
  - collision      # character tries to move through
  - interaction    # player tries to push/break/climb
  - event          # spawned by explosion, collapse

effects:
  - block          # prevent movement
  - slow           # reduce movement speed
  - damage         # cause damage on contact
  - destroy        # remove obstacle
  - modify_path    # force pathfinding around

state:
  - solid          # impassable
  - climbable      # can be climbed over (costs movement)
  - breakable      # can be destroyed
  - movable        # can be pushed/pulled
  - temporary      # will disappear after time
  - destroyed      # gone, no longer blocks
```

**Examples across settings:**

| Setting | Object | Behavior | Destroyable |
|---------|--------|----------|-------------|
| Tavern | Table | Blocks movement | Yes (10 HP) |
| Spaceship | Debris | Blocks corridor | Yes (15 HP, needs tool) |
| Forest | Fallen tree | Climbable (costs 2 movement) | No |
| Dungeon | Portcullis | Blocks until mechanism used | No |
| Volcano | Lava flow | Damages on contact | No |
| Underwater | Kelp wall | Slows movement 50% | Yes (5 HP) |

### 2.6 Decoration Objects

Objects that provide ambiance, light, or visual interest. Can have passive effects.

```
triggers:
  - proximity      # character enters radius
  - always         # passive, always active
  - event          # triggered by narrative

effects:
  - light          # emit light (color, radius, flicker)
  - particle       # continuous particles (fire, dust, sparkles)
  - sound          # ambient loop (crackling, humming)
  - animation      # subtle movement (sway, pulse, glow)

state:
  - active         # functioning normally
  - dim            # reduced effect
  - flickering     # intermittent
  - extinguished   # off
  - broken         # damaged
```

**Examples across settings:**

| Setting | Object | Effect | Interactive |
|---------|--------|--------|-------------|
| Tavern | Fireplace | Warm light, crackling sound | Can add wood |
| Spaceship | Console lights | Pulsing blue ambiance | Can hack |
| Forest | Fireflies | Floating particles | Follow player |
| Dungeon | Glowing crystals | Dim purple light | Can harvest |
| Haunted house | Flickering candles | Unstable light | Can relight |
| Underwater | Bioluminescent coral | Shifting colors | Reacts to touch |

---

## 3. Interaction System

### 3.1 Interaction Modes

| Mode | Input | Use Case |
|------|-------|----------|
| `click` | Player clicks object | Explicit interaction (open, use, examine) |
| `proximity` | Token enters radius | Automatic trigger (door opens, trap fires) |
| `collision` | Token tries to move through | Movement blocking or modification |
| `drag` | Player drags item onto object | Item use (key on lock, potion on altar) |
| `command` | DM/player types command | Narrative-driven interaction |
| `timer` | Time-based trigger | Environmental (tide rises, fire spreads) |
| `event` | Triggered by another system | Chain reactions (lever → door → trap) |

### 3.2 Interaction Flow

```
Player Action
     │
     ▼
┌─────────────┐
│  Detection   │ ← proximity, click, collision, command
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Validation  │ ← conditions, requirements, permissions
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Resolution  │ ← DM approval if needed
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Execution   │ ← effects, animations, state changes
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Broadcast   │ ← event system, all clients update
└─────────────┘
```

### 3.3 Interaction Conditions

Objects can have conditions that must be met before interaction succeeds:

```typescript
interface InteractionCondition {
  type: 'item' | 'ability' | 'state' | 'permission' | 'narrative';
  requirement: string;
  failEffect?: Effect[];
}
```

| Condition Type | Example | Fail Behavior |
|---------------|---------|---------------|
| `item` | "Requires skeleton key" | Show locked message |
| `ability` | "Requires Strength 15+" | Show "too heavy" message |
| `state` | "Requires door to be open" | Show "blocked" message |
| `permission` | "DM must approve" | Show confirmation dialog |
| `narrative` | "Requires reading the inscription first" | Show "nothing happens" |

### 3.4 Multi-Actor Interactions

Some objects support multiple characters interacting simultaneously:

| Pattern | Example | Max Actors |
|---------|---------|------------|
| Cooperative | Push heavy object | 2-4 |
| Competitive | Grab same loot | 1 (first wins) |
| Parallel | Everyone rests at campfire | Unlimited |
| Sequential | Take turns pulling lever | 1 at a time |

---

## 4. State Management

### 4.1 Object State Schema

```typescript
interface InteractiveObjectState {
  objectId: string;
  currentState: string;
  stateHistory: StateChange[];
  charges?: number;        // for consumable objects
  cooldown?: number;       // ms until next interaction
  conditions: string[];    // active conditions
  metadata: Record<string, any>;
}

interface StateChange {
  from: string;
  to: string;
  timestamp: number;
  actor?: string;          // who triggered the change
  cause?: string;          // what caused it
}
```

### 4.2 Persistence Rules

| State Type | Persists Across | Example |
|-----------|-----------------|---------|
| Permanent | Sessions | Door opened, chest looted |
| Temporary | Scene only | Light toggled, fire burning |
| Ephemeral | Interaction only | Animation playing, sound playing |
| Narrative | Campaign | Quest item found, NPC freed |

### 4.3 State Reset

Objects can optionally reset state:

| Reset Type | Trigger | Use Case |
|-----------|---------|----------|
| `manual` | DM action | Reset puzzle |
| `timer` | Time elapsed | Traps rearm, resources respawn |
| `session` | New session | Doors close, lights reset |
| `never` | Nothing | Permanent world changes |

---

## 5. Effects System

### 5.1 Effect Types

| Effect | Description | Example |
|--------|-------------|---------|
| `animation` | Visual animation on object | Chest opens, door swings |
| `particle` | Spawn particle system | Fire, sparkles, dust |
| `sound` | Play audio | Creak, hum, explosion |
| `light` | Modify lighting | Torch flickers, crystal glows |
| `spawn` | Create new objects | Loot appears, enemy spawns |
| `despawn` | Remove objects | Chest disappears, fire dies |
| `teleport` | Move character | Portal transport |
| `status` | Apply buff/debuff | Rest heals, trap poisons |
| `world_state` | Modify map element | Door opens, wall collapses |
| `narrative` | Trigger DM prompt | "The altar glows ominously..." |

### 5.2 Effect Chaining

Effects can trigger other effects:

```
Player clicks lever
     │
     ▼
Lever animation (pull down)
     │
     ▼
Sound effect (mechanical clank)
     │
     ▼
Door animation (stone slides open)
     │
     ▼
Light change (torch ignites in next room)
     │
     ▼
Narrative trigger ("You hear a rumble...")
```

### 5.3 Effect Timing

| Timing | Description | Use Case |
|--------|-------------|---------|
| `instant` | Happens immediately | State change, sound |
| `delayed` | Happens after N ms | Trap delay, chain reaction |
| `duration` | Lasts for N ms | Light pulse, particle burst |
| `loop` | Repeats until stopped | Ambient fire, pulsing light |
| `sequential` | One after another | Animation chain |

---

## 6. 3D Asset Packs by Scene Type

### 6.1 Medieval / Fantasy Tavern

| Asset | Source | Format |
|-------|--------|--------|
| Round tables | Kenney "Furniture" | GLB |
| Long tables | Kenney "Furniture" | GLB |
| Chairs / benches | Kenney "Furniture" | GLB |
| Barrels | Kenney "Medieval" | GLB |
| Chests | Kenney "Medieval" | GLB |
| Fireplace | Quaternius "Interior" | GLB |
| Beds / cots | Kenney "Furniture" | GLB |
| Candles / torches | Quaternius "Props" | GLB |
| Mugs / bottles | Kenney "Furniture" | GLB |
| Swords on wall | Quaternius "Weapons" | GLB |

**Free sources:** kenney.nl, quaternius.com, itch.io "medieval furniture free"

### 6.2 Spaceship / Sci-Fi

| Asset | Source | Format |
|-------|--------|--------|
| Console panels | itch.io "sci-fi props" | GLB |
| Cryo pods | itch.io "spaceship interior" | GLB |
| Crates / containers | Kenney "Space" | GLB |
| Chairs / pilot seat | itch.io "sci-fi furniture" | GLB |
| Door frames | Kenney "Space" | GLB |
| Lighting strips | Quaternius "SciFi" | GLB |
| Weapon racks | itch.io "sci-fi props" | GLB |
| Hologram tables | itch.io "sci-fi" | GLB |
| Airlock | Custom or itch.io | GLB |

**Free sources:** kenney.nl, itch.io "sci-fi free", quaternius.com

### 6.3 Dungeon / Cave

| Asset | Source | Format |
|-------|--------|--------|
| Stone walls | Kenney "Dungeon" | GLB |
| Wooden doors | Kenney "Medieval" | GLB |
| Portcullis | Quaternius "Medieval" | GLB |
| Torch holders | Quaternius "Props" | GLB |
| Crystals | Quaternius "Environment" | GLB |
| Bones / skulls | Kenney "Medieval" | GLB |
| Chains | Quaternius "Props" | GLB |
| Altar | itch.io "dungeon props" | GLB |
| Treasure chest | Kenney "Dungeon" | GLB |

**Free sources:** kenney.nl, quaternius.com, itch.io "dungeon free"

### 6.4 Forest / Wilderness

| Asset | Source | Format |
|-------|--------|--------|
| Trees | Kenney "Nature" | GLB |
| Rocks / boulders | Kenney "Nature" | GLB |
| Bushes | Kenney "Nature" | GLB |
| Campfire | Quaternius "Props" | GLB |
| Logs | Kenney "Nature" | GLB |
| Flowers | Quaternius "Nature" | GLB |
| Mushrooms | itch.io "nature free" | GLB |
| Tent | Kenney "Medieval" | GLB |

**Free sources:** kenney.nl, quaternius.com, itch.io "nature free"

### 6.5 Underwater / Aquatic

| Asset | Source | Format |
|-------|--------|--------|
| Coral | itch.io "underwater free" | GLB |
| Seaweed | itch.io "nature free" | GLB |
| Treasure chest | Kenney "Dungeon" (retextured) | GLB |
| Ship wreckage | itch.io "underwater" | GLB |
| Air bubbles | Custom particle | — |
| Bioluminescent plants | itch.io "fantasy nature" | GLB |

### 6.6 Purchased / Premium Sources

| Source | Quality | Price | Best For |
|--------|---------|-------|----------|
| **TurboSquid** | High | $5-50 | Professional assets |
| **CGTrader** | High | $5-30 | Wide variety |
| **Sketchfab** | Medium-High | Free-$20 | Community models |
| **itch.io** | Varies | Free-$10 | Indie / stylized |
| **Unity Asset Store** | Medium-High | $10-50 | Game-ready models |
| **Dungeon Alchemist** | High | Steam price | Complete scenes |

---

## 7. Collision and Proximity

### 7.1 Interaction Radius

Objects define a radius for proximity-based triggers:

```typescript
interface InteractionRadius {
  inner: number;    // full interaction range
  outer: number;    // detection range (show prompt)
}
```

| Object Type | Inner Radius | Outer Radius |
|------------|-------------|-------------|
| Door | 0.5 | 1.5 |
| Chest | 0.8 | 2.0 |
| Bed | 1.0 | 2.5 |
| Lever | 0.5 | 1.5 |
| Campfire | 1.5 | 3.0 |
| Portal | 0.3 | 1.0 |

### 7.2 Collision Behavior

When a token collides with an interactive object:

```
Token movement
     │
     ▼
Collision detected with object
     │
     ├── Object is obstacle → block movement
     │
     ├── Object is climbable → allow with cost
     │
     ├── Object is breakable → prompt "Break?"
     │
     ├── Object is movable → prompt "Push?"
     │
     └── Object is passable → allow movement
```

---

## 8. DM Controls

### 8.1 DM Interaction Panel

When a DM right-clicks an interactive object:

| Action | Description |
|--------|-------------|
| `Edit Properties` | Modify object behavior |
| `Toggle State` | Force state change |
| `Lock/Unlock` | Prevent/allow player interaction |
| `Reset` | Return to initial state |
| `Delete` | Remove object |
| `Test Interaction` | Simulate player interaction |

### 8.2 DM Override

DMs can override any interaction:

| Override | Effect |
|----------|--------|
| `Force Open` | Open locked container |
| `Force Activate` | Activate mechanism without conditions |
| `Block Interaction` | Prevent all player interaction |
| `Auto-Approve` | Skip confirmation for this object |
| `Narrative Override` | Replace default effect with custom text |

---

## 9. Integration Points

### 9.1 Event System

Interactive objects emit events:

```typescript
interface InteractiveObjectEvent {
  type: 'interaction' | 'state_change' | 'effect_trigger';
  objectId: string;
  actorId?: string;
  fromState?: string;
  toState?: string;
  effects: Effect[];
}
```

### 9.2 World State

Object states are part of the world state:

```typescript
interface WorldState {
  interactiveObjects: Map<string, InteractiveObjectState>;
  // ... other state
}
```

### 9.3 Narrative Engine

Interactive objects can trigger narrative events:

```
Player opens ancient chest
     │
     ▼
Chest opens (animation + sound)
     │
     ▼
Items revealed (loot generation)
     │
     ▼
Narrative trigger: "A cold wind blows from within..."
     │
     ▼
DM prompt: "Roll Perception to notice the trap"
```

### 9.4 AI Integration

AI can suggest interactions:

```
Player enters room with broken lever
     │
     ▼
AI analyzes scene context
     │
     ▼
AI suggests: "The lever appears broken. You could:
  1. Try to force it (Strength check)
  2. Look for tools nearby (Investigation)
  3. Find another way around (Navigation)"
```

---

## 10. Implementation Priority

### Phase 1: Core Interactions

- [ ] Object state schema
- [ ] Click interaction
- [ ] Proximity detection
- [ ] Basic effects (animation, sound, state change)
- [ ] DM override panel

### Phase 2: Advanced Interactions

- [ ] Collision-based interactions
- [ ] Item use on objects
- [ ] Effect chaining
- [ ] State persistence across sessions
- [ ] Multi-actor interactions

### Phase 3: Scene-Specific

- [ ] Tavern furniture pack
- [ ] Spaceship furniture pack
- [ ] Dungeon furniture pack
- [ ] Forest furniture pack
- [ ] Custom asset upload

### Phase 4: AI-Enhanced

- [ ] AI interaction suggestions
- [ ] Procedural object generation
- [ ] Context-aware effects
- [ ] Narrative-driven interactions

---

## 11. Examples

### Example 1: Tavern Bed (Rest)

```
Object: bed_01
Type: rest
State: available

Player clicks "Rest"
  → Validation: no enemies nearby
  → DM confirmation dialog
  → Animation: character lies down, Zzz particles
  → Sound: snoring, fire crackling
  → Effect: heal full HP
  → Effect: advance game clock 8 hours
  → State: occupied → available
  → Narrative: "You sleep soundly through the night."
```

### Example 2: Spaceship Airlock (Portal)

```
Object: airlock_01
Type: portal
State: active

Player clicks "Use Airlock"
  → Validation: player has vacuum suit
  → Animation: airlock cycles (light sequence)
  → Sound: hiss, mechanical clank
  → Effect: transition to exterior map
  → State: remains active
  → Narrative: "The airlock hisses open. Stars fill your vision."
```

### Example 3: Dungeon Lever (Mechanism)

```
Object: lever_01
Type: mechanism
State: inactive

Player clicks "Pull Lever"
  → Animation: lever pulls down
  → Sound: stone grinding
  → Effect: door_03 state change (blocked → active)
  → Effect: lighting change (torches ignite in next room)
  → State: inactive → active
  → Narrative: "Ancient gears groan to life. A passage opens."
```

### Example 4: Forest Campfire (Rest + Decoration)

```
Object: campfire_01
Type: rest + decoration
State: active (burning)

Player clicks "Rest at Campfire"
  → Validation: party is together
  → Animation: characters sit, fire flickers
  → Sound: crackling, crickets
  → Effect: short rest (heal 50%)
  → Effect: cook food (if available)
  → State: remains active
  → Narrative: "The warm fire pushes back the forest darkness."
```

### Example 5: Broken Console (Mechanism + Obstacle)

```
Object: console_01
Type: mechanism + obstacle
State: broken

Player clicks "Examine Console"
  → Narrative: "The console sparks erratically. It's damaged."

Player uses "wrench" on console
  → Validation: player has wrench item
  → Animation: sparks stop, lights stabilize
  → Sound: mechanical hum
  → Effect: console state → active
  → Effect: door_01 state → active
  → State: broken → active
  → Narrative: "With some effort, the console hums back to life."
```

---

## 12. Free Asset Download Links

### Kenney.nl (CC0 License)
- Furniture: https://kenney.nl/assets/furniture
- Medieval: https://kenney.nl/assets/medieval
- Dungeon: https://kenney.nl/assets/dungeon
- Nature: https://kenney.nl/assets/nature
- Space: https://kenney.nl/assets/space-kit

### Quaternius (CC0 License)
- Medieval: https://quaternius.com/packs/ultimatemodularset.html
- Props: https://quaternius.com/packs/freesimpleprops.html
- Nature: https://quaternius.com/packs/free-low-poly-trees.html
- SciFi: https://quaternius.com/packs/sci-fi.html

### Itch.io (Free Section)
- Search: https://itch.io/game-assets/tag-3d/tag-free
- Medieval: https://itch.io/game-assets/tag-3d/tag-medieval/tag-free
- Sci-fi: https://itch.io/game-assets/tag-3d/tag-science-fiction/tag-free
