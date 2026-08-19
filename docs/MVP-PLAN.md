# MVP-PLAN.md

> Plan de desarrollo incremental para Roleito MVP.
>
> Cubre desarrollo incremental, puntos de control de assets,
> y enfoque de entorno 3D + personajes 2D.

---

# 1. Estado Actual

## Lo que existe

```text
BACKEND
  FastAPI app con endpoint /health
  Modelos SQLAlchemy (Campaign, Session, Character, NPC, Location, Event, Relationship)
  Configuración SQLite database

FRONTEND
  Vite + React app DM (placeholder UI)
  Tipos TypeScript del dominio (todas las entidades definidas)

DOCS
  32 docs comprensivos
  Arquitectura, dominio, base de datos, renderer, sistema de sesiones, etc.

AÚN NO
  Endpoints CRUD
  Componentes UI
  Sistema de eventos
  Sistema de escenas
  Renderer
  Tests
```

---

# 2. Objetivo MVP

Desarrollar incrementalmente hacia una versión jugable que permita:

```text
CARGAR CAMPAÑA
  ↓
INICIAR SESIÓN
  ↓
CARGAR ESCENA ACTUAL
  ↓
UBICAR PERSONAJES
  ↓
DM CONTROLA ESCENA
  ↓
REGISTRAR EVENTOS
  ↓
FINALIZAR SESIÓN
  ↓
GENERAR RECAP
  ↓
GUARDAR CAMPAÑA
```

**Requisitos del DM (actualizados)**:
```text
DASHBOARD DM COMO SUPERADMIN
  ↓
PANEL PRINCIPAL DE CONTROL
  ↓
GESTIÓN DE JUGADORES SECUNDARIOS
  ↓
FICHAS DE PERSONAJE POR JUGADOR
  ↓
MAPAS CON IMÁGENES
  ↓
PREPARACIÓN DE SESIONES
```

---

# 3. Resumen de Fases

```text
PHASE 0  Fundación              (actual)
PHASE 1  Campaign CRUD
PHASE 2  Sistema de Personajes
PHASE 3  Sistema de Sesiones
PHASE 4  Sistema de Eventos
PHASE 5  Dashboard DM (Superadmin) ← PRIORIDAD
PHASE 6  Sistema de Escenas
PHASE 7  Renderer Básico (3D env + 2D sprites)
PHASE 8  Sistema de Recaps
PHASE 9  Slice Vertical
PHASE 10 Fichas de Jugador
PHASE 11 Sistema de Mapas
PHASE 12 Sistema de Dados
PHASE 13 Cuaderno de Decisiones DM
PHASE 14 Entornos 3D con IA ← FUTURO
```

---

# 4. PHASE 0 — FOUNDATION (Current)

## Status

```text
COMPLETE ✓
```

## Done

```text
✓ FastAPI app scaffold
✓ SQLAlchemy models
✓ TypeScript domain types
✓ Vite + React app scaffold
✓ Documentation (36 docs)
✓ Code graph (graphify)
✓ Backend: database initialization script
✓ Backend: logging setup
✓ Backend: error handling middleware
✓ Backend: requirements.txt validation
✓ Frontend: TailwindCSS config
✓ Frontend: routing setup
✓ Frontend: API client layer
✓ Shared: test framework setup
✓ Shared: .env configuration
✓ Shared: asset directory structure
```

## Asset Checkpoint

```text
NO ASSETS YET
```

## Exit Criteria

```text
□ Backend starts and creates DB
□ Frontend starts and shows UI
□ Health endpoint works
□ Test framework runs
```

---

# 5. PHASE 1 — CAMPAIGN CRUD

## Objective

Create, load, save, export, import campaigns.

## Backend

```text
□ POST   /api/campaigns           Create campaign
□ GET    /api/campaigns           List campaigns
□ GET    /api/campaigns/{id}      Get campaign
□ PUT    /api/campaigns/{id}      Update campaign
□ DELETE /api/campaigns/{id}      Delete campaign
□ POST   /api/campaigns/{id}/export  Export campaign
□ POST   /api/campaigns/import    Import campaign
```

## Frontend

```text
□ Campaign list view
□ Campaign create/edit form
□ Campaign detail view
□ Campaign selector (load existing)
```

## Asset Checkpoint

```text
□ Upload test campaign images (logo, banner)
□ Verify images stored correctly
□ Verify images served by API
```

## Exit Criteria

```text
□ Can create campaign via UI
□ Can list campaigns
□ Can load campaign
□ Can save campaign changes
□ Can export campaign as JSON
□ Can import campaign from JSON
□ Images upload and display
```

---

# 6. PHASE 2 — CHARACTER SYSTEM

## Objective

Create, edit, view, archive, move characters.

## Backend

