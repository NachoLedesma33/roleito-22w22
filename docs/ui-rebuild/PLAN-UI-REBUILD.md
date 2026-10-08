# PLAN — Rearmado de UI/UX de Roleito (de la landing al cierre de sesión)

> **Proyecto**: Roleito — Persistent AI RPG World Engine
> **Fecha**: 2026-10-07
> **Estado**: PROPUESTA (pendiente de revisión del DM)
> **Alcance**: rediseño integral de la experiencia de UI/UX, de punta a punta:
> landing → login → intro/lobby → hub de campañas → sesión (VTT DM) → vista jugador → cierre.
> **No es**: un cambio de dominio/backend. No toca la fuente de verdad (World State) ni el
> contrato de eventos. Es un rediseño de presentación, información y componentes.

---

## 0. Cómo leer este documento

- §1–2: por qué y qué hay hoy.
- §3–5: principios, lenguaje visual, tokens y arquitectura de información.
- §6: flujos de punta a punta con wireframes.
- §7: stack de librerías (qué reutilizar, no reinventar).
- §8: sistema de assets (imágenes y videos del DM).
- §9: workflow "Ojo" para inspeccionar imágenes con modelo multimodal gratis.
- §10–13: i18n, temas, iconos, accesibilidad, rendimiento.
- §14: checks y gates de calidad.
- §15: skills de UI/UX recomendadas.
- §16: roadmap por fases con criterios de aceptación.
- §17–21: riesgos, ADRs, impacto por archivo, apéndices, próximo paso.

Regla de oro: **este plan no crea una segunda fuente de verdad**. La UI consulta y propone;
el dominio y el World State mandan (CONTEXT.md §4, §10).

---

## 1. Resumen ejecutivo

La UI actual de Roleito es funcional pero plana: una paleta mínima (7 variables), iconos de
barra de navegación como glifos Unicode (`◆ ◇ ♦ ♠`), una sidebar con 14 ítems, HUDs de ancho
fijo y páginas CRUD sin lenguaje visual común. El DM percibe "agobio": muchas herramientas en
un solo lugar, poca jerarquía, cero personalización.

Propuesta: una identidad visual de **grimorio arcano** (oscura, con acentos de oro/brasa y
azur arcano) sobre un **sistema de tokens** y una arquitectura de información por **sectores**
con navegación tipo **zoom out (islas modales)**, en vez de una barra saturada. Reutilizar
primitivas accesibles (Base UI/Radix vía shadcn/ui), animación (Motion) y utilidades
(paneles redimensionables, command palette, toasts), en vez de escribir de cero.

Resultado buscado:
- Landing con una sola tesis visual fuerte.
- Video de intro al iniciar perfil → lobby/hub de campañas personalizable (idioma, tema, etc.).
- Shell del DM en zonas: command bar fina arriba, riel lateral de sectores, islas sobre el VTT.
- Vista jugador con action bar clara y "grimorio" de habilidades.
- Iconografía unificada para habilidades y estados.
- Temas e idioma seleccionables desde el lobby.

---

## 2. Diagnóstico del estado actual

### 2.1 Inventario

| Zona | Archivo(s) | Observación |
|------|-----------|-------------|
| Entry/Auth | `PinLogin.tsx`, `contexts/AuthContext` | Login con PIN; visual básico. |
| Shell DM global | `components/Layout.tsx` | Header simple fuera de campaña; sidebar de 14 ítems dentro. |
| Shell DM VTT | `pages/DmDashboard.tsx` | Layout propio con HUDs y token tray. |
| TopBar | `components/TopBar.tsx` | Header scrolleable; usado dentro del VTT. |
| HUDs | `components/HudPanel.tsx` + `*Hud.tsx`, `MinimizedBar.tsx` | Draggables, ancho fijo, sin resize. |
| Vista jugador | `pages/PlayerView.tsx` | Pestañas; `POLL_MS = 16`. |
| CRUD | `pages/Campaign*`, `Character*`, `NPC*`, `Session*`, `Event*`… | Formularios y listas sin sistema visual. |
| Estilos | `index.css` + Tailwind | 7 variables, sin tokens semánticos ni temas. |
| Iconografía | glifos Unicode en `Layout.tsx`; `Ability.icon` (slug) | Sin set uniforme. |
| Datos | `apps/dm/src/lib/api.ts` | Cliente tipado; único acceso al backend. |

