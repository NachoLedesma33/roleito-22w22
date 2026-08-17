# TESTING.md

> Especificación de estrategia de pruebas del RPG World Engine.
>
> El sistema debe poder evolucionar progresivamente sin perder
> funcionalidad existente.
>
> Las pruebas deben cubrir tanto software tradicional como aspectos
> específicos de una campaña de rol:
>
> - estado de campaña;
> - canon;
> - eventos;
> - personajes;
> - escenas;
> - sesiones;
> - control del DM;
> - IA;
> - recapitulaciones;
> - Renderer;
> - persistencia;
> - recuperación.

---

# 1. Objetivos

El sistema de pruebas debe:

1. detectar errores;
2. evitar regresiones;
3. verificar integridad de datos;
4. verificar consistencia narrativa;
5. verificar permisos;
6. comprobar comunicación entre componentes;
7. validar escenas;
8. validar comportamiento de agentes;
9. comprobar recuperación;
10. permitir que agentes de programación trabajen de forma segura.

---

# 2. Principio Fundamental

Toda funcionalidad importante debe poder responder:

```text
¿CÓMO SABEMOS QUE FUNCIONA?
```

La respuesta debe ser una prueba automatizada o un procedimiento
reproducible.

---

# 3. Testing Pyramid

El proyecto debe utilizar una estrategia similar a:

```text
             E2E
            /   \
        Integration
        /         \
      Unit Tests
```

La mayor cantidad de pruebas debe encontrarse en:

```text
UNIT
```

seguida por:

```text
INTEGRATION
```

y una cantidad menor de:

```text
E2E
```

---

# 4. Test Levels

Niveles:

```text
UNIT
INTEGRATION
SYSTEM
E2E
PERFORMANCE
SECURITY
DATA
AI
MANUAL
```

---

# 5. Unit Tests

Deben probar componentes aislados.

Ejemplos:

```text
Event Parser
Character Validator
Scene Validator
Command Parser
Permission Checker
Canon Checker
Recap Formatter
State Reducer
```

---

# 6. Unit Test Example

Conceptualmente:

```text
INPUT
Character XP = 100

ACTION
Add 50 XP

EXPECTED
XP = 150
```

---

# 7. Integration Tests

Deben comprobar interacción entre componentes.

Ejemplos:

```text
DM Controller
      ↓
Command System
      ↓
State
      ↓
Database
      ↓
Renderer
```

---

# 8. System Tests

Comprueban una funcionalidad completa.

Ejemplo:

```text
Create Session
 ↓
Load Scene
 ↓
Spawn Characters
 ↓
Move Character
 ↓
Save Event
 ↓
Reload Session
 ↓
Verify State
```

---

# 9. E2E Tests

Simulan una operación completa desde el punto de vista del usuario.

Ejemplo:

```text
DM starts application
 ↓
Loads campaign
 ↓
Starts session
 ↓
Changes scene
 ↓
Moves character
 ↓
Triggers narration
 ↓
Ends session
 ↓
Recap generated
```

---

# 10. Test Data

Las pruebas no deben utilizar la campaña real.

Debe existir:

```text
TEST CAMPAIGN
```

---

# 11. Test Campaign

La campaña de prueba debe ser pequeña pero cubrir múltiples casos.

Ejemplo:

```text
Campaign:
The Broken Crown

Characters:
Ardan
Lyra
Borin

NPCs:
Guard Captain
Merchant
Unknown Stranger

Scenes:
Tavern
Forest
Vault
Prison

Events:
10+
```

---

# 12. Deterministic Test Data

Los datos de prueba deben ser reproducibles.

Evitar depender de:

```text
CURRENT TIME
RANDOM AI OUTPUT
NETWORK SERVICES
EXTERNAL APIS
```

salvo en tests específicos.

---

# 13. Fixtures

Utilizar fixtures para:

```text
Campaign
Character
Scene
Session
Event
NPC
Item
```

