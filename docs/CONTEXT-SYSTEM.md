# CONTEXT-SYSTEM.md

> Especificación del sistema de contexto de RPG World Engine.
>
> Define cómo los agentes de IA acceden al Lore, estado de campaña,
> personajes, sesiones, mapas, eventos y demás información necesaria
> para ejecutar una tarea sin cargar innecesariamente todo el proyecto.

---

# 1. Propósito

El sistema de contexto tiene como objetivo proporcionar a cada agente:

- la información necesaria;
- en el momento necesario;
- con el menor volumen posible;
- manteniendo coherencia narrativa;
- evitando contradicciones;
- evitando información irrelevante;
- evitando exposición innecesaria de secretos.

Principio fundamental:

> Un agente debe recibir suficiente contexto para realizar su tarea,
> pero no necesariamente todo el contexto disponible.

---

# 2. Problema

Una campaña puede crecer hasta contener:

- cientos de sesiones;
- miles de eventos;
- cientos de personajes;
- cientos de ubicaciones;
- múltiples mapas;
- documentos;
- imágenes;
- transcripciones;
- quests;
- secretos;
- relaciones;
- estados históricos.

Enviar todo esto a un modelo en cada consulta sería:

- caro;
- lento;
- innecesario;
- difícil de mantener;
- propenso a errores.

---

# 3. Principio de Contexto Mínimo Suficiente

El sistema debe intentar encontrar:

```text
MINIMUM SUFFICIENT CONTEXT
```

Es decir:

> El conjunto mínimo de información que permite al agente realizar
> correctamente una tarea.

Ejemplo:

Pregunta:

```text
"¿Qué pasó con el prisionero de la sesión anterior?"
```

No necesita:

```text
Toda la historia de la campaña.
```

Puede necesitar:

```text
Session N-1
Prisoner entity
Relevant events
Current state
```

---

# 4. Jerarquía de Contexto

El contexto se organiza en niveles.

```text
LEVEL 0
System Context

LEVEL 1
Campaign Context

LEVEL 2
Current World State

LEVEL 3
Current Session

LEVEL 4
Task Context

LEVEL 5
Relevant Entities

LEVEL 6
Relevant Events

LEVEL 7
Historical Context

LEVEL 8
Source Evidence
```

No todos los niveles deben utilizarse siempre.

---

# 5. Level 0 — System Context

Contiene las reglas generales del sistema.

Ejemplo:

```text
Current agent role
Safety rules
Output format
Canon rules
Tool rules
Secret handling
```

Debe ser pequeño y estable.

---

# 6. Level 1 — Campaign Context

Describe la campaña en términos generales.

Ejemplo:

```text
Campaign Name
Genre
Tone
World
Main Premise
Important Rules
Narrative Style
Current Campaign Status
```

Archivo recomendado:

```text
context/campaign.md
```

---

# 7. Level 2 — Current World State

Representa el estado actual conocido.

Archivo:

```text
context/current-state.md
```

Debe contener aproximadamente:

```text
Current Session
Current Date
Current Location
Party Location
Party Members
Active Quests
Active Threats
Recent Events
Important NPCs
Current Environment
Open Story Threads
```

---

# 8. Level 3 — Current Session

Representa la sesión actualmente activa.

Ejemplo:

```text
context/current-session.md
```

Puede contener:

```text
Session Number
Session Date
Current Scene
Current Location
Present Characters
Present NPCs
Active Events
Scene State
DM Notes
```

---

# 9. Level 4 — Task Context

Describe específicamente qué necesita realizar el agente.

Ejemplo:

```text
TASK:

Prepare a visual scene for the current dungeon.

NEEDS:

- Current location
- Architecture
- Current environment
- Present characters
- Relevant recent events
```

El Task Context debe generarse dinámicamente.

---

# 10. Level 5 — Relevant Entities

El sistema recupera solamente las entidades relacionadas con la tarea.

Ejemplo:

```text
Current Scene
    ↓
Relevant Entities
    ├── Party
    ├── NPC
    ├── Location
    ├── Faction
    └── Quest
```

---

# 11. Level 6 — Relevant Events

Se recuperan eventos relacionados.

Prioridad:

```text
Current Session
↓
Previous Session
↓
Recent Related Events
↓
Historical Related Events
```

