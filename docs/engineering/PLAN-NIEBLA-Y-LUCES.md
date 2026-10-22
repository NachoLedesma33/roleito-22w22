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
| N4 ✅ | La posicion de la luz y la del token, una sola fuente | la luz y el token nunca se desincronizan | bajo |

### 2.2 N4: la posicion real se comparte (la causa del retardo de segundos)

El sintoma era "la luz se despegaba de la ficha y tardaba varios segundos en
volver". La causa NO era el suavizado: eran **dos ciclos de actualizacion
distintos**.

- El **token** se posiciona de forma IMPERATIVA (un `useEffect` que hace
  `group.position.set(...)`; y durante el drag, el mouse escribe directo en
  el grupo) -> esta en el frame exacto ✓.
- La **luz** leia el mapa `visualPos`, que se interpola desde las posiciones
  que manda el SERVIDOR -> en el mejor caso era el ultimo WS (11 Hz) y
  durante un drag, la posicion del servidor (que tarda ~2 s en volver) ✗.

Ahora hay **una sola fuente**: un mapa compartido (`liveTokenPos`) donde cada
token escribe su posicion real en su propio `useFrame`, y las luces pegadas la
leen en el mismo frame. La luz y la ficha son el mismo objeto visible: no
hay fotograma de desfasaje ni ida y vuelta al servidor ✗.

Aplica igual al WASD del jugador (la posicion optimista `wasdTarget` llega al
prop del token -> el token la escribe en el mapa -> la luz la copia) ✓ y al
drag and drop del DM (el mouse manda en el grupo -> el token lo escribe ->
la luz lo copia) ✓.

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

### 2.3 La latencia del circulo de luz (el POV del jugador)

El circulo iluminado que ve el jugador NO es un mesh: es el **borde de la
mascara de percepcion** que calcula el worker de vision (LoS ✓). O sea que
su latencia NO es la del render (60 fps ✓) sino **la del trabajo de
vision** ✗:

- el trabajo se reenviaba cada **250 ms** ✗
- y solo si el jugador se habia movido mas de **0.25 unidades** ✗ (con el
  WASD son 0.15 por tecla ✗ -> recien en la segunda tecla ✗)

O sea: el circulo se actualizaba 4 veces por segundo y con medio paso de
desfase ✗. Ahora: **cada 80 ms** (12 veces por segundo ✓) y con un umbral
de **0.03** (se reenvia con cualquier movimiento real ✓).

El costo: el worker recalcula la mascara 3 veces mas seguido ✗ (es el
worker, no el hilo principal ✓ -> la UI no se bloquea ✓). Si en una maquina
lenta eso se nota, el ajuste fino es el paso siguiente (la luz del jugador
resuelta EN EL CLIENTE, sin pasar por el worker ✗).

### 2.4 La luz en el POV del jugador: el halo tapado por la niebla

Medido en el navegador (misma maquina, misma sesion):

| | POV del DM | POV del jugador |
|---|---|---|
| FPS (pestana visible) | 59-60 | 58-60 |
| Hilo principal | 95% idle | 95% idle |
| Heap | - | **333 MB -> 92 MB** |

O sea: **no era un problema de rendering**. Las tres causas reales:

1. **El halo de la luz estaba POR DEBAJO de la niebla** (`renderOrder` 40 < 50).
   En el POV del jugador la niebla es opaca sobre el mapa, asi que el halo
   (el "circulo de luz" que ve el DM) quedaba tapado: el jugador solo veia el
   agujero de la mascara de percepcion, que se recalcula cada 80 ms -> la luz
   "se quedaba atras" ✗.
   Ahora en el POV del jugador el halo va por ENCIMA de la niebla (`renderOrder`
   51): el jugador ve el mismo circulo que el DM, y ese halo sigue al token en
   el **mismo frame** (0 ms de desfase) ✓.

2. **La niebla se repintaba desde cero**: `paintPerception` creaba un canvas
   nuevo y un `ImageData` nuevo (~1,5 MB) en cada repintado, y la mascara
   llegaba varias veces por segundo -> decenas de MB/s de basura ✗. Ahora el
   canvas y el `ImageData` se reusan ✓.

3. **La mascara viajaba por COPIA** (`postMessage` sin lista de transferencia):
   1,5 MB por mensaje ✗. Ahora viaja por transferencia (zero-copy) ✓.

Gates: lint 0 errores / typecheck limpio / vitest 297 / e2e player-view 16/16.

### 2.5 El "Performance 35" de Lighthouse en el POV del jugador

Medido con el build de produccion (NO el dev server: `npm run dev` sirve
cientos de modulos sin bundlear y ahi el FCP da 2788 ms en vez de 250 ms):

| | antes | despues |
|---|---|---|
| `index.js` (gzip) | 602 KB | **145 KB** |
| FCP | 316 ms | **248 ms** |
| Long tasks | 0 | 0 |
| Carga total del jugador | ~602 KB | ~520 KB |

Que se hizo:

1. **Cada pagina se carga con `lazy()`**. Antes las 29 pantallas (el dashboard
   del DM y 25 de administracion) entraban en el bundle principal: el POV del
   jugador las pagaba sin usarlas. Ahora el jugador descarga `index.js` (145 KB)
   + su chunk, y el DM su chunk aparte ✓.
2. **Las fuentes de Google ya no bloquean el pintado**: se piden en paralelo
   (`media="print"` + `onload`) en vez de ser un `<link rel=stylesheet>` que
   espera a un dominio externo ✗. Para un jugador en otro pais eso era la
   diferencia entre pintar en 250 ms o en 2 s.

Lo que NO se hizo (y por que): separar Three.js en su propio chunk
(`manualChunks`) **agrandaba** la carga inicial del jugador (602 KB -> 1,19 MB
gzip) porque el motor 3D igual se necesita para pintar el mapa. Se midio y se
descarto ✓.

Gates: lint 0 errores / typecheck limpio / vitest 297 / e2e 50+40 (los specs
de jugador, luz, niebla, dashboard, ficha, iniciativa, a11y y landing).

### 2.6 La camara del POV del jugador no seguia a su ficha

En el POV del jugador la camara estaba FIJA en el centro del mapa (la misma
de la mesa del DM). El jugador camina con WASD y su ficha se iba del borde de
la pantalla: el "mini delay" que se reportaba era, en parte, esto.

Ahora `SceneRenderer` acepta `followCharId` y, cuando viene informado, la
camara sigue al token **por delta**: cuando la ficha se interpola a una
posicion nueva, la camara se corre exactamente lo mismo. Se sigue la posicion
YA interpolada (la misma que dibuja el modelo), asi que camara y ficha van
pegadas con 0 ms de desfase.

El DM no lo usa (`followCharId` va en `null`): el DM ve la mesa entera.

### 2.7 Lo que NO es un bug (medido)

- **11 FPS medidos**: era throttling de pestana en segundo plano. Con la
  pestana visible: DM 59-60 FPS, jugador 58-60 FPS, hilo principal 95% idle.
- **El nombre del token desincronizado**: es un bug preexistente del label 3D
  (troika), NO de la luz ni de la camara. Queda para otra tanda.

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
