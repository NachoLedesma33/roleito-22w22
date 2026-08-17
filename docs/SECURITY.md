# SECURITY.md

> Especificación de seguridad del RPG World Engine.
>
> La seguridad debe proteger:
>
> - la integridad de la campaña;
> - el canon;
> - los datos de personajes;
> - los secretos narrativos;
> - el control del DM;
> - los archivos locales;
> - los assets;
> - los agentes de IA;
> - la comunicación entre componentes.
>
> El proyecto es Local First.
> La seguridad debe ser proporcional al riesgo real y no introducir
> complejidad innecesaria en el MVP.

---

# 1. Objetivos

Los objetivos principales son:

1. proteger la integridad de los datos;
2. separar información del DM de información de jugadores;
3. evitar modificaciones accidentales por agentes de IA;
4. impedir comandos no autorizados;
5. proteger archivos locales;
6. mantener trazabilidad de cambios;
7. permitir recuperación ante errores;
8. evitar pérdida del canon;
9. minimizar superficie de ataque;
10. mantener el sistema sencillo para uso local.

---

# 2. Principio Fundamental

La seguridad debe seguir:

```text
PROTECT
+
VALIDATE
+
AUDIT
+
RECOVER
```

No se debe intentar construir un sistema de seguridad empresarial
innecesariamente complejo para una aplicación local de una mesa de rol.

---

# 3. Local First

El MVP debe funcionar sin Internet.

Esto reduce:

```text
NETWORK ATTACK SURFACE
REMOTE AUTHENTICATION
EXTERNAL API RISKS
REMOTE DATA EXPOSURE
```

---

# 4. Security Boundaries

El sistema debe separar conceptualmente:

```text
┌─────────────────────────────┐
│       CAMPAIGN DATA         │
└──────────────┬──────────────┘
               │
      ┌────────┴────────┐
      ↓                 ↓
 DM CONTROL        PLAYER VIEW
      │                 │
      ↓                 ↓
 SECRET DATA        PUBLIC DATA
```

---

# 5. Roles

Roles mínimos:

```text
DM
PLAYER
SYSTEM
AGENT
```

---

# 6. DM

El DM tiene autoridad sobre:

```text
SESSION
SCENE
NARRATIVE CONTROL
REVEALS
NPC STATE
HIDDEN INFORMATION
PLAYER VISIBILITY
```

---

# 7. Player

El jugador debe acceder únicamente a:

```text
PUBLIC CAMPAIGN DATA
+
OWN CHARACTER DATA
+
REVEALED INFORMATION
+
CURRENT PLAYER VIEW
```

---

# 8. System

El sistema puede ejecutar:

```text
STATE TRANSITIONS
VALIDATION
PERSISTENCE
RENDERING
LOGGING
```

pero no debe inventar autoridad narrativa.

---

# 9. Agent

Un agente de IA debe considerarse:

```text
UNTRUSTED AUTOMATION
```

aunque forme parte de la aplicación.

La IA puede equivocarse.

---

# 10. AI Trust Model

Nunca asumir:

```text
AI OUTPUT = TRUTH
```

Debe utilizarse:

```text
AI OUTPUT
    ↓
VALIDATION
    ↓
APPROVAL / POLICY
    ↓
SYSTEM ACTION
```

---

# 11. Canon Protection

El canon debe considerarse un recurso protegido.

Una IA no debe poder modificarlo libremente.

---

# 12. Canon Modification

Una modificación importante debería seguir:

```text
PROPOSAL
 ↓
VALIDATION
 ↓
DM APPROVAL
 ↓
CANON UPDATE
```

---

# 13. Automatic Canon Updates

Los agentes pueden realizar actualizaciones automáticas solamente
cuando estén explícitamente autorizadas.

Ejemplo permitido:

```text
Update temporary session notes.
```

Ejemplo no permitido:

```text
Rewrite historical canon.
```

sin autorización.