---

# 12. Level 7 — Historical Context

Solo se incluye cuando es necesario.

Ejemplo:

El agente necesita saber:

> ¿Por qué el grupo odia a este NPC?

Entonces puede recuperar:

```text
Historical Events
Character Relationship
Previous Encounters
```

---

# 13. Level 8 — Source Evidence

Es el nivel más profundo.

Puede contener:

```text
Original Session Notes
Transcript
DM Notes
Player Notes
Images
Source Documents
```

Debe utilizarse cuando exista incertidumbre.

---

# 14. Context Assembly

El sistema debe construir el contexto dinámicamente.

```text
Task
 ↓
Identify Requirements
 ↓
Retrieve Relevant Data
 ↓
Rank Data
 ↓
Apply Context Budget
 ↓
Assemble Context
 ↓
Agent
```

---

# 15. Context Budget

Cada agente debería tener un presupuesto de contexto.

Ejemplo conceptual:

```text
System:
10%

Campaign:
10%

Current State:
15%

Task:
10%

Relevant Entities:
20%

Events:
20%

Evidence:
15%
```

Estos porcentajes son iniciales y configurables.

No representan necesariamente tokens exactos.

---

# 16. Token Budget

El sistema debe poder establecer:

```text
max_context_tokens
```

Ejemplo:

```text
max_context_tokens = 12000
```

Si el contexto excede el límite:

```text
Rank
 ↓
Remove low priority information
 ↓
Summarize
 ↓
Retry
```

---

# 17. Context Priority

Cada pieza de información debe poseer una prioridad.

Ejemplo:

```text
CRITICAL
HIGH
MEDIUM
LOW
OPTIONAL
```

---

# 18. Priority Example

Para generar la escena actual:

```text
Current Location
→ CRITICAL

Current Characters
→ CRITICAL

Current Scene State
→ CRITICAL

Recent Events
→ HIGH

Historical Location
→ MEDIUM

Global World History
→ LOW
```

---

# 19. Context Relevance

La relevancia puede calcularse utilizando:

```text
Entity Relationship
Temporal Proximity
Location Proximity
Semantic Similarity
Task Relevance
Canon Priority
```

---

# 20. Temporal Relevance

Los eventos recientes normalmente reciben mayor prioridad.

Ejemplo:

```text
Session 14
Session 13
Session 12
...
Session 01
```

Pero un evento antiguo importante puede superar a uno reciente irrelevante.

---

# 21. Semantic Retrieval

El sistema puede buscar información mediante embeddings.

Conceptualmente:

```text
User Task
   ↓
Embedding
   ↓
Vector Search
   ↓
Relevant Chunks
```

---

# 22. Local Vector Search

Para mantener el sistema local y gratuito, inicialmente utilizar:

```text
Local Vector Database
```

o una solución embebida.

Opciones futuras pueden incluir:

```text
SQLite + vector extension
FAISS
Chroma
LanceDB
```

La implementación concreta se definirá en arquitectura técnica.

---

# 23. Hybrid Retrieval

No depender exclusivamente de embeddings.

Combinar:

```text
Keyword Search
+
Metadata Search
+
Entity Search
+
Vector Search
+
Graph Relationships
```

---

# 24. Retrieval Example

Pregunta:

```text
"¿Qué sabe el grupo sobre la bóveda?"
```

Buscar:

```text
Keyword:
bóveda

Entity:
Vault

Character Knowledge:
Party

Events:
Vault-related events

Location:
Vault
```

---

# 25. Retrieval Result

Cada resultado debe contener:

```text
Document
Chunk
Score
Source
Entity
Session
Priority
```

---

# 26. Context Ranking

Ejemplo:

```text
Result A
Current Session
Score 0.94

Result B
Previous Session
Score 0.87

Result C
Session 03
Score 0.71

Result D
Global Lore
Score 0.42
```

El sistema selecciona según presupuesto.

---

# 27. Context Deduplication

Si varias fuentes contienen la misma información:

```text
Session Recap
+
Player Notes
+
DM Notes
```

no necesariamente enviar las tres completas.

Puede enviar:

```text
Canonical Summary
+
Source References
```

---

# 28. Source Authority

Cuando existen conflictos:

