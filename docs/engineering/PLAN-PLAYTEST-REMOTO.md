# Plan: jugar la campaña desde casas y ciudades distintas

> Estado: **propuesto** (2026-10-21). Decisión de Approaches: el DM juega en su casa con
> amigos en otras casas (y a veces en otras ciudades). No hay red local común: hace falta
> exponer el juego a internet por un **túnel**.

Este documento es el plan, no la implementación. La parte de código que ya está
hecha y se leverages está en §2.

---

## 0. Las decisiones (DM, 2026-10-21)

| Decisión | Qué significa |
|---|---|
| **Link fijo** | Un dominio propio (ej. `mesa.midominio.com`) con un **túnel nombrado**: el mismo URL para siempre. Se pega **una vez** en el grupo de Discord y los jugadores le hacen clic a ese link. |
| **Todo local** | La app corre en la compu del DM (o en la de quien haga el fork). **Nada en la nube**: ni la campaña, ni la base, ni el backend. El túnel solo publica el frontend. |
| **El DM siempre levanta el servidor** | Antes de la partida: un comando (que abre backend + estáticos + túnel). Los demás solo hacen clic en el link. |
| **VPS: NO (por ahora)** | Ver §1.1: la VPS gana después, no antes. |

### 1.1 ¿Es mejor una VPS que la compu del DM?

**Respuesta corta: para el primer playtest, no.** Para el segundo, sí.

| | **Local en la compu del DM** (lo elegido) | **VPS** (Hetzner CX22 ~€4/mes) |
|---|---|---|
| Costo | **€0** | ~€4/mes (o $4-12 en DigitalOcean) |
| La campaña y la base | **En tu disco** ✓ (privacidad) | En el disco de la VPS → hay que **backupear** (la campaña es lo valioso ✗) |
| Si el DM apaga la compu | El juego se cae ✗ (el túnel queda sin origen) | **Sigue andando** ✓ (el link funciona siempre) |
| Si el DM viaja | Hay que levantaarlo en otro lado ✗ | Sigue ✓ |
| Latencia del DM | 0 (local) ✓ | La del DM a la VPS (si el DM está en otro país, sus acciones tardan ✗) |
| Latencia de los jugadores | El tráfico va al edge → al DM (doble salto) | Edge → VPS (un salto) ✓ marginalmente mejor |
| HTTPS | Lo da el túnel ✓ | Caddy + Let's Encrypt (un componente más) |
| El túnel | **Hace falta** ✓ | **No hace falta** (la VPS tiene IP pública) → menos una pieza que se puede caer |
| Mantenimiento | Actualizar con `git pull` ✓ | Actualizar con `git pull` **en la VPS** (por SSH) ✗ |
| Si algo se rompe | Lo arreglás en el momento, con la consola a mano ✓ | Tenés que entrar por SSH ✗ (y si la VPS se cae, no hay nadie) |

**El veredicto**: la VPS es mejor **para la mesa que se juega todas las semanas** (la
campaña siempre disponible, el DM puede apagar la compu, el link nunca cae). Para
un **primer playtest** es gastar €4/mes ySUMAR mantenimiento (SSH, backups,
actualizaciones) para resolver un problema que no tenés todavía: el de que el DM
se quede sin compu.

**El momento de migrar** (cuando se cumpla esto):
1. Ya jugaste 2-3 partidas y el flujo del túnel te quedó corto.
2. Las partidas son regulares (una por semana) → el link tiene que estar vivo siempre.
3. El DM viaja o no puede garantizar la compu encendida.
4. Hay backups automáticos de la campaña (la VPS + un snapshot diario).

**Lo que NO cambia al migrar**: el túnel, el link, el proxy, la superficie con
roles. La app es la misma; solo cambia dónde corre. Por eso el orden sano es
**primero local (P0-P3) y después, si hace falta, la VPS** (que es un `docker
compose up` en otro lado).

---

## 1. Por qué el planteo LAN quedó atrás

La primera versión del invite resolvía el caso "todos en la misma wifi" (§ el
menú de invitación muestra la IP de la LAN). Con jugadores en **casas y
ciudades distintas** eso no sirve: la IP privada de la casa del DM no es
alcanzable desde afuera.

