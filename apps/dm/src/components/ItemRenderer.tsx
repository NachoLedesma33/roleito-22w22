import { useCallback, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { SceneItem, ZoneMetadata, LightMetadata } from '@core/domain/types'
import { PORTAL_COLORS } from './ZonePortal'
import { normalizeLightConfig, lightGlowOpacity, hexToRgba, computeLightZones } from '../lib/light'
import { lightShapePoints } from '../lib/lightOcclusion'

const TOKEN_COLORS: Record<string, string> = {
  character: '#4ade80',
  npc: '#facc15',
  enemy: '#ef4444',
}

interface ItemRendererProps {
  item: SceneItem
  isSelected?: boolean
  readOnly?: boolean
  showZones?: boolean
  onClick?: () => void
  onContextMenu?: (e: MouseEvent) => void
  mapScale?: number
  imageAspect?: number
  positionOverride?: [number, number, number]
  occluders?: import('@/lib/lightOcclusion').Occluder[]
}

export default function ItemRenderer({ item, isSelected, showZones = false, onClick, onContextMenu, mapScale = 1, imageAspect = 1, positionOverride, occluders }: ItemRendererProps) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    if (item.metadata.type === 'token') {
      groupRef.current.position.y = 0.6 * item.scale + Math.sin(state.clock.elapsedTime * 2 + item.x) * 0.04 * item.scale
    }
  })

  if (item.metadata.type === 'zone') {
    if (!showZones) return null
    return <ZoneRenderer item={item} isSelected={isSelected} onClick={onClick} onContextMenu={onContextMenu} mapScale={mapScale} />
  }

  if (item.metadata.type === 'fog') {
    return null
  }

  if (item.metadata.type === 'light') {
    return <LightRenderer item={item} isSelected={isSelected} onClick={onClick} onContextMenu={onContextMenu} mapScale={mapScale} positionOverride={positionOverride} occluders={occluders} />
  }

  if (item.metadata.type === 'wall' && item.shape?.type === 'line') {
    return <WallRenderer item={item} isSelected={isSelected} onClick={onClick} mapScale={mapScale} imageAspect={imageAspect} />
  }

  if (item.metadata.type === 'door' && item.shape?.type === 'line') {
    return <DoorRenderer item={item} isSelected={isSelected} onClick={onClick} />
  }

  if (item.shape) {
    return <ShapeRenderer item={item} isSelected={isSelected} onClick={onClick} />
  }

  if (item.image) {
    return (
      <group
        ref={groupRef}
        position={[item.x, 0, item.y]}
        rotation={[0, (item.rotation * Math.PI) / 180, 0]}
        scale={item.scale}
        onClick={(e) => { e.stopPropagation(); onClick?.() }}
        onContextMenu={(e) => { e.stopPropagation(); onContextMenu?.(e.nativeEvent) }}
      >
        <Billboard>
          <mesh>
            <circleGeometry args={[0.4, 32]} />
            <meshStandardMaterial map={undefined} color="#ffffff" transparent opacity={item.opacity ?? 1} />
          </mesh>
          {isSelected && (
            <mesh>
              <ringGeometry args={[0.42, 0.48, 32]} />
              <meshBasicMaterial color="#3b82f6" />
            </mesh>
          )}
        </Billboard>
        <Billboard position={[0, -0.6, 0]}>
          <Text fontSize={0.15} color="white" outlineWidth={0.02} outlineColor="black" anchorX="center" anchorY="top">
            {item.name}
          </Text>
        </Billboard>
      </group>
    )
  }

  // Default: colored circle based on metadata type
  const color = TOKEN_COLORS[item.metadata.type] ?? '#9ca3af'
  return (
    <group
      ref={groupRef}
      position={[item.x, 0, item.y]}
      rotation={[0, (item.rotation * Math.PI) / 180, 0]}
      scale={item.scale}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      onContextMenu={(e) => { e.stopPropagation(); onContextMenu?.(e.nativeEvent) }}
    >
      <Billboard>
        <mesh>
          <circleGeometry args={[0.4, 32]} />
          <meshStandardMaterial color={color} transparent opacity={item.opacity ?? 1} />
        </mesh>
        <Billboard position={[0, 0, 0.01]}>
          <Text fontSize={0.2} color="white" outlineWidth={0.03} outlineColor="black" anchorX="center" anchorY="middle">
            {item.name.slice(0, 2).toUpperCase()}
          </Text>
        </Billboard>
        {isSelected && (
          <mesh>
            <ringGeometry args={[0.42, 0.48, 32]} />
            <meshBasicMaterial color="#3b82f6" />
          </mesh>
        )}
      </Billboard>
      <Billboard position={[0, -0.6, 0]}>
        <Text fontSize={0.15} color="white" outlineWidth={0.02} outlineColor="black" anchorX="center" anchorY="top">
          {item.name}
        </Text>
      </Billboard>
    </group>
  )
}

