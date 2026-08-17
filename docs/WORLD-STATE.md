# WORLD-STATE.md

> Definición del estado actual del mundo del RPG World Engine.
>
> Este documento establece cómo representar la situación actual de la
> campaña sin necesidad de volver a procesar toda la historia cada vez
> que un agente necesite información.
>
> El World State constituye el puente entre:
>
> HISTORIA → EVENTOS → ESTADO ACTUAL → SESIÓN → ESCENA → RUNTIME 3D

---

# 1. Objetivo

El World State representa cómo se encuentra actualmente el mundo de la campaña.

Debe responder preguntas como:

- ¿Dónde están actualmente los personajes?
- ¿Qué personajes están vivos?
- ¿Qué NPCs conocen los jugadores?
- ¿Qué quests están activas?
- ¿Qué puertas están abiertas?
- ¿Qué lugares fueron descubiertos?
- ¿Qué objetos están en posesión del grupo?
- ¿Qué facciones están aliadas o enfrentadas?
- ¿Cuál es el mapa actual?
- ¿Cuál es la escena que debe cargar el runtime?
- ¿Qué ocurrió anteriormente pero ya no afecta directamente al presente?

---

# 2. Principio Fundamental

El World State no es la historia.

La historia está formada por eventos:

```text
EVENT 001
EVENT 002
EVENT 003
...
EVENT 150
```

El World State representa el resultado actual de esos eventos:

```text
CURRENT WORLD STATE
```

Por lo tanto:

```text
HISTORIA
   ↓
EVENTOS CANON
   ↓
WORLD STATE
```

---

# 3. Ejemplo

Historial:

```text
Event 001:
The party entered the prison.

Event 002:
Ardan found a key.

Event 003:
The party opened the vault.

Event 004:
The party left the prison.
```

World State:

```text
Party location:
Unknown / Outside Prison

Vault door:
OPEN

Key:
Possessed by Ardan

Prison:
DISCOVERED
```

No es necesario volver a leer los cuatro eventos para conocer el estado.

---

# 4. Estado Actual vs Historia

Debe existir una separación estricta.

```text
EVENT
=
What happened.

WORLD STATE
=
What is true now.
```

Ejemplo:

```text
Event:
The door was opened.

Current State:
Door = OPEN
```

---

# 5. World State como Snapshot

El estado puede almacenarse como un snapshot.

Ejemplo:

```text
snapshot-015
```

representando:

```text
World State
after Session 015
```

Esto permite evitar recalcular todo el mundo desde el comienzo.

---

# 6. Snapshot Strategy

Inicialmente:

```text
Session 001
        ↓
Session 005
        ↓
Snapshot
        ↓
Session 006
        ↓
Session 010
        ↓
Snapshot
```

El sistema puede reconstruir el estado desde el último snapshot más los eventos posteriores.

---

# 7. Snapshot Frequency

Para el MVP puede utilizarse:

```text
1 snapshot per completed session
```

Posteriormente:

```text
1 snapshot per N events
```

o:

```text
Automatic checkpoint
```

cuando el número de cambios sea significativo.

---

# 8. Current World State

Debe existir un estado identificado como:

```text
CURRENT
```

Ejemplo:

```text
world-state-current
```

Este es el estado que normalmente consumen:

- UI;
- agentes;
- DM Controller;
- Scene Manager;
- 3D Runtime.

---

# 9. Historical World States

También pueden existir:

```text
world-state-session-001
world-state-session-005
world-state-session-010
world-state-session-015
```

Estos representan estados históricos.

---

# 10. Estado Actual de Personajes

Cada personaje debe tener un estado actual.

Ejemplo:

```text
character-ardan
```

Puede contener:

```text
status
location
health
inventory
equipment
relationships
conditions
knowledge
```

---

# 11. Character Status

Estados básicos:

```text
ACTIVE
INACTIVE
UNCONSCIOUS
DEAD
MISSING
UNKNOWN
```

No asumir automáticamente que:

```text
INACTIVE = DEAD
```

---

# 12. Character Location

Debe existir una ubicación actual.

Ejemplo:

```text
character-ardan
location_id = prison-vault
```

---

# 13. Location Hierarchy

Una ubicación puede pertenecer a otra.

Ejemplo:

```text
World
└── Kingdom
    └── City
        └── Prison
            └── Vault
```

Esto permite consultar:

```text
Where is Ardan?
```

y obtener:

