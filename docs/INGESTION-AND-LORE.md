# INGESTION-AND-LORE.md

> Especificación del sistema de ingestión, normalización y construcción del Lore
> de RPG World Engine.
>
> Define cómo incorporar el historial existente de una campaña y cómo convertir
> información narrativa heterogénea en conocimiento estructurado, verificable,
> consultable y reutilizable por humanos y agentes de IA.
>
> Este documento se enfoca especialmente en la carga histórica inicial de una
> campaña ya comenzada.

---

# 1. Propósito

RPG World Engine no necesariamente comienza con una campaña vacía.

Una campaña puede poseer:

- sesiones anteriores;
- recaps;
- notas del DM;
- notas de jugadores;
- documentos;
- imágenes;
- mapas;
- audios;
- videos;
- fichas;
- mensajes;
- información parcial;
- información contradictoria;
- nombres escritos de diferentes maneras;
- acontecimientos todavía no estructurados.

El sistema debe poder incorporar todo ese material progresivamente.

---

# 2. Problema principal

El sistema NO debe intentar:

```text
Todos los documentos
        ↓
Un único prompt gigante
        ↓
"Entiende toda la campaña"
```

Esto produciría:

- alto consumo de tokens;
- alto costo;
- pérdida de contexto;
- mayor probabilidad de alucinaciones;
- dificultad para actualizar información;
- dificultad para detectar contradicciones;
- imposibilidad práctica de mantener todo en contexto.

---

# 3. Estrategia

La campaña debe convertirse progresivamente en diferentes capas de conocimiento.

```text
RAW SOURCES
    ↓
NORMALIZED DOCUMENTS
    ↓
EXTRACTED ENTITIES
    ↓
EXTRACTED EVENTS
    ↓
RELATIONSHIPS
    ↓
CANON
    ↓
WORLD STATE
    ↓
DERIVED SUMMARIES
```

La IA no necesita leer todo nuevamente después de cada modificación.

---

# 4. Fuente de verdad

La información original debe conservarse.

Nunca destruir la fuente original después de procesarla.

Ejemplo:

```text
imports/
└── session-001-original.txt
```

La información estructurada se genera adicionalmente.

```text
data/
└── campaign.db
```

Por lo tanto:

```text
SOURCE ≠ DATABASE
```

La fuente es evidencia.

La base representa el conocimiento estructurado.

---

# 5. Principio Source First

Toda información importante debería poder responder:

> ¿De dónde salió esto?

Ejemplo:

```text
Character:
Varek

Source:
Session 03 recap

Confidence:
High
```

---

# 6. Tipos de fuentes

El sistema debe reconocer inicialmente:

```text
DM_NOTE
PLAYER_NOTE
SESSION_RECAP
SESSION_TRANSCRIPT
AUDIO_TRANSCRIPT
CHAT_LOG
IMAGE
MAP
PDF
MARKDOWN
TEXT
CHARACTER_SHEET
MANUAL_ENTRY
EXTERNAL_REFERENCE
```

---

# 7. Prioridad de fuentes

No todas las fuentes tienen la misma autoridad.

Prioridad inicial:

```text
1. DM Canon / Manual
2. DM Session Notes
3. Approved Session Transcript
4. Approved Recap
5. Player Notes
6. Player Recap
7. AI Extraction
8. AI Inference
```

Esta prioridad no significa que una fuente inferior sea necesariamente incorrecta.

Significa que ante un conflicto debe recibir menor autoridad inicial.

---

# 8. Importación incremental

La campaña debe cargarse progresivamente.

No es necesario cargar todo el historial en una única operación.

Ejemplo:

```text
Session 01
    ↓
Process
    ↓
Approve
    ↓
Session 02
    ↓
Process
    ↓
Approve
    ↓
Session 03
...
```

---

# 9. Orden histórico

Cuando sea posible, procesar las sesiones cronológicamente.

Ejemplo:

```text
2025-12-01
2025-12-08
2025-12-15
...
```

No asumir que todas las fechas son consecutivas.

---

# 10. Session Number

La sesión debe poseer:

```text
session_number
```

pero no depender únicamente de él.

Puede existir:

```text
Session 12
real_date = 2026-04-18
```

aunque entre Session 11 y 12 haya pasado un mes.

---

# 11. Initial Campaign Import

La carga inicial debe dividirse en fases.

