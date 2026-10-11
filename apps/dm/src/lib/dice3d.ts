/**
 * Núcleo procedural de los dados 3D (PLAN-DADOS-3D.md §1–§5).
 *
 * Fuente única de verdad del dado: la malla (three) y la tabla de caras con su
 * valor. La lectura del resultado (`readResult`) y el pintado de los números
 * usan esa misma tabla, así nunca se desincronizan.
 *
 * Sólo geometría y matemática: no necesita WebGL, corre en vitest (env node).
 */
import * as THREE from 'three'

export type DieType = 4 | 6 | 8 | 10 | 12 | 20

export const DIE_TYPES: DieType[] = [4, 6, 8, 10, 12, 20]

export interface DieFace {
  /** Normal unitaria local (hacia afuera). */
  normal: [number, number, number]
  /** Centroide local de la cara (dónde va el número). */
  centroid: [number, number, number]
  /** Valor pintado / leído en esa cara. */
  value: number
}

export interface DieSpec {
  type: DieType
  /** Malla local no indexada (mesh + collider convexo). */
  geometry: THREE.BufferGeometry
  /** Caras con su valor: verdad de lectura y de pintado. */
  faces: DieFace[]
  /** Vértices locales únicos (para el collider). */
  vertices: THREE.Vector3[]
  /** Sólo d4: valor por vértice (se lee por la punta de arriba). */
  vertexValues?: number[]
}

interface RawFace {
  normal: THREE.Vector3
  centroid: THREE.Vector3
}

function geometryFromFaces(verts: THREE.Vector3[], faces: number[][]): THREE.BufferGeometry {
  const positions: number[] = []
  for (const face of faces) {
    for (let k = 1; k < face.length - 1; k++) {
      const tri = [face[0], face[k], face[k + 1]]
      const a = verts[tri[0]]
      const b = verts[tri[1]]
      const c = verts[tri[2]]
      const normal = b.clone().sub(a).cross(c.clone().sub(a))
      const centroid = a.clone().add(b).add(c).multiplyScalar(1 / 3)
      if (normal.dot(centroid) < 0) tri.reverse()
      for (const idx of tri) positions.push(verts[idx].x, verts[idx].y, verts[idx].z)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

/**
 * Trapezoedro pentagonal (el d10 real). three no lo trae.
 *
 * Dos pirámides pentagonales unidas por sus bases, giradas 36°: 12 vértices
 * (2 ápices + 10 de cintura en zigzag) y 10 caras cometa. La altura de la
 * cintura `h = apex·(1−cos36°)/(1+cos36°)` es la que hace las caras **planas**
 * (si no, el quad no es coplanar y se parte en dos triángulos con normales
 * distintas).
 */
function buildD10(): THREE.BufferGeometry {
  const radius = 1
  const apex = 1
  const cos36 = Math.cos(Math.PI / 5)
  const h = (apex * (1 - cos36)) / (1 + cos36)

  const verts: THREE.Vector3[] = [
    new THREE.Vector3(0, apex, 0),
    new THREE.Vector3(0, -apex, 0),
  ]
  for (let i = 0; i < 10; i++) {
    const ang = (i * 36 * Math.PI) / 180
    const y = i % 2 === 0 ? h : -h
    verts.push(new THREE.Vector3(radius * Math.cos(ang), y, radius * Math.sin(ang)))
  }

  const ring = (i: number) => 2 + (((i % 10) + 10) % 10)
  const faces: number[][] = []
  for (let i = 0; i < 5; i++) {
    faces.push([0, ring(2 * i), ring(2 * i + 1), ring(2 * i + 2)])
    faces.push([1, ring(2 * i + 1), ring(2 * i + 2), ring(2 * i + 3)])
  }
  return geometryFromFaces(verts, faces)
}

function baseGeometry(type: DieType): THREE.BufferGeometry {
  switch (type) {
    case 4:
      return new THREE.TetrahedronGeometry(1)
    case 6:
      return new THREE.BoxGeometry(1, 1, 1)
    case 8:
      return new THREE.OctahedronGeometry(1)
    case 10:
      return buildD10()
    case 12:
      return new THREE.DodecahedronGeometry(1)
    case 20:
      return new THREE.IcosahedronGeometry(1)
  }
}

function extractRawFaces(geo: THREE.BufferGeometry): RawFace[] {
  const pos = geo.getAttribute('position')
  const nor = geo.getAttribute('normal')
  const groups: { normal: THREE.Vector3; centroid: THREE.Vector3; k: number }[] = []
  for (let i = 0; i < pos.count; i += 3) {
    const normal = new THREE.Vector3(nor.getX(i), nor.getY(i), nor.getZ(i))
    if (normal.lengthSq() === 0) continue
    normal.normalize()
    const a = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
    const b = new THREE.Vector3(pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1))
    const c = new THREE.Vector3(pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2))
    const centroid = a.add(b).add(c).multiplyScalar(1 / 3)
    // Agrupa por dirección de normal con tolerancia: los triángulos de una misma
    // cara (kite del d10) difieren sólo por error de punto flotante.
    const group = groups.find((g) => g.normal.dot(normal) > 0.999)
    if (group) {
      group.centroid.add(centroid)
      group.k += 1
    } else {
      groups.push({ normal, centroid, k: 1 })
    }
  }
  return groups.map((g) => ({ normal: g.normal, centroid: g.centroid.multiplyScalar(1 / g.k) }))
}

function uniqueVertices(geo: THREE.BufferGeometry): THREE.Vector3[] {
  const pos = geo.getAttribute('position')
  const map = new Map<string, THREE.Vector3>()
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i))
    const key = `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`
    if (!map.has(key)) map.set(key, v)
  }
  return [...map.values()]
}

