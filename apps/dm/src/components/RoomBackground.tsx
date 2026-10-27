import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';

export default function RoomBackground({
  modelUrl,
  modelScale = 40,
  floorOffset = -25,
}: { modelUrl: string; modelScale?: number; floorOffset?: number }) {
  console.log('[RoomBackground] url=', modelUrl, 'scale=', modelScale);
  const { scene } = useGLTF(modelUrl);

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    // Centrar el modelo en el origen para que la camara quede "dentro"
    // (util para escenas que vienen desplazadas, como bosques/bibliotecas).
    const box = new THREE.Box3().setFromObject(c);
    const center = box.getCenter(new THREE.Vector3());
    c.position.sub(center);
    c.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        mesh.raycast = () => {};
      }
    });
    return c;
  }, [scene]);

  const scale = modelScale;

  return (
    <primitive object={cloned} scale={scale} position={[0, floorOffset, 0]} />
  );
}