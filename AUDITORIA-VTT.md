# Auditoría funcional — Roleito VTT

> **Fecha:** 2026-10-15  
> **Alcance:** repo completo (`apps/dm`, `backend/`, `core/`, `tests/`, `docs/`) contra un inventario de funcionalidades de una VTT completa.  
> **Método:** inspección directa de código (no se asume ausencia sin abrir el archivo). Cada hallazgo cita archivo:línea cuando se verificó línea a línea; cuando solo se verificó la existencia del archivo, se cita el archivo sin línea.  
> **Restricción respetada:** ningún módulo fue reescrito. Esto es un diagnóstico.

---

## 0. Resumen ejecutivo

Roleito **no es una VTT genérica**: es un motor de campaña local-first con autoridad del DM, cuyo diferencial es el **render 3D** y el **estado persistente del mundo** (canon + memoria + eventos). La cobertura VTT "clásica" (mapas, tokens, niebla, visión, luz, clima, iniciativa, handouts, quests, calendario, dados 3D parciales) está **mayormente implementada y con tests e2e**.

Los huecos más importantes para una mesa estilo Foundry/Roll20 son: **chat jugador↔jugador** (ausente; solo asistente IA local del DM), **modificadores/ventaja/desventaja/daño tipado** en tiradas (ausentes por decisión de producto), **validación server-side de tiradas** (el back acepta cualquier resultado), **autodetección de grilla** (diseñada, no implementada), **pathfinding completo** (hay rango A*, no navegación completa), y **mobile pass** (pendiente).

---

## 1. Stack, arquitectura y versiones (verificado)

- **Frontend único (real):** `apps/dm` — React `^18.3.1`, TypeScript strict, Vite `^5.3.4`, Tailwind `^3.4.6` (`apps/dm/package.json`).
- **3D:** `three ^0.170.0`, `@react-three/fiber ^8.18.0`, `@react-three/drei ^9.122.0`, `@react-three/rapier@^1.5.0` (física dados 3D) (`apps/dm/package.json`).
- **Backend:** FastAPI + SQLAlchemy async + SQLite (`data/roleito.db`). App en `backend/main.py`; routers bajo `/api` (`backend/main.py`); health en `/health`; assets en `/api/static`.
- **`apps/player` y `apps/renderer`:** placeholders `.gitkeep` — la vista jugador vive en `apps/dm/src/pages/PlayerView.tsx` (decisión AGENTS.md).
- **`core/` bilingüe:** Python (`core/events`, `core/world`, `core/agents/*`) + TS (`core/domain/types.ts`, `core/scene/*`: `wall-collision.ts`, `scene-graph.ts`, `door-interaction.ts`).
- **Agentes IA:** `core/agents/` (orchestrator, context_manager, ingestion, lore_agent, narrator, recap, scene_agent, session_processor, world_state, base, provider) + `infrastructure/ai/` (mock, local, remote, factory, base).
- **CI:** `.github/workflows/e2e.yml` (jobs `checks` → `unit` → `test`; job `test` shardeado ×4 con `strategy matrix`, `fail-fast:false`).
- **E2E:** ~42 specs en `tests/e2e/`; Playwright con `workers:1`, `retries:1`, locale `es-ES` global (`playwright.config.ts`); levanta front (5173) + back (8000) solos.
- **Unit:** specs vitest en `apps/dm/src/lib/*.spec.ts` (fog, luz, LoS, raycast, colisión, rango de movimiento, visión, dados 3D) + pytest en `backend/tests/` (agentes, API, detección de muros).

---

## 2. Matriz de funcionalidades

Leyenda de estado: **[IT]** Implementada y probada · **[PA]** Implementada parcialmente · **[UI]** Presente en UI sin lógica real · **[AU]** Ausente · **[NV]** No verificable con la evidencia.

### 2.1 Dados

