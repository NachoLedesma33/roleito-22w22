# Diagnóstico y plan de modularización — Roleito

**Directiva aplicada:** `docs/ROLEITO_GUIA_MODULARIZACION_ARQUITECTURA.md`  
**Revisión:** 2da pasada, 2026-10-16. Cada afirmación fue verificada contra el código real (conteo de líneas, grep de símbolos, lectura de archivos).  
**Estado:** plan para revisión del DM **antes de implementar**. Ningún cambio sin ejecutar sus pruebas.

---

## 0. Resumen ejecutivo

El código funciona y las gates están verdes (CI `d7e71bc` = 6/6 jobs). El problema no es funcionalidad: es **coste de cambio**.

Verificado con datos, no con impresión:
- `DmDashboard.tsx` tiene **3830 líneas** (no "~3600").
- `staticUrl` está duplicada **8 veces**, no 2 — y en **2 variantes con bugs distintos**.
- `character_routes.py` tiene **29 funciones** en 821 líneas mezclando 4 dominios.
- Python tiene `wall_detection.py` (módulo) **y** `wall_detection/` (paquete) con el mismo nombre.

El plan prioriza por impacto/riesgo real. Cada fase es un commit verificable.

---

## 1. Tamaño real de los módulos (medido, no estimado)

| Archivo | Líneas | Nota |
|---|---|---|
| `apps/dm/src/pages/DmDashboard.tsx` | **3830** | god component, 56 imports |
| `apps/dm/src/components/SceneRenderer.tsx` | 2358 | render + 30+ callbacks |
| `apps/dm/src/pages/PlayerView.tsx` | **1930** | god component (no 1871) |
| `apps/dm/src/lib/api.ts` | 1065 | tipos + cliente HTTP + auth |
| `apps/dm/src/components/CharacterSheet.tsx` | 790 | |
| `apps/dm/src/components/DiceTray.tsx` | 774 | lazy chunk, WASM |
| `apps/dm/src/components/ItemRenderer.tsx` | 765 | 7 renderizadores por metadata.type |
| `apps/dm/src/components/WeatherFX.tsx` | 631 | partículas + audio procedural |
| `apps/dm/src/components/DiceRoller.tsx` | 517 | |
| `apps/dm/src/lib/dice3d.ts` | 466 | geometrías puras (bien) |
| `apps/dm/src/components/InitiativeTracker.tsx` | 446 | |
| `apps/dm/src/components/MapViewer.tsx` | 444 | |
| `apps/dm/src/components/HudPanel.tsx` | 425 | base de ~15 paneles |
| `core/domain/types.ts` | 399 | fuente única TS |

**Backend:**

| Archivo | Líneas |
|---|---|
| `backend/routes.py` | 1243 |
| `backend/character_routes.py` | 821 (29 funciones) |
| `backend/schemas.py` | 770 |
| `backend/scene_routes.py` | 628 |
| `backend/models.py` | 474 |
| `backend/wall_detection.py` | 377 (módulo) |
| `backend/wall_detection/` | 9 archivos (paquete) |

---

## 2. Diagnóstico verificado (P1-P9)

