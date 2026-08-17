# RENDERER.md

> Especificación del sistema de renderizado y representación visual del
> RPG World Engine.
>
> El Renderer transforma el estado actual de una sesión en una experiencia
> visual, sonora y cinematográfica para los jugadores.
>
> El Renderer NO es la fuente de verdad de la campaña.
> El Renderer NO decide la narrativa.
> El Renderer NO modifica directamente el canon.

---

# 1. Propósito

El Renderer es la capa responsable de representar el mundo de juego.

Debe poder representar:

- escenarios 3D;
- escenarios 2D;
- escenarios 2.5D;
- personajes;
- NPCs;
- objetos;
- iluminación;
- cámara;
- partículas;
- efectos visuales;
- audio;
- música;
- efectos de sonido;
- voz;
- videos;
- overlays;
- transiciones;
- elementos cinematográficos.

---

# 2. Principio Fundamental

El Renderer representa estado.

No crea autoridad narrativa.

La arquitectura debe seguir:

```text
CAMPAIGN
    ↓
CANON / MEMORY
    ↓
WORLD STATE
    ↓
SESSION
    ↓
DM CONTROL
    ↓
RENDERER
    ↓
PLAYER EXPERIENCE
```

El flujo inverso no debe utilizarse para modificar directamente el canon.

---

# 3. Responsabilidades

El Renderer es responsable de:

- inicializar el motor gráfico;
- cargar recursos;
- cargar escenas;
- representar entidades;
- actualizar transformaciones;
- controlar cámaras;
- representar iluminación;
- reproducir audio;
- reproducir video;
- ejecutar VFX;
- ejecutar transiciones;
- mostrar overlays;
- sincronizar la representación con el estado recibido;
- manejar errores visuales;
- mantener una representación consistente del estado.

---

# 4. No Responsabilidades

El Renderer NO debe:

- interpretar el lore;
- decidir qué eventos son canon;
- generar consecuencias narrativas;
- modificar personajes permanentemente;
- decidir resultados de tiradas;
- decidir acciones de NPCs;
- interpretar las intenciones del DM;
- almacenar el historial narrativo como fuente primaria;
- depender de una API de IA para funcionar.

---

# 5. Arquitectura

```text
┌─────────────────────────────┐
│        WORLD STATE          │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│        SESSION SYSTEM       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│          DM CONTROL         │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      RENDERER INTERFACE     │
└──────────────┬──────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ SCENE LAYER │  │ ENTITY LAYER│
└─────────────┘  └─────────────┘
       │                │
       └───────┬────────┘
               ↓
┌─────────────────────────────┐
│       PRESENTATION          │
├─────────────────────────────┤
│ Camera                      │
│ Lighting                    │
│ VFX                         │
│ Audio                       │
│ Video                       │
│ UI / Overlay                │
│ Transitions                 │
└─────────────────────────────┘
```

---

# 6. Renderer State

El Renderer mantiene únicamente el estado necesario para representar
la sesión.

Ejemplo:

```json
{
  "status": "running",
  "scene_id": "ancient-vault",
  "camera_id": "default",
  "entities": {},
  "lighting": {},
  "audio": {},
  "effects": {}
}
```

Este estado no reemplaza al `WORLD STATE`.

---

# 7. Renderer States

Estados mínimos:

```text
STARTING
LOADING
READY
RUNNING
PAUSED
ERROR
STOPPING
STOPPED
```

---

# 8. Initialization

Flujo:

```text
START
 ↓
LOAD CONFIG
 ↓
INITIALIZE ENGINE
 ↓
INITIALIZE RENDERER
 ↓
CONNECT SESSION
 ↓
LOAD INITIAL STATE
 ↓
LOAD INITIAL SCENE
 ↓
READY
```

---

# 9. Shutdown

```text
STOP
 ↓
STOP ACTIVE EFFECTS
 ↓
STOP AUDIO
 ↓
STOP VIDEO
 ↓
RELEASE RESOURCES
 ↓
DISCONNECT SESSION
 ↓
SHUTDOWN ENGINE
```

---

# 10. Local First

El Renderer debe funcionar inicialmente de manera completamente local.

No debe requerir:

- cloud rendering;
- servidores externos;
- APIs pagas;
- conexión permanente a Internet;
- servicios de IA;
- almacenamiento remoto.

---

# 11. Engine Abstraction