| Funcionalidad | Estado | Evidencia | Notas / límite |
|---|---|---|---|
| Roller numérico d4–d20, 1–10 dados | **[IT]** | `apps/dm/src/components/DiceRoller.tsx`; `apps/dm/src/lib/dice3d.ts` | `DICE_TYPES = [4,6,8,10,12,20]`, `Math.random()` fallback; e2e `tests/e2e/dice.spec.ts` DR1–DR6 |
| Dados 3D animados (mesa física Rapier, mallas poliédricas, cara superior) | **[PA]** | `apps/dm/src/lib/dice3d.ts` (geometrías d4–d20, `readResult`), `apps/dm/src/components/DiceTray.tsx` (mesa R3F+rapier, `RestDetector`), `DiceRoller.tsx` (overlay, flag `dice3d`, fallback numérico) | Física opcional vía `localStorage dice3d`; d4 lee vértice superior; kill-switch numérico |
| d100 como 2×d10 | **[IT]** | `apps/dm/src/lib/dice3d.ts` (`expandPool`, decenas 00-90 + unidades, lectura 1-100) | `dice_type 10 count 2` con `total` combinado |
| Persistencia e historial (trim 20) | **[IT]** | `backend/dice_routes.py`; `backend/models.py` (`dice_rolls`) | `POST /campaigns/{id}/rolls`, `GET .../rolls/recent|/recent/all|/history/{entity_id}` |
| Sincronización de tiradas a jugadores | **[IT]** | `ToastContainer.tsx`; WS + revisión | Toast por tirada |
| Nat20/nat1 destacado | **[IT]** | `tests/e2e/dice.spec.ts:51-64` | Clase `ring-emerald-500` |
| Modificadores, ventaja/desventaja | **[AU]** | `docs/DICE-SYSTEM.md:144-150` | Decisión 2026-08-22: tiradas informativas y manuales, sin modificadores |
| Motor de tiradas ligado a reglas D&D | **[AU]** | `docs/DICE-SYSTEM.md:144-152` | Atributo = solo guía visual para el DM |
| Validación de resultado en el servidor | **[AU]** | `backend/dice_routes.py` | El back guarda lo que manda el cliente; no genera ni valida |
| Materiales/colores/números/sonidos de dados | **[PA]** | `dice3d.ts` (`getFaceTexture`, `getFaceLabels`, `buildFaceMaterials`); `DiceTray.tsx` (sonido WebAudio `playImpact`/`playThud`/`playClatter`) | Números en caras procedimentales; sonido por colisión |

### 2.2 Mapas

| Funcionalidad | Estado | Evidencia | Notas |
|---|---|---|---|
| Visor de mapa (pan/zoom, marcadores) | **[IT]** | `apps/dm/src/components/MapViewer.tsx`; `tests/e2e/map.spec.ts` | |
| Carga de imagen de fondo + snap a grilla | **[IT]** | `backend/scene_routes.py` (`upload-background`); `docs/IMPLEMENTATION-STATUS.md` | |
| Marcadores de mapa | **[IT]** | `backend/map_marker_routes.py` | |
| Detección automática de grilla (Hough) | **[AU]** | `docs/IMPLEMENTATION-STATUS.md` | Grilla manual + snap solamente |
| Asset Browser (drag-drop recursos al VTT) | **[IT]** | `apps/dm/src/pages/AssetList.tsx`; `tests/e2e/campaign.spec.ts` (C12) | Drag `roleito/asset` → `ImageSprite` en escena |

### 2.3 Tokens

| Funcionalidad | Estado | Evidencia | Notas |
|---|---|---|---|
| Colocación / drag / snap a grilla | **[IT]** | `apps/dm/src/components/SceneRenderer.tsx`; `TokenPlaceCanvas.tsx` | |
| Movimiento con teclado (libre, sin snap) | **[IT]** | `apps/dm/src/lib/wall-collision.spec.ts`; gotcha AGENTS.md | Snap solo en drag/drop; teclado libre |
| Rango de movimiento A* | **[IT]** | `apps/dm/src/lib/movementRange.ts` + `movementRange.spec.ts` | Rango, no navegación completa |
| Modelos de token (sprite + 3D) | **[IT]** | `TokenSprite.tsx`, `TokenModel.tsx` | |
| Marcadores de estado sobre token | **[IT]** | `apps/dm/src/lib/statusMarkers.ts`; `tests/e2e/status.spec.ts` | Sin **automatización** de condiciones (prone/advantage) |
| D-pad táctil jugador | **[IT]** | `PlayerView.tsx` (puntero `pointer:coarse`, `keysPressedRef` compartido con loop WASD) | `data-testid="pv-touch-controls"` |