```text
Vault
Prison
City
Kingdom
World
```

---

# 14. Current Party Location

El sistema debe poder determinar:

```text
current_party_location
```

Ejemplo:

```text
location-prison-vault
```

---

# 15. Party Members

El estado actual debe saber qué personajes forman parte del grupo.

Ejemplo:

```text
party:
    - character-ardan
    - character-elena
    - character-marcus
```

---

# 16. Split Party

El sistema debe soportar grupos separados.

Ejemplo:

```text
Party A:
Ardan
Elena

Party B:
Marcus
Lira
```

Cada grupo puede tener:

```text
location
active_scene
state
```

independientes.

---

# 17. Party Merge

Cuando vuelven a reunirse:

```text
Party A
   +
Party B
   ↓
Main Party
```

El World State debe actualizar las ubicaciones.

---

# 18. NPC State

Los NPC importantes deben tener estado actual.

Ejemplo:

```text
NPC:
Varek

State:
ALIVE

Location:
City

Faction:
Guild

Disposition:
HOSTILE
```

---

# 19. NPC Location

Un NPC puede estar:

```text
IN_LOCATION
TRAVELING
MISSING
UNKNOWN
DEAD
```

---

# 20. NPC Disposition

Puede utilizarse:

```text
UNKNOWN
NEUTRAL
FRIENDLY
HOSTILE
ALLIED
FEARFUL
TRUSTING
```

La disposición debe poder evolucionar mediante eventos.

---

# 21. Relationships

Las relaciones entre entidades forman parte del estado actual.

Ejemplo:

```text
Ardan
   ↓
FRIEND
   ↓
Varek
```

---

# 22. Relationship State

Ejemplos:

```text
ALLY
FRIEND
NEUTRAL
SUSPICIOUS
RIVAL
ENEMY
LOVER
FAMILY
MASTER
SERVANT
```

La lista puede adaptarse al sistema narrativo.

---

# 23. Relationship Strength

Opcionalmente:

```text
-100 → Hostile
   0 → Neutral
+100 → Allied
```

Pero no debe utilizarse como única representación.

Una relación puede tener además:

```text
trust
fear
respect
affection
```

---

# 24. Faction State

Las facciones pueden tener:

```text
status
leader
territory
alliances
enemies
known_to_party
```

---

# 25. Faction Relations

Ejemplo:

```text
Guild
   ↓ ALLIED
Kingdom

Guild
   ↓ HOSTILE
Cult
```

---

# 26. Quest State

Cada quest activa debe mantener su estado.

Estados:

```text
UNKNOWN
AVAILABLE
ACTIVE
PAUSED
COMPLETED
FAILED
ABANDONED
```

---

# 27. Quest Objectives

Cada objetivo puede tener:

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
FAILED
```

Ejemplo:

```text
Quest:
Escape Prison

Objectives:

[✓] Find a way out.
[✓] Open the vault.
[ ] Reach the city.
```

---

# 28. Quest Consequences

Completar una quest puede modificar:

```text
Character
Location
Faction
Inventory
World State
Future Quests
Scene
```

---

# 29. Inventory State

El inventario actual debe poder consultarse directamente.

Ejemplo:

```text
Ardan:
    Vault Key
    Sword
    Torch
```

---

# 30. Item Ownership

Un objeto puede pertenecer a:

```text
CHARACTER
PARTY
NPC
LOCATION
FACTION
WORLD
```

---

# 31. Item Location

Un objeto no necesariamente tiene propietario.

Ejemplo:

```text
Vault Key
location = vault
owner = null
```

Después:

```text
Vault Key
owner = Ardan
location = Ardan
```

---

# 32. Item State

Objetos interactivos pueden tener estados.

Ejemplo:

```text
door:
CLOSED
OPEN
LOCKED
BROKEN
DESTROYED
```

---

# 33. Interactive Objects

El World State puede almacenar:

```text
doors
chests
switches
levers
traps
portals
mechanisms
```

---

# 34. Example

```text
vault-door

state:
OPEN

lock:
DISABLED

trap:
TRIGGERED
```

---

# 35. Environmental State

El entorno puede tener variables:

```text
lighting
weather
time
temperature
fire
smoke
fog
water_level
```

No todas son necesarias para el MVP.

---

# 36. Scene State

La escena actual debe tener estado.

Ejemplo:

```text
scene:
vault-main

lighting:
dark

music:
vault-ambience

fog:
enabled

