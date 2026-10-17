// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  accumulateExplored,
  decodeRle,
  encodeRle,
  forgetExplored,
  loadExplored,
  saveExplored,
} from './exploredMemory'

const CAMPAIGN = 'camp-1'
const SCENE = 'scene-1'

describe('exploredMemory/rle', () => {
  it('encode/decode es ida y vuelta', () => {
    const mask = Uint8Array.from([0, 0, 0, 1, 1, 0, 1, 0, 0, 0])
    expect(decodeRle(encodeRle(mask), mask.length)).toEqual(mask)
  })

  it('una máscara casi toda cero pesa mucho menos que ella misma', () => {
    // El motivo de usar RLE y no un PNG: la niebla es mayormente ceros.
    const mask = new Uint8Array(15_625)
    mask[8123] = 1
    const rle = encodeRle(mask)
    expect(rle.length).toBeLessThan(mask.length / 100)
    expect(decodeRle(rle, mask.length)).toEqual(mask)
  })

  it('una máscara toda vista no se comprime (y no pasa nada)', () => {
    const mask = new Uint8Array(100).fill(1)
    expect(decodeRle(encodeRle(mask), mask.length)).toEqual(mask)
  })
})

describe('exploredMemory/acumulación', () => {
  beforeEach(() => localStorage.clear())

  it('visible = actual ∪ recordada', () => {
    const before = Uint8Array.from([1, 0, 0, 0, 0])
    const now = Uint8Array.from([0, 1, 0, 0, 0])
    expect(accumulateExplored(before, now)).toEqual(Uint8Array.from([1, 1, 0, 0, 0]))
  })

  it('sin memoria previa, la acumulación es la máscara actual', () => {
    const now = Uint8Array.from([0, 1, 1, 0])
    expect(accumulateExplored(null, now)).toEqual(now)
  })

  it('una memoria de otra rejilla se descarta en vez de correrla', () => {
    saveExplored(CAMPAIGN, SCENE, Uint8Array.from([1, 1, 1, 1]), 2, 2)
    // La resolución cambió (o el tamaño del mapa): lo guardado ya no describe esto.
    expect(loadExplored(CAMPAIGN, SCENE, 4, 4)).toBeNull()
  })

  it('guarda y relee por campaña y escena', () => {
    const mask = Uint8Array.from([0, 1, 0, 0, 1, 0])
    saveExplored(CAMPAIGN, SCENE, mask, 3, 2)
    expect(loadExplored(CAMPAIGN, SCENE, 3, 2)).toEqual(mask)
    // Otra escena del mismo campana no ve lo de esta.
    expect(loadExplored(CAMPAIGN, 'scene-2', 3, 2)).toBeNull()
    expect(loadExplored('camp-2', SCENE, 3, 2)).toBeNull()
  })

  it('basura en localStorage no rompe nada', () => {
    localStorage.setItem(`roleito:explored:${CAMPAIGN}:${SCENE}`, '{no json')
    expect(loadExplored(CAMPAIGN, SCENE, 2, 2)).toBeNull()
  })

  it('forget borra solo lo de esa escena', () => {
    saveExplored(CAMPAIGN, SCENE, Uint8Array.from([1, 1]), 2, 1)
    saveExplored(CAMPAIGN, 'scene-2', Uint8Array.from([1, 1]), 2, 1)
    forgetExplored(CAMPAIGN, SCENE)
    expect(loadExplored(CAMPAIGN, SCENE, 2, 1)).toBeNull()
    expect(loadExplored(CAMPAIGN, 'scene-2', 2, 1)).not.toBeNull()
  })

  it('sin campaña o escena no hace nada (ni guarda ni lee)', () => {
    saveExplored(null, SCENE, Uint8Array.from([1]), 1, 1)
    expect(loadExplored(null, SCENE, 1, 1)).toBeNull()
  })
})