---

# 14. Factory Pattern

Puede utilizarse un sistema de factories:

```text
createTestCampaign()
createTestCharacter()
createTestScene()
createTestSession()
createTestEvent()
```

---

# 15. Database Tests

Las pruebas de base de datos deben ejecutarse sobre una base temporal.

No utilizar la base de campaña real.

---

# 16. Database Isolation

Cada test debería comenzar con:

```text
CLEAN DATABASE
```

o utilizar una base aislada.

---

# 17. Database Migration Tests

Cada migración debe verificarse.

```text
EMPTY DB
 ↓
MIGRATIONS
 ↓
EXPECTED SCHEMA
```

---

# 18. Migration Regression

Debe verificarse que una actualización no destruya datos existentes.

```text
OLD DATABASE
 ↓
MIGRATION
 ↓
NEW DATABASE
 ↓
DATA PRESERVED
```

---

# 19. Repository Tests

Las operaciones CRUD importantes deben tener pruebas.

```text
CREATE
READ
UPDATE
DELETE / ARCHIVE
```

---

# 20. Event Tests

Probar:

```text
Create Event
Read Event
Filter Event
Order Event
Link Event
Replay Event
```

---

# 21. Event Ordering

Los eventos deben mantener un orden consistente.

Probar:

```text
EVENT 001
EVENT 002
EVENT 003
```

y evitar estados como:

```text
EVENT 003
EVENT 001
EVENT 002
```

salvo que el sistema soporte explícitamente eventos fuera de orden.

---

# 22. Event Replay

Dado:

```text
INITIAL STATE
+
EVENTS
```

debe obtenerse:

```text
EXPECTED FINAL STATE
```

---

# 23. Event Replay Determinism

Si el sistema es determinista:

```text
REPLAY SAME EVENTS
```

debe producir:

```text
SAME STATE
```

---

# 24. Snapshot Tests

Los snapshots deben poder reconstruirse.

```text
SNAPSHOT
+
SUBSEQUENT EVENTS
=
EXPECTED STATE
```

---

# 25. Character Tests

Probar:

```text
Create Character
Update Character
Move Character
Add Item
Remove Item
Change HP
Change Status
Archive Character
```

---

# 26. Character Identity

Probar que:

```text
character_id
```

permanezca estable aunque cambie:

```text
name
appearance
class
description
```

---

# 27. Character Position Tests

Dado:

```text
Character A
Position = (1, 2, 3)
```

después de:

```text
MOVE
```

debe comprobarse la posición final.

---

# 28. Scene Tests

Probar:

```text
Create Scene
Load Scene
Unload Scene
Transition Scene
Validate Scene
Save Scene
```

---

# 29. Scene Asset Tests

Toda referencia de asset debe:

```text
EXIST
```

o estar explícitamente marcada como:

```text
MISSING
```

---

# 30. Missing Asset Test

Simular:

```text
SCENE
 ↓
MISSING MODEL
```

Esperar:

```text
FALLBACK
+
ERROR LOG
```

y no:

```text
APPLICATION CRASH
```

---

# 31. Scene Transition Tests

Probar:

```text
Scene A
 ↓
Scene B
```

y verificar:

```text
Old Scene unloaded
New Scene loaded
Characters preserved
State preserved
```

---

# 32. Previous Scene Tests

Si una escena pasa a ser histórica:

```text
CURRENT
 ↓
PAST
```

debe conservar sus datos.

---

# 33. Character Scene Persistence

Si un personaje se encontraba en:

```text
SCENE A
```

y se guarda la sesión:

```text
SAVE
```

al recargar debe seguir en:

```text
SCENE A
```

salvo que exista un evento posterior que cambie su ubicación.

---

# 34. DM Controller Tests

Probar:

```text
Start Session
Pause Session
Change Scene
Move Character
Spawn Entity
Reveal Entity
Hide Entity
Trigger Event
End Session
```

