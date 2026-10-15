# Diagnóstico y plan de modularización — Roleito

**Directiva aplicada:** `docs/ROLEITO_GUIA_MODULARIZACION_ARQUITECTURA.md`  
**Estado:** borrador para revisión y verificación del DM **antes de implementar**.  
**Regla:** ningún cambio se afirma exitoso sin ejecutar las pruebas correspondientes.  
**Método:** cada afirmación está contrastada con lectura directa del archivo y la línea indicada.

---

## 0. Resumen ejecutivo

El código funciona y pasa las gates (lint 0, typecheck, vitest 133, pytest, e2e salvo flake de carga conocido en shards 3/4 de GitHub Actions). El problema no es funcionalidad: es **coste de cambio**. Dos god-components concentran la mayoría de la lógica (`DmDashboard` ~3600+ líneas, `PlayerView` ~1871), hay duplicación de utilidades (`staticUrl`), interfaces de dominio duplicadas y divergentes entre `api.ts`, `backend/models.py` y `core/domain/types.ts`, y DmDashboard llama directamente a libs de colisión/visión con `mapAspect` (inconsistencias de coordenadas entre dibujo y colisión en mapas no-cuadrados).

El plan aborda los problemas de mayor impacto primero, en incrementos pequeños, preservando comportamiento y verificando cada paso con las pruebas disponibles (lint → typecheck → vitest → pytest → e2e afectado).

---

## 1. Qué modelos / contratos entienden bien (validado por lectura directa)

Estos son los modelos reales del sistema. Cualquier refactorización debe respetarlos; **no unificar a la fuerza sin entender las diferencias**:

### 1.1 Backend — `backend/models.py` (fuente de verdad de persistencia)
- `Campaign`: `id, name, description, created_at, updated_at, current_session_id, current_location_id, settings_json (JSON), invite_code`
- `Character`: `id, campaign_id, name, type, description, class_ (columna "class"), race, status, current_location_id, visual_config_json, knowledge_scope, portrait_path, model_path, vigor, intelligence, dexterity, cunning, max_pv, max_pm, defense, current_pv, current_pm, inventory_json, spells_json, player_notes`
- `NPC`: igual a Character sin `inventory_json`/`spells_json`/`player_notes`/`type`/`class_`/`race` (vía líneas 96-120 leídas)
- `Session, Event, Scene, SceneCharacter, Player, Map, Asset, MapMarker, DMNotebook, DMNotebookVersion, DiceRoll, Combat, CombatCombatant, Quest, Handout, CampaignCalendar, ProgressClock, PlayerFog, LightRequest`

### 1.2 Frontend API DTOs — `apps/dm/src/lib/api.ts` (líneas 56-300+ leídas)
- `Campaign`: `id, name, description, created_at, updated_at, current_session_id, current_location_id, settings_json, invite_code` → **coincide con models.py**
- `Character`: `id, campaign_id, name, type, description, class_, race, status, current_location_id, visual_config_json, knowledge_scope, portrait_path, model_path, vigor, intelligence, dexterity, cunning, max_pv, max_pm, defense, current_pv, current_pm, inventory_json, spells_json, player_notes` → **coincide con models.py** (usa `class_` por la palabra reservada de TS)
- `NPC`: `id, campaign_id, name, description, status, current_location_id, faction_id, knowledge_scope, visual_config_json, portrait_path, model_path, vigor, intelligence, dexterity, cunning, max_pv, max_pm, defense, current_pv, current_pm, inventory_json, spells_json`
- `Spell`: `id, name, description, level, cost_pm, icon, audio_path`
- `CampaignAbility extends Spell { owners: number }`
- `Session, Event, WorldState, Player, PlayerFogRegion, Map, MapMarker, DMNotebook, DMNotebookVersion, ...`

