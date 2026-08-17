# SDD — Persistent AI RPG World Engine
## Software Design Document — Base Architecture v0.1

**Estado:** Draft / Base de arquitectura  
**Objetivo:** establecer una base técnica y funcional para construir progresivamente un sistema local que transforme una campaña de rol existente en un mundo narrativo persistente, visualizable en 3D/2D y controlable en tiempo real por el DM.

---

# 1. Visión del producto

El sistema será una plataforma **local-first para campañas de rol**.

Su objetivo es conservar la continuidad narrativa de una campaña, transformar las sesiones jugadas en información estructurada y representar el estado actual del mundo mediante:

- personajes como miniaturas digitales 3D modulares;
- escenarios 3D modulares;
- recursos 2D;
- videos y efectos cinematográficos;
- audio y narración;
- un panel de control para el DM;
- una memoria narrativa persistente;
- una recapitulación automática entre sesiones.

La IA será una **capa de asistencia**, no la autoridad absoluta del mundo.

La autoridad final sobre el canon será siempre el DM.

---

# 2. Principios fundamentales

## P01 — Local First

La primera versión debe funcionar localmente.

Preferencias:

- SQLite como base de datos inicial.
- Archivos locales para assets.
- Vector store local solamente cuando sea necesario.
- Modelos locales cuando sean suficientemente buenos.
- APIs externas opcionales y desacopladas.
- Sin dependencia obligatoria de servicios pagos.

## P02 — El DM tiene autoridad

La IA puede:

- detectar;
- sugerir;
- resumir;
- clasificar;
- relacionar;
- generar escenas;
- proponer consecuencias.

La IA NO debe modificar silenciosamente el canon.

Toda modificación relevante puede pasar por:

`PROPOSED -> REVIEW -> APPROVED/REJECTED`

## P03 — Estado estructurado antes que contexto gigante

No se debe enviar la campaña completa a un LLM.

El sistema construirá contexto dinámico a partir de:

- estado actual;
- eventos relevantes;
- entidades relacionadas;
- memoria;
- lore;
- conocimiento del personaje;
- sesión actual.

## P04 — Runtime determinista

Durante una partida, los cambios visuales deben ser rápidos y predecibles.

La generación pesada debe realizarse preferentemente antes de la sesión.

Durante el runtime:

`DM/AI -> Event -> World State -> Renderer`

## P05 — Historia y representación visual son independientes

Un evento histórico debe poder existir aunque no exista una escena 3D.

Un escenario debe poder reconstruirse posteriormente a partir del estado y de sus assets.

## P06 — Todo debe ser versionable

Las campañas, sesiones, estados, escenas, configuraciones y decisiones importantes deben poder versionarse o recuperarse.

---

# 3. Alcance inicial

## Incluido en MVP

1. Crear una campaña.
2. Crear personajes.
3. Crear NPCs.
4. Crear ubicaciones.
5. Registrar sesiones.
6. Importar material histórico.
7. Extraer eventos.
8. Crear timeline.
9. Mantener World State.
10. Crear relaciones entre entidades.
11. Clasificar conocimiento.
12. Generar recaps.
13. Generar recap corto.
14. Generar recap narrativo.
15. Crear una escena 3D básica.
16. Cargar miniaturas de personajes.
17. Mover personajes.
18. Controlar iluminación/clima básico.
19. Panel DM.
20. Guardar todo localmente.

## Fuera del MVP

- generación 3D completamente automática;
- generación de video IA en tiempo real;
- multiplayer online;
- sincronización cloud;
- generación de personajes 3D hiperrealistas;
- simulación completa del mundo;
- NPCs autónomos complejos;
- realidad virtual.

Estas capacidades quedan previstas como extensiones.

---

# 4. Usuarios

## 4.1 DM

Puede:

- administrar campañas;
- revisar canon;
- importar sesiones;
- aprobar cambios;
- controlar escenas;
- controlar eventos;
- administrar secretos;
- ejecutar macros;
- iniciar recaps;
- modificar el estado del mundo.

## 4.2 Jugador

Puede:

- ver el mundo;
- ver su personaje;
- consultar información permitida;
- escuchar recaps;
- consultar objetivos;
- consultar inventario;
- eventualmente interactuar con el mundo.

El jugador no debe acceder a información exclusiva del DM.

---

# 5. Modelo conceptual

