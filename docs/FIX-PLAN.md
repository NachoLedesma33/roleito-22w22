# FIX-PLAN.md

> Auditoría completa de la documentación base del RPG World Engine.
>
> Generado tras un barrido exhaustivo de los 31 archivos en `/docs/`.
>
> Este archivo NO es una especificación.
> Es un plan de corrección que debe ejecutarse antes de continuar con
> implementación significativa.
>
> Si la documentación base tiene inconsistencias, cada decisión de
> implementación derivada pagará ese error multiplicado.

---

# RESUMEN EJECUTIVO

```text
ARCHIVOS ENCONTRADOS:     31
SPECS COMPLETAS:          19
STUBS (INCOMPLETOS):      10
META (README):             1
ARCHIVOS FALTANTES:        5
REFERENCIAS ROTAS:        12+
DUPLICADOS/SOLAPAMIENTOS: 8
INCONSISTENCIAS NOMENCLATURA: 15+
INCONSISTENCIAS TERMINOLÓGICAS: 8
INCONSISTENCIAS IDIOMA:    2
```

**El problema principal no es la cantidad de archivos.**
**Es que coexisten dos capas de documentación que no se reconocen mutuamente:**

```text
CAPA A (completa, nueva):
CONTEXT.md, PRODUCT.md, DOMAIN.md, ARCHITECTURE.md, DATABASE.md,
EVENT-SYSTEM.md, RENDERER.md, PERFORMANCE.md, SECURITY.md,
TESTING.md, ROADMAP.md, SESSION-SYSTEM.md, WORLD-STATE.md,
DATA-MODEL.md, DATA-DIRECTORY.md, AGENTS-SYSTEM.md, AGENTS.md,
DM-CONTROLLER.md, CONTEXT-SYSTEM.md, INGESTION-AND-LORE.md

CAPA B (stubs, heredados):
CANON.md, MEMORY.md, NARRATIVE.md, RECAP-ENGINE.md,
SCENE-ENGINE.md, CHARACTER-SYSTEM.md, DM-CONTROL-DECK.md,
AI-AGENTS.md, 3D-RENDERER.md, SETTING-INGESTION.md
```

La Capa B fueron los nombres planificados en CONTEXT.md §24.
La Capa A son los archivos que se crearon realmente.
Nunca se reconciliaron.

---

# 1. INCONSISTENCIAS DE NOMBRAMIENTO

## 1.1 Nombres planificados vs reales

CONTEXT.md §24 lista los nombres esperados.
Los archivos reales difieren:

| §24 PLAN | ARCHIVO REAL | ESTADO |
|----------|-------------|--------|
| `CONTEXT.md` | `CONTEXT.md` | ✅ OK |
| `PRODUCT.md` | `PRODUCT.md` | ⚠️ STUB (38 líneas) |
| `DOMAIN.md` | `DOMAIN.md` | ✅ OK |
| `ARCHITECTURE.md` | `ARCHITECTURE.md` | ✅ OK |
| `DATABASE.md` | `DATABASE.md` | ✅ OK |
| `EVENT-SYSTEM.md` | `EVENT-SYSTEM.md` | ✅ OK |
| `CANON.md` | `CANON.md` | ⚠️ STUB (24 líneas) |
| `MEMORY.md` | `MEMORY.md` | ⚠️ STUB (22 líneas) |
| `CONTEXT-BUILDER.md` | ❌ NO EXISTE | ❌ FALTANTE |
| `HISTORICAL-IMPORT.md` | ❌ NO EXISTE | ❌ FALTANTE |
| `RECAP-ENGINE.md` | `RECAP-ENGINE.md` | ⚠️ STUB (23 líneas) |
| `TTS.md` | ❌ NO EXISTE | ❌ FALTANTE |
| `SCENE-ENGINE.md` | `SCENE-ENGINE.md` | ⚠️ STUB (27 líneas) |
| `CHARACTER-SYSTEM.md` | `CHARACTER-SYSTEM.md` | ⚠️ STUB (26 líneas) |
| `DM-CONTROL-DECK.md` | `DM-CONTROL-DECK.md` | ⚠️ STUB (37 líneas) |
| `3D-RENDERER.md` | `3D-RENDERER.md` | ⚠️ STUB (21 líneas) |
| `ASSET-MANAGEMENT.md` | ❌ NO EXISTE | ❌ FALTANTE |
| `AI-AGENTS.md` | `AI-AGENTS.md` | ⚠️ STUB (29 líneas) |
| `SECURITY.md` | `SECURITY.md` | ✅ OK |
| `PERFORMANCE.md` | `PERFORMANCE.md` | ✅ OK |
| `TESTING.md` | `TESTING.md` | ✅ OK |
| `ROADMAP.md` | `ROADMAP.md` | ✅ OK |