| # | Problema | Evidencia verificada | Impacto | Riesgo | Coste |
|---|---|---|---|---|---|
| **P1** | **God component DmDashboard**: 3830 líneas, 56 imports, coordina WS+poll, undo/redo, detección, portales, zonas, clima, luces, dados, initiating, ~15 paneles, context menus, toasts, dock, teclado. | `DmDashboard.tsx` (conteo) | Alto | Alto | Medio |
| **P2** | **`staticUrl` ×8, con 2 variantes inconsistentes.** Variante A (`parts.length > 1`) devuelve `null` si no hay `/assets/`; variante B devuelve la cadena `/api/static/undefined`. | 8 archivos: `AssetList.tsx:14`, `DmDashboard.tsx:70`, `HandoutPanel.tsx:6`, `MapList.tsx:14`, `PlayerView.tsx:41`, `SceneDetail.tsx:8`, `MapViewer.tsx:4`, `PlayerHandoutPanel.tsx:6` | **Alto** | **Bajo** | **Bajo** |
| **P3** | **God component PlayerView**: 1930 líneas; mezcla sync WS, visión, audio, dados, HUDs, notas, grimorio. | `PlayerView.tsx` | Medio-Alto | Medio | Medio |
| **P4** | **Tipos duplicados**: `MyChar` (PlayerView:122) y `PlayerToken` (PlayerView:53) re-declaran lo que `api.ts` ya exporta. `InventoryItem`/`Spell` duplicadas en PlayerView:106,112. `AuthContext.tsx:18` declara su propia `Session`. | grep `interface (Character|NPC|...)` → 10 matches en 3 archivos | Medio | **Bajo** | **Bajo** |
| **P5** | **`character_routes.py`: 29 funciones, 4 dominios** (characters, npcs, abilities catálogo, uploads de archivo) en 821 líneas. | grep `^async def \|^def ` | Medio | Medio | Medio |
| **P6** | **`routes.py:56-109` mezcla helpers de persistencia** (`_asset_rel`, `_asset_abs`, `_parse_dt`, `_embed_asset`, `_collect_assets`) con endpoints HTTP. | lectura directa | Medio | Bajo | Bajo |
| **P7** | **Conflicto de nombre Python**: `backend/wall_detection.py` (377) y `backend/wall_detection/` (paquete) existen a la vez. El paquete gana por precedencia; `__init__.py:10` re-exporta `detect_map` del módulo. Funciona pero es frágil y confuso. | grep `from wall_detection` en 5 archivos | Medio | **Alto** | Medio |
| **P8** | **`.gitkeep` huérfanos**: `core/canon/`, `core/events/`, `core/memory/`, `core/narrative/`, `core/world/`, `core/scenes/` tienen código real Y `.gitkeep`. `core/scenes/` (plural) está **vacío** y no se usa (AGENTS.md lo confirma). | listado de directorios | Bajo | Bajo | Bajo |
| **P9** | **Tests solo en `lib/` y 2 en `components/`**: 12 specs vitest, todos de lógica pura. Ninguno de `pages/`, ninguno de `HudPanel`, ninguno de `contexts/`. | listado de `*.spec.ts` | Medio | Bajo | Medio |

### 2.1 Corrección importante sobre P4

`MyChar` (PlayerView:122-144) es un **subconjunto estricto** de `api.Character` (api.ts:78-104) — mismos campos, sin `campaign_id`/`type`/`visual_config_json`/`model_path`. `PlayerToken` (PlayerView:53-75) es similar a `api.SceneCharacter` (api.ts:452-474) pero con `sceneCharId` renombrado desde `id`.

**Conclusión: no se necesita un mapper.** `core/domain/types.ts` NO debe tocar esto — sus tipos `Character`/`NPC` usan un esquema **anidado distinto** (`vida_attributes`/`vida_stats`/`vida_state`) que **no coincide con la API real**. Forzar unificación con `@core` sería un error. La unificación correcta es **dentro de `api.ts`**: borrar las declaraciones locales de `PlayerView` y usar los tipos de `api.ts`.

---

## 3. Plan por fases

