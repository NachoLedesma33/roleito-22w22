# DOMAIN.md

> Modelo de dominio de Persistent AI RPG World Engine.
>
> Este documento define las entidades, conceptos, estados y relaciones fundamentales
> del sistema. No define implementación específica de base de datos, frontend,
> renderer o proveedor de IA.

---

# 1. Propósito

Este documento define el modelo conceptual utilizado para representar una campaña
de rol dentro de RPG World Engine.

El dominio debe representar:

- la historia;
- las entidades del mundo;
- los acontecimientos;
- las relaciones;
- el conocimiento;
- el estado actual;
- las sesiones;
- las escenas;
- las decisiones;
- las consecuencias.

La implementación tecnológica debe adaptarse a este dominio y no al revés.

---

# 2. Regla fundamental del dominio

El sistema debe distinguir claramente entre:

```text
LO QUE EXISTE
       +
LO QUE OCURRIÓ
       +
LO QUE SE SABE
       +
LO QUE ESTÁ REPRESENTADO VISUALMENTE
```

Estas cuatro dimensiones están relacionadas, pero no son equivalentes.

Ejemplo:

Un castillo puede existir aunque ningún personaje lo conozca.

Un personaje puede saber que existe un castillo sin haberlo visitado.

El DM puede saber que debajo del castillo existe una cripta secreta.

La cripta puede existir en el canon aunque todavía no tenga un modelo 3D.

---

# 3. Entidades principales

El dominio inicial está compuesto por:

```text
Campaign
│
├── Session
│
├── Character
├── NPC
├── Faction
├── Location
├── Item
├── Creature
├── Quest
│
├── Event
├── Relationship
├── Knowledge
│
├── Scene
├── Asset
├── Recap
│
└── WorldSnapshot
```

No todas las entidades tienen la misma naturaleza.

---

# 4. Tipos de conceptos

## 4.1 Persistent Entity

Representa algo que puede existir a través del tiempo.

Ejemplos:

```text
Character
NPC
Faction
Location
Item
Creature
Quest
```

---

## 4.2 Temporal Event

Representa algo que ocurrió en un momento determinado.

Ejemplos:

```text
CharacterMoved
ItemFound
NPCKilled
QuestStarted
BattleStarted
LocationDiscovered
```

Los eventos no representan el estado.

Representan cambios o acontecimientos.

---

## 4.3 Relationship

Representa una relación entre dos entidades.

Ejemplos:

```text
KNOWS
OWNS
LOCATED_AT
MEMBER_OF
ENEMY_OF
ALLY_OF
```

---

## 4.4 Derived State

Representa información calculada a partir de entidades y eventos.

Ejemplo:

```text
CurrentLocation
CurrentOwner
CurrentQuestStatus
CurrentFactionRelation
CurrentWeather
```

---

## 4.5 Presentation Entity

Representa cómo se muestra algo.

Ejemplos:

```text
Scene
CharacterVisual
Asset
CameraPreset
Cinematic
```

La representación visual no define la realidad narrativa.

---

# 5. Campaign

## Definición

Una `Campaign` representa una campaña completa de rol.

Es el contenedor raíz de todos los datos relacionados con una historia.

```text
Campaign
├── Sessions
├── Characters
├── NPCs
├── Factions
├── Locations
├── Items
├── Creatures
├── Quests
├── Events
├── Relationships
├── Scenes
├── Recaps
└── Snapshots
```

---

## Propiedades conceptuales

```text
id
name
description
system
createdAt
updatedAt
status
currentSession
currentWorldState
```

---

## Estados

```text
ACTIVE
PAUSED
COMPLETED
ARCHIVED
```

---

# 6. Session

## Definición

Una `Session` representa una sesión de juego.

Puede contener:

- notas;
- acontecimientos;
- decisiones;
- diálogos relevantes;
- combates;
- descubrimientos;
- cambios del mundo;
- consecuencias.

Una sesión no necesariamente representa una única ubicación.

Los jugadores pueden desplazarse durante una misma sesión.

---

## Estados

```text
DRAFT
IMPORTED
PROCESSING
REVIEW
APPROVED
ARCHIVED
```

