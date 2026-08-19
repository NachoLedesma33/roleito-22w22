# Character Persistence & Session Integration

## Core Principle

Characters are created ONCE and persist across ALL sessions until they die.
Their state (health, injuries, conditions) carries over between sessions.

---

## Character Lifecycle

```text
CREATED → ACTIVE → INJURED → RECOVERING → ACTIVE
                     ↓
                  CRIPPLED
                     ↓
                  DEAD
```

### Status Types

| Status | Description | Affects |
|--------|-------------|---------|
| `ACTIVE` | Normal, can participate | All stats normal |
| `INJURED` | Wounded but functional | Reduced stats |
| `CRIPPLED` | Permanent disability | Permanent stat penalty |
| `RECOVERING` | Healing from injury | Reduced stats (temporary) |
| `DEAD` | Cannot participate | Removed from sessions |
| `ABSENT` | Not in current session | Not loaded |

---

## Dynamic Conditions System

### Condition Types

```yaml
conditions:
  # Temporary (heal over time)
  - type: WOUNDED
    duration: sessions_until_healed
    effect: -2 VIG
    
  - type: POISONED
    duration: turns
    effect: -1 to all stats
    
  - type: STUNNED
    duration: turns
    effect: cannot_act

  # Permanent (until magically cured)
  - type: CRIPPLED_LEGS
    duration: permanent
    effect: -4 DEX, requires_wheelchair
    
  - type: BLIND
    duration: permanent
    effect: -6 INT, -4 AST
    
  - type: MISSING_ARM
    duration: permanent
    effect: cannot_use_two_handed

  # Progressive
  - type: BLEEDING
    duration: until_treated
    effect: -1 VIG per_session
    
  - type: INFECTION
    duration: until_treated
    effect: -2 VIG per_session
```

### Condition Application

```python
class CharacterCondition:
    id: str
    character_id: str
    type: str  # WOUNDED, CRIPPLED_LEGS, etc.
    severity: int  # 1-10
    applied_session: str
    applied_event: str  # reference to event that caused it
    duration: str  # "turns", "sessions", "permanent"
    duration_value: int  # -1 for permanent
    cure_method: str  # what can cure it
    cure_difficulty: int  # DC to cure
    notes: str  # DM notes
    status: str  # ACTIVE, HEALED, REMOVED
```

---

## Session Integration

### Character Selection Per Session

When starting a session, DM selects which characters participate:

```yaml
session_characters:
  session_id: "session-123"
  characters:
    - id: "char-001"
      status: "ACTIVE"
      location: "tavern"
      
    - id: "char-002"
      status: "CRIPPLED"
      location: "tavern"
      notes: "in wheelchair"
      
    - id: "char-003"
      status: "ABSENT"
      reason: "in different city"
```

### State Persistence

```yaml
character_state:
  id: "char-002"
  name: "Varek"
  
  # Current stats (after all conditions applied)
  current_pv: 12
  current_pm: 8
  effective_vig: 8  # base 10 - 2 (wounded)
  effective_dex: 4  # base 8 - 4 (crippled legs)
  
  # Active conditions
  conditions:
    - type: CRIPPLED_LEGS
      severity: 8
      cure_method: "regeneration_spell"
      cure_difficulty: 15
      
  # Equipment affected
  equipment_notes:
    - "uses wheelchair"
    - "cannot wear heavy armor"
    - "reduced movement speed"
```

---

## DM Control

### Manual State Changes

DM can manually change character state at any time:

```yaml
dm_action:
  type: APPLY_CONDITION
  character_id: "char-002"
  condition:
    type: CRIPPLED_LEGS
    severity: 8
    notes: "Legs broken by orc mace"
    cure_method: "Greater Restoration or Regenerate"
    
  # Optional: link to event
  event_id: "event-456"
```

### Condition Resolution

When a condition is healed:

```yaml
dm_action:
  type: REMOVE_CONDITION
  character_id: "char-002"
  condition_id: "cond-789"
  
  # Update character state
  new_status: "ACTIVE"
  notes: "Legs healed by Regenerate spell"
  
  # Update effective stats
  restore_stats:
    - dex: 8  # back to base
```

---

## Map/Location Tracking

### Character Locations

Each character has a current location:

```yaml
character_location:
  character_id: "char-001"
  location_id: "tavern"
  map_id: "map-village"
  coordinates: {x: 15, y: 22}
  last_updated: "2026-08-18T22:00:00"
```

