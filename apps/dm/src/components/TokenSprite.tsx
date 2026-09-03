import { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

const TOKEN_COLORS: Record<string, string> = {
  character: '#4ade80',
  npc: '#facc15',
  enemy: '#ef4444',
};

interface TokenSpriteProps {
  id: string;
  name: string;
  type: string;
  position: [number, number, number];
  portraitUrl?: string | null;
  isSelected?: boolean;
  isDragging?: boolean;
  tokenScale?: number;
  onPointerDown?: (e: THREE.Event, id: string) => void;
  onContextMenu?: (e: THREE.Event) => void;
}

export default function TokenSprite({
  id,
  name,
  type,
  position,
  portraitUrl,
  isSelected,
  isDragging,
  tokenScale = 1,
  onPointerDown,
  onContextMenu,
}: TokenSpriteProps) {
  const groupRef = useRef<THREE.Group>(null);
  const color = TOKEN_COLORS[type] || '#94a3b8';
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const radius = 0.4 * tokenScale;
  const fontSize = 0.3 * tokenScale;
  const nameFontSize = 0.15 * tokenScale;

  const texture = useMemo(() => {
    if (!portraitUrl) return null;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(portraitUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [portraitUrl]);

  useFrame(({ clock }) => {
    if (groupRef.current && !isDragging) {
      groupRef.current.position.y = position[1] + 0.6 * tokenScale + Math.sin(clock.elapsedTime * 2 + position[0]) * 0.04 * tokenScale;
    }
  });

  const handlePointerDown = useCallback(
    (e: THREE.Event) => {
      onPointerDown?.(e, id);
    },
    [onPointerDown, id]
  );

  return (
    <group ref={groupRef} position={position}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <group
          onPointerDown={handlePointerDown}
          onContextMenu={(e) => onContextMenu?.(e)}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'grab'; }}
          onPointerOut={() => { document.body.style.cursor = 'auto'; }}
        >
          {texture ? (
            <mesh position={[0, 0.6 * tokenScale, 0]}>
              <circleGeometry args={[radius, 32]} />
              <meshStandardMaterial map={texture} emissiveMap={texture} emissive={new THREE.Color(0xffffff)} emissiveIntensity={0.3} />
            </mesh>
          ) : (
            <mesh position={[0, 0.6 * tokenScale, 0]}>
              <circleGeometry args={[radius, 32]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
            </mesh>
          )}
          {!texture && (
            <Text
              position={[0, 0.6 * tokenScale, 0.01]}
              fontSize={fontSize}
              color="#000000"
              anchorX="center"
              anchorY="middle"
              fontWeight="bold"
            >
              {initials}
            </Text>
          )}
        </group>
        <Text
          position={[0, 0.05, 0]}
          fontSize={nameFontSize}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02 * tokenScale}
          outlineColor="#000000"
        >
          {name}
        </Text>
        {isSelected && (
          <mesh position={[0, 0.6 * tokenScale, -0.01]}>
            <ringGeometry args={[radius + 0.02, radius + 0.08, 32]} />
            <meshBasicMaterial color="#60a5fa" />
          </mesh>
        )}
      </Billboard>
    </group>
  );
}
