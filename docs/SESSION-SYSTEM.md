# SESSION-SYSTEM.md

> Especificación del sistema de sesiones del RPG World Engine.
>
> Una sesión representa una instancia jugable de la campaña: desde la
> preparación previa de la party hasta la consolidación de los eventos
> producidos y la actualización del World State.
>
> El sistema debe permitir continuar una campaña semanas o meses después
> sin perder contexto y sin obligar a la IA a procesar toda la historia.

---

# 1. Objetivo

El Session System administra el ciclo de vida completo de una party.

Debe permitir:

- preparar una nueva sesión;
- recuperar el estado de la campaña;
- determinar dónde terminó la sesión anterior;
- identificar personajes presentes y ausentes;
- generar una recapitulación;
- preparar mapa y escena;
- iniciar el entorno virtual;
- registrar acontecimientos durante la party;
- distinguir eventos provisionales de eventos canon;
- permitir al DM confirmar o corregir acontecimientos;
- actualizar el World State;
- generar el resumen de la sesión;
- generar una recapitulación para la próxima party;
- crear un snapshot;
- cerrar correctamente la sesión.

---

# 2. Principio Fundamental

Una sesión no es la campaña completa.

```text
CAMPAIGN
   │
   ├── SESSION 001
   ├── SESSION 002
   ├── SESSION 003
   ├── ...
   └── SESSION 016
```

Cada sesión contiene solamente los acontecimientos y estados
correspondientes a ese momento.

---

# 3. Flujo General

```text
PREVIOUS WORLD STATE
        ↓
SESSION PREPARATION
        ↓
SESSION RECAP
        ↓
PARTICIPANT CONFIRMATION
        ↓
SCENE PREPARATION
        ↓
SESSION START
        ↓
LIVE PLAY
        ↓
EVENT CAPTURE
        ↓
DM REVIEW
        ↓
CANON EVENTS
        ↓
WORLD STATE UPDATE
        ↓
SESSION RECAP
        ↓
SNAPSHOT
        ↓
SESSION CLOSED
```

---

# 4. Session Entity

Una sesión debe tener una identidad única.

Ejemplo:

```text
session-016
```

---

# 5. Session Metadata

Cada sesión debe almacenar como mínimo:

```text
id
campaign_id
session_number
title
status
started_at
ended_at
created_at
updated_at
```

Opcionalmente:

```text
description
notes
location_id
scene_id
```

---

# 6. Session Status

Estados mínimos:

```text
PLANNED
PREPARING
READY
IN_PROGRESS
PAUSED
ENDING
REVIEW
FINALIZING
COMPLETED
CANCELLED
```

---

# 7. Status Flow

Flujo normal:

```text
PLANNED
   ↓
PREPARING
   ↓
READY
   ↓
IN_PROGRESS
   ↓
ENDING
   ↓
REVIEW
   ↓
FINALIZING
   ↓
COMPLETED
```

---

# 8. Paused

Una sesión puede pausarse:

```text
IN_PROGRESS
    ↓
PAUSED
    ↓
IN_PROGRESS
```

Esto no significa que la sesión haya terminado.

---

# 9. Unexpected Shutdown

Si la aplicación se cierra inesperadamente:

```text
IN_PROGRESS
```

debe permanecer recuperable.

Al volver a abrir:

```text
RECOVERY REQUIRED
```

---

# 10. Session Recovery

El sistema debe detectar:

```text
session.status = IN_PROGRESS
```

sin una finalización válida.

Debe ofrecer:

```text
RESUME
RECOVER
DISCARD
REVIEW
```

---

# 11. Session Number

La numeración debe ser secuencial:

```text
Session 001
Session 002
Session 003
...
```

No utilizar el número como identificador interno.

Debe existir:

```text
session_id
```

independiente.

---

# 12. Session Title

El DM puede asignar un título.

Ejemplo:

```text
Session 016
"Las profundidades de la bóveda"
```

La IA puede proponer uno, pero el DM debe poder modificarlo.

---

# 13. Session Description

Puede existir una descripción breve:

```text
The party finally enters the ancient vault beneath the prison.
```

---

# 14. Previous Session

Una sesión puede referenciar la anterior.

```text
session-016
previous_session_id = session-015
```

Esto facilita la recapitulación.

---

# 15. Next Session

No es necesario almacenar inicialmente:

```text
next_session_id
```

porque puede inferirse.

Sin embargo, puede existir como referencia opcional.

---

# 16. Session Preparation

Antes de iniciar una sesión:

```text
Current World State
        ↓
Session Preparation
```

El sistema debe determinar:

- ubicación;
- personajes;
- quests;
- NPCs relevantes;
- eventos recientes;
- escena;
- mapa;
- estado ambiental.

---

# 17. Preparation Context

Debe generarse un contexto reducido:

```text
SESSION PREPARATION CONTEXT

Previous Session:
015

Current Location:
Prison Vault

Active Characters:
Ardan
Elena
Marcus

Active Quest:
Escape the Prison

Important NPC:
Varek

Current Scene:
scene-prison-vault
```

---

# 18. No Full Lore Loading

Preparar una sesión no debe requerir:

```text
ALL CAMPAIGN LORE
```

Debe utilizar:

```text
WORLD STATE
+
RECENT EVENTS
+
RELEVANT LORE
```

---

# 19. Relevant Context

La selección de contexto debe priorizar:

1. estado actual;
2. sesión anterior;
3. eventos recientes;
4. personajes presentes;
5. ubicación actual;
6. quests activas;
7. NPCs relevantes;
8. lore directamente relacionado.

---

# 20. Previous Session Recap

Antes de iniciar la nueva sesión debe estar disponible:

```text
previous_session_recap
```

---

# 21. Recap Purpose

El recap tiene tres objetivos:

```text
1. Recordar a jugadores presentes.
2. Poner al día a jugadores ausentes.
3. Establecer el punto narrativo de inicio.
```

---

# 22. Recap Content

El recap debe incluir:

```text
WHAT HAPPENED
WHO WAS THERE
IMPORTANT DISCOVERIES
IMPORTANT DECISIONS
COMBAT
QUEST PROGRESS
CHARACTER CHANGES
CURRENT LOCATION
UNRESOLVED THREADS
CURRENT SITUATION
```

---

# 23. Recap Length

Debe existir más de un nivel:

```text
SHORT
MEDIUM
FULL
```

Ejemplo:

```text
SHORT:
1-2 minutes

MEDIUM:
3-5 minutes

FULL:
Detailed session summary
```

---

# 24. Recap Audio

A futuro:

```text
Recap Text
    ↓
TTS
    ↓
Narration Audio
```

El audio puede utilizar:

```text
narrator_voice
music
ambient_audio
```

---

# 25. Recap Script

El texto narrativo debe almacenarse.

Ejemplo:

```text
recaps/session-015.md
```

---

# 26. Recap Versions

Puede existir:

```text
recap-v1
recap-v2
recap-final
```

Esto permite que el DM corrija errores.

---

# 27. Recap Authority

La IA puede generar:

```text
DRAFT
```

pero el DM debe poder:

```text
APPROVE
EDIT
REJECT
REGENERATE
```

---

# 28. Participants

La sesión debe registrar quién participó.

Ejemplo:

```text
session-016

Players:
- Player A
- Player B
- Player C
```

---

# 29. Character Participation

Un jugador puede no asistir.

Por lo tanto:

```text
PLAYER PRESENT
```

no implica necesariamente:

```text
CHARACTER PRESENT
```

---

# 30. Participation Status

Estados:

```text
PRESENT
ABSENT
LATE
LEFT_EARLY
GUEST
UNKNOWN
```

---

# 31. Character Absence

Si un jugador falta:

```text
Character:
Ardan

Status:
ABSENT
```

El sistema no debe mover automáticamente al personaje sin una regla narrativa.

---

# 32. Character Handling While Absent

El DM puede definir:

```text
STAYS_WITH_PARTY
STAYS_AT_LOCATION
CONTROLLED_BY_DM
CONTROLLED_BY_OTHER_PLAYER
UNAVAILABLE
```

---

# 33. Character Presence

Ejemplo:

```json
{
  "character_id": "ardan",
  "player_id": "player-01",
  "participation": "ABSENT",
  "character_state": "STAYS_WITH_PARTY"
}
```

---

# 34. Party State

Una sesión puede comenzar con:

```text
party_state
```

incluyendo:

```text
members
location
formation
active_quest
```

---

# 35. Split Party

Debe soportarse:

```text
Party A
├── Ardan
└── Elena

Party B
├── Marcus
└── Lira
```

---

# 36. Split Party Sessions

Una sesión puede tener múltiples grupos activos:

```text
session-016
    ├── party-group-A
    └── party-group-B
```

---

# 37. Party Merge

Cuando vuelven a reunirse:

```text
Party A
+
Party B
↓
Main Party
```

El evento de reunión debe registrarse.