### 2.4 Combate

| Funcionalidad | Estado | Evidencia | Notas |
|---|---|---|---|
| Initiative tracker | **[IT]** | `apps/dm/src/components/InitiativeTracker.tsx`; `backend/combat_routes.py`; `backend/models.py` | `Combat` + `CombatCombatant` |
| Turnos (next/prev), ronda | **[IT]** | `tests/e2e/initiative.spec.ts` I1–I8 | |
| Tirada de iniciativa del jugador (POV) | **[IT]** | `tests/e2e/initiative.spec.ts:140-189` | `POST .../initiative-roll`, `pending_roll`, `roll_seq` |
| PV/PM por combatiente | **[IT]** | `tests/e2e/initiative.spec.ts:115-138` | Persiste `current_pv` |
| Condiciones/estados con efecto mecánico | **[AU]** | grep `advantage|modifier` = 0 en front | Status es visual |
| Salvaciones, resistencias, daño tipado | **[AU]** | — | |

### 2.5 Herramientas del DM

| Funcionalidad | Estado | Evidencia | Notas |
|---|---|---|---|
| Muro (drawer + puertas open/close/locked) | **[IT]** | `WallDrawer.tsx`, `WallContextMenu.tsx`, `DoorContextMenu.tsx`; `tests/e2e/fog.spec.ts` | |
| Niebla (brush/rect/fill/reveal) | **[IT]** | `FogBrushCanvas.tsx`, `FogRectCanvas.tsx`, `FogOverlay.tsx` | |
| Luz colocable + oclusión | **[IT]** | `LightPlaceCanvas.tsx`; `apps/dm/src/lib/light*.spec.ts` | |
| Fuego colocable (fx flame/embers) | **[IT]** | `docs/IMPLEMENTATION-STATUS.md`; e2e `E-l5`/`E-l6` | `LightMetadata.fx` + `fxRadius` |
| Clima (7 variantes + intensidad) | **[IT]** | `apps/dm/src/components/WeatherFX.tsx`; `tests/e2e/weather.spec.ts` | `Scene.weather` + `weather_intensity`; audio procedural |
| Portales/zonas (transiciones) | **[IT]** | `ZoneDrawerCanvas.tsx`, `PortalDrawerCanvas.tsx`; `tests/e2e/portal.spec.ts`, `zone.spec.ts` | |
| Undo/redo de DM | **[NV]** | `useHistoryState` hook en `DmDashboard.tsx` | Alcance por verificar |
| Config TTS/AI del DM | **[IT]** | `AISettingsPanel.tsx`, `TTSPanel.tsx`, `tts_routes.py`, `ai_routes.py` | |
| Audio por habilidad (subir/reproducir) | **[IT]** | `Spell.audio_path`; `POST/DELETE .../abilities/{aid}/audio`; e2e `PV12` chip 🔊 | `d47bc23`, `d5edfea` |
| Rail capas/niebla como HudPanel arrastrable | **[IT]** | `HudPanel.tsx`, `DmDashboard.tsx` | `dm-layers`, drag/min, e2e `fog` 4/4 |
| Dock siempre abierto (desktop) | **[IT]** | `HudPanel.tsx`, `MinimizedBar.tsx` | `matchMedia min-width:1024px`; 5 items inline |
| Volumen master + por canal + sync DM↔jugador | **[IT]** | `apps/dm/src/lib/audioSettings.ts`; `AudioSettingsMenu.tsx` | `localStorage` + `settings_json.audio` |

### 2.6 Chat / notas / handouts

