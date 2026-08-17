# AGENTS.md

> Especificación de los agentes de IA del RPG World Engine.
>
> Define responsabilidades, permisos, entradas, salidas, herramientas,
> niveles de autonomía y comunicación entre agentes.

---

# 1. Propósito

El sistema utilizará múltiples agentes especializados en lugar de un único
agente responsable de todo el sistema.

Cada agente debe tener:

- una responsabilidad concreta;
- un contexto específico;
- herramientas limitadas;
- entradas definidas;
- salidas estructuradas;
- permisos explícitos;
- criterios de validación.

Principio fundamental:

> Un agente debe hacer una cosa bien antes que muchas cosas de manera ambigua.

---

# 2. Arquitectura General

```text
                         ┌─────────────────┐
                         │  ORCHESTRATOR   │
                         └────────┬────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
        ┌───────────┐       ┌───────────┐       ┌───────────┐
        │   LORE    │       │  SESSION  │       │  WORLD    │
        │  AGENT    │       │  AGENT    │       │  AGENT    │
        └───────────┘       └───────────┘       └───────────┘
              │                   │                   │
              └───────────────────┼───────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ NARRATIVE│ │  VISUAL  │ │  AUDIO   │
              │  AGENT   │ │  AGENT   │ │  AGENT   │
              └──────────┘ └──────────┘ └──────────┘
```

---

# 3. Principio de Especialización

No crear inicialmente:

```text
SUPER_AGENT
```

con responsabilidades como:

```text
leer lore
crear personajes
crear mapas
generar imágenes
actualizar base
generar recap
controlar escena
generar audio
```

En cambio:

```text
Orchestrator
    ↓
Specialized Agents
```

---

# 4. Tipos de Agentes

Los agentes se dividen en:

```text
CORE
PROCESSING
KNOWLEDGE
NARRATIVE
VISUAL
AUDIO
RUNTIME
UTILITY
```

---

# 5. Agentes CORE

Responsables de coordinar el sistema.

```text
ORCHESTRATOR
CONTEXT MANAGER
VALIDATOR
```

---

# 6. Agentes PROCESSING

Procesan información introducida al sistema.

```text
INGESTION AGENT
SESSION PROCESSOR
TRANSCRIPT PROCESSOR
EVENT EXTRACTOR
```

---

# 7. Agentes KNOWLEDGE

Trabajan sobre el conocimiento de la campaña.

```text
LORE AGENT
ENTITY AGENT
RELATIONSHIP AGENT
WORLD STATE AGENT
```

---

# 8. Agentes NARRATIVE

Trabajan con la narrativa.

```text
RECAP AGENT
NARRATOR AGENT
DM ASSISTANT
STORY ANALYZER
```

---

# 9. Agentes VISUAL

Trabajan con la representación visual.

```text
SCENE AGENT
MAP AGENT
CHARACTER VISUAL AGENT
VFX AGENT
```

---

# 10. Agentes AUDIO

Trabajan con:

```text
VOICE
AMBIENCE
MUSIC
SOUND EFFECTS
```

---

# 11. Agentes RUNTIME

Interactúan con la aplicación durante una party.

```text
RUNTIME AGENT
SCENE CONTROLLER
EVENT CONTROLLER
```

---

# 12. Agentes UTILITY

Realizan tareas auxiliares.

```text
SEARCH AGENT
VALIDATION AGENT
EXPORT AGENT
BACKUP AGENT
```

---

# 13. Agent Registry

Todos los agentes deben estar registrados.

Ejemplo:

```yaml
agents:
  - id: orchestrator
    type: core
    enabled: true

  - id: lore
    type: knowledge
    enabled: true

  - id: session-processor
    type: processing
    enabled: true

  - id: recap
    type: narrative
    enabled: true

  - id: scene
    type: visual
    enabled: true
```

---

# 14. Agent Identity

Cada agente debe poseer:

```text
id
name
version
description
role
permissions
tools
input_schema
output_schema
context_profile
```

---

# 15. Agent Versioning

Los agentes deben tener versión.

Ejemplo:

```text
recap-agent v1.0
```

