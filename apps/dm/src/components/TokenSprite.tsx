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
  onPointerDown?: (e: THREE.Event, id: string) => void;
}

export default function TokenSprite({
  id,
  name,
  type,
  position,
  portraitUrl,
  isSelected,
  isDragging,
  onPointerDown,
}: TokenSpriteProps) {
  const groupRef = useRef<THREE.Group>(null);
  const color = TOKEN_COLORS[type] || '#94a3b8';
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const texture = useMemo(() => {
    if (!portraitUrl) return null;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(portraitUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [portraitUrl]);

  useFrame(({ clock }) => {
    if (groupRef.current && !isDragging) {
      groupRef.current.position.y = position[1] + Math.sin(clock.elapsedTime * 2 + position[0]) * 0.05;
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
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'grab'; }}
          onPointerOut={() => { document.body.style.cursor = 'auto'; }}
        >
          {texture ? (
            <mesh position={[0, 0.6, 0]}>
              <circleGeometry args={[0.4, 32]} />
              <meshStandardMaterial map={texture} />
            </mesh>
          ) : (
            <mesh position={[0, 0.6, 0]}>
              <circleGeometry args={[0.4, 32]} />
              <meshStandardMaterial color={color} />
            </mesh>
          )}
          {!texture && (
            <Text
              position={[0, 0.6, 0.01]}
              fontSize={0.3}
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
          fontSize={0.15}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {name}
        </Text>
        {isSelected && (
          <mesh position={[0, 0.6, -0.01]}>
            <ringGeometry args={[0.42, 0.48, 32]} />
            <meshBasicMaterial color="#60a5fa" />
          </mesh>
        )}
      </Billboard>
    </group>
  );
}