La arquitectura debe evitar acoplar la lógica del proyecto directamente
al motor gráfico.

Conceptualmente:

```text
GAME / RUNTIME LOGIC
        ↓
RENDERER INTERFACE
        ↓
ENGINE ADAPTER
        ↓
GRAPHICS ENGINE
```

Esto permite reemplazar el motor en el futuro.

---

# 12. Renderer Interface

El sistema debe exponer operaciones conceptuales como:

```text
loadScene()
unloadScene()

spawnEntity()
removeEntity()
updateEntity()

setCamera()
focusEntity()

setLighting()
setEnvironment()

playAudio()
stopAudio()

playVideo()
stopVideo()

playEffect()

showOverlay()
hideOverlay()

transition()
```

Los nombres definitivos dependen de la implementación.

---

# 13. Command Driven

El Renderer debe poder responder a comandos.

Ejemplo:

```json
{
  "id": "cmd-001",
  "type": "SCENE_LOAD",
  "payload": {
    "scene_id": "ancient-vault"
  }
}
```

---

# 14. Command Lifecycle

```text
RECEIVED
 ↓
VALIDATED
 ↓
ACCEPTED
 ↓
EXECUTING
 ↓
COMPLETED
```

En caso de error:

```text
EXECUTING
 ↓
FAILED
```

---

# 15. Command Categories

```text
SCENE
ENTITY
CAMERA
LIGHTING
AUDIO
VIDEO
VFX
OVERLAY
TRANSITION
SYSTEM
```

---

# 16. Renderer Events

El Renderer puede emitir eventos técnicos.

Ejemplos:

```text
SCENE_LOADING
SCENE_LOADED
SCENE_LOAD_FAILED

ENTITY_SPAWNED
ENTITY_REMOVED
ENTITY_MOVED

VIDEO_STARTED
VIDEO_FINISHED

AUDIO_STARTED
AUDIO_FINISHED

EFFECT_STARTED
EFFECT_FINISHED

RENDERER_ERROR
```

---

# 17. Runtime Events vs Narrative Events

Debe mantenerse una separación estricta.

Ejemplo:

```text
VIDEO_FINISHED
```

es un evento técnico.

Mientras:

```text
El guardián fue derrotado.
```

es un evento narrativo.

El primero no implica automáticamente el segundo.

---

# 18. Scene Representation

El Renderer debe poder representar:

```text
2D
2.5D
3D
HYBRID
VIDEO
CINEMATIC
```

La definición detallada de las escenas pertenece a `SESSION-SYSTEM.md`.

---

# 19. 2D Rendering

Una escena 2D puede utilizar:

- imágenes;
- ilustraciones;
- mapas;
- fondos;
- overlays;
- sprites.

---

# 20. 2.5D Rendering

Una escena 2.5D combina elementos 2D con profundidad simulada.

Ejemplo:

```text
Background
    +
Midground
    +
Foreground
    +
Depth
    +
Camera Movement
    +
Lighting
```

---

# 21. 3D Rendering

Una escena 3D puede contener:

```text
Environment
Terrain
Buildings
Objects
Characters
NPCs
Lighting
Particles
Camera
```

---

# 22. Hybrid Rendering

La arquitectura debe permitir mezclar tecnologías.

Ejemplo:

```text
3D Floor
+
3D Characters
+
2D Background
+
2D UI
+
Video Overlay
+
Particles
```

---

# 23. Image-Based Environments

El sistema debe permitir utilizar imágenes proporcionadas por el DM como
parte de una escena.

La imagen puede utilizarse directamente:

```text
2D Background
```

o transformarse mediante procesos externos en:

```text
2.5D Environment
```

o:

```text
3D Environment
```

---

# 24. Image-to-Scene Pipeline

La conversión de una imagen en un entorno no pertenece directamente
al Renderer.

El flujo recomendado es:

```text
DM IMAGE
    ↓
AI / ASSET PIPELINE
    ↓
SCENE PROPOSAL
    ↓
VALIDATION
    ↓
SCENE ASSET
    ↓
RENDERER
```

---

# 25. Important Constraint

No debe asumirse que toda imagen 2D puede convertirse automáticamente
en un entorno 3D perfecto.

El sistema debe permitir seleccionar:

```text
2D
2.5D
3D
```

según la disponibilidad y calidad de los assets.

---

# 26. Scene Loading

