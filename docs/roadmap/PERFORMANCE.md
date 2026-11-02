# PERFORMANCE.md

> Especificación de rendimiento, consumo de recursos y optimización del
> RPG World Engine.
>
> El proyecto prioriza una experiencia local, gratuita, estable y
> suficientemente liviana para ejecutarse en hardware convencional.
>
> El objetivo NO es alcanzar calidad AAA.
> El objetivo es obtener la mayor calidad narrativa y visual posible
> dentro de recursos razonables.

---

# 1. Objetivos

El sistema debe priorizar:

1. estabilidad;
2. fluidez;
3. tiempos de carga razonables;
4. bajo consumo de memoria;
5. bajo consumo de almacenamiento;
6. reutilización de assets;
7. funcionamiento offline;
8. ausencia de servicios pagos obligatorios;
9. escalabilidad progresiva.

---

# 2. Principio Fundamental

La complejidad visual debe ser proporcional a la importancia narrativa.

```text
IMPORTANCIA NARRATIVA
        +
RECURSOS DISPONIBLES
        +
CALIDAD VISUAL NECESARIA
        ↓
NIVEL DE REPRESENTACIÓN
```

No todas las escenas requieren el mismo nivel de detalle.

---

# 3. Performance Budget

Cada componente debe tener un presupuesto razonable.

Áreas principales:

```text
CPU
GPU
RAM
VRAM
STORAGE
NETWORK
LOAD TIME
AI COMPUTATION
```

---

# 4. Hardware Target

El MVP debe apuntar a hardware de consumo general.

Objetivo aproximado:

```text
CPU
4+ cores

RAM
8 GB mínimo
16 GB recomendado

GPU
GPU integrada o dedicada de gama media

Storage
SSD recomendado
```

Los requisitos definitivos dependerán del motor elegido.

---

# 5. Performance Profiles

Debe existir una configuración:

```text
LOW
MEDIUM
HIGH
```

Opcionalmente:

```text
ULTRA
```

pero no es prioridad.

---

# 6. LOW Profile

Debe priorizar estabilidad.

Puede reducir:

```text
Resolution
Shadows
Particles
Texture Quality
Post Processing
View Distance
Entity Detail
```

---

# 7. MEDIUM Profile

Configuración objetivo del sistema.

Debe proporcionar un equilibrio entre:

```text
Visual Quality
+
Performance
```

---

# 8. HIGH Profile

Puede habilitar:

```text
Higher Resolution
Better Shadows
More Particles
Higher Texture Quality
Additional Effects
```

---

# 9. Adaptive Quality

A futuro el sistema puede adaptar automáticamente la calidad.

```text
FPS LOW
   ↓
REDUCE QUALITY
   ↓
FPS STABLE
```

Si existe margen:

```text
FPS HIGH
   ↓
INCREASE QUALITY
```

No es obligatorio para el MVP.

---

# 10. Target FPS

Objetivo:

```text
60 FPS
```

Mínimo aceptable:

```text
30 FPS
```

El sistema debe priorizar estabilidad antes que alcanzar FPS máximos.

---

# 11. Frame Time

Objetivo aproximado para 60 FPS:

```text
16.67 ms / frame
```

La aplicación debe evitar picos prolongados.

---

# 12. Performance Metrics

Debe poder medirse:

```text
FPS
Frame Time
CPU Usage
GPU Usage
RAM Usage
VRAM Usage
Draw Calls
Triangle Count
Texture Memory
Asset Count
Scene Load Time
```

---

# 13. Performance Logging

Durante desarrollo deben registrarse métricas cuando sea necesario.

Ejemplo:

```text
Scene: ancient-vault

FPS: 58
Frame Time: 17.2 ms
CPU: 42%
GPU: 68%
RAM: 3.2 GB
VRAM: 1.4 GB
Entities: 24
Draw Calls: 412
```

---

# 14. No Premature Optimization

No optimizar componentes que:

- no representan un cuello de botella;
- no afectan la experiencia;
- no consumen recursos significativos.

Flujo:

```text
MEASURE
 ↓
IDENTIFY BOTTLENECK
 ↓
OPTIMIZE
 ↓
MEASURE AGAIN
```

---

# 15. Main Performance Risks

Riesgos esperados:

```text
High Polygon Assets
Large Textures
Too Many Entities
Too Many Lights
Particles
Video Decoding
Memory Usage
AI Processing
Asset Loading
```

---

# 16. Asset Reuse

La reutilización es una de las principales estrategias.

Ejemplo:

```text
1 Goblin Model
        ↓
10 Goblins
```

No:

```text
10 Unique Goblin Models
```

cuando no sea necesario.

---

# 17. Instancing

Cuando el motor lo permita, deben utilizarse instancias.

Ejemplo:

```text
TREE MODEL
   ├── Instance 1
   ├── Instance 2
   ├── Instance 3
   └── Instance 4
```

---

# 18. Level of Detail

Los modelos pueden utilizar distintos niveles:

```text
LOD 0
High Detail

LOD 1
Medium Detail

LOD 2
Low Detail

LOD 3
Very Low Detail
```

---

# 19. Distance-Based Detail

Ejemplo:

```text
PLAYER
 ↓
HIGH DETAIL

MID DISTANCE
 ↓
MEDIUM DETAIL

FAR
 ↓
LOW DETAIL
```

---

# 20. Character Optimization

Los personajes deben evitar complejidad innecesaria.

Para el MVP se recomienda:

```text
Low / Medium Poly
+
Simple Materials
+
Limited Animations
```

---

# 21. Miniature Strategy

La utilización de personajes tipo miniatura permite reducir:

```text
Polygon Count
Texture Size
Animation Complexity
Rig Complexity
Memory Usage
```

Esta estrategia es recomendada para el MVP.

---

# 22. Environment Optimization

Los escenarios deben reutilizar componentes.

Ejemplo:

```text
Dungeon Kit
├── Wall
├── Floor
├── Door
├── Torch
├── Column
├── Chest
└── Stairs
```

Con estos elementos pueden construirse múltiples escenarios.

---

# 23. Modular Environments

Debe priorizarse:

```text
MODULAR ASSETS
```

sobre:

```text
ONE GIANT UNIQUE MODEL
```

Esto facilita:

- reutilización;
- edición;
- generación;
- optimización;
- almacenamiento.

---

# 24. 2D / 2.5D Optimization

Una escena que no necesita interacción 3D completa debe poder
representarse mediante:

```text
2D
```

o:

```text
2.5D
```

Esto puede reducir considerablemente:

```text
GPU
RAM
STORAGE
CPU
```

---

# 25. Representation Decision

Regla recomendada:

```text
¿Necesita interacción espacial?
        │
       NO
        ↓
      2D / 2.5D

       YES
        ↓
      ¿Necesita profundidad real?
             │
            NO
             ↓
           2.5D

            YES
             ↓
             3D
```

---

# 26. Texture Budget

No utilizar texturas de resolución excesiva sin necesidad.

Preferir:

```text
512x512
1024x1024
2048x2048
```

según importancia.

Evitar utilizar:

```text
8192x8192
```

salvo casos específicos.

---

# 27. Texture Compression

Los formatos comprimidos deben utilizarse cuando el motor los soporte.

Objetivo:

```text
Reduce Storage
+
Reduce VRAM
```

---

# 28. Asset Formats

Preferir formatos modernos y eficientes.

Ejemplos:

```text
Models
GLB / GLTF

Images
WEBP / PNG / JPG

Audio
OGG / WAV

Video
WEBM / MP4
```

La elección definitiva dependerá del Renderer.

---

# 29. Asset Pipeline

Los assets deben pasar por:

```text
RAW ASSET
 ↓
VALIDATE
 ↓
OPTIMIZE
 ↓
COMPRESS
 ↓
REGISTER
 ↓
CACHE
```

---

# 30. Generated Asset Optimization

Los assets generados mediante IA no deben entrar directamente al
Renderer sin procesamiento.

Ejemplo:

```text
AI MODEL
 ↓
DECIMATE
 ↓
OPTIMIZE MATERIALS
 ↓
COMPRESS TEXTURES
 ↓
EXPORT
```

---

# 31. AI Asset Cost

La generación mediante IA debe ocurrir principalmente:

```text
BEFORE SESSION
```

y no:

```text
DURING SESSION
```

cuando sea posible.

---

# 32. Runtime AI

Durante una party la IA debe utilizarse principalmente para:

```text
Narrative Assistance
Command Interpretation
Recap
Context Retrieval
```

y no para generación pesada de assets.

---

# 33. Local AI

Siempre que sea viable:

```text
LOCAL MODEL
```

puede utilizarse para reducir:

```text
API COST
NETWORK DEPENDENCY
LATENCY
PRIVACY RISK
```

---

# 34. Optional AI

La aplicación debe continuar funcionando si la IA está deshabilitada.

```text
AI AVAILABLE
    ↓
ENHANCED EXPERIENCE

AI UNAVAILABLE
    ↓
CORE EXPERIENCE
```

---

# 35. Database Performance

La base de datos inicial debe ser local y liviana.

La opción inicial recomendada:

```text
SQLite
```

---

# 36. Database Principles

Evitar:

```text
Database Server
Cloud Database
External DB Service
```

durante el MVP.

---

# 37. Database Optimization

Debe evitarse almacenar información redundante.

Separar:

```text
STATIC DATA
```

de:

```text
SESSION DATA
```

y:

```text
NARRATIVE DATA
```

---

# 38. Asset Storage

Los assets grandes no deben almacenarse dentro de la base de datos
como blobs salvo que exista una razón concreta.

Preferir:

```text
DATABASE
    ↓
Metadata

FILESYSTEM
    ↓
Actual Assets
```

---

# 39. Cache Strategy

La aplicación puede utilizar:

```text
RAM Cache
Disk Cache
Asset Cache
Scene Cache
```

---

# 40. Memory Cache

Debe mantenerse en memoria únicamente lo necesario.

Ejemplo:

```text
Current Scene
+
Nearby Assets
+
Active Characters
+
Active Effects
```

---

# 41. Scene Unloading

Cuando una escena deja de utilizarse:

```text
CURRENT SCENE
      ↓
NEW SCENE
      ↓
UNLOAD UNUSED ASSETS
```

---

# 42. Previous Maps

Los mapas anteriores deben permanecer como datos históricos,
pero no necesariamente cargados en memoria.

```text
PAST MAP
 ↓
DATABASE / FILESYSTEM
```

No:

```text
RAM
```

salvo que se necesiten.

---

# 43. Campaign Size

La campaña puede crecer durante años.

El sistema debe permitir:

```text
Many Sessions
Many Characters
Many Maps
Many Events
Many Recaps
```

sin intentar cargar todo simultáneamente.

---

# 44. Context Loading

La IA tampoco debe leer todo el proyecto en cada consulta.

Debe utilizar:

```text
TARGETED CONTEXT
```

Ejemplo:

```text
Current Session
+
Current Scene
+
Relevant Characters
+
Relevant Lore
+
Recent Events
```

---

# 45. Context Hierarchy

Prioridad:

```text
1. Current Session
2. Current Scene
3. Active Characters
4. Recent Events
5. Relevant Lore
6. Historical Context
7. Entire Campaign
```

---

# 46. Markdown Context

Los archivos Markdown pueden utilizarse como documentación de
referencia humana y para agentes.

Sin embargo, no deben cargarse todos automáticamente.

Preferir:

```text
INDEX
 ↓
Relevant Document
 ↓
Relevant Section
```

---

# 47. Context Budget

Cada agente debe recibir solamente el contexto necesario para realizar
su tarea.

Ejemplo:

```text
SCENE AGENT
```

necesita:

```text
SCENES
+
CURRENT STATE
+
RELEVANT CHARACTERS
```

No necesariamente:

```text
SECURITY
+
ROADMAP
+
ALL HISTORY
```

---

# 48. Event Processing

Los eventos deben procesarse incrementalmente.