La solución estándar es un **túnel** (reverse tunnel): un proceso en la máquina
del DM abre una conexión **saliente** a un servicio público y ese servicio
publica un URL HTTPS que reenvía el tráfico al proceso local. El jugador entra
por ese URL desde donde esté.

> Los **Dev Tunnels de VS Code** que mencionás son exactamente esto: el mismo
> servicio que usa el "Forward a Port" de VS Code, pero con la CLI `devtunnel`
>standalone (sin necesidad de tener VS Code abierto).

---

## 2. Lo que YA está listo (no hay que tocarlo)

| Pieza | Dónde | Por qué importa acá |
|---|---|---|
| Menú de invitación con los links | `components/InviteMenu.tsx` | El link que se manda es el del **túnel**, no la IP de la LAN. |
| `GET /api/network/ips` (solo DM) | `backend/routes.py` | Sirve para el caso LAN y para el diagnóstico. |
| **El backend no se expone**: solo el frontend | `apps/dm/vite.config.ts` (proxy `/api` + `ws: true`) | El túnel apunta **al frontend**, que hace de proxy hacia el backend local. El backend nunca queda en internet. |
| Las escrituras son del DM | `require_dm` en toda la superficie | Un túnel es una URL pública: sin esto, cualquiera que tuviera el link podría reescribir la campaña. **Esto ya está cerrado** (B5c + partes 1 y 2). |
| El jugador conserva su superficie | usos, dados, pedir luz, mover el token, sus notas | Los jugadores no necesitan rol (van sin token). |
| Sync por **WebSocket** primero | `lib/usePlayerSync.ts` | El push de las revisiones no es polling: es lo que hace que la latencia no se sienta. |
| Poll con backoff 250 ms → 2 s | `lib/usePlayerSync.ts` | Si el WS no abre, el poll se **desacelera solo**: no se queda martilleando el túnel. |
| La LoS se calcula en el **worker** | `pages/PlayerView.tsx` | Cero red para la línea de visión (el cálculo es local del jugador). |
| El snapshot se pide solo cuando la **revisión** cambia | `lib/usePlayerSync.ts` | No se baja el snapshot entero en cada tick. |

---

## 3. La anatomía del tráfico (medida del código, 2026-10-21)

Lo que realmente viaja por el túnel si el jugador está en otra ciudad:

| Flujo | Frecuencia por jugador | Tamaño | Nota |
|---|---|---|---|
| Sync del mundo (WS `/api/ws/invite/{code}`) | push | eventos chicos | **El canal principal** ✅ |
| Poll de revisión (fallback, sin WS) | 250 ms → 2 s (backoff) | ~1 KB | Solo si el WS no abre |
| Snapshot (`GET /invite/{code}`) | solo cuando cambia la revisión | **~47 KB** | El dato pesado: se pide por evento de revisión, no en bucle |
| Tiradas (`GET /rolls/recent`) | 1 por segundo | chico | Es un poll fijo (no tiene backoff) |
| Mover el token | por evento del jugador | chico | POST, no un stream continuo |
| La LoS | **0 red** | — | Va en un Web Worker |

**Conclusión 1 (rendimiento)**: el tráfico es **chico y sporadic** (≈1–5 req/s por
jugador). Ningún túnel se rompe con eso. Los límites de los servicios gratis
los mata el **snapshot de 47 KB** y, sobre todo, la **carga inicial**.

**Conclusión 2 (el cuello de botella real)**: el **dev server de vite** sirve
cientos de módulos ES sueltos (sin bundlear). Un jugador en otra ciudad
pide cientos de archivos: la primera carga por un túnel sería de **minutos**.
Por eso el playtest remoto **no puede ir con `npm run dev`**: tiene que ir con
un **build de producción** servido estáticamente.

---

## 4. Las opciones (estado 2026-10-21, con números)

