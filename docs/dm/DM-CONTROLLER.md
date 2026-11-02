# DM-CONTROLLER.md

> Especificación del sistema de control para el Dungeon Master (DM).
>
> El DM Controller constituye la interfaz operativa principal durante una
> sesión. Su objetivo es permitir que el DM controle el entorno narrativo,
> visual y sonoro sin tener que interactuar directamente con el motor 3D.

---

# 1. Objetivo

El DM Controller permite controlar en tiempo real:

- escenas;
- mapas;
- personajes;
- NPCs;
- cámaras;
- iluminación;
- clima;
- música;
- sonidos;
- videos;
- efectos visuales;
- overlays 2D;
- transiciones;
- eventos;
- notas;
- estado de la sesión.

Debe funcionar como una capa de abstracción entre:

```text
DM
 ↓
DM Controller
 ↓
Session System
 ↓
Runtime
```

---

# 2. Principio Fundamental

El DM no debería necesitar conocer:

- detalles del motor 3D;
- nombres internos de assets;
- rutas de archivos;
- implementación de shaders;
- lógica de renderizado;
- APIs internas.

Debe trabajar con conceptos narrativos.

Ejemplo:

```text
DM:
"Entrar a la bóveda"
```

en lugar de:

```text
loadScene("scene_0042")
setCamera(...)
setLight(...)
playVideo(...)
```

---

# 3. Controller como Abstracción

```text
                 DM
                  │
                  ▼
          ┌───────────────┐
          │ DM CONTROLLER │
          └───────┬───────┘
                  │
          Command / Intent
                  │
                  ▼
          ┌───────────────┐
          │ Session System│
          └───────┬───────┘
                  │
                  ▼
              Runtime
```

---

# 4. Fuente de Verdad

El DM Controller NO es la fuente de verdad.

Las responsabilidades se dividen:

```text
World State
    ↓
Persistent Campaign State

Session System
    ↓
Current Party State

DM Controller
    ↓
Operational Commands

Runtime
    ↓
Visual / Audio Representation
```

---

# 5. Responsabilidad del Controller

El Controller debe:

- mostrar el estado actual;
- permitir comandos;
- ejecutar acciones;
- enviar eventos;
- recibir feedback del runtime;
- mostrar errores;
- facilitar el trabajo del DM.

No debe:

- decidir el canon;
- modificar directamente la base de datos;
- ejecutar lógica narrativa compleja;
- reemplazar al Session System.

---

# 6. Diseño Local-First

El MVP debe ejecutarse localmente.

No depender de:

```text
Cloud
SaaS
External Database
Paid API
Online Dashboard
```

---

# 7. Arquitectura

```text
┌───────────────────────────────┐
│           DM UI               │
├───────────────────────────────┤
│ Command / Action Layer        │
├───────────────────────────────┤
│ Controller State              │
├───────────────────────────────┤
│ Command Bus                   │
├───────────────────────────────┤
│ Session System                │
├───────────────────────────────┤
│ Runtime Adapter               │
└───────────────────────────────┘
```

---

# 8. Dashboard Principal

La pantalla principal debe priorizar información crítica.

Conceptualmente:

```text
┌──────────────────────────────────────────────────────┐
│ SESSION 016       IN PROGRESS             21:42      │
├──────────────┬───────────────────────────┬───────────┤
│ SCENES       │                           │ EVENTS    │
│              │                           │           │
│ Vault        │       LIVE PREVIEW        │ Pending 2 │
│ Tunnel       │                           │           │
│ Cavern       │                           │           │
│              │                           │           │
├──────────────┴───────────────────────────┴───────────┤
│ AUDIO │ LIGHT │ FX │ VIDEO │ CAMERA │ NOTES │ SESSION │
└──────────────────────────────────────────────────────┘
```

---

# 9. Información Permanente

Debe estar visible:

```text
Session
Session number
Session status
Current location
Current scene
Elapsed time
Connected runtime
Pending events
```

---

# 10. Session Header

Ejemplo:

```text
SESSION 016
Las profundidades de la bóveda

STATUS:
● LIVE

LOCATION:
Prison Vault

SCENE:
Vault Interior

TIME:
02:14:32
```

---

# 11. Runtime Connection

Debe mostrar:

```text
CONNECTED
```