## 1.2 Archivos extra (no listados en §24)

Estos archivos existen pero no están en el plan original:

| ARCHIVO | LÍNEAS | CONTENIDO |
|---------|--------|-----------|
| `SESSION-SYSTEM.md` | 2119 | Spec completa |
| `WORLD-STATE.md` | 2220 | Spec completa |
| `DATA-MODEL.md` | 1758 | Spec completa |
| `DATA-DIRECTORY.md` | 1618 | Spec completa |
| `AGENTS-SYSTEM.md` | 1390 | Spec completa |
| `AGENTS.md` | 1445 | Spec completa |
| `DM-CONTROLLER.md` | 1785 | Spec completa |
| `CONTEXT-SYSTEM.md` | 2048 | Spec completa |
| `INGESTION-AND-LORE.md` | 1989 | Spec completa |
| `SETTING-INGESTION.md` | 41 | Stub |

## 1.3 Referencias rotas internas

Archivos que referencian otros docs por nombre incorrecto:

| ORIGEN | REFERENCIA ROTA | REALIDAD |
|--------|----------------|----------|
| RENDERER.md §18 | `SCENES.md` | Debería ser `SCENE-ENGINE.md` o el nombre unificado |
| RENDERER.md §32 | `CHARACTERS.md` | Debería ser `CHARACTER-SYSTEM.md` o el nombre unificado |
| RENDERER.md §90 | `PERFORMANCE.md` | ✅ Correcto |
| ARCHITECTURE.md §28 | `INGESTION-AND-LORE.md`, `AGENTS-SYSTEM.md` | ✅ Correcto |
| CONTEXT.md §24 | Lista 22 docs | 5 no existen, 10 son stubs |
| README.md | Lista docs con nombres inconsistentes | Desactualizado |

---

# 2. DUPLICADOS Y SOLAPAMIENTOS

## 2.1 DM Control (3 archivos)

```text
DM-CONTROL-DECK.md  (stub, 37 líneas)
DM-CONTROLLER.md    (spec completa, 1785 líneas)
DM_CONTROL.md       (referenciado por otros docs)
```

**Problema:** Tres nombres para el mismo concepto.
`DM-CONTROL-DECK.md` y `DM-CONTROLLER.md` coexisten.
Otros docs referencian `DM_CONTROL.md` (con guión bajo) que no existe.

**Decisión necesaria:** Unificar en un solo nombre.

## 2.2 AI/Agents (3 archivos)

```text
AI-AGENTS.md        (stub, 29 líneas)
AGENTS.md           (spec completa, 1445 líneas) — ORFAN
AGENTS-SYSTEM.md    (spec completa, 1390 líneas)
```

**Problema:**
- `AI-AGENTS.md` es el stub original planificado en §24
- `AGENTS-SYSTEM.md` es la spec completa que reemplaza a `AI-AGENTS.md`
- `AGENTS.md` es un documento orfano que no aparece en el README

`AGENTS.md` y `AGENTS-SYSTEM.md` se complementan pero no se reconocen.
`AGENTS.md` cubre TAXONOMÍA (qué agentes existen).
`AGENTS-SYSTEM.md` cubre INTEGRACIÓN (cómo funcionan).

**Decisión necesaria:** Mantener separados o fusionar. Si separados, ambos deben estar en el README.

## 2.3 Renderer (2 archivos)

```text
3D-RENDERER.md  (stub, 21 líneas)
RENDERER.md     (spec completa, 1378 líneas)
```

**Problema:** `3D-RENDERER.md` es el stub planificado. `RENDERER.md` es la spec completa.
`RENDERER.md` es más amplio (cubre 2D, 2.5D, 3D, hybrid).

**Decisión necesaria:** Eliminar `3D-RENDERER.md` o renombrar `RENDERER.md` a `3D-RENDERER.md`.

## 2.4 Canon (2 áreas de definición)

```text
CANON.md                (stub, 24 líneas, define 6 estados)
EVENT-SYSTEM.md         (define lifecycle de eventos con estados diferentes)
```