door:
open
```

---

# 37. Scene vs Location

No confundir:

```text
LOCATION
```

con:

```text
SCENE
```

Una ubicación es una entidad narrativa/física.

Una escena es su representación visual/runtime.

Ejemplo:

```text
Location:
Prison Vault

Scene:
scene-prison-vault-v2
```

---

# 38. Multiple Scene Representations

Una misma ubicación puede tener diferentes escenas.

Ejemplo:

```text
Prison Vault
├── scene-before-discovery
├── scene-after-opening
└── scene-destroyed
```

---

# 39. Active Scene

Debe existir:

```text
active_scene_id
```

Ejemplo:

```text
scene-prison-vault
```

---

# 40. Active Map

Debe existir:

```text
active_map_id
```

Ejemplo:

```text
map-prison-vault
```

---

# 41. Current Visual Context

El runtime debería poder recibir:

```text
current_location
current_map
current_scene
characters
npcs
interactive_objects
environment
audio
lighting
```

sin cargar todo el lore.

---

# 42. Historical Maps

Los mapas anteriores no deben eliminarse.

Ejemplo:

```text
maps/
├── prison/
├── city/
├── forest/
└── cave/
```

---

# 43. Active vs Historical

Una ubicación puede estar:

```text
ACTIVE
INACTIVE
DESTROYED
ABANDONED
UNKNOWN
```

---

# 44. Map Status

Un mapa puede tener:

```text
CURRENT
AVAILABLE
HISTORICAL
ARCHIVED
```

---

# 45. Example

La party actualmente está en:

```text
Prison Vault
```

Entonces:

```text
Prison Vault:
CURRENT

Prison Entrance:
HISTORICAL

City:
HISTORICAL
```

Pero esos lugares siguen existiendo en la campaña.

---

# 46. Do Not Delete Past Maps

Nunca eliminar automáticamente un mapa porque:

```text
the party left the location
```

Salir de un lugar no significa que el lugar haya dejado de existir.

---

# 47. Map Revisit

Si la party vuelve:

```text
Historical Map
      ↓
Reactivated
      ↓
Current Map
```

---

# 48. Scene Revisit

Al volver a una ubicación:

```text
Location
   ↓
Load current world state
   ↓
Load corresponding scene
```

La escena debe reflejar los cambios producidos anteriormente.

---

# 49. Example Revisit

Session 5:

```text
Vault Door = CLOSED
```

Session 10:

```text
Vault Door = OPEN
```

Session 15:

La party vuelve.

El runtime debe cargar:

```text
Vault Door = OPEN
```

No la escena original.

---

# 50. Dynamic Scene

La escena visual debe ser:

```text
BASE SCENE
+
WORLD STATE
=
CURRENT SCENE
```

---

# 51. Example

```text
Base Prison Scene
+
Door Open
+
Broken Torch
+
Dead Guardian
+
Characters Present
=
Current Prison Scene
```

---

# 52. Runtime Separation

El runtime 3D no debe modificar directamente el canon.

Debe recibir:

```text
World State
```

y representarlo.

---

# 53. Runtime Authority

Correcto:

```text
World State
      ↓
Runtime
```

Incorrecto:

```text
Runtime
      ↓
Canon
```

salvo mediante eventos explícitos.

---

# 54. Runtime Event

Si un jugador interactúa con una puerta:

```text
Player Action
   ↓
Runtime
   ↓
Interaction Event
   ↓
Event System
   ↓
World State
```

---

# 55. Current Session State

El sistema debe distinguir:

```text
CURRENT_WORLD
```

de:

```text
CURRENT_SESSION
```

---

# 56. Current Session

Puede contener:

```text
session_id
started_at
participants
current_location
current_scene
pending_events
```

---

# 57. Session State Example

```json
{
  "session_id": "session-016",
  "status": "IN_PROGRESS",
  "current_location": "location-vault",
  "current_scene": "scene-vault",
  "active_party": [
    "character-ardan",
    "character-elena"
  ]
}
```

---

# 58. Pending Events

Durante la partida puede haber eventos:

```text
DETECTED
PROPOSED
PENDING_REVIEW
```

Estos no necesariamente forman parte todavía del World State definitivo.

---

# 59. State Update

Cuando un evento se convierte en CANON:

```text
CANON EVENT
   ↓
STATE REDUCER
   ↓
