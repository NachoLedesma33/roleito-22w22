# Plan — Percepción del jugador: visión, luz y niebla de guerra

> **Estado**: plan aprobado para implementación. Reemplaza el item "F1/F6" de `ROADMAP.md` PHASE F, que hoy promete cosas que el código no hace.
> **Origen**: el cierre del plan de modularización dejó anotado que "la visión por token que el DM configura nunca llega al jugador". Al investigarlo aparecieron tres cosas más grandes que ese bug. Este documento las ordena y decide.
> **Fecha**: 2026-10-17.

---

## 1. El problema, medido

Hay **cuatro mecanismos** que decidien qué ve un jugador. Ninguno fue diseñado junto a los otros: se acumularon.

| # | Mecanismo | Dónde | Qué hace hoy |
|---|---|---|---|
| 1 | **Disco de LoS** | `losRaycast.ts` + worker | Recorta por muros y puertas el disco de `vision_range`. Se convierte en un `FogRegion` con `revealed: true`. **Es lo que te deja ver.** |
| 2 | **Polígonos de luz** | `playerVision.ts:28-49` | Cada luz genera un polígono con falloff, recortado por oclusores. Se **suma** a la visión: un farol ilumina más allá del rango del personaje. |
| 3 | **Círculo ambiente** | `playerVision.ts:6,66-73` | Radio `0.15` alrededor del token, solo si el personaje no lleva luz. Parche para el jugador a oscuras. |
| 4 | **Niebla manual del DM** | `fogMask.ts`, `FogOverlay.tsx` | El DM pinta niebla con pincel/rect o toggle de zona, con un flag `revealed`. |

Los tres primeros se **unen** y producen `FogRegion` con `zIndex: 1000`. El cuarto produce `zIndex: 0`.

### 1.1 El hallazgo que reencuadra todo

`FogOverlay.paintMask` (`FogOverlay.tsx:25-44`) es un **algoritmo de pintor sobre canvas**: llena todo de niebla y luego, en orden de `zIndex` ascendente, cada región o perfora un agujero (`revealed: true` → `destination-out`) o repinta niebla (`revealed: false` → `source-over`).

Como toda la visión va a `zIndex: 1000` y la niebla del DM a `zIndex: 0`:

> **La niebla del DM nunca oculta nada a los jugadores.** La visión perfora siempre encima. Lo que el jugador ve es exactamente la unión de 1+2+3; la niebla manual solo tapa lo que ya estaba tapado.

Los e2e `F2`/`F3`/`F4` verifican persistencia, roundtrip y toggle — que el dato viaje, no que bloquee. Por eso nadie lo notó.

### 1.2 Los otros tres

- **`vision_type` no lo lee nadie.** El DM configura 5 tipos por token (`DmDashboard:3129-3176`), persisten (`models.py:302-303`), y el join **no los serializa** (`routes.py:1117-1137`). El jugador siempre cae al default (`PlayerView:355-356`).
- **`dimRange` es dato muerto.** `PlayerView:367` lo calcula; `computeVisibilityMask` (`losRaycast.ts:139-169`) solo usa `range`, `angle` y `direction`. Ningún consumidor.
- **`ROADMAP.md:2345` (E10) está desfasado**: dice que el jugador sin luz ve "el círculo mínimo (0.05)" y que `computeVisionRegions` es la visión; hoy el código tiene `AMBIENT_RADIUS = 0.15` y además el disco de LoS, que E10 no menciona porque se agregó después (F4/F6).

**No hay bug puntual: falta la regla.** Por eso un "fix rápido" del transporte no converge a nada.

---

## 2. Decisión: qué percibe un jugador

```
visible(celda) = sin_obstruccion(celda) Y ( hay_luz(celda) O ve_en_oscuridad(celda) )
```

- **`sin_obstruccion`**: muros, puertas cerradas y zonas la bloquean. Ya existe (LoS).
- **`hay_luz`**:_mask de luz_ por celda = suma de falloff de cada luz que la alcanza, recortada por oclusores. **Reemplaza** los polígonos de luz para el jugador: acumula varias luces y permite atenuación.
- **`ve_en_oscuridad`**: la celda está a menos de `vision_range` del personaje y su tipo de visión se lo permite.

### Semántica por tipo

