# EVENT-SYSTEM.md

> Sistema de eventos del RPG World Engine.
>
> Define cómo transformar lo que ocurre durante una partida en eventos
> estructurados, cómo relacionarlos con personajes, lugares, quests y lore,
> cómo determinar qué eventos pasan a ser canon y cómo utilizar esos eventos
> para actualizar el estado del mundo y preparar la representación visual.

---

# 1. Objetivo

El sistema de eventos es el puente entre:

```text
DM
 ↓
Narración
 ↓
Evento
 ↓
Consecuencia
 ↓
World State
 ↓
Canon
 ↓
Representación visual
```

Debe permitir que el sistema entienda no solamente:

> "El DM dijo que abrieron la puerta."

sino:

```text
Evento:
    La puerta de la bóveda fue abierta.

Actores:
    Player Character A
    Player Character B

Ubicación:
    Vault

Estado anterior:
    vault_door = CLOSED

Estado posterior:
    vault_door = OPEN

Consecuencia:
    Se puede acceder a la bóveda.
```

---

# 2. Principio Fundamental

Un evento es una unidad narrativa y estructurada de cambio.

```text
EVENT = Something happened
```

Pero no todo texto narrativo constituye automáticamente un evento.

Ejemplo:

```text
"El viento soplaba con fuerza."
```

puede ser solamente ambientación.

Mientras:

```text
"El viento apagó las antorchas."
```

puede constituir un evento porque modifica el estado de la escena.

---

# 3. Eventos como Fuente del World State

El estado actual del mundo debe poder entenderse como consecuencia
de una secuencia de eventos.

```text
Event 001
   ↓
Event 002
   ↓
Event 003
   ↓
Current World State
```

Esto permite reconstruir parcialmente cómo se llegó al estado actual.

---

# 4. Event ID

Todo evento debe tener un identificador único.

Ejemplo:

```text
event-000001
event-000002
event-000003
```

Preferentemente el ID debe ser generado automáticamente.

---

# 5. Event Structure

Un evento mínimo debe contener:

```text
id
timestamp/session
type
description
actors
location
state_changes
importance
status
```

Ejemplo conceptual:

```json
{
  "id": "event-000152",
  "session_id": "session-015",
  "type": "LOCATION_CHANGE",
  "description": "The party entered the prison.",
  "actors": [
    "character-ardan",
    "character-elena"
  ],
  "location_id": "location-prison",
  "importance": "HIGH",
  "status": "CANON"
}
```

---

# 6. Event Lifecycle

Un evento puede pasar por diferentes estados.

```text
DETECTED
   ↓
PROPOSED
   ↓
REVIEW
   ↓
APPROVED
   ↓
CANON
```

También puede:

```text
PROPOSED
   ↓
REJECTED
```

o:

```text
CANON
   ↓
RETCONNED
```

---

# 7. Event Status

Estados iniciales:

```text
DETECTED
PROPOSED
APPROVED
CANON
REJECTED
RETCONNED
```

---

# 8. DETECTED

El agente detectó algo que podría ser un evento.

Ejemplo:

```text
El DM menciona que Ardan encontró una llave.
```

El sistema crea:

```text
event-000153
status = DETECTED
```

Todavía no modifica el mundo.

---

# 9. PROPOSED

El agente interpreta la información y propone un evento estructurado.

Ejemplo:

```text
TYPE:
ITEM_DISCOVERED

ACTOR:
Ardan

ITEM:
Vault Key
```

Todavía no debe modificar información crítica.

---

# 10. REVIEW

El evento puede quedar pendiente de revisión del DM.

Ejemplo:

```text
Event:
Ardan discovered the Vault Key.

AI Interpretation:
The key can open the vault.

DM Decision:
[Confirm]
[Edit]
[Reject]
```

---

# 11. APPROVED

El DM confirmó que la interpretación es correcta.

Puede comenzar el procesamiento de consecuencias.

---

# 12. CANON

