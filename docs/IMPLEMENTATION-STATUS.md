# IMPLEMENTATION-STATUS.md

> Living document tracking implementation progress across all Roleito systems.
>
> Update this file as work progresses.

---

# 1. Status Legend

| Status | Meaning |
|--------|---------|
| **Implemented** | Code exists and works |
| **In Progress** | Active development |
| **Planned** | Designed in docs, not coded |
| **Stub** | Minimal placeholder code |
| **Not Started** | No code, no design |

---

# 2. Core Systems Status

## Scene Graph
Reference: `SCENE-GRAPH.md` (29,606 bytes)

| Item | Status | Notes |
|------|--------|-------|
| Item System | Implemented | `ItemRenderer.tsx` |
| Layer System | Partial | z-index parcial en overlays |
| zIndex Management | Partial | Orden por capas en SceneRenderer |
| Attachments | Planned | Parent-child relationships defined |
| Shape Rendering | Implemented | Canvas overlays (fog, walls, lights) |
| Event System Integration | Implemented | Scene events via bus (`core/events/`) |

## Map Analysis
Reference: `MAP-ANALYSIS.md` (20,382 bytes)

| Item | Status | Notes |
|------|--------|-------|
| Image Ingestion | Implemented | Upload BG + grid-snap drag/drop |
| Grid Detection | Partial | Grid manual/snap; auto Hough diseñado |
| Feature Detection | Partial | Walls manuales via WallDrawer |
| Semantic Interpretation | Planned | AI-assisted room labeling |
| DM Authoring Tools | Implemented | WallDrawer, fog tools, markers, lights |

## Fog of War
Reference: `FOG-AND-VISIBILITY.md` (15,433 bytes)

| Item | Status | Notes |
|------|--------|-------|
| Static Fog | Implemented | `FogOverlay.tsx` + `core/scene/fogMask.ts` |
| Dynamic Fog | Implemented | Brush/rect updates (`FogBrushCanvas`, `FogRectCanvas`) |
| LoS Raycasting | Implemented | `core/scene/wall-collision.ts` + raycast (specs verdes) |
| GPU Masking | Implemented | Mask canvas + overlay en `SceneRenderer.tsx` |
| DM Fog Tools | Implemented | Brush, fill, reveal, hide en dashboard |
| Player Visibility | Implemented | Per-player fog vía snapshot push por WebSocket (fallback polling si WS cae) |

## Walls & Line of Sight
Reference: `WALLS-AND-LINE-OF-SIGHT.md` (21,246 bytes)

| Item | Status | Notes |
|------|--------|-------|
| Wall Entities | Implemented | `WallDrawer.tsx` + `WallDrawerCanvas` |
| Door System | Implemented | `WallContextMenu.tsx` (open/close/locked) |
| LoS Raycasting | Implemented | `core/scene/wall-collision.ts` + rays |
| Visibility Mask | Implemented | Hybrid shadow geometry (HYBRID-SHADOW-GEOMETRY.md, canon) |
| Movement Pathfinding | Planned | A* on walkable grid |

## Lighting System
Reference: `LIGHTING-SYSTEM.md` (28,550 bytes)

| Item | Status | Notes |
|------|--------|-------|
| Light Sources | Implemented | `LightPlaceCanvas.tsx` + `core/scene/light.ts` |
| Light Propagation | Implemented | `core/scene/light.ts` (glow/falloff) |
| Wall Occlusion | Implemented | `core/scene/lightOcclusion.ts` |
| DM Lighting Tools | Implemented | Placement canvas + `/api/.../light-requests` |
| Light Presets | Partial | Torch/daylight presets parciales |

## Asset System
Reference: `ASSET-SYSTEM.md` (19,374 bytes)

| Item | Status | Notes |
|------|--------|-------|
| Asset Manifest | Partial | `data/assets/` + `tts_config.json` |
| Asset Loading | Implemented | Serving vía `/api/static` (imgs, audio, 3D) |
| Asset Browser | Implemented | Drag-drop de recursos al mapa (item imagen) |
| AI Generation | Planned | Prompt-based asset creation |

## 3D Rendering
Reference: `2D-TO-3D.md` (34,685 bytes), `3D-RENDERER.md` (118 bytes)

