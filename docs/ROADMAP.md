# ROADMAP.md

> Hoja de ruta oficial del RPG World Engine.
>
> Este documento define el orden recomendado de construcción del proyecto,
> desde un MVP local y pequeño hasta una plataforma narrativa inmersiva
> capaz de acompañar campañas de rol completas.
>
> IMPORTANTE:
>
> El proyecto es deliberadamente incremental.
>
> No intentar implementar todas las funcionalidades desde el principio.
>
> Cada fase debe producir un sistema funcional y utilizable antes de
> avanzar a la siguiente.

---

# 1. Objetivo General

Construir progresivamente un entorno virtual para partidas de rol
presenciales que permita:

```text
CAMPAIGN DATA
      ↓
LORE
      ↓
CHARACTERS
      ↓
EVENTS
      ↓
SESSION
      ↓
DM CONTROL
      ↓
SCENE
      ↓
3D WORLD
      ↓
NARRATIVE
      ↓
RECAP
      ↓
CAMPAIGN MEMORY
```

El sistema debe comenzar como una aplicación:

```text
LOCAL
OFFLINE-FIRST
LIGHTWEIGHT
LOW-COST
```

y posteriormente poder evolucionar hacia:

```text
LAN
MULTI-USER
AI-ASSISTED
IMMERSIVE
```

---

# 2. Principios del Roadmap

## 2.1 Incremental

Cada fase debe ser funcional.

No construir primero:

```text
AI
3D
VOICE
NETWORK
```

y recién después:

```text
DATABASE
STATE
EVENTS
```

---

## 2.2 Core First

La prioridad es:

```text
DATA
STATE
EVENTS
SESSION
```

antes que:

```text
VISUAL POLISH
AI
VFX
```

---

## 2.3 Offline First

El MVP debe funcionar sin Internet.

---

## 2.4 Free First

Priorizar:

```text
Open Source
Local Models
Local Database
Local Assets
Free Tools
```

antes que servicios pagos.

---

## 2.5 Replaceable Components

Los sistemas externos deben poder reemplazarse.

Ejemplo:

```text
TTS Provider
AI Provider
Renderer
Database
```

no deben quedar acoplados innecesariamente.

---

# 3. Fases Generales

```text
PHASE 0
Foundation

PHASE 1
Campaign Core

PHASE 2
Character System

PHASE 3
Session System

PHASE 4
DM Control

PHASE 5
Scene System

PHASE 6
Renderer

PHASE 7
Narrative Engine

PHASE 8
Recap & Memory

PHASE 9
AI Agents

PHASE 10
Audio / Voice

PHASE 11
LAN / Multiplayer

PHASE 12
Immersive Features

PHASE 13
Optimization

PHASE 14
Long-Term Platform
```

---

# 4. PHASE 0 — FOUNDATION

## Objetivo

Crear la estructura inicial del proyecto.

---

## Funcionalidades

```text
Project structure
Configuration
Logging
Error handling
Database initialization
Basic documentation
Test framework
Asset directories
```

---

## Resultado esperado

La aplicación debe:

```text
START
 ↓
INITIALIZE
 ↓
CREATE LOCAL DATABASE
 ↓
LOAD CONFIG
 ↓
SHOW BASIC UI
```

---

## No implementar todavía

```text
AI
3D
VOICE
NETWORK
```

---

# 5. PHASE 1 — CAMPAIGN CORE

## Objetivo

Crear la representación digital de la campaña.

---

## Implementar

```text
Campaign
Lore
Entities
Locations
Events
Timeline
Metadata
```

---

## Funcionalidad mínima

Poder:

```text
Create Campaign
Load Campaign
Save Campaign
Export Campaign
Import Campaign
```

---

## Resultado

Una campaña puede existir sin necesidad de Renderer.

---

# 6. PHASE 2 — CHARACTER SYSTEM

## Objetivo

Representar personajes y entidades.

---

## Implementar

```text
Player Characters
NPCs
Enemies
Creatures
Items
Relationships
Stats
Locations
```

---

## Funcionalidad

```text
Create Character
Edit Character
View Character
Archive Character
Move Character
Associate Character with Campaign
```

---

## Modelo visual inicial

Los personajes pueden representarse inicialmente mediante:

```text
2D token
```

y posteriormente:

```text
3D miniature
```

---

# 7. PHASE 3 — SESSION SYSTEM

## Objetivo

Representar una party real.

---

## Implementar

```text
Session
Session State
Session Events
Session Start
Session Pause
Session Resume
Session End
```

