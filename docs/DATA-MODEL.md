# DATA-MODEL.md

> Modelo de datos del RPG World Engine.
>
> Define las entidades, relaciones, estados y reglas de persistencia
> necesarias para almacenar la campaña de forma local, liviana,
> trazable y preparada para futuras expansiones.

---

# 1. Objetivo

El sistema necesita representar una campaña de rol completa a lo largo del tiempo.

Debe poder responder preguntas como:

- ¿Quién es este personaje?
- ¿Dónde está actualmente?
- ¿Dónde estuvo anteriormente?
- ¿Qué ocurrió durante una sesión?
- ¿Qué decisiones tomó el grupo?
- ¿Qué NPCs conocen los jugadores?
- ¿Qué NPCs existen pero los jugadores todavía no conocen?
- ¿Qué lugares existen?
- ¿Qué lugares visitaron?
- ¿Qué quests están activas?
- ¿Qué quests terminaron?
- ¿Qué objetos posee cada personaje?
- ¿Qué facciones existen?
- ¿Qué relaciones existen entre personajes y facciones?
- ¿Qué ocurrió en una determinada sesión?
- ¿Cuál es el estado actual del mundo?
- ¿Qué información es canon?
- ¿Qué información es solamente una propuesta de la IA?
- ¿De dónde salió determinada información?

---

# 2. Principios

El modelo debe cumplir:

```text
LOCAL-FIRST
SQLITE-FIRST
LIGHTWEIGHT
NORMALIZED
TRACEABLE
VERSIONABLE
REVERSIBLE
EXTENSIBLE
```

---

# 3. Regla Fundamental

La base de datos no debe almacenar solamente el estado actual.

Debe almacenar:

```text
HISTORIA
+
EVENTOS
+
ESTADO ACTUAL
```

Conceptualmente:

```text
                    CAMPAIGN
                       │
              ┌────────┴────────┐
              │                 │
           HISTORY            STATE
              │                 │
           EVENTS          CURRENT STATE
              │                 │
              └────────┬────────┘
                       │
                    CONTEXT
```

---

# 4. Historia vs Estado

Ejemplo:

El personaje `Ardan` actualmente se encuentra en una prisión.

Eso pertenece al:

```text
CURRENT WORLD STATE
```

Pero:

```text
Ardan llegó a la prisión durante la sesión 12.
```

pertenece al:

```text
HISTORICAL EVENT
```

---

# 5. No Duplicar Historia

No se debe convertir cada cambio en una modificación destructiva.

Incorrecto:

```text
location = "Prison"
```

y eliminar dónde estaba anteriormente.

Correcto:

```text
Event 1:
Ardan entered Forest.

Event 2:
Ardan traveled to City.

Event 3:
Ardan entered Prison.
```

El estado actual se deriva o actualiza a partir de esos eventos.

---

# 6. Identificadores

Todas las entidades persistentes deben tener un ID único.

Formato recomendado:

```text
UUID
```

Ejemplo:

```text
7e5b6b8d-1f0c-4e4c-8a3e-91e8c9a7f123
```

---

# 7. IDs Legibles

Además del UUID puede existir un `slug`.

Ejemplo:

```text
id:
7e5b6b8d-1f0c-4e4c-8a3e-91e8c9a7f123

slug:
ardan
```

El UUID identifica.

El slug facilita búsquedas humanas.

---

# 8. Entidades Principales

El MVP debe contemplar inicialmente:

```text
Campaign
Session
Character
NPC
Faction
Location
Item
Quest
Event
Relationship
Map
Scene
Asset
Recap
Source
WorldState
```

---

# 9. Campaign

Representa una campaña completa.

Ejemplo:

```text
Campaña principal
```

Campos:

```text
id
name
slug
description
created_at
updated_at
status
```

Estados:

```text
ACTIVE
PAUSED
COMPLETED
ARCHIVED
```

---

# 10. Campaign Example

```yaml
campaign:
  id: campaign-main
  name: "Nombre de la campaña"
  slug: "campana-principal"
  status: ACTIVE
```