| Item | Status | Notes |
|------|--------|-------|
| 2D to 3D Mapping | Implemented | `SceneRenderer.tsx` levanta escena desde mapa 2D |
| Camera Systems | Implemented | Movimiento camara en SceneRenderer/PlayerView |
| Character Models | Implemented | `TokenSprite.tsx` + `TokenModel.tsx` + glow |
| Environment | Implemented | BG, items, walls, fog en escena 3D |
| Fog in 3D | Implemented | Overlay de niebla sobre escena (SceneRenderer) |
| Weather/FX atmosphere | Implemented | `Scene.weather` (7 variantes: rain/rainDrizzle/rainStorm, snow/snowBlizzard, fog/fogDense) + `Scene.weather_intensity` (0.25×–4×) — partículas three.js en WeatherFX.tsx + filtro tint (SceneRenderer), switcher agrupado por tipo + slider en DmDashboard, sync a PlayerView vía snapshot+WS |

> Nota: el render 3D vive DENTRO de `apps/dm` (decisión AGENTS.md). `apps/renderer` queda placeholder intencional.

---

# 3. Frontend Status

## DM Dashboard (`apps/dm/`)

### Pages (Implemented)
| Page | Status | Path |
|------|--------|------|
| Campaign List | Implemented | `pages/CampaignList.tsx` |
| Campaign Form | Implemented | `pages/CampaignForm.tsx` |
| Campaign Detail | Implemented | `pages/CampaignDetail.tsx` |
| Character List | Implemented | `pages/CharacterList.tsx` |
| Character Form | Implemented | `pages/CharacterForm.tsx` |
| Character Detail | Implemented | `pages/CharacterDetail.tsx` |
| Session List | Implemented | `pages/SessionList.tsx` |
| Session Form | Implemented | `pages/SessionForm.tsx` |
| Session Detail | Implemented | `pages/SessionDetail.tsx` |
| Event List | Implemented | `pages/EventList.tsx` |
| Event Detail | Implemented | `pages/EventDetail.tsx` |
| NPC List | Implemented | `pages/NPCList.tsx` |
| NPC Form | Implemented | `pages/NPCForm.tsx` |
| NPC Detail | Implemented | `pages/NPCDetail.tsx` |
| Scene List | Implemented | `pages/SceneList.tsx` |
| Scene Detail | Implemented | `pages/SceneDetail.tsx` |
| Map List | Implemented | `pages/MapList.tsx` |
| Player List | Implemented | `pages/PlayerList.tsx` |
| Player View | Implemented | `pages/PlayerView.tsx` |
| World State View | Implemented | `pages/WorldStateView.tsx` |
| Memory View | Implemented | `pages/MemoryView.tsx` |
| Narrative Engine | Implemented | `pages/NarrativeEngine.tsx` |
| TTS Panel | Implemented | `pages/TTSPanel.tsx` |
| Agent Panel | Implemented | `pages/AgentPanel.tsx` |
| Asset List | Implemented | `pages/AssetList.tsx` |
| DM Dashboard | Implemented | `pages/DmDashboard.tsx` |

### Components (Implemented)
| Component | Status | Path |
|-----------|--------|------|
| Layout | Implemented | `components/Layout.tsx` |
| TopBar | Implemented | `components/TopBar.tsx` |
| Scene Renderer | Implemented | `components/SceneRenderer.tsx` |
| Map Viewer | Implemented | `components/MapViewer.tsx` |
| Character Sheet | Implemented | `components/CharacterSheet.tsx` |
| Initiative Tracker | Implemented | `components/InitiativeTracker.tsx` |
| Dice Roller | Implemented | `components/DiceRoller.tsx` |
| Token Sprite | Implemented | `components/TokenSprite.tsx` |
| Token Model | Implemented | `components/TokenModel.tsx` |
| DM Notebook HUD | Implemented | `components/DMNotebookHud.tsx` |
| Scene Notes HUD | Implemented | `components/SceneNotesHud.tsx` |
| Session Log HUD | Implemented | `components/SessionLogHud.tsx` |
| Quick Actions HUD | Implemented | `components/QuickActionsHud.tsx` |
| Scene Settings HUD | Implemented | `components/SceneSettingsHud.tsx` |
| HUD Panel | Implemented | `components/HudPanel.tsx` |
| DMAssistant | Implemented | `components/DMAssistant.tsx` |
| Context Menu | Implemented | `components/ContextMenu.tsx` |
| Vida Display | Implemented | `components/VidaDisplay.tsx` |
| Vida Inputs | Implemented | `components/VidaInputs.tsx` |
| Recap Panel | Implemented | `components/RecapPanel.tsx` |
| Toast Container | Implemented | `components/ToastContainer.tsx` |
| Pin Login | Implemented | `components/PinLogin.tsx` |
| Minimized Bar | Implemented | `components/MinimizedBar.tsx` |
| AI Settings Panel | Implemented | `components/AISettingsPanel.tsx` |

