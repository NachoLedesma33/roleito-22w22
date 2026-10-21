import { describe, expect, it } from 'vitest'
import { WS_BACKOFF_BASE_MS, WS_BACKOFF_MAX_MS, wsReconnectDelay } from './wsBackoff'

describe('wsReconnectDelay', () => {
  it('empieza en 1 s y duplica', () => {
    expect(wsReconnectDelay(0)).toBe(1000)
    expect(wsReconnectDelay(1)).toBe(2000)
    expect(wsReconnectDelay(2)).toBe(4000)
    expect(wsReconnectDelay(3)).toBe(8000)
  })

  it('tiene tope: no espera mas de 15 s', () => {
    expect(wsReconnectDelay(4)).toBe(WS_BACKOFF_MAX_MS)
    expect(wsReconnectDelay(20)).toBe(WS_BACKOFF_MAX_MS)
  })

  it('un intento negativo o cero es el primero', () => {
    expect(wsReconnectDelay(-1)).toBe(WS_BACKOFF_BASE_MS)
    expect(wsReconnectDelay(0)).toBe(WS_BACKOFF_BASE_MS)
  })
})
