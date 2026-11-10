# Roleito — Plan: LLM Wiki para documentación del proyecto

Complemento a `graphify` (grafo de código). Investigación + plan de implementación.
Referencia: concepto de Andrej Karpathy (LLM Wiki), implementación `Astro-Han/karpathy-llm-wiki`.

## 1. Contexto: qué es LLM Wiki

**RAG tradicional**: el conocimiento vive en chunks raw + embeddings. La síntesis ocurre en query time (cada pregunta re-deriva relaciones). Bueno para retrieval amplio en corpus grandes.

**LLM Wiki**: el LLM mantiene páginas de wiki estructuradas (markdown) que se compilan y actualizan en ingest time. Las preguntas se responden citando páginas wiki ya sintetizadas. El conocimiento compone con el tiempo (cross-links, resúmenes, contradicciones registradas).

| Aspecto | RAG | LLM Wiki |
|---------|-----|----------|
| Conocimiento vive en | Chunks raw + embeddings | Páginas markdown curadas |
| Síntesis | En query time | En ingest/mantenimiento |
| Bueno para | Retrieval amplio en corpus grandes | Conocimiento que compone, resúmenes, cross-links duraderos |
| Búsqueda | Vector search | grep + read (a 50K-100K tokens es más confiable) |

## 2. Complemento a graphify

`graphify` ya cubre el **código**: grafo de 7.8k nodos, "qué toca esto", radio de impacto. No cubre docs ni el "por qué".

LLM Wiki cubriría la **documentación y decisiones**: compilar docs/, ADRs, specs, gotchas, lecciones de fases en páginas wiki interconectadas que el LLM consulta en vez de re-leer todos los docs cada vez.

División de trabajo:
- `graphify` → código (símbolos, dependencias, impacto)
- LLM Wiki → docs/decisiones (síntesis, cross-links, citas)
- AGENTS.md / docs/ → fuente de verdad del diseño (no se reemplaza)

## 3. Estructura propuesta

```
docs/
├── raw/                    # Fuentes inmutables (inputs)
│   ├── architecture/       # docs/core/*.md copiados/normalizados
│   ├── decisions/          # ADRs, memory.md, AGENTS.md
│   ├── features/           # docs de features (DM-DASHBOARD, etc.)
│   └── lessons/            # gotchas, diagnósticos, planes cerrados
├── wiki/                   # Páginas compiladas por el LLM
│   ├── index.md            # TOC global
│   ├── log.md              # log append-only de operaciones
│   ├── architecture/       # síntesis de arquitectura
│   ├── decisions/          # decisiones clave con cross-links
│   ├── features/           # feature pages con citas
│   └── gotchas/            # gotchas consolidados
└── (docs existentes se mantienen como fuente de verdad)
```

## 4. Operaciones

### Ingest
Input: URL, archivo, texto pegado, o un doc existente.
- Guarda fuente en `raw/<topic>/<fecha>-<slug>.md`
- Triage: ¿aporta algo nuevo?
- Crea o actualiza páginas wiki en `wiki/<topic>/`
- Actualiza cross-references, index.md, log.md
- Registra contradicciones si las hay

### Query
Input: pregunta del usuario/agente.
- Busca en wiki/ (grep + read)
- Responde con citas a páginas wiki
- Si la respuesta es valiosa, puede crear una nueva página wiki (compounding)

### Lint
Input: "lint my wiki"
- Verifica integridad de index.md (todas las páginas listadas)
- Links rotos
- Cross-references stale
- Páginas huérfanas
- Auto-fix + reporte de issues

## 5. Fuentes iniciales (raw/) para Roleito

Prioridad alta:
- `docs/core/CONTEXT.md`, `PRODUCT.md`, `ARCHITECTURE.md`, `DOMAIN.md`, `DATABASE.md`, `EVENT-SYSTEM.md`
- `docs/AGENTS.md` (spec de agentes AI del producto)
- `AGENTS.md` (raíz: directiva de ingeniería, stack, gotchas)
- `docs/roadmap/IMPLEMENTATION-STATUS.md`
- `docs/engineering/DIAGNOSTICO-Y-PLAN-MODULARIZACION.md`
- `~/.config/opencode/memory.md` (decisiones cross-proyecto)

Prioridad media:
- `docs/dm/DM-DASHBOARD-VTT.md`
- `docs/system/HYBRID-SHADOW-GEOMETRY.md`
- Planes cerrados: `docs/PLAN-REPLAY-SESION.md`, `docs/PLAN-VISION-PERCEPCION.md`

## 6. Plan de implementación

### Fase 0 — Diseño (1 día)
- Definir convenciones de naming (slugs, topics, frontmatter)
- Crear templates: `wiki/page-template.md`, `wiki/index-template.md`
- Documentar en `docs/engineering/PLAN-LLM-WIKI.md` (este archivo)

### Fase 1 — Bootstrap (1 día)
- Crear estructura `docs/raw/`, `docs/wiki/`
- Copiar fuentes prioritarias a `raw/` (normalizar a markdown)
- Generar `wiki/index.md` inicial (TOC por topic)
- Generar `wiki/log.md` inicial

### Fase 2 — Ingest inicial (2-3 días)
- Ingestar docs/core/* (arquitectura, domain, database, events)
- Ingestar AGENTS.md (directiva + gotchas)
- Ingestar IMPLEMENTATION-STATUS.md
- Verificar cross-links y contradicciones

### Fase 3 — Query + Lint (1 día)
- Implementar skill/operación Query (grep wiki + read + citar)
- Implementar Lint (integridad index, links, huérfanas)
- Documentar uso en AGENTS.md

### Fase 4 — Mantenimiento (continuo)
- Cada commit que cambia docs → ingest de los docs afectados
- Lint semanal o por PR
- Integrar con `roleito-docsync` skill

## 7. Integración con graphify

- graphify responde "qué código toca esto" (AST, símbolos, dependencias)
- LLM Wiki responde "por qué se diseñó así" (decisiones, gotchas, lecciones)
- Flujo del agente:
  1. `graphify affected <file>` → radio de impacto en código
  2. `wiki/query "por qué X"` → contexto de decisiones
  3. Docs fuente → verdad del diseño

## 8. Límites y no-goals (según Astro-Han/karpathy-llm-wiki)

- No vector/graph search a <100K tokens: grep + read es más confiable
- No numeric confidence scores (falsa precisión)
- No per-article review dates (mantenimiento por lint global)
- No automatic hooks/scheduled runs (eso es del harness, no del skill)
- No typed relationship ontologies (semántica en el prose)
- No MCP servers/UIs (fuera de scope del skill)

## 9. Riesgos

- Duplicación con docs/ existentes: mitigar manteniendo docs/ como fuente de verdad y wiki/ como síntesis derivada
- Stale wiki: mitigar con lint por PR + roleito-docsync
- Overhead de mantenimiento: mitigar con ingest automático en commits que tocan docs

## 10. Próximo paso

Decidir si implementar (Fase 0-1) o esperar a que el CI se estabilice. Recomendación: implementar Fase 0-1 en paralelo con el trabajo de CI (no bloquea).