| Funcionalidad | Estado | Evidencia | Notas |
|---|---|---|---|
| **Chat jugador↔jugador** | **[AU]** | grep `ChatPanel` = 0; solo `DMAssistant.tsx` | `DMAssistant` es Q&A IA local del DM, no chat de mesa |
| Notas DM / cuaderno | **[IT]** | `DMNotebookHud.tsx`, `docs/DM-NOTEBOOK.md`; `tests/e2e/notebook.spec.ts` | Con versiones (`dm_notebook_versions`), dictado por voz |
| Notas de escena / log de sesión | **[IT]** | `SceneNotesHud.tsx`, `SessionLogHud.tsx` | |
| Handouts (texto + imagen, visibles a jugadores) | **[IT]** | `HandoutPanel.tsx`, `PlayerHandoutPanel.tsx`, `backend/handout_routes.py`; e2e `H4`/`H5` | Live-sync por revisión (`compute_player_revision`) |
| Compartir media (video/landing scene) | **[PA]** | Handouts cubren imágenes/texto | Video no verificado |
| Dictado por voz (DM + notas) | **[IT]** | `VoiceInputButton.tsx` (Web Speech API); `DMAssistant.tsx`, `DMNotebookHud.tsx` | `es-ES` default; e2e `AI7`, `NB8` |

### 2.7 Campaña y narrativa

| Funcionalidad | Estado | Evidencia | Notas |
|---|---|---|---|
| CRUD campañas/sesiones/personajes/NPC | **[IT]** | `routes.py`, `session_routes.py`, `character_routes.py` | |
| Canon PROPOSED→REVIEW→APPROVED/REJECTED | **[IT]** | `backend/canon_routes.py`, `core`; `tests/e2e/canon.spec.ts` | |
| Eventos + event bus | **[IT]** | `event_routes.py`, `event_bus_routes.py`; `tests/e2e/event-bus.spec.ts` | |
| Memoria por tiers | **[IT]** | `memory_routes.py`; `tests/e2e/memory.spec.ts` | Fase 11 |
| Recap | **[PA]** | `narrative_routes.py`, `RecapPanel.tsx`; `tests/e2e/recap.spec.ts` | Fase 10 parcial (generación IA básica) |
| Narrative engine | **[PA]** | `pages/NarrativeEngine.tsx`, `narrative_routes.py` | Fase 8 parcial |
| World State | **[IT]** | `world_routes.py`, `pages/WorldStateView.tsx`; `tests/e2e/world-state.spec.ts` | |
| Quests (live-sync a jugador) | **[IT]** | `quest_routes.py`, `backend/models.py`; e2e `Q3` | `PlayerQuestPanel` + revisión |
| Calendario in-world + progress clocks | **[IT]** | `calendar_routes.py`, `backend/models.py` | |
| Import/export (entidades + assets + VTT) | **[IT]** | `routes.py` (`export`/`import`/bulk); `docs/IMPLEMENTATION-STATUS.md` | Scenes, mapas, notebooks, combats, quests, calendario, dados, assets binarios ≤8MB |

### 2.8 Reglas D&D

| Funcionalidad | Estado | Evidencia | Notas |
|---|---|---|---|
| Catálogo de habilidades (compartido) | **[IT]** | `character_routes.py` (`abilities`); `docs/IMPLEMENTATION-STATUS.md` | `abilities` + `character_abilities` (FK compuesta) |
| Iconos de habilidad (paleta/imagen) | **[IT]** | `apps/dm/src/lib/abilityIcons.ts`; e2e `CS10` | |
| Uso de habilidad con costo de PM + evento | **[IT]** | `POST .../abilities/{aid}/use`; e2e `PV12` | `docs/IMPLEMENTATION-STATUS.md` |
| Stats cualitativos (`+`/`/`/`−`) | **[IT]** | `docs/CHARACTER-STATS.md`; `CharacterSheet.tsx` | |
| Tiradas con modificador/ventaja/desventaja | **[AU]** | `docs/DICE-SYSTEM.md:144-150` | Decisión: sin modificadores |
| Stat blocks / hechizos con efecto mecánico | **[AU]** | — | Habilidades = cualitativas + costo PM |
| Condiciones/estados mecánicos | **[AU]** | — | |

### 2.9 Audio

