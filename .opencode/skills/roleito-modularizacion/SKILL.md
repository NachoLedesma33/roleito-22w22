---
name: roleito-modularizacion
description: OBLIGATORIA al escribir, modificar o refactorizar cualquier código de Roleito (frontend apps/dm, backend, core). Aplica la directiva transversal de ingeniería y el plan de fases. Usar en CUALQUIER tarea que toque código, no solo refactors — incluye features nuevas, bugfixes y cambios de UI. Antes de commitear, ejecuta el gate de verificación.
---

# Modularización y calidad de código — Roleito

Directiva transversal. Aplica a **toda** tarea que toque código: feature nueva, bugfix,
refactor, cambio de UI. No es opcional y no aplica solo a "refactors".

## Documentos que rigen (leer antes de escribir código)

1. `docs/ROLEITO_GUIA_MODULARIZACION_ARQUITECTURA.md` — directiva completa.
2. `docs/engineering/DIAGNOSTICO-Y-PLAN-MODULARIZACION.md` — diagnóstico P1-P9 + fases.
3. `AGENTS.md` (repo) — stack, invariantes, gotchas.
4. `docs/CONTEXT.md` + la doc de la feature afectada.

## Principios no negociables

- **Sin abstracciones prematuras.** Preferí duplicación pequeña y explícita antes que un
  helper genérico lleno de flags. No crees capas ceremoniales (repository vacío sobre ORM,
  facade que reenvía, abstracción especulativa para variantes hipotéticas).
- **Sin reescrituras masivas.** Extraé **una** responsabilidad por vez, en commits
  separados. Cada commit debe quedar verificable y con comportamiento preservado.
- **No dividas por número de líneas.** Un componente largo puede ser cohesivo; uno corto
  puede estar mal diseñado. Extraé cuando las responsabilidades cambien por motivos
  distintos, se repita estructura existente, o el estado sea difícil de seguir.
- **Seguí los patrones del repo.** Tokens CSS (`var(--bg-primary)`), `components/ui/` para
  primitivas, `lib/api.ts` para el cliente HTTP y DTOs, `@core/domain/types` para tipos de
  escena, `HudPanel` para paneles, i18n con `t(key, 'Default')`. No introduzcas un patrón
  paralelo.
- **Tipos explícitos.** `unknown` sobre `any`. Evitá casts que oculten errores y duplicados
  de tipos. Si dos módulos declaran el mismo tipo, unificá contra `api.ts`, no contra
  `@core/domain/types` si el esquema difiere (ojo: `@core` anida `vida_attributes`,
  la API no — forzar unificación rompe código).

## Regla de oro para UI y e2e

Si tocás **texto visible** o el **nombre accesible** de un control, grepeá `tests/e2e/` y
actualizá los locators en el **mismo commit**.

Un SVG (icono lucide) **no aporta texto** al DOM: `getByRole({ name })` matchea por
**substring del nombre accesible**, no por texto crudo. Reales que costaron 3 CI rojos:

- `🏆 100 gp` → `100 gp` (quest Q1)
- `← Volver a la lista` → `Volver a la lista` (notebook NB4)

## Gate antes de commitear (en este orden)

```bash
npm run lint                              # 0 errores
npm run typecheck                         # limpio
npm run test --workspace=apps/dm          # vitest verde
# si tocaste backend:
cd backend; ..\venv\Scripts\python.exe -m pytest
# si tocaste UI (siempre que el cambio pueda romper locators):
npx playwright test tests/e2e/<spec-afectado>.spec.ts
```

Reglas:
- **No declares pruebas exitosas si no las ejecutaste.** Si no pudiste correr algo, decilo.
- Si tocaste UI, corré **el spec específico** de esa pantalla, no solo la suite completa.
- No subas a `main` con el CI rojo. Antes de re-runear, reproducí el spec local: si el
  código está mal, el re-run solo gasta tiempo.

## Plan de fases (no te saltees el orden)

`0 staticUrl ×8` → `1 tipos duplicados` → `9 limpieza .gitkeep` → `2-5 front` →
`6-7 back` → `10 tests`

- No arranques una fase sin que la anterior esté commiteada y con CI verde.
- Cada fase = 1 commit + CI verde + actualización de la doc de la feature.
- **Fase 8 (`wall_detection` módulo vs paquete) es de riesgo alto**: requiere aprobación
  explícita del usuario.

## Al terminar un cambio, informá

1. Qué problema se resolvió y por qué esa decisión.
2. Qué archivos/contratos cambiaron.
3. Qué comandos ejecutaste y **resultados reales**.
4. Qué deuda queda y qué sigue.

## Anti-patrones (prohibidos por la guía)

God component sin divisions · prop drilling innecesario · context/store global para todo ·
flags booleanos que multiplican combinaciones · mega `utils.ts` · abstracción especulativa ·
repository vacío · event bus omnipresente · duplicación de fuentes de verdad · tipos
genéricos excesivos · refactor cosmético masivo · migraciones disruptivas · comentarios que
esconden mal diseño · manejo de errores silencioso · optimización prematura.