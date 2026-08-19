import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

const TOKEN_COLORS: Record<string, string> = {
  character: '#4ade80',
  npc: '#facc15',
  enemy: '#ef4444',
};

interface TokenSpriteProps {
  name: string;
  type: string;
  position: [number, number, number];
  portraitUrl?: string | null;
}

export default function TokenSprite({ name, type, position, portraitUrl }: TokenSpriteProps) {
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
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(clock.elapsedTime * 2 + position[0]) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        {texture ? (
          <>
            <mesh position={[0, 0.6, 0]}>
              <circleGeometry args={[0.4, 32]} />
              <meshStandardMaterial map={texture} />
            </mesh>
          </>
        ) : (
          <>
            <mesh position={[0, 0.6, 0]}>
              <circleGeometry args={[0.4, 32]} />
              <meshStandardMaterial color={color} />
            </mesh>
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
          </>
        )}
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
      </Billboard>
    </group>
  );
}
