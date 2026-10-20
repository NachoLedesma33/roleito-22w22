---
name: roleito-docsync
description: OBLIGATORIA al cerrar o cambiar algo importante en Roleito — feature/fase cerrada, bugfix relevante, decisión de producto o arquitectura, cambio de comportamiento/contrato o de idea. Antes de commitear, actualiza la documentación afectada para que ningún doc quede afirmando algo desactualizado. Checklist de qué docs tocar y verificación final.
---

# Doc sync — Roleito

Regla: **cada cambio importante cierra con sus docs al día**. Un doc que afirma algo
falso cuesta más tiempo que el cambio mismo. Lección pagada: el roadmap de "visión por
token" quedó listado como PENDIENTE meses después de estar resuelto en `51b790c`,
porque el doc diagnóstico no se actualizó al cerrar el plan.

## Cuándo aplica

- Cerrás una feature, fase o issue.
- Cambiás comportamiento visible o un contrato (API, snapshot del jugador, tipos, schema).
- Tomás o revocás una decisión de producto/arquitectura.
- Descubrís que un doc ya no refleja el código (aunque el cambio no sea tuyo).

## Checklist (tocá solo lo que el cambio afecte)

1. **Doc de la feature** — si existe (`docs/<FEATURE>.md` o
   `docs/engineering/PLAN-*.md`), marcá los pasos/secciones como HECHO/RESUELTO con el
   commit. No borres el texto histórico: tachá y anotá la resolución.
2. `docs/IMPLEMENTATION-STATUS.md` — estado maestro de la feature.
3. `docs/ROADMAP.md` — item del bloque E tocado.
4. `docs/engineering/DIAGNOSTICO-Y-PLAN-MODULARIZACION.md` — las secciones
   "PENDIENTE"/"NO arreglado"/"Deuda" del área que tocaste.
5. `AGENTS.md` (raíz) — solo si cambia stack, comandos, gotchas o invariantes.
6. `~/.config/opencode/memory.md` — roadmap y Active Work (UTF-8 BOM; editar vía Python,
   nunca con herramientas que rompan el BOM).

## Reglas

- **Verificá en código antes de "arreglar" un doc.** Si doc y código difieren, el código
  manda — pero confirmá con grep/lectura, no de memoria. (Premisa falsa de doc ya costó
  dos veces: no planear sobre afirmaciones sin verificar.)
- Marcá lo resuelto como RESUELTO + commit; no lo borres (el doc es registro histórico).
- No dejes afirmaciones en presente de un estado viejo ("el join no los serializa" cuando
  ya lo serializa).
- Nunca declares docs actualizados sin haberlos leído y editado.

## Verificación final

```powershell
venv\Scripts\python.exe scripts\check-docs-consistency.py
```

Debe cerrar sin errores nuevos. Commiteá los docs junto al cambio que los motivó, o en un
commit `docs:` propio si el cambio ya estaba commiteado.