| Opción | Costo | URL | Latencia | Límites que duelen | Setup | Veredicto |
|---|---|---|---|---|---|---|
| **Cloudflare Tunnel** (quick) | $0 | `algo.trycloudflare.com` **cambia en cada corrida** | baja (edge global) | sin cuenta; sin límite de ancho de banda; **100 MB por request** (irrelevante) | `cloudflared tunnel --url http://localhost:5173` (un binario) | ✅ **el más simple para una partida** |
| **Cloudflare Tunnel** (nombrado) | $0 (+ un dominio propio) | fija, tipo `mesa.ritoclaro.com` | baja | igual que el quick | cuenta + DNS | ✅ mejor si se juega seguido |
| **Tailscale Funnel** | $0 (personal) | fija `maquina.tailnet.ts.net` | media (el tráfico va a los servidores de Tailscale y de ahí al jugador) | Funnel sigue en beta; puertos 443/8443/10000 | cliente Tailscale + cuenta | ⚠️ estable pero más pasos y menosredos que Cloudflare |
| **VS Code Dev Tunnels** / CLI `devtunnel` | $0 (cuenta GitHub/Microsoft) | fija `puerto-hash.devtunnels.ms` | media | **privada por defecto**: hay que ponerla *pública*; sin firewall ni puertos | instalar la CLI o usar el panel de Ports | ⚠️ lo que ya conocés, pero con un paso extra de visibilidad pública |
| **ngrok** (free) | $0 | efímera | media | **1 GB/mes y 20.000 requests/mes** (una partida de 3 h con 4 jugadores lo revienta) + **página de intersticial** al visitante | cuenta | ❌ descartado por los cuotas y el aviso |
| **Playit / localhost.run / bore** | $0 | efímera | variable | menos Maduras, sin garantías | varies | ❌ no para una partida |

**Criterio (el que pesa)**: el jugador tiene que **entrar con un link y que
funcione**. Todo lo que agregue un paso de cuenta o una advertencia en la
pantalla del jugador se paga en la mesa.

---

## 5. La recomendación

**Opción: Cloudflare Tunnel *nombrado* (el link fijo que se pega en Discord).**

Se crea desde el dashboard de Cloudflare (Zero Trust → Networking →
Tunnels → Create → "Published application"): se elige un subdominio del
dominio propio y el origen `http://localhost:5173`. El plan free alcanza; el
túnel sale por el 7844 (no hay que abrir puertos) ✓.

Si todavía no hay dominio, el modo *quick* (`cloudflared tunnel --url
http://localhost:5173`) sirve para una partida de prueba: da un
`algo.trycloudflare.com` que cambia en cada corrida.

```bash
# 1) el build de producción (OBLIGATORIO para remoto: ver §3)
npm run build --workspace=apps/dm

# 2) el frontend estático + el proxy al backend
npm run serve:prod          # (nuevo, §8.1)

# 3) el túnel
cloudflared tunnel --url http://localhost:5173
#    -> https<algo>.trycloudflare.com
```

Por qué esta y no otra:

- **Cero cuentas y cero fricción** para el DM: un binario, un comando, un HTTPS.
- **Sin cuotas de requests** (el límite de ngrok es lo que mata una partida).
- **HTTPS de verdad** (el navegador no muestra "no seguro").
- **El backend no se expone**: el túnel apunta al frontend, que proxea `/api` y
  el WebSocket al backend local (`ws: true` ya está en la config).
- El **URL efímero** es el costo: el link cambia por partida. Para el DM es
  trivial (lo copia y lo manda de nuevo). Si molesta, un túnel nombrado con un
  dominio propio (Cloudflare free + un dominio) lo arregla.

**Plan B si el túnel se cae a mitad de partida**: la app ya tiene el poll de
revisión con backoff (§2) → si el WS se cae, los jugadores siguen viendo los
cambios (con hasta 2 s de retraso) ✓. Y el DM puede reabrir el túnel y mandar
el link nuevo por el chat de la mesa ✓. **Esto no requiere código** ✓.

**Lo que NO recomiendo**: Tailscale Funnel o Dev Tunnels como primera opción:
exigen instalar cliente, cuenta y (en Dev Tunnels) cambiar la visibilidad a
pública — tres pasos extra para algo que `cloudflared` hace en uno.

---

## 6. La arquitectura de la sesión remota

```
jugador (otra ciudad)          maquina del DM
  navegador                      ┌──────────────────────────────┐
     │  HTTPS                    │  tunel (saliente)             │
     ▼                           │      │                       │
┌──────────┐  (edge publico)    │      ▼                       │
│  CDN/edge│────────────────────►│  servidor estatico :5173    │
└──────────┘                    │      │  proxy /api + /ws      │
                                │      ▼                       │
                                │  backend :8000 (127.0.0.1)   │
                                └──────────────────────────────┘
```

