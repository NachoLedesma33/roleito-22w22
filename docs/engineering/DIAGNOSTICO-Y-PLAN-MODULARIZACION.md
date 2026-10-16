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

### Fase 0 — `staticUrl` unificada (P2) — CERO RIESGO, ALTO VALOR — **HECHA**
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

**Resultado:**Hecho. `lib/staticUrl.ts` (contrato defensivo: `null` en vez de URL rota) + `lib/staticUrl.spec.ts` (4 tests: Unix, Windows, sin `/assets/`, vacío). Importada en los 8 archivos; 0 locales. Gates: lint 0 errores (40 warnings baseline), typecheck limpio, vitest 137, e2e `map`+`handout`+`scene`+`dashboard` 26/26 y `player-view` 12/12.

---

### Fase 1 — Tipos duplicados del frontend (P4) — BAJO RIESGO — **HECHA**
**Problema:** `MyChar`, `PlayerToken`, `InventoryItem`, `Spell` re-declarados en `PlayerView.tsx`; `Session` en `AuthContext.tsx`.  
**Diseño:** borrar las declaraciones locales y usar `api.Character`, `api.SceneCharacter`, `api.InventoryItem`, `api.Spell`. Donde el shape difiere (`PlayerToken` vs `SceneCharacter`), agregar en `api.ts` un tipo de vista explícito (`PlayerSceneToken`) en vez de castear. **No tocar `core/domain/types.ts`.**  
**Módulos:** `apps/dm/src/pages/PlayerView.tsx`, `apps/dm/src/contexts/AuthContext.tsx`, `apps/dm/src/lib/api.ts`.  
**Pruebas:** lint, typecheck, vitest, e2e `player-view`, `player-shell`, `login`, `character-sheet`.  
**Criterio de aceptación:** typecheck limpio sin `as unknown as`; grep `interface (MyChar|PlayerToken)` → 0.

**Resultado:** Hecho, con dos correcciones al plan original:
- `MyChar` NO era un tipo nuevo: `GET`/`PUT /characters/{id}` responden `CharacterResponse`, o sea `api.Character` exacto. Se borró el tipo local y `used.character as unknown as MyChar` desapareció (el cast sobra porque `api.abilities.use` ya devuelve `Character`).
- `AuthContext.Session` NO es duplicado de `api.Session`: es la sesión de autenticación (token, `dm_id`, `dm_name`) contra la sesión de juego (número, fecha, notas). No unificar — se renombró a `AuthSession` para sacar la colisión de nombre.
- `Spell` e `InventoryItem` de `PlayerView` eran copias exactas de `api.ts` → borrados. La versión laxa de `InventoryItem` (`[key: string]: unknown`) además era la que mentía: el contrato real ya es `api.InventoryItem`.
- `PlayerToken` sí tenía shape propio (el join del snapshot del jugador): ahora `PlayerSceneToken` en `api.ts`, derivado con `Pick<SceneCharacter, …> & Pick<Character, …>` para no duplicar listas de campos.

**Bug detectado, NO arreglado (decisión de producto):** `PlayerView.tsx:610-611` lee `sc.vision_type ?? 'normal'` y `sc.vision_range ?? 6`, pero el join de `routes.py:1180-1200` **no serializa esos dos campos**. El DM puede configurar visión por token (`DmDashboard.tsx:3460-3510`) y el jugador nunca la recibe: siempre ve con los defaults. Arreglarlo cambia comportamiento de juego, así que queda fuera de la fase de tipos.

---

### Fase 2 — DmDashboard: extraer presentación (P1a) — **EN CURSO (1/5)**

**Decisión de ejecución:** el plan la daba por 1 commit con 4 componentes. Se parte en **5 commits, uno por responsabilidad**, como manda la directiva. Orden por valor/riesgo: (1) cola de toasts, (2) context menus, (3) paleta de comandos, (4) dock, (5) toolbar.

**Corrección al plan — `DmToasts` no se extrae como componente.** `DmDashboard` ya renderizaba `<ToastContainer>` (4 líneas): envolverlo en otro componente es una capa ceremonial, prohibido por la guía. Lo que sí había era **duplicación real**: 27 call sites repetían literalmente `setToastQueue((prev) => [...prev.slice(-4), {...}])`, y el poll de dados usaba un cap distinto (`slice(-5)`) que significaba lo mismo. Eso se resolvió con un hook.

**Commit 1/5 — `useToastQueue` (HECHO):**
- Nuevo `apps/dm/src/lib/toastQueue.ts`: `MAX_TOASTS = 5`, el tipo `ToastRoll`, `rollToToast` y el hook `{ toasts, push, pushMany, dismiss }`. El tipo y el converter se mudan desde `components/ToastContainer.tsx` porque el hook vive en `lib` y **lib no importa de components**; `ToastContainer` queda como vista pura.
- `DmDashboard`: 26 `setToastQueue(...)` → `push(...)`, el poll de dados → `pushMany(...)`, `onDismiss` → `dismiss`. `PlayerView`: los mismos 4 call sites.
- **Efecto lateral esperado:** 22 warnings nuevos de `react-hooks/exhaustive-deps` por `push`/`pushMany` ausentes en los dep arrays. Antes el setter crudo de `useState` era estable por identidad y eslint no preguntaba; ahora las funciones son explícitas y hay que declararlas. Se agregaron a los 22 arrays (es la disciplina correcta, no un parche). Baseline de warnings: 40 → **39** (ToastContainer perdió su `only-export-components` al dejar de exportar el converter).
- Deuda que NO se tocó: `ToastRoll` nació para tiradas de dados y los avisos se construyen con sus campos (`diceType: 20, count: 1, results: [1]`). Separar la forma de aviso de la de tirada cambia texto renderizado y locators de e2e: fase aparte.