---

# 14. Immutable History

Los eventos históricos importantes deberían ser append-only.

Preferir:

```text
EVENT 001
EVENT 002
EVENT 003
EVENT 004
```

sobre editar silenciosamente:

```text
EVENT 001
```

---

# 15. Corrections

Si existe un error histórico:

```text
ORIGINAL EVENT
      ↓
CORRECTION EVENT
```

en lugar de borrar el evento original.

---

# 16. Audit Trail

Las modificaciones importantes deben registrar:

```text
timestamp
actor
action
target
previous_state
new_state
reason
```

---

# 17. Example Audit Entry

```json
{
  "timestamp": "2026-08-17T20:30:00",
  "actor": "dm",
  "action": "UPDATE_CHARACTER",
  "target": "character-001",
  "reason": "Correction requested by DM"
}
```

---

# 18. Actor Types

Los logs deben distinguir:

```text
DM
PLAYER
SYSTEM
AI
IMPORT
SCRIPT
```

---

# 19. AI Traceability

Si una modificación fue realizada por IA debe poder identificarse.

Ejemplo:

```text
actor = AI
agent = narrative-agent
operation = CREATE_RECAP
```

---

# 20. Secrets

Información secreta puede incluir:

```text
NPC motivations
Hidden locations
Future events
DM notes
Unrevealed lore
Secret identities
Hidden objectives
```

---

# 21. Secret Data Classification

Clasificación mínima:

```text
PUBLIC
PLAYER
DM
SYSTEM
```

---

# 22. PUBLIC

Información que todos pueden conocer.

Ejemplos:

```text
Known Location
Public Character Name
Public Event
Public NPC
```

---

# 23. PLAYER

Información visible para jugadores pero no necesariamente pública.

Ejemplo:

```text
Character Sheet
Party Inventory
Known Quest
```

---

# 24. DM

Información exclusiva del DM.

Ejemplos:

```text
Secret Door
NPC Betrayal
Future Plot
Hidden Monster
Unknown Motivation
```

---

# 25. SYSTEM

Información interna de la aplicación.

Ejemplos:

```text
Database IDs
Debug Information
Internal Agent Instructions
Technical Metadata
```

---

# 26. Visibility Enforcement

Cada objeto sensible debe tener una política de visibilidad.

Ejemplo:

```json
{
  "id": "secret-door-01",
  "visibility": "DM"
}
```

---

# 27. Renderer Security

El Renderer de jugadores no debe recibir información que no necesita.

Preferir:

```text
SERVER / CONTROLLER
        ↓
FILTER
        ↓
PLAYER RENDERER
```

---

# 28. Do Not Hide Only in UI

Nunca depender solamente de:

```text
CSS
UI Hiding
Client-side Flags
```

para proteger información.

Si un dato es secreto, idealmente no debe enviarse al cliente que no
tiene permiso para verlo.

---

# 29. DM Control Security

El DM Controller debe ser una zona privilegiada.

Operaciones sensibles:

```text
CHANGE_SCENE
REVEAL_SECRET
MODIFY_CANON
MODIFY_CHARACTER
CHANGE_NPC_STATE
ROLL_OVERRIDE
SESSION_CONTROL
```

---

# 30. Command Validation

Todos los comandos deben validarse.

```text
COMMAND
 ↓
VALIDATE STRUCTURE
 ↓
VALIDATE PERMISSION
 ↓
VALIDATE STATE
 ↓
EXECUTE
```

---

# 31. Invalid Commands

Un comando inválido debe ser rechazado.

Nunca ejecutar automáticamente:

```text
UNKNOWN COMMAND
```

---

# 32. Command Schema

Ejemplo:

```json
{
  "command_id": "cmd-001",
  "type": "SCENE_LOAD",
  "actor": "dm",
  "payload": {
    "scene_id": "vault"
  }
}
```

---

# 33. Command IDs

