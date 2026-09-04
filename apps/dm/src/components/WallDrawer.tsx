import { useState, useCallback, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SceneItem, WallMetadata, DoorMetadata } from '@core/domain/types'

interface WallDrawerProps {
  enabled: boolean
  mode: 'wall' | 'door'
  material: WallMetadata['material']
  doorMaterial: DoorMetadata['material']
  wallHeight?: number
  wallThickness?: number
  onComplete: (item: SceneItem) => void
  onCancel: () => void
}

export default function WallDrawer({
  enabled,
  mode,
  material,
  doorMaterial,
  wallHeight = 8,
  wallThickness = 10,
  onComplete,
  onCancel,
}: WallDrawerProps) {
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null)
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
    if (!enabled) return
    const point = getScenePoint(e)
    if (point) {
      setStartPoint(point)
      setCurrentPoint(point)
    }
  }, [enabled, getScenePoint])

  const handlePointerMove = useCallback((e: THREE.Event) => {
    if (!enabled || !startPoint) return
    const point = getScenePoint(e)
    if (point) {
      setCurrentPoint(point)
    }
  }, [enabled, startPoint, getScenePoint])

  const handlePointerUp = useCallback(() => {
    if (!enabled || !startPoint || !currentPoint) return

    const dx = currentPoint.x - startPoint.x
    const dy = currentPoint.y - startPoint.y
    const length = Math.hypot(dx, dy)

    if (length < 0.1) {
      onCancel()
      return
    }

    const id = `wall-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const metadata: WallMetadata | DoorMetadata = mode === 'wall'
      ? {
          type: 'wall',
          wallType: 'solid',
          material,
          height: wallHeight,
          thickness: wallThickness,
          opacity: 1.0,
          lineOfSight: true,
          movement: true,
          soundOcclusion: 0.8,
        }
      : {
          type: 'door',
          state: 'closed',
          material: doorMaterial,
          autoClose: false,
        }

    const item: SceneItem = {
      id,
      name: mode === 'wall' ? 'Wall' : 'Door',
      x: 0,
      y: 0,
      layer: 1,
      zIndex: 0,
      scale: 1,
      rotation: 0,
      width: 0,
      height: 0,
      opacity: 1,
      visible: true,
      locked: false,
      disableHit: false,
      disableAutoZIndex: false,
      attachmentIds: [],
      disableAttachmentBehavior: [],
      shape: {
        type: 'line',
        points: [startPoint.x, startPoint.y, currentPoint.x, currentPoint.y],
        stroke: mode === 'wall' ? '#6b7280' : '#b45309',
        strokeWidth: 3,
      },
      metadata,
    }

    onComplete(item)
    setStartPoint(null)
    setCurrentPoint(null)
  }, [enabled, startPoint, currentPoint, mode, material, doorMaterial, wallHeight, wallThickness, onComplete, onCancel])

  if (!enabled) return null

  const previewPoints = startPoint && currentPoint
    ? [
        new THREE.Vector3(startPoint.x, 0.06, startPoint.y),
        new THREE.Vector3(currentPoint.x, 0.06, currentPoint.y),
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
          <lineBasicMaterial color={mode === 'wall' ? '#60a5fa' : '#facc15'} linewidth={2} />
        </lineSegments>
      )}
    </group>
  )
}