### Components (Not Yet Built)
| Component | Status | Notes |
|-----------|--------|-------|
| Fog Tools Panel | Not Started | DM fog brush/reveal |
| Wall Tools Panel | Not Started | Wall drawing/editing |
| Lighting Tools Panel | Not Started | Light source placement |
| Asset Browser | Implemented | Drag-drop asset picker |
| Player HUD | Not Started | Player-side controls |

### Infrastructure
| Item | Status | Path |
|------|--------|------|
| Vite Config | Implemented | `vite.config.ts` |
| Tailwind | Implemented | `tailwind.config.js` |
| TypeScript | Implemented | `tsconfig.json` |
| API Client | Implemented | `src/lib/api.ts` |
| Auth Context | Implemented | `src/contexts/AuthContext.tsx` |
| App Entry | Implemented | `src/App.tsx` |
| Main Entry | Implemented | `src/main.tsx` |
| CSS | Implemented | `src/index.css` |

## Player View (`apps/player/`)
| Item | Status | Notes |
|------|--------|-------|
| Basic View | Stub | `.gitkeep` only |

## 3D Renderer (`apps/renderer/`)
| Item | Status | Notes |
|------|--------|-------|
| Basic View | Stub | `.gitkeep` only |

---

# 4. Backend Status

## FastAPI Server (`backend/`)

### Setup
| Item | Status | Path |
|------|--------|------|
| FastAPI App | Implemented | `main.py` |
| CORS | Implemented | `main.py` |
| Static Files | Implemented | `main.py` |
| Database Init | Implemented | `database.py` |
| SQLAlchemy Models | Implemented | `models.py` |
| Pydantic Schemas | Implemented | `schemas.py` |

### Routes (Implemented)
| Route | Status | Path |
|-------|--------|------|
| Campaign CRUD | Implemented | `routes.py` |
| Character CRUD | Implemented | `character_routes.py` |
| Ability Catalog | Implemented | `character_routes.py`, `GET /campaigns/{id}/abilities` |
| Ability Icon | Implemented | `character_routes.py`, `PUT/DELETE /abilities/{id}/icon`, `POST /abilities/{id}/icon` |
| Session CRUD | Implemented | `session_routes.py` |
| Event CRUD | Implemented | `event_routes.py` |
| Player Management | Implemented | `player_routes.py` |
| Scene Management | Implemented | `scene_routes.py` |
| Map Markers | Implemented | `map_marker_routes.py` |
| Notebook | Implemented | `notebook_routes.py` |
| AI Integration | Implemented | `ai_routes.py` |
| Narrative | Implemented | `narrative_routes.py` |
| Agent System | Implemented | `agent_routes.py` |
| TTS | Implemented | `tts_routes.py` |
| World State | Implemented | `world_routes.py` |
| Memory | Implemented | `memory_routes.py` |
| Orchestrator | Implemented | `orchestrator_routes.py` |
| Event Bus | Implemented | `event_bus_routes.py` |
| Canon | Implemented | `canon_routes.py` |
| Auth | Implemented | `auth_routes.py` |
| Vault | Implemented | `vault_routes.py` |
| Dice | Implemented | `dice_routes.py` |

### Database Models (Implemented)
| Model | Status | Notes |
|-------|--------|-------|
| Campaign | Implemented | Full fields, relationships |
| Session | Implemented | Number, date, status |
| Character | Implemented | Stats, inventory, spells |
| NPC | Implemented | Similar to Character |
| Ability | Implemented | Catálogo de campaña (antes `spells_json` blob), con `icon` |
| CharacterAbility | Implemented | PK compuesta `entity_type`/`entity_id`/`ability_id` |
| Event | Implemented | Type, narrative, outcomes |
| Scene | Implemented | Map reference, atmosphere |
| Map | Implemented | Image, grid settings |
| MapMarker | Implemented | Position, type, visibility |
| DiceRoll | Implemented | Formula, result, owner |
| MemoryEntry | Implemented | Tiered memory system |
| WorldState | Implemented | Active state snapshot |
| NotebookEntry | Implemented | DM notes |
| Recap | Implemented | Session summaries |
| Player | Implemented | Auth, role, PIN |