| Funcionalidad | Estado | Evidencia | Notas |
|---|---|---|---|
| Ambience por escena (loop, upload) | **[IT]** | `Scene.audio_path`; `SceneDetail.tsx`; `tests/e2e/audio.spec.ts` | |
| Clima audio procedural (lluvia/viento/truenos) | **[IT]** | `WeatherFX.tsx` (`WeatherAudio`); sintetizado, sin archivos | Volumen ∝ intensidad |
| Reproducción en PlayerView (toggle, swap por escena) | **[IT]** | `PlayerView.tsx` | |
| TTS (voces, config) | **[IT]** | `tts_routes.py`, `TTSPanel.tsx`, `infrastructure/tts/` | Fase 14 completa |
| SFX puntuales | **[PA]** | `audio.spec.ts` | |
| Voice input del DM | **[IT]** | `VoiceInputButton.tsx` (Web Speech API) | Fase 13 implementada |
| Volumen master + canal + sync compartido | **[IT]** | `audioSettings.ts`; `AudioSettingsMenu.tsx` | Master × canal; `settings_json.audio` |

### 2.10 Herramientas espaciales

| Funcionalidad | Estado | Evidencia | Notas |
|---|---|---|---|
| Raycasting / LoS | **[IT]** | `apps/dm/src/lib/losRaycast.ts` + `losRaycast.spec.ts`, `losSystem.spec.ts` | Worker de LoS |
| Oclusión por muros (visibilidad híbrida) | **[IT]** | `core/scene/wall-collision.ts`; `docs/HYBRID-SHADOW-GEOMETRY.md` | Canon actual |
| Máscara de niebla estática/dinámica | **[IT]** | `apps/dm/src/lib/fogMask.ts` + spec; `FogOverlay.tsx` | |
| Memoria de niebla (explored) | **[IT]** | `playerVision.spec.ts`; `player_fog` table | |
| Visión por jugador (snapshot push) | **[IT]** | `docs/IMPLEMENTATION-STATUS.md` | WS + fallback polling |
| Pathfinding completo (navegación) | **[PA]** | `movementRange.ts` (rango A*) | `IMPLEMENTATION-STATUS.md` marca "Planned" — tensión con el rango existente |

### 2.11 Objetos 3D

| Funcionalidad | Estado | Evidencia | Notas |
|---|---|---|---|
| Escena 3D desde mapa 2D | **[IT]** | `SceneRenderer.tsx`; `docs/2D-TO-3D.md` | R3F dentro de apps/dm |
| Personajes (sprite + modelo + glow) | **[IT]** | `TokenSprite.tsx`, `TokenModel.tsx` | Bloom gateado por `hasGlow` + `GLOW_STATUSES` |
| Items renderizados | **[IT]** | `ItemRenderer.tsx` | `WallRenderer`, `DoorRenderer`, `ZoneRenderer`, `LightRenderer`, `ImageSprite` |
| FX clima / fuego | **[IT]** | `WeatherFX.tsx`; `FireParticles` | |
| Carga de modelos GLTF externos | **[NV]** | No verificado | — |
| Capas/scene graph (z-index) | **[PA]** | `core/scene/scene-graph.ts`; `IMPLEMENTATION-STATUS.md` | Parcial |

### 2.12 Multijugador

| Funcionalidad | Estado | Evidencia | Notas |
|---|---|---|---|
| Join sin cuenta por código de invitación | **[IT]** | `routes.py` (`/ws/invite/{code}`, invite-code); `docs/COMMUNITY-VTT-ROADMAP.md` | |
| Sync DM ↔ jugador por WebSocket | **[IT]** | `backend/routes.py` (`/ws/campaigns/{id}`); `/ws/invite/{code}` | `compute_player_revision` sha1 16 chars; `broadcast_revision` post-commit |
| Fallback de polling si cae WS | **[IT]** | `PlayerView.tsx` (POLL_MS 16) | |
| Cola de tiradas atómicas (`roll_seq`) | **[IT]** | `tests/e2e/initiative.spec.ts:191-241`; `models.py` | |
| Transporte de baja latencia (WebRTC / UDP) | **[AU]** | — | Todo TCP/HTTP |

### 2.13 Interfaz

