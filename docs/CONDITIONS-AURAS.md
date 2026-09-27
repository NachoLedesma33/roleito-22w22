# Condiciones y Auras — Plan de implementación

> Estado: EN IMPLEMENTACIÓN — Fase A ✓ (60342dd) y Fase B ✓ (commit pendiente). Pendiente Fase C (config + e2e).
> Relación con rumbo normal: pendiente de aprobación; no bloquea otras fases.

## Objetivo

Que una ficha/token muestre sus condiciones (sangrado, envenenado, aturdido,
ciego, ardiendo, invisible, etc.) de forma legible en el VTT:

1. **Marca sobre la ficha**: badges con color característico (ficha 3D + HUD de jugador + ficha de personaje).
2. **Aura sobre el modelo**: halo/anillo de color sobre el token en el renderer 3D.
3. **Invisible**: la ficha se vuelve (semi)transparente.
4. **Animación** que respeta SIEMPRE el `token_scale` del personaje (escala 1:1, sin deformar).

## Estado actual (ya existe — NO se rehace)

- **Backend listo**: `scene_characters.statuses_json` (`# ["poisoned", "concentrating", ...]`); el snapshot ya devuelve `statuses`. `backend/tests/test_api.py:197` y `tests/e2e/status.spec.ts` ya lo cubren.
- **API lista**: `updateCharacters` acepta `statuses[]` (`apps/dm/src/lib/api.ts:740`).
- **Toggle en UI listo**: context menu del token → "Marcar/Quitar {Condición}" (`DmDashboard.tsx:1485-1492`, `handleToggleStatus`).
- **Catálogo listo**: `apps/dm/src/lib/statusMarkers.ts` — 8 condiciones con label ES + color:
  Ciego `#9ca3af`, Ardiendo `#f97316`, Sangrando `#ef4444`, Envenenado `#22c55e`,
  Concentrando `#3b82f6`, Aturdido `#eab308`, Derribado `#a855f7`, Restringido `#06b6d4`.
- **Render 3D básico**: `SceneRenderer.tsx:680-699` `TokenStatusBadges` — esferitas flotantes
  sobre la cabeza (ya escala por `tokenScale`, pero solo 3D dots, sin aura, sin animación).

## Lo que falta (alcance del plan)

| # | Falta | Dónde |
|---|-------|-------|
| 1 | Aura de color sobre el token (anillo/halo) | `SceneRenderer` — nuevo componente `StatusAura` |
| 2 | Badges de condiciones en HUD de jugador / ficha | `PlayerView.tsx`, `CharacterSheet.tsx` |
| 3 | Condición `invisible` (semi-transparencia) | `statusMarkers.ts` + renderer (opacity) |
| 4 | Animaciones por condición (pulso, giro, llama) | `SceneRenderer` — nueva capa animada |
| 5 | Definir semántica `invisible` vs toggle 👁 existente | docs + statusMarkers |

## Decisiones de diseño

### Semántica invisible
- `visible` del scene_char (toggle 👁 "Ocultar a los jugadores") = presencia: el jugador NO ve el token.
- Nueva condición `invisible` = visual: el modelo se dibuja semi-transparente (opacity ~0.25) para TODOS, incluso el DM. Ambas combinables.

### Aura
- Un `mesh` anillo plano (ring geometry) + halo opcional, hijo del MISMO `<group>` que el modelo, en `y ≈ 0.05..0.15` (peana).
- Radio base `0.55 * tokenScale`; color = `STATUS_COLORS[status]`.
- Multi-estado: anillos concéntricos si hay varias condiciones activas (máx 3 visibles, resto solo en badge).
- `renderOrder` alto + `depthWrite={false}` para no tapar al modelo.