### 1.3 Domain TS — `core/domain/types.ts` (líneas 1-399 leídas)
- `Campaign`: `id, name, description, created_at, updated_at, current_session_id, current_location_id, settings_json` → **SIN `invite_code`**
- `Character`: `id, campaign_id, name, type, description, class, race, status, current_location_id, visual_config_json, knowledge_scope, vida_attributes {vigor,intelligence,dexterity,cunning}, vida_stats {max_pv,max_pm,defense}, vida_state {current_pv,current_pm}` → **DIVERGE de api.ts/models.py**: usa `class` (no `class_`), `vida_attributes`/`vida_stats`/`vida_state` anidados (no planos), y **no tiene** `inventory_json`, `spells_json`, `player_notes`
- `NPC`: similar anidado, sin inventory/spells/notes
- `Session`: usa `SessionStatus` tipo literal (`DRAFT|IMPORTED|PROCESSING|REVIEW|APPROVED|ARCHIVED`) → **DIVERGE de api.ts** (que usa `status: string`)
- `SceneItem`, `SceneLayer`, `ItemMetadata` (Token/Wall/Door/Terrain/Effect/Label/Fog/Room/Zone/Light/Image), `PortalRef`, `ZoneMetadata`, `Point2D`, `VisionConfig`, `LightMetadata`, `Relationship`, `Event` (con `EventType`/`CanonStatus`/`KnowledgeScope` literales)

### 1.4 Conclusión sobre modelos (P5 validado)
Hay **tres contratos paralelos para la misma entidad**:
1. `backend/models.py` (ORM, `class_`, campos planos, `inventory_json`/`spells_json`)
2. `apps/dm/src/lib/api.ts` (DTO frontend, espejo de models.py, `class_`, campos planos)
3. `core/domain/types.ts` (dominio TS, `class`, `vida_*` anidado, sin inventory/spells/notes)

**api.ts ↔ models.py están sincronizados.** `core/domain/types.ts` está **desfazado** respecto a ambos. No son duplicación innecesaria: sirven capas distintas (persistencia, API, dominio 3D), pero divergen en nombres de campos y estructura, lo que obliga a casts y mappings implícitos en las vistas.

---

## 2. Diagnóstico validado (P1-P8), con evidencia

| # | Problema | Evidencia (archivo:línea) | Impacto | Riesgo | Coste |
|---|----------|---------------------------|---------|--------|-------|
| P1 | **God component DmDashboard**: ~3600+ líneas, 50+ imports. Coordina campaña, escenas, chars, npcs, items, lighting, clima, dados, iniciativa, quests, handouts, calendario, recap, notebook, AI, asistente, audio, menús, toasts, dock, build menu, detección de paredes, portales, zonas, undo/redo, WebSocket + polling fallback. | `DmDashboard.tsx:1-56` (imports), `:75-305` (estado + WS + polling), `:339-397` (undo/redo + saveItems), `:401-452` (dibujar pared/zona), `:497-519` (portales), `:3526-3544` (CharacterSheet embebido) | Alto | Alto | Medio |
| P2 | **God component PlayerView**: ~1871 líneas. Mezcla fetch snapshot/mychar, WS/revision, audio loop, dados, HUDs, grimorio, notas, visión, movimiento WASD, D-pad táctil. | `PlayerView.tsx:204-268` (estado + refs), `:270-291` (fetchSnapshot/fetchMyChar/applySnapshot) | Medio-Alto | Medio | Medio |
| P3 | **SceneRenderer mezcla render 3D con coordinación de interacción**: recibe 30+ callbacks (`onDrawStart`, `onFogPaint`, `onLightPlace`, `onTokenPlace`, `onAssetDrop`, `onZoneFinish`, …). Llama a `buildOccluders`/`extractZonePolygons` vía el padre (DmDashboard) que pasa `mapAspect`. | `SceneRenderer.tsx:51-111` (props), `ItemRenderer.tsx:1-90` (dispatch por tipo de metadata) | Medio | Medio | Medio |
| P4 | **Duplicación `staticUrl`**: idéntica en dos archivos. | `DmDashboard.tsx:70-73`, `PlayerView.tsx:41-44` | Bajo-Medio | Bajo | Bajo |
| P5 | **Interfaces de dominio duplicadas/divergentes**: `Campaign`/`Character`/`NPC`/`Session` en api.ts vs core/domain/types.ts (ver §1.4). | `api.ts:56-300`, `core/domain/types.ts:1-399` | Medio | Medio | Medio |
| P6 | **Backend routes acumulan lógica de dominio + persistencia + transformaciones de archivo**: `_asset_rel`, `_asset_abs`, `_parse_dt`, `_embed_asset`, `_collect_assets` viven en `routes.py` junto con los endpoints HTTP. | `backend/routes.py:56-109` | Medio | Medio | Medio |
| P7 | **Estado disperso en refs + useState en DmDashboard y PlayerView**: docenas de `useRef` para posiciones, velocidades, relojes, undo stacks. | `DmDashboard.tsx:183-217` (refs), `PlayerView.tsx:247-268` (refs) | Medio | Medio | Medio |
| P8 | **Pruebas concentradas en `lib/*.spec.ts`; poco coverage de componentes/pages**. | `apps/dm/src/lib/*.spec.ts` (12 specs, 133 tests) | Bajo | Bajo | Bajo |