La entidad principal es:

`Campaign`

Una campaña contiene:

- Sessions
- Characters
- NPCs
- Locations
- Factions
- Items
- Quests
- Events
- Relationships
- Scenes
- Assets
- Recaps
- World Snapshots

Relación conceptual:

`Campaign -> Sessions -> Events -> World State -> Scenes -> Recaps`

---

# 6. Arquitectura general

```text
                    +--------------------+
                    |      CAMPAIGN      |
                    +---------+----------+
                              |
                     +--------v--------+
                     |   WORLD STATE   |
                     +--------+--------+
                              |
          +-------------------+-------------------+
          |                   |                   |
          v                   v                   v
    Characters            Locations             Events
          |                   |                   |
          +-------------------+-------------------+
                              |
                       +------v------+
                       |  EVENT BUS  |
                       +------+------+
                              |
              +---------------+----------------+
              v               v                v
           3D Engine        Audio          Cinematics
              |               |                |
              +---------------+----------------+
                              v
                        PARTY DISPLAY

DM
 |
 +-- DM Controller
 |
 +-- AI Agents
          |
          v
   Context System
          |
          v
   Relevant Memory
```

---

# 7. Arquitectura de software

Se recomienda separar el sistema en módulos.

```text
/apps
  /dm
  /player
  /renderer

/core
  /domain
  /world
  /events
  /canon
  /memory
  /narrative
  /scenes

/infrastructure
  /database
  /storage
  /ai
  /tts
  /search

/backend
  main.py
  models.py
  database.py

/assets
  /characters
  /environments
  /audio
  /video
  /images

/data
  /campaigns
  /imports
  /snapshots
  /settings
  /setting-cache

/docs
```

---

# 8. Stack inicial recomendado

## Frontend

- React
- TypeScript
- Vite
- TailwindCSS

## 3D

- Three.js
- React Three Fiber
- Drei
- GLTF/GLB

## Backend

Preferencia inicial:

- Python
- FastAPI

Alternativa futura:

- Node.js/TypeScript

La elección debe mantenerse desacoplada mediante APIs internas.

## Database

MVP:

- SQLite

Razones:

- local;
- liviana;
- cero servidor;
- fácil backup;
- excelente para prototipo;
- suficiente para una campaña individual.

## ORM

Opciones:

- SQLAlchemy
- SQLModel

La elección debe quedar centralizada.

## Búsqueda

Primera opción:

- SQLite FTS5.

No introducir una vector DB en la primera iteración salvo necesidad real.

Posteriormente:

- embeddings locales;
- sqlite-vec u otra alternativa compatible.

## AI

Arquitectura desacoplada:

```text
AIProvider
  +-- LocalLLMProvider
  +-- ExternalLLMProvider
```

Nunca acoplar el dominio a un proveedor específico.

## TTS

Arquitectura:

```text
TTSProvider
  +-- LocalTTS
  +-- ExternalTTS
```

---

# 9. Persistencia local

La aplicación debe tener una carpeta de datos configurable.

Ejemplo:

```text
RPGWorld/
├── database/
│   └── campaign.db
├── campaigns/
│   └── campaign-id/
├── assets/
├── generated/
├── imports/
├── exports/
├── backups/
└── logs/
```

La base de datos debe contener principalmente metadata y relaciones.

Los archivos grandes NO deben guardarse como BLOB dentro de SQLite salvo casos excepcionales.

Guardar como archivos:

- PNG/JPG/WebP;
- GLB/GLTF;
- MP3/WAV/OGG;
- MP4/WebM.

SQLite almacena:

`asset_id + path + metadata + hash + version`.

---

# 10. Modelo de datos inicial

## Campaign

```text
id
name
description
created_at
updated_at
current_session_id
current_location_id
settings_json
```

## Session

```text
id
campaign_id
number
date
title
raw_notes
summary
status
created_at
updated_at
```

Estados:

```text
DRAFT
IMPORTED
PROCESSING
REVIEW
APPROVED
ARCHIVED
```

## Character

```text
id
campaign_id
name
type
description
class
race
status
current_location_id
visual_config_json
knowledge_scope
```

## NPC

```text
id
campaign_id
name
description
status
current_location_id
faction_id
knowledge_scope
visual_config_json
```

## Location

```text
id
campaign_id
name
type
description
parent_location_id
status
coordinates_json
scene_id
```