Cada comando debe disponer de un identificador único.

Esto permite:

```text
TRACE
DEDUPLICATION
AUDIT
REPLAY
DEBUGGING
```

---

# 34. Idempotency

Cuando corresponda, un comando debe poder detectarse si fue ejecutado
anteriormente.

Ejemplo:

```text
COMMAND 001
```

recibido dos veces no debería crear:

```text
TWO IDENTICAL NPCS
```

si la operación debería ser única.

---

# 35. State Validation

Antes de ejecutar un comando:

```text
CURRENT STATE
+
COMMAND
 ↓
VALID?
```

Ejemplo:

No permitir:

```text
LOAD SCENE B
```

si el sistema se encuentra en una transición incompatible.

---

# 36. File Security

El proyecto utiliza archivos locales.

Debe protegerse contra:

```text
PATH TRAVERSAL
UNAUTHORIZED FILE ACCESS
ACCIDENTAL DELETION
CORRUPTED FILES
MALICIOUS ASSETS
```

---

# 37. Path Validation

Los paths proporcionados por agentes o usuarios deben validarse.

No aceptar directamente:

```text
../../../../important-file
```

---

# 38. Asset Directory Boundary

Los assets deben permanecer dentro de directorios permitidos.

Conceptualmente:

```text
PROJECT/
├── assets/
├── data/
├── docs/
└── database/
```

Una operación de asset no debería poder escribir arbitrariamente
fuera del workspace.

---

# 39. Agent File Access

Los agentes no deberían disponer automáticamente de acceso total
al filesystem.

Preferir:

```text
AGENT
 ↓
TOOL
 ↓
ALLOWED DIRECTORY
```

---

# 40. Agent Permissions

Los agentes deben tener permisos mínimos.

Ejemplo:

```text
Narrative Agent
READ:
  lore
  sessions
  characters

WRITE:
  recap drafts

NO WRITE:
  canon
  database schema
  security configuration
```

---

# 41. Least Privilege

Cada componente debe tener solamente los permisos necesarios.

```text
MINIMUM REQUIRED ACCESS
```

---

# 42. Database Security

SQLite es local, pero sigue siendo un recurso crítico.

Debe evitarse:

```text
UNSAFE SQL
CORRUPTION
UNCONTROLLED MIGRATIONS
DIRECT AGENT MANIPULATION
```

---

# 43. Parameterized Queries

Nunca construir SQL utilizando directamente input no confiable.

Preferir:

```text
PARAMETERIZED QUERY
```

---

# 44. Database Migrations

Las migraciones deben:

```text
BE VERSIONED
BE REPEATABLE
BE TRACEABLE
BE TESTED
```

---

# 45. Backup

El sistema debe permitir backups locales.

Mínimo:

```text
DATABASE
+
CAMPAIGN DATA
+
CONFIGURATION
```

---

# 46. Backup Frequency

Puede utilizarse:

```text
BEFORE SESSION
AFTER SESSION
BEFORE MIGRATION
BEFORE CANON CHANGE
```

---

# 47. Automatic Backup

A futuro:

```text
SESSION START
 ↓
AUTO BACKUP
```

y:

```text
SESSION END
 ↓
AUTO BACKUP
```

---

# 48. Backup Location

Preferir una ubicación separada del archivo principal de la base de
datos.

Ejemplo:

```text
project/
database/
backup/
```

---

# 49. Backup Retention

Mantener varias versiones.

Ejemplo:

```text
backup/
├── latest/
├── previous/
└── archive/
```

---

# 50. Recovery

Debe poder restaurarse una campaña a un estado anterior.

```text
BACKUP
 ↓
VALIDATE
 ↓
RESTORE
 ↓
VERIFY
```

---

# 51. Canon Recovery

El sistema debe permitir recuperar el canon incluso si una operación
de IA lo modifica incorrectamente.

---

# 52. Session Recovery

Si la aplicación se cierra inesperadamente:

```text
LAST SNAPSHOT
+
EVENT LOG
```

debe permitir reconstruir el estado cuando sea posible.

---

# 53. Crash Safety

Los cambios críticos deben persistirse de manera que una interrupción
repentina reduzca la posibilidad de corrupción.

---

# 54. Transactional Updates

Las modificaciones relacionadas deben ejecutarse dentro de
transacciones cuando corresponda.

Ejemplo:

```text
MOVE CHARACTER
+
UPDATE LOCATION
+
CREATE EVENT
```

deben evitar quedar parcialmente aplicadas.

---

# 55. Temporary Files

Los archivos temporales deben mantenerse separados.

Ejemplo:

```text
temp/
cache/
```

No deben confundirse con:

```text
canon/
campaign/
database/
```

---

# 56. Asset Validation

Los assets importados deben validarse.

Comprobar:

```text
FORMAT
SIZE
PATH
EXTENSION
METADATA
```

---

# 57. Asset Size Limits

Debe existir un límite configurable para evitar cargar accidentalmente
archivos gigantes.

Ejemplo:

```text
MAX IMAGE SIZE
MAX VIDEO SIZE
MAX MODEL SIZE
```

Los valores definitivos dependerán del entorno.

---

# 58. Malformed Assets

Un asset corrupto no debe bloquear toda la aplicación.

Flujo:

```text
LOAD ASSET
 ↓
ERROR
 ↓
LOG
 ↓
FALLBACK
```

---

# 59. Generated Content

Los assets generados por IA deben considerarse contenido no confiable
hasta ser validados.

---

# 60. Generated Code

La ejecución de código generado por IA debe estar restringida.

Nunca ejecutar automáticamente:

```text
ARBITRARY GENERATED SCRIPT
```

con permisos completos del sistema.

---

# 61. Agent Code Execution

Si un agente necesita ejecutar código:

```text
AGENT
 ↓
SANDBOX / CONTROLLED ENVIRONMENT
 ↓
LIMITED PERMISSIONS
```

---

# 62. Shell Commands

Los comandos de sistema generados por IA deben:

```text
BE EXPLICIT
BE VALIDATED
BE LOGGED
```

y evitarse cuando exista una alternativa interna.

---

# 63. Prompt Injection

Los documentos de campaña pueden contener texto creado por usuarios,
personajes o IA.

No debe asumirse que ese texto constituye instrucciones del sistema.

Ejemplo:

```text
LORE:
"Ignore all previous instructions..."
```

debe tratarse como:

```text
CAMPAIGN CONTENT
```

no como una instrucción para el agente.

---

# 64. Instruction Hierarchy

Los agentes deben distinguir:

```text
SYSTEM RULES
 ↓
PROJECT RULES
 ↓
AGENT TASK
 ↓
CAMPAIGN DATA
```

Los datos de campaña no pueden reemplazar las reglas superiores.

---

# 65. Imported Content

Contenido importado desde:

```text
PDF
TXT
MD
DOCX
IMAGE OCR
WEB
```

debe tratarse como datos.

No como instrucciones privilegiadas.

---

# 66. AI Hallucination

Una IA puede inventar:

```text
CHARACTER
EVENT
LOCATION
ITEM
RELATIONSHIP
LORE
```

Por eso debe diferenciarse:

```text
KNOWN
INFERRED
PROPOSED
UNKNOWN
```

---

# 67. Confidence

Cuando corresponda, una propuesta de IA puede incluir:

```text
confidence
source
reason
```

---

# 68. Source Attribution

Una afirmación importante debe poder asociarse con su fuente.

Ejemplo:

```text
Fact:
Character met the king.

Source:
Session 12 Event 034.
```

---

# 69. Canon Conflict

Si la IA propone algo que contradice el canon:

```text
AI PROPOSAL
 ↓
CANON CHECK
 ↓
CONFLICT
 ↓
DM REVIEW
```