### 2.2 Problemas (mapeados a pedidos)

| # | Problema | Pedido | Impacto |
|---|----------|--------|---------|
| P1 | Sidebar de 14 ítems | menús zoom-out con catálogo | Alto |
| P2 | Paleta pobre | mejorar paleta | Alto |
| P3 | Iconos dispares | iconos uniformes | Medio |
| P4 | Sin landing/intro memorable | landing + video al iniciar perfil | Alto |
| P5 | Sin lobby/hub ni personalización | lobby con idioma/tema | Alto |
| P6 | Sin sistema de componentes | reutilizar librerías | Alto |
| P7 | HUDs rígidos | resize/snap/minimizar | Medio |
| P8 | Sin i18n ni temas | idioma + tema | Medio |
| P9 | Sin checks de UI | checks de calidad | Medio |
| P10 | Todo aglomerado en la barra de arriba | menús por sectores | Alto |

---

## 3. Principios de diseño

1. **Game-first, no admin-first.** Densidad en combate, aire en preparación.
2. **El DM manda.** La UI prioriza narrar/escenar; el CRUD se aparta en islas.
3. **Superficie progresiva.** Frecuente = 1 click; esporádico = 1 click + zoom-out.
4. **Consistencia de vocabulario.** Un control mantiene su nombre en todo el flujo.
5. **Tokens, no magia.** Colores/espacios/motion salen de tokens.
6. **Accesibilidad y motion respetado.**
7. **Rendimiento de sesión.** El VTT no se degrada por el chrome de UI.
8. **Una sola fuente de verdad.** La UI deriva del dominio/World State.

---

## 4. Lenguaje visual

### 4.1 Identidad

**Concepto**: *El Grimorio Arcano*. La app es el tomo donde vive la campaña: obsidiana, vitela,
brasa y tinta arcana. Oscuro por defecto (mesa nocturna), con un modo vitela claro para lectura
larga (recap, notas).

**Signature**: la **Isla** — al pulsar un sector, el contenido hace zoom-out y se reorganiza en
un mosaico de tiles sobre el VTT oscurecido. Una sola interacción define el producto.

**Riesgo estético**: superficies de "pergamino" en la lectura larga, contrastando con cristales
oscuros en el VTT. Un híbrido poco común.

### 4.2 Paleta (tokens)

CSS variables, capas primitivo → semántico → componente.

**Primitivos**

| Token | Hex | Uso |
|-------|-----|-----|
| `obsidian-950` | `#0A0C12` | fondo raíz |
| `obsidian-900` | `#10141E` | superficie base |
| `obsidian-800` | `#171C29` | paneles |
| `obsidian-700` | `#212838` | bordes |
| `obsidian-600` | `#2C3549` | separadores/hover |
| `parchment-50` | `#F3EEE3` | modo vitela |
| `parchment-200` | `#D9D2C2` | texto claro 2° |
| `slate-ink` | `#8B8FA3` | texto 2° |
| `muted-ink` | `#5C6273` | meta/disabled |
| `arcana-500` | `#8B5CF6` | acento primario |
| `brass-500` | `#C9A227` | oro (canon, PM) |
| `ember-500` | `#F2983C` | atención |
| `ruby-500` | `#E5484D` | peligro |
| `verdant-500` | `#46C08A` | éxito |
| `azure-500` | `#4CC2FF` | info |

**Semánticos**: `--bg`, `--surface`, `--surface-2`, `--ink`, `--ink-muted`, `--border`, `--ring`,
`--brand`, `--hp`, `--mp`, `--def`, `--canon`, `--proposed`, `--rejected`, `--dm-only`,
`--success`, `--warning`, `--danger`, `--info`.

**Temas**: Nocturno (default), Vitela, Brasa, Abisal, Alto Contraste, Daltónico.

### 4.3 Tipografía