```text
DM Canon
>
DM Notes
>
Approved Recap
>
Player Notes
>
AI Inference
```

---

# 29. Canon Filtering

Los agentes deben saber diferenciar:

```text
CANON
CANDIDATE
INFERENCE
RUMOR
UNKNOWN
```

Nunca presentar:

```text
INFERENCE
```

como:

```text
CANON
```

---

# 30. Epistemic Context

Cada dato importante puede contener:

```text
truth_status
```

Valores:

```text
CONFIRMED
UNCONFIRMED
RUMOR
SPECULATION
PROPHECY
LIE
UNKNOWN
```

---

# 31. Knowledge Scope

La información también debe tener alcance.

```text
PUBLIC
PLAYER_KNOWN
CHARACTER_KNOWN
DM_ONLY
SECRET
```

---

# 32. Secret Filtering

Si el agente trabaja para los jugadores:

```text
DM_ONLY
```

no debe entrar en el contexto.

Si el agente trabaja para el DM:

```text
DM_ONLY
```

puede estar disponible.

---

# 33. Character Knowledge

No asumir:

```text
World Fact == Character Knowledge
```

Ejemplo:

```text
World:
The king is alive.

Party Knowledge:
The party believes the king is dead.
```

---

# 34. Character-Specific Context

Para un agente que genera diálogo de un NPC:

```text
NPC Profile
+
NPC Knowledge
+
NPC Goals
+
NPC Relationships
+
Current Scene
```

No necesita necesariamente:

```text
Entire Campaign
```

---

# 35. DM Context

El DM Assistant puede utilizar un contexto mucho más amplio.

Ejemplo:

```text
Campaign
+
Current State
+
Recent Sessions
+
Relevant Historical Lore
+
Secrets
+
Open Threads
+
Potential Contradictions
```

---

# 36. Player Context

El contexto destinado a jugadores debe filtrar:

```text
Secrets
DM Notes
Hidden Information
Unrevealed NPC Motives
Future Plot Information
```

---

# 37. Runtime Context

El entorno 3D necesita un contexto diferente.

Puede requerir:

```text
Current Location
Current Scene
Present Characters
Environment State
Lighting
Weather
Time
Active Effects
Relevant Events
```

No necesita todo el Lore.

---

# 38. Scene Context

Ejemplo:

```text
Scene:
Underground Vault

Characters:
4

NPC:
Guardian

Environment:
Dark
Wet
Ancient

Current Event:
Party opened the sealed door

Visual Requirements:
Fog
Torchlight
Stone architecture
```

---

# 39. Narrative Context

El agente narrativo puede necesitar:

```text
Previous Scene
Current Scene
Character Actions
Relevant Lore
DM Intent
Open Story Threads
```

---

# 40. Recap Context

El agente de recap necesita:

```text
Previous Session
Approved Events
Character Changes
Quest Changes
Important Discoveries
Consequences
```

No necesita todo el Lore.

---

# 41. Visual Generation Context

El agente encargado de preparar un escenario puede necesitar:

```text
Location
Architecture
Environment
Current State
Visual References
Time
Weather
Lighting
Characters
```

---

# 42. Character Generation Context

Para preparar un personaje:

```text
Character Entity
Visual Description
Equipment
Faction
Current State
Current Location
Relevant Scene
```

---

# 43. Audio/Narration Context

Para generar una narración:

```text
Approved Events
Narrative Tone
Previous Session
Current Context
Important Character Names
```

Debe evitar inventar eventos.

---

# 44. Context Profiles

Los agentes deben poder declarar un perfil.

Ejemplo:

```text
context-profile:
  name: scene-generator
  required:
    - current-location
    - current-scene
    - characters
    - environment
  optional:
    - recent-events
    - historical-location
```

---

# 45. Agent Context Profiles

Perfiles iniciales:

```text
DM_ASSISTANT
SESSION_PROCESSOR
LORE_EXTRACTOR
RECAP_GENERATOR
NARRATOR
SCENE_GENERATOR
CHARACTER_MANAGER
MAP_MANAGER
VOICE_GENERATOR
WORLD_STATE_MANAGER
```

---

# 46. Context Contract

Cada agente debería definir:

```text
INPUT CONTEXT
OUTPUT
REQUIRED DATA
OPTIONAL DATA
MAX CONTEXT
```

---

# 47. Context Contract Example

```text
Agent:
RECAP_GENERATOR

Required:
- Previous Session
- Approved Events

Optional:
- Character Profiles
- Quest State
- World State

Output:
- Recap Markdown
- Narration Script
```

---

# 48. Context Caching

Los contextos frecuentes pueden almacenarse.

Ejemplo:

```text
current-state.md
party.md
campaign.md
```

Estos no necesitan reconstruirse constantemente.

---

# 49. Dynamic Context

Otros contextos deben generarse por consulta.

Ejemplo:

```text
"What does the party know about the cult?"
```

El contexto debe buscarse dinámicamente.

---

# 50. Cache Invalidation

Cuando cambia:

```text
World State
```

deben invalidarse los contextos derivados afectados.

Ejemplo:

```text
NPC Status Changed
 ↓
NPC Cache invalid
 ↓
Relevant Scene Context invalid
```

No necesariamente invalidar toda la campaña.

---

# 51. Context Version

Cada contexto puede tener:

```text
context_version
```

Ejemplo:

```text
current-state:v42
```

---

# 52. State Snapshot

Después de una sesión:

```text
Session 14
 ↓
Approved
 ↓
World State v15
```

El contexto puede apuntar a ese snapshot.

---

# 53. Session Boundary

Las sesiones son puntos naturales de checkpoint.

```text
SESSION 01
STATE 01

SESSION 02
STATE 02

SESSION 03
STATE 03
```

Esto facilita:

- debugging;
- rollback;
- historial;
- reproducción.

---

# 54. Context Rollback

Debe ser posible consultar:

```text
World State at Session 10
```

aunque actualmente estemos en:

```text
Session 20
```

---

# 55. Historical Simulation

En el futuro:

```text
"¿Cómo estaba el castillo durante Session 05?"
```

debe poder reconstruirse.

---

# 56. Context Snapshots

Formato conceptual:

```text
snapshots/
├── session-001/
├── session-002/
├── session-003/
└── ...
```

No necesariamente como archivos físicos.

Pueden existir como registros en SQLite.

---

# 57. Markdown Context Files

Los Markdown principales pueden ser:

```text
context/
├── campaign.md
├── current-state.md
├── current-session.md
├── party.md
└── active-threads.md
```

---

# 58. Entity Context Files

```text
context/entities/
├── characters/
├── npcs/
├── locations/
├── factions/
├── quests/
└── items/
```

Estos archivos pueden generarse a partir de la base.

---

# 59. Session Context Files

```text
context/sessions/
├── session-001.md
├── session-002.md
├── session-003.md
└── ...
```

---

# 60. Source Context

Las fuentes originales deben permanecer separadas.

```text
sources/
├── sessions/
├── notes/
├── maps/
├── images/
├── audio/
└── documents/
```

---

# 61. Context vs Source

No confundir:

```text
Source
```

con:

```text
Context
```

Source:

```text
"El grupo entró en la bóveda..."
```

Context:

```text
Party entered the vault in Session 14.
Current location = Vault.
```

---

# 62. Context Compression

Cuando un conjunto de información es demasiado grande:

```text
Raw Events
 ↓
Summary
 ↓
Compressed Context
```

Pero conservar referencias a los eventos originales.

---

# 63. Hierarchical Summaries

Puede existir:

```text
Event
 ↓
Scene Summary
 ↓
Session Summary
 ↓
Arc Summary
 ↓
Campaign Summary
```

---

# 64. Summary Levels

Ejemplo:

```text
event-143.md

scene-22.md

session-014.md

arc-03.md

campaign.md
```

Cada nivel resume el anterior.

---

# 65. Summary Rules

Los resúmenes no deben introducir información que no exista en las fuentes.

Deben ser:

```text
LOSSY
BUT
TRACEABLE
```

Es decir:

> Pueden omitir detalles, pero no inventarlos.

---

# 66. Context Expansion

Si un resumen no contiene suficiente información:

```text
Summary
 ↓
Source Reference
 ↓
Retrieve Original Event
```

---

# 67. Progressive Context

El agente puede empezar con poco contexto.

Si detecta insuficiencia:

```text
Need more information
 ↓
Retrieve additional context
 ↓
Continue
```

---

# 68. Agent Tool Retrieval

En lugar de entregar todo inicialmente:

```text
Agent
 ↓
search_lore()
 ↓
get_entity()
 ↓
get_events()
 ↓
get_source()
```

Esto reduce contexto inicial.

---

# 69. Retrieval Tools

Herramientas conceptuales:

```text
search_lore(query)
get_entity(id)
get_location(id)
get_events(filter)
get_session(id)
get_relationships(id)
get_current_state()
get_source(id)
```

---

# 70. Search Lore

Ejemplo:

```text
search_lore("black vault")
```

puede devolver:

```text
Location: Black Vault
Session 05
Session 09
Quest: Broken Seal
NPC: Guardian
```

---

# 71. Entity Retrieval

```text
get_entity("npc-varek")
```

devuelve solamente:

```text
Identity
Current State
Relationships
Known History
Relevant Secrets
Sources
```

---

# 72. Event Retrieval

```text
get_events(
    entity="npc-varek",
    limit=10
)
```

No devolver todos los eventos de la campaña.

---

# 73. Location Retrieval

```text
get_location("black-vault")
```

puede devolver:

```text
Description
Known History
Current State
Previous States
Connected Locations
Important Events
Visual References
```

---

# 74. Relationship Retrieval

```text
get_relationships("Varek")
```

puede devolver:

```text
Varek
 ├── member_of → Shadow Cult
 ├── enemy_of → Ardan
 ├── knows → Black Vault
 └── owes → Merchant Guild
```

---

# 75. Context Graph

El sistema puede conceptualizar la recuperación como un grafo.

```text
Task
 ↓
Entity
 ↓
Relationships
 ↓
Events
 ↓
Location
 ↓
Historical Context
```

---

# 76. Context Radius

Una consulta puede tener un radio.

Ejemplo:

```text
radius = 1
```

solo entidades directamente relacionadas.

```text
radius = 2
```

incluye relaciones secundarias.

---

# 77. Example

Para:

```text
Varek
```

Radius 1:

```text
Faction
Location
Enemy
```

Radius 2:

```text
Faction members
Faction enemies
Location inhabitants
Enemy relationships
```

---

# 78. Avoid Context Explosion

Nunca aumentar el radio indefinidamente.

Debe existir:

```text
max_relationship_depth
```

---

# 79. Context Relevance Score

Conceptualmente:

```text
score =
semantic_relevance
+
temporal_relevance
+
entity_relevance
+
location_relevance
+
canon_priority
```

Los pesos serán configurables.

---

# 80. Context Safety

El sistema debe filtrar información antes de entregarla.

Pipeline:

```text
Retrieve
 ↓
Classify
 ↓
Permission Filter
 ↓
Priority Filter
 ↓
Budget Filter
 ↓
Agent
```

---

# 81. Permission Context

Cada agente debe tener un nivel.

Ejemplo:

```text
PLAYER
DM
SYSTEM
DEBUG
```

---

# 82. Player Context

Puede acceder a:

```text
PUBLIC
PLAYER_KNOWN
CHARACTER_KNOWN
```

No:

```text
DM_ONLY
SECRET
```

salvo que la historia haya revelado ese dato.

---

# 83. DM Context

Puede acceder a:

```text
PUBLIC
PLAYER_KNOWN
CHARACTER_KNOWN
DM_ONLY
SECRET
```

---

# 84. Debug Context

Puede acceder a:

```text
Everything
```

pero solamente para herramientas internas.

---

# 85. Context Audit

Cada agente debería poder registrar:

```text
What context was provided?
What sources were used?
What entities were retrieved?
What events were retrieved?
```

---

# 86. Context Trace

Ejemplo:

```text
Task:
Generate recap.

Context:
session-014
event-201
event-202
event-203
character-ardan
quest-03
```

Esto permite depurar respuestas incorrectas.

---

# 87. Hallucination Detection

Después de una generación se puede verificar:

```text
Generated Claim
 ↓
Search Canon
 ↓
Evidence Found?
```

Si no:

```text
UNSUPPORTED CLAIM
```

---

# 88. Claim Verification

Las respuestas importantes pueden dividirse:

```text
Claim 1
Claim 2
Claim 3
```

y verificar cada una.

Esto puede reservarse para operaciones críticas para no aumentar costos.

---

# 89. Context Modes

El sistema puede poseer modos:

```text
FAST
BALANCED
DEEP
```

---

# 90. FAST

Utiliza:

```text
Current State
+
Recent Session
+
Top Entities
```

Ideal para:

- UI;
- consultas rápidas;
- runtime.

---

# 91. BALANCED

Utiliza:

```text
Current State
+
Relevant Entities
+
Relevant Events
+
Historical Context
```

Ideal para:

- DM assistant;
- recap;
- scene generation.

---

# 92. DEEP

Utiliza:

```text
Broad Retrieval
+
Historical Sources
+
Relationship Graph
+
Evidence
+
Conflict Detection
```

Ideal para:

- lore research;
- campaign analysis;
- debugging;
- reconstrucción histórica.

---

# 93. Default Mode

El sistema debería utilizar:

```text
BALANCED
```

por defecto.

---

# 94. Context Configuration

Configuración conceptual:

```yaml
context:
  default_mode: balanced

  budgets:
    fast: 4000
    balanced: 10000
    deep: 20000

  retrieval:
    semantic: true
    keyword: true
    metadata: true

  max_relationship_depth: 2
```

Los valores reales serán definidos durante implementación.

---

# 95. Local-First Principle

El sistema de contexto debe funcionar localmente.

No depender de:

```text
Cloud Vector DB
Cloud Database
Paid Search API
Paid Memory API
```

---

# 96. Lightweight Storage

Prioridad:

```text
SQLite
+
Markdown
+
Local Files
```

---

# 97. Vector Search Optional

El sistema debe poder funcionar inicialmente sin embeddings.

Modo inicial:

```text
SQLite FTS
+
Metadata
+
Entity Relations
```

Posteriormente:

```text
+
Embeddings
```

---

# 98. Progressive Retrieval Architecture

Fase 1:

```text
Markdown
+
SQLite
+
FTS
```

Fase 2:

```text
+
Embeddings
```

Fase 3:

```text
+
Graph Retrieval
```

No implementar todo desde el principio.

---

# 99. Context File Generation

Cuando cambia el estado:

```text
Database
 ↓
Context Generator
 ↓
Markdown
```

Ejemplo:

```text
current-state.md
```

se actualiza automáticamente.

---

# 100. Human Readability

Los archivos `.md` deben poder ser leídos directamente por una persona.

No generar:

```text
JSON gigantesco
```

como única representación.

---

# 101. Machine Readability

Los agentes pueden consumir:

```text
Markdown
JSON
SQLite
Tool Responses
```

dependiendo de la tarea.

---

# 102. Markdown as Stable Interface

Los `.md` funcionan como una interfaz estable entre:

```text
Database
```

y:

```text
AI Agents
```

Esto permite cambiar internamente la base sin modificar todos los prompts.

---

# 103. Context API

En el futuro puede existir una API interna:

```text
/context/campaign
/context/current-state
/context/session/:id
/context/entity/:id
/context/location/:id
/context/search
```

---

# 104. Context Builder

Conceptualmente:

```text
ContextBuilder
    ├── CampaignProvider
    ├── StateProvider
    ├── EntityProvider
    ├── EventProvider
    ├── SourceProvider
    ├── SearchProvider
    └── PermissionFilter
```

---

# 105. Separation of Concerns

El agente NO debe conocer:

```text
SQLite
File paths
Vector database
SQL queries
```

Debe recibir una interfaz de contexto.

---

# 106. Agent Interface

Conceptualmente:

```text
Agent
 ↓
Context Service
 ↓
Retrieval
 ↓
Storage
```

---

# 107. Benefits

Esto permite posteriormente cambiar:

```text
SQLite
```

por:

```text
PostgreSQL
```

sin modificar el agente.

También:

```text
Local Embeddings
```

por:

```text
Remote Embeddings
```

sin cambiar el sistema narrativo.

---

# 108. Context Invalidation

Cambios que pueden invalidar contexto:

```text
Character state changed
Location changed
Quest changed
Session approved
Canon changed
Secret revealed
Retcon applied
```

---