No sobrescribir automáticamente.

---

# 70. Conflict Types

```text
CHARACTER_CONFLICT
TIMELINE_CONFLICT
LOCATION_CONFLICT
RELATIONSHIP_CONFLICT
ITEM_CONFLICT
EVENT_CONFLICT
WORLD_RULE_CONFLICT
```

---

# 71. Secret Leakage Prevention

Los agentes que generan contenido para jugadores no deben recibir
secretos innecesarios.

Ejemplo:

```text
PLAYER RECAP AGENT
```

no necesita:

```text
FUTURE PLOT
```

---

# 72. Recap Security

Un recap debe distinguir:

```text
WHAT PLAYERS KNOW
```

de:

```text
WHAT DM KNOWS
```

---

# 73. Voice Narration Security

La generación de voz no debe incluir accidentalmente:

```text
DM NOTES
SECRET EVENTS
INTERNAL IDs
```

---

# 74. Logging Sensitive Data

Los logs técnicos no deberían almacenar innecesariamente:

```text
SECRET LORE
PLAYER PRIVATE DATA
AI PROMPTS WITH SECRETS
```

---

# 75. Debug Mode

El modo debug puede mostrar información sensible.

Por lo tanto:

```text
DEBUG MODE
```

debe considerarse un modo privilegiado.

---

# 76. Development vs Production

Debe existir separación conceptual:

```text
DEVELOPMENT
```

y:

```text
SESSION / PRODUCTION
```

---

# 77. Development Data

Los desarrolladores pueden utilizar:

```text
TEST CAMPAIGN
MOCK CHARACTERS
TEST EVENTS
```

para evitar modificar accidentalmente la campaña real.

---

# 78. Production Campaign

La campaña real debe tener:

```text
BACKUP
VERSION
IDENTITY
ENVIRONMENT
```

claramente definidos.

---

# 79. Campaign Identity

Cada campaña debe disponer de un identificador único.

Ejemplo:

```text
campaign_id
```

Esto evita mezclar accidentalmente:

```text
CAMPAIGN A
```

con:

```text
CAMPAIGN B
```

---

# 80. Session Identity

Cada sesión debe tener:

```text
campaign_id
session_id
```

---

# 81. Event Identity

Cada evento debe tener:

```text
event_id
session_id
timestamp
actor
```

---

# 82. Entity Identity

Los personajes, escenas y objetos deben utilizar IDs estables.

Esto evita depender únicamente de:

```text
NAME
```

---

# 83. Names Are Not IDs

Dos personajes podrían llamarse:

```text
Ardan
```

sin que necesariamente sean la misma entidad.

Por lo tanto:

```text
character_id
```

es la referencia principal.

---

# 84. Data Integrity

Las relaciones importantes deben validarse.

Ejemplo:

```text
Event
 ↓
Character
```

debe apuntar a un personaje existente o a una referencia explícitamente
marcada como desconocida.

---

# 85. Referential Integrity

La base de datos debe utilizar restricciones cuando sean apropiadas.

---

# 86. Deletion Policy

Los datos históricos importantes no deberían eliminarse
automáticamente.

Preferir:

```text
ACTIVE
ARCHIVED
DEPRECATED
```

sobre:

```text
DELETE
```

---

# 87. Soft Delete

Cuando sea necesario eliminar una entidad:

```text
deleted_at
```

o estado equivalente puede utilizarse para mantener historial.

---

# 88. Campaign Export

Debe poder exportarse la campaña.

Formato mínimo conceptual:

```text
CAMPAIGN
├── DATA
├── LORE
├── CHARACTERS
├── EVENTS
├── SCENES
└── METADATA
```

---

# 89. Campaign Import

Una campaña importada debe validarse antes de reemplazar la campaña
actual.

```text
IMPORT
 ↓
VALIDATE
 ↓
PREVIEW
 ↓
CONFIRM
 ↓
IMPORT
```