**Problema:** El canon como concepto se define en `CANON.md` (6 estados) pero el lifecycle de eventos en `EVENT-SYSTEM.md` usa estados diferentes (DETECTED, PROPOSED, APPROVED, CANON, REJECTED, RETCONNED). La relación entre ambos no está documentada.

## 2.5 Memory (2 archivos)

```text
MEMORY.md           (stub, 22 líneas)
CONTEXT-SYSTEM.md   (spec completa, 2048 líneas)
```

**Problema:** `MEMORY.md` es stub. `CONTEXT-SYSTEM.md` es la implementación detallada del sistema de memoria/contexto. El nombre `MEMORY.md` en §24 no coincide con `CONTEXT-SYSTEM.md`.

## 2.6 Narrative (2 áreas)

```text
NARRATIVE.md            (stub, 19 líneas)
+ contenido narrativo   (distribuido en SESSION-SYSTEM, EVENT-SYSTEM, AGENTS)
```

**Problema:** No hay una spec unificada del motor narrativo. El stub existe pero el contenido real está disperso.

## 2.7 Recap (2 áreas)

```text
RECAP-ENGINE.md     (stub, 23 líneas)
SESSION-SYSTEM.md   (contiene secciones extensas sobre recap)
```

**Problema:** El recap se cubre parcialmente en `SESSION-SYSTEM.md` y parcialmente en el stub `RECAP-ENGINE.md`.

## 2.8 Characters (2 áreas)

```text
CHARACTER-SYSTEM.md (stub, 26 líneas)
DOMAIN.md           (define entidades de personajes extensamente)
```

**Problema:** `CHARACTER-SYSTEM.md` es un stub. `DOMAIN.md` define los tipos de dominio de personajes. `CHARACTERS.md` es referenciado por otros docs pero no existe.

---

# 3. INCONSISTENCIAS TERMINOLÓGICAS

## 3.1 TruthStatus vs Canon Status

| DOC | TIPO | VALORES |
|-----|------|---------|
| CANON.md | CanonStatus | CANON, PROPOSED, UNCONFIRMED, CONTRADICTORY, REJECTED, DM_ONLY |
| EVENT-SYSTEM.md | Event Status | DETECTED, PROPOSED, REVIEW, APPROVED, CANON, REJECTED, RETCONNED |
| ARCHITECTURE.md | TruthStatus | confirmed, unconfirmed, rumor, speculation, prophecy, lie, unknown |
| DOMAIN.md | Canon Status | PROPOSED, UNCONFIRMED, CANON, CONTRADICTORY, REJECTED, DM_ONLY |

**Problema:** Cuatro definiciones diferentes del mismo concepto.
`CANON.md` y `DOMAIN.md` coinciden (6 valores).
`ARCHITECTURE.md` usa un tipo TypeScript diferente (7 valores).
`EVENT-SYSTEM.md` tiene su propio lifecycle de eventos (7 valores, parcialmente superpuesto).

**Decisión necesaria:** Definir un solo enum canónico y que todos los docs lo referencien.

## 3.2 Session Status

| DOC | VALORES |
|-----|---------|
| ARCHITECTURE.md | draft, processing, processed, approved |
| DOMAIN.md | DRAFT, IMPORTED, PROCESSING, REVIEW, APPROVED, ARCHIVED |
| SESSION-SYSTEM.md | PLANNED, PREPARING, READY, IN_PROGRESS, PAUSED, ENDING, REVIEW, FINALIZING, COMPLETED, CANCELLED |

**Problema:** Tres definiciones diferentes. `SESSION-SYSTEM.md` es la más completa y detallada.
`ARCHITECTURE.md` usa minúsculas y 4 valores.
`DOMAIN.md` usa mayúsculas y 6 valores.
`SESSION-SYSTEM.md` usa mayúsculas y 10 valores.

## 3.3 Entity/Character Status

| DOC | VALORES |
|-----|---------|
| ARCHITECTURE.md | candidate, active, inactive, dead |
| DOMAIN.md | ALIVE, INJURED, UNCONSCIOUS, DEAD, MISSING, RETIRED, UNKNOWN |

**Problema:** `ARCHITECTURE.md` define status de base de datos.
`DOMAIN.md` define status narrativo.
Son conceptos diferentes con el mismo nombre.

## 3.4 Permission Levels

