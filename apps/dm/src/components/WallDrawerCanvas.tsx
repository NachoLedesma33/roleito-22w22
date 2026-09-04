import { useCallback, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { DrawState } from './WallDrawer'

interface WallDrawerCanvasProps {
  drawState: DrawState | null
  onDrawStart: (point: { x: number; y: number }) => void
  onDrawMove: (point: { x: number; y: number }) => void
  onDrawEnd: () => void
}

export default function WallDrawerCanvas({
  drawState,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
}: WallDrawerCanvasProps) {
  const planeRef = useRef<THREE.Mesh>(null)
  const { camera, raycaster } = useThree()

  const getScenePoint = useCallback((e: MouseEvent | THREE.Event) => {
    if (!planeRef.current) return null
    const pointer = new THREE.Vector2()
    if ('clientX' in e) {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    raycaster.setFromCamera(pointer, camera)
    const intersects = raycaster.intersectObject(planeRef.current)
    if (intersects.length > 0) {
      const p = intersects[0].point
      return { x: p.x, y: p.z }
    }
    return null
  }, [camera, raycaster])

  const handlePointerDown = useCallback((e: THREE.Event) => {
    if (!drawState) return
    const point = getScenePoint(e)
    if (point) onDrawStart(point)
  }, [drawState, getScenePoint, onDrawStart])

  const handlePointerMove = useCallback((e: THREE.Event) => {
    if (!drawState || !drawState.startPoint) return
    const point = getScenePoint(e)
    if (point) onDrawMove(point)
  }, [drawState, getScenePoint, onDrawMove])

  const handlePointerUp = useCallback(() => {
    if (!drawState || !drawState.startPoint) return
    onDrawEnd()
  }, [drawState, onDrawEnd])

  if (!drawState) return null

  const previewPoints = drawState.startPoint && drawState.currentPoint
    ? [
        new THREE.Vector3(drawState.startPoint.x, 0.08, drawState.startPoint.y),
        new THREE.Vector3(drawState.currentPoint.x, 0.08, drawState.currentPoint.y),
      ]
    : []

  const previewGeo = previewPoints.length === 2
    ? new THREE.BufferGeometry().setFromPoints(previewPoints)
    : null

  return (
    <group>
      <mesh
        ref={planeRef}
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {previewGeo && (
        <lineSegments geometry={previewGeo}>
          <lineBasicMaterial color={drawState.mode === 'wall' ? '#60a5fa' : '#facc15'} linewidth={2} />
        </lineSegments>
      )}
    </group>
  )
}