| Rol | Familia (alt) |
|-----|---------------|
| Display | **Cinzel** (`Marcellus`, `Grenze`) |
| Cuerpo | **Inter** (`Source Sans 3`) |
| Datos | **JetBrains Mono** (`IBM Plex Mono`) |
| Lectura larga | **Alegreya** (`Crimson Pro`) |

Escala px: 12/13/15/18/22/28/36/48. Números tabulares en stats.

### 4.4 Espaciado, radios, sombras, motion

- **Espaciado 4**: 4/8/12/16/24/32/48/64.
- **Radios**: 6/10/14/20/pill.
- **Sombras**: `soft`, `lift`, `island`, `glow-arcane`.
- **Motion**: `dur-fast 120`, `dur-base 200`, `dur-slow 320`, `ease-standard`, `spring-gentle`.
  `prefers-reduced-motion` → instantáneo.

### 4.5 Iconografía

| Capa | Set |
|------|-----|
| UI | **Lucide** (`lucide-react`), trazo 1.75–2px, 20/24px |
| Habilidades/runas | **game-icons.net** (CC-BY 3.0) |
| Estados | set curado propio |
| Recursos | Lucide tintado por token |

Uniformidad: mismo grid y trazo, `currentColor`, tint por token. Nunca emoji ni glifos.
`Ability` gana **id de icono canónico** además de la imagen subida (así sin arte igual se ve
profesional).

---

## 5. Arquitectura de información y navegación

### 5.1 Sectores (reemplazan los 14 ítems de `Layout.tsx`)

| Sector | Agrupa |
|--------|--------|
| **Mesa** | VTT/scena, iniciativa, notas, dados, tokens, luz/fog, quick actions |
| **Mundo** | World State, Memoria, Eventos, Escenas/Lugares, NPCs, Relaciones |
| **Crónica** | Sesiones, Recaps, Narrativa, Línea temporal, cola de Canon |
| **Reparto** | Personajes, Jugadores, NPCs, Catálogo de habilidades |
| **Estudio** | Imágenes/Mapas, Recursos, Audio/Voz/TTS, Handouts |
| **Consola IA** | Agentes, Orquestador, Logs, Config LLM, Contexto |
| **Ajustes** | Tema, idioma, accesibilidad, atajos, datos |

### 5.2 Shell del DM

```
┌───────────────────────────────────────────────────────────────────┐
│ ⌘  Roleito · [Campaña ▾] · Pan de la Torre      ● Sesión activa    │
│    [🔍 Buscar o ⌘K…]            avatares…   🔔  ⚙  ▣DM              │
├────┬──────────────────────────────────────────────────────────────┤
│ 🎲 │                                                              │
│ 🌍 │                     CANVAS / CONTENIDO                       │
│ 📜 │              (VTT, escena, o página del sector)              │
│ 👥 │                                                              │
│ 🎨 │                                              ┌─────────────┐  │
│ 🤖 │                                              │  Rail der.  │  │
│ ⚙  │                                              │  contextual │  │
└────┴──────────────────────────────────────────────┴─────────────┘
   ↑ riel izquierdo (icon-only)                 ↑ dock: HUDs minimizados
```

- **Command Bar** (arriba): logo, campaign switcher, breadcrumb, **⌘K**, estado de sesión,
  presencia, notificaciones, perfil.
- **Riel izquierdo**: 7 iconos de sector; hover expande, click abre la **Isla**. Activo con
  `glow-arcane`.
- **Rail derecho contextual**: capas/luz/fog/clima en Mesa; filtros en Mundo.
- **Dock inferior**: HUDs minimizados como chips (retoma `MinimizedBar.tsx`).
- **Islas**: overlay full-screen con mosaico del sector.

### 5.3 Shell del jugador

```
┌───────────────────────────────────────────────────────────────────┐
│ Kaelen, el Errante    ❤ 15/20   ✦ 8/16   ⚑ 12    [Estados: ▣▣]     │
├───────────────────────────────────────────────────────────────────┤
│                         ESCENA (vista jugador)                    │
├───────────────────────────────────────────────────────────────────┤
│ [Stats] [Habilidades] [Inventario] [Diario] [Notas] [Chat]        │
└───────────────────────────────────────────────────────────────────┘
```

