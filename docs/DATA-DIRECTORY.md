# DATA-DIRECTORY.md

> Organización física de los datos del RPG World Engine.
>
> Define cómo almacenar campañas, sesiones, lore, entidades, assets,
> mapas, escenas, recaps, fuentes originales, base de datos y archivos
> auxiliares dentro de un entorno local-first.

---

# 1. Objetivo

El proyecto debe poder almacenar una campaña completa sin depender
de servicios externos.

La estructura debe permitir:

- encontrar rápidamente información;
- separar datos originales de datos procesados;
- reducir el contexto enviado a los agentes;
- mantener históricos;
- almacenar assets pesados fuera de SQLite;
- realizar backups fácilmente;
- copiar una campaña completa;
- trabajar offline;
- permitir edición manual mediante Markdown;
- evolucionar posteriormente hacia una arquitectura remota.

---

# 2. Principio Fundamental

La estructura debe separar:

```text
SOURCE
KNOWLEDGE
STATE
RUNTIME
ASSETS
CACHE
BACKUPS
```

No mezclar todos los archivos en una única carpeta.

---

# 3. Estructura Principal

La estructura inicial recomendada:

```text
rpg-world-engine/
│
├── app/
│
├── campaigns/
│
├── database/
│
├── assets/
│
├── cache/
│
├── exports/
│
├── backups/
│
├── logs/
│
├── config/
│
└── docs/
```

---

# 4. Separación Application / Data

El código de la aplicación debe estar separado de los datos.

Incorrecto:

```text
src/
    characters/
    sessions/
    campaign.db
    maps/
    audio/
```

Correcto:

```text
app/
    source code

campaigns/
    campaign data

assets/
    media

database/
    databases
```

---

# 5. Campañas

Cada campaña debe tener su propio directorio.

Ejemplo:

```text
campaigns/
└── campaign-main/
```

---

# 6. Campaign Directory

Estructura inicial:

```text
campaigns/
└── campaign-main/
    ├── campaign.md
    ├── campaign.db
    ├── lore/
    ├── characters/
    ├── npcs/
    ├── factions/
    ├── locations/
    ├── items/
    ├── quests/
    ├── sessions/
    ├── events/
    ├── recaps/
    ├── maps/
    ├── scenes/
    ├── sources/
    ├── assets/
    ├── snapshots/
    └── exports/
```

---

# 7. Campaign.md

Cada campaña debe tener un archivo raíz:

```text
campaign.md
```

Debe contener información general.

Ejemplo:

```md
# Campaign

## Name

Nombre de la campaña.

## Description

Descripción general.

## Current Arc

Arco narrativo actual.

## Current Session

Sesión actual.

## Status

ACTIVE
```

---

# 8. Campaign DB

La SQLite de la campaña puede almacenarse directamente dentro de ella:

```text
campaign.db
```

Ventaja:

```text
campaign/
    campaign.db
    ...
```

permite transportar una campaña completa.

---

# 9. Database Alternative

Si posteriormente se necesitan múltiples campañas:

```text
database/
├── campaign-main.db
├── campaign-test.db
└── campaign-demo.db
```

Pero para el MVP se recomienda:

```text
campaign.db
```

dentro de cada campaña.

---

# 10. Lore

El lore debe almacenarse como Markdown.

```text
lore/
├── world.md
├── history.md
├── mythology.md
├── cultures/
├── religions/
├── regions/
└── important-events.md
```

---

# 11. Lore Principle

El lore humano-legible debe poder abrirse sin la aplicación.

Por ejemplo:

```text
lore/world.md
```

debe ser comprensible por sí mismo.

---

# 12. Characters

Los personajes jugadores deben tener archivos individuales.

```text
characters/
├── ardan.md
├── elena.md
├── marcus.md
└── ...
```

---

# 13. Character File

Ejemplo:

```md
# Ardan

## ID

character-ardan

## Player

PlayerName

## Status

ACTIVE

## Description

...

## Background

...

## Current Location

prison

## Important Relationships

...

## Notes

...
```

---

# 14. Character Metadata

Los datos estructurados importantes también deben existir en SQLite.

Markdown:

```text
Human-readable representation
```

SQLite:

```text
Structured representation
```

---

# 15. NPCs

Los NPC importantes también pueden tener archivos individuales.

```text
npcs/
├── varek.md
├── guard-captain.md
└── mysterious-stranger.md
```

---

# 16. NPC Scaling

No todos los NPC necesitan inmediatamente un archivo Markdown.

