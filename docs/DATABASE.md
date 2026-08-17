# DATABASE.md

> Especificación de persistencia de RPG World Engine.
>
> Define la estrategia de almacenamiento local, estructura conceptual de SQLite,
> relaciones, índices, búsqueda, snapshots, migraciones y gestión de assets.
>
> Este documento no define código de acceso a datos ni ORM específico.

---

# 1. Propósito

La base de datos debe almacenar el estado persistente de una campaña de rol.

Debe permitir conservar:

- campañas;
- sesiones;
- personajes;
- NPCs;
- facciones;
- ubicaciones;
- objetos;
- quests;
- eventos;
- relaciones;
- conocimiento;
- secretos;
- escenas;
- assets;
- recaps;
- snapshots;
- metadatos de IA;
- provenance.

La base debe ser:

- local;
- liviana;
- portable;
- respaldable;
- consistente;
- fácilmente inspeccionable;
- resistente a corrupción;
- preparada para crecimiento.

---

# 2. Decisión inicial

La tecnología inicial será:

```text
SQLite
```

No se utilizará inicialmente:

```text
PostgreSQL
MySQL
MongoDB
Redis
Neo4j
Vector Database
```

Esto no significa que nunca puedan incorporarse.

Significa que no se justifican para el MVP.

---

# 3. Filosofía Local First

El sistema debe poder funcionar con:

```text
Application
    │
    ├── SQLite
    │
    └── Local Files
```

Sin requerir:

- servidor de base de datos;
- cloud;
- cuenta externa;
- servicio de autenticación;
- API paga.

---

# 4. Estructura física

La aplicación tendrá una estructura aproximada:

```text
rpg-world-engine/
│
├── app/
│
├── data/
│   ├── campaign.db
│   │
│   ├── backups/
│   │
│   └── migrations/
│
├── assets/
│   ├── characters/
│   ├── locations/
│   ├── items/
│   ├── scenes/
│   ├── audio/
│   ├── video/
│   ├── images/
│   └── generated/
│
├── imports/
│   ├── sessions/
│   ├── notes/
│   ├── transcripts/
│   └── media/
│
├── exports/
│
└── logs/
```

---

# 5. SQLite y Assets

Los archivos grandes NO deben almacenarse directamente dentro de SQLite.

Evitar:

```text
BLOB gigante
```

para:

- modelos 3D;
- videos;
- audio;
- texturas;
- imágenes grandes.

SQLite debe almacenar metadata y referencias.

Ejemplo:

```text
Asset
├── id
├── type
├── filename
├── path
├── hash
├── size
└── metadata
```

---

# 6. Identificadores

Todas las entidades principales deben poseer un identificador único.

Se recomienda utilizar:

```text
UUID
```

o un identificador equivalente estable.

No utilizar el nombre como identificador.

Incorrecto:

```text
character_id = "Ardan"
```

Correcto:

```text
character_id = "01J..."
name = "Ardan"
```

Esto permite renombrar entidades sin romper relaciones.

---

# 7. Naming

Las tablas utilizarán nombres consistentes.

Recomendación:

```text
campaigns
sessions
characters
npcs
factions
locations
items
creatures
quests
events
relationships
knowledge
secrets
scenes
assets
recaps
snapshots
sources
```

Las tablas auxiliares podrán utilizar nombres descriptivos.

---

# 8. Campaign

Tabla conceptual:

```text
campaigns

id
name
description
system
status
created_at
updated_at
current_session_id
```

---

# 9. Sessions

```text
sessions

id
campaign_id
session_number
title
real_date
world_date
status
summary
source_id
created_at
updated_at
```

Relación:

```text
Campaign 1 ─── N Sessions
```

---

# 10. Characters

```text
characters

id
campaign_id
name
description
status
player_name
current_location_id
created_at
updated_at
```

No almacenar todo el estado narrativo complejo directamente en esta tabla.

Los cambios históricos deben provenir de eventos.

---

# 11. NPCs

```text
npcs

id
campaign_id
name
description
status
current_location_id
created_at
updated_at
```

---

# 12. Factions

```text
factions

id
campaign_id
name
description
status
created_at
updated_at
```

---

# 13. Locations

```text
locations

id
campaign_id
parent_location_id
name
description
type
status
created_at
updated_at
```

La relación:

```text
locations.parent_location_id
```

permite representar jerarquías.

Ejemplo:

```text
Kingdom
 └── City
      └── Castle
           └── Dungeon
                └── Cell
```

---

# 14. Items

```text
items

id
campaign_id
name
description
type
status
created_at
updated_at
```