### Session Availability

Characters are available if:
1. Status is `ACTIVE` or `INJURED` or `RECOVERING`
2. Location matches current session location OR can travel there
3. DM hasn't marked them as `ABSENT`

### Location-Based Exclusion

```yaml
session_config:
  current_location: "dungeon_level_2"
  
  # Characters NOT available:
  excluded_characters:
    - id: "char-003"
      reason: "still in village"
      location: "tavern"
      
  # Characters available:
  available_characters:
    - id: "char-001"
      location: "dungeon_level_1"  # can travel to level 2
      
    - id: "char-002"
      location: "dungeon_level_2"  # already here
```

---

## Event Tracking

### Injury Events

Every injury must be tracked as an event:

```yaml
event:
  type: INJURY
  actor: "npc-orc-001"
  target: "char-002"
  action: "CRUSH_LEG"
  damage: 15
  
  # Resulting condition
  resulting_condition:
    type: CRIPPLED_LEGS
    severity: 8
    
  # DM decision
  dm_notes: "Legs broken. Permanent unless magically healed."
```

### Recovery Events

```yaml
event:
  type: RECOVERY
  actor: "char-001"  # caster
  target: "char-002"
  action: "CAST_REGENERATE"
  
  # Condition removed
  removed_condition: "cond-789"
  
  # State change
  new_status: "ACTIVE"
  dm_notes: "Legs fully healed after 3 sessions in wheelchair"
```

---

## Database Schema

### Characters Table (additions)

```sql
ALTER TABLE characters ADD COLUMN status VARCHAR(20) DEFAULT 'ACTIVE';
ALTER TABLE characters ADD COLUMN current_location_id VARCHAR(36);
ALTER TABLE characters ADD COLUMN conditions_json TEXT;
```

### Character Conditions Table (new)

```sql
CREATE TABLE character_conditions (
    id VARCHAR(36) PRIMARY KEY,
    character_id VARCHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    severity INTEGER DEFAULT 1,
    applied_session_id VARCHAR(36),
    applied_event_id VARCHAR(36),
    duration VARCHAR(20) DEFAULT 'permanent',
    duration_value INTEGER DEFAULT -1,
    cure_method VARCHAR(100),
    cure_difficulty INTEGER,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP,
    resolved_at TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id)
);
```

### Session Characters Table (new)

```sql
CREATE TABLE session_characters (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    character_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    notes TEXT,
    joined_at TIMESTAMP,
    left_at TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (character_id) REFERENCES characters(id)
);
```

---

## UI Components

### Character Card (with conditions)

```
┌─────────────────────────────────┐
│  Varek                    [ACTIVE] │
│  ─────────────────────────────── │
│  VIG: 10  INT: 8  DEX: 8  AST: 6 │
│  PV: 12/20  PM: 8/16             │
│  ─────────────────────────────── │
│  Conditions:                     │
│  🔴 CRIPPLED_LEGS (8/10)        │
│     Cure: Regenerate (DC 15)     │
│  🟡 WOUNDED (3/10)              │
│     Cure: Rest (2 sessions)      │
│  ─────────────────────────────── │
│  Location: Tavern               │
│  Last Session: #14              │
└─────────────────────────────────┘
```

### Session Setup Screen

```
┌─────────────────────────────────────┐
│  Session #15 - Select Characters    │
│  ─────────────────────────────────── │
│  Current Location: Dungeon Level 2  │
│  ─────────────────────────────────── │
│  ☑ Varek (ACTIVE) - in dungeon     │
│  ☑ Aria (ACTIVE) - in dungeon      │
│  ☐ Theron (ABSENT) - in village    │
│  ☑ Lyra (CRIPPLED) - needs escort  │
│  ─────────────────────────────────── │
│  [Start Session]                    │
└─────────────────────────────────────┘
```

---

## Implementation Priority

### Phase 10: Character Sheets + Conditions

```text
□ Add status field to Character model
□ Create CharacterCondition model
□ Add conditions to character API
□ Update character display with conditions
□ Add condition management UI
```

### Phase 11: Session Integration

```text
□ Create SessionCharacter model
□ Add character selection to session start
□ Track character locations
□ Update session view with character states
```

### Phase 12: DM Condition Control

```text
□ Add condition application UI
□ Add condition removal UI
□ Link conditions to events
□ Track recovery progress
```
