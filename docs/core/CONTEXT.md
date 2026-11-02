# CONTEXT.md

> Contexto raíz del proyecto.
> Este archivo debe ser leído por cualquier agente antes de trabajar sobre el proyecto.
> No contiene especificaciones detalladas de módulos; esas se encuentran en los documentos especializados.

---

# 1. Proyecto

## Nombre provisional

**Persistent AI RPG World Engine**

Nombre interno provisional:

`RPG World Engine`

El nombre definitivo puede cambiar posteriormente.

---

# 2. Propósito

RPG World Engine es una plataforma local para transformar una campaña de rol de mesa en un **mundo narrativo persistente y visual**.

El sistema debe permitir registrar y comprender la historia de una campaña a lo largo de múltiples sesiones y utilizar esa información para:

- mantener la continuidad narrativa;
- conocer el estado actual del mundo;
- mantener personajes, NPCs, lugares, objetos, facciones y quests;
- registrar acontecimientos importantes;
- conservar relaciones entre entidades;
- generar recapitulaciones;
- generar narraciones mediante voz;
- representar el estado actual mediante un entorno visual 3D/2D;
- permitir al DM controlar el entorno durante una partida;
- preparar escenas futuras a partir del contexto narrativo.

La aplicación no pretende reemplazar al DM.

La IA funciona como **asistente narrativo, analista y operador auxiliar**, mientras que el DM mantiene la autoridad sobre el canon de la campaña.

---

# 3. Concepto central

El proyecto se basa en cuatro capas principales:

```text
CAMPAIGN
    │
    ▼
WORLD STATE
    │
    ├──────────────┐
    ▼              ▼
NARRATIVE       VISUAL
    │              │
    ▼              ▼
RECAP           SCENE
    │              │
    ▼              ▼
AUDIO           RENDERER
```

La información narrativa y visual no deben convertirse en fuentes independientes de verdad.

La fuente principal de verdad es:

```text
WORLD STATE
```

---

# 4. Regla fundamental

## World State is the Source of Truth

El estado estructurado del mundo es la fuente de verdad del sistema.

La IA, el frontend, el renderer y las herramientas del DM deben:

- consultar el World State;
- proponer modificaciones;
- ejecutar modificaciones aprobadas;
- generar representaciones derivadas.

No deben crear una segunda fuente de verdad independiente.

---

# 5. Contexto de uso

El proyecto está pensado inicialmente para una campaña privada de rol entre amigos.

Las sesiones se realizan periódicamente, pero no necesariamente todas las semanas.

La campaña comenzó el:

**1 de diciembre de 2025**

Existe material histórico previo que debe incorporarse progresivamente.

La campaña ya posee una cantidad significativa de historia, pero todavía es viable realizar una migración progresiva sesión por sesión.

El sistema debe asumir que:

- puede haber sesiones faltantes;
- puede haber jugadores ausentes;
- puede existir información incompleta;
- las notas pueden estar escritas informalmente;
- distintos jugadores pueden recordar un acontecimiento de forma diferente;
- pueden aparecer contradicciones;
- algunas cosas son conocidas por el DM pero no por los personajes;
- determinados eventos pueden ser secretos.

---

# 6. Estrategia de migración histórica

No se debe intentar convertir toda la campaña histórica en una única operación.

La migración será incremental.

```text
SESIÓN
   ↓
IMPORTACIÓN
   ↓
ANÁLISIS
   ↓
ENTIDADES
   ↓
EVENTOS
   ↓
RELACIONES
   ↓
REVISIÓN DEL DM
   ↓
CANON
   ↓
WORLD STATE
```

La información original debe conservarse.

La IA puede interpretar el material, pero no debe destruir ni reemplazar la fuente original.

---

# 7. Modelo narrativo

El sistema debe distinguir entre:

### Entidades

Elementos persistentes del mundo.

Ejemplos:

- personajes;
- NPCs;
- lugares;
- objetos;
- facciones;
- criaturas;
- quests;
- organizaciones.

### Eventos

Cosas que sucedieron.

Ejemplos:

- un personaje encontró un objeto;
- un NPC murió;
- el grupo descubrió una ubicación;
- comenzó una batalla;
- una facción declaró hostilidad;
- se completó una quest.

### Relaciones

Conexiones entre entidades.