**Commit 2/5 — `DmContextMenus` (HECHO):**
- Nuevo `apps/dm/src/components/dm/DmContextMenus.tsx`: los 6 menús contextuales del canvas (token, puerta, muro, zona, luz, niebla). Solo presentación.
- **El `graphRef` no se filtra al componente.** El menú de zona leía `graphRef.getItem(itemId).metadata.portals` en el JSX; ahora `DmDashboard` expone `getZonePortals(itemId)` y el componente recibe la función. Un ref de implementación no viaja a una vista.
- `BackgroundSelector` **no** se extrajo: no es un menú contextual (es un modal) y quedaba partido en medio del bloque.
- Cambio de orden en el DOM: `BackgroundSelector` pasa de estar entre el menú de puerta y el de muro a estar después de los 6. Sin efecto: todos son `fixed z-50` y son mutuamente excluyentes (el click fuera cierra los menús antes de poder abrir el modal).
- `DmDashboard`: −4 imports (los 3 menus + el default de `ContextMenu`), `ContextMenuItem` queda como type-only. Lint sin warnings nuevos (39).

**Commit 3/5 — `DmCommandPalette` (HECHO):**
- Nuevo `apps/dm/src/components/dm/DmCommandPalette.tsx` (Ctrl+K): 13 links de navegación + 15 acciones de panel. El IIFE de 3 niveles con `links`/`actions`/`filtered` se fue con el bloque; ahora son dos arrays y un filtro.
- 15 props de acción, uno por panel. Suena ancho, pero son 15 acciones independientes: agruparlas en un objeto o un store solo camufla el acoplamiento.
- **Duplicación que salió en el camino:** "abrir mapa de la escena activa" estaba escrito dos veces (dock y paleta). Ahora es `openActiveSceneMap`, un `useCallback` con deps `[maps, activeScene]`.
- `campaignId` se tipa `string | undefined` (lo que devuelve `useParams`), no `string`: el JSX viejo lo interpolaba en un template y eso acepta `undefined`. Mentir con `?? ''` habría armado links `/campaigns//manage`.
- **Cobertura nueva:** `tests/e2e/command-palette.spec.ts` (K1-K5). La paleta no tenía **ningún** test antes de moverse, así que el refactor no era verificable sin esto.
  - `data-testid="dm-command-palette"` para scopear los asserts: el dock tiene un botón "Iniciativa" igual que la paleta.
  - Gotcha al escribir el spec: `getByRole({name:'VTT', exact:true})` falla porque el nombre accesible del link es `◆ VTT` (glifo + texto). Match por substring.
  - Gotcha de timing: `goto` retorna antes de que React registre el listener de Ctrl+K → 3 tests colgados 30s. Anclar en `header select` (solo existe cuando el dashboard ya cargó).

**Commit 4/5 — `DmDock` (HECHO):**
- Nuevo `apps/dm/src/components/dm/DmDock.tsx`. 13 botones que eran 110 líneas de JSX casi idéntico → un array. Es el caso que la guía marca como extracción válida: estructura que se repite.
- `groups: DockAction[][]` en vez de un flag `dividerBefore`: el dock ya separa visualmente "sesión" de "herramientas", y el array lo dice sin multiplicar combinaciones.
- `activeClassName` opcional (default `bg-[var(--accent)]`) solo para el asistente, que usa violeta. Un override, no una bandera de estilo.
- **`title="Acciones del DM"` es el atributo más cargado del repo:** 14 specs hacen `getByTitle('Acciones del DM').hover()` para abrir el dock (~30 call sites). Se preservó tal cual en el contenedor externo; si se hubiera perdido, rompían 14 specs de golpe.
- Cambio de DOM: cada grupo se envuelve en un `<div class="flex items-center gap-0.5">`. El contenedor padre tenía las mismas clases, así que el layout es idéntico.
- `MapIcon` (alias de `Map` de lucide) sigue importado en `DmDashboard`: los iconos viajan en el array de acciones, no en el componente.

**Commit 5/5 — `DmToolbar`: DIFERIDO CON MOTIVO (no es presentación)**
Medí el bloque antes de extraerlo (líneas 2160-2501: 342 líneas) y está atado a **36 valores de estado y handlers distintos**: `drawState`, `zoneDraft`, `portalDraft`, `fogMode`, `rectFogMode`, `zoneFogActive`, `lightPlaceMode`, `attachLightMode`, `zoneColor`, `detectionMode`, `useAi`, `detectingWalls`, `wallMaterial`, `doorMaterial`, `startDrawMode`, `startZoneMode`, `startPortalMode`, `startLightPlaceMode`, `handleAutoDetect`, 4× `handleClearAll*`, `openMenu`, 4× rects, 2× refs, `handleToggleLighting`, `handleChangeWeather`, `undoStackRef`/`redoStackRef`/`handleUndo`/`handleRedo`, `showMapMenu`, `maps`/`scenes`/`activeScene`.