Si cambia significativamente:

```text
recap-agent v2.0
```

Esto facilita reproducir resultados anteriores.

---

# 16. Agent Lifecycle

```text
CREATED
 ↓
INITIALIZED
 ↓
READY
 ↓
RUNNING
 ↓
VALIDATING
 ↓
COMPLETED
```

En caso de error:

```text
RUNNING
 ↓
ERROR
 ↓
RETRY
```

o:

```text
ERROR
 ↓
FAILED
```

---

# 17. Orchestrator

El Orchestrator es el coordinador principal.

No debería realizar directamente tareas narrativas complejas.

Su función es:

```text
Interpretar tarea
 ↓
Seleccionar agente
 ↓
Preparar contexto
 ↓
Ejecutar
 ↓
Validar
 ↓
Persistir resultado
```

---

# 18. Orchestrator Example

Entrada:

```text
"Preparar la escena actual de la bóveda."
```

El Orchestrator determina:

```text
Task:
SCENE_GENERATION
```

y llama:

```text
Scene Agent
```

---

# 19. Orchestrator Responsibilities

Debe:

- analizar solicitudes;
- determinar intención;
- seleccionar agentes;
- preparar contexto;
- controlar dependencias;
- manejar errores;
- controlar permisos;
- registrar ejecuciones.

No debe:

- modificar directamente el lore;
- inventar canon;
- generar contenido visual por sí mismo;
- convertirse en un segundo DM.

---

# 20. Context Manager

El Context Manager conecta los agentes con el sistema de contexto.

```text
Agent
 ↓
Context Manager
 ↓
Context System
 ↓
Database / Markdown / Search
```

---

# 21. Context Manager Responsibilities

Debe:

- construir contexto;
- filtrar secretos;
- controlar permisos;
- aplicar presupuesto;
- recuperar entidades;
- recuperar eventos;
- resolver dependencias;
- registrar fuentes.

---

# 22. Ingestion Agent

Responsable de incorporar información externa.

Fuentes:

```text
DM Notes
Player Notes
Documents
Images
Audio
Transcripts
Recaps
```

---

# 23. Ingestion Agent Example

Entrada:

```text
session-015.md
```

Salida:

```text
Raw Session
```

No debería decidir automáticamente qué es canon.

---

# 24. Session Processor

Procesa una sesión completa.

Puede detectar:

```text
Characters
Locations
Events
NPCs
Items
Quests
Dialogue
Actions
Consequences
```

---

# 25. Session Processor Pipeline

```text
Session
 ↓
Segmentation
 ↓
Event Extraction
 ↓
Entity Detection
 ↓
Relationship Detection
 ↓
State Changes
 ↓
Candidate Canon
```

---

# 26. Event Extractor

Convierte narración en eventos estructurados.

Ejemplo:

```text
"Ardan abrió la puerta de la bóveda."
```

puede producir:

```yaml
event:
  type: ACTION
  actor: ardan
  action: opened
  target: vault-door
```

---

# 27. Event Extractor Restrictions

No debe asumir automáticamente:

```text
Intent
Hidden Motivation
Future Consequences
```

si no están explícitos.

---

# 28. Lore Agent

Responsable de organizar información del mundo.

Trabaja con:

```text
Locations
Characters
Factions
History
Cultures
Objects
Rules
Mythology
```

---

# 29. Lore Agent Responsibilities

Puede:

- encontrar información;
- resumir lore;
- detectar relaciones;
- organizar información;
- identificar contradicciones;
- proponer entidades.

No debe:

- modificar canon sin aprobación.

---

# 30. Entity Agent

Gestiona entidades.

Tipos iniciales:

```text
CHARACTER
NPC
LOCATION
FACTION
ITEM
CREATURE
QUEST
EVENT
```

---

# 31. Entity Agent Example

Detecta:

```text
"El grupo encontró a Varek en la prisión."
```

Puede proponer:

```yaml
entities:
  - type: NPC
    name: Varek

  - type: LOCATION
    name: Prison
```

---

# 32. Relationship Agent

Detecta relaciones.

Ejemplo:

```text
Varek
    │
    ├── LOCATED_IN → Prison
    ├── ENEMY_OF → Party
    └── MEMBER_OF → Cult
```

---

# 33. World State Agent

Responsable del estado actual del mundo.

Debe responder:

```text
¿Dónde está cada personaje?
¿Qué quests están activas?
¿Qué ubicaciones cambiaron?
¿Qué NPCs siguen vivos?
¿Qué objetos fueron obtenidos?
```

---

# 34. World State Rule

El World State debe representar:

```text
CURRENT STATE
```

no toda la historia.

La historia permanece en:

```text
Events
Sessions
Sources
```

---

# 35. Recap Agent

Responsable de generar la recapitulación de una sesión.

Entrada:

```text
Previous Session
Approved Events
State Changes
Important Discoveries
Character Changes
Quest Changes
```

Salida:

```text
Narrative Recap
```

---

# 36. Recap Agent Requirements

Debe:

- ser cronológico;
- ser comprensible;
- priorizar eventos importantes;
- identificar consecuencias;
- evitar spoilers no revelados;
- no inventar acontecimientos.

---

# 37. Recap Levels

Puede generar:

```text
SHORT
MEDIUM
FULL
```

### SHORT

Para jugadores que tienen poco tiempo.

### MEDIUM

Recap estándar.

### FULL

Para jugadores que faltaron.

---

# 38. Recap Voice Script

El Recap Agent también puede producir:

```text
narration_script.md
```

Optimizado para voz.

Ejemplo:

```text
[PAUSE]

La noche comenzó cuando...

[PAUSE]

El grupo finalmente llegó...
```

---

# 39. Narrator Agent

Convierte información narrativa en una narración para la party.

Entrada:

```text
Current Scene
Events
Characters
Environment
Mood
```

Salida:

```text
Narration
```

---

# 40. Narrator Restrictions

No debe alterar:

```text
Canon
Character Actions
World State
```

salvo que el DM lo autorice.

---

# 41. DM Assistant

Es uno de los agentes más importantes.

Su objetivo:

> Asistir al DM sin reemplazarlo.

---

# 42. DM Assistant Capabilities

Puede:

```text
Search Lore
Recall NPCs
Suggest Consequences
Suggest Encounters
Generate Descriptions
Track Events
Track Initiative
Prepare Scenes
Generate Recaps
Detect Contradictions
```

---

# 43. DM Assistant Autonomy

Por defecto:

```text
ASSISTIVE
```

No debe:

```text
AUTOMATICALLY ALTER CANON
```

---

# 44. DM Approval

Operaciones importantes requieren:

```text
DM APPROVAL
```

Ejemplo:

```text
Agent:
"I detected that Varek may have died."

DM:
[Confirm]
[Reject]
[Modify]
```

---

# 45. Scene Agent

Responsable de transformar una escena narrativa en una representación visual.

Entrada:

```text
Location
Scene
Characters
Environment
Lighting
Mood
Visual References
```

Salida:

```text
Scene Configuration
```

---

# 46. Scene Agent Example

Entrada:

```text
The party enters an underground prison.
```

Salida conceptual:

```yaml
scene:
  environment: underground-prison
  lighting: dark
  atmosphere:
    fog: low
    dust: medium
  structures:
    - prison-cells
    - stone-walls
    - iron-gates
```

---

# 47. Scene Agent Restrictions

No debería generar directamente:

```text
World Canon
Character History
```

Su función es representar.

---

# 48. Map Agent

Convierte información espacial en un mapa.

Puede trabajar con:

```text
2D Maps
Images
Grid
Rooms
Connections
Coordinates
```

---

# 49. Map Agent

Debe poder producir:

```text
Map Layout
Object Positions
Character Positions
Camera Suggestions
```

---

# 50. Character Visual Agent

Transforma personajes en representaciones visuales.

Concepto:

```text
Character
 ↓
Visual Profile
 ↓
3D/2.5D Representation
```

---

# 51. Character Visual Model

El sistema debe separar:

```text
Character Identity
```

de:

```text
Character Visual Asset
```

---

# 52. Character Identity

Ejemplo:

```yaml
character:
  id: ardan
  name: Ardan
  class: ...
  faction: ...
```

---

# 53. Character Visual Asset

Ejemplo:

```yaml
visual:
  character_id: ardan
  base_model: humanoid-token
  armor: ...
  weapon: ...
  colors: ...
```

---

# 54. VFX Agent

Gestiona efectos visuales.

Ejemplos:

```text
Fog
Rain
Fire
Magic
Dust
Smoke
Lightning
Blood
Particles
```

---

# 55. Audio Agent

Genera o selecciona audio.

Puede trabajar con:

```text
Ambience
Music
SFX
```

---

# 56. Voice Agent

Convierte scripts narrativos en voz.

Entrada:

```text
Narration Script
```

Salida:

```text
Audio File
```

---

# 57. Voice Agent Requirements

Debe soportar:

```text
Voice Selection
Language
Speed
Pitch
Emotion
Pause
```

---

# 58. Runtime Agent

Es responsable de tareas durante la party.

Ejemplo:

```text
DM presses button
 ↓
Runtime Agent
 ↓
Scene Controller
 ↓
Environment changes
```

---

# 59. Scene Controller

Controla el estado visual.

Ejemplos:

```text
Change Scene
Move Camera
Show Character
Hide Character
Change Lighting
Play Video
Trigger Effect
Play Audio
```

---

# 60. Event Controller

Convierte eventos narrativos en acciones del entorno.

Ejemplo:

```text
EVENT:
Vault Door Opened

↓

ACTIONS:
Play animation
Change lighting
Play sound
Spawn particles
Update scene
```

---

# 61. Agent Communication

Los agentes no deberían comunicarse mediante texto libre cuando sea posible.

Preferir:

```text
Structured Messages
```

---

# 62. Agent Message

Ejemplo:

```yaml
message:
  type: scene.request
  from: orchestrator
  to: scene-agent

  payload:
    location_id: vault
    scene_id: scene-014
```

---

# 63. Agent Output

Ejemplo:

```yaml
result:
  status: success
  type: scene.configuration

  data:
    scene_id: scene-014
    environment: vault
```

---

# 64. Agent Errors

Formato:

```yaml
error:
  code: CONTEXT_INSUFFICIENT
  message: Missing current location.
  recoverable: true
```

---

# 65. Agent Retry

Los errores recuperables pueden provocar:

```text
Retry
 ↓
More Context
 ↓
Agent
```

---

# 66. Agent Failure

Si no puede continuar:

```text
Agent
 ↓
Failure
 ↓
Orchestrator
 ↓
DM
```

No inventar información para continuar.

---

# 67. Human-in-the-Loop

Las acciones narrativas importantes deben poder requerir intervención humana.

Ejemplo:

```text
AI Suggestion

[Accept]
[Reject]
[Edit]
```

---

# 68. Automatic Actions

Solo automatizar inicialmente operaciones de bajo riesgo.

Ejemplos:

```text
Generate Search Query
Generate Summary
Prepare Visual Configuration
Prepare Recap Draft
```

---

# 69. Approval Required

Requieren aprobación:

```text
Canon Changes
Character Death
Quest Completion
Major World Changes
Secret Revelation
Retcon
Permanent Asset Replacement
```

---

# 70. Agent Permissions

Cada agente posee permisos.

Ejemplo:

```yaml
permissions:
  read:
    - lore
    - sessions
    - entities

  write:
    - recap

  modify_canon: false
```

---

# 71. Permission Levels

```text
READ
WRITE_DRAFT
WRITE_APPROVED
MODIFY_STATE
MODIFY_CANON
SYSTEM
```

---

# 72. Lore Agent Permissions

```text
READ
WRITE_DRAFT
```

No:

```text
MODIFY_CANON
```

---

# 73. World State Agent Permissions

Puede:

```text
READ
WRITE_STATE
```

pero los cambios importantes pueden requerir aprobación.

---

# 74. DM Assistant Permissions

Puede:

```text
READ_ALL
SUGGEST
```

No necesariamente:

```text
AUTO_MODIFY_CANON
```

---

# 75. Runtime Permissions