El Renderer debe soportar carga progresiva.

```text
LOAD SCENE
 ↓
LOAD REQUIRED ASSETS
 ↓
CREATE ENVIRONMENT
 ↓
CREATE ENTITIES
 ↓
APPLY LIGHTING
 ↓
APPLY AUDIO
 ↓
READY
```

---

# 27. Loading Screen

Mientras se carga una escena puede mostrarse:

```text
--------------------------------

         ANCIENT VAULT

       Loading scene...

██████████████░░░░░░ 72%

      Preparing environment

--------------------------------
```

---

# 28. Asset Registry

Todos los assets deben utilizar identificadores.

Ejemplo:

```json
{
  "asset_id": "guardian-miniature",
  "type": "model",
  "format": "glb"
}
```

---

# 29. Asset Categories

```text
CHARACTERS
NPCS
ENVIRONMENTS
OBJECTS
TEXTURES
MATERIALS
AUDIO
VIDEO
VFX
UI
```

---

# 30. Asset Cache

El Renderer puede mantener en memoria assets reutilizados frecuentemente.

Ejemplos:

```text
Player Characters
Common NPCs
Common Props
UI
Common VFX
```

Esto evita cargas innecesarias.

---

# 31. Placeholder System

Si falta un asset:

```text
MISSING ASSET
 ↓
PLACEHOLDER
```

La escena debe continuar funcionando cuando sea posible.

Ejemplo:

```text
┌──────────────┐
│ UNKNOWN NPC  │
└──────────────┘
```

---

# 32. Character Rendering

La definición narrativa y funcional de personajes pertenece a
`DOMAIN.md` y `DATA-MODEL.md`.

El Renderer solamente representa su estado visual.

Puede representar:

```text
Token
Miniature
Stylized Figure
Animated Character
Cinematic Character
```

---

# 33. Miniature Representation

El MVP puede utilizar una representación similar a una miniatura
de juego de mesa.

Conceptualmente:

```text
       CHARACTER
          ▲
          │
       FIGURE
          │
      ┌───────┐
      │ BASE  │
      └───────┘
```

Esto reduce significativamente:

- complejidad;
- cantidad de polígonos;
- coste de producción;
- requerimientos de animación.

---

# 34. Representation Levels

El Renderer debe permitir evolucionar progresivamente:

```text
LEVEL 1
Token

LEVEL 2
Miniature

LEVEL 3
Animated Figure

LEVEL 4
Detailed Character

LEVEL 5
Cinematic Character
```

El proyecto no necesita comenzar en el nivel 4 o 5.

---

# 35. Entity Rendering

Una entidad visual debe tener como mínimo:

```text
entity_id
asset_id
position
rotation
scale
visibility
```

Ejemplo:

```json
{
  "entity_id": "character-ardan",
  "asset_id": "ardan-miniature",
  "position": [4, 0, 7],
  "rotation": 90,
  "scale": 1,
  "visible": true
}
```

---

# 36. Entity Visibility

Estados:

```text
VISIBLE
HIDDEN
FADED
DISABLED
```

---

# 37. Entity Focus

El Renderer debe poder destacar una entidad.

Ejemplo:

```text
FOCUS_ENTITY
```

Puede producir:

- cambio de cámara;
- iluminación;
- outline;
- zoom;
- reducción de ruido visual.

---

# 38. Camera System

La cámara es una capa independiente de las entidades.

Modos iniciales:

```text
TOP_DOWN
ISOMETRIC
FREE
FOLLOW
FOCUS
CINEMATIC
```

---

# 39. Camera Presets

Ejemplo:

```json
{
  "camera_id": "boss-focus",
  "mode": "FOCUS",
  "target": "boss-001"
}
```

---

# 40. Camera Transitions

Debe soportar:

```text
CUT
PAN
ZOOM
DOLLY
FADE
```

---

# 41. Cinematic Camera

A futuro:

```text
CAMERA PATH
+
TARGET
+
DURATION
+
EASING
```

Esto permite crear pequeñas escenas cinematográficas sin necesidad
de un sistema cinematográfico completo.

---

# 42. Lighting

El Renderer debe controlar:

```text
Ambient Light
Directional Light
Point Light
Spot Light
Fog
Shadows
```

---

# 43. Lighting Presets

Ejemplos:

```text
DAY
NIGHT
DUNGEON
TORCH
MOONLIGHT
HORROR
MAGICAL
COMBAT
```

---

# 44. Environment Effects

Puede representar:

```text
RAIN
SNOW
FOG
DUST
ASH
SMOKE
WIND
```

---

# 45. Particle Effects

Ejemplos:

```text
FIRE
SMOKE
DUST
RAIN
SNOW
SPARKS
MAGIC
EXPLOSION
```

Los VFX complejos pueden agregarse posteriormente.

---

# 46. Audio Rendering

El sistema debe separar:

```text
MUSIC
AMBIENCE
SFX
VOICE
```

---

# 47. Audio Channels

```text
MASTER
MUSIC
AMBIENCE
SFX
VOICE
```

---

# 48. Music Transitions

Debe soportar:

```text
PLAY
STOP
FADE IN
FADE OUT
CROSSFADE
```

---

# 49. Audio Ducking

Durante una narración o diálogo:

```text
VOICE
 ↓
Music Volume ↓
Ambience Volume ↓
```

Al finalizar:

```text
VOICE END
 ↓
Restore Volume
```

---

# 50. Video Rendering

El Renderer puede mostrar videos en diferentes capas.

```text
BACKGROUND
FULLSCREEN
OVERLAY
WORLD SCREEN
PORTAL
```

---

# 51. Video States

```text
IDLE
LOADING
PLAYING
PAUSED
FINISHED
ERROR
```

---

# 52. Video Failure

Si el video falla:

```text
VIDEO ERROR
 ↓
FALLBACK IMAGE
```

La sesión no debe bloquearse.

---

# 53. Overlay System

Puede mostrar:

```text
TEXT
IMAGE
VIDEO
PORTRAIT
LOCATION
CHAPTER
DIALOGUE
MAP
```

---

# 54. Overlay Layers

```text
BACKGROUND
WORLD
CHARACTERS
VFX
VIDEO
UI
```

---

# 55. Transitions

El Renderer debe centralizar las transiciones.

Ejemplos:

```text
FADE
DISSOLVE
CUT
FLASH
BLUR
BLACKOUT
```

---

# 56. Scene Transition

Ejemplo:

```text
FADE OUT
 ↓
UNLOAD CURRENT SCENE
 ↓
LOAD NEW SCENE
 ↓
SPAWN ENTITIES
 ↓
FADE IN
```

---

# 57. Narrative Separation

Una transición visual no significa necesariamente que haya ocurrido
un evento narrativo.

Ejemplo:

```text
FADE TO BLACK
```

no significa:

```text
TIME PASSED
```

a menos que el sistema narrativo lo determine.

---

# 58. Player View

La vista de jugadores debe ser:

```text
FULLSCREEN
CLEAN
IMMERSIVE
LOW UI
```

---

# 59. Hidden DM Data

El Renderer nunca debe mostrar información exclusiva del DM.

No debe mostrar:

```text
DM NOTES
HIDDEN NPC STATE
SECRET EVENTS
INTERNAL IDs
FUTURE EVENTS
UNREVEALED LORE
DEBUG DATA
```

---

# 60. Multiple Display Support

A futuro se contempla:

```text
DISPLAY 1
DM CONTROL

DISPLAY 2
PLAYER RENDERER
```

---

# 61. Local Communication

El Renderer debe poder comunicarse con el DM Controller mediante
un mecanismo local.

Opciones posibles:

```text
WebSocket
HTTP Local
IPC
Named Pipes
```

La implementación definitiva se determina en `ARCHITECTURE.md`.

---

# 62. Connection State

```text
CONNECTED
DISCONNECTED
RECONNECTING
```

---

# 63. Disconnect Behavior

Si se pierde la conexión:

```text
Current Scene
+
Current Visual State
```

debe permanecer visible.

No debe cerrarse inmediatamente.

---

# 64. Reconnection

```text
DISCONNECTED
 ↓
RECONNECTING
 ↓
SYNC STATE
 ↓
CONNECTED
```

---

# 65. State Synchronization

Al reconectarse:

```text
CURRENT SESSION STATE
        ↓
RENDERER
        ↓
COMPARE
        ↓
APPLY DIFFERENCES
```

No debería ser necesario reconstruir todo si no hace falta.

---

# 66. Renderer Determinism

Siempre que sea posible:

```text
same state
+
same assets
+
same configuration
=
same visual result
```