---

## Flujo

```text
CAMPAIGN
   ↓
START SESSION
   ↓
LOAD CURRENT STATE
   ↓
PLAY
   ↓
SAVE EVENTS
   ↓
END SESSION
```

---

# 8. PHASE 4 — DM CONTROL

## Objetivo

Crear la primera interfaz real para el Dungeon Master.

---

## Controlador

Debe permitir:

```text
Change Scene
Move Character
Spawn Entity
Remove Entity
Show / Hide Entity
Trigger Event
Play Media
Change Atmosphere
```

---

## Principio

El DM debe poder realizar acciones rápidamente.

Evitar interfaces excesivamente complejas.

---

# 9. PHASE 5 — SCENE SYSTEM

## Objetivo

Representar escenarios.

---

## Tipos iniciales

```text
Tavern
Forest
Cave
Dungeon
Prison
Vault
Castle
Village
Ruins
Tunnel
```

---

## Una escena puede contener

```text
Background
3D Geometry
Characters
NPCs
Props
Lighting
Audio
Video
Effects
Triggers
```

---

# 10. PHASE 6 — RENDERER

## Objetivo

Mostrar el mundo virtual.

---

## Primera versión

No necesita ser un videojuego completo.

Debe permitir:

```text
Load Scene
Place Character
Move Character
Camera
Lighting
Background
Basic Effects
```

---

## Personajes

Primera implementación:

```text
BASE
+
FIGURE
```

Conceptualmente similar a:

```text
CHESS TOKEN
+
MINIATURE
```

Esto permite cambiar posteriormente el modelo sin modificar el estado
del personaje.

---

# 11. PHASE 7 — 2D → 3D SCENES

## Objetivo

Utilizar imágenes proporcionadas por el DM como referencia para
construir escenarios.

---

## Input

```text
2D IMAGE
```

---

## Pipeline inicial

```text
IMAGE
 ↓
REFERENCE
 ↓
SCENE DEFINITION
 ↓
3D BLOCKOUT
 ↓
ASSETS
 ↓
LIGHTING
 ↓
FINAL SCENE
```

---

## Importante

La IA no debe generar necesariamente un modelo 3D completo.

Puede utilizar:

```text
2.5D
Billboards
Planes
Depth Layers
Simple Geometry
Procedural Geometry
```

cuando sea suficiente.

---

# 12. PHASE 8 — NARRATIVE ENGINE

## Objetivo

Relacionar:

```text
DM NARRATION
+
EVENTS
+
CURRENT SCENE
+
CAMPAIGN CONTEXT
```

---

## El sistema debe detectar conceptos como:

```text
Location
Character
Action
Event
Emotion
Threat
Transition
Object
```

---

## Ejemplo

DM:

```text
"Los aventureros atraviesan lentamente la bóveda
mientras las antorchas comienzan a apagarse."
```

El sistema podría interpretar:

```text
LOCATION = VAULT
CHARACTERS = PARTY
ACTION = ENTER
ATMOSPHERE = DARK
LIGHTING = DIM
```

---

# 13. PHASE 9 — EVENT / NARRATIVE PIPELINE

## Objetivo

Convertir lo narrado por el DM en eventos estructurados.

```text
DM INPUT
 ↓
PARSER
 ↓
EVENT
 ↓
VALIDATION
 ↓
STATE UPDATE
 ↓
SCENE UPDATE
```

---

# 14. PHASE 10 — RECAP SYSTEM

## Objetivo

Crear automáticamente una recapitulación de cada sesión.

---

## Input

```text
SESSION EVENTS
```

---

## Output

```text
SESSION RECAP
```

---

## Debe incluir

```text
Previous Situation
Important Events
Character Actions
Consequences
Discoveries
Deaths
Important NPCs
Unresolved Threads
Current Situation
```

---

# 15. PHASE 11 — MEMORY SYSTEM

## Objetivo

Convertir las sesiones anteriores en memoria consultable.

---

## Jerarquía

```text
CAMPAIGN
 ├── ARC
 │    ├── SESSION
 │    │    ├── EVENTS
 │    │    ├── RECAP
 │    │    └── MEMORY
 │    └── CHARACTERS
 └── LOCATIONS
```

---

# 16. PHASE 12 — AI AGENTS

## Objetivo

Introducir agentes especializados.

No crear un único agente gigantesco.

---

## Agentes