Estados:

```text
ACTIVE
ARCHIVED
HISTORICAL
UNKNOWN
```

## Faction

```text
id
campaign_id
name
description
status
```

## Item

```text
id
campaign_id
name
description
owner_entity_id
status
```

## Quest

```text
id
campaign_id
name
description
status
priority
```

Estados:

```text
UNKNOWN
ACTIVE
COMPLETED
FAILED
ABANDONED
HIDDEN
```

---

# 11. Event Log

Los eventos son uno de los elementos más importantes del sistema.

Ejemplo:

```json
{
  "id": "event-001",
  "campaign_id": "campaign-001",
  "session_id": "session-07",
  "type": "ITEM_STOLEN",
  "actor_id": "character-ard",
  "target_id": "item-medallion",
  "location_id": "temple-01",
  "description": "Ardan stole the sacred medallion.",
  "confidence": 0.98,
  "status": "CANON",
  "source_id": "session-07-notes"
}
```

Tipos iniciales:

```text
CHARACTER_CREATED
CHARACTER_DIED
CHARACTER_INJURED
CHARACTER_MOVED

NPC_INTRODUCED
NPC_DIED
NPC_MOVED
NPC_RELATIONSHIP_CHANGED

LOCATION_DISCOVERED
LOCATION_DESTROYED
LOCATION_CHANGED

ITEM_CREATED
ITEM_FOUND
ITEM_STOLEN
ITEM_DESTROYED
ITEM_TRANSFERRED

QUEST_STARTED
QUEST_UPDATED
QUEST_COMPLETED
QUEST_FAILED

FACTION_RELATIONSHIP_CHANGED

COMBAT_STARTED
COMBAT_ENDED

DISCOVERY
DECISION
DIALOGUE
RUMOR
REVELATION
WORLD_CHANGE
```

---

# 12. Canon

Todo dato narrativo debe tener un estado.

```text
CANON
PROPOSED
UNCONFIRMED
CONTRADICTORY
REJECTED
DM_ONLY
```

Regla:

La IA puede crear `PROPOSED`.

Solo el DM puede convertirlo en `CANON`.

---

# 13. Confidence

Cada información extraída automáticamente puede tener:

`confidence: 0.0 - 1.0`

Ejemplo:

```text
0.95 -> muy confiable
0.75 -> probable
0.50 -> incierto
0.20 -> posible
```

El sistema nunca debe convertir automáticamente una información de baja confianza en canon.

---

# 14. Source Tracking

Toda información extraída debe guardar su origen.

Ejemplo:

```text
source_type:
  SESSION_NOTE
  PLAYER_RECAP
  DM_NOTE
  AUDIO_TRANSCRIPT
  IMAGE
  MANUAL_ENTRY

source_id:
  session-07
```

Esto permite:

- auditar;
- corregir;
- volver al texto original;
- resolver contradicciones.

---

# 15. World State

El World State representa el presente.

No debe reconstruirse constantemente desde cero.

Debe poder consultarse rápidamente:

```text
Current Campaign
├── Current Session
├── Current Location
├── Active Characters
├── Relevant NPCs
├── Active Quests
├── Known Factions
├── Current Weather
├── Current Time
└── Current Scene
```

---

# 16. World Graph

En una primera versión puede implementarse mediante una tabla de relaciones.

```text
Relationship
--------------------------------
id
campaign_id
source_entity_id
target_entity_id
type
strength
status
source_event_id
created_at
updated_at
```

Tipos:

```text
KNOWS
FRIEND_OF
ENEMY_OF
ALLY_OF
MEMBER_OF
OWNS
LOCATED_AT
WORKS_FOR
HATES
LOVES
SUSPECTS
DISCOVERED
KILLED
STOLE_FROM
QUEST_FOR
```

No implementar una base de datos de grafos dedicada hasta que sea realmente necesaria.

---

# 17. Memoria contextual

La aplicación debe generar contexto bajo demanda.

Ejemplo:

```text
User:
"What does Ardan know about Varek?"

Context Builder:
1. Ardan profile
2. Ardan knowledge
3. Varek profile
4. Relationships between Ardan and Varek
5. Events involving both
6. Relevant recent sessions
7. Relevant lore
```

No cargar la campaña completa.

---

# 18. Memory Tiers