- PV/PM/Defensa/estados siempre visibles arriba.
- **Action bar** de habilidades con coste; "Usar" (C3/C4) con badge de PM y audio (C5).
- Zoom-out "Grimorio" para el detalle de la habilidad.

### 5.4 La Isla (menú zoom-out) — patrón único

1. Click en sector → el contenido hace zoom-out (Motion `layout` + scale).
2. Overlay full-screen, fondo oscurecido + blur, **mosaico** de tiles agrupados.
3. Teclado (flechas + Enter), búsqueda interna, `Esc` cierra.
4. Al elegir un tile → zoom-in al contenido.

Componente `Island` reutilizable implementado una vez. Resuelve P1/P10.

---

## 6. Flujos end-to-end (wireframes)

### 6.1 Landing (`/` pre-login)

```
┌───────────────────────────────────────────────────────────────┐
│  Roleito                                   [Ingresar] [Demo]   │
├───────────────────────────────────────────────────────────────┤
│   EL MUNDO QUE TUS SESIONES             [ hero: imagen/video   │
│   RECUERDAN                              arte del DM ]         │
│   ────────────────────                                        │
│   Un engine persistente para tu campaña.                      │
│   [ Comenzar ]     [ Ver cómo funciona ▸ ]                    │
│   ── features en constelación (islas) ──                      │
└───────────────────────────────────────────────────────────────┘
```

### 6.2 Login (PIN)

`PinLogin.tsx` se re-estiliza (misma lógica, misma seguridad). Teclado grande tipo llave;
errores claros (a11y).

### 6.3 Intro / Lobby loader (video)

Al iniciar un perfil (una vez autenticado/elegido):

```
┌───────────────────────────────────────────────────────────────┐
│              [ VIDEO DE ANIMACIÓN a pantalla completa ]        │
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░   Cargando el mundo…         [Saltar ▸] │
└───────────────────────────────────────────────────────────────┘
```

- Overlay `fixed`, `z` alto, `<video autoplay muted playsInline>`.
- `ended` / "Saltar" / timeout → **Lobby**. Si el video falla → fondo animado + transición.
- `prefers-reduced-motion` o setting "rápido" → se omite.
- Solo en arranque de perfil.
- **Velocidad `1.25x`** (`video.playbackRate = 1.25`): el video dura más de lo que tarda el
  lobby en estar listo; se acelera para no aburrir.
- **Nunca cortar el video de golpe** al terminar de cargar el lobby: esperar a que el video
  (o "Saltar") termine. Si el lobby está listo antes, está listo detrás del overlay; el
  overlay se retira **al terminar el video** (o al cancelar), con una transición.
- El video es un **portal que se abre**: comienza en la imagen del logo y se abre hacia la
  entrada del juego.

### 6.4 Lobby / Hub de campañas

```
┌───────────────────────────────────────────────────────────────┐
│ 👤 KaelenDM   [🌐 Idioma ▾] [🎨 Tema ▾]   🔔   ⚙ Ajustes       │
├───────────────────────────────────────────────────────────────┤
│  Tu mesa                                                      │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐        │
│  │ [cover art]   │ │ [cover art]   │ │      +        │        │
│  │ Pan de la     │ │ Mar de Sombras│ │  Nueva        │        │
│  │ Torre · S-12  │ │ 3 jug · S-04  │ │  campaña      │        │
│  │ [Continuar]   │ │ [Abrir]       │ │               │        │
│  └───────────────┘ └───────────────┘ └───────────────┘        │
│  [ Unirse por código ]   [ Importar ]                         │
└───────────────────────────────────────────────────────────────┘
```

- Campañas como tomos con cover art (§8), última sesión, jugadores.
- **Personalización**: idioma, tema, motion reducido, tamaño de texto, contraste, daltónico,
  audio, perfil local (nombre/avatar). `localStorage` (+ endpoint opcional).
- El lobby es donde vive el selector de preferencias (pedido P5/P8).

