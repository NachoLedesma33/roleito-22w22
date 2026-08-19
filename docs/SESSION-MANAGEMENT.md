# Session Management & World State

## Core Philosophy

```text
Linear story within open world
DM has complete control
Sessions can be paused/resumed at any point
World state must support "time travel" (revisiting past states)
```

---

## Session Lifecycle

### State Machine

```text
DRAFT → ACTIVE → PAUSED → ACTIVE → COMPLETED
                   ↓
                REVISITABLE
```

### Session States

| State | Description | Can Resume |
|-------|-------------|------------|
| `DRAFT` | Not started yet | Yes |
| `ACTIVE` | Currently playing | Yes |
| `PAUSED` | Stopped mid-session | Yes |
| `COMPLETED` | Finished successfully | No (but can revisit) |
| `ABANDONED` | Stopped prematurely | No (but can revisit) |

---

## Pause/Resume System

### Pause Session

When DM needs to stop:

```yaml
action: PAUSE_SESSION
session_id: "session-123"
position:
  map_id: "prison_level_3"
  coordinates: {x: 45, y: 78}
  current_event: "event-456"
  round: 12
  initiative_order: ["char-001", "npc-001", "char-002"]
  
state_snapshot:
  characters:
    - id: "char-001"
      current_pv: 15
      position: {x: 42, y: 75}
      conditions: ["WOUNDED"]
    - id: "char-002"
      current_pv: 20
      position: {x: 48, y: 80}
      conditions: []
      
  world_state:
    prison_doors_unlocked: ["cell_01", "cell_02"]
    guards_alerted: true
    time_of_day: "night"
    
  notes: "Party just defeated the guard captain. Need to decide next move."
```

### Resume Session

When DM wants to continue:

```yaml
action: RESUME_SESSION
session_id: "session-123"
restore:
  characters: true
  world_state: true
  initiative: false  # DM can choose to restart initiative
  map_position: true
```

---

## World State Snapshots

### Purpose

Save the entire world state at any point for:

1. **Session pause/resume** - Continue exactly where left off
2. **Time travel** - Revisit previous states
3. **DM control** - Undo mistakes or try different paths
4. **Backup** - Restore if something goes wrong

### Snapshot Structure

```yaml
snapshot:
  id: "snapshot-789"
  session_id: "session-123"
  timestamp: "2026-08-18T22:30:00"
  
  # World state
  world:
    current_map: "prison_level_3"
    time_of_day: "night"
    weather: "clear"
    active_factions: ["guards", "prisoners"]
    
  # All characters
  characters:
    - id: "char-001"
      name: "Varek"
      status: "ACTIVE"
      current_pv: 15
      position: {x: 42, y: 75}
      inventory: ["sword", "shield", "potion"]
      conditions: ["WOUNDED"]
      
    - id: "npc-001"
      name: "Guard Captain"
      status: "DEAD"
      position: {x: 45, y: 78}
      
  # Events that happened
  events:
    - id: "event-456"
      type: "COMBAT"
      description: "Party defeated guard captain"
      timestamp: "2026-08-18T22:15:00"
      
  # Location states
  locations:
    - id: "prison_level_3"
      visited: true
      explored: ["cell_01", "cell_02", "guard_room"]
      unlocked_doors: ["cell_01", "cell_02"]
      active_npcs: []
      
  # DM notes
  dm_notes: "Party cleared level 3. Next: find exit to level 4."
```

---

## Time Travel (Revisiting Past States)

### Use Cases

1. **DM wants to try different outcome**
   ```text
   "What if we had gone left instead of right?"
   ```

2. **Player wants to revisit a location**
   ```text
   "Let's go back to the tavern to check if we missed anything"
   ```

3. **Correcting mistakes**
   ```text
   "Wait, I didn't mean for that to happen"
   ```

4. **Exploring alternatives**
   ```text
   "Show me what would have happened if we fought the dragon"
   ```

### Implementation

```yaml
action: REVERT_TO_SNAPSHOT
snapshot_id: "snapshot-789"
options:
  keep_events: false  # Don't keep events after snapshot
  keep_characters: true  # Keep character progress
  keep_world_state: true  # Revert world to snapshot state
  
result:
  world_reverted_to: "2026-08-18T22:30:00"
  characters_maintained: true
  events_after_snapshot: "archived"
```

---

## Map/Location System

### Linear Progression

```text
Village → Forest → Dungeon Level 1 → Dungeon Level 2 → Prison → ...
```

### Location States

Each location can have multiple states:

```yaml
location:
  id: "prison_level_3"
  name: "Prison Level 3"
  
  states:
    - id: "initial"
      description: "Dark, damp corridor. Cells on both sides."
      doors_locked: true
      guards_present: true
      
    - id: "after_combat"
      description: "Bodies on floor. Cells unlocked."
      doors_locked: false
      guards_present: false
      
    - id: "explored"
      description: "Everything searched. Exit found."
      doors_locked: false
      guards_present: false
      exit_found: true
```

### Location History

Track all states for each location:

```yaml
location_history:
  location_id: "prison_level_3"
  states:
    - snapshot_id: "snapshot-100"
      state: "initial"
      timestamp: "2026-07-01T20:00:00"
      
    - snapshot_id: "snapshot-200"
      state: "after_combat"
      timestamp: "2026-07-01T21:30:00"
      
    - snapshot_id: "snapshot-300"
      state: "explored"
      timestamp: "2026-07-01T22:45:00"
```

---

## DM Control Interface

### Session Management Panel

```
┌─────────────────────────────────────────┐
│  Session Management                     │
│  ─────────────────────────────────────  │
│  Current: Session #15 - Prison Break    │
│  Status: ACTIVE                         │
│  Started: 2026-08-18 20:00             │
│  ─────────────────────────────────────  │
│  [Pause]  [Resume]  [Complete]          │
│  ─────────────────────────────────────  │
│  Quick Actions:                         │
│  [Save Snapshot]  [Revert to Snapshot]  │
│  [Change Map]  [Time Travel]            │
│  ─────────────────────────────────────  │
│  Snapshots:                             │
│  📸 #1 - 20:00 - Started session        │
│  📸 #2 - 20:45 - After first combat     │
│  📸 #3 - 21:30 - Found secret passage   │
│  📸 #4 - 22:00 - Pause (current)        │
│  ─────────────────────────────────────  │
│  [Revert to #2]  [Revert to #3]        │
└─────────────────────────────────────────┘
```

### Time Travel Interface

```
┌─────────────────────────────────────────┐
│  Time Travel                            │
│  ─────────────────────────────────────  │
│  Select point to revert to:             │
│  ─────────────────────────────────────  │
│  📅 2026-07-01 - Session #1 - Village   │
│  📅 2026-07-08 - Session #5 - Forest    │
│  📅 2026-07-15 - Session #8 - Dungeon   │
│  📅 2026-08-18 - Session #15 - Prison   │
│  ─────────────────────────────────────  │
│  Options:                               │
│  ☑ Keep character progress              │
│  ☑ Keep world state                     │
│  ☐ Keep events after this point         │
│  ─────────────────────────────────────  │
│  [Revert]  [Cancel]                     │
└─────────────────────────────────────────┘
```

---

## Database Schema

### Sessions Table (additions)

```sql
ALTER TABLE sessions ADD COLUMN status VARCHAR(20) DEFAULT 'DRAFT';
ALTER TABLE sessions ADD COLUMN paused_at TIMESTAMP;
ALTER TABLE sessions ADD COLUMN resume_count INTEGER DEFAULT 0;
```

### World Snapshots Table (new)

```sql
CREATE TABLE world_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    name VARCHAR(100),
    description TEXT,
    
    # World state
    current_map_id VARCHAR(36),
    time_of_day VARCHAR(20),
    weather VARCHAR(50),
    active_factions JSON,
    
    # Character states
    characters_json TEXT,
    
    # Location states
    locations_json TEXT,
    
    # Events
    events_json TEXT,
    
    # DM notes
    dm_notes TEXT,
    
    # Metadata
    created_at TIMESTAMP,
    is_auto_save BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

### Location States Table (new)

```sql
CREATE TABLE location_states (
    id VARCHAR(36) PRIMARY KEY,
    location_id VARCHAR(36) NOT NULL,
    snapshot_id VARCHAR(36) NOT NULL,
    
    state_name VARCHAR(100),
    state_description TEXT,
    
    # State data
    doors_locked BOOLEAN,
    guards_present BOOLEAN,
    explored_areas JSON,
    active_npcs JSON,
    
    created_at TIMESTAMP,
    
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (snapshot_id) REFERENCES world_snapshots(id)
);
```

---

## Implementation Priority

### Phase 3: Session Management (Enhanced)

```text
□ Add pause/resume to session lifecycle
□ Create WorldSnapshot model
□ Add snapshot API endpoints
□ Add location state tracking
□ Implement revert functionality
```

### Phase 5: DM Dashboard (Enhanced)

```text
□ Add session management panel
□ Add time travel interface
□ Add snapshot management UI
□ Add location state viewer
```

### Phase 6: World State Engine

```text
□ Create world state manager
□ Implement snapshot creation
□ Implement state restoration
□ Add auto-save on pause
```