La posesión se manejará mediante relaciones/eventos.

---

# 15. Creatures

```text
creatures

id
campaign_id
name
description
type
status
created_at
updated_at
```

---

# 16. Quests

```text
quests

id
campaign_id
name
description
status
created_at
updated_at
```

---

# 17. Events

Esta es una de las tablas centrales del sistema.

```text
events

id
campaign_id
session_id
type
timestamp
world_time
location_id
description
canon_status
confidence
source_id
created_at
```

---

# 18. Event Data

Los eventos pueden requerir información variable.

No crear una columna para absolutamente cada posibilidad.

Ejemplo:

```text
EVENT:
ITEM_TRANSFERRED
```

puede necesitar:

```text
item_id
from_character
to_character
```

Mientras:

```text
LOCATION_DISCOVERED
```

puede necesitar:

```text
location_id
discoverer_id
```

Por esto se puede utilizar una estructura adicional:

```text
event_data
```

con JSON.

Ejemplo conceptual:

```json
{
  "item_id": "item-123",
  "from": "character-001",
  "to": "character-002"
}
```

---

# 19. Regla para JSON

JSON debe utilizarse para:

```text
Datos variables
Metadata
Configuraciones
Payloads de eventos
Datos generados por IA
```

No utilizar JSON para relaciones fundamentales que necesitan consultas frecuentes.

Incorrecto:

```text
character.relationships = JSON gigante
```

Correcto:

```text
relationships
```

como tabla relacional.

---

# 20. Relationships

Tabla:

```text
relationships

id
campaign_id
source_entity_type
source_entity_id
relationship_type
target_entity_type
target_entity_id
strength
status
valid_from
valid_until
created_at
updated_at
```

Ejemplo:

```text
character-001
    │
    └── TRUSTS ──>
                    npc-004
```

---

# 21. Polymorphic Relationships

SQLite no posee una foreign key tradicional que apunte a varias tablas diferentes.

Por eso:

```text
source_entity_type
source_entity_id
```

se utilizarán inicialmente para relaciones polimórficas.

Ejemplo:

```text
source_entity_type = "character"
source_entity_id   = "char-001"
```

---

# 22. Knowledge

Tabla:

```text
knowledge

id
campaign_id
subject_entity_type
subject_entity_id
knowledge_type
target_entity_type
target_entity_id
status
confidence
source_id
created_at
updated_at
```

Ejemplo:

```text
Character A
    KNOWS
NPC X
```

---

# 23. Knowledge vs Canon

Nunca almacenar:

```text
character.knows_secret = true
```

sin información adicional.

El conocimiento debe poder rastrearse.

Ejemplo:

```text
Knowledge
   ↓
Source
   ↓
Session
   ↓
Event
```

---

# 24. Secrets

```text
secrets

id
campaign_id
name
description
status
created_at
updated_at
```

La relación entre secretos y entidades se manejará mediante `knowledge`.

---

# 25. Sources

Tabla fundamental para provenance.

```text
sources

id
campaign_id
type
title
path
content_hash
created_at
metadata
```

Tipos:

```text
DM_NOTE
PLAYER_NOTE
RECAP
AUDIO
TRANSCRIPT
IMAGE
PDF
MARKDOWN
MANUAL_ENTRY
```

---

# 26. Source Content

El contenido original puede mantenerse como archivo.

Ejemplo:

```text
imports/sessions/session-07.md
```

La base almacena:

```text
source_id
path
hash
metadata
```

Esto permite mantener el material original intacto.

---

# 27. Provenance

Cuando la IA genera información:

```text
Generated Entity
      ↓
Generated Event
      ↓
Source
```

Debe ser posible identificar:

- qué fuente originó el dato;
- qué sesión;
- qué documento;
- qué modelo/agente lo procesó;
- cuándo fue procesado.

---

# 28. AI Processing Metadata

Puede existir una tabla:

```text
ai_runs

id
campaign_id
source_id
agent
model
prompt_version
started_at
completed_at
status
input_hash
output_hash
metadata
```

Esto permite reproducibilidad y debugging.

---

# 29. Scenes

```text
scenes

id
campaign_id
location_id
name
description
status
scene_type
created_at
updated_at
```

Una Location puede tener múltiples Scenes.

---

# 30. Scene State

El estado dinámico de una escena puede utilizar JSON:

```text
scene_state

scene_id
state_json
updated_at
```

Ejemplo:

```json
{
  "weather": "rain",
  "timeOfDay": "night",
  "lighting": "storm",
  "music": "battle_theme"
}
```

No todo esto necesita convertirse en columnas.

