import { describe, expect, it } from 'vitest'
import { autoDetectedKind, isAutoDetectedItem } from './autoDetected'

describe('isAutoDetectedItem', () => {
  it('reconoce los items que genera la detección automática', () => {
    expect(isAutoDetectedItem({ id: 'wall-auto-1750000000000-3-4821' })).toBe(true)
    expect(isAutoDetectedItem({ id: 'door-auto-1750000000000-0-9912' })).toBe(true)
    // Las zonas de la IA (el perimetro de la zona ES la pared).
    expect(isAutoDetectedItem({ id: 'zone-auto-1750000000000-0-1234' })).toBe(true)
    // El prefijo viejo de las zonas (campañas detectadas antes del cambio):
    // si no se reconociera, al re-detectar las zonas viejas quedarian
    // debajo de las nuevas.
    expect(isAutoDetectedItem({ id: 'room-auto-1750000000000-0-1234' })).toBe(true)
  })

  it('no confunde un muro dibujado a mano', () => {
    expect(isAutoDetectedItem({ id: 'wall-1' })).toBe(false)
    expect(isAutoDetectedItem({ id: 'door-7' })).toBe(false)
    // Un id que contiene "auto" pero no arranca con el prefijo no es automático.
    expect(isAutoDetectedItem({ id: 'mi-wall-auto-1' })).toBe(false)
    expect(isAutoDetectedItem({ id: 'zone-2' })).toBe(false)
  })
})

describe('autoDetectedKind', () => {
  it('distingue muro, puerta y zona', () => {
    expect(autoDetectedKind({ id: 'wall-auto-1' })).toBe('wall')
    expect(autoDetectedKind({ id: 'door-auto-1' })).toBe('door')
    expect(autoDetectedKind({ id: 'zone-auto-1' })).toBe('zone')
    expect(autoDetectedKind({ id: 'room-auto-1' })).toBe('zone')
  })

  it('lo dibujado a mano no es de ningun tipo', () => {
    expect(autoDetectedKind({ id: 'wall-1' })).toBeNull()
    expect(autoDetectedKind({ id: 'zone-2' })).toBeNull()
  })
})