| DOC | VALORES |
|-----|---------|
| ARCHITECTURE.md | PUBLIC, PLAYER_KNOWN, CHARACTER_KNOWN, DM_ONLY, SECRET, SYSTEM |
| SECURITY.md | PUBLIC, PLAYER, DM, SYSTEM |

**Problema:** `ARCHITECTURE.md` tiene 6 niveles.
`SECURITY.md` tiene 4 niveles.
No está claro cuál es la fuente de verdad.

## 3.5 Event Importance

| DOC | VALORES |
|-----|---------|
| EVENT-SYSTEM.md | TRIVIAL, LOW, MEDIUM, HIGH, CRITICAL |
| DOMAIN.md | Define importance pero con diferentes categorías |

## 3.6 "World State" vs "WorldSnapshot"

`ARCHITECTURE.md` usa `WorldSnapshot` para el estado persistido.
`CONTEXT.md`, `DATABASE.md`, `SESSION-SYSTEM.md`, otros usan `World State`.

Son el mismo concepto o diferentes? No está claro.

## 3.7 Knowledge Scope

Aparece en múltiples docs con diferente profundidad:

```text
CONTEXT.md         — menciona knowledge scoping
DOMAIN.md          — define niveles de conocimiento
CHARACTER-SYSTEM.md — stub, menciona knowledge scope per character
SECURITY.md        — clasificación PUBLIC/PLAYER/DM/SYSTEM
ARCHITECTURE.md    — 6 niveles de permisos
```

Cinco definiciones parciales del mismo concepto.

## 3.8 Session Recap

Aparece en:

```text
SESSION-SYSTEM.md  — definición extensa de recap
RECAP-ENGINE.md    — stub
PRODUCT.md         — menciona recap rápido/completo/cinematic
```

Tres fuentes, una spec completa y dos stubs.

---

# 4. INCONSISTENCIAS DE IDIOMA

| ARCHIVO | IDIOMA |
|---------|--------|
| CONTEXT.md | Español |
| PRODUCT.md | Inglés |
| DOMAIN.md | Español |
| ARCHITECTURE.md | Español |
| DATABASE.md | Español |
| EVENT-SYSTEM.md | Español |
| CANON.md | Inglés |
| MEMORY.md | Inglés |
| NARRATIVE.md | Inglés |
| RECAP-ENGINE.md | Inglés |
| SCENE-ENGINE.md | Inglés |
| CHARACTER-SYSTEM.md | Inglés |
| DM-CONTROL-DECK.md | Inglés |
| AI-AGENTS.md | Inglés |
| AGENTS.md | Español |
| AGENTS-SYSTEM.md | Español |
| CONTEXT-SYSTEM.md | Español |
| INGESTION-AND-LORE.md | Español |
| DM-CONTROLLER.md | Español |
| RENDERER.md | Español |
| PERFORMANCE.md | Español |
| SECURITY.md | Español |
| TESTING.md | Español |
| ROADMAP.md | Español |
| SESSION-SYSTEM.md | Español |
| WORLD-STATE.md | Español |
| DATA-MODEL.md | Español |
| DATA-DIRECTORY.md | Español |

**Decisión necesaria:** Unificar idioma. Recomendado: Español (mayoría).

---

# 5. ARCHIVOS FALTANTES

Según CONTEXT.md §24, deberían existir pero no están:

| NOMBRE PLANIFICADO | EQUIVALENTE REAL | ACCIÓN |
|-------------------|------------------|--------|
| `CONTEXT-BUILDER.md` | Parcialmente cubierto en `CONTEXT-SYSTEM.md` | Decidir: ¿renombrar o crear? |
| `HISTORICAL-IMPORT.md` | Parcialmente cubierto en `INGESTION-AND-LORE.md` | Decidir: ¿renombrar o crear? |
| `TTS.md` | No tiene equivalente | Crear o posponer |
| `ASSET-MANAGEMENT.md` | No tiene equivalente | Crear o posponer |
| `NARRATIVE.md` | Stub existe, contenido disperso | Expandir o fusionar |

---

# 6. STUBS QUE NECESITAN DECISIÓN

10 archivos son stubs (< 50 líneas):