### 6.5 Entrada a campaña (DM)

- Elegir campaña → Mesa (o VTT si había sesión). El command bar cambia a contexto de campaña.

### 6.6 Sesión de juego (VTT DM)

Ver §5.2. Foco en Mesa; los demás sectores son islas. HUDs redimensionables (§7.4).

### 6.7 Vista jugador

Ver §5.3. Knowledge scope se mantiene en query time.

### 6.8 Cierre / Recap

- Surface vitela para el recap; cola de canon PROPOSED→CANON accionable; botón "Escuchar" (TTS).

---

## 7. Stack de librerías (reutilizar, no hacer de 0)

### 7.1 Comparativa (2026) y rol

| Librería | Tipo | Rol propuesto |
|----------|------|---------------|
| **Base UI** | headless | primitivas base (default de shadcn 2026) |
| Radix UI | headless | alternativa |
| React Aria | headless | combos/date pickers difíciles |
| **shadcn/ui** | copy-in | capa de componentes (código propio) |
| **Motion** | animación | islas, zoom-out, microinteracciones |
| **cmdk** | palette | launcher ⌘K |
| **react-resizable-panels** | layout | splits/HUDs |
| flexlayout-react | docking | workspace DM (opcional) |
| **sonner** | toasts | notificaciones |
| TanStack Table/Virtual | datos | tablas densas |
| react-hook-form + zod | forms | formularios |
| Recharts/visx | charts | dashboards |
| i18next + react-i18next | i18n | idioma |
| lucide-react + game-icons | iconos | uniformidad |

### 7.2 Versiones (repo)

Tailwind v3 + React 18. Los tokens funcionan ya con CSS vars. Migrar a Tailwind v4
(`@theme`) como paso aparte (ADR), sin bloquear.

### 7.3 Reutilización (no escribir de 0)

Botones/inputs/selects → shadcn. Diálogos/popovers/tooltips → Base UI. Tablas → TanStack.
Toasts → sonner. Paneles → react-resizable-panels + `HudPanel` actual. Islas → Motion + `Island`.

### 7.4 HUDs redimensionables (fusiona `PLAN-UI-RESPONSIVE.md`)

- Resize handle, min/max, persistencia en `localStorage`.
- Snapping a grid + colisión simple; `Shift` fuerza superposición.
- Minimizar → chip en dock; restaurar desde chip.
- Z-index management (panel activo sube).

---

## 8. Sistema de assets (imágenes y videos del DM)

**Carpeta de consumo**: `docs/ui-rebuild/assets/` (creada, con `README.md`). Resumen:

**Material ya subido por el DM** (ubicado en `assets/` de la raíz del repo):
| Archivo | Tipo | Uso |
|---------|------|-----|
| `assets/images/22w22-logo-roleito.jpg` | imagen | hero de landing + fondo de lobby |
| `assets/video/22w22Logo-animado.mp4` | video | intro/loader al iniciar perfil (portal que se abre) |

> La imagen es el logo "22w22". Mimo (§9) la describe: ilustración dark-fantasy, marca de agua
> incluida. Para landing/lobby sirve de fondo; **no** como logo de Roleito (dice 22w22).

| Tipo | Carpeta | Reglas |
|------|---------|--------|
| Landing hero | `landing/` | ≤ 400 KB o video ≤ 8 s muted |
| Video intro | `intro-video/` | ≤ 8 MB, H.264/VP9, ≤ 8 s, sin audio |
| Covers lobby | `lobby/` | 16:9 o 3:2, ≤ 300 KB |
| Iconos | `icons/` | sheet PNG/PDF |
| Paletas | `palettes/` | moodboard/screenshot |
| Crudos | `raw/` | sin procesar |

**Pipeline**: DM sube a `raw/` → subagente multimodal (§9) analiza → variantes optimizadas
(webp/avif, `srcset`) a `apps/dm/public/ui/` (servidas por Vite). **No** van a `data/assets`
(eso es asset de campaña). Videos con poster obligatorio.

---

## 9. Workflow "Ojo" — ver imágenes con modelo multimodal gratis

