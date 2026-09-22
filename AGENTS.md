# Roleito — AGENTS.md

Persistent AI RPG World Engine. Local-first platform for tabletop RPG campaigns.
DM authority + AI assistant. World State = source of truth.

## Stack & Structure
- **Frontend real (único): `apps/dm`** — React 18 + TS strict + Vite + Tailwind. Three.js/R3F se usan DENTRO de apps/dm (SceneRenderer, PlayerView), no en apps separadas.
- `apps/player` y `apps/renderer` son **placeholders vacíos (.gitkeep)**; no crear código ahí. La vista jugador vive en `apps/dm/src/pages/PlayerView.tsx`.
- **Backend**: FastAPI + SQLAlchemy + SQLite. Todos los routers bajo `/api/`; health en `/health`; assets en `/api/static` (data/assets). App en `backend/main.py`.
- **`core/` es bilingüe**: Python (events, world, canon, memory, narrative, agents) importado por el backend; TypeScript (`core/domain/types.ts`, `core/scene/*`) consumido por apps/dm vía alias `@core -> ../../core` (vite + vitest + tsconfig). Respetar cada lado; `core/scenes` (plural) no se usa.
- **`docs/AGENTS.md` NO es este archivo** — es la spec del sistema de agentes AI del producto. No confundir.

## Commands
- Dev frontend: `npm run dev` (= dev:dm, puerto 5173, proxy `/api -> localhost:8000`)
- Dev backend: `npm run dev:backend` — embebe ruta Windows `..\venv\Scripts\python.exe`; en otro OS ajustar
- Typecheck: `npm run typecheck` (`tsc --noEmit` apps/dm, strict)
- Lint: `npm run lint` (eslint raíz; ignora backend, data, venv)
- Unit (vitest, en apps/dm): `npm run test --workspace=apps/dm`; solo `src/**/*.spec.ts`, env node
  - Single: `npx vitest run src/lib/losSystem.spec.ts`
  - ⚠️ `losRaycast.spec.ts` **cuelga en vitest** — no correrlo; su cobertura está en losSystem.spec
- Backend (pytest): desde `backend/`: `..\..\venv\Scripts\python.exe -m pytest`; test deps en `requirements-test.txt` (NO en requirements.txt)
- E2E: `npm run test:e2e` — Playwright **levanta solo** frontend (5173) + backend (8000) vía webServer; tests en `tests/e2e`, global setup en `tests/global-setup.ts`
- CI (`e2e.yml`): typecheck → lint → playwright. **NO corre vitest ni pytest** — correr ambos local antes de push
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

## Gotchas (lecciones pagadas)
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