### Animaciones (respeta escala al 100%)
- **Regla dura**: toda dimensión/posición/velocidad animada = `f(estado, tokenScale)`; NUNCA constantes absolutas.
  Ejemplos:
  - Pulso de sangrado: radio = `(0.55 + 0.08·sin(t·3)) · tokenScale`, opacity `0.35 + 0.15·sin(t·6)`.
  - Ardiendo: partículas/llama con tamaño `0.15·tokenScale` y offset `0.9·tokenScale` sobre el centro.
  - Aturdido/Concentrando: anillo giratorio con radio fijo `0.6·tokenScale` (rotación no deforma tamaño).
- Implementación: `useFrame` en `StatusAura`; refs por token; `requestAnimationFrame` ya lo da R3F.
- Umbral perf: única animación por condición activa, barata (1-2 meshes por condición). `PlayerView POLL_MS=16` NO tocar.

### Invisible (rendering)
- `TokenSprite`: `opacity` del material sprite.
- `TokenModel` (gltf): `traverse` materiales → `transparent=true, opacity=0.25, depthWrite=false`.
- DM: función "revelar invisible" (toggle rápido) para no perder el token — opcional, Fase C.

## Fases (1 commit por fase, "ir de a poco")

### Fase A — Aura estática + badges en fichas ✓ (60342dd)
1. `statusMarkers.ts`: + `invisible` (color `#a1a1aa` o violeta) → 9 condiciones.
2. `SceneRenderer.tsx`: componente `StatusAura` (anillo estático multi-estado, escala por `tokenScale`).
3. `CharacterSheet.tsx` + `PlayerView.tsx`: fila de badges con color + tooltip label.
4. Verificación: typecheck, vitest (si aplica), pytest (`status.spec` ya cubre API), e2e status offline→online visual.

### Fase B — Animaciones + invisible ✓
5. `StatusAura` animado: pulso (sangrado), giro (aturdido/concentrando), llama (ardiendo).
6. Condición `invisible`: opacity en sprite/gltf; semántica del toggle 👁 documentada.
7. Verificación: perf con N tokens (objetivo: sin caída de fps con 20 tokens animados), typecheck, e2e snapshot.

**Decisiones tomadas en B:**
- **Perf gate NO aplicado**: animación = 1 `useFrame` por aura, ≤4 meshes por token (anillos concéntricos + llama). Con 20 tokens ≈ 80 meshes livianos — trivial para GPU. Si aparece caída de fps ACUMULADA, re-activar gate (">10 tokens con status → solo badge").
- **Spin**: anillo con arco — `stunned` 2.6 rad girando rápido (2.1 rad/s), `concentrating` 5.2 rad lento (0.7 rad/s, dirección inversa). Arco completo para el resto (rotación invisible → estático).
- **Llama (ardiendo)**: cono `#f97316` flotando a `0.9·tokenScale`, flicker de escala (1±0.18) + bobbing (0.05·tokenScale). NO anillo para `burning` (evita clutter); flame + badge.
- **Invisible**: `opacity 0.25` + `depthWrite false` en materiales sprite y gltf (traverse); badges y aura SE MANTIENEN visibles (es el indicador de que está invisible). Toggle 👁 = presencia (server-side), condición = visual. Combinables.

### Fase C — Polish (solo si pide el DM)
8. Config por condición: mostrar solo badge / badge+aura / aura+animación, intensidad.
9. Test: extender `tests/e2e/status.spec.ts` (marcar via API, assert snapshot en players).
10. ADR corto en `docs/adr/` si la semántica invisible lo amerita.

## Riesgos
- **Perf 3D**: muchas auras animadas → decidido en Fase B: sin gate por ahora (ops triviales); re-activar si fps cae con muchos tokens.
- **conflicto invisible vs luz/fog**: token invisible sigue afectado por iluminación (no es "etéreo" salvo que se pida).
- **Drag/drop y aura**: aura en grupo hijo no interfiere con raycasting del token (pointer-events en el mesh del modelo, aura con `raycast` deshabilitado).

## No incluido (fuera de alcance por ahora)
- Condiciones con duración/timer automático.
- Effects mecánicos (ventaja/desventaja en tiradas).
- Auras radiales de área (efecto "campo" sobre otros tokens).