o:

```text
DISCONNECTED
```

---

# 12. Runtime Health

Opcionalmente:

```text
FPS
Memory
Renderer
Audio
Video
Network/IPC
```

Durante una party esto no debe ocupar demasiado espacio.

---

# 13. Runtime Status

Ejemplo:

```text
RUNTIME

● Connected
● Audio OK
● Video OK
● Scene loaded
```

---

# 14. Preview vs Live

El Controller debe diferenciar:

```text
PREVIEW
```

de:

```text
LIVE
```

---

# 15. Preview

El DM puede preparar:

```text
Scene
Camera
Lighting
Audio
Effects
Video
```

sin afectar a los jugadores.

---

# 16. Live

Cuando el DM confirma:

```text
GO LIVE
```

la configuración pasa al runtime.

---

# 17. Ejemplo

```text
CURRENT LIVE:
Vault

PREVIEW:
Ancient Cavern

[ LOAD ] [ PREVIEW ] [ GO LIVE ]
```

---

# 18. Safety Rule

Las acciones potencialmente disruptivas deberían requerir confirmación.

Ejemplo:

```text
RESET SCENE?
```

pero no debe pedirse confirmación para cada acción trivial.

---

# 19. Acciones Instantáneas

Ejemplos:

```text
Play Sound
Play Music
Toggle Fog
Dim Lights
Show NPC
Hide NPC
Trigger Effect
```

pueden ser instantáneas.

---

# 20. Acciones Destructivas

Ejemplos:

```text
Reset Session
Reset Scene
Clear Runtime
Delete Event
```

requieren confirmación.

---

# 21. Scene Manager

Debe existir una sección:

```text
SCENES
```

con escenas disponibles.

---

# 22. Scene Card

Ejemplo:

```text
┌────────────────────┐
│ [thumbnail]        │
│                    │
│ Prison Vault       │
│ Interior           │
│                    │
│ [Preview] [Load]   │
└────────────────────┘
```

---

# 23. Scene Categories

Las escenas pueden organizarse:

```text
FOREST
CITY
DUNGEON
CAVE
PRISON
CASTLE
INTERIOR
EXTERIOR
COMBAT
SPECIAL
```

---

# 24. Scene Search

Debe poder buscar:

```text
vault
cave
prison
forest
```

---

# 25. Scene Tags

Ejemplo:

```text
tags:
dungeon
dark
underground
stone
combat
```

Esto será importante para agentes.

---

# 26. Current Scene

Debe existir una única escena activa.

```text
current_scene_id
```

---

# 27. Scene Transition

El DM puede ejecutar:

```text
CHANGE SCENE
```

---

# 28. Transition Types

```text
CUT
FADE
DISSOLVE
CROSSFADE
BLACKOUT
CUSTOM
```

---

# 29. Transition Presets

Ejemplos:

```text
Cinematic Fade
Dungeon Reveal
Combat Transition
Dream Sequence
Flashback
```

---

# 30. Map Control

El Controller debe permitir cambiar:

```text
Map
Zoom
Position
Visibility
Layers
```

---

# 31. Map Layers

Ejemplo:

```text
Base Map
Walls
Doors
Secret Doors
Objects
Characters
NPCs
Effects
Grid
Fog
```

---

# 32. Grid

Opcional:

```text
SHOW GRID
HIDE GRID
SNAP TO GRID
```

---

# 33. Fog of War

Debe permitir:

```text
Reveal
Hide
Reset
```

---

# 34. Fog Presets

Ejemplo:

```text
FULL DARK
PARTIAL
EXPLORED
VISIBLE AREA
```

---

# 35. Character Manager

Debe mostrar personajes presentes.

```text
CHARACTERS

Ardan
Elena
Marcus
Lira
```

---

# 36. Character Card

Ejemplo:

```text
┌───────────────────┐
│     CHARACTER     │
│                   │
│       ARDAN       │
│                   │
│ HP  32 / 40       │
│ Status: Normal    │
│                   │
│ [Focus] [Move]    │
└───────────────────┘
```

---

# 37. Character Position

El DM puede modificar:

```text
X
Y
Z
rotation
scale
```

pero estos valores pertenecen al runtime/session state según corresponda.

---

# 38. Character Placement

Debe existir:

