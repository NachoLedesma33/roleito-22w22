import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { DIE_TYPES, getDie, readResult, type DieType } from './dice3d'

const EXPECTED_VERTICES: Record<DieType, number> = { 4: 4, 6: 8, 8: 6, 10: 12, 12: 20, 20: 12 }

describe('dice3d · geometrías', () => {
  it('cada dado tiene tantas caras como su tipo', () => {
    for (const t of DIE_TYPES) {
      expect(getDie(t).faces.length).toBe(t)
    }
  })

  it('la cantidad de vértices es la esperada por poliedro', () => {
    for (const t of DIE_TYPES) {
      expect(getDie(t).vertices.length).toBe(EXPECTED_VERTICES[t])
    }
  })

  it('los valores de las caras son una permutación de 1..N', () => {
    for (const t of DIE_TYPES) {
      const values = getDie(t)
        .faces.map((f) => f.value)
        .sort((a, b) => a - b)
      expect(values).toEqual(Array.from({ length: t }, (_, i) => i + 1))
    }
  })

  it('las normales apuntan hacia afuera (convexo centrado en el origen)', () => {
    for (const t of DIE_TYPES) {
      for (const face of getDie(t).faces) {
        const normal = new THREE.Vector3(...face.normal)
        const centroid = new THREE.Vector3(...face.centroid)
        expect(normal.dot(centroid)).toBeGreaterThan(0)
      }
    }
  })

  it('en el d6 las caras opuestas suman 7', () => {
    const faces = getDie(6).faces
    for (const face of faces) {
      const normal = new THREE.Vector3(...face.normal)
      const oppIdx = faces.findIndex((g) => new THREE.Vector3(...g.normal).dot(normal) < -0.999)
      expect(oppIdx).toBeGreaterThanOrEqual(0)
      expect(face.value + faces[oppIdx].value).toBe(7)
    }
  })

  it('el trapezoedro (d10) tiene 10 caras y 12 vértices', () => {
    const spec = getDie(10)
    expect(spec.faces.length).toBe(10)
    expect(spec.vertices.length).toBe(12)
  })
})

describe('dice3d · lectura del resultado', () => {
  it('identidad lee la cara que mira a +Y (d6/d8/d12/d20)', () => {
    for (const t of [6, 8, 12, 20] as DieType[]) {
      const spec = getDie(t)
      const maxY = Math.max(...spec.faces.map((f) => f.normal[1]))
      const expected = spec.faces.find((f) => Math.abs(f.normal[1] - maxY) < 1e-10)?.value
      expect(readResult(spec, new THREE.Quaternion())).toBe(expected)
    }
  })

  it('girar el d6 180° lee la cara opuesta (suman 7)', () => {
    const spec = getDie(6)
    const up = readResult(spec, new THREE.Quaternion())
    const flip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)
    expect(readResult(spec, flip)).toBe(7 - up)
  })

  it('d4: apuntar cada vértice hacia arriba lee su valor', () => {
    const spec = getDie(4)
    const up = new THREE.Vector3(0, 1, 0)
    for (let i = 0; i < spec.vertices.length; i++) {
      const dir = spec.vertices[i].clone().normalize()
      const q = new THREE.Quaternion().setFromUnitVectors(dir, up)
      expect(readResult(spec, q)).toBe(spec.vertexValues?.[i])
    }
  })

  it('d4: siempre devuelve un valor 1..4', () => {
    const spec = getDie(4)
    const axis = new THREE.Vector3(1, 2, 3).normalize()
    for (let a = 0; a < 5; a++) {
      const q = new THREE.Quaternion().setFromAxisAngle(axis, (a * Math.PI) / 5)
      const value = readResult(spec, q)
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(4)
    }
  })

  it('getDie cachea y es determinista', () => {
    for (const t of DIE_TYPES) {
      const a = getDie(t)
      const b = getDie(t)
      expect(a).toBe(b)
      expect(a.faces.map((f) => f.value)).toEqual(b.faces.map((f) => f.value))
    }
  })
})