```text
Lore Agent
Canon Agent
Session Agent
Narrative Agent
Recap Agent
Scene Agent
Character Agent
Asset Agent
QA Agent
```

---

# 17. Agent Responsibilities

Cada agente debe tener:

```text
ROLE
INPUTS
TOOLS
OUTPUT
PERMISSIONS
LIMITATIONS
```

---

# 18. Lore Agent

Responsable de:

```text
Search lore
Answer questions
Find relationships
Provide context
```

No modifica canon automáticamente.

---

# 19. Canon Agent

Responsable de:

```text
Validate facts
Detect contradictions
Track canonical state
```

---

# 20. Session Agent

Responsable de:

```text
Session state
Events
Timeline
Session metadata
```

---

# 21. Narrative Agent

Responsable de:

```text
Interpret DM narration
Extract events
Suggest scene changes
```

---

# 22. Recap Agent

Responsable de:

```text
Session summary
Important events
Character actions
Unresolved threads
Narrative recap
```

---

# 23. Scene Agent

Responsable de:

```text
Scene interpretation
Scene configuration
Asset suggestions
Environment transitions
```

---

# 24. Character Agent

Responsable de:

```text
Character data
Relationships
Appearance
History
Current state
```

---

# 25. Asset Agent

Responsable de:

```text
Find assets
Validate assets
Generate asset metadata
Organize assets
```

---

# 26. QA Agent

Responsable de:

```text
Tests
Consistency checks
Broken references
Missing assets
Potential regressions
```

---

# 27. PHASE 13 — DM VOICE INPUT

## Objetivo

Permitir que el DM narre naturalmente.

---

## Pipeline

```text
MICROPHONE
 ↓
SPEECH TO TEXT
 ↓
NARRATIVE ANALYSIS
 ↓
EVENTS
 ↓
SCENE
```

---

# 28. PHASE 14 — VOICE RECAP

## Objetivo

Generar una narración de los acontecimientos.

---

## Pipeline

```text
SESSION
 ↓
RECAP
 ↓
NARRATIVE SCRIPT
 ↓
TTS
 ↓
AUDIO
```

---

# 29. PHASE 15 — ATMOSPHERE SYSTEM

## Objetivo

Modificar el ambiente según la narración.

---

## Variables

```text
Lighting
Color
Fog
Particles
Music
Ambient Sound
Camera
Video
```

---

## Ejemplo

Narración:

```text
"El bosque queda completamente en silencio."
```

Sistema:

```text
Music → LOW
Ambient → SILENCE
Wind → LOW
Lighting → DIM
Fog → HIGH
```

---

# 30. PHASE 16 — MEDIA SYSTEM

## Objetivo

Integrar:

```text
Images
Videos
Music
Sound Effects
Voice
```

---

# 31. PHASE 17 — LAN MODE

## Objetivo

Permitir que otros dispositivos se conecten.

---

## Arquitectura inicial

```text
DM COMPUTER
     │
     │ LAN
     │
 ┌───┼────┐
 ↓   ↓    ↓
P1  P2    P3
```

---

# 32. DM Authority

El DM mantiene autoridad sobre:

```text
Campaign
Session
Canon
Scene
Hidden Information
```

---

# 33. Player Client

Los jugadores podrían visualizar:

```text
Characters
Scene
Visible NPCs
Map
Objectives
Recap
```

pero no:

```text
DM Secrets
Hidden Entities
Unrevealed Events
```

---

# 34. PHASE 18 — MULTIPLAYER SYNCHRONIZATION

## Objetivo

Sincronizar:

```text
Scene
Characters
Events
Visibility
Session State
```

---

# 35. PHASE 19 — IMMERSIVE FEATURES

Agregar progresivamente:

```text
Dynamic Camera
Environmental Effects
Animated NPCs
Interactive Objects
Fog
Weather
Day/Night
Dynamic Lighting
```

---

# 36. PHASE 20 — ADVANCED 3D

Agregar:

```text
Procedural Environments
3D Asset Generation
Terrain
Navigation
Character Animation
Physics
```

Solo cuando el core sea estable.

---

# 37. PHASE 21 — ADVANCED AI

A futuro:

```text
Automatic Scene Generation
NPC Behavior
Dynamic Events
World Simulation
Voice Recognition
Voice Acting
Narrative Assistance
```

---

# 38. PHASE 22 — CAMPAIGN ANALYTICS

El sistema podría analizar:

```text
Character Importance
NPC Relationships
Locations Visited
Unresolved Threads
Recurring Characters
Major Events
Player Decisions
```