Un evento CANON forma parte oficialmente de la historia.

Ejemplo:

```text
event-000153
status = CANON
```

A partir de este momento puede utilizarse para:

```text
Lore
Recaps
Character History
World State
Quest Progress
Scene State
```

---

# 13. REJECTED

El evento no forma parte de la historia.

Ejemplo:

```text
AI:
"Ardan encontró una llave."

DM:
"No. La llave estaba en posesión de Elena."
```

El evento puede conservarse para auditoría:

```text
status = REJECTED
```

pero no debe modificar el mundo.

---

# 14. RETCONNED

Un evento anteriormente canon puede dejar de ser válido.

Ejemplo:

```text
Session 10:
The door was destroyed.

Session 20:
DM establishes that the door was never destroyed.
```

El evento anterior:

```text
event-000101
```

puede pasar a:

```text
RETCONNED
```

No debe eliminarse físicamente.

---

# 15. Event Immutability

Los eventos CANON no deben modificarse silenciosamente.

En lugar de:

```text
UPDATE event
```

preferir:

```text
new event
```

que explique el cambio.

---

# 16. Event History

Ejemplo:

```text
Event 100
Door CLOSED

Event 101
Door OPEN

Event 102
Door DESTROYED

Event 103
Door REBUILT
```

Esto permite conocer:

```text
Current State:
Door = OPEN
```

si el último evento relevante indica esa situación.

---

# 17. Event Types

El sistema debe utilizar tipos controlados.

Categorías iniciales:

```text
CHARACTER
LOCATION
ITEM
QUEST
COMBAT
DIALOGUE
DISCOVERY
FACTION
WORLD
SCENE
SYSTEM
```

---

# 18. Character Events

Ejemplos:

```text
CHARACTER_CREATED
CHARACTER_DIED
CHARACTER_INJURED
CHARACTER_HEALED
CHARACTER_LEVEL_UP
CHARACTER_JOINED
CHARACTER_LEFT
CHARACTER_STATUS_CHANGED
```

---

# 19. Character Relationship Events

```text
RELATIONSHIP_CREATED
RELATIONSHIP_CHANGED
RELATIONSHIP_BROKEN
ALLIANCE_CREATED
BETRAYAL
```

---

# 20. Location Events

```text
LOCATION_ENTERED
LOCATION_EXITED
LOCATION_DISCOVERED
LOCATION_DESTROYED
LOCATION_CHANGED
LOCATION_UNLOCKED
LOCATION_LOCKED
```

---

# 21. Item Events

```text
ITEM_FOUND
ITEM_PICKED_UP
ITEM_DROPPED
ITEM_GIVEN
ITEM_STOLEN
ITEM_USED
ITEM_DESTROYED
ITEM_EQUIPPED
```

---

# 22. Quest Events

```text
QUEST_CREATED
QUEST_ACCEPTED
QUEST_UPDATED
QUEST_OBJECTIVE_COMPLETED
QUEST_FAILED
QUEST_COMPLETED
QUEST_ABANDONED
```

---

# 23. Combat Events

```text
COMBAT_STARTED
COMBAT_ACTION
DAMAGE_DEALT
DAMAGE_RECEIVED
CHARACTER_DOWNED
CHARACTER_DEFEATED
COMBAT_ENDED
```

---

# 24. Dialogue Events

El diálogo puede generar eventos.

Ejemplo:

```text
NPC:
"El rey está muerto."
```

Esto no necesariamente significa que el rey realmente esté muerto.

Por eso:

```text
DIALOGUE
```

y:

```text
WORLD_STATE_CHANGE
```

deben ser eventos conceptualmente diferentes.

---

# 25. Information vs Fact

El sistema debe distinguir:

```text
Someone said X
```

de:

```text
X is true
```

Ejemplo:

```text
NPC claims:
"The vault is empty."
```

No implica:

```text
vault.contents = EMPTY
```

---

# 26. Discovery Events

