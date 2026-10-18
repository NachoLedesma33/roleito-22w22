import { useCallback, useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { getY } from '../lib/overlayY'
import type { RenderMode } from '../lib/overlayY'

interface FogBrushCanvasProps {
  reveal: boolean
  radius: number
  mapWidth: number
  mapHeight: number
  /**
   * Un trazo = la línea central de la pincelada, ya muestreada.
   *
   * Antes se emitía un item por punto de mouse (`onPaint`), y un drag de ancho
   * completo dejaba ~25 items: cada uno es un mesh en la escena, una fila en
   * `items_json` que viaja entero a cada jugador, y un turno de `buildDmFogGrid`.
   * Ahora el trazo se arma acá y se entrega **una vez**, al soltar.
   */
  onStroke: (points: number[]) => void
  renderMode?: RenderMode
}

/** Muestreo mínimo del trazo, en espacio normalizado. */
const MIN_SAMPLE_DIST = 0.02

export default function FogBrushCanvas({
  reveal,
  radius,
  mapWidth,
  mapHeight,
  onStroke,
  renderMode = '2d',
}: FogBrushCanvasProps) {
  const draggingRef = useRef(false)
  const strokeRef = useRef<number[]>([])
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null)
  const Y = getY(renderMode)

  const toNormalized = useCallback(
    (e: ThreeEvent<PointerEvent>) => ({
      x: e.point.x / mapWidth + 0.5,
      y: e.point.z / mapHeight + 0.5,
    }),
    [mapWidth, mapHeight],
  )

  const sample = useCallback((p: { x: number; y: number }) => {
    const stroke = strokeRef.current
    const n = stroke.length
    if (n >= 2) {
      const dx = p.x - stroke[n - 2]
      const dy = p.y - stroke[n - 1]
      if (Math.hypot(dx, dy) < MIN_SAMPLE_DIST) return
    }
    stroke.push(p.x, p.y)
  }, [])

  const handleDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      draggingRef.current = true
      const p = toNormalized(e)
      strokeRef.current = [p.x, p.y]
      setLastPoint(p)
    },
    [toNormalized],
  )

  const handleMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!draggingRef.current) return
      e.stopPropagation()
      const p = toNormalized(e)
      setLastPoint(p)
      sample(p)
    },
    [toNormalized, sample],
  )

  const handleUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      if (!draggingRef.current) return
      draggingRef.current = false
      const points = strokeRef.current
      strokeRef.current = []
      if (points.length >= 2) onStroke(points)
    },
    [onStroke],
  )

  return (
    <group>
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerLeave={handleUp}
      >
        <planeGeometry args={[mapWidth, mapHeight]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {lastPoint && (
        <mesh
          position={[(lastPoint.x - 0.5) * mapWidth, Y.fogBrushCursor, (lastPoint.y - 0.5) * mapHeight]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[Math.max(0.02, radius * mapWidth - 0.08), radius * mapWidth, 32]} />
          <meshBasicMaterial color={reveal ? '#22c55e' : '#ef4444'} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}