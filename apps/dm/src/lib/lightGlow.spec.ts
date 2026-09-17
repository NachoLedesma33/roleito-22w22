import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { remapGlowUv } from './lightGlow'

function sectorGeo(ringRadius: number, angleDeg: number, dirDeg = 0, segments = 2): THREE.BufferGeometry {
  const a0 = (dirDeg - angleDeg / 2) * (Math.PI / 180)
  const a1 = (dirDeg + angleDeg / 2) * (Math.PI / 180)
  const points: THREE.Vector2[] = []
  points.push(new THREE.Vector2(0, 0))
  for (let i = 0; i <= segments; i++) {
    const a = a0 + (i / segments) * (a1 - a0)
    points.push(new THREE.Vector2(Math.cos(a) * ringRadius, Math.sin(a) * ringRadius))
  }
  const shape = new THREE.Shape(points)
  const geo = new THREE.ShapeGeometry(shape)
  geo.rotateX(-Math.PI / 2)
  return geo
}

function vertexIndexNear(geo: THREE.BufferGeometry, x: number, z: number): number {
  const pos = geo.attributes.position
  let best = -1
  let bestD = Infinity
  for (let i = 0; i < pos.count; i++) {
    const d = Math.hypot(pos.getX(i) - x, pos.getZ(i) - z)
    if (d < bestD) { bestD = d; best = i }
  }
  return best
}

function uvDistance(i: number, geo: THREE.BufferGeometry): number {
  const uv = geo.attributes.uv
  return Math.hypot(uv.getX(i) - 0.5, uv.getY(i) - 0.5)
}

describe('remapGlowUv', () => {
  it('ancla el apex del sector en el centro del brillo (0.5, 0.5)', () => {
    const ring = 2
    const geo = sectorGeo(ring, 90, 0, 32)
    remapGlowUv(geo, ring)
    const apexIdx = vertexIndexNear(geo, 0, 0)
    const uv = geo.attributes.uv
    expect(uv.getX(apexIdx)).toBeCloseTo(0.5, 5)
    expect(uv.getY(apexIdx)).toBeCloseTo(0.5, 5)
  })

  it('vértice en el borde del ring mapea al radio UV 0.5 (todos igual de brillantes)', () => {
    const ring = 2
    const geo = sectorGeo(ring, 90, 0, 32)
    remapGlowUv(geo, ring)
    const pos = geo.attributes.position
    let samples = 0
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getZ(i))
      if (Math.abs(r - ring) < 1e-3) {
        expect(uvDistance(i, geo)).toBeCloseTo(0.5, 3)
        samples++
      }
    }
    expect(samples).toBeGreaterThan(0)
  })

  it('vértice interior escala linealmente: uvRadius ≈ 0.5·r/ring', () => {
    const ring = 2
    const geo = new THREE.BufferGeometry()
    const pts = new Float32Array([
      0, 0, 0,
      ring, 0, 0,
      ring / 2, 0, ring / 2,
      ring * 0.25, 0, 0,
    ])
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3))
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(8), 2))
    remapGlowUv(geo, ring)
    expect(uvDistance(0, geo)).toBeCloseTo(0, 5)
    expect(uvDistance(1, geo)).toBeCloseTo(0.5, 5)
    expect(uvDistance(2, geo)).toBeCloseTo(0.5 * (Math.SQRT1_2), 3)
    expect(uvDistance(3, geo)).toBeCloseTo(0.5 * 0.25, 5)
  })

  it('independiente de la dirección del sector (bbox ya no tira)', () => {
    const ring = 2
    const dirs = [0, 45, 90, 180, 270]
    for (const dir of dirs) {
      const geo = sectorGeo(ring, 60, dir, 32)
      remapGlowUv(geo, ring)
      const apexIdx = vertexIndexNear(geo, 0, 0)
      expect(uvDistance(apexIdx, geo)).toBeLessThan(1e-3)
      const ex = Math.cos(dir * Math.PI / 180) * ring
      const ez = -Math.sin(dir * Math.PI / 180) * ring
      const edgeIdx = vertexIndexNear(geo, ex, ez)
      expect(uvDistance(edgeIdx, geo)).toBeCloseTo(0.5, 3)
    }
  })
})