Eso no es un componente de presentación con props: es un **panel de control atado a la máquina de estados de herramientas**. Extraerlo sería una firma de 36 props, que es exactamente `prop drilling innecesario`, anti-patrón listado en la guía. También rompe la contigüidad: `AudioSettingsMenu` vive entre el selector de luz y el de clima, así que sacar "el toolbar" exige mover ese componente y reordenar el DOM.

**Ruta alternativa propuesta (2 pasos, en este orden):**
1. `useBuildTools` — agrupar el estado de herramientas (draw/zone/portal/fog/luz/detección/materiales) en un hook. Ahí el acoplamiento baja en el origen, no en la firma.
2. `DmToolbar` como componente que consume ese hook, con una prop de herramientas en vez de 36.

**Lo que sí quedó pendiente de este bloque, y es duplicación real:** el shell de menú anclado se repite 4 veces con 3 mecanismos distintos de click-afuera — `getBoundingClientRect` → rect state → `createPortal` con `left/top ?? -9999`. Un `useAnchoredMenu` + `<AnchoredMenu>` lo eliminaría sin mover el contenido. No se hizo acá porque unificar los 3 mecanismos de dismissal cambia comportamiento de un control muy usado; conviene su propio commit con sus e2e (`zone`, `map`, `weather`, `dashboard`).

**Fase 2-bis — `useAnchoredMenu` + `AnchoredMenu` (HECHA)**
- Nuevo `apps/dm/src/lib/useAnchoredMenu.ts`: rect + cierre por click fuera / Escape. Nuevo `apps/dm/src/components/ui/AnchoredMenu.tsx`: el portal (primitiva de UI, va en `components/ui/`).
- Migrados los 4 menús (construir, mapa, luz, clima). Eliminados: 4 `useState` de rect, 2 refs, `createPortal` de `DmDashboard`, y los **3 efectos de click-afuera**, cada uno con su propio selector.
- El hook **no** guarda el estado de apertura: lo mantiene el dueño, porque luz y clima comparten un `openMenu` para ser mutuamente excluyentes. Decidir si abre y calcular dónde abre son dos cosas distintas.
- Parámetros por menú: `align: 'start' | 'end'`, `width`, `gap`. Cubren las 4 variantes existentes sin flags.

**Cambios de comportamiento (intencionales, documentados):**
1. Construir y mapa ahora también cierran con `Escape` (antes solo luz y clima lo hacían).
2. `role="menu"` quedó en los 4 menús (antes solo luz/clima) y `role="menuitem"` solo en los hijos que ya lo tenían.
3. Click en el disparador de construir/mapa con el menú de luz abierto: antes el de luz **quedaba abierto** porque su listener aceptaba cualquier `[data-menu-root]`; ahora se cierra. Cada menú ignora solo su propio `data-anchor`.
4. `data-menu-root` desaparece (era el selector del mecanismo viejo); cada disparador declara `data-anchor="<id>"`.

Gates: lint 0 err/39 warn, typecheck limpio, e2e **91/91** (`zone`+`map`+`weather`+`dashboard`+`light`+`transitions` = 37; `hud-resize`+`handout`+`notebook`+`quest`+`recap`+`calendar`+`ai`+`dice` = 54).

### Fase 3 — DmDashboard: extraer lógica a hooks (P1b) — **EN CURSO (1/4)**

**Nota de numeración:** la Fase 3 del plan es esta (hooks de `DmDashboard`), NO `PlayerView`. `PlayerView por capas` es la **Fase 4** (`usePlayerSync` + `PlayerHudPanels`); `SceneRenderer` es la Fase 5.

**Commit 1/4 — `useSceneGraph` (HECHO):**
- Nuevo `apps/dm/src/lib/useSceneGraph.ts`. App-level y no de dominio porque llama a `api.scenes`; el dominio puro ya tenía `useDoorInteraction` en `core/scene/`.
- Reúne dos responsabilidades que cambian por motivos distintos: **el grafo** (qué hay en la escena) y **el historial** (qué se deshace y cuándo se persiste). `handleItemsChange` es el único punto de entrada para mutar —lo usan 23 call sites— y ahí se decide la entrada al historial y el guardado.
- Los helpers `sameIds`/`snapshotOf`/`MAX_HISTORY` se van con el hook, y los números mágicos pasan a constantes con nombre (`MAX_HISTORY`, `COALESCE_MS`, `SAVE_DEBOUNCE_MS`).
- `disabled={undoStackRef.current.length === 0}` era una **lectura de ref durante el render**. Ahora el hook devuelve `canUndo`/`canRedo`; el `setUndoBump` interno sigue existiendo, pero solo para forzar el re-render cuando cambian los stacks.
- `handleUndo` limpia la selección vía un callback `onHistoryStep` en vez de recibir setters: el grafo no debe saber que hay un token seleccionado.