function orderFaces(raw: RawFace[]): RawFace[] {
  return raw.slice().sort((p, q) => {
    if (Math.abs(p.normal.y - q.normal.y) > 1e-3) return q.normal.y - p.normal.y
    return Math.atan2(p.normal.z, p.normal.x) - Math.atan2(q.normal.z, q.normal.x)
  })
}

function buildFaceTable(type: DieType, raw: RawFace[]): DieFace[] {
  const ordered = orderFaces(raw)
  const values = new Array<number>(ordered.length).fill(0)

  if (type === 6) {
    // Convención del cubo: las caras opuestas suman 7.
    let next = 1
    for (let i = 0; i < ordered.length; i++) {
      if (values[i]) continue
      values[i] = next
      const opp = ordered.findIndex(
        (f, j) => j > i && !values[j] && f.normal.dot(ordered[i].normal) < -0.999,
      )
      if (opp >= 0) values[opp] = 7 - next
      next += 1
    }
  } else {
    for (let i = 0; i < ordered.length; i++) values[i] = i + 1
  }

  return ordered.map((f, i) => ({
    normal: [f.normal.x, f.normal.y, f.normal.z],
    centroid: [f.centroid.x, f.centroid.y, f.centroid.z],
    value: values[i],
  }))
}

function buildVertexValues(vertices: THREE.Vector3[]): number[] {
  const order = vertices
    .map((v, i) => ({ v, i }))
    .sort((a, b) => {
      if (Math.abs(a.v.y - b.v.y) > 1e-4) return b.v.y - a.v.y
      return Math.atan2(a.v.z, a.v.x) - Math.atan2(b.v.z, b.v.x)
    })
  const values = new Array<number>(vertices.length).fill(0)
  order.forEach((e, rank) => {
    values[e.i] = rank + 1
  })
  return values
}

const CACHE = new Map<DieType, DieSpec>()

export function getDie(type: DieType): DieSpec {
  const hit = CACHE.get(type)
  if (hit) return hit

  let geometry = baseGeometry(type)
  if (geometry.index) geometry = geometry.toNonIndexed()
  geometry.computeVertexNormals()

  const vertices = uniqueVertices(geometry)
  const spec: DieSpec = {
    type,
    geometry,
    faces: buildFaceTable(type, extractRawFaces(geometry)),
    vertices,
  }
  if (type === 4) spec.vertexValues = buildVertexValues(vertices)

  CACHE.set(type, spec)
  return spec
}

const UP = new THREE.Vector3(0, 1, 0)

/**
 * Valor del dado dada su rotación en el mundo.
 * - d4: valor del vértice que quedó más arriba.
 * - resto: valor de la cara cuya normal mira más hacia arriba.
 */