```text
PLACE
MOVE
ROTATE
REMOVE
HIDE
SHOW
FOCUS
```

---

# 39. Character Focus

Ejemplo:

```text
FOCUS ARDAN
```

puede:

- mover cámara;
- seleccionar personaje;
- mostrar información.

---

# 40. NPC Manager

Los NPC pueden ser:

```text
ACTIVE
NEUTRAL
HOSTILE
HIDDEN
BACKGROUND
```

---

# 41. NPC Spawn

El DM puede:

```text
SPAWN NPC
```

---

# 42. NPC Templates

Ejemplo:

```text
Goblin
Guard
Merchant
Cultist
Guardian
```

---

# 43. NPC Instance

Debe distinguirse:

```text
NPC TYPE
```

de:

```text
NPC INSTANCE
```

Ejemplo:

```text
Guardian
    ↓
guardian-001
```

---

# 44. NPC State

Puede incluir:

```text
HP
status
location
faction
visibility
behavior
```

---

# 45. Camera Controller

Debe permitir:

```text
CAMERA
```

con:

```text
position
rotation
zoom
target
movement
```

---

# 46. Camera Presets

Ejemplos:

```text
Overview
Character Focus
Door
NPC
Combat
Cinematic
Wide Shot
Close Up
```

---

# 47. Camera Follow

Puede existir:

```text
FOLLOW CHARACTER
```

---

# 48. Camera Shake

Debe soportar:

```text
NONE
LIGHT
MEDIUM
HEAVY
```

para:

```text
Explosion
Earthquake
Impact
Magic
Combat
```

---

# 49. Lighting Controller

Debe permitir:

```text
Intensity
Color
Direction
Ambient Light
Fog
Shadows
```

---

# 50. Lighting Presets

Ejemplos:

```text
DAY
NIGHT
DARK DUNGEON
TORCHLIGHT
MOONLIGHT
RED ALERT
MAGICAL
HORROR
```

---

# 51. Lighting Transition

Ejemplo:

```text
TORCHLIGHT
   ↓
FADE
   ↓
DARKNESS
```

---

# 52. Environment Controller

Debe permitir controlar:

```text
Fog
Rain
Snow
Wind
Dust
Smoke
Particles
```

---

# 53. Environment Presets

Ejemplos:

```text
Clear
Foggy
Heavy Fog
Rain
Storm
Ash
Dust
```

---

# 54. Audio Controller

Debe separar:

```text
MUSIC
AMBIENCE
SFX
VOICE
```

---

# 55. Music

Funciones:

```text
Play
Pause
Stop
Fade In
Fade Out
Crossfade
Volume
Loop
```

---

# 56. Music Categories

```text
Exploration
Combat
Tension
Horror
Mystery
Victory
Sad
Cinematic
```

---

# 57. Ambient Audio

Ejemplo:

```text
Cave
Wind
Prison
Forest
Rain
Crowd
Machinery
```

---

# 58. Sound Effects

Ejemplos:

```text
Door
Metal
Explosion
Magic
Footsteps
Thunder
Creature
```

---

# 59. Audio Layers

Puede ejecutarse:

```text
Music
+
Ambience
+
SFX
+
Voice
```

simultáneamente.

---

# 60. Audio Ducking

Cuando comienza una narración:

```text
VOICE
 ↓
Music Volume ↓
Ambience Volume ↓
VOICE
 ↓
Restore
```

---

# 61. Video Controller

Debe permitir:

```text
Play
Pause
Stop
Seek
Loop
Volume
Fullscreen
```

---

# 62. Video Usage

Videos pueden utilizarse para:

```text
Cinematic
Flashback
Vision
Portal
Environment
NPC Introduction
Boss Entrance
```

---

# 63. Video Overlay

Un video puede aparecer sobre:

```text
3D Scene
2D Map
Full Screen
```

---

# 64. Video Transition

Ejemplo:

```text
3D Scene
 ↓
Fade
 ↓
Video
 ↓
Fade
 ↓
3D Scene
```

---

# 65. 2D Overlay

El Controller debe permitir:

```text
TEXT
IMAGE
VIDEO
PORTRAIT
SYMBOL
MAP
```

---

# 66. Overlay Examples

```text
"THE VAULT OPENS"
```

o:

```text
NPC Portrait
+
Dialogue
```