Esto facilita:

- debugging;
- testing;
- recuperación;
- reproducción.

---

# 67. Replay Support

A futuro el Renderer puede reproducir una secuencia de comandos.

Ejemplo:

```text
21:01 LOAD_SCENE
21:03 SPAWN_CHARACTER
21:05 PLAY_MUSIC
21:08 MOVE_ENTITY
21:10 CHANGE_LIGHTING
```

Esto permite crear:

- debugging;
- pruebas;
- demos;
- trailers;
- reproducciones de sesiones.

---

# 68. Offline Requirement

El Renderer debe poder funcionar sin Internet después de tener
disponibles sus assets locales.

Una party no debe depender de:

```text
Internet
Cloud
External API
AI Service
```

para representar una escena previamente preparada.

---

# 69. AI Integration

La IA puede preparar assets y configuraciones.

No debe controlar directamente el Renderer.

Correcto:

```text
AI
 ↓
SCENE PROPOSAL
 ↓
VALIDATION
 ↓
DM APPROVAL
 ↓
RENDERER
```

Incorrecto:

```text
AI
 ↓
DIRECT ENGINE MUTATION
```

---

# 70. AI Generated Assets

La IA puede ayudar a generar:

- conceptos visuales;
- fondos;
- texturas;
- mapas;
- modelos;
- animaciones;
- VFX;
- sonidos;
- música;
- configuraciones de escena.

Pero el Renderer solamente consume el resultado validado.

---

# 71. Asset Preparation

Los assets generados deben pasar por:

```text
GENERATE
 ↓
VALIDATE
 ↓
OPTIMIZE
 ↓
REGISTER
 ↓
CACHE
 ↓
RENDER
```

---

# 72. Runtime Does Not Generate Heavy Assets

Durante una party se debe evitar generar assets pesados en tiempo real.

Preferido:

```text
BEFORE PARTY
    ↓
AI / TOOLS
    ↓
ASSETS READY
    ↓
PARTY
    ↓
LOCAL RENDER
```

---

# 73. Cost Optimization

La arquitectura debe priorizar:

```text
LOCAL RENDERING
LOCAL ASSETS
ASSET REUSE
CACHING
LOW-POLY MODELS
2D / 2.5D WHEN POSSIBLE
PROCEDURAL ELEMENTS
OPEN SOURCE TOOLS
```

---

# 74. Visual Complexity Strategy

No todas las escenas necesitan 3D completo.

Ejemplo:

```text
Cinematic Intro
    → Video

World Map
    → 2D

Town
    → 2.5D

Dungeon
    → 3D

Character Sheet
    → 2D

Combat
    → 3D / 2.5D
```

---

# 75. Adaptive Representation

La representación debe elegirse según:

```text
Importance
+
Available Assets
+
Performance
+
Narrative Purpose
```

---

# 76. Example

Una descripción:

> "El grupo entra a una enorme bóveda antigua."

Puede representarse como:

```text
OPTION A
3D Vault
```

o:

```text
OPTION B
2.5D Background
+
3D Characters
+
Fog
+
Torch Lighting
+
Ambient Audio
```

o:

```text
OPTION C
Illustration
+
Camera Zoom
+
Sound
+
Particles
```

Las tres opciones pueden producir una experiencia válida.

---

# 77. Renderer Does Not Require AAA Assets

El sistema debe priorizar:

```text
Cohesion
+
Atmosphere
+
Lighting
+
Sound
+
Camera
```

sobre:

```text
Polygon Count
+
Photorealism
```

---

# 78. Visual Consistency

Los assets deberían mantener:

- estilo;
- escala;
- iluminación;
- proporciones;
- dirección artística.

Esto es especialmente importante cuando los assets son generados por
diferentes agentes o herramientas.

---

# 79. Asset Metadata

Cada asset debería disponer de metadata básica:

```json
{
  "asset_id": "ancient-door",
  "type": "prop",
  "style": "dark-fantasy",
  "scale": 1,
  "version": 1
}
```

---

# 80. Versioning

Los assets deben poder versionarse.

Ejemplo:

```text
ancient-door@v1
ancient-door@v2
```

Una escena existente no debería romperse automáticamente porque se
actualizó un asset.

---

# 81. Scene Compatibility

Una escena debe registrar las versiones necesarias de sus assets cuando
sea necesario para garantizar reproducibilidad.

