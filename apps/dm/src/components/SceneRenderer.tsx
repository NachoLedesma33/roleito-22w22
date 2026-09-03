import { Suspense, useMemo, useRef, useCallback, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import TokenSprite from './TokenSprite';
import TokenModel from './TokenModel';

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
  modelUrl?: string | null;
  rotation?: number;
  tokenScale?: number;
  brightness?: number;
}

interface SceneRendererProps {
  backgroundUrl: string;
  characters: SceneEntity[];
  lighting?: string;
  selectedTokenId?: string | null;
  readOnly?: boolean;
  movableEntityIds?: string[];
  mapScale?: number;
  gridSize?: number;
  gridSnap?: boolean;
  onTokenClick?: (sceneCharId: string) => void;
  onTokenDrop?: (sceneCharId: string, x: number, z: number) => void;
  onTokenContextMenu?: (sceneCharId: string, clientX: number, clientY: number) => void;
}

type DragStarter = (
  sceneCharId: string,
  clientX?: number,
  clientY?: number,
  tokenX?: number,
  tokenZ?: number
) => void;

function SceneBackground({ url, mapScale = 1 }: { url: string; mapScale?: number }) {
  const texture = useTexture(url);
  const img = texture.image as HTMLImageElement;
  const aspect = img.width / img.height;
  const height = 10 * mapScale;
  const width = height * aspect;
  return (
    <mesh
      name="scene-background"
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
    >
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} emissiveMap={texture} emissive={new THREE.Color(0xffffff)} emissiveIntensity={0.3} />
    </mesh>
  );
}

function SceneLighting({ mode }: { mode: string }) {
  switch (mode) {
    case 'dark':
      return (
        <>
          <ambientLight intensity={1.2} />
          <pointLight position={[0, 5, 0]} intensity={1.5} color="#ff9944" />
          <directionalLight position={[3, 8, 3]} intensity={1.4} />
        </>
      );
    case 'dim':
      return (
        <>
          <ambientLight intensity={2.0} />
          <pointLight position={[0, 5, 0]} intensity={2.4} color="#ffcc77" />
          <directionalLight position={[3, 8, 3]} intensity={2.0} />
        </>
      );
    case 'bright':
      return (
        <>
          <ambientLight intensity={3.5} />
          <directionalLight position={[5, 10, 5]} intensity={3.5} />
          <directionalLight position={[-5, 8, -3]} intensity={2.0} />
        </>
      );
    case 'torchlight':
      return (
        <>
          <ambientLight intensity={1.8} />
          <pointLight position={[-3, 3, 0]} intensity={3.0} color="#ff6600" distance={14} />
          <pointLight position={[3, 3, 0]} intensity={3.0} color="#ff6600" distance={14} />
          <pointLight position={[0, 4, -2]} intensity={2.0} color="#ffaa44" distance={10} />
        </>
      );
    default:
      return (
        <>
          <ambientLight intensity={4.0} />
          <directionalLight position={[5, 10, 5]} intensity={4.0} />
          <directionalLight position={[-3, 6, -3]} intensity={2.0} />
        </>
      );
  }
}

function GridOverlay({ width, height, gridSize }: { width: number; height: number; gridSize: number }) {
  const lines = useMemo(() => {
    const pts: THREE.Vector3[][] = [];
    const halfW = width / 2;
    const halfH = height / 2;
    for (let x = -halfW; x <= halfW; x += gridSize) {
      pts.push([new THREE.Vector3(x, 0.02, -halfH), new THREE.Vector3(x, 0.02, halfH)]);
    }
    for (let z = -halfH; z <= halfH; z += gridSize) {
      pts.push([new THREE.Vector3(-halfW, 0.02, z), new THREE.Vector3(halfW, 0.02, z)]);
    }
    return pts;
  }, [width, height, gridSize]);

  return (
    <group>
      {lines.map((pair, i) => {
        const geo = new THREE.BufferGeometry().setFromPoints(pair);
        return <lineSegments key={i} geometry={geo}>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.25} />
        </lineSegments>;
      })}
    </group>
  );
}

const GROUND_Y = 0;
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -GROUND_Y);

