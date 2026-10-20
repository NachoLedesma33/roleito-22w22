# Roleito — AGENTS.md

Persistent AI RPG World Engine. Local-first platform for tabletop RPG campaigns.
DM authority + AI assistant. World State = source of truth.

## ⚠️ DIRECTIVA DE INGENIERÍA OBLIGATORIA (leer ANTES de escribir código)

Al agregar, modificar o refactorizar **cualquier** código de este repo (feature nueva o código existente), aplicá esta directiva transversal sin excepción:

1. **`docs/ROLEITO_GUIA_MODULARIZACION_ARQUITECTURA.md`** — directiva completa (cohesión, acoplamiento, SOLID con criterio, DRY sin sobreabstracción, diseño de props, hooks, separación de efectos, backend por capa, contratos, patrones, verificación).
2. **`docs/engineering/DIAGNOSTICO-Y-PLAN-MODULARIZACION.md`** — diagnóstico priorizado (P1-P9) + plan de fases. **Las 11 fases (0-10) están CERRADAS (2026-10-17), cada una con commit y CI verde**: leelo como registro de lo ya hecho y fuente de lecciones, **no para re-planear**. Lo que quedó abierto está en su sección 6.

**Reglas que no se negocian (resumen; el detalle está en la guía):**
- Nada de abstracciones prematuras, capas ceremoniales ni reescrituras masivas. Preferí duplicación pequeña y explícita antes que un helper genérico lleno de flags.
- Un componente grande se dividí **cuando tenga responsabilidades que cambian por separado**, no por número de líneas. Extraé una responsabilidad por vez, en commits separados.
- El código nuevo sigue los patrones que ya existen en el repo (tokens CSS, `components/ui/`, `api.ts`, `@core/domain/types`, `HudPanel`, i18n `t()`). No introduzcas un patrón paralelo.
- **No declares pruebas exitosas si no las ejecutaste.** Reportá resultados reales, incluido "no pude ejecutar X".
- Antes de cerrar un cambio: `npm run lint` → `npm run typecheck` → `npm run test --workspace=apps/dm` → pytest si tocaste backend → e2e de lo afectado. Cada fase = 1 commit + CI verde.
- Actualizá `docs/IMPLEMENTATION-STATUS.md` y la doc de la feature cuando una decisión arquitectónica lo requiera.

## Stack & Structure
- **Frontend real (único): `apps/dm`** — React 18 + TS strict + Vite + Tailwind. Three.js/R3F se usan DENTRO de apps/dm (SceneRenderer, PlayerView), no en apps separadas.
- `apps/player` y `apps/renderer` son **placeholders vacíos (.gitkeep)**; no crear código ahí. La vista jugador vive en `apps/dm/src/pages/PlayerView.tsx`.
- **Backend**: FastAPI + SQLAlchemy + SQLite. Todos los routers bajo `/api/`; health en `/health`; assets en `/api/static` (data/assets). App en `backend/main.py`.
- **`core/` es bilingüe**: Python (events, world, canon, memory, narrative, agents) importado por el backend; TypeScript (`core/domain/types.ts`, `core/scene/*`) consumido por apps/dm vía alias `@core -> ../../core` (vite + vitest + tsconfig). Respetar cada lado; el TS de escena vive en `core/scene/` (singular) — no crear `core/scenes/`.
- **`docs/AGENTS.md` NO es este archivo** — es la spec del sistema de agentes AI del producto. No confundir.

## Commands
- Dev frontend: `npm run dev` (= dev:dm, puerto 5173, proxy `/api -> localhost:8000`)
- Dev backend: `npm run dev:backend` — embebe ruta Windows `..\venv\Scripts\python.exe`; en otro OS ajustar
- Typecheck: `npm run typecheck` (`tsc --noEmit` apps/dm, strict)
- Lint: `npm run lint` (eslint raíz; ignora backend, data, venv)
- Unit (vitest, en apps/dm): `npm run test --workspace=apps/dm`; solo `src/**/*.spec.ts`, env node
  - Single: `npx vitest run src/lib/losSystem.spec.ts`
  - ⚠️ `losRaycast.spec.ts` colgaba en vitest (rayos con dx/dy=0 → loop infinito en castRayDDA) — fixeado, ya corre
- Backend (pytest): desde `backend/`: `..\..\venv\Scripts\python.exe -m pytest`; test deps en `requirements-test.txt` (NO en requirements.txt)
- E2E: `npm run test:e2e` — Playwright **levanta solo** frontend (5173) + backend (8000) vía webServer; tests en `tests/e2e`, global setup en `tests/global-setup.ts`
- CI (`e2e.yml`): tres jobs. `checks` = typecheck → lint; `unit` = vitest + pytest; `test` = playwright, que además `needs: [checks, unit]`. O sea que los unit corren en cada push
- Orden de verificación sugerida: `lint → typecheck → vitest → pytest → (si toca UI) e2e`

