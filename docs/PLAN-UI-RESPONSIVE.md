# Plan: UI Responsiva + HUDs Redimensionables

> **Proyecto**: Roleito — VTT Dashboard
> **Fecha**: 2026-09-02
> **Estado**: BORRADOR (pendiente revisión del usuario)

---

## Problema Actual

La UI es 100% desktop-fixed. No hay breakpoints responsive, no hay media queries, y los HUDs son draggables pero NO redimensionables. Si el DM quiere tener 3-4 paneles abiertos simultáneamente se tapan entre sí. En pantallas chicas (laptops 13", tablets) los paneles no caben.

### Limitaciones identificadas

| # | Limitación | Archivo | Línea |
|---|-----------|---------|-------|
| 1 | Sin breakpoints responsive en toda la app | `index.css` | — |
| 2 | HUD panels: ancho fijo en px, sin resize | `HudPanel.tsx` | 17-20 |
| 3 | Posicionamiento con `window.innerWidth` al mount (no repositiona en resize) | `SessionLogHud.tsx`, `InitiativeTracker.tsx` | 40, 84 |
| 4 | Sin detección de colisión entre paneles | `HudPanel.tsx` | — |
| 5 | Sidebar fija `w-56` (224px), no colapsa en desktop | `DmDashboard.tsx` | 681 |
| 6 | TopBar duplicada (no es componente reutilizable) | `DmDashboard.tsx`, `PlayerView.tsx` | 456, 559 |
| 7 | Token Tray fijo `w-52` | `DmDashboard.tsx` | 802 |
| 8 | Player Sheet fijo `w-72` | `PlayerView.tsx` | 697 |
| 9 | Toast container `fixed top-16 right-4` sin adaptar | `ToastContainer.tsx` | 115 |

---

## Fase 1: HUDs Redimensionables

**Objeto**: que el DM pueda redimensionar los paneles flotantes desde la UI.

### 1.1 Resize Handle en HudPanel

- Agregar barra de resize en esquina inferior-derecha (`cursor: nwse-resize`)
- States: `width`, `height` (nuevo, antes solo width)
- Constraints: `minWidth: 200`, `maxWidth: 600`, `minHeight: 150`, `maxHeight: '80vh'`
- Persistir tamaño en `localStorage` por panel ID (`roleito:hud:{panelId}:size`)
- Mantener drag existente en header

### 1.2 Colisión entre paneles (snapping simple)

- Al soltar un panel, si se superpone >50% con otro, empujar hacia el borde más cercano
- Opción más simple: snap a grid invisible de 20px → los paneles se alinean sin superponerse
- El usuario puede forzar superposición si quiere (mantener Shift al drag)

### 1.3 Minimizar / Restore

- Botón `-` en header del panel → minimiza a un chip en la barra inferior
- Barra de chips: `fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-30`
- Click en chip → restore panel a posición/tamaño previo
- Estado: `minimized` por panel en localStorage

### 1.4 Z-Index management

- Panel activo (click/drag) sube a `z-30` automáticamente
- Los demás bajan a `z-20`
- Prevenir que un panel quede detrás del canvas 3D

---

## Fase 2: Responsive Design

**Objeto**: la app funcione razonablemente en laptops 13", tablets landscape, y desktops.

### 2.1 Breakpoints (Tailwind default)

```
sm: 640px    — tablets portrait (no target, pero que no rompa)
md: 768px    — tablets landscape, laptops pequeños
lg: 1024px   — laptops standard (target mínimo)
xl: 1280px   — desktops
2xl: 1536px  — monitores grandes
```

**Target real**: `lg` (1024px+) como mínimo funcional. `md` como graceful degradation.

### 2.2 DmDashboard responsive

| Elemento | Desktop (lg+) | Tablet (md) | Mobile (sm) |
|----------|---------------|-------------|-------------|
| TopBar | Horizontal completa | Horizontal con menos botones (overflow → "⋯" menu) | Hamburger menu |
| Sidebar | Toggle visible, `w-56` | Overlay con backdrop `absolute` | Overlay con backdrop |
| 3D Scene | Full area | Full area | Full area |
| Token Tray | Bottom-left `w-52` | Bottom-left `w-44` | Colapsable (iconos) |
| HUD panels | Draggable + resizable | Draggable + resize limits menores | Stack vertical (bottom sheet) |
| Map Viewer | Full-screen overlay | Full-screen | Full-screen |

### 2.3 PlayerView responsive

| Elemento | Desktop (lg+) | Tablet (md) | Mobile (sm) |
|----------|---------------|-------------|-------------|
| TopBar | Horizontal | Compact | Hamburger |
| 3D Scene | Full | Full | Full (touch controls always visible) |
| Fichas panel | Side panel `w-72` | Bottom sheet draggable | Bottom sheet full-width |
| Touch controls | Ocultas (teclado) | Siempre visibles | Siempre visibles |

### 2.4 Componente TopBar reutilizable

- Extraer de DmDashboard/PlayerView a `components/TopBar.tsx`
- Props: `title`, `actions: ReactNode[]`, `compact?: boolean`
- En `md`: overflow actions a dropdown "⋯"
- En `sm`: hamburger menu con sidebar drawer

### 2.5 Sidebar responsive

- `lg+`: sidebar permanente con toggle
- `md`: overlay con backdrop, se cierra al seleccionar
- `sm`: drawer desde la izquierda con animación slide

---

## Fase 3: Layout Manager (Opcional, futuro)

**Objeto**: sistema de layout profesional tipo VS Code / OBS con paneles arrastrables y docks.

### 3.1 Concepto

- Los HUDs no son "fixed position" sino "docked" a zonas: left, right, top, bottom, floating
- El DM puede drag-and-drop un panel de una zona a otra
- Las zonas se redimensionan con divider handles
- Estado del layout guardado en localStorage

### 3.2 Implementación

- Evaluar librería: `react-mosaic` o `allotment` ( TypeScript, maintained)
- O implementación propia con CSS Grid + drag handles
- Prioridad BAJA — la Fase 1+2 resuelve el 80% del problema

---

## Fase 4: TopBar colapsable en Mobile

**Objeto**: en pantallas chicas, la TopBar no debe consumir espacio vertical.

### 4.1 Comportamiento

- `sm`: TopBar = solo título + hamburger (3 botones visibles)
- `md`: TopBar = título + iconos principales, overflow a dropdown
- `lg+`: TopBar completa como ahora

### 4.2 Escape chain en mobile

- Escape cierra el último panel abierto (stack de z-index)
- Si no hay paneles abiertos → cierra sidebar
- Si no hay sidebar → nada

---

## Archivos a modificar

| Archivo | Cambios |
|---------|---------|
| `components/HudPanel.tsx` | Resize handle, localStorage size, z-index management |
| `components/TopBar.tsx` | **NUEVO** — extraer de DmDashboard/PlayerView |
| `pages/DmDashboard.tsx` | Importar TopBar, responsive sidebar, responsive token tray |
| `pages/PlayerView.tsx` | Importar TopBar, responsive sheets |
| `components/ToastContainer.tsx` | Posición responsive |
| `index.css` | Media queries para transiciones suaves |
| `tailwind.config.js` | Custom breakpoints si es necesario |

---

## Orden de Implementación

1. **HudPanel resize** (Fase 1.1) — cambio más impactante, independiente
2. **TopBar reutilizable** (Fase 2.4) — refactor limpio, sin romper nada
3. **DmDashboard responsive** (Fase 2.2) — sidebar + layout
4. **PlayerView responsive** (Fase 2.3) — sheets + touch
5. **Minimize/restore** (Fase 1.3) — UX polish
6. **Colisión/snapping** (Fase 1.2) — polish
7. **Layout Manager** (Fase 3) — futuro, solo si Fase 1+2 no alcanza

---

## Criterios de Aceptación

- [ ] HUD panels se redimensionan desde la esquina inferior-derecha
- [ ] Tamaño persiste en localStorage por panel
- [ ] En lg+ (1024px+): todo funciona como antes (sin regression)
- [ ] En md (768px-1023px): sidebar es overlay, TopBar compacta, paneles caben
- [ ] En sm (<768px): TopBar hamburger, paneles como bottom sheets, 3D full-screen
- [ ] TopBar es un solo componente reutilizable
- [ ] Paneles se minimizan a chips en barra inferior
- [ ] Z-index management: panel activo siempre visible
- [ ] Sin regression en E2E existentes