```text
□ POST   /api/campaigns/{id}/characters         Create character
□ GET    /api/campaigns/{id}/characters         List characters
□ GET    /api/campaigns/{id}/characters/{cid}   Get character
□ PUT    /api/campaigns/{id}/characters/{cid}   Update character
□ DELETE /api/campaigns/{id}/characters/{cid}   Delete character
□ POST   /api/campaigns/{id}/characters/{cid}/move  Move character

□ POST   /api/campaigns/{id}/npcs               Create NPC
□ GET    /api/campaigns/{id}/npcs               List NPCs
□ PUT    /api/campaigns/{id}/npcs/{nid}         Update NPC
□ DELETE /api/campaigns/{id}/npcs/{nid}         Delete NPC
```

## Frontend

```text
□ Character list view
□ Character create/edit form
□ Character detail view
□ Character portrait upload
□ NPC list view
□ NPC create/edit form
```

## Visual Model (2D → 3D Strategy)

```text
Characters render as 2D TOKENS initially:

  ┌─────────────┐
  │  [PORTRAIT] │
  │   Name      │
  │   Class     │
  │   Status    │
  └─────────────┘

  3D models come LATER (Phase 12+)

  Token = identity marker on scene
  Model = visual representation (swap when ready)
```

## Asset Checkpoint

```text
□ Upload test character portraits (5-10 images)
□ Test portrait storage path: assets/characters/{campaign_id}/{character_id}/
□ Verify portraits load in character list
□ Verify portraits load in character detail
□ Test image formats: png, jpg, webp
□ Test max file size handling
```

## Exit Criteria

```text
□ Can create player character
□ Can create NPC
□ Can edit character details
□ Can upload character portrait
□ Can move character between locations
□ Can archive character
□ Portraits display correctly
```

---

# 7. PHASE 3 — SESSION SYSTEM

## Objective

Manage session lifecycle: prep → play → recap → snapshot.

## Backend

```text
□ POST   /api/campaigns/{id}/sessions              Create session
□ GET    /api/campaigns/{id}/sessions              List sessions
□ GET    /api/campaigns/{id}/sessions/{sid}        Get session
□ PUT    /api/campaigns/{id}/sessions/{sid}        Update session
□ POST   /api/campaigns/{id}/sessions/{sid}/start  Start session
□ POST   /api/campaigns/{id}/sessions/{sid}/end    End session
□ GET    /api/campaigns/{id}/sessions/current      Get current session
```

## Session Status Flow

```text
DRAFT → PROCESSING → REVIEW → APPROVED → ARCHIVED

        ↑
     IMPORTED (from historical data)
```

## Frontend

```text
□ Session list view
□ Session create form
□ Session detail view
□ Session status indicator
□ Session timeline view
```

## Asset Checkpoint

```text
□ Upload test session notes (markdown files)
□ Test raw_notes field with large text
□ Verify session data persists correctly
```

## Exit Criteria

```text
□ Can create session
□ Can start session (sets current_session_id)
□ Can end session
□ Can view session history
□ Session status transitions work
```

---

# 8. PHASE 4 — EVENT SYSTEM

## Objective

Record and manage events that change world state.

## Backend

```text
□ POST   /api/sessions/{sid}/events          Create event
□ GET    /api/sessions/{sid}/events          List session events
□ GET    /api/campaigns/{id}/events          List campaign events
□ PUT    /api/events/{eid}/approve           Approve event
□ PUT    /api/events/{eid}/reject            Reject event
□ GET    /api/campaigns/{id}/world-state     Get current world state
```

## Event Canon Flow

```text
PROPOSED → REVIEW → APPROVED/REJECTED

AI proposes → DM approves/rejects
```

## Frontend

```text
□ Event list view (per session)
□ Event detail view
□ Event approval/rejection UI
□ Event type filters
```

## World State

```text
□ World state endpoint returns:
  - All characters + locations
  - All NPCs + locations
  - Active quests
  - Current relationships
  - Session summary
```

## Asset Checkpoint

```text
□ Test event creation with various types
□ Test event approval/rejection flow
□ Verify world state updates after approval
□ Test event with location reference
```

## Exit Criteria

```text
□ Can create events
□ Can list events by session
□ Can approve/reject events
□ World state reflects approved events
□ Event types match domain types
```

---

# 9. PHASE 5 — DASHBOARD DM (SUPERADMIN)

## Objetivo

Panel de administración principal donde el DM controla todo.

**Concepto clave**: El DM es el usuario principal que carga todo para las sesiones.
Los jugadores son secundarios (no NPCs).

## Funcionalidades

### Gestión de Campañas
```text
□ Crear campaña
□ Editar campaña
□ Cargar campaña existente
□ Exportar/Importar campaña
□ Configurar campaña
```

### Gestión de Jugadores
```text
□ Crear jugador secundario
□ Asignar personaje a jugador
□ Gestionar permisos de jugador
□ Ver estado de jugador
□ Controlar acceso a información
```

### Gestión de Sesiones
```text
□ Crear sesión
□ Preparar sesión (cargar info del DM)
□ Iniciar/Finalizar sesión
□ Ver historial de sesiones
□ Controlar estado de sesión
```

