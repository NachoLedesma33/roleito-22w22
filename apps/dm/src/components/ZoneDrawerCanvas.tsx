import { useCallback, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { ZoneDraft } from './ZoneDrawer'

interface ZoneDrawerCanvasProps {
  draft: ZoneDraft
  onAddPoint: (point: { x: number; y: number }) => void
  onDragStart: (point: { x: number; y: number }) => void
  onDragMove: (point: { x: number; y: number }) => void
  onDragEnd: (point: { x: number; y: number }) => void
  onFinishPolygon: () => void
}

const CLOSE_DIST = 0.6

function scenePoint(e: ThreeEvent<PointerEvent>): { x: number; y: number } {
  return { x: e.point.x, y: e.point.z }
}

export default function ZoneDrawerCanvas({
  draft,
  onAddPoint,
  onDragStart,
  onDragMove,
  onDragEnd,
  onFinishPolygon,
}: ZoneDrawerCanvasProps) {
  const planeRef = useRef<THREE.Mesh>(null)

  const handlePolygonClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    const point = scenePoint(e)
    const first = draft.points[0]
    if (first && Math.hypot(point.x - first.x, point.y - first.y) < CLOSE_DIST) {
      onFinishPolygon()
      return
    }
    onAddPoint(point)
  }, [draft.points, onAddPoint, onFinishPolygon])

  const handleRectDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    onDragStart(scenePoint(e))
  }, [onDragStart])

  const handleRectMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    onDragMove(scenePoint(e))
  }, [onDragMove])

  const handleRectUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    onDragEnd(scenePoint(e))
  }, [onDragEnd])

  const buildPreviewPoints = () => {
    const pts: THREE.Vector3[] = []
    const push = (p: { x: number; y: number }) => pts.push(new THREE.Vector3(p.x, 0.09, p.y))
    if (draft.mode === 'polygon') {
      for (const p of draft.points) push(p)
      if (draft.points.length > 0 && draft.currentPoint) push(draft.currentPoint)
      if (draft.points.length > 0) {
        pts.push(new THREE.Vector3(draft.points[0].x, 0.09, draft.points[0].y))
      }
    } else {
      const a = draft.startPoint
      const b = draft.currentPoint
      if (a && b) {
        push({ x: a.x, y: a.y })
        push({ x: b.x, y: a.y })
        push({ x: b.x, y: b.y })
        push({ x: a.x, y: a.y })
      }
    }
    return pts
  }

  const previewPoints = buildPreviewPoints()
  const previewGeo = previewPoints.length >= 2
    ? new THREE.BufferGeometry().setFromPoints(previewPoints)
    : null

  return (
    <group>
      <mesh
        ref={planeRef}
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        onPointerDown={draft.mode === 'polygon' ? handlePolygonClick : handleRectDown}
        onPointerMove={draft.mode === 'polygon' ? undefined : handleRectMove}
        onPointerUp={draft.mode === 'polygon' ? undefined : handleRectUp}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {previewGeo && (
        <lineSegments geometry={previewGeo}>
          <lineBasicMaterial color="#22c55e" linewidth={2} />
        </lineSegments>
      )}
      {draft.points.length > 0 && (
        <group>
          {draft.points.map((p, i) => (
            <mesh key={i} position={[p.x, 0.1, p.y]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}