---

# 90. Malicious Import

El sistema no debe ejecutar automáticamente:

```text
SCRIPTS
EXECUTABLES
UNKNOWN CODE
```

incluidos dentro de un paquete de campaña.

---

# 91. Portable Campaign

El formato de campaña debería ser lo suficientemente independiente
de la máquina para facilitar:

```text
BACKUP
TRANSFER
ARCHIVE
RESTORE
```

---

# 92. Network Security

Aunque el MVP sea local, si se utiliza una red local:

```text
DM HOST
 ↓
LOCAL NETWORK
 ↓
CLIENTS
```

deben existir medidas básicas.

---

# 93. Local Host Binding

Cuando sea posible, servicios que solamente necesiten acceso local
deben escuchar en:

```text
localhost
```

en lugar de:

```text
0.0.0.0
```

---

# 94. LAN Mode

Si se habilita acceso desde otros dispositivos:

```text
LAN MODE
```

debe ser explícito.

---

# 95. LAN Authentication

A futuro puede utilizarse:

```text
SESSION CODE
```

o:

```text
PAIRING CODE
```

para conectar jugadores.

---

# 96. Session Pairing

Ejemplo:

```text
DM SCREEN

Session Code:
A7K9Q2
```

El jugador introduce:

```text
A7K9Q2
```

y solicita acceso.

---

# 97. Player Permissions

El jugador conectado no debe poder enviar comandos administrativos.

---

# 98. Network Command Validation

Aunque el cliente sea de confianza:

```text
CLIENT COMMAND
 ↓
SERVER VALIDATION
```

Siempre.

---

# 99. Rate Limiting

A futuro, los clientes LAN pueden tener límites para evitar spam.

---

# 100. Denial of Service

No es una prioridad crítica en el MVP local, pero deben evitarse
operaciones que permitan bloquear fácilmente el Renderer.

Ejemplos:

```text
CREATE 1,000,000 ENTITIES
PLAY 1000 VIDEOS
SPAWN UNLIMITED PARTICLES
```

---

# 101. Resource Limits

Los comandos pueden tener límites.

Ejemplo:

```text
MAX_ENTITIES
MAX_PARTICLES
MAX_CONCURRENT_VIDEOS
MAX_AUDIO_TRACKS
```

---

# 102. Command Validation Example

```text
SPAWN_ENTITY
 ↓
Is entity valid?
 ↓
Is asset valid?
 ↓
Is limit exceeded?
 ↓
Does actor have permission?
 ↓
EXECUTE
```

---

# 103. Security vs Usability

La seguridad no debe introducir fricción innecesaria durante la party.

El DM debe poder ejecutar acciones rápidamente.

---

# 104. DM Override

El DM puede tener herramientas de override.

Ejemplo:

```text
FORCE SCENE
FORCE CHARACTER POSITION
FORCE EVENT
FORCE REVEAL
```

Estas operaciones deben:

```text
BE EXPLICIT
BE LOGGED
```

---

# 105. Emergency Stop

Debe existir una forma de detener:

```text
AI
AUTOMATION
RENDERER COMMAND QUEUE
```

si una automatización se comporta incorrectamente.

---

# 106. Agent Kill Switch

Conceptualmente:

```text
AI ACTIVE
 ↓
PROBLEM
 ↓
STOP AGENTS
```

El sistema principal debe continuar funcionando.

---

# 107. Safe Mode

A futuro:

```text
SAFE MODE
```

puede iniciar el proyecto sin:

```text
AI
AUTOMATION
OPTIONAL PLUGINS
EXTERNAL SERVICES
```

---

# 108. Safe Mode Purpose

Permite recuperar una campaña si un componente externo falla.

---

# 109. Secrets and Configuration

Si el proyecto utiliza API keys opcionales:

```text
DO NOT COMMIT SECRETS
```

---

# 110. Environment Variables