### Gestión de Personajes
```text
□ Crear personaje
□ Editar ficha de personaje
□ Asignar personaje a jugador
□ Ver estado actual de personaje
□ Subir retrato de personaje
```

### Gestión de NPCs
```text
□ Crear NPC
□ Editar NPC
□ Asignar NPC a ubicación
□ Ver estado de NPC
□ Subir retrato de NPC
```

### Gestión de Mapas
```text
□ Subir imágenes de mapa
□ Asignar mapa a campaña
□ Asignar mapa a sesión
□ Ver mapa en sesión
□ Controlar capas de mapa
```

### Gestión de Assets
```text
□ Subir imágenes (retratos, fondos, mapas)
□ Organizar assets por campaña
□ Asignar assets a entidades
□ Previsualizar assets
```

## Layout del Dashboard

```text
┌─────────────────────────────────────────────────────────────┐
│  DASHBOARD DM (SUPERADMIN)                                 │
├──────────────┬──────────────────────────────────────────────┤
│  SIDEBAR     │  MAIN VIEW                                   │
│              │                                              │
│  Campañas    │  [Vista actual:                             │
│  Jugadores   │   - Panel de campaña                        │
│  Sesiones    │   - Lista de personajes                     │
│  Personajes  │   - Gestión de mapas                        │
│  NPCs        │   - Control de sesión                       │
│  Mapas       │   - Subida de assets]                       │
│  Assets      │                                              │
│              │                                              │
├──────────────┴──────────────────────────────────────────────┤
│  STATUS BAR                                                 │
│  Campaña | Sesión Actual | Jugadores | Mapas               │
└─────────────────────────────────────────────────────────────┘
```

## Flujo de Trabajo del DM

```text
1. CREAR CAMPAÑA
   ↓
2. AGREGAR JUGADORES
   ↓
3. CREAR PERSONAJES
   ↓
4. ASIGNAR PERSONAJES A JUGADORES
   ↓
5. SUBIR MAPAS
   ↓
6. CREAR SESIÓN
   ↓
7. PREPARAR SESIÓN (cargar info)
   ↓
8. INICIAR SESIÓN
   ↓
9. DURANTE SESIÓN: Controlar todo desde dashboard
   ↓
10. FINALIZAR SESIÓN
   ↓
11. GENERAR RECAP
```

## Checkpoint de Assets

```text
□ Subir imágenes de prueba de entornos (5-10 escenas)
□ Probar fondos de escena en panel DM
□ Verificar cambio de escenas funcione
□ Probar posicionamiento de personajes en escena
□ Subir imágenes de mapas de prueba
□ Probar visualización de mapas
□ Verificar subida de retratos de personajes
```

## Criterios de Salida

```text
□ DM puede controlar sesión desde UI
□ DM puede gestionar jugadores secundarios
□ DM puede crear y editar fichas de personaje
□ DM puede subir y gestionar mapas
□ DM puede registrar eventos en tiempo real
□ DM puede ver estado actual del mundo
□ UI es responsive y rápida
□ Dashboard funciona como superadmin
```

---

# 10. PHASE 6 — SCENE SYSTEM

## Objective

Represent scenarios with environments, characters, NPCs, lighting, audio.

## Scene Types

```text
□ Tavern
□ Forest
□ Cave
□ Dungeon
□ Castle
□ Village
□ Ruins
□ Custom
```

## Scene Components

```text
□ Background (image or 3D environment)
□ Characters (2D tokens on scene)
□ NPCs (2D tokens on scene)
□ Props (static objects)
□ Lighting (basic: day/night/dim/bright)
□ Audio (background music/ambience)
□ Effects (basic: fog, particles)
```

## Backend

```text
□ POST   /api/campaigns/{id}/scenes          Create scene
□ GET    /api/campaigns/{id}/scenes          List scenes
□ PUT    /api/campaigns/{id}/scenes/{scid}   Update scene
□ POST   /api/scenes/{scid}/assets          Upload scene assets
□ GET    /api/scenes/{scid}/assets          List scene assets
```

## Asset Checkpoint

```text
□ Upload test scene backgrounds (10+ images)
□ Test scene asset storage: assets/scenes/{campaign_id}/{scene_id}/
□ Test background images load correctly
□ Test character tokens on scene
□ Test NPC tokens on scene
□ Test scene switching with different backgrounds
□ Verify asset loading performance
```

## Asset Directory Structure

```text
assets/
  characters/
    {campaign_id}/
      {character_id}/
        portrait.png
        token.png
  npcs/
    {campaign_id}/
      {npc_id}/
        portrait.png
        token.png
  scenes/
    {campaign_id}/
      {scene_id}/
        background.png
        music.mp3
        ambience.mp3
  environments/
    tavern/
      background.png
    forest/
      background.png
    cave/
      background.png
```

## Exit Criteria

```text
□ Can create scenes
□ Can assign background images
□ Can place characters on scene
□ Can place NPCs on scene
□ Can switch between scenes
□ Assets load correctly
□ Scene persists with campaign
```

