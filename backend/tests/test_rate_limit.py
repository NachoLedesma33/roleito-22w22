"""Tests del rate limit por IP (`backend/rate_limit.py`)."""

import pytest

from rate_limit import RateLimiter, client_key, is_loopback


def test_el_limite_agota_la_bolsa_y_despues_429():
    limiter = RateLimiter(rate_per_sec=1.0, burst=3)

    # La bolsa arranca con 3 tokens.
    assert limiter.allow("1.2.3.4") is True
    assert limiter.allow("1.2.3.4") is True
    assert limiter.allow("1.2.3.4") is True
    # Cuarta: la bolsa esta vacia.
    assert limiter.allow("1.2.3.4") is False


def test_cada_ip_tiene_su_bolsa():
    limiter = RateLimiter(rate_per_sec=1.0, burst=2)

    assert limiter.allow("1.2.3.4") is True
    assert limiter.allow("1.2.3.4") is True
    assert limiter.allow("1.2.3.4") is False
    # Otra IP no comparte bolsa.
    assert limiter.allow("5.6.7.8") is True


def test_el_dm_local_no_se_frena():
    """El DM juega en loopback: sin proxy, nunca se frena."""
    limiter = RateLimiter(rate_per_sec=1.0, burst=2)

    for _ in range(50):
        assert limiter.allow("127.0.0.1") is True


def test_el_loopback_que_llega_por_proxy_si_se_frena():
    """El tunel hace que todo llegue como loopback: eso es un visitante."""
    limiter = RateLimiter(rate_per_sec=1.0, burst=2)

    assert limiter.allow("127.0.0.1", via_proxy=True) is True
    assert limiter.allow("127.0.0.1", via_proxy=True) is True
    assert limiter.allow("127.0.0.1", via_proxy=True) is False


def test_la_ip_real_viene_de_cloudflare_o_del_proxy():
    class Headers(dict):
        def get(self, key, default=None):
            return dict.get(self, key.lower(), default)

    headers = Headers({"cf-connecting-ip": "8.8.8.8"})
    key, via_proxy = client_key(headers, "127.0.0.1")
    assert key == "8.8.8.8"
    assert via_proxy is True

    headers = Headers({"x-forwarded-for": "9.9.9.9, 10.0.0.1"})
    key, via_proxy = client_key(headers, "127.0.0.1")
    assert key == "9.9.9.9"
    assert via_proxy is True

    # Sin headers: la IP del socket, y no vino por proxy.
    key, via_proxy = client_key(Headers(), "127.0.0.1")
    assert key == "127.0.0.1"
    assert via_proxy is False


def test_is_loopback():
    assert is_loopback("127.0.0.1") is True
    assert is_loopback("::1") is True
    assert is_loopback("8.8.8.8") is False


@pytest.mark.asyncio
async def test_el_backend_responde_429_cuando_se_pasa_el_limite(anon_client):
    """La ruta publica del backend se frena (y las de DM tambien, pero el DM
    va por loopback y nunca se frena)."""
    import main

    limiter = main._limiter
    # Un limite ridiculo para que se dispare en el test.
    limiter.rate = 0.001
    limiter.burst = 2
    # El header de Cloudflare: el cliente del test es loopback (el DM local,
    # que nunca se frena), asi que hay que simular al visitante del tunel.
    headers = {"CF-Connecting-IP": "9.9.9.9"}
    try:
        res1 = await anon_client.get("/api/campaigns/active-invite", headers=headers)
        res2 = await anon_client.get("/api/campaigns/active-invite", headers=headers)
        res3 = await anon_client.get("/api/campaigns/active-invite", headers=headers)
        assert res1.status_code in (200, 404)
        assert res2.status_code in (200, 404, 429)
        assert res3.status_code == 429
        assert res3.headers.get("retry-after") == "1"
    finally:
        limiter.rate = 30.0
        limiter.burst = 60
        limiter._hits.clear()
