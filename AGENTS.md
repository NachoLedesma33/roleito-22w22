# Roleito — AGENTS.md

## Project Overview
Persistent AI RPG World Engine. Local-first platform for tabletop RPG campaigns.

## Stack
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **3D**: Three.js + React Three Fiber + Drei (Phase 5+)
- **Backend**: Python + FastAPI + SQLAlchemy + SQLite
- **AI**: Decoupled provider layer (local LLM / external API)
- **TTS**: Decoupled provider layer

## Architecture
- Event-driven: `DM/AI -> Event -> World State -> Renderer`
- World State = source of truth
- DM has final authority over canon
- AI proposes, DM approves/rejects

## Directory Structure
```
/apps/dm          — DM control panel (React)
/apps/player      — Player view (React, future)
/apps/renderer    — 3D scene renderer (React Three Fiber)
/core/domain      — Domain types and interfaces
/core/world       — World state logic
/core/events      — Event bus and handlers
/core/canon       — Canon management
/core/memory      — Context builder, memory tiers
/core/narrative   — Narrative engine
/core/scenes      — Scene management
/infrastructure/  — Database, storage, AI, TTS, search
/backend          — FastAPI server
/data             — SQLite DB, campaign data, snapshots
/data/settings    — External worldbuilding (The Archive In Between)
/data/campaigns   — Campaign-specific data
/assets           — Characters, environments, audio, video, images
/docs             — Technical specification (no lore here)
```

## Documentation Reading Order
1. `docs/CONTEXT.md` — Read first, always
2. `docs/PRODUCT.md`
3. `docs/DOMAIN.md` — Conceptual contract
4. `docs/ARCHITECTURE.md`
5. `docs/DATABASE.md` — SQLite persistence
6. `docs/EVENT-SYSTEM.md` — Core event pipeline
7. Then read only the docs relevant to your task

## Coding Conventions
- TypeScript strict mode
- Python type hints
- No comments unless asked
- Prefer existing libraries
- Follow existing patterns

## Key Rules
- `core/domain/types.ts` — single source of truth for types
- Never send full campaign to LLM
- Canon flow: `PROPOSED -> REVIEW -> APPROVED/REJECTED`
- Knowledge scope enforced at query time
- Runtime: fast, deterministic, no heavy generation
- AI never writes directly to DB — always through Event System
- Renderer never modifies canon
- World State is source of truth
