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
  tokenScale?: number;
  brightness?: number;
  invisible?: boolean;
  onHeight?: (height: number) => void;
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
  tokenScale = 1,
  brightness = 0,
  invisible = false,
  onHeight,
  onPointerDown,
  onContextMenu,
}: TokenModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelUrl);

  // Per-instance clone — created once, never recreated
  const cloneRef = useRef<THREE.Group | null>(null);
  const hitHeightRef = useRef(0);
  if (!cloneRef.current) {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    clone.position.y = -box.min.y;
    cloneRef.current = clone;
    // Raycast del puntero contra cada triángulo de un GLTF high-poly = freeze.
    // Se desactiva y un cilindro proxy barato toma los eventos (abajo).
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        (child as unknown as { raycast: () => void }).raycast = () => {};
      }
    });
    hitHeightRef.current = box.max.y - box.min.y;
    onHeight?.(box.max.y - box.min.y);
  }

  if (cloneRef.current) {
    cloneRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
        const mat = child.material as THREE.MeshStandardMaterial;
        mat.transparent = invisible;
        mat.opacity = invisible ? 0.25 : 1;
        mat.depthWrite = !invisible;
        if (brightness > 0) {
          mat.emissive = mat.emissive || new THREE.Color(0, 0, 0);
          mat.emissiveIntensity = Math.min(brightness, 0.5);
        }
      }
    });
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
        <group rotation={[0, rotation, 0]} scale={[tokenScale, tokenScale, tokenScale]}>
          <primitive object={cloneRef.current} />
        </group>

        {isSelected && (
          <mesh position={[0, 0.02 * tokenScale, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.35 * tokenScale, 0.42 * tokenScale, 32]} />
            <meshBasicMaterial color="#60a5fa" />
          </mesh>
        )}

        {/* Proxy de hit: cilindro low-poly invisible (opacity 0). Recibe raycast
            del puntero en vez del GLTF — hover/drag sin tocar la malla pesada. */}
        <mesh position={[0, (hitHeightRef.current * tokenScale) / 2, 0]}>
          <cylinderGeometry args={[0.38 * tokenScale, 0.38 * tokenScale, Math.max(hitHeightRef.current * tokenScale, 0.15), 16, 1]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      <Text
        position={[0, -0.2 * tokenScale, 0]}
        fontSize={0.15 * tokenScale}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02 * tokenScale}
        outlineColor="#000000"
      >
        {name}
      </Text>
    </group>
  );
});

export default TokenModel;