El modelo principal puede no ser multimodal. Para ver las imágenes del DM, delegar a un
subagente con modelo gratis:

- **Modelo**: `opencode/mimo-v2.6-flash-free` (MiMo-V2.6-Flash Free, coste 0).
- **Mecanismo**: `subagent` con `model` explícito y lectura del path de imagen; devuelve una
  **ficha estructurada**.

**Prompt plantilla**:
```
Sos un analista visual. Leé la(s) imagen(es) en <paths>.
Devolvé una ficha por imagen:
- descripción (2-3 frases)
- paleta dominante (hasta 6 hex)
- composición/layout
- texto legible (transcribir)
- estilo (dark fantasy, ilustración, UI, foto…)
- uso sugerido en Roleito (landing / cover lobby / icono / referencia)
- problemas (baja res, watermark, licencia dudosa)
No inventes; si algo no se ve, decí "ilegible".
```

**Regla**: el subagente solo describe; no modifica archivos. El hilo principal decide.

---

## 10. Localización (i18n)

- `i18next` + `react-i18next` (+ `i18next-icu` opcional).
- Idiomas: `es` (default), `en`. Namespaces: `common`, `lobby`, `vtt`, `player`, `settings`.
- Detección: setting del lobby → persiste; fallback `navigator.language`.
- Cero strings hardcodeados nuevos; migración incremental.
- Fechas/números: `Intl.*`. Contenido del usuario NO se traduce.

## 11. Personalización y temas

- Tokens = CSS variables (`:root`, `[data-theme]`). Cambio runtime con
  `document.documentElement.dataset.theme`.
- Temas: Nocturno, Vitela, Brasa, Abisal, Alto Contraste, Daltónico.
- Preferencias: tema, idioma, motion, tamaño de texto, contraste, daltónico, volumen.
  `localStorage` (+ endpoint opcional).
- `prefers-color-scheme` como default si no eligió.
- La preferencia de tema NO es canon; es preferencia de UI.

## 12. Rendimiento y accesibilidad

### 12.1 Rendimiento
- El VTT (polling 16 ms) no re-renderiza por animaciones del chrome → contextos separados.
- Islas: `lazy` + `Suspense`.
- Presupuestos: JS inicial ≤ 250 KB gz (sin three); LCP landing ≤ 2.5 s.

### 12.2 Accesibilidad (AA)
- Focus visible; teclado completo en islas/paleta.
- Contraste ≥ 4.5:1; `aria-*` (los dan Base UI/Radix).
- `aria-live` en toasts/estado.
- `prefers-reduced-motion` global (incluido el video de intro).
- Daltónico: no depender solo del color.

## 13. Iconografía de habilidades

1. Lucide (UI) + game-icons.net (habilidades/estados), mismo grid/trazo.
2. `apps/dm/src/lib/iconRegistry.ts`: slug canónico → componente SVG.
3. `Ability.icon_id` junto a `icon` (imagen, C2). Prioridad: arte subido > icon_id > fallback.
4. Estilo: stroke uniforme, `currentColor`, tint por token.
5. Verificación en Storybook.

---

## 14. Checks y gates de calidad de UI

### 14.1 Herramientas
| Check | Herramienta |
|-------|-------------|
| Lint a11y | **DIFERIDO**: `eslint-plugin-jsx-a11y` no soporta eslint 10 aun (peer `<=9`). Cubrir a11y con Storybook/axe y `@axe-core/playwright`. |
| Lint de tokens | `stylelint` + regla de no-hex |
| Docs vivos | **Storybook** |
| A11y por story | `@storybook/addon-a11y` (axe) |
| A11y en e2e | `@axe-core/playwright` |
| Visual regression | Playwright `toHaveScreenshot` (o Chromatic) |
| Rendimiento | Lighthouse CI |
| Bundle | `rollup-plugin-visualizer` / size-limit |
| i18n | `i18next-parser` (claves faltantes) |