---

# 38. Starting State

Al comenzar una sesión se debe generar un snapshot lógico:

```text
SESSION START STATE
```

Esto permite saber exactamente cómo estaba el mundo al comenzar.

---

# 39. Session Start Snapshot

Ejemplo:

```text
session-016-start
```

Contiene:

```text
World State
Characters
Locations
Quests
Relevant NPCs
Environment
```

---

# 40. Why Start Snapshot?

Permite comparar:

```text
START
vs
END
```

y determinar:

```text
WHAT CHANGED
```

---

# 41. Session Changes

Ejemplo:

```text
START

Vault Door:
CLOSED

Guardian:
ALIVE
```

Después:

```text
END

Vault Door:
OPEN

Guardian:
DEAD
```

---

# 42. Session Delta

El sistema puede calcular:

```text
SESSION DELTA
```

Ejemplo:

```text
Changed:
vault-door CLOSED → OPEN
guardian ALIVE → DEAD
party location corridor → vault
```

---

# 43. Live Session

Durante la sesión existe:

```text
LIVE SESSION STATE
```

No necesariamente persistente todavía.

---

# 44. Live State

Puede contener:

```text
current_scene
character_positions
combat_state
temporary_effects
pending_events
dm_notes
```

---

# 45. Temporary State

Ejemplo:

```text
Character:
Ardan

Temporary:
invisibility = 10 minutes
```

Si la condición no es relevante después de la sesión:

```text
do not persist
```

---

# 46. Persistent State

Debe persistirse:

```text
door opened
quest completed
npc killed
location discovered
item acquired
```

---

# 47. Persistence Rule

La pregunta fundamental:

> ¿Este cambio debe seguir siendo cierto después de terminar la sesión?

Si:

```text
YES
```

→ persistent state.

Si:

```text
NO
```

→ session/live state.

---

# 48. Event Capture

Durante la party se registran acontecimientos.

Fuentes:

```text
DM
VOICE
TEXT
PLAYER ACTION
SYSTEM
AI
RUNTIME
```

---

# 49. Event Sources

Ejemplo:

```text
DM:
"The door opens."

PLAYER:
"Ardan uses the key."

RUNTIME:
Door animation completed.

AI:
Detected possible event.
```

---

# 50. Event Provisional

Durante la sesión:

```text
PROVISIONAL EVENT
```

Ejemplo:

```text
POSSIBLE_EVENT:
Ardan opened the vault.
```

---

# 51. Canon Confirmation

El DM puede confirmar:

```text
CONFIRM
```

Entonces:

```text
PROVISIONAL
    ↓
CANON
```

---

# 52. Rejection

El DM puede rechazar:

```text
REJECT
```

Resultado:

```text
PROVISIONAL
    ↓
REJECTED
```

---

# 53. Correction

También:

```text
CORRECT
```

Ejemplo:

```text
AI:
Ardan opened the vault.

DM:
No, Elena opened it.
```

---

# 54. Corrected Event

Debe almacenarse la versión corregida.

No simplemente sobrescribir el registro original.

---

# 55. Event Audit

Debe quedar:

```text
Original:
Ardan opened vault.

Correction:
Elena opened vault.

Approved by:
DM
```

---

# 56. DM Authority

El DM tiene autoridad final sobre:

```text
Canon
World State
Events
NPC behavior
Narrative outcomes
```

---

# 57. AI Authority

La IA puede:

```text
SUGGEST
DETECT
SUMMARIZE
CLASSIFY
GENERATE
PREPARE
```

pero no debe decidir unilateralmente:

```text
CANON
```

---

# 58. Runtime Authority

El runtime puede:

```text
DISPLAY
ANIMATE
PLAY AUDIO
PLAY VIDEO
TRACK POSITION
DETECT INTERACTION
```

pero no debe establecer canon automáticamente.

---

# 59. DM Control Loop

```text
DM
 ↓
Command
 ↓
Controller
 ↓
Runtime
```

y:

```text
Runtime
 ↓
Observed Action
 ↓
Event Proposal
 ↓
DM
 ↓
Canon
```

---

# 60. Session Timeline

Cada sesión debe tener una timeline.

Ejemplo:

```text
20:00 Session Started
20:10 Recap Completed
20:35 Party entered vault
20:52 Door opened
21:10 Combat started
21:42 Guardian defeated
22:15 Session ended
```

---

# 61. Timeline Events

La timeline puede contener:

```text
EVENT
SCENE_CHANGE
DM_NOTE
COMBAT_START
COMBAT_END
PLAYER_ACTION
NPC_ACTION
BREAK
RECAP
```

---

# 62. Timeline vs Canon

No todo elemento de timeline es canon.

Ejemplo:

```text
DM NOTE:
Maybe there is another exit.
```

Eso no implica:

```text
Canon:
Another exit exists.
```

---

# 63. Scene Changes

Durante una sesión el DM puede cambiar de escena:

```text
scene-vault
    ↓
scene-tunnel
    ↓
scene-cavern
```

Cada cambio puede registrarse.

---

# 64. Scene Transition

Debe existir:

```text
FROM
TO
TRIGGER
TIMESTAMP
```

---

# 65. Transition Trigger

Ejemplos:

```text
DM_COMMAND
PLAYER_ACTION
EVENT
QUEST
AUTOMATIC
```

---

# 66. Scene Transition and World State

Cambiar de escena no necesariamente cambia el World State.

Ejemplo:

```text
scene-vault → scene-tunnel
```

solamente indica:

```text
current scene changed
```

---

# 67. Location Transition

Si también cambia la ubicación:

```text
Vault
 ↓
Tunnel
```

debe actualizarse:

```text
current_location
```

---

# 68. DM Notes

El DM debe poder escribir notas rápidas.

Ejemplo:

```text
NOTE:
Remember that Varek lied about the key.
```

Las notas no son automáticamente canon.

---

# 69. AI Notes

La IA puede producir:

```text
OBSERVATION
```

Ejemplo:

```text
Potential unresolved thread:
Varek's story conflicts with previous information.
```

---

# 70. Unresolved Threads

La sesión debe poder registrar:

```text
UNRESOLVED THREAD
```

Ejemplos:

```text
Who built the vault?
Why does Varek have the key?
Where did the guardian come from?
```

---

# 71. Session Questions

Las preguntas abiertas pueden alimentar futuras sesiones.

```text
session-016
    ↓
unresolved threads
    ↓
session-017 context
```

---

# 72. Session Objectives

El DM puede establecer objetivos para la sesión.

Ejemplo:

```text
SESSION OBJECTIVES

[ ] Explore the vault
[ ] Find the artifact
[ ] Escape before dawn
```

No deben confundirse con quests.

---

# 73. Session Objective vs Quest

```text
QUEST
=
Narrative objective

SESSION OBJECTIVE
=
What we intend to accomplish today
```

---

# 74. Session Agenda

Opcionalmente:

```text
1. Recap
2. Continue exploration
3. Resolve vault encounter
4. Investigate artifact
```

---

# 75. Session Start

Cuando todo está preparado:

```text
READY
 ↓
START SESSION
 ↓
IN_PROGRESS
```

Debe registrarse:

```text
started_at
```

---

# 76. Session Start Actions

Automáticamente:

```text
Load World State
Load Current Scene
Load Party
Load Characters
Load Environment
Load Relevant NPCs
```

---

# 77. Runtime Initialization

```text
Session
 ↓
Scene Projection
 ↓
Runtime Initialization
```

---

# 78. Runtime Failure

Si el runtime falla:

```text
SESSION CONTINUES
```

siempre que sea posible.

La aplicación narrativa no debe depender completamente del renderizado 3D.

---

# 79. Graceful Degradation

Si falla:

```text
3D
```

puede continuar:

```text
2D
```

Si falla:

```text
Video
```

puede continuar:

```text
Static Scene
```

---

# 80. Session Autosave

Durante la sesión debe existir autosave.

Por ejemplo:

```text
Every N minutes
```

o:

```text
After significant event
```

---

# 81. Autosave Content

Debe guardar:

```text
Live Session State
Pending Events
Timeline
Current Scene
Character Positions
DM Notes
```

---

# 82. Autosave Does Not Canonize

Un autosave:

```text
SAVE
```

no significa:

```text
CANON
```

---

# 83. Crash Recovery

Después de un fallo:

```text
Autosave
+
Last Canon State
```

deben permitir continuar.

---

# 84. Recovery UI

Debe mostrar:

```text
Recovered Session

Last autosave:
22:14

Last canon event:
22:03

Pending events:
4
```

---

# 85. Session Ending

Cuando el DM decide terminar:

```text
IN_PROGRESS
 ↓
ENDING
```

---

# 86. Ending Process

El sistema debe:

```text
1. Stop new events
2. Save live state
3. Review pending events
4. Confirm canon
5. Apply World State updates
6. Generate session delta
7. Generate recap
8. Create snapshot
9. Close session
```