---

# 39. PHASE 23 — CAMPAIGN TIMELINE

Visualización:

```text
SESSION 1
   │
SESSION 2
   │
SESSION 3
   │
SESSION 4
   │
CURRENT
```

con eventos importantes.

---

# 40. PHASE 24 — WORLD MAP

Crear un mapa global:

```text
WORLD
 ├── REGION
 │    ├── CITY
 │    ├── DUNGEON
 │    └── FOREST
```

---

# 41. PHASE 25 — LOCATION MEMORY

Cada ubicación debe poder recordar:

```text
History
Events
Characters
Changes
Discoveries
```

---

# 42. PHASE 26 — RETURN TO PREVIOUS LOCATION

Si los jugadores regresan a un lugar antiguo:

```text
PAST STATE
 +
WORLD EVENTS
 =
CURRENT LOCATION
```

---

# 43. PHASE 27 — WORLD PERSISTENCE

El mundo deja de ser simplemente:

```text
SCENE
```

y pasa a representar:

```text
PERSISTENT WORLD
```

---

# 44. PHASE 28 — ADVANCED SAVE SYSTEM

Agregar:

```text
Snapshots
Branches
Backups
Restore Points
Session Replay
```

---

# 45. PHASE 29 — CAMPAIGN BRANCHES

A futuro:

```text
Timeline A
Timeline B
Alternative Outcome
What-if
```

Solo si la campaña necesita esta funcionalidad.

---

# 46. PHASE 30 — MODDING / EXTENSIBILITY

Permitir:

```text
Plugins
Custom Agents
Custom Scenes
Custom Assets
Custom Commands
Custom Rules
```

---

# 47. MVP Definition

El MVP NO necesita:

```text
AI
VOICE
MULTIPLAYER
ADVANCED 3D
AUTOMATIC SCENE GENERATION
```

---

# 48. MVP Must Have

El MVP debe permitir:

```text
Campaign
Characters
Locations
Events
Sessions
DM Control
Basic Scenes
Basic Renderer
Persistence
Recap
```

---

# 49. MVP Workflow

El flujo mínimo:

```text
LOAD CAMPAIGN
      ↓
START SESSION
      ↓
LOAD CURRENT SCENE
      ↓
PLACE CHARACTERS
      ↓
DM CONTROLS SCENE
      ↓
RECORD EVENTS
      ↓
END SESSION
      ↓
GENERATE RECAP
      ↓
SAVE CAMPAIGN
```

---

# 50. First Playable Version

La primera versión realmente utilizable debe permitir que el grupo
juegue una sesión real utilizando el sistema.

---

# 51. First Playable Target

Debe poder realizarse:

```text
1 COMPLETE SESSION
```

sin depender de funcionalidades experimentales.

---

# 52. Vertical Slice

Antes de construir todo el sistema debe existir un Vertical Slice:

```text
ONE CAMPAIGN
ONE SESSION
ONE SCENE
3-5 CHARACTERS
SEVERAL EVENTS
DM CONTROL
SAVE
RELOAD
RECAP
```

---

# 53. Vertical Slice Importance

El Vertical Slice demuestra que:

```text
DATABASE
+
SESSION
+
CHARACTERS
+
SCENE
+
DM
+
RECAP
```

funcionan juntos.

---

# 54. Development Strategy

El desarrollo debe seguir:

```text
VERTICAL SLICE
 ↓
STABILIZE
 ↓
EXPAND
 ↓
REFACTOR
 ↓
OPTIMIZE
```

No:

```text
BUILD EVERYTHING
 ↓
TRY TO INTEGRATE
```

---

# 55. Agent Development Strategy

Los agentes deben trabajar en tareas pequeñas.

Ejemplo:

```text
TASK-001
Create campaign model.

TASK-002
Create character model.

TASK-003
Create session model.

TASK-004
Create event system.

TASK-005
Create session persistence.
```

---

# 56. Agent Task Dependencies

Las tareas deben declarar dependencias.

Ejemplo:

```text
TASK-004
depends_on:
TASK-001
TASK-003
```

---

# 57. Feature Flags

Las funcionalidades experimentales pueden utilizar:

```text
FEATURE_AI
FEATURE_VOICE
FEATURE_LAN
FEATURE_ADVANCED_RENDERER
```

---

# 58. Experimental Features

Una funcionalidad experimental no debe romper el MVP.

---

# 59. Architecture Evolution

El sistema puede comenzar simple.

No introducir microservicios prematuramente.