**Nota sobre P3:** `wall-collision.ts` y `lightOcclusion.ts` son libs puras bien separadas (bueno). El problema es que `DmDashboard` las llama directamente con `mapAspect` y hay una inconsistencia real: `lightOcclusion.ts:40-41` escala walls por `mapWidth/mapHeight` pero `lightOcclusion.ts:46` puertas usa `p[0]` sin escalar, y `lightOcclusion.ts:64-65` polígonos de zona sí escalan. Esto confirma la entrada (18)/(19) de memory sobre divergencia dibujo-colisión en mapas no-cuadrados.

---

## 3. Plan por fases (incremental, verificable)

Cada fase es un **commit separado**, verificable con las gates. No se mezcla refactor con features nuevas. Orden: menor riesgo / mayor gancho primero.

### Fase 0 — Utilidad duplicada `staticUrl` (P4) — TRIVIAL, CERO RIESGO
**Problema:** `staticUrl` idéntica en `DmDashboard.tsx:70` y `PlayerView.tsx:41`.  
**Diseño:** extraer a `apps/dm/src/lib/api.ts` como `export function staticUrl(path: string | null): string | null`; importar en ambos componentes; borrar las locales.  
**Módulos:** `apps/dm/src/lib/api.ts`, `apps/dm/src/pages/DmDashboard.tsx`, `apps/dm/src/pages/PlayerView.tsx`  
**Cambios exactos:**
1. Añadir `staticUrl` exportada en `api.ts`.
2. En `DmDashboard.tsx`: borrar líneas 70-73, importar `staticUrl` de `@/lib/api`.
3. En `PlayerView.tsx`: borrar líneas 41-44, importar `staticUrl` de `@/lib/api`.  
**Pruebas:** `npx eslint`, `npx tsc --noEmit`, `npx vitest run`.  
**Criterio de aceptación:** `staticUrl` definida una sola vez (grep confirma 1 definición + 2 usos); lint 0 err; typecheck limpio; vitest 133.

---

