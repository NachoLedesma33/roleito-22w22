# Roleito

**Persistent AI RPG World Engine** — plataforma local-first para campañas de rol (tabletop RPG) con DM + asistente IA.

El DM es la autoridad final del canon. El World State es la fuente de verdad. La IA asiste, no decide.

## Características

- **Mesa virtual (VTT)**: mapas 2D/3D, tokens, niebla de guerra, iluminación dinámica, paredes y zonas.
- **Vista del jugador**: POV dedicado con visión limitada, niebla de percepción, movimiento WASD.
- **Canon y memoria**: eventos Propuesto → Revisado → Aprobado/Rechazado. Memoria persistente entre sesiones.
- **Asistente IA**: propone eventos, recaps, lore, narrativa. El DM aprueba o rechaza.
- **Dados**: roller integrado con historial y tiradas secretas.
- **Campañas y sesiones**: gestión de campañas, escenas, personajes, NPCs, quests, calendario, clocks.
- **Notas del DM**: notebook con versionado.
- **Audio y clima**: ambientes por escena, clima visual (lluvia, nieve, niebla).
- **Playtest remoto**: túnel (Tailscale/Cloudflare) para jugar a distancia.
- **Local-first**: todo corre en tu máquina, sin servidores externos.

## Stack

- Frontend: React 18 + TypeScript (strict) + Vite + Tailwind + Three.js/R3F.
- Backend: FastAPI + SQLAlchemy + SQLite.
- Core: Python (events, world, canon, memory, narrative, agents) + TypeScript (domain types, scene).

## Comandos rápidos

```bash
npm run dev          # frontend (5173, proxy a backend)
npm run dev:backend  # backend (8000, con venv)
npm run dev:all      # todo en una terminal (backend + frontend + túnel)
npm run dev:lan      # frontend accesible en LAN
npm run setup:tunnel # setup one-time de Tailscale Funnel (URL fija)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test --workspace=apps/dm  # vitest
```

## Estructura

```
apps/dm/       # frontend React (único)
backend/       # FastAPI + SQLAlchemy
core/          # Python + TS compartido
docs/          # documentación (ver docs/README.md)
scripts/       # tooling (tunnel, dev-all, setup-tunnel)
tests/e2e/     # Playwright E2E
```

## Licencia

Privado. Todos los derechos reservados.