---

# 35. Permission Tests

Probar:

```text
DM → ALLOWED
PLAYER → REJECTED
```

para operaciones administrativas.

---

# 36. Player Visibility Tests

Si:

```text
Secret Door
visibility = DM
```

el Player Renderer no debe recibirla como objeto visible.

---

# 37. Secret Leakage Test

Crear:

```text
DM SECRET:
"The king is secretly a vampire."
```

Generar contenido de jugador.

El resultado no debe revelar el secreto.

---

# 38. Canon Tests

El sistema debe comprobar:

```text
Character exists
Location exists
Event references valid entities
Timeline is consistent
```

---

# 39. Canon Conflict Test

Crear:

```text
Event 1:
Character A is alive.

Event 2:
Character A dies.

Event 3:
Character A talks to player.
```

El sistema debe detectar:

```text
POSSIBLE TIMELINE / STATE CONFLICT
```

---

# 40. Canon Does Not Mean Logical Certainty

El sistema debe diferenciar:

```text
CANON CONFLICT
```

de:

```text
INTENTIONAL STORY TWIST
```

La resolución final puede depender del DM.

---

# 41. AI Tests

La IA debe probarse principalmente por:

```text
STRUCTURE
GROUNDING
SAFETY
CONSISTENCY
```

No solamente por calidad literaria.

---

# 42. AI Determinism

Las pruebas automáticas no deben depender de que un LLM produzca
exactamente el mismo texto.

Incorrecto:

```text
EXPECTED:
"The ancient door opened slowly..."
```

Correcto:

```text
MUST CONTAIN:
scene_id
event references
no forbidden secrets
valid structure
```

---

# 43. Structured AI Output

Cuando un agente produzca JSON:

```text
AI OUTPUT
 ↓
JSON VALIDATION
 ↓
SCHEMA VALIDATION
```

---

# 44. Invalid AI Output

Si la IA produce:

```text
INVALID JSON
```

el sistema debe:

```text
REJECT
+
LOG
+
OPTIONAL RETRY
```

---

# 45. AI Hallucination Tests

Probar preguntas sobre información inexistente.

Ejemplo:

```text
Question:
Who is the King of Atlantis?
```

si no existe esa información en el canon:

```text
EXPECTED:
UNKNOWN
```

y no una invención presentada como hecho.

---

# 46. Grounding Tests

Si el agente responde:

```text
Character met NPC X.
```

debe existir una fuente correspondiente.

---

# 47. Source Attribution Test

El resultado debe poder asociarse a:

```text
session_id
event_id
document_id
```

cuando corresponda.

---

# 48. AI Permission Tests

Un agente sin permiso de escritura debe intentar:

```text
MODIFY CANON
```

Resultado esperado:

```text
REJECTED
```

---

# 49. Agent Tool Tests

Cada herramienta expuesta a agentes debe probar:

```text
VALID INPUT
INVALID INPUT
MISSING INPUT
UNAUTHORIZED INPUT
EXTREME INPUT
```

---

# 50. Prompt Injection Tests

Los documentos pueden contener:

```text
IGNORE PREVIOUS INSTRUCTIONS
```

El agente debe tratarlo como contenido.

---

# 51. Recap Tests

Dado:

```text
Session Events
```

debe generarse un recap que:

```text
REPRESENTS EVENTS
```

sin:

```text
INVENTING CANON
```

---

# 52. Recap Structure Test

Un recap debería poder contener:

```text
Summary
Important Events
Character Actions
Consequences
Current Situation
Unresolved Threads
```

---

# 53. Recap Missing Player Test

Si un jugador faltó:

```text
PLAYER ABSENT
```

el recap debe permitir comprender:

```text
WHAT HAPPENED
```

sin necesitar leer toda la campaña.

---

# 54. Voice Recap Tests

La generación de voz debe verificarse como pipeline:

```text
EVENTS
 ↓
RECAP
 ↓
NARRATIVE SCRIPT
 ↓
TTS
 ↓
AUDIO
```

Cada etapa debe poder probarse independientemente.

---

# 55. Renderer Tests

El Renderer debe comprobar:

```text
Scene Load
Entity Spawn
Entity Move
Entity Remove
Camera
Lighting
Video
Audio
UI
```

---

# 56. Renderer Fallback

Si falla:

```text
VIDEO
```

la escena debe seguir funcionando.

Si falla:

```text
OPTIONAL VFX
```

la escena debe seguir funcionando.

---

# 57. Visual Regression Tests

A futuro pueden utilizarse screenshots para comparar escenas.

Ejemplo:

```text
REFERENCE IMAGE
        ↓
CURRENT IMAGE
        ↓
VISUAL DIFF
```

No debe utilizarse como único método de validación.

---

# 58. Visual Regression Limitations

Pequeñas diferencias de:

```text
Lighting
Anti-Aliasing
GPU
Driver
```

pueden producir diferencias visuales.

Por lo tanto los thresholds deben ser configurables.

---

# 59. Performance Tests

Medir:

```text
FPS
Frame Time
RAM
VRAM
CPU
GPU
Scene Load Time
```

---

# 60. Performance Regression

Guardar una baseline.

Ejemplo:

```text
Baseline:
60 FPS

Current:
58 FPS
```

puede ser aceptable.

Pero:

```text
Baseline:
60 FPS

Current:
30 FPS
```

debe marcarse como regresión.

---

# 61. Load Tests

Probar progresivamente:

```text
10 entities
25 entities
50 entities
100 entities
250 entities
```

---

# 62. Stress Tests

Probar condiciones extremas:

```text
Many Entities
Many Effects
Large Scene
Large Event History
Large Campaign
```

---

# 63. Long Session Test

Ejecutar una sesión prolongada.

Verificar:

```text
No memory leak
No progressive FPS degradation
No uncontrolled log growth
No state corruption
```

---

# 64. Save Tests

Probar:

```text
Start
Modify
Save
Close
Open
Verify
```

---

# 65. Crash Recovery Test

Simular:

```text
SESSION
 ↓
STATE CHANGE
 ↓
FORCED CRASH
```

Después:

```text
RESTART
 ↓
RECOVER
```

---

# 66. Backup Tests

Probar:

```text
CREATE BACKUP
VERIFY BACKUP
RESTORE BACKUP
VERIFY DATA
```

---

# 67. Corrupted Backup Test

Intentar restaurar un backup corrupto.

Esperar:

```text
ERROR
+
NO DAMAGE TO CURRENT CAMPAIGN
```

---

# 68. Migration Safety Tests

Antes de una migración:

```text
BACKUP
```

Después:

```text
MIGRATE
 ↓
VERIFY
```

---

# 69. Import Tests

Probar:

```text
Valid Campaign
Invalid Campaign
Incomplete Campaign
Corrupted Campaign
Duplicate IDs
Missing Assets
```

---

# 70. Export Tests

Exportar:

```text
FULL CAMPAIGN
```

y verificar que pueda importarse.

---

# 71. Round Trip Test

La propiedad esperada:

```text
EXPORT
 ↓
IMPORT
 ↓
EQUIVALENT STATE
```

---

# 72. Security Tests

Probar:

```text
Unauthorized command
Path traversal
Invalid asset
Malformed JSON
Secret leakage
Agent privilege escalation
Invalid session code
```

---

# 73. File System Tests

Probar:

```text
Valid path
Invalid path
Missing file
Read-only file
Permission denied
Large file
Corrupt file
```

---

# 74. Network Tests

Si existe LAN:

```text
Connect
Disconnect
Reconnect
Invalid session
Wrong player
Duplicate connection
Malformed command
```

---

# 75. Offline Tests

