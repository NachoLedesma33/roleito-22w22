import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { SceneItem } from '@core/domain/types'

const TOKEN_COLORS: Record<string, string> = {
  character: '#4ade80',
  npc: '#facc15',
  enemy: '#ef4444',
}

interface ItemRendererProps {
  item: SceneItem
  isSelected?: boolean
  onClick?: () => void
  onContextMenu?: (e: MouseEvent) => void
}

export default function ItemRenderer({ item, isSelected, onClick, onContextMenu }: ItemRendererProps) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    if (item.metadata.type === 'token') {
      groupRef.current.position.y = 0.6 * item.scale + Math.sin(state.clock.elapsedTime * 2 + item.x) * 0.04 * item.scale
    }
  })

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
