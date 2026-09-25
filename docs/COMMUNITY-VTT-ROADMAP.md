# COMMUNITY-VTT-ROADMAP.md

Research de VTTs de la comunidad (Foundry VTT, Roll20, Owlbear Rodeo, 2026) catalogado por
**valor para la mesa ÷ coste de implementación** con recursos limitados (dev solo, local-first,
stack actual: React+TS+Three.js · FastAPI+SQLite · assets CC0).

Fuente de datos: top módulos Foundry por % de instalación (reporte oficial 6° aniversario),
guías comparativas 2026 (RPG Builder, StoryRoll, DM Tools AI, Lumen VTT, ScriptoriumGM, GM Craft
Tavern), listas "esenciales" de r/FoundryVTT. Fecha: 2026-09-25.

---

## 1. Estado de Roleito vs VTTs líderes

| Capacidad | Roll20 | Foundry | Owlbear | **Roleito** |
|---|---|---|---|---|
| Lighting/fog/LoS dinámico | Plus tier | ✅ best-in-class | básico | ✅ echo (D/E/F + LoS worker) |
| Render 3D | ❌ | ❌ (2D) | ❌ | ✅ único diferencial |
| Player sin cuenta (link) | ❌ | req. licencia/host | ✅ | ✅ join code |
| DM authority + determinismo | manual | manual | manual | ✅ AI asistente, nunca autor |
| Rules automation | parcial | extensa | ❌ | ✅ parcial (dice, cualitativo) |
| Initiative tracker | ✅ | ✅ (módulos top) | ext. | ❌ **GAP #1** |
| Calendario in-world | ❌ | ✅ (19% inst.) | ❌ | ❌ |
| Quest board | ❌ | ✅ | ❌ | ❌ |
| Weather/FX | ❌ | ✅ (29% inst.) | ❌ | ❌ (roadmap Phase 15) |
| Audio ambience | ✅ | ✅ | ❌ | ❌ (roadmap Phase 16) |
| Loot en mapa (piles) | ❌ | ✅ (16% inst.) | ❌ | ❌ |
| Marketplace contenido | ✅ enorme | crece | ❌ | ❌ (by design, CC0) |

## 2. Top módulos Foundry 2026 (% instalación) → qué significan para Roleito

| Módulo | % | Equivalente Roleito | Prioridad |
|---|---|---|---|
| Dice So Nice / Dice Tray | 55 / 42 | dice roller ✅ existe; 3D dice = cosmético | baja |
| Sequencer (animaciones) | 33 | FX de escena (Phase 15) | media |
| Monk's Active Tile Triggers | 32 | triggers zona→evento (event system ✅, falta UI) | media-baja |
| FXMaster (weather/ambient) | 29 | Phase 15 ATMOSPHERE | media |
| Token Magic FX (estados/efectos en token) | 21 | status markers en token | **alta (barato, visual)** |
| Carousel Combat Tracker | 20 | **initiative tracker** | **máxima** |
| Simple Calendar | 19 | calendario in-world (base Phase 23) | **alta (barato)** |
| Item Piles (loot/mercaderes/trade) | 16 | inventario cualitativo ✅ → loot en mapa | media |
| Quick Insert (Ctrl+Space búsqueda) | 17 | búsqueda global del mundo | media-baja |
| Levels / Wall Height (multi-floor) | 24 / 27 | 3D ya → floors/Z occlusion | **lejana (coste alto)** |
| Token Action HUD | 25 | ficha rápida en mesa | media-baja |
| Polyglot / idiomas | ~ | flavor post-MVP | baja |

## 3. Catálogo por valor/coste (recursos limitados: 1 dev, local-first)

### R1 — Corto plazo (máximo valor, coste medio-bajo)
1. **Initiative/combat tracker** — ROADMAP Phase 3. Turnos visibles a todos, orden editable,
   next/prev, ligado a dice roller y escena. Base ya existe (dice_rolls, characters, event system).
   Coste: ~1-2 semanas. Es EL feature que toda mesa espera.
2. **Status/condición markers en tokens** — overlay visual (envenenado, concentrando, prone).
   Coste: días. Impacto visual alto (Token Magic 21%/Always HP).
3. **Calendario in-world + progress clocks** — estado simple + UI; clocks compartidos para
   tensión/rituales/doom timer. Coste: días (data model + panel). Funda Phase 23 Timeline.

