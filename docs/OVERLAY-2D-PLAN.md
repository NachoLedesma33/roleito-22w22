# Overlay 2D + Toolbar + Cono — Plan (2026-09-17)

Contexto: la app renderiza mapas 2D (plano con imagen) con perspectiva 3D. Los overlays
que pinta el build (luces, zonas, walls, niebla, drafts) hoy tienen alturas hardcodeadas
diversas y quedan "colgados" sobre el mapa en vez de nacer de su base. El toolbar del DM
desborda la pantalla e inutiliza opciones. El cono de luz no se ve como cono.

## Causas raíz detectadas en código

1. **Toolbar pecha** (`apps/dm/src/components/TopBar.tsx`): la zona de scroll NO es
   `flex-1 min-w-0` → se dimensiona al ancho de su contenido (max-content) y se escapa
   de la pantalla por la derecha. El `flex-1 min-w-0` spacer anterior come el espacio
   disponible pero la zona scroll la conserva igual → opciones fuera de vista.
2. **Cosas flotando**: alturas hardcodeadas por componente:
   - Luz: halo `0.045`, orbe esfera `0.15`, anillo attach `0.26`, selection `0.05`
   - Niebla (`FogOverlay`): `y=6` (muy arriba)
   - Zonas: fill `0.02`, outline `0.035`, portales `0.045–0.075`
   - Walls: cajas 3D altas desde el piso (altura `meta.height/10*scale`); doors `0.7`
   - Drafts: WallDrawer `0.08`, ZoneDrawer preview `0.09`/handles `0.1`, PortalDrawer `0.05/0.09`, FogBrush `0.07`, FogRect `0.07`, LightPlace `0.06–0.12`
3. **Cono no es cono** (`ItemRenderer.tsx` `LightRenderer`): el halo direccional usa
   `sectorGeometry` con textura radial mapeada al **bounding box** del sector → el núcleo
   brillante cae donde termina el cono ("círculo final"), no en el apex (el personaje).

## Objetivo

- P0: Toolbar con zona de scroll real → nada se escapa de pantalla.
- P1: Plano canónico 2D → todos los overlays a la altura de la base del mapa
  (~0.02–0.055), sobre un plano `overlayY` único. Preparar prop `renderMode: '2d'|'3d'`
  para que un futuro modo 3D conserve alturas actuales.
- P2: Cono de luz real → brillo nace del apex (personaje) y se desvanece hasta el rango.

---

## P0 — TopBar: zona de scroll real

Archivo: `apps/dm/src/components/TopBar.tsx`

- Envolver la zona de `children` en `<div className="relative flex-1 min-w-0 flex items-center">`.
- El contenedor scroll interno pasa a `flex-1 min-w-0 overflow-x-auto`
  (se encoge al espacio disponible, scroll interno).
- Flechas ‹ › posicionadas `absolute` DENTRO de esa zona (left/right), no del header
  completo → no chocan con el `left` (Build menu, scene select, undo/redo).
- Mantener: auto-scroll cuando crece el contenido (MutationObserver) y wheel horizontal.
- Resultado: el panel de luz abierto queda DENTRO del scroll; los demás botones
  (Upload BG, ⚙ Scene, ⚔, Invite, ⚡, etc.) se alcanzan con flechas/wheel.

## P1 — Plano canónico 2D

Nuevo archivo: `apps/dm/src/lib/overlayY.ts`

```ts
export type RenderMode = '2d' | '3d'
export const DEFAULT_RENDER_MODE: RenderMode = '2d'

export const Y2D = {
  map: 0,
  grid: 0.015,
  wallFootprint: 0.02,
  wallHeight: 0.05,
  zoneFill: 0.025,
  zoneOutline: 0.03,
  portal: 0.035,
  portalHandle: 0.05,
  lightHalo: 0.03,
  lightRing: 0.04,
  lightMarker: 0.045,
  selection: 0.055,
  fog: 0.08,
  draft: 0.05,
  draftHandle: 0.045,
}
```

- Nueva prop `renderMode?: RenderMode` (default `'2d'`) en:
  - `SceneRenderer.tsx` (pasa a ItemRenderer + canvases de dibujo + FogOverlay + GridOverlay)
  - `ItemRenderer.tsx` (LightRenderer, WallRenderer, DoorRenderer, ZoneRenderer, ShapeRenderer, FogHitRegion, LineLoopPoints)
  - `WallDrawerCanvas`, `ZoneDrawerCanvas`, `PortalDrawerCanvas`, `FogBrushCanvas`, `FogRectCanvas`, `LightPlaceCanvas`, `FogOverlay`, `GridOverlay`
- `DmDashboard` y `PlayerView` pasan `renderMode={DEFAULT_RENDER_MODE}`.

