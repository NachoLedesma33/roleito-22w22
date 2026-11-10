# Roleito — Documentación

Índice enriquecido. Cada entrada: archivo → resumen de 1 línea.

## Lectura obligatoria (en orden)
1. `core/CONTEXT.md` — contexto del proyecto (leer primero siempre).
2. `core/PRODUCT.md` — producto y visión.
3. `core/DESIGN-SYSTEM.md` — UI/UX, theming, contraste, cero transparencias en paneles con texto.
4. `core/ARCHITECTURE.md` — arquitectura del sistema.
5. `core/DOMAIN.md` — dominio y entidades.
6. `core/DATABASE.md` — modelo de datos.
7. `core/EVENT-SYSTEM.md` — sistema de eventos.

## Ingeniería (aplicar siempre)
- `ROLEITO_GUIA_MODULARIZACION_ARQUITECTURA.md` — directiva de ingeniería (cohesión, acoplamiento, SOLID, DRY, hooks, backend por capa).
- `engineering/DIAGNOSTICO-Y-PLAN-MODULARIZACION.md` — diagnóstico priorizado + plan de fases (cerradas).
- `engineering/PLAN-VISION-PERCEPCION.md` — visión y percepción del jugador.
- `engineering/PLAN-NIEBLA-Y-LUCES.md` — fog y luces (manual-first).
- `engineering/PLAN-PLAYTEST-REMOTO.md` — playtest remoto/túnel.
- `engineering/PLAN-PROVEEDORES-IA-Y-SEGURIDAD.md` — IA y seguridad.
- `roadmap/IMPLEMENTATION-STATUS.md` — estado maestro de features.
- `ROADMAP-MEJORAS.md` — mejoras futuras priorizadas.
- `PERFORMANCE.md` — notas de performance.

## Sistemas del producto
- `core/CHARACTER-SYSTEM.md` — sistema de personajes.
- `core/CHARACTER-STATS.md` — stats y atributos (VIDA).
- `core/CHARACTER-PERSISTENCE.md` — persistencia de personajes.
- `core/CANON.md` — canon: PROPOSED → REVIEW → APPROVED/REJECTED.
- `core/MEMORY.md` — sistema de memoria.
- `core/NARRATIVE.md` — narrativa.
- `core/INGESTION-AND-LORE.md` — ingestión y lore.
- `system/DICE-SYSTEM.md` — sistema de dados.
- `system/LIGHTING-SYSTEM.md` — sistema de luces.
- `system/COLLISION-SYSTEM.md` — colisiones.
- `system/FOG-AND-VISIBILITY.md`, `system/FOG-OF-WAR.md` — fog y visibilidad.
- `system/HYBRID-SHADOW-GEOMETRY.md` — geometría de sombras (canon actual).
- `system/MOVEMENT-AGENT.md`, `system/NAVIGATION-AND-COLLISION.md`, `system/NAVMESH-AND-PATHFINDING.md` — movimiento y pathfinding.
- `system/INTERACTIVE-OBJECTS.md`, `system/DYNAMIC-OBSTACLES.md` — objetos interactivos y obstáculos.
- `system/CONDITIONS-AURAS.md` — condiciones y auras.
- `system/ASSET-SYSTEM.md`, `system/DATA-DIRECTORY.md`, `system/DATA-MODEL.md` — assets y datos.
- `system/ENVIRONMENT-SPEC.md`, `system/CAMERA-SYSTEM.md` — entorno y cámara.
- `system/2D-TO-3D.md`, `system/3D-RENDERER.md` — render 3D.
- `system/AI-AGENTS.md`, `system/AI-3D-ENVIRONMENTS.md`, `system/AGENTS-SYSTEM.md`, `system/AGENT-SYSTEM.md` (ver `docs/AGENTS.md`) — agentes AI.
- `core/CONTEXT-SYSTEM.md`, `core/CONTEXT.md` — sistema de contexto.

## DM y operación
- `dm/DM-DASHBOARD-VTT.md` — dashboard VTT del DM.
- `dm/DM-CONTROL-DECK.md` — control deck.
- `dm/DM-CONTROLLER.md` — controlador DM.
- `dm/DM-NOTEBOOK.md` — notebook del DM.
- `dm/DM-SUPER-ADMIN.md` — super admin.

## Testing
- Ver `tests/e2e/` (Playwright). `E2E-TEST-PLAN.md` eliminado.

## Roadmap
- `roadmap/ROADMAP-MEJORAS.md` — mejoras futuras priorizadas.
- `roadmap/IMPLEMENTATION-STATUS.md` — estado maestro de features.
- `PERFORMANCE.md` — notas de performance.

## Historial (planes/resueltos)
- `AUDITORIA-VTT.md` (2026-10-15): auditoría funcional VTT — resuelta.
- `PLAN-DADOS-3D.md` (2026-10-10): dados 3D — resuelto (DiceRoller).
- `SDD_Persistent_AI_RPG_World_Engine_v0.1.md` (raíz): spec original v0.1 — superseded por `docs/core/CONTEXT.md` + `docs/core/ARCHITECTURE.md`.

## Planes en curso
- `PLAN-LLM-WIKI.md` — LLM Wiki (diferido).
- `PLAN-MEJORA-DOCUMENTACION.md` — mejora de manejo de docs (Fase 1 en curso).
- `PLAN-REPLAY-SESION.md` — replay de sesión (revertido; recap manual funciona).