### Fase 1 — Unificar tipos de dominio compartidos (P5) — MEDIO RIESGO, ALTO VALOR
**Problema:** `Campaign`/`Character`/`NPC`/`Session` existen en api.ts y core/domain/types.ts con campos distintos (`class_` vs `class`, `vida_*` anidado vs planos, `invite_code` solo en uno).  
**Diseño:** NO unificar a la fuerza las tres capas (sirven propósitos distintos). En su lugar:
- `core/domain/types.ts` sigue siendo la fuente única para la escena 3D (`SceneItem`, `LightMetadata`, `ZoneMetadata`, `VisionConfig`, `PortalRef`).
- `api.ts` sigue siendo el DTO del frontend (espejo de `backend/models.py`).
- Añadir funciones de conversión explícitas en `api.ts` (o un archivo nuevo `lib/domainMappers.ts`) para pasar de DTO api.ts → tipos core/domain cuando SceneRenderer/PlayerView los necesiten, con casts visibles y sin `any`.  
**Módulos:** `apps/dm/src/lib/api.ts`, `apps/dm/src/lib/domainMappers.ts` (nuevo), `apps/dm/src/components/SceneRenderer.tsx`, `apps/dm/src/pages/PlayerView.tsx`  
**Cambios exactos:**
1. Crear `lib/domainMappers.ts` con `toSceneItem(dto): SceneItem`, `toCharacterVision(dto): CharacterVision`, etc. (solo los que se usen).
2. En `SceneRenderer.tsx` y `PlayerView.tsx`: importar `SceneItem`/`VisionConfig` de `@core/domain/types` y usar los mappers; eliminar interfaces locales `SceneEntity` (SceneRenderer:32-49) y `PlayerToken` (PlayerView:53-75) si se pueden sustituir por los tipos de core + mappers.  
**Pruebas:** lint, typecheck, vitest, e2e `player-view`, `dashboard`, `scene`, `light`, `fog`.  
**Criterio de aceptación:** no quede `interface SceneEntity` ni `interface PlayerToken` duplicadas fuera de `core/domain/types.ts` (grep); los mappers tipados sin `any`; e2e verde.

---

### Fase 2 — DmDashboard: extraer capas de presentación pura (P1-a)
**Problema:** DmDashboard renderiza toolbar, dock, menús, context menus, toasts, minimizadores, y coordina todos los HudPanels.  
**Diseño:** extraer componentes de presentación pura que reciben props y emiten callbacks; DmDashboard se queda como orquestador de estado y ensamblador.  
**Módulos:** `DmDashboard.tsx`; nuevos `components/DmToolbar.tsx`, `components/DmDock.tsx`, `components/DmContextMenus.tsx`, `components/DmToastQueue.tsx`  
**Cambios exactos:**
1. `DmToolbar`: escena, toolbar vertical (undo/redo, construir, fondo, lighting, weather, ⚙, mapa), menús lighting/weather/build/mapa. Recibe `campaignId, scenes, activeScene, onSceneChange, onBuildToggle, onLightingMenu, onWeatherMenu, onMapMenu, lightingMenuRect, weatherMenuRect, buildMenuRect, mapMenuRect, openMenu, setOpenMenu, ...` y devuelve JSX.
2. `DmDock`: dock inferior colapsable (pill ⋯, hover/click expande, items minimizados). Recibe `dockExpanded, setDockExpanded, items, onItemClick`.
3. `DmContextMenus`: door/wall/zone/light/fog context menus. Reciben coordenadas, items, onAction.
4. `DmToastQueue`: `ToastContainer` + lógica de cola `toastQueue`/`pushToast`.  
**Pruebas:** lint, typecheck, vitest, e2e `dashboard`, `hud-resize`, `weather`, `fog`, `hud`, `map`.  
**Criterio de aceptación:** DmDashboard reduce ≥30% de líneas; comportamiento idéntico (mismos testids, mismas callbacks); e2e verde.

---