| ARCHIVO | LÍNEAS | CONTENIDO EN OTROS DOCS | DECISIÓN |
|---------|--------|------------------------|----------|
| CANON.md | 24 | Definido en EVENT-SYSTEM, DOMAIN, ARCHITECTURE | Expandir o eliminar |
| MEMORY.md | 22 | Cubierto por CONTEXT-SYSTEM.md | Expandir o eliminar |
| NARRATIVE.md | 19 | Disperso en SESSION-SYSTEM, AGENTS | Expandir o fusionar |
| RECAP-ENGINE.md | 23 | Cubierto en SESSION-SYSTEM.md | Expandir o eliminar |
| SCENE-ENGINE.md | 27 | Cubierto en RENDERER.md, DOMAIN.md | Expandir o eliminar |
| CHARACTER-SYSTEM.md | 26 | Cubierto en DOMAIN.md | Expandir o eliminar |
| DM-CONTROL-DECK.md | 37 | Reemplazado por DM-CONTROLLER.md | Eliminar |
| AI-AGENTS.md | 29 | Reemplazado por AGENTS-SYSTEM.md | Eliminar |
| 3D-RENDERER.md | 21 | Reemplazado por RENDERER.md | Eliminar |
| SETTING-INGESTION.md | 41 | Relacionado con INGESTION-AND-LORE.md | Decidir |

---

# 7. CROSS-REFERENCES ROTOS

Referencias internas que apuntan a archivos inexistentes o con nombre incorrecto:

| ORIGEN | REFERENCIA | PROBLEMA |
|--------|-----------|----------|
| RENDERER.md §18 | `SCENES.md` | No existe. Debería ser nombre unificado |
| RENDERER.md §32 | `CHARACTERS.md` | No existe. Debería ser nombre unificado |
| CONTEXT.md §24 | 5 docs faltantes | Lista planeada no ejecutada |
| README.md | Lista desactualizada | No refleja el estado real |
| Múltiples docs | `DM_CONTROL.md` | No existe. Hay `DM-CONTROLLER.md` |
| Múltiples docs | `EVENTS.md` | No existe. Hay `EVENT-SYSTEM.md` |
| Múltiples docs | `CHARACTERS.md` | No existe. Hay `CHARACTER-SYSTEM.md` |
| Múltiples docs | `SCENES.md` | No existe. Hay `SCENE-ENGINE.md` |

---

# 8. ARQUITECTURAS CONTRADICTORIAS

## 8.1 TypeScript interfaces en ARCHITECTURE.md vs DOMAIN.md

`ARCHITECTURE.md` define interfaces TypeScript con valores que no coinciden
con `DOMAIN.md`:

```text
ARCHITECTURE.md:
  session.status = 'draft' | 'processing' | 'processed' | 'approved'
  entity.status = 'candidate' | 'active' | 'inactive' | 'dead'
  truthStatus = 'confirmed' | 'unconfirmed' | 'rumor' | ...

DOMAIN.md:
  session.status = DRAFT / IMPORTED / PROCESSING / REVIEW / APPROVED / ARCHIVED
  character.status = ALIVE / INJURED / UNCONSCIOUS / DEAD / ...
  canon.status = PROPOSED / UNCONFIRMED / CANON / ...
```

**Problema:** Las interfaces TypeScript de `ARCHITECTURE.md` son anteriores
a las specs completas. Deben actualizarse para reflejar DOMAIN.md y
SESSION-SYSTEM.md.

## 8.2 Permisos de agentes

`ARCHITECTURE.md` define 6 niveles de permiso.
`SECURITY.md` define 4.
`AGENTS-SYSTEM.md` define permisos por agente.
`AGENTS.md` define permisos por categoría.

Ninguno se referencia mutuamente.

---

# 9. PLAN DE CORRECCIÓN

## FASE 1: DECISIONES DE NOMBRAMIENTO (BLOQUEANTE)

Antes de cualquier corrección, definir la estructura canónica:

### Decisión 1.1: Nombre del doc de DM Control

```text
OPCIÓN A: DM-CONTROLLER.md     (actual, spec completa)
OPCIÓN B: DM-CONTROL-DECK.md   (planificado en §24, stub)
OPCIÓN C: DM-CONTROL.md        (referenciado por otros docs)
```

**Recomendación:** `DM-CONTROLLER.md` (ya existe, es completo).

### Decisión 1.2: Nombre del doc de AI/Agents

```text
OPCIÓN A: AGENTS-SYSTEM.md     (actual, spec completa)
OPCIÓN B: AI-AGENTS.md         (planificado en §24, stub)
OPCIÓN C: Mantener ambos       (AGENTS.md como taxonomía, AGENTS-SYSTEM.md como integración)
```