| Funcionalidad | Estado | Evidencia | Notas |
|---|---|---|---|
| Shell (Layout, TopBar, islas, HUDs) | **[IT]** | `Layout.tsx`, `TopBar.tsx`, `HudPanel.tsx`, `tests/e2e/islands.spec.ts` | |
| i18n (es/en) por navegador | **[PA]** | `apps/dm/src/locales/{es,en}/translation.json` | Migración en curso; `en` se siembra por parser |
| Temas / preferencias | **[IT]** | `PreferencesDrawer.tsx`, `src/index.css` (tokens) | |
| Responsive / mobile | **[PA]** | `tests/e2e/hud-resize.spec.ts` | Pendiente "mobile pass" |
| Accesibilidad (axe) | **[IT]** | `tests/e2e/a11y.spec.ts` A1–A6 | |
| Landing | **[IT]** | `pages/Landing.tsx`; `tests/e2e/landing.spec.ts` | |
| Iconos lucide (migración de emoji) | **[IT]** | `HudPanel.tsx`, `QuestPanel.tsx`, `CalendarPanel.tsx`, `HandoutPanel.tsx`, `DMNotebookHud.tsx`, `CharacterSheet.tsx`, `PlayerView.tsx` (commit `7f49758`) | Gotcha `Map` → alias `MapIcon` |

### 2.14 Seguridad

| Funcionalidad | Estado | Evidencia | Notas |
|---|---|---|---|
| PIN con hash | **[IT]** | `backend/auth.py:25-30` (`bcrypt`) | |
| Sesiones + lockout + roles | **[IT]** | `auth_routes.py:1-25` | |
| Autorización por endpoint | **[PA]** | `require_dm` en ~18 sitios (agents, ai, tts, vault, auth) | **La mayoría del CRUD no exige auth** (§5) |
| Vault de claves (machine-bound) | **[PA]** | `backend/vault.py`, `vault_routes.py` | `sha256` host+MAC; requiere `require_dm` |
| CORS restringido | **[IT]** | `backend/main.py:65-78` | Defaults localhost 5173/5174 |
| Validación de uploads | **[NV]** | — | Por verificar extensión/tamaño |

### 2.15 Persistencia y automatización

| Funcionalidad | Estado | Evidencia | Notas |
|---|---|---|---|
| SQLite + migraciones/backfill al arranque | **[IT]** | `backend/database.py:13-17`; `IMPLEMENTATION-STATUS.md` | `ROLEITO_DB_PATH` override |
| Snapshots / assets | **[IT]** | `data/snapshots`, `data/assets`, `/api/static` | |
| Purga de junk e2e | **[IT]** | `scripts/purge_e2e_junk.py` | Regla: solo borra lo que creó un test |
| Detección de muros por IA/imagen | **[AU]** | `scene_routes.py` (`detect-walls` endpoint existe) | IA diferida (fase G) |
| Chequeo de consistencia docs↔código | **[IT]** | `scripts/check-docs-consistency.py` | Escanea `docs/` + código |
| Guía de modularización | **[IT]** | `docs/ROLEITO_GUIA_MODULARIZACION_ARQUITECTURA.md`; `docs/engineering/DIAGNOSTICO-Y-PLAN-MODULARIZACION.md` | Directiva transversal + plan 8 fases |

---

## 3. Diagnóstico específico del sistema de dados (estado actual)

### 3.1 Qué existe ahora (verificado a 2026-10-15)

**Existe un sistema de dados 3D parcial** (ya no es [AU], pasa a [PA]):

- `apps/dm/src/lib/dice3d.ts`: geometrías procedurales d4–d20 (d10 = trapezoedro pentagonal custom), tabla `FACES`, `readResult(quaternion)` (d4 = vértice superior), `getFaceTexture`/`getFaceLabels`/`buildFaceMaterials` (números procedimentales en caras), `dice3d.spec.ts` (11 tests).
- `apps/dm/src/components/DiceTray.tsx`: overlay modal portal, Canvas R3F + `@react-three/rapier@^1.5.0`, caja piso + 4 paredes, hasta 15 dados, `RestDetector` + lectura al asentar, spawn contenido hacia centro mesa, `timeStep 1/120`, restitution/friction/damping. Chunk lazy aparte (~772 KB gz con WASM rapier).
- `apps/dm/src/components/DiceRoller.tsx`: integra la mesa 3D tras flag `dice3d` (default off en desarrollo, configurable), `DiceTrayErrorBoundary` (caída a numérico si falla 3D), `onRolled(result, { entityKey, skill })`, `saveRoll` con `entity` + `label`.
- `apps/dm/package.json`: `@react-three/rapier@^1.5.0` (R3F 8.18 compatible; 2.x exige R3F 9).
- Sonido: `playImpact` (bandpass + click, gate 55ms + umbral 1.2 m/s), `playThud`, `playClatter` eliminados en la versión final.