Para NPCs irrelevantes:

```text
SQLite only
```

Para NPCs importantes:

```text
SQLite
+
Markdown
```

---

# 17. NPC Importance

Se puede utilizar:

```text
MINOR
NORMAL
IMPORTANT
MAJOR
```

---

# 18. Factions

```text
factions/
├── cult-of-x.md
├── kingdom.md
├── guild.md
└── ...
```

---

# 19. Locations

Las ubicaciones deben tener archivos independientes cuando sean relevantes.

```text
locations/
├── world.md
├── kingdom.md
├── city.md
├── prison.md
└── vault.md
```

---

# 20. Location Hierarchy

La estructura física puede reflejar la jerarquía lógica.

Ejemplo:

```text
locations/
└── kingdom/
    └── city/
        └── prison/
            ├── prison.md
            ├── cells.md
            └── vault.md
```

Sin embargo, la relación oficial siempre debe estar en SQLite.

---

# 21. Why SQLite Relationship

No depender únicamente de la estructura de carpetas para representar:

```text
parent
child
located_in
connected_to
```

La estructura de carpetas es una ayuda visual.

SQLite es la fuente estructurada.

---

# 22. Items

```text
items/
├── legendary-sword.md
├── vault-key.md
└── mysterious-artifact.md
```

No es necesario crear un Markdown para cada objeto trivial.

---

# 23. Quests

```text
quests/
├── main-quest.md
├── vault-investigation.md
└── missing-person.md
```

---

# 24. Sessions

Las sesiones son una de las partes más importantes.

```text
sessions/
├── session-001/
├── session-002/
├── session-003/
└── ...
```

---

# 25. Session Directory

Cada sesión puede contener:

```text
session-015/
├── session.md
├── raw.md
├── events.md
├── recap.md
├── narration.md
├── sources/
└── assets/
```

---

# 26. session.md

Contiene la información estructurada de la sesión.

Ejemplo:

```md
# Session 015

## Date

2026-08-15

## Status

COMPLETED

## Participants

- Ardan
- Elena
- Marcus

## Location

Prison

## Summary

...

## Major Events

...

## Consequences

...
```

---

# 27. raw.md

Debe conservar las notas originales.

Ejemplo:

```text
sessions/session-015/raw.md
```

Regla:

> El contenido RAW no debe ser modificado automáticamente.

---

# 28. Raw Data

Puede provenir de:

```text
DM Notes
Player Notes
Chat
Transcript
Audio
Imported Document
```

---

# 29. events.md

Representa los eventos procesados.

Ejemplo:

```md
# Events

## Event 001

The party entered the prison.

## Event 002

Ardan discovered the hidden passage.

## Event 003

The vault door was opened.
```

---

# 30. Recap

La recapitulación de la sesión:

```text
sessions/session-015/recap.md
```

también puede copiarse a:

```text
recaps/session-015.md
```

Esto permite búsquedas rápidas.

---

# 31. Recap Principle

La versión oficial debe identificarse claramente.

Ejemplo:

```text
DRAFT
REVIEW
APPROVED
```

---

# 32. Narration

El guion preparado para voz puede estar en:

```text
sessions/session-015/narration.md
```

Ejemplo:

```md
# Session Recap Narration

[PAUSE]

Previously...

[PAUSE]

The group entered...
```

---

# 33. Sources

Las fuentes originales de cada sesión:

```text
sessions/session-015/sources/
```

Ejemplo:

```text
sources/
├── dm-notes.md
├── player-notes.md
├── transcript.txt
└── session-audio.mp3
```

---

# 34. Events Global Directory

Aunque cada sesión tenga sus eventos, puede existir:

```text
events/
```

para representaciones globales.

Ejemplo:

```text
events/
├── event-0001.md
├── event-0002.md
└── ...
```

No es obligatorio generar todos estos archivos en el MVP.

SQLite puede manejar los eventos globales.

---

# 35. Maps

Los mapas deben separarse por función.

```text
maps/
├── world/
├── regions/
├── cities/
├── dungeons/
└── battlemaps/
```

---

# 36. Map Example

```text
maps/
└── dungeons/
    └── prison/
        ├── prison-map.png
        ├── prison-map.json
        └── prison.md
```

---

# 37. Map Metadata

Un mapa puede tener:

```text
map.json
```

Ejemplo:

```json
{
  "map_id": "map-prison",
  "width": 2048,
  "height": 1536,
  "grid_size": 64,
  "location_id": "location-prison"
}
```

