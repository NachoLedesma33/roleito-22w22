# Documentación del Proyecto

Este directorio contiene la especificación técnica y funcional del RPG World Engine.

## Orden de lectura

1. `CONTEXT.md` — Contexto raíz, leer primero siempre
2. `PRODUCT.md` — Visión y objetivos del producto
3. `DM-DASHBOARD-VTT.md` — El tablero del DM
4. `HYBRID-SHADOW-GEOMETRY.md` — Paredes, sombra y zona (el canon actual)
5. `DOMAIN.md` — Contrato de dominio conceptual
6. `ARCHITECTURE.md` — Arquitectura técnica
7. `DATABASE.md` — Persistencia SQLite
8. `EVENT-SYSTEM.md` — Pipeline central de eventos
9. Luego leer solo los docs relevantes a la tarea

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

### Punteros (docs consolidados: el contenido vive en el doc que"­apunta)
> Los archivos viejos se conservan como punteros: cada uno dice dónde está
> el contenido. No son deuda ni docs rotos.
- `CANON.md` — stub, contenido movido a EVENT-SYSTEM.md §43-48
- `MEMORY.md` — stub, contenido movido a CONTEXT-SYSTEM.md §16-19
- `RECAP-ENGINE.md` — stub, contenido movido a SESSION-SYSTEM.md §62-70
- `SCENE-ENGINE.md` — stub, contenido movido a SESSION-SYSTEM.md §82-87
- `CHARACTER-SYSTEM.md` — stub, contenido movido a DATA-MODEL.md §14-16
- `DM-CONTROL-DECK.md` — stub, contenido movido a DM-CONTROLLER.md
- `3D-RENDERER.md` — stub, contenido movido a RENDERER.md
- `AI-AGENTS.md` — stub, contenido movido a AGENTS-SYSTEM.md
- `CONTEXT-BUILDER.md` — stub, contenido movido a CONTEXT-SYSTEM.md

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

## Correcciones de docs

`FIX-PLAN.md` es la auditoría de 2026-10: **ya se ejecutó**. Para el estado
de hoy de cada doc, `IMPLEMENTATION-STATUS.md` es la fuente.
