import { describe, expect, it } from 'vitest'
import { isAutoDetectedItem } from './autoDetected'

describe('isAutoDetectedItem', () => {
  it('reconoce los items que genera la detección automática', () => {
    expect(isAutoDetectedItem({ id: 'wall-auto-1750000000000-3-4821' })).toBe(true)
    expect(isAutoDetectedItem({ id: 'door-auto-1750000000000-0-9912' })).toBe(true)
  })

  it('no confunde un muro dibujado a mano', () => {
    expect(isAutoDetectedItem({ id: 'wall-1' })).toBe(false)
    expect(isAutoDetectedItem({ id: 'door-7' })).toBe(false)
    // Un id que contiene "auto" pero no arranca con el prefijo no es automático.
    expect(isAutoDetectedItem({ id: 'mi-wall-auto-1' })).toBe(false)
    expect(isAutoDetectedItem({ id: 'zone-auto-2' })).toBe(false)
  })
})