# 109. Context Rebuild

No reconstruir todo.

Determinar:

```text
Affected Context
```

y actualizar únicamente lo necesario.

---

# 110. Example

Si:

```text
Varek dies.
```

actualizar:

```text
Varek
Current State
Party Relationships
Relevant Quests
Current Location
Recent Events
```

No necesariamente:

```text
Entire Campaign Context
```

---

# 111. Context Dependency

Cada contexto puede declarar dependencias.

Ejemplo:

```text
current-state.md

depends_on:
- session-014
- event-201
- event-202
- character-ardan
- npc-varek
```

---

# 112. Context Rebuild Graph

```text
Event
 ↓
Entity State
 ↓
Quest State
 ↓
Current State
 ↓
Scene Context
```

Si cambia el Event:

```text
rebuild downstream contexts
```

---

# 113. Context Freshness

Cada contexto debería tener:

```text
generated_at
source_version
state_version
```

---

# 114. Stale Context

Si:

```text
context.state_version != current.state_version
```

marcar:

```text
STALE
```

---

# 115. Never Trust Stale Critical Context

Para información crítica:

```text
STALE
```

debe provocar regeneración.

---

# 116. Context Warmup

Al iniciar una party:

```text
Load:
campaign
current-state
current-session
party
current-location
active-threads
```

Esto puede mantenerse en memoria.

---

# 117. Party Runtime Context

Durante la partida:

```text
Party Context
+
Current Scene Context
```

permanece caliente.

---

# 118. Dynamic Runtime Context

Cuando ocurre algo:

```text
Player opens door
```

actualizar:

```text
Current Scene
Environment
Event
World State
```

No reconstruir todo el contexto global.

---

# 119. DM Live Context

El panel del DM puede mostrar:

```text
Current Context
```

incluyendo:

```text
Characters
Location
Events
Secrets
Potential Consequences
```

---

# 120. Context Suggestions

El sistema puede sugerir:

```text
"You may want to load information about NPC X."
```

pero el agente decide si necesita solicitarla.

---

# 121. Context Prefetch

Para escenas conocidas:

```text
Current Location
+
Expected NPCs
+
Active Quest
```

pueden precargarse.

Esto reduce latencia.

---

# 122. Context Prefetch Example

Si el DM cambia a:

```text
Castle Throne Room
```

precargar:

```text
Castle
Throne Room
King
Guard Captain
Royal Faction
Relevant Quest
Recent Events
Visual Assets
```

---

# 123. Context for 3D Engine

El motor visual recibe un contexto específico:

```text
scene_context
```

Ejemplo:

```yaml
location: throne-room
state: occupied
time: night
weather: rain
lighting: torchlight
characters:
  - ardan
  - varek
npcs:
  - guard-captain
effects:
  - rain
  - fog
```

---

# 124. Context for Audio

El sistema de audio recibe:

```text
audio_context
```

Ejemplo:

```text
Location:
Cavern

Environment:
Underground

Characters:
Party

Mood:
Tense

Events:
Creature approaching
```

---

# 125. Context for Video

El sistema de video recibe:

```text
video_context
```

Ejemplo:

```text
Scene:
Ancient gate opening

Mood:
Epic

Duration:
10 sec

Environment:
Underground vault

Visual Elements:
Stone gate
Runes
Dust
Light
```

---

# 126. Context for Recap

El sistema de recap recibe:

```text
recap_context
```

Ejemplo:

```text
Session
Approved Events
Character Changes
Quest Changes
Important Discoveries
Consequences
```

---

# 127. Context for Narrator

El narrador recibe:

```text
narration_context
```

Ejemplo:

```text
Current Scene
Recent Action
Environment
Relevant Lore
Tone
Characters
```

---

# 128. Context for DM Assistant

El DM Assistant recibe:

```text
dm_context
```

Ejemplo:

```text
Current State
Relevant Lore
Secrets
Open Threads
NPC Motivations
Potential Consequences
```

---

# 129. Context Security

Aunque el sistema sea local, debe existir separación lógica.

Nunca asumir:

```text
local = no security needed
```

---

# 130. Secret Isolation

Los secretos deben tener identificadores y permisos.

Ejemplo:

```text
secret-001
scope = DM_ONLY
```

---