- **Lo público**: el frontend (bundles, assets, mapa, audio) + el proxy `/api`.
- **Lo que no sale nunca de la máquina del DM**: el backend y la base SQLite
  ✓ (`data/roleito.db`).
- **El DM** juega desde `localhost` (sin túnel) → sus requests no pasan por
  internet ✓.

---

## 7. Seguridad

**Lo que ya está resuelto** (y es la mitad del trabajo):

- Toda **escritura** de la campaña exige rol DM (401 sin token, 403 con token
  de jugador) ✓. Un link público ya no es una puerta al backend ✓.
- El jugador **no tiene token** y su superficie es mínima y de solo lectura +
  sus propias acciones ✓.
- El **código del invite** es un token de un solo uso por campaña (se genera
  con `secrets` ✓) → sin él no hay campaña ✓.

**Lo que falta y hay que hacer antes de jugar con un link público**:

| # | Riesgo | Mitigación | Costo |
|---|---|---|---|
| S1 | Alguien que se entera del link entra a la campaña y ve el lore | El link se manda por un canal privado (WhatsApp de la mesa) y **se regenera al terminar la partida** (`POST /invite-code` genera uno nuevo ✓). **Con el link fijo (`/join`) esto cambia**: el código es resoluble por cualquiera que llegue al dominio → el resguardo es el interruptor **"Partida abierta"** (cerrado por defecto ✓ → `GET /campaigns/active-invite` responde 404 y el link no abre nada ✓) y que el dominio viva en un canal privado | bajo |
| S2 | El túnel queda abierto y alguien lo encuentra por el azar | **Cerrar el túnel al terminar** (`Ctrl+C`) + un `cloudflared` con **Access** (login) si se quiere una capa más | bajo |
| S3 | Abuso de la URL pública (scanners que pegan en `/api/*`) | El proxy solo expone `/api` y el WS; los 401/403 ya responden ✓. Opcional: `Cloudflare Access` delante del túnel (un login para entrar) | bajo |
| S4 | El **DM** expone su sesión por el link | El token del DM va en el `sessionStorage` de **su** navegador, no viaja por el link ✓ (el link es solo el código del invite) | — |
| S5 | Un jugador descarga el código del invite y lo reusa | Se regenera al terminar la partida ✓ (S1) | bajo |
| S6 | El túnel sirve el `.env` o el `data/` | El servidor estatico sirve **solo** `dist/` ✓ (el `data/` y el `.env` quedan fuera del bundle) | — |

**Rate limit (HECHO)**: el backend tiene un token bucket por IP en las rutas
`/api/*` (30 req/s, ráfaga de 60 → `backend/rate_limit.py`). Un scanner que
manda cientos de requests por segundo se frena con un 429 ✓. El default es
generoso a propósito: un jugador hace 1–5 req/s y el límite tiene que frenar
al scanner, no molestar a la mesa. Con 5 jugadores en la misma casa (misma IP
pública) se sube con `ROLEITO_RATE_LIMIT_RPS=60`.

**Extra opcional pero recomendado (del lado del DM)**: `Cloudflare Access`
delante del túnel (un login de email para entrar) → es configuración de la
cuenta de Cloudflare, no del código.

---

## 8. Latencia y rendimiento (el plan por fases)

### 8.1 Latencia: qué la siente el jugador

| Acción | Qué siente el jugador | Con el WS (típico) | Sin WS (fallback) |
|---|---|---|---|
| El DM mueve un token | Su token se mueve | ~1 RTT (80–150 ms) | hasta 2 s (el backoff) |
| El DM cambia la escena | El snapshot se recarga | ~2 RTT + los 47 KB | hasta 2 s |
| Una tirada del DM | El toast de la tirada | ~1 RTT | 1 s (el poll de las tiradas) |
| El jugador se mueve | Su token se mueve (interpolado en local) | el input es local ✓ | idem |
| La LoS | Nada (es local) | 0 | 0 |

**Conclusión**: con el WS abierto, la latencia del túnel es la de un RTT por
internet normal (80–150 ms entre ciudades) → **imperceptible para una mesa**.
Lo que **no** se puede perdonar es la **carga inicial** (§8.2).

**Mitigaciones ya hechas**: el LoS en el worker ✓, el poll con backoff ✓, el
snapshot solo cuando cambia la revisión ✓, la interpolación de la posición
en el cliente (`velocitiesRef`, `clockOffsetRef` ✓ → el token del jugador se
mueve suave aunque el DM o la red tarden).