Preferir:

```text
MODULAR MONOLITH
```

durante las primeras fases.

---

# 60. Local Architecture

Inicialmente:

```text
APPLICATION
 ├── UI
 ├── CORE
 ├── DATABASE
 ├── RENDERER
 ├── AI
 └── ASSETS
```

todo local.

---

# 61. Future Architecture

Posteriormente:

```text
DM CLIENT
     │
     ↓
SESSION SERVER
     │
 ┌───┼────┐
 ↓   ↓    ↓
AI  DB   RENDERER
```

si realmente es necesario.

---

# 62. Database Evolution

Inicialmente:

```text
SQLite
```

Debe mantenerse mientras sea suficiente.

---

# 63. Database Migration Trigger

No migrar a otra base solamente porque:

```text
"el proyecto creció"
```

Migrar cuando exista una necesidad técnica real.

---

# 64. AI Evolution

Inicialmente:

```text
NO AI
```

Después:

```text
OPTIONAL AI
```

y finalmente:

```text
AI ASSISTED WORLD
```

---

# 65. Renderer Evolution

Inicialmente:

```text
2D / 2.5D
```

Después:

```text
3D
```

Después:

```text
ADVANCED 3D
```

---

# 66. Cost Strategy

Prioridad:

```text
LOCAL
 ↓
FREE
 ↓
CACHED
 ↓
OPTIONAL CLOUD
```

---

# 67. Internet Dependency

El sistema no debe requerir Internet para:

```text
Play Session
Load Campaign
Save Campaign
Move Characters
Change Scene
View Recap
```

---

# 68. AI Cost Strategy

Si se utiliza IA:

```text
CACHE RESULTS
```

Evitar enviar repetidamente todo el lore.

---

# 69. Context Strategy

Los agentes deben recibir únicamente:

```text
RELEVANT CONTEXT
```

mediante:

```text
Campaign Context
Current Session
Current Scene
Relevant Characters
Relevant Events
Relevant Canon
```

---

# 70. Context Files

La documentación del proyecto debe permanecer dividida.

```text
/docs/*.md
```

Los agentes no necesitan cargar todo en cada operación.

---

# 71. Context Hierarchy

Prioridad:

```text
SYSTEM RULES
      ↓
PROJECT CONTEXT
      ↓
DOMAIN
      ↓
CURRENT SESSION
      ↓
CURRENT SCENE
      ↓
CURRENT EVENT
```

---

# 72. Campaign History

La historia completa no debe cargarse siempre.

Utilizar:

```text
INDEX
+
RETRIEVAL
```

---

# 73. Current Context

El contexto mínimo de una operación debería ser:

```text
CURRENT SESSION
CURRENT SCENE
INVOLVED CHARACTERS
RELEVANT EVENTS
RELEVANT CANON
```

---

# 74. Long-Term Campaign

A medida que la campaña crece:

```text
RAW EVENTS
 ↓
SUMMARIES
 ↓
ARC SUMMARIES
 ↓
CAMPAIGN MEMORY
```

---

# 75. Memory Compression

Nunca eliminar automáticamente hechos importantes.

La compresión debe preservar:

```text
Canon
Character History
Major Events
Relationships
Consequences
```

---

# 76. Campaign Import

La campaña existente puede incorporarse progresivamente.

---

# 77. Initial Lore Migration

Proceso:

```text
OLD NOTES
 ↓
STRUCTURE
 ↓
EVENTS
 ↓
CHARACTERS
 ↓
LOCATIONS
 ↓
CANON
```

---

# 78. Session Migration

Cada sesión histórica debe convertirse progresivamente en:

```text
SESSION
+
EVENTS
+
RECAP
+
CHARACTER CHANGES
+
LOCATION CHANGES
```

---

# 79. Historical Sessions

Las sesiones antiguas son:

```text
READ-ONLY
```

hasta que el DM las valide.

---

# 80. Canon Validation

Antes de considerar una sesión histórica como canon:

```text
RAW DATA
 ↓
REVIEW
 ↓
DM CONFIRMATION
 ↓
CANON
```

---

# 81. Current Campaign

La campaña actual debe tener:

```text
CURRENT SESSION
CURRENT SCENE
CURRENT PARTY POSITIONS
CURRENT CHARACTER STATES
CURRENT WORLD STATE
```

---

# 82. Historical World

Las escenas anteriores pueden almacenarse como:

```text
PAST SCENE
```

sin necesidad de permanecer cargadas en memoria.