### Infrastructure
| Item | Status | Notes |
|------|--------|-------|
| Event Bus | Implemented | `core/events/bus.py` |
| Event Handlers | Implemented | `core/events/handlers.py` |
| World Engine | Implemented | `core/world/engine.py` |
| World Models | Implemented | `core/world/models.py` |
| Domain Types | Implemented | `core/domain/types.ts` |
| AI Provider | Implemented | `infrastructure/ai/` |
| TTS Provider | Implemented | `infrastructure/tts/` |
| Search | Implemented | `infrastructure/search/` |
| Storage | Implemented | `infrastructure/storage/` |

---

# 5. Documentation Status

| Document | Status | Bytes | Notes |
|----------|--------|-------|-------|
| CONTEXT.md | Implemented | 15,152 | Project context |
| PRODUCT.md | Implemented | 1,964 | Product vision |
| DOMAIN.md | Implemented | 21,746 | Domain model |
| ARCHITECTURE.md | Implemented | 30,328 | System architecture |
| DATABASE.md | Implemented | 21,311 | SQLite schema |
| EVENT-SYSTEM.md | Implemented | 22,431 | Event pipeline |
| SCENE-GRAPH.md | Implemented | 29,606 | Scene graph design |
| MAP-ANALYSIS.md | Implemented | 20,382 | Map ingestion design (AI, mejora futura) |
| HYBRID-SHADOW-GEOMETRY.md | Implemented | - | Hybrid manual+IA walls/vision/fog (canon) |
| FOG-AND-VISIBILITY.md | Implemented | 15,433 | Fog of war design |
| WALLS-AND-LINE-OF-SIGHT.md | Implemented | 21,246 | Walls/LoS design |
| LIGHTING-SYSTEM.md | Implemented | 28,550 | Lighting design |
| ASSET-SYSTEM.md | Implemented | 19,374 | Asset management design |
| 2D-TO-3D.md | Implemented | 34,685 | 2D to 3D conversion |
| OWLBEAR-REFERENCE.md | Implemented | 11,965 | Owlbear rodeo reference |
| DM-DASHBOARD-VTT.md | Implemented | 18,230 | VTT UI design |
| CONTEXT-SYSTEM.md | Implemented | 31,857 | Context hierarchy |
| SESSION-SYSTEM.md | Implemented | 34,042 | Session management |
| WORLD-STATE.md | Implemented | 34,025 | World state design |
| SECURITY.md | Implemented | 22,713 | Security model |
| TESTING.md | Implemented | 26,779 | Test strategy |
| PERFORMANCE.md | Implemented | 23,816 | Performance targets |
| INGESTION-AND-LORE.md | Implemented | 31,602 | Lore ingestion |
| DATA-MODEL.md | Implemented | 25,637 | Data model |
| DATA-DIRECTORY.md | Implemented | 25,501 | Data directory layout |
| AGENTS.md | Implemented | 23,098 | Agent specification |
| AGENTS-SYSTEM.md | Implemented | 26,021 | Agent system design |
| DM-CONTROLLER.md | Implemented | 27,942 | DM control design |
| DM-SUPER-ADMIN.md | Implemented | 17,449 | DM admin design |
| DICE-SYSTEM.md | Implemented | 11,957 | Dice rolling |
| CHARACTER-STATS.md | Implemented | 7,590 | Character statistics |
| CHARACTER-PERSISTENCE.md | Implemented | 9,331 | Character storage |
| CAMERA-SYSTEM.md | Implemented | 10,652 | Camera controls |
| ENVIRONMENT-SPEC.md | Implemented | 17,436 | Environment design |
| PLAYER-VIEW.md | Implemented | 8,624 | Player client design |
| ROADMAP.md | Implemented | 22,082 | Development roadmap |
| MVP-PLAN.md | Implemented | 40,501 | MVP plan |
| E2E-TEST-PLAN.md | Implemented | 14,271 | End-to-end test plan |
| FIX-PLAN.md | Implemented | 25,759 | Known fixes |
| SETTING-INGESTION.md | Implemented | 22,268 | Setting import |
| DM-NOTEBOOK.md | Implemented | 13,599 | Notebook feature |
| SESSION-MANAGEMENT.md | Implemented | 10,115 | Session lifecycle |
| PLAN-TOKENS-TABLERO.md | Implemented | 10,842 | Token/board plan |
| PLAN-UI-RESPONSIVE.md | Implemented | 7,330 | Responsive UI plan |
| FOG-OF-WAR.md | Implemented | 10,836 | Fog of war (alt) |
| IMPLEMENTATION-STATUS.md | This File | - | Living status doc |
| AI-3D-ENVIRONMENTS.md | Implemented | 4,570 | AI 3D environments |
| README.md | Implemented | 2,162 | Project readme |
| 3D-RENDERER.md | Stub | 118 | Placeholder |
| ARCHITECTURE.md | Needs Update | 30,328 | Lags behind decisions |

