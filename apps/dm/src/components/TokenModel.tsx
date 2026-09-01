import { useRef, useCallback, memo } from 'react';
import { Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface TokenModelProps {
  id: string;
  name: string;
  type: string;
  position: [number, number, number];
  modelUrl: string;
  rotation?: number;
  isSelected?: boolean;
  onPointerDown?: (e: THREE.Event, id: string) => void;
  onContextMenu?: (e: THREE.Event) => void;
}

const TokenModel = memo(function TokenModel({
  id,
  name,
  position,
  modelUrl,
  rotation = 0,
  isSelected,
  onPointerDown,
  onContextMenu,
}: TokenModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelUrl);

  // Per-instance clone — created once, never recreated
  const cloneRef = useRef<THREE.Group | null>(null);
  if (!cloneRef.current) {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    clone.position.y = -box.min.y;
    cloneRef.current = clone;
  }

  const handlePointerDown = useCallback(
    (e: THREE.Event) => {
      onPointerDown?.(e, id);
    },
    [onPointerDown, id]
  );

  return (
    <group ref={groupRef} position={position}>
      <group
        onPointerDown={handlePointerDown}
        onContextMenu={(e) => onContextMenu?.(e)}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'grab'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <group rotation={[0, rotation, 0]} scale={[1, 1, 1]}>
          <primitive object={cloneRef.current} />
        </group>

        {isSelected && (
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.35, 0.42, 32]} />
            <meshBasicMaterial color="#60a5fa" />
          </mesh>
        )}
      </group>

      <Text
        position={[0, -0.2, 0]}
        fontSize={0.15}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {name}
      </Text>
    </group>
  );
});

export default TokenModel;
