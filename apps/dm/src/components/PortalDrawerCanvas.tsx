import { useCallback, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { Point2D } from '@core/domain/types'
import { snapToZoneEdge, type EdgeSnap, type ZoneGeometry, PORTAL_COLORS } from './ZonePortal'

export interface PortalDraft {
  zoneAId: string | null
  pointA: Point2D | null
  a: Point2D | null
  b: Point2D | null
  currentPoint: Point2D | null
}

export function createEmptyPortalDraft(): PortalDraft {
  return { zoneAId: null, pointA: null, a: null, b: null, currentPoint: null }
}

interface PortalDrawerCanvasProps {
  draft: PortalDraft
  zones: ZoneGeometry[]
  mapWidth: number
  mapHeight: number
  onSelect: (snap: EdgeSnap) => void
  onMove: (point: Point2D) => void
}

function scenePoint(e: ThreeEvent<PointerEvent>): { x: number; y: number } {
  return { x: e.point.x, y: e.point.z }
}

function toNorm(p: { x: number; y: number }, mapW: number, mapH: number): Point2D {
  return { x: p.x / mapW + 0.5, y: p.y / mapH + 0.5 }
}

function toWorld(p: Point2D, mapW: number, mapH: number): THREE.Vector3 {
  return new THREE.Vector3((p.x - 0.5) * mapW, 0.09, (p.y - 0.5) * mapH)
}

export default function PortalDrawerCanvas({
  draft,
  zones,
  mapWidth,
  mapHeight,
  onSelect,
  onMove,
}: PortalDrawerCanvasProps) {
  const planeRef = useRef<THREE.Mesh>(null)

  const handleDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const norm = toNorm(scenePoint(e), mapWidth, mapHeight)
    const snap = snapToZoneEdge(norm, zones)
    if (!snap) return
    onSelect(snap)
  }, [zones, mapWidth, mapHeight, onSelect])

  const handleMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onMove(toNorm(scenePoint(e), mapWidth, mapHeight))
  }, [mapWidth, mapHeight, onMove])

  const preview: THREE.Vector3[] = []
  if (draft.pointA && draft.currentPoint) {
    preview.push(
      toWorld(draft.pointA, mapWidth, mapHeight),
      toWorld(draft.currentPoint, mapWidth, mapHeight),
    )
  }
  const previewGeo = preview.length >= 2
    ? new THREE.BufferGeometry().setFromPoints(preview)
    : null

  const marker = draft.pointA
    ? toWorld(draft.pointA, mapWidth, mapHeight)
    : null

  return (
    <group>
      <mesh
        ref={planeRef}
        position={[0, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {draft.pointA && draft.a && draft.b && (() => {
        const edgeGeo = new THREE.BufferGeometry().setFromPoints([
          toWorld(draft.a, mapWidth, mapHeight),
          toWorld(draft.b, mapWidth, mapHeight),
        ])
        return (
          <lineSegments geometry={edgeGeo}>
            <lineBasicMaterial color={PORTAL_COLORS.open} linewidth={2} />
          </lineSegments>
        )
      })()}
      {previewGeo && (
        <lineSegments geometry={previewGeo}>
          <lineBasicMaterial color="#22c55e" linewidth={2} transparent opacity={0.6} />
        </lineSegments>
      )}
      {marker && (
        <mesh position={marker}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshBasicMaterial color={PORTAL_COLORS.open} />
        </mesh>
      )}
    </group>
  )
}