### Fase 3 — DmDashboard: extraer lógica de escena/colisión a hooks (P1-b + P3)
**Problema:** DmDashboard contiene undo/redo stacks, detección de paredes, propuesta de detección, movement range, portales, zonas, dibujo de paredes.  
**Diseño:** extraer a hooks de aplicación que encapsulan estado + graphRef + api.  
**Módulos:** `DmDashboard.tsx`; nuevos `hooks/useSceneGraph.ts`, `hooks/useWallDetection.ts`, `hooks/useMovementRange.ts`  
**Cambios exactos:**
1. `useSceneGraph(items)`: maneja `graphRef`, `undoStackRef`, `redoStackRef`, `pushUndo`, `applyHistoryItems`, `handleUndo`, `handleRedo`, `handleItemsChange`. Devuelve `sceneItems`, `graph`, `handleItemsChange`, `undo`, `redo`.
2. `useWallDetection(graph, handleItemsChange, campaignId, activeScene, mapAspect)`: estado `detectingWalls`, `detectProposal`, `detectionMode`, `useAi`; funciones `startDrawMode`, `finalizeZoneDraft`, `startZoneMode`, `startPortalMode`, `handlePortalSelect`.
3. `useMovementRange(graph, ...)`: `computeReachableCells`, `crossZoneBorder`, `wasdTarget`.  
**Pruebas:** lint, typecheck, vitest (pueden probarse los hooks de forma aislada con `renderHook`), e2e `map`, `scene`, `dashboard`, `zone`, `light`.  
**Criterio de aceptación:** DmDashboard delega a hooks; lógica de escena testeable por separado (vitest si se decide); e2e verde.

---

### Fase 4 — PlayerView por capas (P2)
**Problema:** PlayerView mezcla polling WS, visión, audio, dados, HUDs, grimorio, notas.  
**Diseño:** extraer:
- `usePlayerSync(code)`: `fetchSnapshot`, `fetchMyChar`, `applySnapshot`, WS reconnect + polling fallback (POL_MS=16). Devuelve `data`, `myChar`, `live`, `audioOn`, etc.
- `PlayerHudPanels`: ensamblador de `PlayerQuestPanel`, `PlayerCalendarPanel`, `PlayerHandoutPanel` (reciben `campaignId`, `revision`).  
**Módulos:** `PlayerView.tsx`, `hooks/usePlayerSync.ts`, `components/PlayerHudPanels.tsx`  
**Cambios exactos:**
1. `usePlayerSync` encapsula `fetchSnapshot`, `fetchMyChar`, `applySnapshot`, el bucle de revisión, `myCharRef`, `lastRevRef`, `sceneIdRef`, `audioRef`, `rafRef`.
2. `PlayerHudPanels` renderiza los 3 paneles jugador condicionalmente por `showQuests`/`showCalendar`/`showHandouts`.  
**Pruebas:** lint, typecheck, vitest, e2e `player-view`, `player-shell`, `dice`, `quest`, `handout`, `calendar`.  
**Criterio de aceptación:** PlayerView reduce ≥25% de líneas; e2e verde.

---

### Fase 5 — SceneRenderer: render puro, recibir cálculos por props (P3)
**Problema:** SceneRenderer recibe `buildOccluders`/`extractZonePolygons` resultados ya calculados por el padre, pero sigue coordinando muchas interacciones.  
**Diseño:** asegurar que SceneRenderer solo renderice lo que recibe por props (`occluders`, `visionRegions`, `fogRegions`, `movementRange`) y no importe lógica de colisión/detección. El cálculo ya está en `lib/lightOcclusion.ts` y `lib/wall-collision.ts` (libs puras, bien).  
**Módulos:** `SceneRenderer.tsx`, `lib/lightOcclusion.ts`, `lib/wall-collision.ts`  
**Cambios exactos:**
1. Corregir inconsistencia en `lightOcclusion.ts:46` (puertas sin escalar por mapWidth/mapHeight) → escalar igual que walls para alinear con el dibujo en mapas no-cuadrados.
2. Verificar que `SceneRenderer` no llame a `checkWallCollision` ni `extractZonePolygons` directamente (solo recibe resultados).  
**Pruebas:** lint, typecheck, vitest (`light`, `lightOcclusion`, `fogMask`, `playerVision`, `wall-collision`), e2e `light`, `fog`, `player-view`, `zone`.  
**Criterio de aceptación:** SceneRenderer no importa lógica de colisión/detección; puertas escaladas igual que walls; vitest 133; e2e verde.

---