function DragController({
  onTokenDrop,
  gridSize,
  gridSnap,
  otherTokens,
}: {
  onTokenDrop?: (sceneCharId: string, x: number, z: number) => void;
  gridSize?: number;
  gridSnap?: boolean;
  otherTokens?: Array<{ sceneCharId: string; x: number; z: number; tokenScale?: number }>;
}) {
  const { camera, gl, scene } = useThree();
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null;
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const dragState = useRef<{
    active: boolean;
    sceneCharId: string;
    offsetX: number;
    offsetZ: number;
    captured: boolean;
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

  const clampToBackground = useCallback(
    (v: THREE.Vector3) => {
      const tokenRadius = 0.4;
      scene.traverse((o) => {
        if (o.name === 'scene-background' && o instanceof THREE.Mesh) {
          const params = (o.geometry as THREE.PlaneGeometry).parameters;
          if (!params) return;
          const halfW = params.width / 2 - tokenRadius;
          const halfD = params.height / 2 - tokenRadius;
          v.x = Math.min(halfW, Math.max(-halfW, v.x));
          v.z = Math.min(halfD, Math.max(-halfD, v.z));
        }
      });
      return v;
    },
    [scene]
  );

  useEffect(() => {
    const canvas = gl.domElement;

    const applyDragPosition = (e: PointerEvent) => {
      const st = dragState.current;
      if (!st?.active) return null;

      const hit = getGroundPoint(e.clientX, e.clientY);
      if (!hit) return null;

      hit.x += st.offsetX;
      hit.z += st.offsetZ;
      return clampToBackground(hit);
    };

    const onPointerMove = (e: PointerEvent) => {
      const st = dragState.current;
      if (!st?.active) return;

      if (!st.captured) {
        try {
          canvas.setPointerCapture(e.pointerId);
          st.captured = true;
        } catch {
          // pointer may already be released; drag continues without capture
        }
      }

      const newPos = applyDragPosition(e);
      if (!newPos) return;

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

    const releaseDrag = () => {
      dragState.current = null;
      if (controls) controls.enabled = true;
      canvas.style.cursor = 'auto';
    };

    const onPointerUp = (e: PointerEvent) => {
      const st = dragState.current;
      if (!st?.active) return;

      let newPos = applyDragPosition(e);
      if (newPos) {
        if (gridSnap && gridSize && gridSize > 0) {
          newPos.x = Math.round(newPos.x / gridSize) * gridSize;
          newPos.z = Math.round(newPos.z / gridSize) * gridSize;
        }
        // Token-Token collision: push away from overlapping tokens
        if (otherTokens) {
          const myRadius = 0.4;
          for (const other of otherTokens) {
            if (other.sceneCharId === st.sceneCharId) continue;
            const otherRadius = 0.4 * (other.tokenScale ?? 1);
            const minDist = myRadius + otherRadius;
            const dx = newPos.x - other.x;
            const dz = newPos.z - other.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < minDist && dist > 0) {
              const push = (minDist - dist) / 2;
              const nx = dx / dist;
              const nz = dz / dist;
              newPos.x += nx * push;
              newPos.z += nz * push;
            }
          }
        }
        onTokenDrop?.(st.sceneCharId, newPos.x, newPos.z);
      }

      releaseDrag();
    };

    const onPointerCancel = () => {
      if (!dragState.current?.active) return;
      releaseDrag();
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerCancel);
    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [gl, getGroundPoint, clampToBackground, onTokenDrop, controls, scene, gridSize, gridSnap, otherTokens]);

  // Expose startDrag via a global function on the canvas.
  // Mutating the external DOM canvas node inside an effect is intentional:
  // DOM nodes live outside React's render graph, but the immutability rule
  // cannot see that `canvas` aliases `gl.domElement` rather than a render value.
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    const canvas = gl.domElement as HTMLCanvasElement & { __startDrag?: DragStarter };
    canvas.__startDrag = (sceneCharId, clientX?, clientY?, tokenX = 0, tokenZ = 0) => {
      let offsetX = 0;
      let offsetZ = 0;
      if (clientX != null && clientY != null) {
        const grabPoint = getGroundPoint(clientX, clientY);
        if (grabPoint) {
          offsetX = tokenX - grabPoint.x;
          offsetZ = tokenZ - grabPoint.z;
        }
      }
      dragState.current = {
        active: true,
        sceneCharId,
        offsetX,
        offsetZ,
        captured: false,
      };
      if (controls) controls.enabled = false;
      canvas.style.cursor = 'grabbing';
    };
    return () => {
      canvas.__startDrag = undefined;
    };
  }, [gl, getGroundPoint, controls, scene]);
  /* eslint-enable react-hooks/immutability */

  return null;
}