---

# 67. Overlay Presets

```text
Title
Location
Chapter
Warning
Dialogue
Quest
Flashback
```

---

# 68. VFX Controller

Debe permitir activar efectos:

```text
Fog
Fire
Lightning
Explosion
Magic
Particles
Blood
Smoke
```

---

# 69. VFX Presets

Ejemplo:

```text
MAGIC_BLUE
FIRE_BURST
EARTHQUAKE
PORTAL
SHOCKWAVE
DARKNESS
```

---

# 70. Trigger System

Todas estas acciones deberían utilizar un sistema común de triggers.

```text
TRIGGER
   ↓
ACTION
```

---

# 71. Trigger Example

```json
{
  "trigger": "boss_intro",
  "actions": [
    {
      "type": "camera",
      "preset": "boss"
    },
    {
      "type": "audio",
      "asset": "boss-theme"
    },
    {
      "type": "lighting",
      "preset": "red-alert"
    },
    {
      "type": "vfx",
      "preset": "smoke"
    }
  ]
}
```

---

# 72. Macro

Una macro es un conjunto de comandos predefinidos.

Ejemplo:

```text
MACRO:
BOSS ENTRANCE
```

Ejecuta:

```text
Camera
+
Lighting
+
Audio
+
VFX
+
NPC Spawn
```

---

# 73. Macro Editor

A futuro el DM podrá crear:

```text
Macro
 ├── Action 1
 ├── Delay
 ├── Action 2
 ├── Action 3
 └── Action 4
```

---

# 74. Delays

Ejemplo:

```text
Camera Change
↓
2 sec
↓
Sound
↓
1 sec
↓
Video
```

---

# 75. Timeline Control

Las macros pueden utilizar:

```text
seconds
milliseconds
```

pero debe evitarse depender de timing extremadamente preciso en el MVP.

---

# 76. Quick Actions

El DM debe tener botones rápidos:

```text
PAUSE
BLACKOUT
PLAY MUSIC
STOP MUSIC
FOG
COMBAT
SCENE CHANGE
SHOW MAP
```

---

# 77. Emergency Controls

Debe existir:

```text
BLACKOUT
STOP ALL
MUTE
PAUSE RUNTIME
```

---

# 78. STOP ALL

Debe detener:

```text
Music
SFX
Video
VFX
Animations
```

según configuración.

---

# 79. DM Notes Panel

Debe permitir:

```text
Quick Note
```

Ejemplo:

```text
"Elena sospecha de Varek."
```

---

# 80. Note Types

```text
GENERAL
CHARACTER
NPC
QUEST
LORE
SECRET
FUTURE
```

---

# 81. Secret Notes

Las notas secretas nunca deben mostrarse al jugador.

---

# 82. Event Panel

Debe mostrar:

```text
RECENT EVENTS
```

---

# 83. Pending Events

Ejemplo:

```text
PENDING EVENTS

[?] Elena found a hidden key.
[?] Guardian was defeated.
```

---

# 84. Event Actions

```text
APPROVE
REJECT
EDIT
DEFER
```

---

# 85. Event Detail

Debe mostrar:

```text
Source
Timestamp
Actor
Target
Description
AI confidence
Related scene
```

---

# 86. Event Confidence

Si un agente detecta un evento:

```text
Confidence: 87%
```

La confianza nunca reemplaza la aprobación del DM.

---

# 87. Command Bus

Todas las acciones importantes deben pasar por un Command Bus.

Conceptualmente:

```text
UI
 ↓
Command
 ↓
Command Bus
 ↓
Handler
 ↓
Session / Runtime
```

---

# 88. Command

Ejemplo:

```json
{
  "type": "CHANGE_SCENE",
  "payload": {
    "scene_id": "vault",
    "transition": "fade"
  }
}
```

---

# 89. Command Metadata

Puede incluir:

```json
{
  "command_id": "cmd-123",
  "type": "CHANGE_SCENE",
  "source": "DM",
  "timestamp": "2026-08-15T21:42:00"
}
```

---

# 90. Command Sources

```text
DM_UI
HOTKEY
VOICE
AUTOMATION
AGENT
SYSTEM
```

---

# 91. Command Validation

Antes de ejecutar:

```text
Command
 ↓
Validation
 ↓
Authorization
 ↓
Execution
```