---

## Concepto importante

La sesión es una **fuente temporal de acontecimientos**.

No debe utilizarse como sustituto del World State.

---

# 7. Character

## Definición

Un `Character` representa un personaje jugador.

Ejemplo:

```text
Ardan
Mira
Thoren
```

Un personaje puede:

- desplazarse;
- adquirir objetos;
- perder objetos;
- conocer entidades;
- descubrir lugares;
- iniciar quests;
- completar quests;
- sufrir daño;
- morir;
- cambiar relaciones;
- adquirir conocimiento.

---

## Estados

El estado del personaje puede incluir:

```text
ALIVE
INJURED
UNCONSCIOUS
DEAD
MISSING
RETIRED
UNKNOWN
```

Estos estados no deben confundirse con el estado de la entidad en la base.

---

# 8. NPC

## Definición

Un `NPC` representa un personaje controlado por el DM o por el mundo.

Puede poseer prácticamente las mismas propiedades narrativas que un Character.

La diferencia principal es:

```text
Character = Player-controlled

NPC = DM/World-controlled
```

No asumir que todos los NPC son enemigos.

Pueden ser:

- aliados;
- comerciantes;
- enemigos;
- neutrales;
- autoridades;
- criaturas inteligentes;
- informantes;
- personajes temporales.

---

# 9. Creature

## Definición

Una `Creature` representa una entidad viva del mundo que no necesariamente posee
la complejidad narrativa de un NPC.

Ejemplos:

```text
Wolf
Goblin
Dragon
Rat
Undead
Monster
```

Puede evolucionar posteriormente hacia un NPC si adquiere relevancia narrativa.

---

# 10. Faction

## Definición

Una `Faction` representa una organización, grupo o colectivo.

Ejemplos:

```text
Kingdom
Guild
Cult
Military
Merchant Organization
Religious Order
Criminal Group
Tribe
```

Una facción puede tener:

- miembros;
- enemigos;
- aliados;
- territorios;
- objetivos;
- recursos;
- secretos.

---

# 11. Location

## Definición

Una `Location` representa un lugar del mundo.

Puede ser:

```text
World
Region
Country
City
Village
District
Building
Room
Dungeon
Cave
Tunnel
Forest
Road
Battlefield
```

Las ubicaciones pueden formar una jerarquía.

Ejemplo:

```text
World
└── Kingdom
    └── Region
        └── City
            └── Castle
                └── Dungeon
                    └── Prison Cell
```

---

# 12. Location Hierarchy

Las ubicaciones deben poder contener otras ubicaciones.

Relación:

```text
PARENT_LOCATION
```

Ejemplo:

```text
Castle
  └── Dungeon
        └── Prison
              └── Cell 04
```

Esto permite representar espacios sin convertir cada uno en un mapa global independiente.

---

# 13. Location State

Una ubicación puede encontrarse en distintos estados.

```text
UNKNOWN
DISCOVERED
VISITED
ACTIVE
DESTROYED
ABANDONED
SEALED
INACCESSIBLE
HISTORICAL
```

Ejemplo:

```text
Ancient Vault
STATUS = DISCOVERED
```

---

# 14. Item

## Definición

Un `Item` representa un objeto relevante para el mundo.

Ejemplos:

```text
Sword
Key
Artifact
Letter
Potion
Quest Item
Relic
Map
```

No todos los objetos físicos necesitan convertirse en entidades individuales.

Debe existir una distinción entre:

```text
Narratively Relevant Item
```

y:

```text
Generic Prop
```

Un vaso de una taberna normalmente no necesita una entidad Item.

La espada legendaria del grupo sí.

---

# 15. Quest

## Definición

Una `Quest` representa un objetivo o línea narrativa.

Puede contener:

- objetivo;
- participantes;
- origen;
- ubicación;
- recompensas;
- condiciones;
- eventos relacionados;
- consecuencias.

---

## Estados

```text
UNKNOWN
AVAILABLE
ACTIVE
PAUSED
COMPLETED
FAILED
ABANDONED
HIDDEN
```

---

# 16. Event

## Definición

Un `Event` representa un acontecimiento.

