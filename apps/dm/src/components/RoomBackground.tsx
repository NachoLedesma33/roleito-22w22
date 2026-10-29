import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { useMemo } from 'react';

interface RoomBgProps {
  modelUrl: string;
  modelScale?: number;
  floorOffset?: number;
  offsetX?: number;
  offsetZ?: number;
}

function GlbBg({ modelUrl, modelScale, floorOffset, offsetX, offsetZ }: RoomBgProps) {
  const gltf = useGLTF(modelUrl) as { scene: THREE.Group };
  const scene = gltf.scene;
  const cloned = useMemo(() => {
    const c = scene.clone(true);
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
  return <primitive object={cloned} scale={modelScale} position={[offsetX ?? 0, floorOffset ?? 0, offsetZ ?? 0]} />;
}

function FbxBg({ modelUrl, modelScale, floorOffset, offsetX, offsetZ }: RoomBgProps) {
  const fbx = useLoader(FBXLoader, modelUrl) as THREE.Group;
  const cloned = useMemo(() => {
    const c = fbx.clone(true);
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
  }, [fbx]);
  return <primitive object={cloned} scale={modelScale} position={[offsetX ?? 0, floorOffset ?? 0, offsetZ ?? 0]} />;
}

export default function RoomBackground(props: RoomBgProps) {
  const isFbx = /\.fbx$/i.test(props.modelUrl);
  if (isFbx) return <FbxBg {...props} />;
  return <GlbBg {...props} />;
}