Una revelación puede representar:

```text
CHARACTER_DISCOVERED
LOCATION_DISCOVERED
ITEM_DISCOVERED
SECRET_DISCOVERED
LORE_DISCOVERED
```

---

# 27. Faction Events

```text
FACTION_CREATED
FACTION_JOINED
FACTION_LEFT
FACTION_ALLIANCE
FACTION_CONFLICT
FACTION_LEADER_CHANGED
```

---

# 28. World Events

Eventos globales:

```text
WORLD_STATE_CHANGED
WEATHER_CHANGED
POLITICAL_CHANGE
WAR_STARTED
WAR_ENDED
DISASTER
NATURAL_EVENT
```

---

# 29. Scene Events

Relacionados directamente con el entorno virtual:

```text
SCENE_ENTERED
SCENE_EXITED
SCENE_CHANGED
LIGHTING_CHANGED
ENVIRONMENT_CHANGED
MUSIC_CHANGED
AMBIENCE_CHANGED
EFFECT_TRIGGERED
```

---

# 30. Event Importance

Cada evento puede tener:

```text
TRIVIAL
LOW
NORMAL
HIGH
CRITICAL
```

---

# 31. TRIVIAL

No necesita aparecer en recapitulaciones normalmente.

Ejemplo:

```text
A character sat down.
```

---

# 32. LOW

Puede ser relevante para contexto local.

Ejemplo:

```text
The party lit a torch.
```

---

# 33. NORMAL

Debe conservarse como parte de la sesión.

---

# 34. HIGH

Debe considerarse para:

```text
Recap
Character History
Quest State
World State
```

---

# 35. CRITICAL

Puede cambiar significativamente la campaña.

Ejemplos:

```text
Character Death
Major Betrayal
Kingdom Destroyed
Major Artifact Obtained
Major Quest Completed
```

---

# 36. Actors

Un evento puede tener múltiples actores.

Ejemplo:

```text
Actor:
Ardan

Target:
Guard Captain

Location:
Prison
```

---

# 37. Actor Roles

No todos los participantes tienen el mismo rol.

Roles posibles:

```text
ACTOR
TARGET
OBSERVER
SOURCE
BENEFICIARY
VICTIM
PARTICIPANT
```

---

# 38. Event Relationships

Los eventos pueden relacionarse entre sí.

Ejemplo:

```text
event-100
Door discovered

event-101
Key discovered

event-102
Door opened
```

Relación:

```text
event-102
depends_on:
event-100
event-101
```

---

# 39. Causality

A futuro puede modelarse:

```text
CAUSE
EFFECT
```

Ejemplo:

```text
Event A:
Guard attacked party.

Event B:
Party escaped prison.

B caused by A
```

---

# 40. Event Chain

```text
Event A
   │
   ▼
Event B
   │
   ▼
Event C
   │
   ▼
World State
```

Esto es especialmente importante para reconstruir historia.

---

# 41. State Changes

Un evento puede producir cambios.

Ejemplo:

```json
{
  "state_changes": [
    {
      "entity": "vault-door",
      "field": "state",
      "before": "CLOSED",
      "after": "OPEN"
    }
  ]
}
```

---

# 42. Before / After

Siempre que sea posible:

```text
before
after
```

deben almacenarse.

Esto permite:

```text
Undo
Audit
Replay
Debugging
Historical Reconstruction
```

---

# 43. World State

El estado del mundo representa la situación actual.

Ejemplo:

```text
Vault Door = OPEN
King = DEAD
Party Location = Prison
Quest = ACTIVE
```

---

# 44. Event vs State

No confundir:

```text
Event:
The door was opened.
```

con:

```text
State:
The door is open.
```

El evento explica cómo cambió.

El estado representa cómo está actualmente.

---

# 45. Event Processing

Pipeline:

```text
DM Input
   ↓
Event Detection
   ↓
Event Extraction
   ↓
Entity Resolution
   ↓
Event Proposal
   ↓
Validation
   ↓
DM Approval
   ↓
Canon
   ↓
State Update
```

---

# 46. DM Input

Puede provenir de:

```text
Text
Voice
Manual Button
Imported Notes
Transcript
```

---

# 47. Event Detection Agent

El agente analiza la entrada buscando posibles eventos.

Ejemplo:

```text
DM:
"Después de abrir la puerta, entran a la bóveda."
```

Detecta:

```text
Event A:
Door opened.

Event B:
Party entered vault.
```

---

# 48. Entity Resolution

Antes de guardar el evento:

```text
"Ardan"
```

debe resolverse contra:

```text
character-ardan
```

No crear automáticamente:

```text
character-ardan-2
```

si ya existe.

---

# 49. Unknown Entities

Si aparece:

```text
"The mysterious wizard"
```

y no existe:

```text
UNKNOWN ENTITY
```

No inventar identidad.

Puede proponerse:

```text
entity-proposal-001
```

para revisión.

---

# 50. Event Validation

Validaciones mínimas:

```text
Does actor exist?
Does location exist?
Is event type valid?
Are state changes coherent?
Does event contradict canon?
```

---

# 51. Contradiction Detection

Ejemplo:

Estado actual:

```text
door = OPEN
```

Nuevo evento:

```text
door was opened
```

No necesariamente es una contradicción.

Pero:

```text
door = DESTROYED
```

y:

```text
door was opened
```

requiere revisión.

---

# 52. Contradiction Levels

```text
NONE
LOW
MEDIUM
HIGH
CRITICAL
```

---

# 53. Contradiction Handling

Nunca resolver contradicciones inventando información.

El sistema debe mostrar:

```text
Potential contradiction detected.

Existing canon:
...

New event:
...

DM decision required.
```

---

# 54. Event Confidence

Los eventos generados por IA deben tener confianza.

Ejemplo:

```text
confidence = 0.94
```

---

# 55. Confidence

La confianza no significa verdad.

```text
confidence = AI interpretation confidence
```

No:

```text
confidence = factual certainty
```

---

# 56. Canon Authority

La autoridad final de canon es:

```text
DM
```

El agente puede:

```text
Detect
Suggest
Structure
Validate
Warn
```

pero no decidir unilateralmente eventos narrativos importantes.

---

# 57. Automatic Canon

Puede existir para eventos de bajo impacto.

Ejemplo:

```text
Character moved from room A to room B.
```

Pero eventos importantes deberían requerir confirmación configurable.

---

# 58. Canon Rules

Configuración:

```text
AUTO_CANON_LOW
AUTO_CANON_NORMAL
REQUIRE_DM_HIGH
REQUIRE_DM_CRITICAL
```

---

# 59. Session Event Buffer

Durante una sesión:

```text
runtime/
└── session-buffer/
```

puede almacenar eventos temporales.

Ejemplo:

```text
Detected
Proposed
Pending
```

---

# 60. Session Finalization

Al terminar la partida:

```text
Session Buffer
      ↓
Validation
      ↓
DM Review
      ↓
Canon Events
      ↓
World State
      ↓
Recap
```

---

# 61. Why Buffer

Evita modificar permanentemente el mundo por cada interpretación
incorrecta de la IA durante la partida.

---

# 62. Real-Time Mode

Durante la partida:

```text
DM speaks
   ↓
AI detects
   ↓
Event proposed
```

El DM puede ver:

```text
EVENT DETECTED
```

sin interrumpir la narración.

---

# 63. DM Controller

La controladora del DM debe poder:

```text
Confirm Event
Reject Event
Edit Event
Undo Last Event
Pause AI
Trigger Scene
Change Scene
```

---

# 64. Event Manual Creation

El DM debe poder crear eventos manualmente.

Ejemplo:

```text
[+ CREATE EVENT]
```

Formulario:

```text
Type
Description
Actor
Target
Location
Importance
State Changes
```