---

# 82. Error Handling

Errores posibles:

```text
ENGINE_ERROR
ASSET_ERROR
SCENE_ERROR
AUDIO_ERROR
VIDEO_ERROR
CONNECTION_ERROR
MEMORY_ERROR
```

---

# 83. Recoverable Errors

Ejemplo:

```text
Missing VFX
```

Debe permitir:

```text
SKIP
RETRY
FALLBACK
```

---

# 84. Fatal Errors

Si el motor no puede inicializarse:

```text
ENGINE INITIALIZATION FAILED
```

El Renderer debe:

1. registrar el error;
2. informar al Controller;
3. mostrar diagnóstico;
4. evitar corrupción del estado de sesión.

---

# 85. Debug Mode

Debe existir un modo para desarrollo.

Puede mostrar:

```text
FPS
MEMORY
ENTITY COUNT
SCENE
CAMERA
ASSET COUNT
COMMANDS
ERRORS
```

---

# 86. Debug Isolation

El modo debug no debe activarse accidentalmente durante una party.

---

# 87. Logging

Registrar como mínimo:

```text
STARTUP
SHUTDOWN
SCENE_LOAD
SCENE_ERROR
ASSET_LOAD
ASSET_ERROR
COMMAND
CONNECTION
RENDERER_ERROR
PERFORMANCE_WARNING
```

---

# 88. Resolution

El Renderer debe adaptarse como mínimo a:

```text
1920x1080
2560x1440
3840x2160
```

sin depender de una resolución fija.

---

# 89. Window Modes

Debe contemplar:

```text
WINDOWED
BORDERLESS
FULLSCREEN
```

---

# 90. Hardware Profiles

Se recomienda soportar perfiles:

```text
LOW
MEDIUM
HIGH
```

La implementación concreta pertenece a `PERFORMANCE.md`.

---

# 91. Future Advanced Rendering

No forma parte del MVP, pero la arquitectura debe permitir posteriormente:

```text
Dynamic Shadows
Post Processing
Volumetric Fog
Advanced Particles
Real-Time Lighting
Cinematic Rendering
Depth of Field
Screen Space Effects
```

---

# 92. Future Multi-Device

A futuro podría existir:

```text
DM COMPUTER
      ↓
LOCAL NETWORK
      ↓
PLAYER SCREEN
```

o:

```text
DM COMPUTER
      ↓
PROJECTOR / TV
```

---

# 93. Future Physical Table

Una posible evolución:

```text
DM CONTROL
     ↓
RENDERER
     ↓
TABLE DISPLAY
```

El Renderer podría convertirse en una mesa digital de rol.

---

# 94. MVP Definition

El Renderer MVP debe poder:

```text
[ ] iniciar localmente
[ ] cargar una escena
[ ] representar una escena 2D
[ ] representar una escena 3D básica
[ ] representar una escena híbrida
[ ] cargar personajes
[ ] cargar NPCs
[ ] mover entidades
[ ] cambiar cámara
[ ] cambiar iluminación
[ ] reproducir música
[ ] reproducir SFX
[ ] reproducir video
[ ] ejecutar VFX básicos
[ ] mostrar overlays
[ ] ejecutar transiciones
[ ] recibir comandos
[ ] informar eventos
[ ] manejar assets faltantes
[ ] reconectarse
[ ] funcionar offline
```

---

# 95. MVP Priority

Prioridad:

```text
1. Stability
2. Correct State Representation
3. Responsiveness
4. Performance
5. Visual Quality
```

---

# 96. Core Design Rule

El Renderer debe seguir:

```text
STATE IN
    ↓
RENDER
    ↓
VISUAL OUTPUT
```

No:

```text
VISUAL OUTPUT
    ↓
NARRATIVE DECISION
```

---

# 97. Final Principle

El Renderer es la capa que convierte el mundo narrativo en una experiencia
perceptible.

```text
LORE
 ↓
WORLD
 ↓
SESSION
 ↓
DM
 ↓
COMMAND
 ↓
RENDERER
 ↓
IMAGE + MOTION + SOUND + VIDEO
 ↓
PLAYER EXPERIENCE
```

El Renderer debe permanecer desacoplado de la lógica narrativa para poder
evolucionar desde una implementación local sencilla hasta una plataforma
de representación audiovisual avanzada sin tener que reconstruir el núcleo
del proyecto.