Un evento debe responder, cuando sea posible, a:

```text
WHAT?
WHO?
WHEN?
WHERE?
WHY?
CONSEQUENCE?
SOURCE?
```

Ejemplo:

```text
Character:
Ardan

Action:
STOLE

Object:
Sacred Medallion

Location:
Temple

Session:
07

Result:
Temple guards became hostile
```

---

# 17. Event Characteristics

Un evento puede tener:

```text
id
type
timestamp
session
location
actors
targets
description
source
confidence
canonStatus
consequences
```

---

# 18. Event Categories

## Character Events

```text
CHARACTER_CREATED
CHARACTER_MOVED
CHARACTER_INJURED
CHARACTER_HEALED
CHARACTER_DIED
CHARACTER_REVIVED
CHARACTER_JOINED_PARTY
CHARACTER_LEFT_PARTY
```

## NPC Events

```text
NPC_INTRODUCED
NPC_MET
NPC_MOVED
NPC_INJURED
NPC_DIED
NPC_JOINED
NPC_LEFT
```

## Location Events

```text
LOCATION_DISCOVERED
LOCATION_VISITED
LOCATION_ENTERED
LOCATION_EXITED
LOCATION_DESTROYED
LOCATION_SEALED
LOCATION_REOPENED
```

## Item Events

```text
ITEM_CREATED
ITEM_FOUND
ITEM_ACQUIRED
ITEM_TRANSFERRED
ITEM_STOLEN
ITEM_DROPPED
ITEM_DESTROYED
ITEM_LOST
```

## Quest Events

```text
QUEST_DISCOVERED
QUEST_STARTED
QUEST_UPDATED
QUEST_COMPLETED
QUEST_FAILED
QUEST_ABANDONED
```

## World Events

```text
WORLD_CHANGE
FACTION_CHANGE
POLITICAL_CHANGE
NATURAL_EVENT
DISASTER
WAR_STARTED
WAR_ENDED
```

## Narrative Events

```text
DISCOVERY
REVELATION
DECISION
DIALOGUE
RUMOR
SECRET_REVEALED
SECRET_DISCOVERED
BETRAYAL
```

---

# 19. Event Immutability

Los eventos canonizados deberían tratarse preferentemente como registros históricos.

No modificar silenciosamente:

```text
Event A
```

para convertirlo en otra cosa.

Si existe un cambio narrativo importante:

```text
Original Event
      ↓
Correction / Retcon Event
```

Esto permite conservar la historia de cambios.

---

# 20. Relationship

## Definición

Una `Relationship` representa una conexión entre dos entidades.

Ejemplo:

```text
Ardan
  └── KNOWS ──> Varek
```

---

# 21. Relationship Types

Inicialmente:

```text
KNOWS
TRUSTS
SUSPECTS
HATES
LOVES
FEARS
OWNS
LOCATED_AT
MEMBER_OF
LEADS
WORKS_FOR
ALLY_OF
ENEMY_OF
FRIEND_OF
RELATED_TO
PROTECTS
HUNTS
SERVES
WORSHIPS
```

---

# 22. Relationship Strength

Una relación puede tener intensidad.

Conceptualmente:

```text
-1.0 = extremadamente negativa
 0.0 = neutral
+1.0 = extremadamente positiva
```

No todas las relaciones necesitan utilizar este valor.

Por ejemplo:

```text
MEMBER_OF
```

no necesariamente necesita una intensidad.

---

# 23. Relationship History

Las relaciones pueden cambiar.

Ejemplo:

```text
Ardan -> TRUSTS -> Varek
```

posteriormente:

```text
Ardan -> SUSPECTS -> Varek
```

y finalmente:

```text
Ardan -> HATES -> Varek
```

El sistema debe conservar el historial cuando sea narrativamente relevante.

---

# 24. Knowledge

## Definición

`Knowledge` representa información conocida por una entidad.

No debe confundirse con el canon.

Ejemplo:

```text
CANON:
Varek is secretly a cult leader.

Ardan:
UNKNOWN

Mira:
SUSPECTS

DM:
KNOWS
```

---

# 25. Knowledge Levels

Inicialmente:

```text
UNKNOWN
RUMORED
SUSPECTED
KNOWN
CONFIRMED
```

Ejemplo:

```text
Mira SUSPECTS Varek is lying.
```

Esto no significa que el sistema deba considerar que el hecho es verdadero.

---

# 26. Knowledge Source

Cada conocimiento debe poder relacionarse con una fuente.

Ejemplo:

```text
Knowledge
    ↓
Event
    ↓
Session
    ↓
Original Source
```

Esto permite responder:

> ¿Por qué el personaje sabe esto?

---

# 27. Secret

Un `Secret` representa información que existe en el canon pero cuyo conocimiento
está limitado.

Ejemplo:

```text
Secret:
"The king is controlled by a demon."

Known by:
DM
NPC_X

Unknown by:
Party
Characters
```

Los secretos deben respetar los permisos de conocimiento.

---

# 28. World State

## Definición

`World State` representa la situación actual de la campaña.

Es una vista estructurada del mundo en un momento determinado.

Debe poder responder:

```text
Where are the characters?
Which NPCs are alive?
Which quests are active?
Which factions are hostile?
Which locations are accessible?
Which important items exist?
What events recently happened?
What is the current scene?
```

---

# 29. World State vs Event Log

No son lo mismo.

```text
EVENT LOG
=
Historia de lo que ocurrió.

WORLD STATE
=
Resultado actual de esa historia.
```

Ejemplo:

```text
EVENT 001
Ardan acquired Sword X.

EVENT 002
Ardan gave Sword X to Mira.

EVENT 003
Mira lost Sword X.

CURRENT STATE
Sword X = LOST
```

---

# 30. World Snapshot

Un `WorldSnapshot` representa el World State en un momento específico.

Ejemplo:

```text
Session 10
Snapshot 010
```

Debe permitir reconstruir aproximadamente el estado de la campaña en ese punto.

---

# 31. Scene

## Definición

Una `Scene` representa una representación visual jugable de una ubicación.

Una Scene puede contener:

```text
Environment
Characters
NPCs
Props
Lighting
Weather
Audio
Camera
Effects
Triggers
```

---

# 32. Scene vs Location

No son equivalentes.

Una ubicación puede existir sin tener una escena visual.

Ejemplo:

```text
Location:
Ancient Underground Vault

Scene:
NULL
```

Posteriormente:

```text
Location:
Ancient Underground Vault

Scene:
AncientVaultScene01
```

Una ubicación también puede tener múltiples escenas.

Ejemplo:

```text
Castle
├── CastleExterior
├── ThroneRoom
├── Dungeon
└── SecretChamber
```

---

# 33. Character Visual

La representación visual de un personaje es independiente de su identidad narrativa.

Ejemplo:

```text
Character:
Ardan

Visual:
WarriorMiniature01
```

Si posteriormente se cambia el modelo:

```text
Character:
Ardan

Visual:
WarriorMiniature02
```

el personaje sigue siendo el mismo.

---

# 34. Character Miniature

La representación inicial debe ser modular.

```text
Miniature
├── Base
├── Body
├── Head
├── Hair
├── Armor
├── Weapon
├── Shield
├── Cape
├── Accessories
└── Effects
```

El objetivo es reducir la cantidad de modelos necesarios.

---

# 35. Asset

Un `Asset` representa un recurso multimedia.

Tipos:

```text
IMAGE
MODEL_3D
AUDIO
VIDEO
FONT
MATERIAL
TEXTURE
MAP
```

Los Assets son recursos de presentación.

No son entidades narrativas.

---

# 36. Asset Relationship

Un Asset puede estar asociado a una entidad.

Ejemplo:

```text
Character
   ↓
Visual Asset

Location
   ↓
Environment Asset

Item
   ↓
3D Model

Faction
   ↓
Symbol / Image
```

Una entidad puede tener múltiples Assets.

---

# 37. Recap

Un `Recap` representa una síntesis narrativa de una o varias sesiones.

Tipos:

```text
QUICK
FULL
NARRATIVE
```

Puede tener:

```text
sourceSessions
content
language
duration
audioAsset
createdAt
version
```