## Architecture (invariantes)
- Event-driven: `DM/AI -> Event -> World State -> Renderer`
- Canon: `PROPOSED -> REVIEW -> APPROVED/REJECTED`; DM autoridad final
- AI nunca escribe al DB directo — siempre vía Event System
- Renderer nunca modifica canon; knowledge scope en query time
- `core/domain/types.ts` = fuente única de tipos TS
- Determinista → código (movimiento, coords, escena); probabilístico → IA
- Runtime: rápido, determinista, sin generación pesada
- Nunca mandar campaña completa al LLM

## Docs — Reading Order
1. `docs/CONTEXT.md` (leer primero, siempre)
2. `docs/PRODUCT.md`
3. `docs/DM-DASHBOARD-VTT.md`
4. `docs/HYBRID-SHADOW-GEOMETRY.md` (walls/vision/fog manual-first — canon actual)
5. `docs/DOMAIN.md`
6. `docs/ARCHITECTURE.md`
7. `docs/DATABASE.md`
8. `docs/EVENT-SYSTEM.md`
Luego solo los relevantes a la tarea. `scripts/check-docs-consistency.py` valida docs vs código.

**Docs de ingeniería (aplicar siempre, ver directiva arriba):**
- `docs/ROLEITO_GUIA_MODULARIZACION_ARQUITECTURA.md`
- `docs/engineering/DIAGNOSTICO-Y-PLAN-MODULARIZACION.md`
- `docs/IMPLEMENTATION-STATUS.md` (estado maestro de features; sincronizar al cerrar fases)

## Gotchas (lecciones pagadas)
- **Emoji/glifo → icono lucide rompe e2e en silencio**: un SVG **no aporta texto** al DOM. Todo `getByRole({name})` / `getByText` que incluía el glifo queda roto con timeout 30s, **indistinguible de flake de carga**. Reales: `🏆 100 gp`→`100 gp` (quest Q1), `← Volver a la lista`→`Volver a la lista` (notebook NB4). **Si tocás texto visible o nombre accesible de un control, grepeá los specs y actualizá locators en el mismo commit**, y corré el spec afectado. `getByRole({name})` matchea por **substring del nombre accesible**, no por texto crudo.
- **No culpes al CI de "flake" sin verificar el código**: los 9 rojos de 2026-10-15 eran 3 bugs propios de un commit de iconos. Reproducí local el spec afectado antes de re-runear.
- **Windows**: `.gitattributes` fuerza `eol=lf`; assets binarios (img/audio/video/3D) via Git LFS — verificar `git lfs` instalado antes de checkout
- `npm run dev:renderer` falla (apps/renderer sin package.json) — esperado
- WASD: grid-snap SOLO en drag/drop (`reportMove(snap)`); teclado es libre — no re-agregar snap al path de teclado
- PlayerView: `POLL_MS = 16` (~62/s) — mantener polling barato
- 500s históricos en `characters`/`rolls/recent`/`light-requests`: si reaparecen, investigar antes de asumir regression propia

## Skills
| Skill | Cuándo usarla aquí |
|-------|--------------------|
| `frontend-design` | UI nueva: paneles del dashboard, vistas apps/dm, overlays del renderer |
| `vercel-react-best-practices` | Componentes React de apps/dm: memoización, re-renders del World State |
| `web-design-guidelines` | Auditoría post-implementación de pantallas antes de release |
| `prototype` | Prototipo desechable para validar modelo de estado (canon, memoria) |
| `grill-me` / `grill-with-docs` *(solo manual)* | Estresar plan antes de fase grande; ADRs a `docs/adr/` |
| `find-skills` | Tarea recurrente sin skill conocida |
| `playwright-best-practices` | Escribir/arreglar e2e `tests/e2e`: selectors, fixtures, flaky (`S2`, `CS8`), canvas/WebGL, mobile/touch |
| `typescript-advanced-types` | TS strict: genéricos, narrowing, tipos de `apps/dm/src/lib/api.ts`, utilidades reutilizables |
| `diagnosing-bugs` | Bugs duros / regresiones de perf (canvas `zone Z1/Z2`, `status S1`): loop de feedback antes de tocar código |
| `roleito-modularizacion` *(skill del repo, `.opencode/skills/`)* | **Obligatoria** al escribir/refactorizar código: checklist de la directiva, fases del plan, y gate de verificación antes de commitear |
| `roleito-docsync` *(skill del repo, `.opencode/skills/`)* | **Obligatoria** al cerrar feature/fase o cambiar comportamiento/decisión: checklist de docs a actualizar + `check-docs-consistency.py` antes de commitear |

> Las skills del repo viven en `.opencode/skills/<nombre>/SKILL.md` y se cargan automáticamente al abrir el proyecto, aunque no se lean los `AGENTS.md`. Preferí una skill de repo a depender solo de `AGENTS.md`.