**Mitigación pendiente (P2)**: un **watchdog de WS** que reconecta solo con
backoff (hoy `connectWs` reintenta ✓ pero sin backoff exponencial → ante una
red inestable puede martillear el túnel). Y un aviso en la UI de "reconectando"
(la vista ya muestra el estado de conexión ✓ → falta el aviso).

### 8.2 Rendimiento: la carga inicial (lo que hay que arreglar)

| Qué | En dev | En producción (build) | Objetivo |
|---|---|---|---|
| Requests para la primera pantalla | **cientos** (un módulo por archivo) | ~5–10 (bundles) | < 10 |
| Peso del JS | — (sin minificar) | medir con `npm run perf:budget` ✓ (el repo ya tiene ese gate) | dentro del presupuesto |
| El bundle del jugador | incluye el dashboard del DM (tree-shaking por ruta ✓) | idem | que el bundle del jugador NO arrastre el dashboard |
| Imágenes del mapa | `/api/static` ✓ | idem (el backend las sirve) | cachear |
| Audio | `/api/static` ✓ | idem | cachear |

**Plan de assets**: servir `dist/` con cache headers largos (el bundle tiene
hash en el nombre ✓) y las imágenes/audio con `Cache-Control` (el backend los
sirve de `data/assets/` → hoy sin cache explícito ✗ → **pendiente**).

### 8.3 El plan por fases

| Fase | Qué | Terminado cuando | Riesgo |
|---|---|---|---|
| **P0** ✅ | Servir el **build de producción** + el proxy `/api` y `/ws` (script `serve:prod`) y exponerlo con `cloudflared`. Todo con **un comando** (`npm run playtest`: backend + estáticos + túnel) para que el DM no tenga que acordarse de tres cosas antes de la partida | Un jugador en otra red carga la pantalla del login en < 5 s | bajo |
| **P1** 🟡 | El **túnel con nombre** (dominio propio) + el atajo **`GET /join`** (el link fijo de Discord) + **regenerar el invite** al terminar la partida + cerrar el túnel | El link de Discord es el mismo para siempre y el código de la campaña se resuelve solo | bajo |

**P0 — HECHO** (`7da0fc5`): `npm run build:prod` + `npm run serve:prod` (`vite
preview` con el **mismo** proxy que el dev server: `/api` con `ws: true` → el
backend sigue sin exponerse ✓) + `npm run playtest` (un comando: build, backend,
frontend de producción y el recordatorio del túnel ✓). Medido: el bundle
principal pesa **598 KB gzip** (+ 11 KB de CSS) → ~5 s de primera carga a 1 Mbps
✓. **Ojo**: `npm run perf:budget` está en ROJO desde antes de este trabajo
(1360 KB gz contra el presupuesto de 600 KB, por el three.js del dashboard) →
verificado que **no** es regresión de estos cambios; queda para P4.

**P1 — el link fijo ya está (falta el dominio)**: `GET /campaigns/active-invite`
resuelve la campaña **abierta al público** y la ruta `/join` redirige al invite
de esa campaña ✓ (backend + `apps/dm/src/pages/JoinRedirect.tsx` + el
interruptor "Partida abierta" en el menú de invitación ✓). El link que se pega
en Discord es **siempre** `https://mesa.midominio.com/join` ✓: el host no
cambia nunca y el **código sí** (es lo que mantiene el invite como secreto ✓).
Hay **una sola partida abierta a la vez**: al abrir una, las demás se cierran
(`PUT /campaigns/{id}/public-join` ✓). **Lo que falta para cerrar P1**: el
dominio propio + el `cloudflared tunnel run mesa` del lado del DM (depende de
su cuenta de Cloudflare → no se puede hacer desde el repo) + regenerar el invite
al terminar la partida (el botón "Obtener invitación" ya regenera ✓).
| **P2** ✅ | **Watchdog del WS** con backoff + aviso de "reconectando" + cache de assets | El WS se recupera solo de un corte de red sin que el jugador note | medio |
| **P3** 🟡 | **Rate limit** en las rutas públicas + `Cloudflare Access` opcional (login) | Un scanner no puede martillear el backend | bajo |