const WALL_MATERIAL_COLORS: Record<string, string> = {
  stone: '#6b7280',
  wood: '#92400e',
  metal: '#64748b',
  glass: '#93c5fd',
  magic: '#a855f7',
}

function WallRenderer({ item, isSelected, onClick, onContextMenu, mapScale = 1, imageAspect = 1 }: ItemRendererProps) {
  const shape = item.shape as import('@core/domain/types').ItemShape & { type: 'line'; points: number[] }
  const meta = item.metadata as import('@core/domain/types').WallMetadata
  const color = WALL_MATERIAL_COLORS[meta.material] ?? '#6b7280'

  const mapHeight = 10 * mapScale
  const mapWidth = mapHeight * imageAspect

  const sx = (shape.points[0] - 0.5) * mapWidth
  const sy = (shape.points[1] - 0.5) * mapHeight
  const ex = (shape.points[2] - 0.5) * mapWidth
  const ey = (shape.points[3] - 0.5) * mapHeight

  const start = new THREE.Vector3(sx, 0.05, sy)
  const end = new THREE.Vector3(ex, 0.05, ey)
  const dir = new THREE.Vector3().subVectors(end, start)
  const length = dir.length()
  const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  const angle = Math.atan2(dir.x, dir.z)

  const height = (meta.height / 10) * item.scale
  const thickness = (meta.thickness / 100) * item.scale

  return (
    <group position={[center.x, 0, center.z]} rotation={[0, angle, 0]}>
      <mesh
        position={[0, height / 2, 0]}
        onClick={(e) => { e.stopPropagation(); onClick?.() }}
        onContextMenu={(e) => { e.stopPropagation(); onContextMenu?.(e.nativeEvent) }}
      >
        <boxGeometry args={[thickness, height, length]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.3 : 0.12}
          side={THREE.DoubleSide}
        />
      </mesh>
      {isSelected && (
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[thickness + 0.05, height + 0.05, length + 0.05]} />
          <meshBasicMaterial color="#3b82f6" wireframe />
        </mesh>
      )}
    </group>
  )
}

const DOOR_COLORS: Record<string, string> = {
  wood: '#b45309',
  metal: '#475569',
  glass: '#60a5fa',
  magic: '#c084fc',
}