---

# 11. PHASE 7 — BASIC RENDERER (3D Env + 2D Sprites)

## Objective

Visual representation using 3D environments with 2D character sprites.

## Renderer Architecture

```text
┌─────────────────────────────────────────┐
│  RENDERER (Three.js + React Three Fiber)│
├─────────────────────────────────────────┤
│  Scene Layer                            │
│    - 3D environment (simple geometry)   │
│    - Background image (skybox/planes)   │
│                                         │
│  Character Layer                        │
│    - 2D sprites (billboards)            │
│    - Portrait as texture                │
│    - Name label                         │
│                                         │
│  NPC Layer                              │
│    - 2D sprites (billboards)            │
│    - Portrait as texture                │
│                                         │
│  Effects Layer                          │
│    - Fog (simple)                       │
│    - Particles (basic)                  │
│    - Lighting (directional + ambient)   │
│                                         │
│  Camera Layer                           │
│    - Orbit controls                     │
│    - Preset views                       │
└─────────────────────────────────────────┘
```

## 2D → 3D Strategy

```text
IMMEDIATE (Phase 7):
  3D Environment = Simple geometry + background image
  Characters = 2D sprites (billboards with portrait)
  NPCs = 2D sprites (billboards with portrait)

  This is "2.5D" — flat characters in 3D space

LATER (Phase 12+):
  Replace 2D sprites with 3D models
  Add animations
  Add physics
  Add advanced lighting

  Token/Identity stays the same
  Visual representation changes
```

## Frontend

```text
□ Renderer component (React Three Fiber)
□ Scene loader (loads scene config)
□ Character sprites (billboards)
□ NPC sprites (billboards)
□ Camera controls
□ Basic lighting
□ Scene background (3D planes or skybox)
```

## 3D Environment Approach

```text
Initial 3D environments use:

  □ Simple box geometry for rooms
  □ Plane geometry for floors
  □ Background images as textures
  □ Basic lighting (1-2 lights)

Example - Tavern:
  ┌──────────────────────┐
  │  [TAVERN BACKGROUND] │ ← image texture on plane
  │                      │
  │  🧑 [token]  🧑 [token] │ ← 2D sprites
  │                      │
  │  ─────────────────── │ ← floor plane
  └──────────────────────┘

This is enough for MVP.
Full 3D environments come later.
```

## Asset Checkpoint

```text
□ Upload test environment textures (tavern, forest, cave)
□ Test textures load in 3D scene
□ Test character sprites display correctly
□ Test NPC sprites display correctly
□ Test camera movement
□ Test scene switching in renderer
□ Test lighting changes
□ Verify performance with 10+ characters
□ Test asset memory management (load/unload)
```

## Exit Criteria

```text
□ 3D scene renders with background
□ Character sprites appear on scene
□ NPC sprites appear on scene
□ Camera can orbit scene
□ Basic lighting works
□ Scene switching works
□ Performance acceptable (60fps with 10 characters)
```

---

# 12. PHASE 8 — RECAP SYSTEM

## Objective

Generate session recap from events.

## Backend

```text
□ POST   /api/sessions/{sid}/recap        Generate recap
□ GET    /api/sessions/{sid}/recap        Get recap
□ PUT    /api/sessions/{sid}/recap        Update recap
```

## Recap Structure

```text
□ Previous Situation
□ Important Events
□ Character Actions
□ Consequences
□ Discoveries
□ Deaths
□ Important NPCs
□ Unresolved Threads
□ Current Situation
```

## Frontend

```text
□ Recap view (per session)
□ Recap editor
□ Recap export (markdown)
```

## Asset Checkpoint

```text
□ Test recap generation from events
□ Test recap display
□ Test recap export
□ Test recap with images (character portraits)
```

## Exit Criteria

```text
□ Can generate recap from session events
□ Can view recap
□ Can edit recap
□ Can export recap as markdown
□ Recap is chronological and coherent
```

---

# 13. PHASE 9 — VERTICAL SLICE

## Objective

Complete playable version: one campaign, one session, one scene.

## Checklist

```text
□ One campaign created
□ 3-5 characters with portraits
□ Several NPCs
□ One session started
□ Scene loaded with background
□ Characters placed on scene
□ DM controls scene
□ Events recorded
□ Session ended
□ Recap generated
□ Campaign saved
□ Campaign reloaded
□ Everything works together
```

## Testing

```text
□ Unit tests for all CRUD operations
□ Integration tests for session flow
□ Manual test: play complete session
□ Performance test: 20+ characters
□ Asset test: 50+ images loaded
```

## Release

```text
Version: 0.1.0-alpha
Status: PLAYABLE
```

---

# 14. Asset Upload Strategy

## When to Upload

```text
After Phase 1: Campaign images (logo, banner)
After Phase 2: Character portraits (5-10)
After Phase 5: Environment images (5-10 scenes)
After Phase 6: Scene assets (backgrounds, music)
After Phase 7: Test 3D textures
```