export function readResult(spec: DieSpec, rotation: THREE.Quaternion): number {
  if (spec.type === 4 && spec.vertexValues) {
    let best = -Infinity
    let value = 0
    for (let i = 0; i < spec.vertices.length; i++) {
      const y = spec.vertices[i].clone().applyQuaternion(rotation).y
      if (y > best) {
        best = y
        value = spec.vertexValues[i]
      }
    }
    return value
  }

  let best = -Infinity
  let value = 0
  for (const face of spec.faces) {
    const dot = new THREE.Vector3(face.normal[0], face.normal[1], face.normal[2])
      .applyQuaternion(rotation)
      .dot(UP)
    if (dot > best) {
      best = dot
      value = face.value
    }
  }
  return value
}

export interface FaceLabel {
  position: [number, number, number]
  quaternion: [number, number, number, number]
  value: number
}

const LABEL_FORWARD = new THREE.Vector3(0, 0, 1)
const LABEL_EPS = 0.02

/**
 * Orienta el plano del numero (su frente es +Z) hacia la normal de la cara,
 * dejando el texto lo mas "parado" posible respecto del mundo.
 */
function orientLabel(normal: THREE.Vector3): THREE.Quaternion {
  const n = normal.clone().normalize()
  const q = new THREE.Quaternion().setFromUnitVectors(LABEL_FORWARD, n)
  const worldUp = new THREE.Vector3(0, 1, 0)
  const projUp = worldUp.clone().sub(n.clone().multiplyScalar(worldUp.dot(n)))
  if (projUp.lengthSq() > 1e-6) {
    projUp.normalize()
    const curUp = new THREE.Vector3(0, 1, 0).applyQuaternion(q)
    const axis = new THREE.Vector3().crossVectors(curUp, projUp)
    const angle = Math.atan2(axis.dot(n), curUp.dot(projUp))
    q.premultiply(new THREE.Quaternion().setFromAxisAngle(n, angle))
  }
  return q
}

/**
 * Numeros dibujados sobre el dado, en su espacio local.
 * - d4: un numero por vertice; cada cara muestra los de sus 3 vertices.
 * - resto: un numero en el centro de cada cara.
 */
export function getFaceLabels(spec: DieSpec): FaceLabel[] {
  const labels: FaceLabel[] = []
  for (const face of spec.faces) {
    const normal = new THREE.Vector3(face.normal[0], face.normal[1], face.normal[2])
    const centroid = new THREE.Vector3(face.centroid[0], face.centroid[1], face.centroid[2])
    const q = orientLabel(normal)
    if (spec.type === 4 && spec.vertexValues) {
      for (let vi = 0; vi < spec.vertices.length; vi++) {
        const v = spec.vertices[vi]
        if (Math.abs(v.clone().sub(centroid).dot(normal)) > 0.15) continue
        const inset = v.clone().add(centroid.clone().sub(v).multiplyScalar(0.55))
        const p = inset.add(normal.clone().multiplyScalar(LABEL_EPS))
        labels.push({ position: [p.x, p.y, p.z], quaternion: [q.x, q.y, q.z, q.w], value: spec.vertexValues[vi] })
      }
    } else {
      const p = centroid.add(normal.clone().multiplyScalar(LABEL_EPS))
      labels.push({ position: [p.x, p.y, p.z], quaternion: [q.x, q.y, q.z, q.w], value: face.value })
    }
  }
  return labels
}

export function getDieFaceMaterials(spec: DieSpec): THREE.Material[] {
  return buildFaceMaterials(spec)
}

export function buildFaceMaterials(spec: DieSpec): THREE.Material[] {
  const materials: THREE.Material[] = []
  const baseColor = new THREE.Color('#ffffff')
  for (let i = 0; i < spec.faces.length; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: baseColor,
      metalness: 0.25,
      roughness: 0.45,
      map: getFaceTexture(spec.faces[i].value),
    })
    materials.push(mat)
  }
  return materials
}



const FACE_TEXTURE_CACHE = new Map<string, THREE.CanvasTexture>()