**Recomendación:** `AGENTS-SYSTEM.md` como principal.
`AGENTS.md` mantener como taxonomía complementaria si se actualiza el README.

### Decisión 1.3: Nombre del doc de Renderer

```text
OPCIÓN A: RENDERER.md          (actual, spec completa)
OPCIÓN B: 3D-RENDERER.md       (planificado en §24, stub)
```

**Recomendación:** `RENDERER.md` (más preciso, cubre 2D/2.5D/3D).

### Decisión 1.4: Nombre del doc de Memory

```text
OPCIÓN A: CONTEXT-SYSTEM.md    (actual, spec completa)
OPCIÓN B: MEMORY.md            (planificado en §24, stub)
```

**Recomendación:** `CONTEXT-SYSTEM.md` como principal.
`MEMORY.md` puede eliminarse o redirigir a `CONTEXT-SYSTEM.md`.

### Decisión 1.5: Nombre del doc de Ingestion

```text
OPCIÓN A: INGESTION-AND-LORE.md (actual, spec completa)
OPCIÓN B: HISTORICAL-IMPORT.md  (planificado en §24, no existe)
```

**Recomendación:** `INGESTION-AND-LORE.md`.

### Decisión 1.6: Nombre del doc de Context Builder

```text
OPCIÓN A: CONTEXT-SYSTEM.md    (ya cubre context building)
OPCIÓN B: CONTEXT-BUILDER.md   (planificado en §24, no existe)
```

**Recomendación:** No crear `CONTEXT-BUILDER.md`. El contenido está en `CONTEXT-SYSTEM.md`.

### Decisión 1.7: Con guión o guión bajo?

```text
ACTUAL: EVENT-SYSTEM.md, AGENTS-SYSTEM.md, SESSION-SYSTEM.md
REFERENCIADO: EVENT-SYSTEM.md, DM_CONTROL.md, CHARACTERS.md
```

**Recomendación:** Unificar con guiones medios `-`. Actualizar todas las referencias.

## FASE 2: RESOLVER DUPLICADOS

### Acción 2.1: Eliminar stubs reemplazados

```text
ELIMINADO (redirect a spec completa):
  DM-CONTROL-DECK.md    → DM-CONTROLLER.md           ✅ HECHO
  AI-AGENTS.md          → AGENTS-SYSTEM.md            ✅ HECHO
  3D-RENDERER.md        → RENDERER.md                 ✅ HECHO
  MEMORY.md             → CONTEXT-SYSTEM.md           ✅ HECHO
  NARRATIVE.md          → SESSION-SYSTEM + EVENT-SYSTEM + AGENTS  ✅ HECHO
  RECAP-ENGINE.md       → SESSION-SYSTEM.md §62-70    ✅ HECHO
  SCENE-ENGINE.md       → RENDERER.md + SESSION-SYSTEM.md  ✅ HECHO
  CHARACTER-SYSTEM.md   → DOMAIN.md + DATA-MODEL.md   ✅ HECHO

NO ELIMINAR:
  SETTING-INGESTION.md  → ahora es spec completa (65 secciones)  ✅ HECHO
  CANON.md              → contenido único, ver Acción 2.2
```

### Acción 2.2: Decidir sobre stubs con contenido único

```text
✅ TODOS RESUELTOS:
CANON.md              → eliminado (redirect a DOMAIN.md §41, EVENT-SYSTEM.md §7-13)
MEMORY.md             → eliminado (redirect a CONTEXT-SYSTEM.md)
NARRATIVE.md          → eliminado (redirect a SESSION-SYSTEM + EVENT-SYSTEM + AGENTS)
RECAP-ENGINE.md       → eliminado (redirect a SESSION-SYSTEM.md §62-70)
SCENE-ENGINE.md       → eliminado (redirect a RENDERER.md + SESSION-SYSTEM.md)
CHARACTER-SYSTEM.md   → eliminado (redirect a DOMAIN.md + DATA-MODEL.md)
```

**Recomendación:** Para cada stub, evaluar si el contenido existe en otro doc
completo. Si existe → eliminar el stub y agregar cross-reference.
Si no existe → expandir el stub.

### Acción 2.3: Reconciliar AGENTS.md y AGENTS-SYSTEM.md