```text
PHASE 0
Inventory

PHASE 1
Source Import

PHASE 2
Document Normalization

PHASE 3
Entity Extraction

PHASE 4
Event Extraction

PHASE 5
Relationship Extraction

PHASE 6
Canon Review

PHASE 7
World State Reconstruction

PHASE 8
Validation
```

---

# 12. Phase 0 — Inventory

Antes de procesar contenido:

```text
listar archivos
identificar formatos
identificar sesiones
identificar fechas
identificar autores
identificar duplicados
```

No interpretar todavía el lore.

---

# 13. Inventory Output

El sistema debe producir algo similar a:

```text
Campaign Inventory

Sessions:
12

Documents:
27

Images:
42

Audio:
8

Maps:
6

Character Sheets:
7

Unknown:
3
```

---

# 14. Source Classification

Cada archivo debe clasificarse.

Ejemplo:

```text
session_01.txt
→ SESSION_RECAP

map_castle.png
→ MAP

character_ardan.pdf
→ CHARACTER_SHEET
```

Si no se puede determinar:

```text
UNKNOWN
```

No inventar.

---

# 15. Duplicate Detection

Los archivos deben identificarse mediante hash.

Ejemplo:

```text
SHA-256
```

Si:

```text
file_A.hash == file_B.hash
```

probablemente son duplicados.

No procesar dos veces sin necesidad.

---

# 16. Near Duplicate Detection

También pueden existir documentos similares pero no idénticos.

Ejemplo:

```text
recap_v1.md
recap_final.md
recap_final2.md
```

La IA puede detectar similitud y proponer:

```text
POSSIBLE_DUPLICATE
```

El usuario decide cuál es válido.

---

# 17. Original Preservation

Nunca sobrescribir:

```text
original_source
```

Las transformaciones deben producir nuevas representaciones.

Ejemplo:

```text
original.txt
normalized.md
extracted.json
```

---

# 18. Normalization

La normalización transforma formatos heterogéneos en una representación común.

Ejemplo:

```text
PDF
TXT
DOCX
CHAT
```

pueden terminar como:

```text
Normalized Document
```

---

# 19. Normalized Document

Debe contener conceptualmente:

```text
document_id
source_id
title
author
date
content
sections
metadata
hash
```

---

# 20. No Canonizar Durante Normalization

Normalizar NO significa interpretar.

Ejemplo:

```text
"Varek entró a la torre"
```

debe permanecer como texto.

No convertir inmediatamente en:

```text
Varek.current_location = Tower
```

Eso pertenece a la extracción.

---

# 21. Segmentation

Los documentos largos deben dividirse en fragmentos.

Ejemplo:

```text
Session 08
├── Introduction
├── Scene 01
├── Combat
├── Exploration
├── NPC interaction
└── Ending
```

---

# 22. Chunking

El chunking debe respetar estructura narrativa cuando sea posible.

Preferencia:

```text
paragraph
section
scene
dialogue block
```

antes que dividir arbitrariamente por número de caracteres.

---

# 23. Chunk Metadata

Cada fragmento debe conservar:

```text
document_id
section
sequence
start_offset
end_offset
```

Esto permite regresar a la fuente original.

---

# 24. Context Window

Los agentes no deberían recibir:

```text
Entire Campaign
```

en cada consulta.

Deben recibir:

```text
Relevant Context
```

---

# 25. Context Retrieval

Una consulta puede recuperar:

```text
Current Session
+
Relevant Characters
+
Relevant Locations
+
Relevant Events
+
Relevant Relationships
+
Relevant Sources
```

---

# 26. Entity Extraction

La IA debe identificar entidades.

Tipos iniciales:

```text
CHARACTER
NPC
FACTION
LOCATION
ITEM
CREATURE
QUEST
SECRET
EVENT
CONCEPT
```

---

# 27. Entity Candidate

La primera extracción no crea necesariamente una entidad definitiva.

Ejemplo:

```text
Candidate:

name = "El Guardián"
type = NPC
source = Session 04
```

Estado:

```text
CANDIDATE
```

---

# 28. Entity Resolution

El sistema debe determinar si:

```text
"El Guardián"
```

es la misma entidad que:

```text
"Guardián de la Torre"
```

o:

```text
"Guardian"
```

---

# 29. Entity Matching

El matching puede utilizar:

```text
Exact Name
Aliases
Context
Description
Relationships
Location
Temporal Context
Semantic Similarity
```

---

# 30. Confidence

El sistema debe producir una confianza.