---

# 38. Source

Una `Source` representa el material original utilizado para generar información.

Ejemplos:

```text
DM Notes
Player Notes
Player Recap
Audio Recording
Transcript
PDF
Image
Manual Entry
Imported Markdown
```

La fuente original debe conservarse.

---

# 39. Provenance

Toda información generada automáticamente debería poder responder:

```text
¿De dónde salió esto?
```

Cadena conceptual:

```text
Generated Data
      ↓
Source
      ↓
Session
      ↓
Event
      ↓
Entity
```

Esto es fundamental para debugging y corrección del lore.

---

# 40. Confidence

Los datos extraídos automáticamente pueden tener un nivel de confianza.

```text
0.00 - 0.29
VERY LOW

0.30 - 0.49
LOW

0.50 - 0.69
MEDIUM

0.70 - 0.89
HIGH

0.90 - 1.00
VERY HIGH
```

La confianza no determina por sí sola el canon.

El DM tiene la última palabra.

---

# 41. Canon Status

Los elementos narrativos pueden tener:

```text
PROPOSED
UNCONFIRMED
CANON
CONTRADICTORY
REJECTED
DM_ONLY
```

---

# 42. Retcon

El sistema debe permitir modificaciones retroactivas de la historia.

Un Retcon no debería borrar silenciosamente la historia anterior.

Debe registrarse:

```text
RETCON
├── Original Event
├── New Interpretation
├── Reason
├── Approved By
└── Date
```

Esto permitirá mantener consistencia histórica.

---

# 43. Character Death

La muerte es un evento importante.

Ejemplo:

```text
CHARACTER_DIED
```

El estado resultante puede ser:

```text
DEAD
```

Si posteriormente existe una resurrección:

```text
CHARACTER_REVIVED
```

El sistema conserva ambos acontecimientos.

---

# 44. Location History

Las ubicaciones también tienen historia.

Ejemplo:

```text
Castle
 ↓
Active
 ↓
Destroyed
 ↓
Abandoned
 ↓
Rebuilt
```

El estado actual no elimina los estados anteriores.

---

# 45. Inventory

El inventario representa posesión de Items.

Relación:

```text
Character
    ↓
OWNS
    ↓
Item
```

Un Item narrativamente único debería tener un único propietario válido en un momento
determinado, salvo que el dominio permita explícitamente otra situación.

---

# 46. Party

La `Party` representa el grupo de personajes jugadores.

Conceptualmente:

```text
Campaign
└── Party
    ├── Character A
    ├── Character B
    ├── Character C
    └── Character D
```

Una campaña puede eventualmente contener más de una party.

---

# 47. Current Party Location

La ubicación de cada personaje debe poder representarse individualmente.

No asumir que:

```text
Party Location = Character Location
```

siempre será cierto.

Ejemplo:

```text
Character A -> Room 01
Character B -> Room 01
Character C -> Room 02
```

Esto será importante durante combates y exploración.

---

# 48. Narrative Time

El sistema debe distinguir:

```text
Real Session Date
```

de:

```text
In-world Date
```

Ejemplo:

```text
Session Date:
2026-08-22

World Date:
Year 342, Day 17
```

Ambos pueden ser necesarios.

---

# 49. Spatial Position

Una entidad puede tener:

```text
Location
+
Position
```

Ejemplo:

```text
Location:
Dungeon

Position:
x = 4.2
y = 0
z = -7.8
```

La posición visual no necesariamente representa una coordenada narrativa permanente.

Debe poder resetearse o modificarse.

---

# 50. Scene State

El estado de una escena puede incluir:

```text
weather
lighting
timeOfDay
music
ambientAudio
camera
activeCharacters
activeNPCs
effects
```

Este estado pertenece a la presentación visual.

No debe modificar automáticamente el canon salvo que exista un evento explícito.

---

# 51. Narrative vs Presentation

Regla importante:

```text
Narrative State
        ≠
Presentation State
```

Ejemplo:

```text
Narrative:
It is raining.

Presentation:
Rain particles = enabled
Rain sound = enabled
Lighting = dark
```

La presentación deriva de la narrativa, pero puede existir una presentación temporal.