---

# 31. Assets

```text
assets

id
campaign_id
type
name
path
mime_type
size
hash
metadata
created_at
updated_at
```

---

# 32. Asset Hash

Cada asset debería poseer un hash.

Ejemplo:

```text
SHA-256
```

Esto permite detectar:

- duplicados;
- archivos modificados;
- corrupción;
- assets faltantes.

---

# 33. Asset Versioning

Un asset puede tener versiones.

Ejemplo:

```text
Dragon
 ├── v1
 ├── v2
 └── v3
```

No reemplazar silenciosamente un asset utilizado por una escena histórica.

---

# 34. Character Visuals

Puede existir una tabla:

```text
character_visuals

id
character_id
asset_id
type
is_current
metadata
created_at
```

Ejemplo:

```text
Character
    ↓
CharacterVisual
    ↓
Asset
```

---

# 35. Recaps

```text
recaps

id
campaign_id
session_id
type
title
content
source_hash
created_at
updated_at
```

Tipos:

```text
QUICK
FULL
NARRATIVE
```

---

# 36. Recap Audio

El audio no se almacena directamente en SQLite.

Se utiliza:

```text
recap_audio

id
recap_id
asset_id
voice
duration
created_at
```

---

# 37. Snapshots

Los snapshots representan el World State en un punto específico.

```text
snapshots

id
campaign_id
session_id
label
created_at
state_hash
```

El estado puede almacenarse:

```text
snapshot_data
```

como JSON comprimido o estructura equivalente.

---

# 38. Snapshot Purpose

Los snapshots permiten:

- rollback;
- debugging;
- comparación;
- recuperación;
- reconstrucción histórica;
- pruebas de IA.

---

# 39. Snapshot Strategy

No crear necesariamente un snapshot después de cada evento.

Inicialmente:

```text
Session Approved
        ↓
Create Snapshot
```

Posteriormente podrían existir:

```text
Manual Snapshot
Automatic Snapshot
Pre-Session Snapshot
Post-Session Snapshot
```

---

# 40. FTS5

SQLite FTS5 será utilizado para búsqueda textual.

Objetivo:

```text
Buscar:
"Varek"
```

y encontrar:

- sesiones;
- eventos;
- fuentes;
- recaps;
- descripciones;
- notas;
- lore.

---

# 41. Full Text Search

Tablas FTS posibles:

```text
documents_fts
entities_fts
events_fts
```

No es necesario implementar todas inicialmente.

El MVP puede comenzar con:

```text
documents_fts
```

---

# 42. Búsqueda híbrida

La arquitectura futura puede soportar:

```text
Keyword Search
      +
FTS5
      +
Semantic Search
```

Pero el MVP no necesita una vector database.

---

# 43. Embeddings

Los embeddings son opcionales.

No deben introducirse simplemente porque el proyecto utiliza IA.

Primero evaluar:

```text
FTS5
+
Entity Search
+
Relationship Traversal
+
Event Filtering
```

Si posteriormente resulta insuficiente:

```text
Embeddings
```

podrán añadirse.

---

# 44. Indexación

Índices iniciales recomendados:

```text
sessions.campaign_id
events.campaign_id
events.session_id
events.location_id

characters.campaign_id
characters.current_location_id

npcs.campaign_id
npcs.current_location_id

locations.campaign_id
locations.parent_location_id

quests.campaign_id

relationships.campaign_id
relationships.source_entity_id
relationships.target_entity_id

knowledge.campaign_id
knowledge.subject_entity_id
knowledge.target_entity_id
```

---

# 45. Foreign Keys

SQLite debe utilizar:

```sql
PRAGMA foreign_keys = ON;
```

Las relaciones estructurales importantes deben utilizar foreign keys reales.

---

# 46. Transactions

Las operaciones que modifiquen múltiples tablas deben utilizar transacciones.

Ejemplo:

```text
ITEM_TRANSFERRED

BEGIN TRANSACTION

create event
update relationship
update current state

COMMIT
```

Si algo falla:

```text
ROLLBACK
```

---

# 47. Event and State Consistency

Cuando un evento cambia el estado:

```text
Event
   ↓
State Projection
```

ambos cambios deben ser consistentes.

No debe existir:

```text
Event says:
Ardan owns Sword

Database says:
Mira owns Sword
```

sin una explicación histórica.

---

# 48. Current State

No necesariamente se debe calcular todo el World State recorriendo todos los eventos
cada vez.

Inicialmente pueden existir campos/materializaciones para:

```text
current_location
current_owner
current_status
```

Estos son datos derivados.