---

# 6. Phase Roadmap Status

Reference: `ROADMAP.md` (22,082 bytes)

| Phase | Name | Status | Notes |
|-------|------|--------|-------|
| 0 | Foundation | Implemented | Project structure, config, DB init |
| 1 | Campaign Core | Implemented | CRUD + export + import roundtrip (remap de refs) |
| 2 | Character System | Partially | Models + UI exist, relationships incomplete |
| 3 | Session System | Partially | Models + UI exist, session flow partial |
| 4 | DM Control | Implemented | Dashboard VTT: status, iniciativa, transiciones, recap, notas, dados, TTS |
| 5 | Scene System | Implemented | `scene_routes` + SceneRenderer + escena auto-creada al subir BG |
| 6 | Renderer | Implemented | R3F dentro de apps/dm (SceneRenderer/PlayerView); apps/renderer placeholder |
| 7 | 2D to 3D | Implemented | Escena 3D desde mapa 2D: walls, items, fog, glow |
| 8 | Narrative Engine | Partial | Routes exist, AI integration basic |
| 9 | Event Pipeline | Partial | Event bus exists, extraction partial |
| 10 | Recap System | Partial | Routes exist, generation via AI |
| 11 | Memory System | Implemented | `memory_routes` + tiers + 10 tests e2e |
| 12 | AI Agents | Stub | Agent routes exist, no real agents |
| 13 | DM Voice Input | Not Started | No code |
| 14 | Voice Recap | Implemented | TTS completo: `tts_routes`, panel UI, 10 tests e2e |
| 15 | Atmosphere System | Not Started | No code |
| 16 | Media System | Partially | Audio ambience implementado (`Scene.audio_path` + upload/player DM y jugador). Handouts implementado completo (backend + panel DM + panel jugador) |
| 17 | LAN Mode | Not Started | No code |
| 18 | Multiplayer Sync | Not Started | No code |
| 19 | Immersive Features | Not Started | No code |
| 20 | Advanced 3D | Not Started | No code |

---

# 7. Key Observations

## Strengths
- Extensive documentation covering all major systems
- Backend has solid CRUD for all core entities
- DM dashboard has comprehensive page structure
- Event bus architecture is in place
- Database migrations system works
- AI/TTS infrastructure decoupled

