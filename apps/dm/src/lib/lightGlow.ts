import * as THREE from 'three'

export function remapGlowUv(geometry: THREE.BufferGeometry, ringRadius: number): void {
  if (ringRadius <= 0) return
  const uv = geometry.attributes.uv
  const pos = geometry.attributes.position
  if (!uv || !pos) return
  const half = 1 / (2 * ringRadius)
  for (let i = 0; i < pos.count; i++) {
    const dx = pos.getX(i)
    const dz = -pos.getZ(i)
    uv.setXY(i, 0.5 + dx * half, 0.5 + dz * half)
  }
  uv.needsUpdate = true
}