---

# 65. Manual Override

Si el DM modifica una interpretación:

```text
AI:
Ardan opened the door.

DM:
Actually Elena opened it.
```

Debe guardarse la corrección.

---

# 66. Event Audit

Cada evento debería registrar:

```text
created_at
created_by
source
approved_by
approved_at
```

---

# 67. Source

El evento debe indicar de dónde proviene.

Ejemplo:

```text
source_type = DM_VOICE
source_id = transcript-015-042
```

---

# 68. Traceability

Debe ser posible responder:

> ¿Por qué el sistema cree que esta puerta está abierta?

Respuesta:

```text
Current State:
vault-door = OPEN

Caused by:
event-000152

Source:
Session 015
DM transcript
timestamp 01:42:31
```

---

# 69. This Is Critical

La trazabilidad permite confiar en el sistema.

El DM debe poder inspeccionar:

```text
State
← Event
← Source
```

---

# 70. Event to Recap

Los eventos CANON pueden alimentar automáticamente el recap.

Ejemplo:

```text
Events:
- Entered prison
- Found key
- Opened vault
- Defeated guardian
```

Generan:

```text
Session Recap
```

---

# 71. Event to Character History

Si:

```text
Ardan
```

participó en:

```text
event-000152
```

su historial puede mostrar:

```text
Session 015
Ardan discovered the vault key.
```

---

# 72. Event to Quest

Si:

```text
event:
vault opened
```

y existe:

```text
quest objective:
Open the vault
```

el sistema puede detectar:

```text
OBJECTIVE COMPLETED
```

---

# 73. Event to Scene

Si:

```text
event:
party enters vault
```

el runtime puede ejecutar:

```text
Change Scene
```

---

# 74. Scene Trigger

Ejemplo:

```json
{
  "trigger": "LOCATION_ENTERED",
  "location": "vault",
  "action": "LOAD_SCENE",
  "scene": "vault-main"
}
```

---

# 75. Visual Event

No todos los eventos necesitan representación visual.

Ejemplo:

```text
Character remembers childhood.
```

Puede afectar:

```text
Narrative
```

pero no necesariamente:

```text
3D Runtime
```

---

# 76. Visual Priority

Los eventos pueden indicar:

```text
visual_relevance:
NONE
LOW
MEDIUM
HIGH
```

---

# 77. Visual Event Example

```text
Event:
The vault door opens.

visual_relevance:
HIGH
```

Runtime:

```text
Door animation
Sound
Lighting
Camera
```

---

# 78. Event Tags

Los eventos pueden tener tags:

```text
combat
important
quest
lore
character
location
visual
recap
```

---

# 79. Event Queries

El sistema debe poder consultar:

```text
All events involving Ardan
```

```text
All events in Prison
```

```text
All HIGH events from Session 015
```

```text
All events affecting Quest X
```

---

# 80. Historical Queries

También:

```text
What happened to the vault?
```

debe poder resolverse buscando:

```text
location-vault
```

y sus eventos relacionados.

---

# 81. Timeline

Los eventos deben poder representarse como timeline.

```text
Session 001
 ├── Event 001
 ├── Event 002
 └── Event 003

Session 002
 ├── Event 004
 └── Event 005
```

---

# 82. Timeline Importance

La interfaz puede destacar:

```text
CRITICAL
HIGH
```

para facilitar el seguimiento narrativo.

---

# 83. Event Storage

Los eventos estructurados deben almacenarse principalmente en SQLite.

Markdown puede utilizarse para:

```text
Human-readable summaries
Documentation
Session event lists
```

---

# 84. Event Markdown

Ejemplo:

```text
sessions/session-015/events.md
```

Puede contener:

```md
# Events

## Event 001 — Party enters prison

...

## Event 002 — Vault key discovered

...

## Event 003 — Vault opened

...
```

---

# 85. SQLite Event Table

Conceptualmente:

```text
events
--------------------------------
id
session_id
type
description
status
importance
confidence
location_id
created_at
approved_at
```

---

# 86. Event Participants

Separar participantes permite múltiples actores.

```text
event_participants
--------------------------------
event_id
entity_id
role
```

---

# 87. Event State Changes

```text
event_state_changes
--------------------------------
event_id
entity_id
field
before_value
after_value
```

---

# 88. Event Relations

```text
event_relations
--------------------------------
event_id
related_event_id
relation_type
```

Tipos:

```text
CAUSES
CAUSED_BY
DEPENDS_ON
FOLLOWS
CONTRADICTS
REPLACES
```

---

# 89. Event Sources

```text
event_sources
--------------------------------
event_id
source_type
source_reference
timestamp
```

---

# 90. Event Processing Architecture

```text
                 ┌──────────────┐
                 │   DM INPUT   │
                 └──────┬───────┘
                        │
                        ▼
              ┌──────────────────┐
              │ Event Detection   │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ Entity Resolution│
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ Event Proposal    │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ Validation        │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │ DM Controller     │
              └────────┬─────────┘
                       │
                ┌──────┴──────┐
                ▼             ▼
             REJECT         CANON
                              │
                              ▼
                      ┌──────────────┐
                      │ World State  │
                      └──────┬───────┘
                             │
                ┌────────────┼─────────────┐
                ▼            ▼             ▼
             Recap        Quest         Scene
```

---

# 91. MVP

La primera versión solamente necesita:

```text
Event Detection
Event Storage
Event Status
DM Approval
World State Update
Session Timeline
```

---

# 92. MVP Event Flow

```text
DM
 ↓
Manual/Event Agent
 ↓
Proposal
 ↓
DM Confirm
 ↓
SQLite
 ↓
World State
```

---

# 93. MVP Does Not Require

Inicialmente no es necesario implementar:

```text
Complex causal graphs
Automatic retcon resolution
Advanced temporal reasoning
Distributed event processing
External event buses
Cloud event sourcing
```

---

# 94. Future Architecture

A futuro el sistema puede evolucionar hacia:

```text
Event Sourcing
```

donde el estado del mundo se reconstruye a partir de eventos.

---

# 95. Event Sourcing Concept

```text
Events
   ↓
Reducer
   ↓
World State
```

Ejemplo:

```text
Door Created
Door Opened
Door Destroyed
Door Rebuilt
```

El reducer determina:

```text
Current Door State
```

---

# 96. Event Replay

El sistema podría reconstruir el mundo hasta una sesión determinada.

Ejemplo:

```text
Replay events 001 → 100
```

Resultado:

```text
World State at Session 010
```

---

# 97. Why Replay Matters

Permite:

```text
Debugging
Historical Maps
Timeline
Alternative Views
Testing
```

---

# 98. Future Scene Replay

Incluso podría reconstruirse:

```text
World State
+
Scene State
```

de una sesión anterior.

Esto permitiría eventualmente volver a visualizar:

```text
"Así estaba la prisión cuando llegaron."
```

---

# 99. Golden Rule

Nunca permitir que una interpretación automática de la IA destruya
información histórica.

Siempre conservar:

```text
Source
Proposal
Decision
Final Event
```

cuando corresponda.

---

# 100. Final Architecture

El sistema de eventos debe convertirse en el núcleo narrativo:

```text
                  CAMPAIGN
                      │
                      ▼
                   EVENTS
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
      CHARACTERS   LOCATIONS    QUESTS
          │           │           │
          └───────────┼───────────┘
                      ▼
                 WORLD STATE
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
        RECAP       LORE        SCENE
                                  │
                                  ▼
                              3D RUNTIME
```

El objetivo final es que **la historia no sea simplemente texto almacenado**, sino una secuencia de eventos verificables que pueda alimentar automáticamente el estado actual del mundo, la recapitulación, el lore, los personajes y el entorno virtual de la próxima party.