## Asset Sources

```text
DM provides:
  - Character portraits (AI-generated or drawn)
  - Scene backgrounds (AI-generated or photos)
  - Environment textures (free textures)

System provides:
  - Default tokens (colored circles with initials)
  - Placeholder backgrounds
  - Basic 3D geometry
```

## Asset Validation

```text
□ Image formats: png, jpg, webp
□ Max file size: 10MB
□ Min resolution: 256x256
□ Max resolution: 4096x4096
□ Audio formats: mp3, wav, ogg
□ Max audio size: 50MB
```

---

# 15. 3D → 2D Character Strategy

## Current Approach (MVP)

```text
Characters = 2D sprites on 3D scene

  ┌─────────────┐
  │  [PORTRAIT] │  ← flat image
  │   Name      │
  └─────────────┘

Rendered as billboard in 3D space
Always faces camera
Simple, works, fast
```

## Future Approach (Phase 12+)

```text
Characters = 3D models

  Replace sprite with 3D mesh
  Add animations (idle, walk, attack)
  Add equipment visuals
  Add special effects

Identity (name, class, stats) stays the same
Only visual representation changes
```

## Migration Path

```text
1. Characters already have visual_config_json
2. Add model_path to visual_config_json
3. Renderer checks: has model_path? → load 3D model
4. Otherwise → load 2D sprite
5. Gradually replace sprites with models
```

---

# 16. Development Order

## Recommended Sequence

```text
1. Phase 0 (finish foundation)
2. Phase 1 (campaign CRUD)
3. Phase 2 (character system)
4. Phase 3 (session system)
5. Phase 4 (event system)
6. Phase 5 (DM control UI)
7. Phase 6 (scene system)
8. Phase 7 (basic renderer)
9. Phase 8 (recap system)
10. Phase 9 (vertical slice)
```

## Parallel Work Possible

```text
Backend + Frontend can be developed in parallel
after API contracts are defined.

Phase 1-4: Backend focus
Phase 5-7: Frontend focus
Phase 8-9: Integration focus
```

---

# 17. Success Criteria

## MVP Done When

```text
□ DM can create campaign
□ DM can add characters with portraits
□ DM can start session
□ DM can load scene with background
□ DM can place characters on scene
□ DM can control scene from UI
□ DM can record events
□ DM can end session
□ DM can generate recap
□ DM can save/load campaign
□ Everything works offline
□ No internet required
```

## Quality Bar

```text
□ All CRUD operations work
□ No data loss on save/load
□ UI is responsive (<100ms)
□ Renderer runs at 60fps
□ Assets load in <2s
□ Tests pass
□ No critical bugs
```

---

# 18. Future Phases (Post-MVP)

```text
Phase 10: Narrative Engine
Phase 11: AI Agents
Phase 12: 3D Models
Phase 13: Voice Input
Phase 14: Voice Recap
Phase 15: Atmosphere System
Phase 16: Media System
Phase 17: LAN Mode
Phase 18: Multiplayer
Phase 19: Immersive Features
Phase 20: Advanced 3D
```

---

# 19. Notes

```text
- Plan is incremental: each phase produces working software
- Asset checkpoints ensure nothing breaks when adding images
- 2D characters in 3D space is sufficient for MVP
- Full 3D models come much later
- DM authority is final: AI proposes, DM approves
- Offline-first: no internet required for core features
- SQLite sufficient for MVP: no migration needed yet
```

---

# 20. Historical Session Validation

## Objective

Test entire system with real, finished sessions AND build
campaign lore simultaneously. Kill two birds with one stone.

## Dual Purpose

```text
1. VALIDATE SYSTEM
   - Verify data loads correctly
   - Test DM controls
   - Test recap generation
   - Test persistence

2. BUILD LORE
   - Import characters from past sessions
   - Import NPCs encountered
   - Import locations visited
   - Import key events
   - Start building campaign knowledge base
```

## Approach

```text
1. Create campaign structure
2. Import historical session 1 (oldest)
3. Extract: characters, NPCs, locations, events
4. Import historical session 2
5. Extract: new entities, update relationships
6. Continue for N sessions
7. System learns campaign history progressively
8. Validate at each step
```

## Lore Extraction Per Session

```text
For each historical session:
  □ Extract character appearances
  □ Extract NPC introductions
  □ Extract location discoveries
  □ Extract key events
  □ Extract relationships formed
  □ Extract items found/lost
  □ Extract quest progress
  □ Store as raw_notes + structured data
```

## Result

```text
After importing 5-10 sessions:
  - Campaign has rich character data
  - Campaign has NPC roster
  - Campaign has location map
  - Campaign has event history
  - System is validated with real data
  - Ready for new sessions
```

## Test Campaign Structure

```text
CAMPAIGN: "Cueva del Dragón"
  ├── 4 player characters (with portraits)
  ├── 6 NPCs
  ├── 3 locations
  ├── 5-10 historical sessions (imported)
  │    └── 15-20 events each
  ├── Recaps per session
  └── World state snapshot
```