---

# 11. Session

Representa una party/sesión de juego.

Ejemplo:

```text
Session 001
Session 002
Session 003
```

Campos:

```text
id
campaign_id
session_number
title
date
summary
status
created_at
updated_at
```

---

# 12. Session Status

```text
PLANNED
IN_PROGRESS
COMPLETED
CANCELLED
```

---

# 13. Session

Una sesión debe poder contener:

```text
Events
Participants
Recap
Notes
Scenes
Maps
Assets
```

---

# 14. Character

Representa un personaje jugador.

Campos iniciales:

```text
id
campaign_id
name
slug
description
status
player_name
created_at
updated_at
```

---

# 15. Character Status

```text
ACTIVE
INACTIVE
DEAD
RETIRED
MISSING
UNKNOWN
```

---

# 16. Player vs Character

No mezclar:

```text
PLAYER
```

con:

```text
CHARACTER
```

Ejemplo:

```text
Player:
Nacho

Character:
Ardan
```

---

# 17. Character Extended Data

La información específica del sistema de reglas no debe obligar al modelo
principal a conocer cada sistema de RPG.

Por ejemplo:

```text
level
class
race
stats
alignment
abilities
```

pueden almacenarse inicialmente como metadata estructurada.

---

# 18. Character Metadata

Ejemplo:

```json
{
  "class": "Warrior",
  "level": 5,
  "race": "Human"
}
```

Esto permite soportar diferentes sistemas de RPG.

---

# 19. NPC

Representa un personaje no jugador.

Campos:

```text
id
campaign_id
name
slug
description
status
created_at
updated_at
```

---

# 20. NPC vs Character

No mezclar ambos conceptualmente.

```text
Character
    ↓
Player controlled

NPC
    ↓
DM controlled
```

Sin embargo, ambos pueden compartir información visual.

---

# 21. Entity Abstraction

A futuro puede existir:

```text
Entity
```

como abstracción general.

Por ahora se mantiene separado para simplificar el MVP.

---

# 22. Faction

Representa una organización, grupo o facción.

Ejemplos:

```text
Guild
Cult
Kingdom
Army
Corporation
Clan
Religious Order
```

Campos:

```text
id
campaign_id
name
slug
description
status
created_at
updated_at
```

---

# 23. Faction Status

```text
ACTIVE
INACTIVE
DESTROYED
UNKNOWN
```

---

# 24. Location

Representa cualquier lugar del mundo.

Puede ser:

```text
WORLD
REGION
CITY
TOWN
BUILDING
ROOM
DUNGEON
CAVE
TUNNEL
PRISON
VAULT
FOREST
ROAD
```

---

# 25. Location Hierarchy

Las ubicaciones pueden contener otras ubicaciones.

Ejemplo:

```text
World
 └── Kingdom
      └── City
           └── Prison
                └── Cell Block
                     └── Cell 07
```

---

# 26. Location Fields

```text
id
campaign_id
parent_location_id
name
slug
type
description
status
created_at
updated_at
```

---

# 27. Location Status

```text
KNOWN
UNKNOWN
DISCOVERED
DESTROYED
INACCESSIBLE
ABANDONED
ACTIVE
```

---

# 28. Location Type

```text
WORLD
REGION
CITY
TOWN
VILLAGE
BUILDING
ROOM
DUNGEON
CAVE
TUNNEL
PRISON
VAULT
FOREST
MOUNTAIN
ROAD
OTHER
```

---

# 29. Item

Representa objetos importantes.

Ejemplos:

```text
Weapon
Armor
Key
Artifact
Potion
Quest Item
Document
```

Campos:

```text
id
campaign_id
name
slug
description
type
status
created_at
updated_at
```

---

# 30. Item Ownership

No almacenar solamente:

```text
owner = "Ardan"
```

Debe existir una relación histórica.

Ejemplo:

```text
Ardan obtained Sword.
Ardan gave Sword to Varek.
Varek lost Sword.
```

---

# 31. Quest

Representa una misión o línea narrativa.

Campos:

```text
id
campaign_id
name
slug
description
status
created_at
updated_at
```

---

# 32. Quest Status

```text
UNKNOWN
DISCOVERED
ACTIVE
COMPLETED
FAILED
ABANDONED
CANCELLED
```

---

# 33. Event

El Event es una de las entidades más importantes del sistema.

Representa algo que ocurrió.

Ejemplo:

```text
Ardan opened the vault.
```

---

# 34. Event Fields

```text
id
campaign_id
session_id
type
title
description
timestamp
importance
canon_status
created_at
```

---

# 35. Event Type

Inicialmente:

```text
ACTION
DIALOGUE
COMBAT
DISCOVERY
TRAVEL
TRANSACTION
DEATH
BIRTH
QUEST_START
QUEST_PROGRESS
QUEST_COMPLETE
ITEM_ACQUIRED
ITEM_LOST
RELATIONSHIP_CHANGE
LOCATION_CHANGE
WORLD_CHANGE
OTHER
```

---

# 36. Event Importance

```text
LOW
NORMAL
HIGH
CRITICAL
```

---

# 37. Canon Status

Todo contenido generado o incorporado puede tener un estado.

```text
CANON
PROPOSED
DRAFT
REJECTED
UNKNOWN
```

---

# 38. Canon Rule

La IA puede generar:

```text
PROPOSED
```

pero no debería convertir automáticamente eso en:

```text
CANON
```

para acontecimientos importantes.

---

# 39. Event Participants

Un evento puede involucrar múltiples entidades.

Ejemplo:

```text
Ardan
Varek
Prison
Sword
```

Por lo tanto se necesita una relación:

```text
event_entities
```

---

# 40. Event Entity Relation

Campos:

```text
event_id
entity_id
role
```

Ejemplo:

```text
event:
Vault opened

entities:

Ardan → ACTOR
Vault → TARGET
Varek → WITNESS
```

---

# 41. Entity References

Como el MVP puede tener tablas específicas, la relación puede utilizar:

```text
entity_type
entity_id
```

Ejemplo:

```text
entity_type = CHARACTER
entity_id = ardan
```

---

# 42. Relationship

Representa relaciones entre entidades.

Ejemplos:

```text
Ardan FRIEND_OF Varek
Ardan ENEMY_OF Cult
Varek MEMBER_OF Cult
Ardan LOCATED_IN Prison
```

---

# 43. Relationship Fields

```text
id
campaign_id
source_type
source_id
relationship_type
target_type
target_id
status
strength
valid_from
valid_until
created_at
updated_at
```

---

# 44. Relationship Types

Inicialmente:

```text
FRIEND_OF
ENEMY_OF
ALLY_OF
MEMBER_OF
LEADER_OF
RELATED_TO
KNOWS
LOCATED_IN
OWNS
WORKS_FOR
SERVES
WORSHIPS
HATES
LOVES
FEARS
PROTECTS
```

El sistema debe permitir agregar nuevos tipos.

---

# 45. Relationship History

Las relaciones pueden cambiar.

Ejemplo:

```text
Ardan FRIEND_OF Varek
```

posteriormente:

```text
Ardan ENEMY_OF Varek
```

No borrar necesariamente la relación anterior.

Debe poder conservarse el historial.

---

# 46. Map

Representa un mapa 2D o referencia espacial.

Campos:

```text
id
campaign_id
location_id
name
description
map_type
asset_id
width
height
grid_size
created_at
updated_at
```

---

# 47. Map Types

```text
WORLD
REGION
CITY
DUNGEON
BATTLEMAP
SCENE
CUSTOM
```

---

# 48. Map Coordinates

Los personajes pueden tener una posición.

Ejemplo:

```text
Ardan
x = 12
y = 7
```

La posición actual puede formar parte del World State.

---

# 49. Scene

Representa una escena visual preparada para el entorno virtual.

Campos:

```text
id
campaign_id
location_id
name
description
scene_type
status
created_at
updated_at
```

---

# 50. Scene Types

