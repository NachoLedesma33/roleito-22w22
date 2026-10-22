import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { SceneItem, ZoneMetadata, RoomMetadata, LightMetadata } from '@core/domain/types'
import { isPendingReview } from '@/lib/pendingReview'
import { PORTAL_COLORS } from './ZonePortal'
import { normalizeLightConfig, lightGlowOpacity, hexToRgba, computeLightZones, animateLightIntensity } from '../lib/light'
import { lightShapePoints } from '../lib/lightOcclusion'
import { remapGlowUv } from '../lib/lightGlow'
import { RenderMode, DEFAULT_RENDER_MODE, getY } from '../lib/overlayY'

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
  /**
   * Las posiciones vivas de los tokens (la interpolacion a 60 fps).
   *
   * La luz pegada a un token tiene que seguirlo EN VIVO: la posicion del
   * estado de React llega cada ~2 s (el poll de la revision), asi que con
   * solo `positionOverride` la luz se quedaba en el lugar donde estaba el
   * token hace dos segundos ✗. Con este mapa, la luz lee la posicion
   * interpolada del token en cada frame ✓.
   */
  livePositions?: React.RefObject<Map<string, { x: number; z: number; rotation: number }>>
  rotationOverride?: number
  occluders?: import('@/lib/lightOcclusion').Occluder[]
  renderMode?: RenderMode
}