## Validation Checklist

### Data Loading

```text
□ Campaign loads with all entities
□ Characters load with portraits
□ NPCs load correctly
□ Locations load with hierarchy
□ Session loads with all events
□ Recap loads correctly
□ World state reflects session end
```

### DM Controls

```text
□ Can view session history
□ Can navigate between sessions
□ Can view character details
□ Can view NPC details
□ Can view location details
□ Can see event timeline
□ Can filter events by type
□ Can see world state summary
```

### Renderer

```text
□ Scene loads with correct background
□ Characters appear on scene
□ NPCs appear on scene
□ Character positions correct
□ Lighting matches session state
```

### Persistence

```text
□ Save campaign after viewing
□ Reload campaign
□ Verify no data lost
□ Verify timestamps correct
□ Verify relationships intact
```

### Recap

```text
□ Recap displays correctly
□ Events are chronological
□ Major events highlighted
□ Character actions included
□ Unresolved threads listed
```

## Sample Data Sources

```text
Option A: Create manually in system
  - Build campaign step by step
  - Play mock session
  - Test with own data

Option B: Import from existing notes
  - Take old session notes (markdown)
  - Import as raw_notes
  - Process into events
  - Validate processing

Option C: Use campaign from ROADMAP
  - "Cueva del Dragón" example
  - Predefined characters
  - Predefined events
```

## When to Run

```text
After Phase 6 (Scene System):
  - Can test full data loading
  - Can test DM controls
  - Can test scene rendering

After Phase 8 (Recap System):
  - Can test recap generation
  - Can test full persistence cycle

During Phase 9 (Vertical Slice):
  - Final validation
  - Performance testing
  - Edge case testing
```

## Success Criteria

```text
□ Historical session loads in <2s
□ All entities display correctly
□ DM controls responsive
□ Renderer performs well
□ Save/load cycle preserves data
□ Recap is coherent and complete
□ No crashes or errors
```

---

# 21. Incremental Lore Building

## Concept

Import historical sessions progressively to build campaign
knowledge base. Each session adds context.

## Process

```text
SESSION 1 (oldest):
  Characters: Ardan, Lyra, Thorin, Mirabel
  NPCs: Varek (prisoner), Guard Captain
  Locations: Prison, Village Square
  Events: Met Varek, Escaped prison

SESSION 2:
  Characters: same + new NPC Faelan
  NPCs: Faelan (merchant), Cultist Leader
  Locations: Forest Road, Cult Hideout
  Events: Traveled to forest, Found cult

SESSION 3:
  Characters: same
  NPCs: same + new NPC Elara
  Locations: Elara's Tower, Dragon's Lair
  Events: Met Elara, Discovered dragon

... and so on
```

## What Gets Stored

```text
PER SESSION:
  □ Raw notes (markdown)
  □ Extracted events (structured)
  □ Character status changes
  □ NPC introductions
  □ Location discoveries
  □ Relationship changes
  □ Item acquisitions
  □ Quest progress

CUMULATIVE:
  □ Character history
  □ NPC roster
  □ Location map
  □ Event timeline
  □ Relationship graph
  □ World state evolution
```

## Knowledge Base Growth

```text
After Session 1:
  Knowledge = minimal (just session data)

After Session 5:
  Knowledge = moderate (character arcs, NPC roster, locations)

After Session 10:
  Knowledge = rich (full campaign history, relationships)

After Session 20:
  Knowledge = comprehensive (world state, lore, patterns)
```

## Future AI Use

```text
This knowledge base enables:
  □ Lore queries ("What happened at the cult hideout?")
  □ Character history ("What does Varek know?")
  □ Relationship mapping ("Who are allies?")
  □ Event tracking ("When did the dragon appear?")
  □ Context for new sessions
  □ Recap generation from history
```

## Validation

```text
□ Can import session notes
□ Can extract entities from notes
□ Can link entities across sessions
□ Can track character progression
□ Can track NPC appearances
□ Can build location hierarchy
□ Can generate timeline from events
□ Can query knowledge base
```

---

# 22. PHASE 10 — FICHAS DE JUGADOR

## Objetivo

Sistema de fichas de personaje para cada jugador.

**Requisito del DM**: Cada jugador necesita ver su ficha de personaje con el estado actual.
Si no es posible el estado completo, al menos una ficha inicial.

## Funcionalidades

### Ficha de Personaje
```text
□ Ver ficha de personaje
□ Editar ficha (solo DM)
□ Imprimir ficha
□ Exportar ficha (PDF/Markdown)
□ Versiones de ficha (historial)
```

### Contenido de Ficha
```text
□ Información básica (nombre, clase, raza, nivel)
□ Estadísticas (HP, AC, habilidades)
□ Habilidades y talentos
□ Inventario
□ Hechizos (si aplica)
□ Antecedentes
□ Notas del jugador
□ Retrato de personaje
□ Estado actual (HP, condiciones, ubicación)
```