La historia permanece en los eventos.

---

# 49. Event Sourcing

El sistema NO será inicialmente un Event Sourcing puro.

Se utilizará un enfoque híbrido:

```text
Events
+
Current State
+
Snapshots
```

Esto proporciona:

- historial;
- rendimiento;
- simplicidad.

---

# 50. Soft Delete

Las entidades importantes no deberían eliminarse físicamente inmediatamente.

Preferir:

```text
status = ARCHIVED
```

o:

```text
deleted_at
```

según el caso.

Esto evita destruir lore accidentalmente.

---

# 51. Retention

Los datos narrativos históricos no deben eliminarse automáticamente.

Especialmente:

- eventos;
- sesiones;
- fuentes;
- snapshots;
- recaps.

El almacenamiento multimedia sí puede tener políticas de limpieza.

---

# 52. Database Backup

El archivo SQLite debe poder copiarse directamente.

Backup mínimo:

```text
campaign.db
```

Debe existir una estrategia para:

```text
manual backup
automatic backup
pre-migration backup
```

---

# 53. Backup Before Migration

Antes de modificar el esquema:

```text
Backup
   ↓
Migration
   ↓
Validation
```

Si falla:

```text
Restore
```

---

# 54. Database Integrity

Debe existir una rutina de validación.

Ejemplo conceptual:

```text
PRAGMA integrity_check;
```

También validar:

- foreign keys;
- referencias a assets;
- entidades huérfanas;
- eventos inválidos;
- relaciones inválidas.

---

# 55. Migrations

El esquema debe versionarse.

Ejemplo:

```text
migrations/
├── 001_initial.sql
├── 002_add_sources.sql
├── 003_add_knowledge.sql
└── 004_add_snapshots.sql
```

Nunca modificar una migración ya aplicada.

Crear una nueva migración.

---

# 56. Schema Version

La aplicación debe conocer:

```text
Current Schema Version
```

Ejemplo:

```text
DATABASE_SCHEMA_VERSION = 4
```

---

# 57. Development Database

Durante desarrollo puede utilizarse:

```text
data/dev/campaign.db
```

Esto permite realizar pruebas sin afectar los datos reales.

---

# 58. Test Database

Los tests deben utilizar una base separada:

```text
data/test/test.db
```

o una SQLite temporal en memoria.

Nunca ejecutar tests destructivos contra la campaña real.

---

# 59. Campaign Portability

Una campaña debería poder copiarse como unidad.

Conceptualmente:

```text
campaign/
├── campaign.db
├── assets/
├── imports/
└── metadata.json
```

Esto permitiría:

```text
PC A
 ↓
Backup
 ↓
PC B
 ↓
Restore
```

sin depender de un servidor.

---

# 60. Export

Debe ser posible exportar información a formatos legibles:

```text
Markdown
JSON
CSV
```

Prioridad:

```text
Markdown
JSON
```

---

# 61. Import

El sistema debe poder importar:

```text
Markdown
TXT
JSON
PDF
Images
Audio transcripts
```

No todos serán soportados en el MVP.

Prioridad:

```text
Markdown
TXT
JSON
```

---

# 62. Historical Import

El flujo recomendado:

```text
Source File
    ↓
Source Record
    ↓
Extraction
    ↓
Candidate Entities
    ↓
Candidate Events
    ↓
Candidate Relationships
    ↓
DM Review
    ↓
Canon
```

Nunca:

```text
Source File
    ↓
Direct Canon
```

---

# 63. AI-Generated Data

Los datos generados por IA deben poder identificarse.

Ejemplo:

```text
origin = AI
```

y conservar:

```text
ai_run_id
confidence
source_id
```

---

# 64. Manual Data

Los datos introducidos manualmente por el DM deben identificarse como:

```text
origin = MANUAL
```

Esto ayuda a priorizar información cuando existe conflicto.

---

# 65. Conflict Handling

Si dos fuentes dicen:

```text
Source A:
NPC X died in Session 04.

Source B:
NPC X was alive in Session 05.
```

no resolver automáticamente.

Registrar:

```text
CONTRADICTORY
```

y presentar el conflicto al DM.

---

# 66. Data Priority

En caso de conflicto:

```text
DM Manual Canon
      >
Approved Canon
      >
Confirmed Source
      >
High Confidence AI Extraction
      >
Low Confidence AI Extraction
      >
Inference
```

La prioridad exacta podrá refinarse posteriormente.

---

# 67. Database Size Goal

La base de datos debe permanecer pequeña.

Objetivo inicial:

```text
SQLite < 100 MB
```