Ejemplo:

```text
"El Guardián"
≈
"Guardián de la Torre"

confidence = 0.91
```

---

# 31. Entity Merge

Nunca fusionar automáticamente entidades importantes con baja confianza.

Ejemplo:

```text
confidence < 0.80
```

→ solicitar revisión.

Los thresholds concretos podrán configurarse.

---

# 32. Aliases

Una entidad puede tener múltiples nombres.

Ejemplo:

```text
Varek

Aliases:
- El Cuervo
- Varek de las Sombras
- El mercenario
```

Esto mejora:

- búsqueda;
- extracción;
- resolución;
- generación de texto.

---

# 33. Entity Canonical Name

Cada entidad debe tener un nombre principal.

Ejemplo:

```text
canonical_name:
Varek
```

Los demás son aliases.

---

# 34. Entity Description

No reemplazar automáticamente una descripción anterior.

Preferir:

```text
Description Version
```

o historial de cambios.

---

# 35. Temporal Entity State

Una entidad puede cambiar.

Ejemplo:

```text
NPC:
Alive
```

después:

```text
Dead
```

No sobrescribir la historia.

El estado actual es derivado de eventos.

---

# 36. Entity First Seen

Registrar:

```text
first_seen_session
```

Ejemplo:

```text
Varek
First Seen:
Session 03
```

---

# 37. Entity Last Seen

Registrar:

```text
last_seen_session
```

Esto permite consultas como:

> ¿Cuándo vimos por última vez a Varek?

---

# 38. Event Extraction

A partir de cada documento:

```text
Text
 ↓
Event Candidates
```

Ejemplo:

```text
"The party entered the crypt."

→ PARTY_ENTERED_LOCATION
```

---

# 39. Event Extraction Rules

La IA debe distinguir:

```text
FACT
POSSIBILITY
RUMOR
HYPOTHESIS
PROPHECY
DIALOGUE
```

Ejemplo:

```text
"El anciano dice que el rey está muerto."
```

NO necesariamente significa:

```text
KING_DIED
```

Puede significar:

```text
RUMOR
```

---

# 40. Epistemic Status

Los datos narrativos pueden tener:

```text
CONFIRMED
UNCONFIRMED
RUMOR
SPECULATION
PROPHECY
LIE
UNKNOWN
```

Esto es fundamental para evitar que la IA convierta rumores en hechos.

---

# 41. Character Knowledge

Separar:

```text
World Fact
```

de:

```text
Character Belief
```

Ejemplo:

```text
WORLD:
The king is alive.

CHARACTER KNOWLEDGE:
Party believes the king is dead.
```

Ambos pueden coexistir.

---

# 42. Secret Handling

Los secretos deben poseer:

```text
Secret
Knowledge Holders
Discovery Event
Source
Status
```

---

# 43. Hidden Information

La IA no debe entregar automáticamente secretos a los jugadores.

El contexto debe clasificarse:

```text
DM_ONLY
CHARACTER_KNOWN
PLAYER_KNOWN
PUBLIC
```

---

# 44. Lore Layers

El Lore debe organizarse en capas.

```text
LAYER 1
World Canon

LAYER 2
Campaign Canon

LAYER 3
Session History

LAYER 4
Character Knowledge

LAYER 5
DM Secrets

LAYER 6
Speculation / Candidates
```

---

# 45. Canon

Canon significa:

> Información oficialmente aceptada como verdadera dentro de la campaña.

Solo debe ingresar a Canon mediante:

```text
DM
```

o:

```text
Approved Process
```

según la política de automatización.

---

# 46. Candidate Lore

Información aún no confirmada:

```text
Candidate Entity
Candidate Event
Candidate Relationship
Candidate Secret
```

Debe permanecer separada del canon.

---

# 47. AI Inference

Las inferencias deben identificarse explícitamente.

Ejemplo:

```text
Inference:
"The black symbol may belong to the Shadow Cult."

confidence = 0.63
```

Esto no es canon.

---

# 48. Inference Policy

La IA puede utilizar inferencias para:

- sugerencias;
- búsqueda;
- recomendaciones;
- preparación de escenas;

pero no debe presentarlas como hechos.

---

# 49. Contradiction Detection

Después de procesar cada sesión:

```text
New Knowledge
      ↓
Compare Existing Canon
      ↓
Detect Conflicts
```

---

# 50. Conflict Types

