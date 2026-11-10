# Roleito — Glosario de términos

Términos clave del proyecto y dónde encontrarlos.

## A
- **Agent Skills** — skills instalables (find-skills, playwright-best-practices, etc.). Ver `AGENTS.md` sección Skills.
- **AnchoredMenu** — menú emergente anclado a un botón. Ver `apps/dm/src/components/ui/AnchoredMenu.tsx`.
- **AoE** — área de efecto (círculo/cono/cubo). Ver `apps/dm/src/pages/DmDashboard.tsx` (aoeMode).

## C
- **Canon** — PROPOSED → REVIEW → APPROVED/REJECTED. Ver `docs/core/CANON.md`, `docs/core/CONTEXT.md`.
- **CharacterSheet** — ficha del personaje. Ver `apps/dm/src/components/CharacterSheet.tsx`.
- **check-docs-consistency** — script que verifica docs vs código. Ver `scripts/check-docs-consistency.py`.

## D
- **DM (Director de Juego)** — autoridad final. Ver `docs/dm/DM-DASHBOARD-VTT.md`.
- **DmDashboard** — dashboard del DM. Ver `apps/dm/src/pages/DmDashboard.tsx`.

## E
- **Event System** — DM/AI → Event → World State → Renderer. Ver `docs/core/EVENT-SYSTEM.md`.
- **Event** — entidad de evento. Ver `backend/models.py` (class Event).

## F
- **Fog of War** — niebla de guerra. Ver `docs/system/FOG-OF-WAR.md`, `docs/system/HYBRID-SHADOW-GEOMETRY.md`.
- **Frontmatter** — metadata YAML en docs (topic, updated, sources). Ver `docs/core/CONTEXT.md`.

## G
- **graphify** — grafo de código (7.8k nodos). Ver `AGENTS.md` sección Tooling.
- **Grounding Invariant** — cada dato en docs debe existir en código. Ver `scripts/check-docs-consistency.py`.

## H
- **HudPanel** — panel HUD arrastrable/minimizable. Ver `apps/dm/src/components/HudPanel.tsx`.

## L
- **LLM Wiki** — concepto de Karpathy (diferido). Ver `docs/PLAN-LLM-WIKI.md`.
- **LosSystem / LOS** — línea de visión. Ver `apps/dm/src/lib/losSystem.ts`, `core/scene/`.

## M
- **Markers** — marcadores láser en el mapa. Ver `apps/dm/src/pages/DmDashboard.tsx` (markers).
- **memory.md** — memoria persistente cross-proyecto. Ver `~/.config/opencode/memory.md`.

## P
- **PlayerView** — vista del jugador. Ver `apps/dm/src/pages/PlayerView.tsx`.
- **PlayerSync** — sincronización jugador (WS + poll). Ver `apps/dm/src/lib/usePlayerSync.ts`.

## R
- **roleito-docsync** — skill obligatoria al cerrar features. Ver `.opencode/skills/roleito-docsync/SKILL.md`.
- **roleito-modularizacion** — skill obligatoria al escribir código. Ver `.opencode/skills/roleito-modularizacion/SKILL.md`.
- **RoomBackground** — fondo 3D de la sala. Ver `apps/dm/src/components/RoomBackground.tsx`.
- **RoomSkin** — skin de la sala (oggys, skyboxes). Ver `apps/dm/src/lib/roomSkins.ts`.

## S
- **SceneRenderer** — renderizador de escena 3D. Ver `apps/dm/src/components/SceneRenderer.tsx`.
- **Session** — sesión de juego. Ver `backend/models.py` (class Session).
- **Shadow geometry** — geometría de sombras manual-first. Ver `docs/system/HYBRID-SHADOW-GEOMETRY.md`.

## T
- **TokenSprite** — sprite 2D de token con marco. Ver `apps/dm/src/components/TokenSprite.tsx`.
- **TokenModel** — modelo 3D de token. Ver `apps/dm/src/components/TokenModel.tsx`.

## V
- **VFX** — efectos visuales de habilidades. Ver `apps/dm/src/components/VfxBurst.tsx`.
- **VTT** — Virtual Tabletop. Ver `docs/dm/DM-DASHBOARD-VTT.md`.

## W
- **World State** — fuente de verdad. Ver `docs/core/CONTEXT.md`, `docs/core/ARCHITECTURE.md`.

## Ver también
- `docs/README.md` — índice de documentación.
- `AGENTS.md` (raíz) — directiva de ingeniería y gotchas.
- `docs/PLAN-MEJORA-DOCUMENTACION.md` — plan de mejora de documentación.