**Dos cambios de comportamiento (documentados):**
1. Cleanup del timer de guardado al desmontar. Antes un `saveItems` pendiente podía dispararse después de que la pantalla se fuera.
2. `handleRedo` **no** llama `onHistoryStep`, igual que antes. El original solo limpia la selección al deshacer; parece una inconsistencia, pero arreglarla acá sería cambiar comportamiento sin que nadie lo pida. Queda anotada como deuda.

**Commit 2/4 — `useWallDetection` (HECHO):**
- Nuevo `apps/dm/src/lib/useWallDetection.ts`: `detectionMode`, `useAi`, `detectingWalls`, `detectProposal`, `handleAutoDetect`, `handleDetectApprove`, `handleDetectDiscard`, `pruneProposal`.
- El hook expone `setDetectionMode(mode)` y `toggleAi()` en vez de los setters crudos: la superficie no deja cambiar el modo a algo que el backend no acepta.
- **`handleDeleteItem` (que vive en el dashboard) poda la propuesta** vía `pruneProposal(itemId)`. El hook no recibe setters de otro dominio.
- **`setBuildMenuOpen(false)` salió del hook** y quedó en un `handleDetectClick` del dashboard: cerrar un menú no es responsabilidad de la detección. Reengancharlo fue un paso aparte — sin él, "Detectar paredes" dejaba el menú de Construir abierto.
- El `catch (_err)` sin usar se volvió `catch`: la variable no se usaba.
- i18n por la instancia `i18n.t` y no `useTranslation`, que es lo que evita agregar `t` a los dep arrays de los callbacks: la convención que ya usan las páginas.

Gates: lint 0 err/39 warn, typecheck limpio, vitest 137, e2e **49/49** (`zone`+`portal`+`dashboard`+`map`+`fog`+`scene` = 31; `light`+`status`+`transitions`+`hud-resize` = 18).

**Fuera de esta fase pero candidato real:** los cuatro `handleClearAll{Walls,Zones,Fog,Lights}` son bloques casi idénticos (filtrar por `metadata.type`, remover, guardar, toastear). Es una repetición más chica que la de `useWallDetection` y merece su propio hook.

**Commit 3/4 — `usePortals` (HECHO):**
- Nuevo `apps/dm/src/lib/usePortals.ts`. Se llama así y no `usePortalDraft` porque además de la máquina del draft expone las operaciones sobre portales ya existentes (`handlePortalToggle`/`handlePortalDelete`), que no tocaban el draft.
- **Criterio de capa, medido contra el código:** `core/scene/*` importa solo `react` y `@core/*`, nunca `@/lib`. `useDoorInteraction` vive ahí porque es dominio puro. `usePortals` **no** puede ir ahí porque notifica (`push` + `i18n`). Regla que queda: si el hook llama a la API o emite una notificación, es de aplicación (`lib/`).
- `startPortalMode` del hook solo crea el draft. Los cuatro `setRectFogMode`/`setDrawState`/`setZoneDraft`/`setBuildMenuOpen` que el original apagaba quedaron en `handleStartPortal` del dashboard, porque "salir de los demás modos" no es cosa del portal.
- Las 5 llamadas externas `setPortalDraft(null)` (zonas, tres de niebla y la tecla Escape) pasaron a `cancelPortalMode()`.

**Gotchas de esta extracción (repetibles):**
1. El bloque original tenía `portalZones` (un `useMemo` compartido con la niebla de zona) intercalado entre los callbacks. Borrar "el rango del hook" a ciegas se lo lleva: había que borrar **dos** tramos.
2. `handleItemsChange` y `push` viven en hooks declarados más arriba, así que el nuevo hook tiene que declararse **antes** del primer consumidor; si no, los dep arrays de los callbacks de arriba lo referencian antes de declararse (`TS2448` / `TS2454`).
3. Los helpers de portal (`createPortalBetween`, `buildPortalLocalEdge`, `cyclePortalState`, `removePortal`) están en `@/components/ZonePortal`, no en `@core/scene/wall-collision`. Importarlos del módulo equivocado, además de fallar, tira errores `TS2367` en cascada sobre `wall-collision.ts` y confunde el diagnóstico.

