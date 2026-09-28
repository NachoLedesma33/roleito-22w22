# Condiciones y Auras — Plan de implementación

> Estado: COMPLETO — Fase A ✓ (60342dd), Fase B ✓ (f466262), Fase C ✓ (108f05c). **Rework visual `6253474` (pendiente): auras geométricas (anillos/llama) y esferas badge REEMPLAZADAS por iconos emoji flotantes sobre el token, chip con color característico de cada marca.**
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

**Rework iconos (decisiones post-C):**
- **Nada geométrico**: anillos concéntricos, arcos giratorios y llama-cono ELIMINADOS. usuario: "no quiero formas geométricas, quiero iconos correspondientes arriba del personaje".
- **StatusIconMarkers** (reemplaza StatusAura + TokenStatusBadges): fila de chips circulares billboardeados sobre el token (ancla `topY`: altura real del modelo 3D medida por Box3 en TokenModel (`onHeight` → Character3D) multiplicada por tokenScale y +6%, sprite → 1.3·tokenScale; separación `0.52·tokenScale`, radio `0.22·tokenScale`), cada chip con el color característico de la marca + emoji del icono (`STATUS_ICONS` en statusMarkers). Máx 5 visibles (slice).**Anclaje a modelo real**: TokenModel reporta `box.max.y - box.min.y` vía prop `onHeight`; Character3D guarda en estado `modelH` y calcula `topY` — iconos/partículas quedan a la altura de la cabeza aunque el modelo sea alto (ej: Ignatus).
- Icons: Ciego 🙈, Ardiendo 🔥, Sangrando 🩸, Envenenado ☠️, Concentrando 🧘, Aturdido 💫, Derribado 🛌, Restringido ⛓️, Invisible 👻.
- `STATUS_CONFIG` (aura/anim/intensity/spinArc/spinDir) ELIMINADA — statusMarkers queda `{id, label, color, icon}`.
- Invisible intacto: opacity 0.25 modelo + chip 👻 visible (indicador).

**Partículas características (commit `6dedce7`+1):** cada marca anima con partículas fijas al token/modelo (hijos del group del Character3D → siguen al token). Todo dimensionado por tokenScale, nunca absoluto.
- **Sangrando**: gotitas rojas brotan del icono (y≈1.28·scale), caen pocos px (vy −0.16·scale/s), vida ~0.7s, fade sin llegar al suelo.
- **Ardiendo**: 3 capas aditivas (blending Additive): núcleo amarillo #fde047 (8, rápido), medio ámbar #fbbf24 (12), exterior naranja #f97316 (10, lento) — superposición = glow de fuego real.
- **Aturdido**: además de las 4 ⭐, dos anillos torus elípticos #eab308 (color del icono) que se tambalean (rotation.x oscila ±0.55, escala x/z elíptica contrafase, rotación y propia) alrededor de la cabeza.
- **Envenenado**: 8 puff verdes expandiéndose (sin(π·age)) alrededor del cuerpo, deriva lenta.
- **Concentrando**: 10 motas azules alrededor de la cabeza, suben con twinkle.
- **Aturdido**: 4 estrellas ⭐ billboardeadas orbitando la cabeza (radio 0.18·scale, y = topY − 0.08·scale, 2.2 rad/s).
- **Restringido**: 4 cadenas de eslabones torus (metal #94a3b8) en esquinas del token, del cuerpo al suelo con sway. **v2: eslabones convergen todos a un punto central a la mitad de la altura del modelo (0.5·scale) — quaternion setFromUnitVectors(eje Z torus → dirección base→centro) + sag parabólico; eslabón maestro torus #64748b en el punto de unión. v3: eslabones ELÍPTICOS** — torus con scale local `[1.6,1,1]` (elongados tipo eslabón real), alternando 90° por eslabón (`(l % 2) · π/2`) para que se toquen/entrelacen como cadena; 5 eslabones por cadena, tube 0.019·scale.
- **Derribado**: 3 "z" blancas ascendiendo en cascada con fade.
- **Ciego**: 6 wisps grises lentos alrededor de la cabeza (alpha 0.55).
- **Invisible**: 12 destellos violetas parpadeando (twinkle cuadrado) alrededor del cuerpo translúcido.
- **Motor**: `ParticleField` genérico = instancedMesh pool (1 draw call por campo), respawn automático, fade por escala. Sin gate de perf (ops triviales).

### Fase C — Polish ✓ (commit pendiente)
8. Config por condición: mostrar solo badge / badge+aura / aura+animación, intensidad.
9. Test: extender `tests/e2e/status.spec.ts` (marcar via API, assert snapshot en players).
10. ADR corto en `docs/adr/` si la semántica invisible lo amerita.

**Decisiones tomadas en C:** *(config geométrica — SUPERSEDIDA por rework iconos, ver abajo; apply: config por condición = editar statusMarkers, cero cambios en renderer, sigue vigente)*
- **Config en `statusMarkers.ts`** (STATUS_CONFIG derivada de STATUS_OPTIONS): campos `aura` ('ring'|'flame'|'none'), `anim` ('pulse'|'spin'|'none'), `intensity`, `spinArc` (rad), `spinDir`. StatusAura consume la config — agrego una condición nueva = editar statusMarkers, cero cambios en renderer.
- Valores por condición: burning=flame; bleeding=pulse; concentrating=spin lento (arc 5.2, dir −1, intensity 0.33); stunned=spin rápido (arc 2.6, intensity 1.4); resto estático ring.
- **ADR NO escrito**: semántica invisible ya documentada en este doc (Fase B) — el ADR no aporta; se evita ruido.
- **e2e S3**: marca `['bleeding','invisible']` via PUT directo (spread del GET + statuses) → snapshot invitación contiene ambos. Complementa S1 (UI toggle) y S2 (snapshot).

## Riesgos
- **Perf 3D**: muchas auras animadas → decidido en Fase B: sin gate por ahora (ops triviales); re-activar si fps cae con muchos tokens.
- **conflicto invisible vs luz/fog**: token invisible sigue afectado por iluminación (no es "etéreo" salvo que se pida).
- **Drag/drop y aura**: aura en grupo hijo no interfiere con raycasting del token (pointer-events en el mesh del modelo, aura con `raycast` deshabilitado).

## No incluido (fuera de alcance por ahora)
- Condiciones con duración/timer automático.
- Effects mecánicos (ventaja/desventaja en tiradas).
- Auras radiales de área (efecto "campo" sobre otros tokens).