### 14.2 Definición de "componente listo"
- [ ] Estados default/hover/focus/active/disabled/loading/error/empty.
- [ ] Responsive `sm/md/lg/xl`.
- [ ] Teclado + lector (axe sin violaciones).
- [ ] Solo tokens (cero hex sueltos).
- [ ] Motion respeta reduced-motion.
- [ ] Story + screenshot de referencia.

### 14.3 Gates por fase
Reusar `roleito.gates`: lint → typecheck → vitest → pytest → e2e. Sumar Storybook build,
axe en e2e, `toHaveScreenshot` de pantallas clave y `docs check`.

### 14.4 E2E nuevos (Playwright)
- `landing.spec.ts`: carga landing; CTA a login.
- `intro-lobby.spec.ts`: login → video/skip → lobby; tema aplica `data-theme`; idioma cambia.
- `islands.spec.ts`: abrir isla, elegir tile, `Esc` cierra.
- `player-shell.spec.ts`: PV/PM visibles sin tab; "Usar" reproduce audio (C5).
- (Patrón conocido: re-correr flakes de infra antes de investigar.)

---

## 15. Skills de UI/UX

### 15.1 Ya instaladas
- **frontend-design** (Anthropic) — anti-slop, dirección visual.
- **web-design-guidelines** (Vercel) — compliance de guidelines.
- **vercel-react-best-practices** — rendimiento React.
- **prototype** — prototipar antes de comprometer.

### 15.2 Instalables (`npx skills add …`)
| Skill | Repo | Para |
|-------|------|------|
| `tailwind-design-system` | `wshobson/agents` | tokens/theming v4 |
| `shadcn-ui` | `giuseppe-trisciuoglio/developer-kit` | guía shadcn |
| `tailwind-v4-shadcn` | `jezweb/claude-skills` | Tailwind v4 + shadcn |
| `building-components` | `vercel/components.build` | guía de componentes |
| `accessibility-review` | (skills.sh) | auditoría a11y pre-handoff |
| `WCAG Accessibility` | `addyosmani` | WCAG |
| `interaction-design` | `wshobson` | microinteracciones/motion |
| `improve-animations` | `emilkowalski` | pulido de animación |
| `rams` | `rams` | crítica de diseño en vivo |
| `improve-ui` | `bilick` | auditar superficie vs su evidencia |

> Verificar con **find-skills** (skills.sh) y registrar en `AGENTS.md` §Skills.

### 15.3 Mapeo sugerido
- Landing/Islas/temas → `frontend-design` + `tailwind-design-system`.
- Componentes → `building-components` + `shadcn-ui`.
- Auditoría → `web-design-guidelines` + `accessibility-review` + `rams`.
- Motion → `interaction-design` + `improve-animations`.

---

## 16. Roadmap por fases

> Un commit por tema; push separado; CI verde antes del siguiente. No commitear sin pedido.

- **Fase 0 (Fundaciones)**: tokens, `iconRegistry`, providers de tema/i18n, `eslint-plugin-jsx-a11y`
  (diferido: eslint 10), Storybook. Aceptación: gates verdes; switch de tema funciona.
  - Hecho: tokens (`index.css`), `ThemeProvider`, i18n (`i18next`), `iconRegistry` (Game Icons),
    Storybook 10 + addon a11y (story `Fundaciones/Tokens y temas`).
  - Pendiente: `@axe-core/playwright` (e2e); `i18next-parser`; migrar textos de UI a claves i18n;
    reemplazar provider de tema por toggle en la UI real.
- **Fase 1 (Primitivas)**: shadcn/ui + lucide + sonner + cmdk + resizable-panels + motion;
  `Button/Card/Dialog/Tabs/Tooltip/Badge/StatBar/Island`.
- **Fase 2 (Landing + Login)**: landing §6.1; re-estilo `PinLogin`. `landing.spec.ts`.
- **Fase 3 (Intro + Lobby)**: `ProfileIntro`, Lobby §6.4, drawer de personalización, covers.
  `intro-lobby.spec.ts`.
