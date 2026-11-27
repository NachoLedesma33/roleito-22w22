"""El WS publico no acepta cualquier origen ni cualquier caudal de frames.

Dos riesgos concretos con el tunel abierto:

- **Cross-site WS hijacking**: un sitio ajeno abre un WebSocket al backend con
  las credenciales del navegador de la victima. El `Origin` del handshake
  delata al sitio ajeno y se corta antes de entrar a la sala.
- **Flood**: estos handlers solo descartan lo que reciben, pero un cliente
  puede mandar frames gigantes o cientos por segundo para consumir CPU/RAM.
"""

import pytest

from routes import drain_ws, is_ws_origin_allowed


@pytest.mark.parametrize(
    "origin,host,esperado",
    [
        ("https://evil.example", "localhost:8011", False),
        ("http://localhost:5173", "localhost:8011", True),
        ("http://localhost:5173/", "localhost:8011", True),
        ("http://127.0.0.1:8011", "127.0.0.1:8011", True),
        ("http://127.0.0.1:8011", "127.0.0.2:8011", False),
        ("javascript:alert(1)", "localhost:8011", False),
        (None, "localhost:8011", True),
        ("https://tunel.example", "tunel.example", True),
    ],
)
def test_origin_del_handshake(origin, host, esperado):
    assert is_ws_origin_allowed(origin, host) is esperado


class FakeWS:
    """Suficiente para `drain_ws`: entrega mensajes y registra el close."""

    def __init__(self, messages):
        self.messages = list(messages)
        self.closed = None

    async def receive(self):
        if not self.messages:
            return {"type": "websocket.disconnect"}
        return self.messages.pop(0)

    async def close(self, code):
        self.closed = code


@pytest.mark.asyncio
async def test_mensaje_gigante_cierra_el_ws():
    ws = FakeWS([{"type": "websocket.receive", "text": "x" * 70_000}])
    await drain_ws(ws)
    assert ws.closed == 1009


@pytest.mark.asyncio
async def test_flood_de_frames_cierra_el_ws():
    ws = FakeWS(
        [{"type": "websocket.receive", "text": "ping"} for _ in range(250)]
    )
    await drain_ws(ws)
    assert ws.closed == 1008


@pytest.mark.asyncio
async def test_trafico_normal_no_cierra_el_ws():
    ws = FakeWS([{"type": "websocket.receive", "text": "ping"} for _ in range(5)])
    await drain_ws(ws)
    assert ws.closed is None