---

# 92. Invalid Command

Ejemplo:

```text
CHANGE_SCENE
scene_id = unknown
```

Debe devolver:

```text
ERROR:
Scene not found.
```

---

# 93. Command Result

Ejemplo:

```json
{
  "success": true,
  "command_id": "cmd-123"
}
```

---

# 94. Runtime Events

El runtime puede devolver:

```text
SCENE_LOADED
VIDEO_STARTED
VIDEO_FINISHED
AUDIO_STARTED
CHARACTER_MOVED
NPC_SPAWNED
RUNTIME_ERROR
```

---

# 95. Runtime Feedback

Ejemplo:

```text
DM Controller

Scene:
Vault

Runtime:
LOADED ✓
```

---

# 96. Runtime Error

Ejemplo:

```text
Runtime Error

Could not load:
vault_guardian.glb

[Retry]
[Use Placeholder]
```

---

# 97. Placeholder Mode

Si un asset falla:

```text
3D Asset
 ↓
FAIL
 ↓
Placeholder
```

La sesión puede continuar.

---

# 98. Asset Independence

El Controller debe referenciar:

```text
asset_id
```

no rutas físicas.

---

# 99. Asset Registry

Ejemplo:

```text
asset_id:
guardian-model

type:
MODEL

path:
assets/models/guardian.glb
```

---

# 100. Scene Preset

Una escena puede tener un preset:

```json
{
  "scene_id": "vault",
  "lighting": "torchlight",
  "fog": "light",
  "music": "tension",
  "camera": "overview"
}
```

---

# 101. Scene Preset Activation

Al cargar:

```text
Scene
 ↓
Preset
 ↓
Runtime
```

---

# 102. Override

El DM puede modificar:

```text
Scene preset
```

sin modificar el preset original.

---

# 103. Session Overrides

Ejemplo:

```text
Default:
Fog = Light

Current Session:
Fog = Heavy
```

---

# 104. Reset Overrides

Debe existir:

```text
RESET SCENE OVERRIDES
```

---

# 105. Hotkeys

Debe existir soporte para atajos.

Ejemplo:

```text
F1 = Pause
F2 = Blackout
F3 = Combat Music
F4 = Scene Menu
F5 = Previous Scene
F6 = Next Scene
```

Las teclas deben ser configurables.

---

# 106. Hotkey Safety

No asignar acciones destructivas por defecto.

---

# 107. Mobile / Tablet Future

El Controller podría utilizarse desde:

```text
Desktop
Laptop
Tablet
Phone
```

pero el MVP puede centrarse en Desktop.

---

# 108. Multi-screen Setup

Una configuración ideal:

```text
SCREEN 1:
DM Controller

SCREEN 2:
Player Runtime
```

---

# 109. Player Display

El jugador no debe ver:

```text
DM Notes
Pending Events
Hidden NPCs
Secrets
Debug Data
```

---

# 110. DM Preview

El DM puede observar:

```text
PLAYER VIEW
```

sin necesidad de cambiar el monitor principal.

---

# 111. Player View

Debe existir una vista limpia:

```text
Runtime
```

sin controles administrativos.

---

# 112. DM Controller and Session System

```text
DM Controller
      │
      ├── startSession()
      ├── pauseSession()
      ├── changeScene()
      ├── addEvent()
      └── endSession()
              │
              ▼
       Session System
```

---

# 113. DM Controller and Event System

```text
DM Action
    ↓
Command
    ↓
Event System
    ↓
Event
```

---

# 114. DM Controller and World State

El Controller nunca debe ejecutar:

```text
UPDATE world_state
```

directamente.

Debe:

```text
CREATE / APPROVE EVENT
```

y permitir que el sistema correspondiente aplique el cambio.

---

# 115. Example

DM pulsa:

```text
"Guardian defeated"
```

Flujo:

```text
Button
 ↓
CREATE_EVENT
 ↓
Session Event
 ↓
DM Approval
 ↓
Canon Event
 ↓
World State
```

---

# 116. Controller State

Debe mantener únicamente estado operativo:

```text
selected_scene
selected_character
preview_state
active_macro
runtime_connection
ui_preferences
```

---

# 117. Persistent UI Preferences

Puede almacenar:

```text
Panel sizes
Hotkeys
Favorite scenes
Favorite sounds
Layout
```

---

# 118. UI Preferences Are Not Campaign State

No deben mezclarse con:

```text
World State
Session State
Lore
Canon
```

---

# 119. Favorites

El DM puede marcar:

```text
Favorite Scene
Favorite Audio
Favorite VFX
Favorite Macro
```

---

# 120. Search

La búsqueda global debería encontrar:

```text
Scenes
Characters
NPCs
Audio
Videos
VFX
Macros
Events
Notes
```

---

# 121. Command Palette

A futuro:

```text
Ctrl + K
```

abre:

```text
Search / Execute Command
```

Ejemplo:

```text
> change scene vault
> play combat music
> focus ardan
> blackout
> spawn guardian
```

---

# 122. Voice Command Future

A futuro:

```text
DM:
"Poné la música de combate."
```

podría convertirse en:

```json
{
  "type": "PLAY_AUDIO",
  "payload": {
    "tag": "combat"
  }
}
```

---

# 123. Voice Confirmation

Para acciones importantes:

```text
DM:
"El guardián muere."

System:
"¿Confirmar evento?"
```

---

# 124. Automation

El Controller puede ejecutar automatizaciones:

```text
On Scene Loaded
On Combat Start
On Combat End
On Event Approved
```

---

# 125. Automation Example

```text
ON COMBAT_START

→ Change music
→ Change lighting
→ Enable combat UI
→ Trigger camera preset
```

---

# 126. Automation Safety

Las automatizaciones no deben alterar el canon salvo que una regla explícita lo permita.

---

# 127. DM Override

El DM siempre debe poder detener:

```text
Automation
Macro
Video
Audio
Scene Transition
```

---

# 128. Undo

Debe existir soporte para:

```text
UNDO
```

al menos para acciones operativas.

---

# 129. Undo Scope

Ejemplo:

```text
Play Audio
→ Undo = Stop Audio
```

Pero:

```text
Canon Event
```

debe utilizar el sistema de correcciones definido por Event System.

---

# 130. Command History

Debe existir:

```text
Recent Commands
```

Ejemplo:

```text
21:42 CHANGE_SCENE
21:43 PLAY_AUDIO
21:45 SPAWN_NPC
21:46 CAMERA_FOCUS
```

---

# 131. Logging

Registrar:

```text
Command
Source
Timestamp
Result
Error
```

---

# 132. Local Logs

Ejemplo:

```text
logs/
├── controller.log
├── runtime.log
└── session.log
```

---

# 133. Error Handling

Nunca debe ocurrir:

```text
Unhandled exception
→
Whole session lost
```

---

# 134. Failure Isolation

Un fallo en:

```text
Audio
```

no debe detener:

```text
Scene
Session
Events
```

---

# 135. Failure Isolation Matrix

```text
Component       Session Continues?

Audio            YES
Video            YES
3D Renderer      YES
2D Renderer      YES
AI               YES
TTS              YES
Controller UI    RECOVERY REQUIRED
SQLite           RECOVERY REQUIRED
```

---

# 136. Performance

El Controller debe responder rápidamente.

Objetivo conceptual:

```text
UI interaction → command
< 100 ms
```

cuando la acción no depende de una operación pesada.

---

# 137. Heavy Operations

Operaciones como:

```text
Load 3D Scene
Generate Asset
Generate Video
TTS
AI Request
```

pueden tardar más y deben mostrar progreso.

---

# 138. Progress Indicator

Ejemplo:

```text
Loading Scene...

████████████░░░ 80%
```

---

# 139. Background Operations

No bloquear la interfaz mientras se ejecuta:

```text
Asset Loading
Audio Loading
AI Processing
TTS
```

---

# 140. Local Resource Management

El Controller debe poder mostrar:

```text
Memory
Loaded Assets
Current Scene Size
```

solo como información opcional.

---

# 141. MVP

El MVP debe incluir:

```text
Session Status
Current Scene
Scene Switching
Character List
NPC List
Basic Character Placement
Audio Controls
Basic Video Controls
Lighting Presets
Basic VFX
DM Notes
Event Creation
Event Approval
Quick Actions
Runtime Connection
Emergency Stop
Autosave Trigger
```

---

# 142. MVP UI