WORLD STATE UPDATE
```

---

# 60. State Reducer

El reducer transforma:

```text
Previous State
+
Event
```

en:

```text
New State
```

Ejemplo:

```text
State:
door = CLOSED

Event:
DOOR_OPENED

New State:
door = OPEN
```

---

# 61. Reducer Rule

El reducer debe ser determinista siempre que sea posible.

La misma combinación:

```text
State + Event
```

debe producir:

```text
Same Result
```

---

# 62. Invalid Event

Si:

```text
door = DESTROYED
```

y llega:

```text
DOOR_OPENED
```

el reducer no debería inventar una solución.

Debe generar:

```text
STATE_CONFLICT
```

---

# 63. State Conflict

Ejemplo:

```text
Entity:
vault-door

Current:
DESTROYED

Event:
OPENED

Conflict:
HIGH
```

Debe requerir resolución.

---

# 64. State Validation

Después de aplicar eventos importantes:

```text
Event
 ↓
Reducer
 ↓
Validation
 ↓
World State
```

---

# 65. Invariants

El sistema puede tener reglas invariantes.

Ejemplo:

```text
A DEAD character cannot perform normal actions.
```

Otro:

```text
A DESTROYED door cannot be opened unless rebuilt.
```

Otro:

```text
An item cannot simultaneously belong to two characters.
```

---

# 66. Soft Invariants

No todas las inconsistencias deben bloquear el sistema.

Ejemplo:

```text
NPC location unknown
```

puede ser válido.

---

# 67. Hard Invariants

Algunas inconsistencias sí deberían bloquear una actualización.

Ejemplo:

```text
same unique item owned by two entities
```

---

# 68. State Confidence

Algunos datos pueden ser inciertos.

Ejemplo:

```text
Varek location:
UNKNOWN
```

No inventar:

```text
Varek location:
City
```

solo porque sea probable.

---

# 69. Unknown State

Utilizar explícitamente:

```text
UNKNOWN
```

cuando el sistema no posee información suficiente.

No confundir:

```text
UNKNOWN
```

con:

```text
NONE
```

---

# 70. Null vs Unknown

Ejemplo:

```text
owner = null
```

puede significar:

```text
No owner.
```

Mientras:

```text
owner = UNKNOWN
```

significa:

```text
We don't know the owner.
```

---

# 71. Knowledge State

El World State puede almacenar hechos del mundo que los jugadores conocen,
pero debe distinguirlos del conocimiento real del sistema.

---

# 72. Player Knowledge

Ejemplo:

```text
Players know:
The king is dead.
```

Pero:

```text
Actual World State:
King = UNKNOWN
```

si solamente fue un rumor.

---

# 73. Rumors

Los rumores pueden existir como información no confirmada.

Ejemplo:

```text
Rumor:
The king is dead.

Truth:
UNKNOWN
```

---

# 74. Information State

Puede existir:

```text
UNKNOWN
RUMORED
SUSPECTED
DISCOVERED
CONFIRMED
```

---

# 75. Knowledge Separation

Esto permite historias donde:

```text
Players believe X
```

pero:

```text
World actually is Y
```

---

# 76. Character Knowledge

Los personajes pueden tener conocimiento individual.

Ejemplo:

```text
Ardan knows:
    location-vault
    npc-varek

Elena does not know:
    npc-varek
```

---

# 77. Knowledge Scope

El sistema debe poder consultar:

```text
What does the party know?
```

y:

```text
What does Ardan know?
```

---

# 78. World Truth vs Narrative Knowledge

Separación:

```text
WORLD STATE
    ↓
What is true

KNOWLEDGE STATE
    ↓
What entities believe/know
```

---

# 79. Flags

El World State puede utilizar flags narrativos.

Ejemplo:

```text
vault_discovered = true
guardian_defeated = true
cult_alerted = false
```

---

# 80. Flag Naming

Usar:

```text
snake_case
```

Ejemplo:

```text
vault_opened
king_dead
city_alerted
```

---

# 81. Avoid Excessive Flags

No convertir toda la lógica del mundo en cientos de flags.

Si algo es una entidad real:

```text
door
npc
quest
location
item
```

debe tener su propio estado.

---

# 82. Variables

Algunas campañas pueden necesitar valores numéricos.

Ejemplo:

```text
city_reputation = 42
cult_influence = 70
```

---

# 83. Variables Should Be Explicit

Cada variable debe tener:

```text
name
value
scope
description
```

---

# 84. Scope

Variables pueden ser:

```text
WORLD
CAMPAIGN
FACTION
CHARACTER
PARTY
LOCATION
QUEST
SESSION
```

---

# 85. Current Time

El World State puede almacenar el tiempo narrativo.

Ejemplo:

```text
world_time:
day = 42
hour = 21
```

No confundir con:

```text
real_time
```

---

# 86. Narrative Calendar

Si la campaña utiliza calendario propio:

```text
calendar_id
date
season
day
time
```

---

# 87. Weather

Opcional:

```text
weather:
rain
wind:
strong
temperature:
cold
```

---

# 88. Environmental State

Puede afectar al runtime:

```text
fog = true
rain = true
fire = false
darkness = high
```

---

# 89. Current Scene Preparation

Antes de iniciar una party:

```text
Load World State
        ↓
