# 22W22 - D&D VTT

**Persistent AI RPG World Engine** — plataforma local-first para campañas de rol (tabletop RPG) con DM + asistente IA.

> El mundo que tus sesiones recuerdan.

## La idea

Una campaña de D&D no es solo un mapa con fichas: es historia acumulada, secretos, consecuencias y cosas que los jugadores descubren tarde. En la mayoría de las mesas virtuales, el tablero y la memoria viven separados. 22W22 invierte eso: el estado del mundo manda, y el tablero es una vista de ese estado.

- **World State = fuente de verdad.** Escenas, entidades, eventos, canon y memoria salen del mismo lugar. No hay una segunda historia escondida en el renderer ni en los prompts.
- **DM = autoridad final.** Toda propuesta —humana o de IA— pasa por revisión. Aprobada entra al canon; rechazada queda como registro, no como verdad.
- **IA = copiloto con permisos.** Propone eventos, redacta narración, resume sesiones y sugiere lore. Nunca escribe al DB directo: entra por el Event System.
- **Renderer = derivado.** La mesa 2D/3D, la niebla y la vista del jugador se calculan desde el World State. Cambiar el canon cambia la escena; no al revés.
- **Local-first.** La campaña vive en SQLite en tu máquina. Sin nube obligatoria ni cuenta para jugar en local.

## Para quién

- **DMs** que quieren menos configuración y más juego: mapa, luces, visión, notas y resúmenes en una sola mesa.
- **Jugadores nuevos**: nombre + PIN, campaña, mesa. La vista del jugador muestra solo lo que su personaje sabe.
- **Recruiters / equipos de producto**: proyecto real con React + TypeScript strict + Three.js/R3F arriba y FastAPI + SQLAlchemy abajo, con tests y decisiones de arquitectura documentadas.

## Cómo se juega

1. Creás perfil de DM con PIN y una campaña.
2. Subís un mapa a una escena. El sistema propone muros y puertas por CV + IA; vos revisás y aprobás.
3. Arrastrás tokens, ajustás facing/escala, ponés luces y decidís niebla, clima y audio.
4. Abrís la vista del jugador: cada POV calcula visión, luz y secretos propios. El jugador puede pedir luz; el DM decide.
5. Registrás eventos. El pipeline Propuesto → Revisado → Aprobado/Rechazado decide qué se vuelve canon.
6. La memoria guarda lo aprobado y alimenta resúmenes, narración y agentes para la sesión siguiente.
7. Exportás/importás campañas, o jugás en LAN / por túnel cuando la mesa está lejos.

## Funcionalidades

- **Mesa virtual (VTT)**: mapas 2D/3D, grid, zoom/pan, tokens con drag & drop, rotación, escala, modelos `.glb`, marcos animados, paredes, puertas y zonas.
- **Detección de mapa**: muros y puertas por CV + IA con propuesta revisable por el DM; detección de grilla y herramientas manuales de dibujo.
- **Visión y niebla**: niebla estática y dinámica, geometría de sombras híbrida, líneas de visión, luces con oclusión, sentidos especiales, peticiones de luz y tres modos de niebla por jugador.
- **Atmósfera**: audio ambiente por escena, siete variantes de clima con intensidad, transiciones y efectos visuales para 36 habilidades con audio procedural.
- **Narrativa y memoria**: eventos con canon revisado, resúmenes de sesión, memoria persistente por capas, ocho agentes de IA y TTS opcional.
- **Juego**: dados con historial y tiradas secretas, iniciativa, estado VIDA, hojas de personaje, PNJs, catálogo de habilidades, misiones, calendario y clocks.
- **DM**: cuaderno con versionado, notas por escena, log de sesión, documentos para jugadores, bóveda y paleta de comandos.
- **Operación**: perfiles con PIN, permisos por rol, import/export de campañas, playtest en LAN y túnel (Tailscale/Cloudflare) con build de producción.

## Lo que no promete

No reemplaza al DM. No es servicio hospedado, ni multijugador online, ni sincronización en la nube. No genera combate completo de forma autónoma ni certificación legal de privacidad. La IA puede fallar: por eso propone y el DM firma.

## Arquitectura express

```text
DM / IA
   └── Event ──> World State ──> Renderer / Recaps / Memoria / Vista jugador
                      ▲
                      └── canon aprobado por el DM
```

Determinista → código (movimiento, coords, escena, visibilidad). Probabilístico → IA (narración, propuestas, resúmenes). Nunca se manda la campaña completa al LLM: el contexto se construye desde el World State.

## Stack

- Frontend: React 18 + TypeScript (strict) + Vite + Tailwind + Three.js/R3F.
- Backend: FastAPI + SQLAlchemy + SQLite.
- Core: Python (events, world, canon, memory, narrative, agents) + TypeScript (domain types, scene) consumido vía alias `@core`.

## Comandos rápidos

```bash
npm run dev          # frontend (5173, proxy a backend)
npm run dev:backend  # backend (8000, con venv)
npm run dev:backend:alt # backend (8001, con venv)
npm run dev:dm:alt   # frontend (5181, proxy a 8001)
npm run dev:all      # todo en una terminal (backend + frontend + túnel)
npm run dev:lan      # frontend accesible en LAN
npm run setup:tunnel # setup one-time de Tailscale Funnel (URL fija)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test --workspace=apps/dm  # vitest
```

Para varios localhost: `dev:backend:alt` + `dev:dm:alt` en dos terminales. Frontend fijo en `5181`, backend en `8001`; no toca `4345`, `8000` ni `5173`. Cambiar puertos con `ROLEITO_BACKEND=<backend>` y `--port <frontend>`. Verificar: POST inválido a `/api/contact` debe dar `422`, nunca `404`.

## Verificación

```bash
npm run lint
npm run typecheck
npm run test --workspace=apps/dm
# desde backend/: ..\venv\Scripts\python.exe -m pytest
venv\Scripts\python.exe scripts\check-docs-consistency.py
npx playwright test
```

Última corrida completa: lint 0 errores, typecheck OK, 358 vitest, 242 pytest, docs-consistency OK, 320 e2e (1 skip conocido).

## Estructura

```
apps/dm/       # frontend React (único); incluye PlayerView y renderer 3D
backend/       # FastAPI + SQLAlchemy
core/          # Python + TS compartido
docs/          # documentación (ver docs/README.md)
scripts/       # tooling (tunnel, dev-all, setup-tunnel)
tests/e2e/     # Playwright E2E
```

## Documentación

- Índice: `docs/README.md`.
- Contexto y visión: `docs/core/CONTEXT.md`, `docs/core/PRODUCT.md`.
- Estado real de features: `docs/roadmap/IMPLEMENTATION-STATUS.md`.
- Arquitectura y eventos: `docs/core/ARCHITECTURE.md`, `docs/core/EVENT-SYSTEM.md`.
- Material de comunicación: `docs/marketing/PUBLICACION-LINKEDIN-22W22.md`.

Repo: https://github.com/NachoLedesma33/22W22-DnD-VTT

## Licencia

Privado. Todos los derechos reservados.