Comportamiento en modo `'2d'` (flat sobre el mapa, ~0.02–0.055):

| Elemento | Hoy | 2D (Y2D) |
|---|---|---|
| Grilla | 0.02 | grid 0.015 |
| Walls | caja 3D alta | huella plana height 0.05, center y=wall/2 |
| Doors | caja 0.7 alta | huella plana height 0.05 |
| Zona fill | 0.02 | zoneFill 0.025 |
| Zona outline | 0.035 | zoneOutline 0.03 |
| Portales (barra) | 0.045–0.075 | portal 0.035 + portalHandle 0.05 |
| Luz halo (sector/occluded) | 0.045 | lightHalo 0.03 |
| Luz ring indicador | 0.045 | lightRing 0.04 |
| Luz attach ring | 0.26 esfera floats | lightMarker 0.045 plano |
| Luz orbe | esfera 0.15 | marcador plano 0.045 (esfera SOLO modo 3D) |
| Luz selection ring | 0.05 | selection 0.055 |
| Niebla FogOverlay | 6 | fog 0.08 |
| Drafts (preview/handles) | 0.06–0.12 | draft 0.05 / draftHandle 0.045 |

Notas:
- Colisión y visión ya operan en 2D (plano y=0); el cambio es solo render.
- Tokens no cambian (base apoyada en el plano del mapa; discos a 0.6 quedan por encima
  de todos los overlays flat).
- Modo `'3d'` conserva las alturas/hardcodes actuales → cero regresión a futuro.

## P2 — Cono de luz real

Raíz: UV de `ShapeGeometry` mapea el bbox del sector, no distancia radial al apex.

Nuevo archivo: `apps/dm/src/lib/lightGlow.ts`

```ts
export function remapGlowUv(geometry: THREE.BufferGeometry, ringRadius: number): void
```

- Por vértice: `dx = position.x`, `dz = -position.z` (geometría ya rotada rotateX(-PI/2)).
- `uv = (0.5 + dx / (2 * ringRadius), 0.5 + dz / (2 * ringRadius))`.
  - Apex (0,0) → uv (0.5,0.5) = centro del gradiente = brillo (base del personaje).
  - Borde a distancia `ringRadius` → uv esquina = alpha 0 (fin del rango dinámico).
  - Muestreo fuera de la textura clampa al último colorStop (transparente).
- Aplicar en `LightRenderer` (`ItemRenderer.tsx`) tras generar `sectorGeometry` y
  `occludedGeometry` (memo, una vez por geometría).
- Círculos no cambian (su uv ya es radial centrado).

Spec: `apps/dm/src/lib/lightGlow.spec.ts`
- apex uv ≈ (0.5, 0.5)
- vértice a distancia ring → uv en esquina (|uv - 0.5| ≈ 0.5)
- vértice a distancia r → uv en el radio r/ring del canvas

---

## Estado (2026-09-17)

- [x] P0 TopBar layout — hecho y verificado (huecos: paneles de fog/luz/hints movidos a la
      zona scroll; flechas internas; auto-scroll; wheel). DmDashboard `left` recortado.
- [x] P1 plano canónico 2D — hecho: `overlayY.ts`, `renderMode` plumb en SceneRenderer →
      ItemRenderer + FogOverlay + GridOverlay + los 6 canvases; DmDashboard/PlayerView pasan
      `DEFAULT_RENDER_MODE`. Walls/doors planos en 2D, orbe→marcador plano, niebla 6→0.08.
- [x] P2 cono real — hecho: `lightGlow.ts` (`remapGlowUv` aplicado a sector y occluded) +
      `lightGlow.spec.ts` (4 tests, incl. independencia de dirección).
- Verificación: `typecheck` 0, `test` 91/91, `build` OK.
- Pendiente: run manual en dev para validar visual; commit (junto a E9 + fixes previos).

## Orden de trabajo

1. `lib/overlayY.ts` + prop `renderMode` plumb (SceneRenderer → ItemRenderer → canvases).
2. P1 alturas en ItemRenderer, FogOverlay, canvases de dibujo.
3. P2 `remapGlowUv` + aplicación + spec.
4. P0 TopBar layout.
5. Verificación: `npm run typecheck` (0), `npm run test` (87 + nuevas), `npm run build`, dev run manual.

Archivos tocados (~10): TopBar, SceneRenderer, ItemRenderer, FogOverlay, GridOverlay,
WallDrawerCanvas, ZoneDrawerCanvas, PortalDrawerCanvas, FogBrushCanvas, FogRectCanvas,
LightPlaceCanvas, DmDashboard, PlayerView. Nuevos: `lib/overlayY.ts`, `lib/lightGlow.ts` + spec.