---

# 87. Pending Event Review

Los eventos pendientes pueden agruparse:

```text
CONFIRMED
REJECTED
CORRECTED
UNRESOLVED
```

---

# 88. Unresolved Events

Un evento puede quedar:

```text
UNRESOLVED
```

si el DM necesita revisarlo después.

No debe convertirse automáticamente en canon.

---

# 89. World State Update

Después de canonizar:

```text
Canon Events
    ↓
World State Reducer
    ↓
New World State
```

---

# 90. Session Delta Generation

Comparar:

```text
Session Start State
```

con:

```text
Session End State
```

---

# 91. Delta Example

```text
CHANGES

Characters:
- Ardan moved to Vault.
- Elena gained Vault Key.

Locations:
- Vault discovered.

Objects:
- Vault Door opened.

NPCs:
- Guardian defeated.

Quests:
- Escape Prison → IN_PROGRESS
```

---

# 92. Session Recap Generation

La IA puede generar:

```text
session-016-recap.md
```

a partir de:

```text
Canon Events
+
Session Delta
+
Important Notes
+
Quest Changes
```

---

# 93. Recap Structure

```md
# Session 016

## Previously

...

## What Happened

...

## Important Decisions

...

## Discoveries

...

## Character Changes

...

## Quest Progress

...

## Current Situation

...

## Unresolved Threads

...
```

---

# 94. Recap Accuracy

El recap no debe inventar acontecimientos.

Solo puede utilizar:

```text
CANON
```

más información explícitamente autorizada.

---

# 95. Narrative Enhancement

La IA puede mejorar:

```text
style
flow
dramatic tone
clarity
```

pero no cambiar:

```text
facts
events
outcomes
```

---

# 96. Recap Validation

Antes de finalizar:

```text
Generated Recap
       ↓
Canon Consistency Check
       ↓
DM Approval
```

---

# 97. Recap Approval

Estados:

```text
DRAFT
REVIEW
APPROVED
PUBLISHED
```

---

# 98. Session Snapshot

Al finalizar:

```text
session-016-end
```

Debe representar el estado después de la sesión.

---

# 99. Snapshot Chain

```text
session-015-end
       ↓
session-016-start
       ↓
session-016-end
       ↓
session-017-start
```

---

# 100. Start/End Equivalence

En condiciones normales:

```text
Session N END STATE
=
Session N+1 START STATE
```

salvo cambios externos explícitamente registrados.

---

# 101. External Changes

A futuro podrían existir:

```text
World Simulation
Scheduled Event
Time Advancement
```

pero deben registrarse.

---

# 102. Session Closure

Una sesión se considera completada cuando:

```text
Canonization complete
+
World State updated
+
Recap approved
+
Snapshot created
```

---

# 103. Completed Session

```text
status = COMPLETED
```

Debe ser prácticamente inmutable.

Las correcciones posteriores deben registrarse como eventos/correcciones.

---

# 104. Post-session Correction

Si el DM descubre un error:

```text
Session 016
    ↓
Correction Event
```

No editar silenciosamente la historia.

---

# 105. Session Audit

Debe poder responder:

```text
Who changed this?
When?
Why?
What was the previous value?
What is the new value?
```

---

# 106. Audit Example

```json
{
  "entity": "vault-door",
  "field": "state",
  "old_value": "CLOSED",
  "new_value": "OPEN",
  "changed_by": "DM",
  "source_event": "event-0241"
}
```

---

# 107. Session Database

SQLite puede contener conceptualmente:

```text
sessions
session_participants
session_events
session_timeline
session_notes
session_snapshots
session_recaps
session_objectives
session_threads
```

---

# 108. Sessions Table

```text
sessions
--------------------------------
id
campaign_id
session_number
title
status
started_at
ended_at
previous_session_id
created_at
updated_at
```

---

# 109. Session Participants

```text
session_participants
--------------------------------
session_id
player_id
character_id
status
joined_at
left_at
```

---

# 110. Session Events

```text
session_events
--------------------------------
session_id
event_id
sequence
status
created_at
```

---

# 111. Session Timeline

```text
session_timeline
--------------------------------
id
session_id
type
timestamp
payload
```

---

# 112. Session Recaps

```text
session_recaps
--------------------------------
id
session_id
version
status
content_path
audio_path
created_at
approved_at
```

---

# 113. Session Objectives

```text
session_objectives
--------------------------------
id
session_id
description
status
```

---

# 114. Session Threads

