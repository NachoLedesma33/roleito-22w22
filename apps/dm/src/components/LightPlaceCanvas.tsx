import { useCallback, useMemo, useRef, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { normalizeLightConfig, LIGHT_PRESETS, hexToRgba } from '../lib/light'
import { getY } from '../lib/overlayY'
import type { RenderMode } from '../lib/overlayY'

interface LightPlaceCanvasProps {
  presetKey: string
  mapWidth: number
  mapHeight: number
  onPlace: (point: { x: number; y: number }) => void
  renderMode?: RenderMode
}

export default function LightPlaceCanvas({
  presetKey,
  mapWidth,
  mapHeight,
  onPlace,
  renderMode = '2d',
}: LightPlaceCanvasProps) {
  const hoverRef = useRef<{ x: number; y: number } | null>(null)
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)
  const Y = getY(renderMode)

  const preset = useMemo(() => LIGHT_PRESETS[presetKey] ?? LIGHT_PRESETS.torch, [presetKey])
  const source = useMemo(() => normalizeLightConfig(preset), [preset])

  const toNormalized = useCallback(
    (e: { point: THREE.Vector3 }) => ({
      x: e.point.x / mapWidth + 0.5,
      y: e.point.z / mapHeight + 0.5,
    }),
    [mapWidth, mapHeight],
  )

  const handleMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      const p = toNormalized(e)
      if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) {
        hoverRef.current = null
        setHover(null)
        return
      }
      hoverRef.current = p
      setHover(p)
    },
    [toNormalized],
  )

  const handleLeave = useCallback(() => {
    hoverRef.current = null
    setHover(null)
  }, [])

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      const p = toNormalized(e)
      if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return
      onPlace(p)
    },
    [toNormalized, onPlace],
  )

  const radius = source.radius * mapHeight

  const glowTexture = useMemo(() => {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, hexToRgba(source.color, 0.8))
    grad.addColorStop(0.85, hexToRgba(source.color, 0.5))
    grad.addColorStop(1, hexToRgba(source.color, 0))
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [source.color])

  const ringPts = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius))
    }
    return pts
  }, [radius])
  const ringGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(ringPts), [ringPts])

  return (
    <group>
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={false}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        onClick={handleClick}
      >
        <planeGeometry args={[mapWidth, mapHeight]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {hover && (
        <group position={[hover.x * mapWidth - mapWidth / 2, Y.lightPlaceHover, hover.y * mapHeight - mapHeight / 2]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <circleGeometry args={[radius, 32]} />
            <meshBasicMaterial
              map={glowTexture}
              transparent
              opacity={0.55}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <lineSegments geometry={ringGeo} position={[0, 0.02, 0]}>
            <lineBasicMaterial color={preset.color} transparent opacity={0.8} />
          </lineSegments>
          {renderMode === '2d' ? (
            <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.05, 0.09, 32]} />
              <meshBasicMaterial color={preset.color} transparent opacity={0.9} side={THREE.DoubleSide} />
            </mesh>
          ) : (
            <mesh position={[0, 0.12, 0]}>
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshStandardMaterial
                color="#000000"
                emissive={new THREE.Color(preset.color)}
                emissiveIntensity={1.2}
              />
            </mesh>
          )}
        </group>
      )}
    </group>
  )
}