```text
NAME_CONFLICT
DATE_CONFLICT
LOCATION_CONFLICT
ALIVE_DEAD_CONFLICT
OWNERSHIP_CONFLICT
RELATIONSHIP_CONFLICT
EVENT_ORDER_CONFLICT
LORE_CONFLICT
```

---

# 51. Conflict Example

Existing:

```text
Varek died in Session 04.
```

New:

```text
Session 07:
Varek spoke with the party.
```

Resultado:

```text
CONTRADICTION
```

No resolver automáticamente.

---

# 52. Conflict Resolution

El DM debe poder elegir:

```text
SOURCE_A_IS_CORRECT
SOURCE_B_IS_CORRECT
BOTH_VALID
RETCON
UNKNOWN
```

---

# 53. Both Valid

Algunos conflictos aparentes pueden tener explicación.

Ejemplo:

```text
"Varek murió."
```

y:

```text
"Varek apareció."
```

Podría tratarse de:

```text
Clone
Illusion
Undead
Impostor
Different Varek
```

La IA puede sugerir hipótesis.

Nunca establecerlas automáticamente.

---

# 54. Historical Reconstruction

Una vez procesadas varias sesiones:

```text
Session 01
Session 02
Session 03
...
Session N
```

el sistema puede reconstruir:

```text
Characters
Locations
Quests
Relationships
Events
Knowledge
Current State
```

---

# 55. Current World State

El estado actual se obtiene de:

```text
Initial State
+
Approved Events
```

No de:

```text
Last Recap
```

---

# 56. World State Checkpoint

Después de una sesión aprobada:

```text
Session 08
 ↓
Approved Events
 ↓
World State
 ↓
Snapshot
```

Esto permite comenzar la próxima sesión desde un punto conocido.

---

# 57. Historical Map

Cada ubicación debe poder tener:

```text
First Discovered
Visited Sessions
Current State
Previous States
Related Events
Related Characters
```

---

# 58. Map Relevance

No todas las ubicaciones deben permanecer cargadas en runtime.

Diferenciar:

```text
ACTIVE LOCATION
RECENT LOCATION
HISTORICAL LOCATION
UNKNOWN LOCATION
```

---

# 59. Current Map

El runtime debe cargar prioritariamente:

```text
Current Location
+
Nearby Relevant Locations
```

No todo el mundo.

---

# 60. Historical Maps

Los mapas anteriores permanecen almacenados.

Pero pueden marcarse:

```text
ACTIVE = false
```

si el grupo ya no se encuentra allí.

---

# 61. Revisit

Si el grupo vuelve a una ubicación histórica:

```text
Historical Location
       ↓
Activate Location
       ↓
Load Previous State
       ↓
Apply New Events
       ↓
Current Scene
```

No generar una ubicación nueva si ya existe.

---

# 62. Location Identity

La ubicación debe conservar su identidad aunque cambie visualmente.

Ejemplo:

```text
Castle of Varek
```

puede tener:

```text
Scene Version 1
Scene Version 2
Scene Destroyed
Scene Rebuilt
```

La Location sigue siendo la misma entidad.

---

# 63. Scene History

Las escenas pueden cambiar con el tiempo.

Ejemplo:

```text
Castle
 ├── peaceful
 ├── damaged
 ├── burning
 └── rebuilt
```

Esto se representa mediante estados/versiones de escena.

---

# 64. Lore and Visual Assets

Una imagen no debe convertirse automáticamente en canon.

Ejemplo:

```text
Image:
Dark Castle

Possible interpretation:
Castle of Varek
```

Estado:

```text
CANDIDATE
```

hasta confirmar.

---

# 65. Image Analysis

La IA puede extraer:

- objetos;
- arquitectura;
- colores;
- personajes;
- símbolos;
- clima;
- iluminación;
- composición.

Pero debe diferenciar:

```text
VISUAL OBSERVATION
```

de:

```text
LORE INTERPRETATION
```

---

# 66. Example

Image shows:

```text
red banner
```

Observation:

```text
"red banner visible"
```

Inference:

```text
"possibly faction X"
```

Canon:

```text
"Banner belongs to faction X"
```

Solo el último requiere confirmación.

---

# 67. Session Processing

El pipeline recomendado para cada sesión:

```text
1. Import source
2. Normalize
3. Segment
4. Extract entities
5. Resolve entities
6. Extract events
7. Extract relationships
8. Detect knowledge
9. Detect contradictions
10. Generate candidates
11. DM review
12. Approve
13. Apply
14. Snapshot
15. Generate recap
```