---

# 38. Scenes

Las escenas virtuales:

```text
scenes/
├── prison/
├── vault/
├── cave/
└── tunnels/
```

---

# 39. Scene Directory

Ejemplo:

```text
scenes/
└── prison/
    ├── scene.md
    ├── scene.json
    ├── environment/
    ├── characters/
    ├── props/
    ├── audio/
    ├── video/
    └── effects/
```

---

# 40. Scene.md

Debe describir la escena en términos humanos.

Ejemplo:

```md
# Prison Scene

## Environment

Dark underground prison.

## Lighting

Low light.

## Characters

- Ardan
- Elena

## Atmosphere

Cold, humid and oppressive.
```

---

# 41. Scene.json

Contiene configuración estructurada.

Ejemplo:

```json
{
  "scene_id": "scene-prison",
  "location_id": "location-prison",
  "environment": "prison",
  "lighting": {
    "preset": "dark"
  }
}
```

---

# 42. Assets

Los assets pueden ser globales o específicos de una campaña.

Para el MVP:

```text
campaign/assets/
```

---

# 43. Asset Categories

```text
assets/
├── characters/
├── environments/
├── maps/
├── props/
├── textures/
├── images/
├── video/
├── audio/
├── music/
├── voices/
└── models/
```

---

# 44. Character Assets

```text
assets/
└── characters/
    └── ardan/
        ├── portrait.png
        ├── token.png
        ├── model.glb
        └── metadata.json
```

---

# 45. Token Representation

Para el concepto tipo ficha de ajedrez:

```text
assets/characters/ardan/
```

puede contener:

```text
token.png
```

o:

```text
token.glb
```

---

# 46. 2D Character

Puede utilizar:

```text
PNG
WEBP
SVG
```

---

# 47. 3D Character

Preferentemente:

```text
GLB
GLTF
```

para el MVP.

---

# 48. Environment Assets

Ejemplo:

```text
assets/environments/
├── prison/
├── cave/
├── vault/
├── forest/
└── tunnels/
```

---

# 49. Video Assets

```text
assets/video/
├── cinematic/
├── transitions
├── backgrounds/
└── environmental/
```

---

# 50. Audio Assets

```text
assets/audio/
├── ambience/
├── music/
├── effects/
└── voices/
```

---

# 51. Audio Separation

No mezclar:

```text
MUSIC
```

con:

```text
SFX
```

ni:

```text
VOICE
```

---

# 52. Sources vs Assets

Una fuente original y un asset generado no son necesariamente lo mismo.

Ejemplo:

```text
sources/
    dm-map.jpg
```

es una fuente.

Mientras:

```text
assets/maps/
    prison-3d.glb
```

es un asset generado/procesado.

---

# 53. Generated Assets

Los recursos generados por IA deben identificarse.

Ejemplo:

```text
assets/generated/
```

o mediante metadata.

---

# 54. Generated Metadata

Ejemplo:

```json
{
  "generated": true,
  "generator": "scene-agent",
  "version": "1.0",
  "source": "prison-reference.png"
}
```

---

# 55. Cache

Los resultados temporales deben almacenarse fuera de los datos permanentes.

```text
cache/
├── llm/
├── embeddings/
├── thumbnails/
├── processed-images/
└── temp/
```

---

# 56. Cache Rule

El contenido de:

```text
cache/
```

debe poder eliminarse sin perder la campaña.

---

# 57. Embeddings

Si posteriormente se utiliza búsqueda semántica:

```text
cache/embeddings/
```

puede contener los vectores.

No son fuente de verdad.

---

# 58. Thumbnail Cache

Para mejorar la UI:

```text
cache/thumbnails/
```

puede almacenar versiones pequeñas de:

```text
Maps
Images
Characters
Scenes
Videos
```

---

# 59. Logs

Los logs de ejecución:

```text
logs/
```

pueden organizarse:

```text
logs/
├── app/
├── agents/
├── runtime/
└── errors/
```

---

# 60. Agent Logs

Ejemplo:

```text
logs/agents/2026-08-17.log
```

Puede registrar:

```text
Agent
Task
Duration
Result
Error
```

No almacenar prompts sensibles innecesariamente.

---

# 61. Backups

```text
backups/
├── daily/
├── weekly/
└── manual/
```

---

# 62. Backup Principle

Un backup de campaña debe contener:

```text
campaign.db
+
important source files
+
assets
```

---

# 63. Backup Format

Inicialmente:

```text
ZIP
```

Ejemplo:

```text
campaign-main-2026-08-17.zip
```

---

# 64. Exports

Los exports deben estar separados.

```text
exports/
├── markdown/
├── json/
├── html/
└── backups/
```

---

# 65. Markdown Export

Puede generar:

```text
exports/markdown/
├── lore/
├── characters/
├── locations/
├── sessions/
└── quests/
```

---

# 66. JSON Export

Útil para:

```text
API
Debugging
Migration
External Tools
```

---

# 67. Temporary Data

No guardar datos temporales dentro de:

```text
campaign/
```

Preferir:

```text
cache/temp/
```

---

# 68. Config

Configuraciones de aplicación:

```text
config/
├── app.toml
├── agents.toml
├── runtime.toml
└── paths.toml
```

---

# 69. Campaign Configuration

La configuración específica de una campaña puede estar en:

```text
campaign/config/
```

Ejemplo:

```text
campaign-main/
└── config/
    ├── campaign.yaml
    └── visual.yaml
```

---

# 70. Secrets

Nunca almacenar API keys dentro de:

```text
campaign/
```

ni:

```text
Markdown
```

---

# 71. Environment Variables

Los secretos deben utilizar:

```text
.env
```

y quedar fuera del control de versiones.

Ejemplo:

```text
OPENAI_API_KEY
ELEVENLABS_API_KEY
```

si eventualmente se utilizan.

---

# 72. Git

El código puede utilizar Git.

Los datos de campaña deben tratarse cuidadosamente.

No subir automáticamente:

```text
Audio
Video
Large Models
Large Textures
```

---

# 73. Gitignore

Inicialmente:

```text
cache/
logs/
backups/
*.db
.env
```

Sin embargo, esto puede modificarse si se decide versionar la campaña.

---

# 74. Campaign Versioning

A futuro puede versionarse:

```text
campaign.db
```

pero SQLite binaria no es ideal para Git.

Una alternativa:

```text
Markdown
+
JSON snapshots
```

para versionado.

---

# 75. Immutable Sources

Los siguientes archivos deberían considerarse inmutables:

```text
Raw DM Notes
Original Audio
Original Images
Original Maps
Original Transcripts
```

---

# 76. Editable Knowledge

Los siguientes pueden ser editables:

```text
Lore Markdown
Character Markdown
Location Markdown
Quest Markdown
Recap Draft
Scene Configuration
```

---

# 77. Generated Content

Puede sobrescribirse solamente cuando existe una nueva versión.

Preferir:

```text
scene-v1.json
scene-v2.json
```

o metadata de versión.

---

# 78. File Naming

Usar:

```text
lowercase
kebab-case
```

Ejemplo:

```text
session-015.md
vault-door.md
cult-of-ashes.md
```

---

# 79. Avoid Spaces

Evitar:

```text
"Sesión 15 Final Definitiva.md"
```

Preferir:

```text
session-015.md
```

---

# 80. IDs vs Filenames

El filename debe ser legible.

El ID real pertenece al contenido/SQLite.

Ejemplo:

```text
characters/ardan.md
```

dentro:

```yaml
id: 8c5...
slug: ardan
```

---

# 81. Session Naming

Usar tres dígitos:

```text
session-001
session-002
session-003
```

aunque inicialmente existan pocas sesiones.

---

# 82. Historical Import

Como la campaña comenzó el:

```text
2025-12-01
```

aproximadamente, la carga histórica debe respetar las fechas reales conocidas.

No inventar fechas de sesiones faltantes.

---

# 83. Missing Sessions

Si se sabe que no hubo sesión:

No crear:

```text
session-004
```

solo porque existe `session-003` y luego `session-005`.

La numeración representa sesiones reales.

---

# 84. Session Date

Si la fecha exacta es desconocida:

```yaml
date: null
date_precision: unknown
```

No inventar.

---

# 85. Historical Import Structure

Para importar material existente:

```text
sources/
└── historical-import/
    ├── 2025/
    └── 2026/
```

---

# 86. Historical Sessions

Después del procesamiento:

```text
sessions/
├── session-001/
├── session-002/
├── session-003/
...
```

---

# 87. Import Pipeline

```text
Historical Source
        │
        ▼
sources/historical-import/
        │
        ▼
Ingestion Agent
        │
        ▼
Raw Data
        │
        ▼
Session Processor
        │
        ▼
Events / Entities
        │
        ▼
DM Review
        │
        ▼
Canon
```