```text
EXPLORATION
COMBAT
DIALOGUE
CINEMATIC
TRAVEL
DUNGEON
INTERIOR
EXTERIOR
CUSTOM
```

---

# 51. Scene Components

Una escena puede contener:

```text
Environment
Characters
NPCs
Props
Lights
VFX
Audio
Video
Camera
```

---

# 52. Scene State

El estado visual no debe confundirse con el estado narrativo.

Ejemplo:

```text
Narrative:
The vault door is open.

Scene:
vault_door.animation = open
```

---

# 53. Asset

Representa cualquier recurso multimedia.

Tipos:

```text
IMAGE
MODEL_2D
MODEL_3D
TEXTURE
VIDEO
AUDIO
MUSIC
SFX
VOICE
MAP
DOCUMENT
OTHER
```

---

# 54. Asset Fields

```text
id
campaign_id
name
type
path
mime_type
size
hash
metadata
created_at
updated_at
```

---

# 55. Local Asset Storage

Los assets deben almacenarse inicialmente en el filesystem local.

Ejemplo:

```text
/assets
    /characters
    /maps
    /scenes
    /audio
    /video
    /images
```

La SQLite solamente guarda referencias.

---

# 56. Asset Rule

No almacenar archivos pesados directamente dentro de SQLite.

Evitar:

```text
BLOB
```

para:

```text
Video
Audio
3D Models
Large Images
```

---

# 57. Recap

Representa la recapitulación de una sesión.

Campos:

```text
id
session_id
title
content
short_content
voice_script
status
created_at
updated_at
```

---

# 58. Recap Status

```text
DRAFT
REVIEW
APPROVED
PUBLISHED
ARCHIVED
```

---

# 59. Source

Toda información importante debería poder rastrearse hasta una fuente.

Ejemplos:

```text
DM Notes
Player Notes
Audio Recording
Transcript
Image
Previous Recap
Imported Document
AI Generated
```

---

# 60. Source Fields

```text
id
campaign_id
type
name
path
description
created_at
```

---

# 61. Source Types

```text
DM_NOTE
PLAYER_NOTE
SESSION_NOTE
AUDIO
VIDEO
TRANSCRIPT
IMAGE
DOCUMENT
RECAP
AI_GENERATED
OTHER
```

---

# 62. Provenance

La procedencia es fundamental.

Una información generada por IA debe poder indicar:

```text
source = AI_GENERATED
```

y, cuando sea posible:

```text
derived_from = event/session/source
```

---

# 63. Source Links

Debe existir una relación entre información y fuentes.

Conceptualmente:

```text
source_references
```

Ejemplo:

```text
Event 82
    ↓
Session 12
    ↓
DM Note
```

---

# 64. World State

Representa el estado actual conocido del mundo.

No reemplaza los eventos históricos.

---

# 65. World State Components

```text
Character Positions
NPC Positions
Quest Status
Faction Status
Item Ownership
Location Status
Relationship Status
Scene State
```

---

# 66. Character Position

Ejemplo:

```yaml
character_id: ardan

location:
  location_id: prison

position:
  x: 12
  y: 8
```

---

# 67. World State Snapshot

Para facilitar recuperación y debugging pueden almacenarse snapshots.

Ejemplo:

```text
Snapshot 001
Snapshot 002
Snapshot 003
```

Cada snapshot representa el estado del mundo en un momento determinado.

---

# 68. Snapshot Fields

```text
id
campaign_id
session_id
created_at
state_hash
data
```

---

# 69. Snapshot Data

Puede almacenarse inicialmente como JSON.

Ejemplo:

```json
{
  "characters": {
    "ardan": {
      "location": "prison",
      "x": 12,
      "y": 8
    }
  }
}
```

---

# 70. Snapshot Purpose

Sirve para:

```text
Rollback
Debugging
Testing
Recovery
Fast Loading
```

---

# 71. Session Participants

Una sesión puede tener jugadores que participaron y jugadores ausentes.

Debe existir:

```text
session_participants
```

Campos:

```text
session_id
character_id
attendance_status
```

---

# 72. Attendance Status