### R2 — Medio plazo (Este trimestre)
4. **Quest/mission board visible a players** — misiones con objetivos/recompensa, players ven
   activas y hechas. Encaja Session System + canon (PROPOSED→APPROVED ya existe).
5. **Weather/FX atmosphere** — Phase 15. Partículas three.js (lluvia, nieve, niebla) + filtros.
   Coste: media. Assets CC0 ya en el proyecto.
6. **Audio ambience** — Phase 16. Playlists por escena (upload CC0, loop, volumen global por
   player). No reinventar: sin voice/video.
7. **Handouts/media + landing page** — compartir imágenes/video/notas a players (Share Media,
   landing scene de Foundry; "árbol + teatro de la mente").
8. **Mobile pass PlayerView** — lesson Owlbear: mobile fuerte. Responsive del POV jugador,
   touch (joystick virtual), polling barato ya ✅.

### R3 — Largo plazo (post-MVP / cuando haya agente potente)
9. **LAN mode (Phase 17)** — local-first, sin hosting externo. Diferencial vs Foundry (hosting
   = su dolor #1).
10. **Loot/Item Piles** — drag loot al mapa, player pickup, mercaderes (inventario cualitativo ya).
11. **Campaign analytics (Phase 22)** + Timeline (Phase 23) completo — sesiones, roll trends.
12. **Multi-floor / Wall Height** — solo si la 3D lo pide; coste alto (Z occlusion, render).
13. **Trigger tiles (Monk's)** — zona → evento (portales/transiciones) vía event system.

### ❌ Anti-roadmap — NO hacer (lecciones de la comunidad)
- **Marketplace/contenido oficial** — licencias caras; homebrew + CC0 es la identidad.
- **Voice/video integrado** — roll20 lesson: todos usan Discord; no reinventar.
- **Cuentas obligatorias para players** — Owlbear ganó con cero fricción; join link ✅ ya.
- **AI DM (StoryRoll model)** — CONTRADICE DM authority (core del producto): AI = asistente,
  no reemplazo. (Diferido: AI wall detection = Phase G, "año que viene, con agente potente".)
- **Modding/plugins** — Foundry = dependency hell (lección #1). Core-first lean: features en
  core, no ecosistema de módulos.
- **Rules automation total** — automatizar SOLO acciones repetidas (dice, iniciativa, daño);
  no todas las reglas (principio ya en ROADMAP §2).

## 4. Roadmap propuesto (recursos limitados)

```
FASE R1  (1-2 semanas)   Initiative/combat tracker + status markers + calendario/clocks
FASE R2  (este trim.)    Quest board + weather/FX + audio ambience + handouts + mobile pass
FASE R3  (post-MVP/LAN)  LAN mode · loot piles · analytics/timeline · multi-floor
SIEMPRE-NO               marketplace · voice/video · cuentas players · AI-DM · plugins
GATE (año que viene)     AI wall detection → ShadowZone[] (Phase G, con agente potente)
```

Orden de implementación vs ROADMAP.md actual: Phase 3 (Session/initiative) → 23 (Timeline
base, calendario) → 15 (Atmosphere) → 16 (Media) → 17 (LAN) → 22 (Analytics) → 24+ (World
Map, World Persistence).

## 5. Lecciones duras de la comunidad

1. **Foundry**: cada módulo = superficie de bug; setup 1-2h y 19 módulos medianos. → Roleito
   debe cargar en <2 min y funcionar sin configuración. La extensibilidad NO es el objetivo.
2. **Roll20**: UI aged + perf maps grandes → mantener rendimiento (el worker de LoS ya cuida
   esto) y UI moderna; el 8M de usuarios sigue por network effect, no por features.
3. **Owlbear**: "tech que se va del camino" — player join <1 min, cero accounts. Mantener.
4. **Lumen (nuevo 2026)**: el gap real de map-first es combat state TIED al mapa (initiative,
   HP, condiciones). Es el mismo gap de Roleito → valida R1.
5. **Datos objetivos**: 55% de la comunidad instaló dados chusos pero 20% combat tracker y 19%
   calendario → los utilities de mesa (combate/tiempo) pesan más que el espectáculo.

## 6. Próximos pasos sugeridos

1. Confirmar R1: initiative tracker como siguiente feature (con dice + qualitative HP ya hay base).
2. Antes de codear: decidir modelo de estado (turn order en escena vs campaña; persistencia vía
   event system — chequear docs/EVENT-SYSTEM.md para el modelo).
3. Reiniciar backend (guard register duplicados está commiteado pero el server en 8000 corre
   código viejo).