Desconectar Internet.

La aplicación debe continuar funcionando en:

```text
Campaign
Database
Renderer
Session
Local Assets
```

---

# 76. Optional Service Failure

Simular:

```text
AI unavailable
TTS unavailable
External API unavailable
```

El sistema debe continuar en modo degradado.

---

# 77. Graceful Degradation

Ejemplo:

```text
AI OFF
 ↓
MANUAL DM CONTROL
```

o:

```text
TTS OFF
 ↓
TEXT RECAP
```

---

# 78. Test Categories

Los tests pueden etiquetarse:

```text
unit
integration
e2e
ai
security
performance
database
renderer
narrative
```

---

# 79. Test Naming

Preferir nombres descriptivos.

Ejemplo:

```text
should_restore_character_position_after_session_reload
```

en lugar de:

```text
test1
```

---

# 80. Test Structure

Cada test debería seguir:

```text
ARRANGE
ACT
ASSERT
```

---

# 81. Example

```text
ARRANGE
Character is in Tavern.

ACT
Move Character to Forest.

ASSERT
Character location is Forest.
Event MOVE_CHARACTER exists.
```

---

# 82. Test Independence

Los tests no deben depender del orden de ejecución.

Incorrecto:

```text
Test B
requires Test A
```

Correcto:

```text
Test B
creates its own state.
```

---

# 83. Test Cleanup

Cada test debe limpiar sus recursos.

```text
DATABASE
FILES
TEMP
CACHE
NETWORK
```

---

# 84. Test Environment

Debe existir una configuración explícita:

```text
TEST
```

separada de:

```text
DEVELOPMENT
```

y:

```text
CAMPAIGN
```

---

# 85. CI

A futuro el proyecto puede ejecutar automáticamente:

```text
Lint
Unit Tests
Integration Tests
Build
```

en cada cambio.

---

# 86. Local CI

El proyecto debe poder ejecutar las pruebas localmente.

Ejemplo conceptual:

```text
test
```

debe ejecutar el conjunto principal.

---

# 87. Agent Development Workflow

Los agentes de programación deben seguir:

```text
READ REQUIREMENT
 ↓
INSPECT CODE
 ↓
IMPLEMENT
 ↓
RUN TESTS
 ↓
FIX FAILURES
 ↓
RUN REGRESSION TESTS
 ↓
REPORT
```

---

# 88. Agent Must Not Assume Success

Un agente no debe afirmar:

```text
"Tests pass"
```

si no ejecutó las pruebas correspondientes.

---

# 89. Agent Change Scope

Cada tarea debería definir:

```text
FILES TO CHANGE
EXPECTED BEHAVIOR
TESTS TO RUN
```

---

# 90. Regression Protection

Antes de modificar una parte crítica:

```text
RUN EXISTING TESTS
```

Después:

```text
RUN EXISTING TESTS
+
NEW TESTS
```

---

# 91. Test Coverage

La cobertura de código es una métrica útil pero no suficiente.

No perseguir:

```text
100% coverage
```

como objetivo absoluto.

---

# 92. Coverage Priority

Priorizar cobertura en:

```text
State Management
Database
Events
Permissions
Canon
Commands
Persistence
```

---

# 93. Lower Priority Coverage

Puede existir menor cobertura en:

```text
Visual Effects
Decorative UI
Experimental Rendering
```

---

# 94. Contract Tests

Los módulos deben tener contratos claros.

Ejemplo:

```text
DM Controller
 ↓
Command API
```

El contrato debe definir:

```text
INPUT
OUTPUT
ERRORS
SIDE EFFECTS
```

---

# 95. Schema Tests

Validar:

```text
JSON
Database Models
API Messages
Scene Definitions
Asset Manifests
```

---

# 96. State Machine Tests

Si una sesión tiene estados:

```text
PREPARING
ACTIVE
PAUSED
ENDED
```