Ejemplo:

```text
DM activates cinematic storm
```

Esto no significa necesariamente que en el canon haya comenzado una tormenta.

---

# 52. Command

Un `Command` representa una intención de modificar el sistema.

Ejemplo:

```text
MOVE_CHARACTER
CHANGE_WEATHER
START_COMBAT
SPAWN_NPC
START_CINEMATIC
CHANGE_SCENE
```

Un Command no es necesariamente un evento.

---

# 53. Command vs Event

```text
COMMAND
=
Lo que alguien quiere hacer.

EVENT
=
Lo que el sistema reconoce que ocurrió.
```

Ejemplo:

```text
DM:
MOVE Ardan -> Door

COMMAND
MOVE_CHARACTER

↓

DOMAIN VALIDATION

↓

EVENT
CHARACTER_MOVED
```

---

# 54. Trigger

Un `Trigger` representa una condición que puede provocar una acción.

Conceptualmente:

```text
WHEN condition
THEN command
```

Ejemplo:

```text
WHEN Character enters Location X

THEN
START_CINEMATIC
```

Los triggers no deben modificar el canon directamente sin pasar por el sistema de comandos/eventos.

---

# 55. Macro

Una `Macro` representa una secuencia de comandos.

Ejemplo:

```text
DRAGON_ARRIVES

1. Change lighting
2. Start storm
3. Play roar
4. Move camera
5. Spawn dragon
6. Start music
```

---

# 56. DM Authority

El DM posee autoridad sobre:

```text
Canon
Secrets
World State corrections
Narrative interpretation
Scene control
Retcons
AI approvals
```

Los jugadores no deben tener acceso administrativo al dominio.

---

# 57. Player Knowledge

El sistema debe poder construir una vista limitada del mundo para los jugadores.

Conceptualmente:

```text
WORLD STATE
      ↓
KNOWLEDGE FILTER
      ↓
PLAYER VIEW
```

Nunca:

```text
WORLD STATE
      ↓
PLAYER
```

sin filtro.

---

# 58. Domain Invariants

Estas reglas deben mantenerse independientemente de la interfaz.

## INV-001

Una entidad no puede tener dos ubicaciones actuales incompatibles.

## INV-002

Un Item único no puede tener simultáneamente dos propietarios válidos.

## INV-003

Un evento histórico canonizado no debe modificarse silenciosamente.

## INV-004

Información `DM_ONLY` no puede aparecer en contexto de jugador.

## INV-005

Una propuesta de IA no es canon hasta ser aprobada.

## INV-006

Un personaje muerto no puede aparecer como vivo sin un evento que justifique el cambio.

## INV-007

Un objeto destruido no puede estar disponible sin un evento posterior que explique su existencia.

## INV-008

Una ubicación histórica puede dejar de estar cargada en runtime sin perder su información.

## INV-009

Una Scene no determina por sí sola el canon.

## INV-010

Los Assets no son la fuente de verdad narrativa.

---

# 59. Evolución futura del dominio

El dominio debe poder incorporar posteriormente:

```text
Magic System
Combat System
Rules Engine
Abilities
Spells
Skills
Stats
Dialogue Trees
Economy
Politics
Religion
World Simulation
Weather Simulation
Time Simulation
AI NPCs
```

Estas capacidades no forman parte del dominio mínimo inicial.

No deben implementarse hasta que exista una necesidad concreta.

---

# 60. Prioridad de implementación

Orden recomendado:

```text
1. Campaign
2. Session
3. Character
4. NPC
5. Location
6. Item
7. Quest
8. Event
9. Relationship
10. Knowledge
11. World State
12. Snapshot
13. Scene
14. Asset
15. Recap
16. Commands
17. Triggers
18. Macros
```

---

# 61. Regla final del dominio

El modelo debe representar primero **la campaña como sistema narrativo**.

La representación 3D, los agentes de IA y la interfaz son consumidores del dominio.

La prioridad es:

```text
CAMPAIGN
   ↓
TRUTH
   ↓
STATE
   ↓
CONTEXT
   ↓
PRESENTATION
```

Nunca invertir esta dependencia.