| `vision_type` | `ve_en_oscuridad` | Nota |
|---|---|---|
| `normal` | solo con luz tenue por encima del umbral | El "círculo ambiente" es el caso límite: luz a distancia 0. Se conserva como `range` pequeño explícito, no como parche. |
| `darkvision` | siempre, hasta `vision_range` | El único tipo nuevo que se implementa. |
| `blindsight`, `tremorsense`, `truesight` | **no se implementan** | Ver §6. |

**Por qué esta regla y no la inversa** (luz que no te alcanza a ver): una antorcha iluminando una pared a 25 m no significa que la veas si estás a oscuras y a 30 m. La luz describe el mundo; la visión describe al personaje. Se cruzan.

**Efecto secundario buscado**: bajo esta regla la mecánica de "pedir luz al DM" (`LightRequest`, ya shippeada con panel, toasts y endpoints) por fin sirve para algo. Hoy es inútil: el jugador ya ve su disco entero a oscuras.

---

## 3. Decisión: qué puede hacer el DM con la niebla

La pregunta era "quién gana cuando la visión topa con la niebla del DM". La respuesta honesta: **no es una elección binaria global, son tres intenciones distintas del DM**, y cada una tiene su modo. No hay bandera global.

| Modo del pincel | Intención del DM | ¿Gana a la luz? | ¿Gana a la percepción? | Cómo se ve |
|---|---|---|---|---|
| **Cubrir** (default) | "Esta zona está en penumbra" | No | No | El jugador ve lo que su personaje percibe; la luz sigue revelando |
| **Secreto** | "El jugador **no** ve esto, aunque lo tenga iluminado" | — | **Sí** | La zona queda negra para el jugador sea cual sea su visión |
| **Revelar** | "El jugador ve esto, esté o no iluminado" | **Sí** | **Sí** | La zona se ve siempre (p. ej. proyección mágica) |

**Modo por defecto de la herramienta**: el brush y el rect ya tienen `revealed` como booleano (`DmDashboard:507,534`). Pasarlo a los tres modos es evolucionar un control que ya existe, no agregar uno nuevo: **el mismo botón, tres modos**, y recuerda el último usado.

**Por qué no una preferencia global "modo de niebla de la campaña"**: sería una bandera más que multiplica combinaciones con las tres, y ningún DM la necesita: la elección es por trazo y es contextual ("acá quiero secreto, acá solo penumbra").

**Por qué el default es "Cubrir"**: es el comportamiento actual (no hay regresión) y el que menos surprising para el jugador.

---

## 4. Arquitectura del cambio

### 4.1 Una sola máscara, no cuatro geometrías

Hoy la visión del jugador se compone de polígonos que compiten por `zIndex`. Eso ya es un agujero: la niebla del DM pierde por número mágico. El plan reemplaza la composición por **un cálculo único en el worker**:

```
worker: items + posición del personaje + visión
  → grid de celdas con alpha 0..1 (intensidad de visión)
  → incluye: LoS, mask de luz, niebla del DM (cubrir/secreto/revelar)
  → baja a 512×N (misma resolución que el canvas actual) y lo manda
FogOverlay: pinta la niebla con ese alpha como textura
```

- **Una pasada, una fuente de verdad.** Se termina la carrera de `zIndex`.
- **La atenuación sale gratis**: `dimRange` por fin se usa (celdas con luz entre 0 y el umbral se ven atenuadas, no negras) — `LIGHTING-SYSTEM.md:336-348` ya define esta curva.
- **Reutiliza la infra existente**: `FogOverlay` ya pinta sobre `HTMLCanvasElement` y lo sube como `CanvasTexture` (`FogOverlay.tsx:56-70`). No hay trabajo 3D nuevo.
- El jugador deja de depender de `computeVisionRegions` para su propia visión (ese queda para las luces que ve *de otros*, que es un caso distinto).

### 4.2 Qué se cae

- Los polígonos de luz del jugador (`lightToVisionRegion`) dejan de sumar visión; pasan a alimentar el mask de luz. Se quedan si hacen falta para el DM.
- El `zIndex: 1000` como mecanismo de prioridad.

### 4.3 Qué no se toca