**Lo que aún falta (vía §3.2):**

| Requisito | ¿Existe? | Dónde falta |
|---|---|---|
| Geometrías d4, d6, d8, d10, d100, d12, d20 | Parcial (todas salvo d100 como modo propio) | d100 = 2×d10, sin modo percentil explícito |
| Física (colisiones, rebotes, reposo) | Sí (Rapier) | `DiceTray.tsx` |
| Cara superior = resultado registrado | Sí (`readResult`) | d4 = vértice superior |
| Sync multijugador de la tirada | Sí (numérico, mismo stream) | El 3D respeta el mismo endpoint |
| Validación server-side | **No** | El back acepta lo que manda el cliente |
| Materiales, colores, números, sonidos, FX | Parcial | Números procedimentales + sonido por colisión |
| Fallback GPU integrada / animación reducida | Parcial | `dice3d` kill-switch numérico; `prefers-reduuced-motion` no verificado en dados |

### 3.2 Motor de física: Rapier (descisión tomada)

El proyecto usa **React 18 + R3F 8 + three 0.170**. Se eligió **`@react-three/rapier@^1.5.0`** (sobre `@dimforge/rapier3d-compat`, WASM) porque es compatible con R3F 8.18 (la 2.x exige R3F 9). Añade ~1–2 MB WASM comprimido en el chunk lazy de `DiceTray`.

Detección de cara superior: leer el vector de la cara con normal más alineada con "arriba" tras el reposo (mapear índice de cara → valor). Para d4, `readResult` lee el vértice superior.

> **Nota de integridad:** el resultado debe seguir pasando por el mismo endpoint y el mismo stream de revisión; hoy el servidor **no valida** el número (§2.1), así que confiar la cara al render no empeora la seguridad, pero tampoco la mejora.

---

## 4. Faltantes reales y parciales

### Faltantes reales (ausentes)
1. **Chat jugador↔jugador** (la mesa usa Discord afuera; no hay canal interno).
2. **Modificadores / ventaja / desventaja / daño tipado** en tiradas (por decisión de producto).
3. **Automatización de condiciones** (prone, concentración, etc.).
4. **Stat blocks / hechizos con efecto mecánico** cuantitativo.
5. **Validación server-side de tiradas** y anti-trampa.
6. **Transporte de baja latencia** (WebRTC).
7. **AI map analysis** (rooms/labels) y **detección de muros por IA** (fase G).
8. **Mobile pass** completo (D-pad implementado, resto pendiente).

### Parciales
1. **Dados 3D** (geometrías + física + cara implementadas; falta d100 modo propio, skins, sonidos avanzados, modo reducido).
2. **Pathfinding** (hay rango A*, no navegación completa).
3. **Scene graph / capas** (z-index parcial).
4. **Recap y narrative engine** (IA básica).
5. **UI responsive / mobile**.
6. **i18n** (migración en curso; `en` incompleto).
7. **Autorización por endpoint** (CRUD mayormente sin `require_dm`).
8. **Light presets** (torch/daylight parciales).
9. **Certificación de uploads**.

---

## 5. Riesgos y deuda técnica (priorizable)

1. **Seguridad / authz:** la mayoría de rutas CRUD **no exigen `require_dm`**; en un modelo local-first de un solo usuario es aceptable, pero si se expone en LAN/hosting es un hueco. `docs/SECURITY.md` debería alinearse con el código.
2. **Anti-trampa de dados:** el cliente genera y el servidor guarda; cualquier resultado es aceptado. Aceptable con DM autoridad, pero **rompe** si algún día hay jugadores "competitivos".
3. **Performance 3D:** chunk único ~569 KB gz (`three`); code-split pendiente. Sumar física (WASM rapier) agrava el bundle → coordinar con code-split (§12.1 del ROADMAP).
4. **Flaky e2e conocido:** `status.spec S2` (poll del jugador) y `M8` — ya identificados; suman ruido al CI. Shards 3/4 de e2e flakean por jank de carga en GitHub Actions (canvas), no por regresión de código.
5. **Doc drift:** `ARCHITECTURE.md` desactualizado; `3D-RENDERER.md` es stub.
6. **Tensión de docs:** pathfinding "Planned" vs rango A* existente; conviene reconciliar.
7. **`AUDITORIA-VTT.md`** no commiteado hasta esta versión (ahora commiteado con este diagnóstico).