deben probarse las transiciones válidas e inválidas.

---

# 97. Invalid State Transition

Ejemplo:

```text
ENDED
 ↓
ACTIVE
```

debe rechazarse si el modelo de sesión no permite reabrir una sesión.

---

# 98. Event Sourcing Tests

Si se utiliza event sourcing:

```text
EVENTS
 ↓
REDUCER
 ↓
STATE
```

debe verificarse que los eventos sean suficientes para reconstruir
el estado.

---

# 99. State Consistency

Debe comprobarse:

```text
DATABASE STATE
=
IN-MEMORY STATE
=
RENDERER STATE
```

cuando corresponda.

---

# 100. Renderer Synchronization

Si:

```text
Database:
Character position = X
```

entonces eventualmente:

```text
Renderer:
Character position = X
```

---

# 101. Eventual Consistency

En sistemas asincrónicos puede existir un pequeño retraso.

Los tests deben diferenciar:

```text
TEMPORARY DELAY
```

de:

```text
STATE MISMATCH
```

---

# 102. Deterministic Commands

Los comandos críticos deberían ser deterministas siempre que sea
posible.

---

# 103. Randomness

Si existen dados o generación aleatoria:

```text
RANDOM
```

debe poder utilizarse:

```text
SEEDED RANDOM
```

durante tests.

---

# 104. Dice Test

Ejemplo:

```text
Seed = 12345
Roll 1d20
```

debe producir un resultado reproducible en el entorno de pruebas.

---

# 105. Narrative Randomness

La narrativa generativa no necesita ser idéntica.

Debe comprobarse:

```text
VALID STRUCTURE
+
CANON CONSISTENCY
+
NO SECRET LEAK
```

---

# 106. Test Fixtures for Lore

Debe existir lore de prueba con:

```text
Known Facts
Unknown Facts
Contradictions
Secrets
Historical Events
```

Esto permite probar agentes.

---

# 107. Canon Regression Suite

Debe existir un conjunto pequeño de hechos que nunca deben romperse.

Ejemplo:

```text
Ardan is a player character.
The Silver Vault exists.
The Old King died in Session 4.
The party has never visited Atlantis.
```

Los agentes deben poder verificar estos hechos.

---

# 108. Golden Data

Puede existir un archivo:

```text
tests/fixtures/canon-golden.json
```

con hechos fundamentales.

---

# 109. Narrative Regression

Las modificaciones del sistema no deben cambiar automáticamente:

```text
Historical Events
Character Relationships
Timeline
```

---

# 110. Session Replay

Debe ser posible ejecutar:

```text
SESSION FIXTURE
```

y comprobar que el resultado esperado sigue siendo válido.

---

# 111. Replay Debugging

Si un bug ocurre durante una sesión:

```text
EVENT LOG
```

debe permitir reproducirlo.

---

# 112. Bug Reproduction

Cada bug importante debe convertirse, cuando sea posible, en:

```text
REGRESSION TEST
```

---

# 113. Example

Bug:

```text
Character disappears after scene transition.
```

Solución:

```text
Create regression test:
character_scene_transition_preserves_entity
```

---

# 114. Test Documentation

Cada sistema crítico debe documentar:

```text
How to test
What is expected
Known limitations
```

---

# 115. Manual Test Cases

No todo debe automatizarse.

Debe existir una lista de pruebas manuales para:

```text
Visual Quality
DM UX
Player UX
Audio
Narrative Flow
Party Experience
```

---

# 116. DM Manual Test

Una prueba puede consistir en:

```text
1. Start campaign.
2. Start session.
3. Load scene.
4. Move characters.
5. Trigger event.
6. Change atmosphere.
7. End session.
8. Generate recap.
```

---

# 117. Party Simulation

Antes de una party real:

```text
TEST SESSION
```

debe simular:

```text
DM
+
2-4 PLAYERS
```

cuando exista soporte LAN.

---