```text
session_threads
--------------------------------
id
session_id
description
status
priority
```

---

# 115. Session Files

Recommended:

```text
sessions/
├── session-001/
│   ├── session.md
│   ├── recap.md
│   ├── notes.md
│   └── assets/
│
├── session-002/
│   └── ...
```

---

# 116. session.md

Human-readable session metadata.

Example:

```md
# Session 016

## Status

COMPLETED

## Title

Las profundidades de la bóveda

## Participants

- Player A
- Player B

## Location

Prison Vault

## Date

2026-08-15
```

---

# 117. notes.md

Notas del DM:

```md
# DM Notes

- Varek is hiding something.
- Artifact should not be revealed yet.
- Player C may investigate the eastern tunnel.
```

Estas notas no son necesariamente canon.

---

# 118. recap.md

Resumen aprobado:

```text
session-016/recap.md
```

---

# 119. Audio Recap

Opcional:

```text
session-016/recap.mp3
```

---

# 120. Session Assets

Puede contener:

```text
assets/
├── screenshots/
├── maps/
├── audio/
├── video/
└── temporary/
```

---

# 121. Temporary Assets

Los assets temporales deben poder limpiarse.

No deben formar parte del canon.

---

# 122. DM Controller Integration

El Session System debe exponer el estado necesario para el DM Controller.

Ejemplo:

```text
Current Session
Current Scene
Available Scenes
Characters
NPCs
Effects
Audio
Video
Pending Events
```

---

# 123. DM Controller Commands

Ejemplos:

```text
START_SESSION
PAUSE_SESSION
RESUME_SESSION
CHANGE_SCENE
TRIGGER_EFFECT
PLAY_AUDIO
PLAY_VIDEO
ADD_EVENT
APPROVE_EVENT
REJECT_EVENT
END_SESSION
```

---

# 124. Controller Does Not Own State

El DM Controller no debe convertirse en la fuente de verdad.

```text
Controller
    ↓
Command
    ↓
Session System
```

---

# 125. Session System as Orchestrator

El Session System coordina:

```text
World State
Event System
DM Controller
Runtime
Recap System
Snapshot System
```

---

# 126. Voice Integration

A futuro el DM puede hablar:

```text
DM Voice
 ↓
Speech Recognition
 ↓
Candidate Event
 ↓
DM Review
```

---

# 127. Voice Does Not Equal Canon

Una frase detectada por voz:

```text
"The door opens."
```

no significa automáticamente:

```text
CANON EVENT
```

Debe pasar por las reglas definidas en EVENT-SYSTEM.md.

---

# 128. Player Voice

Opcionalmente:

```text
Player Voice
 ↓
Transcription
 ↓
Action Candidate
```

Esto puede utilizarse para asistentes narrativos.

---

# 129. Session Transcript

A futuro puede almacenarse:

```text
session-016/transcript.md
```

Pero el transcript no debe confundirse con canon.

---

# 130. Transcript Hierarchy

```text
TRANSCRIPT
   ↓
AI EXTRACTION
   ↓
EVENT PROPOSALS
   ↓
DM REVIEW
   ↓
CANON EVENTS
```

---

# 131. Session AI Agents

Los agentes pueden especializarse.

Ejemplo:

```text
Session Summarizer
Event Extractor
Continuity Checker
Recap Writer
Scene Assistant
Lore Assistant
```

---

# 132. Agent Context

Cada agente debe recibir únicamente:

```text
Relevant Session Context
```

---

# 133. Session Summarizer

Entrada:

```text
Canon Events
Session Timeline
World State Delta
```

Salida:

```text
Recap Draft
```

---

# 134. Continuity Checker

Debe detectar:

```text
Contradictions
Impossible State Changes
Missing Dependencies
Character Inconsistencies
```

---

# 135. Scene Assistant

Debe determinar:

```text
Current Scene
Characters
Objects
Environment
Transitions
```

---

# 136. Lore Assistant

Debe responder preguntas históricas sin modificar el canon.

---

# 137. Agent Safety Rule

Los agentes nunca deben modificar directamente:

```text
CANON
WORLD STATE
SESSION HISTORY
```

sin pasar por la capa correspondiente.

---

# 138. Session API Concept

Conceptualmente:

```text
createSession()
prepareSession()
startSession()
pauseSession()
resumeSession()
addEvent()
reviewEvent()
approveEvent()
rejectEvent()
changeScene()
saveCheckpoint()
endSession()
finalizeSession()
recoverSession()
```

---

# 139. Session Query API