### Permisos
```text
□ DM puede ver todas las fichas
□ Jugador solo ve su ficha
□ Jugador puede editar notas propias
□ DM controla qué campos son editables
```

## Backend

```text
□ GET    /api/campaigns/{id}/characters/{cid}/sheet    Ver ficha
□ PUT    /api/campaigns/{id}/characters/{cid}/sheet    Actualizar ficha
□ GET    /api/campaigns/{id}/characters/{cid}/sheet/history  Historial
□ POST   /api/campaigns/{id}/characters/{cid}/sheet/print    Generar PDF
```

## Frontend

```text
□ Vista de ficha de personaje
□ Editor de ficha (para DM)
□ Vista de impresión
□ Historial de cambios
□ Ficha inicial (template)
```

## Ficha Inicial (Template)

```text
Para cuando no hay estado completo:

FICHA INICIAL
├── Nombre: [Nombre del personaje]
├── Clase: [Clase]
├── Raza: [Raza]
├── Nivel: [Nivel]
├── HP: [HP máximo]
├── AC: [Armadura]
├── Habilidades: [Lista]
├── Inventario: [Lista básica]
├── Hechizos: [Lista si aplica]
└── Notas: [Espacio libre]
```

## Checkpoint de Assets

```text
□ Probar vista de ficha de personaje
□ Probar edición de ficha
□ Probar impresión de ficha
□ Probar historial de cambios
□ Verificar persistencia de fichas
□ Probar permisos de jugador
```

## Criterios de Salida

```text
□ Cada jugador puede ver su ficha
□ DM puede editar todas las fichas
□ Fichas persisten entre sesiones
□ Historial de cambios funciona
□ Ficha inicial disponible
□ Impresión funciona
□ Permisos correctos
```

---

# 23. PHASE 11 — SISTEMA DE MAPAS

## Objetivo

Soporte para imágenes de mapas en campañas.

**Requisito del DM**: Necesita imágenes del mapa para las sesiones.

## Funcionalidades

### Gestión de Mapas
```text
□ Subir imagen de mapa
□ Editar mapa (nombre, descripción)
□ Eliminar mapa
□ Organizar mapas por campaña
□ Asignar mapa a sesión
```

### Visualización
```text
□ Ver mapa en panel DM
□ Ver mapa en sesión
□ Zoom de mapa
□ Navegación de mapa
□ Marcadores en mapa
□ Capas de mapa (si aplica)
```

### Mapas por Campaña
```text
□ Mapa mundial (overview)
□ Mapas regionales
□ Mapas de ubicación (dungeon, edificio)
□ Mapas de batalla
□ Mapas personalizados
```

### Marcadores
```text
□ Crear marcador en mapa
□ Mover marcador
□ Eliminar marcador
□ Asignar marcador a personaje/NPC
□ Color de marcador por tipo
□ Notas en marcador
```

## Backend

```text
□ POST   /api/campaigns/{id}/maps              Subir mapa
□ GET    /api/campaigns/{id}/maps              Listar mapas
□ GET    /api/campaigns/{id}/maps/{mid}        Ver mapa
□ PUT    /api/campaigns/{id}/maps/{mid}        Actualizar mapa
□ DELETE /api/campaigns/{id}/maps/{mid}        Eliminar mapa
□ POST   /api/campaigns/{id}/maps/{mid}/markers  Crear marcador
□ PUT    /api/campaigns/{id}/maps/{mid}/markers/{mkid}  Actualizar marcador
□ DELETE /api/campaigns/{id}/maps/{mid}/markers/{mkid}  Eliminar marcador
```

## Frontend

```text
□ Lista de mapas
□ Vista de mapa (con zoom y navegación)
□ Editor de mapas
□ Panel de marcadores
□ Asignación de mapa a sesión
□ Mapa en vista de sesión
```

## Estructura de Assets

```text
assets/
  maps/
    {campaign_id}/
      {map_id}/
        map.png           ← imagen del mapa
        markers.json      ← marcadores
        thumbnail.png     ← miniatura
```

## Formatos Soportados

```text
□ PNG
□ JPG
□ JPEG
□ WEBP
□ SVG (futuro)
```

## Checkpoint de Assets

```text
□ Subir imágenes de mapa de prueba
□ Probar visualización de mapa
□ Probar zoom y navegación
□ Probar creación de marcadores
□ Probar asignación de mapa a sesión
□ Verificar rendimiento con mapas grandes
□ Probar persistencia de mapas
```

## Criterios de Salida

```text
□ Puede subir imagen de mapa
□ Puede ver mapa en panel DM
□ Puede ver mapa en sesión
□ Puede crear y mover marcadores
□ Puede asignar mapa a campaña
□ Puede asignar mapa a sesión
□ Mapas persisten entre sesiones
□ Rendimiento aceptable
□ Marcadores funcionan correctamente
```

---

