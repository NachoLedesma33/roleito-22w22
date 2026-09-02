# Plan: Tokens, Tablero y Movement System

> **Proyecto**: Roleito — VTT Dashboard
> **Fecha**: 2026-09-02
> **Estado**: BORRADOR (pendiente revisión del usuario)

---

## Problema Actual

Los tokens (fichas/personajes) en el tablero 3D tienen limitaciones importantes:

1. **Escalado fijo**: el mapa siempre mide 10 unidades de alto en world-space. No se puede configurar desde UI.
2. **Token size fijo**: sprites = radio 0.4, modelos 3D = scale `[1,1,1]`. No hay ajuste por escena.
3. **Sin colisiones**: los tokens pueden salirse del mapa completamente.
4. **Sin grid/snapping**: posiciones son floats arbitrarías, no hay grilla.
5. **Cámara limitada**: `maxDistance=25` no alcanza para mapas grandes.
6. **Mapa sin dimensiones**: coordenadas normalizadas 0-1 pero no se almacena el tamaño real.

### Limitaciones identificadas

| # | Limitación | Archivo | Línea |
|---|-----------|---------|-------|
| 1 | Mapa height = 10 unidades hardcoded | `SceneRenderer.tsx` | 46-47 |
| 2 | Token sprite radio = 0.4 fijo | `TokenSprite.tsx` | 70 |
| 3 | TokenModel scale = [1,1,1] fijo | `TokenModel.tsx` | 54 |
| 4 | clampToBackground() solo limita a bordes del mapa | `SceneRenderer.tsx` | 139-154 |
| 5 | Camera maxDistance = 25 | `SceneRenderer.tsx` | 390 |
| 6 | Camera minDistance = 3 | `SceneRenderer.tsx` | 390 |
| 7 | Token placement random: `Math.random() * 4 - 2` | `DmDashboard.tsx` | 170 |
| 8 | MOVE_SPEED = 0.15 por frame (3 units/sec) | `PlayerView.tsx` | 391 |
| 9 | No grid overlay visible | — | — |
| 10 | No distance measurement entre tokens | — | — |

---

## Fase 1: Map Scale Configuration (UI)

**Objeto**: que el DM pueda configurar el tamaño del mapa desde la UI, no desde código.

### 1.1 Scene Settings Panel

- Nuevo panel HUD: **"Scene Settings"** (accesible desde TopBar o click derecho en escena)
- Campos:
  - **Map Scale**: slider `1x` a `50x` (default `1x` = 10 unidades actuales). Multiplica el tamaño del fondo.
  - **Map Width/Height**: display calculado (`scale × 10` × aspect ratio), editable
  - **Grid Size**: toggle on/off + tamaño de celda (1, 2, 5 unidades)
  - **Grid Snap**: toggle on/off → los tokens se snapan al grid más cercano
- Persistir en `scenes` table: columnas `map_scale FLOAT DEFAULT 1`, `grid_size FLOAT DEFAULT 0`, `grid_snap BOOLEAN DEFAULT 0`
- Migración SQLite add column

### 1.2 Background scaling

- `SceneBackground`: multiplicar `width` y height por `mapScale`
  - Antes: `const width = 10 * aspect; height = 10`
  - Después: `const height = 10 * mapScale; const width = height * aspect`
- El plano se escala proporcionalmente, el mapa "crece" en world-space

### 1.3 Camera auto-adjust

- Cuando el mapa es más grande, ajustar `maxDistance` proporcionalmente:
  - `maxDistance = 25 * mapScale` (o al menos `mapScale * 15`)
  - `minDistance` se mantiene en 3 (para no perder el zoom-in)
- Opcional: botón "Fit to map" que centra la cámara para ver todo el mapa

---

## Fase 2: Token Scale Configuration (UI)

**Objeto**: que el DM pueda cambiar el tamaño de los tokens desde la UI.

### 2.1 Token Scale por Scene Character

- Agregar columna `token_scale FLOAT DEFAULT 1` a `scene_characters`
- Migración SQLite

### 2.2 UI de escalado

- En el **Token Tray** (panel inferior izquierdo), al seleccionar un token:
  - Slider "Size" de `0.5x` a `3x` (default `1x`)
  - Aplica `scale={[tokenScale, tokenScale, tokenScale]}` al grupo del token