function DraggableToken({
  entity,
  isSelected,
  isMovable,
  onClick,
  onContextMenu,
}: {
  entity: SceneEntity;
  isSelected: boolean;
  isMovable: boolean;
  onClick?: (sceneCharId: string) => void;
  onContextMenu?: (sceneCharId: string, clientX: number, clientY: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.userData.sceneCharId = entity.sceneCharId;
    }
  }, [entity.sceneCharId]);

  const handlePointerDown = useCallback(
    (e: THREE.Event) => {
      (e as unknown as { stopPropagation?: () => void }).stopPropagation?.();
      if (isMovable) {
        const canvas = document.querySelector('canvas') as (HTMLCanvasElement & {
          __startDrag?: DragStarter;
        }) | null;
        if (canvas?.__startDrag) {
          const native = (e as unknown as { nativeEvent?: PointerEvent }).nativeEvent;
          canvas.__startDrag(
            entity.sceneCharId,
            native?.clientX,
            native?.clientY,
            entity.x,
            entity.z
          );
        }
      }

      onClick?.(entity.sceneCharId);
    },
    [entity, isMovable, onClick]
  );

  return (
    <group ref={groupRef} position={[entity.x, entity.y, entity.z]}>
      {entity.modelUrl ? (
        <TokenModel
          id={entity.sceneCharId}
          name={entity.name}
          type={entity.type}
          position={[0, 0, 0]}
          modelUrl={entity.modelUrl}
          rotation={entity.rotation ?? 0}
          isSelected={isSelected}
          tokenScale={entity.tokenScale ?? 1}
          brightness={entity.brightness ?? 0}
          onPointerDown={handlePointerDown}
          onContextMenu={(e) => {
            const domEvent = e as unknown as PointerEvent;
            onContextMenu?.(entity.sceneCharId, domEvent.clientX, domEvent.clientY);
          }}
        />
      ) : (
        <TokenSprite
          id={entity.sceneCharId}
          name={entity.name}
          type={entity.type}
          position={[0, 0, 0]}
          portraitUrl={entity.portraitUrl}
          isSelected={isSelected}
          tokenScale={entity.tokenScale ?? 1}
          onPointerDown={handlePointerDown}
          onContextMenu={(e) => {
            const domEvent = e as unknown as PointerEvent;
            onContextMenu?.(entity.sceneCharId, domEvent.clientX, domEvent.clientY);
          }}
        />
      )}
    </group>
  );
}

export default function SceneRenderer({
  backgroundUrl,
  characters,
  lighting = 'neutral',
  selectedTokenId,
  readOnly = false,
  movableEntityIds,
  mapScale = 1,
  gridSize = 0,
  gridSnap = false,
  onTokenClick,
  onTokenDrop,
  onTokenContextMenu,
}: SceneRendererProps) {
  const visibleChars = useMemo(() => characters.filter((c) => c.visible), [characters]);
  const hasDrag = !readOnly || (movableEntityIds && movableEntityIds.length > 0);
  const mapHeight = 10 * mapScale;
  const mapWidth = mapHeight * 4;
  const maxDistance = Math.max(25, mapScale * 15);

  return (
    <Canvas
      camera={{ position: [0, 8, 8], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
      onPointerMissed={() => onTokenClick?.('')}
    >
      <SceneLighting mode={lighting} />
      <Suspense fallback={null}>
        <SceneBackground url={backgroundUrl} mapScale={mapScale} />
      </Suspense>
      {gridSize > 0 && <GridOverlay width={mapWidth} height={mapHeight} gridSize={gridSize} />}
      {hasDrag && (
        <DragController
          onTokenDrop={onTokenDrop}
          gridSize={gridSize}
          gridSnap={gridSnap}
          otherTokens={visibleChars.map((c) => ({
            sceneCharId: c.sceneCharId,
            x: c.x,
            z: c.z,
            tokenScale: c.tokenScale,
          }))}
        />
      )}
      {visibleChars.map((ch) => {
        const isMovable = movableEntityIds
          ? movableEntityIds.includes(ch.sceneCharId)
          : !readOnly;
        return (
          <DraggableToken
            key={ch.sceneCharId}
            entity={ch}
            isSelected={isMovable && selectedTokenId === ch.sceneCharId}
            isMovable={isMovable}
            onClick={isMovable ? onTokenClick : undefined}
            onContextMenu={isMovable ? onTokenContextMenu : undefined}
          />
        );
      })}
      <OrbitControls
        makeDefault
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={3}
        maxDistance={maxDistance}
      />
    </Canvas>
  );
}