**P2 — HECHO**: el WS del DM reconectaba con un intervalo **fijo de 1 s** (una red
mala lo martillaba contra el peaje del túnel) y el del jugador reconectaba atado
al poll (cada 2 s, para siempre). Ahora los dos usan el mismo backoff (1 s, 2 s,
4 s, 8 s, tope 15 s → `apps/dm/src/lib/wsBackoff.ts` ✓). El dashboard del DM
muestra el estado ("En vivo" / "Reconectando...") ✓ (antes solo el jugador lo
veía). Los assets (`/api/static`) se revalidan siempre (`Cache-Control:
no-cache`): el nombre del archivo no cambia cuando el DM sube otro (el mapa
siempre es `map.png`), así que un cache largo serviría la versión vieja ✗; con
`no-cache` el navegador manda el ETag y el backend responde 304 (no se baja el
archivo otra vez, pero nunca se ve una versión vieja ✓).

**P3 — el rate limit HECHO, el `Cloudflare Access` es del lado del DM**: el
backend ahora tiene un token bucket por IP en las rutas `/api/*` (30 req/s y
60 de ráfaga por IP, ajustable con `ROLEITO_RATE_LIMIT_RPS` / `_BURST` ✓ →
`backend/rate_limit.py`). La IP que se mira es la **real** (`CF-Connecting-IP` →
`X-Forwarded-For` → socket), porque con el túnel todo llega como loopback. El
DM (loopback sin proxy) nunca se frena ✓. **Lo que falta (cuenta del DM, no
del repo)**: el `Cloudflare Access` delante del túnel (un login de email para
entrar) → es configuración de la cuenta de Cloudflare, no del código.
| **P4** | Medir la partida real: el tamaño de la primera carga, la latencia por acción, el uso de ancho de banda | Hay números del playtest en el doc | — |

---

## 9. El plan de prueba (el playtest)

1. `npm run build --workspace=apps/dm` y `npm run serve:prod`.
2. `cloudflared tunnel --url http://localhost:5173` → copiar el URL.
3. El link que se pega en Discord es **siempre** `https://mesa.midominio.com/join`
   ✓ (el atajo ya existe: `/join` → `GET /campaigns/active-invite` → el invite
   de la campaña abierta ✓). Antes de la partida el DM abre la partida en el
   menú "Invitar" (interruptor **"Partida abierta"** ✓) y copia ese link.

   El menú de invitación ya tiene el campo "URL publica (si usas un túnel)"
   → con esa URL pegada, el link que ofrece y copia es el del túnel ✓.
4. Mandar el link por WhatsApp al grupo.
5. Cada jugador: entra, elige su personaje, tira un dado, pide luz, se mueve.
6. El DM: ve las peticiones de luz, las tiradas y los movimientos.
7. Medir: el tiempo de la primera carga, la latencia de un dado, si el WS se
   cortó.

**El paso 3 tiene un hueco**: el menú de invitación ofrece el link de esta
máquina y el de la LAN, pero **no el del túnel** → si el DM está en localhost
y tuneliza, el link que copia es el equivocado ✗. **P1 lo arregla**: el menú
tiene que ofrecer "el link público (túnel)".

---

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| El túnel se cae a mitad de partida | El poll de revisión con backoff mantiene a los jugadores al día (con retraso) ✓; el DM reabre y reenvía el link ✓ |
| La primera carga es lentísima (dev server) | **P0**: build de producción ✓ |
| Alguien encuentra el link público | Se regenera el invite al terminar ✓ + cerrar el túnel ✓ + Access opcional ✓ |
| El WS no abre en una red con proxy corporativo | El poll de revisión (250 ms → 2 s) cubre ✓; el aviso de conexión ayuda ✓ |
| El backend se satura con requests públicos | **P3**: rate limit ✓ |
| El túnel paga factura | Cloudflare quick es gratis e ilimitado en ancho de banda ✓; ngrok se descarta por las cuotas ✓ |

---

---

## 12. Sin dominio propio: las tres formas gratis (2026-10-21)

> El DM no tiene (y no quiere por ahora) un dominio propio. Todo lo de esta
> seccion es **gratis** y **sin un plan pago**. Lo que se midio el 2026-10-21
> con la app corriendo (no de manual): ver la tabla.

### 12.1 Lo que se midio (con el juego de verdad, no de teoria)