## Gaps
- Import/export **completo**: cubre entidades core + VTT + assets binarios (base64 ≤8MB, refs re-absolutizadas) + `asset_rows` (metadatos de Asset) + dice_rolls + combats + combat_combatants + quests + campaign_calendars + progress_clocks, con remap de IDs (scene/char/npc/combat)
- Refs internos de `items_json` **remapeados**: `metadata.attachedTo` (luz → scene_characters) y portales/zonas (refs intra-escena, sin remap necesario) tras import
- Real-time sync (WebSocket) **implementado**: `/api/ws/invite/{code}` (room por campaña) empuja revisión tras mutaciones player-visible (scene sync/items/characters/move, character/npc PUT); PlayerView escucha push con fallback de polling 16ms solo si el WS no conecta. DM dashboard sigue polling 100ms (no cubierto)
- `apps/player` / `apps/renderer` placeholders (vista jugador vive en apps/dm por decisión AGENTS.md)
- AI agents reales: orchestrator stub (fase 12)
- Grid auto-detection (Hough) diseñado, no implementado — grid manual + snap
- Audio ambience (Fase 16) **implementada**: `Scene.audio_path` con UI en SceneDetail (upload/quitar + player) y reproducción loop por escena activa en PlayerView (toggle 🔊/🔇, arranca tras gesto, swap automático al cambiar escena; broadcast WS incluido).
- Weather/FX atmosphere (Fase 15, parcial) **implementada**: `Scene.weather` (7 variantes sobre 3 componentes — lluvia Points 16-24 u/s, nieve Points, niebla Planes con textura radial; tint CSS por clima; las variantes son multiplicadores, ver la entrada de abajo) — switcher "Clima" en DmDashboard (junto a lighting), render en SceneRenderer (DM + PlayerView + SceneDetail), entra en revision/snapshot → broadcast WS; migraciones `scenes.weather` + `scenes.weather_intensity` en database.py. OJO: la lluvia pasó de LineSegments a Points porque con cámara casi cenital un segmento vertical de 1px se escorza y "flota"
- Intensidad de clima **implementada**: `Scene.weather_intensity` (Float, default 1.0, 0.25×–4×) con slider en el dashboard DM (debounce 250ms, feedback inmediato en `setActiveScene`); escala lluvia, nieve y niebla con el mismo `clampWeatherIntensity`; buffers de partículas alocados para el peor caso (intensidad máxima × variante más densa) porque `setDrawRange` solo recorta. Persiste por escena y llega al jugador vía snapshot
- Real-time sync (WebSocket) **implementado**: `/api/ws/invite/{code}` (room por campaña) empuja revisión tras mutaciones player-visible (scene sync/items/characters/move/PUT scene, character/npc PUT); `/api/ws/campaigns/{id}` para el dashboard DM (mata el polling 100ms). PlayerView escucha push con fallback de polling 16ms solo si el WS no conecta. Sin auth en el WS DM (mismo modelo que el WS de invite); solo emite el hash sha1 de 16 chars de `compute_player_revision`
- `ContextMenu` tiene `data-testid="context-menu"` — el locator por clase `div.fixed.z-50` quedó ambiguo cuando los dropdowns de clima y lighting pasaron a `position: fixed` (aparecen antes en el DOM)
- **Fuego colocable implementado**: `LightMetadata.fx: 'flame' | 'embers'` + `fxRadius` (fracción del alto del mapa). El DM lo elige en el toolbar de "Luz (colocar)" — chips `—` / 🔥 / ✨ y un slider de radio que solo aparece con fuego. El render es el MISMO `FireParticles` del status `burning` de un personaje, replicado N veces en un círculo que el DM posiciona con clic. Tres uniforms propios para poder ajustarlo sin tocar el personaje ardiendo: `uSway` (apertura lateral), `uThickness` (grosor del punto) y `uScale` (que arrastra alto y tamaño a la vez, por eso los otros dos existen). `withLight={false}` porque estas luces ya traen su propio PointLight. Renderiza en `SceneRenderer` y no en `ItemRenderer` (evita ciclo de imports). Tests: e2e `E-l5` (roundtrip de `fx`/`fxRadius`) y `E-l6` (el DM elige 🔥 y el item colocado lo guarda); unit en `light.spec.ts` de que el default del radio cae dentro del rango del slider
- **Variantes de clima implementadas**: `WEATHER_META` pasó de 3 entradas a 7 (`rain`/`rainDrizzle`/`rainStorm`, `snow`/`snowBlizzard`, `fog`/`fogDense`). Las 3 ids viejas quedan con multiplicadores 1 porque hay escenas guardadas con esos strings. Las variantes no son shaders nuevos: cada familia tiene un `kind` y tres multiplicadores (`speed`/`density`/`grain`) sobre el mismo componente. OJO: en niebla `density` es opacidad y `grain` es tamaño de blob, no cantidad de partículas — por eso se llama `density` y no `count`. El menú agrupa por tipo con encabezados, NO con submenús anidados: un submenú real sería `hover()` y en táctil no abre (prioridad 4 del roadmap). Tests: e2e `W5` (los tres encabezados, tres variantes de familias distintas que persisten con su propio id, y `rain` viejo sigue funcionando)
- **Bug corregido (variantes)**: `N_RAIN_MAX`/`N_SNOW_MAX` se alocaban solo para `N × WEATHER_INTENSITY_MAX` y no por la densidad de la variante, así que el `Math.min` se comía el multiplicador en silencio — la ventisca a 4× pedía 1920 partículas contra un tope de 1280 y perdía un tercio de la diferencia sin avisar. Ahora el tope lleva `MAX_VARIANT_DENSITY` (2.4) adentro. **Tensión conocida**: si se agrega una variante con densidad > 2.4, o se sube `MAX_VARIANT_DENSITY`, el buffer queda corto y el recorte vuelve a ser silencioso. El bucle de `useFrame` itera en JS, no en la GPU: el peor caso es ~5000 partículas por frame.
- Quedan de fase 15: nieve fina y filtros por debajo del preset; voice input DM (fase 13) y media (16) siguen verdes
- Handouts **fase 1 implementada** (entrega): tabla `handouts` (title, content, `image_path` absoluto bajo `data/assets/{cid}/handouts/{hid}`, `visible_to_players`), `backend/handout_routes.py` (CRUD + upload/clear de imagen, cada mutación con `broadcast_revision`), `api.handouts` y panel DM `HandoutPanel.tsx` (botón 🗂, crear/editar, 👁 visibilidad, subir/quitar imagen, borrar)
- Handouts **fase 2 implementada** (lectura): `PlayerHandoutPanel.tsx` en `PlayerView` (botón 🗂, cards colapsables, texto con `whitespace-pre-wrap` e imagen servida por `/api/static`), recarga al abrir + `⟳ Recargar` + refetch cuando el DM muta. Para que el push sirva, `compute_player_revision` (`backend/routes.py`) ahora incluye los handouts en el hash: sin eso el WS empujaba una revisión idéntica y el panel nunca se enteraba. e2e `H4` (lee visible, no ve el oculto, imagen) y `H5` (aparece sin recargar)
- Lección e2e: el dashboard DM tiene **2** `input[type=file]` (fondo + handouts), así que un selector `input[type=file]` es ambiguo — anclar por `data-testid`
- Bug corregido: `DELETE /api/campaigns/{id}` (y `bulk-delete`) solo borraba las tablas viejas — quests, handouts, combats+combatantes, calendario, relojes, player_fog y light_requests quedaban **huérfanos** en la base. Ahora los purga (test `test_delete_campaign_purges_children`), y después también `abilities` + `character_abilities` (ver la entry de abajo)
- **Catálogo de habilidades implementado (C1)**: `spells_json` era un blob JSON por ficha — la misma habilidad duplicada en cada personaje, sin FK para colgarle icono ni efecto, y sin manera de que dos personajes sepan la misma. Ahora `abilities` es el catálogo de campaña y `character_abilities` (PK compuesta `entity_type`/`entity_id`/`ability_id`, mismo patrón que `SceneCharacter`) dice quién sabe qué. El backfill corre en cada arranque y **solo vacía la fila vieja si dejó al menos un enlace**: una fila que falle se reintenta sola en el próximo arranque y, sobre todo, lo que el DM borre después no resucita (el mecanismo es que `spells_json` queda `'[]'` una vez migrado). La respuesta y el PUT **conservan el nombre `spells_json`**, así que `PlayerView` no cambió y `CharacterSheet` solo ganó la sección "Catálogo de la campaña" con botón para aprender. `owners` (cuántas fichas la saben) alimenta el aviso de que editarla la cambia en todos los que la conocen — esa es la única sorpresa real de pasar de blob por ficha a catálogo compartido. Tests: `test_spells_es_un_catalogo_compartido`, `test_backfill_de_spells_json_legacy`, el extended de `test_delete_campaign_purges_children` y e2e `CS9`. Todavía no hay evento `ability_used` (C4)
- **Iconos de habilidades (C2)**: `Ability.icon` guarda **o** un slug de la paleta (`apps/dm/src/lib/abilityIcons.ts`, 26 emoji con etiqueta en español) **o** la ruta absoluta de una imagen subida — el mismo convenio que `Character.portrait_path`—; la migración `abilities.icon` corre en cada arranque. Las dos vías convergen en la misma fila: la paleta va por `PUT/DELETE /campaigns/{id}/abilities/{aid}/icon[/{slug}]` cuando la fila ya existe en el catálogo, y viaja en el propio `spells_json` cuando la habilidad está en la ficha, que es lo que hace que un conjuro recién agregado cree su fila con el icono sin pasar por un 404. La subida (`POST .../icon`) escribe en `data/assets/{cid}/abilities/{aid}/icon.<ext>` y **borra el archivo anterior antes de escribir**, así que cambiar de extensión no deja la vieja — cosa que sí hace el retrato, que fija `portrait{ext}`. `_replace_spells` solo toca `icon` si la clave viene en el payload: un escritor que no la manda no apaga lo que ya estaba. Render: `abilityIconView` devuelve glyph, url o **null**, y null cae a la inicial del nombre — sirve para el vacío, para un path roto y para un slug que una versión futura de la paleta saque. Sin test de subida en pytest: `backend/tests/conftest.py` aísla la DB pero no `data/assets`, y escribir assets desde pytest es justo lo que esa regla evita (el e2e tampoco sube: solo paleta). Tests: `test_icono_viaja_con_el_catalogo`, e2e `CS10`
- **Quests live-sync** (mismo patrón que handouts, mismo bug de fondo): las quests no entraban en el hash de `compute_player_revision` y `quest_routes.py` no llamaba `broadcast_revision` en ninguna mutación → el WS empujaba una revisión idéntica, `applyRevision` salía por el early-return y el `PlayerQuestPanel` del jugador quedaba congelado hasta que tocaba ⟳. Ahora las quests entran en el hash, create/update/delete avisan por WS, y `PlayerQuestPanel` recibe `revision` y refetchea (`PlayerView` comparte una sola señal `panelRevision` entre quests y handouts). Tests: `test_quest_mutations_change_revision` (pytest) y e2e `Q3` (el DM crea y completa una misión por API; el jugador la ve aparecer y pasar a Archivo sin recargar)

