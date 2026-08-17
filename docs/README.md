# Documentación del Proyecto

Este directorio contiene la especificación técnica y funcional del RPG World Engine.

## Orden de lectura

1. `CONTEXT.md` — Contexto raíz, leer primero siempre
2. `PRODUCT.md` — Visión y objetivos del producto
3. `DOMAIN.md` — Contrato de dominio conceptual
4. `ARCHITECTURE.md` — Arquitectura técnica
5. `DATABASE.md` — Persistencia SQLite
6. `EVENT-SYSTEM.md` — Pipeline central de eventos
7. Luego leer solo los docs relevantes a la tarea

## Estado de la Documentación

### Completados
- `CONTEXT.md` ✅
- `PRODUCT.md` ✅
- `DOMAIN.md` ✅
- `ARCHITECTURE.md` ✅
- `DATABASE.md` ✅
- `EVENT-SYSTEM.md` ✅
- `INGESTION-AND-LORE.md` ✅
- `SETTING-INGESTION.md` ✅
- `CONTEXT-SYSTEM.md` ✅
- `AGENTS-SYSTEM.md` ✅
- `AGENTS.md` ✅
- `SESSION-SYSTEM.md` ✅
- `WORLD-STATE.md` ✅
- `RENDERER.md` ✅
- `DM-CONTROLLER.md` ✅
- `DATA-MODEL.md` ✅
- `DATA-DIRECTORY.md` ✅
- `SECURITY.md` ✅
- `PERFORMANCE.md` ✅
- `TESTING.md` ✅
- `ROADMAP.md` ✅

### Stubs (revisar en FIX-PLAN.md)
- `CANON.md` — stub, contenido movido a EVENT-SYSTEM.md §43-48
- `MEMORY.md` — stub, contenido movido a CONTEXT-SYSTEM.md §16-19
- `RECAP-ENGINE.md` — stub, contenido movido a SESSION-SYSTEM.md §62-70
- `SCENE-ENGINE.md` — stub, contenido movido a SESSION-SYSTEM.md §82-87
- `CHARACTER-SYSTEM.md` — stub, contenido movido a DATA-MODEL.md §14-16
- `DM-CONTROL-DECK.md` — stub, contenido movido a DM-CONTROLLER.md
- `3D-RENDERER.md` — stub, contenido movido a RENDERER.md
- `AI-AGENTS.md` — stub, contenido movido a AGENTS-SYSTEM.md
- `CONTEXT-BUILDER.md` — stub, contenido movido a CONTEXT-SYSTEM.md
- `PRODUCT.md` — stub mínimo

### No existen (planificados en §24)
- `TTS.md`
- `ASSET-MANAGEMENT.md`

## Setting Externo

`SETTING-INGESTION.md` define cómo se importa el worldbuilding externo a la base de conocimiento local.

El setting externo se almacena en:

```text
/data/settings/
```

La información específica de campaña se almacena en:

```text
/data/campaigns/
```

## Fix Pendiente

Ver `FIX-PLAN.md` para el plan completo de corrección de inconsistencias entre docs.