export default function ItemRenderer({ item, isSelected, readOnly = false, showZones = false, onClick, onContextMenu, mapScale = 1, imageAspect = 1, positionOverride, rotationOverride, occluders, livePositions, renderMode = DEFAULT_RENDER_MODE }: ItemRendererProps) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    if (item.metadata.type === 'token') {
      groupRef.current.position.y = 0.6 * item.scale + Math.sin(state.clock.elapsedTime * 2 + item.x) * 0.04 * item.scale
    }
  })

  if (item.metadata.type === 'zone') {
    if (!showZones) return null
    return <ZoneRenderer item={item} isSelected={isSelected} onClick={onClick} onContextMenu={onContextMenu} mapScale={mapScale} imageAspect={imageAspect} readOnly={readOnly} renderMode={renderMode} />
  }

  if (item.metadata.type === 'room') {
    return <RoomRenderer item={item} isSelected={isSelected} onClick={onClick} onContextMenu={onContextMenu} mapScale={mapScale} imageAspect={imageAspect} readOnly={readOnly} renderMode={renderMode} />
  }

  if (item.metadata.type === 'fog') {
    if (item.shape?.type !== 'polygon') return null
    return <FogHitRegion item={item} isSelected={isSelected} onClick={onClick} onContextMenu={onContextMenu} mapScale={mapScale} imageAspect={imageAspect} renderMode={renderMode} />
  }

  if (item.metadata.type === 'light') {
    return <LightRenderer item={item} isSelected={isSelected} onClick={onClick} onContextMenu={onContextMenu} mapScale={mapScale} positionOverride={positionOverride} rotationOverride={rotationOverride} occluders={occluders} livePositions={livePositions} readOnly={readOnly} renderMode={renderMode} />
  }

  if (item.metadata.type === 'wall' && item.shape?.type === 'line') {
    return <WallRenderer item={item} isSelected={isSelected} onClick={onClick} mapScale={mapScale} imageAspect={imageAspect} renderMode={renderMode} />
  }

  if (item.metadata.type === 'door' && item.shape?.type === 'line') {
    return <DoorRenderer item={item} isSelected={isSelected} onClick={onClick} renderMode={renderMode} />
  }

  if (item.shape) {
    return <ShapeRenderer item={item} isSelected={isSelected} onClick={onClick} renderMode={renderMode} />
  }

  if (item.metadata.type === 'image') {
    return <ImageSprite item={item} isSelected={isSelected} onClick={onClick} onContextMenu={onContextMenu} />
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

function ImageSprite({ item, isSelected, onClick, onContextMenu }: { item: SceneItem; isSelected?: boolean; onClick?: () => void; onContextMenu?: (e: MouseEvent) => void }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const [aspect, setAspect] = useState(1)

  useEffect(() => {
    if (!item.image) return
    let alive = true
    const tex = new THREE.TextureLoader().load(item.image, (t) => {
      if (!alive) return
      t.colorSpace = THREE.SRGBColorSpace
      const img = t.image as { width?: number; height?: number } | undefined
      if (img && img.width && img.height) setAspect(img.width / img.height)
      setTexture(t)
    })
    return () => {
      alive = false
      tex.dispose()
    }
  }, [item.image])

  return (
    <group
      position={[item.x, 0, item.y]}
      rotation={[0, (item.rotation * Math.PI) / 180, 0]}
      scale={item.scale}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      onContextMenu={(e) => { e.stopPropagation(); onContextMenu?.(e.nativeEvent) }}
    >
      <Billboard>
        <mesh>
          {texture ? <planeGeometry args={[1, 1 / aspect]} /> : <circleGeometry args={[0.4, 32]} />}
          <meshBasicMaterial map={texture ?? undefined} color="#ffffff" transparent opacity={item.opacity ?? 1} side={THREE.DoubleSide} toneMapped={false} />
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

function WallRenderer({ item, isSelected, onClick, onContextMenu, mapScale = 1, imageAspect = 1, renderMode = DEFAULT_RENDER_MODE }: ItemRendererProps) {
  const shape = item.shape as import('@core/domain/types').ItemShape & { type: 'line'; points: number[] }
  const meta = item.metadata as import('@core/domain/types').WallMetadata
  // Un muro propuesto (pendingReview) se dibuja en ambar y mas opaco: el DM
  // tiene que ver de un vistazo que es una propuesta y no geometria aprobada.
  const pending = isPendingReview(item)
  const color = pending ? '#f59e0b' : (WALL_MATERIAL_COLORS[meta.material] ?? '#6b7280')
  // La opacidad del metadata manda (antes era 0.12 fijo y el flag no hacia nada).
  const baseOpacity = meta.opacity ?? 0.12
  const Y = getY(renderMode)

  const mapHeight = 10 * mapScale
  const mapWidth = mapHeight * imageAspect

  const sx = (shape.points[0] - 0.5) * mapWidth
  const sy = (shape.points[1] - 0.5) * mapHeight
  const ex = (shape.points[2] - 0.5) * mapWidth
  const ey = (shape.points[3] - 0.5) * mapHeight

  const start = new THREE.Vector3(sx, Y.wallFootprint, sy)
  const end = new THREE.Vector3(ex, Y.wallFootprint, ey)
  const dir = new THREE.Vector3().subVectors(end, start)
  const length = dir.length()
  const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  const angle = Math.atan2(dir.x, dir.z)

  const height = renderMode === '2d' ? Y.wallHeight : (meta.height / 10) * item.scale
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
          opacity={isSelected ? 0.3 : (pending ? Math.max(0.45, baseOpacity) : baseOpacity)}
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

function DoorRenderer({ item, isSelected, onClick, renderMode = DEFAULT_RENDER_MODE }: ItemRendererProps) {
  const shape = item.shape as import('@core/domain/types').ItemShape & { type: 'line'; points: number[] }
  const meta = item.metadata as import('@core/domain/types').DoorMetadata
  const color = DOOR_COLORS[meta.material] ?? '#b45309'
  const isOpen = meta.state === 'open'
  const isLocked = meta.state === 'locked'
  const Y = getY(renderMode)

  const start = new THREE.Vector3(shape.points[0], Y.wallFootprint, shape.points[1])
  const end = new THREE.Vector3(shape.points[2], Y.wallFootprint, shape.points[3])
  const dir = new THREE.Vector3().subVectors(end, start)
  const length = dir.length()
  const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  const angle = Math.atan2(dir.x, dir.z)

  const height = renderMode === '2d' ? Y.wallHeight : 0.7 * item.scale
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

function ShapeRenderer({ item, isSelected, onClick, renderMode = DEFAULT_RENDER_MODE }: ItemRendererProps) {
  const shape = item.shape!
  const color = shape.type === 'line' ? shape.stroke : 'fill' in shape ? shape.fill : '#ffffff'
  const Y = getY(renderMode)
  const flatY = renderMode === '2d' ? Y.zoneFill : 0.02

  if (shape.type === 'rectangle') {
    return (
      <group position={[item.x, flatY, item.y]} rotation={[0, (item.rotation * Math.PI) / 180, 0]}>
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
      <group position={[item.x, flatY, item.y]} rotation={[0, (item.rotation * Math.PI) / 180, 0]}>
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
    const lineY = renderMode === '2d' ? Y.zoneFill : 0.03
    const points = shape.points.reduce<THREE.Vector3[]>((acc, v, i) => {
      if (i % 2 === 0) {
        acc.push(new THREE.Vector3(v, lineY, shape.points[i + 1] ?? 0))
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
      <group position={[item.x, renderMode === '2d' ? Y.zoneFill : 0.03, item.y]} rotation={[0, (item.rotation * Math.PI) / 180, 0]}>
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

function ZoneRenderer({ item, isSelected, onClick, onContextMenu, mapScale = 1, imageAspect = 1, readOnly = false, renderMode = DEFAULT_RENDER_MODE }: ItemRendererProps) {
  const meta = item.metadata as ZoneMetadata
  const mapHeight = 10 * mapScale
  const mapWidth = mapHeight * imageAspect
  const Y = getY(renderMode)

  /**
   * Para el jugador la zona es solo el perimetro. El relleno de color lo que
   * hace es tapar el mapa: seis tonos (emerald/sky/amber/violet/rose/slate) que
   * el DM elige para distinguir sus zonas terminan siendo decoracion que el
   * jugador no pidio. Lo unico que tiene que tapar de verdad es la niebla.
   */
  const fillOpacity = readOnly ? 0 : meta.fillOpacity
  const strokeColor = readOnly ? '#cbd5e1' : meta.fillColor
  const strokeOpacity = readOnly ? 0.35 : 1

  const groupPos = [item.x, 0, item.y] as const
  const fillY = Y.zoneFill
  const outlineY = Y.zoneOutline

  const portalNodes = useMemo(() => {
    const nodes: { points: THREE.Vector3[]; color: string }[] = []
    for (const portal of meta.portals ?? []) {
      const color = PORTAL_COLORS[portal.state]
      const a = portal.localEdge[0]
      const b = portal.localEdge[1]
      const pts = [
        new THREE.Vector3((a.x - 0.5) * mapWidth, Y.portal, (a.y - 0.5) * mapHeight),
        new THREE.Vector3((b.x - 0.5) * mapWidth, Y.portal, (b.y - 0.5) * mapHeight),
      ]
      const midX = ((a.x + b.x) / 2 - 0.5) * mapWidth
      const midY = ((a.y + b.y) / 2 - 0.5) * mapHeight
      pts.push(new THREE.Vector3(midX, Y.portalBarMid, midY), new THREE.Vector3(midX, Y.portalBarHigh, midY))
      nodes.push({ points: pts, color })
    }
    return nodes
  }, [meta.portals, mapWidth, mapHeight, Y])

  const handleClick = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    onClick?.()
  }, [onClick])

  const handleContextMenu = useCallback((e: { stopPropagation: () => void; nativeEvent: MouseEvent }) => {
    e.stopPropagation()
    onContextMenu?.(e.nativeEvent)
  }, [onContextMenu])

  const polygon = useMemo(() => {
    const shape = item.shape as import('@core/domain/types').ShapePolygon
    if (shape?.type !== 'polygon') return null
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
  }, [item.shape, item.x, item.y, mapWidth, mapHeight, outlineY])

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
          <meshBasicMaterial color={meta.fillColor} transparent opacity={fillOpacity} side={THREE.DoubleSide} />
        </mesh>
        <lineSegments geometry={outlineGeo}>
          <lineBasicMaterial color={strokeColor} transparent opacity={strokeOpacity} />
        </lineSegments>
        {readOnly ? null : <ZonePortalMarkers nodes={portalNodes} />}
        {isSelected && (
          <mesh position={[0, 0.01, 0]}>
            <planeGeometry args={[item.width + 0.05, item.height + 0.05]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    )
  }

  if (!polygon) return null
  const { geometry, outlineGeo } = polygon

  return (
    <group position={groupPos}>
      <mesh geometry={geometry} position={[0, fillY, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={handleClick} onContextMenu={handleContextMenu}>
        <meshBasicMaterial color={meta.fillColor} transparent opacity={fillOpacity} side={THREE.DoubleSide} />
      </mesh>
      <lineSegments geometry={outlineGeo}>
        <lineBasicMaterial color={strokeColor} transparent opacity={strokeOpacity} />
      </lineSegments>
      {readOnly ? null : <ZonePortalMarkers nodes={portalNodes} />}
      {isSelected && (
        <lineSegments geometry={outlineGeo} position={[0, 0.01, 0]}>
          <lineBasicMaterial color="#3b82f6" />
        </lineSegments>
      )}
    </group>
  )
}

/**
 * Una sala detectada: el poligono de la habitacion y su nombre.
 *
 * El jugador NO la ve: es una herramienta del DM para organizar el mapa (la
 * forma y el nombre ya estan en la imagen de fondo). Tampoco bloquea: las
 * zonas son las que bloquean el movimiento, no las salas.
 */
function RoomRenderer({ item, isSelected, onClick, onContextMenu, mapScale = 1, imageAspect = 1, readOnly = false, renderMode = DEFAULT_RENDER_MODE }: ItemRendererProps) {
  const meta = item.metadata as RoomMetadata
  const mapHeight = 10 * mapScale
  const mapWidth = mapHeight * imageAspect
  const Y = getY(renderMode)
  // Una sala propuesta se dibuja en ambar: es una propuesta, no una habitacion
  // que el DM ya acepto.
  const pending = isPendingReview(item)

  const room = useMemo(() => {
    const shape = item.shape as import('@core/domain/types').ShapePolygon
    if (shape?.type !== 'polygon' || shape.points.length < 6) return null
    const verts: THREE.Vector2[] = []
    const world: THREE.Vector3[] = []
    for (let i = 0; i + 1 < shape.points.length; i += 2) {
      const nx = shape.points[i]
      const ny = shape.points[i + 1]
      const wx = (nx - 0.5) * mapWidth - item.x
      const wz = (ny - 0.5) * mapHeight - item.y
      verts.push(new THREE.Vector2(wx, -wz))
      world.push(new THREE.Vector3(wx, Y.zoneOutline, wz))
    }
    const shape3 = new THREE.Shape(verts)
    const geometry = new THREE.ShapeGeometry(shape3, 4)
    const outlinePts: THREE.Vector3[] = []
    for (let i = 0; i < world.length; i++) {
      outlinePts.push(world[i], world[(i + 1) % world.length])
    }
    const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePts)
    // El centro del poligono, para poner el nombre.
    const cx = world.reduce((s, p) => s + p.x, 0) / world.length
    const cz = world.reduce((s, p) => s + p.z, 0) / world.length
    return { geometry, outlineGeo, center: [cx, cz] as const }
  }, [item.shape, item.x, item.y, mapWidth, mapHeight, Y])

  const handleClick = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    onClick?.()
  }, [onClick])

  const handleContextMenu = useCallback((e: { stopPropagation: () => void; nativeEvent: MouseEvent }) => {
    e.stopPropagation()
    onContextMenu?.(e.nativeEvent)
  }, [onContextMenu])

  if (readOnly || !room) return null
  const { geometry, outlineGeo, center } = room

  return (
    <group position={[item.x, 0, item.y]}>
      <mesh geometry={geometry} position={[0, Y.zoneFill, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={handleClick} onContextMenu={handleContextMenu}>
        <meshBasicMaterial color={pending ? '#f59e0b' : '#6366f1'} transparent opacity={pending ? 0.14 : 0.07} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <lineSegments geometry={outlineGeo}>
        <lineBasicMaterial color={pending ? '#fbbf24' : '#818cf8'} transparent opacity={pending ? 0.9 : 0.7} />
      </lineSegments>
      <Text
        position={[center[0], Y.zoneOutline + 0.05, center[1]]}
        fontSize={0.2}
        color={pending ? '#fcd34d' : '#c7d2fe'}
        outlineWidth={0.02}
        outlineColor="black"
        anchorX="center"
        anchorY="middle"
      >
        {meta.name}
      </Text>
      {isSelected && (
        <lineSegments geometry={outlineGeo} position={[0, 0.01, 0]}>
          <lineBasicMaterial color="#3b82f6" />
        </lineSegments>
      )}
    </group>
  )
}

function ZonePortalMarkers({ nodes }: { nodes: { points: THREE.Vector3[]; color: string }[] }) {  return (
    <group>
      {nodes.map((node, i) => (
        <lineSegments key={i} geometry={new THREE.BufferGeometry().setFromPoints(node.points)}>
          <lineBasicMaterial color={node.color} linewidth={3} />
        </lineSegments>
      ))}
    </group>
  )
}

/**
 * El halo (el "circulo de luz" que ve el DM) va por DEBAJO de la niebla (40 < 50)
 * en el POV del DM. En el POV del jugador no: alla la niebla es opaca sobre el
 * mapa, asi que un halo debajo queda tapado y el jugador no ve su luz ✗. Solo ve
 * el agujero de la mascara de percepcion, que se recalcula cada 80 ms -> la luz
 * "se quedaba atras".
 *
 * En el POV del jugador el halo va POR ENCIMA de la niebla (51): el jugador ve
 * el mismo circulo que el DM, y ese halo sigue al token en el mismo frame
 * (0 ms de desfase) ✓.
 */
const HALO_ORDER_DM = 40
const HALO_ORDER_PLAYER = 51

function LightRenderer({ item, isSelected, onClick, onContextMenu, mapScale = 1, positionOverride, rotationOverride, occluders, livePositions, readOnly = false, renderMode = DEFAULT_RENDER_MODE }: ItemRendererProps) {
  const haloOrder = readOnly ? HALO_ORDER_PLAYER : HALO_ORDER_DM

  const meta = item.metadata as LightMetadata
  const source = normalizeLightConfig(meta.source)
  const mapHeight = 10 * mapScale
  const radians = (deg: number) => (deg * Math.PI) / 180
  const attached = !!meta.attachedTo
  const attachedCone = attached && source.mode === 'directional'
  const geometryDirDeg = attachedCone ? 270 : (source.direction ?? 0)
  const groupRotY = attachedCone ? (rotationOverride ?? 0) : (source.direction || 0)
  const is2d = renderMode === '2d'
  const Y = getY(renderMode)

  const glowOpacity = lightGlowOpacity(meta)
  const groupRef = useRef<THREE.Group>(null)
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const orbMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const orbMarkerRef = useRef<THREE.MeshBasicMaterial>(null)
  const realLightRef = useRef<THREE.PointLight & THREE.SpotLight>(null)
  const coneTargetRef = useRef<THREE.Object3D>(null)

  // El cono direccional necesita un target: el spotLight apunta a un objeto
  // de la escena, no a unas coordenadas. El target es un hijo del grupo (asi
  // hereda la rotacion del token ✓) y esta en el -Z local (la direccion del
  // cono ✓).
  useEffect(() => {
    const light = realLightRef.current
    const target = coneTargetRef.current
    if (light && target && 'target' in light) {
      light.target = target
      target.updateMatrixWorld()
    }
  }, [source.mode])

  // Apply position imperatively, igual que DraggableToken: R3F puede saltear la
  // reconciliacion del array-prop `<group position={[...]}>`. Sin esto, una luz
  // pegada a un token se quedaba congelada en su posicion original mientras el
  // token se movia (el token si aplicaba su posicion por efecto). Corre en cada
  // render porque `positionOverride` es un array nuevo, lo que garantiza que la
  // luz quede siempre sincronizada con la posicion interpolada del token.
  useEffect(() => {
    if (!groupRef.current) return
    const p = positionOverride ?? [item.x, 0, item.y]
    groupRef.current.position.set(p[0], p[1], p[2])
    groupRef.current.rotation.y = groupRotY
  }, [positionOverride, item.x, item.y, groupRotY])

  useFrame((state) => {
    // La luz pegada sigue al token EN VIVO (la posicion interpolada), no a
    // la del estado de React (que llega cada ~2 s).
    if (attached && meta.attachedTo) {
      const live = livePositions?.current?.get(meta.attachedTo)
      if (live && groupRef.current) {
        groupRef.current.position.set(live.x, 0, live.z)
        if (attachedCone) groupRef.current.rotation.y = live.rotation
      }
    }
    const mat = haloMatRef.current
    if (!mat) return
    const mod = animateLightIntensity(source, state.clock.elapsedTime)
    mat.opacity = glowOpacity * mod
    const orb = orbMatRef.current
    if (orb) orb.emissiveIntensity = (0.9 * source.intensity + 0.3) * mod
    const marker = orbMarkerRef.current
    if (marker) marker.opacity = (0.9 * source.intensity + 0.3) * mod
    // La luz real (la que ilumina el mapa) parpadea con el mismo mod.
    const real = realLightRef.current
    if (real) real.intensity = 2.4 * source.intensity * mod
  })

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
      const a = radians(geometryDirDeg - half + (i / N) * source.angle)
      pts.push([Math.cos(a) * source.radius * mapHeight, Math.sin(a) * source.radius * mapHeight])
    }
    const shape = new THREE.Shape()
    shape.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1])
    const geo = new THREE.ShapeGeometry(shape, 4)
    geo.rotateX(-Math.PI / 2)
    remapGlowUv(geo, source.radius * mapHeight)
    return geo
  }, [source.mode, source.angle, geometryDirDeg, source.radius, mapHeight])

  const ringRadius = source.radius * mapHeight
  const y = Y.lightHalo
  const markerY = Y.lightMarker
  const lightOx = (positionOverride?.[0] ?? item.x)
  const lightOz = (positionOverride?.[2] ?? item.y)

  const occludedGeometry = useMemo(() => {
    if (!occluders || occluders.length === 0) return null
    const originX = attachedCone ? 0 : lightOx
    const originZ = attachedCone ? 0 : lightOz
    const localOccluders = attachedCone
      ? occluders.map((o) => ({
          a: [o.a[0] - lightOx, o.a[1] - lightOz] as [number, number],
          b: [o.b[0] - lightOx, o.b[1] - lightOz] as [number, number],
        }))
      : occluders
    const pts = lightShapePoints(
      originX,
      originZ,
      ringRadius,
      source.mode === 'directional' ? geometryDirDeg : null,
      source.angle ?? 90,
      localOccluders,
    )
    const shape = new THREE.Shape()
    shape.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1])
    const geo = new THREE.ShapeGeometry(shape, 1)
    geo.rotateX(-Math.PI / 2)
    remapGlowUv(geo, ringRadius)
    return geo
  }, [occluders, lightOx, lightOz, ringRadius, source.mode, geometryDirDeg, source.angle, attachedCone])

  const halo = (() => {
    if (occludedGeometry) {
      return (
        <mesh geometry={occludedGeometry} position={[0, y, 0]} renderOrder={haloOrder}>
          <meshBasicMaterial
            ref={haloMatRef}
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
        <mesh geometry={sectorGeometry} position={[0, y, 0]} renderOrder={haloOrder}>
          <meshBasicMaterial
            ref={haloMatRef}
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} renderOrder={haloOrder}>
        <circleGeometry args={[ringRadius, 32]} />
        <meshBasicMaterial
          ref={haloMatRef}
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
      ref={groupRef}
      position={positionOverride ?? [item.x, 0, item.y]}
      rotation={[0, groupRotY, 0]}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      onContextMenu={(e) => { e.stopPropagation(); onContextMenu?.(e.nativeEvent) }}
    >
      {/* La iluminacion REAL de la luz: hasta ahora el item de luz solo
          dibujaba un halo (un mesh) y no iluminaba nada del mapa, asi que el
          DM no veia la luz que le daba al jugador. Va dentro del grupo, asi
          que sigue al token (incluido el cono, que mira a donde mira el
          token ✓).

          En el POV del jugador (readOnly) NO se renderiza: alla la luz ya
          entra por la mascara de percepcion (FogOverlay) y el pointLight
          real solo competia con la niebla y quemaba GPU/RAM al pedo. */}
      {source.mode === 'directional' ? (
        <>
          <spotLight
            ref={realLightRef as React.RefObject<THREE.SpotLight>}
            color={source.color}
            position={[0, 0.1, 0]}
            angle={Math.min(((source.angle ?? 90) * Math.PI) / 180, Math.PI / 2)}
            penumbra={0.6}
            distance={ringRadius * 2}
            decay={2}
            intensity={2.4 * source.intensity}
          />
          <object3D ref={coneTargetRef} position={[0, 0, -1]} />
        </>
      ) : (
        <pointLight
          ref={realLightRef as React.RefObject<THREE.PointLight>}
          color={source.color}
          position={[0, 0.1, 0]}
          distance={ringRadius * 2}
          decay={2}
          intensity={2.4 * source.intensity}
        />
      )}
      {halo}
      {!readOnly && source.mode !== 'directional' && (
        <LineLoopPoints radius={ringRadius} position={Y.lightRing} />
      )}
      {!readOnly && attached && (
        <mesh position={[0, Y.lightAttachRing, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.11, 0.15, 32]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
      {!readOnly && (is2d ? (
        <mesh position={[0, markerY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.06, 0.09, 32]} />
          <meshBasicMaterial
            ref={orbMarkerRef}
            color={source.color}
            transparent
            opacity={0.9 * source.intensity + 0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : (
        <mesh position={[0, 0.15, 0]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial
            ref={orbMatRef}
            color="#000000"
            emissive={new THREE.Color(source.color)}
            emissiveIntensity={0.9 * source.intensity + 0.3}
          />
        </mesh>
      ))}
      {!readOnly && isSelected && (
        <mesh position={[0, Y.lightSelectionRing, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ringRadius - 0.03, ringRadius + 0.03, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )
}

function FogHitRegion({ item, isSelected, onClick, onContextMenu, mapScale = 1, imageAspect = 1, renderMode = DEFAULT_RENDER_MODE }: ItemRendererProps) {
  const shape = item.shape as import('@core/domain/types').ItemShape & { type: 'polygon'; points: number[] }
  const meta = item.metadata as import('@core/domain/types').FogMetadata
  const brushRadius = meta.brushRadius ?? null
  const mapHeight = 10 * mapScale
  const mapWidth = mapHeight * imageAspect
  const Y = getY(renderMode)

  /**
   * Trazo de pincel: `shape.points` es la línea central. Un `ShapeGeometry` de
   * eso da un polígono de área cero, o sea que sin esto el DM no podría
   * seleccionar ni borrar nada de lo que pintó con el pincel. `lineWidth` en
   * WebGL no engaña (siempre 1px), así que el área de click son discos: uno cada
   * `r * 0.6` normalizados, que es más fino que la malla de la rejilla de
   * visión sin dejar huecos.
   */
  const hitGeometry = useMemo(() => {
    if (brushRadius === null) {
      const s = new THREE.Shape()
      for (let i = 0; i + 1 < shape.points.length; i += 2) {
        const wx = (shape.points[i] - 0.5) * mapWidth
        const wz = (shape.points[i + 1] - 0.5) * mapHeight
        if (i === 0) s.moveTo(wx, -wz)
        else s.lineTo(wx, -wz)
      }
      s.closePath()
      const geo = new THREE.ShapeGeometry(s, 1)
      geo.rotateX(-Math.PI / 2)
      return [{ geo, cx: 0, cy: 0, r: 0 }]
    }
    const step = Math.max(0.01, brushRadius * 0.6)
    const discs: Array<{ geo: THREE.BufferGeometry; cx: number; cy: number; r: number }> = []
    const radiusWorld = brushRadius * mapWidth
    let prevX = shape.points[0]
    let prevY = shape.points[1]
    const push = (nx: number, ny: number) => {
      const dist = Math.hypot(nx - prevX, ny - prevY)
      const n = Math.max(1, Math.ceil(dist / step))
      for (let k = 1; k <= n; k++) {
        const cx = prevX + ((nx - prevX) * k) / n
        const cy = prevY + ((ny - prevY) * k) / n
        const g = new THREE.CircleGeometry(radiusWorld, 12)
        g.rotateX(-Math.PI / 2)
        discs.push({ geo: g, cx: (cx - 0.5) * mapWidth, cy: (cy - 0.5) * mapHeight, r: radiusWorld })
      }
      prevX = nx
      prevY = ny
    }
    for (let i = 2; i + 1 < shape.points.length; i += 2) push(shape.points[i], shape.points[i + 1])
    return discs
  }, [shape.points, brushRadius, mapWidth, mapHeight])

  useEffect(() => () => hitGeometry.forEach((d) => d.geo.dispose()), [hitGeometry])

  const outline = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i + 1 < shape.points.length; i += 2) {
      pts.push(new THREE.Vector3((shape.points[i] - 0.5) * mapWidth, Y.zoneOutline, (shape.points[i + 1] - 0.5) * mapHeight))
    }
    if (pts.length > 0) pts.push(pts[0])
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [shape.points, mapWidth, mapHeight, Y])

  return (
    <group
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      onContextMenu={(e) => { e.stopPropagation(); onContextMenu?.(e.nativeEvent) }}
    >
      {hitGeometry.map((d, i) => (
        <mesh key={i} geometry={d.geo} position={[d.cx, 0, d.cy]}>
          <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      {isSelected && brushRadius !== null && (
        <mesh position={[(shape.points[0] - 0.5) * mapWidth, Y.zoneOutline, (shape.points[1] - 0.5) * mapHeight]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[brushRadius * mapWidth, 24]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      )}
      {isSelected && (
        <lineSegments geometry={outline}>
          <lineBasicMaterial color="#3b82f6" />
        </lineSegments>
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