```text
AGENTS.md (1445 líneas):
  - Taxonomía de agentes
  - Grafo de dependencias
  - MVP workflow
  - Perfiles de coste

AGENTS-SYSTEM.md (1390 líneas):
  - Contratos INPUT/OUTPUT por agente
  - Agent chaining
  - Delegation patterns
  - Context invalidation
  - Cache strategy
  - Health checks
  - LLM prompting
```

**Opción recomendada:** Mantener ambos.
`AGENTS.md` = "QUÉ agentes existen" (taxonomía)
`AGENTS-SYSTEM.md` = "CÓMO funcionan" (integración)
Actualizar README para incluir ambos.

## FASE 3: UNIFICAR TERMINOLOGÍA

### Acción 3.1: Canon Status — definición única

```text
USAR DOMAIN.md §41 como fuente canónica:
  CanonStatus:
    PROPOSED      — propuesto por IA o sistema
    UNCONFIRMED   — importado, no verificado
    CANON         — confirmado por DM
    CONTRADICTORY — entra en conflicto con canon existente
    REJECTED      — rechazado por DM
    DM_ONLY       — solo visible para DM

✅ HECHO: ARCHITECTURE.md actualizado (TruthStatus → CanonStatus)
Eventos tienen su propio lifecycle (DETECTED → PROPOSED → REVIEW → APPROVED/REJECTED).
Esto es correcto y no conflicta. Documentar la distinción.
```

### Acción 3.2: Session Status — usar SESSION-SYSTEM.md como fuente

```text
Usar los 10 estados de SESSION-SYSTEM.md.
Actualizar ARCHITECTURE.md §TypeScript y DOMAIN.md §Session.
```

### Acción 3.3: Permission Levels — unificar

```text
✅ HECHO: ARCHITECTURE.md actualizado (6 → 4 niveles)
Usar 4 niveles de SECURITY.md para el MVP:
  PUBLIC, PLAYER, DM, SYSTEM

Los 6 niveles de ARCHITECTURE.md pueden quedar como "futuro".
```

### Acción 3.4: Entity Status — distinguir narrativo vs DB

```text
DocumentStatus  — draft, active, archived (para DB)
NarrativeStatus — alive, injured, dead, missing (para narrativa)
```

Nombrar explícitamente para evitar confusión.

## FASE 4: ACTUALIZAR CROSS-REFERENCES

### Acción 4.1: Actualizar CONTEXT.md §24

Reescribir la lista de docs para reflejar la estructura real.

### Acción 4.2: Actualizar README.md

Reescribir el reading order y la lista de completados.

### Acción 4.3: Corregir referencias rotas

```text
✅ HECHO:
RENDERER.md §18: SCENES.md → SESSION-SYSTEM.md
RENDERER.md §32: CHARACTERS.md → DOMAIN.md + DATA-MODEL.md
ARCHITECTURE.md: directorio actualizado con nombres reales

PENDIENTE:
Todas las referencias a DM_CONTROL.md → DM-CONTROLLER.md
Todas las referencias a EVENTS.md → EVENT-SYSTEM.md
```

## FASE 5: UNIFICAR IDIOMA

### Acción 5.1: Traducir stubs en inglés al español

```text
✅ HECHO:
PRODUCT.md → traducido al español
CANON.md → eliminado (redirect)
MEMORY.md → eliminado (redirect)
NARRATIVE.md → eliminado (redirect)
RECAP-ENGINE.md → eliminado (redirect)
SCENE-ENGINE.md → eliminado (redirect)
CHARACTER-SYSTEM.md → eliminado (redirect)
DM-CONTROL-DECK.md → eliminado (redirect)
AI-AGENTS.md → eliminado (redirect)
3D-RENDERER.md → eliminado (redirect)
SETTING-INGESTION.md → ahora spec completa en español
```

## FASE 6: ACTUALIZAR INTERFACES TYPESCRIPT

### Acción 6.1: ARCHITECTURE.md §TypeScript

Revisar y actualizar las interfaces TypeScript para que coincidan con:

```text
DOMAIN.md         — tipos de dominio
SESSION-SYSTEM.md — estados de sesión
EVENT-SYSTEM.md   — lifecycle de eventos
DATABASE.md       — esquemas de tablas
```

## FASE 7: CREAR DOCS FALTANTES (OPCIONAL)

Decidir si crear:

```text
TTS.md              — solo si se implementa TTS pronto
ASSET-MANAGEMENT.md — solo si se necesita spec dedicada
NARRATIVE.md        — expandir si el motor narrativo se implementa pronto
```