El Runtime puede modificar:

```text
Scene
Camera
Lighting
Audio
Effects
```

pero no:

```text
Lore
Canon
Character History
```

---

# 76. Agent Tool Registry

Cada herramienta debe estar registrada.

Ejemplo:

```yaml
tools:
  - search_lore
  - get_entity
  - get_events
  - update_scene
  - play_audio
```

---

# 77. Tool Principle

Un agente solamente debería tener las herramientas que necesita.

Evitar:

```text
EVERY AGENT → EVERY TOOL
```

---

# 78. Agent Context Profiles

Cada agente debe utilizar el sistema definido en:

```text
CONTEXT-SYSTEM.md
```

Ejemplo:

```yaml
context_profile:
  mode: balanced
  required:
    - current-state
    - current-session
    - relevant-events
```

---

# 79. Agent Cost Profiles

Los agentes también deben tener un nivel de costo.

```text
LOW
MEDIUM
HIGH
```

---

# 80. Low Cost Agents

Ejemplos:

```text
Search
Entity Lookup
Simple Classification
Metadata Extraction
```

---

# 81. Medium Cost Agents

Ejemplos:

```text
Session Processing
Recap
Scene Configuration
Lore Analysis
```

---

# 82. High Cost Agents

Ejemplos:

```text
Complex Narrative Analysis
Deep Lore Analysis
Large Context Reconstruction
Advanced Visual Generation
```

---

# 83. Local-First Agents

Siempre que sea posible:

```text
Local Processing
```

para:

```text
Search
Parsing
Metadata
State Management
Validation
```

---

# 84. External AI

Los modelos externos, si se utilizan, deben reservarse para:

```text
Language Generation
Complex Reasoning
Image Generation
Voice Generation
```

según disponibilidad y costos.

---

# 85. Model Abstraction

Los agentes no deben depender directamente de un proveedor.

En lugar de:

```text
OpenAI API
```

usar:

```text
LLM Provider Interface
```

---

# 86. Provider Interface

Conceptualmente:

```text
Agent
 ↓
LLM Service
 ↓
Provider
```

Esto permite cambiar:

```text
Local Model
Open Source Model
Cloud Model
```

sin reescribir los agentes.

---

# 87. Model Selection

El Orchestrator puede seleccionar modelo según tarea.

Ejemplo:

```text
Simple classification
→ Small model

Recap
→ Medium model

Deep lore analysis
→ Large model
```

---

# 88. Cost Optimization

No usar el modelo más grande para todo.

Principio:

```text
Cheapest capable model
```

---

# 89. Agent Caching

Resultados reutilizables deben almacenarse.

Ejemplo:

```text
Lore Summary
Character Summary
Location Description
```

---

# 90. Deterministic Operations

Cuando no hace falta IA:

```text
Do not use AI.
```

Ejemplo:

```text
Move character from A to B
Update coordinates
Load map
Change scene
```

pueden ser código tradicional.

---

# 91. AI vs Code

Regla:

```text
Deterministic → Code
Probabilistic → AI
```

---

# 92. Example

```text
"Move Ardan to coordinate 10,5"
```

→ Code.

```text
"Describe the atmosphere when Ardan enters the crypt."
```

→ AI.

---

# 93. Agent Observability

Registrar:

```text
agent_id
version
task_id
start_time
end_time
context_size
tools_used
result
errors
```

---

# 94. Agent Execution ID

Cada ejecución debe tener:

```text
execution_id
```

Ejemplo:

```text
exec-2026-08-17-00042
```

---

# 95. Agent Audit

Debe poder reconstruirse:

```text
¿Qué agente hizo esto?
¿Qué contexto recibió?
¿Qué herramientas utilizó?
¿Qué resultado produjo?
```

---

# 96. Agent Determinism

Cuando sea posible guardar:

```text
Prompt
Context Version
Model
Temperature
Tools
Output
```

Esto permite reproducibilidad.

---

# 97. Agent Testing

Cada agente debe tener pruebas.

Ejemplo:

```text
Input
Expected Behavior
Forbidden Behavior
```

---

# 98. Lore Agent Test

Input:

```text
Contradictory lore.
```

Expected:

```text
Detect conflict.
```

Forbidden:

```text
Silently choosing one version.
```

---

# 99. Recap Agent Test

Input:

```text
Session with 30 events.
```

Expected:

```text
Concise recap containing major events.
```

Forbidden:

```text
Inventing events.
```

---

# 100. Scene Agent Test

Input:

```text
Current dungeon scene.
```

Expected:

```text
Valid scene configuration.
```

Forbidden:

```text
Changing canon.
```

---

# 101. Runtime Agent Test

Input:

```text
scene.change
```

Expected:

```text
Environment changes.
```

Forbidden:

```text
Modify campaign lore.
```

---

# 102. Agent Dependency Graph

```text
                    ORCHESTRATOR
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
         CONTEXT       SESSION       LORE
         MANAGER       PROCESSOR      AGENT
            │            │            │
            │            ▼            ▼
            │          EVENTS      ENTITIES
            │            │            │
            └────────────┼────────────┘
                         ▼
                    WORLD STATE
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       RECAP          NARRATOR        SCENE
          │              │              │
          ▼              ▼              ▼
        VOICE          AUDIO          RUNTIME
```

---

# 103. Initial MVP Agents

No implementar todos los agentes desde el inicio.

El MVP debe comenzar con:

```text
1. Orchestrator
2. Context Manager
3. Ingestion Agent
4. Session Processor
5. Lore Agent
6. World State Agent
7. Recap Agent
8. Scene Agent
```

---

# 104. MVP Workflow

```text
Historical Data
      │
      ▼
Ingestion
      │
      ▼
Session Processor
      │
      ├── Events
      ├── Entities
      └── Relationships
              │
              ▼
         World State
              │
              ▼
          Context
              │
        ┌─────┴─────┐
        ▼           ▼
      Recap       Scene
```

---

# 105. First Runtime Workflow

Durante una party:

```text
DM
 │
 ▼
Control Interface
 │
 ▼
Orchestrator
 │
 ├── Context Manager
 │
 ├── Scene Agent
 │
 └── Runtime Controller
        │
        ▼
    3D Environment
```

---

# 106. DM Control Principle

El DM siempre debe poder:

```text
Override AI
Pause AI
Reject AI
Modify AI Output
Trigger Event Manually
```

---

# 107. AI Is Assistant

La filosofía del sistema es:

```text
DM
 ↓
Director

AI
 ↓
Assistant
```

No:

```text
AI
 ↓
Game Master
```

salvo que en el futuro se cree explícitamente un modo experimental.

---

# 108. Future Agent

Podría existir:

```text
AUTONOMOUS DM AGENT
```

pero queda fuera del MVP.

---

# 109. Agent Roadmap

### Phase 1

```text
Orchestrator
Context
Ingestion
Session
Lore
World State
Recap
Scene
```

### Phase 2

```text
Narrator
Voice
Map
Character Visual
Runtime
```

### Phase 3

```text
Relationship
Story Analyzer
VFX
Audio
Advanced DM Assistant
```

### Phase 4

```text
Autonomous Systems
Predictive Assistance
Adaptive Story Tools
```

---

# 110. Core Principle

El sistema debe ser:

```text
MODULAR
LOCAL-FIRST
COST-AWARE
TRACEABLE
REVERSIBLE
HUMAN-CONTROLLED
```

---

# 111. Final Rule

Ningún agente debe asumir que una información es verdadera
simplemente porque apareció en otra respuesta de IA.

La fuente debe poder rastrearse hasta:

```text
Source
 ↓
Event
 ↓
Canon
 ↓
Context
 ↓
Agent
```

---

# 112. Objective

El objetivo final de esta arquitectura es permitir:

```text
DM
 │
 ▼
Campaign Data
 │
 ▼
Context System
 │
 ▼
Specialized Agents
 │
 ├── Lore
 ├── Sessions
 ├── Recaps
 ├── Narrative
 ├── Visuals
 ├── Audio
 └── Runtime
 │
 ▼
Virtual RPG Environment
```

manteniendo siempre al DM como autoridad narrativa.