- **Testing hygiene**: `backend/database.py` leía la **base de dev**: cada `pytest` dejaba ~21 campañas, escenas y personajes de prueba en la lista del usuario. Ahora `DB_PATH` sale de `ROLEITO_DB_PATH` y `init_db()` respeta `ROLEITO_SKIP_SEEDS`; `backend/tests/conftest.py` los setea antes de que se importe `database`, así que pytest corre contra una base propia en `%TEMP%` (48 tests, base de dev intacta). El skip de seeds también corta la copia de fondos y retratos a `data/assets/{cid}/`
- `scripts/purge_e2e_junk.py` concentra la purga de e2e (la que estaba embebida en `tests/global-teardown.ts`, que ahora la invoca). **Regla dura: nada se borra si no sabemos que lo creó un test.** Fuentes: el **registro** `%TEMP%/roleito-e2e-ids.txt`, que escribe `tests/fixtures/campaign-fixture.ts` con cada id de campaña/DM que crea (es lo único que sobrevive al borrado por API del fixture); filas presentes con nombre `E2E %` o `created_at >= --since`; y carpetas `data/assets/{uuid}/` huérfanas **solo** si su id está en el registro. `--report` inventaría la base partida en `[test]` / `[no test]` con conteos y tamaño
- Orden de borrado: los "hijos de hijos" (`character_abilities`, `scene_characters`, `combat_combatants`, `player_fog`, `map_markers`, `dm_notebook_versions`) van **primero**, mientras sus padres todavía existen; si borrás `scenes` antes, el subquery no matchea y quedan huérfanos. Verificar siempre con `PRAGMA foreign_key_check` (vacío = sano)