Ejemplos:

```text
Personaje -> conoce -> NPC

NPC -> pertenece a -> Facción

Personaje -> posee -> Objeto

Personaje -> está en -> Ubicación

Facción A -> enemiga de -> Facción B
```

### Estado

La situación actual resultante de todos los eventos canonizados.

---

# 8. Canon

El DM tiene la autoridad final sobre la historia.

La IA puede detectar o proponer información, pero no debe convertir automáticamente información incierta en canon.

Estados conceptuales:

```text
PROPOSED
UNCONFIRMED
CANON
CONTRADICTORY
REJECTED
DM_ONLY
```

Flujo:

```text
IA
 ↓
PROPOSED
 ↓
REVIEW
 ↓
DM
 ├── APPROVE → CANON
 └── REJECT  → REJECTED
```

---

# 9. Conocimiento

El sistema debe distinguir entre:

```text
Lo que realmente ocurrió
```

y:

```text
Lo que cada personaje sabe
```

Esto es fundamental para evitar spoilers.

Ejemplo:

```text
REALITY
└── El NPC X pertenece secretamente a una secta.

DM
└── KNOWS

Personaje A
└── UNKNOWN

Personaje B
└── SUSPECTS

Jugador
└── UNKNOWN
```

Nunca debe asumirse que el conocimiento del DM es conocimiento de los personajes.

---

# 10. IA

La IA debe utilizarse principalmente para:

- extracción de información;
- clasificación;
- resumen;
- búsqueda contextual;
- análisis narrativo;
- generación de recapitulaciones;
- generación de propuestas;
- preparación de escenas;
- asistencia al DM.

La IA no debe controlar directamente el dominio sin pasar por las reglas del sistema.

Conceptualmente:

```text
USER / DM
    ↓
AI
    ↓
PROPOSAL
    ↓
DOMAIN VALIDATION
    ↓
WORLD STATE
```

---

# 11. Contexto para modelos de IA

El sistema debe evitar enviar toda la campaña al modelo.

En lugar de:

```text
TODOS LOS DOCUMENTOS
        ↓
      LLM
```

debe utilizar:

```text
QUERY
  ↓
CONTEXT BUILDER
  ↓
RELEVANT ENTITIES
  ↓
RELEVANT EVENTS
  ↓
RELEVANT RELATIONSHIPS
  ↓
RELEVANT MEMORY
  ↓
LLM
```

El contexto debe ser:

- relevante;
- pequeño;
- estructurado;
- trazable;
- limitado por permisos;
- generado bajo demanda.

---

# 12. Filosofía Local First

El proyecto debe poder funcionar localmente.

Objetivo inicial:

```text
$0 de infraestructura obligatoria
```

Preferencias:

- SQLite;
- archivos locales;
- búsqueda local;
- procesamiento local cuando sea viable;
- modelos locales cuando sean suficientemente buenos;
- TTS local cuando sea viable;
- APIs externas como proveedores opcionales.

No se debe diseñar el núcleo del sistema dependiendo de una API paga.

---

# 13. Base de datos

La base de datos inicial será:

```text
SQLite
```

Debe ser:

- local;
- liviana;
- portable;
- fácil de respaldar;
- fácil de restaurar;
- suficiente para una campaña.

No se debe introducir una base de datos distribuida o un servidor de base de datos sin una necesidad real.

Los assets grandes deben almacenarse como archivos.

SQLite debe contener principalmente:

- entidades;
- relaciones;
- eventos;
- metadata;
- estados;
- referencias a archivos;
- configuración.

---

# 14. Assets

Los recursos multimedia deben estar desacoplados de la base de datos.

Tipos esperados:

```text
2D
├── imágenes
├── mapas
├── ilustraciones
└── overlays

3D
├── personajes
├── objetos
├── edificios
├── escenarios
└── efectos

AUDIO
├── música
├── ambiente
├── efectos
└── narración

VIDEO
├── cinemáticas
├── fondos
└── transiciones
```

SQLite almacena metadata y referencias.

---

# 15. Sistema visual

La representación visual no debe depender inicialmente de generar mundos 3D completos mediante IA.

Se prioriza un sistema modular.

Conceptualmente:

```text
IMAGEN 2D / REFERENCIA DEL DM
             ↓
       ANÁLISIS DE IA
             ↓
      SCENE BLUEPRINT
             ↓
      ASSETS MODULARES
             ↓
       SCENE BUILDER
             ↓
          ESCENA 3D
```

Los personajes se representarán inicialmente como miniaturas digitales.

Conceptualmente:

```text
BASE
 +
CUERPO
 +
ARMADURA
 +
CABEZA
 +
ARMA
 +
ACCESORIOS
 =
PERSONAJE
```

---

# 16. Escenarios

Los escenarios deben poder construirse mediante kits modulares.

Ejemplos:

```text
Dungeon Kit
Cave Kit
Prison Kit
Vault Kit
Forest Kit
Temple Kit
Castle Kit
Village Kit
City Kit
Tunnel Kit
Ruins Kit
```

La reutilización de assets es prioritaria frente a generar cada escenario desde cero.

Esto reduce:

- almacenamiento;
- tiempo de generación;
- consumo de GPU;
- complejidad;
- dependencia de IA generativa.

---

# 17. DM Control Deck

El DM debe tener una interfaz de control independiente del renderer.

El DM podrá modificar:

- iluminación;
- clima;
- ambiente;
- música;
- sonidos;
- cámara;
- personajes;
- NPCs;
- efectos;
- cinemáticas;
- escenas;
- macros;
- eventos.

Conceptualmente:

```text
DM
 ↓
CONTROL DECK
 ↓
EVENT
 ↓
WORLD / RENDERER
```

El DM no debería necesitar interactuar directamente con código.

---

# 18. Event Driven

Los cambios importantes deben representarse como eventos.

Ejemplo:

```text
WEATHER_CHANGED
CHARACTER_MOVED
NPC_SPAWNED
LIGHTING_CHANGED
COMBAT_STARTED
CINEMATIC_STARTED
LOCATION_CHANGED
```

El sistema debe utilizar estos eventos como mecanismo común de comunicación entre módulos.

---

# 19. Runtime vs Pre-generation

Debe existir una separación clara.

## Antes de la sesión

Se puede realizar procesamiento pesado:

- analizar notas;
- generar recaps;
- generar audio;
- preparar escenas;
- procesar imágenes;
- preparar assets;
- generar sugerencias.

## Durante la sesión

Debe priorizarse:

- baja latencia;
- assets previamente cargados;
- eventos;
- cambios visuales;
- audio;
- iluminación;
- cámara;
- efectos.

No depender de una generación pesada de IA durante una escena crítica.

---

# 20. Recapitulación

Cada sesión debe poder generar:

### Quick Recap

Resumen muy breve.

### Full Recap

Resumen completo para jugadores que faltaron.

### Narrative Recap

Versión preparada para narración.

Pipeline:

```text
SESSION
 ↓
CANON EVENTS
 ↓
RECAP ENGINE
 ↓
NARRATIVE SCRIPT
 ↓
TTS
 ↓
AUDIO
```

El recap debe servir tanto para:

- jugadores ausentes;
- jugadores presentes;
- recordar eventos anteriores;
- comenzar una nueva sesión.

---

# 21. Persistencia temporal

El sistema debe distinguir entre:

```text
PASADO
ACTUAL
FUTURO
```

Los mapas anteriores no necesitan mantenerse cargados en el runtime si el grupo ya abandonó esa ubicación.

Sin embargo, la información histórica debe permanecer.

Ejemplo:

```text
Location A
STATUS = HISTORICAL

Location B
STATUS = ARCHIVED

Location C
STATUS = ACTIVE
```

Esto permite mantener una campaña completa sin obligar al renderer a cargar todo el mundo.

---

# 22. Snapshots

El sistema debe poder guardar el estado completo del mundo en determinados puntos.

Ejemplo:

```text
Session 01
   ↓
Snapshot 001

Session 02
   ↓
Snapshot 002

Session 03
   ↓
Snapshot 003
```

Esto permitirá:

- recuperación;
- debugging;
- comparación;
- rollback;
- reconstrucción histórica.

---

# 23. Arquitectura de agentes

Los agentes de programación serán utilizados para desarrollar el proyecto.

Los agentes no deben recibir todo el contexto del proyecto en cada tarea.

Regla:

```text
CONTEXT.md
     ↓
DOCUMENTACIÓN DEL MÓDULO
     ↓
TASK
     ↓
CÓDIGO
     ↓
TEST
     ↓
DOCUMENTACIÓN
```