---

# 83. Performance Principle

No mantener cargado todo el mundo.

```text
ACTIVE SCENE
```

es prioritaria.

---

# 84. Asset Loading

Utilizar carga bajo demanda:

```text
REQUEST
 ↓
LOAD
 ↓
CACHE
 ↓
USE
```

---

# 85. Asset Unloading

Cuando una escena deja de ser relevante:

```text
UNLOAD
```

los recursos pesados.

---

# 86. Future Streaming

A futuro:

```text
WORLD
 ↓
CHUNKS
 ↓
LOAD NEARBY
 ↓
UNLOAD FAR
```

---

# 87. Milestone System

Cada fase debe tener:

```text
MILESTONE
```

---

# 88. Milestone Criteria

Un milestone se completa cuando:

```text
FEATURE
+
TEST
+
DOCUMENTATION
```

están terminados.

---

# 89. No "Almost Done"

Una funcionalidad que:

```text
works locally
```

pero:

```text
breaks existing sessions
```

no se considera terminada.

---

# 90. Release Levels

```text
EXPERIMENTAL
ALPHA
BETA
PLAYABLE
STABLE
```

---

# 91. Experimental

Puede romperse.

---

# 92. Alpha

Funcional pero inestable.

---

# 93. Beta

Utilizable por el grupo para pruebas.

---

# 94. Playable

Puede utilizarse durante una party real.

---

# 95. Stable

No debe introducir regresiones conocidas en funcionalidades críticas.

---

# 96. MVP Release

El MVP debe clasificarse inicialmente como:

```text
PLAYABLE
```

no necesariamente:

```text
STABLE
```

---

# 97. Long-Term Vision

El objetivo final es que el sistema funcione como:

```text
DIGITAL CAMPAIGN MEMORY
+
DM ASSISTANT
+
VIRTUAL TABLE
+
NARRATIVE ENGINE
+
WORLD SIMULATION
```

---

# 98. Ultimate Workflow

```text
DM
 │
 │ Narrates
 ↓
VOICE / TEXT
 │
 ↓
NARRATIVE ENGINE
 │
 ├───────────────┐
 ↓               ↓
EVENT          SCENE
 │               │
 ↓               ↓
CANON          RENDERER
 │               │
 └───────┬───────┘
         ↓
       SESSION
         ↓
       MEMORY
         ↓
        RECAP
         ↓
     NEXT SESSION
```

---

# 99. Core Philosophy

El sistema no debe intentar reemplazar al DM.

Debe amplificarlo.

```text
DM = AUTHOR / DIRECTOR

SYSTEM = ASSISTANT

PLAYERS = PARTICIPANTS
```

---

# 100. Final Rule

La funcionalidad más avanzada no es prioridad si compromete:

```text
STABILITY
PERFORMANCE
DATA INTEGRITY
USABILITY
```

---

# 101. Roadmap Decision Rule

Ante cualquier nueva funcionalidad:

```text
¿MEJORA EL CORE?
        │
       YES
        ↓
¿ES NECESARIA AHORA?
        │
       YES
        ↓
IMPLEMENT
```

Si no:

```text
BACKLOG
```

---

# 102. Backlog Philosophy

Una idea interesante no significa:

```text
IMPLEMENT NOW
```

Significa:

```text
DOCUMENT
 ↓
PRIORITIZE
 ↓
SCHEDULE
```

---

# 103. Final Architecture Goal

```text
                  RPG WORLD ENGINE
                         │
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
      CORE            NARRATIVE        RENDERER
        │                │                │
        ↓                ↓                ↓
   Campaign          AI Agents          Scenes
   Sessions           Recaps             3D
   Characters         Memory             2D
   Events             Lore               Audio
   Canon              Context            Video
        │                │                │
        └────────────────┼────────────────┘
                         ↓
                    DM CONTROL
                         ↓
                      PARTY
```

---

# 104. Definition of Success

El proyecto será exitoso si permite que el grupo:

```text
1. JUEGUE
2. GUARDE
3. CONTINÚE
4. RECUERDE
5. VISUALICE
6. EXPANDA
```

su campaña sin que la tecnología se convierta en una carga para el DM.

---

# 105. Ultimate Requirement

El sistema debe poder evolucionar desde:

```text
"Una aplicación local que muestra un mapa"
```

hasta:

```text
"Un mundo virtual persistente que entiende la historia de la campaña
y ayuda al DM a representarla."
```

sin tener que reconstruir completamente la arquitectura.