---

# 68. Incremental Processing

Si una sesión ya fue procesada:

```text
DO NOT REPROCESS EVERYTHING
```

Utilizar:

```text
source_hash
```

Si no cambió:

```text
SKIP
```

---

# 69. Changed Source

Si el documento cambió:

```text
old_hash != new_hash
```

marcar:

```text
SOURCE_CHANGED
```

y reprocesar únicamente lo necesario.

---

# 70. Partial Reprocessing

Idealmente:

```text
Changed Chunk
     ↓
Re-extract
     ↓
Compare
     ↓
Update Candidates
```

No recalcular toda la campaña.

---

# 71. Lore Documents

Además de SQLite, el sistema puede mantener documentos Markdown derivados.

Ejemplo:

```text
lore/
├── world.md
├── characters/
├── npcs/
├── factions/
├── locations/
├── quests/
├── items/
├── sessions/
└── secrets/
```

---

# 72. Markdown as AI Context

Los archivos Markdown son especialmente útiles como contexto económico.

Pero deben ser:

```text
DERIVED
```

y no reemplazar la base estructurada.

---

# 73. Context Files

Cada entidad puede tener un resumen compacto.

Ejemplo:

```text
lore/characters/varek.md
```

Contenido aproximado:

```text
# Varek

## Identity

...

## Current State

...

## Important History

...

## Relationships

...

## Known Secrets

...

## Recent Events

...

## Sources

...
```

---

# 74. Context Granularity

No crear un único:

```text
LORE.md
```

gigantesco.

Preferir:

```text
world.md

characters/
npcs/
locations/
factions/
quests/
sessions/
```

---

# 75. Context Packs

Para una consulta concreta, generar un Context Pack.

Ejemplo:

```text
context/
current-session.md
current-location.md
party.md
active-quests.md
relevant-npcs.md
```

---

# 76. Context Pack Example

Para una escena en una taberna:

```text
current-location.md
party.md
recent-events.md
relevant-npcs.md
active-quests.md
local-faction.md
```

No incluir:

```text
entire_world_history.md
```

---

# 77. Context Budget

Cada agente debe recibir un presupuesto.

Ejemplo conceptual:

```text
System Context
+
Task Context
+
Relevant Lore
+
Current State
```

No cargar información irrelevante.

---

# 78. Retrieval Priority

Cuando se necesita contexto:

```text
1. Current World State
2. Current Scene
3. Current Characters
4. Recent Events
5. Related Entities
6. Historical Events
7. Global Lore
8. Optional Background
```

---

# 79. Agent Context

Un agente especializado puede recibir solamente:

```text
Current Session
+
Relevant Events
+
Relevant Entities
+
Task
```

---

# 80. Agent Separation

No todos los agentes necesitan conocer todo.

Ejemplo:

```text
Extraction Agent
→ Source

Lore Agent
→ Entities + Events

Recap Agent
→ Approved Events

Scene Agent
→ Current Location + Visual Metadata

Narrator Agent
→ Approved Narrative Events

DM Assistant
→ Broad Campaign Context
```

---

# 81. Preventing Hallucinations

Antes de afirmar un dato, el agente debería buscar:

```text
CANON
```

Si no existe:

```text
CANDIDATE
```

Si tampoco:

```text
UNKNOWN
```

No inventar.

---

# 82. Unknown State

El sistema debe permitir:

```text
UNKNOWN
```

como respuesta válida.

Ejemplo:

> ¿Quién construyó la torre?

Respuesta:

```text
UNKNOWN

No confirmed source found.
```

---

# 83. Source Citation

Cuando la IA entregue información importante debe poder indicar:

```text
Source:
Session 05

Event:
event-123
```

Esto permite al DM verificarla.

---

# 84. Lore Summary Generation

Los Markdown derivados pueden regenerarse.

Ejemplo:

```text
Events
 ↓
Entity State
 ↓
Summary Generator
 ↓
character/varek.md
```

El Markdown no debería ser editado automáticamente como si fuera la fuente original.

---

# 85. Manual Lore Override

El DM puede poseer documentos especiales:

```text
manual/
```

Estos sí pueden actuar como autoridad superior.

Ejemplo:

```text
manual/canon.md
manual/world-rules.md
manual/character-overrides.md
```

---

# 86. Canon Overrides

Un override puede decir:

```text
Varek is alive.
```

Esto puede prevalecer sobre inferencias históricas.

Pero debe quedar registrado.

---

# 87. Lore Maintenance

Después de cada sesión:

```text
New Session
 ↓
Update Entities
 ↓
Update Events
 ↓
Update Relationships
 ↓
Update Current State
 ↓
Regenerate relevant Markdown
```

No regenerar todos los documentos innecesariamente.

---

# 88. Historical Campaign Import Strategy

Para una campaña ya avanzada:

```text
STEP 1
Import all sources.

STEP 2
Identify sessions.

STEP 3
Process sessions chronologically.

STEP 4
Extract entities.

STEP 5
Resolve duplicates.

STEP 6
Extract events.

STEP 7
Review important events.

STEP 8
Build current state.

STEP 9
Generate lore Markdown.

STEP 10
Validate current campaign.
```

---

# 89. Do Not Require Perfect Historical Import

La campaña no necesita quedar 100% estructurada antes de utilizar el sistema.

Puede existir:

```text
Session 01
100% processed

Session 02
80% processed

Session 03
50% processed

Session 04
not processed
```

El sistema debe continuar funcionando.

---

# 90. Progressive Enrichment

Una entidad puede comenzar como:

```text
Varek
NPC
```

y posteriormente obtener:

```text
Description
Faction
Relationships
History
Secrets
Visual
Voice
Current Location
```

No exigir toda la información desde el principio.

---

# 91. Minimum Viable Entity

Una entidad puede existir con:

```text
id
name
type
source
```

Todo lo demás puede agregarse posteriormente.

---

# 92. Minimum Viable Event

Un evento puede comenzar con:

```text
id
type
source
description
```

y posteriormente enriquecerse con:

```text
actor
target
location
time
payload
relationships
consequences
```

---

# 93. Campaign Bootstrap

La primera importación puede crear:

```text
Campaign
├── Sessions
├── Characters
├── NPCs
├── Locations
├── Events
└── Sources
```

sin necesidad de tener todavía:

```text
3D
AI Voice
Procedural Generation
```

---

# 94. Validation Report

Después de la carga inicial se debe generar un reporte.

Ejemplo:

```text
CAMPAIGN IMPORT REPORT

Sessions:
14

Entities:
87

Events:
436

Relationships:
192

Sources:
31

Potential Duplicates:
7

Contradictions:
4

Unresolved Entities:
11

Low Confidence Events:
23

Missing Dates:
3
```

---

# 95. DM Review Queue

El reporte debe producir una cola:

```text
HIGH PRIORITY
├── 4 contradictions
├── 7 possible duplicates
└── 3 identity conflicts

MEDIUM
├── 11 unresolved entities
└── 23 low confidence events

LOW
└── Missing metadata
```

---

# 96. Import Resume

Si el proceso se interrumpe:

```text
Session 01 ✓
Session 02 ✓
Session 03 ✓
Session 04 processing...
```

debe poder continuar.

No comenzar desde cero.

---

# 97. Import Logs

Registrar:

```text
source
started
completed
duration
status
errors
warnings
agent
model
```

---

# 98. Cost Control

La ingestión debe minimizar tokens.

No enviar repetidamente:

```text
Entire Campaign
```

al modelo.

Utilizar:

```text
Chunking
+
Incremental Processing
+
Caching
+
Hashes
+
Structured Context
+
Markdown Summaries
```

---

# 99. Local-First AI

El sistema debe poder funcionar inicialmente sin una IA externa obligatoria.

Opciones futuras:

```text
Local Model
Remote Model
Hybrid
```

La arquitectura debe abstraer el proveedor.

---

# 100. AI Provider Abstraction

Conceptualmente:

```text
AI Provider
├── Local
├── OpenAI-compatible
├── Other API
└── Mock
```

El resto del sistema no debe depender directamente de un proveedor concreto.

---

# 101. Offline Mode

El sistema debería continuar permitiendo:

```text
browse lore
view campaign
view maps
view characters
view events
view sessions
```

sin conexión.

Las funciones que requieran IA pueden quedar:

```text
PENDING
```

---

# 102. Import Queue

Las nuevas fuentes pueden entrar en:

```text
IMPORT QUEUE
```

Ejemplo:

```text
session_15.md
session_15_audio.mp3
map_cave.png
dm_notes.txt
```

---

# 103. Import Pipeline