## Documentation Drift
- `ARCHITECTURE.md` needs update to reflect current state
- Some docs overlap (FOG-OF-WAR.md vs FOG-AND-VISIBILITY.md)
- `3D-RENDERER.md` is a stub (118 bytes)

---

# 8. Recommended Implementation Order

Based on dependency analysis and documentation completeness:

| Priority | System | Rationale |
|----------|--------|-----------|
| 1 | Login profesional | Pedido del usuario: perfil + PIN contra el back, **sin listar todos los DMs** (hoy `PinLogin.tsx` tiene modo `select-dm` y lista `GET /api/auth/dms`). El back ya valida `dm_id` + PIN |
| 2 | Mobile pass | Responsive real del dashboard y PlayerView (táctil) |
| 3 | Filtros de clima por debajo del preset | Cierra fase 15 (chico, mismo archivo). Fuego y variantes de clima ya están hechos — ver sección 6 |
| 4 | Menús con click-toggle | Reemplaza `hover()` (táctil); rompe `weather.spec` W1, hay que pasarlo a `click()` |
| 5 | AI Map Analysis | Automation (IA diferida por el usuario) |
| 6 | AI Agents reales | Fase 12 roadmap |
| 7 | Voice input | Fase 13 |

> Handouts a jugadores **completado** (fases 1 y 2) — ver sección 6.
>
> Real-time sync (WebSocket) completado en ambos sentidos (jugador + dashboard DM) — ver secciones 2 y 6.
>
> Prioridades 1-10 originales (scene graph → 3D) quedaron cubiertas — ver secciones 2 y 6.

---

# 9. Last Updated

- **Date**: 2026-10-01
- **Updated By**: Real-time DM (WS `/api/ws/campaigns/{id}` + fix de clipping en dropdowns de clima/lighting), intensidad de clima por escena, y `data-testid` en `ContextMenu`
- **Trigger**: Commits `2cdbcb2`, `4fff17a`, `a9286f1` — las tres fases quedaron fuera del doc
- **Nota de verificación**: las fases anteriores de esta sesión (import/export gaps, weather, audio) ya estaban anotadas
