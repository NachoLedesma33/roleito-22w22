import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { FogRegion } from '../lib/fogMask'

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

interface FogOverlayProps {
  regions: FogRegion[]
  color: string
  mapWidth: number
  mapHeight: number
}

export default function FogOverlay({ regions, color, mapWidth, mapHeight }: FogOverlayProps) {
  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(document.createElement('canvas'))
    tex.needsUpdate = true
    return tex
  }, [])

  const aspect = mapHeight > 0 ? mapWidth / mapHeight : 1

  useEffect(() => {
    const canvas = texture.image as HTMLCanvasElement
    paintMask(canvas, color, regions, aspect)
    texture.needsUpdate = true
  }, [texture, color, regions, aspect])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 6, 0]} renderOrder={50}>
      <planeGeometry args={[mapWidth, mapHeight]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}