| | HTTP | **WebSocket (el POV)** | La URL | Cuenta | Costo |
|---|---|---|---|---|---|
| **tunnelmole** (`npx tunnelmole 5173`) | ✓ | **✗** (el nginx del servicio responde 404 al upgrade) | aleatoria por partida | ninguna | 0 |
| **Cloudflare quick tunnel** (`cloudflared tunnel --url http://localhost:5173`) | ✓ | **✓** (WS abierto, verificado) | aleatoria por partida | ninguna | 0 |
| **Tailscale Funnel** (`tailscale funnel --bg 5173`) | ✓ (proxy L4) | ✓ (proxy L4) | **FIJA** (`https://<maquina>.<tailnet>.ts.net`) | cuenta gratis (plan Personal) | 0 |

**El WebSocket importa**: el POV del jugador (el token que se mueve, las
tiradas) viaja por el WS. Con tunnelmole el socket no pasa ✗ → el jugador cae
al **sondeo** (cada 250 ms a 2 s según el backoff ✓ → funciona, con retraso ✗).
Con Cloudflare y con Tailscale el WS pasa ✓ → el juego va en vivo ✓.

### 12.2 La elegirida

| Si lo que queres es... | Usá | Por que |
|---|---|---|
| **Jugar ya, sin instalar ni crear cuentas** | **Cloudflare quick tunnel** | Un binario, sin cuenta, y el WS pasa ✓. La URL cambia por partida → se comparte el link de la partida en cada una. |
| **Un link de Discord que no cambie nunca** (gratis) | **Tailscale Funnel** | Es lo unico gratis con **URL fija** ✓ → el atajo `/join` sirve para siempre. Pide una cuenta gratuita de Tailscale (Personal) y habilitar Funnel una vez. |
| **Probar que el túnel anda, sin instalar nada** | `npx tunnelmole 5173` | Cero instalacion ✓. Sin WS ✗ → sirve para ver la app, no para la partida. |

Y si algun dia se consigue un dominio propio: `cloudflared tunnel run mesa` con
el túnel nombrado (pide cuenta de Cloudflare + el dominio) → **el mismo camino,
el mismo codigo** ✓. Nada de lo que hay acá se pierde.

### 12.3 Como se levanta (un comando)

```bash
npm run playtest
```

Eso hace: el build de produccion + el backend + el frontend de produccion +
**el túnel** (el que este instalado: Tailscale si lo tenes, si no cloudflared,
si no tunnelmole). Imprime la URL publica y la copia al portapapeles ✓.

Para forzar uno: `ROLEITO_TUNEL=cloudflared npm run playtest` ✓
(o `npm run tunnel` para levantar solo el túnel ✓).

### 12.4 Lo que el DM hace despues (en el menu "Invitar")

1. Pega la URL del túnel en el campo "URL publica" ✓.
2. Copia el link que aparece (el que tiene el codigo del invite) ✓.
3. Lo manda al grupo de Discord ✓.
4. (Opcional) activa "Partida abierta" → el link fijo `https://<host>/join` ✓.
   Con un túnel **efímero** ese link cambia por partida ✗ → el menu avisa ✓.

### 12.5 Lo que hubo que arreglar para que el túnel sirviera

**El host check de Vite (5.4+)** responde **403** a cualquier host que no sea
localhost → con el túnel, el jugador recibía 403 en vez de la pantalla ✗. Por
eso `apps/dm/vite.config.ts` tiene `allowedHosts` con los dominios de los
túneles gratis (`.trycloudflare.com`, `.tunnelmole.net`, `.ts.net`) ✓. Cuando
haya dominio propio, se agrega ahí (una linea) ✓.

---

## 11. Decisiones (cerradas el 2026-10-21)

1. **Link fijo** → dominio propio + túnel nombrado de Cloudflare ✓ (§0).
2. **Cloudflare Access o link abierto?** → **Link abierto**: la fricción de
   un login para 4 jugadores en una mesa es alta, y el código del invite ya
   es un secreto. Si un dia hace falta, se suma Access delante del túnel (el
   link de Discord no cambia) ✓.
3. **¿Dónde vive la mesa?** → **En la compu del DM** por ahora (§1.1). La
   VPS es la migracion posterior, cuando las partidas sean regulares.
4. **¿Que falta decidir?** → El **dominio**: hace falta uno (Cloudflare lo
   hospeda en el plan free, pero el dominio se paga aparte: ~€8-15/año).