Resolve Party
        ↓
Resolve Location
        ↓
Resolve Scene
        ↓
Resolve Characters
        ↓
Resolve Environment
        ↓
Load Runtime
```

---

# 90. Scene Context Builder

Debe construir un contexto reducido.

Ejemplo:

```text
CURRENT SCENE CONTEXT

Location:
Prison Vault

Characters:
Ardan
Elena

NPCs:
Guardian

Objects:
Vault Door
Chest

Quest:
Escape Prison

Environment:
Dark
Cold
Low visibility
```

---

# 91. Agent Context

Un agente visual no necesita leer:

```text
Entire Campaign Lore
```

Debe recibir:

```text
Scene Context
+
Relevant World State
+
Relevant Lore
```

---

# 92. World State Query

Ejemplos:

```text
get_current_party_location()
```

```text
get_character_state("character-ardan")
```

```text
get_location_state("location-prison")
```

```text
get_active_quests()
```

```text
get_current_scene()
```

---

# 93. Context Retrieval

Los agentes deben acceder mediante consultas específicas.

No mediante:

```text
read_everything()
```

---

# 94. State Storage

El estado estructurado debe almacenarse principalmente en SQLite.

---

# 95. Conceptual Tables

Tablas mínimas:

```text
world_state
characters
character_state
locations
location_state
npcs
npc_state
items
item_state
quests
quest_state
relationships
flags
variables
scenes
session_state
snapshots
```

---

# 96. World State Table

Conceptualmente:

```text
world_state
--------------------------------
id
campaign_id
current_session_id
current_time
active_location_id
active_scene_id
updated_at
```

---

# 97. Character State Table

```text
character_state
--------------------------------
character_id
status
location_id
health
current_party_id
updated_at
```

---

# 98. Location State Table

```text
location_state
--------------------------------
location_id
status
discovered
current_scene_id
parent_location_id
updated_at
```

---

# 99. Quest State Table

```text
quest_state
--------------------------------
quest_id
status
progress
updated_at
```

---

# 100. Item State Table

```text
item_state
--------------------------------
item_id
owner_id
location_id
status
updated_at
```

---

# 101. Scene State Table

```text
scene_state
--------------------------------
scene_id
location_id
status
environment_json
updated_at
```

---

# 102. Snapshot Table

```text
snapshots
--------------------------------
id
campaign_id
session_id
created_at
database_version
description
```

---

# 103. Snapshot Content

El snapshot puede estar:

```text
SQLite
```

o:

```text
JSON
```

según implementación.

Para el MVP:

```text
SQLite backup
```

es suficiente.

---

# 104. Snapshot Directory

Ejemplo:

```text
snapshots/
├── session-001/
├── session-005/
├── session-010/
└── session-015/
```

---

# 105. Snapshot Metadata

Ejemplo:

```json
{
  "snapshot_id": "snapshot-015",
  "session_id": "session-015",
  "created_at": "2026-08-15T23:40:00",
  "event_id": "event-000250"
}
```

---

# 106. Snapshot Recovery

Para reconstruir el presente:

```text
Latest Snapshot
      +
Events after Snapshot
      ↓
Current World State
```

---

# 107. Snapshot Validation

Después de crear un snapshot:

```text
Snapshot
 ↓
Validation
 ↓
Checksum
```

---

# 108. Checksum

Puede utilizarse:

```text
SHA-256
```

para verificar integridad.

---

# 109. World State Markdown

Aunque SQLite sea la fuente estructurada, puede existir:

```text
world-state.md
```

como resumen humano.

---

# 110. World-state.md Example

```md
# Current World State

## Current Session

Session 016