sin contar assets.

Una campaña normal debería permanecer muy por debajo de este límite.

Los assets pueden ocupar:

```text
GB
```

pero estarán fuera de SQLite.

---

# 68. Performance Goal

Operaciones normales deberían ser rápidas incluso con:

```text
10.000+
Events
1.000+
Entities
100.000+
Relationships / Knowledge Records
```

Estos números no representan límites absolutos.

Son objetivos de diseño.

---

# 69. Concurrency

Inicialmente:

```text
Single User / Local Machine
```

El sistema no necesita resolver colaboración multiusuario distribuida.

El DM será el principal escritor.

Los jugadores podrán disponer posteriormente de vistas de solo lectura.

---

# 70. WAL

SQLite puede utilizar:

```text
PRAGMA journal_mode = WAL;
```

si las pruebas de la aplicación confirman que es apropiado.

Ventajas esperadas:

- mejor concurrencia;
- menor bloqueo;
- lecturas simultáneas.

---

# 71. Foreign Key Policy

Las relaciones fundamentales deben estar protegidas por FK.

Las relaciones polimórficas deberán ser validadas por la capa de dominio.

---

# 72. Database Access Layer

La aplicación no debería acceder directamente a SQLite desde cualquier módulo.

Debe existir una capa:

```text
UI
 ↓
Application Services
 ↓
Domain
 ↓
Repository
 ↓
SQLite
```

Esto permitirá cambiar posteriormente la persistencia.

---

# 73. Repository Pattern

Ejemplos conceptuales:

```text
CharacterRepository
EventRepository
LocationRepository
QuestRepository
RelationshipRepository
SessionRepository
SourceRepository
```

Los repositorios deben encapsular las operaciones de persistencia.

---

# 74. Domain vs Database

No asumir:

```text
1 Entity = 1 Table
```

La base de datos es una representación de persistencia.

El dominio es el modelo conceptual.

La estructura SQL puede utilizar:

- tablas auxiliares;
- tablas de unión;
- vistas;
- índices;
- JSON;
- FTS5.

sin alterar el modelo conceptual.

---

# 75. Views

Podrán utilizarse vistas SQLite para consultas frecuentes.

Ejemplo conceptual:

```text
current_character_locations
active_quests
active_npcs
current_party_state
recent_events
```

No abusar de las vistas si complican el mantenimiento.

---

# 76. Materialized State

SQLite no necesita materialized views nativas.

Los estados derivados importantes pueden almacenarse directamente y actualizarse mediante la capa de dominio.

Ejemplo:

```text
characters.current_location_id
```

es un estado derivado de eventos.

---

# 77. Audit

Cambios administrativos importantes deberían registrar:

```text
who
what
when
why
```

Especialmente:

- aprobación de canon;
- rechazo de propuestas;
- retcons;
- eliminación;
- modificaciones importantes.

---

# 78. Database Security

Aunque sea local:

- no almacenar secretos de API directamente en la DB;
- no almacenar contraseñas en texto plano;
- no confiar en la DB como mecanismo de autorización;
- validar todos los cambios desde la capa de aplicación.

---

# 79. API Keys

Las API keys futuras deben almacenarse fuera de:

```text
campaign.db
```

Preferiblemente:

```text
environment variables
OS keychain
local secrets file
```

según la plataforma.

---

# 80. Initial Schema Scope

El primer esquema implementable debe contener únicamente:

```text
campaigns
sessions
sources
characters
npcs
factions
locations
items
quests
events
relationships
knowledge
scenes
assets
recaps
snapshots
```

No implementar inicialmente:

```text
embeddings
vector database
distributed cache
cloud synchronization
multi-user database
```

---

# 81. Evolution Strategy

La base puede evolucionar mediante:

```text
SQLite
   ↓
SQLite + FTS5
   ↓
SQLite + local embeddings
   ↓
Optional vector index
   ↓
Optional remote backend
```

Cada salto debe justificarse por una necesidad real.

---

# 82. Principio de simplicidad

Si una solución puede resolverse con:

```text
SQLite
+
SQL
+
FTS5
+
JSON
+
Files
```

no introducir una infraestructura adicional.

---

# 83. Regla final

La base de datos debe ser:

```text
boring
predictable
portable
recoverable
inspectable
```

El sistema complejo debe estar en la lógica de dominio y en las herramientas de IA,
no en una infraestructura innecesariamente compleja.

La prioridad es que:

```text
CAMPAIGN
    ↓
can be copied
can be backed up
can be restored
can be inspected
can be exported
can be migrated
```

sin depender de servicios externos.