# 118. Usability Testing

Debe evaluarse:

```text
Can DM understand controls?
Can DM trigger scene change quickly?
Can DM recover from mistake?
Can players understand current state?
```

---

# 119. Performance During Party

La prueba real debe contemplar:

```text
2+ HOURS
```

de uso continuo.

---

# 120. Pre-Party Checklist

Antes de una sesión real:

```text
[ ] Backup created
[ ] Campaign loads
[ ] Current scene loads
[ ] Characters load
[ ] Audio works
[ ] Video works
[ ] DM controls work
[ ] Save works
[ ] AI optional features work
[ ] Fallbacks work
```

---

# 121. Post-Party Checklist

Después:

```text
[ ] Session saved
[ ] Events persisted
[ ] Character state persisted
[ ] Scene state persisted
[ ] Recap generated
[ ] Backup created
[ ] Logs checked
```

---

# 122. Test Reports

Los tests deben producir información útil.

Ejemplo:

```text
TEST SUITE
──────────────
Unit:        PASS
Integration: PASS
Database:    PASS
AI:          PASS
Renderer:    PASS
Security:    PASS
Performance: PASS
```

---

# 123. Failure Reporting

Cuando falle un test:

```text
TEST
EXPECTED
ACTUAL
ENVIRONMENT
STACK / LOG
```

debe poder identificarse.

---

# 124. No Flaky Tests

Los tests intermitentes deben investigarse.

Un test que:

```text
PASS
FAIL
PASS
FAIL
```

sin cambios de código no debe considerarse confiable.

---

# 125. External AI Tests

Los tests contra APIs externas no deben formar parte obligatoria del
test suite rápido.

Preferir:

```text
MOCK
STUB
FIXTURE
```

---

# 126. AI Integration Tests

Puede existir un conjunto separado:

```text
AI-INTEGRATION
```

que se ejecute manualmente o bajo demanda.

---

# 127. Cost Control

Los tests no deben consumir innecesariamente servicios pagos.

Prioridad:

```text
LOCAL
MOCKED
CACHED
```

antes que:

```text
LIVE API
```

---

# 128. Offline Test Suite

El conjunto principal debe funcionar:

```text
WITHOUT INTERNET
```

---

# 129. Build Verification

Antes de considerar una modificación terminada:

```text
INSTALL
 ↓
BUILD
 ↓
TEST
 ↓
START
```

debe funcionar.

---

# 130. Clean Environment Test

Periódicamente probar:

```text
CLEAN INSTALL
```

para detectar dependencias implícitas.

---

# 131. Dependency Tests

Actualizar dependencias debe disparar:

```text
BUILD
+
TEST
```

---

# 132. Database Version Compatibility

Cuando sea relevante:

```text
OLD DATABASE
```

debe poder migrarse a:

```text
CURRENT DATABASE
```

---

# 133. Campaign Compatibility

Una campaña existente no debe quedar inutilizable por una actualización
menor.

---

# 134. Versioned Campaign Format

A futuro:

```text
campaign_format_version
```

permitirá migraciones controladas.

---

# 135. Test Matrix

El sistema debe considerar:

```text
OS
Hardware
Renderer
Configuration
Campaign Size
```

cuando sea necesario.

---

# 136. MVP Test Matrix

Inicialmente:

```text
Primary OS
+
Target Hardware
+
LOW
+
MEDIUM
```

es suficiente.

---

# 137. Regression Gate

Una modificación crítica no debe considerarse completa si:

```text
CRITICAL TEST FAILS
```

---

# 138. Critical Tests

Como mínimo:

```text
Database
Events
Session Persistence
Character State
Scene Loading
DM Commands
Permissions
Canon Integrity
```

---

# 139. Non-Critical Failures

Un efecto visual opcional puede fallar sin bloquear el MVP.

---

# 140. Test Priorities

