import { Suspense, useMemo, useRef, useCallback, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import TokenSprite from './TokenSprite';

interface SceneEntity {
  id: string;
  sceneCharId: string;
  name: string;
  type: string;
  x: number;
  y: number;
  z: number;
  visible: boolean;
  portraitUrl?: string | null;
}

interface SceneRendererProps {
  backgroundUrl: string;
  characters: SceneEntity[];
  lighting?: string;
  selectedTokenId?: string | null;
  onTokenClick?: (sceneCharId: string) => void;
  onTokenDrop?: (sceneCharId: string, x: number, z: number) => void;
  onTokenContextMenu?: (sceneCharId: string, clientX: number, clientY: number) => void;
}

type DragStarter = (sceneCharId: string, x: number, z: number) => void;

function SceneBackground({ url }: { url: string }) {
  const texture = useTexture(url);
  const img = texture.image as HTMLImageElement;
  const aspect = img.width / img.height;
  const width = 10 * aspect;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[width, 10]} />
      <meshStandardMaterial map={texture} emissiveMap={texture} emissive={new THREE.Color(0xffffff)} emissiveIntensity={0.3} />
    </mesh>
  );
}

function SceneLighting({ mode }: { mode: string }) {
  switch (mode) {
    case 'dark':
      return (
        <>
          <ambientLight intensity={0.15} />
          <pointLight position={[0, 5, 0]} intensity={0.4} color="#ff9944" />
        </>
      );
    case 'dim':
      return (
        <>
          <ambientLight intensity={0.6} />
          <pointLight position={[0, 5, 0]} intensity={1.0} color="#ffcc77" />
        </>
      );
    case 'bright':
      return (
        <>
          <ambientLight intensity={1.2} />
          <directionalLight position={[5, 10, 5]} intensity={1.5} />
        </>
      );
    case 'torchlight':
      return (
        <>
          <ambientLight intensity={0.5} />
          <pointLight position={[-3, 3, 0]} intensity={1.2} color="#ff6600" distance={14} />
          <pointLight position={[3, 3, 0]} intensity={1.2} color="#ff6600" distance={14} />
        </>
      );
    default:
      return (
        <>
          <ambientLight intensity={1.0} />
          <directionalLight position={[5, 10, 5]} intensity={1.2} />
        </>
      );
  }
}

const GROUND_Y = 0;
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -GROUND_Y);

function DragController({
  onTokenDrop,
}: {
  onTokenDrop?: (sceneCharId: string, x: number, z: number) => void;
}) {
  const { camera, gl, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const dragState = useRef<{
    active: boolean;
    sceneCharId: string;
    offset: THREE.Vector3;
  } | null>(null);

  const getGroundPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(mouse, camera);
      const hit = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundPlane, hit);
      return hit;
    },
    [camera, gl, raycaster]
  );

  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerMove = (e: PointerEvent) => {
      if (!dragState.current?.active) return;

      const hit = getGroundPoint(e.clientX, e.clientY);
      if (!hit) return;

      const newPos = hit.add(dragState.current.offset);

      // Update token group position via userData
      scene.traverse((child: THREE.Object3D) => {
        if (
          child.userData?.sceneCharId === dragState.current?.sceneCharId &&
          child instanceof THREE.Group &&
          child.children.length > 0
        ) {
          // Move the group (which contains the Billboard/TokenSprite)
          child.position.x = newPos.x;
          child.position.z = newPos.z;
        }
      });
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragState.current?.active) return;

      const hit = getGroundPoint(e.clientX, e.clientY);
      if (hit) {
        const newPos = hit.add(dragState.current.offset);
        onTokenDrop?.(dragState.current.sceneCharId, newPos.x, newPos.z);
      }

      dragState.current = null;
      canvas.style.cursor = 'auto';
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
    };
  }, [gl, getGroundPoint, onTokenDrop]);

  // Expose startDrag via a global function on the canvas.
  // Mutating the external DOM canvas node inside an effect is intentional:
  // DOM nodes live outside React's render graph, but the immutability rule
  // cannot see that `canvas` aliases `gl.domElement` rather than a render value.
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    const canvas = gl.domElement as HTMLCanvasElement & { __startDrag?: DragStarter };
    canvas.__startDrag = (sceneCharId: string, x: number, z: number) => {
      dragState.current = {
        active: true,
        sceneCharId,
        offset: new THREE.Vector3(x, 0, z),
      };
      canvas.style.cursor = 'grabbing';
    };
    return () => {
      canvas.__startDrag = undefined;
    };
  }, [gl]);
  /* eslint-enable react-hooks/immutability */

  return null;
}

function DraggableToken({
  entity,
  isSelected,
  onClick,
  onContextMenu,
}: {
  entity: SceneEntity;
  isSelected: boolean;
  onClick?: (sceneCharId: string) => void;
  onContextMenu?: (sceneCharId: string, clientX: number, clientY: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.userData.sceneCharId = entity.sceneCharId;
    }
  });

  const handlePointerDown = useCallback(() => {
    const canvas = document.querySelector('canvas') as (HTMLCanvasElement & {
      __startDrag?: (sceneCharId: string, x: number, z: number) => void;
    }) | null;
    if (canvas?.__startDrag) {
      canvas.__startDrag(entity.sceneCharId, entity.x, entity.z);
    }

    onClick?.(entity.sceneCharId);
  }, [entity, onClick]);

  return (
    <group ref={groupRef} position={[entity.x, entity.y, entity.z]}>
      <TokenSprite
        id={entity.sceneCharId}
        name={entity.name}
        type={entity.type}
        position={[0, 0, 0]}
        portraitUrl={entity.portraitUrl}
        isSelected={isSelected}
        onPointerDown={handlePointerDown}
        onContextMenu={(e) => {
          const domEvent = e as unknown as PointerEvent;
          onContextMenu?.(entity.sceneCharId, domEvent.clientX, domEvent.clientY);
        }}
      />
    </group>
  );
}

export default function SceneRenderer({
  backgroundUrl,
  characters,
  lighting = 'neutral',
  selectedTokenId,
  onTokenClick,
  onTokenDrop,
  onTokenContextMenu,
}: SceneRendererProps) {
  const visibleChars = useMemo(() => characters.filter((c) => c.visible), [characters]);

  return (
    <Canvas
      camera={{ position: [0, 8, 8], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
      onPointerMissed={() => onTokenClick?.('')}
    >
      <SceneLighting mode={lighting} />
      <Suspense fallback={null}>
        <SceneBackground url={backgroundUrl} />
      </Suspense>
      <DragController onTokenDrop={onTokenDrop} />
      {visibleChars.map((ch) => (
        <DraggableToken
          key={ch.sceneCharId}
          entity={ch}
          isSelected={selectedTokenId === ch.sceneCharId}
          onClick={onTokenClick}
          onContextMenu={onTokenContextMenu}
        />
      ))}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={3}
        maxDistance={25}
      />
    </Canvas>
  );
}