```text
IMPORT QUEUE
      ↓
CLASSIFY
      ↓
NORMALIZE
      ↓
INDEX
      ↓
EXTRACT
      ↓
VALIDATE
      ↓
REVIEW
```

---

# 104. Manual Import

El DM debe poder introducir manualmente:

```text
New Event
New Character
New Location
New Quest
New Lore
```

Esto debe ser siempre una opción.

---

# 105. AI Is Assistant

La IA no reemplaza al DM como autoridad narrativa.

Su función principal:

```text
Organize
Extract
Connect
Search
Summarize
Suggest
Prepare
```

El DM mantiene:

```text
Canon Authority
```

---

# 106. Future Advanced Feature

Posteriormente el sistema podrá intentar inferir:

```text
Possible hidden connection
Possible foreshadowing
Possible unresolved quest
Possible recurring NPC
Possible plot thread
```

Estas inferencias deben permanecer separadas de Canon.

---

# 107. Story Threads

El sistema puede mantener:

```text
Story Thread
```

Ejemplo:

```text
"The Black Door"
```

relacionado con:

```text
Session 03
Session 05
Session 09
```

Estado:

```text
OPEN
RESOLVED
ABANDONED
UNKNOWN
```

---

# 108. Unresolved Threads

Después de cada sesión:

```text
Active Threads
```

pueden alimentar:

- recap;
- DM assistant;
- future scene suggestions;
- narrative analysis.

---

# 109. Foreshadowing

La IA puede identificar posibles elementos de foreshadowing.

Ejemplo:

```text
Symbol appears in Session 02.
Same symbol appears in Session 08.
```

Puede sugerir:

```text
POSSIBLE NARRATIVE CONNECTION
```

Nunca asumir que fue intencional.

---

# 110. Lore Graph

El Lore puede conceptualizarse como:

```text
             NPC
            /   \
           /     \
      MEMBER      KNOWS
        /           \
   FACTION         SECRET
      |
      |
   CONTROLS
      |
   LOCATION
      |
   CONTAINS
      |
     ITEM
```

La base relacional mantiene estos datos.

No es necesario utilizar una graph database inicialmente.

---

# 111. Graph Visualization

En el futuro la UI puede representar:

```text
Character
    ↓
Faction
    ↓
Location
    ↓
Quest
    ↓
Item
```

Esto es una visualización, no necesariamente una nueva base de datos.

---

# 112. Lore Health

El sistema puede calcular métricas:

```text
Canon Coverage
Entity Resolution
Contradictions
Unknowns
Unresolved Threads
Source Coverage
```

Ejemplo:

```text
Lore Health

Canon: 82%
Resolved Entities: 94%
Contradictions: 3
Unknowns: 17
```

---

# 113. Campaign Confidence

No debe existir un único "confidence" para toda la campaña.

Debe existir por:

```text
Entity
Event
Relationship
Knowledge
Source
```

---

# 114. Data Lineage

Idealmente:

```text
Source
 ↓
Chunk
 ↓
Extraction
 ↓
Candidate
 ↓
Approval
 ↓
Canon
 ↓
World State
 ↓
Scene
```

Esta cadena constituye el lineage del dato.

---

# 115. Reproducibility

Si se vuelve a ejecutar un agente sobre una fuente:

```text
same source
same prompt version
same model
```

el sistema debería poder comparar resultados.

No necesariamente esperar output idéntico.

---

# 116. Prompt Versioning

Cada extracción debe conservar:

```text
prompt_version
```

Ejemplo:

```text
event-extraction-v1
```

Si se mejora el prompt:

```text
event-extraction-v2
```

---

# 117. Agent Versioning

También registrar:

```text
agent_version
```

Ejemplo:

```text
lore-extractor-v1.3
```

---

# 118. Extraction Metadata

Cada proceso puede registrar:

```text
input_hash
output_hash
model
agent
prompt_version
duration
tokens
status
```

si el proveedor lo permite.

---

# 119. Cost Tracking

Si se utiliza una API externa, el sistema puede registrar:

```text
estimated_input_tokens
estimated_output_tokens
estimated_cost
```

Esto permitirá identificar qué agentes consumen más.

---

# 120. Cost Optimization

Prioridades:

```text
1. Cache
2. Hash
3. Smaller Context
4. Smaller Model
5. Batch Processing
6. Local Model
7. Remote Model only when necessary
```

---

# 121. Agent Routing

No todos los problemas necesitan el modelo más potente.

