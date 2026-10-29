import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { useMemo } from 'react';

function GlbBg({ modelUrl, modelScale, floorOffset, offsetX, offsetZ }: any) {
  const gltf: any = useGLTF(modelUrl);
  const scene = gltf.scene ?? gltf;
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const center = box.getCenter(new THREE.Vector3());
    c.position.sub(center);
    c.traverse((child: any) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        mesh.raycast = () => {};
      }
    });
    return c;
  }, [scene]);
  return <primitive object={cloned} scale={modelScale} position={[offsetX, floorOffset, offsetZ]} />;
}

function FbxBg({ modelUrl, modelScale, floorOffset, offsetX, offsetZ }: any) {
  const fbx: any = useLoader(FBXLoader, modelUrl);
  const cloned = useMemo(() => {
    const c = fbx.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const center = box.getCenter(new THREE.Vector3());
    c.position.sub(center);
    c.traverse((child: any) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        mesh.raycast = () => {};
      }
    });
    return c;
  }, [fbx]);
  return <primitive object={cloned} scale={modelScale} position={[offsetX, floorOffset, offsetZ]} />;
}

export default function RoomBackground(props: { modelUrl: string; modelScale?: number; floorOffset?: number; offsetX?: number; offsetZ?: number }) {
  const isFbx = /\.fbx$/i.test(props.modelUrl);
  if (isFbx) return <FbxBg {...props} />;
  return <GlbBg {...props} />;
}