```text
getCurrentSession()
getSession(id)
getSessionEvents(id)
getSessionParticipants(id)
getSessionRecap(id)
getSessionDelta(id)
getSessionTimeline(id)
```

---

# 140. Current Session Query

Debe ser extremadamente eficiente:

```text
getCurrentSession()
```

porque será utilizada frecuentemente por:

- UI;
- DM Controller;
- runtime;
- agentes.

---

# 141. Local Performance

El MVP debe funcionar cómodamente con:

```text
SQLite
Local filesystem
Local runtime
```

sin depender de servicios externos.

---

# 142. Caching

Puede existir cache para:

```text
Current Session
Current World State
Current Scene
```

pero debe invalidarse cuando cambie el estado correspondiente.

---

# 143. Session Context Cache

Ejemplo:

```text
session-context.json
```

puede almacenar temporalmente:

```text
current session
current location
current scene
active characters
active quests
recent events
```

---

# 144. Cache Regeneration

Si el cache se pierde:

```text
SQLite
+
Filesystem
```

deben permitir reconstruirlo.

---

# 145. Offline Requirement

Todas las funciones principales deben funcionar:

```text
WITHOUT INTERNET
```

---

# 146. Optional AI

El sistema base no debe romperse si no existe un proveedor de IA.

Debe poder funcionar manualmente.

Ejemplo:

```text
DM creates event
DM approves event
System updates state
```

---

# 147. Optional TTS

La recapitulación puede existir como texto aunque no exista TTS.

```text
Text = required
Audio = optional
```

---

# 148. Optional 3D

La sesión puede ejecutarse sin 3D.

```text
2D map
```

o:

```text
Text interface
```

deben ser alternativas válidas.

---

# 149. Graceful Architecture

```text
Narrative Core
       │
       ├── 2D Runtime
       ├── 3D Runtime
       ├── Audio
       ├── Video
       └── AI
```

El Narrative Core no debe depender de ninguno de ellos.

---

# 150. MVP Session System

El MVP debe implementar:

```text
Create Session
Load Previous State
Show Recap
Register Participants
Start Session
Track Current Location
Track Current Scene
Create Events
Review Events
Canonize Events
Update World State
Generate Session Summary
Create Snapshot
Close Session
```

---

# 151. MVP Optional

Puede quedar para una segunda fase:

```text
Voice Recognition
Automatic Event Detection
TTS
3D Runtime
Video Transitions
Automatic Scene Generation
Advanced AI Agents
```

---

# 152. Future Session Features

A futuro:

```text
Automatic recap voiceover
Player-specific recaps
Character-specific recaps
Multilingual recaps
Timeline visualization
Session replay
Session branching
Alternative outcomes
Time travel/debug mode
```

---

# 153. Session Branching

No implementar inicialmente.

Pero la arquitectura debería permitir:

```text
Session 016
      │
      ├── Canon Timeline
      │
      └── What-if Timeline
```

Esto podría servir posteriormente para simulaciones.

---

# 154. What-if State

Un agente podría preguntar:

```text
What would happen if the party had not opened the vault?
```

El sistema podría crear:

```text
TEMPORARY BRANCH
```

sin modificar el canon.

---

# 155. Branch Isolation

Una simulación nunca debe modificar:

```text
CANON WORLD STATE
```

sin confirmación explícita.

---

# 156. Session Security

Aunque sea una aplicación local, debe existir separación entre:

```text
DM
PLAYER
AI
RUNTIME
```

---

# 157. DM Permissions

El DM puede:

```text
approve
reject
edit
canonize
modify state
```

---

# 158. Player Permissions

Los jugadores pueden:

```text
view
interact
submit actions
```

pero no deberían modificar directamente el canon.

---

# 159. Runtime Permissions

El runtime:

```text
read state
send observations
```

pero no:

```text
modify canon
```

---

# 160. Data Integrity

Al cerrar una sesión deben cumplirse:

```text
No unresolved critical events
World State valid
Snapshot created
Recap generated
Session metadata saved
```

---

# 161. Critical Error

Si falla:

```text
Snapshot creation
```

la sesión no debería marcarse como:

```text
COMPLETED
```

hasta resolverlo.

---

# 162. Finalization Transaction

Conceptualmente:

```text
BEGIN

Apply Canon Events
Update World State
Create Snapshot
Save Session Delta
Save Recap Metadata
Mark Session Completed

COMMIT
```

Si algo falla:

```text
ROLLBACK
```

cuando sea posible.

---

# 163. Backup