Cada agente debe trabajar dentro del alcance de su tarea.

---

# 24. Documentación

La documentación será modular.

Documentos principales previstos:

```text
CONTEXT.md
PRODUCT.md
DOMAIN.md
ARCHITECTURE.md
DATABASE.md
EVENT-SYSTEM.md
CANON.md
MEMORY.md
CONTEXT-SYSTEM.md
CONTEXT-BUILDER.md
INGESTION-AND-LORE.md
SETTING-INGESTION.md
RECAP-ENGINE.md
TTS.md
SCENE-ENGINE.md
CHARACTER-SYSTEM.md
DM-CONTROLLER.md
RENDERER.md
ASSET-MANAGEMENT.md
AGENTS-SYSTEM.md
AGENTS.md
SECURITY.md
PERFORMANCE.md
TESTING.md
SESSION-SYSTEM.md
WORLD-STATE.md
DATA-MODEL.md
DATA-DIRECTORY.md
README.md
ROADMAP.md
```

Este archivo no debe convertirse en una especificación técnica gigante.

Si un concepto necesita detalles de implementación, debe documentarse en su archivo correspondiente.

---

# 25. Regla de lectura para agentes

Antes de modificar código:

1. Leer `CONTEXT.md`.
2. Identificar el módulo afectado.
3. Leer únicamente la documentación de ese módulo.
4. Revisar contratos/interfaces existentes.
5. Revisar tests existentes.
6. Implementar.
7. Ejecutar tests.
8. Actualizar documentación si corresponde.

---

# 26. Regla de modificación

Un agente no debe modificar estructuras globales simplemente para resolver una tarea local.

Antes de modificar:

- entidades;
- eventos;
- contratos;
- APIs;
- esquema de base de datos;

debe verificar si la modificación afecta otros módulos.

Los cambios arquitectónicos importantes deben registrarse mediante ADR.

---

# 27. Principios de desarrollo

Prioridades:

```text
CORRECTNESS
    >
SIMPLICITY
    >
MAINTAINABILITY
    >
PERFORMANCE
    >
FEATURE COUNT
```

No se debe agregar tecnología solamente porque sea popular.

Una tecnología nueva debe justificar su incorporación.

---

# 28. Prioridad del proyecto

El orden de desarrollo recomendado es:

```text
1. Datos
2. Dominio
3. Eventos
4. World State
5. Importación histórica
6. Memoria/contexto
7. Recaps
8. DM Control
9. Renderer
10. Escenas
11. Automatización IA
12. Cinemáticas avanzadas
```

No comenzar intentando construir el producto final completo.

---

# 29. MVP conceptual

El primer objetivo realista es:

```text
CAMPAÑA
   ↓
IMPORTAR SESIÓN
   ↓
EXTRAER EVENTOS
   ↓
REVISAR
   ↓
CANON
   ↓
WORLD STATE
   ↓
PERSONAJES EN ESCENA
   ↓
CONTROL DM
   ↓
RECAP
```

Si este ciclo funciona correctamente, el proyecto posee una base sólida para crecer.

---

# 30. Estado actual del proyecto

Versión:

`0.1`

Estado:

`FOUNDATION / DESIGN`

Todavía no se considera estable ninguna implementación.

Las decisiones actuales son propuestas arquitectónicas iniciales y pueden cambiar mediante ADR.

---

# 31. Fuera de contexto

Este archivo NO debe contener:

- implementación detallada;
- SQL completo;
- componentes React;
- endpoints completos;
- código;
- prompts específicos;
- configuración de shaders;
- configuración específica de un LLM;
- detalles internos de Three.js;
- instrucciones específicas de un proveedor.

Esos contenidos pertenecen a documentos especializados.

---

# 32. Regla final

El proyecto debe evolucionar de manera incremental.

No intentar construir:

> "una IA que genere todo el mundo de rol"

desde el primer día.

Construir primero:

> **un sistema confiable que recuerde qué ocurrió, cuál es el estado actual del mundo y qué puede conocer cada personaje.**

Después utilizar esa base para construir:

> **la representación visual y la asistencia inteligente.**

Y finalmente:

> **un director visual/narrativo asistido por IA para las sesiones.**
