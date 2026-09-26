import { useCallback, useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'

interface TokenPlaceCanvasProps {
  mapWidth: number
  mapHeight: number
  onPlace: (point: { x: number; z: number }) => void
}

export default function TokenPlaceCanvas({
  mapWidth,
  mapHeight,
  onPlace,
}: TokenPlaceCanvasProps) {
  const hoverRef = useRef<{ x: number; z: number } | null>(null)
  const [hover, setHover] = useState<{ x: number; z: number } | null>(null)
  // Placement plane sits just above the ground (tokens live at y=0).
  const PLANE_Y = 0.01

  const inBounds = useCallback(
    (x: number, z: number) => {
      const halfW = mapWidth / 2
      const halfD = mapHeight / 2
      return x >= -halfW && x <= halfW && z >= -halfD && z <= halfD
    },
    [mapWidth, mapHeight],
  )

  const handleMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      const p = { x: e.point.x, z: e.point.z }
      if (!inBounds(p.x, p.z)) {
        hoverRef.current = null
        setHover(null)
        return
      }
      hoverRef.current = p
      setHover(p)
    },
    [inBounds],
  )

  const handleLeave = useCallback(() => {
    hoverRef.current = null
    setHover(null)
  }, [])

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      const p = { x: e.point.x, z: e.point.z }
      if (!inBounds(p.x, p.z)) return
      onPlace(p)
    },
    [inBounds, onPlace],
  )

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, PLANE_Y, 0]}
        onPointerMove={handleMove}
        onPointerOut={handleLeave}
        onClick={handleClick}
      >
        <planeGeometry args={[mapWidth, mapHeight]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {hover && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[hover.x, PLANE_Y + 0.01, hover.z]}>
          <circleGeometry args={[0.4, 24]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.8} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}