Evitar:

```text
LOAD ENTIRE EVENT HISTORY
 ↓
PROCESS EVERYTHING
```

Preferir:

```text
LAST KNOWN STATE
+
NEW EVENTS
 ↓
UPDATE STATE
```

---

# 49. Event Log

Los eventos históricos pueden permanecer almacenados.

Pero el runtime debe utilizar:

```text
STATE SNAPSHOT
+
RELEVANT EVENTS
```

---

# 50. Snapshots

Para campañas largas pueden utilizarse snapshots.

Ejemplo:

```text
SESSION 01
 ↓
EVENTS
 ↓
SNAPSHOT

SESSION 10
 ↓
EVENTS
 ↓
SNAPSHOT

SESSION 20
 ↓
EVENTS
 ↓
SNAPSHOT
```

---

# 51. Snapshot Purpose

Los snapshots permiten reducir el trabajo necesario para reconstruir
el estado de una campaña.

---

# 52. Network

El MVP debe funcionar sin red.

Si se utiliza red local:

```text
DM
 ↓
LOCAL NETWORK
 ↓
PLAYER CLIENT
```

No debe requerir Internet.

---

# 53. Network Payload

Los mensajes deben contener datos compactos.

Preferir:

```text
COMMAND
+
ID
+
PAYLOAD
```

sobre enviar escenas completas repetidamente.

---

# 54. Delta Updates

Cuando sea posible:

```text
OLD STATE
+
CHANGE
 ↓
NEW STATE
```

Ejemplo:

```json
{
  "entity_id": "ardan",
  "position": [5, 0, 8]
}
```

No reenviar toda la escena.

---

# 55. Network Frequency

No enviar actualizaciones innecesariamente frecuentes.

Por ejemplo, una posición narrativa puede actualizarse mediante
comandos discretos:

```text
MOVE_ENTITY
```

en lugar de enviar cada frame.

---

# 56. Renderer Independence

El Renderer debe poder ejecutar una escena aunque el Controller no
esté enviando continuamente comandos.

---

# 57. Startup Performance

Objetivo:

```text
APPLICATION START
 ↓
READY
```

en un tiempo razonable para hardware objetivo.

El sistema debe evitar cargar toda la campaña durante el inicio.

---

# 58. Lazy Loading

Preferir:

```text
LOAD WHEN NEEDED
```

sobre:

```text
LOAD EVERYTHING
```

---

# 59. Scene Prefetching

A futuro puede precargarse la siguiente escena.

Ejemplo:

```text
CURRENT SCENE
      +
NEXT SCENE ASSETS
```

Esto puede reducir la espera durante una transición.

---

# 60. Preloading Strategy

Solo precargar assets si:

```text
HIGH PROBABILITY OF USE
```

y:

```text
COST OF PRELOAD < COST OF DELAY
```

---

# 61. Video Performance

Los videos deben:

- utilizar formatos compatibles;
- evitar resoluciones excesivas;
- descargarse/prepararse antes de la sesión;
- tener fallback;
- evitar múltiples videos pesados simultáneamente.

---

# 62. Video Resolution

Para el MVP:

```text
1080p
```

debe considerarse suficiente para la mayoría de escenas.

4K debe ser opcional.

---

# 63. Audio Performance

No deben cargarse todas las pistas de audio simultáneamente.

Preferir:

```text
Current Music
+
Current Ambience
+
Active SFX
+
Voice
```

---

# 64. VFX Budget

Los efectos visuales deben tener límites.

Especialmente:

```text
Particles
Dynamic Lights
Transparent Objects
Post Processing
```

---

# 65. Dynamic Lights

Debe limitarse el número de luces dinámicas simultáneas cuando el
hardware lo requiera.

Una escena con:

```text
100 dynamic lights
```

no debe considerarse configuración normal.

---

# 66. Draw Calls

Debe minimizarse el número de draw calls mediante:

```text
Batching
Instancing
Material Reuse
Atlas
```

cuando el motor lo permita.

---

# 67. Materials

Evitar una cantidad innecesaria de materiales únicos.