- En **CharacterSheet** (al ver ficha de un personaje en escena):
  - Sección "Token Scale" con slider
  - Guarda via `PATCH /scenes/{sid}/characters/{cid}`

### 2.3 TokenModel adjustments

- `TokenModel.tsx`: reemplazar `scale={[1,1,1]}` por `scale={[s,s,s]}`
- Auto-ground offset: multiplicar por `tokenScale` para que los pies sigan en Y=0
- Bounding box: recalcular para colisiones (ver Fase 3)

### 2.4 TokenSprite adjustments

- `TokenSprite.tsx`: radio del círculo = `0.4 * tokenScale`
- Selection ring: proporcional
- Text size: proporcional
- Name label: offset Y proporcional

---

## Fase 3: Collision System

**Objeto**: los tokens no pueden salirse del mapa ni superponerse entre sí.

### 3.1 Boundary Collision (mapa)

- **Regla**: token position debe estar dentro del AABB del mapa
- `clampToBounds(x, z, mapWidth, mapHeight, tokenRadius)`:
  ```
  minX = -mapWidth/2 + tokenRadius
  maxX =  mapWidth/2 - tokenRadius
  minZ = -mapHeight/2 + tokenRadius
  maxZ =  mapHeight/2 - tokenRadius
  return { x: clamp(x, minX, maxX), z: clamp(z, minZ, maxZ) }
  ```
- Aplicar en:
  - `clampToBackground()` (ya existe, refactorizar con tokenRadius)
  - `handleTokenDrop()` → clamp antes de persistir
  - PlayerView WASD movement → clamp en cada tick
  - API `PATCH /scenes/{sid}/move` → clamp en backend también

### 3.2 Token-Token Collision (opcional, fase 2)

- **Regla**: tokens no se superponen (distancia mínima = suma de radios)
- Al hacer drop de un token, si colisiona con otro → empujar hacia la dirección opuesta
- Implementación simple: `separateTokens(tokenA, tokenB)` calcula vector de separación y mueve el que se está droppeando
- No mover tokens estáticos — solo el que se arrastra

### 3.3 Collision con markers/obstáculos (fase 3)

- Cada `MapMarker` puede tener `blocking: boolean` (columna nueva)
- Marcadores bloqueantes actúan como obstáculos circulares (radio configurable)
- Tokens no pueden pasar a través de marcadores bloqueantes
- Útil para: paredes, puertas cerradas, trampas

### 3.4 Wall/obstacle system (fase 4, futuro)

- Definir paredes como líneas en el mapa (2 puntos + grosor)
- Raycast token→destino, si intersecta pared → bloquear movimiento
- Más complejo pero más potente que solo markers
- **Prioridad BAJA** — resolver con markers bloqueantes primero

---

## Fase 4: Grid System

**Objeto**: overlay de grilla visible + snapping opcional.

### 4.1 Grid Overlay

- Nuevo componente `GridOverlay` en SceneRenderer
- Renderiza líneas sobre el plano del mapa:
  ```
  for x in range(-width/2, width/2, gridSize):
    draw line from (x, 0.01, -height/2) to (x, 0.01, height/2)
  for z in range(-height/2, height/2, gridSize):
    draw line from (-width/2, 0.01, z) to (width/2, 0.01, z)
  ```
- Material: `LineBasicMaterial` semi-transparente (`opacity: 0.3`)
- Toggle on/off via Scene Settings

### 4.2 Grid Snap

- Cuando `gridSnap` está activo, al dropear un token:
  - `snappedX = Math.round(x / gridSize) * gridSize`
  - `snappedZ = Math.round(z / gridSize) * gridSize`
- También en WASD movement del jugador: cada paso = `gridSize` en vez de `MOVE_SPEED`
- Visual feedback: token se "siente" que se alinea al grid

### 4.3 Distance Measurement

- Al seleccionar un token + Shift+click en otro:
  - Calcular distancia Euclidiana: `sqrt((x2-x1)² + (z2-z1)²)`
  - Mostrar en tooltip/overlay: "12.5 units (6 squares)"
  - Si gridSize está configurado, mostrar también en cuadrados
- Útil para medir rango de habilidades, movimento, etc.

---

## Fase 5: Large Map Support

**Objeto**: soporte para mapas grandes con pan/zoom adecuado.

### 5.1 Camera adjustments