Gates: lint 0 err/**39 warn** (los 6 `cancelPortalMode` faltantes en dep arrays se declararon), typecheck limpio, vitest 137, e2e **41/41** (`portal`+`zone`+`fog`+`map` = 19; `dashboard`+`light`+`transitions`+`status` = 22). Un primer run dio 36 `ERR_CONNECTION_REFUSED` en 5173 — crash de vite local conocido, resuelto con re-run sin tocar specs.

**Commit 4/4 — `useMovementRange`: DIFIERIDO, se extrajo lo que de verdad estaba duplicado**

El plan pedía un hook `useMovementRange`. Al mirarlo, sería una capa ceremonial: las dos funciones que llama (`buildOccluders`, `computeReachableCells`) ya viven en `lib/` y ya tienen tests. El `useMemo` del componente es un adaptador de 15 líneas entre el estado y esas funciones puras: un hook que toma 5 parámetros y llama uno no elimina ninguna responsabilidad.

Lo que sí estaba duplicado es **la derivación del tamaño del mundo**: `const mapH = 10 * mScale` aparecía **9 veces en 2 archivos** (`DmDashboard` ×8, `PlayerView` ×1), con nombres de variable distintos (`mapH`, `mapSize`, `mapHeight`, `mapperH`) y a veces sin la línea del `mapW`. El `10` es la media-ancho del mundo en unidades de grilla, escrito a mano y sin nombre.

- Nuevo `apps/dm/src/lib/sceneWorld.ts`: `WORLD_HALF_SPAN = 10`, `sceneWorldHeight(mapScale)` y `sceneWorldSize(mapScale, aspect)`.
- Los 9 call sites pasan a la función. Quedan **0** ocurrencias de `10 * mScale` en el repo.
- Nuevo `sceneWorld.spec.ts` (5 tests). **El test destapó que yo tenía mal la convención:** afirmé que `x / mapW + 0.5` daba 1 en el borde, cuando `mapW` es semi-ancho y el rango normalizado va de `x = -mapW/2` a `x = +mapW/2`. El código estaba bien; el test estaba mal. La convención quedó escrita en el JSDoc del módulo, que es donde se la va a leer.

Gates: lint 0 err/39 warn, typecheck limpio, vitest **142** (137+5), e2e **74/74** (`map`+`scene`+`zone`+`portal`+`player-view`+`dashboard`+`fog` = 43; `player-view`+`map`+`zone`+`transitions`+`status` = 31).
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

### Fase 4 — PlayerView por capas (P3) — **CIERRE**
**usePlayerSync (HECHO, PUSHEADO):** nuevo `apps/dm/src/lib/usePlayerSync.ts`. Reúne el join inicial (`GET /invite/{code}`), el WebSocket de revisiones y el poll de respaldo (`GET /invite/{code}/revision` cada `POLL_MS=16ms`) en un solo hook. El snapshot solo se pide cuando la revisión cambió; el poll se silencia cuando el WS está abierto.
- `PlayerView.tsx` pasa de ~1850 a ~1700 líneas; el bloque de sync (líneas 204-366 del original) se reemplaza por una llamada al hook que recibe `sceneIdRef`, `choiceRef`, `wasdTargetRef` (compartidos con el loop de movimiento WASD).
- Tipos `JoinData`, `PlayerCharOption`, `Choice` mudan a `lib/usePlayerSync.ts`; `PlayerSceneToken` ya vivía en `api.ts`.
- **Lección:** al borrar el bloque original por rango, se perdió `setSharedAudio` (sincronizar volumen maestro del DM al jugador). Quedó anotado como deuda: es un useEffect de 3 líneas que se puede re-agregar sin tocar el hook (lee `data?.audio`).
- `lastMoveDirRef` se redeclaró junto a `lastMoveAtRef` (se había perdido al borrar el bloque).
- **Cuidado al borrar bloques por rango:** siempre listar el bloque celda por celda antes de borrar; un segundo `-match` en PowerShell pisa `$Matches` y corrompe el índice.

Gates: lint 0 err/39 warn, typecheck limpio, vitest 142, e2e `player-view`+`player-shell` **17/17** (re-run tras un primer intento con 36 `ERR_CONNECTION_REFUSED` = crash de vite local conocido).

**Deuda saldada (commit `e41729b`):** el `useEffect` de `setSharedAudio(normalizeSharedAudio(data?.audio))` volvió a `PlayerView` (3 líneas + import). Confirma la lección de "borrar por rango": leer el bloque celda por celda antes de cortar.

**PlayerPanels (HECHO, este commit):** nuevo `apps/dm/src/components/player/PlayerPanels.tsx` con dos exportaciones puras:
- `PlayerPanelToggles`: los 3 botones (misiones / calendario / documentos) se pintan desde un array `PlayerPanelToggle[]` en vez de 3 bloques de JSX repetidos; mismo patrón de datos que `DmDock.groups`.
- `PlayerPanels`: monta `PlayerQuestPanel` / `PlayerCalendarPanel` / `PlayerHandoutPanel` según `open: Partial<Record<PlayerPanelId, boolean>>`.

El estado colapsó de 3 `useState` + 6 setters a 1 `openPanels` + `togglePanel`/`closePanel`, así que agregar un panel es una entrada en el `useMemo` de toggles, no un booleano nuevo. Los botones solo existen para `choice?.kind === 'character'` (el filtro vive en el memo, el fragmento vacío no genera nodo).

Los tres botones se moved de la `TopBar` al componente pero **conservan `title` y `data-testid`** (`Misiones`, `Calendario`, `player-handouts-toggle`), que es lo que matchean `quest.spec.ts`, `calendar.spec.ts` y `handout.spec.ts`.

`PlayerView.tsx`: ~1700 → ~1600 líneas. `DiceRoller` **no** se extrajo: es el único panel con estado propio (tirada pendiente, init) y `onRollCreated` actualiza `lastRollTsRef`, que el poll de toasts comparte.

Gotcha: el `useMemo` de toggles quedó después del early return de `loading`/`error` y eslint lo marcó (`rules-of-hooks`). Va antes del `if (loading...)`.

Gates: lint 0 err/43 warn, typecheck limpio, vitest 142, e2e `quest`+`calendar`+`handout` **11/11**, `player-view`+`player-shell` **17/17**.

**Siguiente:** Fase 5 (`SceneRenderer` recibe `occluders`/`visionRegions` por props; `lightOcclusion.ts:46` puertas sin escalar). `PlayerView` ya no tiene un bloque grande pendiente: lo que queda (ficha, grimorio, selector de personaje) es cohesivo.

---

### Fase 5 — SceneRenderer: recibir cálculos (P1/P3) — **EN CURSO**
**Problema:** importa `buildOccluders`, `extractFogRegions`; 30+ props de interacción.  
**Diseño:** el padre calcula `occluders`/`visionRegions` y los pasa por props. Corregir `lightOcclusion.ts:46` (puertas sin escalar, incoherente con walls `:40-41` y zonas `:64-65`).  
**Pruebas:** vitest `light`, `lightOcclusion`, `fogMask`, `playerVision`, `wall-collision`; e2e `light`, `fog`, `player-view`, `zone`.

**Commit 1 `732de02` — bug de puertas (HECHO):** `buildOccluders` empujaba la línea de la door con los puntos normalizados **sin convertir**, mientras wall `:40-41` y zone polygon `:64-65` sí lo hacen. El oclusor caía en 0..1 pegado al origen: una puerta cerrada no tapaba luz. La prueba de que los puntos de door son normalizados está en `buildLoSOccluders` (`losSystem.ts:41-43`), que sí convierte.
- El test viejo no lo veía: usaba puntos tipo `[2,0,2,1]` y solo miraba `length`. Ahora compara door vs wall con los mismos puntos, y un caso de mapa apaisado (X con `mapWidth`, Y con `mapHeight`).
- Verificado que **fallan sin el fix** (stash: 11 pass / 2 fail).
- Gates: lint 0 err/43 warn, typecheck limpio, vitest 144, e2e `light`+`fog`+`transitions` 14/14.

**Commit 2 — cálculos por props (este commit):** `SceneRenderer` deja de importar `buildOccluders`/`extractFogRegions`; recibe `occluders: Occluder[]` y `fogRegions: FogRegion[]`. El prop `playerFogRegions` desaparece: la mezcla (niebla de escena + visión del jugador) la hace ahora el padre, que es quien tiene las dos fuentes.
- `DmDashboard`: `sceneOccluders`/`sceneFogRegions` con `useMemo`, y el rango de movimiento **reusa** `sceneOccluders` en vez de recalcular la misma lista (antes había dos `buildOccluders` vivos con el mismo input).
- `PlayerView`: `sceneFogRegions = extractFogRegions(items) + visionRegions`; `sceneOccluders` con el `mapperW/mapperH` que ya tenía para la visión.
- `SceneDetail` (preview read-only, sin items) pasa dos constantes de módulo `NO_OCCLUDERS`/`NO_FOG_REGIONS`: evita arrays nuevos en cada render y deja claro que ahí no hay nada que calcular.
- El aspect sigue siendo del render: `onAspectChange` lo sube a la vista, y la vista calcula las dimensiones con `sceneWorldSize(mapScale, aspect)`. Mismo arranque que antes (aspect 1 hasta que carga la imagen).
- Gates: lint 0 err/43 warn, typecheck limpio, vitest 144, e2e dirigido `scene`+`light`+`fog`+`status`+`portal`+`map`+`player-view`+`player-shell` = **43 passed / 1 flaky / 1 failed**, con `status` S1/S2 **verificados rojos en HEAD sin estos cambios** (2 failed / 1 passed): son pre-existentes, el helper `openTokenMenu` corta a los 700 ms con la vista todavía en "Cargando escena 3D...".

**Bug pendiente del mismo tipo (NO tocado):** `losSystem.ts:64-65` usa `mapHeight` para la X de la última arista de cada zona polygon (debería ser `mapWidth`). Con mapa apaisado la visión del jugador se recorta mal contra zonas. No lo detectan los tests porque `losSystem.spec.ts` siempre usa mapas cuadrados `(10,10)`.

**Commit 3 — `losSystem.ts:64` (HECHO):** la X de la arista de cierre de cada zona polygon ahora escala con `mapWidth`, como walls y doors. Con mapa apaisado la zona salía comprimida en X y la visión del jugador se recortaba antes de tiempo (la zona tapaba como si estuviera más cerca).
- 2 tests nuevos: zona 0.3..0.7 en mapa 20×10 → rectángulo −4..4 en X y −2..2 en Y; muro 0..1 → `[−10, 0] → [10, 0]`. El de la zona **verificado que falla sin el fix** (stash: 9 pass / 1 fail).
- El assert va con `toBeCloseTo`, no `toEqual`: `(0.7 − 0.5) × 20 = 3.999999999999999` y el exacto falla por ruido de float, no por el bug.
- Gates: lint 0 err/43 warn, typecheck limpio, vitest 146, e2e `fog`+`player-view`+`player-shell`+`zone` **24/24** (el primer intento dio 6 passed / 18 failed por el crash conocido de `vite dev` — `npm error code 3221226505` = 0xC0000409 — a mitad del run, con 35× `ERR_CONNECTION_REFUSED` después; reintento con boot limpio 24/24).

---

### Fase 6 — Backend: `character_routes.py` por dominio (P5) — **CIERRE**
**Problema:** 29 funciones, 4 dominios.  
**Diseño:** dividir en `character_routes.py` (characters+npcs), `ability_routes.py` (catálogo + icon/audio), `upload_routes.py` (portraits/models). Helpers privados a `backend/services/`. Sin repositorios ceremoniales.  
**Pruebas:** `cd backend; ..\venv\Scripts\python.exe -m pytest` (debe seguir en 46+).  
**Criterio de aceptación:** pytest verde; `main.py` registra los routers nuevos; contratos HTTP idénticos (verificado por pytest `test_api`).

**Baseline real: 90 tests** (la cifra 46 del diagnóstico quedó vieja). Los tres commits quedan en 90.

**`25a972a` — helpers a `backend/services/` (sin mover rutas todavía):**
- `services/vida.py`: `DEFAULT_MAX_PV/PM/DEFENSE`, `spell_payload`, `load_spells_bulk`, `load_spells`, `replace_spells`, `apply_vida_response`, `apply_npc_vida_response`. Lo necesitan varios routers (los uploads devuelven la ficha actualizada), así que no puede ser privado de uno.
- `services/assets.py`: `ASSETS_DIR` (estaba escrito en 5 módulos con dos variantes: una normalizada y otra no), `save_campaign_file`, `remove_asset_file`. El "borrar el viejo antes de guardar el nuevo" estaba repetido en los 8 endpoints de upload.
- Los 8 uploads pasan por `save_campaign_file`: ~40 líneas de `makedirs` + `open/write` repetidas, ahora una llamada.
- `services/__init__.py` explícito, para no depender de namespace packages.

**`c3ee581` — `ability_routes.py`:** catálogo + icono/audio + `/use` (8 endpoints, tag `abilities` en vez de caer bajo `characters,npcs`). Se mueven tal cual; `character_routes.py` pierde los imports que solo el catálogo usaba.

**`1f48d7e` — `upload_routes.py`:** retratos y modelos 3D (4 endpoints, tag `uploads`), con `_get_character`/`_get_npc` en vez del lookup copiado 4 veces.

**Estructura final:** `character_routes.py` 821→**273** (CRUD fichas), `ability_routes.py` 252, `upload_routes.py` 128, `services/vida.py` 181, `services/assets.py` 42. `main.py` registra los 3 routers con prefix `/api` como los otros 24.

**Verificación de contratos:** además de pytest, se listó `app.routes` y se compararon paths y métodos de las 12 rutas movidas (8 abilities + 4 uploads): idénticos. `test_api.py` cubre catálogo, icono preset/upload/delete, audio upload/delete, delete con purga de enlaces, `/use` con PM + evento + campaña ajena; el upload de retrato lo cubren C11 (e2e) y `test_api`. Frontend intacto → sin e2e local; CI corre la suite completa en el push.

**Nota:** `ASSETS_DIR` sigue duplicado en `handout_routes.py`, `player_routes.py`, `scene_routes.py` y `main.py`. Fase 7 (`services/assets.py` + `_asset_rel`/`_asset_abs` de `routes.py`) es el momento de que apunten al del servicio.

**Regresión que dejó el CI en rojo (`74e0478`; el fix va en commit aparte):** shards e2e 1 y 3 con `createNpc failed: 500` → `ResponseValidationError: inventory_json Input should be a valid list, input: {}`. Causa: al copiar `apply_npc_vida_response` a `services/vida.py` quedó `npc.inventory_json or {}` donde el original era `or []`. pytest (90) no lo vio porque **ningún test de `test_api.py` creaba un NPC por API**: el contrato de `NPCResponse` solo lo ejercitaba el e2e.

Lección: mover código a mano no es "mover", es reescribir, y una línea mal tipeada es una bomba que solo explota si algo la ejecuta. Por eso el fix trae dos cosas:
1. `test_alta_de_personajes_y_npcs_respeta_el_contrato`: alta de personaje y de NPC, defaults de vida, `inventory_json`/`spells_json` vacíos, GET y listado idénticos al alta, y el upload de retrato (que devuelve la ficha). **Verificado que falla con el typo y pasa con el fix.**
2. Verificación mecánica del movimiento: comparación línea por línea del `character_routes.py` viejo contra los 4 archivos nuevos, normalizando renombraciones. Las 38 diferencias tienen que ser las previstas (`ASSETS_DIR`, los dos `remove_*_file`, los 8 bloques de upload, la firma partida de `load_spells`): con eso no queda otro typo escondido. Vale repetirlo en cada movimiento de código de esta fase.

**Segundo rojo del CI, y este era un bug viejo (commit aparte):** shard 1 también cayó en `campaign C11` (assets binarios viajan en export e import). Al normalizar `ASSETS_DIR` (commit `25a972a`) el path del retrato dejó de llevar el prefijo `backend/../`, y C11 —que asserta `dstPath !== srcPath`— pasó a fallar. Causa real: **el import nunca copió los assets a la campaña destino**: escribía los bytes con `_asset_abs(rel)` sobre el path que venía en el JSON, que es el de la campaña **origen**, y dejaba las columnas apuntando ahí. La aserción del test pasaba por el formato del path, no por el comportamiento.

Fix: `services.assets.rewrite_campaign_prefix(rel, campaign_id)` + `asset_rewrites` en el import + `imported_path(value)` para las 9 columnas (retratos, modelos, fondos, audio, mapas, thumbnails, assets). Ahora borrar la campaña de origen no rompe la importada.

Lección: un test verde por el motivo equivocado es peor que un test rojo. C11 llevaba tiempo probando el prefijo del path en vez de la reescritura de campaña; el fix del path (correcto por sí) lo sacó a la luz. Cuando un test falla después de un refactor, primero preguntarse qué estaba realmente midiendo.

Gap que sigue (documentado, no tocado): un asset de más de 8 MB no viaja (queda `skipped` en el export) y al importar su columna queda apuntando al archivo de la campaña de origen. Es el mismo criterio de cap que ya está anotado en `IMPLEMENTATION-STATUS`.

---

### Fase 7 — Backend: helpers de `routes.py` (P6) — **CIERRE**
**Diseño:** mover `_asset_rel`, `_asset_abs`, `_parse_dt`, `_embed_asset`, `_collect_assets` a `backend/services/assets.py`.  
**Pruebas:** pytest.

**HECHO (un commit).** A `backend/services/assets.py`: `MAX_ASSET_BYTES`, `asset_rel`, `asset_abs`, `import_asset_path`, `embed_asset`, `collect_assets`. Pasan a ser públicos porque ahora son de un servicio, no privados de un router.

**`_parse_dt` NO se movió (desviación deliberada del plan).** El plan lo metía en `services/assets.py`, pero no es un helper de assets (es parseo de datetime) y se usa 2 veces, ambas dentro de `routes.py`. Sigue privado ahí. Si algún día lo usa otro módulo, la casa correcta es un `services/dates.py`, no `assets.py`.

**Con esto `ASSETS_DIR` quedó definido una sola vez**, en `services/assets.py`. `handout_routes.py`, `player_routes.py`, `scene_routes.py` y `main.py` dejaron de redefinirlo (había 5 copias con 2 variantes: una normalizada y otra no). `routes.py`: 1243 → ~1140 líneas.

Gates: pytest 91, ruff limpio, e2e `campaign`+`handout`+`map`+`scene` **30/30**.

**Gotcha de tooling:** escribir con `[System.IO.File]::WriteAllLines` desde PowerShell deja CRLF y `.gitattributes` fuerza LF. Normalizar a LF antes de commitear, o el próximo `git status` ensucia el diff.

---

### Fase 8 — Resolver el conflicto `wall_detection` (P7) ⚠️ ALTO RIESGO
**Problema:** módulo y paquete con el mismo nombre.  
**Diseño:** renombrar el módulo de 377 líneas a `backend/services/wall_detector_legacy.py` y actualizar `__init__.py` para re-exportar desde ahí. Verificar que `scene_routes.py:271` y `tests/test_wall_detection.py:13` siguen importando igual.  
**Pruebas:** pytest (incluye `test_wall_detection`, `test_ai_detector`, `test_refine`) + e2e `map` (detección de muros).  
**Criterio de aceptación:** pytest verde; sin cambio de comportamiento. **No renombrar sin antes confirmar qué implementa el endpoint `detect-walls` en producción.**

---

### Fase 9 — Limpieza de estructura (P8) — **HECHA**
**Diseño:** borrar `.gitkeep` de `core/canon/`, `core/events/`, `core/memory/`, `core/narrative/`, `core/world/` (ya tienen código). Eliminar `core/scenes/` (plural, vacío, no usado — AGENTS.md lo confirma).  
**Pruebas:** `npm run lint`, typecheck, pytest, gate `docs`.

**Resultado:** Hecho, con dos correcciones al plan:
- El plan se olvidó de `infrastructure/ai/` y `infrastructure/tts/`: también tienen código real (`base.py`/`factory.py`/`mock.py`/…) con su `.gitkeep` huérfano. Borrados.
- **NO** se borran los `.gitkeep` de `apps/player/`, `apps/renderer/` (placeholders documentados a propósito), `assets/*`, `data/*` e `infrastructure/{database,search,storage}`: esos directorios están genuinamente vacíos y existen para que el runtime los encuentre o para marcar intención.
- `core/scenes/` no tenía una sola referencia en código (solo menciones en docs, las dos de esta fase). `AGENTS.md` actualizado para que la regla pase de "no se usa" a "`core/scene/` singular, no crear el plural".

**Inconsistencia detectada, NO arreglada (fuera del diseño de la fase):** `core/canon/`, `core/events/`, `core/memory/` y `core/world/` no tienen `__init__.py`; `core/narrative/` y `core/agents/` sí. Funciona igual por namespace packages (PEP 420), pero es asimétrico y confunde. Agregar los `__init__.py` es una fase aparte: son archivos NUEVOS, no limpieza de huérfanos.

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

**Fases 0, 1 y 9 cerradas.** Siguiente: **Fase 2** (extraer presentación de `DmDashboard`: `DmToolbar`, `DmDock`, `DmContextMenus`, `DmToasts` → `DmDashboard` queda como orquestador de estado) → 3 `PlayerView` → 4 `SceneRenderer` → 5 listas masivas → 6-7 backend. Fase 8 (`wall_detection.py` vs `wall_detection/`) solo con aprobación explícita.

Pendiente de decisión de producto (no es refactor): la visión por token que el DM configura nunca llega al jugador — el join del snapshot no serializa `vision_type`/`vision_range`.