La interfaz mínima:

```text
┌──────────────────────────────────────┐
│ SESSION STATUS                       │
├──────────────────────────────────────┤
│ CURRENT SCENE                        │
├──────────────────────────────────────┤
│ SCENES                               │
├──────────────────────────────────────┤
│ CHARACTERS                           │
├──────────────────────────────────────┤
│ QUICK ACTIONS                        │
├──────────────────────────────────────┤
│ AUDIO                                │
├──────────────────────────────────────┤
│ EVENTS                               │
├──────────────────────────────────────┤
│ NOTES                                │
└──────────────────────────────────────┘
```

---

# 143. Phase 2

Agregar:

```text
Camera System
Fog of War
Macros
Advanced Lighting
VFX Timeline
Video Overlays
Scene Presets
Command Palette
Hotkeys
```

---

# 144. Phase 3

Agregar:

```text
Voice Commands
Automatic Event Detection
AI Scene Suggestions
Automatic Macro Generation
Advanced Runtime Integration
```

---

# 145. Future

```text
Multi-device Controller
Remote Players
Collaborative DM
Cloud Sync
Advanced AI Director
Automatic Cinematic Direction
```

---

# 146. Non-Goals

El DM Controller no será:

```text
A VTT replacement
A complete RPG rules engine
A character sheet application
A campaign database
An AI Dungeon Master
```

Puede integrarse con esas funciones posteriormente.

---

# 147. Core UX Principle

Durante una party el DM debe pensar:

```text
"What should the players see/hear next?"
```

y no:

```text
"Which technical system do I need to manipulate?"
```

---

# 148. Example Party Flow

El DM dice:

> "Abren lentamente la puerta de la bóveda."

En Controller:

```text
[ VAULT DOOR OPEN ]
```

La macro ejecuta:

```text
Camera → Door
Lighting → Dark
Audio → Metal Door
VFX → Dust
Animation → Door Open
```

El runtime ejecuta las acciones.

Después:

```text
Event Proposal:
Vault Door Opened
```

El DM confirma:

```text
[ APPROVE ]
```

El Event System registra el acontecimiento.

El World State se actualiza.

---

# 149. Example Boss Entrance

El DM pulsa:

```text
BOSS ENTRANCE
```

El Controller:

```text
1. Fade Music
2. Camera Focus
3. Dim Lights
4. Play Roar
5. Spawn Boss
6. Trigger Smoke
7. Start Boss Music
8. Return Camera
```

Todo esto es presentación.

El hecho narrativo:

```text
Boss appeared
```

debe registrarse por el sistema de eventos si corresponde.

---

# 150. Example Scene Change

DM:

```text
CHANGE SCENE
→ Ancient Cavern
→ Cinematic Fade
```

Controller:

```text
Command
 ↓
Session System
 ↓
Runtime
```

Runtime:

```text
Unload Vault
Load Cavern
Apply Environment
Apply Camera
```

---

# 151. Final Architecture

```text
                         ┌─────────────┐
                         │     DM      │
                         └──────┬──────┘
                                │
                                ▼
                     ┌───────────────────┐
                     │   DM CONTROLLER   │
                     └─────────┬─────────┘
                               │
                     ┌─────────┴─────────┐
                     │                   │
                     ▼                   ▼
                COMMAND BUS        VIEW STATE
                     │
          ┌──────────┼───────────┐
          │          │           │
          ▼          ▼           ▼
      SESSION      EVENTS      RUNTIME
       SYSTEM      SYSTEM       ADAPTER
          │          │           │
          ▼          ▼           ▼
     WORLD STATE    CANON      3D/2D
                              AUDIO
                              VIDEO
                              VFX
```

---

# 152. Final Principle

El DM Controller debe ser el equivalente a una **cabina de dirección
cinematográfica para una mesa de rol**.

El DM decide qué sucede.

El Controller decide cómo expresar esa decisión técnicamente.

El Session System registra lo sucedido.

El Event System determina cómo se convierte en acontecimientos.

El World State conserva la verdad persistente de la campaña.

El Runtime representa visual y sonoramente esa verdad.

La separación debe mantenerse incluso cuando posteriormente se incorporen
agentes de IA, reconocimiento de voz, generación automática de escenarios,
TTS y automatizaciones avanzadas.