- **Fase 4 (Shell DM + Islas)**: CommandBar, riel, rail contextual, dock, `Island`. `islands.spec.ts`.
- **Fase 5 (Mesa + HUDs)**: resize/snap/minimizar. Sin regresiones e2e.
- **Fase 6 (Vista jugador + iconos)**: shell, Grimorio, iconos. `player-shell.spec.ts`.
- **Fase 7 (Resto + a11y/perf)**: migrar CRUD; axe + presupuestos.

---

## 17. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Regresiones por el tamaño | fases, un tema por commit, e2e por pantalla |
| Libs rompen typecheck | adoptar de a una; TS strict |
| VTT se degrada | contexto UI separado del juego |
| i18n a medias | default es; migrar incremental; lint de claves |
| Video molesto | setting rápido + reduced-motion |
| Chocar con `data/assets` | assets de diseño en `docs/ui-rebuild/assets` + `public` |
| Romper docs check | doc sin símbolos; correr gate |

## 18. Decisiones (RESUELTAS por el DM — 2026-10-07)

1. **Primitivas**: Base UI vía shadcn/ui.
2. **Tailwind**: migrar a v4 **después**, en fase propia.
3. **Docking**: HUDs propios redimensionables (sin flexlayout-react).
4. **Preferencias**: `localStorage` (endpoint opcional, fuera de alcance).
5. **Assets**: locales (`apps/dm/public/ui`), sin CDN.
6. **Landing**: dentro de `apps/dm`.

## 19. Impacto por archivo

| Área | Archivos | Acción |
|------|----------|--------|
| Shell DM | `Layout.tsx`, `TopBar.tsx`, `DmDashboard.tsx` | CommandBar + riel + islas |
| HUDs | `HudPanel.tsx`, `MinimizedBar.tsx`, `*Hud.tsx` | resize/snap/minimizar |
| Jugador | `PlayerView.tsx`, `components/CharacterSheet.tsx` | shell + acción |
| Auth/entrada | `components/PinLogin.tsx`, `App.tsx` | re-estilo + rutas |
| Lobby | `pages/CampaignList.tsx` (+ `Lobby`) | covers + preferencias |
| CRUD | `pages/*List|*Form|*Detail` | migrar a componentes |
| Estilos | `index.css`, tailwind config | tokens + temas |
| Iconos | nuevo `lib/iconRegistry.ts` | registro |
| i18n/tema | nuevos `lib/i18n.ts`, `contexts/ThemeContext.tsx` | infra |
| Assets | `docs/ui-rebuild/assets/**` | material del DM |
| Datos | `lib/api.ts` | sin cambio de contrato |

## 20. Apéndices

### 20.1 Checklist de revisión visual
- [ ] Solo tokens (cero hex sueltos).
- [ ] 1280/1440/1920 y `md`.
- [ ] Focus visible.
- [ ] Contraste AA.
- [ ] Reduced-motion.
- [ ] Estados vacío/error/loading.
- [ ] Vocabulario consistente.
- [ ] Una tesis visual.

### 20.2 Wireframe del zoom-out (Isla)
```
        ┌─────────────────────────────────────────┐
        │  ←  MESA                          ⌘K ✕   │
        │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │
        │  │Dados │ │Inic. │ │ Fog  │ │ Luz  │    │
        │  └──────┘ └──────┘ └──────┘ └──────┘    │
        │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐    │
        │  │Notas │ │Tokes │ │Clima │ │Nocs  │    │
        │  └──────┘ └──────┘ └──────┘ └──────┘    │
        └─────────────────────────────────────────┘
           fondo VTT oscurecido + blur
```

### 20.3 Glosario
- **Isla**: overlay de navegación zoom-out con mosaico de herramientas.
- **Sector**: agrupación (Mesa, Mundo, Crónica, Reparto, Estudio, Consola IA, Ajustes).
- **Grimorio**: zoom-out de habilidades del jugador.
- **Lobby**: hub de campañas post-intro.
- **Ojo**: subagente multimodal (Mimo) que describe imágenes.

---

## 21. Próximo paso

1. DM revisa y aprueba este plan (y resuelve §18).
2. DM sube material a `docs/ui-rebuild/assets/`.
3. Se corre el subagente "Ojo" (§9) para inventariar el material.
4. Arranca **Fase 0** como primer commit-tema.