### Fase 6 — Backend: separar rutas de lógica de dominio/persistencia (P6)
**Problema:** `backend/routes.py` tiene `_asset_rel`, `_asset_abs`, `_parse_dt`, `_embed_asset`, `_collect_assets` mezclados con endpoints.  
**Diseño:** mover transformaciones de asset y parseo de fechas a un módulo de infraestructura puro (sin FastAPI), testeable unitariamente. No crear repositorios ceremoniales (per guía 6.1, 8).  
**Módulos:** `backend/routes.py`; nuevo `backend/infrastructure/assets.py` (o similar)  
**Cambios exactos:**
1. Mover `_asset_rel`, `_asset_abs`, `_import_asset_path`, `_parse_dt`, `_embed_asset`, `_collect_assets` a `backend/infrastructure/assets.py` (funciones puras, sin `db` salvo `_collect_assets` que recibe session).
2. `routes.py` las importa y las usa.  
**Pruebas:** pytest (`backend/tests/`).  
**Criterio de aceptación:** pytest 46+; `routes.py` más corto; funciones de asset testeables sin levantar FastAPI.

---

### Fase 7 — Estado y refs en DmDashboard/PlayerView (P7)
**Problema:** docenas de `useRef` dispersos para posiciones, velocidades, relojes, undo stacks.  
**Diseño:** consolidar en estructuras de estado derivadas o hooks (ya hechos en Fases 2-3). Revisar qué refs quedan y si se pueden derivar del estado.  
**Módulos:** `DmDashboard.tsx`, `PlayerView.tsx`  
**Pruebas:** lint, typecheck, vitest, e2e `dashboard`, `player-view`.  
**Criterio de aceptación:** menos refs dispersos; comportamiento idéntico.

---

### Fase 8 — Pruebas de componentes/pages (P8)
**Problema:** poco coverage de componentes/pages.  
**Diseño:** añadir pruebas de vitest para las extracciones de Fases 2-4 (HudPanels, toolbar, dock, hooks de escena).  
**Módulos:** `apps/dm/src/components/*.spec.ts` nuevos, `apps/dm/src/hooks/*.spec.ts` nuevos  
**Pruebas:** vitest.  
**Criterio de aceptación:** cobertura de los componentes extraídos; vitest verde.

---

## 4. Flujo de trabajo por fase (por la guía §12)

Cada fase sigue: A) Diagnóstico → B) Plan pequeño → C) Refactorización incremental → D) Verificación → E) Informe.  
Antes de cada fase: leer módulos y consumidores, confirmar imports y contratos.  
Después de cada fase: ejecutar `lint → typecheck → vitest → (pytest si toca backend) → e2e afectado` y reportar resultados reales.  
Si una fase rompe algo, revertir ese commit y volver al estado verde antes de continuar.

**Orden sugerido para empezar:** Fase 0 (trivial, valida el flujo) → Fase 1 (tipos) → Fase 2 (DmDashboard presentación) → …

---

## 5. Deuda técnica pendiente (fuera de este plan)

- CI flake en shards 3/4 (jank canvas, infra de GitHub Actions) — no es código; se maneja con re-runs.
- `AUDITORIA-VTT.md` y `docs/ROLEITO_GUIA_MODULARIZACION_ARQUITECTURA.md` sin commitear (decisión pendiente).
- Chunk único de Three.js 552 KB (perf-budget techo 600 KB, target 250 KB sin three) — code-split pendiente.
- `tts_config.json` mock-vs-restore pendiente.
- `apps/player` y `apps/renderer` son placeholders vacíos (per AGENTS.md, no tocar).

---

## 6. Siguiente acción inmediata

Este documento es el **plan detallado**. Debes leerlo y verificarlo:
1. ¿Estás de acuerdo con las evidencias (archivo:línea) citadas?
2. ¿Está bien el orden de fases (Fase 0 primero)?
3. ¿Alguna fase quieres ajustar (módulos, nombres, alcance)?

Si está bien, procedo a la **Fase 0** (extraer `staticUrl`). No toco nada hasta tu OK.
