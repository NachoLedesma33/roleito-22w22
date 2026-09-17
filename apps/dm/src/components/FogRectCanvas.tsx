import { useCallback, useMemo, useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { getY } from '../lib/overlayY'
import type { RenderMode } from '../lib/overlayY'

interface FogRectCanvasProps {
  reveal: boolean
  mapWidth: number
  mapHeight: number
  onRect: (points: number[]) => void
  renderMode?: RenderMode
}

const MIN_RECT = 0.015

export default function FogRectCanvas({
  reveal,
  mapWidth,
  mapHeight,
  onRect,
  renderMode = '2d',
}: FogRectCanvasProps) {
  const draggingRef = useRef(false)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const currentRef = useRef<{ x: number; y: number } | null>(null)
  const [current, setCurrent] = useState<{ x: number; y: number } | null>(null)
  const Y = getY(renderMode)

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
      startRef.current = p
      currentRef.current = p
      setCurrent(p)
    },
    [toNormalized],
  )

  const handleMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!draggingRef.current) return
      e.stopPropagation()
      const p = toNormalized(e)
      currentRef.current = p
      setCurrent(p)
    },
    [toNormalized],
  )

  const handleUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      draggingRef.current = false
      const a = startRef.current
      const b = currentRef.current
      startRef.current = null
      currentRef.current = null
      setCurrent(null)
      if (!a || !b) return
      const x1 = Math.min(a.x, b.x)
      const x2 = Math.max(a.x, b.x)
      const y1 = Math.min(a.y, b.y)
      const y2 = Math.max(a.y, b.y)
      if ((x2 - x1) < MIN_RECT || (y2 - y1) < MIN_RECT) return
      const cx = (x1 + x2) / 2
      const cy = (y1 + y2) / 2
      const rx = Math.min(0.5, (x2 - x1) / 2)
      const ry = Math.min(0.5, (y2 - y1) / 2)
      const rx1 = Math.min(1, Math.max(0, cx - rx))
      const rx2 = Math.min(1, Math.max(0, cx + rx))
      const ry1 = Math.min(1, Math.max(0, cy - ry))
      const ry2 = Math.min(1, Math.max(0, cy + ry))
      onRect([rx1, ry1, rx2, ry1, rx2, ry2, rx1, ry2])
    },
    [onRect],
  )

  const handleCancel = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    draggingRef.current = false
    startRef.current = null
    currentRef.current = null
    setCurrent(null)
  }, [])

  const rectGeo = useMemo(() => {
    if (!current) return null
    const a = startRef.current
    const b = currentRef.current
    if (!a || !b) return null
    const x1 = Math.min(a.x, b.x)
    const x2 = Math.max(a.x, b.x)
    const y1 = Math.min(a.y, b.y)
    const y2 = Math.max(a.y, b.y)
    const w = (x2 - x1) * mapWidth
    const h = (y2 - y1) * mapHeight
    if (w < 0.01 || h < 0.01) return null
    const cx = ((x1 + x2) / 2 - 0.5) * mapWidth
    const cy = ((y1 + y2) / 2 - 0.5) * mapHeight
    const hw = w / 2
    const hh = h / 2
    const fillPts = new Float32Array([
      -hw, hh, 0, hw, hh, 0, hw, -hh, 0, -hw, hh, 0, hw, -hh, 0, -hw, -hh, 0,
    ])
    const edgePts = [
      new THREE.Vector3(hw, hh, 0),
      new THREE.Vector3(-hw, hh, 0),
      new THREE.Vector3(-hw, hh, 0),
      new THREE.Vector3(-hw, -hh, 0),
      new THREE.Vector3(-hw, -hh, 0),
      new THREE.Vector3(hw, -hh, 0),
      new THREE.Vector3(hw, -hh, 0),
      new THREE.Vector3(hw, hh, 0),
    ]
    return {
      center: new THREE.Vector3(cx, renderMode === '2d' ? Y.fogRectEdge : 0.07, cy),
      fillGeo: (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(fillPts, 3)); return g })(),
      edgeGeo: new THREE.BufferGeometry().setFromPoints(edgePts),
    }
  }, [current, mapWidth, mapHeight, renderMode, Y.fogRectEdge])

  return (
    <group>
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerLeave={handleCancel}
      >
        <planeGeometry args={[mapWidth, mapHeight]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {rectGeo && (
        <group position={rectGeo.center}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={rectGeo.fillGeo}>
            <meshBasicMaterial
              color={reveal ? '#22c55e' : '#ef4444'}
              transparent
              opacity={0.25}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <lineSegments geometry={rectGeo.edgeGeo} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <lineBasicMaterial color={reveal ? '#22c55e' : '#ef4444'} />
          </lineSegments>
        </group>
      )}
    </group>
  )
}