## Tier 1 — Runtime

Datos de la escena actual.

## Tier 2 — Relevant

Eventos relacionados con la consulta.

## Tier 3 — Recent

Últimas sesiones.

## Tier 4 — World Knowledge

Lore, relaciones y entidades.

## Tier 5 — Archive

Sesiones históricas.

## Tier 6 — Raw Source

Notas y archivos originales.

---

# 19. Knowledge Scope

El sistema debe distinguir:

```text
DM_ONLY
PARTY_KNOWN
CHARACTER_KNOWN
PUBLIC
SECRET
UNKNOWN
```

Ejemplo:

```text
Varek = Cult Leader

DM:
KNOWS

Ardan:
UNKNOWN

Mira:
SUSPECTS

Party:
UNKNOWN
```

Nunca exponer información fuera del scope permitido.

---

# 20. Campaign Importer

Debe permitir importar material existente.

Fuentes:

- Markdown
- TXT
- PDF
- DOCX
- imágenes
- audio
- JSON
- CSV

Proceso:

```text
IMPORT
  ↓
RAW STORAGE
  ↓
TEXT EXTRACTION
  ↓
SESSION DETECTION
  ↓
ENTITY EXTRACTION
  ↓
EVENT EXTRACTION
  ↓
RELATION EXTRACTION
  ↓
CANON REVIEW
  ↓
WORLD STATE
```

La información original nunca se elimina.

---

# 21. Migración histórica

La campaña existente debe cargarse por sesiones.

No intentar procesar toda la campaña de una vez.

Flujo recomendado:

```text
Session 01
  ↓
Review
  ↓
Session 02
  ↓
Review
  ↓
Session 03
  ↓
...
```

Cada sesión genera:

- entidades;
- eventos;
- relaciones;
- decisiones;
- consecuencias;
- resumen;
- preguntas abiertas.

---

# 22. Recap Engine

Cada sesión aprobada genera tres formatos.

## Quick Recap

30–60 segundos de lectura.

## Full Recap

Resumen completo para jugadores ausentes.

## Cinematic Recap

Narración preparada para TTS.

Estructura:

```text
INTRO
IMPORTANT EVENTS
CHARACTER ACTIONS
DISCOVERIES
CONSEQUENCES
CURRENT SITUATION
OPEN MYSTERIES
```

---

# 23. Recap con voz

Pipeline:

```text
Session
 ↓
Canon
 ↓
Recap Generator
 ↓
Narrative Script
 ↓
TTS
 ↓
Audio File
```

El audio generado debe guardarse localmente y cachearse.

No regenerar si el contenido no cambió.

---

# 24. Scene System

Una Scene representa un espacio jugable.

```text
Scene
├── environment
├── characters
├── NPCs
├── props
├── lighting
├── weather
├── audio
├── camera
└── triggers
```

---

# 25. Environment Strategy

No depender de generación 3D IA directa.

Usar:

```text
2D Reference
      ↓
AI Scene Analysis
      ↓
Scene Blueprint
      ↓
Modular 3D Assets
      ↓
Scene Builder
```

Tipos:

```text
FOREST
CAVE
TUNNEL
DUNGEON
PRISON
VAULT
TAVERN
CASTLE
TEMPLE
CITY
VILLAGE
ROAD
RUINS
CUSTOM
```

---

# 26. Modular Environment Kits

Ejemplo:

```text
DungeonKit
├── walls
├── floors
├── doors
├── stairs
├── pillars
├── torches
├── chains
├── tables
└── decorations
```

La IA selecciona componentes.

El Scene Builder arma el escenario.

---

# 27. Character Representation

Los personajes deben ser miniaturas digitales.

Modelo conceptual:

```text
Character Miniature
├── Base
├── Body
├── Head
├── Armor
├── Weapon
├── Accessories
└── Visual Effects
```

Ejemplo:

```json
{
  "body": "warrior_01",
  "armor": "heavy_02",
  "weapon": "greatsword_01",
  "cape": "red_01",
  "base": "standard"
}
```

---

# 28. DM Controller

El DM tendrá control directo.

Categorías:

```text
Environment
Weather
Lighting
Audio
Characters
NPCs
Events
Cinematics
Camera
Macros
AI Suggestions
```

Ejemplos:

```text
NIGHT
RAIN
STORM
FOG
LIGHTS_OUT
FIRE
EARTHQUAKE
SPAWN_NPC
START_COMBAT
CINEMATIC
```

---

# 29. Event Bus

El DM y la IA no deberían modificar directamente el renderer.

Usar eventos.

Ejemplo:

```json
{
  "type": "WEATHER_CHANGED",
  "payload": {
    "weather": "storm",
    "intensity": 0.8
  }
}
```

El renderer interpreta el evento.

---

# 30. Macros

Permitir acciones agrupadas.

Ejemplo:

```text
DRAGON_ARRIVES

Camera -> sky
Weather -> storm
Lighting -> dark
Audio -> dragon_roar
Music -> boss
Effects -> ash
Spawn -> dragon
```

El DM ejecuta una sola acción.

---

# 31. Trigger System

Permitir:

```text
WHEN condition
THEN actions
```

Ejemplo:

```text
WHEN player enters forbidden_forest

THEN
  weather = fog
  music = suspense
  spawn = cultist
  lighting = moonlight
```

---

# 32. Snapshots

Después de cada sesión:

```text
World State
    ↓
Snapshot
```

Ejemplo:

```text
snapshot-007
snapshot-008
snapshot-009
```

Debe ser posible recuperar un snapshot.

---

# 33. Contratos para agentes

Los agentes del sistema deben trabajar mediante contratos.

Ver `AGENTS-SYSTEM.md` para contratos detallados.

Ejemplo:

```text
INGESTION_AGENT
    -> ImportedData

SESSION_PROCESSOR
    -> ExtractedEvents

LORE_AGENT
    -> LoreReport

WORLD_STATE_MANAGER
    -> WorldStateUpdate

RECAP_AGENT
    -> RecapDocument

SCENE_AGENT
    -> SceneBlueprint
```

Ningún agente debería asumir estructuras no documentadas.

---

# 34. Agentes del sistema

```text
CORE
  Orchestrator
  Context Manager
  Validator

PROCESSING
  Ingestion Agent
  Session Processor
  Transcript Processor
  Event Extractor

KNOWLEDGE
  Lore Agent
  Entity Agent
  Relationship Agent
  World State Agent

NARRATIVE
  Recap Agent
  Narrator Agent
  DM Assistant
  Story Analyzer

VISUAL
  Scene Agent
  Map Agent
  Character Visual Agent
  VFX Agent

AUDIO
  Voice Agent
  Audio Agent

RUNTIME
  Runtime Agent
  Scene Controller
  Event Controller

UTILITY
  Search Agent
  Validation Agent
  Export Agent
  Backup Agent
```

Ver `AGENTS.md` para taxonomía completa y `AGENTS-SYSTEM.md` para contratos de integración.

---

# 35. Context Pack para agentes

Mantener documentos pequeños y especializados.

```text
/docs
├── CONTEXT.md
├── PRODUCT.md
├── DOMAIN.md
├── ARCHITECTURE.md
├── DATABASE.md
├── EVENT-SYSTEM.md
├── SESSION-SYSTEM.md
├── WORLD-STATE.md
├── DATA-MODEL.md
├── DATA-DIRECTORY.md
├── CONTEXT-SYSTEM.md
├── INGESTION-AND-LORE.md
├── SETTING-INGESTION.md
├── AGENTS-SYSTEM.md
├── AGENTS.md
├── DM-CONTROLLER.md
├── RENDERER.md
├── SECURITY.md
├── PERFORMANCE.md
├── TESTING.md
└── ROADMAP.md
```

Regla:

Un agente debe leer primero `CONTEXT.md` y después solamente los documentos relevantes.

---

# 36. Functional Requirements

### FR-001 Campaign Management
El sistema debe permitir crear y administrar campañas.

### FR-002 Session Management
El sistema debe permitir crear, importar y editar sesiones.

### FR-003 Character Management
El sistema debe permitir administrar personajes.

### FR-004 NPC Management
El sistema debe permitir administrar NPCs.

### FR-005 Location Management
El sistema debe permitir administrar ubicaciones.

### FR-006 Event Management
El sistema debe registrar eventos narrativos.

### FR-007 Canon Management
El sistema debe permitir aprobar o rechazar información propuesta por IA.

### FR-008 Timeline
El sistema debe mostrar una línea temporal.

### FR-009 World State
El sistema debe mantener el estado actual.