```text
PRESENT
ABSENT
PARTIAL
UNKNOWN
```

Esto será especialmente útil para las recaps.

---

# 73. Session Notes

Las notas originales no deben sobrescribirse.

Ejemplo:

```text
raw_session_notes
```

puede conservar:

```text
texto original del DM
```

mientras que:

```text
session
```

contiene información procesada.

---

# 74. Raw vs Processed

Separar:

```text
RAW
```

de:

```text
PROCESSED
```

Ejemplo:

```text
Raw Notes
    ↓
Processing
    ↓
Events
    ↓
World State
```

---

# 75. AI Generated Content

El contenido generado por IA debe identificarse.

Ejemplo:

```text
generated_by
model
prompt_version
context_version
```

cuando corresponda.

---

# 76. Generated Content Metadata

Ejemplo:

```json
{
  "generated": true,
  "agent": "recap-agent",
  "agent_version": "1.0",
  "model": "local-model",
  "created_at": "2026-08-17T20:00:00"
}
```

---

# 77. Draft System

La IA debe poder crear borradores sin afectar directamente el canon.

Ejemplo:

```text
AI Proposal
    ↓
DRAFT
    ↓
DM Review
    ↓
APPROVED
    ↓
CANON
```

---

# 78. Contradictions

El sistema debe poder registrar contradicciones.

Ejemplo:

```text
Contradiction:
Two sources give different locations for Varek.
```

Entidad:

```text
contradictions
```

Campos:

```text
id
campaign_id
description
severity
status
created_at
resolved_at
```

---

# 79. Contradiction Status

```text
OPEN
UNDER_REVIEW
RESOLVED
IGNORED
```

---

# 80. Contradiction Resolution

Nunca resolver silenciosamente.

Debe quedar registrado:

```text
Problem
    ↓
Candidate A
Candidate B
    ↓
DM Decision
    ↓
Resolved
```

---

# 81. Database Architecture

Inicialmente:

```text
SQLite
```

No utilizar una arquitectura distribuida.

---

# 82. SQLite Principles

La base debe ser:

```text
single file
local
portable
backupable
fast
easy to inspect
```

Ejemplo:

```text
data/
    campaign.db
```

---

# 83. SQLite + Filesystem

Arquitectura:

```text
                 APPLICATION
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
       SQLite                 FILESYSTEM
          │                       │
       Metadata              Images
       Events                Videos
       Entities              Audio
       State                 Models
       Relations             Maps
```

---

# 84. Suggested Tables

MVP:

```text
campaigns
sessions
characters
npcs
factions
locations
items
quests
events
event_entities
relationships
maps
scenes
assets
sources
source_references
recaps
world_state
world_snapshots
session_participants
contradictions
```

---

# 85. Common Columns

Las tablas principales deberían utilizar:

```text
id
created_at
updated_at
```

cuando corresponda.

---

# 86. Timestamps

Usar UTC internamente.

Formato:

```text
ISO 8601
```

Ejemplo:

```text
2026-08-17T21:30:00Z
```

---

# 87. Soft Delete

No eliminar inmediatamente información histórica.

Cuando corresponda:

```text
deleted_at
```

permite marcar registros como eliminados.

---

# 88. Historical Data

Los eventos históricos importantes no deben eliminarse por modificaciones
posteriores.

Si se comete un error:

```text
Correction Event
```

en lugar de destruir la historia.

---

# 89. Example

Incorrecto:

```text
DELETE EVENT 52
```

Correcto:

```text
EVENT 52
    ↓
Correction
    ↓
EVENT 87
```

---

# 90. Foreign Keys

SQLite debe utilizar:

```sql
PRAGMA foreign_keys = ON;
```

---

# 91. Referential Integrity

Las relaciones importantes deben utilizar foreign keys.

Ejemplo:

```sql
FOREIGN KEY (campaign_id)
REFERENCES campaigns(id)
```

---

# 92. Indexes

Crear índices para búsquedas frecuentes.

Inicialmente:

```text
campaign_id
session_id
location_id
character_id
npc_id
event_type
event_timestamp
slug
```