function DoorRenderer({ item, isSelected, onClick }: ItemRendererProps) {
  const shape = item.shape as import('@core/domain/types').ItemShape & { type: 'line'; points: number[] }
  const meta = item.metadata as import('@core/domain/types').DoorMetadata
  const color = DOOR_COLORS[meta.material] ?? '#b45309'
  const isOpen = meta.state === 'open'
  const isLocked = meta.state === 'locked'

  const start = new THREE.Vector3(shape.points[0], 0.05, shape.points[1])
  const end = new THREE.Vector3(shape.points[2], 0.05, shape.points[3])
  const dir = new THREE.Vector3().subVectors(end, start)
  const length = dir.length()
  const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  const angle = Math.atan2(dir.x, dir.z)

  const height = 0.7 * item.scale
  const thickness = 0.08 * item.scale

  return (
    <group position={[center.x, 0, center.z]} rotation={[0, angle, 0]}>
      <mesh
        position={[0, height / 2, 0]}
        onClick={(e) => { e.stopPropagation(); onClick?.() }}
      >
        <boxGeometry args={[thickness, height, isOpen ? 0.05 : length]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={isOpen ? 0.3 : 0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      {isLocked && (
        <mesh position={[0, height * 0.6, isOpen ? 0 : length / 2]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#eab308" />
        </mesh>
      )}
      {isSelected && (
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[thickness + 0.05, height + 0.05, (isOpen ? 0.05 : length) + 0.05]} />
          <meshBasicMaterial color="#3b82f6" wireframe />
        </mesh>
      )}
    </group>
  )
}

function ShapeRenderer({ item, isSelected, onClick }: ItemRendererProps) {
  const shape = item.shape!
  const color = shape.type === 'line' ? shape.stroke : 'fill' in shape ? shape.fill : '#ffffff'

  if (shape.type === 'rectangle') {
    return (
      <group position={[item.x, 0.02, item.y]} rotation={[0, (item.rotation * Math.PI) / 180, 0]}>
        <mesh onClick={(e) => { e.stopPropagation(); onClick?.() }}>
          <planeGeometry args={[item.width, item.height]} />
          <meshStandardMaterial color={color} transparent opacity={item.opacity ?? 0.8} side={THREE.DoubleSide} />
        </mesh>
        {isSelected && (
          <mesh position={[0, 0.01, 0]}>
            <planeGeometry args={[item.width + 0.05, item.height + 0.05]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    )
  }

  if (shape.type === 'ellipse') {
    return (
      <group position={[item.x, 0.02, item.y]} rotation={[0, (item.rotation * Math.PI) / 180, 0]}>
        <mesh onClick={(e) => { e.stopPropagation(); onClick?.() }}>
          <circleGeometry args={[item.width / 2, 32]} />
          <meshStandardMaterial color={color} transparent opacity={item.opacity ?? 0.8} side={THREE.DoubleSide} />
        </mesh>
        {isSelected && (
          <mesh position={[0, 0.01, 0]}>
            <ringGeometry args={[item.width / 2, item.width / 2 + 0.05, 32]} />
            <meshBasicMaterial color="#3b82f6" />
          </mesh>
        )}
      </group>
    )
  }

  if (shape.type === 'line') {
    const points = shape.points.reduce<THREE.Vector3[]>((acc, v, i) => {
      if (i % 2 === 0) {
        acc.push(new THREE.Vector3(v, 0.03, shape.points[i + 1] ?? 0))
      }
      return acc
    }, [])

    const geo = new THREE.BufferGeometry().setFromPoints(points)
    return (
      <group position={[item.x, 0, item.y]}>
        <lineSegments geometry={geo} onClick={(e) => { e.stopPropagation(); onClick?.() }}>
          <lineBasicMaterial color={shape.stroke} linewidth={shape.strokeWidth} />
        </lineSegments>
      </group>
    )
  }

  if (shape.type === 'text') {
    return (
      <group position={[item.x, 0.03, item.y]} rotation={[0, (item.rotation * Math.PI) / 180, 0]}>
        <Billboard>
          <Text
            fontSize={shape.fontSize}
            color={shape.color}
            anchorX="center"
            anchorY="middle"
            onClick={(e) => { e.stopPropagation(); onClick?.() }}
          >
            {shape.text}
          </Text>
        </Billboard>
      </group>
    )
  }

  return null
}

function ZoneRenderer({ item, isSelected, onClick, onContextMenu, mapScale = 1 }: ItemRendererProps) {
  const meta = item.metadata as ZoneMetadata
  const mapHeight = 10 * mapScale
  const mapWidth = mapHeight

  const groupPos = [item.x, 0, item.y] as const
  const fillY = 0.02
  const outlineY = 0.035

  const portalNodes = useMemo(() => {
    const nodes: { points: THREE.Vector3[]; color: string }[] = []
    for (const portal of meta.portals ?? []) {
      const color = PORTAL_COLORS[portal.state]
      const a = portal.localEdge[0]
      const b = portal.localEdge[1]
      const pts = [
        new THREE.Vector3((a.x - 0.5) * mapWidth, 0.06, (a.y - 0.5) * mapHeight),
        new THREE.Vector3((b.x - 0.5) * mapWidth, 0.06, (b.y - 0.5) * mapHeight),
      ]
      const midX = ((a.x + b.x) / 2 - 0.5) * mapWidth
      const midY = ((a.y + b.y) / 2 - 0.5) * mapHeight
      pts.push(new THREE.Vector3(midX, 0.045, midY), new THREE.Vector3(midX, 0.075, midY))
      nodes.push({ points: pts, color })
    }
    return nodes
  }, [meta.portals, mapWidth, mapHeight])

  if (item.shape?.type === 'rectangle') {
    const hw = item.width / 2
    const hh = item.height / 2
    const outline = [
      new THREE.Vector3(-hw, outlineY, -hh),
      new THREE.Vector3(hw, outlineY, -hh),
      new THREE.Vector3(hw, outlineY, hh),
      new THREE.Vector3(-hw, outlineY, hh),
      new THREE.Vector3(-hw, outlineY, -hh),
    ]
    const outlineGeo = new THREE.BufferGeometry().setFromPoints(outline)
    return (
      <group position={groupPos} rotation={[0, (item.rotation * Math.PI) / 180, 0]}>
        <mesh onClick={(e) => { e.stopPropagation(); onClick?.() }}
          onContextMenu={(e) => { e.stopPropagation(); onContextMenu?.(e.nativeEvent) }}>
          <planeGeometry args={[item.width, item.height]} />
          <meshBasicMaterial color={meta.fillColor} transparent opacity={meta.fillOpacity} side={THREE.DoubleSide} />
        </mesh>
        <lineSegments geometry={outlineGeo}>
          <lineBasicMaterial color={meta.fillColor} linewidth={2} />
        </lineSegments>
        <ZonePortalMarkers nodes={portalNodes} />
        {isSelected && (
          <mesh position={[0, 0.01, 0]}>
            <planeGeometry args={[item.width + 0.05, item.height + 0.05]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    )
  }

  const shape = item.shape as import('@core/domain/types').ShapePolygon
  const handleClick = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    onClick?.()
  }, [onClick])
  const handleContextMenu = useCallback((e: { stopPropagation: () => void; nativeEvent: MouseEvent }) => {
    e.stopPropagation()
    onContextMenu?.(e.nativeEvent)
  }, [onContextMenu])
  const { geometry, outlineGeo } = useMemo(() => {
    const verts: THREE.Vector2[] = []
    const world: THREE.Vector3[] = []
    for (let i = 0; i + 1 < shape.points.length; i += 2) {
      const nx = shape.points[i]
      const ny = shape.points[i + 1]
      const wx = (nx - 0.5) * mapWidth - item.x
      const wz = (ny - 0.5) * mapHeight - item.y
      verts.push(new THREE.Vector2(wx, -wz))
      world.push(new THREE.Vector3(wx, outlineY, wz))
    }
    const shape3 = new THREE.Shape(verts)
    const geo = new THREE.ShapeGeometry(shape3, 4)
    const outlinePts: THREE.Vector3[] = []
    for (let i = 0; i < world.length; i++) {
      outlinePts.push(world[i], world[(i + 1) % world.length])
    }
    const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePts)
    return { geometry: geo, outlineGeo }
  }, [shape, mapWidth, mapHeight, item.x, item.y])

  return (
    <group position={groupPos}>
      <mesh geometry={geometry} position={[0, fillY, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={handleClick} onContextMenu={handleContextMenu}>
        <meshBasicMaterial color={meta.fillColor} transparent opacity={meta.fillOpacity} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={outlineGeo}>
        <lineBasicMaterial color={meta.fillColor} linewidth={2} />
      </lineSegments>
      <ZonePortalMarkers nodes={portalNodes} />
      {isSelected && (
        <lineSegments geometry={outlineGeo} position={[0, 0.01, 0]}>
          <lineBasicMaterial color="#3b82f6" linewidth={3} />
        </lineSegments>
      )}
    </group>
  )
}

function ZonePortalMarkers({ nodes }: { nodes: { points: THREE.Vector3[]; color: string }[] }) {
  return (
    <group>
      {nodes.map((node, i) => (
        <lineSegments key={i} geometry={new THREE.BufferGeometry().setFromPoints(node.points)}>
          <lineBasicMaterial color={node.color} linewidth={3} />
        </lineSegments>
      ))}
    </group>
  )
}

function LightRenderer({ item, isSelected, onClick, onContextMenu, mapScale = 1, positionOverride, occluders }: ItemRendererProps) {
  const meta = item.metadata as LightMetadata
  const source = normalizeLightConfig(meta.source)
  const mapHeight = 10 * mapScale
  const radians = (deg: number) => (deg * Math.PI) / 180
  const attached = !!meta.attachedTo

  const glowOpacity = lightGlowOpacity(meta)

  const glowTexture = useMemo(() => {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    const zones = computeLightZones(source)
    const brightRatio = Math.min(1, Math.max(0.02, zones.brightRadius / Math.max(1e-6, zones.radius)))
    const dimRatio = Math.min(1, Math.max(brightRatio, zones.dimRadius / Math.max(1e-6, zones.radius)))
    if (source.mode === 'hard') {
      grad.addColorStop(0, hexToRgba(source.color, 0.75))
      grad.addColorStop(brightRatio * 0.9, hexToRgba(source.color, 0.45))
      grad.addColorStop(brightRatio, hexToRgba(source.color, 0))
      grad.addColorStop(1, hexToRgba(source.color, 0))
    } else {
      grad.addColorStop(0, hexToRgba(source.color, 0.7))
      grad.addColorStop(brightRatio, hexToRgba(source.color, 0.5))
      grad.addColorStop(dimRatio, hexToRgba(source.color, 0.15))
      grad.addColorStop(1, hexToRgba(source.color, 0))
    }
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [source.color, source.mode, source.radius, source.falloff])

  const sectorGeometry = useMemo(() => {
    if (source.mode !== 'directional' || !source.angle) return null
    const half = source.angle / 2
    const pts: [number, number][] = [[0, 0]]
    const N = 24
    for (let i = 0; i <= N; i++) {
      const a = radians(source.direction! - half + (i / N) * source.angle)
      pts.push([Math.cos(a) * source.radius * mapHeight, Math.sin(a) * source.radius * mapHeight])
    }
    const shape = new THREE.Shape()
    shape.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1])
    const geo = new THREE.ShapeGeometry(shape, 4)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [source.mode, source.angle, source.direction, source.radius, mapHeight])

  const ringRadius = source.radius * mapHeight
  const y = 0.045
  const lightOx = (positionOverride?.[0] ?? item.x)
  const lightOz = (positionOverride?.[2] ?? item.y)

  const occludedGeometry = useMemo(() => {
    if (!occluders || occluders.length === 0) return null
    const pts = lightShapePoints(
      lightOx,
      lightOz,
      ringRadius,
      source.mode === 'directional' ? (source.direction ?? 0) : null,
      source.angle ?? 90,
      occluders,
    )
    const shape = new THREE.Shape()
    shape.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1])
    const geo = new THREE.ShapeGeometry(shape, 1)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [occluders, lightOx, lightOz, ringRadius, source.mode, source.direction, source.angle])

  const halo = (() => {
    if (occludedGeometry) {
      return (
        <mesh geometry={occludedGeometry} position={[0, y, 0]}>
          <meshBasicMaterial
            map={glowTexture}
            transparent
            opacity={glowOpacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )
    }
    if (source.mode === 'directional' && sectorGeometry) {
      return (
        <mesh geometry={sectorGeometry} position={[0, y, 0]}>
          <meshBasicMaterial
            map={glowTexture}
            transparent
            opacity={glowOpacity}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )
    }
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
        <circleGeometry args={[ringRadius, 32]} />
        <meshBasicMaterial
          map={glowTexture}
          transparent
          opacity={glowOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    )
  })()

  return (
    <group
      position={positionOverride ?? [item.x, 0, item.y]}
      rotation={[0, source.direction || 0, 0]}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      onContextMenu={(e) => { e.stopPropagation(); onContextMenu?.(e.nativeEvent) }}
    >
      {halo}
      {source.mode !== 'directional' && (
        <LineLoopPoints radius={ringRadius} position={y} />
      )}
      {attached && (
        <mesh position={[0, 0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.11, 0.15, 32]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial
          color="#000000"
          emissive={new THREE.Color(source.color)}
          emissiveIntensity={0.9 * source.intensity + 0.3}
        />
      </mesh>
      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ringRadius - 0.03, ringRadius + 0.03, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

function LineLoopPoints({ radius, position = 0 }: { radius: number; position?: number }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius))
    }
    return pts
  }, [radius])
  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points])
  return <lineSegments geometry={geo} position={[0, position, 0]}><lineBasicMaterial color="#ffffff" transparent opacity={0.5} /></lineSegments>
}