### FR-010 Relationships
El sistema debe mantener relaciones entre entidades.

### FR-011 Knowledge Scope
El sistema debe controlar quién conoce cada información.

### FR-012 Import
El sistema debe importar material histórico.

### FR-013 Recap
El sistema debe generar recaps.

### FR-014 TTS
El sistema debe poder generar recaps narrados.

### FR-015 Scene Management
El sistema debe permitir crear y cargar escenas.

### FR-016 Character Rendering
El sistema debe representar personajes como miniaturas.

### FR-017 DM Control
El DM debe poder modificar el entorno.

### FR-018 Event Bus
Los cambios deben comunicarse mediante eventos.

### FR-019 Macros
El DM debe poder ejecutar acciones agrupadas.

### FR-020 Snapshots
El sistema debe guardar snapshots del mundo.

---

# 37. Non-Functional Requirements

### NFR-001 Local
La aplicación debe funcionar sin servidor remoto obligatorio.

### NFR-002 Lightweight
La base inicial debe poder ejecutarse en una PC doméstica.

### NFR-003 Performance
Las acciones del DM durante runtime deben responder idealmente en menos de 200 ms para cambios locales simples.

### NFR-004 Offline
El modo básico debe funcionar sin Internet.

### NFR-005 Extensible
Los proveedores de IA, TTS y almacenamiento deben poder reemplazarse.

### NFR-006 Recoverable
Los datos deben poder exportarse y restaurarse.

### NFR-007 Deterministic Runtime
Los eventos visuales deben producir resultados deterministas salvo componentes explícitamente aleatorios.

### NFR-008 No Vendor Lock-in
El dominio no debe depender de OpenAI, Anthropic, Google, etc.

---

# 38. Performance Strategy

## Runtime

Evitar:

- generación de imágenes;
- generación de video;
- generación 3D;
- LLM pesado.

Preferir:

- assets cacheados;
- eventos;
- shaders;
- partículas;
- cambios de iluminación;
- audio local.

## Pre-generation

Antes de la sesión:

- generar recaps;
- procesar notas;
- preparar escenas;
- precargar assets;
- generar audio.

---

# 39. Cost Strategy

Objetivo:

`$0 para el MVP local`

Prioridades:

1. SQLite.
2. FTS5.
3. Assets locales.
4. LLM local cuando sea viable.
5. TTS local.
6. Generación offline.
7. Cache.
8. APIs externas opcionales.

No diseñar funcionalidades que requieran una API paga para funcionar.

---

# 40. Backup

El usuario debe poder exportar:

`campaign.rpgworld`

Formato sugerido:

```text
campaign.rpgworld
├── database.sqlite
├── manifest.json
├── campaign.json
├── assets/
├── scenes/
├── recaps/
└── metadata/
```

El backup debe ser portable.

---

# 41. Testing

## Unit Tests

- World State
- Events
- Canon
- Relationships
- Context Builder

## Integration Tests

- Session import -> events -> world state
- World state -> scene
- Session -> recap
- DM command -> event -> renderer

## Canon Tests

Casos especiales:

- personaje muerto no puede aparecer vivo sin retcon;
- objeto no puede estar simultáneamente en dos inventarios;
- personaje no puede estar en dos ubicaciones;
- información DM-only no puede llegar al jugador.

---

# 42. MVP Roadmap

## Phase 0 — Foundation

- repository;
- docs;
- project structure;
- SQLite;
- migrations;
- basic domain models.

## Phase 1 — Campaign Core

- campaign;
- sessions;
- characters;
- NPCs;
- locations;
- events;
- timeline.

## Phase 2 — Historical Import

- import Markdown/TXT;
- entity extraction;
- event extraction;
- review;
- canon.

## Phase 3 — World State

- current state;
- relationships;
- knowledge scope;
- snapshots.

## Phase 4 — Recap

- short recap;
- full recap;
- narrative recap;
- local audio.

## Phase 5 — 3D Prototype

- Three.js/R3F;
- basic scene;
- grid;
- camera;
- miniatures;
- movement.

## Phase 6 — DM Deck

- environment;
- lighting;
- weather;
- audio;
- events;
- macros.

## Phase 7 — Scene Engine

- modular assets;
- scene blueprint;
- environment kits.

## Phase 8 — Cinematics

- video;
- 2D overlays;
- particles;
- camera sequences.

