import { useCallback, useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

interface FogBrushCanvasProps {
  reveal: boolean
  radius: number
  mapWidth: number
  mapHeight: number
  onPaint: (point: { x: number; y: number }) => void
}

export default function FogBrushCanvas({
  reveal,
  radius,
  mapWidth,
  mapHeight,
  onPaint,
}: FogBrushCanvasProps) {
  const draggingRef = useRef(false)
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null)

  const toNormalized = useCallback(
    (e: ThreeEvent<PointerEvent>) => ({
      x: e.point.x / mapWidth + 0.5,
      y: e.point.z / mapHeight + 0.5,
    }),
    [mapWidth, mapHeight],
  )

  const handleDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      draggingRef.current = true
      const p = toNormalized(e)
      setLastPoint(p)
      onPaint(p)
    },
    [onPaint, toNormalized],
  )

  const handleMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!draggingRef.current) return
      e.stopPropagation()
      const p = toNormalized(e)
      setLastPoint(p)
      onPaint(p)
    },
    [onPaint, toNormalized],
  )

  const handleUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    draggingRef.current = false
  }, [])

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
          position={[(lastPoint.x - 0.5) * mapWidth, 0.07, (lastPoint.y - 0.5) * mapHeight]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[Math.max(0.02, radius * mapWidth - 0.08), radius * mapWidth, 32]} />
          <meshBasicMaterial color={reveal ? '#22c55e' : '#ef4444'} transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}