---

# 88. Do Not Process Everything At Once

La campaña histórica debe cargarse progresivamente.

No:

```text
100% of campaign
→
LLM
```

Preferir:

```text
Session 001
→ Process
→ Review

Session 002
→ Process
→ Review

Session 003
→ Process
→ Review
```

---

# 89. Context Loading

Los agentes no deben leer:

```text
campaign/
```

completo.

Deben solicitar:

```text
Relevant Context
```

---

# 90. Example

Si el DM está preparando una escena en una prisión:

El agente debería cargar:

```text
locations/prison.md
characters/current.md
relevant-npcs
recent-events
active-quests
prison-map
scene configuration
```

No:

```text
entire-history-of-campaign.md
```

---

# 91. Context Layers

El contexto puede dividirse:

```text
L0 — SYSTEM
L1 — CAMPAIGN
L2 — ARC
L3 — CURRENT SESSION
L4 — CURRENT SCENE
L5 — IMMEDIATE EVENTS
```

---

# 92. L0

Información extremadamente estable:

```text
System Rules
Agent Rules
Data Model
```

---

# 93. L1

Contexto general:

```text
Campaign
World
Major Lore
```

---

# 94. L2

Contexto del arco actual:

```text
Current Story Arc
Major Characters
Relevant Factions
Active Quests
```

---

# 95. L3

Sesión actual:

```text
Session
Participants
Current Location
Recent Events
```

---

# 96. L4

Escena:

```text
Scene
Environment
Characters
Map
Objects
Atmosphere
```

---

# 97. L5

Eventos inmediatos:

```text
Last Actions
Current Dialogue
Current DM Instruction
```

---

# 98. Context Rule

Cargar primero:

```text
L5
```

y ampliar hacia atrás solamente si hace falta.

---

# 99. Example Context Request

Pregunta:

```text
"¿Quién es Varek?"
```

Primero buscar:

```text
npcs/varek.md
```

Luego:

```text
relationships
recent events
relevant faction
```

No cargar toda la campaña.

---

# 100. Example Scene Context

Pregunta:

```text
"Preparar la bóveda."
```

Contexto:

```text
Location: Vault
Parent: Prison
Relevant Events
Active Quest
Current Characters
Vault Map
Current Scene
```

---

# 101. Context Cache

Los contextos repetidos pueden cachearse.

Ejemplo:

```text
cache/context/
```

Pero deben invalidarse cuando cambia:

```text
World State
Relevant Entity
Current Session
```

---

# 102. Context Invalidation

Si cambia:

```text
vault-door = OPEN
```

debe invalidarse el contexto de la escena correspondiente.

---

# 103. Database / Markdown Synchronization

SQLite y Markdown pueden divergir.

Por lo tanto debe existir una estrategia.

---

# 104. Preferred Rule

Para datos estructurados:

```text
SQLite
```

Para texto narrativo:

```text
Markdown
```

---

# 105. Example

Character:

```text
SQLite:
status = ACTIVE
location_id = prison
```

Markdown:

```text
# Ardan

Actualmente se encuentra en la prisión.
```

Si existe contradicción, debe detectarse.

---

# 106. Synchronization Agent

A futuro:

```text
SYNC AGENT
```

puede detectar:

```text
SQLite ≠ Markdown
```

---

# 107. No Silent Synchronization

Nunca modificar silenciosamente información importante.

Debe generar:

```text
Sync Proposal
```

---

# 108. Assets and Database

SQLite almacena:

```text
asset_id
path
type
metadata
hash
```

Filesystem almacena:

```text
actual file
```

---

# 109. Asset Hash

Para detectar duplicados:

```text
SHA-256
```

puede utilizarse como hash.

---

# 110. Duplicate Assets

Si dos archivos tienen el mismo hash:

```text
same content
```

pueden reutilizar el mismo asset.

---

# 111. Asset Versioning

No eliminar automáticamente assets antiguos.

Ejemplo:

```text
scene-prison-v1.glb
scene-prison-v2.glb
```

---

# 112. Current Asset

SQLite puede indicar:

```text
is_current = true
```

---

# 113. Unused Assets

Los assets no utilizados pueden marcarse:

```text
ORPHANED
```

y posteriormente limpiarse manualmente.

---

# 114. Campaign Package

Una campaña completa debería verse aproximadamente así:

```text
campaign-main/
│
├── campaign.md
├── campaign.db
│
├── lore/
│
├── characters/
│
├── npcs/
│
├── factions/
│
├── locations/
│
├── items/
│
├── quests/
│
├── sessions/
│
├── events/
│
├── recaps/
│
├── maps/
│
├── scenes/
│
├── sources/
│
├── assets/
│
├── snapshots/
│
└── exports/
```

---

# 115. Complete Project

La estructura completa puede ser:

```text
rpg-world-engine/
│
├── app/
│
├── campaigns/
│   └── campaign-main/
│
├── config/
│
├── cache/
│
├── logs/
│
├── backups/
│
├── exports/
│
└── docs/
```

---

# 116. Minimal Installation

Para probar el MVP no debería ser necesario crear todo.

Mínimo:

```text
rpg-world-engine/
├── app/
├── campaigns/
│   └── campaign-main/
│       ├── campaign.md
│       └── campaign.db
└── config/
```

Las carpetas restantes pueden crearse bajo demanda.

---

# 117. Lazy Directory Creation

La aplicación puede crear:

```text
sessions/
characters/
locations/
```

cuando realmente se necesiten.

Esto mantiene limpio el proyecto inicial.

---

# 118. Portable Mode

El sistema debería soportar:

```text
Portable Campaign
```

donde todo está dentro de:

```text
campaign-main/
```

Esto permite copiar la campaña a otra computadora.

---

# 119. Local Development

Durante desarrollo:

```text
campaigns/dev/
```

puede utilizarse una campaña de prueba.

Ejemplo:

```text
campaigns/
├── campaign-main/
└── campaign-dev/
```

---

# 120. Test Campaign

La campaña de pruebas debe utilizar datos ficticios.

Nunca utilizar:

```text
campaign-main
```

para pruebas destructivas.

---

# 121. Migration Files

Las modificaciones de SQLite deben versionarse mediante:

```text
app/migrations/
```

Ejemplo:

```text
001_initial.sql
002_add_relationships.sql
003_add_assets.sql
```

---

# 122. Migration Rule

Nunca modificar manualmente una tabla de producción sin una migración
documentada.

---

# 123. Database Backup Before Migration

Antes de ejecutar una migración:

```text
campaign.db
```

debe poder respaldarse.

---

# 124. Import State

Durante una importación histórica puede utilizarse:

```text
cache/import/
```

para información temporal.

---

# 125. Import Example

```text
cache/import/session-015/
├── extracted.md
├── entities.json
├── events.json
└── validation.json
```

Una vez aprobado:

```text
campaign/
```

recibe solamente los datos definitivos.

---

# 126. Validation Reports

Los agentes pueden producir:

```text
cache/validation/
```

Ejemplo:

```text
session-015-validation.json
```

---

# 127. Error Isolation

Un error durante procesamiento nunca debe destruir:

```text
RAW SOURCE
```

---

# 128. Important Rule

La información original debe poder recuperarse incluso si:

```text
AI
Database
Application
Agent
```

fallan.

---

# 129. Data Recovery

El sistema debe poder reconstruir:

```text
Campaign
```

utilizando:

```text
Raw Sources
+
SQLite Backup
+
Assets
```

---

# 130. Final Principle

La estructura física debe ser:

```text
Simple enough for humans
+
Structured enough for machines
+
Cheap enough for local AI
+
Flexible enough for future growth
```

---

# 131. Recommended MVP Structure

La primera implementación debería comenzar solamente con:

```text
rpg-world-engine/
│
├── app/
│
├── campaigns/
│   └── campaign-main/
│       ├── campaign.md
│       ├── campaign.db
│       │
│       ├── lore/
│       ├── characters/
│       ├── npcs/
│       ├── locations/
│       ├── quests/
│       ├── sessions/
│       ├── recaps/
│       ├── sources/
│       ├── maps/
│       └── assets/
│
├── config/
│
└── docs/
```

---

# 132. Growth Path

Posteriormente:

```text
MVP
 ↓
More Sessions
 ↓
More Lore
 ↓
More Assets
 ↓
More Scenes
 ↓
Runtime
 ↓
3D World
 ↓
Live Party System
```

La estructura de datos no debe necesitar ser rediseñada en cada etapa.

---

# 133. Final Rule

El sistema debe poder pasar de:

```text
5 sessions
```

a:

```text
100+ sessions
```

sin convertir:

```text
campaign/
```

en un único archivo gigantesco.

La información debe permanecer dividida por:

```text
Entity
Session
Domain
Asset
Source
State
```

y los agentes deben recuperar únicamente el subconjunto relevante.