### Fase 0 — `staticUrl` unificada (P2) — CERO RIESGO, ALTO VALOR
**Problema:** 8 copias, 2 variantes con semántica distinta (una puede devolver `/api/static/undefined`).  
**Diseño:** una función en `apps/dm/src/lib/staticUrl.ts`:
```ts
export function staticUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const parts = path.replace(/\\/g, '/').split('/assets/');
  return parts.length > 1 ? `/api/static/${parts[1]}` : null;
}
```
Adopta la **variante defensiva** (devuelve `null` en vez de `undefined`). Importar en los 8 archivos. Borrar las 8 locales.  
**Módulos:** nuevo `apps/dm/src/lib/staticUrl.ts`; `AssetList.tsx`, `DmDashboard.tsx`, `HandoutPanel.tsx`, `MapList.tsx`, `PlayerView.tsx`, `SceneDetail.tsx`, `MapViewer.tsx`, `PlayerHandoutPanel.tsx`.  
**Pruebas:** `npm run lint`, `npm run typecheck`, `npm run test --workspace=apps/dm`, e2e `map`, `handout`, `player-view`, `scene`, `dashboard`.  
**Criterio de aceptación:** `grep "function staticUrl"` → 1 match; lint 0 errores; vitest 133; e2e verde.  
**Nota de riesgo:** el cambio de comportamiento solo afecta paths sin `/assets/`, que antes producían una URL rota. Es una corrección, pero verificar e2e de assets.

---

### Fase 1 — Tipos duplicados del frontend (P4) — BAJO RIESGO
**Problema:** `MyChar`, `PlayerToken`, `InventoryItem`, `Spell` re-declarados en `PlayerView.tsx`; `Session` en `AuthContext.tsx`.  
**Diseño:** borrar las declaraciones locales y usar `api.Character`, `api.SceneCharacter`, `api.InventoryItem`, `api.Spell`. Donde el shape difiere (`PlayerToken` vs `SceneCharacter`), agregar en `api.ts` un tipo de vista explícito (`PlayerSceneToken`) en vez de castear. **No tocar `core/domain/types.ts`.**  
**Módulos:** `apps/dm/src/pages/PlayerView.tsx`, `apps/dm/src/contexts/AuthContext.tsx`, `apps/dm/src/lib/api.ts`.  
**Pruebas:** lint, typecheck, vitest, e2e `player-view`, `player-shell`, `login`, `character-sheet`.  
**Criterio de aceptación:** typecheck limpio sin `as unknown as`; grep `interface (MyChar|PlayerToken)` → 0.

---

### Fase 2 — DmDashboard: extraer presentación (P1a)
**Problema:** 3830 líneas renderizando toolbar, dock, menús, context menus, toasts y ~15 paneles.  
**Diseño:** extraer componentes de presentación pura (reciben props, emiten callbacks). `DmDashboard` queda como orquestador de estado.
- `DmToolbar` — escena + toolbar vertical + menús lighting/weather/build/mapa
- `DmDock` — dock colapsable + `MinimizedBar`
- `DmContextMenus` — door/wall/zone/light/fog
- `DmToasts` — `ToastContainer` + cola  
**Módulos:** `DmDashboard.tsx` + 4 componentes nuevos.  
**Pruebas:** lint, typecheck, vitest, e2e `dashboard`, `hud-resize`, `weather`, `fog`, `map`, `initiative`, `dice`, `calendar`, `quest`, `handout`, `notebook`.  
**Criterio de aceptación:** −30% líneas en DmDashboard; **todos** los e2e de paneles verdes (mismos testids); CI verde.

---

### Fase 3 — DmDashboard: extraer lógica a hooks (P1b)
**Diseño:** `useSceneGraph` (graphRef + undo/redo + saveItems), `useWallDetection`, `usePortalDraft`, `useMovementRange`.  
**Pruebas:** lint, typecheck, vitest (+ specs de hooks si se decide), e2e `map`, `scene`, `dashboard`, `zone`, `portal`, `fog`.

---

### Fase 4 — PlayerView por capas (P3)
**Diseño:** `usePlayerSync(code)` (fetch + WS + polling fallback) y `PlayerHudPanels` (ensamblador de los 3 paneles jugador).  
**Pruebas:** e2e `player-view`, `player-shell`, `dice`, `quest`, `handout`, `calendar`, `audio`.

---