## Current Location

Prison Vault

## Active Characters

- Ardan
- Elena

## Active Quests

- Escape the Prison

## Important State

- Vault door: OPEN
- Guardian: DEFEATED
- Alarm: ACTIVE

## Current Scene

scene-prison-vault
```

---

# 111. Markdown Role

Este archivo no debería ser la única fuente de verdad.

Su objetivo es:

```text
Human-readable snapshot
```

---

# 112. Agent Optimization

Los agentes pueden leer:

```text
world-state.md
```

para obtener rápidamente una visión general.

Luego consultar SQLite o archivos específicos para detalles.

---

# 113. Two-Level Retrieval

Recomendado:

```text
Level 1:
world-state.md

Level 2:
specific entity/state
```

Ejemplo:

```text
world-state.md
       ↓
Ardan
       ↓
characters/ardan.md
```

---

# 114. Avoid Full Campaign Loading

Nunca utilizar como contexto normal:

```text
campaign/
```

completo.

---

# 115. Context Budget

El agente debe recibir:

```text
Minimum context necessary
```

para realizar una tarea.

---

# 116. Example

Tarea:

> Generar la escena de la bóveda.

Contexto:

```text
world-state
+
vault state
+
current characters
+
vault scene
+
relevant recent events
```

No:

```text
all sessions
+
all NPCs
+
all lore
```

---

# 117. State Dependencies

Una entidad puede depender de otras.

Ejemplo:

```text
Quest
 ↓
Location
 ↓
Door
 ↓
Item
```

El retrieval system debe resolver estas dependencias cuando sean relevantes.

---

# 118. State Graph

Conceptualmente:

```text
Character
    │
    ├── Location
    │
    ├── Inventory
    │
    ├── Relationships
    │
    └── Quests
            │
            └── Location
                    │
                    └── Scene
```

---

# 119. Current Map Resolution

El mapa actual se determina mediante:

```text
current_location
        ↓
location.map_id
        ↓
active_map
```

---

# 120. Current Scene Resolution

La escena actual:

```text
current_location
        ↓
current_scene_id
```

pero puede depender del estado.

Ejemplo:

```text
Vault
+
Door OPEN
+
Guardian DEAD
=
Vault Scene Variant 2
```

---

# 121. Scene Variant

No es obligatorio crear físicamente:

```text
scene-v1
scene-v2
scene-v3
```

para cada estado.

Puede existir:

```text
Base Scene
+
State Overrides
```

---

# 122. Recommended Scene Model

```text
BASE SCENE
    +
STATE OVERRIDES
    +
CHARACTER POSITIONS
    +
EVENT TRIGGERS
```

---

# 123. Character Positions

El World State puede almacenar posiciones tácticas actuales.

Ejemplo:

```json
{
  "character_id": "character-ardan",
  "scene_id": "scene-vault",
  "x": 4,
  "y": 7
}
```

---

# 124. Position Persistence

La posición puede ser:

```text
SESSION_ONLY
```

o:

```text
PERSISTENT
```

---

# 125. Session-only Position

Durante combate:

```text
Ardan at x=5,y=8
```

puede no ser importante después de la sesión.

---

# 126. Persistent Position

Si la party permanece en una ubicación:

```text
Party location:
Vault
```

sí debe persistirse.

---

# 127. Tactical State

El estado de combate puede existir separado:

```text
combat_state
```

para no contaminar el World State permanente.

---

# 128. Combat End

Al finalizar:

```text
Combat State
   ↓
Relevant Results
   ↓
World State
```

---

# 129. State Categories

El World State puede dividirse en:

```text
NARRATIVE
PHYSICAL
SOCIAL
QUEST
CHARACTER
ENVIRONMENT
VISUAL
```

---

# 130. Narrative State

```text
flags
variables
discoveries
known secrets
```

---

# 131. Physical State

```text
doors
items
locations
structures
damage
destruction
```

---

# 132. Social State

```text
relationships
factions
reputation
alliances
hostility
```

---

# 133. Quest State

```text
active quests
completed objectives
failed quests
```

---

# 134. Character State

```text
health
status
location
inventory
equipment
conditions
```

---

# 135. Environment State

```text
weather
time
lighting
fog
fire
ambient conditions
```

---

# 136. Visual State

```text
active map
active scene
character positions
scene overrides
music
effects
```

---

# 137. State Priority

Cuando existen conflictos:

```text
CANON EVENT
    >