## Phase 9 — AI Director

- suggestions;
- automatic triggers;
- narrative-to-scene translation.

---

# 43. Primera prueba recomendada

No comenzar con toda la campaña.

Elegir:

- últimas 2 o 3 sesiones;
- personajes actuales;
- ubicación actual;
- uno o dos NPCs relevantes;
- una quest activa.

Objetivo:

```text
Import Session
    ↓
Extract Events
    ↓
DM Approval
    ↓
World State
    ↓
Current Scene
    ↓
Characters appear
    ↓
Generate Recap
    ↓
TTS
    ↓
Start Party
```

Si este ciclo funciona, ampliar hacia sesiones históricas.

---

# 44. Definition of Done para el primer prototipo

El primer prototipo se considera funcional cuando:

- una campaña puede crearse;
- una sesión puede importarse;
- los eventos pueden revisarse;
- el DM puede aprobar canon;
- el estado actual puede reconstruirse;
- los personajes aparecen en una escena;
- el DM puede moverlos;
- el DM puede cambiar iluminación/clima;
- el sistema puede guardar el estado;
- puede generar un recap;
- el recap puede reproducirse como audio;
- todo funciona localmente.

---

# 45. Reglas para futuras extensiones

Antes de agregar una funcionalidad:

1. ¿Necesita modificar el dominio?
2. ¿Necesita una nueva entidad?
3. ¿Necesita un nuevo evento?
4. ¿Puede funcionar localmente?
5. ¿Introduce una dependencia paga?
6. ¿Aumenta el contexto enviado al LLM?
7. ¿Puede ser cacheada?
8. ¿Rompe el canon?
9. ¿Necesita permisos?
10. ¿Puede probarse automáticamente?

No agregar funcionalidades grandes sin actualizar:

- DOMAIN.md
- ARCHITECTURE.md
- ROADMAP.md
- tests.

---

# 46. Regla principal del proyecto

> **The World State is the source of truth.**

La narrativa, IA, escenas, recaps y visualización deben consumir o proponer cambios sobre el World State.

Ninguna interfaz ni agente debe convertirse accidentalmente en una segunda fuente de verdad.

---

# 47. Documentación modular futura

Este SDD es la base general.

Los siguientes documentos deberían separarse posteriormente:

```text
CONTEXT.md          — Contexto raíz
PRODUCT.md          — Visión del producto
DOMAIN.md           — Dominio conceptual
ARCHITECTURE.md     — Arquitectura técnica
DATABASE.md         — Persistencia SQLite
EVENT-SYSTEM.md     — Pipeline de eventos
SESSION-SYSTEM.md   — Sistema de sesiones
WORLD-STATE.md      — Estado del mundo
DATA-MODEL.md       — Modelo de datos
DATA-DIRECTORY.md   — Estructura de directorios
CONTEXT-SYSTEM.md   — Sistema de contexto para agentes
INGESTION-AND-LORE.md — Importación de campaña histórica
SETTING-INGESTION.md  — Importación de setting externo
AGENTS-SYSTEM.md    — Integración de agentes IA
AGENTS.md           — Taxonomía de agentes
DM-CONTROLLER.md    — Panel de control del DM
RENDERER.md         — Motor de renderizado
SECURITY.md         — Seguridad y permisos
PERFORMANCE.md      — Rendimiento
TESTING.md          — Estrategia de pruebas
ROADMAP.md          — Hoja de ruta de desarrollo
```

La regla para los agentes será:

`CONTEXT.md -> documento del módulo -> código`

Nunca entregar al agente toda la documentación del proyecto si no la necesita.

---

# 48. Estado del documento

Version: 0.2  
Status: Base Architecture + Documentation Aligned  
Last updated: 2026-08-17  
Changes from v0.1:
- §7: Added `/backend`, `/data/settings`, `/data/setting-cache` to project structure
- §28: Renamed "DM Control Deck" → "DM Controller"
- §34: Updated agent taxonomy to match AGENTS.md (8 categories, 30+ agents)
- §35: Updated doc names to match actual /docs/ structure (21 active docs)
- §47: Updated modular doc list to match actual docs

Next milestone: implementar Campaign Core + SQLite + Session Import + Event Log.

Este documento debe evolucionar junto al proyecto y cada decisión arquitectónica importante debe registrarse como ADR.