### Fase 5 — SceneRenderer: recibir cálculos (P1/P3)
**Problema:** importa `buildOccluders`, `extractFogRegions`; 30+ props de interacción.  
**Diseño:** el padre calcula `occluders`/`visionRegions` y los pasa por props. Corregir `lightOcclusion.ts:46` (puertas sin escalar, incoherente con walls `:40-41` y zonas `:64-65`).  
**Pruebas:** vitest `light`, `lightOcclusion`, `fogMask`, `playerVision`, `wall-collision`; e2e `light`, `fog`, `player-view`, `zone`.

---

### Fase 6 — Backend: `character_routes.py` por dominio (P5)
**Problema:** 29 funciones, 4 dominios.  
**Diseño:** dividir en `character_routes.py` (characters+npcs), `ability_routes.py` (catálogo + icon/audio), `upload_routes.py` (portraits/models). Helpers privados a `backend/services/`. Sin repositorios ceremoniales.  
**Pruebas:** `cd backend; ..\venv\Scripts\python.exe -m pytest` (debe seguir en 46+).  
**Criterio de aceptación:** pytest verde; `main.py` registra los routers nuevos; contratos HTTP idénticos (verificado por pytest `test_api`).

---

### Fase 7 — Backend: helpers de `routes.py` (P6)
**Diseño:** mover `_asset_rel`, `_asset_abs`, `_parse_dt`, `_embed_asset`, `_collect_assets` a `backend/services/assets.py`.  
**Pruebas:** pytest.

---

### Fase 8 — Resolver el conflicto `wall_detection` (P7) ⚠️ ALTO RIESGO
**Problema:** módulo y paquete con el mismo nombre.  
**Diseño:** renombrar el módulo de 377 líneas a `backend/services/wall_detector_legacy.py` y actualizar `__init__.py` para re-exportar desde ahí. Verificar que `scene_routes.py:271` y `tests/test_wall_detection.py:13` siguen importando igual.  
**Pruebas:** pytest (incluye `test_wall_detection`, `test_ai_detector`, `test_refine`) + e2e `map` (detección de muros).  
**Criterio de aceptación:** pytest verde; sin cambio de comportamiento. **No renombrar sin antes confirmar qué implementa el endpoint `detect-walls` en producción.**

---

### Fase 9 — Limpieza de estructura (P8)
**Diseño:** borrar `.gitkeep` de `core/canon/`, `core/events/`, `core/memory/`, `core/narrative/`, `core/world/` (ya tienen código). Eliminar `core/scenes/` (plural, vacío, no usado — AGENTS.md lo confirma).  
**Pruebas:** `npm run lint`, typecheck, pytest, gate `docs`.

---

### Fase 10 — Tests de componentes (P9)
**Diseño:** vitest para `HudPanel`, `DiceTray`, y hooks extraídos en Fases 3-4. React Testing Library.  
**Pruebas:** vitest 133 → 133+N.

---

## 4. Orden recomendado

**Fase 0 → 1 → 9 → 2 → 3 → 4 → 5 → 6 → 7 → 10**

- **0 y 1**: triviales, alto valor, riesgo casi nulo. Arranque ideal.
- **9**: limpieza de 6 archivos, sin tocar código.
- **2-5**: front grande. Una fase = un commit = CI verde.
- **6-7**: back. Al final porque los helpers de assets son riesgo de datos.
- **8**: SOLO con aprobación explícita (riesgo alto).
- **10**: cobertura, cuando el código ya está estructurado.

---

## 5. Deuda fuera del plan

- Chunk único de Three.js ~552 KB gz (techo 600 KB; target 250 KB sin three) — code-split pendiente.
- e2e flakeables bajo carga: `status S2` (ya endurecido con poll en `6f97905`), `player-view PV2` (vite crash local, `3221226505`).
- `docs/ARCHITECTURE.md` desactualizado; `docs/3D-RENDERER.md` es stub.
- Pathfinding "Planned" en docs vs rango A* ya implementado.

---

## 6. Siguiente acción

**Esperando tu OK para arrancar la Fase 0** (unificar `staticUrl` en 8 archivos). Si quieres ajustar prioridades o el alcance de alguna fase, dime antes de tocar código.