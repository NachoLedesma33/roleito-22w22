import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { FogRegion } from '../lib/fogMask'
import type { PerceptionMask } from '../lib/playerPerception'

export const FOG_MASK_SIZE = 512

function paintMask(
  canvas: HTMLCanvasElement,
  color: string,
  regions: FogRegion[],
  aspect: number,
) {
  const w = FOG_MASK_SIZE
  const h = Math.max(32, Math.round(FOG_MASK_SIZE / aspect))
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.globalCompositeOperation = 'source-over'
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)

  const order = [...regions].sort((a, b) => a.zIndex - b.zIndex)
  for (const r of order) {
    ctx.beginPath()
    for (let i = 0; i < r.points.length; i += 2) {
      const px = r.points[i] * w
      const py = r.points[i + 1] * h
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    if (r.revealed) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = '#000000'
      ctx.fill()
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = color
      ctx.fill()
    }
  }
  ctx.globalCompositeOperation = 'source-over'
}

/**
 * Pinta el alpha de percepción como textura de niebla.
 *
 * Sin orden de pintado y sin `zIndex`: la niebla del DM y la visión del jugador
 * ya venían resueltas en una sola rejilla (`playerPerception.ts`), así que acá
 * solo se traduce a píxeles. Se rellena con el color de niebla y la máscara se
 * perfora con `destination-out`, que es lo mismo que hacía `paintMask` con las
 * regiones reveladas pero con alpha continuo (el `dimRange` de la visión).
 *
 * `[row][col]` va hacia abajo en el canvas, igual que `paintMask` mapeaba los
 * puntos normalizados, así que la convención de ejes no cambia entre los dos.
 */
function paintPerception(
  canvas: HTMLCanvasElement,
  color: string,
  mask: PerceptionMask,
  aspect: number,
) {
  const w = FOG_MASK_SIZE
  const h = Math.max(32, Math.round(FOG_MASK_SIZE / aspect))
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx || mask.cols <= 0 || mask.rows <= 0) return

  const src = document.createElement('canvas')
  src.width = mask.cols
  src.height = mask.rows
  const sctx = src.getContext('2d')
  if (!sctx) return
  const img = sctx.createImageData(mask.cols, mask.rows)
  for (let i = 0; i < mask.data.length; i++) {
    const v = mask.data[i]
    const a = v < 0 ? 0 : v > 1 ? 255 : Math.round((1 - v) * 255)
    const o = i * 4
    img.data[o] = 255
    img.data[o + 1] = 255
    img.data[o + 2] = 255
    img.data[o + 3] = a
  }
  sctx.putImageData(img, 0, 0)

  ctx.globalCompositeOperation = 'source-over'
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(src, 0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'
}

interface FogOverlayProps {
  regions: FogRegion[]
  /**
   * Alpha de percepción del jugador. Cuando viene, manda sobre `regions`: es la
   * ruta del jugador (una sola rejilla) y la del DM sigue siendo por polígonos
   * (`engineering/PLAN-VISION-PERCEPCION.md` §4.3: el DM ve todo).
   */
  perception?: PerceptionMask | null
  color: string
  mapWidth: number
  mapHeight: number
  renderMode?: import('@/lib/overlayY').RenderMode
}

export default function FogOverlay({
  regions,
  perception = null,
  color,
  mapWidth,
  mapHeight,
  renderMode = '2d',
}: FogOverlayProps) {
  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(document.createElement('canvas'))
    tex.needsUpdate = true
    return tex
  }, [])

  const aspect = mapHeight > 0 ? mapWidth / mapHeight : 1
  const fogY = renderMode === '2d' ? 0.08 : 6

  useEffect(() => {
    const canvas = texture.image as HTMLCanvasElement
    if (perception) paintPerception(canvas, color, perception, aspect)
    else paintMask(canvas, color, regions, aspect)
    texture.needsUpdate = true
  }, [texture, color, regions, perception, aspect])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, fogY, 0]} renderOrder={50}>
      <planeGeometry args={[mapWidth, mapHeight]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}