---

# 93. Full Text Search

La búsqueda narrativa puede utilizar:

```text
SQLite FTS5
```

si está disponible.

Especialmente para:

```text
Events
Session Notes
Recaps
Lore
Descriptions
```

---

# 94. FTS Principle

No consultar siempre a un LLM para buscar información.

Primero:

```text
Search
 ↓
Retrieve
 ↓
LLM
```

cuando sea necesario.

---

# 95. Example Search

Pregunta:

```text
"What happened with the vault?"
```

Proceso:

```text
FTS
 ↓
Relevant Events
 ↓
Relevant Sessions
 ↓
Context Builder
 ↓
LLM
```

---

# 96. Context Optimization

El modelo no debe recibir toda la base de datos.

Debe recibir solamente:

```text
Relevant Context
```

---

# 97. Example

Para responder:

```text
"¿Dónde está Ardan?"
```

no cargar:

```text
Entire Campaign
```

sino:

```text
Character: Ardan
Current Location
Recent Events
Active Quest
Relevant Relationships
```

---

# 98. Entity Graph

Aunque SQLite sea relacional, conceptualmente el mundo puede verse como un grafo.

```text
              ┌─────────┐
              │  Ardan  │
              └────┬────┘
                   │
             LOCATED_IN
                   │
                   ▼
              ┌─────────┐
              │ Prison  │
              └────┬────┘
                   │
              CONTROLLED_BY
                   │
                   ▼
              ┌─────────┐
              │  Cult   │
              └─────────┘
```

No es necesario implementar una graph database en el MVP.

---

# 99. Graph Through Relations

El grafo puede reconstruirse mediante:

```text
relationships
event_entities
```

---

# 100. Future Migration

Si algún día la campaña crece enormemente, el modelo debe permitir migrar a:

```text
PostgreSQL
```

o incluso:

```text
Graph Database
```

sin cambiar el concepto fundamental de las entidades.

---

# 101. Example Full Flow

Durante una party:

```text
DM:
"El grupo abre la puerta de la bóveda."
```

Se genera:

```text
EVENT
```

con:

```text
actor = party
target = vault door
type = ACTION
```

Luego:

```text
World State
```

cambia:

```text
vault_door = OPEN
```

Luego:

```text
Scene
```

recibe:

```text
door animation = open
```

Finalmente:

```text
Recap
```

puede mencionar:

```text
El grupo finalmente consiguió abrir la bóveda.
```

---

# 102. Separation of Concerns

El modelo debe mantener separado:

```text
WHAT HAPPENED
```

de:

```text
WHAT IS TRUE NOW
```

y de:

```text
HOW IT IS DISPLAYED
```

Por lo tanto:

```text
Events
World State
Scene
```

son conceptos distintos.

---

# 103. Character Example

Un personaje puede tener:

```text
Character
    │
    ├── Events
    ├── Relationships
    ├── Quests
    ├── Items
    ├── Locations
    ├── Visual Assets
    └── Session Participation
```

---

# 104. Location Example

Una ubicación puede tener:

```text
Location
    │
    ├── Parent Location
    ├── Child Locations
    ├── Events
    ├── Characters
    ├── NPCs
    ├── Maps
    ├── Scenes
    └── Assets
```

---

# 105. Session Example

Una sesión puede tener:

```text
Session
    │
    ├── Participants
    ├── Raw Notes
    ├── Events
    ├── Scenes
    ├── Recap
    └── State Snapshot
```

---

# 106. Data Lifecycle

La información seguirá aproximadamente:

```text
RAW
 ↓
PROCESSED
 ↓
PROPOSED
 ↓
REVIEWED
 ↓
CANON
 ↓
WORLD STATE
```

---

# 107. Raw Data

Nunca modificar el contenido original recibido del DM.

Ejemplo:

```text
raw/session-015.md
```

---

# 108. Processed Data

La IA puede producir:

```text
events
entities
relationships
```

pero inicialmente como:

```text
PROPOSED
```

---

# 109. Canon