CURRENT STATE
    >
DERIVED CACHE
    >
VISUAL CACHE
```

---

# 138. Cache Rule

Nunca considerar:

```text
cache
```

como fuente de verdad.

---

# 139. Derived State

Algunos datos pueden calcularse.

Ejemplo:

```text
Party location
```

puede derivarse de las ubicaciones de sus miembros.

---

# 140. Materialized State

Para mejorar rendimiento, ese resultado puede materializarse:

```text
party.current_location
```

pero debe poder reconstruirse.

---

# 141. Rebuild

Debe existir conceptualmente:

```text
REBUILD WORLD STATE
```

que permita recalcular el estado desde:

```text
Snapshot
+
Events
```

---

# 142. Rebuild Safety

El rebuild no debe destruir el estado actual sin crear primero un backup.

---

# 143. State Migration

Si cambia el modelo de datos:

```text
Migration
 ↓
Snapshot
 ↓
Validation
 ↓
New State
```

---

# 144. End of Session

Al finalizar una sesión:

```text
Pending Events
      ↓
DM Review
      ↓
Canon
      ↓
State Reducer
      ↓
World State
      ↓
Snapshot
      ↓
Recap
```

---

# 145. Next Session Preparation

Antes de la próxima party:

```text
Load Current World State
        ↓
Determine Party
        ↓
Determine Location
        ↓
Determine Active Quest
        ↓
Determine Relevant NPCs
        ↓
Determine Current Scene
        ↓
Prepare Runtime
```

---

# 146. Example

La sesión anterior terminó:

```text
Party:
Ardan
Elena

Location:
Prison Vault

Quest:
Escape Prison

Vault Door:
OPEN

Guardian:
DEFEATED
```

La siguiente sesión puede comenzar directamente con:

```text
scene-prison-vault
```

sin reconstruir toda la campaña.

---

# 147. Historical Context

Si un jugador pregunta:

> ¿Cómo llegamos hasta acá?

Entonces sí se recupera:

```text
Recent Events
+
Relevant Session Recaps
+
Character History
```

---

# 148. Different Query, Different Context

Para:

```text
"¿Dónde estamos?"
```

usar:

```text
World State
```

Para:

```text
"¿Por qué estamos acá?"
```

usar:

```text
Events
+
Quest
+
Recap
```

Para:

```text
"¿Quién es Varek?"
```

usar:

```text
NPC
+
Relationships
+
Relevant History
```

---

# 149. World State and Recap

El recap debe generarse a partir de:

```text
Canon Events
+
World State Changes
```

No solamente de la transcripción.

---

# 150. World State and Lore

El lore permanente debe actualizarse únicamente cuando un evento
establece información que debe convertirse en conocimiento de mundo.

Ejemplo:

```text
Event:
Party discovers that the old king founded the city.

Canon:
TRUE

Lore:
history.md updated/proposed
```

---

# 151. Lore Proposal

La IA puede proponer:

```text
LORE_UPDATE_PROPOSAL
```

pero no debería sobrescribir automáticamente lore importante.

---

# 152. World State and 3D

El motor visual consume solamente la información necesaria.

Ejemplo:

```json
{
  "location": "vault",
  "scene": "vault-main",
  "characters": [
    {
      "id": "ardan",
      "position": [4,7],
      "visible": true
    }
  ],
  "objects": [
    {
      "id": "vault-door",
      "state": "OPEN"
    }
  ],
  "environment": {
    "lighting": "dark",
    "fog": true
  }
}
```

---

# 153. Visual Projection

Esto constituye una:

```text
WORLD STATE PROJECTION
```

No una copia completa del mundo.

---

# 154. Projection

```text
WORLD STATE
      ↓
SCENE PROJECTION
      ↓
3D RUNTIME
```

---

# 155. Runtime Performance

El runtime debe cargar solamente:

```text
Current Scene
+
Nearby Assets
+
Visible Characters
+
Relevant Effects
```

---

# 156. Asset Streaming

A futuro:

```text
Current Scene
      ↓
Load Required Assets
      ↓