## FASE 8: ACTUALIZAR README

Reescribir completamente:

```text
Reading order
Completed docs
Pending docs
Status tracking
```

---

# 10. PRIORIDAD DE EJECUCIÓN

```text
HITO 1 (BLOQUEANTE):
  1.1  Elegir nombres canónicos para cada doc
  1.2  Eliminar stubs reemplazados
  1.3  Actualizar CONTEXT.md §24

HITO 2 (CRÍTICO):
  2.1  Unificar CanonStatus en todos los docs
  2.2  Unificar SessionStatus en todos los docs
  2.3  Actualizar interfaces TypeScript en ARCHITECTURE.md

HITO 3 (IMPORTANTE):
  3.1  Corregir todas las referencias rotas
  3.2  Resolver duplicados de DM Control, AI, Renderer
  3.3  Reconciliar AGENTS.md y AGENTS-SYSTEM.md

HITO 4 (MENOR):
  4.1  Unificar idioma
  4.2  Actualizar README.md
  4.3  Decidir sobre docs faltantes

HITO 5 (POSTERIOR):
  5.1  Expandir stubs que mantengan contenido único
  5.2  Crear docs nuevos si se necesita
```

---

# 11. IMPACTO POR DOC

Cuántos otros docs dependen de /referencian a cada doc:

| DOC | REFERENCIADO POR | IMPACTO DE CAMBIO |
|-----|-----------------|-------------------|
| CONTEXT.md | Todos | ALTO |
| DOMAIN.md | ARCHITECTURE, DATABASE, EVENT-SYSTEM | ALTO |
| EVENT-SYSTEM.md | SESSION-SYSTEM, TESTING, SECURITY | ALTO |
| SESSION-SYSTEM.md | TESTING, DM-CONTROLLER, RENDERER | ALTO |
| ARCHITECTURE.md | Pocos (es descriptivo) | BAJO |
| DATABASE.md | ARCHITECTURE, DATA-MODEL | MEDIO |
| SECURITY.md | TESTING, AGENTS-SYSTEM | MEDIO |
| PERFORMANCE.md | RENDERER, TESTING | BAJO |
| RENDERER.md | DM-CONTROLLER | BAJO |
| AGENTS-SYSTEM.md | TESTING, SECURITY | MEDIO |
| WORLD-STATE.md | SESSION-SYSTEM, EVENT-SYSTEM | MEDIO |
| DATA-MODEL.md | DATABASE | BAJO |
| DATA-DIRECTORY.md | DATABASE | BAJO |
| INGESTION-AND-LORE.md | ARCHITECTURE | BAJO |
| CONTEXT-SYSTEM.md | ARCHITECTURE | BAJO |

---

# 12. ERRORES QUE NO DETECTÉ

Este barrido cubrió:

```text
✅ Nombres de archivo
✅ Contenido de cada archivo
✅ Referencias cruzadas
✅ Terminología
✅ Idioma
✅ Duplicados
✅ Stubs vs specs
✅ Consistencia de enums/states
```

**Limitaciones del barrido:**

```text
⚠️ No verifiqué coherencia semántica profunda entre docs de 1000+ líneas
⚠️ No verifiqué que los diagramas ASCII sean consistentes entre docs
⚠️ No verifiqué que los ejemplos JSON/code entre docs usen los mismos campos
⚠️ No verifiqué que el orden de secciones sea consistente entre docs
⚠️ No verifiqué que cada concepto definido en DOMAIN.md aparezca en el doc correspondiente
```

Estas verificaciones requerirían un segundo paso más profundo después
de resolver las inconsistencias estructurales de este plan.

---

# 13. NOTA FINAL

La documentación base es **sólida en concepto** pero **fractura en ejecución**.

El problema no es que los documentos estén mal escritos.
El problema es que se crearon en dos oleadas sin reconciliación:

```text
OLEADA 1 (stubs originales):
  CONTEXT.md §24 → 22 nombres planificados
  Se crearon 10 stubs con esos nombres

OLEADA 2 (specs completas):
  Se crearon 19 specs con nombres diferentes
  Contenido más rico y detallado
  Nunca se actualizaron los stubs ni el plan
```

Hasta que esto se resuelva, cualquier agente de programación que
lea la documentación encontrará contradicciones que generan
dudas sobre cuál es la fuente de verdad.

Esa ambigüedad es el mayor riesgo técnico del proyecto en este momento.
