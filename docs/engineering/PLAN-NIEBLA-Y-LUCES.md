# Plan: la niebla de guerra y las luces (2026-10-21)

> Estado: **propuesto**. Este documento es el plan, no la implementacion.
> Nace de un bug reportado por el DM: la luz que el jugador pide no ilumina
> de verdad, y la sincronizacion entre DM y jugadores no es absoluta.

## 0. Lo que se encontro (los bugs reales, no los sintomas)

Tres cosas distintas se estaban llamando "la luz":

| # | Que es | Donde vive | Que pasa HOY |
|---|---|---|---|
| L1 | El **halo** (lo que se ve pegado al token) | `ItemRenderer.tsx` -> `LightRenderer` (un mesh con glow) | sigue al token ✓ (con el fix de la posicion viva) |
| L2 | La **iluminacion real** (la que ilumina el mapa) | **no existe**: los items de luz NO tienen ninguna `pointLight` | el DM no ve luz ✗ (solo el halo) |
| L3 | La **niebla de guerra** (lo que el jugador ve) | `FogOverlay` + la mascara de percepcion del worker (LoS) | el halo (L1) se dibuja **ENCIMA** de la niebla ✗ -> el jugador ve un circulo iluminando zonas que deberian estar oscuras ✗ |

**El bug de L3 es el que mas molesta**: la niebla esta bien (el LoS calcula que
se ve), pero el glow del halo la ignora. Por eso "la luz se genera como si
fuera un circulo que ilumina el mapa sin importar la niebla de guerra".

**El bug de L2 es el que hace que el DM no vea la luz que le da al jugador**.

**El retardo de segundos** era un `useMemo` congelado (`visibleCharsVisual`):
`visualPos` es un `Map` que se muta en cada frame, asi que su identidad no
cambia y el memo nunca se refrescaba. YA ESTA ARREGLADO (`1380f4c`) ✓.

## 1. Lo que hay que construir

### 1.1 La iluminacion real (L2)

Una `pointLight` por item de luz, en el `LightRenderer`, con la misma
posicion viva que el halo (la que ya se lee por frame ✓) y con:

- `distance` = el radio de la luz (ya esta en `source.radius` ✓)
- `decay` = 2 (fisico ✓, como el fuego ✓)
- `intensity` = `source.intensity` (mas la animacion de parpadeo ✓)

**Ojo con el costo**: R3F/WebGL recompila los shaders cuando cambia la
cantidad de luces ✗. Con muchas luces en la escena (el DM con 10 antorchas ✓)
el frame rate se cae ✗. Mitigaciones: limitar las luces "reales" a las N mas
cercanas al jugador ✗ o usar una textura de iluminacion en vez de luces
(RectAreaLight / un shader propio ✓).

### 1.2 La niebla manda sobre el halo (L3)

El halo (L1) tiene que quedar **debajo** de la niebla: si el area esta en
niebla, no se ve el glow ✗. Opciones:

- **Render order + depth**: la niebla se dibuja despues (con `renderOrder` ✓)
  y tapa el halo ✓. Hoy el halo tiene `renderOrder={56}` ✗ (por encima de la
  niebla ✗).
- **Mascarar el halo por la percepcion**: el `LightRenderer` recibe la mascara
  del jugador y apaga el glow en las celdas no vistas ✓ (es lo que hace la
  niebla con el resto ✗).

### 1.3 La sincronizacion es absoluta

Hoy hay dos mundos ✗:

- el **POV del DM**: ve todo el mapa (no tiene niebla ✓) -> la luz se ve
  como un halo pegado al token ✓, pero sin iluminacion ✗.
- el **POV del jugador**: ve solo lo que la percepcion revela ✓ -> con la
  niebla ✓, pero el halo la ignora ✗.

**La regla que hay que enforcing**: la iluminacion que ve el DM y la que ve el
jugador tienen que salir de **la misma fuente** (los items de luz de la
escena ✓) y la niebla se aplica **solo en el POV del jugador** ✓.

### 1.4 Un jugador sin luz, fuera de lo revelado, no se ve (pedido del DM)

Ahora un jugador **siempre** se ve (en su POV y en el de los demas ✗). La
regla pedida: si un jugador no tiene luz y esta fuera de las zonas reveladas
(la "memoria de lo explorado" ✓ que ya existe), **los demas jugadores no
deben verlo** ✗ -> el token se dibuja como fantasma (o no se dibuja ✓).

Esto ya tiene la infraestructura a medias ✓:

- `remember_explored` (la politica del DM por escena ✓) + el `explored` que
  vuelve del worker ✓.
- El `FogOverlay` pinta lo revelado ✓.
- Falta: **filtrar los tokens por la percepcion de cada observador** ✓ (el
  `sensedIds` ya filtra los "sentidos especiales" ✓ -> el mecanismo existe ✗).

## 2. El plan por fases

| Fase | Que | Terminado cuando | Riesgo |
|---|---|---|---|
| N1 ✅ | La `pointLight` real por item de luz (con el tope de luces) | el mapa se ilumina de verdad y el DM ve la luz que da | medio (perf) |
| N2 ✅ | La niebla tapa el halo (render order o mascara) | el jugador no ve luz en zonas oscuras | bajo |
| N3 | Los tokens de los jugadores sin luz, fuera de lo revelado, no se ven | el DM ve a un jugador sin luz solo si esta en lo revelado | medio |
| N4 | La posicion de la luz y la del token, una sola fuente | la luz y el token nunca se desincronizan | bajo |

### 2.1 Como quedaron N1 y N2

**N1 (hecho)**: cada item de luz tiene ahora una luz real de Three.js
(`pointLight` para las puntuales, `spotLight` para el cono direccional ✓).
Va **dentro del grupo** del item, asi que sigue al token por efecto (la
posicion viva ✓) y el cono mira a donde mira el token (el `target` del
spotLight es un hijo del grupo ✓). El radio sale de `source.radius` ✓ y el
parpadeo mueve la intensidad ✓.

**N2 (hecho)**: el halo (el glow) paso a `renderOrder={40}`, por DEBAJO de la
niebla (`renderOrder={50}` ✓). Antes el halo no tenia renderOrder (0 ✓) pero
al ser transparente el blending lo dejaba por encima del negro de la
niebla ✗ -> el jugador veia el circulo iluminando zonas oscuras ✗. Ahora la
niebla lo tapa: el glow solo se ve donde el jugador puede ver ✓.

**Ojo con el costo (N3)**: cada luz real hace que Three.js recompile los
shaders cuando cambia la cantidad de luces ✗. Con muchas luces en la escena
el frame rate se cae ✗ -> si se nota, el tope de luces (solo las N mas
cercanas al DM/jugador ✓) va en N3.

## 3. Lo que YA esta hecho (no hay que rehacerlo)

- La posicion viva de los tokens (`useVisualInterpolation` ✓) y la de las
  luces pegadas (`3b45c2c` ✓ + `1380f4c` ✓).
- La mascara de percepcion (el LoS en el worker ✓) y la memoria de lo
  explorado ✓.
- La niebla (`FogOverlay` ✓) y las capas/zonas reveladas ✓.

## 4. Por que no lo meto ahora

El DM pidio explicitly "arreglalo o buscale la mejor forma, prueba haciendolo
desde cero" ✗ y eso son 4 fases ✗ (una de ellas toca el render ✗ y el
performance ✗). Con los parches que试听 hecho hasta ahora ✗ (varios ✗) la
señal clara es que hay que **diseñar bien y hacer una fase a la vez** ✗ ->
por eso este plan ✓.