export function getFaceTexture(value: number, size = 128, ink = '#111111'): THREE.CanvasTexture {
  const key = `${value}|${ink}`
  const cached = FACE_TEXTURE_CACHE.get(key)
  if (cached) return cached

  const canvas =
    typeof document === 'undefined'
      ? ({ width: size, height: size, getContext: () => null } as unknown as HTMLCanvasElement)
      : document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = ink
    ctx.font = `bold ${size * 0.6}px system-ui, -apple-system, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(value), size / 2, size / 2)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  FACE_TEXTURE_CACHE.set(key, tex)
  return tex
}

export type SkinPattern = 'none' | 'grain' | 'wood' | 'marble' | 'brushed' | 'gem'

const SKIN_TEXTURE_CACHE = new Map<string, THREE.CanvasTexture>()

function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Textura procedural neutra (gris) para multiplicar por el color del skin. */
export function getSkinTexture(pattern: SkinPattern, size = 256): THREE.CanvasTexture | null {
  if (pattern === 'none') return null
  const key = `${pattern}|${size}`
  const cached = SKIN_TEXTURE_CACHE.get(key)
  if (cached) return cached

  const canvas =
    typeof document === 'undefined'
      ? ({ width: size, height: size, getContext: () => null } as unknown as HTMLCanvasElement)
      : document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const rand = mulberry(0x9e3779b9 ^ size ^ pattern.length)
    ctx.fillStyle = '#e2e2e2'
    ctx.fillRect(0, 0, size, size)

    if (pattern === 'grain') {
      for (let i = 0; i < size * size * 0.05; i++) {
        const g = 150 + Math.floor(rand() * 90)
        ctx.fillStyle = `rgba(${g},${g},${g},${0.4 + rand() * 0.5})`
        ctx.beginPath()
        ctx.arc(rand() * size, rand() * size, 0.5 + rand() * 1.6, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (pattern === 'wood') {
      for (let y = 0; y < size; y++) {
        const band = 205 + Math.floor(38 * Math.sin(y * 0.35 + Math.sin(y * 0.06) * 3))
        ctx.fillStyle = `rgb(${band},${band},${band})`
        ctx.fillRect(0, y, size, 1)
      }
      for (let i = 0; i < 7; i++) {
        ctx.strokeStyle = `rgba(90,90,90,${0.25 + rand() * 0.25})`
        ctx.lineWidth = 1 + rand() * 1.5
        ctx.beginPath()
        ctx.ellipse(rand() * size, rand() * size, 4 + rand() * 10, 2 + rand() * 5, rand() * 3, 0, Math.PI * 2)
        ctx.stroke()
      }
    } else if (pattern === 'marble') {
      for (let v = 0; v < 24; v++) {
        ctx.strokeStyle = `rgba(120,120,126,${0.1 + rand() * 0.22})`
        ctx.lineWidth = 0.6 + rand() * 1.6
        ctx.beginPath()
        let x = rand() * size
        let y = rand() * size
        ctx.moveTo(x, y)
        for (let s = 0; s < 6; s++) {
          x += (rand() - 0.5) * size * 0.5
          y += (rand() - 0.5) * size * 0.5
          ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
    } else if (pattern === 'brushed') {
      for (let y = 0; y < size; y++) {
        const g = 208 + Math.floor((rand() - 0.5) * 54)
        ctx.strokeStyle = `rgba(${g},${g},${g},0.5)`
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(size, y)
        ctx.stroke()
      }
    } else if (pattern === 'gem') {
      const grad = ctx.createRadialGradient(size * 0.4, size * 0.35, 2, size * 0.5, size * 0.5, size * 0.7)
      grad.addColorStop(0, '#ffffff')
      grad.addColorStop(0.5, '#e0e6ee')
      grad.addColorStop(1, '#aab4c0')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, size, size)
      const cx = size / 2
      const cy = size / 2
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + rand() * 0.4
        ctx.strokeStyle = `rgba(255,255,255,${0.25 + rand() * 0.4})`
        ctx.lineWidth = 1 + rand() * 2
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(a) * size * 0.6, cy + Math.sin(a) * size * 0.6)
        ctx.stroke()
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  SKIN_TEXTURE_CACHE.set(key, tex)
  return tex
}