- `maxDistance` dinámico basado en `mapScale`:
  - `maxDistance = max(25, mapScale * 15)`
  - Para `mapScale=5`: maxDistance = 75 (se ve todo el mapa de 50 unidades)
- `OrbitControls` target: centrado en el mapa, no en (0,0,0)
- Botón "Fit to map" en TopBar: centra cámara para ver mapa completo

### 5.2 Mini-map (fase 2)

- Overlay pequeño en esquina inferior-derecha
- Muestra vista aérea del mapa completo con posición de tokens
- Click en mini-map → mueve la cámara a ese punto
- Útil en mapas grandes donde el viewport solo muestra una porción

### 5.3 Fog of War (fase 3, futuro)

- Overlay oscuro que cubre áreas no exploradas
- El DM pinta qué áreas están visibles
- Los jugadores solo ven lo que el DM revela
- **Prioridad BAJA** — funcional sin esto

---

## Fase 6: Movement Improvements

**Objeto**: movimiento más intuitivo y medible.

### 6.1 Movement speed por token

- Columna `move_speed FLOAT DEFAULT 1` en `scene_characters`
- PlayerView: `MOVE_SPEED = 0.15 * moveSpeed`
- Permite tokens más lentos (armadura pesada) o más rápidos (pícaro)

### 6.2 Facing direction

- Ya existe `rotation` en `SceneCharacter` (commit `4355d72`)
- Mostrar flecha de dirección en el token (朝向 indicator)
- Q/E rotan el token, WASD mueve en la dirección del facing

### 6.3 Path preview

- Al presionar Shift+WASD: mostrar línea punteada del camino que va a recorrer
- Calcular distancia total del camino
- Útil para planificar movimientos de combate

### 6.4 Turn-based movement (fase 2)

- Modo "combat": cada turno tiene puntos de movimiento (ej. 6 cuadrados)
- Mover消耗 puntos. Cuando se acabó, no puede mover más
- Reset al siguiente turno
- Integrar con InitiativeTracker

---

## Archivos a modificar

| Archivo | Cambios |
|---------|---------|
| `components/SceneRenderer.tsx` | Map scale, camera dynamic, collision system, grid overlay |
| `components/TokenSprite.tsx` | Token scale prop, radio proporcional |
| `components/TokenModel.tsx` | Token scale prop, auto-ground proporcional |
| `pages/DmDashboard.tsx` | Scene Settings panel, token scale UI, collision on drop |
| `pages/PlayerView.tsx` | Collision on WASD, movement speed, facing |
| `lib/api.ts` | Scene settings types, scene character scale |
| `backend/models.py` | map_scale, grid_size, grid_snap, token_scale, move_speed columns |
| `backend/routes.py` | PATCH scene settings, clamp on move endpoint |
| `backend/schemas.py` | SceneSettings schema |
| `components/SceneSettingsPanel.tsx` | **NUEVO** — panel de configuración de escena |
| `components/GridOverlay.tsx` | **NUEVO** — overlay de grilla |

---

## Orden de Implementación

1. **Map Scale UI** (Fase 1.1-1.3) — base para todo lo demás
2. **Boundary Collision** (Fase 3.1) — seguridad básica
3. **Token Scale UI** (Fase 2.1-2.4) — UX inmediata
4. **Grid Overlay + Snap** (Fase 4.1-4.2) — utilidad para el DM
5. **Distance Measurement** (Fase 4.3) — QoL
6. **Large Map Camera** (Fase 5.1) — necesario para mapas grandes
7. **Token-Token Collision** (Fase 3.2) — polish
8. **Movement Improvements** (Fase 6.1-6.4) — avanzado
9. **Mini-map** (Fase 5.2) — futuro
10. **Fog of War** (Fase 5.3) — futuro

---

## Criterios de Aceptación

- [ ] DM puede cambiar Map Scale desde Scene Settings (slider 1x-50x)
- [ ] Mapa crece visualmente al aumentar scale
- [ ] Cámara se ajusta para ver mapa completo
- [ ] DM puede cambiar tamaño de tokens (slider 0.5x-3x)
- [ ] Tokens no pueden salirse del mapa (boundary collision)
- [ ] Grid overlay visible y toggleable
- [ ] Grid snap funciona (tokens se alinean al grid)
- [ ] Distancia se muestra al Shift+click entre tokens
- [ ] Escala y grid persisten en BD por escena
- [ ] Sin regression en E2E existentes