Ejemplo:

```text
Classification
→ Small Model

Entity Extraction
→ Small/Medium Model

Complex Narrative Reasoning
→ Large Model

Recap
→ Medium Model

Formatting
→ Local/Small Model
```

Los modelos concretos se definirán posteriormente.

---

# 122. Lore File Generation

El sistema puede generar automáticamente:

```text
lore/
├── world.md
├── current-state.md
├── campaign-summary.md
│
├── characters/
├── npcs/
├── locations/
├── factions/
├── quests/
├── items/
├── secrets/
│
└── sessions/
```

---

# 123. Current-State.md

Debe ser extremadamente compacto.

Debe contener:

```text
Current Session
Current Location
Party
Active Quests
Important NPCs
Recent Events
Active Threats
Current Environment
Open Threads
```

Este archivo será uno de los principales contextos de los agentes.

---

# 124. Campaign-Summary.md

Debe contener:

```text
Campaign Premise
Main Characters
Major Factions
Major Locations
Major Events
Current Plot
Important Secrets
Known Threats
```

No incluir cada evento histórico.

---

# 125. Session Markdown

Cada sesión puede tener:

```text
sessions/
└── session-008.md
```

con:

```text
# Session 08

## Summary

## Important Events

## Characters

## Locations

## NPCs

## Quests

## Discoveries

## Secrets

## Consequences

## Sources
```

---

# 126. Entity Markdown

Cada entidad importante puede poseer un archivo.

Ejemplo:

```text
characters/ardan.md
npcs/varek.md
locations/black-vault.md
factions/shadow-cult.md
```

---

# 127. Generated Markdown Rules

Los archivos generados deben:

- ser pequeños;
- ser legibles;
- tener estructura estable;
- evitar duplicación;
- contener referencias;
- poder regenerarse.

---

# 128. Do Not Create Giant Lore File

Evitar:

```text
LORE.md
```

con cientos de miles de palabras.

Preferir:

```text
small focused files
```

---

# 129. AI Reading Strategy

Un agente puede comenzar leyendo:

```text
context.md
current-state.md
```

y luego solicitar:

```text
relevant entity
relevant location
relevant events
```

según necesidad.

---

# 130. Retrieval Strategy

El sistema debe favorecer:

```text
Targeted Retrieval
```

sobre:

```text
Full Context Injection
```

---

# 131. Context Hierarchy

```text
LEVEL 0
System Instructions

LEVEL 1
Campaign Context

LEVEL 2
Current State

LEVEL 3
Task Context

LEVEL 4
Relevant Entities

LEVEL 5
Relevant Historical Events

LEVEL 6
Source Evidence
```

---

# 132. Source Evidence

Cuando una decisión narrativa sea importante:

```text
AI
 ↓
Relevant Evidence
 ↓
Reasoning
 ↓
Suggestion
```

Esto permite auditar al agente.

---

# 133. Human Review

Los datos de alta importancia deben pasar por revisión.

Especialmente:

```text
Deaths
Major Secrets
Quest Resolution
Faction Changes
Retcons
Major Location Changes
Character Identity
```

---

# 134. Historical Import Completion

La carga histórica se considera suficientemente completa cuando:

```text
All known sessions imported
+
Important entities resolved
+
Major events reviewed
+
Current state reconstructed
+
Critical contradictions resolved
```

No es necesario que absolutamente cada línea de texto esté estructurada.

---

# 135. MVP Import

El MVP solamente necesita:

```text
Markdown/TXT import
Session detection
Entity extraction
Event extraction
Candidate review
Canon approval
Current state
Markdown generation
```

---

# 136. Future Import

Posteriormente:

```text
PDF
DOCX
Audio
Video
Images
OCR
Speech-to-text
Automatic session segmentation
```

---

# 137. Final Principle

El objetivo de la ingestión no es convertir todo el texto de la campaña en datos.

El objetivo es convertir la campaña en:

```text
SEARCHABLE
STRUCTURED
TRACEABLE
CANONICAL
TEMPORAL
CONTEXTUAL
```

sin perder la fuente original.

La campaña debe poder evolucionar indefinidamente.

```text
NEW SESSION
    ↓
NEW SOURCE
    ↓
NEW EVENTS
    ↓
NEW CANON
    ↓
NEW WORLD STATE
    ↓
NEW SCENE
```

sin necesidad de reconstruir todo el proyecto desde cero.