Una vez validado:

```text
PROPOSED
 ↓
APPROVED
 ↓
CANON
```

---

# 110. World State

El estado actual se actualiza después de confirmar los cambios relevantes.

---

# 111. Recovery

Si el World State queda corrupto:

```text
Snapshot
+
Events
```

deben permitir reconstruirlo.

---

# 112. Backup

El MVP debe permitir copiar:

```text
campaign.db
```

y:

```text
/assets
```

como backup.

---

# 113. Portable Campaign

Idealmente una campaña debería poder copiarse como:

```text
campaign/
    campaign.db
    assets/
    sources/
    exports/
```

---

# 114. Export

A futuro debe poder exportarse:

```text
JSON
Markdown
ZIP
```

sin depender de la aplicación.

---

# 115. Markdown Compatibility

Los datos narrativos importantes deben poder exportarse a Markdown.

Ejemplo:

```text
campaign/
    lore/
    characters/
    locations/
    sessions/
    quests/
```

La SQLite es la fuente estructurada.

Markdown puede funcionar como:

```text
Human-readable Knowledge Layer
```

---

# 116. Database vs Markdown

SQLite:

```text
Relationships
State
Indexes
Events
Metadata
Runtime
```

Markdown:

```text
Lore
Descriptions
Notes
Documentation
Human Editing
AI Context
```

---

# 117. Source of Truth

Durante el MVP:

```text
SQLite = Structured Source of Truth
Raw Files = Immutable Source Material
Markdown = Human/AI Knowledge Representation
```

---

# 118. No Single Giant JSON

No utilizar un único:

```text
world.json
```

gigante para toda la campaña.

Puede existir JSON para snapshots o intercambio, pero no como almacenamiento principal.

---

# 119. Scalability

La campaña puede crecer de:

```text
10 sessions
```

a:

```text
100+
```

sin cambiar la arquitectura básica.

---

# 120. Performance Goal

Para el MVP:

```text
SQLite local
+
Indexed Queries
+
FTS5
+
Context Retrieval
```

debe ser suficiente para una campaña personal grande.

---

# 121. Final Architecture

```text
                    RPG WORLD ENGINE
                           │
                  ┌────────┴────────┐
                  │                 │
              STRUCTURED         FILES
                  │                 │
                SQLite          Markdown
                  │              Images
                  │              Audio
                  │              Video
                  │              Models
                  │
        ┌─────────┼─────────┐
        │         │         │
      EVENTS    STATE    RELATIONS
        │         │         │
        └─────────┼─────────┘
                  │
              CONTEXT
                  │
                  ▼
                AGENTS
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
     LORE       RECAP      SCENE
       │          │          │
       └──────────┼──────────┘
                  ▼
             RPG RUNTIME
```

---

# 122. MVP Data Model

La primera versión no debe intentar modelar absolutamente todo.

Prioridad:

```text
1. Campaign
2. Sessions
3. Characters
4. NPCs
5. Locations
6. Events
7. Relationships
8. Quests
9. World State
10. Sources
11. Recaps
12. Assets
13. Scenes
```

---

# 123. Future Extensions

El modelo debe poder incorporar posteriormente:

```text
Combat
Initiative
Spells
Abilities
Inventory Systems
Weather
Time
Economy
Political Systems
Dialogue Trees
AI Memory
Voice Profiles
3D Models
Animations
Cinematics
Multiplayer
Remote DM Control
```

sin romper el modelo existente.

---

# 124. Core Rule

El modelo de datos debe representar primero:

```text
THE WORLD
```

y no:

```text
THE UI
```

La interfaz puede cambiar.

La campaña no debería depender de ella.

---

# 125. Final Principle

La campaña debe poder sobrevivir a la aplicación.

Si mañana desaparece el RPG World Engine, debería ser posible recuperar:

```text
Characters
Locations
Events
Quests
Relationships
History
Recaps
Assets
World State
```

utilizando solamente:

```text
SQLite
+
Markdown
+
Files
```

Ese es el objetivo fundamental del modelo de datos.