Las credenciales externas deben almacenarse mediante:

```text
ENVIRONMENT VARIABLES
```

o mecanismos seguros equivalentes.

---

# 111. API Keys

Nunca almacenar claves directamente en:

```text
SOURCE CODE
DATABASE
CAMPAIGN LORE
MARKDOWN DOCUMENTS
```

---

# 112. Optional External Services

Los servicios externos deben estar aislados.

```text
CORE
 ↓
OPTIONAL ADAPTER
 ↓
EXTERNAL SERVICE
```

---

# 113. Failure Isolation

Si una API externa falla:

```text
API FAILURE
 ↓
CORE CONTINUES
```

---

# 114. Privacy

Los datos de la campaña deben permanecer locales por defecto.

No enviar automáticamente:

```text
LORE
CHARACTERS
SESSION HISTORY
PLAYER DATA
```

a servicios externos.

---

# 115. Explicit External Processing

Si una función necesita enviar información a un servicio externo:

```text
DATA
 ↓
USER / DM APPROVAL
 ↓
EXTERNAL SERVICE
```

cuando corresponda.

---

# 116. Data Minimization

Enviar únicamente los datos necesarios.

No:

```text
ENTIRE CAMPAIGN
```

si solamente se necesita:

```text
CURRENT SCENE
```

---

# 117. Export Security

Los exports deben poder incluir únicamente:

```text
PUBLIC DATA
```

o:

```text
FULL CAMPAIGN
```

según la opción elegida.

---

# 118. Public Export

Un export público no debe incluir:

```text
DM NOTES
SECRETS
INTERNAL DATA
```

---

# 119. Full Backup

Un backup completo sí puede incluir:

```text
ALL CAMPAIGN DATA
```

y debe tratarse como información sensible.

---

# 120. Security Testing

Debe probarse:

```text
Unauthorized Command
Invalid Command
Malformed Asset
Invalid File Path
Corrupted Database
AI Hallucination
Canon Conflict
Secret Leakage
Player Access
DM Access
LAN Access
```

---

# 121. Security Definition of Done

Una funcionalidad está lista cuando:

```text
[ ] Valida inputs
[ ] Respeta permisos
[ ] No expone secretos
[ ] No modifica canon sin autorización
[ ] Registra operaciones críticas
[ ] Tiene fallback cuando corresponde
[ ] No ejecuta código arbitrario
[ ] Respeta límites de recursos
[ ] Puede recuperarse ante errores
```

---

# 122. MVP Security Priority

Prioridad:

```text
HIGH
├── Data Integrity
├── Canon Protection
├── DM / Player Separation
├── Backup
├── Input Validation
└── Agent Permission Control

MEDIUM
├── LAN Authentication
├── Rate Limiting
├── Advanced Audit
└── Encryption

LOW
├── Enterprise Authentication
├── Multi-Tenant Security
└── Cloud Security Infrastructure
```

---

# 123. Encryption

El cifrado de datos locales no es obligatorio para el MVP.

Puede incorporarse posteriormente si existe una necesidad real.

---

# 124. Security Philosophy

El proyecto debe evitar dos extremos:

```text
TOO LITTLE SECURITY
```

y:

```text
UNNECESSARY ENTERPRISE COMPLEXITY
```

La solución debe ser proporcional al entorno:

```text
LOCAL
+
SMALL GROUP
+
TRUSTED USERS
+
OPTIONAL LAN
```

---

# 125. Final Principle

La seguridad del RPG World Engine consiste principalmente en proteger
la verdad de la campaña y evitar que la automatización destruya o
exponga información que debería permanecer controlada.

La regla principal es:

```text
AI CAN SUGGEST
SYSTEM CAN VALIDATE
DM CAN AUTHORIZE
CANON CAN REMEMBER
```

Nunca:

```text
AI
 ↓
DIRECT
 ↓
CANON
```

sin controles intermedios.