- El DM sigue viendo todo (no hay niebla para el DM).
- La colisión, el LoS de aliados para el DM, `computePartyLoS`.
- **La memoria de lo explorado es opt-in** (paso 6): el default sigue siendo recalcular desde cero, como hoy (decisión de E10).

---

## 4bis. Decisiones tomadas (cierran las preguntas abiertas de §7)

**1. Umbral de "hay luz": 25% fijo, sin slider.** Un personaje `normal` necesita ≥ 25% de intensidad; `darkvision` 0%. Sale de la curva de `LIGHTING-SYSTEM.md:336-348`. No se expone control: si al probar se siente mal, se agrega — un slider que nadie pidió es una bandera que después nadie usa.

**2. El círculo ambiente se queda en 0.15.** Bajo la regla nueva es redundante (es "luz a distancia 0"), pero **no se toca** a propósito: deja el paso 3 comprobable con una frase —"un personaje `normal` a oscuras ve exactamente lo mismo que antes (el 0.15) y el resto negro"— sin meter un segundo cambio de comportamiento en el mismo commit.

**3. La memoria de lo explorado es una opción del DM, por escena.** Se implementa en el paso 6 y no bloquea nada del 1 al 5.

| Aspecto | Decisión | Por qué |
|---|---|---|
| Dónde se decide | **El DM, por escena** (`Scene.remember_explored`, default `0`) | Es política de mesa: el DM la enciende cuando quiere, como cuando quiere |
| Dónde viven los datos | **En el cliente**, `localStorage` por `(campaign_id, scene_id)` | Es estado del *espectador*, no del mundo. Si fuera al backend, haría falta una tabla + decidir de quién es la memoria (¿del personaje? ¿del jugador? ¿de la party?) y cómo viaja por WS. Local-first es la identidad del producto |
| Formato | RLE de la máscara acumulada | La niebla es mayormente ceros con manchas: RLE pesa cientos de bytes, un PNG base64Kb |
| Semántica | `visible = actual ∪ recordada`, mientras la política esté activa | Al apagar la política, se deja de acumular (lo ya acumulado no se borra) |
| Interacción con **secreto** | **Secreto gana siempre** | Si no, "secreto" se filtra en cuanto el jugador pasa una vez. Es la única precedencia que no se negocia |
| Interacción con **revelar** | Revelar es memoria por definición | No necesita accumulates |
| Multi-dispositivo | **No se sincroniza** (queda local del navegador) | Un jugador que cambia de dispositivo pierde lo explorado. Aceptado en v1; el día que el DM quiera ver "qué descubrió la party" hace falta llevarlo al backend, y eso es un paso aparte (§6) |

---

## 5. Pasos

Cada paso es un commit con CI verde. Los tests van **antes** de la implementación en el paso 2 y 3.

| # | Paso | Entrega | Verificación |
|---|---|---|---|
| 0 | **Este plan** | Semántica decidida y documentada | `docs.sync check` |
| 1 | **Transporte** — HECHO | `vision_type`/`vision_range` en el join (`routes.py`) + `JoinData`/`PlayerSceneToken` (los tipos ya los tenían: faltaba el backend) | pytest `test_player_snapshot_includes_token_vision` + e2e `PV13` |
| 2 | **Mask de luz** (test primero) | `lib/lightMask.ts`: `lightLevelAt(x, z, lights, occluders)` con la curva de `LIGHTING-SYSTEM.md` | vitest: caída con la distancia, `dimRange`, recorte por muro, suma de dos luces |
| 3 | **Composición** (test primero) | `lib/playerPerception.ts`: `visible = sin_obstruccion AND (luz OR ve_en_oscuridad)`, + roles de niebla del DM | vitest: normal en oscuro ve solo ambiente, darkvision ve su rango, secreto tapa lo iluminado, revelar muestra lo oscuro |
| 4 | **Worker + render** | El worker devuelve el alpha; `FogOverlay` lo pinta | vitest del roundtrip del grid + e2e de que la niebla del DM **sí** oculta (el caso que hoy no pasa) |
| 5 | **UI + docs** | Pincel/rect con 3 modos; dropdown de visión solo con `normal`/`darkvision`; E10 y PHASE F reescritos | e2e del flujo DM + lint/typecheck |
| 6 | **Memoria de lo explorado** (opt-in) | `Scene.remember_explored` (migración + snapshot), toggle del DM por escena, acumulación RLE en `localStorage`, `visible = actual ∪ recordada` con **secreto ganando siempre** | vitest de la acumulación y de la precedencia secreto>memoria; e2e del toggle del DM y de que volver a entrar conserva lo explorado |

