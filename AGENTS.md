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
- **Playtest en LAN**: `npm run dev:lan` (= vite `--host 0.0.0.0`; sin esto vite escucha solo en localhost y el link con la IP de la LAN no lo alcanza nadie). El backend **no** se expone: el trafico del jugador entra por el proxy del frontend (que ademas tiene `ws: true`, para el WebSocket del POV). Si el firewall de Windows bloquea el 5173, hay que permitirlo para redes privadas.
- **Playtest remoto (tunel)**: `npm run playtest` = build de produccion + backend + frontend de produccion (bundles) + **el tunel gratis** (imprime la URL publica y la copia al portapapeles). `npm run tunnel` = solo el tunel. Sin dominio propio: **Tailscale Funnel** (URL fija ✓, cuenta gratis), **Cloudflare quick tunnel** (sin cuenta, URL efimera) o **tunnelmole** (`npx`, sin instalar nada, pero **no** proxea el WebSocket → el POV cae al sondeo). **Para remoto nunca el dev server**: vite manda cientos de modulos sin bundlear y la primera carga por un tunel seria de minutos. `npm run build:prod` / `npm run serve:prod` por separado. El plan completo (tunel, seguridad, latencia) en `docs/engineering/PLAN-PLAYTEST-REMOTO.md`.
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
3. `docs/DESIGN-SYSTEM.md` (UI/UX: alto contraste, theming, cero transparencias en paneles con texto)
4. `docs/DM-DASHBOARD-VTT.md`
5. `docs/HYBRID-SHADOW-GEOMETRY.md` (walls/vision/fog manual-first — canon actual)
6. `docs/DOMAIN.md`
7. `docs/ARCHITECTURE.md`
8. `docs/DATABASE.md`
9. `docs/EVENT-SYSTEM.md`
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

## Tooling del agente (MCP + plugins)
| Herramienta | Dónde | Para qué |
|---|---|---|
| **Context7** | global (plugin + MCP) | Docs **al día** de librerías (React, Three.js, FastAPI, SQLAlchemy, Vite, Tailwind). Antes de asumir cómo es una API, consultá: hay docs que el training no tiene. |
| **Playwright MCP** | global | El browser de verdad: dashboard del DM, vista del jugador, login, flujos. **Complementa** al e2e (que es el que queda en el CI): el MCP es para mirar, el e2e es para fijar. |
| **GitHub MCP** | global, **solo lectura** | Issues, PRs y releases del repo. El header `X-MCP-Readonly` deja fuera las tools de escritura: no puede tocar el repo. |
| **grep.app** | global | Buscar cómo está implementado algo de verdad en el código público de GitHub. |
| **Serena** | global | Navegación **semántica** del código (símbolos, referencias) vía LSP. Contexto `oaicompat-agent`: solo 3 tools, así que el costo de contexto es bajo. |
| **graphify** | global (CLI, skill propia) | **Capa de consulta del código**: un grafo del repo (7.8k nodos / 13.3k aristas) que responde "qué toca esto" sin releer archivos. `graphify query "<pregunta>"` (orientación), `graphify affected "<archivo>" --depth 2` (radio de impacto antes de editar), `graphify god-nodes` (hubs = dónde el código se enreda), `graphify path A B`. **Complementa, no reemplaza**: grep/Serena para el símbolo exacto, graphify para el entorno y el radio de impacto; los **docs** siguen siendo la verdad del diseño (`docs/CONTEXT.md` primero). El grafo es de **código**: no cubre los docs ni el "por qué". Se refresca con `graphify update . --no-cluster` (AST puro, sin LLM, sin costo). `graphify-out/` está en `.gitignore`: es local, no se commitea. **Visualizador HTML (paso aparte)**: `graphify update` NO genera HTML; lo genera `graphify cluster-only .` → `graphify-out/graph.html` (D3 interactivo) — con `--no-label` para no pagar LLM, y `GRAPHIFY_VIZ_NODE_LIMIT=20000` porque el visualizador se salta los grafos de más de 5000 nodos (este tiene 7.8k). `graphify tree` → `graphify-out/GRAPH_TREE.html` (árbol D3 plegable, sin límite de nodos). |
| **Superpowers** | proyecto (`opencode.json`) | Skills de método: `writing-plans`, `executing-plans`, `test-driven-development`, `verification-before-completion`, code review. |
| **oh-my-opencode-slim** | proyecto (`opencode.json`) | Agentes extra (explorer, fixer, designer, oracle) + LSP + búsqueda AST. El preset `roleito` usa **los modelos que ya tenés** (`omniroute/*`, `gemini/*`), no los de OpenAI. El orquestador queda como un agente más: el agente principal sigue siendo `build`. |

**Guarda de estilo (Superpowers vs. este proyecto):** las skills de Superpowers son un **método, no una orden**. Acá se trabaja por fases (un tema por commit + CI verde) y el DM define el alcance: usá `writing-plans` / `executing-plans` / `verification-before-completion` cuando apliquen, pero **no abras un ciclo de `brainstorming` por cada cambio** — el `AGENTS.md` y las fases mandan sobre las skills. (El propio Superpowers lo dice: *"User instructions take precedence over skills"*.)

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