Preferir:

```text
Shared Materials
```

---

# 68. Animation

No todos los personajes necesitan animación completa.

Niveles:

```text
STATIC
IDLE
BASIC
FULL
CINEMATIC
```

---

# 69. Static Entities

Objetos que no necesitan moverse deben marcarse como estáticos cuando
el motor lo permita.

Ejemplos:

```text
Walls
Floor
Architecture
Decorations
```

---

# 70. Occlusion

Cuando sea posible utilizar:

```text
Frustum Culling
Occlusion Culling
Distance Culling
```

---

# 71. Culling

Una entidad que no puede ser vista no necesita necesariamente ser
renderizada.

```text
VISIBLE
 ↓
RENDER

NOT VISIBLE
 ↓
SKIP
```

---

# 72. UI Performance

La interfaz debe mantenerse simple.

Evitar animaciones constantes innecesarias.

---

# 73. DM Control Performance

El panel del DM debe responder inmediatamente a acciones básicas.

Objetivo conceptual:

```text
BUTTON PRESS
 ↓
COMMAND
 ↓
RENDER
```

con una latencia percibida mínima en red local.

---

# 74. Narrative Processing

La generación de narrativa no debe bloquear el Renderer.

Incorrecto:

```text
WAIT FOR AI
 ↓
FREEZE RENDERER
```

Correcto:

```text
RENDERER
   │
   ├── RUNNING
   │
   └── AI PROCESSING
```

---

# 75. Async Processing

Las tareas pesadas deben ejecutarse de forma asíncrona cuando sea
posible.

Ejemplos:

```text
AI
Asset Loading
File Processing
Recap Generation
Indexing
```

---

# 76. Background Tasks

Las siguientes tareas pueden ejecutarse fuera del loop principal:

```text
Indexing Lore
Generating Embeddings
Preparing Recap
Asset Validation
Cache Preparation
Database Maintenance
```

---

# 77. Main Loop

El loop principal debe permanecer dedicado a:

```text
INPUT
+
STATE UPDATE
+
RENDER
```

---

# 78. No Blocking Operations

No deben ejecutarse directamente en el loop principal:

```text
Large File Parsing
AI Requests
Database Migrations
Asset Generation
Heavy Compression
```

---

# 79. Startup Database

Las migraciones deben ejecutarse antes de iniciar el runtime visual
cuando sea posible.

---

# 80. Storage Management

El sistema debe poder informar:

```text
Database Size
Asset Size
Cache Size
Logs Size
Total Project Size
```

---

# 81. Cache Cleanup

Debe existir una estrategia para limpiar caches.

Ejemplo:

```text
CACHE
 ↓
CHECK LAST ACCESS
 ↓
REMOVE UNUSED
```

---

# 82. Logs

Los logs no deben crecer indefinidamente.

Debe contemplarse:

```text
Rotation
Compression
Retention
```

---

# 83. Campaign Archiving

Campañas antiguas pueden archivarse.

```text
ACTIVE CAMPAIGN
        ↓
ARCHIVE
        ↓
COLD STORAGE
```

El contenido permanece disponible pero no afecta al runtime.

---

# 84. Performance Testing

Debe probarse:

```text
Empty Scene
Small Scene
Medium Scene
Large Scene
Heavy Scene
```

---

# 85. Test Scene

Debe existir una escena específica para benchmarking.

Debe contener:

```text
Many Entities
Lights
Particles
Audio
Video
UI
```

---

# 86. Stress Testing

El sistema debe probar límites progresivamente.

Ejemplo:

```text
10 entities
25 entities
50 entities
100 entities
250 entities
```

No asumir que todos serán soportados en hardware objetivo.

---

# 87. Memory Leak Testing

Debe comprobarse que:

```text
LOAD SCENE
 ↓
UNLOAD SCENE
```

no produzca crecimiento indefinido de memoria.

---

# 88. Long Session Testing

Una sesión prolongada debe probarse durante varias horas.

Objetivo:

```text
NO MEMORY LEAK
NO PROGRESSIVE FPS DROP
NO UNCONTROLLED LOG GROWTH
NO RESOURCE ACCUMULATION
```

---

# 89. Recovery Testing

Debe probarse:

```text
Disconnect
Reconnect
Missing Asset
Invalid Command
Scene Load Failure
Video Failure
Audio Failure
```

---

# 90. Performance Regression

Cada cambio importante debería poder compararse con una referencia.

Ejemplo:

```text
BEFORE
60 FPS

AFTER
59 FPS
```

puede ser aceptable.

Pero:

```text
BEFORE
60 FPS

AFTER
25 FPS
```

requiere investigación.

---

# 91. Performance Budget Per Scene

Una escena puede declarar sus límites esperados.

Ejemplo:

```json
{
  "scene_id": "ancient-vault",
  "expected_entities": 30,
  "max_dynamic_lights": 8,
  "max_particles": 5000,
  "target_fps": 60
}
```

---

# 92. Performance Metadata

Los assets también pueden indicar:

```text
poly_count
texture_size
file_size
estimated_memory
```

---

# 93. Automatic Warnings

El sistema puede advertir:

```text
WARNING:
Scene contains 25 dynamic lights.
Recommended maximum: 8.
```

---

# 94. Quality vs Narrative Importance

No debe sacrificarse una escena narrativamente importante únicamente
por mantener una representación visual idéntica a todas las demás.

Puede utilizarse una escena más simple en momentos secundarios.

---

# 95. Cinematic Budget

Las escenas cinematográficas pueden utilizar técnicas más pesadas
si son cortas.

Ejemplo:

```text
10 second cinematic
```

puede permitirse más complejidad que:

```text
2 hour gameplay scene
```

---

# 96. Static Background Optimization

Cuando el fondo no necesita interacción:

```text
IMAGE / VIDEO
```

puede ser preferible a un escenario 3D completo.

---

# 97. Reusable Scene Templates

Debe existir una biblioteca de templates.

Ejemplos:

```text
Dungeon
Cave
Prison
Vault
Forest
Village
Castle
Tavern
Temple
Ruins
Tunnel
Battlefield
```

---

# 98. Procedural Reuse

Un mismo template puede generar variantes.

Ejemplo:

```text
DUNGEON TEMPLATE
+
Layout A

DUNGEON TEMPLATE
+
Layout B

DUNGEON TEMPLATE
+
Layout C
```

---

# 99. Asset Economy

La prioridad es:

```text
ONE GOOD ASSET
+
MANY USES
```

en lugar de:

```text
ONE UNIQUE ASSET
+
ONE USE
```

---

# 100. Storage Target

El proyecto debe intentar mantener:

```text
CORE APPLICATION
+
DATABASE
+
DOCUMENTATION
```

livianos.

Los assets pueden crecer independientemente.

---

# 101. External Asset Storage

A futuro puede permitirse una estructura:

```text
PROJECT/
├── app/
├── docs/
├── database/
├── config/
└── assets/
```

y opcionalmente:

```text
ASSET_LIBRARY/
```

fuera del repositorio principal.

---

# 102. Git Considerations

No deben almacenarse automáticamente en Git:

```text
Huge Videos
Huge Models
Generated Caches
Temporary Files
Build Outputs
```

---

# 103. Asset Manifest

El proyecto debe utilizar un manifest.

Ejemplo:

```json
{
  "asset_id": "vault-door",
  "path": "assets/props/vault-door.glb",
  "version": "1.0"
}
```

---

# 104. Missing Asset Strategy

Si el asset está ausente:

```text
MANIFEST
 ↓
CHECK FILE
 ↓
FOUND → LOAD
MISSING → FALLBACK
```

---

# 105. Performance and AI Context

La eficiencia no se limita al Renderer.

La IA también debe tener un sistema de contexto eficiente.

No debe enviarse:

```text
ALL DOCUMENTATION
+
ALL SESSIONS
+
ALL CHARACTERS
+
ALL EVENTS
```

para cada operación.

---

# 106. Context Retrieval

Preferir:

```text
QUERY
 ↓
RETRIEVE RELEVANT DATA
 ↓
BUILD CONTEXT
 ↓
AI
```

---

# 107. Markdown Strategy

Los archivos `.md` deben ser:

- pequeños;
- especializados;
- estructurados;
- enlazables;
- fáciles de recuperar.

---

# 108. Context Index

Debe existir un índice de documentación.

Ejemplo:

```text
docs/
├── CONTEXT.md
├── PRODUCT.md
├── DOMAIN.md
...
```

El agente puede identificar primero qué documento necesita.

---

# 109. Agent Context Profiles

A futuro pueden existir perfiles:

```text
NARRATIVE_AGENT
SCENE_AGENT
CHARACTER_AGENT
RECAP_AGENT
DM_AGENT
RENDERER_AGENT
DATABASE_AGENT
```

Cada uno recibe un conjunto de documentos diferente.

---

# 110. Agent Performance

Los agentes deben evitar:

```text
Repeated Full Repository Reads
```

Preferir:

```text
Targeted Retrieval
```

---

# 111. Development Performance

El proyecto debe ser rápido también para desarrollar.

Debe evitar:

```text
Long Build Times
Heavy Dependencies
Complex Toolchains
```

cuando una alternativa sencilla sea suficiente.

---

# 112. MVP Technology Principle

No agregar una tecnología solamente porque:

```text
"It is more powerful."
```

Agregarla cuando:

```text
"It solves a demonstrated problem."
```

---

# 113. Dependency Budget

Cada dependencia agrega:

```text
Storage
Complexity
Maintenance
Security Risk
Build Time
```

Por lo tanto:

```text
Minimal Dependencies
```

es un objetivo explícito.

---

# 114. Local First Architecture

La arquitectura base debe funcionar:

```text
WITHOUT INTERNET
```

con:

```text
Local Database
Local Assets
Local Renderer
Local Session
Local Documentation
```

---

# 115. Internet Optional

Internet puede mejorar:

```text
AI
Asset Generation
Updates
Sharing
Cloud Backup
```

pero ninguna de estas capacidades debe ser obligatoria para el MVP.

---

# 116. Performance Priority Matrix

Prioridad:

```text
HIGH
├── Renderer Stability
├── Memory Stability
├── Scene Loading
├── Input Responsiveness
└── State Synchronization

MEDIUM
├── Visual Effects
├── High Resolution
├── Advanced Lighting
└── Cinematic Features

LOW
├── Ray Tracing
├── Photorealism
├── 4K Everything
└── AAA-Level Animation
```

---

# 117. Golden Rule

Cuando existan dos soluciones:

```text
SOLUTION A
More impressive
but heavy

SOLUTION B
Slightly simpler
but reliable
```

El MVP debe elegir:

```text
SOLUTION B
```

---

# 118. Scalability

La arquitectura debe permitir crecer progresivamente:

```text
MVP
 ↓
Better Assets
 ↓
Better Renderer
 ↓
More Automation
 ↓
Better AI
 ↓
Networked Sessions
 ↓
Advanced Cinematics
```

sin requerir una reescritura completa.

---

# 119. Performance Definition of Done

Una característica se considera lista cuando:

```text
[ ] Funciona correctamente
[ ] No introduce bloqueos
[ ] No produce memory leaks conocidos
[ ] Funciona en hardware objetivo
[ ] Tiene comportamiento aceptable en LOW
[ ] Tiene comportamiento aceptable en MEDIUM
[ ] Tiene fallback cuando corresponde
[ ] No requiere servicios pagos
[ ] No requiere Internet salvo que sea explícitamente necesario
```

---

# 120. Final Principle

El objetivo de rendimiento del proyecto no es hacer el motor más
poderoso posible.

Es construir:

```text
A SMALL
+
STABLE
+
LOCAL
+
REUSABLE
+
EXTENSIBLE
```

platforma capaz de transformar una campaña de rol en una experiencia
visual y narrativa inmersiva.

La complejidad debe crecer únicamente cuando la experiencia obtenida
justifique el coste computacional y de desarrollo.