# 131. Context Export

Debe poder exportarse:

```text
campaign-context.zip
```

conteniendo únicamente los archivos necesarios.

Esto facilita:

- backups;
- compartir con agentes;
- debugging;
- migración.

---

# 132. Context Backup

Los archivos de contexto pueden regenerarse desde:

```text
SQLite
+
Sources
```

Por lo tanto:

> El Contexto es reconstruible.

---

# 133. Context as Cache

Los `.md` de contexto deben considerarse:

```text
DERIVED CACHE
```

cuando son generados automáticamente.

---

# 134. Manual Context

Algunos archivos sí pueden ser manuales.

Ejemplo:

```text
manual/
├── campaign-rules.md
├── canon-overrides.md
└── dm-guidelines.md
```

Estos no deben ser sobrescritos automáticamente.

---

# 135. Context Priority

Orden general:

```text
Manual Canon
>
Approved Canon
>
Current State
>
Session History
>
Source Evidence
>
Inference
```

---

# 136. Context Conflict

Si dos contextos contradicen:

```text
Do not silently merge.
```

Crear:

```text
CONFLICT
```

y permitir revisión.

---

# 137. Context Explainability

El sistema debe poder responder:

> ¿Por qué la IA cree esto?

Respuesta:

```text
Based on:
Session 12
Event 381
Character relationship
DM Canon
```

---

# 138. Context Debug View

La interfaz futura debería permitir:

```text
Agent Request
        ↓
Context Retrieved
        ↓
Sources
        ↓
Ranking
        ↓
Final Prompt Context
```

---

# 139. Context Metrics

Registrar:

```text
context_size
retrieval_count
cache_hits
cache_misses
retrieval_latency
generation_latency
```

---

# 140. Cost Metrics

Si se utilizan modelos externos:

```text
input_tokens
output_tokens
estimated_cost
```

---

# 141. Performance Target

El sistema debe priorizar:

```text
Small Context
+
Local Retrieval
+
Cached Data
+
Incremental Updates
```

antes de intentar optimizaciones complejas.

---

# 142. Initial Implementation

La primera versión debe implementar solamente:

```text
Markdown Context
SQLite
FTS
Current State
Entity Retrieval
Event Retrieval
Session Retrieval
Context Builder
```

---

# 143. Phase 2

Agregar:

```text
Embeddings
Vector Search
Semantic Ranking
```

---

# 144. Phase 3

Agregar:

```text
Graph Retrieval
Advanced Context Ranking
Automatic Context Optimization
```

---

# 145. Phase 4

Agregar:

```text
Adaptive Context
Agent Self-Retrieval
Context Learning
Predictive Prefetch
```

---

# 146. Important Constraint

No implementar un sistema de memoria extremadamente complejo durante el MVP.

Primero demostrar:

```text
Campaign
 ↓
Lore
 ↓
Context
 ↓
Agent
```

funcionando correctamente.

---

# 147. MVP Success Criteria

El sistema debe poder responder:

```text
Who is this character?
```

sin leer toda la campaña.

Debe poder responder:

```text
What happened last session?
```

sin cargar todas las sesiones.

Debe poder preparar:

```text
Current scene
```

utilizando solamente el contexto relevante.

Debe poder ocultar:

```text
DM secrets
```

cuando corresponde.

---

# 148. Final Architecture

Conceptualmente:

```text
                    ┌──────────────┐
                    │   SOURCES    │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    LORE      │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ WORLD STATE  │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   CONTEXT    │
                    │   BUILDER    │
                    └──────┬───────┘
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
           NARRATIVE      VISUAL        AUDIO
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                         AGENT
```

---

# 149. Fundamental Rule

El sistema debe seguir siempre esta regla:

> Retrieve what is relevant, not everything that exists.

---

# 150. Final Objective

El Context System debe permitir que una campaña pueda crecer desde:

```text
5 sessions
```

hasta:

```text
500+ sessions
```

sin que el contexto necesario para una tarea individual crezca
proporcionalmente con toda la campaña.

La complejidad debe resolverse mediante:

```text
Retrieval
+
Hierarchy
+
Summaries
+
Caching
+
Metadata
+
Permissions
+
Temporal State
+
Source References
```

y no mediante prompts gigantes.