### Registro

- **Paso 1 (HECHO)**: el join ya serializa `vision_type`/`vision_range` y hay pytest + e2e que lo cubren. Efecto colateral **visible desde este commit**: `PlayerView` ya leía `sc.vision_type ?? 'normal'` / `sc.vision_range ?? 6`, así que el disco de LoS del jugador pasa a respetar el rango que configuró el DM (antes siempre 6). El tipo todavía no cambia ninguna regla de percepción — eso es el paso 3.

### Riesgos y caminos de aborto

- **Performance**: la máscara es O(celdas × luces). Mitigaciones por orden: resolución 256 con upscale, y corte temprano por luz lejana. **Se mide en el paso 2** (benchmark en `lightMask.spec.ts` con 10 luces y un mapa de 1200×800). Si no entra, se baja resolución; si tampoco, se cae a polígonos binarios a menor resolución (el camino de aborto es el estado actual con el `zIndex` arreglado, no una degradación a medias).
- **El cambio se ve**: los jugadores van a ver menos que antes (correcto, pero es un cambio de comportamiento). Por eso el paso 5 incluye docs y el commit dice explícitamente qué cambia.
- **Regresión en e2e**: `fog.spec` y `player-view` asumen el modelo viejo; se actualizan en el mismo commit del paso 4.

---

## 6. Lo que NO entra (y por qué)

- **`blindsight`, `tremorsense`, `truesight`**: no son "más luz". Son **filtros de percepción por tipo de entidad** ("veo solo criaturas", "siento females que tiemblan"). El mask actual es `boolean[][]`: no sabe qué hay en cada celda. Implementarlos requiere que cada celda lleve qué entidades hay y un filtro — otro sistema, sin diseño hecho. No se prometen ni se exponen en la UI hasta que existan.
- **Exploración recordada** (lo que Roll20 llama " explored"): el modelo actual recalcula desde cero y no persiste. Es una feature aparte con su propio storage.
- **Luz que revela para el DM**: el DM ve todo, no aplica.

## 7. Preguntas abiertas → RESUELTAS

Las tres quedaron decididas y documentadas en §4bis:

1. **Umbral de "hay luz"** → 25% fijo para `normal`, 0% para `darkvision`, sin slider.
2. **Círculo ambiente** → se queda en **0.15**, sin tocar, para que el paso 3 sea comprobable contra el comportamiento actual.
3. **Memoria de lo explorado** → **opt-in por escena,decided por el DM** (`Scene.remember_explored`), con los datos en el cliente. Se implementa en el **paso 6** y no bloquea los pasos 1-5.

Lo que sigue abierto no bloquea la implementación:

- **Qué pasa si el DM cambia la política con memoria ya acumulada**: la accumulated no se borra al apagar la política (§4bis dice que se deja de acumular). Si preferís que se limpie, es una línea.
- **Umbral 25%**: si al probar se siente mal, se ajusta. Es un número en un solo lugar.

---

## 8. Trazabilidad

- Hallazgos verificados en código: `FogOverlay.tsx:25-44` (pintor por zIndex), `losSystem.ts:143`, `playerVision.ts:48,71` (zIndex 1000), `DmDashboard.tsx:507,534`, `fogMask.ts:91` (zIndex 0), `routes.py:1117-1137` (join sin visión), `PlayerView.tsx:355-367`, `losRaycast.ts:139-169` (sin `dimRange`), `playerVision.ts:6` (`AMBIENT_RADIUS = 0.15`), `ROADMAP.md:2345` (E10 desfasado).
- Documentos que este plan reemplaza/actualiza: `ROADMAP.md` PHASE F (F1, F6, E10), `LIGHTING-SYSTEM.md` (dejo de ser aspiracional: la curva se implementa), `FOG-OF-WAR.md` (el modelo de `vision_range` pasa a ser el real).
- Deuda del plan de modularización que esto cierra: el punto 1 de su §6 ("visión por token que nunca llega al jugador") — y de paso el que nadie había anotado: la niebla del DM no ocultaba a nadie.