# 24. Resumen de Fases Actualizado

```text
PHASE 0  Fundación              (actual)
  ✓ FastAPI app
  ✓ SQLAlchemy models
  ✓ TypeScript types
  ✓ React app scaffold
  □ Configuración pendiente

PHASE 1  Campaign CRUD
  □ CRUD completo de campañas
  □ UI de campañas

PHASE 2  Sistema de Personajes
  □ CRUD de personajes
  □ CRUD de NPCs
  □ UI de personajes

PHASE 3  Sistema de Sesiones
  □ Ciclo de vida de sesiones
  □ UI de sesiones

PHASE 4  Sistema de Eventos
  □ Registro de eventos
  □ Flujo de canon

PHASE 5  Dashboard DM (Superadmin) ← PRIORIDAD
  □ Panel principal de administración
  □ Gestión de jugadores
  □ Gestión de assets
  □ Control completo de sesión

PHASE 6  Sistema de Escenas
  □ Escenas con fondos
  □ Tokens de personajes

PHASE 7  Renderer Básico
  □ Entorno 3D simple
  □ Sprites 2D

PHASE 8  Sistema de Recaps
  □ Generación de recaps
  □ Exportación

PHASE 9  Slice Vertical
  □ Prueba completa
  □ Validación

PHASE 10  Fichas de Jugador ← NUEVO
  □ Sistema de fichas
  □ Permisos
  □ Historial

PHASE 11  Sistema de Mapas ← NUEVO
  □ Gestión de mapas
  □ Marcadores
  □ Visualización

PHASE 12  Sistema de Dados ← NUEVO
  □ 6 tipos de dados (d4, d6, d8, d10, d12, d20)
  □ Modal de tirada
  □ Cantidad 1-10 dados por tirada
  □ Historial de tiradas
  □ Sistema de iniciativa
  □ DM tira por enemigos/NPCs
  □ Panel de orden de turnos

PHASE 13  Cuaderno de Decisiones DM ← NUEVO
  □ Notas tipo Notion
  □ Reglas del DM (editables)
  □ Decisiones de sesión
  □ Historial de versiones
  □ Vinculación con entidades
  □ Persistencia automática
```

---

# 25. Orden de Desarrollo Recomendado

## Secuencia

```text
1. Phase 0 (terminar fundación)
2. Phase 1 (campaign CRUD)
3. Phase 5 (Dashboard DM) ← PRIORIDAD POR REQUISITO DEL DM
4. Phase 2 (sistema de personajes)
5. Phase 10 (fichas de jugador)
6. Phase 11 (sistema de mapas)
7. Phase 12 (sistema de dados)
8. Phase 13 (cuaderno de decisiones) ← NUEVO
9. Phase 3 (sistema de sesiones)
10. Phase 4 (sistema de eventos)
11. Phase 6 (sistema de escenas)
12. Phase 7 (renderer básico)
13. Phase 8 (sistema de recaps)
14. Phase 9 (slice vertical)
```

## Justificación

```text
PHASE 5 PRIMERO porque:
- DM es el usuario principal
- Necesita panel para cargar todo
- Permite probar flujo completo
- Base para funcionalidades posteriores

PHASE 10, 11, 12, 13 DESPUÉS porque:
- Son requisitos explícitos del DM
- Fichas = información de jugadores
- Mapas = visualización de escenarios
- Dados = mecánica de juego
- Cuaderno = notas y decisiones del DM
- Complementan el dashboard
```

---

# 26. Notas

```text
- Plan es incremental: cada fase produce software funcionando
- Puntos de control de assets aseguran que nada se rompa al agregar imágenes
- Personajes 2D en espacio 3D es suficiente para MVP
- Modelos 3D completos vienen mucho después
- Autoridad del DM es final: IA propone, DM aprueba
- Offline-first: no se requiere internet para funcionalidades core
- SQLite suficiente para MVP: no se necesita migración aún
- Dashboard DM como superadmin es prioridad por requisito del DM
- Fichas de jugador son necesarias para sistema de jugadores secundarios
- Mapas son necesarios para visualización de escenarios
- Sistema de dados: 6 tipos (d4, d6, d8, d10, d12, d20), máximo 10 por tirada
- d6 es el dado principal, los demás son ocasionales
- El usuario selecciona tipo y cantidad (ej: 3d6)
- Iniciativa: DM annuncia, jugadores tiran, DM tira por enemigos
- DM controla el orden de turnos y flujo del combate
- DM tiene reglas dinámicas que pueden cambiar
- DM quiere anotar todo tipo Notion
- Cuaderno de decisiones: notas, reglas, decisiones, versiones
- Todo debe persistir y poder editarse
- IA 3D: Estrategia híbrida (MVP=2D, Post-MVP=assets 3D, Futuro=escenas completas)
- Modelos open-source: TripoSR (8GB), TRELLIS.2 (24GB), Hunyuan3D (16GB)
- Pendiente: info del DM sobre mecánica de salvada especial
```