```text
P0
Data Loss
Canon Corruption
Session Corruption
Security Failure

P1
Core Feature Failure
Scene Failure
Character State Failure

P2
UI Problem
Performance Degradation
Optional AI Failure

P3
Visual Polish
Minor UX Issues
```

---

# 141. Test-Driven Fixes

Cuando se encuentre un bug importante:

```text
BUG
 ↓
REPRODUCE
 ↓
WRITE TEST
 ↓
FIX
 ↓
TEST
```

---

# 142. Agent Rule

Los agentes de programación deben preferir:

```text
TEST
+
IMPLEMENTATION
```

sobre modificar código sin verificación.

---

# 143. Agent Verification Contract

Todo agente que modifique código debe reportar:

```text
Files changed
Tests executed
Tests passed
Tests failed
Known limitations
```

---

# 144. Agent Scope

Si una tarea no requiere modificar:

```text
DATABASE
```

el agente no debería modificarla.

---

# 145. Minimal Change Principle

Preferir:

```text
SMALLEST CHANGE
```

que solucione el problema.

---

# 146. Testable Architecture

Los componentes deben diseñarse para poder probarse sin arrancar toda
la aplicación cuando no sea necesario.

---

# 147. Dependency Injection

Cuando sea útil, utilizar interfaces o inyección de dependencias para
poder reemplazar:

```text
DATABASE
AI
CLOCK
RANDOM
NETWORK
FILESYSTEM
```

por implementaciones de prueba.

---

# 148. Fake Clock

Las pruebas de sesiones deben poder controlar el tiempo.

Ejemplo:

```text
TEST TIME
2026-01-01 20:00
```

---

# 149. Fake AI

Debe existir una implementación de IA simulada.

Ejemplo:

```text
FakeNarrativeAgent
FakeRecapAgent
FakeSceneAgent
```

---

# 150. Fake Renderer

Cuando sea posible, probar el estado sin renderizar visualmente.

```text
STATE
 ↓
FAKE RENDERER
 ↓
ASSERT
```

---

# 151. Test Isolation from Renderer

Los errores de UI no deben impedir probar:

```text
Database
Events
Narrative
Characters
```

---

# 152. Test Isolation from AI

Los errores de IA no deben impedir probar:

```text
Core State
Database
Sessions
Scenes
```

---

# 153. Test Isolation from Network

Los errores de red no deben impedir probar:

```text
Local Campaign
```

---

# 154. Final Test Architecture

Conceptualmente:

```text
                TEST SUITE
                     │
       ┌─────────────┼─────────────┐
       ↓             ↓             ↓
      CORE          AI          RENDERER
       │             │             │
       ↓             ↓             ↓
    Database      Agents        Scenes
    Events        Recap         Assets
    Sessions      Lore          Audio
    Characters    Context       Video
       │             │             │
       └─────────────┼─────────────┘
                     ↓
                INTEGRATION
                     ↓
                    E2E
```

---

# 155. Definition of Done

Una funcionalidad se considera terminada cuando:

```text
[ ] Implementada
[ ] Unit tests
[ ] Integration tests si corresponde
[ ] Validación de errores
[ ] Validación de permisos
[ ] Persistencia verificada
[ ] Regresión verificada
[ ] Documentación actualizada
[ ] Performance aceptable
[ ] Tests ejecutados
```

---

# 156. Final Principle

El sistema debe poder evolucionar durante años sin depender de que los
desarrolladores recuerden manualmente todo lo que ya funcionaba.

Las pruebas deben convertirse en una memoria ejecutable del proyecto.

```text
DOCUMENTATION
    +
CODE
    +
TESTS
    ↓
PROJECT MEMORY
```

La regla fundamental es:

```text
IF IT MATTERS
MAKE IT TESTABLE.
```

Y cuando una modificación rompe algo:

```text
BUG
 ↓
TEST
 ↓
FIX
 ↓
PERMANENT REGRESSION PROTECTION
```