Unload Distant Assets
```

---

# 157. Local-first Requirement

El World State debe funcionar completamente sin internet.

Dependencias iniciales:

```text
SQLite
Filesystem
Local Application
```

---

# 158. No External Database

El MVP no requiere:

```text
PostgreSQL
MongoDB
Redis
Cloud Database
```

---

# 159. SQLite Role

SQLite almacena:

```text
Entities
Relationships
Events
State
Snapshots
Asset Metadata
Sessions
Quests
```

---

# 160. Filesystem Role

El filesystem almacena:

```text
Markdown
Images
Maps
Audio
Video
3D Models
Backups
Exports
```

---

# 161. Recommended Architecture

```text
                ┌─────────────────────┐
                │      SQLite         │
                │                     │
                │ Events              │
                │ World State         │
                │ Entities            │
                │ Relationships       │
                │ Sessions            │
                └──────────┬──────────┘
                           │
                           │
                ┌──────────▼──────────┐
                │     Filesystem      │
                │                     │
                │ Markdown            │
                │ Maps                │
                │ Images              │
                │ Audio               │
                │ Video               │
                │ 3D Assets           │
                └──────────┬──────────┘
                           │
                           ▼
                    Context Builder
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
             AI          DM UI       Runtime
```

---

# 162. MVP World State

La primera versión debe soportar como mínimo:

```text
Current Session
Current Party
Current Character Locations
Current World Location
Active Quests
Important NPC States
Inventory
Interactive Object States
Current Map
Current Scene
Canon Events
Snapshot
```

---

# 163. MVP Does Not Require

Inicialmente no es necesario:

```text
Complex temporal simulation
Advanced NPC autonomous simulation
Full event replay UI
Procedural world simulation
Distributed state management
Cloud synchronization
Multiplayer networking
```

---

# 164. Future Expansion

Posteriormente se puede añadir:

```text
NPC autonomous behavior
Dynamic weather
Day/night cycle
Economic simulation
Faction simulation
World population
Procedural events
Historical reconstruction
Alternative timelines
```

---

# 165. Critical Design Rule

El sistema nunca debe asumir que:

```text
Current State
=
Everything that has ever happened
```

El estado actual es solamente:

```text
Current Truth
```

---

# 166. Historical Truth

La historia completa permanece en:

```text
Events
Sessions
Sources
Recaps
Lore
```

---

# 167. Final Model

```text
                ┌───────────────┐
                │    SOURCES    │
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │    EVENTS     │
                └───────┬───────┘
                        │
                   CANON EVENTS
                        │
                        ▼
                ┌───────────────┐
                │ STATE REDUCER │
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │  WORLD STATE  │
                └───────┬───────┘
                        │
        ┌───────────────┼────────────────┐
        │               │                │
        ▼               ▼                ▼
     CONTEXT          RECAP            QUESTS
        │
        ▼
   SCENE BUILDER
        │
        ▼
   VISUAL STATE
        │
        ▼
    3D RUNTIME
```

---

# 168. Final Principle

El RPG World Engine debe poder responder rápidamente:

```text
¿Qué pasó?
```

consultando:

```text
EVENTS
```

```text
¿Qué sabemos?
```

consultando:

```text
KNOWLEDGE
```

```text
¿Qué es verdad actualmente?
```

consultando:

```text
WORLD STATE
```

```text
¿Dónde estamos?
```

consultando:

```text
CURRENT SESSION
+
WORLD STATE
```

```text
¿Qué debe mostrar el entorno?
```

consultando:

```text
SCENE PROJECTION
```

---

# 169. Final Architecture

La arquitectura narrativa completa queda:

```text
SOURCE
  │
  ▼
INGESTION
  │
  ▼
EVENT DETECTION
  │
  ▼
EVENT REVIEW
  │
  ▼
CANON EVENT
  │
  ▼
WORLD STATE
  │
  ├──────────────► CHARACTER STATE
  │
  ├──────────────► LOCATION STATE
  │
  ├──────────────► QUEST STATE
  │
  ├──────────────► FACTION STATE
  │
  ├──────────────► ITEM STATE
  │
  └──────────────► ENVIRONMENT STATE
                         │
                         ▼
                  CURRENT SESSION
                         │
                         ▼
                  SCENE PROJECTION
                         │
               ┌─────────┴─────────┐
               ▼                   ▼
             2D/3D              AUDIO/VIDEO
               │                   │
               └─────────┬─────────┘
                         ▼
                    PARTY RUNTIME
```

El **World State** es, por tanto, la pieza que permite que el proyecto deje de ser simplemente un sistema que "lee el lore" y pase a comportarse como un **mundo persistente**: lo ocurrido modifica el estado, el estado determina qué existe actualmente y ese estado determina qué debe aparecer en la próxima party.
