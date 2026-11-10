# Roleito — Plan de mejora del manejo de documentación

Mejoras incrementales basadas en conceptos de LLM Wiki (Karpathy) pero adaptadas a la estructura existente. Sin crear wiki/ ni raw/ nuevos.

## 1. Estado actual

- `docs/` organizado por carpeta: `core/`, `system/`, `dm/`, `roadmap/`, `engineering/`
- `docs/README.md` como índice
- `AGENTS.md` (raíz) con gotchas, decisiones, directiva de ingeniería
- `scripts/check-docs-consistency.py` verifica docs vs código
- Skill `roleito-docsync` obligatoria al cerrar features
- `memory.md` cross-proyecto

## 2. Opciones de mejora (ordenadas por costo/beneficio)

### Opción A — Enriquecer docs/README.md (bajo costo, alto beneficio)

**Qué:** Convertir el índice en un TOC con resúmenes de 1 línea por doc + cross-links.

**Cómo:**
- Agregar columna "Resumen" y "Última actualización" a cada entrada
- Agrupar por "topic" (arquitectura, gameplay, ingeniería, roadmap)
- Link directo a secciones clave (no solo archivos)

**Beneficio:** El agente encuentra info relevante sin leer todos los docs. Reduce tokens en sesiones largas.

**Costo:** 1-2 horas de edición manual.

### Opción B — Frontmatter YAML en docs (bajo costo, medio beneficio)

**Qué:** Agregar metadata al inicio de cada doc clave:

```markdown
---
topic: architecture
updated: 2026-11-10
sources: [backend/models.py, core/domain/types.ts]
---
```

**Cómo:**
- Agregar frontmatter a docs/core/*.md y docs/engineering/*.md
- Script que parsea frontmatter y genera docs/README.md automáticamente
- `check-docs-consistency.py` verifica que `sources` coincidan con archivos modificados

**Beneficio:** Query automatizada ("dame los docs que tocan models.py"). Detecta docs desactualizados.

**Costo:** 2-3 horas + script.

### Opción C — Grounding invariant (medio costo, alto beneficio)

**Qué:** Verificar que los números/datos en docs coincidan con el código. Inspirado en LLM Wiki "Grounding Invariant".

**Cómo:**
- Extender `check-docs-consistency.py` con regex para detectar:
  - Números (puertos, timeouts, límites) en docs
  - Comparar con constantes en código (POLL_MS, PORT, etc.)
  - Reportar mismatches
- Ejecutar en CI (job "checks")

**Beneficio:** Detecta docs desactualizados automáticamente. Reduce mojibake de datos.

**Costo:** 1 día de desarrollo del script.

### Opción D — Query mejorada (bajo costo, medio beneficio)

**Qué:** Mejorar la búsqueda de docs con sinónimos y cross-references.

**Cómo:**
- Agregar sección "Ver también" al final de cada doc con links a docs relacionados
- Crear `docs/GLOSSARY.md` con términos clave y sus ubicaciones
- El agente busca en glossary primero, luego en docs/

**Beneficio:** Reduce tokens (no re-leer docs enteros). Mejora precisión de respuestas.

**Costo:** 2-3 horas.

### Opción E — Cascade updates automáticos (medio costo, alto beneficio)

**Qué:** Cuando se modifica un doc, actualizar cross-references automáticamente.

**Cómo:**
- Extender `roleito-docsync` skill con paso de "cascade": buscar todos los docs que referencian el doc modificado y verificar que sigan siendo válidos
- Script que detecta links rotos en docs/ (ya existe parcialmente en check-docs-consistency.py)
- Ejecutar en CI

**Beneficio:** Mantiene docs consistentes sin esfuerzo manual.

**Costo:** 1 día.

### Opción F — Lint de docs en CI (bajo costo, alto beneficio)

**Qué:** Agregar un job de CI que verifique docs.

**Cómo:**
- Job "docs" en e2e.yml que corre `scripts/check-docs-consistency.py`
- Falla si hay links rotos o docs desactualizados
- Bloquea merge si docs están rotos

**Beneficio:** Garantiza que docs nunca se rompan. Previene mojibake y links rotos.

**Costo:** 1-2 horas (configuración CI).

## 3. Plan de implementación recomendado

### Fase 1 — Quick wins (1 día)
1. **Opción A**: Enriquecer docs/README.md con resúmenes y cross-links
2. **Opción F**: Agregar job de CI para check-docs-consistency.py
3. **Opción D**: Agregar "Ver también" a docs clave

### Fase 2 — Automatización (2-3 días)
4. **Opción B**: Frontmatter YAML en docs/core/*.md
5. **Opción C**: Grounding invariant en check-docs-consistency.py
6. **Opción E**: Cascade updates en roleito-docsync

### Fase 3 — Mejora continua
7. Mantener glossary actualizado
8. Revisar docs cada sprint (lint manual)
9. Evaluar si se necesita LLM Wiki (cuando docs > 50K tokens)

## 4. Prioridad sugerida

| Prioridad | Opción | Razón |
|-----------|--------|-------|
| P1 | A (README enriquecido) | Bajo costo, alto beneficio inmediato |
| P1 | F (CI lint de docs) | Previene regresiones de docs |
| P2 | D (cross-links + glossary) | Mejora navegación |
| P2 | B (frontmatter) | Base para automatización |
| P3 | C (grounding invariant) | Detecta datos desactualizados |
| P3 | E (cascade updates) | Mantenimiento automático |

## 5. No-goals

- No crear wiki/ ni raw/ (eso es LLM Wiki, diferido)
- No cambiar la estructura de carpetas existente
- No agregar dependencias nuevas (solo scripts Python existentes)
- No reescribir docs existentes (solo mejorar cross-links y metadata)