Antes de finalizar una sesión:

```text
current database
        ↓
backup
        ↓
finalization
```

---

# 164. Local Backup Strategy

Para el MVP:

```text
backups/
├── pre-session-016.db
├── session-016-final.db
└── session-016-final.json
```

---

# 165. Session Export

A futuro:

```text
Export Session
```

puede generar:

```text
session-016.zip
```

con:

```text
session.md
recap.md
events.json
snapshot.db
assets/
```

---

# 166. Session Import

Posteriormente:

```text
Import Session
```

permitirá migrar campañas.

---

# 167. Multi-machine Future

No implementar inicialmente.

Pero el formato debería permitir posteriormente:

```text
Local
   ↓
Export
   ↓
Another Machine
```

---

# 168. Session State Machine

```text
             ┌──────────────┐
             │   PLANNED    │
             └──────┬───────┘
                    ↓
             ┌──────────────┐
             │  PREPARING   │
             └──────┬───────┘
                    ↓
             ┌──────────────┐
             │    READY     │
             └──────┬───────┘
                    ↓
             ┌──────────────┐
             │ IN_PROGRESS  │
             └──────┬───────┘
                    │
              ┌─────┴─────┐
              ↓           ↓
          ┌───────┐   ┌─────────┐
          │PAUSED │   │ ENDING  │
          └───┬───┘   └────┬────┘
              │            ↓
              └──────→ ┌────────┐
                       │ REVIEW │
                       └────┬───┘
                            ↓
                       ┌──────────┐
                       │FINALIZING│
                       └────┬─────┘
                            ↓
                       ┌──────────┐
                       │COMPLETED │
                       └──────────┘
```

---

# 169. Core Session Invariants

Debe cumplirse:

```text
A session has exactly one campaign.
```

```text
A completed session cannot lose its history.
```

```text
Autosave does not imply canonization.
```

```text
AI suggestions do not imply canonization.
```

```text
Runtime actions do not imply canonization.
```

```text
Canon events must be traceable to a session.
```

```text
World State changes must be traceable to canon events.
```

---

# 170. Traceability

Debe ser posible navegar:

```text
World State
    ↓
State Change
    ↓
Canon Event
    ↓
Session
    ↓
Original Source
```

---

# 171. Example Trace

```text
Vault Door = OPEN

        ↓

State Change:
vault-door CLOSED → OPEN

        ↓

Event:
event-0241

        ↓

Session:
session-016

        ↓

Source:
DM statement at 21:52
```

---

# 172. Reverse Trace

También:

```text
Session 016
    ↓
Event 0241
    ↓
Vault Door
    ↓
World State
    ↓
Current Scene
```

---

# 173. Core Principle

Una sesión es el **contenedor temporal de actividad de la campaña**.

El sistema debe separar claramente:

```text
SESSION ACTIVITY
```

de:

```text
CAMPAIGN TRUTH
```

La primera registra lo ocurrido durante una party.

La segunda se obtiene cuando los acontecimientos son confirmados y
aplicados al World State.

---

# 174. Final Architecture

```text
                    CAMPAIGN
                       │
                       ▼
                ┌──────────────┐
                │ WORLD STATE  │
                └──────┬───────┘
                       │
                       ▼
              ┌─────────────────┐
              │ SESSION SYSTEM  │
              └────────┬────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
      PARTICIPANTS   RECAP       CONTEXT
          │            │            │
          └────────────┼────────────┘
                       ▼
                  LIVE SESSION
                       │
             ┌─────────┼─────────┐
             │         │         │
             ▼         ▼         ▼
           EVENTS    SCENES    NOTES
             │         │
             ▼         ▼
         DM REVIEW   RUNTIME
             │
             ▼
        CANON EVENTS
             │
             ▼
        WORLD STATE
             │
       ┌─────┴─────┐
       ▼           ▼
   SNAPSHOT      RECAP
       │           │
       └─────┬─────┘
             ▼
       NEXT SESSION
```

---

# 175. Final Design Rule

El sistema debe permitir que una party termine hoy y que, dentro de varias
semanas, la próxima sesión pueda comenzar con:

```text
"Estos son los personajes presentes.
Este es el lugar donde están.
Esto es lo último que ocurrió.
Estas son las cosas que quedaron pendientes.
Este es el mapa que deben ver.
Esta es la escena que deben cargar.
Este es el estado actual del mundo."
```

sin que ningún agente necesite leer toda la campaña.

Ese comportamiento constituye uno de los objetivos centrales del
RPG World Engine.