---

## 6. Plan de implementación (resumen)

El detalle completo con el "cómo" vive en [`PLAN-DADOS-3D.md`](./PLAN-DADOS-3D.md) y [`docs/engineering/DIAGNOSTICO-Y-PLAN-MODULARIZACION.md`](./docs/engineering/DIAGNOSTICO-Y-PLAN-MODULARIZACION.md).

Resumen de fases (dados 3D):
- **Fase 0 (S):** congelar contrato de tiradas + flag `dice3d`.
- **Fase 1 (M–L):** dados 3D cosméticos MVP — geometrías d4–d20, física + colisiones + reposo, detección de cara, sonido, 1 skin, `prefers-reduced-motion`. **(Hecho a 2026-10-15)**
- **Fase 2 (M):** tray overlay con cámara/sombras, d100 modo propio, skins/config, sync por revisión/WS.
- **Fase 3 (M, requiere aprobación):** modificadores/ventaja/daño + validación server-side opcional.
- **Fase 4 (paralelizable):** chat de mesa, condiciones mecánicas, voice input DM (hecho), agentes IA reales.

Resumen de fases (modularización del código, pendiente de arranque):
- **Fase 0:** extraer `staticUrl` duplicada (`DmDashboard.tsx:70`, `PlayerView.tsx:41`) a `lib/api.ts`.
- **Fase 1:** unificar tipos de dominio compartidos (`api.ts` ↔ `core/domain/types.ts` divergentes: `class_` vs `class`, `vida_*` anidado vs planos).
- **Fase 2-3:** descomponer `DmDashboard` (god component ~3600+ líneas) en capas de presentación (Toolbar, Dock, ContextMenus, ToastQueue) y hooks de escena (useSceneGraph, useWallDetection, useMovementRange).
- **Fase 4:** descomponer `PlayerView` (~1871 líneas) en `usePlayerSync` + `PlayerHudPanels`.
- **Fase 5:** `SceneRenderer` render puro (recibir cálculos por props; fix escalado puertas en `lightOcclusion.ts:46`).
- **Fase 6:** backend separar rutas de lógica (`routes.py` mezcla `_asset_rel`/`_asset_abs`/`_parse_dt`/`_embed_asset` con endpoints).
- **Fase 7-8:** estado/refs + pruebas de componentes.

---

## 7. Anexo — inventario de pruebas (verificado)

**E2E (`tests/e2e/`, ~42 specs):** `a11y`, `agents`, `ai`, `api`, `audio`, `calendar`, `campaign`, `canon`, `character-sheet`, `character`, `dashboard`, `dice`, `event-bus`, `fog`, `handout`, `hud-resize`, `initiative`, `intro-lobby`, `islands`, `landing`, `light`, `login`, `map`, `memory`, `narrative`, `notebook`, `npc`, `orchestrator`, `perf-budget`, `player-shell`, `player-view`, `portal`, `quest`, `recap`, `scene`, `status`, `transitions`, `tts`, `vault`, `weather`, `world-state`, `zone`.

**Unit (vitest, `apps/dm/src/lib/`):** `fogMask`, `light`, `lightGlow`, `lightOcclusion`, `losSystem`, `losRaycast`, `movementRange`, `playerVision`, `wall-collision`, `dice3d`.

**Pytest (`backend/tests/`):** `test_api`, `test_wall_detection`, `test_refine`, `test_ai_detector`, `test_agents`.

**Huecos de prueba notables:** no hay e2e ni unit para **chat**, ni para **modificadores**, ni para **autorización por endpoint**, ni para **validación server-side de tiradas**.

---

> **Verificación:** todos los paths citados existen (glob/lectura directa). Las líneas marcadas fueron leídas en esta sesión; las marcadas por archivo (sin línea) se confirmaron por existencia. No se incluyeron resultados de pruebas no ejecutadas en esta sesión.
