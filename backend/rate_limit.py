"""Un rate limit por IP para las rutas publicas.

Con el playtest remoto el backend queda detras de un tunel: la URL es
publica y cualquiera puede pegarle a `/api/*`. Un scanner (o un bot) que
manda cientos de requests por segundo se come el backend entero y el
tunel, y la mesa lo nota como latencia.

El limite es un **token bucket por IP**: una bolsa que se llena a `rate`
tokens por segundo y se vacia de a un token por request. Si la bolsa esta
vacia, el request recibe 429.

Dos detalles que importan:

- **La IP real, no la del socket.** En el playtest remoto todo el trafico
  llega al backend desde el proxy del frontend (127.0.0.1), asi que por IP
  de socket todos los jugadores serian uno solo. Por eso se mira, en este
  orden: `CF-Connecting-IP` (Cloudflare lo pone y es la IP real del
  visitante), `X-Forwarded-For` (un proxy comun) y por ultimo la IP del
  socket.
- **El DM nunca se frena.** Su trafico es local (loopback sin proxy) y no
  tiene nada que ver con un scanner. Un loopback que LLEGA por un proxy
  (el tunel) es un visitante mas: se limita como cualquiera.
"""

import os
import time
from collections import defaultdict, deque

# El default es generoso a proposito: el limite tiene que frenar a un
# scanner, no molestar a una mesa. Un jugador hace 1-5 req/s (el poll de
# tiradas es 1/s; con el WS abierto no hay poll de revisiones). Con 30 rps
# hay 6-30x de margen por jugador. Si la mesa se pone con 5 jugadores en la
# misma casa (misma IP publica), se sube con ROLEITO_RATE_LIMIT_RPS.
DEFAULT_RATE_PER_SEC = 30.0
DEFAULT_BURST = 60

# Las rutas que NO se limitan: los archivos estaticos (los mapas y el audio
# son archivos grandes, no requests), el health check y la documentacion.
EXEMPT_PREFIXES = ("/api/static/", "/health", "/docs", "/openapi.json", "/redoc")


def client_key(headers, client_host: str | None) -> tuple[str, bool]:
    """La IP real del visitante y si vino por un proxy.

    Devuelve `(clave, vino_por_proxy)`:

    - `CF-Connecting-IP` es lo que pone Cloudflare: la IP real del visitante
      (es la que sobrevive al tunel, porque el tunel corre en la compu del
      DM y todo le llega como loopback).
    - `X-Forwarded-For` es lo que pone un proxy comun ("a, b, c": el
      primero es el cliente original).
    - Sin ninguno, la IP del socket.

    El `vino_por_proxy` importa: un `127.0.0.1` que LLEGA por un proxy (el
    tunel) no es el DM local, es un visitante mas. Solo el loopback sin
    proxy es el DM.
    """
    cf = headers.get("cf-connecting-ip")
    if cf:
        return cf.strip(), True
    xff = headers.get("x-forwarded-for")
    if xff:
        # "a, b, c": el primero es el cliente original.
        return xff.split(",")[0].strip(), True
    return client_host or "desconocido", False


def is_loopback(key: str) -> bool:
    """La IP del socket es la de esta misma maquina."""
    return key in ("127.0.0.1", "::1", "localhost", "::ffff:127.0.0.1")


class RateLimiter:
    """Token bucket por clave.

    Es un `deque` de timestamps: la bolsa son los tokens que hay, y se
    cuentan los que se gastaron. Es simple, no necesita locks (el event loop
    es de un solo hilo) y se limpia solo: las claves sin requests hace rato
    se caen.
    """

    def __init__(
        self,
        rate_per_sec: float = DEFAULT_RATE_PER_SEC,
        burst: int = DEFAULT_BURST,
    ) -> None:
        self.rate = float(rate_per_sec)
        self.burst = int(burst)
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._last_sweep = time.monotonic()

    def allow(self, key: str, via_proxy: bool = False) -> bool:
        """Consume un token. False = hay que responder 429."""
        now = time.monotonic()
        self._sweep(now)

        # El DM local (loopback sin proxy) nunca se frena. Un loopback que
        # LLEGA por un proxy (el tunel) es un visitante mas: se limita.
        if not via_proxy and is_loopback(key):
            return True

        hits = self._hits[key]
        # Los tokens se recuperan a `rate` por segundo: se descartan los
        # timestamps que ya cumplieron su turno.
        window = 1.0 / self.rate if self.rate > 0 else 0.0
        while hits and now - hits[0] >= window:
            hits.popleft()

        if len(hits) >= self.burst:
            return False

        hits.append(now)
        return True

    def _sweep(self, now: float) -> None:
        """Saca las claves que no reciben requests hace rato."""
        if now - self._last_sweep < 60:
            return
        self._last_sweep = now
        window = 1.0 / self.rate if self.rate > 0 else 0.0
        for key in list(self._hits.keys()):
            hits = self._hits[key]
            if not hits or now - hits[-1] > window * self.burst * 2 + 60:
                del self._hits[key]


def limiter_from_env() -> RateLimiter:
    """El limiter con los valores del entorno (con defaults sensatos)."""
    rate = float(os.getenv("ROLEITO_RATE_LIMIT_RPS", DEFAULT_RATE_PER_SEC))
    burst = int(os.getenv("ROLEITO_RATE_LIMIT_BURST", DEFAULT_BURST))
    return RateLimiter(rate_per_sec=rate, burst=burst)
